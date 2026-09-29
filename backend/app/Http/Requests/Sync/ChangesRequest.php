<?php

declare(strict_types=1);

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Валидация delta-pull запроса /sync/changes.
 *
 * since  — клиентский курсор (server_revision), с которого отдавать изменения.
 * limit  — размер страницы сквозной выдачи по всем сущностям.
 */
final class ChangesRequest extends FormRequest
{
    private const int DEFAULT_SINCE = 0;

    private const int DEFAULT_LIMIT = 200;

    private const int MAX_LIMIT = 200;

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
            'since' => ['nullable', 'integer', 'min:0'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_LIMIT],
        ];
    }

    public function since(): int
    {
        return (int) ($this->integer('since') ?: self::DEFAULT_SINCE);
    }

    public function limit(): int
    {
        return (int) ($this->integer('limit') ?: self::DEFAULT_LIMIT);
    }
}
