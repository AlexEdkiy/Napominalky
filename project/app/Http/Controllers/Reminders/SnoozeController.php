<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Actions\Reminder\SnoozeReminderAction;
use App\Enums\SnoozeOption;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reminder\SnoozeReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;

final class SnoozeController extends Controller
{
    public function __construct(
        private readonly SnoozeReminderAction $snoozeReminder,
    ) {}

    public function __invoke(SnoozeReminderRequest $request, Reminder $reminder): ReminderResource
    {
        $this->authorize('snooze', $reminder);

        // Пресет ('10m'|'1h') либо своё время snoozed_until — валидация
        // гарантирует ровно одно из двух (см. SnoozeReminderRequest).
        $target = $request->filled('snoozed_until')
            ? $request->date('snoozed_until')->toImmutable()
            : SnoozeOption::from($request->string('snooze')->toString());

        $snoozed = ($this->snoozeReminder)($reminder, $target);

        return ReminderResource::make($snoozed);
    }
}
