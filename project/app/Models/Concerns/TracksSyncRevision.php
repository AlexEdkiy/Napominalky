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
    }

    private static function nextSyncRevision(): int
    {
        return (int) DB::selectOne("SELECT nextval('sync_revision_sequence') AS rev")->rev;
    }
}
