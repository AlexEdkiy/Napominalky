<?php

declare(strict_types=1);

use App\Enums\RecurrenceType;
use App\Models\Reminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('lists only the authenticated users reminders', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Reminder::factory()->for($user)->count(2)->create();
    Reminder::factory()->create(); // another user

    $this->getJson('/api/v1/reminders')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [[
                'uuid', 'title', 'notes', 'remind_at', 'recurrence',
                'is_completed', 'completed_at', 'snoozed_until',
                'source_uuid', 'source_type', 'created_at', 'updated_at',
            ]],
        ])
        ->assertJsonMissingPath('data.0.id')
        ->assertJsonMissingPath('data.0.user_id');
});

it('filters reminders by pending status', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Reminder::factory()->for($user)->count(2)->create();
    Reminder::factory()->for($user)->completed()->create();

    $this->getJson('/api/v1/reminders?filter[status]=pending')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('filters reminders by completed status', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Reminder::factory()->for($user)->count(2)->create();
    Reminder::factory()->for($user)->completed()->create();

    $this->getJson('/api/v1/reminders?filter[status]=completed')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('returns all reminders by default and with status all', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Reminder::factory()->for($user)->count(2)->create();
    Reminder::factory()->for($user)->completed()->create();

    $this->getJson('/api/v1/reminders')->assertOk()->assertJsonCount(3, 'data');
    $this->getJson('/api/v1/reminders?filter[status]=all')->assertOk()->assertJsonCount(3, 'data');
});

it('sorts reminders by remind_at ascending by default', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $later = Reminder::factory()->for($user)->create([
        'remind_at' => CarbonImmutable::parse('2026-07-01 09:00:00'),
    ]);
    $earlier = Reminder::factory()->for($user)->create([
        'remind_at' => CarbonImmutable::parse('2026-06-01 09:00:00'),
    ]);

    $response = $this->getJson('/api/v1/reminders')->assertOk();

    expect($response->json('data.0.uuid'))->toBe($earlier->uuid)
        ->and($response->json('data.1.uuid'))->toBe($later->uuid);
});

it('sorts reminders by remind_at descending when order=desc', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $later = Reminder::factory()->for($user)->create([
        'remind_at' => CarbonImmutable::parse('2026-07-01 09:00:00'),
    ]);
    $earlier = Reminder::factory()->for($user)->create([
        'remind_at' => CarbonImmutable::parse('2026-06-01 09:00:00'),
    ]);

    $response = $this->getJson('/api/v1/reminders?sort=remind_at&order=desc')->assertOk();

    expect($response->json('data.0.uuid'))->toBe($later->uuid)
        ->and($response->json('data.1.uuid'))->toBe($earlier->uuid);
});

it('paginates the reminders index', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Reminder::factory()->for($user)->count(3)->create();

    $this->getJson('/api/v1/reminders?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.total', 3);
});

it('creates a reminder and returns 201 with the resource structure', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $remindAt = CarbonImmutable::parse('2026-06-10 09:00:00');

    $this->postJson('/api/v1/reminders', [
        'title' => 'Pay rent',
        'notes' => 'monthly',
        'remind_at' => $remindAt->toISOString(),
        'recurrence' => 'monthly',
    ])
        ->assertCreated()
        ->assertJsonStructure([
            'data' => ['uuid', 'title', 'notes', 'remind_at', 'recurrence', 'is_completed', 'created_at', 'updated_at'],
        ])
        ->assertJsonPath('data.title', 'Pay rent')
        ->assertJsonPath('data.recurrence', 'monthly')
        ->assertJsonPath('data.is_completed', false)
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.user_id');

    expect($user->reminders()->count())->toBe(1);
});

it('persists a client-provided uuid on store', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/reminders', [
        'uuid' => $uuid,
        'title' => 'Offline',
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00')->toISOString(),
    ])
        ->assertCreated()
        ->assertJsonPath('data.uuid', $uuid);

    expect(Reminder::where('uuid', $uuid)->where('user_id', $user->id)->exists())->toBeTrue();
});

it('defaults recurrence to none when omitted', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/reminders', [
        'title' => 'No recurrence',
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00')->toISOString(),
    ])
        ->assertCreated()
        ->assertJsonPath('data.recurrence', RecurrenceType::None->value);
});

it('rejects a missing title with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/reminders', [
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00')->toISOString(),
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title']);
});

it('rejects a missing remind_at with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/reminders', ['title' => 'No date'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['remind_at']);
});

it('rejects a duplicate uuid with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $existing = Reminder::factory()->for($user)->create();

    $this->postJson('/api/v1/reminders', [
        'uuid' => $existing->uuid,
        'title' => 'Conflict',
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00')->toISOString(),
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid']);
});

it('rejects an invalid recurrence with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/reminders', [
        'title' => 'Bad recurrence',
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00')->toISOString(),
        'recurrence' => 'hourly',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['recurrence']);
});

it('shows a single reminder', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->getJson("/api/v1/reminders/{$reminder->uuid}")
        ->assertOk()
        ->assertJsonPath('data.uuid', $reminder->uuid);
});

it('updates a reminder partially and returns 200', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create([
        'title' => 'Before',
        'remind_at' => CarbonImmutable::parse('2026-06-10 09:00:00'),
    ]);

    $this->putJson("/api/v1/reminders/{$reminder->uuid}", ['title' => 'After'])
        ->assertOk()
        ->assertJsonPath('data.title', 'After');

    expect($reminder->fresh()->title)->toBe('After');
});

it('soft deletes a reminder and returns 204', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $reminder = Reminder::factory()->for($user)->create();

    $this->deleteJson("/api/v1/reminders/{$reminder->uuid}")
        ->assertNoContent();

    expect(Reminder::find($reminder->id))->toBeNull()
        ->and(Reminder::withTrashed()->find($reminder->id)->deleted_at)->not->toBeNull();
});
