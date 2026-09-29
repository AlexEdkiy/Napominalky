<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Services\ShoppingList\ListStatusResolver;

it('derives New for an empty item list', function (): void {
    expect(new ListStatusResolver()->derive([]))->toBe(TaskStatus::New);
});

it('derives New when all items are New', function (): void {
    $statuses = [TaskStatus::New, TaskStatus::New, TaskStatus::New];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::New);
});

it('derives InProgress when at least one item is InProgress', function (): void {
    $resolver = new ListStatusResolver;

    expect($resolver->derive([TaskStatus::InProgress]))->toBe(TaskStatus::InProgress)
        ->and($resolver->derive([TaskStatus::New, TaskStatus::InProgress]))->toBe(TaskStatus::InProgress)
        ->and($resolver->derive([TaskStatus::Done, TaskStatus::InProgress]))->toBe(TaskStatus::InProgress)
        ->and($resolver->derive([TaskStatus::Postponed, TaskStatus::InProgress]))->toBe(TaskStatus::InProgress)
        ->and($resolver->derive([
            TaskStatus::Done,
            TaskStatus::Postponed,
            TaskStatus::InProgress,
            TaskStatus::New,
        ]))->toBe(TaskStatus::InProgress);
});

it('derives Done when every item is Done', function (): void {
    $statuses = [TaskStatus::Done, TaskStatus::Done];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::Done);
});

it('derives Postponed when every item is Postponed', function (): void {
    $statuses = [TaskStatus::Postponed, TaskStatus::Postponed];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::Postponed);
});

it('derives New for a Done and Postponed mix without InProgress', function (): void {
    $statuses = [TaskStatus::Done, TaskStatus::Postponed];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::New);
});

it('derives New for a New and Done mix', function (): void {
    $statuses = [TaskStatus::New, TaskStatus::Done];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::New);
});

it('derives New for a New and Postponed mix', function (): void {
    $statuses = [TaskStatus::New, TaskStatus::Postponed];

    expect(new ListStatusResolver()->derive($statuses))->toBe(TaskStatus::New);
});
