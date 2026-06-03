<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Models\Note;

final class ToggleArchiveAction
{
    public function __invoke(Note $note, bool $archived): Note
    {
        $note->update(['is_archived' => $archived]);

        return $note;
    }
}
