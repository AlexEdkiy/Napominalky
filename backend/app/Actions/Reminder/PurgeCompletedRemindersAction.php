<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Models\Reminder;
use Carbon\CarbonInterface;

/**
 * Автоудаление выполненных напоминаний (DEV-25): напоминание, закрытое
 * (is_completed, completed_at) раньше чем RETENTION_DAYS дней назад,
 * мягко удаляется. Удаление — по одной модели через Eloquent, а не bulk
 * update: так срабатывает TracksSyncRevision и tombstone с новой ревизией
 * доезжает до устройств через инкрементальный pull.
 */
final class PurgeCompletedRemindersAction
{
    public const int RETENTION_DAYS = 7;

    private const int CHUNK = 200;

    /**
     * @return int количество удалённых напоминаний
     */
    public function __invoke(?CarbonInterface $now = null): int
    {
        $threshold = ($now ?? now())->copy()->subDays(self::RETENTION_DAYS);
        $purged = 0;

        Reminder::query()
            ->completed()
            ->whereNotNull('completed_at')
            ->where('completed_at', '<', $threshold)
            ->orderBy('id')
            ->chunkById(self::CHUNK, function ($reminders) use (&$purged): void {
                foreach ($reminders as $reminder) {
                    $reminder->delete();
                    $purged++;
                }
            });

        return $purged;
    }
}
