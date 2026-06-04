<?php

declare(strict_types=1);

namespace App\Enums;

use Carbon\CarbonInterface;

/**
 * Тип повторения напоминания (FR-19, FR-23).
 *
 * Backed string-enum: значение хранится в reminders.recurrence
 * (varchar(20), default 'none'). label() даёт русскую подпись для API
 * Resource / UI. nextOccurrence() вычисляет следующую дату срабатывания
 * относительно переданной даты — используется при «выполнении»
 * повторяющегося напоминания (CompleteReminderAction).
 */
enum RecurrenceType: string
{
    case None = 'none';
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';

    public function label(): string
    {
        return match ($this) {
            self::None => 'Без повтора',
            self::Daily => 'Ежедневно',
            self::Weekly => 'Еженедельно',
            self::Monthly => 'Ежемесячно',
        };
    }

    /**
     * Следующее вхождение относительно $from.
     *
     * Для None повторения нет — возвращается null. Carbon-методы
     * возвращают новый экземпляр, исходная дата не мутируется.
     */
    public function nextOccurrence(CarbonInterface $from): ?CarbonInterface
    {
        return match ($this) {
            self::None => null,
            self::Daily => $from->copy()->addDay(),
            self::Weekly => $from->copy()->addWeek(),
            self::Monthly => $from->copy()->addMonth(),
        };
    }
}
