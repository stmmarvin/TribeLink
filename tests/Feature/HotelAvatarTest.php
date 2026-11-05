<?php

use App\Models\User;

$look = [
    'skin' => '#F1C7A5',
    'hair' => '#5A3A1E',
    'hairStyle' => 1,
    'shirt' => '#2F6BFF',
    'pants' => '#3B4A68',
    'shoes' => '#FFFFFF',
];

test('a new account goes to the avatar maker after verifying its email', function () {
    $user = User::factory()->unverified()->create();
    $user->generateVerificationCode();

    $this->actingAs($user)
        ->post(route('verification.verify-code'), ['code' => $user->fresh()->verification_code])
        ->assertRedirect(route('hotel.avatar'));
});

test('an account that already has an avatar goes to the dashboard after verifying', function () use ($look) {
    $user = User::factory()->unverified()->create();
    $user->forceFill(['hotel_look' => $look])->save();
    $user->generateVerificationCode();

    $this->actingAs($user)
        ->post(route('verification.verify-code'), ['code' => $user->fresh()->verification_code])
        ->assertRedirect('/dashboard');
});

test('the avatar maker renders', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('hotel.avatar'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('ontmoeten/poppetje')->where('look', null));
});

test('saving the avatar stores it and walks you into the Hotel', function () use ($look) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('hotel.avatar.store'), ['look' => $look])
        ->assertRedirect(route('ontmoeten.lobby'));

    expect($user->fresh()->hotel_look)->toBe($look);

    $this->actingAs($user)
        ->get(route('ontmoeten.lobby'))
        ->assertInertia(fn ($page) => $page->where('savedLook', $look));
});

test('an invalid avatar is rejected', function () use ($look) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('hotel.avatar.store'), ['look' => [...$look, 'skin' => 'red']])
        ->assertSessionHasErrors('look.skin');

    expect($user->fresh()->hotel_look)->toBeNull();
});
