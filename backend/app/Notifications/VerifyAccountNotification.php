<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

final class VerifyAccountNotification extends Notification
{
    /** @return list<string> */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $signedPath = URL::temporarySignedRoute(
            'api.v1.auth.email.verify', now()->addMinutes(60),
            ['uuid' => $notifiable->uuid, 'hash' => sha1($notifiable->email)], absolute: false,
        );
        $url = rtrim((string) config('app.frontend_url'), '/').'/verify-email?'.http_build_query(['verification' => $signedPath]);

        return (new MailMessage)
            ->subject('Подтвердите почту — Напоминалки')
            ->view('mail.verify-account', ['url' => $url]);
    }
}
