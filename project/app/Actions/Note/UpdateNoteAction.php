<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Data\NoteData;
use App\Models\Note;

final class UpdateNoteAction
{
    public function __invoke(Note $note, NoteData $data): Note
    {
        $note->update([
            'title' => $data->title,
            'body' => $data->body,
            'is_pinned' => $data->isPinned,
            'is_archived' => $data->isArchived,
        ]);

        return $note;
    }
}
