<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('soft deletes a note and returns 204', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create();

    $this->deleteJson("/api/v1/notes/{$note->uuid}")
        ->assertNoContent();

    expect(Note::find($note->id))->toBeNull()
        ->and(Note::withTrashed()->find($note->id)->deleted_at)->not->toBeNull();
});

it('hides a soft deleted note from the index', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create();

    $this->deleteJson("/api/v1/notes/{$note->uuid}")->assertNoContent();

    $this->getJson('/api/v1/notes')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('returns 403 when deleting another users note', function (): void {
    $user = User::factory()->create();
    $note = Note::factory()->create(); // another user

    Sanctum::actingAs($user);

    $this->deleteJson("/api/v1/notes/{$note->uuid}")
        ->assertForbidden();

    expect($note->fresh())->not->toBeNull()
        ->and($note->fresh()->deleted_at)->toBeNull();
});
