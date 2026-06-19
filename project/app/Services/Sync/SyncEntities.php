<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * Реестр синхронизируемых сущностей: entity_type → Eloquent-модель и
 * множественный ключ выдачи.
 *
 * Источник истины для двусторонней синхронизации (docs/architecture
 * «Часть 0.2»). Строки entity_type совпадают с теми, что использует
 * мобильный outbox; множественные ключи — с ключами тела ответа
 * GET /sync/changes. Переиспользуется SyncPullService (DEV-10) и
 * SyncPushService (DEV-11).
 */
final class SyncEntities
{
    /**
     * entity_type → класс Eloquent-модели.
     *
     * @var array<string, class-string<Model>>
     */
    public const MAP = [
        'note' => Note::class,
        'shopping_list' => ShoppingList::class,
        'shopping_list_item' => ShoppingListItem::class,
        'reminder' => Reminder::class,
    ];

    /**
     * entity_type → множественный ключ выдачи (ключ в теле ответа sync).
     *
     * @var array<string, string>
     */
    private const PLURAL = [
        'note' => 'notes',
        'shopping_list' => 'shopping_lists',
        'shopping_list_item' => 'shopping_list_items',
        'reminder' => 'reminders',
    ];

    /**
     * entity_type → доменные колонки, принимаемые из клиентского payload при
     * push (whitelist). Сюда НЕ входят id, user_id, uuid, server_revision и
     * временные метки — они выставляются сервером (см. SyncPushService).
     * Состав согласован с публичными полями SyncSerializer. Поле
     * shopping_list_uuid — публичная ссылка на родителя, отдельно
     * резолвится в shopping_list_id и в этот список не включается.
     *
     * @var array<string, list<string>>
     */
    public const FIELDS = [
        'note' => ['title', 'body', 'is_pinned', 'is_archived', 'color'],
        'shopping_list' => ['title'],
        'shopping_list_item' => ['name', 'category', 'is_checked', 'position'],
        'reminder' => [
            'title',
            'notes',
            'remind_at',
            'recurrence',
            'is_completed',
            'completed_at',
            'snoozed_until',
            'source_uuid',
            'source_type',
        ],
    ];

    /**
     * Все известные типы сущностей в порядке объявления.
     *
     * @return list<string>
     */
    public static function all(): array
    {
        return array_keys(self::MAP);
    }

    /**
     * Класс модели для типа сущности.
     *
     * @return class-string<Model>
     *
     * @throws InvalidArgumentException на неизвестном типе
     */
    public static function modelFor(string $entityType): string
    {
        return self::MAP[$entityType]
            ?? throw new InvalidArgumentException("Unknown sync entity type: {$entityType}");
    }

    /**
     * Множественный ключ выдачи для типа сущности ('note' → 'notes').
     *
     * @throws InvalidArgumentException на неизвестном типе
     */
    public static function pluralKey(string $entityType): string
    {
        return self::PLURAL[$entityType]
            ?? throw new InvalidArgumentException("Unknown sync entity type: {$entityType}");
    }

    /**
     * Поддерживается ли тип сущности синхронизацией.
     */
    public static function supports(string $entityType): bool
    {
        return isset(self::MAP[$entityType]);
    }

    /**
     * Whitelist доменных колонок, принимаемых из payload для типа сущности.
     *
     * @return list<string>
     *
     * @throws InvalidArgumentException на неизвестном типе
     */
    public static function fieldsFor(string $entityType): array
    {
        return self::FIELDS[$entityType]
            ?? throw new InvalidArgumentException("Unknown sync entity type: {$entityType}");
    }
}
