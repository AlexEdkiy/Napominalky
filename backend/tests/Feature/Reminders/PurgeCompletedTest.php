<?php

declare(strict_types=1);

use App\Actions\Reminder\PurgeCompletedRemindersAction;
use App\Models\Reminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Console\Scheduling\Schedule;
use Laravel\Sanctum\Sanctum;

/*
 * Автоудаление выполненных напоминаний (DEV-25): закрытые раньше чем 7 дней
 * назад мягко удаляются (tombstone с новой ревизией уходит в sync), остальные
 * — нет. Команда reminders:purge-completed стоит в расписании ежечасно.
 */

function completedAt(User $user, CarbonInterface $completedAt, string $title = 'done'): Reminder
{
    return Reminder::factory()->for($user)->create([
        'title' => $title,
        'is_completed' => true,
        'completed_at' => $completedAt,
    ]);
}

function completedAgo(User $user, int $days, string $title = 'done'): Reminder
{
    return completedAt($user, now()->subDays($days), $title);
}

it('soft-deletes reminders completed more than 7 days ago and keeps the rest', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $base = CarbonImmutable::parse('2026-09-20 12:00:00', 'UTC');

    $old = completedAt($user, $base->subDays(8), 'old');
    $justPast = completedAt($user, $base->subDays(7)->subSecond(), 'just-past'); // 7 дней + 1 с → удаляется
    $boundary = completedAt($user, $base->subDays(7), 'boundary'); // ровно 7 дней → ещё хранится
    $fresh = completedAt($user, $base->subDays(6), 'fresh');
    $foreignOld = completedAt($other, $base->subDays(30), 'foreign-old');
    $pendingOld = Reminder::factory()->for($user)->create([
        'title' => 'pending',
        'is_completed' => false,
        'completed_at' => null,
        'remind_at' => $base->subDays(40),
    ]);

    $purged = app(PurgeCompletedRemindersAction::class)($base);

    // fresh() читает без глобальных scope'ов (вернёт и trashed) — проверяем через query().
    $alive = fn (Reminder $reminder): bool => Reminder::query()->whereKey($reminder->id)->exists();

    expect($purged)->toBe(3)
        ->and($alive($old))->toBeFalse()
        ->and($alive($justPast))->toBeFalse()
        ->and($alive($foreignOld))->toBeFalse()
        ->and($alive($boundary))->toBeTrue()
        ->and($alive($fresh))->toBeTrue()
        ->and($alive($pendingOld))->toBeTrue()
        ->and(Reminder::withTrashed()->find($old->id)?->deleted_at)->not->toBeNull();
});

it('bumps server_revision on purge so the tombstone reaches devices via sync pull', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $old = completedAgo($user, 10);
    $cursor = (int) $old->server_revision;

    app(PurgeCompletedRemindersAction::class)();

    $this->getJson("/api/v1/sync/changes?since={$cursor}")
        ->assertOk()
        ->assertJsonPath('data.reminders.0.uuid', $old->uuid)
        ->assertJsonPath('data.reminders.0.deleted_at', fn ($value) => $value !== null);
});

it('is exposed as the reminders:purge-completed command', function (): void {
    $user = User::factory()->create();
    completedAgo($user, 9);
    completedAgo($user, 1);

    $this->artisan('reminders:purge-completed')
        ->expectsOutputToContain('Удалено выполненных напоминаний: 1')
        ->assertSuccessful();

    expect(Reminder::query()->count())->toBe(1);
});

it('is scheduled hourly', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event) => str_contains($event->command ?? '', 'reminders:purge-completed'));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('0 * * * *');
});
