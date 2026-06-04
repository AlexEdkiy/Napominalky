<?php

declare(strict_types=1);

namespace App\Data;

use Carbon\CarbonImmutable;

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
            payload: (array) ($data['payload'] ?? []),
            updatedAt: CarbonImmutable::parse($data['updated_at']),
        );
    }
}
