<?php

use App\Games\Cards\Card;
use App\Models\CardGame;
use App\Models\CardGamePlayer;
use App\Models\GameQueue;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

const CARD_TABLE = ['room_id' => 'kantine', 'table_id' => 'kaarttafel-1'];

function cardState(User $user, CardGame $game): array
{
    $state = null;

    test()->actingAs($user)
        ->get(route('tribekaarten.show', $game))
        ->assertInertia(function (Assert $page) use (&$state) {
            $page->component('ontmoeten/tribekaarten');
            $state = $page->toArray()['props']['game'];
        });

    return $state;
}

/** Past the countdown and the dealing: the first turn has started. */
function untilPlay(): void
{
    test()->travel(config('cards.countdown_seconds') + config('cards.deal_seconds') + 1)->seconds();
}

/**
 * Put the game in a known position: one hand per seat, the top card and the
 * draw pile (top card last). `$turn` is to play, its turn timer just started.
 *
 * @param  list<list<string>>  $hands
 */
function rigTable(CardGame $game, array $hands, string $top = 'sun:5', int $turn = 0, array $draw = ['sea:1', 'sea:2', 'sea:3', 'sea:4', 'sea:6'], array $houseRules = []): CardGame
{
    $game->update([
        'state' => [
            'houseRules' => $houseRules,
            'seats' => array_map(fn (array $hand) => ['hand' => $hand, 'called' => false, 'out' => false], $hands),
            'drawPile' => $draw,
            'discardPile' => ['leaf:9', $top],
            'color' => Card::color($top),
            'direction' => 1,
            'turn' => $turn,
            'pendingDraw' => 0,
            'drawn' => null,
            'catchable' => null,
            'winner' => null,
            'turns' => 0,
        ],
        'turn_ends_at_ms' => CardGame::nowMs() + config('cards.turn_seconds') * 1000,
        'npc_acts_at_ms' => CardGame::nowMs() + 1000,
    ]);

    return $game->fresh();
}

/** Let time pass while these students poll the queue every second, like the Hotel does. */
function pollQueue(iterable $users, int $seconds): void
{
    for ($second = 0; $second < $seconds; $second++) {
        test()->travel(1)->seconds();

        foreach ($users as $user) {
            test()->actingAs($user)->postJson(route('tribekaarten.queue'));
        }
    }
}

/** The student at a seat. */
function atSeat(CardGame $game, int $seat): ?User
{
    return $game->players()->where('seat', $seat)->first()->user;
}

/** Two students at one table, the game started and dealt. */
function cardPair(): CardGame
{
    $game = CardGame::start('kantine', 'kaarttafel-1', User::factory()->count(2)->create(), 2, 'normal');
    untilPlay();

    return $game;
}

