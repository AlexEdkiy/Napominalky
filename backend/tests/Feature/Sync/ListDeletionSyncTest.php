<?php

declare(strict_types=1);

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->travelTo(now()->setDate(2026, 10, 29)->startOfDay());
    $this->user = User::factory()->create();
    Sanctum::actingAs($this->user);
    $this->device = (string) Str::uuid();
});

function deletionChange(string $entity, string $uuid, string $time): array
{
    return ['entity_type' => $entity, 'uuid' => $uuid, 'operation' => 'delete',
        'updated_at' => $time, 'payload' => ['deleted_at' => $time]];
}

it('accepts an offline list deletion after deleting its children, including split batches and retry', function (bool $manual, int $count): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create([
        'status' => TaskStatus::InProgress, 'status_is_manual' => $manual,
        'deadline' => '2026-10-25', 'reminder_at' => '2026-10-25T09:00:00Z',
        'updated_at' => '2026-10-20T00:00:00Z',
    ]);
    $items = ShoppingListItem::factory()->count($count)->forList($list)->create([
        'status' => TaskStatus::InProgress, 'is_checked' => false,
        'deadline' => '2026-10-25', 'reminder_at' => '2026-10-25T09:00:00Z',
        'updated_at' => '2026-10-20T00:00:00Z',
    ]);
    $before = $items->max('server_revision');
    $time = '2026-10-25T10:06:22.558Z';
    $changes = $items->map(fn ($item) => deletionChange('shopping_list_item', $item->uuid, $time))->all();
    $changes[] = deletionChange('shopping_list', $list->uuid, $time);

    foreach (array_chunk($changes, 500) as $batch) {
        $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => $batch])
            ->assertOk()->assertJsonPath('data.conflicts', [])
            ->assertJsonCount(count($batch), 'data.applied');
    }
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => $batch])
        ->assertOk()->assertJsonPath('data.conflicts', []);
    expect(ShoppingList::query()->whereKey($list->id)->exists())->toBeFalse()
        ->and($list->items()->count())->toBe(0)
        ->and($list->refresh()->deleted_at->toISOString())->toBe('2026-10-25T10:06:22.000000Z');
    // Follow all pull pages: a parent tombstone must reach other devices too.
    $found = false;
    do {
        $page = $this->getJson('/api/v1/sync/changes?since='.$before)->assertOk()->json();
        foreach ($page['data']['shopping_lists'] as $row) {
            if ($row['uuid'] === $list->uuid) {
                expect($row['deleted_at'])->not->toBeNull();
                $found = true;
            }
        }
        $before = $page['meta']['cursor'];
    } while ($page['meta']['has_more']);
    expect($found)->toBeTrue();
})->with([[true, 23], [false, 23], [true, 501], [false, 501]]);

it('publishes recalculated fields with a fresh timestamp and revision but preserves the parent user edit time', function (bool $manual): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create([
        'status' => TaskStatus::New, 'status_is_manual' => $manual,
        'updated_at' => '2026-10-20T00:00:00Z',
    ]);
    ShoppingListItem::factory()->forList($list)->create([
        'status' => TaskStatus::InProgress, 'is_checked' => false,
        'deadline' => '2026-10-25', 'reminder_at' => '2026-10-25T09:00:00Z',
    ]);
    $before = $list->server_revision;
    app(RecalculateListStatusAction::class)($list);
    expect($list->refresh()->user_updated_at->toISOString())->toBe('2026-10-20T00:00:00.000000Z')
        ->and($list->updated_at->toISOString())->toBe('2026-10-29T00:00:00.000000Z')
        ->and($list->server_revision)->toBeGreaterThan($before)
        ->and($list->status)->toBe($manual ? TaskStatus::New : TaskStatus::InProgress)
        ->and($list->deadline->toDateString())->toBe('2026-10-25');
    $row = collect($this->getJson('/api/v1/sync/changes?since='.$before)->assertOk()
        ->json('data.shopping_lists'))->firstWhere('uuid', $list->uuid);
    expect($row['reminder_at'])->toBe('2026-10-25T09:00:00.000000Z');
    expect($row)->not->toHaveKey('user_updated_at');
})->with([true, false]);

