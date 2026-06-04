<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Actions\Reminder\UpdateReminderAction;
use App\Data\ReminderData;
use App\Enums\RecurrenceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reminder\UpdateReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Carbon\CarbonImmutable;

final class UpdateController extends Controller
{
    public function __construct(
        private readonly UpdateReminderAction $updateReminder,
    ) {}

    public function __invoke(UpdateReminderRequest $request, Reminder $reminder): ReminderResource
    {
        $this->authorize('update', $reminder);

        $updated = ($this->updateReminder)($reminder, $this->toData($request, $reminder));

        return ReminderResource::make($updated);
    }

    /**
     * Частичное обновление: незаданные поля сохраняют текущие значения напоминания.
     */
    private function toData(UpdateReminderRequest $request, Reminder $reminder): ReminderData
    {
        return new ReminderData(
            title: $request->has('title') ? $request->string('title')->toString() : $reminder->title,
            notes: $request->has('notes')
                ? ($request->filled('notes') ? $request->string('notes')->toString() : null)
                : $reminder->notes,
            remindAt: $request->has('remind_at')
                ? CarbonImmutable::parse($request->date('remind_at'))
                : $reminder->remind_at,
            recurrence: $request->has('recurrence')
                ? RecurrenceType::from($request->string('recurrence')->toString())
                : $reminder->recurrence,
            sourceUuid: $request->has('source_uuid')
                ? ($request->filled('source_uuid') ? $request->string('source_uuid')->toString() : null)
                : $reminder->source_uuid,
            sourceType: $request->has('source_type')
                ? ($request->filled('source_type') ? $request->string('source_type')->toString() : null)
                : $reminder->source_type,
        );
    }
}
