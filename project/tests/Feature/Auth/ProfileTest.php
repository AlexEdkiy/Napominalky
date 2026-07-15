<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

/**
 * В контейнере нет расширения GD, поэтому UploadedFile::fake()->image()
 * недоступен: используем реальные байты минимальных изображений (1x1),
 * mime честно детектится fileinfo — правила image/mimes проверяются как в бою.
 */
const PROFILE_TEST_PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    .'AAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const PROFILE_TEST_JPEG_1PX = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMC'
    .'AgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8Q'
    .'EBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAA'
    .'AAAAAAD/2gAIAQEAAD8AKp//2Q==';

function profileTestUpload(string $base64, string $name, string $mime): UploadedFile
{
    $path = (string) tempnam(sys_get_temp_dir(), 'avatar-test-');
    file_put_contents($path, base64_decode($base64, true));

    return new UploadedFile($path, $name, $mime, null, true);
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/auth/me — обновление имени и email
// ---------------------------------------------------------------------------

it('updates the user name via PATCH /auth/me', function (): void {
    $user = User::factory()->create(['name' => 'Old Name', 'email' => 'keep@example.com']);
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/auth/me', ['name' => 'New Name', 'email' => 'keep@example.com'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.uuid', $user->uuid);

    expect($user->refresh()->name)->toBe('New Name');
});

it('updates the user email via PATCH /auth/me', function (): void {
    $user = User::factory()->create(['email' => 'old@example.com']);
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/auth/me', ['name' => $user->name, 'email' => 'new@example.com'])
        ->assertOk()
        ->assertJsonPath('data.email', 'new@example.com');

    $user->refresh();
    expect($user->email)->toBe('new@example.com')
        ->and($user->email_verified_at)->toBeNull();
});

it('accepts the current email of the user (unique ignores self)', function (): void {
    $user = User::factory()->create(['email' => 'same@example.com']);
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/auth/me', ['name' => 'Renamed', 'email' => 'same@example.com'])
        ->assertOk()
        ->assertJsonPath('data.email', 'same@example.com');

    $user->refresh();
    expect($user->email)->toBe('same@example.com')
        ->and($user->email_verified_at)->not->toBeNull();
});

