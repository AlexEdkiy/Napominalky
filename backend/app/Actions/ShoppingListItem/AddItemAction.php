<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Data\ShoppingListItemData;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Support\Facades\DB;

final class AddItemAction
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
    ) {}

    public function __invoke(
        ShoppingList $list,
        ShoppingListItemData $data,
        ?string $uuid = null,
    ): ShoppingListItem {
        return DB::transaction(function () use ($list, $data, $uuid): ShoppingListItem {
            $item = $list->items()->make([
                'name' => $data->name,
                'category' => $data->category,
                'is_checked' => $data->isChecked,
                'position' => $this->nextPosition($list, $data),
                'quantity' => $data->quantity,
                'deadline' => $data->deadline,
                'reminder_at' => $data->reminderAt,
                'link' => $data->link,
                'comment' => $data->comment,
                'tags' => $data->tags,
            ]);

            // Статус пункта — только для списков задач; goods остаются на
            // is_checked (колонка status в дефолте 'new'). Явный status имеет
            // приоритет, is_checked выводится из него (инвариант done ⇔ checked).
            if ($list->isTasks()) {
                $status = $data->status ?? TaskStatus::forChecked($data->isChecked, TaskStatus::New);
                $item->status = $status;
                $item->is_checked = $status->isDone();
            }

            // user_id денормализуется из владельца списка для sync-фильтра.
            $item->user_id = $list->user_id;

            // Клиентский uuid (offline-создание) — до save; HasUuid (??=) сам
            // сгенерирует значение, если uuid не передан.
            if ($uuid !== null) {
                $item->uuid = $uuid;
            }

            $item->save();
            ($this->recalculateStatus)($list);

            return $item;
        });
    }

    /**
     * Позиция нового элемента: явно переданная клиентом либо следующая по
     * порядку (max position в списке + 1), чтобы элемент встал в конец.
     */
    private function nextPosition(ShoppingList $list, ShoppingListItemData $data): int
    {
        if ($data->position > 0) {
            return $data->position;
        }

        return (int) $list->items()->max('position') + 1;
    }
}
