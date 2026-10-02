<?php

declare(strict_types=1);

namespace App\Services\Search;

use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class SearchService
{
    public function search(int $userId, string $query, string $type, int $perPage): LengthAwarePaginator
    {
        // Literal substring: neither SQL syntax nor LIKE wildcards come from the user.
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $query).'%';
        $emptyParent = 'NULL::uuid AS list_uuid, NULL::text AS list_title, NULL::text AS list_type';

        $notes = $this->owned('notes', 'n', $userId)
            ->selectRaw("'note' AS type, n.uuid, n.title, n.body AS content, {$emptyParent}, false AS is_completed, n.is_archived, n.updated_at");
        $this->matchFields($notes, ['n.title', 'n.body'], $pattern);
        $this->rank($notes, 'n.title', $pattern);

        $lists = $this->owned('shopping_lists', 'l', $userId)
            ->selectRaw("'list' AS type, l.uuid, l.title, l.tags AS content, NULL::uuid AS list_uuid, NULL::text AS list_title, l.type AS list_type, l.is_completed, false AS is_archived, l.updated_at");
        $this->matchFields($lists, ['l.title', 'l.tags'], $pattern);
        $this->rank($lists, 'l.title', $pattern);

        $comments = $this->owned('shopping_list_item_comments', 'c', $userId)
            ->whereColumn('c.shopping_list_item_id', 'i.id')
            ->whereRaw("c.body ILIKE ? ESCAPE '!'", [$pattern]);
        $commentText = (clone $comments)->select('c.body')->orderByDesc('c.created_at')->orderByDesc('c.id')->limit(1);
        $items = $this->owned('shopping_list_items', 'i', $userId)
            ->join('shopping_lists as p', 'p.id', '=', 'i.shopping_list_id')
            ->where('p.user_id', $userId)->whereNull('p.deleted_at')
            ->selectRaw("'item' AS type, i.uuid, i.name AS title")
            ->selectRaw("CASE WHEN i.comment ILIKE ? ESCAPE '!' THEN i.comment WHEN i.tags ILIKE ? ESCAPE '!' THEN i.tags ELSE ({$commentText->toSql()}) END AS content", [$pattern, $pattern, ...$commentText->getBindings()])
            ->selectRaw('p.uuid AS list_uuid, p.title AS list_title, p.type AS list_type, i.is_checked AS is_completed, false AS is_archived, i.updated_at')
            ->where(function (Builder $where) use ($pattern, $comments): void {
                $this->matchFields($where, ['i.name', 'i.comment', 'i.tags'], $pattern);
                $where->orWhereExists((clone $comments)->selectRaw('1'));
            });
        $this->rank($items, 'i.name', $pattern);

        $reminders = $this->owned('reminders', 'r', $userId)
            ->selectRaw("'reminder' AS type, r.uuid, r.title, r.notes AS content, {$emptyParent}, r.is_completed, false AS is_archived, r.updated_at");
        $this->matchFields($reminders, ['r.title', 'r.notes'], $pattern);
        $this->rank($reminders, 'r.title', $pattern);

        $queries = ['note' => $notes, 'list' => $lists, 'item' => $items, 'reminder' => $reminders];
        $selected = $type === 'all' ? array_values($queries) : [$queries[$type]];
        $combined = array_shift($selected);
        foreach ($selected as $part) {
            $combined->unionAll($part);
        }

        return DB::query()->fromSub($combined, 'results')
            ->orderBy('relevance')->orderByDesc('updated_at')->orderBy('type')->orderBy('uuid')
            ->paginate($perPage)->withQueryString();
    }

    private function owned(string $table, string $alias, int $userId): Builder
    {
        return DB::table("{$table} as {$alias}")->where("{$alias}.user_id", $userId)->whereNull("{$alias}.deleted_at");
    }

    /** @param list<string> $columns */
    private function matchFields(Builder $query, array $columns, string $pattern): void
    {
        $query->where(function (Builder $where) use ($columns, $pattern): void {
            foreach ($columns as $column) {
                $where->orWhereRaw("{$column} ILIKE ? ESCAPE '!'", [$pattern]);
            }
        });
    }

    private function rank(Builder $query, string $title, string $pattern): void
    {
        $query->selectRaw("CASE WHEN {$title} ILIKE ? ESCAPE '!' THEN 0 ELSE 1 END AS relevance", [$pattern]);
    }
}
