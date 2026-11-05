<?php

use App\Models\Friendship;
use App\Models\Post;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot send a friend request', function () {
    $user = User::factory()->create();

    $this->post(route('friends.store', $user))->assertRedirect(route('login'));
});

test('a user can send a friend request', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($me)->post(route('friends.store', $other))->assertRedirect();

    $this->assertDatabaseHas('user_friendships', [
        'user_id' => $me->id,
        'friend_id' => $other->id,
        'accepted_at' => null,
    ]);
});

test('a user cannot befriend themselves', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->post(route('friends.store', $me))->assertNotFound();
});

test('sending a request twice does not create a second one', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($me)->post(route('friends.store', $other));
    $this->actingAs($me)->post(route('friends.store', $other));

    expect(Friendship::count())->toBe(1);
});

test('sending a request to someone who already asked me makes us friends', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Friendship::create(['user_id' => $other->id, 'friend_id' => $me->id]);

    $this->actingAs($me)->post(route('friends.store', $other));

    // The accepted request plus the row in the other direction
    expect(Friendship::count())->toBe(2);
    expect($me->isFriendsWith($other))->toBeTrue();
    expect($other->isFriendsWith($me))->toBeTrue();
});

test('the receiver can accept a request', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Friendship::create(['user_id' => $other->id, 'friend_id' => $me->id]);

    $this->actingAs($me)->patch(route('friends.accept', $other))->assertRedirect();

    expect($me->isFriendsWith($other))->toBeTrue();
    expect($other->isFriendsWith($me))->toBeTrue();
});

test('the sender cannot accept their own request', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Friendship::create(['user_id' => $me->id, 'friend_id' => $other->id]);

    $this->actingAs($me)->patch(route('friends.accept', $other))->assertNotFound();

    expect($me->isFriendsWith($other))->toBeFalse();
});

test('a friendship can be removed by either user', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    befriend($me, $other);

    $this->actingAs($me)->delete(route('friends.destroy', $other))->assertRedirect();

    expect(Friendship::count())->toBe(0);
    expect($other->isFriendsWith($me))->toBeFalse();
});

test('removing a friendship that does not exist gives a 404', function () {
    $this->actingAs(User::factory()->create())
        ->delete(route('friends.destroy', User::factory()->create()))
        ->assertNotFound();
});

test('open requests do not count as friends', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Friendship::create(['user_id' => $me->id, 'friend_id' => $other->id]);

    expect($me->friendIds())->toBeEmpty();
});

test('every friendship action shows a toast', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($me)->post(route('friends.store', $other))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Vriendschapsverzoek verstuurd.']);

    $this->actingAs($me)->post(route('friends.store', $other))
        ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'Je hebt al een vriendschapsverzoek gestuurd.']);

    $this->actingAs($other)->patch(route('friends.accept', $me))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Jullie zijn nu vrienden.']);

    $this->actingAs($me)->post(route('friends.store', $other))
        ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'Jullie zijn al vrienden.']);

    $this->actingAs($me)->delete(route('friends.destroy', $other))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Vriend verwijderd.']);
});

test('withdrawing an open request shows its own toast', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Friendship::create(['user_id' => $me->id, 'friend_id' => $other->id]);

    $this->actingAs($me)->delete(route('friends.destroy', $other))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Vriendschapsverzoek verwijderd.']);
});

test('the public profile tells the viewer the friendship state', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();

    $state = fn (User $viewer, User $profile) => $this->actingAs($viewer)
        ->get(route('profile.public', ['user' => $profile]))
        ->assertOk();

    $state($me, $other)->assertInertia(fn (Assert $page) => $page
        ->where('viewer.is_friend', false)
        ->where('viewer.friend_request_sent', false)
        ->where('viewer.friend_request_received', false));

    Friendship::create(['user_id' => $me->id, 'friend_id' => $other->id]);

    $state($me, $other)->assertInertia(fn (Assert $page) => $page
        ->where('viewer.is_friend', false)
        ->where('viewer.friend_request_sent', true)
        ->where('viewer.friend_request_received', false));

    $state($other, $me)->assertInertia(fn (Assert $page) => $page
        ->where('viewer.is_friend', false)
        ->where('viewer.friend_request_sent', false)
        ->where('viewer.friend_request_received', true));
});

test('guests see no friendship state on a public profile', function () {

    $this->get(route('profile.public', ['user' => User::factory()->create()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('viewer.authenticated', false)
            ->where('viewer.friend_request_sent', false)
            ->where('viewer.friend_request_received', false));
});

test('the profile page lists incoming friend requests', function () {
    $me = User::factory()->create();
    $asker = User::factory()->create(['username' => 'lisa']);
    Friendship::create(['user_id' => $asker->id, 'friend_id' => $me->id]);
    Friendship::create(['user_id' => $me->id, 'friend_id' => User::factory()->create()->id]);

    $this->actingAs($me)
        ->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('friendRequests', 1)
            ->where('friendRequests.0.id', (string) $asker->id)
            ->where('friendRequests.0.username', 'lisa'));
});

// The full flow as two students would click through it in the browser
test('two students become friends via the poster and then see each other everywhere', function () {
    $john = User::factory()->create(['username' => 'john']);
    $lisa = User::factory()->create(['username' => 'lisa']);
    Post::create(['user_id' => $lisa->id, 'body' => 'Eerste week Open-ICT zit erop!']);

    // John scans Lisa's poster and clicks "Als vriend toevoegen"
    $this->actingAs($john)
        ->from(route('profile.public', ['user' => $lisa]))
        ->post('/friends/'.$lisa->id)
        ->assertRedirect(route('profile.public', ['user' => $lisa]));

    // Not friends yet: John does not see Lisa's post
    $this->actingAs($john)->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page->where('posts', []));

    // Lisa sees the request on her profile and accepts it
    $this->actingAs($lisa)->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page->where('friendRequests.0.id', (string) $john->id));
    $this->actingAs($lisa)->patch('/friends/'.$john->id)->assertRedirect();

    // Now they are friends on every page that uses friends
    $this->actingAs($john)->get(route('feed'))
        ->assertInertia(fn (Assert $page) => $page->where('posts.0.body', 'Eerste week Open-ICT zit erop!'));
    $this->actingAs($john)->get(route('profile.public', ['user' => $lisa]))
        ->assertInertia(fn (Assert $page) => $page->where('viewer.is_friend', true));
    $this->actingAs($lisa)->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('contacts.0.id', (string) $john->id)
            ->where('friendRequests', []));
    $this->actingAs($john)->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('contacts.0.id', (string) $lisa->id));

    // John clicks "Vriend verwijderen": gone for both
    $this->actingAs($john)->delete('/friends/'.$lisa->id)->assertRedirect();
    expect($lisa->isFriendsWith($john))->toBeFalse();
});
