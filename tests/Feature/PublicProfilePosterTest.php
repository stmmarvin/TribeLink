<?php

use App\Models\User;

test('public profile poster page renders the poster message and qr code', function () {
    $user = User::factory()->create([
        'poster_message' => 'Let\'s connect and build something great.',
        'bio' => 'Software development student.',
    ]);

    $this
        ->get(route('profile.public', ['user' => $user]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public-profile')
            ->where('user.name', $user->name)
            ->where('user.username', $user->username)
            ->where('user.bio', $user->bio)
            ->where('user.poster_message', 'Let\'s connect and build something great.')
            ->where('profile_url', route('profile.public', ['user' => $user], true))
            ->where('qr_code_svg', fn (string $value) => $value !== '' && str_contains($value, '<svg')));
});

test('authenticated visitors receive the friendship state', function () {
    $viewer = User::factory()->create();
    $profile = User::factory()->create();
    $viewer->friends()->attach($profile, ['accepted_at' => now()]);

    $this->actingAs($viewer)
        ->get(route('profile.public', ['user' => $profile]))
        ->assertInertia(fn ($page) => $page
            ->where('viewer.authenticated', true)
            ->where('viewer.is_self', false)
            ->where('viewer.is_friend', true));
});

test('a public profile does not expose the profile owners email address', function () {
    $profile = User::factory()->create();

    $this->get(route('profile.public', ['user' => $profile]))
        ->assertInertia(fn ($page) => $page
            ->where('user.email', null));
});

test('the profile owner can still use their own email contact link', function () {
    $profile = User::factory()->create();

    $this->actingAs($profile)
        ->get(route('profile.public', ['user' => $profile]))
        ->assertInertia(fn ($page) => $page
            ->where('user.email', $profile->email));
});

test('public profile remains available to logged-out visitors', function () {
    $profile = User::factory()->create();

    $this->get(route('profile.public', ['user' => $profile]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('viewer.authenticated', false)
            ->where('viewer.is_self', false)
            ->where('viewer.is_friend', false));
});

test('logged-out visitors are redirected to login before opening a profile chat', function () {
    $profile = User::factory()->create();

    $this->get(route('chats.open', ['user' => $profile]))
        ->assertRedirect(route('login'));
});
