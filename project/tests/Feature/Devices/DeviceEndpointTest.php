<?php

declare(strict_types=1);

use App\Models\Device;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns 401 when updating without a token', function (): void {
    $device = Device::factory()->create();

    $this->putJson("/api/v1/devices/{$device->uuid}", ['name' => 'X'])
        ->assertUnauthorized();
});

it('updates the name and revision of the users own device', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $device = Device::factory()->for($user)->create([
        'name' => 'Old',
        'last_synced_revision' => 1,
    ]);

    $this->putJson("/api/v1/devices/{$device->uuid}", [
        'name' => 'New Phone',
        'last_synced_revision' => 42,
    ])
        ->assertOk()
        ->assertJsonPath('data.uuid', $device->uuid)
        ->assertJsonPath('data.name', 'New Phone')
        ->assertJsonPath('data.last_synced_revision', 42);

    $device->refresh();
    expect($device->name)->toBe('New Phone')
        ->and($device->last_synced_revision)->toBe(42);
});

it('returns 404 when updating another users device', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Sanctum::actingAs($user);

    $device = Device::factory()->for($other)->create();

    $this->putJson("/api/v1/devices/{$device->uuid}", ['name' => 'Hacked'])
        ->assertNotFound();

    expect($device->fresh()->name)->not->toBe('Hacked');
});

it('returns 401 when deleting without a token', function (): void {
    $device = Device::factory()->create();

    $this->deleteJson("/api/v1/devices/{$device->uuid}")->assertUnauthorized();
});

it('deletes the users own device and returns 204', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $device = Device::factory()->for($user)->create();

    $this->deleteJson("/api/v1/devices/{$device->uuid}")->assertNoContent();

    expect(Device::where('uuid', $device->uuid)->exists())->toBeFalse();
});

it('returns 404 when deleting another users device', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Sanctum::actingAs($user);

    $device = Device::factory()->for($other)->create();

    $this->deleteJson("/api/v1/devices/{$device->uuid}")->assertNotFound();

    expect(Device::where('uuid', $device->uuid)->exists())->toBeTrue();
});
