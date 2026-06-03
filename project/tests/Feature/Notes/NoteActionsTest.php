<?php

declare(strict_types=1);

use App\Actions\Note\CreateNoteAction;
use App\Actions\Note\DeleteNoteAction;
use App\Actions\Note\ToggleArchiveAction;
use App\Actions\Note\TogglePinAction;
use App\Actions\Note\UpdateNoteAction;
use App\Data\NoteData;
use App\Models\Note;
use App\Models\User;

it('creates a note for the user via CreateNoteAction', function (): void {
    $user = User::factory()->create();

    $note = (new CreateNoteAction())($user, new NoteData(
        title: 'Action created',
        body: 'body text',
        isPinned: true,
    ));

    expect($note)->toBeInstanceOf(Note::class)
        ->and($note->user_id)->toBe($user->id)
        ->and($note->title)->toBe('Action created')
        ->and($note->body)->toBe('body text')
        ->and($note->is_pinned)->toBeTrue()
        ->and($note->uuid)->toBeString()->not->toBeEmpty();
});

it('updates a note via UpdateNoteAction', function (): void {
    $note = Note::factory()->create(['title' => 'Before', 'body' => 'old']);

    $updated = (new UpdateNoteAction())($note, new NoteData(
        title: 'After',
        body: null,
        isArchived: true,
    ));

    expect($updated->title)->toBe('After')
        ->and($updated->body)->toBeNull()
        ->and($updated->is_archived)->toBeTrue();
});

it('toggles pin via TogglePinAction', function (): void {
    $note = Note::factory()->create(['is_pinned' => false]);

    $result = (new TogglePinAction())($note, true);

    expect($result->is_pinned)->toBeTrue()
        ->and($note->fresh()->is_pinned)->toBeTrue();
});

it('toggles archive via ToggleArchiveAction', function (): void {
    $note = Note::factory()->create(['is_archived' => false]);

    $result = (new ToggleArchiveAction())($note, true);

    expect($result->is_archived)->toBeTrue()
        ->and($note->fresh()->is_archived)->toBeTrue();
});

it('soft deletes a note via DeleteNoteAction', function (): void {
    $note = Note::factory()->create();

    (new DeleteNoteAction())($note);

    expect(Note::find($note->id))->toBeNull()
        ->and(Note::withTrashed()->find($note->id)->deleted_at)->not->toBeNull();
});
