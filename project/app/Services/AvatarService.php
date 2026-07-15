<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Хранение аватаров на приватном диске `local` и выдача их
 * клиенту в виде data-URI (публичных URL у файлов нет — схема
 * деплоя не отдаёт /storage наружу).
 */
final class AvatarService
{
    private const string DISK = 'local';

    private const string DIRECTORY = 'avatars';

    /**
     * Сохраняет новый файл аватара как avatars/{user_uuid}.{ext},
     * предварительно удалив прежний файл пользователя.
     *
     * @return string относительный путь сохранённого файла
     */
    public function store(User $user, UploadedFile $file): string
    {
        $this->delete($user);

        $extension = mb_strtolower($file->getClientOriginalExtension());
        $filename = sprintf('%s.%s', $user->uuid, $extension !== '' ? $extension : 'jpg');

        $path = Storage::disk(self::DISK)->putFileAs(self::DIRECTORY, $file, $filename);

        return (string) $path;
    }

    /**
     * Удаляет текущий файл аватара пользователя (если есть).
     */
    public function delete(User $user): void
    {
        $path = $user->avatar_path;

        if ($path === null || $path === '') {
            return;
        }

        Storage::disk(self::DISK)->delete($path);
    }

    /**
     * Читает файл по относительному пути и возвращает
     * data:image/<mime>;base64,<...> либо null (нет пути / файла).
     */
    public function toDataUri(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $disk = Storage::disk(self::DISK);

        if (! $disk->exists($path)) {
            return null;
        }

        $contents = $disk->get($path);

        if ($contents === null || $contents === '') {
            return null;
        }

        return sprintf('data:%s;base64,%s', $this->mimeType($path), base64_encode($contents));
    }

    /**
     * MIME по расширению файла (файлы пишутся только через store()
     * после валидации mimes:jpeg,jpg,png,webp).
     */
    private function mimeType(string $path): string
    {
        $extension = mb_strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }
}
