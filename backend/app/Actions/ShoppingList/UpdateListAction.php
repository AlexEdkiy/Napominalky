<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Data\ShoppingListData;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Services\ShoppingList\ListScheduleResolver;
use Illuminate\Support\Facades\DB;

final class UpdateListAction
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
        private readonly ListScheduleResolver $schedule,
    ) {}

    public function __invoke(ShoppingList $list, ShoppingListData $data): ShoppingList
    {
        return DB::transaction(function () use ($list, $data): ShoppingList {
            $locked = ShoppingList::query()->whereKey($list->id)->lockForUpdate()->firstOrFail();
            $list->setRawAttributes($locked->getAttributes(), true);

            $attributes = [
                'title' => $data->title,
                'type' => $data->type,
                'tags' => $data->tags,
                'is_completed' => $data->isCompleted,
            ];

            // goods — прежнее поведение: статусные поля игнорируются.
            if ($data->type !== 'tasks') {
                $list->update($attributes);

                return $list;
            }

            $needsRecalc = $this->applyStatus($list, $data, $attributes);
            $list->fill($attributes);
            $this->schedule->fill($list, $data->schedule);
            $list->save();

            if ($needsRecalc) {
                ($this->recalculateStatus)($list);
            }

            return $list;
        }, 3);
    }

    /**
     * Статусные правила задач. Явный status закрепляется (manual=true),
     * is_completed выводится из него. statusIsManual=false снимает
     * закрепление и включает автодеривацию. Изменение is_completed без
     * статуса: true → ручная «Выполнена», false → снятие закрепления
     * и пересчёт из пунктов. Инвариант: done ⇔ is_completed.
     *
     * @param  array<string, mixed>  $attributes
     * @return bool нужен ли пересчёт статуса из пунктов после update
     */
    private function applyStatus(ShoppingList $list, ShoppingListData $data, array &$attributes): bool
    {
        if ($data->status !== null) {
            $attributes['status'] = $data->status;
            $attributes['status_is_manual'] = true;
            $attributes['is_completed'] = $data->status->isDone();

            return false;
        }

        $needsRecalc = false;

        if ($data->statusIsManual === false) {
            $attributes['status_is_manual'] = false;
            $needsRecalc = true;
        }

        if ($data->isCompleted !== $list->is_completed) {
            if ($data->isCompleted) {
                $attributes['status'] = TaskStatus::Done;
                $attributes['status_is_manual'] = true;

                return false;
            }

            $attributes['status'] = TaskStatus::forChecked(false, $list->status ?? TaskStatus::New);
            $attributes['status_is_manual'] = false;
            $needsRecalc = true;
        }

        return $needsRecalc;
    }
}
