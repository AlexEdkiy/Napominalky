<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;

it('allows the owner to view, update, delete, pin and archive their note', function (): void {
    $owner = User::factory()->create();
    $note = Note::factory()->for($owner)->create();

    expect($owner->can('view', $note))->toBeTrue()
        ->and($owner->can('update', $note))->toBeTrue()
        ->and($owner->can('delete', $note))->toBeTrue()
        ->and($owner->can('pin', $note))->toBeTrue()
        ->and($owner->can('archive', $note))->toBeTrue();
});

it('denies a non-owner from view, update, delete, pin and archive', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $note = Note::factory()->for($owner)->create();

    expect($stranger->can('view', $note))->toBeFalse()
        ->and($stranger->can('update', $note))->toBeFalse()
        ->and($stranger->can('delete', $note))->toBeFalse()
        ->and($stranger->can('pin', $note))->toBeFalse()
        ->and($stranger->can('archive', $note))->toBeFalse();
});

it('allows any authenticated user to viewAny and create notes', function (): void {
    $user = User::factory()->create();

    expect($user->can('viewAny', Note::class))->toBeTrue()
        ->and($user->can('create', Note::class))->toBeTrue();
});