describe('matchmaking', function () {
    test('guests cannot sit down at the card table', function () {
        $this->postJson(route('tribekaarten.search'), CARD_TABLE)->assertUnauthorized();
    });

    test('only rooms with a card table can be joined', function () {
        $this->actingAs(User::factory()->create())
            ->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'room_id' => 'nergens'])
            ->assertJsonValidationErrors('room_id');
    });

    test('a lone player waits at the table, and the table shows who is waiting', function () {
        $me = User::factory()->create();

        $this->actingAs($me)->postJson(route('tribekaarten.search'), CARD_TABLE)
            ->assertOk()
            ->assertJson(['status' => 'searching', 'startsInSeconds' => config('cards.start_after_seconds'), 'players' => [['username' => $me->username, 'isMe' => true]]]);

        $this->actingAs(User::factory()->create())->getJson(route('tribekaarten.table', CARD_TABLE))
            ->assertJson(['waiting' => [$me->username], 'wins' => 0]);

        expect(CardGame::count())->toBe(0);
    });

    test('after the wait a lone player plays one NPC', function () {
        $me = User::factory()->create();
        $this->actingAs($me)->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'difficulty' => 'easy']);

        for ($second = 1; $second < config('cards.start_after_seconds'); $second++) {
            $this->travel(1)->seconds();
            $this->postJson(route('tribekaarten.queue'))->assertJson(['status' => 'searching']);
        }
        $this->travel(1)->seconds();

        $this->postJson(route('tribekaarten.queue'))->assertJson(['status' => 'matched']);

        $game = CardGame::sole();
        expect($game->players)->toHaveCount(2)
            ->and($game->players->whereNull('user_id'))->toHaveCount(1)
            ->and($game->players->whereNull('user_id')->first()->npc_name)->toBeIn(array_column(config('cards.npc.roster'), 'name'))
            ->and($game->npc_difficulty)->toBe('easy')
            ->and(GameQueue::count())->toBe(0);
    });

    test('students at the same table play together without NPCs', function () {
        [$a, $b, $c] = User::factory()->count(3)->create();

        foreach ([$a, $b, $c] as $user) {
            $this->actingAs($user)->postJson(route('tribekaarten.search'), CARD_TABLE);
        }

        $this->actingAs($b)->postJson(route('tribekaarten.queue'))->assertJsonCount(3, 'players');
        pollQueue([$a, $b, $c], config('cards.start_after_seconds') - 1);
        $this->travel(1)->seconds();
        $this->actingAs($a)->postJson(route('tribekaarten.queue'))->assertJson(['status' => 'matched']);

        $game = CardGame::sole();
        expect($game->players->pluck('user_id')->all())->toEqualCanonicalizing([$a->id, $b->id, $c->id]);

        // The others hear about it with their next poll
        $this->actingAs($c)->postJson(route('tribekaarten.queue'))->assertJson(['status' => 'matched', 'gameId' => $game->id]);
    });

    test('a full table starts right away', function () {
        $users = User::factory()->count(4)->create();

        foreach ($users as $i => $user) {
            $response = $this->actingAs($user)->postJson(route('tribekaarten.search'), CARD_TABLE);
        }

        $response->assertJson(['status' => 'matched']);
        expect(CardGame::sole()->players)->toHaveCount(4);
    });

    test('a fifth student has to wait for the next game', function () {
        foreach (User::factory()->count(4)->create() as $user) {
            GameQueue::create(['user_id' => $user->id, 'game' => 'cards', ...CARD_TABLE, 'options' => ['wait' => true], 'last_seen_at' => now()]);
        }

        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), CARD_TABLE)
            ->assertJson(['status' => 'searching', 'full' => true]);
    });

    test('"Nu starten met NPC\'s" fills the table with different NPCs', function () {
        $me = User::factory()->create();
        $this->actingAs($me)->postJson(route('tribekaarten.search'), CARD_TABLE);

        $this->postJson(route('tribekaarten.start-now'))->assertJson(['status' => 'matched']);

        $npcs = CardGame::sole()->players->whereNull('user_id');
        expect($npcs)->toHaveCount(config('cards.start_now_fill_to') - 1)
            ->and($npcs->pluck('npc_name')->unique())->toHaveCount($npcs->count());
    });

    test('"Wachten op spelers" stops the timer until someone presses start', function () {
        $me = User::factory()->create();
        $this->actingAs($me)->postJson(route('tribekaarten.search'), CARD_TABLE);
        $this->postJson(route('tribekaarten.wait'), ['wait' => true])
            ->assertJson(['status' => 'searching', 'waitingForPlayers' => true, 'startsInSeconds' => null]);

        pollQueue([$me], config('cards.start_after_seconds') + 5);
        $this->postJson(route('tribekaarten.queue'))->assertJson(['status' => 'searching']);

        // Back to automatic: the timer starts again
        $this->postJson(route('tribekaarten.wait'), ['wait' => false])
            ->assertJson(['startsInSeconds' => config('cards.start_after_seconds')]);
    });

    test('players at another table or who stopped polling are not matched', function () {
        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'table_id' => 'kaarttafel-2']);
        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), CARD_TABLE);
        $this->travel(config('cards.queue_timeout_seconds') + 1)->seconds();

        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), CARD_TABLE)
            ->assertJsonCount(1, 'players');
    });

    test('the first player chooses the house rules and the NPC difficulty', function () {
        $host = User::factory()->create();
        $this->actingAs($host)->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'difficulty' => 'easy', 'house_rules' => ['stacking']]);
        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'house_rules' => ['zero_seven']])
            ->assertJson(['host' => ['username' => $host->username, 'isMe' => false, 'houseRules' => ['stacking']]]);

        $this->postJson(route('tribekaarten.start-now'));

        expect(CardGame::sole())->house_rules->toBe(['stacking'])->npc_difficulty->toBe('easy')
            ->and(CardGame::sole()->rules()->hasRule('stacking'))->toBeTrue();
    });

    test('unknown house rules are refused', function () {
        $this->actingAs(User::factory()->create())
            ->postJson(route('tribekaarten.search'), [...CARD_TABLE, 'house_rules' => ['alles-mag']])
            ->assertJsonValidationErrors('house_rules.0');
    });

    test('cancelling leaves the queue', function () {
        $this->actingAs(User::factory()->create())->postJson(route('tribekaarten.search'), CARD_TABLE);
        $this->deleteJson(route('tribekaarten.cancel'))->assertJson(['status' => 'idle']);

        expect(GameQueue::count())->toBe(0);
    });

    test('the chess queue and the card queue share one spot per student', function () {
        $me = User::factory()->create();
        $this->actingAs($me)->postJson(route('schaken.search'), ['room_id' => 'kantine', 'board_id' => 'schaakbord-1']);
        $this->postJson(route('tribekaarten.search'), CARD_TABLE);

        expect(GameQueue::sole()->game)->toBe('cards')
            ->and($this->postJson(route('schaken.queue'))->json('status'))->toBe('idle');
    });

    test('joining the table again ends the running game', function () {
        $game = cardPair();
        $me = atSeat($game, 0);

        $this->actingAs($me)->postJson(route('tribekaarten.search'), CARD_TABLE)->assertJson(['status' => 'searching']);

        expect($game->players()->where('user_id', $me->id)->value('status'))->toBe(CardGamePlayer::LEFT);
    });
});

