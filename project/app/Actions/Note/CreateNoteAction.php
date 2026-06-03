<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Data\NoteData;
use App\Models\Note;
use App\Models\User;

final class CreateNoteAction
{
    public function __invoke(User $user, NoteData $data): Note
    {
        return $user->notes()->create([
            'title' => $data->title,
            'body' => $data->body,
            'is_pinned' => $data->isPinned,
            'is_archived' => $data->isArchived,
        ]);
    }
}
