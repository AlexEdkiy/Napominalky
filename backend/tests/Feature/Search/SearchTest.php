<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('requires authentication', function (): void {
    $this->getJson('/api/v1/search?q=текст')->assertUnauthorized();
});

it('validates the query and paging parameters', function (array $params): void {
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/v1/search?'.http_build_query($params))->assertUnprocessable();
})->with([
    [[]], [['q' => ' ']], [['q' => 'я']], [['q' => ['test']]], [['q' => str_repeat('я', 201)]],
    [['q' => 'test', 'type' => 'users']], [['q' => 'test', 'type' => ['note']]],
    [['q' => 'test', 'page' => 0]], [['q' => 'test', 'per_page' => 51]],
]);

it('searches all entity types and text with case-insensitive Cyrillic matching', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    Note::factory()->for($user)->create(['title' => 'Заметка', 'body' => 'Закупить МОЛОКО']);
    $list = ShoppingList::factory()->for($user)->create(['title' => 'Молоко и хлеб', 'type' => 'goods']);
    ShoppingList::factory()->for($user)->create(['title' => 'Задача', 'type' => 'tasks', 'tags' => '["молоко"]']);
    $item = ShoppingListItem::factory()->forList($list)->create(['name' => 'Проверить наличие', 'comment' => 'Нужно молоко']);
    Reminder::factory()->for($user)->create(['title' => 'Позвонить', 'notes' => 'Заказать молоко']);

    $r = $this->getJson('/api/v1/search?'.http_build_query(['q' => '  молоко  ']))
        ->assertOk()->assertJsonPath('meta.total', 5)->assertJsonCount(5, 'data');
    expect($r->json('data.0.uuid'))->toBe($list->uuid);
    expect(collect($r->json('data'))->pluck('type')->unique()->sort()->values()->all())
        ->toBe(['item', 'list', 'note', 'reminder']);
    $match = collect($r->json('data'))->firstWhere('uuid', $item->uuid);
    expect($match['list_uuid'])->toBe($list->uuid)->and($match['list_title'])->toBe($list->title)
        ->and($match['excerpt'])->toContain('молоко')->and($match['is_completed'])->toBeFalse();
    $r->assertJsonMissingPath('data.0.user_id')->assertJsonMissingPath('data.0.id')
        ->assertJsonMissingPath('data.0.content')->assertJsonMissingPath('data.0.relevance');
});

it('finds active thread comments once and centers a bounded excerpt around the match', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create(['name' => 'Документы']);
    ShoppingListItemComment::factory()->forItem($item)->count(2)->create([
        'body' => str_repeat('До ', 200).'РЕДКОЕ совпадение '.str_repeat('После ', 100),
    ]);
    $r = $this->getJson('/api/v1/search?q=редкое')->assertOk()->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $item->uuid);
    expect($r->json('data.0.excerpt'))->toContain('РЕДКОЕ')
        ->and(mb_strlen($r->json('data.0.excerpt')))->toBeLessThanOrEqual(240);
});

it('excludes other owners, deleted records and broken parent ownership', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Sanctum::actingAs($user);
    foreach ([$user, $other] as $owner) {
        $note = Note::factory()->for($owner)->create(['title' => 'секрет']);
        $reminder = Reminder::factory()->for($owner)->create(['title' => 'секрет']);
        $list = ShoppingList::factory()->for($owner)->create(['title' => 'секрет']);
        ShoppingListItem::factory()->forList($list)->create(['name' => 'секрет']);
        if ($owner->is($user)) {
            $note->delete(); $reminder->delete(); $list->delete();
        } else {
            ShoppingListItem::factory()->forList($list)->create(['user_id' => $user->id, 'name' => 'секрет']);
        }
    }
    $ownList = ShoppingList::factory()->for($user)->create(['title' => 'Обычный список']);
    ShoppingListItem::factory()->forList($ownList)->create(['name' => 'секрет'])->delete();
    $item = ShoppingListItem::factory()->forList($ownList)->create(['name' => 'Обычный пункт']);
    ShoppingListItemComment::factory()->forItem($item)->create(['body' => 'секрет', 'user_id' => $other->id]);
    ShoppingListItemComment::factory()->forItem($item)->trashed()->create(['body' => 'секрет']);
    $this->getJson('/api/v1/search?q=секрет')->assertOk()->assertJsonPath('meta.total', 0);
});

it('includes archived and completed records with explicit flags', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    Note::factory()->for($user)->create(['title' => 'Совпадение', 'is_archived' => true]);
    Reminder::factory()->for($user)->completed()->create(['title' => 'Совпадение']);
    $r = $this->getJson('/api/v1/search?q=Совпадение')->assertOk()->assertJsonPath('meta.total', 2);
    $rows = collect($r->json('data'))->keyBy('type');
    expect($rows['note']['is_archived'])->toBeTrue()->and($rows['reminder']['is_completed'])->toBeTrue();
});

it('treats LIKE and SQL metacharacters as literal text', function (string $query): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $hit = Note::factory()->for($user)->create(['title' => 'Текст '.$query]);
    Note::factory()->for($user)->create(['title' => 'Совсем другой текст', 'body' => 'Не подходит']);
    $this->getJson('/api/v1/search?'.http_build_query(['q' => $query]))
        ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.uuid', $hit->uuid);
})->with(['50%', 'a_b', 'a!b', "' OR 1=1 --", 'C:\\tmp']);

it('paginates the combined results deterministically and filters by type', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);
    $time = now()->subDay();
    Note::factory()->for($user)->count(23)->create(['title' => 'Страница', 'updated_at' => $time]);
    Reminder::factory()->for($user)->create(['title' => 'Страница', 'updated_at' => $time]);
    $first = $this->getJson('/api/v1/search?q=Страница&per_page=20')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 24);
    $last = $this->getJson('/api/v1/search?q=Страница&per_page=20&page=2')->assertOk()->assertJsonCount(4, 'data');
    expect(array_intersect(array_column($first->json('data'), 'uuid'), array_column($last->json('data'), 'uuid')))->toBe([]);
    $this->getJson('/api/v1/search?q=Страница&type=reminder')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.type', 'reminder');
});

it('limits repeated searches per user without blocking another user', function (): void {
    Sanctum::actingAs(User::factory()->create());
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/search?q=ничего')->assertOk();
    }
    $this->getJson('/api/v1/search?q=ничего')->assertStatus(429);
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/v1/search?q=ничего')->assertOk();
});
