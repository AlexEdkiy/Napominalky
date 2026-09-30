<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShoppingList
 */
final class ShoppingListResource extends JsonResource
{
    /**
     * Публичное представление списка покупок (FR-12..FR-18).
     *
     * Внутренний id, user_id, server_revision и deleted_at намеренно не
     * экспонируются: id/user_id приватны, server_revision — серверный
     * sync-курсор, tombstone отдаётся только delta-эндпоинтом /sync/changes.
     *
     * status/status_label/status_is_manual значимы только для type='tasks';
     * для goods статус номинален (default 'new'), клиент его не отображает.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'type' => $this->type,
            'tags' => $this->tags,
            'is_completed' => $this->is_completed,
            'deadline' => $this->deadline?->toDateString(),
            'reminder_at' => $this->reminder_at?->toISOString(),
            'status' => $this->resolveStatus()->value,
            'status_label' => $this->resolveStatus()->label(),
            'status_is_manual' => (bool) $this->status_is_manual,
            'items_count' => $this->resolveCount('items_count'),
            'checked_items_count' => $this->resolveCount('checked_items_count'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * У свежесозданной модели атрибут status может отсутствовать (заполняется
     * default'ом на уровне БД для goods) — отдаём дефолт enum без refresh().
     */
    private function resolveStatus(): TaskStatus
    {
        return $this->status ?? TaskStatus::New;
    }

    /**
     * Счётчик из scopeWithProgress (withCount). Fallback на запрос relation,
     * если список загружен без агрегатов (например, в Show после создания).
     */
    private function resolveCount(string $attribute): int
    {
        if ($this->resource->offsetExists($attribute)) {
            return (int) $this->resource->getAttribute($attribute);
        }

        return $attribute === 'checked_items_count'
            ? $this->items()->where('is_checked', true)->count()
            : $this->items()->count();
    }
}
