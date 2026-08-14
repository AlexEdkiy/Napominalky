<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShoppingList>
 */
class ShoppingListFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * uuid и server_revision проставляются трейтами HasUuid/TracksSyncRevision
     * при сохранении модели, поэтому здесь не задаются. type по умолчанию
     * 'goods' (DEFAULT колонки); статусные поля — в дефолтах TaskStatus::New /
     * false (осмысленны только для type='tasks').
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->words(2, true),
            'status' => TaskStatus::New,
            'status_is_manual' => false,
        ];
    }

    public function tasks(): static
    {
        return $this->state(fn (): array => ['type' => 'tasks']);
    }

    /**
     * Выполненная задача: инвариант done ⇔ is_completed, ручной статус
     * закреплён (как при явной установке пользователем).
     */
    public function done(): static
    {
        return $this->state(fn (): array => [
            'type' => 'tasks',
            'status' => TaskStatus::Done,
            'status_is_manual' => true,
            'is_completed' => true,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (): array => [
            'type' => 'tasks',
            'status' => TaskStatus::InProgress,
        ]);
    }

    public function postponed(): static
    {
        return $this->state(fn (): array => [
            'type' => 'tasks',
            'status' => TaskStatus::Postponed,
        ]);
    }
}
