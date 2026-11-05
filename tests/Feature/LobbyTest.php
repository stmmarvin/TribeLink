<?php

use App\Models\LobbyPresence;
use App\Models\User;
use Illuminate\Testing\TestResponse;

test('opening a lobby room records the users presence', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('ontmoeten.lobby', ['kamer' => 'kantine']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('ontmoeten/lobby')
            ->where('currentRoomId', 'kantine')
            ->has('lobbyRooms', 2)
            ->where('lobbyRooms.0.name', 'Kantine')
            ->where('lobbyRooms.1.name', 'Arcade'));

    $this->assertDatabaseHas('lobby_presences', [
        'user_id' => $user->id,
        'room_id' => 'kantine',
    ]);
});

test('offline rooms are not available', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('ontmoeten.lobby', ['kamer' => 'spelletjeshoek']))
        ->assertNotFound();
});

test('a user can propose a game in their current room', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('ontmoeten.lobby.proposals'), [
            'room_id' => 'kantine',
            'game_proposal' => 'Codenames',
        ])
        ->assertRedirect();

    expect(LobbyPresence::where('user_id', $user->id)->value('game_proposal'))
        ->toBe('Codenames');
});

test('lobby heartbeat only accepts known rooms', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('ontmoeten.lobby.heartbeat'), [
            'room_id' => 'unknown-room',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('room_id');
});

function lobbySync(User $user, array $overrides = []): TestResponse
{
    return test()->actingAs($user)->postJson(route('ontmoeten.lobby.sync'), [
        'room_id' => 'kantine',
        'x' => 3,
        'y' => 4,
        'dir' => 2,
        'sitting' => false,
        'dancing' => false,
        'typing' => false,
        'waves' => 0,
        'look' => [
            'skin' => '#FFDBB8',
            'hair' => '#2B1B10',
            'hairStyle' => 0,
            'shirt' => '#2F6BFF',
            'pants' => '#0F1E3A',
            'shoes' => '#FFFFFF',
        ],
        ...$overrides,
    ]);
}

test('people in the same room see each other', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();

    lobbySync($a)->assertOk()->assertJsonCount(0, 'people');

    lobbySync($b, ['x' => 5, 'y' => 6, 'dancing' => true])
        ->assertOk()
        ->assertJsonCount(1, 'people')
        ->assertJsonPath('people.0.username', $a->username)
        ->assertJsonPath('people.0.x', 3)
        ->assertJsonPath('people.0.look.shirt', '#2F6BFF')
        ->assertJsonPath('peopleCount', 2);

    lobbySync($a)
        ->assertJsonPath('people.0.username', $b->username)
        ->assertJsonPath('people.0.dancing', true);
});

test('people who stopped syncing disappear', function () {
    $a = User::factory()->create();
    lobbySync($a);
    LobbyPresence::where('user_id', $a->id)->update(['last_seen_at' => now()->subMinute()]);

    lobbySync(User::factory()->create())->assertJsonCount(0, 'people');
});

test('room chat reaches the others, without replaying history', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();

    $this->actingAs($a)->postJson(route('ontmoeten.lobby.chat'), ['room_id' => 'kantine', 'body' => 'Oud bericht']);

    // First sync: no history, just where to start
    $first = lobbySync($b)->assertJsonCount(0, 'messages');
    $since = $first->json('latestMessageId');

    $this->actingAs($a)
        ->postJson(route('ontmoeten.lobby.chat'), ['room_id' => 'kantine', 'body' => 'Hoi allemaal'])
        ->assertCreated();

    lobbySync($b, ['since' => $since])
        ->assertJsonCount(1, 'messages')
        ->assertJsonPath('messages.0.body', 'Hoi allemaal')
        ->assertJsonPath('messages.0.userId', $a->id);
});

test('sync validates the avatar state', function () {
    lobbySync(User::factory()->create(), ['dir' => 9, 'look' => ['skin' => 'rood']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['dir', 'look.skin']);
});
