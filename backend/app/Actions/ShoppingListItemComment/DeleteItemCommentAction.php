<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItemComment;

use App\Models\ShoppingListItemComment;

final class DeleteItemCommentAction
{
    /**
     * Soft delete (tombstone): server_revision бампнет TracksSyncRevision,
     * удаление уедет на устройства ближайшим pull. Комментарии на статус
     * задачи не влияют — пересчёт не требуется.
     */
    public function __invoke(ShoppingListItemComment $comment): void
    {
        $comment->delete();
    }
}
