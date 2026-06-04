<?php

declare(strict_types=1);

use App\Models\Reminder;
use App\Models\User;

it('allows the owner every reminder ability', function (): void {
    $owner = User::factory()->create();
    $reminder = Reminder::factory()->for($owner)->create();

    expect($owner->can('view', $reminder))->toBeTrue()
        ->and($owner->can('update', $reminder))->toBeTrue()
        ->and($owner->can('delete', $reminder))->toBeTrue()
        ->and($owner->can('complete', $reminder))->toBeTrue()
        ->and($owner->can('snooze', $reminder))->toBeTrue();
});

it('denies a non-owner every reminder ability', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $reminder = Reminder::factory()->for($owner)->create();

    expect($stranger->can('view', $reminder))->toBeFalse()
        ->and($stranger->can('update', $reminder))->toBeFalse()
        ->and($stranger->can('delete', $reminder))->toBeFalse()
        ->and($stranger->can('complete', $reminder))->toBeFalse()
        ->and($stranger->can('snooze', $reminder))->toBeFalse();
});

it('allows any authenticated user to viewAny and create reminders', function (): void {
    $user = User::factory()->create();

    expect($user->can('viewAny', Reminder::class))->toBeTrue()
        ->and($user->can('create', Reminder::class))->toBeTrue();
});
