<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Data\ReminderData;
use App\Models\Reminder;

final class UpdateReminderAction
{
    public function __invoke(Reminder $reminder, ReminderData $data): Reminder
    {
        $reminder->update([
            'title' => $data->title,
            'notes' => $data->notes,
            'remind_at' => $data->remindAt,
            'recurrence' => $data->recurrence,
            'source_uuid' => $data->sourceUuid,
            'source_type' => $data->sourceType,
        ]);

        return $reminder;
    }
}
