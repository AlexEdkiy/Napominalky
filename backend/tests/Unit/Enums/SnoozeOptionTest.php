<?php

declare(strict_types=1);

use App\Enums\SnoozeOption;
use Carbon\CarbonImmutable;

it('converts TenMinutes to a 10 minute interval', function (): void {
    $interval = SnoozeOption::TenMinutes->toInterval();

    $base = CarbonImmutable::parse('2026-06-04 10:00:00');

    expect($base->add($interval)->toISOString())
        ->toBe($base->addMinutes(10)->toISOString());
});

it('converts OneHour to a 1 hour interval', function (): void {
    $interval = SnoozeOption::OneHour->toInterval();

    $base = CarbonImmutable::parse('2026-06-04 10:00:00');

    expect($base->add($interval)->toISOString())
        ->toBe($base->addHour()->toISOString());
});

it('exposes a Russian label for every case', function (): void {
    expect(SnoozeOption::TenMinutes->label())->toBe('10 минут')
        ->and(SnoozeOption::OneHour->label())->toBe('1 час');
});

it('is backed by the expected string values', function (): void {
    expect(SnoozeOption::TenMinutes->value)->toBe('10m')
        ->and(SnoozeOption::OneHour->value)->toBe('1h');
});
