<?php

use App\Models\Friendship;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from the feed', function () {
    $this->get(route('feed'))->assertRedirect(route('login'));
});

test('verified users can view their own posts in the feed', function () {
    $user = User::factory()->create();
    $post = Post::create(['user_id' => $user->id, 'body' => 'Welkom bij de TribeLink feed.']);

    $this->actingAs($user)
        ->get(route('feed'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('feed/index')
            ->where('posts.0.id', (string) $post->id)
            ->where('posts.0.body', $post->body)
            ->where('posts.0.author.username', $user->username));
});

test('the feed is empty without friends', function () {
    $me = User::factory()->create();
    Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Hoi']);

    $this->actingAs($me)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('feed/index')
            ->where('posts', []));
});

test('the feed is empty when friends have no posts', function () {
    $me = User::factory()->create();
    befriend($me, User::factory()->create());

    $this->actingAs($me)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page->where('posts', []));
});

test('the feed shows posts of friends in the frontend shape', function () {
    $me = User::factory()->create();
    $friend = User::factory()->create(['username' => 'lisa']);
    befriend($friend, $me);
    $post = Post::create(['user_id' => $friend->id, 'body' => 'Hallo tribe!']);

    $this->actingAs($me)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts', 1)
            ->where('posts.0.id', (string) $post->id)
            ->where('posts.0.author.id', (string) $friend->id)
            ->where('posts.0.author.username', 'lisa')
            ->where('posts.0.body', 'Hallo tribe!')
            ->where('posts.0.visibility', 'friends')
            ->where('posts.0.isOwn', false)
            ->where('posts.0.commentCount', 0)
            ->where('posts.0.likeCount', 0));
});

test('friends-only posts are visible only to friends', function () {
    $author = User::factory()->create();
    $friend = User::factory()->create();
    $stranger = User::factory()->create();
    $post = Post::create(['user_id' => $author->id, 'body' => 'Alleen voor mijn vrienden.']);

    befriend($friend, $author);

    $this->actingAs($friend)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page->where('posts.0.id', (string) $post->id));

    $this->actingAs($stranger)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page->where('posts', []));
});

test('the feed shows your own and friends posts, but hides friends-only posts of strangers and open requests', function () {
    $me = User::factory()->create();
    $friend = User::factory()->create();
    $requested = User::factory()->create();
    befriend($me, $friend);
    Friendship::create(['user_id' => $me->id, 'friend_id' => $requested->id]);

    Post::create(['user_id' => $friend->id, 'body' => 'Van een vriend']);
    Post::create(['user_id' => $requested->id, 'body' => 'Nog geen vriend']);
    Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Onbekende', 'visibility' => 'friends']);
    Post::create(['user_id' => $me->id, 'body' => 'Van mezelf']);

    $this->actingAs($me)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts', 2)
            ->where('posts.0.body', 'Van mezelf')
            ->where('posts.0.isOwn', true)
            ->where('posts.1.body', 'Van een vriend')
            ->where('posts.1.isOwn', false));
});

test('public posts are visible to everyone', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Voor iedereen', 'visibility' => 'public']);
    $stranger = User::factory()->create();

    $this->actingAs($stranger)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts', 1)
            ->where('posts.0.body', 'Voor iedereen')
            ->where('posts.0.isOwn', false));

    $this->actingAs($stranger)->get(route('feed.show', $post))->assertOk();
    $this->actingAs($stranger)->post(route('feed.like', $post))->assertRedirect();
    $this->actingAs($stranger)
        ->post(route('feed.comments.store', $post), ['body' => 'Leuk!'])
        ->assertRedirect();
});

test('friends-only posts of strangers cannot be opened', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Privé.', 'visibility' => 'friends']);

    $this->actingAs(User::factory()->create())
        ->get(route('feed.show', $post))
        ->assertForbidden();
});

test('the newest post comes first', function () {
    $me = User::factory()->create();
    $friend = User::factory()->create();
    befriend($me, $friend);
    Post::create(['user_id' => $friend->id, 'body' => 'Oud', 'created_at' => now()->subDay()]);
    Post::create(['user_id' => $friend->id, 'body' => 'Nieuw']);

    $this->actingAs($me)
        ->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('posts.0.body', 'Nieuw')
            ->where('posts.1.body', 'Oud'));
});

test('a user can publish a post with the chosen visibility', function (string $visibility) {
    $me = User::factory()->create();

    $this->actingAs($me)
        ->post(route('feed.store'), ['body' => 'Hallo tribe!', 'visibility' => $visibility])
        ->assertRedirect(route('feed'));

    $this->assertDatabaseHas('posts', [
        'user_id' => $me->id,
        'body' => 'Hallo tribe!',
        'visibility' => $visibility,
    ]);
})->with(['public', 'friends']);

test('a post is saved without surrounding spaces', function () {
    $me = User::factory()->create();

    $this->actingAs($me)
        ->post(route('feed.store'), ['body' => '  Hoi  ', 'visibility' => 'friends']);

    $this->assertDatabaseHas('posts', ['user_id' => $me->id, 'body' => 'Hoi', 'visibility' => 'friends']);
});

