# REVIEW-1 — ревью августовских фич (sync, статусы, комментарии)

- **Исполнитель:** code-reviewer (read-only)
- **Дата:** 2026-09-29
- **Срез:** `main` @ 7273d6b; область — backend `app/Services/Sync/*`, статусы/комментарии, snooze; mobile `services/sync/*`, уведомления; web `reminderGrouping`, `LkReminderFormDialog`, `useReminders`
- **Итог:** 1 Critical (исправлен — DEV-23), 4 Warning (MBE-21, MOB-65 исправлены; WEB-49 и отклонение useReminders — в бэклог), 3 Suggestion

---

## Ревью кода: REVIEW-1

### Резюме
Ревью покрыло август-сентябрьские фичи «наибольшего риска»: sync-движок (push/pull/LWW/tombstones), инвариант статусов задач и комментарии-тред — на backend, mobile и web срезах main. Основная архитектура (LWW по updated_at, идемпотентность по uuid, скоупинг по user_id в push/pull, Policy-проверки, whitelist полей) реализована аккуратно и симметрично между backend/mobile. Найден один воспроизведённый Critical-баг устойчивости синка (несимметричная защита от orphan-записи между `shopping_list_item` и `shopping_list_item_comment`), который полностью блокирует sync пользователя навсегда одной «плохой» записью в outbox. Остальные замечания — Warning/Suggestion (хрупкое сравнение LWW-таймстампов на клиенте, отсутствие лимита batch на push, превышение лимитов длины компонента Vue, отклонение от стандарта состояния на web).

### Critical (блокирует мерж)