describe('the game', function () {
    test('only the players can open a game', function () {
        $game = cardPair();

        $this->actingAs(User::factory()->create())->get(route('tribekaarten.show', $game))->assertForbidden();
    });

    test('you see your own hand and only the number of cards of the others', function () {
        $game = cardPair();
        $me = atSeat($game, 0);
        $state = cardState($me, $game);

        expect($state['hand'])->toHaveCount(7)
            ->and($state['hand'])->toBe($game->fresh()->rules()->hand(0))
            ->and($state['seats'])->toHaveCount(2)
            ->and($state['seats'][1])->toHaveKey('cardCount', 7)
            ->and($state['seats'][1])->not->toHaveKey('hand')
            ->and($state)->not->toHaveKeys(['state', 'drawPile', 'discardPile'])
            ->and($state['status'])->toBe('active')
            ->and($state['mySeat'])->toBe(0);
    });

    test('no moves during the countdown and the dealing', function () {
        $game = CardGame::start('kantine', 'kaarttafel-1', User::factory()->count(2)->create(), 2, 'normal');

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.draw', $game))
            ->assertSessionHasErrors(['move' => 'Het potje begint zo.']);
        expect(cardState(atSeat($game, 0), $game)['status'])->toBe('countdown');
    });

    test('a card that fits is played', function () {
        $game = rigTable(cardPair(), [['sun:2', 'sea:9', 'leaf:1'], ['fire:1', 'fire:2']]);

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'sun:2'])
            ->assertSessionHasNoErrors();

        $rules = $game->fresh()->rules();
        expect($rules->top())->toBe('sun:2')->and($rules->turn)->toBe(1)->and($game->fresh()->turns)->toBe(1);
    });

    test('a card that does not fit is refused', function () {
        $game = rigTable(cardPair(), [['leaf:1', 'sea:9'], ['fire:1']]);

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'leaf:1'])
            ->assertSessionHasErrors(['move' => 'Die kaart past niet.']);
    });

    test('you cannot play when it is not your turn', function () {
        $game = rigTable(cardPair(), [['sun:1', 'sea:9'], ['sun:2', 'sea:8']]);

        $this->actingAs(atSeat($game, 1))->post(route('tribekaarten.play', $game), ['card' => 'sun:2'])
            ->assertSessionHasErrors(['move' => 'Je bent niet aan de beurt.']);
    });

    test('a colour change needs a colour that exists', function () {
        $game = rigTable(cardPair(), [['wild:wild', 'sea:9'], ['fire:1']]);

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'wild:wild', 'color' => 'paars'])
            ->assertSessionHasErrors('color');
        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'wild:wild', 'color' => 'leaf'])
            ->assertSessionHasNoErrors();

        expect($game->fresh()->rules()->color)->toBe('leaf');
    });

    test('drawing a card that fits lets you play or keep it', function () {
        $game = rigTable(cardPair(), [['leaf:1', 'leaf:2'], ['fire:1']], draw: ['sun:8']);
        $me = atSeat($game, 0);

        $this->actingAs($me)->post(route('tribekaarten.draw', $game))->assertSessionHasNoErrors();
        expect(cardState($me, $game))->drawn->toBe('sun:8')->playable->toBe(['sun:8']);

        $this->actingAs($me)->post(route('tribekaarten.pass', $game))->assertSessionHasNoErrors();
        expect($game->fresh()->rules()->turn)->toBe(1);
    });

    test('the turn timer draws a card for you', function () {
        $game = rigTable(cardPair(), [['leaf:1', 'leaf:2'], ['fire:1', 'fire:2']], draw: ['sea:3']);

        $this->travel(config('cards.turn_seconds') + 1)->seconds();
        $state = cardState(atSeat($game, 1), $game);

        expect($state['seats'][0]['cardCount'])->toBe(3)
            ->and($state['turn'])->toBe(1)
            ->and(array_column($state['events'], 'type'))->toContain('timeout');
    });

    test('the NPC makes its move after a short pause', function () {
        $me = User::factory()->create();
        $game = CardGame::start('kantine', 'kaarttafel-1', [$me], 2, 'normal');
        untilPlay();
        $mySeat = $game->seatOf($me)->seat;
        $npcSeat = 1 - $mySeat;
        $hands = [$mySeat => ['leaf:1', 'leaf:2'], $npcSeat => ['sun:3', 'fire:4']];
        ksort($hands);
        $game = rigTable($game, $hands, turn: $npcSeat);

        expect(cardState($me, $game)['turn'])->toBe($npcSeat);

        $this->travel(2)->seconds();
        $state = cardState($me, $game);

        expect($state['top'])->toBe('sun:3')
            ->and($state['turn'])->toBe($mySeat)
            ->and($state['seats'][$npcSeat]['cardCount'])->toBe(1);
    });

    test('NPCs play a game to the end on their own while you keep polling', function () {
        $me = User::factory()->create();
        $game = CardGame::start('kantine', 'kaarttafel-1', [$me], 4, 'normal', ['stacking']);
        untilPlay();

        for ($poll = 0; $poll < 600 && $game->fresh()->isActive(); $poll++) {
            $this->travel(2)->seconds();
            // Draw when it's our turn, so we never time out
            if (cardState($me, $game)['turn'] === $game->seatOf($me)->seat) {
                $this->actingAs($me)->post(route('tribekaarten.draw', $game));
                $this->actingAs($me)->post(route('tribekaarten.pass', $game));
            }
        }

        $game->refresh();
        expect($game->status)->toBe('finished')
            ->and($game->winner_seat)->not->toBeNull()
            ->and($game->players->firstWhere('seat', $game->winner_seat)->is_winner)->toBeTrue()
            ->and($game->turns)->toBeGreaterThan(0);
    });

    test('pressing "LAATSTE!" before the other does catches them', function () {
        $game = rigTable(cardPair(), [['sun:1', 'sea:9'], ['fire:1', 'fire:2', 'leaf:4']]);

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'sun:1']);
        $this->actingAs(atSeat($game, 1))->post(route('tribekaarten.last', $game))->assertSessionHasNoErrors();

        $state = cardState(atSeat($game, 1), $game);
        expect($state['seats'][0]['cardCount'])->toBe(1 + config('cards.last_card_penalty'))
            ->and(array_column($state['events'], 'type'))->toContain('caught');
    });

    test('pressing "LAATSTE!" yourself in time keeps you safe', function () {
        $game = rigTable(cardPair(), [['sun:1', 'sea:9'], ['fire:1', 'fire:2', 'leaf:4']]);

        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.last', $game));
        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'sun:1']);
        $this->actingAs(atSeat($game, 1))->post(route('tribekaarten.last', $game));

        expect($game->fresh()->rules()->hand(0))->toHaveCount(1);
    });

    test('playing your last card wins, and the win counts', function () {
        $game = rigTable(cardPair(), [['sun:1'], ['fire:1', 'fire:2', 'leaf:4']]);
        $winner = atSeat($game, 0);

        $this->actingAs($winner)->post(route('tribekaarten.play', $game), ['card' => 'sun:1']);

        $state = cardState($winner, $game);
        expect($state)->status->toBe('finished')->winnerSeat->toBe(0)->endReason->toBe('won')->wins->toBe(1)
            ->and($state['seats'][1]['cardsLeft'])->toBe(3)
            ->and(CardGame::winsOf(atSeat($game, 1)))->toBe(0);

        $this->actingAs($winner)->getJson(route('tribekaarten.table', CARD_TABLE))->assertJson(['wins' => 1]);
    });
});

