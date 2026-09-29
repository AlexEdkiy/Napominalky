<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

final class UploadAvatarRequest extends FormRequest
{
    /**
     * Пользователь загружает только собственный аватар
     * (auth:sanctum на маршруте).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Аватар отдаётся клиентам как data-URI, поэтому размер жёстко
     * ограничен (клиент ужимает изображение до ~256px перед отправкой).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:512'],
        ];
    }
}
