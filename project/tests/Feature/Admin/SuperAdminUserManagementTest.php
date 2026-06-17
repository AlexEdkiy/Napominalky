<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a superadmin user (is_super_admin=true implies is_admin=true).
 *
 * @param  array<string, mixed>  $overrides
 */
function makeSuperAdmin(array $overrides = []): User
{
    return User::factory()->create(array_merge([
        'is_admin'       => true,
        'is_super_admin' => true,
        'is_active'      => true,
    ], $overrides));
}

/**
 * Creates a plain admin (is_admin=true, is_super_admin=false).
 *
 * @param  array<string, mixed>  $overrides
 */
function makeAdmin(array $overrides = []): User
{
    return User::factory()->admin()->create(array_merge(['is_active' => true], $overrides));
}

// ---------------------------------------------------------------------------
// AUTHORIZATION: guest / regular user / admin (not super) → read-only gates
// ---------------------------------------------------------------------------

it('returns 401 for guest on GET /admin/users', function (): void {
    $this->getJson('/api/v1/admin/users')->assertUnauthorized();
});

it('returns 403 for regular user on GET /admin/users', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/v1/admin/users')->assertForbidden();
});

it('returns 403 for regular user on PATCH status', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", ['is_active' => false])
        ->assertForbidden();
});

it('returns 403 for regular user on PATCH password', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'newpassword',
        'password_confirmation' => 'newpassword',
    ])->assertForbidden();
});

it('returns 403 for regular user on PATCH roles', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ])->assertForbidden();
});

it('returns 403 for regular user on DELETE user', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->deleteJson("/api/v1/admin/users/{$target->uuid}")->assertForbidden();
});

it('allows admin (not super) to GET /admin/users', function (): void {
    Sanctum::actingAs(makeAdmin());

    $this->getJson('/api/v1/admin/users')->assertOk();
});

it('returns 403 for admin (not super) on PATCH status', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(makeAdmin());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", ['is_active' => false])
        ->assertForbidden();
});

it('returns 403 for admin (not super) on PATCH password', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(makeAdmin());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'newpassword',
        'password_confirmation' => 'newpassword',
    ])->assertForbidden();
});

it('returns 403 for admin (not super) on PATCH roles', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(makeAdmin());

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ])->assertForbidden();
});

it('returns 403 for admin (not super) on DELETE user', function (): void {
    $target = User::factory()->create();
    Sanctum::actingAs(makeAdmin());

    $this->deleteJson("/api/v1/admin/users/{$target->uuid}")->assertForbidden();
});

// ---------------------------------------------------------------------------
// PATCH /status — superadmin sets user active/inactive
// ---------------------------------------------------------------------------

it('superadmin deactivates a user and gets 200 with is_active=false', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create(['is_active' => true]);
    Sanctum::actingAs($superAdmin);

    $response = $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", [
        'is_active' => false,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($target->fresh()->is_active)->toBeFalse();
});

it('deactivating a user revokes their tokens', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create(['is_active' => true]);
    $target->createToken('test-token');

    expect($target->tokens()->count())->toBe(1);

    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", [
        'is_active' => false,
    ])->assertOk();

    expect($target->tokens()->count())->toBe(0);
});

it('blocked user cannot login and gets 403', function (): void {
    $target = User::factory()->create([
        'email'     => 'blocked@example.com',
        'password'  => 'secret1234',
        'is_active' => false,
    ]);

    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", [
        'is_active' => false,
    ])->assertOk();

    $this->postJson('/api/v1/auth/login', [
        'email'    => 'blocked@example.com',
        'password' => 'secret1234',
    ])->assertForbidden();
});

it('superadmin activates a previously blocked user and they can login again', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create([
        'email'     => 'reactivate@example.com',
        'password'  => 'secret1234',
        'is_active' => false,
    ]);

    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", [
        'is_active' => true,
    ])->assertOk()->assertJsonPath('data.is_active', true);

    $this->postJson('/api/v1/auth/login', [
        'email'    => 'reactivate@example.com',
        'password' => 'secret1234',
    ])->assertOk();
});

it('returns 422 when is_active is missing in status patch', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/status", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_active']);
});

// ---------------------------------------------------------------------------
// PATCH /password — superadmin changes user password
// ---------------------------------------------------------------------------

it('superadmin changes user password and gets 204', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create(['password' => 'oldpassword']);
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'newpassword8',
        'password_confirmation' => 'newpassword8',
    ])->assertNoContent();
});

it('old password no longer works after change', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create([
        'email'    => 'passchange@example.com',
        'password' => 'oldpassword',
    ]);

    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'newpassword8',
        'password_confirmation' => 'newpassword8',
    ])->assertNoContent();

    $target->refresh();
    expect(Hash::check('oldpassword', $target->password))->toBeFalse();
    expect(Hash::check('newpassword8', $target->password))->toBeTrue();
});

