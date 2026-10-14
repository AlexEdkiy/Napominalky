<?php

declare(strict_types=1);

use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    Notification::fake();
});

it('registers an unverified account without issuing a session', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Alice Example', 'email' => 'alice@example.com',
        'password' => 'password123', 'password_confirmation' => 'password123',
    ])->assertCreated()->assertJsonPath('data.verification_required', true)
        ->assertJsonPath('data.email_sent', true)->assertJsonPath('data.email', 'alice@example.com');
    expect($response->json('data'))->not->toHaveKeys(['token', 'user', 'password', 'id']);
    $user = User::firstWhere('email', 'alice@example.com');
    expect($user->needsEmailVerification())->toBeTrue();
    expect($user->tokens()->count())->toBe(0);
    Notification::assertSentTo($user, VerifyAccountNotification::class);
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
