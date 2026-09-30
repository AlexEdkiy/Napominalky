<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Models\ShoppingList;
use App\Services\ShoppingList\ListScheduleResolver;
use App\Services\ShoppingList\ListStatusResolver;
use Illuminate\Support\Facades\DB;

/**
 * Пересчитывает состояние родительской задачи после изменения пункта.
 * Ручное закрепление защищает только статус, но не вычисляемые даты.
 */
final class RecalculateListStatusAction
{
    public function __construct(
        private readonly ListStatusResolver $resolver,
        private readonly ListScheduleResolver $schedule,
    ) {}

    public function __invoke(ShoppingList $list): void
    {
        DB::transaction(function () use ($list): void {
            $locked = ShoppingList::query()->whereKey($list->id)->lockForUpdate()->first();
            if ($locked === null || ! $locked->isTasks()) {
                return;
            }

            $this->schedule->fill($locked);
            if (! $locked->status_is_manual) {
                $statuses = $locked->items()->pluck('status')->all();
                $derived = $this->resolver->derive($statuses);
                $locked->status = $derived;
                $locked->is_completed = $derived->isDone();
            }

            if ($locked->isDirty(['deadline', 'reminder_at', 'status', 'is_completed'])) {
                $locked->save();
            }

            $list->setRawAttributes($locked->getAttributes(), true);
        }, 3);
    }
}
