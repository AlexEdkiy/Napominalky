<?php

declare(strict_types=1);

namespace App\Actions\Reminder;

use App\Enums\SnoozeOption;
use App\Models\Reminder;
use Carbon\CarbonInterface;

final class SnoozeReminderAction
{
    /**
     * Откладывает напоминание (FR-25).
     *
     * Пресет SnoozeOption → snoozed_until = now + option->toInterval();
     * своё время (CarbonInterface, провалидировано after:now) → как есть.
     * remind_at (исходное расписание) намеренно не трогаем: это канонический
     * срок и основа для расчёта повторений. Клиент перепланирует локальное
     * уведомление на snoozed_until.
     */
    public function __invoke(Reminder $reminder, SnoozeOption|CarbonInterface $target): Reminder
    {
        // Прямое присваивание: snoozed_until вне $fillable (не из запроса).
        $reminder->snoozed_until = $target instanceof SnoozeOption
            ? now()->add($target->toInterval())
            : $target;
        $reminder->save();

        return $reminder;
    }
}