it('password change revokes all user tokens', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    $target->createToken('session-token');

    expect($target->tokens()->count())->toBe(1);

    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'newpassword8',
        'password_confirmation' => 'newpassword8',
    ])->assertNoContent();

    expect($target->tokens()->count())->toBe(0);
});

it('returns 422 when password is shorter than 8 chars', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('returns 422 when password_confirmation does not match', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/password", [
        'password'              => 'validpassword8',
        'password_confirmation' => 'differentpass8',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

// ---------------------------------------------------------------------------
// PATCH /roles — superadmin manages roles
// ---------------------------------------------------------------------------

it('superadmin grants is_admin to a regular user', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create(['is_admin' => false, 'is_super_admin' => false]);
    Sanctum::actingAs($superAdmin);

    $response = $this->patchJson("/api/v1/admin/users/{$target->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.is_admin', true)
        ->assertJsonPath('data.is_super_admin', false);

    expect($target->fresh()->is_admin)->toBeTrue();
});

it('setting is_super_admin=true forces is_admin=true even when is_admin=false sent', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create(['is_admin' => false, 'is_super_admin' => false]);
    Sanctum::actingAs($superAdmin);

    $response = $this->patchJson("/api/v1/admin/users/{$target->uuid}/roles", [
        'is_admin'       => false,
        'is_super_admin' => true,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.is_admin', true)
        ->assertJsonPath('data.is_super_admin', true);

    $target->refresh();
    expect($target->is_admin)->toBeTrue();
    expect($target->is_super_admin)->toBeTrue();
});

it('returns 422 when roles payload is missing required fields', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$target->uuid}/roles", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_admin', 'is_super_admin']);
});

// ---------------------------------------------------------------------------
// DELETE /user — superadmin soft-deletes a user
// ---------------------------------------------------------------------------

it('superadmin soft-deletes a regular user and gets 204', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    Sanctum::actingAs($superAdmin);

    $this->deleteJson("/api/v1/admin/users/{$target->uuid}")->assertNoContent();

    $this->assertSoftDeleted('users', ['id' => $target->id]);
});

it('deletion revokes all tokens of the deleted user', function (): void {
    $superAdmin = makeSuperAdmin();
    $target     = User::factory()->create();
    $target->createToken('app-token');

    expect($target->tokens()->count())->toBe(1);

    Sanctum::actingAs($superAdmin);

    $this->deleteJson("/api/v1/admin/users/{$target->uuid}")->assertNoContent();

    expect($target->tokens()->count())->toBe(0);
});

// ---------------------------------------------------------------------------
// GUARD: superadmin cannot operate on themselves
// ---------------------------------------------------------------------------

it('superadmin cannot deactivate themselves', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$superAdmin->uuid}/status", [
        'is_active' => false,
    ])->assertForbidden();
});

it('superadmin cannot delete themselves', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->deleteJson("/api/v1/admin/users/{$superAdmin->uuid}")->assertForbidden();
});

it('superadmin cannot remove their own superadmin role', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$superAdmin->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ])->assertForbidden();
});

// ---------------------------------------------------------------------------
// GUARD: last active superadmin protection
// ---------------------------------------------------------------------------

it('cannot deactivate the last active superadmin', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$superAdmin->uuid}/status", [
        'is_active' => false,
    ])->assertForbidden();
});

it('cannot delete the last active superadmin', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->deleteJson("/api/v1/admin/users/{$superAdmin->uuid}")->assertForbidden();
});

it('cannot remove superadmin role from the last active superadmin', function (): void {
    $superAdmin = makeSuperAdmin();
    Sanctum::actingAs($superAdmin);

    $this->patchJson("/api/v1/admin/users/{$superAdmin->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ])->assertForbidden();
});

it('can deactivate a superadmin when another active superadmin exists', function (): void {
    $actor  = makeSuperAdmin();
    $second = makeSuperAdmin();
    Sanctum::actingAs($actor);

    $this->patchJson("/api/v1/admin/users/{$second->uuid}/status", [
        'is_active' => false,
    ])->assertOk()->assertJsonPath('data.is_active', false);
});

it('can delete a superadmin when another active superadmin exists', function (): void {
    $actor  = makeSuperAdmin();
    $second = makeSuperAdmin();
    Sanctum::actingAs($actor);

    $this->deleteJson("/api/v1/admin/users/{$second->uuid}")->assertNoContent();

    $this->assertSoftDeleted('users', ['id' => $second->id]);
});

it('can remove superadmin role when another active superadmin exists', function (): void {
    $actor  = makeSuperAdmin();
    $second = makeSuperAdmin();
    Sanctum::actingAs($actor);

    $this->patchJson("/api/v1/admin/users/{$second->uuid}/roles", [
        'is_admin'       => true,
        'is_super_admin' => false,
    ])->assertOk()
        ->assertJsonPath('data.is_super_admin', false);
});
