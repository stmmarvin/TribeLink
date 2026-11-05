<?php

namespace App\Http\Resources;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Message in the shape of `Message` in resources/js/types/chat.ts.
 *
 * @mixin Message
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'conversationId' => (string) $this->chat_id,
            'senderId' => (string) $this->user_id,
            'body' => $this->body,
            'sentAt' => $this->created_at->toIso8601String(),
        ];
    }
}
