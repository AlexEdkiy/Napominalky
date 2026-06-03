<?php

declare(strict_types=1);

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns the authenticated user as a UserResource', function (): void {
    $user = User::factory()->create([
        'email' => 'me@example.com',
        'name' => 'Me Example',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at'],
        ])
        ->assertJsonPath('data.uuid', $user->uuid)
        ->assertJsonPath('data.email', 'me@example.com')
        ->assertJsonMissingPath('data.password')
        ->assertJsonMissingPath('data.id');
});

it('rejects the me endpoint without a token with 401', function (): void {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
});