test('an empty or whitespace-only post is rejected', function (string $body) {
    $this->actingAs(User::factory()->create())
        ->post(route('feed.store'), ['body' => $body])
        ->assertSessionHasErrors('body');

    expect(Post::count())->toBe(0);
})->with(['empty' => '', 'only spaces' => '   ']);

test('guests cannot publish a post', function () {
    $this->post(route('feed.store'), ['body' => 'Hoi'])
        ->assertRedirect(route('login'));

    expect(Post::count())->toBe(0);
});

test('the author can update their post', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Oud', 'visibility' => 'public']);

    $this->actingAs($me)
        ->from(route('feed'))
        ->patch(route('feed.update', $post), ['body' => '  Nieuw  '])
        ->assertRedirect(route('feed'));

    expect($post->fresh())
        ->body->toBe('Nieuw')
        ->visibility->toBe('public');
});

test('updating a post can change its visibility', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Oud']);

    $this->actingAs($me)
        ->patch(route('feed.update', $post), ['body' => 'Nieuw', 'visibility' => 'public']);

    expect($post->fresh()->visibility)->toBe('public');
});

test('the author can replace the photo of their post', function () {
    Storage::fake('public');
    $me = User::factory()->create();
    Storage::disk('public')->put('posts/oud.jpg', 'x');
    $post = Post::create(['user_id' => $me->id, 'body' => 'Foto', 'image_path' => 'posts/oud.jpg']);

    $this->actingAs($me)
        ->from(route('feed'))
        ->patch(route('feed.update', $post), [
            'body' => 'Foto',
            // Tiny 1x1 PNG, so the test also works without the GD extension
            'image' => UploadedFile::fake()->createWithContent(
                'nieuw.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
            ),
        ])
        ->assertRedirect(route('feed'));

    $newPath = $post->fresh()->image_path;
    expect($newPath)->not->toBe('posts/oud.jpg')->not->toBeNull();
    Storage::disk('public')->assertMissing('posts/oud.jpg');
    Storage::disk('public')->assertExists($newPath);
});

test('the author can remove the photo of their post', function () {
    Storage::fake('public');
    $me = User::factory()->create();
    Storage::disk('public')->put('posts/oud.jpg', 'x');
    $post = Post::create(['user_id' => $me->id, 'body' => 'Foto', 'image_path' => 'posts/oud.jpg']);

    $this->actingAs($me)
        ->patch(route('feed.update', $post), ['body' => 'Foto', 'remove_image' => true]);

    expect($post->fresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing('posts/oud.jpg');
});

test('editing only the text keeps the photo', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Oud', 'image_path' => 'posts/blijft.jpg']);

    $this->actingAs($me)
        ->patch(route('feed.update', $post), ['body' => 'Nieuw']);

    expect($post->fresh()->image_path)->toBe('posts/blijft.jpg');
});

test('an update needs valid content', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Oud']);

    $this->actingAs($me)
        ->patch(route('feed.update', $post), ['body' => '   '])
        ->assertSessionHasErrors('body');

    expect($post->fresh()->body)->toBe('Oud');
});

test('nobody else can update a post', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Van een ander']);

    $this->actingAs(User::factory()->create())
        ->patch(route('feed.update', $post), ['body' => 'Gehackt'])
        ->assertForbidden();

    expect($post->fresh()->body)->toBe('Van een ander');
});

test('the author can delete their post', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Weg ermee']);

    // Deleting from the feed: you stay on the feed
    $this->actingAs($me)
        ->from(route('feed'))
        ->delete(route('feed.destroy', $post))
        ->assertRedirect(route('feed'));

    $this->assertModelMissing($post);
});

test('deleting a post from its detail page goes back to the feed', function () {
    $me = User::factory()->create();
    $post = Post::create(['user_id' => $me->id, 'body' => 'Weg ermee']);

    $this->actingAs($me)
        ->from(route('feed.show', $post))
        ->delete(route('feed.destroy', $post))
        ->assertRedirect(route('feed'));
});

test('nobody else can delete a post', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Blijft staan']);

    $this->actingAs(User::factory()->create())
        ->delete(route('feed.destroy', $post))
        ->assertForbidden();

    $this->assertModelExists($post);
});

test('guests cannot update or delete posts', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Hoi']);

    $this->patch(route('feed.update', $post), ['body' => 'X'])
        ->assertRedirect(route('login'));
    $this->delete(route('feed.destroy', $post))
        ->assertRedirect(route('login'));

    $this->assertModelExists($post);
});

test('a user can like and unlike a visible post', function () {
    $user = User::factory()->create();
    $post = Post::create(['user_id' => $user->id, 'body' => 'Een likebare post.']);

    $this->actingAs($user)
        ->post(route('feed.like', $post))
        ->assertRedirect();

    $this->assertDatabaseHas('post_likes', ['post_id' => $post->id, 'user_id' => $user->id]);

    $this->actingAs($user)
        ->post(route('feed.like', $post))
        ->assertRedirect();

    $this->assertDatabaseMissing('post_likes', ['post_id' => $post->id, 'user_id' => $user->id]);
});

