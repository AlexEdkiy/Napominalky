<?php

declare(strict_types=1);

use App\Enums\TaskStatus;

it('is backed by the expected string values', function (): void {
    expect(TaskStatus::New->value)->toBe('new')
        ->and(TaskStatus::InProgress->value)->toBe('in_progress')
        ->and(TaskStatus::Postponed->value)->toBe('postponed')
        ->and(TaskStatus::Done->value)->toBe('done');
});

it('exposes a Russian label for every case', function (): void {
    expect(TaskStatus::New->label())->toBe('Новая')
        ->and(TaskStatus::InProgress->label())->toBe('В работе')
        ->and(TaskStatus::Postponed->label())->toBe('Отложена')
        ->and(TaskStatus::Done->label())->toBe('Выполнена');
});

it('reports isDone only for the Done case', function (): void {
    expect(TaskStatus::Done->isDone())->toBeTrue()
        ->and(TaskStatus::New->isDone())->toBeFalse()
        ->and(TaskStatus::InProgress->isDone())->toBeFalse()
        ->and(TaskStatus::Postponed->isDone())->toBeFalse();
});

it('forChecked(true) yields Done regardless of the current status', function (): void {
    foreach (TaskStatus::cases() as $current) {
        expect(TaskStatus::forChecked(true, $current))->toBe(TaskStatus::Done);
    }
});

it('forChecked(false) resets Done to New', function (): void {
    expect(TaskStatus::forChecked(false, TaskStatus::Done))->toBe(TaskStatus::New);
});

it('forChecked(false) keeps non-Done statuses untouched', function (): void {
    expect(TaskStatus::forChecked(false, TaskStatus::New))->toBe(TaskStatus::New)
        ->and(TaskStatus::forChecked(false, TaskStatus::InProgress))->toBe(TaskStatus::InProgress)
        ->and(TaskStatus::forChecked(false, TaskStatus::Postponed))->toBe(TaskStatus::Postponed);
});
