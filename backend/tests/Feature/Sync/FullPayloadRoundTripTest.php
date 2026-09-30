<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Sync\SyncEntities;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('preserves all writable sync fields and parent references through push and pull', function (bool $clearOptional): void {
    Sanctum::actingAs(User::factory()->create());
    $uuids = array_combine(SyncEntities::all(), array_map(fn (): string => (string) Str::uuid(), SyncEntities::all()));
    $time = '2026-09-30T12:30:00.000000Z';
    $payloads = [
        'note' => [
            'title' => 'Note',
            'body' => 'Body',
            'is_pinned' => true,
            'is_archived' => false,
            'color' => '#91d177',
        ],
        'shopping_list' => [
            'title' => 'Tasks',
            'deadline' => '2026-10-01',
            'reminder_at' => '2026-09-29T12:30:00.000000Z',
            'type' => 'tasks',
            'tags' => '["work"]',
            'is_completed' => false,
            'status' => 'in_progress',
            'status_is_manual' => true,
        ],
        'shopping_list_item' => [
            'shopping_list_uuid' => $uuids['shopping_list'],
            'name' => 'Task',
            'category' => 'other',
            'is_checked' => false,
            'status' => 'postponed',
            'position' => 3,
            'quantity' => 7,
            'deadline' => '2026-10-03',
            'reminder_at' => $time,
            'link' => 'https://example.com/task',
            'comment' => 'Legacy comment',
            'tags' => '["urgent","home"]',
        ],
        'shopping_list_item_comment' => [
            'shopping_list_item_uuid' => $uuids['shopping_list_item'],
            'author_name' => 'Author',
            'body' => 'Thread comment',
        ],
        'reminder' => [
            'title' => 'Reminder',
            'notes' => 'Details',
            'remind_at' => $time,
            'recurrence' => 'weekly',
            'is_completed' => true,
            'completed_at' => $time,
            'snoozed_until' => $time,
            'source_uuid' => $uuids['note'],
            'source_type' => 'note',
        ],
    ];
    $device = (string) Str::uuid();
    $push = function (array $payloads, string $operation, string $updatedAt) use ($uuids, $device): void {
        $changes = [];
        foreach ($payloads as $type => $payload) {
            $changes[] = [
                'entity_type' => $type,
                'uuid' => $uuids[$type],
                'operation' => $operation,
                'payload' => $payload,
                'updated_at' => $updatedAt,
            ];
        }
        $this->postJson('/api/v1/sync/push', ['device_uuid' => $device, 'changes' => $changes])
            ->assertOk()->assertJsonCount(5, 'data.applied')->assertJsonCount(0, 'data.conflicts');
    };
    $push($payloads, 'create', '2026-09-30T10:00:00Z');

    if ($clearOptional) {
        $payloads['note']['color'] = null;
        $payloads['shopping_list']['tags'] = null;
        $payloads['shopping_list']['deadline'] = null;
        $payloads['shopping_list']['reminder_at'] = null;
        foreach (['deadline', 'reminder_at', 'link', 'comment', 'tags'] as $field) {
            $payloads['shopping_list_item'][$field] = null;
        }
        $payloads['shopping_list_item']['quantity'] = 1;
        foreach (['notes', 'completed_at', 'snoozed_until', 'source_uuid', 'source_type'] as $field) {
            $payloads['reminder'][$field] = null;
        }
        $payloads['reminder']['is_completed'] = false;
        $push($payloads, 'update', '2026-09-30T11:00:00Z');
    }

    $pulled = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();
    foreach ($payloads as $type => $payload) {
        $row = collect($pulled->json('data.'.SyncEntities::pluralKey($type)))->firstWhere('uuid', $uuids[$type]);
        expect($row)->not->toBeNull();
        // New whitelisted fields must be represented in this round-trip fixture.
        expect(array_diff(SyncEntities::fieldsFor($type), array_keys($payload)))->toBe([]);
        foreach ($payload as $key => $value) {
            expect($row)->toHaveKey($key);
            expect($row[$key])->toBe($value, "{$type}.{$key}");
        }
        expect($row)->not->toHaveKeys(['id', 'user_id', 'server_revision', 'shopping_list_id', 'shopping_list_item_id']);
    }
})->with(['populated fields' => false, 'explicit clearing' => true]);
