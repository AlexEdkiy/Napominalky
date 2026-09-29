<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/**
 * Сценарий мультидевайс-синхронизации в рамках одного пользователя:
 * устройство A отправляет изменения, устройство B их забирает, а A не
 * получает свои же только что отправленные записи (cursor корректен).
 */

/**
 * @param array<string, mixed> $payload
 * @return array<string, mixed>
 */
function pushChange(string $deviceUuid, string $entityType, string $uuid, array $payload, string $updatedAt): array
{
    return [
        'device_uuid' => $deviceUuid,
        'device_name' => 'Device',
        'changes' => [[
            'entity_type' => $entityType,
            'uuid' => $uuid,
            'operation' => 'create',
            'payload' => $payload,
            'updated_at' => $updatedAt,
        ]],
    ];
}

it('device B pulls records created by device A', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $deviceA = (string) Str::uuid();
    $noteUuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', pushChange(
        $deviceA,
        'note',
        $noteUuid,
        ['title' => 'From A'],
        '2026-06-01T10:00:00Z',
    ))->assertOk();

    // Устройство B (тот же пользователь) ещё ничего не синхронизировало.
    $pulled = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();

    $uuids = array_column($pulled->json('data.notes'), 'uuid');
    expect($uuids)->toContain($noteUuid);

    $note = collect($pulled->json('data.notes'))->firstWhere('uuid', $noteUuid);
    expect($note['title'])->toBe('From A');
});

it('device A does not pull back its own just-pushed records using the returned cursor', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $deviceA = (string) Str::uuid();

    $push = $this->postJson('/api/v1/sync/push', pushChange(
        $deviceA,
        'note',
        (string) Str::uuid(),
        ['title' => 'From A'],
        '2026-06-01T10:00:00Z',
    ))->assertOk();

    $cursor = $push->json('data.cursor');
    expect($cursor)->toBeGreaterThan(0);

    // A продолжает с курсора, который вернул push: своих записей не получает.
    $this->getJson("/api/v1/sync/changes?since={$cursor}")
        ->assertOk()
        ->assertJsonCount(0, 'data.notes')
        ->assertJsonPath('meta.has_more', false);
});

it('device B sees A changes then advances past them on a second pull', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $deviceA = (string) Str::uuid();
    $noteUuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', pushChange(
        $deviceA,
        'note',
        $noteUuid,
        ['title' => 'From A'],
        '2026-06-01T10:00:00Z',
    ))->assertOk();

    $firstPull = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();
    $cursor = $firstPull->json('meta.cursor');

    expect(array_column($firstPull->json('data.notes'), 'uuid'))->toContain($noteUuid);

    $this->getJson("/api/v1/sync/changes?since={$cursor}")
        ->assertOk()
        ->assertJsonCount(0, 'data.notes');
});
