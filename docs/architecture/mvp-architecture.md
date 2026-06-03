# Архитектурный план MVP «Напоминалки»

**Версия:** 1.0  
**Дата создания:** 2026-06-03  
**Статус:** Согласовано  
**Архитектор:** ARCH-1  

---

## Согласованные решения

1. **Локальное хранилище:** expo-sqlite + Drizzle ORM (TypeScript-first, явные миграции, типобезопасный) — ПРИНЯТО.
2. **Sync-стратегия:** delta sync + outbox + Last-Write-Wins (LWW) + tombstones + server_revision-курсор — ПРИНЯТО.
3. **Архитектура уведомлений:** отказ от FCM/серверного push; только локальные уведомления через expo-notifications (планирование на устройстве, офлайн) — ПРИНЯТО.
4. **JSON-контракт:** snake_case без трансформационного слоя; источник истины — API Resource (backend) — ПРИНЯТО.
5. **Веб-админка:** Vue 3 без Orchid Platform — ПРИНЯТО.
6. **Новые сущности БД:** users(+uuid/sync_enabled/is_admin), devices, notes, shopping_lists, shopping_list_items, reminders, sync_conflicts + sync_revision sequence — ПРИНЯТО.

---

# Архитектурный план MVP (ARCH-1)

Local-first приложение: заметки, списки покупок, напоминания, календарь. Данные сначала на устройстве, облачная синхронизация — добровольна. Документ покрывает все 10 групп фич и три слоя (Backend Laravel, Mobile RN+Expo, Web Vue 3).

## Часть 0. Сквозные архитектурные решения

### 0.1. Локальное хранилище (Mobile): expo-sqlite + Drizzle ORM (СОГЛАСОВАНО)
Выбран `expo-sqlite` (Expo SDK, доверенный вендор) + Drizzle ORM (типобезопасный TS-first ORM, явные миграции). Отклонены: WatermelonDB (нестандартный ORM на decorators, хуже типизируется в strict TS, негибкий под кастомный LWW+бэкап) и op-sqlite (слишком низкоуровневый). Sync пишем сами — он в любом случае кастомный. Зависимости `drizzle-orm`/`drizzle-kit` — внешние, проверить порог загрузок при установке.

### 0.2. Sync-стратегия (delta sync + outbox + LWW + tombstones) (СОГЛАСОВАНО)
Клиент — источник истины; сервер — реплика для бэкапа/мульти-девайс. Sync двусторонний, delta-based.
- Идентификаторы: client-generated UUID v4 как публичный ключ `uuid`; сервер хранит внутренний `id BIGSERIAL` + `uuid UUID UNIQUE`. Идемпотентность push — upsert по `uuid`.
- Поля синхронизации в каждой синхронизируемой таблице (сервер и SQLite): `uuid`, `updated_at` (LWW-версия), `deleted_at` (tombstone), `server_revision` (BIGINT, только сервер — монотонный курсор).
- Курсор: сервер ведёт монотонный `server_revision` через sequence на изменение любой синхронизируемой записи (выставляется в Action/Observer). Клиент хранит `last_pulled_revision`. Надёжнее `updated_at` (нет коллизий времени/часов устройства).
- PULL `GET /api/v1/sync/changes?since={revision}`: все записи пользователя с `server_revision > since` (включая tombstones), сгруппированные по типам сущностей + новый `cursor` + `has_more`. Клиент применяет LWW по `updated_at`.
- PUSH `POST /api/v1/sync/push`: батч из outbox `{entity_type, uuid, operation, payload, updated_at}`. Сервер: upsert по `uuid`, LWW по `updated_at`. Конфликт: если серверная `updated_at` новее → серверная побеждает, но клиентская спорная запись сохраняется в `sync_conflicts` (FR-37) и возвращается в `conflicts[]`. Ответ: `{applied, conflicts, cursor}`.
- Outbox (mobile): таблица `sync_outbox` в SQLite. Любая мутация пишет запись (entity_type, uuid, operation, payload snapshot, attempts). Воркер `useSyncEngine` при сети+включённой синхронизации: push → pull → очистка применённых, backoff при ошибке (FR-36).
- Восстановление на новом устройстве (FR-35): логин → `last_pulled_revision=0` → full pull.
- Trade-off LWW: прост, предсказуем, может «потерять» одновременную правку → митигация бэкапом в `sync_conflicts` без автоудаления (FR-37).

