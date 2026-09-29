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
     * Либо пресет `snooze` ('10m'|'1h'), либо своё время `snoozed_until`
     * (ISO-датавремя строго в будущем) — ровно одно из двух.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'snooze' => [
                'required_without:snoozed_until',
                'prohibits:snoozed_until',
                Rule::enum(SnoozeOption::class),
            ],
            'snoozed_until' => ['required_without:snooze', 'date', 'after:now'],
        ];
    }
}
