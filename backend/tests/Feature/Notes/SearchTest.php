<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('finds notes matching the search term by title', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $match = Note::factory()->for($user)->create([
        'title' => 'Buy groceries today',
        'body' => 'milk and bread',
    ]);
    Note::factory()->for($user)->create([
        'title' => 'Call the dentist',
        'body' => 'schedule cleaning',
    ]);

    $response = $this->getJson('/api/v1/notes?search=groceries')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.uuid'))->toBe($match->uuid);
});

it('finds notes matching the search term by body', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $match = Note::factory()->for($user)->create([
        'title' => 'Weekend plans',
        'body' => 'remember to water the plants',
    ]);
    Note::factory()->for($user)->create([
        'title' => 'Work meeting',
        'body' => 'prepare slides',
    ]);

    $response = $this->getJson('/api/v1/notes?search=plants')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.uuid'))->toBe($match->uuid);
});

it('returns no results for an irrelevant search term', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    Note::factory()->for($user)->create([
        'title' => 'Buy groceries',
        'body' => 'milk and bread',
    ]);

    $this->getJson('/api/v1/notes?search=spaceship')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});