describe('giving up, leaving and disconnecting', function () {
    test('giving up puts your hand back and the others play on', function () {
        $game = CardGame::start('kantine', 'kaarttafel-1', User::factory()->count(3)->create(), 3, 'normal');
        untilPlay();
        $quitter = atSeat($game, 0);

        $this->actingAs($quitter)->post(route('tribekaarten.resign', $game));

        $game->refresh();
        expect($game->isActive())->toBeTrue()
            ->and($game->players->firstWhere('seat', 0)->status)->toBe(CardGamePlayer::FORFEITED)
            ->and($game->rules()->hand(0))->toBe([])
            ->and(count($game->rules()->drawPile))->toBe(108 - 21 - 1 + 7)
            ->and($game->rules()->turn)->not->toBe(0);
    });

    test('the last student keeps playing against the NPCs', function () {
        $game = CardGame::start('kantine', 'kaarttafel-1', User::factory()->count(2)->create(), 4, 'normal');
        untilPlay();
        $leaver = $game->players->whereNotNull('user_id')->first();

        $this->actingAs($leaver->user)->post(route('tribekaarten.resign', $game));

        expect($game->fresh()->isActive())->toBeTrue();
    });

    test('when the last student leaves against an NPC, the NPC wins', function () {
        $me = User::factory()->create();
        $game = CardGame::start('kantine', 'kaarttafel-1', [$me], 2, 'normal');
        untilPlay();

        $this->actingAs($me)->post(route('tribekaarten.leave', $game))
            ->assertRedirect(route('ontmoeten.lobby', ['kamer' => 'kantine']));

        $game->refresh();
        expect($game->status)->toBe('finished')
            ->and($game->winner_seat)->toBe(1 - $game->seatOf($me)->seat)
            ->and($game->seatOf($me)->status)->toBe(CardGamePlayer::LEFT);
    });

    test('when every student is gone the game ends without a winner', function () {
        $me = User::factory()->create();
        $game = CardGame::start('kantine', 'kaarttafel-1', [$me], 4, 'normal');
        untilPlay();

        $this->actingAs($me)->post(route('tribekaarten.resign', $game));

        expect($game->fresh())->status->toBe('finished')->end_reason->toBe('abandoned')->winner_seat->toBeNull();
    });

    test('leaving a finished game does not change the result', function () {
        $game = rigTable(cardPair(), [['sun:1'], ['fire:1', 'fire:2']]);
        $this->actingAs(atSeat($game, 0))->post(route('tribekaarten.play', $game), ['card' => 'sun:1']);

        $this->actingAs(atSeat($game, 1))->post(route('tribekaarten.leave', $game));

        expect($game->fresh())->winner_seat->toBe(0)->end_reason->toBe('won');
    });

    test('an NPC takes over the seat of a student who disconnected', function () {
        $game = cardPair();
        $stays = atSeat($game, 0);

        // Only seat 0 keeps polling
        for ($second = 0; $second <= config('cards.disconnect_timeout_seconds'); $second += 10) {
            $this->travel(10)->seconds();
            cardState($stays, $game);
        }

        $state = cardState($stays, $game);
        expect($state['seats'][1]['status'])->toBe(CardGamePlayer::TAKEN_OVER)
            ->and($state['status'])->not->toBe('finished')
            ->and(array_column($state['events'], 'type'))->toContain('takeover');

        // The student who came back can't play their old seat any more
        $this->actingAs(atSeat($game, 1))->post(route('tribekaarten.draw', $game))
            ->assertSessionHasErrors(['move' => 'Je speelt niet meer mee aan deze tafel.']);
    });

    test('the hotel offers to go back to a running game', function () {
        $game = cardPair();

        $this->actingAs(atSeat($game, 0))->get(route('ontmoeten.lobby'))
            ->assertInertia(fn (Assert $page) => $page->where('activeCardGame', $game->id));
    });
});