it('rejects an email already taken by another user with 422', function (): void {
    User::factory()->create(['email' => 'taken@example.com']);
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson('/api/v1/auth/me', ['name' => 'Name', 'email' => 'taken@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('rejects an invalid email with 422', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson('/api/v1/auth/me', ['name' => 'Name', 'email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('rejects a missing email with 422', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson('/api/v1/auth/me', ['name' => 'Name'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('rejects an empty name with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/auth/me', ['name' => '', 'email' => $user->email])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('rejects a name longer than 255 characters with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/auth/me', ['name' => str_repeat('a', 256), 'email' => $user->email])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('rejects profile update without a token with 401', function (): void {
    $this->patchJson('/api/v1/auth/me', ['name' => 'X', 'email' => 'x@example.com'])
        ->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/me/avatar — загрузка аватара
// ---------------------------------------------------------------------------

it('uploads an avatar and returns it as a data URI', function (): void {
    Storage::fake('local');
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $file = profileTestUpload(PROFILE_TEST_PNG_1PX, 'avatar.png', 'image/png');

    $response = $this->postJson('/api/v1/auth/me/avatar', ['avatar' => $file])
        ->assertOk()
        ->assertJsonMissingPath('data.avatar_path');

    $avatar = $response->json('data.avatar');
    expect($avatar)->toBeString()
        ->and($avatar)->toStartWith('data:image/png;base64,')
        ->and(strlen($avatar))->toBeGreaterThan(strlen('data:image/png;base64,'));

    Storage::disk('local')->assertExists("avatars/{$user->uuid}.png");
    expect($user->refresh()->avatar_path)->toBe("avatars/{$user->uuid}.png");
});

it('replaces the previous avatar file on re-upload', function (): void {
    Storage::fake('local');
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/me/avatar', [
        'avatar' => profileTestUpload(PROFILE_TEST_PNG_1PX, 'avatar.png', 'image/png'),
    ])->assertOk();

    $this->postJson('/api/v1/auth/me/avatar', [
        'avatar' => profileTestUpload(PROFILE_TEST_JPEG_1PX, 'avatar.jpg', 'image/jpeg'),
    ])
        ->assertOk()
        ->assertJsonPath('data.avatar', fn (mixed $value): bool => is_string($value)
            && str_starts_with($value, 'data:image/jpeg;base64,'));

    Storage::disk('local')->assertMissing("avatars/{$user->uuid}.png");
    Storage::disk('local')->assertExists("avatars/{$user->uuid}.jpg");
    expect($user->refresh()->avatar_path)->toBe("avatars/{$user->uuid}.jpg");
});

it('returns the avatar data URI in GET /auth/me', function (): void {
    Storage::fake('local');
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.avatar', null);

    $this->postJson('/api/v1/auth/me/avatar', [
        'avatar' => profileTestUpload(PROFILE_TEST_PNG_1PX, 'avatar.png', 'image/png'),
    ])->assertOk();

    $this->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.avatar', fn (mixed $value): bool => is_string($value)
            && str_starts_with($value, 'data:image/png;base64,'))
        ->assertJsonMissingPath('data.avatar_path');
});

it('rejects a non-image avatar with 422', function (): void {
    Storage::fake('local');
    Sanctum::actingAs(User::factory()->create());

    $file = UploadedFile::fake()->create('notes.txt', 4, 'text/plain');

    $this->postJson('/api/v1/auth/me/avatar', ['avatar' => $file])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);
});

it('rejects an avatar larger than 512 KB with 422', function (): void {
    Storage::fake('local');
    Sanctum::actingAs(User::factory()->create());

    // Валидный PNG-заголовок + мусор до ~600 КБ: image/mimes проходят, max:512 — нет.
    $path = (string) tempnam(sys_get_temp_dir(), 'avatar-test-');
    file_put_contents($path, base64_decode(PROFILE_TEST_PNG_1PX, true).str_repeat('0', 600 * 1024));
    $file = new UploadedFile($path, 'big.png', 'image/png', null, true);

    $this->postJson('/api/v1/auth/me/avatar', ['avatar' => $file])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);
});

it('rejects avatar upload without a token with 401', function (): void {
    $this->postJson('/api/v1/auth/me/avatar')->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/auth/me/avatar — удаление аватара
// ---------------------------------------------------------------------------

it('deletes the avatar and returns null', function (): void {
    Storage::fake('local');
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/me/avatar', [
        'avatar' => profileTestUpload(PROFILE_TEST_PNG_1PX, 'avatar.png', 'image/png'),
    ])->assertOk();

    $this->deleteJson('/api/v1/auth/me/avatar')
        ->assertOk()
        ->assertJsonPath('data.avatar', null);

    Storage::disk('local')->assertMissing("avatars/{$user->uuid}.png");
    expect($user->refresh()->avatar_path)->toBeNull();
});

it('returns 200 with null avatar when deleting a missing avatar', function (): void {
    Storage::fake('local');
    Sanctum::actingAs(User::factory()->create());

    $this->deleteJson('/api/v1/auth/me/avatar')
        ->assertOk()
        ->assertJsonPath('data.avatar', null);
});

it('rejects avatar deletion without a token with 401', function (): void {
    $this->deleteJson('/api/v1/auth/me/avatar')->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Удаление аккаунта чистит файл аватара
// ---------------------------------------------------------------------------

it('removes the avatar file when the account is deleted', function (): void {
    Storage::fake('local');
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    Sanctum::actingAs($user);
    $this->postJson('/api/v1/auth/me/avatar', [
        'avatar' => profileTestUpload(PROFILE_TEST_PNG_1PX, 'avatar.png', 'image/png'),
    ])->assertOk();

    Storage::disk('local')->assertExists("avatars/{$user->uuid}.png");

    $this->withToken($token)
        ->deleteJson('/api/v1/account')
        ->assertNoContent();

    Storage::disk('local')->assertMissing("avatars/{$user->uuid}.png");
});
