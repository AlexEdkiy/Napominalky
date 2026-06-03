<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Actions\Note\DeleteNoteAction;
use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Response;

final class DestroyController extends Controller
{
    public function __construct(
        private readonly DeleteNoteAction $deleteNote,
    ) {}

    public function __invoke(Note $note): Response
    {
        $this->authorize('delete', $note);

        ($this->deleteNote)($note);

        return response()->noContent();
    }
}
