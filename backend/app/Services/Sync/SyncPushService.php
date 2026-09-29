<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Data\SyncChangeData;
use App\Data\SyncPushResultData;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Delta-push синхронизации: применяет клиентский батч изменений по правилу
 * Last-Write-Wins с идемпотентностью по uuid и бэкапом конфликтов (FR-37).
 *
 * Для каждого изменения:
 * - неизвестный entity_type пропускается (не валит весь батч);
 * - запись ищется по (user_id, uuid) среди всех (включая tombstones);
 * - нет записи → применяется (create/update/delete-tombstone);
 * - есть запись и client updated_at >= server → применяется (client wins),
 *   что делает повторный push того же updated_at идемпотентным;
 * - client updated_at < server → конфликт: серверная версия неизменна
 *   (server wins), клиентская бэкапится в sync_conflicts.
 *
 * Весь батч атомарен (DB::transaction). user_id всегда из токена ($user),
 * никогда из payload. server_revision новых/изменённых записей назначает
 * трейт TracksSyncRevision; cursor — максимум среди них (или текущее
 * состояние последовательности, если ничего не применено), чтобы следующий
 * pull(since=cursor) не выдал клиенту его же только что применённые записи.
 *
 * @see docs/architecture/mvp-architecture.md «Часть 0.2», «Группа 7»
 */
final class SyncPushService
{
    public function __construct(
        private readonly SyncChangeApplier $applier,
        private readonly ConflictResolver $conflictResolver,
    ) {}

    /**
     * @param list<SyncChangeData> $changes
     */
    public function push(User $user, array $changes): SyncPushResultData
    {
        return DB::transaction(function () use ($user, $changes): SyncPushResultData {
            $applied = [];
            $conflicts = [];
            $maxRevision = 0;

            foreach ($changes as $change) {
                if (! SyncEntities::supports($change->entityType)) {
                    continue;
                }

                $existing = $this->findExisting($user, $change);

                if ($existing === null) {
                    $model = $this->applier->create($user, $change);
                    $applied[] = $change->uuid;

                    if ($model !== null) {
                        $maxRevision = max($maxRevision, (int) $model->server_revision);
                    }

                    continue;
                }

                if ($change->updatedAt->gte($existing->updated_at)) {
                    $this->applier->apply($user, $existing, $change);
                    $applied[] = $change->uuid;
                    $maxRevision = max($maxRevision, (int) $existing->server_revision);

                    continue;
                }

                $conflicts[] = $this->conflictResolver->backup(
                    user: $user,
                    entityType: $change->entityType,
                    serverRecord: $existing,
                    clientPayload: $change->payload,
                );
            }

            return new SyncPushResultData(
                applied: $applied,
                conflicts: $conflicts,
                cursor: $this->cursor($user, $maxRevision),
            );
        });
    }

    /**
     * Находит существующую запись по (user_id, uuid), включая tombstones,
     * чтобы push после удаления был идемпотентным (upsert по uuid).
     */
    private function findExisting(User $user, SyncChangeData $change): ?Model
    {
        $class = SyncEntities::modelFor($change->entityType);

        return $class::withTrashed()
            ->where('user_id', $user->id)
            ->where('uuid', $change->uuid)
            ->first();
    }

    /**
     * Новый курсор клиента после батча: максимальный назначенный в батче
     * server_revision. Если ничего не применено (пустой батч либо одни
     * конфликты), отдаём текущее значение последовательности — клиент не
     * откатит уже известный ему курсор.
     */
    private function cursor(User $user, int $maxRevision): int
    {
        if ($maxRevision > 0) {
            return $maxRevision;
        }

        return (int) DB::selectOne(
            "SELECT last_value AS rev FROM sync_revision_sequence",
        )->rev;
    }
}
