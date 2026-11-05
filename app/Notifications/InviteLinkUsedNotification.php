<?php

namespace App\Notifications;

use App\Models\LobbyInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class InviteLinkUsedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly LobbyInvite $invite) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $roomName = [
            'kantine' => 'de Kantine',
            'spelletjeshoek' => 'de Spelletjeshoek',
            'rustige-lounge' => 'de Rustige lounge',
            'eerstejaars-hal' => 'de Eerstejaars-hal',
        ][$this->invite->room_id] ?? 'de spelruimte';

        return [
            'kind' => 'invite_link_used',
            'title' => 'Je uitnodigingslink is gebruikt',
            'message' => $this->invite->usedBy->username.' is '.$roomName.' binnengekomen.',
            'room_id' => $this->invite->room_id,
        ];
    }
}
