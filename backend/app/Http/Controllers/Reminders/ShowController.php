<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;

final class ShowController extends Controller
{
    public function __invoke(Reminder $reminder): ReminderResource
    {
        $this->authorize('view', $reminder);

        return ReminderResource::make($reminder);
    }
}
