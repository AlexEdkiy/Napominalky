<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RecurrenceType;
use App\Models\Concerns\HasUuid;
use App\Models\Concerns\TracksSyncRevision;
use Carbon\CarbonInterface;
use Database\Factories\ReminderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reminder extends Model
{
    /** @use HasFactory<ReminderFactory> */
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
        'notes',
        'remind_at',
        'recurrence',
        'source_uuid',
        'source_type',
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
     * Активные (невыполненные) напоминания.
     *
     * @param Builder<Reminder> $query
     * @return Builder<Reminder>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('is_completed', false);
    }

    /**
     * @param Builder<Reminder> $query
     * @return Builder<Reminder>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('is_completed', true);
    }

    /**
     * Напоминания со сроком срабатывания в интервале [$from, $to].
     *
     * @param Builder<Reminder> $query
     * @return Builder<Reminder>
     */
    public function scopeDueBetween(Builder $query, CarbonInterface $from, CarbonInterface $to): Builder
    {
        return $query->whereBetween('remind_at', [$from, $to]);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'remind_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
            'snoozed_until' => 'immutable_datetime',
            'recurrence' => RecurrenceType::class,
            'is_completed' => 'boolean',
            'server_revision' => 'integer',
        ];
    }
}
