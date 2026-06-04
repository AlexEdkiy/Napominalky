<?php

declare(strict_types=1);

use App\Enums\RecurrenceType;
use App\Models\Reminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Laravel\Sanctum\Sanctum;

it('completes a non-recurring reminder via the API', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create(['recurrence' => RecurrenceType::None]);

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/complete")
        ->assertOk()
        ->assertJsonPath('data.uuid', $reminder->uuid)
        ->assertJsonPath('data.is_completed', true);

    expect($reminder->fresh()->completed_at)->not->toBeNull()
        ->and(Reminder::where('user_id', $user->id)->count())->toBe(1);
});

it('completing a recurring reminder spawns the next occurrence', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $remindAt = CarbonImmutable::parse('2026-06-10 09:00:00');
    $reminder = Reminder::factory()->for($user)->create([
        'recurrence' => RecurrenceType::Daily,
        'remind_at' => $remindAt,
    ]);

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/complete")
        ->assertOk()
        ->assertJsonPath('data.is_completed', true);

    expect(Reminder::where('user_id', $user->id)->count())->toBe(2);

    $next = Reminder::where('user_id', $user->id)->where('is_completed', false)->first();

    expect($next)->not->toBeNull()
        ->and($next->remind_at->toISOString())->toBe($remindAt->addDay()->toISOString());
});

it('snoozes a reminder for 10 minutes via the API', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/snooze", ['snooze' => '10m'])
        ->assertOk()
        ->assertJsonPath('data.uuid', $reminder->uuid);

    expect($reminder->fresh()->snoozed_until)->not->toBeNull();
});

it('snoozes a reminder for 1 hour via the API', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/snooze", ['snooze' => '1h'])
        ->assertOk();

    expect($reminder->fresh()->snoozed_until)->not->toBeNull();
});

it('rejects an invalid snooze option with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/snooze", ['snooze' => '5m'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['snooze']);
});

it('rejects a missing snooze option with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/snooze", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['snooze']);
});
