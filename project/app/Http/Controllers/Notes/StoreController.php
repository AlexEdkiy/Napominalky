<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Actions\Note\CreateNoteAction;
use App\Data\NoteData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Note\StoreNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreController extends Controller
{
    public function __construct(
        private readonly CreateNoteAction $createNote,
    ) {
    }

    public function __invoke(StoreNoteRequest $request): JsonResponse
    {
        $this->authorize('create', Note::class);

        // Клиентский uuid (offline-создание) пробрасывается в Action для
        // sync-идемпотентности; иначе HasUuid сгенерирует серверный uuid.
        $uuid = $request->filled('uuid')
            ? $request->string('uuid')->toString()
            : null;

        $note = ($this->createNote)($request->user(), $this->toData($request), $uuid);

        return NoteResource::make($note)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    private function toData(StoreNoteRequest $request): NoteData
    {
        return new NoteData(
            title: $request->string('title')->toString(),
            body: $request->filled('body') ? $request->string('body')->toString() : null,
            isPinned: $request->boolean('is_pinned'),
            isArchived: $request->boolean('is_archived'),
        );
    }
}
