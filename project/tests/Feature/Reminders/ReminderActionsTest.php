<?php

declare(strict_types=1);

use App\Actions\Reminder\CompleteReminderAction;
use App\Actions\Reminder\CreateReminderAction;
use App\Actions\Reminder\DeleteReminderAction;
use App\Actions\Reminder\SnoozeReminderAction;
use App\Actions\Reminder\UpdateReminderAction;
use App\Data\ReminderData;
use App\Enums\RecurrenceType;
use App\Enums\SnoozeOption;
use App\Models\Reminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

it('creates a reminder for the user with a generated uuid via CreateReminderAction', function (): void {
    $user = User::factory()->create();
    $remindAt = CarbonImmutable::parse('2026-06-10 09:00:00');

    $reminder = (new CreateReminderAction())($user, new ReminderData(
        title: 'Call dentist',
        notes: 'Annual checkup',
        remindAt: $remindAt,
        recurrence: RecurrenceType::Weekly,
    ));

    expect($reminder)->toBeInstanceOf(Reminder::class)
        ->and($reminder->user_id)->toBe($user->id)
        ->and($reminder->title)->toBe('Call dentist')
        ->and($reminder->notes)->toBe('Annual checkup')
        ->and($reminder->recurrence)->toBe(RecurrenceType::Weekly)
        ->and($reminder->is_completed)->toBeFalse()
        ->and($reminder->uuid)->toBeString()->not->toBeEmpty()
        ->and($reminder->remind_at->toISOString())->toBe($remindAt->toISOString());
});

it('persists a client-provided uuid via CreateReminderAction', function (): void {
    $user = User::factory()->create();
    $uuid = (string) Str::uuid();

    $reminder = (new CreateReminderAction())($user, new ReminderData(
        title: 'Offline reminder',
        notes: null,
        remindAt: CarbonImmutable::parse('2026-06-10 09:00:00'),
    ), $uuid);

    expect($reminder->uuid)->toBe($uuid)
        ->and(Reminder::where('uuid', $uuid)->where('user_id', $user->id)->exists())->toBeTrue();
});

it('updates a reminder via UpdateReminderAction', function (): void {
    $reminder = Reminder::factory()->create([
        'title' => 'Before',
        'recurrence' => RecurrenceType::None,
    ]);
    $newRemindAt = CarbonImmutable::parse('2026-07-01 12:00:00');

    $updated = (new UpdateReminderAction())($reminder, new ReminderData(
        title: 'After',
        notes: 'changed',
        remindAt: $newRemindAt,
        recurrence: RecurrenceType::Daily,
    ));

    expect($updated->title)->toBe('After')
        ->and($updated->notes)->toBe('changed')
        ->and($updated->recurrence)->toBe(RecurrenceType::Daily)
        ->and($reminder->fresh()->title)->toBe('After')
        ->and($reminder->fresh()->remind_at->toISOString())->toBe($newRemindAt->toISOString());
});

it('soft deletes a reminder via DeleteReminderAction', function (): void {
    $reminder = Reminder::factory()->create();

    (new DeleteReminderAction())($reminder);

    expect(Reminder::find($reminder->id))->toBeNull()
        ->and(Reminder::withTrashed()->find($reminder->id)->deleted_at)->not->toBeNull();
});

it('completes a non-recurring reminder without creating a new record', function (): void {
    $reminder = Reminder::factory()->create(['recurrence' => RecurrenceType::None]);

    $result = (new CompleteReminderAction())($reminder);

    expect($result->is_completed)->toBeTrue()
        ->and($result->completed_at)->not->toBeNull()
        ->and(Reminder::count())->toBe(1);
});

it('completes a recurring reminder and creates exactly one next occurrence', function (): void {
    $remindAt = CarbonImmutable::parse('2026-06-10 09:00:00');
    $reminder = Reminder::factory()->create([
        'recurrence' => RecurrenceType::Weekly,
        'remind_at' => $remindAt,
    ]);

    $result = (new CompleteReminderAction())($reminder);

    expect($result->is_completed)->toBeTrue()
        ->and($result->completed_at)->not->toBeNull();

    $next = Reminder::where('is_completed', false)->get();

    expect($next)->toHaveCount(1)
        ->and(Reminder::count())->toBe(2);

    $nextReminder = $next->first();

    expect($nextReminder->id)->not->toBe($reminder->id)
        ->and($nextReminder->user_id)->toBe($reminder->user_id)
        ->and($nextReminder->recurrence)->toBe(RecurrenceType::Weekly)
        ->and($nextReminder->uuid)->not->toBe($reminder->uuid)
        ->and($nextReminder->remind_at->toISOString())
        ->toBe($remindAt->addWeek()->toISOString());
});

it('snoozes a reminder by setting snoozed_until and leaving remind_at unchanged', function (): void {
    $remindAt = CarbonImmutable::parse('2026-06-10 09:00:00');
    $reminder = Reminder::factory()->create(['remind_at' => $remindAt]);

    $before = CarbonImmutable::now();
    $result = (new SnoozeReminderAction())($reminder, SnoozeOption::TenMinutes);

    expect($result->snoozed_until)->not->toBeNull()
        ->and($result->remind_at->toISOString())->toBe($remindAt->toISOString())
        ->and($result->snoozed_until->greaterThanOrEqualTo($before->addMinutes(10)->subSecond()))
        ->toBeTrue()
        ->and($result->snoozed_until->lessThanOrEqualTo(CarbonImmutable::now()->addMinutes(10)->addSecond()))
        ->toBeTrue();
});