### 0.3. Связь типов backend ↔ frontend (СОГЛАСОВАНО)
JSON-поля — `snake_case` (по docs/07-api.md и примерам RN-типов docs/04). Без слоя трансформации. Источник истины формы — API Resource (backend); mobile `src/types/` и web `src/types/` зеркалят Resource поле-в-поле. Локальная SQLite-схема (Drizzle) — отдельный слой, маппится на API-тип в sync-адаптере.

### 0.4. Версионирование, пагинация, ошибки
Префикс `/api/v1/`. Пагинация Laravel (15 по умолчанию, `?page&per_page`). Формат ответа/ошибок по docs/07-api.md (`data`/`meta`/`links`; `422` с `errors`). Sync-эндпоинты — курсорная пагинация (`has_more`/`cursor`).

### 0.5. Уведомления: только локальные (СОГЛАСОВАНО)
docs/07-api.md описывал FCM/серверный push — для MVP исключён. Используем `expo-notifications` (планирование на устройстве, офлайн, FR-26). Эндпоинт `devices` переосмыслен под мульти-девайс sync (`device_uuid`, `name`, `last_synced_revision`), не FCM.

### 0.6. Версии стека
PHP 8.5+, Laravel 12+, PostgreSQL 17+, Sanctum, Redis 7+, Pest. RN 0.76+, Expo SDK 52+, Expo Router 4+, TanStack Query 5+, Zustand 5+, expo-sqlite + Drizzle, expo-notifications, expo-calendar, expo-local-authentication, expo-secure-store. Vue 3.5+, TS 5+, Vite 6+, Pinia, Vue Router 4, Vitest.

### 0.7. Общий sync-контракт таблиц
Все доменные таблицы (`notes`, `shopping_lists`, `shopping_list_items`, `reminders`) наследуют: `id BIGSERIAL PK`, `uuid UUID NOT NULL UNIQUE`, `user_id BIGINT NOT NULL FK→users(id) ON DELETE CASCADE`, доменные поля, `server_revision BIGINT NOT NULL`, `created_at`, `updated_at`, `deleted_at NULL`. Индексы: `{table}_user_id_index`, `{table}_user_id_server_revision_index`, `{table}_uuid_unique`.

## Группа 1. Auth / Доступ (FR-1..FR-4, FR-42)
Схема: `users` (+ uuid UUID unique, name nullable, email unique, password, sync_enabled bool default false, is_admin bool default false, soft deletes), `personal_access_tokens` (Sanctum), `devices` (id, uuid unique=device_uuid, user_id FK, name, last_synced_revision bigint default 0, last_synced_at null). Гостевой режим: данные в SQLite без user_id, «усыновляются» при первом push после логина.
API: `POST /api/v1/auth/register` {name,email,password,password_confirmation}→201 {token,token_type,user}; `POST /api/v1/auth/login` {email,password,device_name?}→200 (throttle 5/min); `DELETE /api/v1/auth/logout`→204 auth (локальные данные не трогаются); `GET /api/v1/auth/me`→200 auth; `DELETE /api/v1/account`→204 auth (каскад + revoke токены, FR-42).
Backend (DEV): User, Device модели; RegisterData/LoginData DTO (readonly); RegisterUserAction/IssueTokenAction/DeleteAccountAction; миграции users(+uuid/sync), devices; фабрики.
MBE: RegisterController/LoginController/LogoutController/MeController (__invoke), Account/DeleteAccountController; RegisterRequest/LoginRequest; UserResource; routes v1.
MOB: (auth)/login.tsx,register.tsx; (onboarding)/index.tsx; lock.tsx; authStore (token в secure-store, user, guestMode, syncEnabled); useAuth; authApi; client.ts (axios+interceptors); types/auth,api; constants/QueryKeys,Config.
WEB: auth/LoginView,RegisterView; lk/AccountView; authStore (Pinia); useAuth; authApi/client; router/guards; types/auth,api.

