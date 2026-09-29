<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ShoppingListItemComment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShoppingListItemComment
 */
final class ShoppingListItemCommentResource extends JsonResource
{
    /**
     * Публичное представление комментария треда строки задачи.
     *
     * author_name — денормализованный снимок имени автора на момент
     * написания. Внутренние id, user_id, shopping_list_item_id,
     * server_revision и deleted_at не экспонируются.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'author_name' => $this->author_name,
            'body' => $this->body,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
