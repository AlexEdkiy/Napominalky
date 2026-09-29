<?php

declare(strict_types=1);

use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\User;

/**
 * Регрессия: soft-delete (SoftDeletes::runSoftDelete) обновляет deleted_at прямым
 * query-builder update'ом мимо события saving. Без отдельного бампа в trait'е
 * TracksSyncRevision tombstone сохранял бы старый server_revision и НЕ доходил бы
 * до устройств через инкрементальный pull (server_revision > курсора). Эти тесты
 * гарантируют, что server_revision повышается при soft-delete.
 */
it('bumps server_revision when a shopping list is soft-deleted', function (): void {
    $user = User::factory()->create();
    $list = new ShoppingList();
    $list->user_id = $user->id;
    $list->title = 'Тест';
    $list->type = 'goods';
    $list->save();
    $revAfterCreate = $list->server_revision;

    $list->delete();

    $trashed = ShoppingList::withTrashed()->find($list->id);
    expect($trashed->deleted_at)->not->toBeNull()
        ->and($trashed->server_revision)->toBeGreaterThan($revAfterCreate);
});

it('bumps server_revision when a reminder is soft-deleted', function (): void {
    $user = User::factory()->create();
    $reminder = new Reminder();
    $reminder->user_id = $user->id;
    $reminder->title = 'Тест';
    $reminder->remind_at = now()->addDay();
    $reminder->save();
    $revAfterCreate = $reminder->server_revision;

    $reminder->delete();

    $trashed = Reminder::withTrashed()->find($reminder->id);
    expect($trashed->deleted_at)->not->toBeNull()
        ->and($trashed->server_revision)->toBeGreaterThan($revAfterCreate);
});
