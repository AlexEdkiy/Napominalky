<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use App\Services\Sync\SyncEntities;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('preserves favorites when older clients omit the field and includes them in pull and conflicts', function (string $type, string $class): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $attributes = ['is_favorite' => true, 'updated_at' => now()->subDay()];
    if ($type === 'shopping_list_item') {
        $attributes['shopping_list_id'] = ShoppingList::factory()->for($user)->create()->id;
    }
    $record = $class::factory()->for($user)->create($attributes);
    $field = $type === 'shopping_list_item' ? 'name' : 'title';
    $change = ['entity_type' => $type, 'uuid' => $record->uuid, 'operation' => 'update',
        'payload' => [$field => 'Old client edit'], 'updated_at' => now()->toISOString()];
    $device = (string) Str::uuid();
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => [$change]])
        ->assertOk()->assertJsonPath('data.applied', [$record->uuid]);
    expect($record->fresh()->is_favorite)->toBeTrue();
    $path = match ($type) {
        'note' => '/api/v1/notes/'.$record->uuid,
        'shopping_list' => '/api/v1/shopping-lists/'.$record->uuid,
        'shopping_list_item' => '/api/v1/shopping-lists/'.$record->shoppingList->uuid.'/items/'.$record->uuid,
        'reminder' => '/api/v1/reminders/'.$record->uuid,
    };
    // The current website edits through REST and does not know about favorites yet.
    $this->putJson($path, [$field => 'Web edit'])->assertOk()->assertJsonPath('data.is_favorite', true);
    expect($record->fresh()->is_favorite)->toBeTrue();
    $pull = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();
    $row = collect($pull->json('data.'.SyncEntities::pluralKey($type)))->firstWhere('uuid', $record->uuid);
    expect($row['is_favorite'])->toBeTrue();
    $change['updated_at'] = now()->subDays(2)->toISOString();
    $change['payload']['is_favorite'] = false;
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => [$change]])
        ->assertOk()->assertJsonPath('data.conflicts.0.server_payload.is_favorite', true);
    expect($record->fresh()->is_favorite)->toBeTrue();
    $change['updated_at'] = now()->addMinute()->toISOString();
    $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => [$change]])->assertOk();
    expect($record->fresh()->is_favorite)->toBeFalse();
})->with([
    ['note', Note::class], ['shopping_list', ShoppingList::class],
    ['shopping_list_item', ShoppingListItem::class], ['reminder', Reminder::class],
]);

it('rejects invalid favorite values instead of coercing them or failing the database', function (mixed $value): void {
    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/v1/sync/push', ['device_uuid' => (string) Str::uuid(), 'changes' => [[
        'entity_type' => 'note', 'uuid' => (string) Str::uuid(), 'operation' => 'create',
        'payload' => ['title' => 'Test', 'is_favorite' => $value], 'updated_at' => now()->toISOString(),
    ]]])->assertUnprocessable()->assertJsonValidationErrors('changes.0.payload.is_favorite');
})->with([null, 'yes', 2, [[]]]);

it('does not let another account change a favorite by uuid', function (): void {
    $owner = User::factory()->create();
    $note = Note::factory()->for($owner)->create(['is_favorite' => true]);
    Sanctum::actingAs(User::factory()->create());
    $this->postJson('/api/v1/sync/push', ['device_uuid' => (string) Str::uuid(), 'changes' => [[
        'entity_type' => 'note', 'uuid' => $note->uuid, 'operation' => 'update',
        'payload' => ['title' => 'Foreign', 'is_favorite' => false], 'updated_at' => now()->addDay()->toISOString(),
    ]]])->assertUnprocessable();
    expect($note->fresh()->is_favorite)->toBeTrue()->and($note->fresh()->user_id)->toBe($owner->id);
});
