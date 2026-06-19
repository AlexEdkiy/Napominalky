<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Note
 */
final class NoteResource extends JsonResource
{
    /**
     * Публичное представление заметки.
     *
     * Внутренний id, user_id, server_revision и deleted_at намеренно не
     * экспонируются: id/user_id приватны, server_revision — серверный
     * sync-курсор, tombstone отдаётся только delta-эндпоинтом /sync/changes.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'body' => $this->body,
            'is_pinned' => $this->is_pinned,
            'is_archived' => $this->is_archived,
            'color' => $this->color,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
