<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notes;

use App\Http\Controllers\Controller;
use App\Http\Requests\Note\IndexNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    private const int DEFAULT_PER_PAGE = 15;

    public function __invoke(IndexNoteRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Note::class);

        $query = $request->user()->notes()
            ->when($request->filled('search'), fn (Builder $q) => $q->search($request->string('search')->toString()))
            ->when(
                $request->has('filter.archived'),
                fn (Builder $q) => $q->where('is_archived', $request->boolean('filter.archived')),
            )
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at');

        $notes = $query->paginate($this->resolvePerPage($request));

        return NoteResource::collection($notes);
    }

    private function resolvePerPage(IndexNoteRequest $request): int
    {
        return (int) ($request->integer('per_page') ?: self::DEFAULT_PER_PAGE);
    }
}
