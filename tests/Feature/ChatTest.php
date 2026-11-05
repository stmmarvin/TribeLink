<?php

use App\Models\Chat;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function chatBetween(User $a, User $b): Chat
{
    $chat = Chat::create();
    $chat->users()->attach([$a->id, $b->id]);

    return $chat;
}

test('guests are redirected from the chat', function () {
    $this->get(route('chats.index'))->assertRedirect(route('login'));
});

test('users only see their own conversations, in the frontend shape', function () {
    $me = User::factory()->create();
    $other = User::factory()->create([
        'name' => 'Sanne de Vries',
        'username' => 'sanne',
    ]);
    $chat = chatBetween($me, $other);
    $chat->messages()->create(['user_id' => $other->id, 'body' => 'Hoi!']);
    chatBetween(User::factory()->create(), User::factory()->create());

    $this->actingAs($me)
        ->get(route('chats.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ontmoeten/berichten')
            ->where('conversationId', null)
            ->has('conversations', 1)
            ->where('conversations.0.id', (string) $chat->id)
            ->where('conversations.0.contact.id', (string) $other->id)
            ->where('conversations.0.contact.username', 'sanne')
            ->where('conversations.0.unreadCount', 1)
            ->where('conversations.0.lastMessage.body', 'Hoi!')
            ->where('conversations.0.lastMessage.senderId', (string) $other->id)
            ->has('contacts', 1)
            ->where('messages', []));
});

test('a conversation shows its messages', function () {
    $me = User::factory()->create();
    $chat = chatBetween($me, User::factory()->create());
    $chat->messages()->create(['user_id' => $me->id, 'body' => 'Eerste']);
    $chat->messages()->create(['user_id' => $me->id, 'body' => 'Tweede']);

    $this->actingAs($me)
        ->get(route('chats.show', $chat))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ontmoeten/berichten')
            ->where('conversationId', (string) $chat->id)
            ->has('messages', 2)
            ->where('messages.0.body', 'Eerste')
            ->where('messages.1.conversationId', (string) $chat->id));
});

test('opening a conversation marks the other person\'s messages as read', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    $chat = chatBetween($me, $other);
    $chat->messages()->create(['user_id' => $other->id, 'body' => 'Hoi']);
    $own = $chat->messages()->create(['user_id' => $me->id, 'body' => 'Hey']);

    $this->actingAs($me)
        ->get(route('chats.show', $chat))
        ->assertInertia(fn (Assert $page) => $page
            ->where('conversations.0.unreadCount', 0));

    // Your own messages stay unread until the other person opens the chat
    expect($own->fresh()->read_at)->toBeNull();
    $this->actingAs($me)
        ->get(route('chats.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('conversations.0.unreadCount', 0));
});

test('users cannot open or post in someone else\'s chat', function () {
    $chat = chatBetween(User::factory()->create(), User::factory()->create());
    $intruder = User::factory()->create();

    $this->actingAs($intruder)->get(route('chats.show', $chat))->assertForbidden();
    $this->actingAs($intruder)
        ->post(route('chats.messages.store', $chat), ['body' => 'Hallo'])
        ->assertForbidden();

    expect($chat->messages()->count())->toBe(0);
});

test('a participant can send a message', function () {
    $me = User::factory()->create();
    $chat = chatBetween($me, User::factory()->create());

    $this->actingAs($me)
        ->from(route('chats.show', $chat))
        ->post(route('chats.messages.store', $chat), ['body' => 'Hallo'])
        ->assertRedirect(route('chats.show', $chat));

    $this->assertDatabaseHas('messages', ['chat_id' => $chat->id, 'user_id' => $me->id, 'body' => 'Hallo']);
});

test('an empty or whitespace-only message is rejected', function (string $body) {
    $me = User::factory()->create();
    $chat = chatBetween($me, User::factory()->create());

    $this->actingAs($me)
        ->post(route('chats.messages.store', $chat), ['body' => $body])
        ->assertSessionHasErrors('body');
})->with(['empty' => '', 'only spaces' => '   ']);

test('starting a chat reuses an existing one', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    $chat = chatBetween($me, $other);

    $this->actingAs($me)
        ->get(route('chats.open', $other))
        ->assertRedirect(route('chats.show', $chat));

    expect(Chat::count())->toBe(1);
});

test('starting a direct chat does not reuse a group chat', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    $third = User::factory()->create();
    $groupChat = chatBetween($me, $other);
    $groupChat->users()->attach($third);

    $this->actingAs($me)
        ->get(route('chats.open', $other))
        ->assertRedirect();

    expect(Chat::count())->toBe(2);
});

test('starting a chat with yourself is not possible', function () {
    $me = User::factory()->create();
    chatBetween($me, User::factory()->create());

    $this->actingAs($me)->get(route('chats.open', $me))->assertNotFound();
});

test('the ontmoeten page receives the conversations', function () {
    $me = User::factory()->create();
    chatBetween($me, User::factory()->create());

    $this->actingAs($me)
        ->get(route('ontmoeten'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ontmoeten/index')
            ->has('conversations', 1));
});
