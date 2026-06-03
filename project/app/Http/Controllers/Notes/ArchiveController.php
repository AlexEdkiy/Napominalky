<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Actions\Note\ToggleArchiveAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Note\ArchiveNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;

final class ArchiveController extends Controller
{
    public function __construct(
        private readonly ToggleArchiveAction $toggleArchive,
    ) {}

    public function __invoke(ArchiveNoteRequest $request, Note $note): NoteResource
    {
        $this->authorize('archive', $note);

        $updated = ($this->toggleArchive)($note, $request->boolean('is_archived'));

        return NoteResource::make($updated);
    }
}
