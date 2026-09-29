<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Письмо со ссылкой сброса пароля отправляется СИНХРОННО (без ShouldQueue):
 * прод-окружение работает на `php artisan serve` без отдельного queue-воркера,
 * а письма низкочастотные и чувствительные ко времени — очередь тут не нужна.
 */
final class ResetPasswordNotification extends Notification
{
    public function __construct(
        private readonly string $token,
    ) {}

    /**
     * @return list<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $resetUrl = $this->buildResetUrl($notifiable->email);

        return (new MailMessage())
            ->subject('Восстановление пароля — Напоминалки')
            ->greeting('Здравствуйте!')
            ->line('Вы получили это письмо, потому что поступил запрос на восстановление пароля для вашего аккаунта.')
            ->action('Восстановить пароль', $resetUrl)
            ->line('Ссылка действительна в течение 60 минут.')
            ->line('Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо. Ваш пароль останется прежним.');
    }

    private function buildResetUrl(string $email): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $query = http_build_query([
            'token' => $this->token,
            'email' => $email,
        ]);

        return "{$frontendUrl}/reset-password?{$query}";
    }
}
