<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\TaskStatus;
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
     * подписью для UI; status/status_label — тем же паттерном (значимы только
     * для пунктов списков type='tasks', для goods номинальны). Внутренний id,
     * user_id, shopping_list_id, server_revision и deleted_at не экспонируются.
     *
     * comments_count присутствует всегда (контроллеры обязаны withCount /
     * loadCount, fallback-подсчёт — страховка); comments встраивается только
     * при загруженном relation (whenLoaded, хронологический ASC).
     *
     * @deprecated Поле `comment` — legacy одиночный комментарий; заменено
     *             тредом `comments` (двухфазный вывод, пока отдаётся).
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
            'status' => $this->resolveStatus()->value,
            'status_label' => $this->resolveStatus()->label(),
            'position' => $this->position,
            'quantity' => $this->quantity,
            'deadline' => $this->deadline?->toDateString(),
            'reminder_at' => $this->reminder_at?->toISOString(),
            'link' => $this->link,
            'comment' => $this->comment,
            'comments_count' => (int) ($this->comments_count ?? $this->comments()->count()),
            'comments' => ShoppingListItemCommentResource::collection($this->whenLoaded('comments')),
            'tags' => $this->tags,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * У свежесозданного пункта goods-списка атрибут status может
     * отсутствовать (default на уровне БД) — отдаём дефолт enum без refresh().
     */
    private function resolveStatus(): TaskStatus
    {
        return $this->status ?? TaskStatus::New;
    }
}