## Группа 2. Заметки (FR-5..FR-11)
Схема Backend `notes`: title varchar(255) NOT NULL, body text NULL, is_pinned bool default false, is_archived bool default false, + sync-контракт, ts_search TSVECTOR GENERATED (title A + body B). Индексы: user_id, user_id+server_revision, GIN(ts_search), частичный (user_id) WHERE is_pinned AND deleted_at IS NULL. SQLite: те же поля, поиск LIKE/FTS5.
API: `GET /notes?page&per_page&filter[archived]&search&sort`; `POST /notes` {uuid,title,body?}→201; `GET /notes/{uuid}`; `PUT /notes/{uuid}` {title?,body?,is_pinned?,is_archived?}; `DELETE /notes/{uuid}`→204 (soft); `POST /notes/{uuid}/pin` {is_pinned}; `POST /notes/{uuid}/archive` {is_archived}. Автосохранение (FR-7) и удаление с подтверждением (FR-8) — клиентское (debounce PUT).
Backend (DEV): HasUuid trait (генерация uuid), Note модель (scopes pinned/archived/active/search, casts); NoteData; NotePolicy; Note Actions (Create/Update/Delete/TogglePin/ToggleArchive); миграция; factory.
MBE: Notes Index/Store/Show/Update/Destroy/Pin/Archive контроллеры; StoreNoteRequest/UpdateNoteRequest/IndexNoteRequest; NoteResource; routes.
MOB: (tabs)/index.tsx (Главная); notes/new.tsx,[uuid].tsx; db/schema/notes.ts; db/repositories/notesRepo.ts (local CRUD+outbox); useNotes; components/notes/{NoteCard,NoteForm}; types/note.
WEB: lk/notes/NotesListView,NoteEditView; useNotes; notesApi; types/note; components/notes/NoteCard.

## Группа 3. Списки покупок / чек-листы (FR-12..FR-18)
Схема Backend `shopping_lists`: title varchar(255) + sync-контракт. `shopping_list_items`: shopping_list_id FK→shopping_lists(id) ON DELETE CASCADE, user_id FK (денорм для sync), name varchar(255), category varchar(20) default 'other' (enum products/household/pharmacy/other), is_checked bool default false, position int default 0, + sync-контракт. Прогресс (checked/total) вычисляется. SQLite зеркально, поиск LIKE.
API: CRUD `/shopping-lists`; `GET/POST /shopping-lists/{uuid}/items`; `PUT/DELETE /shopping-lists/{uuid}/items/{itemUuid}`; `POST /shopping-lists/{uuid}/items/{itemUuid}/check` {is_checked}.
Backend (DEV): ShoppingList (relations items, scope active, withCount checked), ShoppingListItem; ShoppingCategory enum (+label()); ShoppingListData/ShoppingListItemData DTO; CreateList/UpdateList/DeleteList Actions; Items AddItem/UpdateItem/DeleteItem/CheckItem Actions; ShoppingListPolicy/ShoppingListItemPolicy; миграции; фабрики.
MBE: ShoppingLists Index/Store/Show/Update/Destroy; Items Index/Store/Update/Destroy/Check контроллеры; requests; ShoppingListResource/ShoppingListItemResource; routes.
MOB: (tabs)/lists.tsx; lists/new.tsx,[uuid].tsx; db/schema/shoppingLists,shoppingListItems; db/repositories/shoppingListsRepo; useShoppingLists,useShoppingListItems; components/lists/{ListCard,ItemRow,ProgressBar,QuickAddItem}; constants/ShoppingCategory; types/shoppingList.
WEB: lk/lists/ListsView,ListDetailView; useShoppingLists; shoppingListsApi; types/shoppingList; components/lists/{ListCard,ItemRow,ProgressBar}.

