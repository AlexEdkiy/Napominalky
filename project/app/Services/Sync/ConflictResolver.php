<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Data\ConflictData;
use App\Models\SyncConflict;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Резолвер конфликтов синхронизации (LWW + бэкап спорной записи, FR-37).
 *
 * При проигрыше клиента по Last-Write-Wins серверная запись остаётся
 * неизменной (server wins), а спорная клиентская версия сохраняется в
 * sync_conflicts вместе с серверной — без автоудаления и автослияния.
 * Это страховка против потери одновременной правки (см. docs/architecture
 * «Часть 0.2» и «Группа 7»). resolved_at = null: разбор — ручной/клиентский.
 */
final class ConflictResolver
{
    public function __construct(
        private readonly SyncSerializer $serializer,
    ) {}

    /**
     * Бэкапит спорную запись и возвращает обе версии конфликта.
     *
     * @param array<string, mixed> $clientPayload клиентская версия (проиграла LWW)
     */
    public function backup(
        User $user,
        string $entityType,
        Model $serverRecord,
        array $clientPayload,
    ): ConflictData {
        $serverPayload = $this->serializer->serialize($serverRecord);

        $user->syncConflicts()->create([
            'entity_type' => $entityType,
            'entity_uuid' => $serverRecord->uuid,
            'server_payload' => $serverPayload,
            'client_payload' => $clientPayload,
            'resolved_at' => null,
        ]);

        return new ConflictData(
            entityType: $entityType,
            entityUuid: $serverRecord->uuid,
            serverPayload: $serverPayload,
            clientPayload: $clientPayload,
        );
    }
}
