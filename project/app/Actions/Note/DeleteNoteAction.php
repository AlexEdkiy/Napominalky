<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Models\Note;

final class DeleteNoteAction
{
    public function __invoke(Note $note): void
    {
        $note->delete();
    }
}
