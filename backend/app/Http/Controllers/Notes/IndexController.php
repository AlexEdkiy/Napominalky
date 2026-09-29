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

        $searched = $request->user()->notes()
            ->when($request->filled('search'), fn (Builder $q) => $q->search($request->string('search')->toString()));

        // Счётчики «Активные / Архив» (MBE-23) — по тому же поиску, но без
        // фильтра архива: переключатель в ЛК показывает количество в обеих вкладках.
        $counts = [
            'active' => (clone $searched)->where('is_archived', false)->count(),
            'archived' => (clone $searched)->where('is_archived', true)->count(),
        ];

        $notes = $searched
            ->when(
                $request->has('filter.archived'),
                fn (Builder $q) => $q->where('is_archived', $request->boolean('filter.archived')),
            )
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->paginate($this->resolvePerPage($request));

        return NoteResource::collection($notes)->additional(['meta' => ['counts' => $counts]]);
    }

    private function resolvePerPage(IndexNoteRequest $request): int
    {
        return (int) ($request->integer('per_page') ?: self::DEFAULT_PER_PAGE);
    }
}
