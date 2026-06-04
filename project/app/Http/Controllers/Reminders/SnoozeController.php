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

        $option = SnoozeOption::from($request->string('snooze')->toString());

        $snoozed = ($this->snoozeReminder)($reminder, $option);

        return ReminderResource::make($snoozed);
    }
}
