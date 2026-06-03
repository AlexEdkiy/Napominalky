<?php

declare(strict_types=1);

namespace App\Actions\Note;

use App\Models\Note;

final class TogglePinAction
{
    public function __invoke(Note $note, bool $pinned): Note
    {
        $note->update(['is_pinned' => $pinned]);

        return $note;
    }
}
