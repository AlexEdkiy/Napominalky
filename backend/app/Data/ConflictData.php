<?php

declare(strict_types=1);

namespace App\Data;

/**
 * Бэкап спорной записи для ответа push (FR-37): обе версии конфликта.
 *
 * @see docs/architecture/mvp-architecture.md «Группа 7»
 */
final readonly class ConflictData
{
    /**
     * @param array<string, mixed> $serverPayload
     * @param array<string, mixed> $clientPayload
     */
    public function __construct(
        public string $entityType,
        public string $entityUuid,
        public array $serverPayload,
        public array $clientPayload,
    ) {}
}
