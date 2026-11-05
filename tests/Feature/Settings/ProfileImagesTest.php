<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// A real 1x1 PNG, so the tests do not need the GD extension.
function fakePng(string $name): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        $name,
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
    );
}

test('profile photo can be uploaded', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.avatar.update'), [
            'avatar' => fakePng('me.png'),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->avatar_path)->not->toBeNull();
    expect($user->avatar)->toBe('/storage/'.$user->avatar_path);
    Storage::disk('public')->assertExists($user->avatar_path);
});

test('uploading a new photo removes the old one', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => fakePng('old.png'),
    ]);
    $oldPath = $user->refresh()->avatar_path;

    $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => fakePng('new.png'),
    ]);

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($user->refresh()->avatar_path);
});

test('profile photo must be an image', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])
        ->assertSessionHasErrors('avatar');

    expect($user->refresh()->avatar_path)->toBeNull();
});

test('profile photo can be removed', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => fakePng('me.png'),
    ]);
    $path = $user->refresh()->avatar_path;

    $this->actingAs($user)
        ->delete(route('profile.avatar.destroy'))
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->avatar_path)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

test('profile photo is shown with posts in the feed', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => fakePng('me.png'),
    ]);
    $user->posts()->create(['body' => 'Hoi', 'visibility' => 'friends']);

    $this->actingAs($user)
        ->get(route('feed'))
        ->assertInertia(fn ($page) => $page
            ->where('posts.0.author.avatarUrl', $user->refresh()->avatar));
});

test('profile photo is deleted together with the account', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => fakePng('me.png'),
    ]);
    $path = $user->refresh()->avatar_path;

    $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

    Storage::disk('public')->assertMissing($path);
});

test('profile banner can be uploaded and is shown on the profile', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.banner.update'), [
            'banner' => fakePng('banner.png'),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->banner)->toBe('/storage/'.$user->banner_path);
    Storage::disk('public')->assertExists($user->banner_path);

    $this->actingAs($user)
        ->get(route('profile.show'))
        ->assertInertia(fn ($page) => $page->where('bannerUrl', $user->banner));
});

test('uploading a new banner removes the old one', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.banner.update'), [
        'banner' => fakePng('old.png'),
    ]);
    $oldPath = $user->refresh()->banner_path;

    $this->actingAs($user)->post(route('profile.banner.update'), [
        'banner' => fakePng('new.png'),
    ]);

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($user->refresh()->banner_path);
});

test('profile banner must be an image', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.banner.update'), [
            'banner' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])
        ->assertSessionHasErrors('banner');

    expect($user->refresh()->banner_path)->toBeNull();
});

test('profile banner can be removed', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.banner.update'), [
        'banner' => fakePng('banner.png'),
    ]);
    $path = $user->refresh()->banner_path;

    $this->actingAs($user)
        ->delete(route('profile.banner.destroy'))
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->banner_path)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

test('profile banner is deleted together with the account', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('profile.banner.update'), [
        'banner' => fakePng('banner.png'),
    ]);
    $path = $user->refresh()->banner_path;

    $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

    Storage::disk('public')->assertMissing($path);
});
