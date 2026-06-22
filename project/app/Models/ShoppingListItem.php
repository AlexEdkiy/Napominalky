<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ShoppingCategory;
use App\Models\Concerns\HasUuid;
use App\Models\Concerns\TracksSyncRevision;
use Database\Factories\ShoppingListItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShoppingListItem extends Model
{
    /** @use HasFactory<ShoppingListItemFactory> */
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
        'name',
        'category',
        'is_checked',
        'position',
        'quantity',
        'deadline',
    ];

    /**
     * Маршрутизация и сериализация ведутся по публичному uuid, не по id.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return BelongsTo<ShoppingList, $this>
     */
    public function shoppingList(): BelongsTo
    {
        return $this->belongsTo(ShoppingList::class);
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
            'category' => ShoppingCategory::class,
            'is_checked' => 'boolean',
            'position' => 'integer',
            'quantity' => 'integer',
            'deadline' => 'immutable_date',
            'server_revision' => 'integer',
        ];
    }
}
