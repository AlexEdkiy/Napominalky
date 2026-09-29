<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Actions\Reminder\DeleteReminderAction;
use App\Http\Controllers\Controller;
use App\Models\Reminder;
use Illuminate\Http\Response;

final class DestroyController extends Controller
{
    public function __construct(
        private readonly DeleteReminderAction $deleteReminder,
    ) {}

    public function __invoke(Reminder $reminder): Response
    {
        $this->authorize('delete', $reminder);

        ($this->deleteReminder)($reminder);

        return response()->noContent();
    }
}
