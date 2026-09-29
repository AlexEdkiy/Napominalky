<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('toggles is_archived on and off', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create(['is_archived' => false]);

    $this->postJson("/api/v1/notes/{$note->uuid}/archive", ['is_archived' => true])
        ->assertOk()
        ->assertJsonPath('data.is_archived', true);

    expect($note->fresh()->is_archived)->toBeTrue();

    $this->postJson("/api/v1/notes/{$note->uuid}/archive", ['is_archived' => false])
        ->assertOk()
        ->assertJsonPath('data.is_archived', false);

    expect($note->fresh()->is_archived)->toBeFalse();
});

it('filters the index by archived state', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $active = Note::factory()->for($user)->create(['title' => 'Active', 'is_archived' => false]);
    $archived = Note::factory()->for($user)->archived()->create(['title' => 'Archived']);

    $this->getJson('/api/v1/notes?filter[archived]=0')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $active->uuid);

    $this->getJson('/api/v1/notes?filter[archived]=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $archived->uuid);
});

it('returns 403 when archiving another users note', function (): void {
    $user = User::factory()->create();
    $note = Note::factory()->create(); // another user

    Sanctum::actingAs($user);

    $this->postJson("/api/v1/notes/{$note->uuid}/archive", ['is_archived' => true])
        ->assertForbidden();
});

it('returns active/archived counts in meta regardless of the archived filter (MBE-23)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->count(3)->create(['is_archived' => false]);
    Note::factory()->for($user)->archived()->count(2)->create();
    Note::factory()->archived()->create(); // чужая — не считается

    $this->getJson('/api/v1/notes?filter[archived]=0')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.counts.active', 3)
        ->assertJsonPath('meta.counts.archived', 2)
        ->assertJsonPath('meta.total', 3);

    $this->getJson('/api/v1/notes?filter[archived]=1')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.counts.active', 3)
        ->assertJsonPath('meta.counts.archived', 2);
});

it('scopes the counts by the search term', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->create(['title' => 'Отпуск в горах', 'is_archived' => false]);
    Note::factory()->for($user)->archived()->create(['title' => 'Отпуск на море']);
    Note::factory()->for($user)->create(['title' => 'Список покупок', 'is_archived' => false]);

    $this->getJson('/api/v1/notes?search=Отпуск&filter[archived]=0')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.counts.active', 1)
        ->assertJsonPath('meta.counts.archived', 1);
});
