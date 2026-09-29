<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns 401 without a token', function (): void {
    $this->getJson('/api/v1/sync/changes')->assertUnauthorized();
});

it('returns the data/meta envelope structure', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/v1/sync/changes?since=0')
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['notes', 'shopping_lists', 'shopping_list_items', 'reminders'],
            'meta' => ['cursor', 'has_more'],
        ]);
});

it('serializes shopping list type and tags for the mobile client (sync pull)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create([
        'type' => 'tasks',
        'tags' => '["Работа","Mafin"]',
    ]);

    $this->getJson('/api/v1/sync/changes?since=0')
        ->assertOk()
        ->assertJsonPath('data.shopping_lists.0.uuid', $list->uuid)
        ->assertJsonPath('data.shopping_lists.0.type', 'tasks')
        ->assertJsonPath('data.shopping_lists.0.tags', '["Работа","Mafin"]');
});

it('returns all of the users records across the four entities when since=0', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->count(2)->create();
    $list = ShoppingList::factory()->for($user)->create();
    ShoppingListItem::factory()->forList($list)->count(3)->create();
    Reminder::factory()->for($user)->count(2)->create();

    $this->getJson('/api/v1/sync/changes?since=0')
        ->assertOk()
        ->assertJsonCount(2, 'data.notes')
        ->assertJsonCount(1, 'data.shopping_lists')
        ->assertJsonCount(3, 'data.shopping_list_items')
        ->assertJsonCount(2, 'data.reminders')
        ->assertJsonPath('meta.has_more', false);
});

it('does not expose another users records', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Sanctum::actingAs($user);

    $mine = Note::factory()->for($user)->create(['title' => 'Mine']);
    Note::factory()->for($other)->create(['title' => 'Theirs']);

    $response = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();

    $uuids = array_column($response->json('data.notes'), 'uuid');

    expect($uuids)->toBe([$mine->uuid]);
});

it('includes soft-deleted records as tombstones with a non-null deleted_at', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create();
    $note->delete();

    $response = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();

    $tombstone = collect($response->json('data.notes'))
        ->firstWhere('uuid', $note->uuid);

    expect($tombstone)->not->toBeNull()
        ->and($tombstone['deleted_at'])->not->toBeNull();
});

it('paginates with a small limit, advances the cursor and reports has_more', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->count(5)->create();

    $first = $this->getJson('/api/v1/sync/changes?since=0&limit=2')->assertOk();

    expect($first->json('meta.has_more'))->toBeTrue();
    $cursor = $first->json('meta.cursor');
    expect($cursor)->toBeGreaterThan(0);

    $firstUuids = array_column($first->json('data.notes'), 'uuid');
    expect($firstUuids)->toHaveCount(2);

    $second = $this->getJson("/api/v1/sync/changes?since={$cursor}&limit=2")->assertOk();
    $secondUuids = array_column($second->json('data.notes'), 'uuid');

    // Курсор не пропускает и не дублирует записи между страницами.
    expect(array_intersect($firstUuids, $secondUuids))->toBe([])
        ->and($second->json('meta.has_more'))->toBeTrue();
});

it('drains all pages without gaps or duplicates following the cursor', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->count(5)->create();

    $seen = [];
    $cursor = 0;

    do {
        $page = $this->getJson("/api/v1/sync/changes?since={$cursor}&limit=2")->assertOk();
        $seen = [...$seen, ...array_column($page->json('data.notes'), 'uuid')];
        $cursor = $page->json('meta.cursor');
    } while ($page->json('meta.has_more'));

    expect($seen)->toHaveCount(5)
        ->and(array_unique($seen))->toHaveCount(5);
});

it('returns nothing new when since equals the latest cursor', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->count(2)->create();

    $first = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();
    $cursor = $first->json('meta.cursor');

    $this->getJson("/api/v1/sync/changes?since={$cursor}")
        ->assertOk()
        ->assertJsonCount(0, 'data.notes')
        ->assertJsonPath('meta.has_more', false)
        ->assertJsonPath('meta.cursor', $cursor);
});
