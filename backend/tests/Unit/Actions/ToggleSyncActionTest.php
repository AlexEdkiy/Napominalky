<?php

declare(strict_types=1);

use App\Actions\User\ToggleSyncAction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

it('enables sync when called with true', function (): void {
    $user = User::factory()->create(['sync_enabled' => false]);
    $action = new ToggleSyncAction();

    $result = $action($user, true);

    expect($result->sync_enabled)->toBeTrue()
        ->and($user->fresh()->sync_enabled)->toBeTrue();
});

it('disables sync when called with false', function (): void {
    $user = User::factory()->syncEnabled()->create();
    $action = new ToggleSyncAction();

    $result = $action($user, false);

    expect($result->sync_enabled)->toBeFalse()
        ->and($user->fresh()->sync_enabled)->toBeFalse();
});

it('returns the updated user model', function (): void {
    $user = User::factory()->create(['sync_enabled' => false]);
    $action = new ToggleSyncAction();

    $result = $action($user, true);

    expect($result)->toBeInstanceOf(User::class)
        ->and($result->id)->toBe($user->id);
});

it('persists the change to the database', function (): void {
    $user = User::factory()->create(['sync_enabled' => false]);
    $action = new ToggleSyncAction();

    $action($user, true);

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'sync_enabled' => true,
    ]);
});
