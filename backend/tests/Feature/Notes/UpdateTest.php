<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('updates a note and returns 200', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create([
        'title' => 'Old title',
        'body' => 'Old body',
    ]);

    $this->putJson("/api/v1/notes/{$note->uuid}", [
        'title' => 'New title',
        'body' => 'New body',
    ])
        ->assertOk()
        ->assertJsonPath('data.title', 'New title')
        ->assertJsonPath('data.body', 'New body');

    expect($note->fresh()->title)->toBe('New title')
        ->and($note->fresh()->body)->toBe('New body');
});

it('supports partial update preserving untouched fields', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create([
        'title' => 'Keep me',
        'body' => 'Original body',
        'is_pinned' => true,
    ]);

    $this->putJson("/api/v1/notes/{$note->uuid}", [
        'body' => 'Only body changed',
    ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Keep me')
        ->assertJsonPath('data.body', 'Only body changed')
        ->assertJsonPath('data.is_pinned', true);

    expect($note->fresh()->title)->toBe('Keep me')
        ->and($note->fresh()->is_pinned)->toBeTrue();
});

it('returns 403 when updating another users note', function (): void {
    $user = User::factory()->create();
    $note = Note::factory()->create(); // another user

    Sanctum::actingAs($user);

    $this->putJson("/api/v1/notes/{$note->uuid}", ['title' => 'Hijack'])
        ->assertForbidden();
});

it('returns 404 for an unknown uuid', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->putJson('/api/v1/notes/' . Str::uuid(), ['title' => 'Ghost'])
        ->assertNotFound();
});

it('accepts both named web colors and mobile hex colors, rejects others (MBE-23)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $note = Note::factory()->for($user)->create();

    foreach (['teal', 'purple', '#ea899a', '#afdafc', null] as $color) {
        $this->putJson("/api/v1/notes/{$note->uuid}", ['color' => $color])
            ->assertOk()
            ->assertJsonPath('data.color', $color);
    }

    $this->putJson("/api/v1/notes/{$note->uuid}", ['color' => '#123456'])->assertUnprocessable();
    $this->postJson('/api/v1/notes', ['title' => 'x', 'color' => 'red'])->assertUnprocessable();
    $this->postJson('/api/v1/notes', ['title' => 'x', 'color' => '#91d177'])
        ->assertCreated()
        ->assertJsonPath('data.color', '#91d177');
});
