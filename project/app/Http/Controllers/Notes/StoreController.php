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
    /**
     * Клиентский uuid создаваемой заметки на время одного запроса.
     *
     * uuid не входит в fillable модели, а доменный CreateNoteAction намеренно
     * не принимает его, поэтому значение протаскивается через одноразовый
     * creating-listener (см. boot ниже): он подставляет uuid из этого холдера
     * и сбрасывает его, не затрагивая остальные boot-хуки модели (HasUuid
     * сгенерирует uuid сам, если холдер пуст). Sync-идемпотентность —
     * docs/architecture «Часть 0.7».
     */
    private static ?string $clientUuid = null;

    private static bool $listenerRegistered = false;

    public function __construct(
        private readonly CreateNoteAction $createNote,
    ) {
        $this->registerUuidListener();
    }

    public function __invoke(StoreNoteRequest $request): JsonResponse
    {
        $this->authorize('create', Note::class);

        self::$clientUuid = $request->filled('uuid')
            ? $request->string('uuid')->toString()
            : null;

        $note = ($this->createNote)($request->user(), $this->toData($request));

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

    private function registerUuidListener(): void
    {
        if (self::$listenerRegistered) {
            return;
        }

        Note::creating(static function (Note $note): void {
            if (self::$clientUuid !== null) {
                $note->uuid = self::$clientUuid;
                self::$clientUuid = null;
            }
        });

        self::$listenerRegistered = true;
    }
}
