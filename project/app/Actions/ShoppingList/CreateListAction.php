<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Data\ShoppingListData;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\User;

final class CreateListAction
{
    public function __invoke(User $user, ShoppingListData $data, ?string $uuid = null): ShoppingList
    {
        $list = new ShoppingList([
            'title' => $data->title,
            'type' => $data->type,
            'tags' => $data->tags,
            'is_completed' => $data->isCompleted,
        ]);
        $list->user_id = $user->id;
        $this->applyStatus($list, $data);

        // Клиентский uuid (offline-создание) задаётся до save; HasUuid (??=)
        // сгенерирует значение сам, если uuid не передан. Sync-идемпотентность —
        // docs/architecture «Часть 0.7».
        if ($uuid !== null) {
            $list->uuid = $uuid;
        }

        $list->save();

        return $list;
    }

    /**
     * Статус при создании — только для type='tasks' (goods игнорируют
     * статусные поля). Явный статус закрепляется (status_is_manual=true),
     * is_completed выводится из него (инвариант done ⇔ is_completed).
     * Без статуса, но с is_completed=true — эквивалент ручного «Выполнена».
     */
    private function applyStatus(ShoppingList $list, ShoppingListData $data): void
    {
        if ($data->type !== 'tasks') {
            return;
        }

        if ($data->status !== null) {
            $list->status = $data->status;
            $list->is_completed = $data->status->isDone();
            $list->status_is_manual = true;

            return;
        }

        if ($data->isCompleted) {
            $list->status = TaskStatus::Done;
            $list->status_is_manual = true;
        }
    }
}