- **backend/app/Services/Sync/SyncChangeApplier.php:52-87 (метод `create()`)** — отсутствует guard от orphan-записи для `ShoppingListItem`, аналогичный тому, что явно реализован для `ShoppingListItemComment` (строка 70). Колонка `shopping_list_items.shopping_list_id` — `NOT NULL`. Если клиент пушит `create`/`update` для `shopping_list_item` с payload, где `shopping_list_uuid` отсутствует или не резолвится (чужой/неизвестный/утерянный uuid — сценарий, который уже дважды случался в проекте, см. `tests/Feature/Sync/SyncPushRobustnessTest.php`), `SyncParentResolver::resolveItemParent` не трогает FK, и модель сохраняется с `shopping_list_id = NULL`.

  Подтверждено end-to-end: push `shopping_list_item` с несуществующим `shopping_list_uuid` → **HTTP 500**, `SQLSTATE[23502]: Not null violation ... "shopping_list_id"`.

  Поскольку весь батч оборачивается в `DB::transaction()` (`SyncPushService.php:44-91`), одна такая запись **откатывает весь push целиком** — ни одно изменение не применяется.

  **Усиление на mobile**: `pushChanges.ts:43-63` при ошибке push не очищает outbox (корректно), но на каждую попытку синка снова отправляется весь outbox от начала (`orderBy(asc(syncOutbox.id))`), поломанная запись валит батч на каждой попытке. `syncEngine.ts:55-57` вызывает `pushChanges()` и `pullChanges()` последовательно без перехвата ошибки между ними — если push бросает, `pullChanges()` не вызывается. Итог: **одна некорректная запись в outbox навсегда блокирует и push, и pull для устройства** — до переустановки приложения / очистки локальной БД.

  **Исправление:** в `SyncChangeApplier::create()` добавить no-op guard для `ShoppingListItem` с `shopping_list_id === null` (как для комментария). Дополнительно рассмотреть per-change try/catch в `SyncPushService::push()`, чтобы ошибка одной записи не откатывала весь батч (точечные guard'ы уже показали себя хрупкими: null-title, camelCase, orphan-comment, orphan-item).

### Warning (рекомендуется исправить)

- **mobile/src/services/sync/applyChanges.ts:43** — LWW-сравнение — **строковое** сравнение ISO-таймстампов (`server.updated_at < localUpdatedAt`). Backend отдаёт `updated_at` с микросекундами (`2026-09-29T07:53:21.582043Z`), клиентские записи — с миллисекундами (`new Date().toISOString()` в `baseRepo.ts:27`). `'Z'` лексикографически больше любой цифры: если локальная 3-значная дробная часть — префикс серверной 6-значной (более новое серверное обновление в той же миллисекунде), сравнение ошибочно даёт `server < local` и **пропускает более новую серверную запись**. Окно — доли миллисекунды, но сравнение через строки при разной точности принципиально ненадёжно. **Исправление:** `new Date(x).getTime()`.

- **backend/app/Http/Requests/Sync/PushRequest.php:37** — `'changes' => ['present', 'array']` без `max:`. Произвольно большой батч обрабатывается в одной длинной `DB::transaction()`. Добавить `max:` (например 500) согласованно с размером outbox-батча на клиенте.

- **web/src/components/lk/LkReminderFormDialog.vue** — 637 строк (script ~294, template ~130, style ~200), кратно превышает лимит `docs/05-typescript-vue.md` (≤ 200). Логика пикеров даты/времени (`applyCustomDate`/`applyCustomTime`/`buildRemindAtIso`/`resetForm`, строки 85-210) — кандидат на composable `useReminderDatePicker`, стили — в общий модуль.

- **web/src/composables/useReminders.ts** — серверное состояние вручную через `ref` + try/catch (осознанно, см. комментарий), что противоречит `docs/05-typescript-vue.md` («TanStack Query для серверного состояния»). Не баг, архитектурное отклонение; учесть при следующем рефакторинге ЛК.

### Suggestion (по желанию)

- **backend/app/Http/Resources/Sync/SyncChangesResource.php:18-25** — докблок `@property` не содержит `shopping_list_item_comments`, хотя код читает его на строке 62.
- **backend/app/Services/Sync/SyncChangeApplier.php:211-220 (`parentIsTasks`) и :234 (`recalculateParent`)** — запросы к `ShoppingList` без `where('user_id', …)`. Сейчас безопасно (FK выставляет только user-скоупленный `SyncParentResolver`), но стоит добавить явный скоуп в defensive-стиле.
- **web/src/components/lk/LkReminderFormDialog.vue:250** — `notes: form.notes || null` не тримит пробелы (в отличие от `title`).

### Пройдено
- [x] Авторизация — Policy-проверки на контроллерах `ShoppingList`, `ShoppingListItem`, `ShoppingListItemComment`, `Reminder`/`snooze` скоупят по `user_id`; sync push/pull — по `$user` из Sanctum-токена, не из payload. IDOR не найден, включая вложенные роуты с `scopeBindings()`.
- [x] Инварианты `status ⇔ is_checked/is_completed` — симметричны на backend (`normalizeListStatus/normalizeItemStatus`, `RecalculateListStatusAction`) и mobile (`shoppingListsRepo.ts`), покрыты `TaskStatusSyncTest.php`.
- [x] Идемпотентность push по uuid (upsert через `withTrashed()`) — подтверждена `SyncPushServiceTest.php`.
- [x] API Resources sync не экспонируют внутренний `id`/`user_id`.
- [ ] Устойчивость push-батча к «грязным» записям — не пройдено (см. Critical; закрыто DEV-23).

### Затронутые файлы
backend: `app/Services/Sync/{SyncChangeApplier,SyncPushService,SyncPullService,SyncParentResolver,ConflictResolver,SyncSerializer,SyncEntities}.php`, `app/Enums/TaskStatus.php`, `app/Actions/ShoppingList/RecalculateListStatusAction.php`, `app/Services/ShoppingList/ListStatusResolver.php`, `app/Actions/ShoppingListItem/*.php`, `app/Http/Controllers/Sync/*`, `app/Http/Requests/Sync/*`, `app/Http/Controllers/Reminders/SnoozeController.php`, `app/Http/Requests/Reminder/SnoozeReminderRequest.php`, `app/Http/Resources/Sync/*.php`, миграция `create_shopping_list_items_table`.
mobile: `src/services/sync/{applyChanges,pushChanges,pullChanges,syncEngine,backoff,mappers,syncMeta}.ts`, `src/db/repositories/{baseRepo,shoppingListsRepo,itemCommentsRepo}.ts`, `src/services/notifications.ts`, `src/hooks/useNotifications.ts`.
web: `src/utils/reminderGrouping.ts`, `src/components/lk/LkReminderFormDialog.vue`, `src/composables/useReminders.ts`.
