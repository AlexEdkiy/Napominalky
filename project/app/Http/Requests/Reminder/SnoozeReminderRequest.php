<?php

declare(strict_types=1);

namespace App\Http\Requests\Reminder;

use App\Enums\SnoozeOption;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SnoozeReminderRequest extends FormRequest
{
    /**
     * Авторизация откладывания делегируется ReminderPolicy в контроллере.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'snooze' => ['required', Rule::enum(SnoozeOption::class)],
        ];
    }
}
