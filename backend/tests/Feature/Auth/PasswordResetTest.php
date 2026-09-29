<?php

declare(strict_types=1);

use App\Actions\Auth\ResetUserPasswordAction;
use App\Actions\Auth\SendPasswordResetLinkAction;
use App\Data\ResetPasswordData;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Event;

// ---------------------------------------------------------------------------
// SendPasswordResetLinkAction
// ---------------------------------------------------------------------------

it('sends a reset link and creates a token record for an existing user', function (): void {
    Notification::fake();

    $user = User::factory()->create([
        'email'     => 'alice@example.com',
        'is_active' => true,
    ]);

    $action = app(SendPasswordResetLinkAction::class);
    $status = $action('alice@example.com');

    expect($status)->toBe(Password::RESET_LINK_SENT);

    $this->assertDatabaseHas('password_reset_tokens', [
        'email' => 'alice@example.com',
    ]);

    Notification::assertSentTo($user, ResetPasswordNotification::class);
});

it('returns INVALID_USER status for an unknown email without revealing it externally', function (): void {
    $action = app(SendPasswordResetLinkAction::class);
    $status = $action('no-such-user@example.com');

    expect($status)->toBe(Password::INVALID_USER);
});

it('returns RESET_THROTTLED when a second link is requested too soon', function (): void {
    Notification::fake();

    User::factory()->create(['email' => 'throttle@example.com', 'is_active' => true]);

    $action = app(SendPasswordResetLinkAction::class);

    $action('throttle@example.com');
    $status = $action('throttle@example.com');

    expect($status)->toBe(Password::RESET_THROTTLED);
});

// ---------------------------------------------------------------------------
// ResetUserPasswordAction
// ---------------------------------------------------------------------------

it('resets the password and the new password passes Hash::check', function (): void {
    Event::fake([PasswordReset::class]);

    $user = User::factory()->create([
        'email'    => 'bob@example.com',
        'password' => Hash::make('old-password'),
    ]);

    $token = Password::createToken($user);

    $action = app(ResetUserPasswordAction::class);
    $data   = new ResetPasswordData(
        email:    'bob@example.com',
        token:    $token,
        password: 'new-password-123',
    );

    $status = $action($data);

    expect($status)->toBe(Password::PASSWORD_RESET);

    $user->refresh();
    expect(Hash::check('new-password-123', $user->password))->toBeTrue();

    Event::assertDispatched(PasswordReset::class);
});

it('returns INVALID_TOKEN for an expired or wrong token', function (): void {
    User::factory()->create([
        'email' => 'carol@example.com',
    ]);

    $action = app(ResetUserPasswordAction::class);
    $data   = new ResetPasswordData(
        email:    'carol@example.com',
        token:    'invalid-token-xyz',
        password: 'new-password-123',
    );

    $status = $action($data);

    expect($status)->toBe(Password::INVALID_TOKEN);
});

it('revokes all sanctum tokens after a successful password reset', function (): void {
    Event::fake([PasswordReset::class]);

    $user  = User::factory()->create(['email' => 'dave@example.com']);
    $user->createToken('mobile');
    $user->createToken('web');

    $token  = Password::createToken($user);
    $action = app(ResetUserPasswordAction::class);
    $data   = new ResetPasswordData(
        email:    'dave@example.com',
        token:    $token,
        password: 'brand-new-password',
    );

    $action($data);

    expect($user->tokens()->count())->toBe(0);
});

it('does NOT change the password when the token is invalid', function (): void {
    $originalHash = Hash::make('unchanged');
    $user = User::factory()->create([
        'email'    => 'eve@example.com',
        'password' => $originalHash,
    ]);

    $action = app(ResetUserPasswordAction::class);
    $data   = new ResetPasswordData(
        email:    'eve@example.com',
        token:    'bad-token',
        password: 'hacked-password',
    );

    $action($data);

    $user->refresh();
    expect($user->password)->toBe($originalHash);
});

// ---------------------------------------------------------------------------
// ResetPasswordNotification — URL строится корректно
// ---------------------------------------------------------------------------

it('builds the reset URL from app.frontend_url config', function (): void {
    config(['app.frontend_url' => 'https://example.com/app']);

    $notification = new ResetPasswordNotification('raw-token-abc');
    $user         = User::factory()->make(['email' => 'frank@example.com']);

    $mail = $notification->toMail($user);

    $actionUrl = collect($mail->actionUrl ?? [])->first() ?? $mail->actionUrl;

    expect($mail->actionUrl)
        ->toContain('https://example.com/app/reset-password')
        ->toContain('token=raw-token-abc')
        ->toContain('email=frank%40example.com');
});
