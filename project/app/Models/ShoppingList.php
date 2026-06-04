<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\TracksSyncRevision;
use Database\Factories\ShoppingListFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShoppingList extends Model
{
    /** @use HasFactory<ShoppingListFactory> */
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
     * @return HasMany<ShoppingListItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ShoppingListItem::class);
    }

    /**
     * Активные списки (мягко удалённые исключает SoftDeletes).
     *
     * @param Builder<ShoppingList> $query
     * @return Builder<ShoppingList>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Прогресс списка (FR-15): число отмеченных и всего элементов.
     *
     * Подгружает агрегаты items_count и checked_items_count через withCount;
     * счётчики читаются как атрибуты модели после загрузки.
     *
     * @param Builder<ShoppingList> $query
     * @return Builder<ShoppingList>
     */
    public function scopeWithProgress(Builder $query): Builder
    {
        return $query
            ->withCount('items')
            ->withCount(['items as checked_items_count' => function (Builder $query): void {
                $query->where('is_checked', true);
            }]);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'server_revision' => 'integer',
        ];
    }
}
