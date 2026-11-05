<?php

namespace App\Http\Resources;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Chat in the shape of `Conversation` in resources/js/types/chat.ts, seen
 * from the logged-in user: `contact` is the other participant.
 *
 * Expects `users`, `messages` (latest only) and `unread_count` to be loaded.
 *
 * @mixin Chat
 */
class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $contact = $this->users->firstWhere('id', '!=', $request->user()->id) ?? $this->users->firstOrFail();
        $lastMessage = $this->messages->first();

        return [
            'id' => (string) $this->id,
            'contact' => self::chatUser($contact),
            // There are no relationship statuses in the backend yet.
            'status' => 'saved',
            'unreadCount' => (int) ($this->unread_count ?? 0),
            'lastMessage' => $lastMessage ? (new MessageResource($lastMessage))->resolve($request) : null,
        ];
    }

    /**
     * `ChatUser` shape.
     *
     * @return array{id: string, username: string, avatarUrl: string|null}
     */
    public static function chatUser(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'username' => $user->username,
            'avatarUrl' => $user->avatar,
        ];
    }
}
