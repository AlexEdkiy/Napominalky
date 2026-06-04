<?php

declare(strict_types=1);

namespace App\Http\Resources\Sync;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Оформляет результат SyncPullService::pull() в delta-формат API.
 *
 * pull() отдаёт уже сериализованные под клиентскую SQLite-схему массивы
 * (включая tombstones с deleted_at), поэтому Resource не трансформирует
 * записи, а лишь раскладывает плоский массив на data (4 сущности) и meta
 * (курсор и признак продолжения).
 *
 * @property array{
 *     notes: list<array<string, mixed>>,
 *     shopping_lists: list<array<string, mixed>>,
 *     shopping_list_items: list<array<string, mixed>>,
 *     reminders: list<array<string, mixed>>,
 *     cursor: int,
 *     has_more: bool
 * } $resource
 */
final class SyncChangesResource extends JsonResource
{
    /**
     * Ответ уже содержит верхнеуровневые ключи data/meta, поэтому стандартную
     * обёртку "data" JsonResource отключаем — иначе вышло бы data.data.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @param array{
     *     notes: list<array<string, mixed>>,
     *     shopping_lists: list<array<string, mixed>>,
     *     shopping_list_items: list<array<string, mixed>>,
     *     reminders: list<array<string, mixed>>,
     *     cursor: int,
     *     has_more: bool
     * } $pull
     */
    public static function fromPull(array $pull): self
    {
        return new self($pull);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => [
                'notes' => $this->resource['notes'],
                'shopping_lists' => $this->resource['shopping_lists'],
                'shopping_list_items' => $this->resource['shopping_list_items'],
                'reminders' => $this->resource['reminders'],
            ],
            'meta' => [
                'cursor' => (int) $this->resource['cursor'],
                'has_more' => (bool) $this->resource['has_more'],
            ],
        ];
    }
}
