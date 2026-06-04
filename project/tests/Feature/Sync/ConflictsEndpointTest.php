<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/**
 * Провоцирует конфликт через push: клиентский updated_at старше серверного,
 * поэтому серверная версия побеждает, а клиентская бэкапится в sync_conflicts.
 */
function provokeConflict(User $user): Note
{
    $note = Note::factory()->for($user)->create([
        'title' => 'Server',
        'updated_at' => CarbonImmutable::parse('2026-06-05T10:00:00Z'),
    ]);

    test()->postJson('/api/v1/sync/push', [
        'device_uuid' => (string) Str::uuid(),
        'changes' => [[
            'entity_type' => 'note',
            'uuid' => $note->uuid,
            'operation' => 'update',
            'payload' => ['title' => 'StaleClient'],
            'updated_at' => '2026-06-01T10:00:00Z',
        ]],
    ])->assertOk();

    return $note;
}

it('returns 401 without a token', function (): void {
    $this->getJson('/api/v1/sync/conflicts')->assertUnauthorized();
});

it('lists the users conflicts after a push conflict', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = provokeConflict($user);

    $this->getJson('/api/v1/sync/conflicts')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['uuid', 'entity_type', 'entity_uuid', 'server_payload', 'client_payload', 'created_at']],
        ])
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.entity_type', 'note')
        ->assertJsonPath('data.0.entity_uuid', $note->uuid)
        ->assertJsonPath('data.0.server_payload.title', 'Server')
        ->assertJsonPath('data.0.client_payload.title', 'StaleClient');
});

it('does not expose another users conflicts', function (): void {
    $other = User::factory()->create();
    Sanctum::actingAs($other);
    provokeConflict($other);

    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/sync/conflicts')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});
