<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Actions\Note\TogglePinAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Note\PinNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;

final class PinController extends Controller
{
    public function __construct(
        private readonly TogglePinAction $togglePin,
    ) {}

    public function __invoke(PinNoteRequest $request, Note $note): NoteResource
    {
        $this->authorize('pin', $note);

        $updated = ($this->togglePin)($note, $request->boolean('is_pinned'));

        return NoteResource::make($updated);
    }
}
