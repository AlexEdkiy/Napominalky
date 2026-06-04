<?php

declare(strict_types=1);

use App\Models\Reminder;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('returns 401 for unauthenticated index', function (): void {
    $this->getJson('/api/v1/reminders')->assertUnauthorized();
});

it('returns 401 for unauthenticated store', function (): void {
    $this->postJson('/api/v1/reminders', ['title' => 'No token'])
        ->assertUnauthorized();
});

it('returns 403 when viewing another users reminder', function (): void {
    $user = User::factory()->create();
    $reminder = Reminder::factory()->create(); // another owner

    Sanctum::actingAs($user);

    $this->getJson("/api/v1/reminders/{$reminder->uuid}")->assertForbidden();
});

it('returns 403 when updating another users reminder', function (): void {
    $user = User::factory()->create();
    $reminder = Reminder::factory()->create();

    Sanctum::actingAs($user);

    $this->putJson("/api/v1/reminders/{$reminder->uuid}", ['title' => 'Hijack'])
        ->assertForbidden();
});

it('returns 403 when deleting another users reminder', function (): void {
    $user = User::factory()->create();
    $reminder = Reminder::factory()->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/v1/reminders/{$reminder->uuid}")->assertForbidden();
});

it('returns 403 when completing another users reminder', function (): void {
    $user = User::factory()->create();
    $reminder = Reminder::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/complete")->assertForbidden();
});

it('returns 403 when snoozing another users reminder', function (): void {
    $user = User::factory()->create();
    $reminder = Reminder::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/v1/reminders/{$reminder->uuid}/snooze", ['snooze' => '10m'])
        ->assertForbidden();
});

it('returns 404 for an unknown reminder uuid', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/reminders/' . Str::uuid())->assertNotFound();
});
