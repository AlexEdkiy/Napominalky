<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Models\Reminder;

final class DeleteReminderAction
{
    public function __invoke(Reminder $reminder): void
    {
        $reminder->delete();
    }
}
