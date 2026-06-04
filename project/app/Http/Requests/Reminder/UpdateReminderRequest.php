<?php

declare(strict_types=1);

namespace App\Http\Requests\Reminder;

use App\Enums\RecurrenceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateReminderRequest extends FormRequest
{
    /**
     * Авторизация обновления делегируется ReminderPolicy в контроллере.
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
            'title' => ['sometimes', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'remind_at' => ['sometimes', 'date'],
            'recurrence' => ['sometimes', Rule::enum(RecurrenceType::class)],
            'source_uuid' => ['nullable', 'uuid'],
            'source_type' => ['nullable', 'string', 'max:20'],
        ];
    }
}