## Группа 4. Напоминания (FR-19..FR-25)
Схема Backend `reminders`: title varchar(255), notes text NULL, remind_at timestamptz NOT NULL, recurrence varchar(20) default 'none' (enum none/daily/weekly/monthly), is_completed bool default false, completed_at timestamptz NULL, snoozed_until timestamptz NULL, source_uuid uuid NULL, source_type varchar(20) NULL, + sync-контракт. Индексы: user_id+server_revision, user_id+remind_at, частичный (user_id,remind_at) WHERE NOT is_completed AND deleted_at IS NULL. Быстрые шаблоны времени (FR-20) — клиентская логика. SQLite: + локальный notification_id (не синхронизируется).
API: `GET /reminders?filter[status]&sort=remind_at&order`; `POST /reminders` {uuid,title,notes?,remind_at,recurrence?}→201; `GET/PUT/DELETE /reminders/{uuid}`; `POST /reminders/{uuid}/complete` (FR-24); `POST /reminders/{uuid}/snooze` {snooze:'10m'|'1h'} (FR-25).
Backend (DEV): Reminder модель (scopes pending/completed/dueBetween); RecurrenceType enum (+nextOccurrence()); SnoozeOption enum (+toInterval()); ReminderData; CreateReminder/UpdateReminder/DeleteReminder/CompleteReminder/SnoozeReminder Actions; ReminderPolicy; миграция; factory.
MBE: Reminders Index/Store/Show/Update/Destroy/Complete/Snooze контроллеры; StoreReminderRequest/UpdateReminderRequest/IndexReminderRequest/SnoozeReminderRequest; ReminderResource; routes.
MOB: reminders/new.tsx,[uuid].tsx; db/schema/reminders; db/repositories/remindersRepo; useReminders; components/reminders/{ReminderForm,QuickTimePresets,RecurrencePicker,SnoozeSheet}; utils/quickTime,recurrence; types/reminder.
WEB: lk/reminders/RemindersView,ReminderEditView; useReminders; remindersApi; types/reminder; components/reminders/ReminderCard.

## Группа 5. Уведомления (FR-26..FR-28) — Mobile-only, backend не затрагивается
FR-26 локальные уведомления планируются на устройстве при создании/изменении напоминания (триггер remind_at), офлайн. FR-27 deep link: payload {type:'reminder',uuid} → expo-router на reminders/[uuid]. FR-28 пропущенные: при старте сверять remind_at<now && !is_completed → секция «Пропущенные» на Главной.
MOB: services/notifications.ts (scheduleReminder/cancelReminder/handleResponse); useNotifications (разрешения, handler); services/deepLinks; app/_layout.tsx (подписка на notification response→router); stores/settingsStore (notifications_enabled).

## Группа 6. Local-first и офлайн (FR-29..FR-32) — фундамент Mobile + sync backend
Делается ДО репозиториев заметок/списков/напоминаний. SQLite служебные: `sync_outbox` (id, entity_type, entity_uuid, operation create/update/delete, payload json, updated_at, attempts int, created_at); `sync_meta` (key last_pulled_revision/last_synced_at, value).
Backend инфраструктура курсора: app/Models/Concerns/TracksSyncRevision.php (boot: на saving назначить server_revision из sequence); миграция sync_revision sequence.
MOB: db/client.ts (expo-sqlite+drizzle init); db/migrations (drizzle-kit); db/schema/index; db/schema/syncOutbox,syncMeta; db/repositories/baseRepo (общий CRUD + запись в outbox); services/netStatus (NetInfo); providers/DbProvider.

