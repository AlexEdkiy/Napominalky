<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\RecurrenceType;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reminder>
 */
class ReminderFactory extends Factory
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
            'notes' => fake()->optional()->paragraph(),
            'remind_at' => fake()->dateTimeBetween('+1 hour', '+1 month'),
            'recurrence' => RecurrenceType::None,
            'is_completed' => false,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (): array => [
            'is_completed' => true,
            'completed_at' => now(),
        ]);
    }

    public function recurring(): static
    {
        return $this->state(fn (): array => [
            'recurrence' => fake()->randomElement([
                RecurrenceType::Daily,
                RecurrenceType::Weekly,
                RecurrenceType::Monthly,
            ]),
        ]);
    }
}
