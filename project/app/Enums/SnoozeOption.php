<?php

declare(strict_types=1);

namespace App\Enums;

use Carbon\CarbonInterval;

/**
 * Вариант откладывания напоминания (FR-25).
 *
 * Backed string-enum: значение приходит из API
 * (POST /reminders/{uuid}/snooze {snooze:'10m'|'1h'}). toInterval() даёт
 * длительность для расчёта snoozed_until; label() — русская подпись для UI.
 */
enum SnoozeOption: string
{
    case TenMinutes = '10m';
    case OneHour = '1h';

    public function label(): string
    {
        return match ($this) {
            self::TenMinutes => '10 минут',
            self::OneHour => '1 час',
        };
    }

    public function toInterval(): CarbonInterval
    {
        return match ($this) {
            self::TenMinutes => CarbonInterval::minutes(10),
            self::OneHour => CarbonInterval::hour(),
        };
    }
}
