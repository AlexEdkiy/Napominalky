<?php

declare(strict_types=1);

use App\Models\Device;
use App\Models\Note;
use App\Models\SyncConflict;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/**
 * Собирает валидное тело push-запроса с одним изменением заметки.
 *
 * @param array<string, mixed> $payload
 * @return array<string, mixed>
 */
function pushBody(
    string $uuid,
    array $payload,
    string $updatedAt,
    string $operation = 'create',
    ?string $deviceUuid = null,
): array {
    return [
        'device_uuid' => $deviceUuid ?? (string) Str::uuid(),
        'device_name' => 'iPhone',
        'changes' => [[
            'entity_type' => 'note',
            'uuid' => $uuid,
            'operation' => $operation,
            'payload' => $payload,
            'updated_at' => $updatedAt,
        ]],
    ];
}

it('returns 401 without a token', function (): void {
    $this->postJson('/api/v1/sync/push', pushBody((string) Str::uuid(), ['title' => 'X'], '2026-06-01T10:00:00Z'))
        ->assertUnauthorized();
});

it('creates a record and returns applied with the uuid', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();
    $clientTs = '2026-06-01T10:00:00Z';

    $response = $this->postJson(
        '/api/v1/sync/push',
        pushBody($uuid, ['title' => 'Hello', 'body' => 'World'], $clientTs),
    );

    $response->assertOk()
        ->assertJsonStructure(['data' => ['applied', 'conflicts', 'cursor']])
        ->assertJsonPath('data.applied', [$uuid])
        ->assertJsonPath('data.conflicts', []);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->user_id)->toBe($user->id)
        ->and($note->title)->toBe('Hello')
        ->and($note->updated_at->toISOString())
        ->toBe(CarbonImmutable::parse($clientTs)->toISOString());
});

it('applies an update when the client is newer (client wins)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create([
        'title' => 'Server',
        'updated_at' => CarbonImmutable::parse('2026-06-01T10:00:00Z'),
    ]);

    $this->postJson(
        '/api/v1/sync/push',
        pushBody($note->uuid, ['title' => 'Client'], '2026-06-02T10:00:00Z', 'update'),
    )
        ->assertOk()
        ->assertJsonPath('data.applied', [$note->uuid])
        ->assertJsonPath('data.conflicts', []);

    expect($note->fresh()->title)->toBe('Client')
        ->and(SyncConflict::count())->toBe(0);
});

it('records a conflict and keeps the server version when the client is older', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create([
        'title' => 'Server',
        'updated_at' => CarbonImmutable::parse('2026-06-05T10:00:00Z'),
    ]);

    $response = $this->postJson(
        '/api/v1/sync/push',
        pushBody($note->uuid, ['title' => 'StaleClient'], '2026-06-01T10:00:00Z', 'update'),
    )->assertOk();

    expect($response->json('data.applied'))->toBe([])
        ->and($response->json('data.conflicts'))->toHaveCount(1);

    expect($response->json('data.conflicts.0.entity_type'))->toBe('note')
        ->and($response->json('data.conflicts.0.entity_uuid'))->toBe($note->uuid)
        ->and($response->json('data.conflicts.0.server_payload.title'))->toBe('Server')
        ->and($response->json('data.conflicts.0.client_payload.title'))->toBe('StaleClient');

    expect($note->fresh()->title)->toBe('Server')
        ->and(SyncConflict::where('user_id', $user->id)->count())->toBe(1);
});

it('applies a delete operation as a tombstone', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $note = Note::factory()->for($user)->create([
        'updated_at' => CarbonImmutable::parse('2026-06-01T10:00:00Z'),
    ]);

    $this->postJson(
        '/api/v1/sync/push',
        pushBody($note->uuid, [], '2026-06-02T10:00:00Z', 'delete'),
    )
        ->assertOk()
        ->assertJsonPath('data.applied', [$note->uuid]);

    expect(Note::where('uuid', $note->uuid)->exists())->toBeFalse();
    $tombstone = Note::withTrashed()->where('uuid', $note->uuid)->firstOrFail();
    expect($tombstone->deleted_at)->not->toBeNull();
});

it('is idempotent: re-pushing the same change does not duplicate', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();
    $body = pushBody($uuid, ['title' => 'Once'], '2026-06-01T10:00:00Z');

    $this->postJson('/api/v1/sync/push', $body)->assertOk();
    $this->postJson('/api/v1/sync/push', $body)
        ->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    expect(Note::where('uuid', $uuid)->count())->toBe(1);
});

it('registers the source device with last_synced_revision equal to the cursor', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $deviceUuid = (string) Str::uuid();
    $uuid = (string) Str::uuid();

    $response = $this->postJson(
        '/api/v1/sync/push',
        pushBody($uuid, ['title' => 'X'], '2026-06-01T10:00:00Z', 'create', $deviceUuid),
    )->assertOk();

    $cursor = $response->json('data.cursor');
    expect($cursor)->toBeGreaterThan(0);

    $device = Device::where('uuid', $deviceUuid)->firstOrFail();
    expect($device->user_id)->toBe($user->id)
        ->and($device->name)->toBe('iPhone')
        ->and($device->last_synced_revision)->toBe($cursor);
});

it('returns 422 on an invalid entity_type', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $body = pushBody((string) Str::uuid(), ['title' => 'X'], '2026-06-01T10:00:00Z');
    $body['changes'][0]['entity_type'] = 'widget';

    $this->postJson('/api/v1/sync/push', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['changes.0.entity_type']);
});

it('returns 422 on an invalid operation', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $body = pushBody((string) Str::uuid(), ['title' => 'X'], '2026-06-01T10:00:00Z');
    $body['changes'][0]['operation'] = 'upsert';

    $this->postJson('/api/v1/sync/push', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['changes.0.operation']);
});

it('returns 422 on a non-uuid change uuid', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $body = pushBody('not-a-uuid', ['title' => 'X'], '2026-06-01T10:00:00Z');

    $this->postJson('/api/v1/sync/push', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['changes.0.uuid']);
});

it('returns 422 on a missing updated_at', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $body = pushBody((string) Str::uuid(), ['title' => 'X'], '2026-06-01T10:00:00Z');
    unset($body['changes'][0]['updated_at']);

    $this->postJson('/api/v1/sync/push', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['changes.0.updated_at']);
});

it('returns 422 when device_uuid is missing', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $body = pushBody((string) Str::uuid(), ['title' => 'X'], '2026-06-01T10:00:00Z');
    unset($body['device_uuid']);

    $this->postJson('/api/v1/sync/push', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['device_uuid']);
});
