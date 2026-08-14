<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Enums\TaskStatus;
use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * Сериализация синхронизируемой записи в публичное представление для клиента
 * (применение в SQLite через LWW по updated_at).
 *
 * Наружу отдаются только uuid, доменные поля и временные метки в ISO-8601.
 * Внутренний id, user_id и серверный курсор server_revision НЕ экспонируются.
 * Мягко удалённые записи (tombstones) сериализуются с непустым deleted_at.
 * Имена ключей совпадают со столбцами клиентской схемы SQLite.
 */
final class SyncSerializer
{
    /**
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException на неподдерживаемой модели
     */
    public function serialize(Model $model): array
    {
        return match (true) {
            $model instanceof Note => $this->note($model),
            $model instanceof ShoppingList => $this->shoppingList($model),
            $model instanceof ShoppingListItemComment => $this->shoppingListItemComment($model),
            $model instanceof ShoppingListItem => $this->shoppingListItem($model),
            $model instanceof Reminder => $this->reminder($model),
            default => throw new InvalidArgumentException(
                'Unsupported sync model: '.$model::class,
            ),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function note(Note $note): array
    {
        return [
            'uuid' => $note->uuid,
            'title' => $note->title,
            'body' => $note->body,
            'is_pinned' => $note->is_pinned,
            'is_archived' => $note->is_archived,
            ...$this->timestamps($note),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shoppingList(ShoppingList $list): array
    {
        return [
            'uuid' => $list->uuid,
            'title' => $list->title,
            'type' => $list->type,
            // tags — непрозрачная JSON-строка (как в sync-whitelist SyncEntities);
            // мобильный клиент уже принимает поля type/tags в ServerShoppingList.
            'tags' => $list->tags,
            'is_completed' => $list->is_completed,
            // Статус задачи (только type='tasks'; для goods всегда 'new'/false).
            'status' => $list->status?->value ?? TaskStatus::New->value,
            'status_is_manual' => $list->status_is_manual,
            ...$this->timestamps($list),
        ];
    }

    /**
     * shopping_list_uuid — публичная ссылка на родительский список:
     * внутренний shopping_list_id наружу не отдаётся.
     *
     * @return array<string, mixed>
     */
    private function shoppingListItem(ShoppingListItem $item): array
    {
        return [
            'uuid' => $item->uuid,
            'shopping_list_uuid' => $item->shoppingList?->uuid,
            'name' => $item->name,
            'category' => $item->category->value,
            'is_checked' => $item->is_checked,
            // Статус строки задачи (только для пунктов type='tasks').
            'status' => $item->status?->value ?? TaskStatus::New->value,
            'position' => $item->position,
            ...$this->timestamps($item),
        ];
    }

    /**
     * shopping_list_item_uuid — публичная ссылка на родительскую строку:
     * внутренний shopping_list_item_id наружу не отдаётся.
     *
     * @return array<string, mixed>
     */
    private function shoppingListItemComment(ShoppingListItemComment $comment): array
    {
        return [
            'uuid' => $comment->uuid,
            'shopping_list_item_uuid' => $comment->item?->uuid,
            'author_name' => $comment->author_name,
            'body' => $comment->body,
            ...$this->timestamps($comment),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function reminder(Reminder $reminder): array
    {
        return [
            'uuid' => $reminder->uuid,
            'title' => $reminder->title,
            'notes' => $reminder->notes,
            'remind_at' => $reminder->remind_at?->toISOString(),
            'recurrence' => $reminder->recurrence->value,
            'is_completed' => $reminder->is_completed,
            'completed_at' => $reminder->completed_at?->toISOString(),
            'snoozed_until' => $reminder->snoozed_until?->toISOString(),
            'source_uuid' => $reminder->source_uuid,
            'source_type' => $reminder->source_type,
            ...$this->timestamps($reminder),
        ];
    }

    /**
     * Общие временные метки: updated_at — LWW-версия, deleted_at — tombstone.
     *
     * @return array{updated_at: ?string, created_at: ?string, deleted_at: ?string}
     */
    private function timestamps(Model $model): array
    {
        return [
            'created_at' => $model->created_at?->toISOString(),
            'updated_at' => $model->updated_at?->toISOString(),
            'deleted_at' => $model->deleted_at?->toISOString(),
        ];
    }
}
