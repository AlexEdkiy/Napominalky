<?php

declare(strict_types=1);

use App\Models\Device;
use App\Models\User;

it('deletes the account with 204', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/account')
        ->assertNoContent();
});

it('soft-deletes the user', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/account')
        ->assertNoContent();

    $this->assertSoftDeleted('users', ['id' => $user->id]);
});

it('cascades deletion to the user devices', function (): void {
    $user = User::factory()->create();
    Device::factory()->count(3)->for($user)->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/account')
        ->assertNoContent();

    expect(Device::where('user_id', $user->id)->count())->toBe(0);
});

it('revokes the user tokens on account deletion', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $this->withToken($token)
        ->deleteJson('/api/v1/account')
        ->assertNoContent();

    $this->assertSame(0, $user->tokens()->count());
});

it('rejects account deletion without a token with 401', function (): void {
    $this->deleteJson('/api/v1/account')->assertUnauthorized();
});
