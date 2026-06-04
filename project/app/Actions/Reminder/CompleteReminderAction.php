<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Enums\RecurrenceType;
use App\Models\Reminder;
use Illuminate\Support\Facades\DB;

final class CompleteReminderAction
{
    /**
     * Помечает напоминание выполненным (FR-24).
     *
     * Для повторяющегося напоминания (recurrence != none) текущее вхождение
     * сохраняется как выполненное (история completed_at), а следующее вхождение
     * создаётся новой записью с собственным uuid/server_revision и remind_at =
     * recurrence->nextOccurrence(remind_at). Каждое вхождение — отдельная строка:
     * это согласуется с delta-sync (отдельные курсоры/tombstones) и корректным
     * перепланированием локального уведомления на клиенте. Обе записи пишутся
     * в одной транзакции. Возвращается исходное (выполненное) напоминание.
     */
    public function __invoke(Reminder $reminder): Reminder
    {
        return DB::transaction(function () use ($reminder): Reminder {
            // Прямое присваивание: is_completed/completed_at вне $fillable
            // (не принимаются из запроса), их выставляет только домен.
            $reminder->is_completed = true;
            $reminder->completed_at = now();
            $reminder->save();

            if ($reminder->recurrence !== RecurrenceType::None) {
                $this->createNextOccurrence($reminder);
            }

            return $reminder;
        });
    }

    private function createNextOccurrence(Reminder $reminder): void
    {
        $nextRemindAt = $reminder->recurrence->nextOccurrence($reminder->remind_at);

        if ($nextRemindAt === null) {
            return;
        }

        $reminder->user->reminders()->create([
            'title' => $reminder->title,
            'notes' => $reminder->notes,
            'remind_at' => $nextRemindAt,
            'recurrence' => $reminder->recurrence,
            'source_uuid' => $reminder->source_uuid,
            'source_type' => $reminder->source_type,
        ]);
    }
}
