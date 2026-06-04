<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Enums\SnoozeOption;
use App\Models\Reminder;

final class SnoozeReminderAction
{
    /**
     * Откладывает напоминание (FR-25).
     *
     * snoozed_until = now + option->toInterval(). remind_at (исходное
     * расписание) намеренно не трогаем: это канонический срок и основа
     * для расчёта повторений. Клиент перепланирует локальное уведомление
     * на snoozed_until.
     */
    public function __invoke(Reminder $reminder, SnoozeOption $option): Reminder
    {
        // Прямое присваивание: snoozed_until вне $fillable (не из запроса).
        $reminder->snoozed_until = now()->add($option->toInterval());
        $reminder->save();

        return $reminder;
    }
}
