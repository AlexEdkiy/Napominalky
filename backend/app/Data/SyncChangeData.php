<?php

declare(strict_types=1);

namespace App\Data;

use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Одно изменение из клиентского push-батча (outbox-запись).
 *
 * @see docs/architecture/mvp-architecture.md «Часть 0.2 Sync-стратегия»
 */
final readonly class SyncChangeData
{
    /**
     * @param 'create'|'update'|'delete' $operation
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public string $entityType,
        public string $uuid,
        public string $operation,
        public array $payload,
        public CarbonImmutable $updatedAt,
    ) {}

    /**
     * Маппинг из одного элемента batch-запроса (snake_case-контракт).
     *
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            entityType: (string) $data['entity_type'],
            uuid: (string) $data['uuid'],
            operation: (string) $data['operation'],
            payload: self::normalizeKeys((array) ($data['payload'] ?? [])),
            updatedAt: CarbonImmutable::parse($data['updated_at']),
        );
    }

    /**
     * Нормализует ключи payload в snake_case. Мобильный клиент шлёт сырую строку
     * локальной БД в camelCase (shoppingListUuid, isPinned, isChecked, remindAt),
     * тогда как доменный контракт и whitelist полей — snake_case. Без нормализации
     * многословные поля терялись, а shopping_list_uuid не резолвился в parent_id,
     * что давало NOT NULL violation на FK и блокировало весь push-батч.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private static function normalizeKeys(array $payload): array
    {
        $normalized = [];

        foreach ($payload as $key => $value) {
            $normalized[Str::snake((string) $key)] = $value;
        }

        return $normalized;
    }
}
