<?php

use App\Models\LobbyPresence;
use App\Models\Post;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('the dashboard contains current feed, friends and lobby data', function () {
    $user = User::factory()->create();
    $friend = User::factory()->create();
    befriend($user, $friend);

    $post = Post::create([
        'user_id' => $friend->id,
        'body' => 'Een bericht van een vriend.',
        'visibility' => 'friends',
    ]);

    LobbyPresence::create([
        'user_id' => $friend->id,
        'room_id' => 'kantine',
        'last_seen_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('posts.0.id', (string) $post->id)
            ->where('contacts.0.id', (string) $friend->id)
            ->where('rooms.0.id', 'kantine')
            ->where('rooms.0.peopleCount', 1)
            ->where('onlineCount', 1));
});

test('expired lobby presence is not shown on the dashboard', function () {
    $user = User::factory()->create();

    LobbyPresence::create([
        'user_id' => $user->id,
        'room_id' => 'kantine',
        'last_seen_at' => now()->subSeconds(76),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('rooms.0.peopleCount', 0)
            ->where('onlineCount', 0));
});