it('still rejects an old deletion when another device really edited the parent', function (): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create(['updated_at' => '2026-10-20T00:00:00Z']);
    $item = ShoppingListItem::factory()->forList($list)->create(['updated_at' => '2026-10-20T00:00:00Z']);
    $this->putJson('/api/v1/shopping-lists/'.$list->uuid, ['title' => 'Newer user edit'])
        ->assertOk();
    $editedAt = $list->refresh()->updated_at->toISOString();
    $time = '2026-10-25T10:06:22Z';
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => [
        deletionChange('shopping_list_item', $item->uuid, $time),
        deletionChange('shopping_list', $list->uuid, $time),
    ]])->assertOk()->assertJsonPath('data.applied', [$item->uuid])
        ->assertJsonPath('data.conflicts.0.entity_uuid', $list->uuid);
    expect($list->refresh()->deleted_at)->toBeNull()
        ->and($list->title)->toBe('Newer user edit')
        ->and($list->updated_at->toISOString())->toBe($editedAt);
    $this->assertDatabaseHas('sync_conflicts', ['user_id' => $this->user->id, 'entity_uuid' => $list->uuid]);
});

it('uses the tombstone version and prevents an older update from resurrecting a deleted list', function (): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create(['updated_at' => '2026-10-20T00:00:00Z']);
    $this->deleteJson('/api/v1/shopping-lists/'.$list->uuid)->assertNoContent();
    $change = deletionChange('shopping_list', $list->uuid, '2026-10-25T10:06:22Z');
    foreach (['delete', 'update'] as $operation) {
        $change['operation'] = $operation;
        $change['payload'] = ['title' => 'Stale draft', 'type' => 'tasks'];
        $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => [$change]])
            ->assertOk()->assertJsonPath('data.applied', [])
            ->assertJsonPath('data.conflicts.0.entity_uuid', $list->uuid);
    }
    expect($list->refresh()->trashed())->toBeTrue();
});

it('records an actual sync parent edit and ignores a forged user clock in its payload', function (): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create(['updated_at' => '2026-10-20T00:00:00Z']);
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => [[
        'entity_type' => 'shopping_list', 'uuid' => $list->uuid, 'operation' => 'update',
        'updated_at' => '2026-10-27T12:00:00Z',
        'payload' => ['title' => 'New device title', 'user_updated_at' => '2020-01-01T00:00:00Z'],
    ]]])->assertOk()->assertJsonPath('data.conflicts', []);
    expect($list->refresh()->user_updated_at->toISOString())->toBe('2026-10-27T12:00:00.000000Z');
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => [
        deletionChange('shopping_list', $list->uuid, '2026-10-25T10:06:22Z'),
    ]])->assertOk()->assertJsonPath('data.applied', [])
        ->assertJsonPath('data.conflicts.0.entity_uuid', $list->uuid);
});

it('backfills the private clock without changing historical content, tombstones or revisions', function (): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create([
        'updated_at' => '2026-10-20T00:00:00Z', 'deleted_at' => '2026-10-20T00:00:00Z',
    ]);
    $before = $list->refresh()->getRawOriginal();
    unset($before['user_updated_at']);
    Schema::table('shopping_lists', fn ($table) => $table->dropColumn('user_updated_at'));
    $migration = require database_path('migrations/2026_10_29_000001_add_user_updated_at_to_shopping_lists.php');
    $migration->up();
    $after = $list->refresh()->getRawOriginal();
    expect($after['user_updated_at'])->toBe($before['updated_at']);
    unset($after['user_updated_at']);
    expect($after)->toBe($before);
});

it('falls back to the existing version when the private clock is missing', function (): void {
    $list = ShoppingList::factory()->tasks()->for($this->user)->create();
    DB::table('shopping_lists')->where('id', $list->id)->update(['user_updated_at' => null]);
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $this->device, 'changes' => [
        deletionChange('shopping_list', $list->uuid, '2026-10-25T10:06:22Z'),
    ]])->assertOk()->assertJsonPath('data.applied', [])
        ->assertJsonPath('data.conflicts.0.entity_uuid', $list->uuid);
});
