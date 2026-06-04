<?php

declare(strict_types=1);

use App\Data\SyncChangeData;
use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\SyncConflict;
use App\Models\User;
use App\Services\Sync\SyncPushService;
use Carbon\CarbonImmutable;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->service = app(SyncPushService::class);
});

function noteChange(string $uuid, array $payload, string $updatedAt, string $op = 'update'): SyncChangeData
{
    return new SyncChangeData(
        entityType: 'note',
        uuid: $uuid,
        operation: $op,
        payload: $payload,
        updatedAt: CarbonImmutable::parse($updatedAt),
    );
}

it('creates a new record from a create change with user_id from token', function (): void {
    $uuid = (string) Str::uuid();

    $result = $this->service->push($this->user, [
        noteChange($uuid, [
            'title' => 'Hello',
            'body' => 'World',
            'is_pinned' => true,
            'user_id' => 999, // должен игнорироваться
        ], '2026-06-01T10:00:00Z', 'create'),
    ]);

    expect($result->applied)->toBe([$uuid])
        ->and($result->conflicts)->toBe([]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->user_id)->toBe($this->user->id)
        ->and($note->title)->toBe('Hello')
        ->and($note->is_pinned)->toBeTrue()
        ->and($note->updated_at->toISOString())->toBe(CarbonImmutable::parse('2026-06-01T10:00:00Z')->toISOString());
});

it('stores updated_at equal to client updated_at, not now()', function (): void {
    $uuid = (string) Str::uuid();
    $clientTs = '2020-01-01T00:00:00Z';

    $this->service->push($this->user, [
        noteChange($uuid, ['title' => 'Old'], $clientTs, 'create'),
    ]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->updated_at->toISOString())
        ->toBe(CarbonImmutable::parse($clientTs)->toISOString())
        ->and($note->server_revision)->toBeGreaterThan(0);
});

it('applies an update when client updated_at >= server (client wins)', function (): void {
    $note = Note::factory()->for($this->user)->create([
        'title' => 'Server',
        'updated_at' => CarbonImmutable::parse('2026-06-01T10:00:00Z'),
    ]);

    $result = $this->service->push($this->user, [
        noteChange($note->uuid, ['title' => 'Client'], '2026-06-02T10:00:00Z'),
    ]);

    expect($result->applied)->toBe([$note->uuid])
        ->and($result->conflicts)->toBe([]);
    expect($note->fresh()->title)->toBe('Client');
    expect(SyncConflict::count())->toBe(0);
});

it('records a conflict and keeps server version when client updated_at < server', function (): void {
    $note = Note::factory()->for($this->user)->create([
        'title' => 'Server',
        'updated_at' => CarbonImmutable::parse('2026-06-05T10:00:00Z'),
    ]);

    $result = $this->service->push($this->user, [
        noteChange($note->uuid, ['title' => 'StaleClient'], '2026-06-01T10:00:00Z'),
    ]);

    expect($result->applied)->toBe([])
        ->and($result->conflicts)->toHaveCount(1);

    expect($note->fresh()->title)->toBe('Server');

    $conflict = SyncConflict::firstOrFail();
    expect($conflict->user_id)->toBe($this->user->id)
        ->and($conflict->entity_type)->toBe('note')
        ->and($conflict->entity_uuid)->toBe($note->uuid)
        ->and($conflict->server_payload['title'])->toBe('Server')
        ->and($conflict->client_payload['title'])->toBe('StaleClient')
        ->and($conflict->resolved_at)->toBeNull();
});

it('is idempotent: re-pushing the same change does not duplicate', function (): void {
    $uuid = (string) Str::uuid();
    $change = noteChange($uuid, ['title' => 'Once'], '2026-06-01T10:00:00Z', 'create');

    $this->service->push($this->user, [$change]);
    $result = $this->service->push($this->user, [$change]);

    expect(Note::where('uuid', $uuid)->count())->toBe(1)
        ->and($result->applied)->toBe([$uuid]);
});

it('applies a delete operation as a tombstone', function (): void {
    $note = Note::factory()->for($this->user)->create([
        'updated_at' => CarbonImmutable::parse('2026-06-01T10:00:00Z'),
    ]);

    $result = $this->service->push($this->user, [
        noteChange($note->uuid, [], '2026-06-02T10:00:00Z', 'delete'),
    ]);

    expect($result->applied)->toBe([$note->uuid]);
    $fresh = Note::withTrashed()->where('uuid', $note->uuid)->firstOrFail();
    expect($fresh->deleted_at)->not->toBeNull()
        ->and($fresh->deleted_at->toISOString())
        ->toBe(CarbonImmutable::parse('2026-06-02T10:00:00Z')->toISOString());
});

