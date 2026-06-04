<?php

declare(strict_types=1);

use App\Enums\RecurrenceType;
use Carbon\CarbonImmutable;

it('returns null nextOccurrence for None', function (): void {
    $from = CarbonImmutable::parse('2026-06-04 10:00:00');

    expect(RecurrenceType::None->nextOccurrence($from))->toBeNull();
});

it('returns the next day for Daily', function (): void {
    $from = CarbonImmutable::parse('2026-06-04 10:00:00');

    $next = RecurrenceType::Daily->nextOccurrence($from);

    expect($next)->not->toBeNull()
        ->and($next->toISOString())->toBe(CarbonImmutable::parse('2026-06-05 10:00:00')->toISOString());
});

it('returns the next week for Weekly', function (): void {
    $from = CarbonImmutable::parse('2026-06-04 10:00:00');

    $next = RecurrenceType::Weekly->nextOccurrence($from);

    expect($next->toISOString())->toBe(CarbonImmutable::parse('2026-06-11 10:00:00')->toISOString());
});

it('returns the next month for Monthly', function (): void {
    $from = CarbonImmutable::parse('2026-06-04 10:00:00');

    $next = RecurrenceType::Monthly->nextOccurrence($from);

    expect($next->toISOString())->toBe(CarbonImmutable::parse('2026-07-04 10:00:00')->toISOString());
});

it('does not mutate the source date when computing nextOccurrence', function (): void {
    $from = CarbonImmutable::parse('2026-06-04 10:00:00');
    $original = $from->toISOString();

    RecurrenceType::Daily->nextOccurrence($from);
    RecurrenceType::Weekly->nextOccurrence($from);
    RecurrenceType::Monthly->nextOccurrence($from);

    expect($from->toISOString())->toBe($original);
});

it('exposes a Russian label for every case', function (): void {
    expect(RecurrenceType::None->label())->toBe('Без повтора')
        ->and(RecurrenceType::Daily->label())->toBe('Ежедневно')
        ->and(RecurrenceType::Weekly->label())->toBe('Еженедельно')
        ->and(RecurrenceType::Monthly->label())->toBe('Ежемесячно');
});

it('is backed by the expected string values', function (): void {
    expect(RecurrenceType::None->value)->toBe('none')
        ->and(RecurrenceType::Daily->value)->toBe('daily')
        ->and(RecurrenceType::Weekly->value)->toBe('weekly')
        ->and(RecurrenceType::Monthly->value)->toBe('monthly');
});
