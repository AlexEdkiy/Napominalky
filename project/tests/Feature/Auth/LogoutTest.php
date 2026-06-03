<?php

declare(strict_types=1);

use App\Models\User;

it('logs out an authenticated user with 204', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/auth/logout')
        ->assertNoContent();
});

it('revokes the current token on logout', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/auth/logout')
        ->assertNoContent();

    $this->assertSame(0, $user->tokens()->count());
    $this->assertDatabaseEmpty('personal_access_tokens');
});

it('rejects a token that was revoked by logout', function (): void {
    // Issue and immediately revoke a token, then use it in a single fresh
    // request. (A revoked token reused within the same test request reuses the
    // already-resolved user, so revocation is exercised in its own test.)
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;
    $user->tokens()->delete();

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

it('rejects logout without a token with 401', function (): void {
    $this->deleteJson('/api/v1/auth/logout')->assertUnauthorized();
});
