<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Reminder\PurgeCompletedRemindersAction;
use Illuminate\Console\Command;

final class PurgeCompletedRemindersCommand extends Command
{
    protected $signature = 'reminders:purge-completed';

    protected $description = 'Мягко удаляет напоминания, выполненные более '
        .PurgeCompletedRemindersAction::RETENTION_DAYS.' дней назад (tombstone уходит в sync)';

    public function handle(PurgeCompletedRemindersAction $purge): int
    {
        $purged = $purge();

        $this->info("Удалено выполненных напоминаний: {$purged}");

        return self::SUCCESS;
    }
}
