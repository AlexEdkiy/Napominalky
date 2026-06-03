<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\TracksSyncRevision;
use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;
    use HasUuid;
    use SoftDeletes;
    use TracksSyncRevision;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'body',
        'is_pinned',
        'is_archived',
    ];

    /**
     * Маршрутизация и сериализация ведутся по публичному uuid, не по id.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param Builder<Note> $query
     * @return Builder<Note>
     */
    public function scopePinned(Builder $query): Builder
    {
        return $query->where('is_pinned', true);
    }

    /**
     * @param Builder<Note> $query
     * @return Builder<Note>
     */
    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('is_archived', true);
    }

    /**
     * Активные заметки: не в архиве (мягко удалённые исключает SoftDeletes).
     *
     * @param Builder<Note> $query
     * @return Builder<Note>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_archived', false);
    }

    /**
     * Полнотекстовый поиск по title и body через хранимый ts_search (GIN).
     *
     * plainto_tsquery разбирает пользовательский ввод как обычный текст и
     * безопасно экранирует операторы tsquery, поэтому пользовательский ввод
     * передаётся параметром без риска инъекций.
     *
     * @param Builder<Note> $query
     * @return Builder<Note>
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->whereRaw(
            "ts_search @@ plainto_tsquery('simple', ?)",
            [$term],
        );
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'is_archived' => 'boolean',
            'server_revision' => 'integer',
        ];
    }
}
