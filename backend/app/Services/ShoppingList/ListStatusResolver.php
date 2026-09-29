<?php

declare(strict_types=1);

namespace App\Services\ShoppingList;

use App\Enums\TaskStatus;

/**
 * Чистая деривация статуса задачи из статусов её пунктов (без I/O).
 *
 * Правила (в порядке приоритета):
 * 1. есть хоть один пункт «В работе» → задача «В работе»;
 * 2. иначе все пункты «Выполнена» (и список непуст) → «Выполнена»;
 * 3. иначе все пункты «Отложена» (и список непуст) → «Отложена»;
 * 4. иначе (смешанные/новые/нет пунктов) → «Новая».
 *
 * Применяется RecalculateListStatusAction только когда ручной статус
 * задачи не закреплён (status_is_manual=false).
 */
final class ListStatusResolver
{
    /**
     * @param  list<TaskStatus>  $itemStatuses  статусы неудалённых пунктов
     */
    public function derive(array $itemStatuses): TaskStatus
    {
        if (in_array(TaskStatus::InProgress, $itemStatuses, true)) {
            return TaskStatus::InProgress;
        }

        if ($this->allAre($itemStatuses, TaskStatus::Done)) {
            return TaskStatus::Done;
        }

        if ($this->allAre($itemStatuses, TaskStatus::Postponed)) {
            return TaskStatus::Postponed;
        }

        return TaskStatus::New;
    }

    /**
     * @param  list<TaskStatus>  $itemStatuses
     */
    private function allAre(array $itemStatuses, TaskStatus $status): bool
    {
        if ($itemStatuses === []) {
            return false;
        }

        foreach ($itemStatuses as $itemStatus) {
            if ($itemStatus !== $status) {
                return false;
            }
        }

        return true;
    }
}
