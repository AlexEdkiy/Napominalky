<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Actions\Note\UpdateNoteAction;
use App\Data\NoteData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Note\UpdateNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;

final class UpdateController extends Controller
{
    public function __construct(
        private readonly UpdateNoteAction $updateNote,
    ) {}

    public function __invoke(UpdateNoteRequest $request, Note $note): NoteResource
    {
        $this->authorize('update', $note);

        $updated = ($this->updateNote)($note, $this->toData($request, $note));

        return NoteResource::make($updated);
    }

    /**
     * Частичное обновление: незаданные поля сохраняют текущие значения заметки.
     */
    private function toData(UpdateNoteRequest $request, Note $note): NoteData
    {
        return new NoteData(
            title: $request->has('title') ? $request->string('title')->toString() : $note->title,
            body: $request->has('body')
                ? ($request->filled('body') ? $request->string('body')->toString() : null)
                : $note->body,
            isPinned: $request->has('is_pinned') ? $request->boolean('is_pinned') : $note->is_pinned,
            isArchived: $request->has('is_archived') ? $request->boolean('is_archived') : $note->is_archived,
            color: $request->has('color')
                ? ($request->filled('color') ? $request->string('color')->toString() : null)
                : $note->color,
        );
    }
}
