<?php

declare(strict_types=1);

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('enables sync and returns 200 with updated user', function (): void {
    $user = User::factory()->create(['sync_enabled' => false]);
    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/settings/sync', ['sync_enabled' => true]);

    $response->assertOk()
        ->assertJsonPath('data.sync_enabled', true);

    expect($user->fresh()->sync_enabled)->toBeTrue();
});

it('disables sync and returns 200 with updated user', function (): void {
    $user = User::factory()->syncEnabled()->create();
    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/settings/sync', ['sync_enabled' => false]);

    $response->assertOk()
        ->assertJsonPath('data.sync_enabled', false);

    expect($user->fresh()->sync_enabled)->toBeFalse();
});

it('returns full UserResource structure on success', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/settings/sync', ['sync_enabled' => true])
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at'],
        ]);
});

it('returns 422 when sync_enabled is missing', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/settings/sync', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['sync_enabled']);
});

it('returns 422 when sync_enabled is not a boolean', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/settings/sync', ['sync_enabled' => 'yes'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['sync_enabled']);
});

it('returns 401 when unauthenticated', function (): void {
    $this->patchJson('/api/v1/settings/sync', ['sync_enabled' => true])
        ->assertUnauthorized();
});
