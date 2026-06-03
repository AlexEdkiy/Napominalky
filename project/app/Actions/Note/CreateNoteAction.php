<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Data\NoteData;
use App\Models\Note;
use App\Models\User;

final class CreateNoteAction
{
    public function __invoke(User $user, NoteData $data, ?string $uuid = null): Note
    {
        $note = $user->notes()->make([
            'title' => $data->title,
            'body' => $data->body,
            'is_pinned' => $data->isPinned,
            'is_archived' => $data->isArchived,
        ]);

        // Клиентский uuid (offline-создание) задаётся до save; HasUuid (??=)
        // сгенерирует значение сам, если uuid не передан. Sync-идемпотентность —
        // docs/architecture «Часть 0.7».
        if ($uuid !== null) {
            $note->uuid = $uuid;
        }

        $note->save();

        return $note;
    }
}
