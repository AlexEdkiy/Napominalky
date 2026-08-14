<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ShoppingCategory;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShoppingListItem>
 */
class ShoppingListItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Элемент привязывается к новому списку, а user_id денормализуется из
     * user_id этого списка — так владелец элемента всегда совпадает с
     * владельцем списка (см. AddItemAction). uuid и server_revision —
     * трейты HasUuid/TracksSyncRevision при сохранении.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $list = ShoppingList::factory();

        return [
            'shopping_list_id' => $list,
            'user_id' => fn (array $attributes): int => ShoppingList::query()
                ->findOrFail($attributes['shopping_list_id'])
                ->user_id,
            'name' => fake()->words(2, true),
            'category' => fake()->randomElement(ShoppingCategory::cases()),
            'is_checked' => false,
            'status' => TaskStatus::New,
            'position' => 0,
        ];
    }

    public function checked(): static
    {
        return $this->state(fn (): array => ['is_checked' => true]);
    }

    /**
     * Выполненная строка задачи: инвариант done ⇔ is_checked.
     */
    public function done(): static
    {
        return $this->state(fn (): array => [
            'status' => TaskStatus::Done,
            'is_checked' => true,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::InProgress]);
    }

    public function postponed(): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::Postponed]);
    }

    public function forList(ShoppingList $list): static
    {
        return $this->state(fn (): array => [
            'shopping_list_id' => $list->id,
            'user_id' => $list->user_id,
        ]);
    }
}
