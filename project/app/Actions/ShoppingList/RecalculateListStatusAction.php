<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Models\ShoppingList;
use App\Services\ShoppingList\ListStatusResolver;

/**
 * Автодеривация статуса задачи из статусов её неудалённых пунктов.
 *
 * No-op для goods-списков и для задач с закреплённым ручным статусом
 * (status_is_manual=true). Пишет status + is_completed одним update и
 * только при фактическом изменении — чтобы не плодить server_revision
 * и лишние LWW-версии для sync.
 */
final class RecalculateListStatusAction
{
    public function __construct(
        private readonly ListStatusResolver $resolver,
    ) {}

    public function __invoke(ShoppingList $list): void
    {
        if (! $list->isTasks() || $list->status_is_manual) {
            return;
        }

        // pluck на Eloquent Builder применяет каст модели: TaskStatus[].
        $statuses = $list->items()->pluck('status')->all();
        $derived = $this->resolver->derive($statuses);

        if ($list->status === $derived && $list->is_completed === $derived->isDone()) {
            return;
        }

        $list->update([
            'status' => $derived,
            'is_completed' => $derived->isDone(),
        ]);
    }
}
