<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Actions\Reminder\CompleteReminderAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;

final class CompleteController extends Controller
{
    public function __construct(
        private readonly CompleteReminderAction $completeReminder,
    ) {}

    public function __invoke(Reminder $reminder): ReminderResource
    {
        $this->authorize('complete', $reminder);

        // Для повторяющегося напоминания Action создаёт следующее вхождение
        // отдельной записью; возвращается выполненное (текущее) напоминание.
        $completed = ($this->completeReminder)($reminder);

        return ReminderResource::make($completed);
    }
}
