<?php

use App\Models\User;
use App\Notifications\SendVerifyCodeNotification;
use Illuminate\Support\Facades\Notification;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => 'Test User',
            'email' => 'test@student.hu.nl',
        ]);

    // A new address has to be verified first
    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('verification.notice'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@student.hu.nl');
    expect($user->email_verified_at)->toBeNull();
});

test('profile bio can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'bio' => 'HBO-ICT student en maker van digitale producten.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->bio)
        ->toBe('HBO-ICT student en maker van digitale producten.');
});

test('a verification code is sent to a new email address', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => $user->name,
            'email' => 'nieuw@student.hu.nl',
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->verification_code)->not->toBeNull();
    Notification::assertSentTo($user, SendVerifyCodeNotification::class);
});

test('no verification code is sent when the email address is unchanged', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)->patch(route('profile.update'), [
        'username' => $user->username,
        'name' => 'Andere Naam',
        'email' => $user->email,
    ]);

    Notification::assertNothingSent();
});

test('poster message can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'poster_message' => 'Zin in een kop koffie?',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->poster_message)->toBe('Zin in een kop koffie?');
});

test('username must be unique and well formed', function () {
    User::factory()->create(['username' => 'bezet']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => 'Bezet',
            'name' => $user->name,
            'email' => $user->email,
        ])
        ->assertSessionHasErrors('username');

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => 'met spatie!',
            'name' => $user->name,
            'email' => $user->email,
        ])
        ->assertSessionHasErrors('username');
});

test('email must be a HU student address', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => $user->name,
            'email' => 'iemand@gmail.com',
        ])
        ->assertSessionHasErrors('email');
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'username' => $user->username,
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
