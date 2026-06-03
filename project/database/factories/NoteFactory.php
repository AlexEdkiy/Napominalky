<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * uuid и server_revision проставляются трейтами HasUuid/TracksSyncRevision
     * при сохранении модели, поэтому здесь не задаются.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'body' => fake()->optional()->paragraph(),
            'is_pinned' => false,
            'is_archived' => false,
        ];
    }

    public function pinned(): static
    {
        return $this->state(fn (): array => ['is_pinned' => true]);
    }

    public function archived(): static
    {
        return $this->state(fn (): array => ['is_archived' => true]);
    }
}
