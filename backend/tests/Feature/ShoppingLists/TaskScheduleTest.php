<?php

declare(strict_types=1);

use App\Actions\ShoppingListItem\UpdateItemAction;
use App\Data\ShoppingListItemData;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    Sanctum::actingAs($this->user);
    $this->list = ShoppingList::factory()->tasks()->for($this->user)->create();
    $this->url = "/api/v1/shopping-lists/{$this->list->uuid}";
});

it('creates a task with common dates, normalizes timezone and hides private settings', function (): void {
    $this->postJson('/api/v1/shopping-lists', [
        'title' => 'Schedule', 'type' => 'tasks',
        'deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T10:00:00+03:00',
    ])->assertCreated()->assertJsonPath('data.deadline', '2026-10-15')
        ->assertJsonPath('data.reminder_at', '2026-10-15T07:00:00.000000Z')
        ->assertJsonMissingPath('data.manual_deadline')->assertJsonMissingPath('data.manual_reminder_at');
});

it('clamps the common dates to independent earliest unfinished items without editing those items', function (): void {
    $this->putJson($this->url, [
        'deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z', 'status' => 'postponed',
    ])->assertOk();
    $early = $this->postJson($this->url.'/items', [
        'name' => 'Earlier deadline', 'deadline' => '2026-10-12', 'reminder_at' => '2026-10-14T12:00:00Z',
    ])->assertCreated()->json('data.uuid');
    $this->postJson($this->url.'/items', [
        'name' => 'Earlier reminder', 'deadline' => '2026-10-13', 'reminder_at' => '2026-10-11T10:00:00Z',
    ])->assertCreated();
    $this->postJson($this->url.'/items', [
        'name' => 'Completed', 'deadline' => '2026-10-01', 'reminder_at' => '2026-10-01T10:00:00Z', 'status' => 'done',
    ])->assertCreated();
    $this->putJson($this->url, ['deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z'])
        ->assertOk()->assertJsonPath('data.deadline', '2026-10-12')
        ->assertJsonPath('data.reminder_at', '2026-10-11T10:00:00.000000Z')
        ->assertJsonPath('data.status', 'postponed');
    expect($this->list->refresh()->manual_deadline->toDateString())->toBe('2026-10-15');
    expect(ShoppingListItem::query()->where('uuid', $early)->first()->deadline->toDateString())->toBe('2026-10-12');
});

it('recalculates when the earliest item is completed, reopened, moved later or deleted', function (): void {
    $this->putJson($this->url, [
        'deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z',
    ])->assertOk();
    $uuid = $this->postJson($this->url.'/items', [
        'name' => 'Early', 'deadline' => '2026-10-12', 'reminder_at' => '2026-10-12T12:00:00Z',
    ])->assertCreated()->json('data.uuid');
    $itemUrl = $this->url."/items/{$uuid}";
    $this->postJson($itemUrl.'/check', ['is_checked' => true])->assertOk();
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-15')
        ->assertJsonPath('data.reminder_at', '2026-10-15T12:00:00.000000Z');
    $this->postJson($itemUrl.'/check', ['is_checked' => false])->assertOk();
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-12');
    $this->putJson($itemUrl, ['deadline' => '2026-10-20', 'reminder_at' => '2026-10-20T12:00:00Z'])->assertOk();
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-15')
        ->assertJsonPath('data.reminder_at', '2026-10-15T12:00:00.000000Z');
    $this->putJson($itemUrl, ['deadline' => '2026-10-10'])->assertOk();
    $this->deleteJson($itemUrl)->assertNoContent();
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-15');
});

it('keeps overdue unfinished dates and clears a common setting without clearing item dates', function (): void {
    $uuid = $this->postJson($this->url.'/items', [
        'name' => 'Overdue', 'deadline' => '2020-01-01', 'reminder_at' => '2020-01-01T10:00:00Z',
    ])->assertCreated()->json('data.uuid');
    $this->putJson($this->url, ['deadline' => null, 'reminder_at' => null])
        ->assertOk()->assertJsonPath('data.deadline', '2020-01-01')
        ->assertJsonPath('data.reminder_at', '2020-01-01T10:00:00.000000Z');
    $this->deleteJson($this->url."/items/{$uuid}")->assertNoContent();
    $this->getJson($this->url)->assertJsonPath('data.deadline', null)->assertJsonPath('data.reminder_at', null);
});

it('preserves common settings on unrelated edits and ignores schedules for goods', function (): void {
    $this->putJson($this->url, ['deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z'])->assertOk();
    $this->putJson($this->url, ['tags' => '["Work"]'])->assertOk()->assertJsonPath('data.deadline', '2026-10-15');
    $goods = ShoppingList::factory()->for($this->user)->create(['type' => 'goods']);
    $this->putJson("/api/v1/shopping-lists/{$goods->uuid}", ['deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z'])
        ->assertOk()->assertJsonPath('data.deadline', null)->assertJsonPath('data.reminder_at', null);
    expect($goods->refresh()->manual_deadline)->toBeNull();
});

it('rejects malformed dates and prevents another account from editing a task', function (): void {
    $this->putJson($this->url, ['deadline' => '2026-02-31', 'reminder_at' => 'not-a-date'])
        ->assertUnprocessable()->assertJsonValidationErrors(['deadline', 'reminder_at']);
    Sanctum::actingAs(User::factory()->create());
    $this->putJson($this->url, ['deadline' => '2026-10-15'])->assertForbidden();
});

