<?php

declare(strict_types=1);

use App\Actions\Auth\SendVerificationEmailAction;
use App\Actions\User\IssueTokenAction;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

function pendingAccount(array $attributes = []): User
{
    return User::factory()->create(array_merge(['email_verification_required' => true, 'email_verified_at' => null, 'password' => 'password123'], $attributes));
}
function verificationLink(User $user, int $minutes = 60): string
{
    return URL::temporarySignedRoute('api.v1.auth.email.verify', now()->addMinutes($minutes), ['uuid' => $user->uuid, 'hash' => sha1($user->email)], absolute: false);
}

beforeEach(function (): void {
    Notification::fake();
});

it('requires verification before login, token issuance and protected API access', function (): void {
    $user = pendingAccount();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123'])
        ->assertForbidden()->assertJsonPath('code', 'email_verification_required');
    expect($user->tokens()->count())->toBe(0);
    expect(fn () => app(IssueTokenAction::class)($user, 'test'))->toThrow(HttpResponseException::class);
    $token = $user->createToken('legacy')->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/sync/changes')->assertForbidden();
});

it('keeps login working for old accounts without forging verification', function (): void {
    $user = User::factory()->create(['email_verified_at' => null, 'password' => 'password123']);
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123'])->assertOk()->assertJsonStructure(['data' => ['token']]);
    expect($user->fresh()->email_verified_at)->toBeNull();
});

it('confirms without a session and permits subsequent password login', function (): void {
    $user = pendingAccount();
    $link = verificationLink($user);
    $this->postJson($link)->assertOk();
    expect($user->fresh()->email_verified_at)->not->toBeNull();
    expect($user->tokens()->count())->toBe(0);
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password123'])->assertOk();
});

it('does not activate from GET and handles repeated confirmation idempotently', function (): void {
    $user = pendingAccount();
    $link = verificationLink($user);
    $this->getJson($link)->assertStatus(405);
    expect($user->fresh()->email_verified_at)->toBeNull();
    $this->postJson($link)->assertOk();
    $first = $user->fresh()->email_verified_at->toISOString();
    $this->travel(1)->minutes();
    $this->postJson($link)->assertOk();
    expect($user->fresh()->email_verified_at->toISOString())->toBe($first);
});

it('rejects expired, modified, wrong-email and disabled-account links', function (): void {
    $user = pendingAccount();
    $this->postJson(verificationLink($user, -1))->assertForbidden()->assertJsonPath('message', 'Ссылка недействительна или срок её действия истёк. Запросите новое письмо на экране входа.');
    $link = verificationLink($user);
    $this->postJson(str_replace(sha1($user->email), str_repeat('a', 40), $link))->assertForbidden();
    $other = pendingAccount();
    $this->postJson(str_replace($user->uuid, $other->uuid, $link))->assertForbidden();
    $user->update(['email' => 'changed@example.com']);
    $this->postJson($link)->assertForbidden();
    $user->update(['is_active' => false]);
    $this->postJson(verificationLink($user))->assertForbidden();
    expect($user->fresh()->email_verified_at)->toBeNull();
});

it('resends only for valid pending credentials and limits repeat delivery', function (): void {
    $user = pendingAccount();
    $payload = ['email' => $user->email, 'password' => 'password123'];
    $this->postJson('/api/v1/auth/email/resend', ['email' => $user->email, 'password' => 'wrong'])->assertOk();
    Notification::assertNothingSent();
    $this->postJson('/api/v1/auth/email/resend', $payload)->assertOk();
    Notification::assertSentToTimes($user, VerifyAccountNotification::class, 1);
    $this->postJson('/api/v1/auth/email/resend', $payload)->assertUnprocessable();
    $this->travel(61)->seconds();
    $this->postJson('/api/v1/auth/email/resend', $payload)->assertOk();
    Notification::assertSentToTimes($user, VerifyAccountNotification::class, 2);
});

it('does not resend for an unknown, verified or disabled account', function (): void {
    $this->postJson('/api/v1/auth/email/resend', ['email' => 'absent@example.com', 'password' => 'password123'])->assertOk();
    $user = pendingAccount(['email_verified_at' => now()]);
    $this->postJson('/api/v1/auth/email/resend', ['email' => $user->email, 'password' => 'password123'])->assertOk();
    $user = pendingAccount(['is_active' => false]);
    $this->postJson('/api/v1/auth/email/resend', ['email' => $user->email, 'password' => 'password123'])->assertOk();
    Notification::assertNothingSent();
});

it('persists pending registration on mail failure and allows retry', function (): void {
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('transport unavailable'));
    $payload = ['name' => 'Test', 'email' => 'retry@example.com', 'password' => 'password123', 'password_confirmation' => 'password123'];
    $this->postJson('/api/v1/auth/register', $payload)->assertCreated()->assertJsonPath('data.email_sent', false);
    $user = User::firstWhere('email', 'retry@example.com');
    expect($user->needsEmailVerification())->toBeTrue();
    Notification::fake();
    $this->postJson('/api/v1/auth/email/resend', $payload)->assertOk();
    Notification::assertSentTo($user, VerifyAccountNotification::class);
});

it('does not claim a log transport delivers email outside tests', function (string $environment): void {
    $user = pendingAccount();
    app()->instance('env', $environment);
    config(['mail.default' => 'log']);
    expect(app(SendVerificationEmailAction::class)($user))->toBeFalse();
    Notification::assertNothingSent();
})->with(['production', 'local']);

it('renders Russian mail and a public signed link that works behind a path prefix', function (): void {
    config(['app.frontend_url' => 'https://example.test/napominalki', 'app.url' => 'https://localhost:8443']);
    $user = pendingAccount();
    $mail = (new VerifyAccountNotification)->toMail($user);
    $html = view($mail->view, $mail->viewData)->render();
    expect($html)->toContain('Подтвердите почту', '60 минут')->not->toContain('localhost', 'password123');
    $publicUrl = $mail->viewData['url'];
    expect($publicUrl)->toStartWith('https://example.test/napominalki/verify-email?');
    parse_str(parse_url($publicUrl, PHP_URL_QUERY), $query);
    // The reverse proxy strips /napominalki before Laravel sees the request.
    $this->postJson($query['verification'])->assertOk();
});

it('returns Russian registration password errors', function (string $password, string $confirmation, string $message): void {
    $this->postJson('/api/v1/auth/register', ['name' => 'Test', 'email' => 'test@example.com', 'password' => $password, 'password_confirmation' => $confirmation])
        ->assertUnprocessable()->assertJsonPath('errors.password.0', $message);
})->with([
    ['', '', 'Введите пароль.'],
    ['short', 'short', 'Пароль должен содержать не менее 8 символов.'],
    ['password123', 'different', 'Пароли не совпадают. Повторите пароль.'],
]);
