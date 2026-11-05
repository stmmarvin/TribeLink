<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SendVerifyCodeNotification extends Notification
{
    use Queueable;

    public function __construct(public string $code)
    {
        //
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Jouw verificatiecode voor Tribelink')
            ->greeting('Hallo '.$notifiable->name.',')
            ->line('Gebruik de onderstaande 6-cijferige code om je e-mailadres te verifiëren:')
            ->line('**'.$this->code.'**')
            ->line('Deze code is 15 minuten geldig.')
            ->line('Heb je dit account niet aangemaakt? Dan kun je dit bericht negeren.');
    }
}
