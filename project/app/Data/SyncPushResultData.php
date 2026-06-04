<?php

declare(strict_types=1);

namespace App\Data;

/**
 * Результат обработки push-батча: применённые uuid, конфликты и новый курсор.
 *
 * @see docs/architecture/mvp-architecture.md «Часть 0.2 Sync-стратегия»
 */
final readonly class SyncPushResultData
{
    /**
     * @param list<string> $applied uuid успешно применённых записей
     * @param list<ConflictData> $conflicts спорные записи (LWW проиграл клиент)
     * @param int $cursor актуальный server_revision после применения батча
     */
    public function __construct(
        public array $applied,
        public array $conflicts,
        public int $cursor,
    ) {}
}
