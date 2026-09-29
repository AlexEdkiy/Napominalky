<?php

declare(strict_types=1);

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;

final class PinNoteRequest extends FormRequest
{
    /**
     * Авторизация закрепления делегируется NotePolicy в контроллере.
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
            'is_pinned' => ['required', 'boolean'],
        ];
    }
}
