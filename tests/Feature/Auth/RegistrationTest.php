<?php

use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'username' => 'test_user',
        'name' => 'Test User',
        'email' => 'test@student.hu.nl',
        'password' => 'StrongPassword12!',
        'password_confirmation' => 'StrongPassword12!',
    ]);

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'username' => 'test_user',
        'email' => 'test@student.hu.nl',
        'name' => 'Test User',
    ]);
    $response->assertRedirect(route('dashboard', absolute: false));
});
