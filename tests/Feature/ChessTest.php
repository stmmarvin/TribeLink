<?php

use App\Models\ChessGame;
use App\Models\GameQueue;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

const BOARD = ['room_id' => 'kantine', 'board_id' => 'schaakbord-1'];

function chessState(User $user, ChessGame $game): array
{
    $state = null;

    test()->actingAs($user)
        ->get(route('schaken.show', $game))
        ->assertInertia(function (Assert $page) use (&$state) {
            $page->component('ontmoeten/schaken');
            $state = $page->toArray()['props']['game'];
        });

    return $state;
}

/** Two students at the same board, past the countdown. */
function chessPair(): array
{
    $a = User::factory()->create();
    $b = User::factory()->create();

    test()->actingAs($a)->postJson(route('schaken.search'), BOARD);
    test()->actingAs($b)->postJson(route('schaken.search'), BOARD);

    $game = ChessGame::firstOrFail();
    test()->travel(config('chess.countdown_seconds') + 1)->seconds();

    return [$game->white, $game->black, $game->fresh()];
}

function playMoves(ChessGame $game, array $moves): void
{
    foreach ($moves as $uci) {
        $game->refresh();
        $player = $game->turn() === ChessGame::WHITE ? $game->white : $game->black;

        test()->actingAs($player)
            ->post(route('schaken.move', $game), ['from' => substr($uci, 0, 2), 'to' => substr($uci, 2, 2), 'promotion' => substr($uci, 4, 1) ?: null])
            ->assertSessionHasNoErrors();
    }
}

test('guests cannot join a chess board', function () {
    $this->postJson(route('schaken.search'), BOARD)->assertUnauthorized();
});

test('a lone player waits at the board', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->postJson(route('schaken.search'), BOARD)
        ->assertOk()
        ->assertJson(['status' => 'searching', 'npcInSeconds' => config('chess.npc_wait_seconds')]);

    expect(ChessGame::count())->toBe(0);
});

test('only rooms with chess boards can be joined', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('schaken.search'), [...BOARD, 'room_id' => 'nergens'])
        ->assertJsonValidationErrors('room_id');
});

test('two players at the same board are matched with one of each colour', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();

    $this->actingAs($a)->postJson(route('schaken.search'), BOARD);
    $this->actingAs($b)->postJson(route('schaken.search'), BOARD)
        ->assertJson(['status' => 'matched']);

    $game = ChessGame::sole();
    expect([$game->white_id, $game->black_id])->toEqualCanonicalizing([$a->id, $b->id])
        ->and($game->npc_difficulty)->toBeNull()
        ->and(GameQueue::count())->toBe(0);

    // The first player hears about the match with their next poll
    $this->actingAs($a)->postJson(route('schaken.queue'))
        ->assertJson(['status' => 'matched', 'gameId' => $game->id]);
});

test('players at different boards are not matched', function () {
    $this->actingAs(User::factory()->create())->postJson(route('schaken.search'), BOARD);
    $this->actingAs(User::factory()->create())->postJson(route('schaken.search'), [...BOARD, 'board_id' => 'schaakbord-2'])
        ->assertJson(['status' => 'searching']);

    expect(ChessGame::count())->toBe(0);
});

test('a player who stopped polling is not matched', function () {
    $this->actingAs(User::factory()->create())->postJson(route('schaken.search'), BOARD);
    $this->travel(config('chess.queue_timeout_seconds') + 1)->seconds();

    $this->actingAs(User::factory()->create())->postJson(route('schaken.search'), BOARD)
        ->assertJson(['status' => 'searching']);
});

test('a lone player plays the NPC after the wait', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->postJson(route('schaken.search'), [...BOARD, 'difficulty' => 'hard']);
    // Polling every second, like the Hotel does
    for ($second = 1; $second < config('chess.npc_wait_seconds'); $second++) {
        $this->travel(1)->seconds();
        $this->postJson(route('schaken.queue'))->assertJson(['status' => 'searching']);
    }
    $this->travel(1)->seconds();

    $this->postJson(route('schaken.queue'))->assertJson(['status' => 'matched']);

    $game = ChessGame::sole();
    expect($game->npc_difficulty)->toBe('hard')
        ->and($game->hasParticipant($me))->toBeTrue()
        ->and($game->isNpc(ChessGame::opposite($game->colorOf($me))))->toBeTrue();
});

test('cancelling leaves the queue', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->postJson(route('schaken.search'), BOARD);
    $this->deleteJson(route('schaken.cancel'))->assertJson(['status' => 'idle']);

    expect(GameQueue::count())->toBe(0);
});

test('only the players can open a game', function () {
    [, , $game] = chessPair();

    $this->actingAs(User::factory()->create())->get(route('schaken.show', $game))->assertForbidden();
});

test('the game page shows both players and the position', function () {
    [$white, , $game] = chessPair();

    expect(chessState($white, $game))
        ->status->toBe('active')
        ->myColor->toBe('white')
        ->white->username->toBe($white->username)
        ->fen->toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
});

