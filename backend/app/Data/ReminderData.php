<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\RecurrenceType;
use Carbon\CarbonImmutable;

readonly class ReminderData
{
    public function __construct(
        public string $title,
        public ?string $notes,
        public CarbonImmutable $remindAt,
        public RecurrenceType $recurrence = RecurrenceType::None,
        public ?string $sourceUuid = null,
        public ?string $sourceType = null,
    ) {}
}
