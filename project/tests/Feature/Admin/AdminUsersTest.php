<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\Sanctum;

// ---------------------------------------------------------------------------
// GET /api/v1/admin/users — index
// ---------------------------------------------------------------------------

it('returns 200 with paginated users for admin', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->count(3)->create();
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/admin/users');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => ['uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);
});

it('includes the admin user themselves in the index', function (): void {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/v1/admin/users');

    $response->assertOk();
    $uuids = collect($response->json('data'))->pluck('uuid');
    expect($uuids->contains($admin->uuid))->toBeTrue();
});

it('returns 403 for a regular user on admin index', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/admin/users')->assertForbidden();
});

it('returns 401 without token on admin index', function (): void {
    $this->getJson('/api/v1/admin/users')->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/users/{user} — show
// ---------------------------------------------------------------------------

it('returns 200 with user detail and counters for admin', function (): void {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();

    Note::factory()->for($target)->count(2)->create();
    Reminder::factory()->for($target)->count(3)->create();
    ShoppingList::factory()->for($target)->count(1)->create();

    Sanctum::actingAs($admin);

    $response = $this->getJson("/api/v1/admin/users/{$target->id}");

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'uuid', 'name', 'email', 'is_admin', 'sync_enabled', 'created_at',
                'notes_count', 'reminders_count', 'lists_count',
            ],
        ])
        ->assertJsonPath('data.uuid', $target->uuid)
        ->assertJsonPath('data.notes_count', 2)
        ->assertJsonPath('data.reminders_count', 3)
        ->assertJsonPath('data.lists_count', 1);
});

it('returns zero counters when user has no related data', function (): void {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();
    Sanctum::actingAs($admin);

    $response = $this->getJson("/api/v1/admin/users/{$target->id}");

    $response->assertOk()
        ->assertJsonPath('data.notes_count', 0)
        ->assertJsonPath('data.reminders_count', 0)
        ->assertJsonPath('data.lists_count', 0);
});

it('returns 403 for a regular user on admin show', function (): void {
    $user = User::factory()->create();
    $target = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson("/api/v1/admin/users/{$target->id}")->assertForbidden();
});

it('returns 401 without token on admin show', function (): void {
    $target = User::factory()->create();

    $this->getJson("/api/v1/admin/users/{$target->id}")->assertUnauthorized();
});

it('returns 404 for a non-existent user id for admin', function (): void {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson('/api/v1/admin/users/99999')->assertNotFound();
});

// ---------------------------------------------------------------------------
// Gate admin-access
// ---------------------------------------------------------------------------

it('allows admin-access gate for admin user', function (): void {
    $admin = User::factory()->admin()->create();

    expect(Gate::forUser($admin)->allows('admin-access'))->toBeTrue();
});

it('denies admin-access gate for regular user', function (): void {
    $user = User::factory()->create();

    expect(Gate::forUser($user)->allows('admin-access'))->toBeFalse();
});
