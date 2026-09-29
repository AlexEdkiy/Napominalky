<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * Delta-pull синхронизации: выдаёт изменения пользователя с server_revision
 * больше клиентского курсора, включая мягко удалённые записи (tombstones).
 *
 * Курсор и пагинация — сквозные (по всем сущностям сразу): кандидаты всех
 * типов объединяются, сортируются по монотонному server_revision и режутся
 * до $limit. cursor = максимальный server_revision среди отданных записей,
 * has_more = были ли отброшены кандидаты с большим revision. Такой порядок
 * гарантирует, что следующий pull (since=cursor) не пропустит записей.
 *
 * @see docs/architecture/mvp-architecture.md «Часть 0.2 Sync-стратегия»
 */
final class SyncPullService
{
    public function __construct(
        private readonly SyncSerializer $serializer,
    ) {}

    /**
     * @return array{
     *     notes: list<array<string, mixed>>,
     *     shopping_lists: list<array<string, mixed>>,
     *     shopping_list_items: list<array<string, mixed>>,
     *     shopping_list_item_comments: list<array<string, mixed>>,
     *     reminders: list<array<string, mixed>>,
     *     cursor: int,
     *     has_more: bool
     * }
     */
    public function pull(User $user, int $since, int $limit = 200): array
    {
        $candidates = $this->collectCandidates($user, $since, $limit);

        usort($candidates, static fn (Model $a, Model $b): int => $a->server_revision <=> $b->server_revision);

        $hasMore = count($candidates) > $limit;
        $page = array_slice($candidates, 0, $limit);

        return [
            ...$this->groupByEntity($page),
            'cursor' => $this->cursorFor($page, $since),
            'has_more' => $hasMore,
        ];
    }

    /**
     * Собирает изменённые записи всех сущностей. Каждая выборка ограничена
     * $limit + 1 — этого достаточно для корректного определения has_more
     * после сквозной сортировки и среза до $limit.
     *
     * @return list<Model>
     */
    private function collectCandidates(User $user, int $since, int $limit): array
    {
        $candidates = [];

        foreach (SyncEntities::all() as $entityType) {
            foreach ($this->changedRows($entityType, $user, $since, $limit) as $model) {
                $candidates[] = $model;
            }
        }

        return $candidates;
    }

    /**
     * Изменённые записи одной сущности (включая tombstones), упорядоченные
     * по server_revision, не более $limit + 1 штук.
     *
     * @return Collection<int, Model>
     */
    private function changedRows(string $entityType, User $user, int $since, int $limit): Collection
    {
        $model = SyncEntities::modelFor($entityType);

        $query = $model::query()
            ->withTrashed()
            ->where('user_id', $user->id)
            ->where('server_revision', '>', $since)
            ->orderBy('server_revision')
            ->limit($limit + 1);

        if ($entityType === 'shopping_list_item') {
            $query->with(['shoppingList' => static fn ($relation) => $relation->withTrashed()]);
        }

        // Родительская строка нужна сериализатору (item?->uuid) — eager load
        // включая tombstones, иначе N+1 и потеря ссылки на удалённого родителя.
        if ($entityType === 'shopping_list_item_comment') {
            $query->with(['item' => static fn ($relation) => $relation->withTrashed()]);
        }

        return $query->get();
    }

    /**
     * Сериализует и раскладывает страницу по множественным ключам выдачи.
     * Пустые наборы остаются пустыми массивами.
     *
     * @param  list<Model>  $page
     * @return array<string, list<array<string, mixed>>>
     */
    private function groupByEntity(array $page): array
    {
        $grouped = [];
        foreach (SyncEntities::all() as $entityType) {
            $grouped[SyncEntities::pluralKey($entityType)] = [];
        }

        foreach ($page as $model) {
            $key = SyncEntities::pluralKey($this->entityTypeOf($model));
            $grouped[$key][] = $this->serializer->serialize($model);
        }

        return $grouped;
    }

    /**
     * Новый курсор клиента: максимальный отданный server_revision либо $since,
     * если в страницу ничего не попало.
     *
     * @param  list<Model>  $page
     */
    private function cursorFor(array $page, int $since): int
    {
        $last = end($page);

        return $last instanceof Model ? (int) $last->server_revision : $since;
    }

    private function entityTypeOf(Model $model): string
    {
        return match ($model->getTable()) {
            'notes' => 'note',
            'shopping_lists' => 'shopping_list',
            'shopping_list_items' => 'shopping_list_item',
            'shopping_list_item_comments' => 'shopping_list_item_comment',
            'reminders' => 'reminder',
            default => throw new InvalidArgumentException('Unknown table: '.$model->getTable()),
        };
    }
}
