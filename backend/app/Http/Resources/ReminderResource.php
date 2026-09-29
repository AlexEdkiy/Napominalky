<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Reminder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Reminder
 */
final class ReminderResource extends JsonResource
{
    /**
     * Публичное представление напоминания.
     *
     * Внутренний id, user_id, server_revision и deleted_at намеренно не
     * экспонируются: id/user_id приватны, server_revision — серверный
     * sync-курсор, tombstone отдаётся только delta-эндпоинтом /sync/changes.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'notes' => $this->notes,
            'remind_at' => $this->remind_at?->toISOString(),
            'recurrence' => $this->recurrence->value,
            'is_completed' => $this->is_completed,
            'completed_at' => $this->completed_at?->toISOString(),
            'snoozed_until' => $this->snoozed_until?->toISOString(),
            'source_uuid' => $this->source_uuid,
            'source_type' => $this->source_type,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
