<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

// ---------------------------------------------------------------------------
// POST /api/v1/auth/password/forgot
// ---------------------------------------------------------------------------

it('forgot: returns 200 with generic message for existing email', function (): void {
    Notification::fake();

    User::factory()->create([
        'email'     => 'exist@example.com',
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/auth/password/forgot', [
        'email' => 'exist@example.com',
    ])
        ->assertOk()
        ->assertJson([
            'message' => 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.',
        ]);
});

it('forgot: returns same 200 with generic message for non-existing email', function (): void {
    $this->postJson('/api/v1/auth/password/forgot', [
        'email' => 'ghost@example.com',
    ])
        ->assertOk()
        ->assertJson([
            'message' => 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.',
        ]);
});

it('forgot: returns 422 when email is missing', function (): void {
    $this->postJson('/api/v1/auth/password/forgot', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('forgot: returns 422 when email is not a valid email address', function (): void {
    $this->postJson('/api/v1/auth/password/forgot', [
        'email' => 'not-an-email',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/password/reset
// ---------------------------------------------------------------------------

it('reset: returns 200 and changes the password with a valid token', function (): void {
    $user = User::factory()->create([
        'email'    => 'reset-valid@example.com',
        'password' => Hash::make('old-password-123'),
    ]);

    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/password/reset', [
        'email'                 => 'reset-valid@example.com',
        'token'                 => $token,
        'password'              => 'new-password-456',
        'password_confirmation' => 'new-password-456',
    ])
        ->assertOk()
        ->assertJson([
            'message' => 'Пароль обновлён. Войдите с новым паролем.',
        ]);

    $user->refresh();
    expect(Hash::check('new-password-456', $user->password))->toBeTrue();
});

it('reset: returns 422 on token field with invalid token', function (): void {
    User::factory()->create([
        'email' => 'reset-bad-token@example.com',
    ]);

    $this->postJson('/api/v1/auth/password/reset', [
        'email'                 => 'reset-bad-token@example.com',
        'token'                 => 'invalid-token-xyz',
        'password'              => 'new-password-789',
        'password_confirmation' => 'new-password-789',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['token']);
});

it('reset: returns 422 when email field is missing', function (): void {
    $this->postJson('/api/v1/auth/password/reset', [
        'token'                 => 'some-token',
        'password'              => 'new-password-789',
        'password_confirmation' => 'new-password-789',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('reset: returns 422 when token field is missing', function (): void {
    $this->postJson('/api/v1/auth/password/reset', [
        'email'                 => 'user@example.com',
        'password'              => 'new-password-789',
        'password_confirmation' => 'new-password-789',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['token']);
});

it('reset: returns 422 when password is too short', function (): void {
    $this->postJson('/api/v1/auth/password/reset', [
        'email'                 => 'user@example.com',
        'token'                 => 'some-token',
        'password'              => 'short',
        'password_confirmation' => 'short',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('reset: returns 422 when password_confirmation does not match', function (): void {
    $this->postJson('/api/v1/auth/password/reset', [
        'email'                 => 'user@example.com',
        'token'                 => 'some-token',
        'password'              => 'new-password-789',
        'password_confirmation' => 'different-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});
