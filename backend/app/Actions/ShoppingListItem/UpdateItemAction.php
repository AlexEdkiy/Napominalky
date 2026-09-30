<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Data\ShoppingListItemData;
use App\Enums\TaskStatus;
use App\Models\ShoppingListItem;
use Illuminate\Support\Facades\DB;

final class UpdateItemAction
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
    ) {}

    public function __invoke(ShoppingListItem $item, ShoppingListItemData $data): ShoppingListItem
    {
        return DB::transaction(function () use ($item, $data): ShoppingListItem {
            $attributes = [
                'name' => $data->name,
                'category' => $data->category,
                'is_checked' => $data->isChecked,
                'position' => $data->position,
                'quantity' => $data->quantity,
                'deadline' => $data->deadline,
                'reminder_at' => $data->reminderAt,
                'link' => $data->link,
                'comment' => $data->comment,
                'tags' => $data->tags,
            ];

            // Статус — только для пунктов задач; приоритет у явного status,
            // is_checked выводится из него. Без status статус выводится из
            // is_checked (снятие отметки с Done → New, иначе статус сохраняется).
            $list = $item->shoppingList;

            if ($list !== null && $list->isTasks()) {
                $status = $data->status
                    ?? TaskStatus::forChecked($data->isChecked, $item->status ?? TaskStatus::New);
                $attributes['status'] = $status;
                $attributes['is_checked'] = $status->isDone();
            }

            $item->update($attributes);

            if ($list !== null) {
                ($this->recalculateStatus)($list);
            }

            return $item;
        });
    }
}
