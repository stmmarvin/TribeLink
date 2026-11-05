<?php

namespace Tests\Feature\Api;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    // Test: Authenticated user can fetch their chats list
    public function test_user_can_fetch_their_chats(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/chats');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    // Test: User can start or open a chat with another user
    public function test_user_can_open_or_create_a_chat(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Sanctum::actingAs($userA);

        $response = $this->postJson("/api/chats/open/{$userB->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.users.0.id', $userA->id);

        $this->assertDatabaseHas('chat_participants', [
            'user_id' => $userA->id,
        ]);
        $this->assertDatabaseHas('chat_participants', [
            'user_id' => $userB->id,
        ]);
    }

    // Test: Participant can send a message
    public function test_participant_can_send_a_message(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $chat = Chat::create();
        $chat->users()->attach([$userA->id, $userB->id]);

        Sanctum::actingAs($userA);

        $response = $this->postJson("/api/chats/{$chat->id}/messages", [
            'body' => 'Hallo, dit is een geautomatiseerde test.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.body', 'Hallo, dit is een geautomatiseerde test.');

        $this->assertDatabaseHas('messages', [
            'chat_id' => $chat->id,
            'user_id' => $userA->id,
            'body' => 'Hallo, dit is een geautomatiseerde test.',
        ]);
    }

    // Test: Non-participant cannot access the chat
    public function test_non_participant_cannot_view_chat(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $stranger = User::factory()->create();

        $chat = Chat::create();
        $chat->users()->attach([$userA->id, $userB->id]);

        Sanctum::actingAs($stranger);

        $response = $this->getJson("/api/chats/{$chat->id}");

        $response->assertStatus(403);
    }
}
