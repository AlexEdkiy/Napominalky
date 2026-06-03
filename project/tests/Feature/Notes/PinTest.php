<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('toggles is_pinned on and off', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create(['is_pinned' => false]);

    $this->postJson("/api/v1/notes/{$note->uuid}/pin", ['is_pinned' => true])
        ->assertOk()
        ->assertJsonPath('data.is_pinned', true);

    expect($note->fresh()->is_pinned)->toBeTrue();

    $this->postJson("/api/v1/notes/{$note->uuid}/pin", ['is_pinned' => false])
        ->assertOk()
        ->assertJsonPath('data.is_pinned', false);

    expect($note->fresh()->is_pinned)->toBeFalse();
});

it('orders pinned notes first in the index', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $unpinned = Note::factory()->for($user)->create(['title' => 'Unpinned', 'is_pinned' => false]);
    $pinned = Note::factory()->for($user)->create(['title' => 'Pinned', 'is_pinned' => true]);

    $response = $this->getJson('/api/v1/notes')->assertOk();

    expect($response->json('data.0.uuid'))->toBe($pinned->uuid)
        ->and($response->json('data.1.uuid'))->toBe($unpinned->uuid);
});

it('returns 403 when pinning another users note', function (): void {
    $user = User::factory()->create();
    $note = Note::factory()->create(); // another user

    Sanctum::actingAs($user);

    $this->postJson("/api/v1/notes/{$note->uuid}/pin", ['is_pinned' => true])
        ->assertForbidden();
});
