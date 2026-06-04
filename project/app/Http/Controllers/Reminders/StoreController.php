<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Actions\Reminder\CreateReminderAction;
use App\Data\ReminderData;
use App\Enums\RecurrenceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reminder\StoreReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreController extends Controller
{
    public function __construct(
        private readonly CreateReminderAction $createReminder,
    ) {}

    public function __invoke(StoreReminderRequest $request): JsonResponse
    {
        $this->authorize('create', Reminder::class);

        // Клиентский uuid (offline-создание) пробрасывается в Action для
        // sync-идемпотентности; иначе HasUuid сгенерирует серверный uuid.
        $uuid = $request->filled('uuid')
            ? $request->string('uuid')->toString()
            : null;

        $reminder = ($this->createReminder)($request->user(), $this->toData($request), $uuid);

        return ReminderResource::make($reminder)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    private function toData(StoreReminderRequest $request): ReminderData
    {
        return new ReminderData(
            title: $request->string('title')->toString(),
            notes: $request->filled('notes') ? $request->string('notes')->toString() : null,
            remindAt: CarbonImmutable::parse($request->date('remind_at')),
            recurrence: RecurrenceType::from($request->input('recurrence', RecurrenceType::None->value)),
            sourceUuid: $request->filled('source_uuid') ? $request->string('source_uuid')->toString() : null,
            sourceType: $request->filled('source_type') ? $request->string('source_type')->toString() : null,
        );
    }
}
