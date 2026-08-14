<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
 * Контракт ресурса пункта после появления треда (docs/07-api.md):
 * comments_count присутствует всегда (GET /items, POST/PUT пункта, check);
 * comments (embed, ASC) — в списке пунктов (whenLoaded). Legacy-поле comment
 * остаётся в ресурсе на время двухфазного вывода.
 */

beforeEach(function (): void {
    $this->user = User::factory()->create();
    Sanctum::actingAs($this->user);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
    $this->base = "/api/v1/shopping-lists/{$this->list->uuid}/items";
});

it('embeds comments_count and the ASC thread into GET /items', function (): void {
    $withThread = ShoppingListItem::factory()->forList($this->list)->create(['position' => 1]);
    $empty = ShoppingListItem::factory()->forList($this->list)->create(['position' => 2]);

    $late = ShoppingListItemComment::factory()->forItem($withThread)->create([
        'created_at' => '2026-06-02T10:00:00Z',
    ]);
    $early = ShoppingListItemComment::factory()->forItem($withThread)->create([
        'created_at' => '2026-06-01T10:00:00Z',
    ]);

    $response = $this->getJson($this->base)
        ->assertOk()
        ->assertJsonPath('data.0.comments_count', 2)
        ->assertJsonPath('data.1.comments_count', 0)
        ->assertJsonPath('data.1.comments', [])
        ->assertJsonStructure([
            'data' => [['uuid', 'comment', 'comments_count', 'comments' => [['uuid', 'author_name', 'body', 'created_at']]]],
        ]);

    expect(array_column($response->json('data.0.comments'), 'uuid'))
        ->toBe([$early->uuid, $late->uuid]);
});

it('excludes tombstone comments from comments_count and the embed', function (): void {
    $item = ShoppingListItem::factory()->forList($this->list)->create();
    $alive = ShoppingListItemComment::factory()->forItem($item)->create();
    ShoppingListItemComment::factory()->forItem($item)->trashed()->create();

    $response = $this->getJson($this->base)
        ->assertOk()
        ->assertJsonPath('data.0.comments_count', 1)
        ->assertJsonCount(1, 'data.0.comments');

    expect($response->json('data.0.comments.0.uuid'))->toBe($alive->uuid);
});

it('returns comments_count on item store (fresh item has zero)', function (): void {
    $this->postJson($this->base, ['name' => 'Позвонить в банк'])
        ->assertCreated()
        ->assertJsonPath('data.comments_count', 0);
});

it('returns the actual comments_count on item update', function (): void {
    $item = ShoppingListItem::factory()->forList($this->list)->create();
    ShoppingListItemComment::factory()->forItem($item)->count(3)->create();

    $this->putJson("{$this->base}/{$item->uuid}", ['name' => 'Переименован'])
        ->assertOk()
        ->assertJsonPath('data.comments_count', 3);
});

it('returns the actual comments_count on item check', function (): void {
    $item = ShoppingListItem::factory()->forList($this->list)->create();
    ShoppingListItemComment::factory()->forItem($item)->count(2)->create();

    $this->postJson("{$this->base}/{$item->uuid}/check", ['is_checked' => true])
        ->assertOk()
        ->assertJsonPath('data.comments_count', 2);
});
