<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Data\ReminderData;
use App\Models\Reminder;
use App\Models\User;

final class CreateReminderAction
{
    public function __invoke(User $user, ReminderData $data, ?string $uuid = null): Reminder
    {
        $reminder = $user->reminders()->make([
            'title' => $data->title,
            'notes' => $data->notes,
            'remind_at' => $data->remindAt,
            'recurrence' => $data->recurrence,
            'source_uuid' => $data->sourceUuid,
            'source_type' => $data->sourceType,
        ]);

        // Клиентский uuid (offline-создание) задаётся до save; HasUuid (??=)
        // сгенерирует значение сам, если uuid не передан. Sync-идемпотентность —
        // docs/architecture «Часть 0.7».
        if ($uuid !== null) {
            $reminder->uuid = $uuid;
        }

        $reminder->save();

        return $reminder;
    }
}
