<?php

use App\Models\ArcadeScore;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

/** Starts a Stack run and returns its id. */
function startRun(User $user, string $game = 'stack'): int
{
    return test()->actingAs($user)
        ->postJson(route('arcade.start', $game))
        ->assertCreated()
        ->json('runId');
}

function finishRun(User $user, int $runId, array $result, string $game = 'stack'): TestResponse
{
    return test()->actingAs($user)->postJson(route('arcade.finish', ['game' => $game, 'run' => $runId]), $result);
}

/** A finished run without going through the API (for leaderboard tests). */
function finishedRun(User $user, int $score, ?string $at = null, string $game = 'stack'): ArcadeScore
{
    $at = $at ? now()->parse($at) : now();

    return ArcadeScore::create([
        'user_id' => $user->id,
        'game' => $game,
        'score' => $score,
        'stats' => [],
        'started_at' => $at->copy()->subMinutes(2),
        'finished_at' => $at,
    ]);
}

test('a played run is saved with its score', function () {
    $user = User::factory()->create();
    $runId = startRun($user);
    $this->travel(30)->seconds();

    finishRun($user, $runId, ['score' => 24, 'stats' => ['blocks' => 20, 'perfects' => 3]])
        ->assertOk()
        ->assertJsonPath('score', 24)
        ->assertJsonPath('personalBest', 24)
        ->assertJsonPath('isHighscore', true)
        ->assertJsonPath('leaderboards.today.0.username', $user->username);

    $run = ArcadeScore::findOrFail($runId);
    expect($run->score)->toBe(24)
        ->and($run->stats)->toBe(['blocks' => 20, 'perfects' => 3])
        ->and($run->finished_at)->not->toBeNull();
});

test('a lower score is no new highscore', function () {
    $user = User::factory()->create();
    finishedRun($user, 50);
    $runId = startRun($user);
    $this->travel(30)->seconds();

    finishRun($user, $runId, ['score' => 10, 'stats' => ['blocks' => 10, 'perfects' => 0]])
        ->assertOk()
        ->assertJsonPath('personalBest', 50)
        ->assertJsonPath('isHighscore', false);
});

test('a run can only be submitted once', function () {
    $user = User::factory()->create();
    $runId = startRun($user);
    $this->travel(30)->seconds();

    finishRun($user, $runId, ['score' => 5, 'stats' => ['blocks' => 5, 'perfects' => 0]])->assertOk();
    finishRun($user, $runId, ['score' => 99, 'stats' => ['blocks' => 99, 'perfects' => 0]])->assertUnprocessable();

    expect(ArcadeScore::findOrFail($runId)->score)->toBe(5);
});

test('you cannot submit someone elses run', function () {
    $runId = startRun(User::factory()->create());
    $this->travel(30)->seconds();

    finishRun(User::factory()->create(), $runId, ['score' => 5, 'stats' => ['blocks' => 5, 'perfects' => 0]])->assertForbidden();
});

test('a score that was reached too fast is rejected', function () {
    $user = User::factory()->create();
    $runId = startRun($user);
    // 100 blocks need at least 100 × min_ms_per_block (25 s by default)
    $this->travel(5)->seconds();

    finishRun($user, $runId, ['score' => 100, 'stats' => ['blocks' => 100, 'perfects' => 0]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('score');

    expect(ArcadeScore::findOrFail($runId)->finished_at)->toBeNull();
});

test('a score that does not add up is rejected', function (array $result) {
    $user = User::factory()->create();
    $runId = startRun($user);
    $this->travel(60)->seconds();

    finishRun($user, $runId, $result)->assertUnprocessable();
})->with([
    'more than the maximum bonus' => [['score' => 100, 'stats' => ['blocks' => 10, 'perfects' => 10]]],
    'less than one point per block' => [['score' => 5, 'stats' => ['blocks' => 10, 'perfects' => 0]]],
    'more perfects than blocks' => [['score' => 12, 'stats' => ['blocks' => 4, 'perfects' => 5]]],
    'negative score' => [['score' => -1, 'stats' => ['blocks' => 0, 'perfects' => 0]]],
    'missing stats' => [['score' => 10]],
    'stats of another game' => [['score' => 10, 'stats' => ['distance' => 10, 'coins' => 0, 'boosts' => 0, 'tricks' => 0]]],
]);

test('an expired run is rejected', function () {
    $user = User::factory()->create();
    $runId = startRun($user);
    $this->travel(config('arcade.max_run_minutes') + 1)->minutes();

    finishRun($user, $runId, ['score' => 5, 'stats' => ['blocks' => 5, 'perfects' => 0]])->assertUnprocessable();
});

test('unknown games do not exist', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('arcade.start', 'pacman'))
        ->assertNotFound();
});

test('starting runs is rate limited', function () {
    $user = User::factory()->create();

    for ($i = 0; $i < 30; $i++) {
        $this->actingAs($user)->postJson(route('arcade.start', 'stack'))->assertCreated();
    }

    $this->actingAs($user)->postJson(route('arcade.start', 'stack'))->assertTooManyRequests();
});

