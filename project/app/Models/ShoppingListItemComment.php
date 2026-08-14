<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\Models\Concerns\TracksSyncRevision;
use Database\Factories\ShoppingListItemCommentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Комментарий треда к строке задачи (shopping_list_item).
 *
 * author_name — денормализованный снимок имени автора на момент написания;
 * user_id — денормализованный владелец (равен user_id строки), по нему
 * работает sync-фильтр pull. Тред заменяет legacy-поле comment строки
 * (двухфазный вывод — см. миграцию бэкфилла 2026_08_14_110100).
 */
class ShoppingListItemComment extends Model
{
    /** @use HasFactory<ShoppingListItemCommentFactory> */
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
        'author_name',
        'body',
    ];

    /**
     * Маршрутизация и сериализация ведутся по публичному uuid, не по id.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return BelongsTo<ShoppingListItem, $this>
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ShoppingListItem::class, 'shopping_list_item_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
