<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Enums\TaskStatus;
use App\Models\ShoppingListItem;

final class CheckItemAction
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
    ) {}

    /**
     * Переключает отметку элемента (FR-14): is_checked = $checked.
     *
     * Для пунктов задач поддерживается инвариант done ⇔ checked:
     * отметка → status='done', снятие отметки с Done → 'new' (не-Done
     * статусы сохраняются). Затем пересчёт статуса родительской задачи.
     */
    public function __invoke(ShoppingListItem $item, bool $checked): ShoppingListItem
    {
        $attributes = ['is_checked' => $checked];
        $list = $item->shoppingList;

        if ($list !== null && $list->isTasks()) {
            $attributes['status'] = TaskStatus::forChecked($checked, $item->status ?? TaskStatus::New);
        }

        $item->update($attributes);

        if ($list !== null) {
            ($this->recalculateStatus)($list);
        }

        return $item;
    }
}