test('a friend can like a post', function () {
    $author = User::factory()->create();
    $friend = User::factory()->create();
    befriend($author, $friend);
    $post = Post::create(['user_id' => $author->id, 'body' => 'Voor vrienden.']);

    $this->actingAs($friend)
        ->post(route('feed.like', $post))
        ->assertRedirect();

    $this->assertDatabaseHas('post_likes', ['post_id' => $post->id, 'user_id' => $friend->id]);
});

test('a user cannot like a private post they cannot see', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Privé.']);

    $this->actingAs(User::factory()->create())
        ->post(route('feed.like', $post))
        ->assertForbidden();
});

test('a user can comment on a visible post', function () {
    $user = User::factory()->create();
    $post = Post::create(['user_id' => $user->id, 'body' => 'Een bespreekbare post.']);

    $this->actingAs($user)
        ->post(route('feed.comments.store', $post), ['body' => 'Goede post!'])
        ->assertRedirect();

    $this->assertDatabaseHas('post_comments', [
        'post_id' => $post->id,
        'user_id' => $user->id,
        'body' => 'Goede post!',
    ]);
});

test('a user cannot comment on an inaccessible private post', function () {
    $post = Post::create(['user_id' => User::factory()->create()->id, 'body' => 'Privé.']);

    $this->actingAs(User::factory()->create())
        ->post(route('feed.comments.store', $post), ['body' => 'Niet toegestaan'])
        ->assertForbidden();
});

test('the profile page loads the users real posts and friends', function () {
    $user = User::factory()->create(['bio' => 'Student software development.']);
    $friend = User::factory()->create();
    befriend($user, $friend);
    $post = Post::create(['user_id' => $user->id, 'body' => 'Mijn eigen profielbericht.']);

    $this->actingAs($user)
        ->get(route('profile.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('profile/show')
            ->where('bio', $user->bio)
            ->where('posts.0.id', (string) $post->id)
            ->where('contacts.0.id', (string) $friend->id)
            ->where('contacts.0.status', 'friend'));
});

// User story: posts maken (acceptatie- en kwaliteitscriteria)

test('a post gets a timestamp automatically', function () {
    $me = User::factory()->create();

    $this->actingAs($me)
        ->post(route('feed.store'), ['body' => 'Met tijd', 'visibility' => 'friends']);

    expect(Post::where('body', 'Met tijd')->first()->created_at)->not->toBeNull();
});

test('a post can be 3000 characters but not longer', function () {
    $me = User::factory()->create();

    $this->actingAs($me)
        ->post(route('feed.store'), ['body' => str_repeat('a', 3000), 'visibility' => 'friends'])
        ->assertSessionHasNoErrors();

    $this->actingAs($me)
        ->post(route('feed.store'), ['body' => str_repeat('a', 3001), 'visibility' => 'friends'])
        ->assertSessionHasErrors('body');

    expect(Post::count())->toBe(1);
});

// The photo is a tiny PNG that reports a fake size, so it works without GD
test('a photo can be 20 MB but not larger', function () {
    Storage::fake('public');
    $me = User::factory()->create();

    $this->actingAs($me)
        ->post(route('feed.store'), [
            'body' => 'Grote foto',
            'visibility' => 'friends',
            'image' => UploadedFile::fake()->createWithContent('ok.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='))->size(20480),
        ])
        ->assertSessionHasNoErrors();

    $this->actingAs($me)
        ->post(route('feed.store'), [
            'body' => 'Te grote foto',
            'visibility' => 'friends',
            'image' => UploadedFile::fake()->createWithContent('te-groot.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='))->size(20481),
        ])
        ->assertSessionHasErrors('image');
});

test('friends see all posts on a profile, others only public ones, guests none', function () {
    $author = User::factory()->create();
    $friend = User::factory()->create();
    $stranger = User::factory()->create();
    befriend($author, $friend);

    Post::create(['user_id' => $author->id, 'body' => 'Voor vrienden', 'visibility' => 'friends', 'created_at' => now()->subMinute()]);
    Post::create(['user_id' => $author->id, 'body' => 'Voor iedereen', 'visibility' => 'public']);

    $this->actingAs($author)
        ->get(route('profile.public', $author))
        ->assertInertia(fn (Assert $page) => $page->has('posts', 2)->where('posts.0.isOwn', true));

    $this->actingAs($friend)
        ->get(route('profile.public', $author))
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts', 2)
            ->where('posts.0.body', 'Voor iedereen')
            ->where('posts.1.body', 'Voor vrienden')
            ->where('posts.0.isOwn', false));

    $this->actingAs($stranger)
        ->get(route('profile.public', $author))
        ->assertInertia(fn (Assert $page) => $page->has('posts', 1)->where('posts.0.body', 'Voor iedereen'));

    auth()->logout();
    $this->get(route('profile.public', $author))
        ->assertInertia(fn (Assert $page) => $page->where('posts', []));
});
