<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;

/**
 * Резолвит публичные ссылки на родителя из клиентского payload во внутренние
 * FK (в рамках записей того же пользователя, включая мягко удалённых
 * родителей — LWW может реанимировать их позже). Чужой или неизвестный uuid
 * игнорируется: FK не трогается, изменение применяется без родителя.
 *
 * Вынесен из SyncChangeApplier (лимит длины класса, docs/01-general.md).
 */
final class SyncParentResolver
{
    /**
     * shopping_list_uuid → shopping_list_id для строки списка.
     *
     * @param  array<string, mixed>  $payload
     */
    public function resolveItemParent(User $user, ShoppingListItem $item, array $payload): void
    {
        $parentUuid = $this->parentUuid($payload, 'shopping_list_uuid');

        if ($parentUuid === null) {
            return;
        }

        $parentId = $user->shoppingLists()
            ->withTrashed()
            ->where('uuid', $parentUuid)
            ->value('id');

        if ($parentId !== null) {
            $item->shopping_list_id = $parentId;
        }
    }

    /**
     * shopping_list_item_uuid → shopping_list_item_id для комментария треда.
     *
     * @param  array<string, mixed>  $payload
     */
    public function resolveCommentParent(User $user, ShoppingListItemComment $comment, array $payload): void
    {
        $parentUuid = $this->parentUuid($payload, 'shopping_list_item_uuid');

        if ($parentUuid === null) {
            return;
        }

        $parentId = ShoppingListItem::withTrashed()
            ->where('user_id', $user->id)
            ->where('uuid', $parentUuid)
            ->value('id');

        if ($parentId !== null) {
            $comment->shopping_list_item_id = $parentId;
        }
    }

    /**
     * Непустая строковая ссылка на родителя из payload либо null.
     *
     * @param  array<string, mixed>  $payload
     */
    private function parentUuid(array $payload, string $key): ?string
    {
        $uuid = $payload[$key] ?? null;

        return is_string($uuid) && $uuid !== '' ? $uuid : null;
    }
}
