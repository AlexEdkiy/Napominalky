<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShoppingListItemComment>
 */
class ShoppingListItemCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Комментарий привязывается к новой строке, user_id денормализуется из
     * user_id этой строки — владелец комментария всегда совпадает с
     * владельцем строки (см. AddItemCommentAction). uuid и server_revision —
     * трейты HasUuid/TracksSyncRevision при сохранении.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shopping_list_item_id' => ShoppingListItem::factory(),
            'user_id' => fn (array $attributes): int => ShoppingListItem::query()
                ->findOrFail($attributes['shopping_list_item_id'])
                ->user_id,
            'author_name' => fake()->name(),
            'body' => fake()->sentence(),
        ];
    }

    public function forItem(ShoppingListItem $item): static
    {
        return $this->state(fn (): array => [
            'shopping_list_item_id' => $item->id,
            'user_id' => $item->user_id,
        ]);
    }

    /**
     * Tombstone-комментарий (мягко удалён).
     */
    public function trashed(): static
    {
        return $this->state(fn (): array => [
            'deleted_at' => now(),
        ]);
    }
}
