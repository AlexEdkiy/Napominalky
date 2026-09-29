<?php

declare(strict_types=1);

use App\Models\User;

it('logs in with valid credentials and returns a bearer token', function (): void {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'password123',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'token',
                'token_type',
                'user' => ['uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at'],
            ],
        ])
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.uuid', $user->uuid);

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
});

it('creates a device with a uuid on login', function (): void {
    $user = User::factory()->create([
        'email' => 'device@example.com',
        'password' => 'password123',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'device@example.com',
        'password' => 'password123',
        'device_name' => 'iPhone 15',
    ])->assertOk();

    $device = $user->devices()->first();

    expect($device)->not->toBeNull()
        ->and($device->name)->toBe('iPhone 15')
        ->and($device->uuid)->toBeString()->not->toBeEmpty();
});

it('rejects an incorrect password with 422', function (): void {
    User::factory()->create([
        'email' => 'wrongpass@example.com',
        'password' => 'password123',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'wrongpass@example.com',
        'password' => 'incorrect-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('rejects a non-existent email with 422', function (): void {
    $this->postJson('/api/v1/auth/login', [
        'email' => 'nobody@example.com',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('throttles login after 5 attempts and returns 429 on the 6th', function (): void {
    User::factory()->create([
        'email' => 'throttle@example.com',
        'password' => 'password123',
    ]);

    $payload = [
        'email' => 'throttle@example.com',
        'password' => 'incorrect-password',
    ];

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $this->postJson('/api/v1/auth/login', $payload)->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', $payload)->assertStatus(429);
});
