<?php

declare(strict_types=1);

use App\Actions\Device\RegisterDeviceAction;
use App\Models\Device;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->action = app(RegisterDeviceAction::class);
});

it('creates a device with the given uuid, name and revision', function (): void {
    $uuid = (string) Str::uuid();

    $device = ($this->action)($this->user, $uuid, 'iPhone', 42);

    expect($device->uuid)->toBe($uuid)
        ->and($device->user_id)->toBe($this->user->id)
        ->and($device->name)->toBe('iPhone')
        ->and($device->last_synced_revision)->toBe(42)
        ->and($device->last_synced_at)->not->toBeNull();
});

it('is idempotent by uuid and updates the cursor without duplicating', function (): void {
    $uuid = (string) Str::uuid();

    ($this->action)($this->user, $uuid, 'iPhone', 10);
    $device = ($this->action)($this->user, $uuid, 'iPhone', 99);

    expect(Device::where('uuid', $uuid)->count())->toBe(1)
        ->and($device->last_synced_revision)->toBe(99);
});

it('keeps the existing name when name is null on re-register', function (): void {
    $uuid = (string) Str::uuid();

    ($this->action)($this->user, $uuid, 'Original', 1);
    $device = ($this->action)($this->user, $uuid, null, 5);

    expect($device->name)->toBe('Original')
        ->and($device->last_synced_revision)->toBe(5);
});

it('sets a default name for a new device created without a name', function (): void {
    $device = ($this->action)($this->user, (string) Str::uuid(), null, 0);

    expect($device->name)->not->toBeNull()
        ->and($device->name)->not->toBe('');
});