test('a legal move is stored', function () {
    [$white, , $game] = chessPair();

    $this->actingAs($white)->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e4'])
        ->assertSessionHasNoErrors();

    $game->refresh();
    expect($game->moves)->toBe(['e2e4'])
        ->and($game->pgn)->toBe('1. e4')
        ->and($game->turn())->toBe(ChessGame::BLACK);
});

test('an illegal move is rejected', function () {
    [$white, , $game] = chessPair();

    $this->actingAs($white)->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e5'])
        ->assertSessionHasErrors('move');

    expect($game->fresh()->moves)->toBe([]);
});

test('you cannot move when it is not your turn', function () {
    [, $black, $game] = chessPair();

    $this->actingAs($black)->post(route('schaken.move', $game), ['from' => 'e7', 'to' => 'e5'])
        ->assertSessionHasErrors('move');
});

test('no moves during the countdown', function () {
    $a = User::factory()->create();
    $this->actingAs($a)->postJson(route('schaken.search'), BOARD);
    $this->actingAs(User::factory()->create())->postJson(route('schaken.search'), BOARD);
    $game = ChessGame::sole();

    $this->actingAs($game->white)->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e4'])
        ->assertSessionHasErrors('move');
});

test('outsiders cannot move', function () {
    [, , $game] = chessPair();

    $this->actingAs(User::factory()->create())->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e4'])
        ->assertForbidden();
});

test('checkmate ends the game', function () {
    [, , $game] = chessPair();

    // Fool's mate
    playMoves($game, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);

    expect($game->fresh())
        ->status->toBe('finished')
        ->end_reason->toBe('checkmate')
        ->winner->toBe('black')
        ->result->toBe('0-1');
});

test('a pawn can promote', function () {
    [, , $game] = chessPair();

    playMoves($game, ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'f8g7', 'h6g7', 'e7e6', 'g7h8n']);

    expect($game->fresh())
        ->fen->toStartWith('rnbqk1nN/')
        ->pgn->toEndWith('5. gxh8=N');
});

test('the human player makes the NPC moves, which are validated too', function () {
    $me = User::factory()->create();
    $game = ChessGame::start('kantine', 'schaakbord-1', null, $me, 'normal');
    $this->travel(config('chess.countdown_seconds') + 1)->seconds();

    $this->actingAs($me)->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e5'])
        ->assertSessionHasErrors('move');
    $this->actingAs($me)->post(route('schaken.move', $game), ['from' => 'e2', 'to' => 'e4'])
        ->assertSessionHasNoErrors();
    $this->actingAs($me)->post(route('schaken.move', $game), ['from' => 'e7', 'to' => 'e5'])
        ->assertSessionHasNoErrors();

    expect($game->fresh()->moves)->toBe(['e2e4', 'e7e5']);
});

test('resigning makes the opponent win', function () {
    [$white, , $game] = chessPair();

    $this->actingAs($white)->post(route('schaken.resign', $game));

    expect($game->fresh())
        ->status->toBe('finished')
        ->end_reason->toBe('resign')
        ->winner->toBe('black');
});

test('leaving a running game counts as resigning and goes back to the hotel', function () {
    [, $black, $game] = chessPair();

    $this->actingAs($black)->post(route('schaken.leave', $game))
        ->assertRedirect(route('ontmoeten.lobby', ['kamer' => 'kantine']));

    expect($game->fresh())->end_reason->toBe('left')->winner->toBe('white');
});

test('leaving a finished game does not change the result', function () {
    [$white, $black, $game] = chessPair();

    $this->actingAs($white)->post(route('schaken.resign', $game));
    $this->actingAs($black)->post(route('schaken.leave', $game));

    expect($game->fresh())->end_reason->toBe('resign')->winner->toBe('black');
});

test('an opponent who disconnects loses on time', function () {
    [$white, , $game] = chessPair();

    $this->travel(config('chess.disconnect_timeout_seconds') + 1)->seconds();

    expect(chessState($white, $game))
        ->status->toBe('finished')
        ->endReason->toBe('timeout')
        ->winner->toBe('white');
});

test('an opponent who keeps polling does not lose on time', function () {
    [$white, $black, $game] = chessPair();

    $this->travel(20)->seconds();
    chessState($black, $game);
    $this->travel(20)->seconds();

    expect(chessState($white, $game)['status'])->toBe('active');
});

test('the hotel offers to go back to a running game', function () {
    [$white, , $game] = chessPair();

    $this->actingAs($white)->get(route('ontmoeten.lobby'))
        ->assertInertia(fn (Assert $page) => $page->where('activeChessGame', $game->id));
});

test('joining a board again ends the running game', function () {
    [$white, , $game] = chessPair();

    $this->actingAs($white)->postJson(route('schaken.search'), BOARD)->assertJson(['status' => 'searching']);

    expect($game->fresh())->end_reason->toBe('left')->winner->toBe('black');
});
