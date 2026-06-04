<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ShoppingListItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShoppingListItem
 */
final class ShoppingListItemResource extends JsonResource
{
    /**
     * Публичное представление элемента списка покупок (FR-12..FR-18).
     *
     * category отдаётся машинным значением enum, category_label — русской
     * подписью для UI. Внутренний id, user_id, shopping_list_id,
     * server_revision и deleted_at не экспонируются.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'is_checked' => $this->is_checked,
            'position' => $this->position,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
