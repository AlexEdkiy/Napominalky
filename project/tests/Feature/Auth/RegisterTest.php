<?php

declare(strict_types=1);

use App\Models\User;

it('registers a user and returns a bearer token', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Alice Example',
        'email' => 'alice@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonStructure([
            'data' => [
                'token',
                'token_type',
                'user' => ['uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at'],
            ],
        ])
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.email', 'alice@example.com');

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();

    $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
});

it('never leaks the password or numeric id in the user payload', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Bob Example',
        'email' => 'bob@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = $response->json('data.user');

    expect($user)->not->toHaveKeys(['password', 'id']);
});

it('rejects a duplicate email with 422', function (): void {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Carol Example',
        'email' => 'taken@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('rejects a password shorter than 8 characters with 422', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Dan Example',
        'email' => 'dan@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('rejects a missing password confirmation with 422', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Eve Example',
        'email' => 'eve@example.com',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('rejects an invalid email format with 422', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Frank Example',
        'email' => 'not-an-email',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});
