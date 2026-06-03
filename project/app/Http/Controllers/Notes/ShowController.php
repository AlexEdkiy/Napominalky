<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Http\Controllers\Controller;
use App\Http\Resources\NoteResource;
use App\Models\Note;

final class ShowController extends Controller
{
    public function __invoke(Note $note): NoteResource
    {
        $this->authorize('view', $note);

        return NoteResource::make($note);
    }
}
