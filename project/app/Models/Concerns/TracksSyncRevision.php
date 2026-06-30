<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Назначает монотонный курсор синхронизации server_revision.
 *
 * При любой мутации (create и update) модель получает следующее значение
 * последовательности sync_revision_sequence через nextval. Это формирует
 * монотонный delta-курсор для двусторонней синхронизации (см. docs/architecture
 * «Часть 0.2»): клиент хранит last_pulled_revision и подтягивает записи с
 * server_revision больше курсора, включая tombstones.
 *
 * Требования к модели-потребителю:
 * - столбец server_revision (bigInteger, NOT NULL) — добавляется в миграциях
 *   доменных таблиц (DEV-3 notes, DEV-5 shopping_lists, DEV-7 reminders);
 * - наличие последовательности sync_revision_sequence (миграция DEV-2).
 */
trait TracksSyncRevision
{
    public static function bootTracksSyncRevision(): void
    {
        static::saving(static function (Model $model): void {
            $model->server_revision = self::nextSyncRevision();
        });

        // Soft-delete (SoftDeletes::runSoftDelete) обновляет deleted_at прямым
        // query-builder update'ом и НЕ вызывает событие saving — иначе tombstone
        // сохранял бы старый server_revision и не доходил бы до устройств через
        // инкрементальный pull (server_revision > курсора). Поэтому на soft-delete
        // бампим ревизию отдельным быстрым update'ом. Force delete пропускаем —
        // строка физически удаляется.
        static::deleting(static function (Model $model): void {
            $isForceDeleting = method_exists($model, 'isForceDeleting')
                && $model->isForceDeleting();
            if ($isForceDeleting) {
                return;
            }

            $rev = self::nextSyncRevision();
            $model->server_revision = $rev;
            $model->newQueryWithoutScopes()
                ->where($model->getKeyName(), $model->getKey())
                ->update(['server_revision' => $rev]);
        });
    }

    private static function nextSyncRevision(): int
    {
        return (int) DB::selectOne("SELECT nextval('sync_revision_sequence') AS rev")->rev;
    }
}
