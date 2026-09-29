<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('creates a note and returns 201 with the NoteResource structure', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/notes', [
        'title' => 'Buy groceries',
        'body' => 'Milk and eggs',
        'is_pinned' => true,
    ]);

    $response->assertCreated()
        ->assertJsonStructure([
            'data' => ['uuid', 'title', 'body', 'is_pinned', 'is_archived', 'created_at', 'updated_at'],
        ])
        ->assertJsonPath('data.title', 'Buy groceries')
        ->assertJsonPath('data.body', 'Milk and eggs')
        ->assertJsonPath('data.is_pinned', true)
        ->assertJsonPath('data.is_archived', false)
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.user_id');

    expect($user->notes()->count())->toBe(1);
});

it('persists the client-provided uuid', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/notes', [
        'uuid' => $uuid,
        'title' => 'Note with client uuid',
    ])
        ->assertCreated()
        ->assertJsonPath('data.uuid', $uuid);

    expect(Note::where('uuid', $uuid)->where('user_id', $user->id)->exists())->toBeTrue();
});

it('rejects a duplicate uuid with 422 (idempotency guard)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $existing = Note::factory()->for($user)->create();

    $this->postJson('/api/v1/notes', [
        'uuid' => $existing->uuid,
        'title' => 'Conflicting note',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid']);
});

it('rejects a missing title with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/notes', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title']);
});

it('rejects an unauthenticated create with 401', function (): void {
    $this->postJson('/api/v1/notes', ['title' => 'No token'])
        ->assertUnauthorized();
});
