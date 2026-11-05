<?php

use App\Models\Chat;
use App\Models\RandomChat;
use App\Models\RandomChatQueue;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function randomChatState(User $user): array
{
    $state = null;

    test()->actingAs($user)
        ->get(route('ontmoeten.random-chat'))
        ->assertInertia(function (Assert $page) use (&$state) {
            $page->component('ontmoeten/random-chat');
            $state = $page->toArray()['props']['randomChat'];
        });

    return $state;
}

function matchedPair(): array
{
    $a = User::factory()->create();
    $b = User::factory()->create();

    test()->actingAs($a)->post(route('random-chat.search'));
    test()->actingAs($b)->post(route('random-chat.search'));

    return [$a, $b, RandomChat::firstOrFail()];
}

test('guests cannot use random chat', function () {
    $this->get(route('ontmoeten.random-chat'))->assertRedirect(route('login'));
});

test('the page starts idle', function () {
    expect(randomChatState(User::factory()->create()))
        ->status->toBe('idle')
        ->chat->toBeNull();
});

test('a lone searcher waits in the queue', function () {
    $me = User::factory()->create();

    $this->actingAs($me)->post(route('random-chat.search'));

    expect(randomChatState($me)['status'])->toBe('searching')
        ->and(RandomChat::count())->toBe(0);
});

test('two students searching at the same time are matched', function () {
    [$a, $b, $chat] = matchedPair();

    expect(RandomChatQueue::count())->toBe(0);

    $stateA = randomChatState($a);
    $stateB = randomChatState($b);

    expect($stateA['status'])->toBe('chatting')
        ->and($stateA['chat']['partner']['username'])->toBe($b->username)
        ->and($stateB['chat']['partner']['username'])->toBe($a->username)
        ->and($stateA['chat']['id'])->toBe((string) $chat->id);
});

test('a stale queue spot is not matched', function () {
    $stale = User::factory()->create();
    RandomChatQueue::create(['user_id' => $stale->id, 'last_seen_at' => now()->subMinute()]);

    $me = User::factory()->create();
    $this->actingAs($me)->post(route('random-chat.search'));

    expect(RandomChat::count())->toBe(0);
});

test('cancelling leaves the queue', function () {
    $me = User::factory()->create();
    $this->actingAs($me)->post(route('random-chat.search'));
    $this->actingAs($me)->delete(route('random-chat.cancel'));

    expect(RandomChatQueue::count())->toBe(0)
        ->and(randomChatState($me)['status'])->toBe('idle');
});

test('messages reach the partner, own messages are marked', function () {
    [$a, $b, $chat] = matchedPair();

    $this->actingAs($a)->post(route('random-chat.messages.store', $chat), ['body' => 'Hoi!']);

    expect(randomChatState($a)['messages'][0]['senderId'])->toBe('me')
        ->and(randomChatState($b)['messages'][0])
        ->body->toBe('Hoi!')
        ->senderId->toBe((string) $a->id);
});

test('empty messages are rejected', function () {
    [$a, , $chat] = matchedPair();

    $this->actingAs($a)
        ->post(route('random-chat.messages.store', $chat), ['body' => '   '])
        ->assertSessionHasErrors('body');
});

test('outsiders cannot read or post in a random chat', function () {
    [, , $chat] = matchedPair();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)
        ->post(route('random-chat.messages.store', $chat), ['body' => 'Hallo'])
        ->assertForbidden();
    $this->actingAs($outsider)->post(route('random-chat.leave', $chat))->assertForbidden();
});

test('leaving ends the chat for the partner', function () {
    [$a, $b, $chat] = matchedPair();

    $this->actingAs($a)
        ->post(route('random-chat.leave', $chat))
        ->assertRedirect(route('ontmoeten'));

    expect(randomChatState($b))
        ->status->toBe('ended')
        ->and(randomChatState($b)['chat']['endReason'])->toBe('partner-left')
        ->and(randomChatState($a)['status'])->toBe('idle');
});

test('"volgende" ends the chat and searches again', function () {
    [$a, , $chat] = matchedPair();

    $this->actingAs($a)->post(route('random-chat.leave', $chat), ['search' => true]);

    expect($chat->fresh()->ended_at)->not->toBeNull()
        ->and(randomChatState($a)['status'])->toBe('searching');
});

test('a partner who stops polling is treated as gone', function () {
    [$a, $b, $chat] = matchedPair();
    $chat->update(['user_one_seen_at' => now()->subMinute(), 'user_two_seen_at' => now()->subMinute()]);

    $partnerOfB = $chat->user_one_id === $b->id ? $a : $b;
    $watcher = $partnerOfB->is($a) ? $b : $a;

    expect(randomChatState($watcher)['status'])->toBe('ended');
});

test('saving makes the partner a contact in Berichten', function () {
    [$a, $b, $chat] = matchedPair();

    $this->actingAs($a)->post(route('random-chat.save', $chat));

    expect(randomChatState($a)['chat']['saved'])->toBeTrue()
        ->and(randomChatState($b)['chat']['saved'])->toBeFalse()
        ->and(Chat::count())->toBe(1)
        ->and(Chat::first()->users->pluck('id')->sort()->values()->all())
        ->toBe(collect([$a->id, $b->id])->sort()->values()->all());
});

test('reporting ends the chat and the pair is never matched again', function () {
    [$a, $b, $chat] = matchedPair();

    $this->actingAs($a)
        ->post(route('random-chat.report', $chat), ['reason' => 'spam'])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('random_chat_reports', ['reporter_id' => $a->id, 'reported_id' => $b->id]);
    expect(randomChatState($a)['chat']['endReason'])->toBe('reported');

    $this->actingAs($a)->post(route('random-chat.search'));
    $this->actingAs($b)->post(route('random-chat.search'));

    expect(RandomChat::count())->toBe(1);
});

test('a report needs a valid reason', function () {
    [$a, , $chat] = matchedPair();

    $this->actingAs($a)
        ->post(route('random-chat.report', $chat), ['reason' => 'boring'])
        ->assertSessionHasErrors('reason');
});
