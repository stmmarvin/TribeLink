<?php

namespace App\Notifications;

use App\Models\LobbyInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GameInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly LobbyInvite $invite) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $roomName = self::roomName($this->invite->room_id);

        return [
            'kind' => 'game_invitation',
            'title' => 'Uitnodiging voor een spelruimte',
            'message' => $this->invite->inviter->username.' nodigt je uit voor '.$roomName.'.',
            'room_id' => $this->invite->room_id,
            'invite_token' => $this->invite->token,
        ];
    }

    private static function roomName(string $roomId): string
    {
        return [
            'kantine' => 'de Kantine',
            'spelletjeshoek' => 'de Spelletjeshoek',
            'rustige-lounge' => 'de Rustige lounge',
            'eerstejaars-hal' => 'de Eerstejaars-hal',
        ][$roomId] ?? 'een spelruimte';
    }
}