it('creates a tombstone for a delete of an unknown uuid carrying a snapshot', function (): void {
    $uuid = (string) Str::uuid();

    $this->service->push($this->user, [
        noteChange($uuid, ['title' => 'Removed'], '2026-06-02T10:00:00Z', 'delete'),
    ]);

    $fresh = Note::withTrashed()->where('uuid', $uuid)->firstOrFail();
    expect($fresh->deleted_at)->not->toBeNull()
        ->and($fresh->user_id)->toBe($this->user->id);
});

it('treats a delete of an unknown uuid with empty payload as an applied no-op', function (): void {
    $uuid = (string) Str::uuid();

    $result = $this->service->push($this->user, [
        noteChange($uuid, [], '2026-06-02T10:00:00Z', 'delete'),
    ]);

    expect($result->applied)->toBe([$uuid])
        ->and(Note::withTrashed()->where('uuid', $uuid)->exists())->toBeFalse();
});

it('skips unknown entity types without failing the batch', function (): void {
    $uuid = (string) Str::uuid();

    $result = $this->service->push($this->user, [
        new SyncChangeData('widget', (string) Str::uuid(), 'create', [], CarbonImmutable::now()),
        noteChange($uuid, ['title' => 'Kept'], '2026-06-01T10:00:00Z', 'create'),
    ]);

    expect($result->applied)->toBe([$uuid])
        ->and(Note::where('uuid', $uuid)->exists())->toBeTrue();
});

it('only persists whitelisted fields', function (): void {
    $uuid = (string) Str::uuid();

    $this->service->push($this->user, [
        noteChange($uuid, [
            'title' => 'Safe',
            'server_revision' => 1,
            'id' => 42,
        ], '2026-06-01T10:00:00Z', 'create'),
    ]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->id)->not->toBe(42)
        ->and($note->title)->toBe('Safe');
});

it('casts enum and datetime payload strings for reminders', function (): void {
    $uuid = (string) Str::uuid();

    $this->service->push($this->user, [
        new SyncChangeData('reminder', $uuid, 'create', [
            'title' => 'R',
            'remind_at' => '2026-07-01T08:00:00Z',
            'recurrence' => 'weekly',
            'is_completed' => true,
            'completed_at' => '2026-07-01T09:00:00Z',
        ], CarbonImmutable::parse('2026-06-01T10:00:00Z')),
    ]);

    $reminder = Reminder::where('uuid', $uuid)->firstOrFail();
    expect($reminder->recurrence->value)->toBe('weekly')
        ->and($reminder->is_completed)->toBeTrue()
        ->and($reminder->remind_at)->not->toBeNull()
        ->and($reminder->completed_at)->not->toBeNull();
});

it('resolves shopping_list_uuid to the internal parent id for items', function (): void {
    $list = ShoppingList::factory()->for($this->user)->create();
    $uuid = (string) Str::uuid();

    $this->service->push($this->user, [
        new SyncChangeData('shopping_list_item', $uuid, 'create', [
            'shopping_list_uuid' => $list->uuid,
            'name' => 'Milk',
            'category' => 'products',
            'is_checked' => true,
            'position' => 3,
        ], CarbonImmutable::parse('2026-06-01T10:00:00Z')),
    ]);

    $item = ShoppingListItem::where('uuid', $uuid)->firstOrFail();
    expect($item->shopping_list_id)->toBe($list->id)
        ->and($item->user_id)->toBe($this->user->id)
        ->and($item->category->value)->toBe('products')
        ->and($item->is_checked)->toBeTrue()
        ->and($item->position)->toBe(3);
});

it('returns a cursor covering applied records', function (): void {
    $uuid = (string) Str::uuid();

    $result = $this->service->push($this->user, [
        noteChange($uuid, ['title' => 'C'], '2026-06-01T10:00:00Z', 'create'),
    ]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($result->cursor)->toBe($note->server_revision)
        ->and($result->cursor)->toBeGreaterThan(0);
});

it('does not touch another users record with the same uuid scope', function (): void {
    // findExisting фильтрует по user_id: запись другого пользователя с тем же
    // uuid (теоретически) не должна находиться как «существующая» для текущего.
    $other = User::factory()->create();
    $note = Note::factory()->for($other)->create([
        'title' => 'OtherUser',
        'updated_at' => CarbonImmutable::parse('2026-06-05T10:00:00Z'),
    ]);

    // Несуществующий для текущего пользователя uuid → create у него.
    $mineUuid = (string) Str::uuid();
    $this->service->push($this->user, [
        noteChange($mineUuid, ['title' => 'Mine'], '2026-06-02T10:00:00Z', 'create'),
    ]);

    expect($note->fresh()->title)->toBe('OtherUser')
        ->and(Note::where('uuid', $mineUuid)->where('user_id', $this->user->id)->exists())
        ->toBeTrue();
});
