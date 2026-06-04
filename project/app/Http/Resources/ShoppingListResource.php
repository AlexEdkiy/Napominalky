<?php

declare(strict_types=1);

namespace App\Http\Resources;

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
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'items_count' => $this->resolveCount('items_count'),
            'checked_items_count' => $this->resolveCount('checked_items_count'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
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
