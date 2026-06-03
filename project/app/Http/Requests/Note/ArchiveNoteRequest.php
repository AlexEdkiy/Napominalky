<?php

declare(strict_types=1);

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;

final class ArchiveNoteRequest extends FormRequest
{
    /**
     * Авторизация архивирования делегируется NotePolicy в контроллере.
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
            'is_archived' => ['required', 'boolean'],
        ];
    }
}