## Группа 7. Резервное копирование и синхронизация (FR-33..FR-37) — критический риск
Схема Backend `sync_conflicts`: id, uuid UUID unique, user_id FK, entity_type varchar(20), entity_uuid uuid, server_payload jsonb, client_payload jsonb (бэкап спорной записи FR-37), resolved_at timestamptz null, created_at. Индекс user_id.
API: `GET /sync/changes?since={revision}&limit=200`→ {data:{notes[],shopping_lists[],shopping_list_items[],reminders[]},meta:{cursor,has_more}} (включая tombstones); `POST /sync/push` {changes:[{entity_type,uuid,operation,payload,updated_at}],device_uuid}→{data:{applied[],conflicts[],cursor}}; `GET /sync/conflicts`→200; `PUT /devices/{uuid}` {name,last_synced_revision}; `DELETE /devices/{uuid}`→204.
Backend (DEV): Sync DTO (SyncChangeData,SyncPushResultData,ConflictData); SyncPullService (сбор изменений по revision по всем сущностям); SyncPushService (upsert по uuid, LWW, запись конфликтов); ConflictResolver (LWW + бэкап в sync_conflicts); RegisterDeviceAction; SyncConflict модель; миграция; factory. Лимит 300 строк → Pull и Push раздельно, entity_type→Model map отдельно.
MBE: Sync ChangesController/PushController/ConflictsController; Devices Update/Destroy контроллеры; PushRequest/ChangesRequest; SyncChangesResource/ConflictResource; DeviceResource; routes.
MOB: services/sync/syncEngine (push→pull→apply); pushChanges (outbox→POST→очистка); pullChanges (GET→apply LWW); applyChanges (LWW по updated_at, upsert/tombstone); backoff (FR-36); useSyncEngine (онлайн+ручной trigger); syncApi; types/sync.
WEB (только просмотр в ЛК): lk/sync/SyncView (статус, устройства, конфликты); useSync; syncApi; types/sync.

## Группа 8. Календарь (FR-38..FR-39)
FR-38 экспорт в системный календарь — Mobile-only (expo-calendar), backend не затрагивается. FR-39 месячный вид — использует существующий GET /reminders + локальную выборку SQLite по диапазону дат, новых эндпоинтов нет.
MOB: (tabs)/calendar.tsx (месячный вид); services/systemCalendar (expo-calendar: права, createEvent из reminder); useCalendar (выборка reminders по месяцу из SQLite); components/calendar/{MonthGrid,DayCell,DayRemindersSheet}; utils/dateRange.
WEB: lk/calendar/CalendarView (read-only месячный); useCalendar; components/calendar/MonthGrid.

## Группа 9. Безопасность (FR-40..FR-42)
FR-40 блокировка PIN/биометрией — Mobile-only: PIN-хеш в expo-secure-store, биометрия expo-local-authentication, lock.tsx, gate на старте/возврате из фона. FR-41 HTTPS — конфиг транспорта (OPS). FR-42 удаление аккаунта — в группе 1.
MOB: stores/lockStore (pinSet,isLocked,biometricEnabled); services/appLock (setPin/verifyPin через secure-store, biometric prompt); useAppLock; app/lock.tsx; providers/LockProvider (AppState→lock при фоне); app/settings/security.tsx.

## Группа 10. Настройки (FR-43..FR-45) + Админка
Клиентская (Zustand persist/Pinia + secure-store): notifications on/off, sync on/off, тема. Серверный флаг: `PATCH /api/v1/settings/sync` {sync_enabled}→200 (users.sync_enabled).
Backend (DEV): ToggleSyncAction; ToggleSyncController; ToggleSyncRequest; (reuse UserResource); is_admin в users (миграция в группе 1); AdminPolicy; Admin UsersIndex/UserShow контроллеры (читают users).
MBE: ToggleSyncController + request; Admin Users контроллеры; routes (admin middleware).
MOB: (tabs)/profile.tsx; settings/index.tsx; stores/settingsStore (notifications_enabled,sync_enabled,theme); useSettings; theme/ (ThemeProvider light/dark/system); components/settings/SettingRow.
WEB ЛК: lk/SettingsView; settingsStore; useSettings; useTheme.
WEB Админка (Vue, без Orchid — СОГЛАСОВАНО): admin/{UsersListView,UserDetailView,DashboardView}; router /admin с guard roles:['admin'].

## Сводный порядок выполнения
OPS (scaffolding) → DEV Auth + DEV sync-trait + MOB db-инфраструктура → домены (Notes ‖ Lists ‖ Reminders): DEV→MBE→(MOB‖WEB) → MOB Notifications/Calendar (после reminders) → Sync (DEV→MBE→MOB ‖ WEB, после всех доменных DEV) → MOB AppLock → Settings+Admin → TEST по группам → REVIEW‖SEC → DOC.
Критический путь: MOB db-инфраструктура блокирует все mobile-репозитории; sync зависит от всех доменных DEV-моделей.