it('recalculates dates after mobile sync and retains settings in old-client list snapshots', function (): void {
    $this->putJson($this->url, ['deadline' => '2026-10-15', 'reminder_at' => '2026-10-15T12:00:00Z'])->assertOk();
    $before = $this->list->refresh()->server_revision;
    $itemUuid = (string) Str::uuid();
    $changes = [
        ['entity_type' => 'shopping_list', 'uuid' => $this->list->uuid, 'operation' => 'update',
            'updated_at' => now()->addDay()->toISOString(),
            'payload' => ['title' => 'Renamed on phone', 'type' => 'tasks', 'tags' => '["Work"]']],
        ['entity_type' => 'shopping_list_item', 'uuid' => $itemUuid, 'operation' => 'create',
            'updated_at' => now()->addDay()->toISOString(),
            'payload' => ['shopping_list_uuid' => $this->list->uuid, 'name' => 'Phone task', 'category' => 'other',
                'deadline' => '2026-10-12', 'reminder_at' => '2026-10-12T09:00:00Z', 'is_checked' => false]],
    ];
    $device = (string) Str::uuid();
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => $changes])
        ->assertOk()->assertJsonCount(2, 'data.applied');
    $row = collect($this->getJson('/api/v1/sync/changes?since='.$before)->assertOk()
        ->json('data.shopping_lists'))->firstWhere('uuid', $this->list->uuid);
    expect($row['deadline'])->toBe('2026-10-12')->and($row['reminder_at'])->toBe('2026-10-12T09:00:00.000000Z');
    expect($this->list->refresh()->manual_deadline->toDateString())->toBe('2026-10-15');
    $changes = [['entity_type' => 'shopping_list_item', 'uuid' => $itemUuid, 'operation' => 'update',
        'updated_at' => now()->addDays(2)->toISOString(), 'payload' => ['is_checked' => true]]];
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => $changes])->assertOk();
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-15')
        ->assertJsonPath('data.reminder_at', '2026-10-15T12:00:00.000000Z');
});

it('rolls back the item update if saving the recalculated parent fails', function (): void {
    $item = ShoppingListItem::factory()->forList($this->list)->create(['deadline' => null]);
    DB::unprepared(<<<'SQL'
        CREATE FUNCTION web54_reject_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'schedule unavailable'; END; $$;
        CREATE TRIGGER web54_reject_schedule BEFORE UPDATE OF deadline ON shopping_lists
        FOR EACH ROW WHEN (OLD.deadline IS DISTINCT FROM NEW.deadline)
        EXECUTE FUNCTION web54_reject_schedule();
        SQL);
    try {
        expect(fn () => app(UpdateItemAction::class)($item, new ShoppingListItemData(
            name: $item->name, deadline: '2026-10-12',
        )))->toThrow(QueryException::class);
        expect($item->refresh()->deadline)->toBeNull()
            ->and($this->list->refresh()->deadline)->toBeNull();
    } finally {
        DB::unprepared('DROP TRIGGER web54_reject_schedule ON shopping_lists; DROP FUNCTION web54_reject_schedule();');
    }
});

it('backfills only active task items with a new pull revision', function (): void {
    $migration = require database_path('migrations/2026_09_30_120000_add_schedule_to_shopping_lists_table.php');
    $migration->down();
    $before = $this->list->refresh()->server_revision;
    ShoppingListItem::factory()->forList($this->list)->create(['deadline' => '2026-10-12']);
    ShoppingListItem::factory()->forList($this->list)->done()->create(['deadline' => '2026-10-01']);
    $goods = ShoppingList::factory()->for($this->user)->create(['type' => 'goods']);
    ShoppingListItem::factory()->forList($goods)->create(['deadline' => '2026-10-10']);
    $migration->up();
    expect($this->list->refresh()->deadline->toDateString())->toBe('2026-10-12')
        ->and($this->list->server_revision)->toBeGreaterThan($before)
        ->and($this->list->manual_deadline)->toBeNull()
        ->and($goods->refresh()->deadline)->toBeNull();
});

it('recalculates both parents when mobile moves an unfinished item and handles its tombstone', function (): void {
    $this->putJson($this->url, ['deadline' => '2026-10-15'])->assertOk();
    $other = ShoppingList::factory()->tasks()->for($this->user)->create();
    $uuid = $this->postJson($this->url.'/items', [
        'name' => 'Move from phone', 'deadline' => '2026-10-12', 'reminder_at' => '2026-10-12T09:00:00Z',
    ])->assertCreated()->json('data.uuid');
    $device = (string) Str::uuid();
    $change = ['entity_type' => 'shopping_list_item', 'uuid' => $uuid, 'operation' => 'update',
        'updated_at' => now()->addDay()->toISOString(), 'payload' => ['shopping_list_uuid' => $other->uuid]];
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => [$change]])
        ->assertOk()->assertJsonCount(1, 'data.applied');
    $this->getJson($this->url)->assertJsonPath('data.deadline', '2026-10-15')
        ->assertJsonPath('data.reminder_at', null);
    $this->getJson('/api/v1/shopping-lists/'.$other->uuid)->assertJsonPath('data.deadline', '2026-10-12')
        ->assertJsonPath('data.reminder_at', '2026-10-12T09:00:00.000000Z');
    $change['operation'] = 'delete';
    $change['updated_at'] = now()->addDays(2)->toISOString();
    $change['payload'] = [];
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => [$change]])->assertOk();
    $this->getJson('/api/v1/shopping-lists/'.$other->uuid)->assertJsonPath('data.deadline', null)
        ->assertJsonPath('data.reminder_at', null);
});
