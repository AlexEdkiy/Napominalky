<?php

declare(strict_types=1);

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreNoteRequest extends FormRequest
{
    /**
     * Авторизация создания делегируется NotePolicy в контроллере.
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
            'uuid' => ['nullable', 'uuid', 'unique:notes,uuid'],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'is_pinned' => ['nullable', 'boolean'],
            'is_archived' => ['nullable', 'boolean'],
            'color' => ['nullable', 'string', Rule::in(['teal', 'coral', 'amber', 'purple'])],
        ];
    }
}
