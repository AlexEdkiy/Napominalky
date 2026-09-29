<?php

declare(strict_types=1);

use App\Actions\ShoppingListItemComment\AddItemCommentAction;
use App\Data\ShoppingListItemCommentData;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;

/*
 * Дополнение к ItemCommentDomainSmokeTest (DEV): тред из нескольких
 * комментариев и create-ветка политики. Одиночные сценарии action/policy
 * уже покрыты smoke-тестами — не дублируются.
 */

beforeEach(function (): void {
    $this->user = User::factory()->create(['name' => 'Ольга']);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
    $this->item = ShoppingListItem::factory()->forList($this->list)->create();
});

it('builds a thread of several comments on one item ordered by created_at', function (): void {
    $action = app(AddItemCommentAction::class);

    $first = $action($this->item, $this->user, new ShoppingListItemCommentData(body: 'Первый'));
    $second = $action($this->item, $this->user, new ShoppingListItemCommentData(body: 'Второй'));
    $third = $action($this->item, $this->user, new ShoppingListItemCommentData(body: 'Третий'));

    // Детерминированные метки времени вместо реальных "сейчас".
    $first->forceFill(['created_at' => '2026-06-01T10:00:00Z'])->saveQuietly();
    $second->forceFill(['created_at' => '2026-06-02T10:00:00Z'])->saveQuietly();
    $third->forceFill(['created_at' => '2026-06-03T10:00:00Z'])->saveQuietly();

    $thread = $this->item->comments()->orderBy('created_at')->orderBy('id')->get();

    expect($thread)->toHaveCount(3)
        ->and($thread->pluck('body')->all())->toBe(['Первый', 'Второй', 'Третий'])
        ->and($thread->pluck('uuid')->unique())->toHaveCount(3)
        ->and($thread->every(fn (ShoppingListItemComment $c): bool => $c->user_id === $this->user->id))
        ->toBeTrue();
});

it('allows any authenticated user to pass the create policy gate', function (): void {
    $stranger = User::factory()->create();

    // create — без модели: право «комментировать вообще»; принадлежность
    // конкретного треда контролируется view-политикой списка на HTTP-слое.
    expect($this->user->can('create', ShoppingListItemComment::class))->toBeTrue()
        ->and($stranger->can('create', ShoppingListItemComment::class))->toBeTrue();
});