test('the leaderboard shows each players best score, highest first', function () {
    [$a, $b, $c] = User::factory()->count(3)->create();
    finishedRun($a, 10);
    finishedRun($a, 40);
    finishedRun($b, 25);
    finishedRun($c, 60);
    // Unfinished runs don't count
    ArcadeScore::create(['user_id' => $b->id, 'game' => 'stack', 'started_at' => now()]);

    $board = ArcadeScore::leaderboard('stack');

    expect($board)->toHaveCount(3)
        ->and(array_column($board, 'userId'))->toBe([$c->id, $a->id, $b->id])
        ->and(array_column($board, 'score'))->toBe([60, 40, 25])
        ->and(array_column($board, 'rank'))->toBe([1, 2, 3]);
});

test('leaderboards are split into today, this week and all-time', function () {
    $this->travelTo(now()->parse('2026-10-30 15:00')); // a Friday
    [$a, $b, $c] = User::factory()->count(3)->create();
    finishedRun($a, 10, '2026-10-30 09:00'); // today
    finishedRun($b, 30, '2026-10-27 12:00'); // Tuesday this week
    finishedRun($c, 90, '2026-10-01 12:00'); // earlier this month

    $boards = ArcadeScore::leaderboards('stack');

    expect(array_column($boards['today'], 'score'))->toBe([10])
        ->and(array_column($boards['week'], 'score'))->toBe([30, 10])
        ->and(array_column($boards['allTime'], 'score'))->toBe([90, 30, 10]);
});

test('the cabinet popup gets your highscore and the leaderboards', function () {
    $user = User::factory()->create();
    finishedRun($user, 33);

    $this->actingAs($user)
        ->getJson(route('arcade.scores', 'stack'))
        ->assertOk()
        ->assertJsonPath('personalBest', 33)
        ->assertJsonPath('leaderboards.today.0.score', 33);
});

test('the game page renders with the leaderboards', function () {
    $user = User::factory()->create();
    finishedRun($user, 12);

    $this->actingAs($user)
        ->get(route('arcade.show', 'stack'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ontmoeten/stack')
            ->where('game.id', 'stack')
            ->where('personalBest', 12)
            ->has('leaderboards.allTime', 1));
});

test('the arcade room shows todays top 3 per game on the wall', function () {
    $users = User::factory()->count(4)->create();
    foreach ($users as $i => $user) {
        finishedRun($user, ($i + 1) * 10);
    }

    $this->actingAs($users[0])
        ->get(route('ontmoeten.lobby', ['kamer' => 'arcade']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('arcadeScoreboards.stack.scores', 3)
            ->where('arcadeScoreboards.stack.scores.0.score', 40)
            ->where('arcadeScoreboards.wave-rush.name', 'Wave Rush')
            ->has('arcadeScoreboards.wave-rush.scores', 0));

    $this->actingAs($users[0])
        ->get(route('ontmoeten.lobby', ['kamer' => 'kantine']))
        ->assertInertia(fn (Assert $page) => $page->where('arcadeScoreboards', null));
});

// ─── Wave Rush ────────────────────────────────────────────────────────────────

/** Distance + 25 per coin + 10 per boost + 150 per trick (config/arcade.php → wave-rush.points). */
function waveRush(int $distance, int $coins = 0, int $boosts = 0, int $tricks = 0, ?int $score = null): array
{
    return [
        'score' => $score ?? $distance + $coins * 25 + $boosts * 10 + $tricks * 150,
        'stats' => compact('distance', 'coins', 'boosts', 'tricks'),
    ];
}

test('a wave rush run is saved with its stats', function () {
    $user = User::factory()->create();
    $runId = startRun($user, 'wave-rush');
    $this->travel(60)->seconds();

    finishRun($user, $runId, waveRush(2400, coins: 30, boosts: 4, tricks: 2), 'wave-rush')
        ->assertOk()
        ->assertJsonPath('score', 2400 + 750 + 40 + 300)
        ->assertJsonPath('isHighscore', true);

    expect(ArcadeScore::findOrFail($runId)->stats)
        ->toBe(['distance' => 2400, 'coins' => 30, 'boosts' => 4, 'tricks' => 2]);
});

test('wave rush rejects runs that are not possible', function (array $result) {
    $user = User::factory()->create();
    $runId = startRun($user, 'wave-rush');
    $this->travel(60)->seconds();

    finishRun($user, $runId, $result, 'wave-rush')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('score');
})->with([
    // 60 s at most 90 m/s = 5400 m
    'faster than a jetski' => [waveRush(6000)],
    'more coins than fit on the track' => [waveRush(400, coins: 200)],
    'more ramps than fit on the track' => [waveRush(400, tricks: 10)],
    'a score that does not add up' => [waveRush(1000, coins: 4, score: 5000)],
]);

test('wave rush and stack have separate leaderboards', function () {
    $user = User::factory()->create();
    finishedRun($user, 100, game: 'stack');
    finishedRun($user, 5000, game: 'wave-rush');

    expect(array_column(ArcadeScore::leaderboard('stack'), 'score'))->toBe([100])
        ->and(array_column(ArcadeScore::leaderboard('wave-rush'), 'score'))->toBe([5000])
        ->and(ArcadeScore::personalBest($user, 'wave-rush'))->toBe(5000);
});

test('the wave rush page renders', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('arcade.show', 'wave-rush'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ontmoeten/wave-rush')
            ->where('game.name', 'Wave Rush'));
});
