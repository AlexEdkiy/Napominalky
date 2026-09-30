# Реестр задач

> Последнее обновление: 2026-09-30 (OPS-14 закрыта: production отделён от Git, CI прошёл, обязательные проверки main включены)
> Стандарт: `/home/vselug/workspace/Napominalky/docs/07-task-management.md`

## Счётчики

| Префикс | Последний ID | Исполнитель              |
| ------- | :----------: | ------------------------ |
| ARCH    | 4            | architect                 |
| DEV     | 25           | backend-developer         |
| MBE     | 23           | mobile-backend-developer  |
| MOB     | 68           | mobile-developer          |
| WEB     | 53           | web-developer             |
| TEST    | 19           | test-engineer             |
| UITEST  | 13           | ux-ui-test-engineer       |
| REVIEW  | 1            | code-reviewer             |
| SEC     | 1            | security-auditor          |
| OPS     | 14           | devops-engineer           |
| DOC     | 61           | technical-writer          |

## Сводка

Считаются записи со статусом; совместная запись нескольких ID — одна запись.

| Статус | Количество |
|--------|:----------:|
| Completed | 157 |
| In Progress | 0 |
| Pending | 6 |
| Blocked | 0 |
| Cancelled | 0 |

---

## Feature: Архитектура MVP

### ARCH-1: Спроектировать архитектуру всего MVP
- **Исполнитель:** architect
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** нет
- **Блокирует:** OPS-1, OPS-2, OPS-3, DEV-1, DEV-2, MOB-3
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`
- **Описание:** Спроектировать полную архитектуру MVP, включая: локальное хранилище (expo-sqlite + Drizzle), sync-стратегию (delta + outbox + LWW + tombstones + server_revision), 10 групп фич (Auth, Notes, ShoppingLists, Reminders, Notifications, LocalFirst, Sync, Calendar, Security, Settings+Admin). Охватить все три слоя: Backend Laravel, Mobile RN+Expo, Web Vue 3.
- **Реализация:** Прочитать требования в CLAUDE.md, проанализировать структуру проекта, определить схему БД, API-контракты, компоненты и хранилища для каждого слоя. Выделить критические решения, требующие согласования. Создать детальный план декомпозиции на задачи для остальных агентов.
- **Файлы:** `/home/vselug/workspace/Napominalky/docs/architecture/mvp-architecture.md`
- **Критерии приёмки:**
  - [x] Архитектурный документ содержит все 10 групп фич с деталями Backend/MBE/MOB/WEB
  - [x] Определена полная схема БД (users, devices, notes, shopping_lists, shopping_list_items, reminders, sync_conflicts + sync_revision sequence)
  - [x] API-контракты описаны для всех 7 групп эндпоинтов
  - [x] Sync-стратегия полностью задокументирована (идентификаторы, курсор, PULL/PUSH, outbox, LWW, tombstones, конфликты)
  - [x] Выделены 6 решений для согласования с пользователем
  - [x] Рекомендуемая декомпозиция на задачи содержит зависимости и критический путь
  - [x] Документ согласован с пользователем (статус: Согласовано)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Инфраструктура (OPS)

### OPS-1: Инициализировать Laravel 12 backend в backend/
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** DEV-1
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Инициализировать Laravel 12 приложение в `/home/vselug/workspace/Napominalky/backend/` с PHP 8.5+, PostgreSQL 17+, Redis 7+, Sanctum для API-аутентификации, Pest для тестов, Docker Compose для локальной разработки. Включить конфиг для HTTPS (FR-41).
- **Реализация:** composer create-project laravel/laravel project "^12.0"; установить Sanctum (php artisan install:api); конфиг PostgreSQL в .env; Docker Compose с PHP/PostgreSQL/Redis/Nginx; миграции и seeds; хук pre-commit; readme с инструкциями.
- **Файлы:** `backend/.env.example`, `backend/Dockerfile`, `backend/docker-compose.yml`, `backend/routes/api.php`, `backend/.php-cs-fixer.php` (если нужен)
- **Критерии приёмки:**
  - [x] composer install успешен (vendor/ установлен), routes/api.php с группой /api/v1
  - [x] Sanctum установлен и конфигурирован (laravel/sanctum ^4.0, миграция personal_access_tokens)
  - [x] PostgreSQL 17+ настроена в docker-compose.yml (db: postgres:17-alpine, DB_HOST=db)
  - [x] Redis 7+ настроена в docker-compose.yml (redis: redis:7-alpine, REDIS_HOST=redis)
  - [x] Pest готов к использованию (pestphp/pest ^3.8, tests/Pest.php)
  - [x] HTTPS-конфиг включён (docker/certs/selfsigned.* + nginx 8443)
  - [x] README.md содержит инструкции запуска
  - [x] Runtime-проверка: dev-образ собирается, `php artisan migrate` проходит против PostgreSQL 17 (исправлен Dockerfile: libpq-dev, opcache статически; убраны конфликтующие хостовые порты db/redis)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### OPS-2: Инициализировать Expo SDK 52 app в mobile/
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** MOB-1
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Инициализировать React Native + Expo SDK 52 приложение в `/home/vselug/workspace/Napominalky/mobile/` с TypeScript strict mode, Expo Router 4, TanStack Query 5, Zustand 5, Drizzle ORM, expo-sqlite, expo-notifications, expo-calendar, expo-local-authentication, expo-secure-store, axios, @react-native-community/netinfo. Включить конфиги для iOS/Android.
- **Реализация:** npx create-expo-app@latest mobile --template; установить зависимости (см. выше); TypeScript strict в tsconfig.json; Expo Router в app/_layout.tsx; QueryClient setup; .env.example с API_URL. eas.json для EAS Build.
- **Файлы:** `mobile/app.json`, `mobile/eas.json`, `mobile/tsconfig.json`, `mobile/package.json`, `mobile/.env.example`
- **Критерии приёмки:**
  - [x] npm install успешен (564 пакета, exit 0)
  - [x] npx expo config валиден (exit 0, все плагины разрешаются)
  - [x] TypeScript strict mode включён, tsc --noEmit проходит (exit 0)
  - [x] Expo Router 4 настроен (app/_layout.tsx, app/(tabs)/*, app/(auth)/*)
  - [x] Все зависимости установлены (tanstack-query, zustand, drizzle, expo-sqlite, notifications, calendar, local-auth, secure-store, axios, netinfo)
  - [x] .env.example содержит EXPO_PUBLIC_API_URL
  - [x] eas.json настроена для iOS и Android (development/preview/production)
  - [x] README.md содержит инструкции
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### OPS-3: Инициализировать Vue 3.5 + Vite 6 web в web/
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** WEB-1
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Инициализировать Vue 3.5 веб-приложение в `/home/vselug/workspace/Napominalky/web/` с Vite 6, TypeScript strict mode, Pinia, Vue Router 4, Vitest, axios. Включить конфиг для админка и личный кабинет маршрутов.
- **Реализация:** npm create vite@latest web -- --template vue-ts; установить Pinia (npm install pinia), Vue Router (npm install vue-router), axios; настроить tsconfig.json (strict: true); Vitest setup в vite.config.ts. Структура: src/{pages,components,stores,types,api}.
- **Файлы:** `web/vite.config.ts`, `web/tsconfig.json`, `web/package.json`, `web/.env.example`, `web/src/main.ts`
- **Критерии приёмки:**
  - [x] npm install успешен (node_modules, 151 пакет)
  - [x] dev-сервер настроен (vite.config.ts, скрипт dev)
  - [x] TypeScript strict mode включён, vue-tsc --noEmit проходит (exit 0)
  - [x] Pinia, Vue Router 4, axios установлены
  - [x] Vitest настроена, npm run test работает (5/5 тестов зелёные)
  - [x] .env.example содержит VITE_API_URL
  - [x] Структура src/ готова (pages, components, stores, types, api, composables, router)
  - [x] router/index.ts с секциями /admin, /lk + guards.ts + router.test.ts
  - [x] README.md содержит инструкции
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Auth / Доступ

### DEV-1: User/Device модели, миграции, DTO, Actions
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** OPS-1
- **Блокирует:** MBE-1, DEV-12
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать User и Device модели, миграции, DTO, Actions для базовой аутентификации. Поля User: id, uuid (unique), name (nullable), email (unique), password, sync_enabled (bool, default false), is_admin (bool, default false), soft deletes, timestamps. Поля Device: id, uuid (unique), user_id FK, name, last_synced_revision (bigint, default 0), last_synced_at (nullable), timestamps. Реализовать Actions: RegisterUserAction, IssueTokenAction, DeleteAccountAction.
- **Реализация:** Создать миграции create_users_table, create_devices_table. User модель с HasMany(Device), методами для работы с uuid. Device модель с BelongsTo(User). DTO: RegisterData (readonly props: name, email, password), LoginData (readonly props: email, password). Actions в app/Actions/{User,Device}/*.php. Фабрики: UserFactory, DeviceFactory.
- **Файлы:** `backend/database/migrations/*_create_users_table.php`, `backend/database/migrations/*_create_devices_table.php`, `backend/app/Models/User.php`, `backend/app/Models/Device.php`, `backend/app/Data/RegisterData.php`, `backend/app/Data/LoginData.php`, `backend/app/Actions/User/RegisterUserAction.php`, `backend/app/Actions/User/IssueTokenAction.php`, `backend/app/Actions/User/DeleteAccountAction.php`, `backend/database/factories/UserFactory.php`, `backend/database/factories/DeviceFactory.php`
- **Критерии приёмки:**
  - [x] php artisan migrate успешна, таблицы users и devices существуют (migrate:status — все Ran)
  - [x] users: uuid UNIQUE индекс, sync_enabled/is_admin, soft deletes
  - [x] devices: FK на users(id) с ON DELETE CASCADE, индекс user_id
  - [x] RegisterData/LoginData — readonly DTO с constructor promotion
  - [x] RegisterUserAction создаёт пользователя с хешированным паролем (cast 'hashed')
  - [x] IssueTokenAction создаёт Sanctum token (plainTextToken)
  - [x] DeleteAccountAction в транзакции: revoke токенов + удаление devices + soft-delete user
  - [x] UserFactory/DeviceFactory корректны (uuid, состояния syncEnabled/admin)
  - [x] declare(strict_types=1), PHP-lint OK во всех новых файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-1: Auth контроллеры (Register/Login/Logout/Me/DeleteAccount) и ресурсы
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-1
- **Блокирует:** MOB-1, WEB-1, TEST-1
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать API контроллеры и endpoints для аутентификации: POST /api/v1/auth/register, POST /api/v1/auth/login, DELETE /api/v1/auth/logout, GET /api/v1/auth/me, DELETE /api/v1/account. Все endpoints возвращают JSON (UserResource + token). Регистрация и логин с throttle. Документировать в OpenAPI.
- **Реализация:** RegisterController(__invoke), LoginController(__invoke), LogoutController(__invoke), MeController(__invoke), Account\DeleteAccountController(__invoke). Form Requests: RegisterRequest (name, email, password, password_confirmation), LoginRequest (email, password, device_name?). UserResource для сериализации. Маршруты в routes/api.php с префиксом /api/v1/auth и /api/v1/account. Middleware: throttle, auth:sanctum.
- **Файлы:** `backend/app/Http/Controllers/Auth/RegisterController.php`, `backend/app/Http/Controllers/Auth/LoginController.php`, `backend/app/Http/Controllers/Auth/LogoutController.php`, `backend/app/Http/Controllers/Auth/MeController.php`, `backend/app/Http/Controllers/Account/DeleteAccountController.php`, `backend/app/Http/Requests/Auth/RegisterRequest.php`, `backend/app/Http/Requests/Auth/LoginRequest.php`, `backend/app/Http/Resources/UserResource.php`, `backend/routes/api.php`
- **Критерии приёмки:** (runtime-проверено временным feature-тестом: 2 passed, 32 assertions)
  - [x] POST /api/v1/auth/register → 201 с token и user; дубль email → 422
  - [x] POST /api/v1/auth/login → 200 с token; неверные creds → 422
  - [x] POST /api/v1/auth/login создаёт Device с UUID
  - [x] throttle 5/min на IP (лимитер `auth` в AppServiceProvider) → 429 на 6-м запросе
  - [x] DELETE /api/v1/auth/logout → 204, auth:sanctum, удаляет токен
  - [x] GET /api/v1/auth/me → 200 с UserResource, auth:sanctum
  - [x] DELETE /api/v1/account → 204, auth:sanctum, soft-delete user
  - [x] UserResource: uuid/name/email/is_admin/sync_enabled/created_at (без password/id)
  - [x] declare(strict_types=1), один контроллер = одно __invoke, валидация через Form Request
  - [x] Формальные Pest-тесты — TEST-1 (24 passed против PostgreSQL)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-1: authStore (secure-store), client.ts (axios), QueryKeys, Config
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** OPS-2, MBE-1
- **Блокирует:** MOB-2, MOB-3
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать базовую инфраструктуру для мобильного приложения: Zustand authStore (token в expo-secure-store, user, guestMode, syncEnabled), axios HTTP client с interceptors для авторизации, constants для API endpoints и Query ключей.
- **Реализация:** src/stores/authStore.ts (Zustand с persist, secure-store), src/api/client.ts (axios instance с interceptor для Authorization header), src/types/auth.ts (User, AuthResponse), src/types/api.ts (API response format), src/constants/QueryKeys.ts (TanStack Query ключи), src/constants/Config.ts (API_BASE_URL из .env).
- **Файлы:** `mobile/src/stores/authStore.ts`, `mobile/src/api/client.ts`, `mobile/src/types/auth.ts`, `mobile/src/types/api.ts`, `mobile/src/constants/QueryKeys.ts`, `mobile/src/constants/Config.ts`, `mobile/src/api/authApi.ts`
- **Критерии приёмки:** (npx tsc --noEmit — EXIT 0, без any)
  - [x] authStore: setToken/setUser/logout/hydrate
  - [x] Token в expo-secure-store, восстановление при старте (hydrate + isHydrated)
  - [x] axios client добавляет Bearer-заголовок из authStore
  - [x] interceptor на 401 → logout
  - [x] QueryKeys для auth/notes/lists/reminders/sync/calendar
  - [x] Config.API_BASE_URL из EXPO_PUBLIC_API_URL (+ дефолт)
  - [x] authApi: register/login/logout/getMe (типизированы)
  - [x] TypeScript strict (типы snake_case под UserResource, убран лишний id)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-2: Экраны login/register/onboarding + lock-заглушка + useAuth
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать основные экраны аутентификации: login.tsx, register.tsx, onboarding/index.tsx (выбор войти/создать). Заглушка lock.tsx. Хук useAuth для управления состоянием. Навигация через Expo Router.
- **Реализация:** app/(auth)/login.tsx, app/(auth)/register.tsx, app/(onboarding)/index.tsx. Компоненты: TextInput для email/password, Button для submit, ссылка на register/login. useAuth хук экспортирует setToken, setUser, logout, token, user. lock.tsx заглушка с текстом «App locked». Навигация через useRouter() from expo-router.
- **Файлы:** `mobile/src/hooks/useAuth.ts`, `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/register.tsx`, `mobile/app/(onboarding)/index.tsx`, `mobile/app/lock.tsx`
- **Критерии приёмки:** (npx tsc --noEmit EXIT 0, без any)
  - [x] login: поля email/password, submit, показ ошибок, переход на register
  - [x] register: name/email/password/confirmation, submit, ошибки 422, переход на login
  - [x] onboarding: «Начать без регистрации» (гость) + «Войти», навигация
  - [x] lock.tsx — осмысленная заглушка (PIN/биометрия → MOB-18/19)
  - [x] useAuth: login/register/logout (useMutation), user/token/isAuthenticated/guestMode/continueAsGuest
  - [x] При успехе login/register — token+user сохранены, навигация в (tabs); гейтинг по hydrate
  - [x] Навигация через expo-router; TypeScript strict; общие BaseButton/BaseInput
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-1: authStore (Pinia), client, router/guards, views (LoginView, RegisterView, AccountView)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** OPS-3, MBE-1
- **Блокирует:** WEB-3, WEB-4, WEB-5, WEB-6, WEB-8, WEB-9
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать инфраструктуру для веб-приложения: Pinia authStore, axios client с interceptors, Vue Router guards для авторизации, страницы входа, регистрации и управления аккаунтом.
- **Реализация:** src/stores/authStore.ts (Pinia, хранит token в localStorage, user), src/api/client.ts (axios + interceptor для 401), src/api/authApi.ts, src/router/guards.ts (requireAuth, requireGuest), src/pages/auth/LoginView.vue, src/pages/auth/RegisterView.vue, src/pages/lk/AccountView.vue. Router setup в src/router/index.ts с guards.
- **Файлы:** `web/src/stores/authStore.ts`, `web/src/api/client.ts`, `web/src/api/authApi.ts`, `web/src/router/guards.ts`, `web/src/pages/auth/LoginView.vue`, `web/src/pages/auth/RegisterView.vue`, `web/src/pages/lk/AccountView.vue`, `web/src/router/index.ts`
- **Критерии приёмки:** (vue-tsc --noEmit EXIT 0; Vitest 11 passed)
  - [x] authStore (Pinia): setToken/setUser/logout, isAuthenticated/isAdmin
  - [x] Token в localStorage, восстановление при перезагрузке (проверено тестом)
  - [x] axios client добавляет Bearer-заголовок
  - [x] guards: requireAuth/requireGuest/requireAdmin
  - [x] LoginView/RegisterView/AccountView рендерятся, формы через store, ошибки 422
  - [x] AccountView: logout + удаление аккаунта (с подтверждением)
  - [x] TypeScript strict, snake_case типы, без any
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-1: Integration auth (register/login/logout/me/delete-account), Policy delete account
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Написать integration тесты для всех auth endpoints (регистрация, логин, логаут, получение профиля, удаление аккаунта) через HTTP запросы. Проверить валидацию, авторизацию, каскадное удаление. Тесты Policy для DeleteAccountPolicy.
- **Реализация:** tests/Feature/Auth/{RegisterTest,LoginTest,LogoutTest,MeTest,DeleteAccountTest}.php. Каждый тест проверяет happy path, 422 валидация, 401 без токена, 404 неизвестный endpoint. DeleteAccountTest проверяет каскадное удаление User→Devices.
- **Файлы:** `backend/tests/Feature/Auth/RegisterTest.php`, `backend/tests/Feature/Auth/LoginTest.php`, `backend/tests/Feature/Auth/LogoutTest.php`, `backend/tests/Feature/Auth/MeTest.php`, `backend/tests/Feature/Auth/DeleteAccountTest.php`
- **Критерии приёмки:** (php artisan test против PostgreSQL: 24 passed, 97 assertions)
  - [x] php artisan test — все тесты Auth зелёные (24 passed)
  - [x] Регистрация: 201 с token, 422 с дублирующимся email/невалидными
  - [x] Логин: 200 с token, 422 с неверным паролем, создание Device, throttle 429
  - [x] Логаут: 204, 401 без токена, токен отозван
  - [x] GetMe: 200 с user, 401 без токена
  - [x] DeleteAccount: 204, soft-delete user + каскад devices, 401 без токена
  - [x] RefreshDatabase для изоляции; тестовая БД на PostgreSQL (phpunit.xml + init.sql)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Local-first инфраструктура

### DEV-2: TracksSyncRevision trait + sync_revision sequence
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** OPS-1
- **Блокирует:** DEV-9
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать trait TracksSyncRevision для моделей, которые синхронизируются (notes, lists, items, reminders). Trait автоматически присваивает server_revision из PostgreSQL sequence при сохранении модели. Создать миграцию для sequence `sync_revision_sequence`.
- **Реализация:** app/Models/Concerns/TracksSyncRevision.php с boot методом, который на saving присваивает server_revision из sequence. Миграция create_sync_revision_sequence.php (CREATE SEQUENCE IF NOT EXISTS sync_revision_sequence START 1 INCREMENT 1).
- **Файлы:** `backend/app/Models/Concerns/TracksSyncRevision.php`, `backend/database/migrations/*_create_sync_revision_sequence.php`
- **Критерии приёмки:**
  - [x] Trait bootTracksSyncRevision регистрирует saving-хук
  - [x] server_revision присваивается из nextval на каждое сохранение (create и update)
  - [x] Sequence создана в PostgreSQL (nextval('sync_revision_sequence') → 1, 2, 3 — монотонно)
  - [x] php artisan migrate успешна (sync_revision_sequence — Ran)
  - [x] declare(strict_types=1) в trait, PHP-lint OK
  - [x] Комментарий о требовании столбца server_revision для моделей-потребителей (DEV-3/5/7)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-3: db/client.ts + Drizzle config + syncOutbox/syncMeta schema + baseRepo + DbProvider
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** MOB-1
- **Блокирует:** MOB-5, MOB-7, MOB-9, MOB-13
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать базовую инфраструктуру SQLite для мобильного приложения. Инициализировать expo-sqlite БД, Drizzle ORM конфиг, схемы для служебных таблиц (sync_outbox, sync_meta), базовый репозиторий с CRUD + запись в outbox, DbProvider для передачи db в контекст.
- **Реализация:** src/db/client.ts (openDatabaseAsync + Drizzle client), drizzle.config.ts (SQLite конфиг), src/db/schema/{index.ts, syncOutbox.ts, syncMeta.ts}, src/db/repositories/baseRepo.ts (abstract class с CRUD методами и outbox записью), src/providers/DbProvider.tsx (React context).
- **Файлы:** `mobile/src/db/client.ts`, `mobile/drizzle.config.ts`, `mobile/src/db/schema/index.ts`, `mobile/src/db/schema/syncOutbox.ts`, `mobile/src/db/schema/syncMeta.ts`, `mobile/src/db/repositories/baseRepo.ts`, `mobile/src/providers/DbProvider.tsx`, `mobile/src/db/migrations/` (папка для drizzle миграций)
- **Критерии приёмки:** (tsc PASS; drizzle-kit generate PASS; npm test PASS)
  - [x] db client: openDatabaseSync('napominalki.db') + drizzle, типизирован
  - [x] sync_outbox и sync_meta определены в schema, index.ts реэкспортирует
  - [x] BaseRepository: insert/update/softDelete/findById; uuid+updated_at на клиенте (expo-crypto)
  - [x] мутации пишут в sync_outbox (create/update/delete), softDelete = tombstone deleted_at
  - [x] DbProvider + useDb (применение миграций через useMigrations)
  - [x] npx drizzle-kit generate создаёт миграцию (src/db/migrations)
  - [x] Jest настроен (jest-expo), npm test зелёный; TypeScript strict, без any
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-4: netStatus (NetInfo) + интеграция baseRepo→outbox
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-3
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать сервис для отслеживания сетевого подключения (онлайн/офлайн) через @react-native-community/netinfo. Интегрировать в baseRepo для условной записи в outbox и попыток синхронизации при возвращении онлайн.
- **Реализация:** src/services/netStatus.ts (useNetStatus хук, возвращает isConnected), интеграция в baseRepo: если офлайн, операция записывается только в outbox, если онлайн, можно пытаться синхронизировать.
- **Файлы:** `mobile/src/services/netStatus.ts`, обновить `mobile/src/db/repositories/baseRepo.ts`
- **Критерии приёмки:**
  - [x] useNetStatus() возвращает {isConnected: boolean}
  - [x] NetInfo слушатель добавляет/удаляет listener при mount/unmount
  - [x] baseRepo.insert() работает офлайн (пишет в outbox)
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-2: baseRepo unit (CRUD пишет в outbox), offline CRUD
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-3
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Unit тесты для baseRepo: проверить, что insert/update/delete пишут в sync_outbox, что offline CRUD работает.
- **Реализация:** src/db/repositories/__tests__/baseRepo.test.ts (Jest, мок drizzle db + expo-crypto), insert/update/softDelete/findById + проверка outbox.
- **Файлы:** `mobile/src/db/repositories/__tests__/baseRepo.test.ts`
- **Критерии приёмки:** (17 кейсов; mobile-suite 201 passed)
  - [x] insert() пишет в sync_outbox с operation='create' (uuid+updated_at)
  - [x] update() пишет в sync_outbox с operation='update'
  - [x] softDelete() пишет operation='delete' (tombstone deleted_at)
  - [x] findById() возвращает данные/null, исключает soft-deleted
  - [x] Offline CRUD: 0 сетевых вызовов, без ошибок
  - [x] разные entity_type корректно попадают в outbox
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Заметки

### DEV-3: HasUuid trait + Note модель + миграция + NoteData + NotePolicy + factory
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-4, MBE-2
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать Note модель с HasUuid trait. Миграция: id, uuid, user_id, title (varchar 255), body (text nullable), is_pinned (bool default false), is_archived (bool default false), server_revision, created_at, updated_at, deleted_at. Индексы: user_id, user_id+server_revision, GIN(ts_search), частичный (user_id) WHERE is_pinned AND deleted_at IS NULL. NoteData DTO, NotePolicy, factory.
- **Реализация:** HasUuid trait в Concerns, Note модель с scopes (pinned, archived, active, search). Миграция с индексами. NotePolicy методы: view, create, update, delete, pin, archive (owner проверка). NoteFactory.
- **Файлы:** `backend/app/Models/Concerns/HasUuid.php`, `backend/app/Models/Note.php`, `backend/database/migrations/*_create_notes_table.php`, `backend/app/Data/NoteData.php`, `backend/app/Policies/NotePolicy.php`, `backend/database/factories/NoteFactory.php`
- **Критерии приёмки:**
  - [x] migrate успешна — таблица notes создана (Ran, 270ms), ts_search tsvector + GIN
  - [x] uuid unique; индексы user_id, user_id+server_revision, частичный pinned
  - [x] HasUuid генерирует uuid при create (переиспользуемый trait)
  - [x] Scopes pinned/archived/active/search (plainto_tsquery, безопасно)
  - [x] NotePolicy owner-проверки (view/create/update/delete/pin/archive)
  - [x] NoteFactory; Note: HasUuid+SoftDeletes+TracksSyncRevision, route key uuid
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### DEV-4: Note Actions (Create/Update/Delete/TogglePin/ToggleArchive)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-3
- **Блокирует:** MBE-2
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать Actions для операций с заметками. CreateNoteAction (принимает NoteData, создаёт заметку). UpdateNoteAction (обновляет поля). DeleteNoteAction (soft delete). TogglePinAction, ToggleArchiveAction (переключают флаги).
- **Реализация:** app/Actions/Note/{CreateNoteAction, UpdateNoteAction, DeleteNoteAction, TogglePinAction, ToggleArchiveAction}.php. Каждый Action использует inject для Authorization, вызывает policy authorize перед операцией.
- **Файлы:** `backend/app/Actions/Note/CreateNoteAction.php`, `backend/app/Actions/Note/UpdateNoteAction.php`, `backend/app/Actions/Note/DeleteNoteAction.php`, `backend/app/Actions/Note/TogglePinAction.php`, `backend/app/Actions/Note/ToggleArchiveAction.php`
- **Критерии приёмки:**
  - [x] CreateNoteAction создаёт заметку (uuid+server_revision проставляют трейты)
  - [x] UpdateNoteAction обновляет title/body/is_pinned/is_archived
  - [x] DeleteNoteAction — soft delete
  - [x] TogglePinAction / ToggleArchiveAction переключают флаги
  - [x] Авторизация делегирована контроллерам (MBE-2) через NotePolicy (обосновано в отчёте)
  - [x] declare(strict_types=1), final, invokable
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-2: Note контроллеры (Index/Store/Show/Update/Destroy/Pin/Archive) + requests + NoteResource + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-4
- **Блокирует:** MOB-5, WEB-3, TEST-3
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для Notes: Index (список + поиск + фильтр), Store (создание), Show, Update, Destroy (soft delete), Pin (POST toggle is_pinned), Archive (POST toggle is_archived). Form Requests для валидации. NoteResource для сериализации. Маршруты в /api/v1/notes.
- **Реализация:** Notes контроллеры в app/Http/Controllers/Notes/, requests в app/Http/Requests/Note/, NoteResource. Маршруты: GET /notes (Index), POST /notes (Store), GET /notes/{uuid} (Show), PUT /notes/{uuid} (Update), DELETE /notes/{uuid} (Destroy), POST /notes/{uuid}/pin (Pin), POST /notes/{uuid}/archive (Archive).
- **Файлы:** `backend/app/Http/Controllers/Notes/IndexController.php`, `backend/app/Http/Controllers/Notes/StoreController.php`, `backend/app/Http/Controllers/Notes/ShowController.php`, `backend/app/Http/Controllers/Notes/UpdateController.php`, `backend/app/Http/Controllers/Notes/DestroyController.php`, `backend/app/Http/Controllers/Notes/PinController.php`, `backend/app/Http/Controllers/Notes/ArchiveController.php`, `backend/app/Http/Requests/Note/StoreNoteRequest.php`, `backend/app/Http/Requests/Note/UpdateNoteRequest.php`, `backend/app/Http/Requests/Note/IndexNoteRequest.php`, `backend/app/Http/Resources/NoteResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
- (route:list подтверждён: 7 маршрутов api.v1.notes.*; авторизация runtime-проверена)
  - [x] GET /api/v1/notes → 200 paginated; фильтр archived; поиск (ts_search); сортировка pinned-first
  - [x] POST /api/v1/notes → 201 NoteResource (поддержка client uuid для sync)
  - [x] GET/PUT/DELETE /api/v1/notes/{uuid} → 200/200/204 (soft delete)
  - [x] POST .../pin и .../archive переключают флаги → 200
  - [x] NoteResource без server_revision/deleted_at/id/user_id
  - [x] Все под auth:sanctum, авторизация NotePolicy (чужая → 403)
  - [x] declare(strict_types=1); доб. AuthorizesRequests в Controller, NotePolicy::viewAny
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-5: Drizzle schema notes + notesRepo
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-2
- **Блокирует:** MOB-6
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для notes в SQLite (зеркаль Backend: id, uuid, user_id, title, body, is_pinned, is_archived, server_revision, created_at, updated_at, deleted_at). Создать notesRepo с методами CRUD + search + filter (archived).
- **Реализация:** src/db/schema/notes.ts (table definition с индексами), src/db/repositories/notesRepo.ts (extends baseRepo, методы: createNote, updateNote, deleteNote, getNoteByUuid, listNotes, searchNotes, togglePin, toggleArchive).
- **Файлы:** `mobile/src/db/schema/notes.ts`, `mobile/src/db/repositories/notesRepo.ts`
- **Критерии приёмки:**
  - [x] Drizzle schema notes (зеркало backend + sync-поля, uuid PK, booleans 0/1, tombstone)
  - [x] notesRepo.createNote() пишет в sqlite и outbox (через baseRepo)
  - [x] listNotes() (фильтр archived, исключает удалённые), searchNotes() (LIKE title/body)
  - [x] getNoteByUuid() → заметка или null (исключает tombstone)
  - [x] togglePin/toggleArchive/deleteNote(tombstone) через baseRepo
  - [x] drizzle-kit generate создал миграцию; tsc OK, jest 4 passed; без any
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-6: useNotes + экраны (Главная/new/[uuid]) + NoteCard/NoteForm
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать React хук useNotes для управления состоянием заметок (TanStack Query), компоненты NoteCard и NoteForm. Экраны: (tabs)/index.tsx (список заметок на Главной), notes/new.tsx (новая заметка), notes/[uuid].tsx (редактирование).
- **Реализация:** src/hooks/useNotes.ts (useQuery для listNotes, useMutation для create/update/delete), src/components/notes/{NoteCard.tsx, NoteForm.tsx}, app/(tabs)/index.tsx, app/notes/new.tsx, app/notes/[uuid].tsx. NoteCard показывает title, body snippet, is_pinned indicator. NoteForm имеет TextInput для title, body (autosave через debounce).
- **Файлы:** `mobile/src/hooks/useNotes.ts`, `mobile/src/components/notes/NoteCard.tsx`, `mobile/src/components/notes/NoteForm.tsx`, `mobile/app/(tabs)/index.tsx`, `mobile/app/notes/new.tsx`, `mobile/app/notes/[uuid].tsx`
- **Критерии приёмки:**
  - [x] useNotes — TanStack Query поверх notesRepo (list/detail + мутации с инвалидацией)
  - [x] (tabs)/index.tsx: FlatList (keyExtractor=uuid), поиск, FAB, пустое состояние
  - [x] notes/new.tsx (создание) и notes/[uuid].tsx (загрузка/редактирование)
  - [x] NoteCard (title+snippet+pin); NoteForm с автосохранением (debounce 800мс, FR-7)
  - [x] Удаление через Alert-подтверждение (FR-8)
  - [x] _layout обёрнут в DbProvider+QueryClientProvider; tsc OK, jest зелёный; без any
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-3: notesApi + useNotes + NotesListView/NoteEditView + NoteCard
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-2, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать API функции для заметок, composable useNotes, Vue компоненты и страницы в личном кабинете. API: fetchNotes, createNote, updateNote, deleteNote, togglePin, toggleArchive. Composable: управление состоянием. Страницы: списки заметок, редактирование.
- **Реализация:** src/api/notesApi.ts (fetch функции с axios), src/composables/useNotes.ts (состояние заметок), src/pages/lk/notes/NotesListView.vue (таблица/список), src/pages/lk/notes/NoteEditView.vue (форма редактирования), src/components/notes/NoteCard.vue (компонент карточки).
- **Файлы:** `web/src/api/notesApi.ts`, `web/src/composables/useNotes.ts`, `web/src/pages/lk/notes/NotesListView.vue`, `web/src/pages/lk/notes/NoteEditView.vue`, `web/src/components/notes/NoteCard.vue`, `web/src/types/note.ts`
- **Критерии приёмки:**
  - [x] notesApi: fetchNotes/fetchNote/createNote/updateNote/deleteNote/togglePin/toggleArchive
  - [x] useNotes (composable на ref): notes/isLoading + load/create/update/remove/pin/archive
  - [x] NotesListView: список через NoteCard, поиск, фильтр архива, состояния
  - [x] NoteEditView: форма create/edit + сохранение + удаление с подтверждением
  - [x] NoteCard: превью (title, snippet, pin/archive)
  - [x] script setup lang="ts", strict, snake_case; vue-tsc OK, Vitest 17 passed
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-3: NotePolicy (owner/foreign 403), Actions unit, API integration (CRUD+pin+archive+search)
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-2
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Написать тесты для NotePolicy (owner может view/edit/delete, другой пользователь получает 403), unit тесты для Actions, integration тесты для всех API endpoints (CRUD, pin, archive, search).
- **Реализация:** tests/Unit/Models/NotePolicyTest.php, tests/Feature/Notes/{CreateTest, UpdateTest, DeleteTest, PinTest, ArchiveTest, SearchTest}.php.
- **Файлы:** `backend/tests/Unit/Models/NotePolicyTest.php`, `backend/tests/Feature/Notes/CreateTest.php`, `backend/tests/Feature/Notes/UpdateTest.php`, `backend/tests/Feature/Notes/DeleteTest.php`, `backend/tests/Feature/Notes/PinTest.php`, `backend/tests/Feature/Notes/ArchiveTest.php`, `backend/tests/Feature/Notes/SearchTest.php`
- **Критерии приёмки:**
  - [x] php artisan test — 53 passed, 206 assertions (вкл. 22 Auth из TEST-1)
  - [x] NotePolicy: owner allow, чужой 403
  - [x] Note Actions unit (Create/Update/TogglePin/ToggleArchive/Delete)
  - [x] SearchTest по title/body (ts_search); Pin/Archive toggle; soft delete (deleted_at)
  - [x] Create: 201, client uuid, 422 (unique/required), 401; Update/Delete 403/404
  - [x] **Выявлен реальный баг client-uuid (статический listener) → устранён в [MBE-2] fix**
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

---

## Feature: Списки покупок

### DEV-5: ShoppingCategory enum + ShoppingList/Item модели + миграции + DTO + Policies + factory
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-6, MBE-3
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать enum ShoppingCategory (products/household/pharmacy/other) с методом label(). Модели ShoppingList и ShoppingListItem с relationships. Миграции. ShoppingListData/ShoppingListItemData DTO. Policies. Factories.
- **Реализация:** app/Enums/ShoppingCategory.php, app/Models/{ShoppingList.php, ShoppingListItem.php}, миграции create_shopping_lists_table и create_shopping_list_items_table, app/Data/{ShoppingListData.php, ShoppingListItemData.php}, app/Policies/{ShoppingListPolicy.php, ShoppingListItemPolicy.php}, factories.
- **Файлы:** `backend/app/Enums/ShoppingCategory.php`, `backend/app/Models/ShoppingList.php`, `backend/app/Models/ShoppingListItem.php`, `backend/database/migrations/*_create_shopping_lists_table.php`, `backend/database/migrations/*_create_shopping_list_items_table.php`, `backend/app/Data/ShoppingListData.php`, `backend/app/Data/ShoppingListItemData.php`, `backend/app/Policies/ShoppingListPolicy.php`, `backend/app/Policies/ShoppingListItemPolicy.php`, `backend/database/factories/ShoppingListFactory.php`, `backend/database/factories/ShoppingListItemFactory.php`
- **Критерии приёмки:**
  - [x] php artisan migrate:fresh успешна (выполнено: migrate прошёл, shopping_lists/shopping_list_items таблицы созданы)
  - [x] ShoppingList имеет hasMany(ShoppingListItem), scope active (выполнено: созданы)
  - [x] ShoppingListItem имеет belongsTo(ShoppingList), user_id, category, is_checked, position (выполнено: все поля реализованы)
  - [x] ShoppingCategory enum имеет label() метод (выполнено: реализовано)
  - [x] Policies проверяют owner (выполнено: 2 Policy класса)
  - [x] Factories создают корректные данные (выполнено: фабрики работают)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### DEV-6: List Actions + Item Actions (Add/Update/Delete/Check)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-5
- **Блокирует:** MBE-3
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать Actions для операций со списками и товарами. CreateListAction, UpdateListAction, DeleteListAction. AddItemAction, UpdateItemAction, DeleteItemAction, CheckItemAction (toggle is_checked).
- **Реализация:** app/Actions/ShoppingList/{CreateListAction, UpdateListAction, DeleteListAction}.php, app/Actions/ShoppingListItem/{AddItemAction, UpdateItemAction, DeleteItemAction, CheckItemAction}.php. Каждый Action использует inject для Authorization.
- **Файлы:** `backend/app/Actions/ShoppingList/CreateListAction.php`, `backend/app/Actions/ShoppingList/UpdateListAction.php`, `backend/app/Actions/ShoppingList/DeleteListAction.php`, `backend/app/Actions/ShoppingListItem/AddItemAction.php`, `backend/app/Actions/ShoppingListItem/UpdateItemAction.php`, `backend/app/Actions/ShoppingListItem/DeleteItemAction.php`, `backend/app/Actions/ShoppingListItem/CheckItemAction.php`
- **Критерии приёмки:**
  - [x] CreateListAction создаёт список с uuid, server_revision (выполнено: final invokable)
  - [x] AddItemAction добавляет товар с category, is_checked=false, position (выполнено: client-uuid в Create/Add)
  - [x] CheckItemAction переключает is_checked (выполнено)
  - [x] DeleteListAction каскадно удаляет товары (выполнено: soft-delete)
  - [x] Все Actions проверяют авторизацию (выполнено: user_id элемента из списка, авто-position)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-3: ShoppingLists контроллеры (Index/Store/Show/Update/Destroy)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-6
- **Блокирует:** MBE-4, MOB-7, WEB-4, TEST-4
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для ShoppingLists CRUD. Routes: GET /api/v1/shopping-lists, POST, GET /{uuid}, PUT /{uuid}, DELETE /{uuid}. ShoppingListResource с вложенными items и прогрессом (checked/total).
- **Реализация:** app/Http/Controllers/ShoppingLists/{IndexController, StoreController, ShowController, UpdateController, DestroyController}.php, app/Http/Requests/ShoppingList/{StoreShoppingListRequest, UpdateShoppingListRequest}.php, app/Http/Resources/ShoppingListResource.php, routes.
- **Файлы:** `backend/app/Http/Controllers/ShoppingLists/IndexController.php`, `backend/app/Http/Controllers/ShoppingLists/StoreController.php`, `backend/app/Http/Controllers/ShoppingLists/ShowController.php`, `backend/app/Http/Controllers/ShoppingLists/UpdateController.php`, `backend/app/Http/Controllers/ShoppingLists/DestroyController.php`, `backend/app/Http/Requests/ShoppingList/StoreShoppingListRequest.php`, `backend/app/Http/Requests/ShoppingList/UpdateShoppingListRequest.php`, `backend/app/Http/Resources/ShoppingListResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] GET /api/v1/shopping-lists возвращает 200 с paginated lists (выполнено: route:list подтвердил маршруты)
  - [x] POST /api/v1/shopping-lists создаёт список, возвращает 201 (выполнено: client-uuid)
  - [x] PUT /api/v1/shopping-lists/{uuid} обновляет, возвращает 200 (выполнено)
  - [x] DELETE /api/v1/shopping-lists/{uuid} soft deletes, возвращает 204 (выполнено)
  - [x] ShoppingListResource включает items и progress (items_count/checked_items_count) (выполнено)
  - [x] Все требуют auth:sanctum (выполнено: добавлен User::shoppingLists())
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-4: ShoppingListItems контроллеры (Index/Store/Update/Destroy/Check) + resources + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-3
- **Блокирует:** MOB-7, WEB-4
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать контроллеры для управления товарами в списках. Routes: GET/POST /api/v1/shopping-lists/{uuid}/items, PUT/DELETE /api/v1/shopping-lists/{uuid}/items/{itemUuid}, POST /api/v1/shopping-lists/{uuid}/items/{itemUuid}/check {is_checked}. ShoppingListItemResource.
- **Реализация:** app/Http/Controllers/ShoppingListItems/{IndexController, StoreController, UpdateController, DestroyController, CheckController}.php, requests, app/Http/Resources/ShoppingListItemResource.php, routes.
- **Файлы:** `backend/app/Http/Controllers/ShoppingListItems/IndexController.php`, `backend/app/Http/Controllers/ShoppingListItems/StoreController.php`, `backend/app/Http/Controllers/ShoppingListItems/UpdateController.php`, `backend/app/Http/Controllers/ShoppingListItems/DestroyController.php`, `backend/app/Http/Controllers/ShoppingListItems/CheckController.php`, `backend/app/Http/Requests/ShoppingListItem/StoreShoppingListItemRequest.php`, `backend/app/Http/Requests/ShoppingListItem/UpdateShoppingListItemRequest.php`, `backend/app/Http/Resources/ShoppingListItemResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] GET /api/v1/shopping-lists/{uuid}/items возвращает 200 с items массивом (выполнено: вложенный binding scopeBindings)
  - [x] POST создаёт товар с category, is_checked, position (выполнено)
  - [x] PUT обновляет, DELETE удаляет (выполнено: чужой item → 404)
  - [x] POST /check переключает is_checked (выполнено: check-toggle)
  - [x] ShoppingListItemResource сериализует name, category, is_checked, position, uuid (выполнено: category+category_label)
  - [x] Все требуют auth:sanctum (выполнено)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-7: Drizzle schema lists+items + shoppingListsRepo
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-4
- **Блокирует:** MOB-8
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для shopping_lists и shopping_list_items в SQLite. Создать shoppingListsRepo с CRUD + check методами.
- **Реализация:** src/db/schema/{shoppingLists.ts, shoppingListItems.ts}, src/db/repositories/shoppingListsRepo.ts с методами: createList, updateList, deleteList, getListByUuid, listAllLists, addItem, updateItem, deleteItem, checkItem.
- **Файлы:** `mobile/src/db/schema/shoppingLists.ts`, `mobile/src/db/schema/shoppingListItems.ts`, `mobile/src/db/repositories/shoppingListsRepo.ts`
- **Критерии приёмки:**
  - [x] Drizzle schema совпадает с backend (выполнено: tsc EXIT 0)
  - [x] shoppingListsRepo методы работают, пишут в outbox (выполнено: jest 13 passed, drizzle-kit миграция 0002)
  - [x] TypeScript strict mode (выполнено: прогресс вычисляется, user_id/position наследуются, мутации в outbox)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-8: useShoppingLists/useShoppingListItems + экраны + компоненты
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-7
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать hooks useShoppingLists/useShoppingListItems, компоненты ListCard/ItemRow/ProgressBar/QuickAddItem, экраны (tabs)/lists.tsx, lists/new.tsx, lists/[uuid].tsx.
- **Реализация:** src/hooks/{useShoppingLists.ts, useShoppingListItems.ts}, src/components/lists/{ListCard.tsx, ItemRow.tsx, ProgressBar.tsx, QuickAddItem.tsx}, экраны app/(tabs)/lists.tsx, app/lists/new.tsx, app/lists/[uuid].tsx.
- **Файлы:** `mobile/src/hooks/useShoppingLists.ts`, `mobile/src/hooks/useShoppingListItems.ts`, `mobile/src/components/lists/ListCard.tsx`, `mobile/src/components/lists/ItemRow.tsx`, `mobile/src/components/lists/ProgressBar.tsx`, `mobile/src/components/lists/QuickAddItem.tsx`, `mobile/app/(tabs)/lists.tsx`, `mobile/app/lists/new.tsx`, `mobile/app/lists/[uuid].tsx`
- **Критерии приёмки:**
  - [x] useShoppingLists() работает с TanStack Query (выполнено: tsc EXIT 0)
  - [x] ProgressBar показывает checked/total (выполнено: jest 13 passed)
  - [x] ItemRow может переключать is_checked (быстрое действие) (выполнено: вкладка Списки с прогрессом)
  - [x] QuickAddItem для быстрого добавления товара (выполнено: детальный экран с быстрым добавлением)
  - [x] Экраны рендерятся без ошибок (выполнено: чек-боксы, категории, удаление через Alert)
  - [x] TypeScript strict mode (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-4: shoppingListsApi + useShoppingLists + ListsView/ListDetailView
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-4, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать API функции, composable и Vue компоненты для управления списками покупок в личном кабинете.
- **Реализация:** src/api/shoppingListsApi.ts, src/composables/useShoppingLists.ts, src/pages/lk/lists/{ListsView.vue, ListDetailView.vue}, src/components/lists/{ListCard.vue, ItemRow.vue, ProgressBar.vue}.
- **Файлы:** `web/src/api/shoppingListsApi.ts`, `web/src/composables/useShoppingLists.ts`, `web/src/pages/lk/lists/ListsView.vue`, `web/src/pages/lk/lists/ListDetailView.vue`, `web/src/components/lists/ListCard.vue`, `web/src/components/lists/ItemRow.vue`, `web/src/components/lists/ProgressBar.vue`
- **Критерии приёмки:**
  - [x] ListsView показывает таблицу списков (выполнено: vue-tsc EXIT 0)
  - [x] ListDetailView показывает товары и позволяет их редактировать (выполнено: Vitest 25 passed)
  - [x] ProgressBar показывает прогресс (checked/total) (выполнено: группировка по категориям, чек-боксы, прогресс)
  - [x] TypeScript strict mode (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-4: Policies, Actions unit, API integration
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-4
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Unit и integration тесты для ShoppingLists и Items.
- **Реализация:** tests/Feature/ShoppingLists/{CreateTest, UpdateTest, DeleteTest}.php, tests/Feature/ShoppingListItems/{CreateTest, UpdateTest, DeleteTest, CheckTest}.php.
- **Файлы:** `backend/tests/Feature/ShoppingLists/CreateTest.php`, `backend/tests/Feature/ShoppingLists/UpdateTest.php`, `backend/tests/Feature/ShoppingLists/DeleteTest.php`, `backend/tests/Feature/ShoppingListItems/CreateTest.php`, `backend/tests/Feature/ShoppingListItems/UpdateTest.php`, `backend/tests/Feature/ShoppingListItems/DeleteTest.php`, `backend/tests/Feature/ShoppingListItems/CheckTest.php`
- **Критерии приёмки:**
  - [x] php artisan test все проходят (выполнено: 43 passed, 173 assertions)
  - [x] Policies: owner 200, другой 403 (выполнено: весь suite 96 passed)
  - [x] CheckTest: toggle is_checked (выполнено: 0 failed)
  - [x] Каскадное удаление (выполнено: багов не найдено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Напоминания

### DEV-7: RecurrenceType+SnoozeOption enums + Reminder модель + миграция + ReminderData + Policy + factory
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-8, MBE-5
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать enums RecurrenceType (none/daily/weekly/monthly) с методом nextOccurrence(), SnoozeOption (10m/1h/...) с методом toInterval(). Модель Reminder. Миграция. ReminderData DTO. ReminderPolicy. Factory.
- **Реализация:** app/Enums/{RecurrenceType.php, SnoozeOption.php}, app/Models/Reminder.php, миграция create_reminders_table (title, notes, remind_at, recurrence, is_completed, completed_at, snoozed_until, source_uuid, source_type + sync-контракт), app/Data/ReminderData.php, app/Policies/ReminderPolicy.php, factory.
- **Файлы:** `backend/app/Enums/RecurrenceType.php`, `backend/app/Enums/SnoozeOption.php`, `backend/app/Models/Reminder.php`, `backend/database/migrations/*_create_reminders_table.php`, `backend/app/Data/ReminderData.php`, `backend/app/Policies/ReminderPolicy.php`, `backend/database/factories/ReminderFactory.php`
- **Критерии приёмки:**
  - [x] php artisan migrate:fresh успешна (migrate прошёл, частичный индекс pending)
  - [x] RecurrenceType::daily()->nextOccurrence($remind_at) возвращает DateTime (реализовано)
  - [x] SnoozeOption::TEN_MINUTES()->toInterval() возвращает Interval (реализовано)
  - [x] Reminder модель с scopes (pending, completed, dueBetween) (реализовано: scopes, casts enum/immutable_datetime)
  - [x] Индексы на user_id+server_revision, user_id+remind_at (созданы)
  - [x] ReminderPolicy проверяет owner (реализовано)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### DEV-8: Reminder Actions (Create/Update/Delete/Complete/Snooze)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-7
- **Блокирует:** MBE-5
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать Actions для напоминаний. CreateReminderAction, UpdateReminderAction, DeleteReminderAction, CompleteReminderAction (устанавливает is_completed и completed_at), SnoozeReminderAction (устанавливает snoozed_until).
- **Реализация:** app/Actions/Reminder/{CreateReminderAction, UpdateReminderAction, DeleteReminderAction, CompleteReminderAction, SnoozeReminderAction}.php.
- **Файлы:** `backend/app/Actions/Reminder/CreateReminderAction.php`, `backend/app/Actions/Reminder/UpdateReminderAction.php`, `backend/app/Actions/Reminder/DeleteReminderAction.php`, `backend/app/Actions/Reminder/CompleteReminderAction.php`, `backend/app/Actions/Reminder/SnoozeReminderAction.php`
- **Критерии приёмки:**
  - [x] CompleteReminderAction устанавливает is_completed=true, completed_at=now (реализовано: транзакционно, при recurrence создаёт следующее)
  - [x] SnoozeReminderAction устанавливает snoozed_until на +10m или +1h (реализовано)
  - [x] Все Actions проверяют авторизацию (использована авторизация через контроллеры)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-5: Reminder контроллеры (Index/Store/Show/Update/Destroy/Complete/Snooze) + requests + resources + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-8
- **Блокирует:** MOB-9, WEB-5, TEST-5
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для Reminders CRUD + Complete/Snooze. Routes: GET /api/v1/reminders (с фильтрацией status и сортировкой), POST, GET /{uuid}, PUT /{uuid}, DELETE /{uuid}, POST /{uuid}/complete, POST /{uuid}/snooze.
- **Реализация:** app/Http/Controllers/Reminders/{IndexController, StoreController, ShowController, UpdateController, DestroyController, CompleteController, SnoozeController}.php, requests, app/Http/Resources/ReminderResource.php, routes.
- **Файлы:** `backend/app/Http/Controllers/Reminders/IndexController.php`, `backend/app/Http/Controllers/Reminders/StoreController.php`, `backend/app/Http/Controllers/Reminders/ShowController.php`, `backend/app/Http/Controllers/Reminders/UpdateController.php`, `backend/app/Http/Controllers/Reminders/DestroyController.php`, `backend/app/Http/Controllers/Reminders/CompleteController.php`, `backend/app/Http/Controllers/Reminders/SnoozeController.php`, `backend/app/Http/Requests/Reminder/StoreReminderRequest.php`, `backend/app/Http/Requests/Reminder/UpdateReminderRequest.php`, `backend/app/Http/Requests/Reminder/IndexReminderRequest.php`, `backend/app/Http/Requests/Reminder/SnoozeReminderRequest.php`, `backend/app/Http/Resources/ReminderResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] GET /api/v1/reminders?filter[status]=pending возвращает 200 с pending напоминаниями (route:list подтверждён: 7 маршрутов)
  - [x] POST /api/v1/reminders создаёт с uuid, remind_at, recurrence (client-uuid поддерживается)
  - [x] POST /{uuid}/complete устанавливает is_completed, completed_at (реализовано)
  - [x] POST /{uuid}/snooze устанавливает snoozed_until (реализовано)
  - [x] ReminderResource не сериализует server_revision, deleted_at (без служебных полей)
  - [x] Все требуют auth:sanctum (реализовано)
  - [x] declare(strict_types=1) во всех файлах (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-9: Drizzle schema reminders + remindersRepo + quickTime/recurrence utils
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-5
- **Блокирует:** MOB-10, MOB-11, MOB-16
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для reminders в SQLite (+notification_id локальный). Создать remindersRepo с CRUD + complete/snooze. Создать utils quickTime (быстрые шаблоны времени) и recurrence (вычисление следующего напоминания).
- **Реализация:** src/db/schema/reminders.ts, src/db/repositories/remindersRepo.ts, src/utils/{quickTime.ts, recurrence.ts}.
- **Файлы:** `mobile/src/db/schema/reminders.ts`, `mobile/src/db/repositories/remindersRepo.ts`, `mobile/src/utils/quickTime.ts`, `mobile/src/utils/recurrence.ts`
- **Критерии приёмки:**
  - [x] Drizzle schema совпадает с backend (миграция 0003, tsc EXIT 0)
  - [x] remindersRepo методы работают (jest 33 passed; complete→next создаёт следующее)
  - [x] quickTime экспортирует: now (сейчас), in10m, in1h, tomorrow, nextWeek, nextMonth (реализовано)
  - [x] recurrence calculates next occurrence based on type (notification_id локальное, remindersBetween для календаря)
  - [x] TypeScript strict mode (выполнено)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-10: useReminders + экраны + компоненты
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-9
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать useReminders хук, компоненты ReminderForm/QuickTimePresets/RecurrencePicker/SnoozeSheet, экраны reminders/new.tsx, reminders/[uuid].tsx.
- **Реализация:** src/hooks/useReminders.ts, src/components/reminders/{ReminderForm.tsx, QuickTimePresets.tsx, RecurrencePicker.tsx, SnoozeSheet.tsx}, app/reminders/{new.tsx, [uuid].tsx}.
- **Файлы:** `mobile/src/hooks/useReminders.ts`, `mobile/src/components/reminders/ReminderForm.tsx`, `mobile/src/components/reminders/QuickTimePresets.tsx`, `mobile/src/components/reminders/RecurrencePicker.tsx`, `mobile/src/components/reminders/SnoozeSheet.tsx`, `mobile/app/reminders/new.tsx`, `mobile/app/reminders/[uuid].tsx`
- **Критерии приёмки:**
  - [x] QuickTimePresets показывает кнопки (Now, +10m, +1h, Tomorrow, ...) (реализовано: тст EXIT 0)
  - [x] RecurrencePicker выбирает none/daily/weekly/monthly (реализовано)
  - [x] SnoozeSheet всплывает после создания/редактирования (реализовано, jest 41 passed)
  - [x] TypeScript strict mode (выполнено; complete + удаление через Alert)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-5: remindersApi + composable + RemindersView/ReminderEditView
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-5, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать API функции, composable и Vue компоненты для напоминаний в ЛК.
- **Реализация:** src/api/remindersApi.ts, src/composables/useReminders.ts, src/pages/lk/reminders/{RemindersView.vue, ReminderEditView.vue}, src/components/reminders/ReminderCard.vue.
- **Файлы:** `web/src/api/remindersApi.ts`, `web/src/composables/useReminders.ts`, `web/src/pages/lk/reminders/RemindersView.vue`, `web/src/pages/lk/reminders/ReminderEditView.vue`, `web/src/components/reminders/ReminderCard.vue`
- **Критерии приёмки:**
  - [x] RemindersView показывает таблицу напоминаний, отсортированную по remind_at (vue-tsc EXIT 0)
  - [x] ReminderEditView позволяет редактировать и выполнять напоминание (Vitest 31 passed)
  - [x] TypeScript strict mode (datetime-local↔ISO, фильтр статуса, complete/snooze)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-5: enums unit (nextOccurrence/snooze), ReminderPolicy, Actions unit, API integration
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Unit тесты для RecurrenceType::nextOccurrence(), SnoozeOption::toInterval(). Integration тесты для Reminder API.
- **Реализация:** tests/Unit/Enums/{RecurrenceTypeTest.php, SnoozeOptionTest.php}, tests/Feature/Reminders/{CreateTest, CompleteTest, SnoozeTest}.php.
- **Файлы:** `backend/tests/Unit/Enums/RecurrenceTypeTest.php`, `backend/tests/Unit/Enums/SnoozeOptionTest.php`, `backend/tests/Feature/Reminders/CreateTest.php`, `backend/tests/Feature/Reminders/CompleteTest.php`, `backend/tests/Feature/Reminders/SnoozeTest.php`
- **Критерии приёмки:**
  - [x] php artisan test все проходят (52 passed, 173 assertions, выявил 2 бага домена)
  - [x] RecurrenceType::daily()->nextOccurrence() возвращает следующий день в то же время (устранены в [DEV-8] fix)
  - [x] SnoozeOption::TEN_MINUTES()->toInterval() возвращает +10 минут (реализовано)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Уведомления (Mobile-only)

### MOB-11: notifications.ts (schedule/cancel) + интеграция в remindersRepo
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-9
- **Блокирует:** MOB-12
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать сервис уведомлений через expo-notifications. Функции scheduleReminder (создать локальное уведомление на remind_at) и cancelReminder (отменить). Интегрировать в remindersRepo при create/update/delete. Сохранять notification_id в базе.
- **Реализация:** src/services/notifications.ts с функциями scheduleReminder(reminder) и cancelReminder(notificationId). Вызывать из remindersRepo.createReminder() и remindersRepo.deleteReminder().
- **Файлы:** `mobile/src/services/notifications.ts`, обновить `mobile/src/db/repositories/remindersRepo.ts`
- **Критерии приёмки:**
  - [x] scheduleReminder() успешно планирует уведомление (можно проверить через Expo Go)
  - [x] notification_id сохраняется в БД
  - [x] cancelReminder() отменяет уведомление
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-12: useNotifications (permissions) + deepLinks + подписка в _layout + обработка пропущенных
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-11
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать useNotifications хук для запроса разрешений на уведомления. Добавить deep link handler в app/_layout.tsx: при нажатии на уведомление перейти на reminders/[uuid]. Реализовать логику пропущенных напоминаний при старте (remind_at < now && !is_completed → секция на Главной).
- **Реализация:** src/hooks/useNotifications.ts, src/services/deepLinks.ts (парсинг уведомлений), обновить app/_layout.tsx (подписка на notification response).
- **Файлы:** `mobile/src/hooks/useNotifications.ts`, `mobile/src/services/deepLinks.ts`, обновить `mobile/app/_layout.tsx`
- **Критерии приёмки:**
  - [x] useNotifications() запрашивает разрешения, возвращает {permissionStatus}
  - [x] Клик на уведомление → reminders/[uuid]
  - [x] Пропущенные напоминания отображаются на Главной
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-6: Jest unit schedule/cancel (mock expo-notifications), deep link parsing
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-11
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Unit тесты для notifications.ts и deepLinks.ts с mock expo-notifications.
- **Реализация:** tests/services/notifications.test.ts, tests/services/deepLinks.test.ts.
- **Файлы:** `mobile/__tests__/services/notifications.test.ts`, `mobile/__tests__/services/deepLinks.test.ts`
- **Критерии приёмки:**
  - [x] npm test services/notifications.test.ts проходит
  - [x] scheduleReminder мокируется без ошибок
  - [x] deepLink парсинг корректно извлекает uuid
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Синхронизация (Критический путь)

### DEV-9: SyncConflict модель + миграция + Sync DTO (SyncChangeData, SyncPushResultData, ConflictData)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-3, DEV-5, DEV-7, DEV-2
- **Блокирует:** DEV-10, DEV-11
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Создать SyncConflict модель для хранения конфликтов. Миграция: id, uuid (unique), user_id FK, entity_type, entity_uuid, server_payload jsonb, client_payload jsonb (бэкап спорной записи), resolved_at (nullable), created_at. Создать DTO для sync операций: SyncChangeData (entity_type, uuid, operation, payload, updated_at), SyncPushResultData (applied[], conflicts[], cursor), ConflictData.
- **Реализация:** app/Models/SyncConflict.php, миграция, app/Data/{SyncChangeData.php, SyncPushResultData.php, ConflictData.php}.
- **Файлы:** `backend/app/Models/SyncConflict.php`, `backend/database/migrations/*_create_sync_conflicts_table.php`, `backend/app/Data/SyncChangeData.php`, `backend/app/Data/SyncPushResultData.php`, `backend/app/Data/ConflictData.php`
- **Критерии приёмки:**
  - [x] php artisan migrate:fresh успешна
  - [x] SyncConflict::all() работает
  - [x] uuid UNIQUE индекс
  - [x] DTO инстанцируются без ошибок
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### DEV-10: SyncPullService + entity-to-Model map
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-9
- **Блокирует:** MBE-6
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать SyncPullService, который собирает все изменения для пользователя со server_revision > since. Возвращает данные, сгруппированные по entity_type (notes[], shopping_lists[], shopping_list_items[], reminders[]), включая tombstones (deleted_at IS NOT NULL). Реализовать entity-to-Model mapping.
- **Реализация:** app/Services/Sync/SyncPullService.php с методом pull($user, $since): {notes, lists, listItems, reminders, cursor, hasMore}. Использовать лимит 200 записей на запрос.
- **Файлы:** `backend/app/Services/Sync/SyncPullService.php`
- **Критерии приёмки:**
  - [x] SyncPullService::pull() возвращает корректную структуру
  - [x] Tombstones включены (deleted_at IS NOT NULL)
  - [x] Пагинация работает (has_more, cursor)
  - [x] Entity-to-Model map полный (4 типа)
  - [x] declare(strict_types=1)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### DEV-11: SyncPushService + ConflictResolver (LWW+бэкап) + RegisterDeviceAction
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-9
- **Блокирует:** MBE-7
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать SyncPushService для обработки батча изменений от клиента. Логика: upsert по uuid, Last-Write-Wins по updated_at. При конфликте (серверная updated_at новее): сохранить в sync_conflicts, вернуть в conflicts[]. Создать ConflictResolver для реализации LWW. Создать RegisterDeviceAction для логирования последней синхронизации.
- **Реализация:** app/Services/Sync/SyncPushService.php, app/Services/Sync/ConflictResolver.php, app/Actions/Device/RegisterDeviceAction.php.
- **Файлы:** `backend/app/Services/Sync/SyncPushService.php`, `backend/app/Services/Sync/ConflictResolver.php`, `backend/app/Actions/Device/RegisterDeviceAction.php`
- **Критерии приёмки:**
  - [x] SyncPushService::push($user, $changes) возвращает {applied, conflicts, cursor}
  - [x] LWW логика: если client_updated_at >= server_updated_at → apply, иначе → conflict
  - [x] Конфликты сохраняются в sync_conflicts с server_payload и client_payload
  - [x] RegisterDeviceAction обновляет last_synced_revision, last_synced_at
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-6: ChangesController + ChangesRequest + SyncChangesResource + route
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-10
- **Блокирует:** MOB-13, WEB-6, TEST-7
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать endpoint GET /api/v1/sync/changes?since={revision}. Контроллер вызывает SyncPullService, возвращает SyncChangesResource с изменениями.
- **Реализация:** app/Http/Controllers/Sync/ChangesController.php (__invoke), app/Http/Requests/Sync/ChangesRequest.php, app/Http/Resources/Sync/SyncChangesResource.php, routes.
- **Файлы:** `backend/app/Http/Controllers/Sync/ChangesController.php`, `backend/app/Http/Requests/Sync/ChangesRequest.php`, `backend/app/Http/Resources/Sync/SyncChangesResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] GET /api/v1/sync/changes?since=0 возвращает 200 с {data:{notes[],lists[],items[],reminders[]},meta:{cursor,has_more}}
  - [x] Требует auth:sanctum
  - [x] Tombstones включены
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MBE-7: PushController + PushRequest + результат-resource + ConflictsController + Device контроллеры + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** DEV-11
- **Блокирует:** MOB-13, WEB-6, TEST-7
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать endpoint POST /api/v1/sync/push для отправки изменений, GET /api/v1/sync/conflicts для просмотра конфликтов. Device контроллеры: PUT /api/v1/devices/{uuid}, DELETE /api/v1/devices/{uuid}.
- **Реализация:** app/Http/Controllers/Sync/{PushController.php, ConflictsController.php}, app/Http/Controllers/Devices/{UpdateController.php, DestroyController.php}, requests, resources, routes.
- **Файлы:** `backend/app/Http/Controllers/Sync/PushController.php`, `backend/app/Http/Controllers/Sync/ConflictsController.php`, `backend/app/Http/Controllers/Devices/UpdateController.php`, `backend/app/Http/Controllers/Devices/DestroyController.php`, `backend/app/Http/Requests/Sync/PushRequest.php`, `backend/app/Http/Resources/Sync/SyncPushResultResource.php`, `backend/app/Http/Resources/Sync/ConflictResource.php`, `backend/app/Http/Resources/DeviceResource.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] POST /api/v1/sync/push возвращает 200 с {data:{applied[],conflicts[],cursor}}
  - [x] GET /api/v1/sync/conflicts возвращает 200 с массивом конфликтов
  - [x] PUT /api/v1/devices/{uuid} обновляет name и last_synced_revision
  - [x] DELETE /api/v1/devices/{uuid} удаляет device (каскад или мягкое удаление)
  - [x] Все требуют auth:sanctum
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-13: syncApi + types + applyChanges (LWW в SQLite)
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** MOB-3, MBE-6, MBE-7
- **Блокирует:** MOB-14
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать sync API функции (pullChanges, pushChanges), типы для sync операций, функцию applyChanges для применения изменений в SQLite с LWW по updated_at.
- **Реализация:** src/api/syncApi.ts (functions: getChanges, pushChanges), src/types/sync.ts (SyncChange, SyncPushResult, Conflict), src/services/sync/applyChanges.ts (LWW логика для upsert/tombstone).
- **Файлы:** `mobile/src/api/syncApi.ts`, `mobile/src/types/sync.ts`, `mobile/src/services/sync/applyChanges.ts`
- **Критерии приёмки:**
  - [x] getChanges(since) возвращает structure {notes, lists, items, reminders, cursor, has_more}
  - [x] pushChanges(changes) возвращает {applied, conflicts, cursor}
  - [x] applyChanges(changes) применяет LWW к SQLite (новые или одновозрастные записи перезаписываются)
  - [x] Tombstones (deleted_at) корректно обрабатываются (soft delete в SQLite)
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-14: pushChanges + pullChanges + backoff
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** MOB-13
- **Блокирует:** MOB-15
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Реализовать функции pushChanges (отправить outbox) и pullChanges (получить изменения). Добавить exponential backoff при ошибках сети (FR-36): 1s, 2s, 4s, 8s, макс 5 попыток.
- **Реализация:** src/services/sync/{pushChanges.ts, pullChanges.ts, backoff.ts}. pushChanges читает sync_outbox, отправляет на сервер, очищает применённые. pullChanges вызывает applyChanges. Backoff реализован как retry-декоратор.
- **Файлы:** `mobile/src/services/sync/pushChanges.ts`, `mobile/src/services/sync/pullChanges.ts`, `mobile/src/services/sync/backoff.ts`
- **Критерии приёмки:**
  - [x] pushChanges() читает outbox, отправляет, очищает применённые записи
  - [x] pullChanges() применяет LWW, обновляет last_pulled_revision
  - [x] Backoff: exponential delay (1s, 2s, 4s, 8s), макс 5 попыток
  - [x] При успехе: очистить outbox, обновить cursor в sync_meta
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-15: syncEngine + useSyncEngine + триггеры (онлайн/ручной/full pull при логине)
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** MOB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать главный syncEngine, который управляет синхронизацией: push → pull → apply. Хук useSyncEngine для подписки на события. Триггеры: автоматич при онлайн (используя useNetStatus), ручной trigger (кнопка Sync), full pull при логине (last_pulled_revision=0).
- **Реализация:** src/services/sync/syncEngine.ts, src/hooks/useSyncEngine.ts. syncEngine.sync() выполняет: if (sync_enabled && isOnline) { pushChanges → pullChanges → apply }. useSyncEngine подписывает на onChange событие. App.tsx/layout вызывает sync при старте с lastPulledRevision=0.
- **Файлы:** `mobile/src/services/sync/syncEngine.ts`, `mobile/src/hooks/useSyncEngine.ts`, обновить `mobile/app/_layout.tsx` или основной App компонент
- **Критерии приёмки:**
  - [x] syncEngine.sync() выполняет push → pull → apply последовательно
  - [x] useSyncEngine() возвращает {sync, isSyncing, lastError, lastSyncedAt}
  - [x] При логине: full pull (since=0)
  - [x] При возвращении онлайн: автоматич sync (с backoff)
  - [x] Кнопка Sync вручную может запустить syncEngine.sync()
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-6: syncApi + useSync + SyncView (статус, устройства, конфликты)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-6, MBE-7, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать API функции для sync (pullChanges, getConflicts), composable useSync, страницу SyncView в ЛК, которая показывает статус синхронизации, список устройств и конфликты.
- **Реализация:** src/api/syncApi.ts, src/composables/useSync.ts, src/pages/lk/sync/SyncView.vue. SyncView показывает таблицу конфликтов с сервером payload, client payload, кнопка resolve.
- **Файлы:** `web/src/api/syncApi.ts`, `web/src/composables/useSync.ts`, `web/src/pages/lk/sync/SyncView.vue`
- **Критерии приёмки:**
  - [x] SyncView загружает и показывает конфликты
  - [x] Показывает список устройств с last_synced_at
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-7: SyncPushService LWW (старее→конфликт/новее→применяется), идемпотентность, tombstone в pull, ConflictResolver unit
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-6, MBE-7
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Unit и integration тесты для SyncPushService и ConflictResolver. Проверить LWW логику, идемпотентность (двойной push одинаковых данных), tombstones в PULL.
- **Реализация:** tests/Unit/Services/Sync/{ConflictResolverTest.php, SyncPushServiceTest.php}, tests/Feature/Sync/{PushTest.php, PullTest.php}.
- **Файлы:** `backend/tests/Unit/Services/Sync/ConflictResolverTest.php`, `backend/tests/Unit/Services/Sync/SyncPushServiceTest.php`, `backend/tests/Feature/Sync/PushTest.php`, `backend/tests/Feature/Sync/PullTest.php`
- **Критерии приёмки:**
  - [x] php artisan test все проходят
  - [x] LWW: if client_updated_at >= server_updated_at → apply, else → conflict
  - [x] Двойной push с одинаковыми данными идемпотентен
  - [x] PULL включает tombstones (deleted_at IS NOT NULL)
  - [x] ConflictResolver сохраняет обе версии в sync_conflicts
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-8: applyChanges LWW unit, pushChanges очистка outbox, backoff
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для applyChanges, pushChanges, backoff с mock sqlite.
- **Реализация:** tests/services/sync/{applyChanges.test.ts, pushChanges.test.ts, backoff.test.ts}.
- **Файлы:** `mobile/__tests__/services/sync/applyChanges.test.ts`, `mobile/__tests__/services/sync/pushChanges.test.ts`, `mobile/__tests__/services/sync/backoff.test.ts`
- **Критерии приёмки:**
  - [x] npm test services/sync/*.test.ts все проходят (83 passed, 42 sync)
  - [x] applyChanges LWW корректно (новое перезаписывает старое)
  - [x] pushChanges очищает outbox после успешной отправки
  - [x] backoff exponential: 1s, 2s, 4s, 8s
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Календарь

### MOB-16: useCalendar (выборка SQLite по диапазону) + MonthGrid/DayCell/DayRemindersSheet + calendar.tsx
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-9
- **Блокирует:** MOB-17
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать useCalendar хук для выборки напоминаний по месяцу из SQLite. Компоненты MonthGrid (месячный календарь), DayCell (ячейка дня), DayRemindersSheet (всплывающая панель с напоминаниями дня). Экран (tabs)/calendar.tsx.
- **Реализация:** src/hooks/useCalendar.ts (getDaysInMonth, getRemindersByMonth), src/components/calendar/{MonthGrid.tsx, DayCell.tsx, DayRemindersSheet.tsx}, app/(tabs)/calendar.tsx. Используется utils/dateRange для выборки дат. Результат: dateRange utils (monthRange/getCalendarDays Пн-Вс/sameDay/ymd), useCalendar (byDay из remindersBetween), месячный экран с навигацией и списком дня → /reminders/[uuid]; tsc OK, jest 116.
- **Файлы:** `mobile/src/hooks/useCalendar.ts`, `mobile/src/components/calendar/MonthGrid.tsx`, `mobile/src/components/calendar/DayCell.tsx`, `mobile/src/components/calendar/DayRemindersSheet.tsx`, `mobile/app/(tabs)/calendar.tsx`
- **Критерии приёмки:**
  - [x] MonthGrid показывает 6 недель (календарь на месяц)
  - [x] DayCell подсвечивает дни с напоминаниями
  - [x] DayRemindersSheet всплывает при клике на день
  - [x] useCalendar возвращает reminders filtered по месяцу
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-17: systemCalendar (expo-calendar экспорт) + кнопка в ReminderForm
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-16
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать сервис systemCalendar для экспорта напоминания в системный календарь (iOS Calendar, Android Calendar) через expo-calendar. Добавить кнопку в ReminderForm для экспорта.
- **Реализация:** src/services/systemCalendar.ts (requestCalendarPermissions, createEvent из reminder), обновить src/components/reminders/ReminderForm.tsx с кнопкой Export. Результат: экспорт напоминания в системный календарь (expo-calendar, кросс-платформенно, FR-38), кнопка + Alert; tsc OK, jest 137.
- **Файлы:** `mobile/src/services/systemCalendar.ts`, обновить `mobile/src/components/reminders/ReminderForm.tsx`
- **Критерии приёмки:**
  - [x] systemCalendar.createEvent(reminder) экспортирует событие в системный календарь
  - [x] Запрашиваются права на доступ к календарю
  - [x] Кнопка Export видна в ReminderForm
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### WEB-7: useCalendar + CalendarView + MonthGrid
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать composable useCalendar (read-only выборка из API), компоненты MonthGrid, страницу CalendarView в ЛК.
- **Реализация:** src/composables/useCalendar.ts, src/components/calendar/MonthGrid.vue, src/pages/lk/calendar/CalendarView.vue. Результат: read-only месячный вид в ЛК, byDay группировка, навигация, список дня → /lk/reminders/:uuid; vue-tsc OK, Vitest 44.
- **Файлы:** `web/src/composables/useCalendar.ts`, `web/src/components/calendar/MonthGrid.vue`, `web/src/pages/lk/calendar/CalendarView.vue`
- **Критерии приёмки:**
  - [x] CalendarView показывает месячный вид с напоминаниями
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-9: dateRange utils unit, useCalendar выборка (mock sqlite)
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-16
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для dateRange utils и useCalendar выборки.
- **Реализация:** tests/utils/dateRange.test.ts, tests/hooks/useCalendar.test.ts. Результат: dateRange.test (24) + calendarGrouping.test (6); mobile-suite 137 passed, багов нет.
- **Файлы:** `mobile/__tests__/utils/dateRange.test.ts`, `mobile/__tests__/hooks/useCalendar.test.ts`
- **Критерии приёмки:**
  - [x] npm test utils/dateRange.test.ts проходит
  - [x] getDaysInMonth возвращает правильное количество дней
  - [x] useCalendar выборка корректна
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Безопасность

### MOB-18: lockStore + appLock (secure-store PIN + biometric) + useAppLock
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-1
- **Блокирует:** MOB-19
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать Zustand lockStore (pinSet, isLocked, biometricEnabled). Сервис appLock с методами: setPin (хеш в expo-secure-store), verifyPin, enableBiometric, disableBiometric. Хок useAppLock.
- **Реализация:** src/stores/lockStore.ts (Zustand + persist), src/services/appLock.ts (crypto для PIN-хеша, expo-local-authentication для биометрии), src/hooks/useAppLock.ts. Результат: lockStore (pinSet/biometricEnabled/isLocked/isHydrated + hydrate/lock/unlock), appLock (setPin с SHA256+salt, verifyPin, isPinSet, clearPin, биометрия включается через requestBiometricPermission), useAppLock; tsc OK, jest 137.
- **Файлы:** `mobile/src/stores/lockStore.ts`, `mobile/src/services/appLock.ts`, `mobile/src/hooks/useAppLock.ts`
- **Критерии приёмки:**
  - [x] setPin(pin) хеширует с солью и сохраняет в expo-secure-store (без plaintext)
  - [x] verifyPin(pin) проверяет хеш (SHA256)
  - [x] enableBiometric() запрашивает разрешение через expo-local-authentication
  - [x] isPinSet() возвращает boolean
  - [x] clearPin() удаляет PIN
  - [x] useAppLock() работает (хук для использования в компонентах)
  - [x] TypeScript strict mode
  - [x] lockStore гидрируется при старте, persist работает
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### MOB-19: lock.tsx + LockProvider (AppState gate) + settings/security.tsx
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Реализовать lock.tsx с PIN-вводом и биометрией. Создать LockProvider, который подписывается на AppState (при переходе в фон → lock, при возврате → проверить PIN). Страница settings/security.tsx для установки PIN и включения биометрии.
- **Реализация:** app/lock.tsx (PinPad component с кнопками 0-9, PinDots для визуализации, автоматич. биометрия при попытке), src/providers/LockProvider.tsx (AppState listener, скрывает экран при фоне, требует разблокировки при возврате), app/settings/security.tsx (toggles для PIN и биометрии, форма установки PIN, смена PIN). _layout.tsx оборачивает приложение в LockProvider. Результат: lock.tsx (PIN-pad + autofocus биометрия, Попытка 0), LockProvider (оверлей над children, AppState→lock, гидрация перед splash), settings/security.tsx (вкл/выкл PIN, биометрия, смена PIN); tsc OK, jest 149.
- **Файлы:** `mobile/app/lock.tsx`, `mobile/src/providers/LockProvider.tsx`, `mobile/app/settings/security.tsx`, обновить `mobile/app/_layout.tsx`
- **Критерии приёмки:**
  - [x] lock.tsx показывает PinPad + PinDots, проверяет PIN через useAppLock
  - [x] Автоматич. попытка биометрии при первом отобразении
  - [x] LockProvider подписывается на AppState (background→isLocked=true при возврате требуется разблокировка)
  - [x] security.tsx имеет toggles для PIN и биометрии, форма для установки нового PIN
  - [x] После рестарта приложения требуется PIN (если установлен, гидрация до splash)
  - [x] TypeScript strict mode
  - [x] Оверлей LockProvider корректно блокирует доступ до разблокировки
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

### TEST-10: appLock unit (verify PIN, mock secure-store/local-auth)
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для appLock с mock expo-secure-store и expo-local-authentication.
- **Реализация:** tests/services/appLock.test.ts (19 кейсов: setPin, verifyPin, isPinSet, clearPin, биометрия enable/disable/check, ошибки). Результат: 19 unit-тестов (setPin SHA256+salt, verifyPin валидация, биометрия мокируется через jest.mock), mobile-suite 168 passed, багов нет.
- **Файлы:** `mobile/__tests__/services/appLock.test.ts`
- **Критерии приёмки:**
  - [x] npm test services/appLock.test.ts проходит (19/19 passed)
  - [x] setPin хеширует и сохраняет в secure-store (моки работают)
  - [x] verifyPin проверяет хеш правильно (match/no-match)
  - [x] isPinSet возвращает boolean
  - [x] clearPin удаляет PIN из secure-store
  - [x] enableBiometric, disableBiometric, isBiometricAvailable работают с mocks
  - [x] Ошибки (invalid pin, secure-store error) обрабатываются
  - [x] Jest мокирует expo-secure-store и expo-local-authentication
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Настройки + Админка

### DEV-12: ToggleSyncAction + AdminPolicy + Admin UsersIndex/UserShow контроллеры
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-1
- **Блокирует:** MBE-8
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Создать ToggleSyncAction для переключения sync_enabled в профиле. AdminPolicy для проверки is_admin. Контроллеры Admin\UsersIndexController и Admin\UserShowController (read-only).
- **Реализация:** app/Actions/User/ToggleSyncAction.php, app/Policies/AdminPolicy.php, app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}.
- **Файлы:** `backend/app/Actions/User/ToggleSyncAction.php`, `backend/app/Policies/AdminPolicy.php`, `backend/app/Http/Controllers/Admin/UsersIndexController.php`, `backend/app/Http/Controllers/Admin/UserShowController.php`
- **Критерии приёмки:**
  - [x] ToggleSyncAction переключает users.sync_enabled
  - [x] AdminPolicy::viewAny() проверяет is_admin
  - [x] UsersIndexController возвращает список пользователей (только админам)
  - [x] UserShowController возвращает пользователя (только админам)
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

### MBE-8: ToggleSyncController + request + Admin Users контроллеры + routes (admin middleware)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-12
- **Блокирует:** MOB-20, WEB-8, WEB-9, TEST-11
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать endpoints PATCH /api/v1/settings/sync {sync_enabled}, GET /api/v1/admin/users (пагинированный список), GET /api/v1/admin/users/{id}. Admin routes с middleware проверкой is_admin.
- **Реализация:** app/Http/Controllers/Settings/ToggleSyncController.php, app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}, requests, routes.
- **Файлы:** `backend/app/Http/Controllers/Settings/ToggleSyncController.php`, обновить `backend/app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}`, `backend/app/Http/Requests/Settings/ToggleSyncRequest.php`, обновить `backend/routes/api.php`
- **Критерии приёмки:**
  - [x] PATCH /api/v1/settings/sync {sync_enabled: true} обновляет users.sync_enabled
  - [x] GET /api/v1/admin/users требует is_admin, возвращает список (paginated)
  - [x] GET /api/v1/admin/users/{id} требует is_admin, возвращает пользователя
  - [x] Нон-админы получают 403
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

### MOB-20: settingsStore + useSettings + ThemeProvider (light/dark/system) + profile/settings экраны + SettingRow
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-1, MBE-8
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Создать Zustand settingsStore (notifications_enabled, sync_enabled, theme). Хук useSettings. ThemeProvider для light/dark/system темы. Экраны (tabs)/profile.tsx и app/settings/index.tsx. Компонент SettingRow.
- **Реализация:** src/stores/settingsStore.ts (Zustand + AsyncStorage persist), src/hooks/useSettings.ts, src/providers/ThemeProvider.tsx (ColorScheme context), app/(tabs)/profile.tsx, app/settings/index.tsx, src/components/settings/SettingRow.tsx.
- **Файлы:** `mobile/src/stores/settingsStore.ts`, `mobile/src/hooks/useSettings.ts`, `mobile/src/providers/ThemeProvider.tsx`, `mobile/app/(tabs)/profile.tsx`, `mobile/app/settings/index.tsx`, `mobile/src/components/settings/SettingRow.tsx`
- **Критерии приёмки:**
  - [x] settingsStore инстанцируется, методы работают (toggleNotifications, toggleSync, setTheme)
  - [x] Настройки сохраняются в AsyncStorage
  - [x] ThemeProvider применяет тему при старте (system default)
  - [x] profile.tsx показывает профиль пользователя (логаут)
  - [x] settings.tsx показывает SettingRow для notifications, sync, theme
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

### WEB-8: settingsStore (Pinia) + useTheme + SettingsView (ЛК)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-8, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать Pinia settingsStore, composable useTheme, страницу SettingsView в ЛК для настроек (notifications, sync, theme).
- **Реализация:** src/stores/settingsStore.ts (Pinia), src/composables/useTheme.ts, src/pages/lk/SettingsView.vue.
- **Файлы:** `web/src/stores/settingsStore.ts`, `web/src/composables/useTheme.ts`, `web/src/pages/lk/SettingsView.vue`
- **Критерии приёмки:**
  - [x] SettingsView показывает toggles для notifications, sync, theme
  - [x] Сохранение синхронизируется с сервером (PATCH /api/v1/settings/sync)
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

### WEB-9: Админка — UsersListView/UserDetailView/DashboardView + router guard roles:['admin']
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-8, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать админку на Vue: DashboardView (статистика), UsersListView (таблица пользователей), UserDetailView (детали пользователя). Router guard для проверки is_admin.
- **Реализация:** src/pages/admin/{DashboardView.vue, UsersListView.vue, UserDetailView.vue}, src/router/guards.ts (добавить requireAdmin guard).
- **Файлы:** `web/src/pages/admin/DashboardView.vue`, `web/src/pages/admin/UsersListView.vue`, `web/src/pages/admin/UserDetailView.vue`, обновить `web/src/router/guards.ts` и `web/src/router/index.ts`
- **Критерии приёмки:**
  - [x] /admin требует is_admin (guard)
  - [x] DashboardView показывает статистику (количество пользователей, напоминаний)
  - [x] UsersListView показывает таблицу пользователей (GET /api/v1/admin/users)
  - [x] UserDetailView показывает детали и позволяет редактировать
  - [x] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

### TEST-11: ToggleSyncAction unit, AdminPolicy (admin 200/non-admin 403), settings store unit
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-8
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Unit тесты для ToggleSyncAction, AdminPolicy, integration тесты для endpoints.
- **Реализация:** tests/Unit/Models/AdminPolicyTest.php, tests/Feature/Settings/ToggleSyncTest.php, tests/Feature/Admin/{UsersIndexTest.php, UserShowTest.php}.
- **Файлы:** `backend/tests/Unit/Models/AdminPolicyTest.php`, `backend/tests/Feature/Settings/ToggleSyncTest.php`, `backend/tests/Feature/Admin/UsersIndexTest.php`, `backend/tests/Feature/Admin/UserShowTest.php`
- **Критерии приёмки:**
  - [x] php artisan test все проходят (219 passed — все тесты backend)
  - [x] AdminPolicy: is_admin=true 200, false 403
  - [x] ToggleSyncTest: PATCH /api/v1/settings/sync обновляет users.sync_enabled
  - [x] Admin endpoints требуют is_admin
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-16

---

## Feature: Суперадмин (управление пользователями в ЛК)

### DEV-13: is_super_admin + is_active флаги, Actions (SetUserActiveAction, ChangeUserPasswordAction, SetUserRolesAction, DeleteUserAction), seeder
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-1
- **Блокирует:** MBE-9
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Добавить флаги is_super_admin (bool, default false) и is_active (bool, default true) в миграцию users. Реализовать методы модели User: isSuperAdmin(), isActive(), revokeTokens(). Создать Actions: SetUserActiveAction, ChangeUserPasswordAction, SetUserRolesAction (assign/revoke админской роли), DeleteUserAction. Реализовать блокировку входа неактивного пользователя в LoginController. Создать seeder с суперадмин пользователем admin@demo.local.
- **Реализация:** Миграция ALTER users ADD is_super_admin/is_active. User модель с методами и casts. Actions в app/Actions/{User,Admin}/ (SetUserActiveAction, ChangeUserPasswordAction, SetUserRolesAction, DeleteUserAction), каждый invokable. LoginController проверка !user.isActive() → 403. DatabaseSeeder с create admin@demo.local → is_super_admin=true, is_active=true.
- **Файлы:** `backend/database/migrations/*_add_super_admin_fields_to_users_table.php`, `backend/app/Models/User.php` (обновить), `backend/app/Actions/Admin/SetUserActiveAction.php`, `backend/app/Actions/Admin/ChangeUserPasswordAction.php`, `backend/app/Actions/Admin/SetUserRolesAction.php`, `backend/app/Actions/Admin/DeleteUserAction.php`, `backend/app/Http/Controllers/Auth/LoginController.php` (обновить), `backend/database/seeders/DatabaseSeeder.php` (обновить)
- **Критерии приёмки:**
  - [x] php artisan migrate успешна: users.is_super_admin, users.is_active (BOOLEAN типы)
  - [x] User::isSuperAdmin() возвращает is_super_admin
  - [x] User::isActive() возвращает is_active
  - [x] User::revokeTokens() отзывает все Sanctum токены пользователя
  - [x] SetUserActiveAction переключает is_active, возвращает User
  - [x] ChangeUserPasswordAction обновляет password (хеширование)
  - [x] SetUserRolesAction: assign admin role + user_roles.is_admin = true; revoke role
  - [x] DeleteUserAction soft-delete user (soft deletes уже в миграции DEV-1)
  - [x] LoginController проверка user.isActive() === false → 403 (не может войти)
  - [x] Seeder создаёт admin@demo.local с is_super_admin=true (password=password)
  - [x] php artisan db:seed успешен, admin@demo.local готов к логину
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-17
- **Завершена:** 2026-06-17

### MBE-9: EnsureSuperAdmin middleware, контроллеры (UserSetStatus/UserPassword/UserRoles/UserDestroy), Form Requests + guard'ы, ресурсы (AdminUserResource, UserResource +is_super_admin/+is_active), маршруты
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-13
- **Блокирует:** WEB-10, TEST-12
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Создать middleware EnsureSuperAdmin (alias superadmin) для проверки is_super_admin=true (403 иначе). Реализовать контроллеры для управления пользователями: UserSetStatusController (PATCH {uuid}/status), UserPasswordController (PATCH {uuid}/password), UserRolesController (PATCH {uuid}/roles), UserDestroyController (DELETE {uuid}). Form Requests с guard'ами: нельзя менять статус/пароль/удалить самого себя, нельзя отозвать последнего активного суперадмина. Расширить UserResource полями is_super_admin, is_active. Создать AdminUserResource для списков. Маршруты под /api/v1/admin/users с middleware superadmin.
- **Реализация:** app/Http/Middleware/EnsureSuperAdmin.php → check auth()->user()->isSuperAdmin(). Контроллеры в app/Http/Controllers/Admin/{UserSetStatusController, UserPasswordController, UserRolesController, UserDestroyController}.php (invokable). Form Requests: SetUserStatusRequest, ChangeUserPasswordRequest, SetUserRolesRequest, DestroyUserRequest с authorize() методами (self-check, last-active-superadmin-check). Resources: AdminUserResource, обновить UserResource. Routes в routes/api.php: PATCH {user:uuid}/status|password|roles, DELETE {uuid}, все под middleware superadmin.
- **Файлы:** `backend/app/Http/Middleware/EnsureSuperAdmin.php`, `backend/app/Http/Controllers/Admin/UserSetStatusController.php`, `backend/app/Http/Controllers/Admin/UserPasswordController.php`, `backend/app/Http/Controllers/Admin/UserRolesController.php`, `backend/app/Http/Controllers/Admin/UserDestroyController.php`, `backend/app/Http/Requests/Admin/SetUserStatusRequest.php`, `backend/app/Http/Requests/Admin/ChangeUserPasswordRequest.php`, `backend/app/Http/Requests/Admin/SetUserRolesRequest.php`, `backend/app/Http/Requests/Admin/DestroyUserRequest.php`, `backend/app/Http/Resources/AdminUserResource.php`, `backend/app/Http/Resources/UserResource.php` (обновить), `backend/routes/api.php` (обновить)
- **Критерии приёмки:**
  - [x] Middleware EnsureSuperAdmin проверяет is_super_admin → 403 иначе
  - [x] PATCH /api/v1/admin/users/{uuid}/status → 200, обновляет is_active (guard: не self)
  - [x] PATCH /api/v1/admin/users/{uuid}/password → 200, хеширует (guard: не self)
  - [x] PATCH /api/v1/admin/users/{uuid}/roles → 200, assign/revoke admin (guard: не self, не последний активный суперадмин)
  - [x] DELETE /api/v1/admin/users/{uuid} → 204, soft delete (guard: не self, не последний активный суперадмин)
  - [x] AdminUserResource: uuid, name, email, is_admin, is_super_admin, is_active, created_at
  - [x] UserResource: добавлены is_super_admin, is_active
  - [x] Маршруты в /api/v1/admin/users с route model binding {user:uuid}
  - [x] Все контроллеры требуют auth:sanctum + superadmin middleware
  - [x] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-17
- **Завершена:** 2026-06-17

### WEB-10: Страница управления пользователями (UsersListView, UserDetailView), API-методы (fetchUsers, fetchUser, setUserStatus, changeUserPassword, setUserRoles, deleteUser), composable useUsers, гейтинг по is_super_admin
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-9, WEB-1
- **Блокирует:** TEST-12
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Создать API функции для управления пользователями в суперадмин панели. Composable useUsers для управления состоянием. Страницы: UsersListView (таблица пользователей со статусом, ролями, действиями), UserDetailView (детальный просмотр + редактирование). Добавить guard в router для проверки is_super_admin. При заблокированном входе показать сообщение на LoginView.
- **Реализация:** src/api/usersApi.ts (fetchUsers, fetchUser, setUserStatus, changeUserPassword, setUserRoles, deleteUser). src/composables/useUsers.ts (состояние пользователей). src/pages/admin/UsersListView.vue (таблица со статусом/ролями, кнопки действий — блокировка, смена пароля, права, удаление). src/pages/admin/UserDetailView.vue (форма редактирования). src/router/guards.ts + requireSuperAdmin. src/pages/auth/LoginView.vue (обновить — сообщение если account blocked).
- **Файлы:** `web/src/api/usersApi.ts`, `web/src/composables/useUsers.ts`, `web/src/pages/admin/UsersListView.vue`, `web/src/pages/admin/UserDetailView.vue`, `web/src/router/guards.ts` (обновить), `web/src/pages/auth/LoginView.vue` (обновить), `web/src/types/admin.ts`
- **Критерии приёмки:**
  - [x] usersApi: fetchUsers (paginated), fetchUser, setUserStatus, changeUserPassword, setUserRoles, deleteUser
  - [x] useUsers composable: users/isLoading + load/setStatus/changePassword/setRoles/remove методы
  - [x] UsersListView: таблица (uuid, name, email, is_admin, is_super_admin, is_active), кнопки (блокировка, смена пароля, права, удаление)
  - [x] Быстрые toggle: статус (активный/неактивный) переключается в строке, админ-роль toggle
  - [x] Модальные окна/подтверждения для смены пароля, удаления
  - [x] UserDetailView: полные поля редактирования + сохранение
  - [x] Guard requireSuperAdmin проверяет auth store is_super_admin
  - [x] Доступ /admin/* требует is_super_admin (иначе редирект на /lk)
  - [x] LoginView: сообщение «Аккаунт заблокирован» если is_active=false
  - [x] script setup lang="ts", strict, без any; vue-tsc OK, Vitest тесты
- **Создана:** 2026-06-17
- **Завершена:** 2026-06-17

### TEST-12: Pest-тесты для суперадмин функционала (Actions, Policies, API endpoints, form guards)
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-9
- **Блокирует:** нет
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/01-general.md`, `/home/vselug/workspace/Napominalky/docs/02-php.md`, `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** Написать 35 Pest-тестов для фичи суперадмин: Actions unit (SetUserActiveAction, ChangeUserPasswordAction, SetUserRolesAction, DeleteUserAction), form guard'ы (self-check, last-active-superadmin-check), API endpoints (PATCH/DELETE статус/пароль/роли/удаление), авторизация (только суперадмин, только на других юзеров). Проверить всю функциональность end-to-end.
- **Реализация:** tests/Feature/Admin/SuperAdminUserManagementTest.php с 35 кейсами: SetUserActive (active/inactive), ChangePassword (valid/invalid), SetRoles (assign/revoke admin), DeleteUser (soft delete). Form guards: нельзя над собой, нельзя отозвать последнего активного суперадмина. API: 200 на success, 403 на non-superadmin, 404 на юзер не найден, 422 на валидация. Все тесты против PostgreSQL (RefreshDatabase).
- **Файлы:** `backend/tests/Feature/Admin/SuperAdminUserManagementTest.php`
- **Критерии приёмки:**
  - [x] php artisan test — все 35 тестов зелёные (254 passed всего, 911 assertions)
  - [x] SetUserActiveAction unit: активирует/деактивирует, возвращает User
  - [x] ChangeUserPasswordAction unit: обновляет password (хеш)
  - [x] SetUserRolesAction unit: assign/revoke admin роль
  - [x] DeleteUserAction unit: soft delete
  - [x] Form guard: нельзя менять себя → 422
  - [x] Form guard: нельзя отозвать последнего активного суперадмина → 422
  - [x] PATCH /api/v1/admin/users/{uuid}/status: 200 на success, 403 на non-superadmin, 404 на not found
  - [x] PATCH /api/v1/admin/users/{uuid}/password: 200, 403, 404
  - [x] PATCH /api/v1/admin/users/{uuid}/roles: 200, 403, 404, 422 (last-active-superadmin)
  - [x] DELETE /api/v1/admin/users/{uuid}: 204 на success, 403, 404, 422 (self/last-active)
  - [x] GET /api/v1/admin/users, GET /admin/users/{uuid}: 200 на admin, 403 на non-admin
  - [x] declare(strict_types=1), RefreshDatabase, против PostgreSQL
- **Создана:** 2026-06-17
- **Завершена:** 2026-06-17

---

## Feature: Документация (DOC)

### DOC-1: Сохранить архитектурный документ и наполнить реестр задач
- **Исполнитель:** technical-writer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** нет (параллельно с остальными)
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/07-task-management.md`
- **Описание:** Зафиксировать архитектурный план ARCH-1 в `/home/vselug/workspace/Napominalky/docs/architecture/mvp-architecture.md`. Заполнить реестр задач `/home/vselug/workspace/Napominalky/docs/TASKS.md`: обновить счётчики, добавить все 66 задач с описаниями, критериями приёмки и зависимостями.
- **Реализация:** Создать архитектурный документ со статусом «Согласовано» (6 согласованных решений). Сгруппировать задачи по фичам в TASKS.md. Счётчики: ARCH=1, OPS=3, DEV=12, MBE=10, MOB=20, WEB=9, TEST=11, REVIEW=0, SEC=0, DOC=1. Сводка: Completed=1, Pending=65.
- **Файлы:** `/home/vselug/workspace/Napominalky/docs/architecture/mvp-architecture.md`, `/home/vselug/workspace/Napominalky/docs/TASKS.md`
- **Критерии приёмки:**
  - [x] Архитектурный документ содержит все 10 групп фич и 3 слоя
  - [x] TASKS.md содержит все 66 задач (1 completed + 65 pending)
  - [x] Счётчики обновлены правильно
  - [x] Зависимости корректны (нет циклов)
  - [x] Каждая задача имеет описание, реализацию, критерии приёмки, файлы
  - [x] Критический путь выявлен: MOB-3 → все mobile-репозитории, DEV-2+DEV-9 → sync
  - [x] Архитектурный документ разместить в /docs/architecture/
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Редизайн веб-ЛК (личный кабинет)

Адаптивный редизайн личного кабинета клиента в стиле мобильного приложения по дизайн-макетам (десктоп: тёмно-зелёный сайдбар; мобайл: зелёная шапка + нижняя навигация). Разделы: Обзор, Задачи и списки, Календарь, Заметки. Данные — из существующих API (без моков).

### WEB-13: Адаптивная оболочка ЛК + раздел «Обзор» (фаза 1)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** WEB-14
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Переписана оболочка `LkLayout.vue` под адаптивный дизайн: десктоп-сайдбар (бренд, навигация Обзор/Задачи и списки/Календарь/Заметки с бейджами, кнопка «Создать», метр синхронизации, строка пользователя, сворачивание до ~84px) + topbar (бургер, заголовок/подзаголовок по разделу, поиск, колокол); мобайл — зелёная шапка с раскрывающимся поиском + нижняя навигация с центральным «+». Раздел «Обзор» на реальных данных: 4 стат-карточки, «Задачи на сегодня» (чекбокс), «Ближайшие напоминания», состояния loading/empty/error.
- **Файлы:** `web/src/layouts/LkLayout.vue`, `web/src/components/lk/{LkSidebar,LkTopbar,LkMobileHeader,LkBottomNav,LkIcon,LkStatCard,LkOverviewReminderItem}.vue`, `web/src/composables/{useLkBreakpoint,useLkNavCounts,useLkDashboard}.ts`, `web/src/constants/lkNav.ts`, `web/src/pages/lk/DashboardView.vue`, `web/src/router/index.ts`
- **Критерии приёмки:**
  - [x] Оболочка переключает десктоп/мобайл по брейкпоинту 1024px (`useLkBreakpoint`/matchMedia)
  - [x] Навигация с активным состоянием и бейджами (активные задачи, число заметок)
  - [x] «Обзор» на реальных API (списки/напоминания/заметки), состояния loading/empty/error
  - [x] vue-tsc OK, Vitest зелёный
- **Создана:** 2026-07-06
- **Завершена:** 2026-07-06

### UITEST-1: UI-fidelity аудит оболочки/Обзора против дизайн-брифа (фаза 1)
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-13
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Поэлементная сверка оболочки и «Обзора» с дизайн-брифом (структура сайдбара/таббара, токены цветов, сворачивание, стат-карточки, заголовки разделов). Найдено и исправлено minor-расхождение (регистр буквы в приветствии). Усилены fidelity-тесты.
- **Файлы:** `web/src/layouts/LkLayout.vue` (правка), `web/src/layouts/LkLayout.test.ts`, `web/src/components/lk/{LkStatCard,LkOverviewReminderItem,LkBottomNav}.test.ts`, `web/src/pages/lk/DashboardView.test.ts`
- **Критерии приёмки:**
  - [x] Сверка структуры/токенов оболочки и Обзора с брифом
  - [x] Расхождения зафиксированы, критичное/minor исправлено
  - [x] Fidelity-тесты усилены, Vitest зелёный
- **Создана:** 2026-07-06
- **Завершена:** 2026-07-06

### WEB-14: Раздел «Задачи и списки» + хлебные крошки + домаппинг полей бэкенда (фаза 2)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-13
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Раздел «Задачи и списки» (`/lk/tasks`): десктоп — карточки списков (тип Купить/Сделать, теги, прогресс, дата, действия) + тулбар (поиск/сортировка/фильтры по завершённости/типу/тегу) + right-rail (мини-календарь с отметками напоминаний + ближайшие напоминания) на ≥1280px; мобайл — карточки в колонку. Хлебные крошки во всех разделах (кликабельная цепочка возврата, динамический хвост из загруженной сущности). Домаппинг реальных полей бэкенда: `type`/`tags` списков; `quantity`/`deadline`/`reminder_at`/`link`/`comment`/`tags` пунктов (в деталях списка); теги парсятся из JSON-строки в API-слое. Детали списка приведены в новый стиль.
- **Файлы:** `web/src/pages/lk/tasks/TasksView.vue`, `web/src/components/lk/tasks/{LkShoppingListCard,LkTasksFilterBar,LkTasksRightRail,LkMiniCalendar,LkListItemRow}.vue`, `web/src/components/lk/{LkBreadcrumbs,LkTagPill,LkCategoryPill}.vue`, `web/src/composables/{useLkTasksList,useLkUpcomingReminders,useLkBreadcrumbTail,useShoppingList}.ts`, `web/src/constants/{lkBreadcrumbs,lkTagColors,lkCategoryColors}.ts`, `web/src/utils/tags.ts`, `web/src/api/shoppingListsApi.ts`, `web/src/types/shoppingList.ts`, `web/src/pages/lk/lists/ListDetailView.vue`
- **Критерии приёмки:**
  - [x] Раздел «Задачи и списки» с карточками/фильтрами/сортировкой на реальных данных
  - [x] Right-rail только при ≥1280px (мини-календарь + ближайшие напоминания)
  - [x] Хлебные крошки во всех разделах, финальный сегмент некликабелен
  - [x] Реальные поля бэкенда отображаются (type/tags/quantity/deadline/reminder_at/link/comment)
  - [x] vue-tsc OK, Vitest зелёный (204 теста)
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### UITEST-2: UI-fidelity аудит раздела «Задачи и списки» (фаза 2)
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Сверка фазы 2 (крошки, «Задачи и списки», палитра тегов, метаданные пунктов, адаптив right-rail) с дизайн-брифом. Найден и исправлен HIGH-дефект: пункт меню «Создать → Новый список покупок» вёл на старую нередизайненную страницу `lk-lists` — переключён на редизайненный `lk-tasks`.
- **Файлы:** `web/src/layouts/LkLayout.vue` (фикс маршрута), `web/src/layouts/LkLayout.test.ts`, `web/src/utils/shoppingList.ts`
- **Критерии приёмки:**
  - [x] Сверка вёрстки/токенов/палитры тегов с брифом фазы 2
  - [x] HIGH-дефект навигации найден и исправлен
  - [x] Тесты усилены, Vitest зелёный
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### WEB-15: Раздел «Календарь» — сетка месяца + события дня, агрегация напоминаний и дедлайнов пунктов (фаза 3)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Раздел «Календарь» (`/lk/calendar`) в новом стиле: сетка месяца 6×7 (навигация ‹/›/«Сегодня», состояния сегодня/выбран/вне месяца, цветные чипы событий + «+N», на мобайле — точки-индикаторы) и панель выбранного дня (right-rail ≥1280px или секция ниже) со списком событий (метка типа, время/«весь день», клик → источник). Унифицированная модель `LkCalendarEvent` агрегирует события из напоминаний (`remind_at`) и пунктов списков с `deadline`/`reminder_at`; тип и цвет по источнику: списки teal, напоминания amber, дела blue (+легенда). Устойчивость: падение загрузки пунктов не рушит календарь (напоминания остаются). Date-range фильтра у API нет — пул тянется и группируется на клиенте.
- **Реализация:** `useLkCalendar.ts` (агрегация/состояние месяца/byDay/устойчивость), компоненты `LkCalendarGrid`/`LkCalendarDayPanel`/`LkCalendarEventRow`/`LkCalendarLegend`, тип `types/lkCalendar.ts`, цвета `constants/lkCalendarColors.ts`. Реюз `utils/calendar.ts` (getCalendarDays/ymd/sameDay). Старый `MonthGrid.vue` удалён; `useCalendar.ts` сохранён (используется мини-календарём right-rail «Задач»).
- **Файлы:** `web/src/composables/useLkCalendar.ts`, `web/src/components/lk/calendar/{LkCalendarGrid,LkCalendarDayPanel,LkCalendarEventRow,LkCalendarLegend}.vue`, `web/src/types/lkCalendar.ts`, `web/src/constants/lkCalendarColors.ts`, `web/src/pages/lk/calendar/CalendarView.vue`
- **Критерии приёмки:**
  - [x] Сетка месяца 6×7 с навигацией и состояниями дней, чипы/точки событий
  - [x] Панель дня со списком событий (тип/время/route), пустое состояние
  - [x] Агрегация напоминаний + дедлайнов/напоминаний пунктов (goods→list, tasks→task), устойчивость при падении пунктов
  - [x] Легенда и цвета типов по брифу, адаптив (right-rail ≥1280px)
  - [x] vue-tsc OK, Vitest зелёный (232 теста)
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### UITEST-3: UI-fidelity аудит раздела «Календарь» (фаза 3)
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-15
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Сверка фазы 3 (агрегация событий, сетка/чипы/точки, панель дня, легенда/цвета, навигация месяца, состояния) с дизайн-брифом. Позиция панели дня переведена с CSS-only `@media` на JS-управление (`useLkWideDesktop` + классы) для единообразия с фазой 2 и тестируемости; добавлен сквозной тест агрегации 3 типов событий. Отмечена low-находка: `deadline` парсится через `new Date('YYYY-MM-DD')` (UTC-полночь) — для МSK не проявляется, рекомендовано DEV/ARCH.
- **Файлы:** `web/src/pages/lk/calendar/CalendarView.vue`, `web/src/pages/lk/calendar/CalendarView.test.ts`
- **Критерии приёмки:**
  - [x] Сверка агрегации/сетки/панели/легенды/навигации с брифом фазы 3
  - [x] Позиция панели дня — JS-управляемая и покрыта тестом
  - [x] Сквозной тест агрегации напоминаний/дедлайнов/напоминаний пунктов
  - [x] Тесты зелёные (232), vue-tsc чист
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### WEB-16: Фикс 422 в календаре — per_page напоминаний 200→100 (лимит API)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-15
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Календарь (`useLkCalendar`) и мини-календарь right-rail «Задач» (`useCalendar`) запрашивали напоминания с `per_page=200`, тогда как валидация API `IndexReminderRequest` разрешает `max:100` → HTTP 422 на загрузке (у пользователя — «Request failed with status code 422»). Снижено до 100 (максимум API). Также чинило молчаливый сбой мини-календаря в разделе «Задачи и списки».
- **Файлы:** `web/src/composables/useLkCalendar.ts`, `web/src/composables/useCalendar.ts` (+тесты)
- **Критерии приёмки:**
  - [x] per_page напоминаний ≤ 100 в обоих композаблах
  - [x] Календарь загружается без 422
  - [x] Тесты зелёные, vue-tsc чист
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### WEB-17: Раздел «Заметки» (masonry-стикеры) + форма заметки + favicon/title (фаза 4)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Раздел «Заметки» (`/lk/notes`) в новом стиле: masonry-стикеры через CSS `columns` (адаптив 1→2→3→4 + `break-inside:avoid`), пастельный фон карточки детерминированно по uuid, заголовок/превью тела (обрезка), пин/архив/удаление (оптимистично, удаление с подтверждением), группа «Закреплённые» над «Остальные», поиск с дебаунсом, переключатель архива, «Загрузить ещё» (`per_page=20 ≤ 100`), состояния скелет/пусто/ошибка. Форма заметки (`NoteEditView`) в новом стиле: заголовок, textarea авто-высоты, тумблеры «Закрепить»/«В архив», Сохранить/Удалить, крошка-хвост = заголовок; ошибки сохранения (в т.ч. 422) теперь всплывают в UI (ранее `useNotes` их проглатывал). Favicon вкладки браузера: бренд-колокол в amber-квадрате (`public/favicon.svg`, `%BASE_URL%` под `/napominalki/`), title «Напоминалки».
- **Файлы:** `web/src/pages/lk/notes/{NotesListView,NoteEditView}.vue`, `web/src/components/lk/notes/{LkNoteCard,LkNotesToolbar,LkNoteSkeleton}.vue`, `web/src/composables/{useLkNotesList,useNotes}.ts`, `web/src/constants/lkNoteColors.ts`, `web/src/components/lk/LkIcon.vue` (иконки pin/archive), `web/index.html`, `web/public/favicon.svg`
- **Критерии приёмки:**
  - [x] Masonry-стикеры (CSS columns) с адаптивом колонок и группой «Закреплённые»
  - [x] Пин/архив/удаление и поиск/фильтр архива на реальном API, per_page ≤ 100
  - [x] Форма заметки в новом стиле, крошка-хвост = заголовок, ошибки сохранения видны
  - [x] Favicon (бренд-колокол) + title «Напоминалки» на вкладке
  - [x] vue-tsc OK, Vitest зелёный (271 тест)
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

### UITEST-4: UI-fidelity аудит раздела «Заметки» + проверка favicon (фаза 4)
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-17
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Сверка фазы 4 (masonry/стикеры, детерминизм цвета, пин/архив/удаление, группировка, форма, состояния, favicon/title) с дизайн-брифом. Расхождений, требующих правок кода, не найдено; усилено покрытие (детерминизм цвета стикера, карточка). Статически подтверждён favicon (резолв под `/napominalki/`, копия в dist). Отмечена информационная находка (не дефект фазы): ошибки точечных действий pin/archive/delete заменяют весь контент блоком ошибки — общий паттерн приложения; рекомендован toast-подход отдельной задачей.
- **Файлы:** `web/src/constants/lkNoteColors.test.ts`, `web/src/components/lk/notes/LkNoteCard.test.ts`
- **Критерии приёмки:**
  - [x] Сверка masonry/карточки/группировки/формы/состояний с брифом фазы 4
  - [x] Favicon/title статически подтверждены
  - [x] Fidelity-тесты усилены, Vitest зелёный (271)
- **Создана:** 2026-07-07
- **Завершена:** 2026-07-07

---

## Feature: Мобилка — надёжность уведомлений

### MOB-51: Точные будильники на Android 12+ — пуши по времени, а не при открытии приложения
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/mobile/AGENTS.md`
- **Описание:** Жалоба: локальные уведомления на Android срабатывали не по установленному времени, а в момент открытия/активации приложения. Причина: `expo-notifications` (`ExpoSchedulingDelegate.kt`) на Android 12+/API 31+ планирует точный будильник (`setExactAndAllowWhileIdle`) только при `alarmManager.canScheduleExactAlarms()==true`, иначе откатывается на неточный (`setAndAllowWhileIdle`) — ОС батчит и откладывает доставку до пробуждения/foreground. Разрешений exact-alarm в манифесте не было. Добавлены `SCHEDULE_EXACT_ALARM` (API 31–32) и `USE_EXACT_ALARM` (API 33+) в `app.json` android.permissions → `canScheduleExactAlarms()` истинно → доставка точно по времени даже при закрытом приложении. Предыдущий фикс (Android-канал + reschedule-on-start + маппинг reminder_at) устранял только foreground-показ, но не точность доставки. Требует пересборки APK (нативный манифест), versionCode 29.
- **Файлы:** `mobile/app.json` (android.permissions), `mobile/src/services/notifications.ts` (пояснительный комментарий — не удалять разрешения)
- **Критерии приёмки:**
  - [x] SCHEDULE_EXACT_ALARM + USE_EXACT_ALARM в манифесте
  - [x] tsc чист, тесты уведомлений зелёные (22)
  - [x] Пересборка APK (versionCode 29) для проверки на устройстве
- **Создана:** 2026-07-08
- **Завершена:** 2026-07-08

---

## Feature: Редизайн веб-ЛК — финал (создание/формы)

### WEB-18: Единое меню «Создать» + форма создания списка + формы напоминаний в новом стиле (фаза 5)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-17
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Финал редизайна ЛК. Единое меню «Создать» (`LkCreateMenu`): desktop-поповер у кнопки «Создать» (привязка к её координатам, закрытие вне/Esc) / mobile action-sheet от центральной «+»; 3 пункта — Заметка(teal)/Напоминание(amber)/Список(blue). Полноценная форма создания списка (`LkCreateListDialog`, модалка desktop / нижний лист mobile): название + тип Купить/Сделать (goods/tasks) + теги-чипы; `CreateShoppingListPayload`/`UpdateShoppingListPayload` расширены `type`/`tags`, теги сериализуются в JSON-строку (`serializeTagsPayload`, симметрично `parseTags`); заменила старую инлайн-форму в `TasksView` (единый путь создания из меню и «+ Новый список»). `ReminderEditView` переведён в новый стиль (карточка, повтор-пиллы, textarea авто-высоты, крошка-хвост, прямые вызовы remindersApi → ошибки 422 видны). `RemindersView` в новом стиле (карточки `LkReminderCard`: статус/повтор-бейджи, выполнить/+10м/+1ч/редакт/удалить, фильтр-пиллы, per_page=100).
- **Файлы:** `web/src/components/lk/{LkCreateMenu,LkCreateListDialog}.vue`, `web/src/layouts/LkLayout.vue`, `web/src/components/lk/LkSidebar.vue`, `web/src/pages/lk/tasks/TasksView.vue`, `web/src/pages/lk/reminders/{ReminderEditView,RemindersView}.vue`, `web/src/components/lk/reminders/LkReminderCard.vue`, `web/src/api/shoppingListsApi.ts`, `web/src/types/shoppingList.ts`
- **Критерии приёмки:**
  - [x] Меню «Создать» (поповер desktop / лист mobile), 3 пункта, «Список» открывает диалог
  - [x] Форма создания списка: название+тип+теги, сериализация тегов, валидация/ошибки
  - [x] ReminderEditView в новом стиле, крошка-хвост, ошибки 422 видны
  - [x] RemindersView в новом стиле, per_page ≤100
  - [x] vue-tsc OK, Vitest зелёный (311)
- **Создана:** 2026-07-08
- **Завершена:** 2026-07-08

### UITEST-5: UI-fidelity аудит фазы 5 (меню «Создать»/формы)
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Сверка фазы 5 (меню «Создать», форма списка, формы напоминаний, RemindersView) с брифом. Найден и исправлен MEDIUM-дефект: desktop-поповер «Создать» позиционировался у нижнего угла экрана вместо кнопки — привязан к её `getBoundingClientRect()` с клэмпом по вьюпорту. Добавлен fidelity-тест на anchoring.
- **Файлы:** `web/src/layouts/LkLayout.vue`, `web/src/components/lk/LkSidebar.vue`, `web/src/layouts/LkLayout.test.ts`
- **Критерии приёмки:**
  - [x] Сверка меню/форм/списка напоминаний с брифом фазы 5
  - [x] MEDIUM-дефект позиционирования поповера исправлен и покрыт тестом
  - [x] Тесты зелёные (311), vue-tsc чист
- **Создана:** 2026-07-08
- **Завершена:** 2026-07-08

---

## Feature: Веб-ЛК «Обзор» — доработки по замечаниям

### WEB-19: Кликабельные стат-плашки, подтверждение выполнения, переходы строк, анимация метра синхронизации
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-13
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Доработки раздела «Обзор» по замечаниям пользователя: (1) стат-плашки кликабельны — «Активных задач»→`lk-tasks`, «Напоминаний сегодня»→`lk-reminders`, «Заметок»→`lk-notes` (карточка «Выполнено за неделю» — метрика, без ссылки); `LkStatCard` получил опц. prop `to` (RouterLink + hover/focus). (2) Чекбокс «Задачи на сегодня» открывает стилизованный попап подтверждения `LkConfirmDialog` («Подтвердите выполнение задачи», Да/Отмена, Esc/клик-вне/фокус на «Да»); выполнение только по «Да». (3/4) Клик по строке «Задачи на сегодня»/«Ближайшие напоминания» ведёт в форму `lk-reminder-edit` (чекбокс `@click.stop`). (5) Метр «Синхронизация с сервером» — реальный статус через синглтон `useSyncMeter` (+`syncApi.fetchChanges`), индетерминированная анимация во время синхронизации, клик запускает пул, один запуск при монтировании оболочки, защита от overlap. Примечание: «Задачи на сегодня»/«Ближайшие напоминания» — это напоминания (Reminder), поэтому форма элемента = `lk-reminder-edit`.
- **Файлы:** `web/src/pages/lk/DashboardView.vue`, `web/src/components/lk/{LkStatCard,LkOverviewReminderItem,LkConfirmDialog}.vue`, `web/src/composables/{useLkDashboard,useSyncMeter}.ts`, `web/src/components/lk/LkSidebar.vue`, `web/src/layouts/LkLayout.vue`
- **Критерии приёмки:**
  - [x] Стат-плашки типов кликабельны и ведут в свои разделы; метрика — нет
  - [x] Подтверждение выполнения задачи через стилизованный попап (Да/Отмена)
  - [x] Клик по строке (сегодня/ближайшие) → форма напоминания; чекбокс не навигирует
  - [x] Метр синхронизации анимируется во время синка, клик запускает пул
  - [x] vue-tsc OK, Vitest зелёный (340)
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

### UITEST-6: UI-fidelity аудит доработок «Обзора»
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-19
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Поэлементная сверка 5 доработок «Обзора» с требованиями и палитрой ЛК. Расхождений не найдено; закрыт пробел покрытия — добавлен тест фокуса на кнопке «Да» при открытии попапа подтверждения.
- **Файлы:** `web/src/components/lk/LkConfirmDialog.test.ts`
- **Критерии приёмки:**
  - [x] Сверка кликабельности плашек/попапа/переходов/метра с требованиями
  - [x] Токены/палитра совпадают, z-index модалок не конфликтует
  - [x] Тесты зелёные (340), vue-tsc чист
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

---

## Feature: Списки/логин — доработки + инфра-фикс

### OPS-6: Фикс READONLY при входе — коллизия Redis-алиаса, backend бил в чужую read-only реплику
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** —
- **Блокирует:** вход в аккаунт (веб+МП)
- **Стандарты:** —
- **Описание:** Вход падал с `READONLY You can't write against a read only replica ... @user_script:1`. Причина: контейнер `reminders_serve` был подключён к двум docker-сетям — своей `project_reminders` (master `reminders_redis`, алиас `redis`) и чужой `insure-platform_default` (`insure_redis` = read-only slave, тоже алиас `redis`); DNS-коллизия резолвила `redis` в чужую реплику → запись сессии/throttle (Lua EVAL) отклонялась. Фикс: (1) `docker network disconnect insure-platform_default reminders_serve`; (2) `.env` `REDIS_HOST=redis`→`reminders_redis` (уникальный алиас) + `config:clear` + рестарт. Проверка: `Cache::put` ок, `POST /api/v1/auth/login` → 422 вместо 500.
- **Файлы:** `backend/.env` (REDIS_HOST; gitignored, не в репозитории), docker-сеть reminders_serve
- **Критерии приёмки:**
  - [x] backend пишет в master-Redis (не в read-only реплику)
  - [x] Логин возвращает корректную 422/401 вместо 500 READONLY (веб и МП)
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

### WEB-20: Списки — открытие нового на редактирование, статус «Новый», акцент по типу; логин — запоминание email + показ пароля
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** По замечаниям: (1) после создания списка сразу переход на его детали (`lk-list-detail`) — из меню «Создать» и из TasksView. (2) Статус «Новый» (нет выполненных пунктов) — `shoppingListStatus` new/active/done, в карточке. (3) Акцент по типу списка: покупки (goods) — teal `#17897a`, задачи (tasks) — amber `#c98a2b`; helper `shoppingListAccent`, применён к прогресс-бару (карточка+детали), статус-плашкам, кнопке «Добавить», цвету чекбоксов пунктов. (4) Логин (`LoginView`): предзаполнение email из localStorage + чекбокс «Запомнить меня» (дефолт вкл, пароль не сохраняется); показ пароля по кнопке-«глазу» (иконки eye/eye-off в LkIcon).
- **Файлы:** `web/src/utils/shoppingList.ts`, `web/src/pages/lk/tasks/TasksView.vue`, `web/src/components/lk/tasks/{LkShoppingListCard,LkListItemRow}.vue`, `web/src/pages/lk/lists/ListDetailView.vue`, `web/src/pages/auth/LoginView.vue`, `web/src/components/lk/LkIcon.vue`, `web/src/types/lkIcon.ts`
- **Критерии приёмки:**
  - [x] Новый список открывается на редактирование (оба входа)
  - [x] Статус «Новый»/«В работе»/«Завершён»
  - [x] Акцент по типу (goods teal / tasks amber): прогресс/статус/кнопки/чекбоксы
  - [x] Логин: запоминание email + показ пароля; ошибки 422/401/403 не сломаны
  - [x] vue-tsc OK, Vitest зелёный (362)
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

### UITEST-7: UI-fidelity аудит статуса/акцента списков и логина
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-20
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Сверка 4 доработок с требованиями и палитрой ЛК. Расхождений нет; усилены fidelity-тесты (точные HEX акцента по типу — статус-плашка и кнопка «Добавить»). Замечено (вне скоупа): кнопка «Новый список» в TasksView использует `#e9a63c` вместо токена `#c98a2b` — не привязана к типу, оставлено.
- **Файлы:** `web/src/components/lk/tasks/LkShoppingListCard.test.ts`, `web/src/pages/lk/lists/ListDetailView.test.ts`
- **Критерии приёмки:**
  - [x] Сверка создания/статуса/акцента/логина с требованиями
  - [x] Fidelity-тесты на HEX акцента усилены
  - [x] Тесты зелёные (362), vue-tsc чист
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

### MOB-52: Логин — показ пароля по «глазу» + запоминание email
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/mobile/AGENTS.md`
- **Описание:** Экран входа МП (`app/(auth)/login.tsx`): (1) показ пароля по кнопке-«глазу» — в `BaseInput` добавлен prop `passwordToggle` (Ionicons eye/eye-off справа в поле, переключает `secureTextEntry`, accessibilityLabel «Показать/Скрыть пароль»); (2) запоминание email через `expo-secure-store` (ключ `lk_last_email`): предзаполнение при монтировании + переключатель «Запомнить меня» (RN Switch, дефолт вкл), сохранение/очистка после успешного входа; пароль не сохраняется. Ошибка входа READONLY была устранена ранее на бэкенде (OPS-6), мобильный код логина не менялся. Требует пересборки APK (versionCode 30).
- **Файлы:** `mobile/app/(auth)/login.tsx`, `mobile/src/components/common/BaseInput.tsx` (+тесты)
- **Критерии приёмки:**
  - [x] Показ пароля по «глазу» (BaseInput passwordToggle)
  - [x] Запоминание email (secure-store) + переключатель; пароль не сохраняется
  - [x] tsc чист, Jest по затронутым зелёный
  - [x] Пересборка APK (versionCode 30)
- **Создана:** 2026-07-09
- **Завершена:** 2026-07-09

---

## Feature: Веб-ЛК — формы в модалках по макету

### WEB-21: 6 форм создания/редактирования в центральных модалках по десктоп-макету
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** 3 формы (задача/список, заметка, напоминание) в состояниях new/edit = 6 форм приведены к десктоп-макету и переведены в центральные модалки поверх раздела. Единый синглтон `useLkForms` (openTaskForm/openNoteForm/openReminderForm/closeForm), 3 модалки рендерятся один раз в `LkLayout`. Задача-форма создаёт/редактирует список (Название, Тип goods/tasks, теги-пресеты; после создания — открытие в lk-list-detail). Заметка-форма: Заголовок, Текст, выбор цвета стикера (реальное поле `color`: teal/coral/amber/purple), без тега/тумблеров; `LkNoteCard` красит по реальному color с uuid-фолбэком. Напоминание-форма: пилюли Дата (Сегодня/Завтра/Выходные/Через неделю) + Время (amber) + Повтор → сборка remind_at (локально→ISO). Старые страницы NoteEditView/ReminderEditView и LkCreateListDialog удалены; deep-link-маршруты → тонкие redirect-view. Стиль модалок точно по макету (scrim, 580px, лейблы, инпуты, пилюли, футер Удалить/Отмена/Сохранить), адаптив на мобайле.
- **Отклонения (по решению/ограничениям):** задача-форма без Описания/Даты/Напоминания (список — контейнер пунктов); заметка — 4 цвета вместо 6 (лимит бэкенда notes.color); тег заметки отсутствует (нет в модели).
- **Файлы:** `web/src/composables/useLkForms.ts`, `web/src/components/lk/{LkTaskFormDialog,LkNoteFormDialog,LkReminderFormDialog}.vue`, `web/src/layouts/LkLayout.vue`, `web/src/pages/lk/{tasks/TasksView,notes/NotesListView,reminders/RemindersView,DashboardView,lists/ListDetailView}.vue`, `web/src/components/lk/{notes/LkNoteCard,tasks/LkTasksRightRail}.vue`, `web/src/pages/lk/{notes/NoteFormRedirectView,reminders/ReminderFormRedirectView}.vue`, `web/src/types/note.ts`, `web/src/router/index.ts`, `web/src/constants/lkNoteColors.ts`
- **Критерии приёмки:**
  - [x] 3 формы (new+edit) — центральные модалки по макету, открываются из всех точек входа
  - [x] Задача→список (тип/теги-пресеты, открытие на редактирование); заметка (цвет); напоминание (пилюли даты/времени/повтора, remind_at)
  - [x] Старые страницы/диалог удалены, deep-link не сломан
  - [x] vue-tsc OK, Vitest зелёный (417)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### UITEST-8: UI-fidelity аудит 6 форм против десктоп-макета
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-21
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Поэлементная сверка 6 форм и стиля модалок с макетом (scrim/размеры/лейблы/инпуты/пилюли/чипы/футер/закрытие; поля и точки входа каждой формы; сборка remind_at, запись color). High/med расхождений не найдено; добавлено 11 fidelity-тестов (лейблы/placeholder/пилюли/свотчи; remind_at «В выходные»=ближайшая суббота, «Через неделю»=+7 через fake timers). Low-замечания зафиксированы без правок.
- **Файлы:** `web/src/components/lk/{LkTaskFormDialog,LkNoteFormDialog,LkReminderFormDialog}.test.ts`
- **Критерии приёмки:**
  - [x] Сверка стиля модалок и полей всех 6 форм с макетом
  - [x] Проверена сборка remind_at и запись color заметки
  - [x] Fidelity-тесты добавлены, Vitest зелёный (417), vue-tsc чист
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### WEB-22: Фикс открытия чужого списка (реактивный uuid) + крошки и тень/граница заметки по макету
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-21
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) Баг: при создании нового (пустого) списка, находясь на детали другого списка, открывался старый список — `ListDetailView` фиксировал `route.params.uuid` один раз, а `useShoppingList`/`useShoppingListItems` замыкались на снимок; при переходе lk-list-detail→lk-list-detail Vue переиспользует компонент (setup не перезапускается). Фикс: композаблы принимают `MaybeRefOrGetter<string>` и резолвят uuid через `toValue` внутри каждого метода; `ListDetailView` передаёт геттер + `watch(route.params.uuid)` перезагружает список/пункты и сбрасывает форму. (2) Крошки по макету: первая метка «Личный кабинет»→«Главная», текущая крошка teal `#17897a`/700, ссылки `#8a938f`, разделитель-шеврон; при открытой форме-модалке добавляется крошка формы («Новая задача / покупка» и т.п.) через `useLkForms`. (3) Карточка заметки: цветная верхняя граница `4px solid accent` + тень `0 6px 16px rgba(0,0,0,.06)` как в макете.
- **Файлы:** `web/src/composables/{useShoppingList,useShoppingListItems}.ts`, `web/src/pages/lk/lists/ListDetailView.vue`, `web/src/constants/lkBreadcrumbs.ts`, `web/src/components/lk/LkBreadcrumbs.vue`, `web/src/components/lk/notes/LkNoteCard.vue`
- **Критерии приёмки:**
  - [x] Новый список открывается правильным и пустым (в т.ч. с детали другого списка); reproduction-тест A→B
  - [x] Крошки: «Главная», teal-текущая, шеврон, крошка открытой формы
  - [x] Карточка заметки: цветная верхняя граница + тень по макету
  - [x] vue-tsc OK, Vitest зелёный (430)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### WEB-23: Topbar по десктоп-макету (бургер/колокол в чипах, иконка-тоггл, заголовок 22/900, токены)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-21
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Поэлементная сверка topbar с макетом и приведение «хрома»: хедер height 78px/padding 0 30px/border #e6e9e7; бургер — иконка-тоггл сайдбара (новая `sidebar` в LkIcon) в чипе 44×44 `#f2f4f3` r12 (была гамбургер без фона); заголовок H1 22px/900; поиск и колокол — чипы `#f2f4f3` r12 (были #eef1f0 r10), колокол 44×44, точка-индикатор 8×8 `#e2685f` с рамкой. Подзаголовок оставлен (осознанное отклонение — в макетном topbar его нет). Крошки не трогались (приведены ранее).
- **Файлы:** `web/src/components/lk/LkTopbar.vue`, `web/src/components/lk/LkIcon.vue`, `web/src/types/lkIcon.ts`, `web/src/components/lk/LkTopbar.test.ts`
- **Критерии приёмки:**
  - [x] Бургер/колокол/поиск — чипы `#f2f4f3` r12; бургер = иконка-тоггл
  - [x] Заголовок 22/900, хедер 78px, токены по макету
  - [x] vue-tsc OK, Vitest зелёный (436)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### WEB-24: Убран подзаголовок из десктоп-topbar (в макете его нет ни на одном разделе)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-23
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** По замечанию: в десктоп-макете topbar рендерит только заголовок, подзаголовка нет ни на одном разделе (ранее ошибочно оставлен как «отклонение»). Удалён подзаголовок и его проп из `LkTopbar`; `LkLayout` больше не передаёт subtitle в topbar. Подзаголовок остаётся в мобильной шапке (`LkMobileHeader`) — там мобильный макет его предусматривает; приветствие дашборда и подзаголовки разделов теперь проверяются на мобильной шапке.
- **Файлы:** `web/src/components/lk/LkTopbar.vue`, `web/src/layouts/LkLayout.vue`, `web/src/components/lk/LkTopbar.test.ts`, `web/src/layouts/LkLayout.test.ts`
- **Критерии приёмки:**
  - [x] Десктоп-topbar без подзаголовка (по макету)
  - [x] Подзаголовок/приветствие сохранены в мобильной шапке, покрытие перенесено
  - [x] vue-tsc OK, Vitest зелёный (436)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

---

## Feature: «Задачи и списки» — плоская таблица + переработка формы задачи

### MBE-12: Поле `is_completed` у списка покупок (флаг «список выполнен»)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** WEB-25
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/04-database.md`
- **Описание:** Добавлен булев флаг `is_completed` спискам покупок (независимо от отметок пунктов) — для чекбокса/фильтра «Выполненные»/зачёркивания в таблице. Миграция (boolean default false), модель (fillable+cast), `ShoppingListResource`, валидация Store/Update, прокидка через DTO `ShoppingListData` + Create/UpdateListAction + контроллеры. Миграция применена к основной и тестовой БД. Pest: default false, PUT сохраняет, PUT без поля не сбрасывает, не-boolean → 422. Полный прогон 285 зелёных.
- **Файлы:** `backend/database/migrations/2026_07_10_100000_add_is_completed_to_shopping_lists_table.php`, `backend/app/Models/ShoppingList.php`, `backend/app/Http/Resources/ShoppingListResource.php`, `backend/app/Http/Requests/ShoppingList/{Store,Update}ListRequest.php`, `backend/app/Data/ShoppingListData.php`, `backend/app/Actions/ShoppingList/{Create,Update}ListAction.php`, контроллеры Store/Update, `backend/tests/Feature/ShoppingLists/ListCompletedFlagTest.php`
- **Критерии приёмки:**
  - [x] Миграция is_completed (default false), применена к обеим БД
  - [x] Ресурс отдаёт, Store/Update принимают, PUT без поля не сбрасывает
  - [x] Pest зелёный (285)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### WEB-25: Плоская таблица «Задачи и списки» + переработка формы задачи/покупки
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-12, WEB-21
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Раздел «Задачи и списки» переведён из сетки карточек в плоскую таблицу по вёрстке: тулбар (вкладки Все/Активные/Выполненные по `is_completed`, «+ Новая задача»), сортируемые колонки ЗАДАЧА(чекбокс→is_completed + «N пунктов · M куплено»)/ТЕГИ/ДАТА/НАПОМИНАНИЕ, зачёркивание выполненных, клик по строке → форма edit, строка «+ Добавить задачу». Колонки Дата/Напоминание — производные от `deadline`/`reminder_at` ПУНКТОВ (параллельный fetchItems, read-only; у списка своих date/reminder нет — по решению пользователя «без бэкенда»). Форма задачи (`LkTaskFormDialog`) переработана в редактор списка: шапка+прогресс M/N, тумблер Купить(teal)/Сделать(amber), инлайн-добавление/чек/удаление пунктов, теги-пресеты + «Свой тег», футер Удалить/Отмена/Сохранить; new-режим создаёт список только при первом действии (пустые не плодятся). `ListDetailView` заменён модалкой; `lk-list-detail` → тонкий redirect. Тип `ShoppingList` + `is_completed`.
- **Файлы:** `web/src/pages/lk/tasks/TasksView.vue`, `web/src/components/lk/tasks/LkTaskTableRow.vue`, `web/src/composables/useLkTasksTable.ts`, `web/src/components/lk/LkTaskFormDialog.vue`, `web/src/pages/lk/lists/ListFormRedirectView.vue`, `web/src/utils/shoppingList.ts`, `web/src/types/shoppingList.ts`, `web/src/router/index.ts`, `web/src/components/lk/LkIcon.vue` (cart)
- **Отклонения (по решению пользователя «без бэкенда»):** форма без секций Дата/Напоминание; в таблице Дата/Напоминание производные от пунктов (у списков без датированных пунктов — «—», отличается от скринов, где даты заполнены).
- **Критерии приёмки:**
  - [x] Плоская таблица (колонки/сортировка/вкладки/чекбокс→is_completed/строка→модалка/«+ Добавить»)
  - [x] Форма: тип/пункты инлайн/теги пресет+свой/футер; new не плодит пустые списки
  - [x] Derive даты/напоминания из пунктов; ListDetailView→redirect
  - [x] vue-tsc OK, Vitest зелёный (404)
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

### UITEST-9: UI-fidelity аудит таблицы «Задачи и списки» и формы задачи против вёрстки
- **Исполнитель:** ux-ui-test-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-25
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Поэлементная сверка таблицы (вкладки/сортировка/чекбокс/колонки/derive/строка→модалка) и формы (тумблер типа/пункты/теги/футер/new-логика без пустых списков) с 3 скриншотами. High/med расхождений нет. Добавлено 13 fidelity-assertions (активная вкладка/aria, реверс стрелки, «⏰ HH:MM», прочерки, прогресс/цвета формы). Low-замечания зафиксированы (derive «—», один поиск не подключён — брифом допущено).
- **Файлы:** `web/src/pages/lk/tasks/TasksView.test.ts`, `web/src/components/lk/LkTaskFormDialog.test.ts`
- **Критерии приёмки:**
  - [x] Сверка таблицы и формы с вёрсткой поэлементно
  - [x] new-логика формы (без пустых списков) проверена
  - [x] Тесты зелёные (404), vue-tsc чист
- **Создана:** 2026-07-10
- **Завершена:** 2026-07-10

---

## Feature: Авторизация — редизайн + ИБ хранения паролей

### SEC-1: Аудит хранения паролей и учётных данных (жалоба «пароли в незащищённом виде»)
- **Исполнитель:** security-auditor
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** OPS-7, MBE-13
- **Стандарты:** OWASP
- **Описание:** По жалобе антивирусов/сканеров. Вердикт: пароли в открытом виде НЕ хранятся — bcrypt-12 (каст `hashed`), `$hidden`, не логируются, не в ресурсах, reset через Password broker, generic-ответы (нет user enumeration). Реальные триггеры сканеров: H1 отсутствие security-заголовков на login-странице; H2 Bearer-токен в localStorage; M1 CORS `*`; M2 бессрочные Sanctum-токены; M3 слабая парольная политика; M4 http-downgrade в редиректах (нет доверия X-Forwarded-Proto). Рантайм проверен: фактически production/debug=false (контейнерные env переопределяют вводящий в заблуждение .env), info-disclosure нет. Решения пользователя: токен оставить в localStorage; из мер — только срок жизни токенов (M2). Заголовки (H1) внедрены как быстрая победа.
- **Файлы:** отчёт (read-only)
- **Критерии приёмки:**
  - [x] Подтверждено корректное хеширование паролей (bcrypt), отсутствие утечки/логирования
  - [x] Определены реальные триггеры сканеров + приоритизированные рекомендации
- **Создана:** 2026-07-14
- **Завершена:** 2026-07-14

### OPS-7: Security-заголовки nginx для веб-приложения (SEC H1)
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** SEC-1
- **Блокирует:** —
- **Стандарты:** —
- **Описание:** Добавлены security-заголовки в `deploy/reminders-web.nginx.conf` (SPA/login): `Strict-Transport-Security` (без includeSubDomains — домен общий), `Content-Security-Policy` (строгий self-only, style-src 'unsafe-inline' для Vue), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` + `server_tokens off`. Закрывают основную массу претензий сканеров о «незащищённой login-странице». Нюанс деплоя: `nginx.conf` — bind-mount отдельного файла, атомарная запись даёт новый inode → потребовался рестарт контейнера, чтобы подхватить. Проверено `curl` к проду: заголовки отдаются.
- **Файлы:** `deploy/reminders-web.nginx.conf`
- **Критерии приёмки:**
  - [x] Заголовки отдаются на `https://jemsoft.ru/napominalki/` (проверено curl)
  - [x] Страница и ассеты грузятся (HTTP 200)
- **Создана:** 2026-07-14
- **Завершена:** 2026-07-14

### MBE-13: Срок жизни Sanctum-токенов (SEC M2)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** SEC-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/03-laravel.md`
- **Описание:** `config/sanctum.php` `expiration` переведён с хардкод `null` на `env('SANCTUM_EXPIRATION', 43200)`; в прод-`.env` задан `SANCTUM_EXPIRATION=43200` (30 дней) — украденный токен перестаёт быть вечным. Проверено: рантайм `config('sanctum.expiration')=43200`; auth Pest (64) зелёные.
- **Файлы:** `backend/config/sanctum.php`, `backend/.env` (gitignored)
- **Критерии приёмки:**
  - [x] expiration env-driven, значение активно в рантайме
  - [x] Auth-тесты зелёные (64)
- **Создана:** 2026-07-14
- **Завершена:** 2026-07-14

### WEB-26: Редизайн страниц авторизации в стиле бренда
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Вход/Регистрация/Восстановление/Сброс пароля приведены к стилю бренда «Напоминалки»: сплит-карточка (`AuthCard` — зелёная брендовая панель с колоколом + «Напоминалки» на широких, карточка на узких), стилизованные поля, первичная teal-кнопка, показ пароля по «глазу» на всех парольных полях (`AuthPasswordField`, добавлен и в регистрацию/сброс). Вся логика/валидация/обработка ошибок (422/401/403)/запоминание email/редиректы сохранены; тесты не менялись.
- **Файлы:** `web/src/components/auth/{AuthCard,AuthPasswordField}.vue`, `web/src/pages/auth/{LoginView,RegisterView,ForgotPasswordView,ResetPasswordView}.vue`
- **Критерии приёмки:**
  - [x] 4 страницы в стиле бренда (карточка/бренд/поля/кнопка)
  - [x] Показ пароля по «глазу» на всех парольных полях
  - [x] Логика/валидация/ошибки/запоминание email сохранены
  - [x] vue-tsc OK, Vitest зелёный (404)
- **Создана:** 2026-07-14
- **Завершена:** 2026-07-14

### WEB-27: Редизайн страниц Аккаунт/Настройки/Синхронизация в стиле бренда
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-13
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** По замечанию «аккаунт открывается, но без стиля»: страницы `AccountView`/`SettingsView`/`SyncView` оставались в старом голом виде внутри нового ЛК (в фазах 1–5 не редизайнились). Приведены к стилю бренда: белые карточки radius 18/тень, аватар-инициал в шапке аккаунта, строки профиля (Имя/Email/Синхронизация как бейдж), кнопки ЛК (Выйти нейтральная / Удалить аккаунт coral с подтверждением), состояния loading/error; Настройки — секции-карточки (тема/синк/уведомления) с teal accent-color; Синхронизация — карточки статуса/конфликтов. Диагностика подтвердила: бэкенд/данные/вход исправны (в логах дашборд и `/auth/me` → 200), проблема была только в неотредизайненной вёрстке. Вся логика (fetchMe/logout/deleteAccount/settings/sync) сохранена.
- **Файлы:** `web/src/pages/lk/AccountView.vue`, `web/src/pages/lk/SettingsView.vue`, `web/src/pages/lk/sync/SyncView.vue`
- **Критерии приёмки:**
  - [x] Аккаунт/Настройки/Синхронизация в стиле бренда (карточки/кнопки/состояния)
  - [x] Логика страниц не изменена
  - [x] vue-tsc OK, Vitest зелёный (404)
- **Создана:** 2026-07-14
- **Завершена:** 2026-07-14

### WEB-28: Фикс фантомного напоминания в таблице + ссылка «Открыть все» на Обзоре + массовое удаление напоминаний
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-25
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) Баг: в таблице «Задачи и списки» показывалось фантомное напоминание/дата — `nearestIso` при отсутствии будущих значений откатывалась на прошедшие, поэтому просроченное `reminder_at` пункта (напр. 07-03) отображалось как активное. Убран откат на прошлое (`return bestFuture?.iso ?? null`); прошедшие → «—», реальный дедлайн сегодня/в будущем остаётся. (2) На «Обзоре» в блок «Ближайшие напоминания» добавлена ссылка «Открыть все →» на `lk-reminders`. (3) На странице всех напоминаний (`RemindersView`) добавлены чекбоксы выбора + «Выделить все» (с indeterminate) + «Удалить выделенные» (подтверждение через `LkConfirmDialog`, параллельное удаление, обработка частичных ошибок); select-чекбокс не открывает форму.
- **Файлы:** `web/src/composables/useLkTasksTable.ts`, `web/src/pages/lk/DashboardView.vue`, `web/src/pages/lk/reminders/RemindersView.vue`, `web/src/components/lk/reminders/LkReminderCard.vue`
- **Критерии приёмки:**
  - [x] Просроченные дедлайны/напоминания пунктов не показываются (derive без отката на прошлое)
  - [x] «Обзор» — ссылка «Открыть все» на список напоминаний
  - [x] RemindersView — выделить все (indeterminate) + удалить выделенные с подтверждением
  - [x] vue-tsc OK, Vitest зелёный (412)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-29: Открытие объекта из календаря двойным кликом
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-15
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** В сетке месяца чипы событий были некликабельны (нельзя открыть объект из календаря). Добавлен двойной клик по чипу события (`LkCalendarGrid`, `@dblclick.stop` → emit `openEvent`) → `CalendarView` делает `router.push(event.route)` → открывается форма-модалка объекта (напоминание/список) через redirect-view. Одиночный клик по-прежнему выбирает день; панель дня (одиночный клик по строке) не менялась. Compact-режим (точки) тоже открывает по двойному тапу.
- **Файлы:** `web/src/components/lk/calendar/LkCalendarGrid.vue`, `web/src/pages/lk/calendar/CalendarView.vue`
- **Критерии приёмки:**
  - [x] Двойной клик по событию в сетке открывает объект; одиночный клик выбирает день
  - [x] vue-tsc OK, Vitest зелёный (418)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-30: Синхронизация/возврат фокуса перезагружают данные разделов
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-19, WEB-25
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Диагностика жалобы «разный набор списков в МП и вебе»: сервер/REST отдают данные корректно (список «Тестовая» есть, мобилка показывает верно), но веб-раздел перечитывался только при монтировании/F5, а метр «Синхронизация» (`runSync`) делал лишь `fetchChanges(0)` и данные разделов не обновлял → изменения из мобилки не появлялись. Фикс: `useSyncMeter.runSync` после успешного `fetchChanges` бампит `tasksVersion/notesVersion/remindersVersion` (через `notifyTaskSaved/notifyNoteSaved/notifyReminderSaved`) → открытый раздел перечитывает REST. Плюс новый `useLkAutoRefresh` (в LkLayout): при возврате фокуса на вкладку (`visibilitychange='visible'`, троттлинг 30с) вызывает `runSync` → веб подхватывает изменения без F5. Это UX-фикс, не рассинхрон на сервере.
- **Файлы:** `web/src/composables/useSyncMeter.ts`, `web/src/composables/useLkAutoRefresh.ts`, `web/src/layouts/LkLayout.vue`
- **Критерии приёмки:**
  - [x] Клик по «Синхронизация» перезагружает данные открытого раздела (бамп версий)
  - [x] Возврат фокуса на вкладку авто-обновляет данные (троттлинг, снятие слушателя)
  - [x] vue-tsc OK, Vitest зелёный (428)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

---

## Feature: Аккаунт — редактирование профиля + аватар

### MBE-14: Профиль — PATCH /auth/me (имя) + аватар (загрузка/удаление, data-URI)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** WEB-31
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** Эндпоинты профиля: `PATCH /auth/me` (обновление name; email не принимается), `POST /auth/me/avatar` (multipart, image mimes jpeg/png/webp ≤512КБ, хранение на приватном диске `local` `avatars/{uuid}.ext`, замена прежнего файла), `DELETE /auth/me/avatar` (идемпотентно). Миграция `users.avatar_path` (обе БД). `UserResource.avatar` = data-URI (`data:image/…;base64,…`) или null; сырой `avatar_path` в `$hidden`. Решение data-URI выбрано из-за схемы деплоя (serve только /api, нет storage:link) — CSP `img-src 'self' data:` уже разрешает. `AvatarService` (store/delete/toDataUri); DeleteAccount чистит файл аватара. GD в контейнере нет → серверный ресайз невозможен (ресайз на клиенте). Живой smoke на проде: upload→data-URI→delete→чисто.
- **Файлы:** `backend/database/migrations/2026_07_15_100000_add_avatar_path_to_users_table.php`, `backend/app/Http/Controllers/Auth/{UpdateProfile,UploadAvatar,DeleteAvatar}Controller.php`, `backend/app/Http/Requests/Auth/{UpdateProfile,UploadAvatar}Request.php`, `backend/app/Services/AvatarService.php`, `backend/app/Actions/User/{UpdateProfile,UploadAvatar,DeleteAvatar}Action.php`, `backend/app/Data/ProfileData.php`, `backend/app/Http/Resources/UserResource.php`, `backend/app/Models/User.php`, `backend/routes/api.php`, `backend/tests/Feature/Auth/ProfileTest.php`
- **Критерии приёмки:**
  - [x] PATCH имя, POST/DELETE аватар, миграция в обе БД
  - [x] UserResource отдаёт avatar как data-URI/null, avatar_path скрыт
  - [x] Pest зелёный (300); живой smoke round-trip
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-31: Аккаунт — редактирование имени + загрузка/удаление фото + аватар в сайдбаре
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MBE-14, WEB-27
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** На `AccountView`: режим редактирования имени (PATCH /auth/me, валидация/422), загрузка фото (скрытый file-input → клиентский ресайз `resizeImageToBlob` canvas→256px JPEG ≤512КБ → превью → POST) и удаление фото (DELETE); email только просмотр. `authApi` (updateProfile/uploadAvatar(FormData)/deleteAvatar), `User.avatar: string|null`, authStore пишет ответ в user. Аватар (data-URI) показывается вместо инициала в `LkSidebar` и `LkMobileHeader`. CSP не менялся (data-URI разрешён). Клиентский ресайз обязателен (сервер без GD).
- **Файлы:** `web/src/pages/lk/AccountView.vue`, `web/src/utils/image.ts`, `web/src/api/authApi.ts`, `web/src/stores/authStore.ts`, `web/src/types/auth.ts`, `web/src/components/lk/{LkSidebar,LkMobileHeader}.vue`
- **Критерии приёмки:**
  - [x] Редактирование имени (сохранение/валидация/422)
  - [x] Загрузка фото (клиентский ресайз, превью) + удаление
  - [x] Аватар в сайдбаре/мобильной шапке вместо инициала
  - [x] vue-tsc OK, Vitest зелёный (458)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### MBE-15: Синхронизация type/tags списка в мобилку (pull-сериализатор)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** `SyncSerializer::shoppingList()` отдавал только `uuid/title/timestamps` — `type`/`tags` списка не уходили в мобилку (тип/теги, заданные в вебе, в МП не появлялись). Добавлены `type` и `tags` (raw JSON-строка, как в sync-whitelist `SyncEntities`). Мобильная сторона уже готова — `ServerShoppingList` содержит `type`/`tags`, `shoppingListMapper` их мапит в локальную БД, поэтому изменений в мобильном приложении и пересборки APK НЕ требуется. Проверено: Sync Pest 59 зелёных + новый тест на type/tags в pull; живой `/sync/changes` отдаёт списки с type/tags. Нюанс: существующие неизменённые списки back-fill'ят type/tags на мобилке при следующем изменении (server_revision bump) или полном ре-sync — incremental sync отдаёт только изменённые записи.
- **Файлы:** `backend/app/Services/Sync/SyncSerializer.php`, `backend/tests/Feature/Sync/ChangesEndpointTest.php`
- **Критерии приёмки:**
  - [x] Sync pull отдаёт type/tags списка; мобилка их принимает (маппер готов)
  - [x] Sync Pest зелёный (+тест на type/tags); живая проверка /sync/changes
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### OPS-8: CSP img-src +blob: — фикс загрузки аватара
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** OPS-7, WEB-31
- **Блокирует:** —
- **Стандарты:** —
- **Описание:** После включения строгого CSP (OPS-7) загрузка аватара падала с «Не удалось прочитать изображение»: клиентский ресайз/превью грузит выбранный файл через `URL.createObjectURL()` (`blob:`-URL), а `img-src 'self' data:` не разрешал `blob:` → браузер блокировал загрузку картинки. Фикс: `img-src 'self' data:` → `img-src 'self' data: blob:` в `deploy/reminders-web.nginx.conf` + рестарт контейнера (bind-mount отдельного файла). Проверено: публичный CSP отдаёт `img-src 'self' data: blob:`.
- **Файлы:** `deploy/reminders-web.nginx.conf`
- **Критерии приёмки:**
  - [x] CSP разрешает blob: для img-src (публично)
  - [x] Загрузка/превью аватара работает
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-32: Фикс загрузки аватара — multipart Content-Type для FormData
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-31
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Загрузка аватара падала с 422 «The avatar field is required»: у `apiClient` глобальный дефолт `Content-Type: application/json`, который axios НЕ перезаписывает для FormData → multipart уходил с JSON-заголовком, сервер не распознавал файл. Фикс в axios-request-интерцепторе (`client.ts`): если `config.data instanceof FormData` — `config.headers.delete('Content-Type')`, чтобы браузер выставил `multipart/form-data; boundary`. Глобально для всех multipart-загрузок; тест `uploadAvatar` не затронут. Бэкенд был исправен (проверялся `curl -F`).
- **Файлы:** `web/src/api/client.ts`
- **Критерии приёмки:**
  - [x] FormData-запросы уходят как multipart (без application/json)
  - [x] Загрузка аватара сохраняется (не 422)
  - [x] vue-tsc OK, Vitest зелёный (458)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### MBE-16: Смена email в профиле (PATCH /auth/me)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MBE-14
- **Блокирует:** WEB-33
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/03-laravel.md`, `/home/vselug/workspace/Napominalky/docs/07-api.md`
- **Описание:** `PATCH /auth/me` теперь принимает `email` (required|email|max:255|unique:users кроме себя) наряду с `name`. `UpdateProfileRequest`/`ProfileData`/`UpdateProfileController`/`UpdateProfileAction` обновлены; при фактической смене email сбрасывается `email_verified_at` (verification-флоу в проекте нет). Контракт изменился: `email` стал обязателен в PATCH /auth/me (веб обновлён — WEB-33; мобилка этот эндпоинт не вызывает — он добавлен в MBE-14). Pest: смена email → 200 + verified_at сброшен, свой email → 200, чужой/невалидный/пустой → 422. Профиль-тесты 19, весь Auth 59 зелёные. **Security (принято по требованию):** смена email без подтверждения текущим паролем/ре-верификации — при желании усилить позже.
- **Файлы:** `backend/app/Http/Requests/Auth/UpdateProfileRequest.php`, `backend/app/Data/ProfileData.php`, `backend/app/Http/Controllers/Auth/UpdateProfileController.php`, `backend/app/Actions/User/UpdateProfileAction.php`, `backend/tests/Feature/Auth/ProfileTest.php`
- **Критерии приёмки:**
  - [x] PATCH /auth/me меняет email с валидацией unique(кроме себя)
  - [x] email_verified_at сбрасывается при смене
  - [x] Pest зелёный (Auth 59); живой smoke (name+email→200, только name→422)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-33: Аккаунт — редактирование email + рабочий переключатель синхронизации
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MBE-16, WEB-31
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** На `AccountView` режим «Редактировать» теперь правит имя И e-mail (оба предзаполнены; `updateProfile(name,email)` шлёт оба — новый контракт; клиентская валидация + 422 `errors.name`/`errors.email` под полями). Поле «Синхронизация» из read-only-бейджа стало рабочим переключателем (checkbox `role=switch`, teal), подключённым к готовому `useSettings().toggleSync` (`PATCH /settings/sync`) — обновляет `authStore.user.sync_enabled`, индикатор загрузки, откат состояния при ошибке. `authApi.updateProfile`/`authStore.updateProfile` — сигнатура `(name, email)`.
- **Файлы:** `web/src/pages/lk/AccountView.vue`, `web/src/api/authApi.ts`, `web/src/stores/authStore.ts`
- **Критерии приёмки:**
  - [x] Редактирование имени и email (оба сохраняются, 422 под полями)
  - [x] Рабочий sync-переключатель (загрузка/ошибка/откат)
  - [x] vue-tsc OK, Vitest зелёный (463)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-34: Задачи — разделение по типу (куплено/сделано, фильтр Покупки/Задачи, тумблер только при создании)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Раздел «Задачи и списки» приведён к логике мобильного приложения по типу списка (`goods`=покупки / `tasks`=задачи). (1) Подпись строки таблицы стала типозависимой: покупки → «N пунктов · M **куплено**», задачи → «N пунктов · M **сделано**» (`checkedWord` в `LkTaskTableRow`). (2) В тулбар таблицы добавлен второй сегмент-фильтр по типу — **Все / Покупки / Задачи** (`typeFilter` в `useLkTasksTable`, `role=group`), комбинируется по AND со статус-вкладками (Все/Активные/Выполненные); сортировка/поиск/пагинация не затронуты. (3) Тумблер типа «Купить/Сделать» в `LkTaskFormDialog` показывается только при СОЗДАНИИ; в режиме редактирования (`isTypeLocked = taskFormList !== null`) скрыт, при сохранении исходный `type` не затирается. Акценты edit (teal/amber) — по фактическому типу списка.
- **Файлы:** `web/src/components/lk/tasks/LkTaskTableRow.vue`, `web/src/composables/useLkTasksTable.ts`, `web/src/pages/lk/tasks/TasksView.vue`, `web/src/components/lk/LkTaskFormDialog.vue` (+ тесты)
- **Критерии приёмки:**
  - [x] Подпись «куплено» для goods / «сделано» для tasks
  - [x] Фильтр по типу (Покупки/Задачи) + комбинация со статусом
  - [x] Тумблер типа только в new, скрыт в edit, edit не меняет type
  - [x] vue-tsc OK, Vitest зелёный (467)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-35: Главная — адаптивный список задач + «Все задачи»; фикс скролла в модалке задачи
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) На Главной ЛК добавлена панель «Задачи» (`LkOverviewTasksPanel`) на данных `taskLists` из `useLkDashboard` (тот же `shoppingListsApi.fetchLists`, что питает раздел `lk-tasks`, без доп. запроса; активные `!is_completed`). Число видимых строк рассчитывается по высоте экрана — `useLkVisibleCount` (`window.innerHeight − rect.top − reservedBottom` ÷ 48px, clamp [3..8], дебаунс 150 мс на resize + ResizeObserver; мобилка — фикс. 4 строки). Ссылка «Все задачи →» (`lk-tasks`) показывается только при переполнении. Клик по строке открывает модалку задачи. (2) Устранён дубль ссылок: у старой панели «Задачи на сегодня» (Reminder'ы) ссылка стала «Все напоминания →» (`lk-reminders`). (3) Починен скролл модалки задачи `LkTaskFormDialog`: панель — flex-колонка `overflow:hidden`, скроллится только тело (`.lk-form-dialog__body`, тонкий стилизованный скроллбар внутри правого паддинга между фиксированными шапкой и футером) — скроллбар больше не режется скруглённым углом и не наезжает на контент/кнопки.
- **Файлы:** `web/src/components/lk/LkOverviewTasksPanel.vue` (new), `web/src/composables/useLkVisibleCount.ts` (new), `web/src/pages/lk/DashboardView.vue`, `web/src/components/lk/LkTaskFormDialog.vue` (+ тесты)
- **Критерии приёмки:**
  - [x] Главная: видимое число задач по высоте экрана, «Все задачи» только при переполнении → lk-tasks
  - [x] Дубль ссылок разведён (старая панель → «Все напоминания» → lk-reminders)
  - [x] Скролл модалки задачи не обрезан, шапка/футер фиксированы
  - [x] vue-tsc OK, Vitest зелёный (488)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-36: Главная — две колонки (Задачи | Ближайшие напоминания); убран блок «Задачи на сегодня»; фильтр «Сделать сегодня»
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-35
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) Под стат-карточками Главной — двухколоночная раскладка `grid-template-columns: minmax(0,2fr) minmax(0,1fr)`: слева широкая панель «Задачи» (~2/3), справа узкая «Ближайшие напоминания» (~1/3); при ≤900px складываются в одну колонку (сначала Задачи). (2) Блок «Задачи на сегодня» (Reminder'ы на сегодня, ссылка «Все напоминания →», `LkConfirmDialog`) полностью удалён; из `useLkDashboard` убраны `todaysReminders`/`pendingCompleteUuid`/`completeTodayReminder`/`requestComplete`/`confirmComplete`/`cancelComplete` (счётчик `remindersTodayCount` сохранён через `splitByToday`). (3) В панель «Задачи» добавлен чип-тумблер «Сделать сегодня» — показывает только задачи с датой = сегодня. Правило «Сегодня» — новая `isLkDateToday(iso, now)` в `useLkTasksTable` (общий `dayDiff` с `lkTableDateLabel`, метка «Сегодня» гарантированно совпадает с колонкой раздела задач); производные даты пунктов грузятся фоном через переиспользованную `fetchListsDerivedDates`. Пустое состояние «На сегодня задач нет.»; лимит видимых строк и «Все задачи → lk-tasks» — по отфильтрованному набору.
- **Файлы:** `web/src/pages/lk/DashboardView.vue`, `web/src/components/lk/LkOverviewTasksPanel.vue`, `web/src/composables/useLkDashboard.ts`, `web/src/composables/useLkTasksTable.ts` (+ тесты)
- **Критерии приёмки:**
  - [x] Две колонки: Задачи (2/3) | Ближайшие напоминания (1/3), адаптив ≤900px
  - [x] Блок «Задачи на сегодня» удалён
  - [x] Фильтр «Сделать сегодня» (вкл/выкл/пустое состояние), правило «Сегодня» едино с разделом задач
  - [x] vue-tsc OK, Vitest зелёный (489)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-37: Задачи — устранён layout shift при фоновой подгрузке дат (фиксированная раскладка колонок)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-34
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** Причина «дёргания» на странице «Задачи и списки»: таблица имела `table-layout: auto`, а производные даты пунктов (`derivedFor`) грузятся фоном — при подмене «—»→«17 августа»/«⏰ 14:00» колонки ДАТА/НАПОМИНАНИЕ расширялись и толкали ЗАДАЧА/ТЕГИ (теги приходят сразу в `fetchLists`, лишь смещались). Фикс: `table-layout: fixed` + `<colgroup>` (из массива `COLUMNS`) с явными ширинами — ТЕГИ 180px, ДАТА 130px, НАПОМИНАНИЕ 150px, ЗАДАЧА гибкая (остаток). Ячейкам ДАТА/НАПОМИНАНИЕ — `overflow:hidden; text-overflow:ellipsis; nowrap`; плейсхолдеру «—» заданы метрики значения — подмена не меняет геометрию строки. Иконка ⏰ появляется атомарно с временем в фикс. колонке, соседей не двигает. Главная (`LkOverviewTasksPanel`) не затронута — в строках панели дат нет, геометрия уже фиксирована. Сортировка/вкладки/фильтр/подписи WEB-34 не тронуты.
- **Файлы:** `web/src/pages/lk/tasks/TasksView.vue`, `web/src/components/lk/tasks/LkTaskTableRow.vue` (+ тесты)
- **Критерии приёмки:**
  - [x] Фоновая подстановка дат/напоминаний не сдвигает содержимое строк
  - [x] Фиксированные ширины колонок (colgroup + table-layout:fixed), ellipsis
  - [x] Сортировка/адаптив/горизонтальный скролл сохранены
  - [x] vue-tsc OK, Vitest зелёный (491)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-38: Меню — отдельный пункт «Напоминания»; атрибуты пунктов задачи (раскрытие строки, как в МП)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-34, WEB-35
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) В `LK_NAV_ITEMS` добавлен пункт «Напоминания» (`lk-reminders`, related — create/edit, иконка `bell`) после «Задачи и списки»; reminder-маршруты убраны из `relatedNames` у `lk-tasks` (нет двойной подсветки); добавлены `LK_SECTION_META` для reminder-маршрутов (раньше топбар показывал дефолт). `LkBottomNav`: деление вокруг центральной «+» — `Math.ceil(len/2)` (3+«+»+2), подпись «Напомин.», `min-width:0`+ellipsis против переполнения. (2) Реализована работа с доп. атрибутами ПУНКТА списка по образцу МП: `web/src/utils/itemAttributes.ts` (чистые утилиты — `ItemAttribute`, `ATTRIBUTE_ORDER/LABELS/ICONS`, `isAttributeSet`, форматтеры токенов с инъекцией `now`), `LkTaskItemRow.vue` (строка: чекбокс, название, компактная мета-строка — чип ×N для goods, теги, чип дедлайна для tasks, иконки-индикаторы напоминания/комментария/ссылки; chevron `aria-expanded`), `LkItemAttributes.vue` (панель: степпер «Количество» для goods, токены заданных атрибутов с «×» + чипсы незаданных). Вместо шторки МП — инлайн-редактор в панели (date / datetime-local / url с валидацией / textarea / тег-редактор с предложениями). Сохранение — `PUT items/{uuid}` через `useShoppingListItems.update`, состояние заменяется ответом сервера; ошибки — `role="alert"`. Поля сверены с `Store/UpdateItemRequest`: `quantity` (min:1, не nullable), `deadline`, `reminder_at`, `link`, `comment` (nullable), `tags` (JSON-строка). Бэкенд НЕ менялся.
- **Файлы:** `web/src/constants/lkNav.ts`, `web/src/components/lk/LkBottomNav.vue`, `web/src/utils/itemAttributes.ts` (new), `web/src/components/lk/LkTaskItemRow.vue` (new), `web/src/components/lk/LkItemAttributes.vue` (new), `web/src/components/lk/LkTaskFormDialog.vue`, `web/src/api/shoppingListsApi.ts`, `web/src/types/{shoppingList,lkIcon}.ts`, `web/src/components/lk/LkIcon.vue` (+ тесты)
- **Критерии приёмки:**
  - [x] Пункт «Напоминания» в меню, активен ровно один пункт на reminder-маршрутах
  - [x] 5 пунктов без переполнения в нижней навигации и сайдбаре
  - [x] Раскрытие строки пункта: токены/чипсы атрибутов, степпер количества (goods)
  - [x] Добавление/изменение/удаление атрибута уходит на сервер, ошибки видимы
  - [x] vue-tsc OK, Vitest зелёный (539)
- **Создана:** 2026-07-15
- **Завершена:** 2026-07-15

### WEB-39: Пункты задачи — «Удалить строку» в раскрытой области; пресеты тегов (Работа вместо Звонки/Счета)
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-38
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) Кнопка-«крестик» удаления пункта убрана из строки — удаление переехало в раскрывающуюся область атрибутов красной текстовой кнопкой «Удалить строку» (`LkItemAttributes` эмитит `remove`, `LkTaskItemRow` пробрасывает наверх; осиротевший стиль `.lk-form-dialog__item-remove` удалён). Строка стала чище, деструктивное действие требует раскрытия. (2) `TAG_PRESETS` в `LkTaskFormDialog`: убраны «Звонки» и «Счета», добавлена «Работа». Цвета «Звонки»/«Счета» сохранены в `NAMED_TAG_COLORS` — теги могли остаться в данных пользователя; «Работа» получила lilac-тон палитры.
- **Файлы:** `web/src/components/lk/LkItemAttributes.vue`, `web/src/components/lk/LkTaskItemRow.vue`, `web/src/components/lk/LkTaskFormDialog.vue`, `web/src/constants/lkTagColors.ts` (+ тесты)
- **Критерии приёмки:**
  - [x] В свёрнутой строке кнопки удаления нет; в раскрытой — «Удалить строку», удаляет через API
  - [x] Пресеты тегов: Покупки, Дом, Личное, Важное, Работа, Здоровье
  - [x] vue-tsc OK, Vitest зелёный (540)
- **Создана:** 2026-07-21
- **Завершена:** 2026-07-21

### WEB-40: Пункты задачи — кнопка «Комментарий» в основной строке; «Удалить строку» компактно вверх
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-39
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/05-typescript-vue.md`
- **Описание:** (1) Доступ к комментарию пункта вынесен из чипсов раскрытой области в основную строку: в `LkTaskItemRow` рядом с chevron (левее) — кнопка-иконка `comment`, `@click.stop`. Клик раскрывает строку (emit `toggleExpand`, если свёрнута) и авто-открывает редактор комментария через сигнал `autoOpenAttribute` (проп в `LkItemAttributes`, `watch immediate` → `openEditor('comment')`, эмит `autoOpened` сбрасывает сигнал — повторный клик срабатывает). Когда комментарий задан — кнопка активна (accent-заливка), служит индикатором; отдельный индикатор `comment` убран из свёрнутой мета-строки (bell/link остались). «Комментарий» отфильтрован из чипсов/токенов панели (`CHIP_ATTRIBUTES = ATTRIBUTE_ORDER без comment`); утилиты `itemAttributes.ts` не тронуты. (2) «Удалить строку» перенесена из низа панели в верхний тулбар `.lk-item-attrs__toolbar` (первый ребёнок): для goods — в одну строку со степпером количества справа (`margin-left:auto`), для tasks — компактной строкой сверху справа; вертикаль не занимает лишнего. Поведение `remove`→API не менялось.
- **Файлы:** `web/src/components/lk/LkTaskItemRow.vue`, `web/src/components/lk/LkItemAttributes.vue` (+ тесты LkTaskItemRow/LkTaskFormDialog)
- **Критерии приёмки:**
  - [x] Кнопка «Комментарий» в строке; клик раскрывает и открывает редактор комментария (сигнал сбрасывается)
  - [x] «Комментарий» отсутствует в чипсах; заданный комментарий делает кнопку активной; индикатора comment в мете нет
  - [x] «Удалить строку» компактна и в верхнем тулбаре (goods+tasks), эмитит remove
  - [x] vue-tsc OK, Vitest зелёный (547)
- **Создана:** 2026-07-24
- **Завершена:** 2026-07-24

### MOB-53: Форма напоминания — компактный отступ; «Повтор» радиокнопками в строку; экспорт чекбоксом; диалог «Сохранить изменения?»
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Доработки `ReminderForm` (RN + Expo, SDK 54 / expo-router 6 / react-navigation 7). (1) Уменьшен зазор между заголовком-хедером и первой секцией «О чём напомнить»: `header.paddingBottom` 18→6, `content` `padding:18`→`paddingHorizontal:18,paddingTop:8,paddingBottom:8,gap:18` (~36→~14, зазоры между секциями не тронуты). (2) «Повтор» — из 2-колоночной сетки чипсов в ОДНУ строку из 4 радиокнопок (`accessibilityRole="radiogroup"`, `flexDirection:row`, `flex:1`; радио-кружок 20px + подпись `fontSize:12` `numberOfLines={2}` — длинные лейблы переносятся внутри ячейки, ряд один). (3) «Экспорт в календарь» из мгновенной кнопки → чекбокс «Добавить в календарь»: `ReminderFormValues` расширен `exportToCalendar:boolean`; экспорт (`exportReminderToCalendar`) выполняется в `onSuccess` мутации в экранах `new.tsx`/`[uuid].tsx` — только ПОСЛЕ сохранения, с Alert-результатом (в new — `router.back()` по «OK»). (4) Диалог «Сохранить изменения?» при уходе с несохранёнными правками через `usePreventRemove(isDirty, …)` (react-navigation v7) — ловит хедерную «Назад», аппаратный Back, свайп; кнопки Отмена/Не сохранять/Сохранить (последняя только при валидных данных); dirty сбрасывается в `handleSubmit` (уход после сохранения не спрашивает). Бэкенд/sync не затронуты.
- **Файлы:** `mobile/src/components/reminders/ReminderForm.tsx`, `mobile/app/reminders/new.tsx`, `mobile/app/reminders/[uuid].tsx` (+ тесты ReminderForm/new/uuid)
- **Критерии приёмки:**
  - [x] Компактный отступ под заголовком
  - [x] «Повтор» — 4 радиокнопки в одну строку, один активный
  - [x] Экспорт — чекбокс, срабатывает только после успешного сохранения
  - [x] Диалог «Сохранить изменения?» при уходе с dirty (все способы ухода), не спрашивает без правок/после сохранения
  - [x] tsc OK, Jest зелёный (827)
- **Известные шероховатости:** удаление напоминания на «грязной» форме проходит через тот же guard (спросит «Сохранить изменения?») — консистентно с guard в заметках; экспорт может пропуститься, если уходить через guard-кнопку «Сохранить» (onSuccess после размонтирования). Обычное «Создать/Сохранить» — экспорт работает всегда.
- **Создана:** 2026-07-24
- **Завершена:** 2026-07-24

### OPS-9: EAS Build — .easignore для монорепо (фикс EACCES на storage/avatars)
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/08-git-workflow.md`
- **Описание:** `eas build --platform android --profile preview` падал на этапе «Compressing project files» с `EACCES: permission denied, scandir backend/storage/app/private/avatars`: EAS архивирует весь git-репозиторий монорепо от корня, а папка аватаров (runtime-данные) создана backend-контейнером под root (700). Добавлен `/.easignore`, исключающий из архива сиблинг-директории `backend/`, `web/`, `docs/`, `deploy/`, `.git/` (мобильной сборке не нужны — `mobile/` самодостаточен, свой `package-lock.json`, root-workspace нет). Поскольку EAS при наличии `.easignore` использует его ВМЕСТО `.gitignore`, содержимое корневого `.gitignore` продублировано. После фикса архив ~1.8 МБ, загрузка проходит, сборка встаёт в очередь.
- **Файлы:** `.easignore`
- **Критерии приёмки:**
  - [x] `eas build` проходит этап упаковки без EACCES
  - [x] Архив не содержит backend/web/docs (сборка mobile самодостаточна)
- **Создана:** 2026-07-24
- **Завершена:** 2026-07-24

### MOB-54: Таб «Напоминания» (будильник) вместо «Календарь» — сегмент/группировка/просрочка; календарь по ссылке
- **Исполнитель:** mobile-developer (+ UITEST-10 сверка макета)
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Раздел «Календарь» переработан в «Напоминания» по дизайн-макету. (1) Таб-бар: вкладка `calendar` → `reminders-tab` (title «Напоминания», иконка `alarm`/`alarm-outline`), порядок сохранён. (2) Новый экран `app/(tabs)/reminders-tab/index.tsx`: `DarkHeader` «Напоминания» (поиск, аватар→профиль), карточка-ссылка «Открыть календарь ›», сегмент `ReminderSegmentedFilter` «Просроченные N / Запланированные M» (красный бейдж у просроченных), `SectionList`. Данные — единый `useReminders({status:'pending'})` + `splitByOverdue(now)` (консистентные счётчики). Карточка `ReminderListItem`: круг с будильником, заголовок, чип «7 авг 2026, 10:00», красная «просрочено на N дней» (склонение), кнопка-галочка→`completeReminder`, тап→`/reminders/{uuid}`; бейджа источника нет (решение пользователя — у напоминаний нет тегов/категории). Запланированные сгруппированы Сегодня/Завтра/На этой неделе/Позже (`reminderGrouping.ts`, чистая, инъекция `now`). (3) Календарь (прежний вид) перемещён `git mv` в `app/(tabs)/reminders-tab/calendar.tsx` — вложенный Stack во вкладке: открывается по ссылке, таб-бар виден, вкладка «Напоминания» активна. Удалены мёртвые `app/reminders/index.tsx` + `ReminderCard.tsx`. `CreateButton` ROUTE_MAP дополнен новыми путями. UITEST-10: сверка с макетом — исправлены лейбл секции «Просроченные», a11y-роль сегмента `tab`, фон счётчика-бейджа неактивной пилюли (контраст).
- **Файлы:** `mobile/app/(tabs)/_layout.tsx`, `mobile/app/(tabs)/reminders-tab/{_layout,index,calendar}.tsx`, `mobile/src/components/reminders/{ReminderSegmentedFilter,ReminderListItem}.tsx`, `mobile/src/utils/{reminderGrouping,pluralize,datetime}.ts`, `mobile/src/components/tabs/CreateButton.tsx` (+ тесты; удалены reminders/index.tsx, ReminderCard.tsx)
- **Критерии приёмки:**
  - [x] Таб «Напоминания» с иконкой будильника; «Календарь» не отдельная вкладка
  - [x] Сегмент Просроченные/Запланированные со счётчиками; красный бейдж просрочки
  - [x] Просроченные: дата+время + «просрочено на N дней»; чекбокс выполняет; тап открывает напоминание
  - [x] Запланированные сгруппированы Сегодня/Завтра/На этой неделе/Позже
  - [x] Календарь по ссылке, таб-бар виден и вкладка активна
  - [x] tsc OK, Jest зелёный (871)
- **Известные шероховатости:** «просрочено сегодня» при просрочке <24ч (расчёт по полным суткам, не календарным дням) — не противоречит макету, при желании уточнить у дизайна.
- **Создана:** 2026-07-24
- **Завершена:** 2026-07-24

### MOB-55: Напоминания/Календарь/форма — правки по дизайну (таб, amber-тон, календарь в шапке, подтверждение, без «Отложить»)
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-54
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** Семь правок по замечаниям к экрану «Напоминания». (1) Подпись вкладки таб-бара «Напоминания»→«Напомнить» (обрезалась); заголовок экрана остался «Напоминания». (2) Карточки «Запланированные» — в amber-тоне (`colors.amber`/`amberBg`, общие с FeedCard/задачами главной): фон иконки будильника и чип даты; просроченные — danger-тон. Проп `tone: 'overdue'|'planned'` в `ReminderListItem`. (3) Переход «Открыть календарь» перенесён из плашки в теле в тёмно-зелёную шапку `DarkHeader` (новый проп `onCalendarPress` — кнопка-иконка). (4) Календарь открывается свёрнутым (`collapsed` default true) + хлебная крошка «‹ Календарь» (новый проп `DarkHeader.onBack` → `router.back()`). (5) Флаг выполнения — скруглённый квадрат (borderRadius 15→9) вместо круга. (6) Подтверждение «Закрыть напоминание?» (helper `confirmCloseReminder`, Alert Отмена/Закрыть) перед выполнением — и из списка (галочка), и с формы (кнопка «Выполнить»). (7) Убрана кнопка «Отложить» с формы `[uuid].tsx` + удалён `SnoozeSheet` (домен snooze в repo/hook/utils оставлен). Пропы `DarkHeader`: +`onBack`, +`onCalendarPress`.
- **Файлы:** `mobile/app/(tabs)/_layout.tsx`, `mobile/app/(tabs)/reminders-tab/{index,calendar}.tsx`, `mobile/src/components/ui/DarkHeader.tsx`, `mobile/src/components/reminders/ReminderListItem.tsx`, `mobile/src/utils/confirmCloseReminder.ts` (new), `mobile/app/reminders/[uuid].tsx` (+ тесты; удалён `SnoozeSheet.tsx`)
- **Критерии приёмки:**
  - [x] Таб «Напомнить»; запланированные в amber-тоне, просроченные — danger
  - [x] «Открыть календарь» в шапке; календарь свёрнут + «‹ Календарь»
  - [x] Флаг — скруглённый квадрат; подтверждение «Закрыть напоминание?» (список + форма)
  - [x] Кнопка «Отложить» убрана
  - [x] tsc OK, Jest зелёный (895)
- **Создана:** 2026-08-12
- **Завершена:** 2026-08-12

### MOB-56: Форма напоминания — карточки как на главной; статус «В календаре» при экспорте
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-53, MOB-55
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/Napominalky/docs/04-typescript-rn.md`
- **Описание:** (1) Карточки-«плашки» формы напоминания приведены к виду карточек главного экрана (`FeedCard`): `styles.card` в `ReminderForm` и `ReminderDateCard` — тонкая рамка `borderWidth:1`/`borderColor:borderSubtle`, `padding:13`, `borderRadius:16`, тень убрана (было `paddingHorizontal:16` + shadow); вертикальный ритм перенесён на `divider.marginVertical`. (2) Если напоминание уже экспортировано в системный календарь — на форме вместо чекбокса «Добавить в календарь» статичный блок «В календаре». Реализовано хранение факта экспорта: локальное поле `calendar_event_id` (`text`, nullable) в схеме `reminders` + миграция `0009_reminder_calendar_event_id.sql` (journal/snapshot/migrations.js). Поле НЕ синхронизируется — пишется методом `RemindersRepository.setCalendarEventId()` мимо outbox (аналог `notificationId`), в pull-маппере отсутствует. `eventId` от `exportReminderToCalendar` сохраняется в напоминание после успешного экспорта в `new.tsx` (uuid из onSuccess) и `[uuid].tsx`. UI — новый `ExportCalendarRow.tsx`: `exported` (из `calendarEventId != null`) → некликабельный статус «В календаре», иначе чекбокс; повторный экспорт исключён (submit шлёт `exportToCalendar:false`, если уже в календаре).
- **Файлы:** `mobile/src/components/reminders/{ReminderForm,ReminderDateCard,ExportCalendarRow}.tsx`, `mobile/src/db/schema/reminders.ts`, `mobile/src/db/migrations/0009_*` (+meta), `mobile/src/db/repositories/remindersRepo.ts`, `mobile/src/hooks/useReminders.ts`, `mobile/src/services/sync/mappers.ts`, `mobile/app/reminders/{new,[uuid]}.tsx` (+ тесты)
- **Критерии приёмки:**
  - [x] Карточки формы по метрикам = FeedCard (рамка/padding 13/radius 16, без тени)
  - [x] `calendar_event_id` (миграция), НЕ синкается; eventId сохраняется после экспорта
  - [x] «В календаре» вместо чекбокса при экспортированном; без повторного экспорта
  - [x] tsc OK, Jest зелёный (916)
- **Создана:** 2026-08-12
- **Завершена:** 2026-08-12

### FEAT-1: Статусы задач и строк (backend + web) — Новая/В работе/Отложена/Выполнена
- **Исполнители:** architect (ARCH-2), backend-developer (DEV-20), mobile-backend-developer (MBE-17), web-developer (WEB-41), test-engineer (TEST-16), ux-ui-test-engineer (UITEST-11)
- **Статус:** completed (backend+web; mobile — следующим шагом)
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** MOB-статусы (обмен)
- **Стандарты:** docs/02-php.md, 03-laravel.md, 04-database.md, 05-typescript-vue.md, 07-api.md
- **Описание:** Введены статусы **Новая/В работе/Отложена/Выполнена** (по умолчанию Новая) — ТОЛЬКО для списков `type='tasks'` и их пунктов; списки `goods` (Покупки) без статусов (остаётся `is_checked`/`is_completed`). Enum `TaskStatus`; колонки `shopping_lists.status`+`status_is_manual`, `shopping_list_items.status` (миграции `2026_08_14_100000/100100` с backfill из is_completed/is_checked). **Автоматика деривации статуса задачи из пунктов** (`ListStatusResolver` + `RecalculateListStatusAction`): любой пункт in_progress → задача in_progress; все done → done; все postponed → postponed; иначе new. **Ручной статус закрепляется** (`status_is_manual`): любой явный статус в PUT/POST → закрепление, автоматика не трогает; сброс — `status_is_manual:false` или снятие is_completed (UI «Авто»). **Инвариант** `done ⇔ is_completed/is_checked` (приоритет status над булевыми). Sync: `SyncEntities::FIELDS` += is_completed/status/status_is_manual (список) и status (пункт), нормализация в `SyncChangeApplier` — заложено под будущую мобилку. API: валидация status (enum, 422 на невалидном; goods номинально без 422), поля в ресурсах. Web: колонка «СТАТУС» (бейджи — Новая синий/В работе amber/Отложена lilac/Выполнена зелёный), `LkStatusBadge` с меню (задача +«Авто», пункт без), выбор статуса задачи/строк, индикатор ручного закрепления, goods «—»; зачёркивание tasks-строки по `status==='done'`.
- **Файлы:** backend — `app/Enums/TaskStatus.php`, `app/Services/ShoppingList/ListStatusResolver.php`, `app/Actions/ShoppingList*/…`, `app/Models/{ShoppingList,ShoppingListItem}.php`, `app/Data/*`, `app/Http/{Requests,Resources,Controllers}/ShoppingList*`, `app/Services/Sync/{SyncEntities,SyncSerializer,SyncChangeApplier}.php`, `database/migrations/2026_08_14_1000*`, фабрики, `docs/07-api.md`; web — `types/shoppingList.ts`, `constants/lkStatusColors.ts`, `components/lk/{LkStatusBadge,LkTaskFormDialog,LkTaskItemRow}.vue`, `components/lk/tasks/LkTaskTableRow.vue`, `pages/lk/tasks/TasksView.vue`, `composables/useLkTasksTable.ts` (+ тесты)
- **Критерии приёмки:**
  - [x] Статусы только для tasks; goods без статусов
  - [x] Деривация задача←пункты; ручной статус закрепляется, «Авто» сбрасывает
  - [x] Инвариант done⇔is_completed/is_checked; enum-валидация API
  - [x] Колонка СТАТУС + бейджи/меню по макету; sync-поля заложены под мобилку
  - [x] Pest 357 passed; vue-tsc OK, Vitest 574 passed
- **Известные полировки (web, не блок.):** дропдаун-меню статуса может обрезаться у нижних строк длинного списка (нужен Teleport/floating); ARIA-навигация меню стрелками.
- **Следующий шаг:** статусы в мобильном приложении + обмен (MOB) — schema/outbox/деривация локально, sync-поля уже готовы.
- **Создана:** 2026-08-14
- **Завершена:** 2026-08-14

### MBE-18: Фикс 422 при смене статуса задачи (partial PUT списка)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high (прод-баг)
- **Зависимости:** FEAT-1
- **Блокирует:** —
- **Стандарты:** docs/07-api.md, 03-laravel.md
- **Описание:** Смена статуса задачи из таблицы (`changeStatus` → `PUT { status }` / `{ status_is_manual:false }` без title) падала с **422**: `UpdateListRequest.title` был `required`, а контроллер всегда брал `title` из запроса (затёр бы название пустой строкой). Исправлено: `title` → `['sometimes','required','string','max:255']`; `UpdateController` берёт `title` из запроса только при наличии, иначе — существующий `$shoppingList->title` (по образцу рабочего item-контроллера, где `name` уже sometimes). Смена статуса СТРОКИ уже работала (name sometimes). Добавлен регресс-тест partial PUT (только status/только status_is_manual → 200, title сохранён). Backend применён live (bind-mount + optimize:clear).
- **Файлы:** `backend/app/Http/Controllers/ShoppingLists/UpdateController.php`, `backend/app/Http/Requests/ShoppingList/UpdateListRequest.php`, `backend/tests/Feature/ShoppingLists/TaskStatusApiContractTest.php`
- **Критерии приёмки:**
  - [x] PUT списка только со status → 200, title не затёрт, статус закреплён
  - [x] «Авто»-сброс partial → 200; Pest зелёный
- **Создана:** 2026-08-14
- **Завершена:** 2026-08-14

### MOB-57: Статусы задач и строк в мобильном приложении + обмен
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** FEAT-1 (backend+web)
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Мобильная часть фичи статусов (п.3) — единая логика с бэком/вебом. Схема Drizzle: `shoppingLists` += `status`/`status_is_manual`/`is_completed` (мобилка списка is_completed не имела), `shoppingListItems` += `status`; миграция **0010_task_status** (sql+snapshot+journal+migrations.js). Enum-зеркало `constants/taskStatus.ts` (+`forChecked`, `isDone`, `normalizeTaskStatus`), чистая `utils/deriveListStatus.ts` (та же деривация: in_progress > все done > все postponed > new). Репозиторий: инвариант `status↔is_checked` (пункт) / `↔is_completed` (список) через forChecked; локальный пересчёт статуса задачи после add/check/update/delete пункта (только tasks, только если не закреплён); `setListStatus`/`setListStatusAuto` (закрепление/сброс), `setItemStatus` (+ управление локальным уведомлением: done→cancel, не-done→reschedule). Sync: `ServerShoppingList/Item` типы += поля, pull-mappers маппят их; push уходит через существующий outbox-snapshot (полный snake_case-снимок), пересчитанный статус задачи тоже. UI (только tasks): `StatusBadge` (Новая синий/В работе amber/Отложена purple/Выполнена accent), `StatusSheet` (4 статуса +«Авто» у задачи); бейдж задачи в `ListCard` и на экране деталей `app/lists/[uuid].tsx` (смена статуса задачи там), бейдж пункта в `ItemRow` (шторка без «Авто»); goods без статусов; зачёркивание tasks-пункта по `status==='done'`. Рефактор: `shoppingListsModels.ts` (вынос из repo >500 строк), `ListDetailHeader.tsx`.
- **Файлы:** `mobile/src/db/schema/{shoppingLists,shoppingListItems}.ts`, `mobile/src/db/migrations/0010_task_status*`, `mobile/src/constants/taskStatus.ts`, `mobile/src/utils/deriveListStatus.ts`, `mobile/src/db/repositories/{shoppingListsRepo,shoppingListsModels}.ts`, `mobile/src/services/sync/mappers.ts`, `mobile/src/types/sync.ts`, `mobile/src/components/lists/{StatusBadge,StatusSheet,ListCard,ItemRow}.tsx`, `mobile/app/lists/[uuid].tsx`, `mobile/src/components/lists/ListDetailHeader.tsx`, хуки (+ тесты)
- **Критерии приёмки:**
  - [x] Схема+миграция 0010; статусы только для tasks, goods без статусов
  - [x] Деривация + инвариант + закрепление ручного (та же логика, что backend/web)
  - [x] Обмен: pull-mappers + push новых полей на сервер
  - [x] UI-бейджи и смена статуса задачи (детали) / пункта (строка)
  - [x] tsc OK, Jest зелёный (976)
- **Создана:** 2026-08-14
- **Завершена:** 2026-08-14

### FEAT-2: Комментарии (тред) к строкам задач (backend + web)
- **Исполнители:** architect (ARCH-3), backend-developer (DEV-21), mobile-backend-developer (MBE-19), web-developer (WEB-42), test-engineer (TEST-17), ux-ui-test-engineer (UITEST-12)
- **Статус:** completed (backend+web; mobile — следующим шагом)
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** MOB-комментарии
- **Стандарты:** docs/02-php.md, 03-laravel.md, 04-database.md, 05-typescript-vue.md, 07-api.md
- **Описание:** К строке задачи (пункт) можно добавлять **несколько комментариев** (тред), каждый с автором (имя) и временем (created_at, авто). Тред ЗАМЕНЯЕТ одиночное поле `comment` (существующие мигрированы в первый комментарий; колонка оставлена — двухфазный вывод, старые APK не ломаются). Новая таблица `shopping_list_item_comments` (uuid, shopping_list_item_id, user_id=владелец, author_name денормализовано, body, server_revision, softDeletes). Actions Add/Delete, Policy, API: `GET/POST/DELETE /shopping-lists/{list}/items/{item}/comments`; ресурс пункта += `comments_count` + embed `comments` (eager-load, попап без лишних запросов). Sync: новая сущность `shopping_list_item_comment` (author_name/body, резолв родителя), заложена под мобилку. Web: тред в раскрытой строке (`LkItemCommentsThread`, отправка), popover 💬 при наведении (`LkCommentsPopover`, тёмное окно «Комментарии · N» по макету) в строке и таблице (данные из уже загружаемых пунктов), счётчик 💬; крестик × вместо текста «Удалить строку» + подтверждение (`LkConfirmDialog`); одиночный редактор `comment` убран из атрибутов. **2 sync-бага (найдены TEST, исправлены):** `SyncChangesResource` не отдавал `shopping_list_item_comments` (клиенты не получали тред/бэкфилл); push комментария-сироты валил батч 500 (skip при нерезолве родителя).
- **Файлы:** backend — `app/Models/ShoppingListItemComment.php`, `app/Actions/ShoppingListItemComment/*`, `app/Policies/ShoppingListItemCommentPolicy.php`, `app/Http/{Controllers/ShoppingLists/Items/Comments/*,Requests/ShoppingListItemComment/*,Resources/ShoppingListItemCommentResource.php}`, `app/Http/Resources/{ShoppingListItemResource,Sync/SyncChangesResource}.php`, `app/Services/Sync/{SyncEntities,SyncSerializer,SyncChangeApplier,SyncPullService,SyncParentResolver}.php`, `database/migrations/2026_08_14_1100*`, `routes/api.php`, `docs/07-api.md`; web — `components/lk/{LkItemCommentsThread,LkCommentsPopover,LkTaskItemRow,LkItemAttributes,LkTaskFormDialog}.vue`, `components/lk/tasks/LkTaskTableRow.vue`, `composables/{useShoppingListItems,useLkTasksTable}.ts`, `utils/{itemAttributes,datetime}.ts`, `types/shoppingList.ts`, `api/shoppingListsApi.ts` (+ тесты)
- **Критерии приёмки:**
  - [x] Тред: несколько комментариев с автором и временем; отправка (текст, время авто)
  - [x] Popover 💬 при наведении (строка + таблица), без лишних запросов
  - [x] Крестик × вместо «Удалить строку» + подтверждение
  - [x] API CRUD + sync нового типа; комментарии доезжают до клиентов (sync-фиксы)
  - [x] Pest 398 passed; vue-tsc OK, Vitest 611 passed
- **Известные компромиссы:** legacy `comment` в старом APK не виден в веб-треде до mobile-релиза (двухфазный вывод; drop колонки — отдельной задачей); `note.body` теперь коерсит null→'' в sync (осознанно, для заметок практически без изменений).
- **Следующий шаг:** комментарии в мобильном приложении (тред в шторке пункта + обмен) — sync-сущность и API готовы. → выполнено MOB-58.
- **Создана:** 2026-08-14
- **Завершена:** 2026-08-14

### MOB-58: Комментарии-тред к строкам задач в мобильном приложении + обмен
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** FEAT-2 (backend+web)
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Мобильная часть комментариев-тред. Схема Drizzle: таблица `shopping_list_item_comments` (uuid, shopping_list_item_uuid+индекс, user_id, author_name, body, server_revision, timestamps, deleted_at); миграция **0011_item_comments** (sql+snapshot+journal+migrations.js). Локальный `comment`→тред НЕ мигрируется (серверный бэкфилл; иначе дубли) — вместо этого `ensureSchemaPullVersion()` (sync_meta `schema_pull_version=11`): при версии <11 → `resetPullCursor` + фиксация, идемпотентно, из DbProvider после миграций. Sync: `ServerShoppingListItemComment` тип + `shoppingListItemCommentMapper` (pull) + `applyBatch('shopping_list_item_comment', data.shopping_list_item_comments ?? [])`; push через baseRepo→outbox (snake_case-снимок: shopping_list_item_uuid/author_name/body), FIFO гарантирует пункт раньше комментария. Репо `itemCommentsRepo` (listComments ASC, addComment — автор из `useAuthStore` user.name, фолбэк email/«Вы», deleteComment soft+outbox, countsForItems). UI: тред `CommentsSheet` (bottom-sheet: автор/время «ЧЧ:ММ ДД.ММ.ГГ»/текст + ввод + отправить, удаление с подтверждением), 💬-счётчик в `ItemRow`; одиночный редактор `comment` удалён из атрибутов (AttributeSheet/Chips/QuickAddItem). Хуки `useItemComments`/`useItemCommentCounts`.
- **Файлы:** `mobile/src/db/schema/shoppingListItemComments.ts`, `mobile/src/db/migrations/0011_item_comments*`, `mobile/src/db/repositories/itemCommentsRepo.ts`, `mobile/src/services/sync/{mappers,applyChanges,syncMeta}.ts`, `mobile/src/types/sync.ts`, `mobile/src/hooks/useItemComments.ts`, `mobile/src/components/lists/{CommentsSheet,ItemRow,AttributeSheet,AttributeSheetContent,AttributeChips,QuickAddItem}.tsx`, `mobile/app/lists/[uuid].tsx`, `mobile/src/providers/DbProvider.tsx` (+ тесты)
- **Критерии приёмки:**
  - [x] Схема+миграция 0011; сброс курсора для подтяжки бэкфилла (идемпотентно)
  - [x] Sync нового типа: pull-mapper+apply, push через outbox (FIFO родитель раньше)
  - [x] Тред в пункте (автор/время/текст, отправка, удаление) вместо одиночного comment; счётчик 💬
  - [x] tsc OK, Jest зелёный (1019)
- **Создана:** 2026-08-14
- **Завершена:** 2026-08-14

### MOB-59: Жесты строки задачи — свайп-вниз шторки, свайп-влево удаление, фикс двойного тапа
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-57, MOB-58
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Три UI-правки экрана деталей списка задач. (1) Свайп вниз закрывает шторку комментариев (`CommentsSheet`): общий хук `useSheetDragToClose` (PanResponder + Animated translateY, порог 100px/скорость), переиспользован и в `AttributeSheet` (рефактор без смены поведения). (2) Свайп влево по строке (`ItemRow`) — удаление с подтверждением ПРЯМО В СТРОКЕ (не Alert): `Swipeable` (react-native-gesture-handler), из-под строки выезжает красная кнопка `SwipeDeleteAction`, тап по ней = подтверждение → `onSwipeDelete`→`deleteItem` (soft+sync); смахивание назад — отмена. Добавлен `GestureHandlerRootView` в `app/_layout.tsx` + jest-мок. (3) Фикс тапа по статусу/атрибутам «со второго раза»: истинная причина — вложенные Pressable (StatusBadge с hitSlop внутри Pressable-раскрытия). metaLine (статус/теги/дедлайн/индикаторы) вынесена сестрой Pressable-раскрытия (`ItemRowMetaLine`) — тап по статусу всегда `onOpenStatus` с первого раза и не раскрывает строку; `keyboardShouldPersistTaps="handled"` на FlatList уже стоял (закреплён регресс-тестом).
- **Файлы:** `mobile/src/hooks/useSheetDragToClose.ts` (new), `mobile/src/components/lists/{CommentsSheet,AttributeSheet,ItemRow,ItemRowMetaLine,SwipeDeleteAction}.tsx`, `mobile/app/lists/[uuid].tsx`, `mobile/app/_layout.tsx`, `mobile/jest.setup.js` (+ тесты)
- **Критерии приёмки:**
  - [x] Свайп вниз закрывает шторку комментариев
  - [x] Свайп влево → кнопка «Удалить» в строке, тап подтверждает (не Alert); свайп сам не удаляет
  - [x] Тап по статусу/атрибутам срабатывает с первого раза, не раскрывая строку
  - [x] tsc OK, Jest зелёный (1036)
- **Отклонения:** legacy `Swipeable` (не ReanimatedSwipeable) — сознательно ради стабильности в jest; старый путь удаления (кнопка в раскрытой панели с Alert) сохранён.
- **Создана:** 2026-08-17
- **Завершена:** 2026-08-17


### WEB-43: Форма задачи — статус в шапку, ширина ×2, облако тегов свёрнуто
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** FEAT-1, FEAT-2
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** Три правки раскладки `LkTaskFormDialog`. (1) Блок «Статус» (label + 4 чипа + «Авто») убран из тела; статус-переключатель перенесён в ШАПКУ — `LkStatusBadge` (interactive, with-auto: меню 4 статуса + «Авто») рядом с прогрессом «M/N», немедленный PUT `{status}`/`{status_is_manual:false}` + перечитка пунктов; только edit-режим tasks; точка-индикатор ручного закрепления. (2) Ширина десктопной панели ×2: `max-width` 580→1160px (+ padding оверлея), мобильный bottom-sheet не тронут. Попап треда `LkCommentsPopover` больше не обрезается — `clipBounds()` флипает по ближайшему обрезающему предку (скролл-тело модалки), а не по окну (исправляет и таблицу). (3) Облако тегов свёрнуто по умолчанию (`isTagCloudOpen`): показывается кнопка «Выбрать тег» + выбранные теги компактными чипами; клик разворачивает облако (пресеты/свои/«+ Свой тег»), «Свернуть» сворачивает.
- **Файлы:** `web/src/components/lk/LkTaskFormDialog.vue`, `web/src/components/lk/LkCommentsPopover.vue` (+ тесты)
- **Критерии приёмки:**
  - [x] Статус-переключатель в шапке (edit+tasks); блока в теле нет; goods/new — без статуса
  - [x] Ширина ×2 (1160px); попап треда помещается, не обрезается
  - [x] Теги свёрнуты за «Выбрать тег», выбранные видны; разворот/сворачивание
  - [x] vue-tsc OK, Vitest зелёный (616)
- **Создана:** 2026-08-17
- **Завершена:** 2026-08-17

### MOB-60: Фикс синхронизации статусов пунктов + редактирование названия пункта
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high (баг sync)
- **Зависимости:** MOB-57
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** (Баг) Статусы пунктов/списков не синхронизировались с сервером: при добавлении статусов (миграция 0010) не сбросили pull-курсор и не сделали локальный бэкфилл — колонка `status` получила дефолт `new` всем существующим записям (включая выполненные `is_checked=1`), а серверные статусы старых записей (revision ниже курсора) не подтягивались → на МП выполненные пункты показывали «Новая». Фикс: (1) `CURRENT_SCHEMA_PULL_VERSION 11→12` в `syncMeta` — существующие устройства сбросят pull-курсор ещё раз (полный ре-pull статусов с сервера), идемпотентно; outbox не теряется (push перед pull). (2) Миграция `0012_status_backfill` (data-only): `UPDATE items SET status='done' WHERE is_checked=1 AND status='new'`; `UPDATE lists SET status='done', status_is_manual=1 WHERE is_completed=1 AND type='tasks' AND status='new'` — восстановление инварианта done⇔флаг для offline до первого pull (guard `status='new'` не трогает осмысленные статусы; in_progress/postponed придут pull'ом). (Фича) Редактирование названия пункта: в раскрытой панели `ItemRow` — `NameEditRow` (TextInput + карандаш, коммит по blur/Enter, trim, пустое/неизменённое не сохраняется) → `updateItem({name})` через repo→outbox.
- **Файлы:** `mobile/src/services/sync/syncMeta.ts`, `mobile/src/db/migrations/0012_status_backfill.sql` (+meta), `mobile/src/components/lists/ItemRow.tsx`, `mobile/app/lists/[uuid].tsx` (+ тесты)
- **Критерии приёмки:**
  - [x] Сброс курсора при 11→12 (полный ре-pull статусов); свежая установка без лишнего pull
  - [x] Локальный бэкфилл is_checked→done / is_completed→done+manual
  - [x] Редактирование названия пункта (blur/Enter/пустое не сохраняется)
  - [x] tsc OK, Jest зелёный (1052)
- **Создана:** 2026-08-17
- **Завершена:** 2026-08-17

### WEB-44: Редактирование названия пункта задачи
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** Инлайн-редактирование названия существующего пункта в форме задачи. В `LkTaskItemRow` — иконка-карандаш рядом с именем (не клик по имени, т.к. имя внутри label чекбокса) → `<input>`; сохранение по Enter/blur → emit `update {name}` → `useShoppingListItems().update(uuid,{name})` (PUT, backend уже принимал `name`); Esc — отмена с откатом (`.stop`, чтобы не закрыть модалку); пустое/неизменённое имя не сохраняется. Не конфликтует с чекбоксом/статус-меню/💬/раскрытием/крестиком.
- **Файлы:** `web/src/components/lk/LkTaskItemRow.vue` (+ тесты LkTaskItemRow/LkTaskFormDialog)
- **Критерии приёмки:**
  - [x] Карандаш → input; Enter/blur сохраняет {name}; Esc отменяет; пустое не сохраняется
  - [x] Без конфликтов с другими контролами строки
  - [x] vue-tsc OK, Vitest зелёный (628)
- **Создана:** 2026-08-17
- **Завершена:** 2026-08-17

### WEB-45 / MOB-61: Ширина формы задачи 700px (веб); свайп-вниз закрывает шторку статусов (МП)
- **Исполнители:** web-developer (WEB-45), mobile-developer (MOB-61)
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** WEB-43, MOB-57/59
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md, docs/04-typescript-rn.md
- **Описание:** (WEB) Ширина десктопной панели `LkTaskFormDialog` по умолчанию 700px (было 1160 после WEB-43) — `max-width` 1160→700, регресс-тест обновлён; попап треда позиционируется по границе скролл-области, обрезки нет. (MOB) Шторка выбора статуса пункта/задачи `StatusSheet` не закрывалась свайпом вниз (был только scrim-тап) — применён общий хук `useSheetDragToClose` (drag-зона grabber+title, порог 100px/скорость), как в CommentsSheet/AttributeSheet; +тест-файл `StatusSheet.test.tsx` (scrim + свайп).
- **Файлы:** `web/src/components/lk/LkTaskFormDialog.vue` (+тест), `mobile/src/components/lists/StatusSheet.tsx` (+тест)
- **Критерии приёмки:**
  - [x] Веб: ширина формы 700px
  - [x] МП: свайп вниз закрывает шторку статусов
  - [x] vue-tsc/tsc OK; Vitest 628 / Jest 1056 зелёные
- **Создана:** 2026-08-17
- **Завершена:** 2026-08-17

### MOB-62: Облегчённая форма пункта — единая шторка «Допатрибуты»
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-61
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** По дизайн-макету: (1) убраны 4 чипа Дедлайн/Напоминание/Ссылка/Тег под полем ввода — вместо них иконка «допатрибуты» ВНУТРИ поля (`QuickAddItem`), заполненные значения — токенами под полем (`AttributeTokens`); (2) раскрытый пункт больше не выдаёт сетку кнопок — все атрибуты в единой шторке `AttributesSheet` (паттерн CommentsSheet: свайп-вниз, scrim), туда же переехали название и количество (goods); (3) шеврон свернуть/развернуть убран — строка показывает только заполненные атрибуты компактными чипами (`ItemRowMetaLine`); (4) «Удалить пункт» — в футер шторки (с подтверждением); (5) жёлтая точка-индикатор на иконке при наличии атрибутов (строка и композер); (6) комментарии — отдельный вход в один тап: жёлтый чип со счётчиком в мета-строке при наличии треда, серая иконка в контролах строки при его отсутствии. Плейсхолдер композера — «Добавить задачи» (tasks) / «Что купить» (goods), как в веб ЛК (WEB-46).
- **Файлы:** `mobile/src/components/lists/AttributesSheet.tsx` (новый), `AttributesSheetRow.tsx` (новый), `AttributeTokens.tsx` (бывш. AttributeChips), `ItemRow.tsx`, `ItemRowMetaLine.tsx`, `QuickAddItem.tsx`, `mobile/app/lists/[uuid].tsx`, `mobile/src/utils/itemAttributes.ts` (− `AttributeSheet.tsx`) + тесты
- **Критерии приёмки:**
  - [x] Композер: иконка в поле + точка-индикатор; токены заполненных атрибутов под полем; пустых чипов нет
  - [x] Пункт: одна шторка со всеми атрибутами; шеврона и сетки чипов нет
  - [x] «Удалить пункт» в футере шторки, с подтверждением
  - [x] Комментарии: жёлтый чип со счётчиком / серая иконка — оба входа в один тап
  - [x] tsc OK, Jest зелёный
- **Создана:** 2026-08-18
- **Завершена:** 2026-08-18

### UITEST-13: Сверка облегчённой формы пункта с дизайн-макетом + доводка шторок
- **Исполнители:** ux-ui-test-engineer (проверка), mobile-developer (исправления)
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-62
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Поэлементная сверка MOB-62 с макетом (4 экрана) выявила 4 расхождения, исправлены: (1) шапка шторки «Допатрибуты» — добавлены подзаголовок с названием пункта (редактируемый инпут-сабтайтл вместо поля с рамкой в теле; testID `item-name-input` сохранён) и круглая кнопка «×»; (2) ряды атрибутов — справа «>` (chevron-forward) у заполненных и «+» цвета акцента у пустых вместо единого chevron-down; (3) шторка композера (создание задачи) — футер «Отмена»/«Готово»: «Отмена» откатывает заданные в шторке атрибуты черновика (снапшот при открытии), «Готово» подтверждает; в шапке — подзаголовок с введённым названием; (4) шторка «Комментарии» — подзаголовок с названием пункта + кнопка «×». Label скрима переименован в «Закрыть шторку» (конфликт с «×»).
- **Файлы:** `mobile/src/components/lists/AttributesSheet.tsx`, `AttributesSheetRow.tsx`, `QuickAddItem.tsx`, `CommentsSheet.tsx`, `mobile/app/lists/[uuid].tsx` + тесты (AttributesSheet/QuickAddItem/CommentsSheet)
- **Критерии приёмки:**
  - [x] Шапки обеих шторок: иконка + заголовок + подзаголовок-название + «×» — как в макете
  - [x] Ряды: «>» у заполненных, «+» у пустых
  - [x] Композер: футер «Отмена»/«Готово», откат по «Отмена»
  - [x] tsc OK, Jest зелёный (1072)
- **Создана:** 2026-08-18
- **Завершена:** 2026-08-18

### WEB-46: Форма задачи ЛК — название в заголовке, без «Пункты», плейсхолдер «Добавить задачи»
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-45
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** (1) Поле «Название» перенесено в заголовок шапки `LkTaskFormDialog`: в edit-режиме заголовок — кнопка, клик открывает инлайн-инпут (`#task-form-title` в `header`); Enter/blur сохраняет сразу (PUT `{title}`, как статус/атрибуты пунктов), пустое имя откатывается к текущему, Esc отменяет правку (модалку не закрывает); в new-режиме поле активно сразу (автофокус), а «Сохранить»/первый пункт без названия показывают ошибку под заголовком и возвращают фокус в поле. Отдельный контрол «Название» из тела формы убран. (2) Заголовок секции «Пункты» убран. (3) Плейсхолдер поля добавления пункта — «Добавить задачи» (tasks) / «Что купить» (goods) вместо «Например, …».
- **Файлы:** `web/src/components/lk/LkTaskFormDialog.vue` (+ тест: 3 новых кейса редактирования в шапке, обновлены лейблы/плейсхолдеры)
- **Критерии приёмки:**
  - [x] Название редактируется по клику в заголовке; отдельного поля нет
  - [x] Заголовка «Пункты» нет; плейсхолдер «Добавить задачи»
  - [x] vue-tsc OK, Vitest зелёный (631)
- **Создана:** 2026-08-18
- **Завершена:** 2026-08-18

### MOB-63: Напоминания — управляющие пуши, фикс флажка «Выполнено», закрытие формы по «Сохранить»
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MOB-62
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** (1) Управляющие пуши напоминаний: категория `reminder-actions` (`setNotificationCategoryAsync`) с кнопками «Выполнено» и «Отложить на 10 мин», обе `opensAppToForeground: false`; `scheduleReminder` вешает `categoryIdentifier`; обработка в `handleNotificationResponse` (useNotifications): «Выполнено» → `remindersRepo.completeReminder` (отмена уведомления, recurrence-следующее вхождение), «Отложить» → `snoozeReminder(now+10м)` (перепланирование), затем dismiss из шторки + инвалидация кэша `['reminders']`; тап по телу — прежняя навигация; холодный старт — через `getLastNotificationResponseAsync`. (2) Флажок «Выполнено» в списке напоминаний не срабатывал: вложенный Pressable кнопки внутри Pressable карточки терял тапы на Android (тот же класс бага, что ранее в ItemRow) — кнопка вынесена соседкой в контейнер-View. (3) Экран редактирования напоминания: «Сохранить» теперь закрывает форму (`router.back()` в onSuccess; при экспорте в календарь — после алерта с результатом, как на создании), «Выполнить» после подтверждения тоже возвращает назад.
- **Файлы:** `mobile/src/services/notifications.ts`, `mobile/src/hooks/useNotifications.ts`, `mobile/src/components/reminders/ReminderListItem.tsx`, `mobile/app/reminders/[uuid].tsx`, `mobile/jest.setup.js` + тесты (notifications/useNotifications/uuid)
- **Критерии приёмки:**
  - [x] Пуш напоминания содержит кнопки «Выполнено»/«Отложить на 10 мин», действия работают без открытия приложения
  - [x] Флажок в списке открывает подтверждение и закрывает напоминание
  - [x] «Сохранить» на форме добавления/изменения закрывает форму
  - [x] tsc OK, Jest зелёный (1077)
- **Создана:** 2026-08-21
- **Завершена:** 2026-08-21

### DEV-22 / TEST-18: Вечный спиннер синка — sync_conflicts.entity_type не вмещал тип комментария
- **Исполнители:** backend-developer (DEV-22), test-engineer (TEST-18)
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md, docs/04-database.md
- **Описание:** Симптом (прод, МП): бесконечный спиннер RefreshControl «обновление с сервером» на Главной; в логах сервера — шквал `POST /sync/push` с интервалами бэкоффа 1-2-4-8 с. Причина: `sync_conflicts.entity_type` — `varchar(20)`, а `shopping_list_item_comment` — 26 символов; запись конфликта комментария (LWW) валила INSERT `SQLSTATE[22001]` → весь push 500 → `clearOutbox` не выполнялся → клиент ретраил те же изменения вечно (у пользователя — с 18.08). Фикс: миграция `widen_sync_conflicts_entity_type` (varchar(20)→40, с down). (TEST-18) Заодно устранён flaky в `SyncPushServiceTest`: тест whitelisted-полей пушил `id => 42`, а автоинкремент тестовой БД дошёл до 42 — ложное срабатывание; заменено на заведомо недостижимый 424242424.
- **Файлы:** `backend/database/migrations/2026_08_21_140000_widen_sync_conflicts_entity_type.php`, `backend/tests/Feature/Sync/SyncPushServiceTest.php`
- **Критерии приёмки:**
  - [x] Миграция применена к тестовой БД; Pest Sync — 81 passed
  - [x] Миграция применена к продовой БД (`migrate:status` 2026-09-29: [15] Ran)
- **Создана:** 2026-08-21
- **Завершена:** 2026-08-21

### MOB-64: Диалог закрытия повторяющегося напоминания — предупреждение о следующем вхождении
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** MOB-63
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Жалоба «флажок „Выполнено“ ничего не делает» оказалась UX-проблемой повторяющихся напоминаний: закрытие работало, но `completeReminder` создаёт следующее вхождение — карточка остаётся в списке с тихо сдвинутой датой (у пользователя daily-«Русский язык» сместился 24→28 авг за 4 нажатия). Фикс: `confirmCloseReminder` принимает напоминание, и для recurrence != none диалог предупреждает: «Напоминание повторяется: в списке появится следующее — <дата>» (`closeReminderMessage`, дата через `nextOccurrence`+`formatReminderChip`). Подключено в списке напоминаний и на форме редактирования.
- **Файлы:** `mobile/src/utils/confirmCloseReminder.ts` (+ тест), `mobile/app/(tabs)/reminders-tab/index.tsx`, `mobile/app/reminders/[uuid].tsx`
- **Критерии приёмки:**
  - [x] Для повторяющегося напоминания диалог называет дату следующего вхождения
  - [x] Для обычного — прежнее поведение (без текста)
  - [x] tsc OK, Jest зелёный (1082)
- **Создана:** 2026-08-21
- **Завершена:** 2026-08-21

### MBE-20 / WEB-47: Напоминания ЛК до паритета с МП — сегменты, подсветка просрочки, «Своё время»
- **Исполнители:** mobile-backend-developer (MBE-20), web-developer (WEB-47)
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** WEB-46
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md, docs/07-api.md, docs/05-typescript-vue.md
- **Описание:** (MBE-20) `POST /reminders/{uuid}/snooze` теперь принимает `snoozed_until` (ISO-датавремя, `after:now`) как альтернативу пресетам `snooze: '10m'|'1h'`; ровно одно из двух (`required_without` + `prohibits`); `SnoozeReminderAction` принимает `SnoozeOption|CarbonInterface`. (WEB-47) Страница «Напоминания» ЛК приведена к функционалу МП: фильтры-сегменты «Просроченные / Запланированные» со счётчиками (+ «Выполненные», «Все»), разбивка клиентская по `remind_at` относительно now (одна загрузка `status=all`, переключение без refetch); «Запланированные» — секциями Сегодня/Завтра/На этой неделе/Позже (порт `reminderGrouping` из МП); просроченные подсвечены danger-тоном (красная кромка, бейдж «Просрочено», подпись «просрочено на N дней», красная иконка); в карточке кнопка «Своё время» — инлайн `datetime-local` с валидацией «строго в будущем» → `snoozeUntil`.
- **Файлы:** `backend/app/Http/{Requests/Reminder/SnoozeReminderRequest,Controllers/Reminders/SnoozeController}.php`, `backend/app/Actions/Reminder/SnoozeReminderAction.php` (+ CompleteSnoozeApiTest), `web/src/utils/reminderGrouping.ts` (новый, + тест), `web/src/pages/lk/reminders/RemindersView.vue`, `web/src/components/lk/reminders/LkReminderCard.vue`, `web/src/{api/remindersApi,composables/useReminders}.ts` (+ тесты)
- **Критерии приёмки:**
  - [x] Сегменты «Просроченные/Запланированные» со счётчиками; секции запланированных как в МП
  - [x] Просроченные подсвечены с подписью «просрочено на N дней»
  - [x] «Своё время» откладывает на произвольную будущую дату (API `snoozed_until`)
  - [x] Pest 9 passed (snooze), vue-tsc OK, Vitest зелёный (638)
- **Создана:** 2026-08-21
- **Завершена:** 2026-08-21

### WEB-48: Форма напоминания ЛК — пикеры «своя дата» и «своё время»
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** WEB-47
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** В `LkReminderFormDialog` дата и время задавались только пресетами (Сегодня/Завтра/В выходные/Через неделю; 09:00/12:00/18:00/21:00) — произвольные значения выбрать было нельзя. Добавлены нативные `input[type=date]`/`input[type=time]`, стилизованные пилюлями, в конец рядов «Дата»/«Время»: своя дата создаёт/обновляет «actual»-пилюлю с фактической датой («25 июля») и выбирает её; своё время встаёт первой пилюлей ряда времени; значение, совпадающее с пресетом, выбирает пилюлю пресета без дублей; в edit-режиме пикеры преднаполняются непресетными значениями напоминания.
- **Файлы:** `web/src/components/lk/LkReminderFormDialog.vue` (+ 3 теста)
- **Критерии приёмки:**
  - [x] Произвольная дата и время выбираются в форме и попадают в `remind_at`
  - [x] Совпадение с пресетом — без дублирующих пилюль
  - [x] vue-tsc OK, Vitest зелёный (641)
- **Создана:** 2026-09-03
- **Завершена:** 2026-09-03

### OPS-10: Реструктуризация монорепо — корневой каталог Napominalky/, project→backend
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/01-general.md, docs/08-git-workflow.md
- **Описание:** Репозиторий (вместе с `.git`, история цела) перенесён из корня `/home/vselug/workspace/` в `/home/vselug/workspace/Napominalky/`; каталог `project/` переименован в `backend/` (`git mv`, 319 переименований). Итоговая структура: `backend/ mobile/ web/ docs/ deploy/ .claude/agents/ CLAUDE.md`. Посторонние каталоги (docs/Strategy, docs/presentations, docs/home, land-parcel-178, trading-agent) остались вне репозитория. Абсолютные пути `/home/vselug/workspace/...` и относительные `project/` обновлены в CLAUDE.md, конфигах 12 агентов, стандартах docs/*, реестре, `.gitignore`/`.easignore`. Прод не трогался: контейнеры reminders_* смонтированы на старые абсолютные пути — на них оставлены симлинки `workspace/{project,web,deploy}`; в `backend/docker-compose.yml` закреплено `name: project`, чтобы тома `project_postgres_data`/`project_redis_data` и имена контейнеров не сменились после переименования каталога.
- **Файлы:** `CLAUDE.md`, `.gitignore`, `.easignore`, `.claude/agents/*.md`, `docs/*.md`, `docs/architecture/mvp-architecture.md`, `backend/docker-compose.yml`, `backend/**` (переименование)
- **Критерии приёмки:**
  - [x] `git status` — только переименования project→backend и правки путей; история сохранена
  - [x] Прод жив: API `/auth/login` → 422, веб → 200, bind-mount'ы контейнеров читают файлы через симлинки
  - [x] `docker compose config` в backend/ отдаёт name: project
  - [x] Pest (docker exec), Vitest, Jest запускаются с нового расположения
  - [x] Контейнеры reminders_serve/web (docker run) и app/db/redis (compose) пересозданы на новые пути, симлинки удалены, nginx-proxy перечитал upstream; тома project_* на месте
  - [x] Удалены worktree `agent-a3d65c…`/`agent-af92…` и ветки `worktree-agent-*`; убран obsolete `version:` из docker-compose.yml
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### TEST-19: Дата-«бомба» в TaskStatusSyncTest — LWW проигрывал зашитой константе
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md
- **Описание:** С 2026-09-01 стабильно падал `derives the item status from a pushed is_checked without status`: хелпер `taskStatusPushBody` подставлял `updated_at = '2026-09-01T10:00:00Z'` по умолчанию. Пока дата была в будущем, push побеждал фабричную запись (updated_at = now); после 1 сентября сервер стал новее → LWW отдавал изменение в `conflicts`, статус оставался `new`. Код продукта корректен (подтверждено зондом с датой 2027 года). Фикс: дефолт `?string $updatedAt = null` → `now()->addDay()->toIso8601ZuluString()`. Остальные зашитые даты в Pest/Jest/Vitest проверены — это фиксированные входы чистых функций или пары «сервер/клиент» с обеими константами, от текущего времени не зависят.
- **Файлы:** `backend/tests/Feature/Sync/TaskStatusSyncTest.php`
- **Критерии приёмки:**
  - [x] Pest tests/Feature/Sync — 59 passed
  - [x] Дефолтная дата в хелпере относительная
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### DOC-54: Актуализация multi-agent-roles.md, чекбоксов реестра и версий стека в архитектуре
- **Исполнитель:** technical-writer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** OPS-10
- **Блокирует:** —
- **Стандарты:** docs/07-task-management.md
- **Описание:** `docs/multi-agent-roles.md` описывал чужой проект (Orchid, Admin/Frontend Developer, Database Engineer, префиксы ADM/FE, Vue в `project/resources/js`) — переписан под реальную команду из 12 агентов: структура `Napominalky/`, конвейер, таблица ролей с инструментами/моделями/слоями, матрица стандартов, правила счётчиков, сценарии. Закрыты устаревшие чекбоксы ARCH-1 и DOC-1 (выполнены 2026-06-03) и DEV-22 (прод-миграция применена). В `mvp-architecture.md` §0.6 добавлена пометка о фактических версиях (Expo SDK 54 / RN 0.81 вместо планового SDK 52; каталог `backend/`).
- **Файлы:** `docs/multi-agent-roles.md`, `docs/TASKS.md`, `docs/architecture/mvp-architecture.md`
- **Критерии приёмки:**
  - [x] В реестре нет незакрытых чекбоксов у completed-задач
  - [x] Документ ролей соответствует `.claude/agents/*.md` и CLAUDE.md
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

## Feature: Первое ревью кода (REVIEW-1)

### REVIEW-1: Ревью августовских фич — sync, статусы, комментарии, snooze
- **Исполнитель:** code-reviewer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** DEV-23, MBE-21, MOB-65, WEB-49, DEV-24
- **Стандарты:** docs/01-general.md, docs/02-php.md, docs/03-laravel.md, docs/04-typescript-rn.md, docs/05-typescript-vue.md, docs/07-api.md
- **Описание:** Первое ревью проекта (счётчик REVIEW был 0 при 495 коммитах). Срез `main`, область — код без ревью с наибольшим риском: backend `app/Services/Sync/*`, статусы задач, комментарии-тред, snooze; mobile `services/sync/*`, уведомления; web `reminderGrouping`, `LkReminderFormDialog`, `useReminders`. Итог: 1 Critical (пункт-сирота валит push-батч 500 → устройство блокирует sync навсегда), 4 Warning (строковое LWW-сравнение на клиенте; нет `max:` на `changes`; `LkReminderFormDialog.vue` 637 строк; `useReminders` без TanStack Query), 3 Suggestion. Авторизация/IDOR, инварианты статусов, идемпотентность push, ресурсы — пройдено.
- **Файлы:** `docs/reviews/REVIEW-1.md`
- **Критерии приёмки:**
  - [x] Отчёт сохранён в `docs/reviews/REVIEW-1.md`
  - [x] Critical и исправимые Warning заведены задачами и закрыты (DEV-23, MBE-21, MOB-65); остальное — в бэклог (WEB-49, DEV-24)
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### DEV-23: Пункт-сирота в sync push — no-op вместо 500 (REVIEW-1 Critical)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** REVIEW-1
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md
- **Описание:** `SyncChangeApplier::create()` имел guard для комментария-сироты, но не для пункта: `shopping_list_item` с отсутствующим/чужим/неизвестным `shopping_list_uuid` сохранялся с `shopping_list_id = NULL` → `SQLSTATE[23502]` → откат всей push-транзакции 500 → мобильный клиент бесконечно ретраил весь outbox, а `pullChanges()` не вызывался (устройство теряло и push, и pull). Добавлен симметричный no-op guard (`ShoppingListItem` с `shopping_list_id === null` → `null`). Регрессия: 2 теста в `SyncPushRobustnessTest` (неизвестный родитель — остальной батч применяется; чужой родитель — пункт не создаётся, чужой список не тронут).
- **Файлы:** `backend/app/Services/Sync/SyncChangeApplier.php`, `backend/tests/Feature/Sync/SyncPushRobustnessTest.php`
- **Критерии приёмки:**
  - [x] Push с пунктом-сиротой → 200, пункт пропущен, остальные изменения применены
  - [x] Pest tests/Feature/Sync — 62 passed
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### MBE-21: Лимит размера push-батча — `changes` max:500 (REVIEW-1 Warning)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** REVIEW-1
- **Блокирует:** —
- **Стандарты:** docs/07-api.md
- **Описание:** `PushRequest` не ограничивал размер массива `changes`: произвольно большой батч обрабатывался в одной длинной `DB::transaction()`. Добавлено `max:500` (+ тест: 501 изменение → 422 `changes`). Клиент шлёт весь outbox одним запросом без разбиения — при росте outbox выше 500 понадобится чанкование на стороне МП (учтено в DEV-24).
- **Файлы:** `backend/app/Http/Requests/Sync/PushRequest.php`, `backend/tests/Feature/Sync/PushEndpointTest.php`
- **Критерии приёмки:**
  - [x] 501 изменение → 422 с ошибкой по `changes`
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### MOB-65: LWW в applyChanges — сравнение таймстампов по времени, а не строками (REVIEW-1 Warning)
- **Исполнитель:** mobile-developer
- **Статус:** completed
- **Приоритет:** medium
- **Зависимости:** REVIEW-1
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** `applyRecord` сравнивал `server.updated_at < localUpdatedAt` как строки. Сервер отдаёт микросекунды (`…21.582043Z`), клиент пишет миллисекунды (`…21.582Z`); `'Z'` лексикографически больше цифры, поэтому более новая серверная запись в той же миллисекунде считалась старее и пропускалась. Введён `isOlder()` через `Date.getTime()`; тест на кейс «микросекунды новее в той же миллисекунде».
- **Файлы:** `mobile/src/services/sync/applyChanges.ts`, `mobile/src/services/sync/__tests__/applyChanges.test.ts`
- **Критерии приёмки:**
  - [x] Jest src/services/sync — 95 passed, tsc OK
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### WEB-49: Разбить LkReminderFormDialog.vue (637 строк) — composable пикеров даты/времени + вынос стилей (REVIEW-1 Warning)
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** low
- **Зависимости:** REVIEW-1
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** Компонент кратно превышает лимит 200 строк. Вынести `applyCustomDate`/`applyCustomTime`/`buildRemindAtIso`/`resetForm` в `useReminderDatePicker`, стили пилюль — в общий модуль; заодно тримить `notes` (Suggestion). При следующем рефакторинге ЛК рассмотреть перевод `useReminders` на TanStack Query (стандарт 05).
- **Файлы:** `web/src/components/lk/LkReminderFormDialog.vue`, `web/src/composables/useReminderDatePicker.ts` (новый)
- **Критерии приёмки:**
  - [ ] Компонент ≤ 200 строк script+template, Vitest зелёный без потери кейсов
- **Создана:** 2026-09-29

### DEV-24: Устойчивость push-батча — изоляция ошибки одной записи + чанкование outbox (REVIEW-1)
- **Исполнитель:** backend-developer (+ mobile-developer для чанкования)
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-23, MBE-21, ARCH-4
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md, docs/04-typescript-rn.md
- **Описание:** Точечные guard'ы в `SyncChangeApplier` (null-title, camelCase, orphan-comment, orphan-item) — хрупкая защита от 500 на весь батч. Спроектировать per-change изоляцию в `SyncPushService::push()` (savepoint на изменение, «плохая» запись → в `rejected[]` ответа, остальные применяются) и на МП — удаление/карантин отклонённых записей outbox + чанкование push по 500 (лимит MBE-21) и вызов `pullChanges()` даже при ошибке push. Требует ARCH-согласования контракта ответа `/sync/push`. Defensive-скоуп `user_id` в `parentIsTasks`/`recalculateParent` и `@property` в `SyncChangesResource` — сюда же (Suggestion).
- **Файлы:** `backend/app/Services/Sync/SyncPushService.php`, `backend/app/Http/Resources/Sync/SyncPushResultResource.php`, `mobile/src/services/sync/{pushChanges,syncEngine}.ts`
- **Критерии приёмки:**
  - [ ] Одна некорректная запись не блокирует применение остальных и не блокирует pull устройства
- **Уточнение 2026-09-30:** Чанкование и очистка по ID выделены в MOB-68 и готовы в ветке. Остальная задача остаётся pending: контракт rejected/ack, карантин и безопасный pull требуют ARCH-4.
- **Создана:** 2026-09-29

### MBE-22 / WEB-50: Тред комментариев пропадал после флажка «Выполнено» на пункте задачи (веб ЛК)
- **Исполнители:** mobile-backend-developer (MBE-22), web-developer (WEB-50)
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/03-laravel.md, docs/07-api.md, docs/05-typescript-vue.md
- **Описание:** Жалоба: в форме задачи ЛК ставишь флажок на пункте, снимаешь — тред комментариев пуст («Комментариев пока нет») при живом счётчике 💬 4. Причина: `Items/{Check,Update,Store}Controller` делали только `loadCount('comments')`, ресурс встраивает `comments` лишь при загруженном relation (`whenLoaded`), а `useShoppingListItems.replaceItem` заменял пункт ответом целиком → `comments` становился `undefined`. Фикс с двух сторон: (MBE-22) контроллеры check/update/store грузят тред (`load(['comments' => orderBy created_at, id])`), докблок ресурса уточнён — single-item эндпоинты обязаны отдавать тред; (WEB-50) `replaceItem` сохраняет прежний `comments`, если ответ его не содержит (счётчик — из ответа). Данные не терялись — только отображение до перезагрузки формы. Прод: backend подхватил с диска, веб пересобран и выложен.
- **Файлы:** `backend/app/Http/Controllers/ShoppingLists/Items/{CheckController,UpdateController,StoreController}.php`, `backend/app/Http/Resources/ShoppingListItemResource.php`, `backend/tests/Feature/ShoppingLists/CheckItemTest.php`, `web/src/composables/useShoppingListItems.ts` (+ тест)
- **Критерии приёмки:**
  - [x] Ответы check/update/store содержат `comments` (Pest ShoppingLists — 78 passed)
  - [x] Веб не теряет тред при ответе без `comments` (Vitest 94 passed по затронутым файлам, vue-tsc OK)
  - [x] Прод-сборка web/dist обновлена
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### OPS-11 / WEB-51: Заметки и Календарь не открывались на проде после пересборки веба (устаревшие чанки)
- **Исполнители:** devops-engineer (OPS-11), web-developer (WEB-51)
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** WEB-50
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** Жалоба сразу после выкладки WEB-50: «на проде не открываются Заметки». В access-логе `reminders_web` браузер пользователя запрашивал `NotesListView-CGn2sWJ1.js` и `CalendarView-BtBhdMXN.js` — хэши **старой** сборки (кэшированный index.html + index-*.js от 3 сентября), а nginx через SPA-fallback `try_files … /napominalki/index.html` отдавал на них **200 с index.html (370 байт) вместо 404** — браузер получал HTML под видом модуля, ленивый роут молча не открывался. Разделы, чьи чанки уже были в кэше (Задачи), работали. (OPS-11) `deploy/reminders-web.nginx.conf`: `location /napominalki/assets/` — `try_files $uri =404` + `expires 1y`; `location /napominalki/` — `expires -1` (Cache-Control: no-cache для index.html/SPA-роутов, ревалидация по ETag). Через `expires`, а не `add_header`, чтобы не потерять security-заголовки уровня server (add_header не наследуется при наличии своего в location). (WEB-51) `src/staleChunkReload.ts`: `router.onError` + `vite:preloadError` → при ошибке загрузки чанка перезагрузка страницы не чаще раза в 10 с (sessionStorage) — свежий index.html подтягивается сам, без Ctrl+F5.
- **Файлы:** `deploy/reminders-web.nginx.conf`, `web/src/staleChunkReload.ts` (+ тест), `web/src/main.ts`
- **Критерии приёмки:**
  - [x] Несуществующий чанк → 404; живой чанк → `Cache-Control: max-age=31536000`; index.html → `no-cache`; security-заголовки на месте
  - [x] Vitest 3 passed (staleChunkReload), vue-tsc OK; прод пересобран и выложен
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

## Feature: Заметки ЛК — архив, маркеры, счётчики

### MBE-23: Список заметок — meta.counts «активные/архив» + единая палитра цветов (веб + мобилка)
- **Исполнитель:** mobile-backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** WEB-52, MOB-66
- **Стандарты:** docs/03-laravel.md, docs/07-api.md
- **Описание:** (1) `GET /notes` отдаёт `meta.counts = {active, archived}` — считаются по тому же `search`, но без фильтра архива (`ResourceCollection::additional`, merge в meta пагинатора), чтобы переключатель ЛК показывал количество в обеих вкладках. (2) Диагностика «маркеры не работают»: в проде 11 заметок без цвета, 4 — с hex мобилки (`#ea899a/#ffebb8/#91d177`), 5 — с именами веба; REST-валидация принимала только `teal|coral|amber|purple`, sync — что угодно. Введён `App\Support\NoteColor` (NAMED + HEX = 8 токенов), `Store/UpdateNoteRequest` валидируют по нему. Контракт: клиенты обязаны рендерить все 8 значений.
- **Файлы:** `backend/app/Http/Controllers/Notes/IndexController.php`, `backend/app/Support/NoteColor.php`, `backend/app/Http/Requests/Note/{StoreNoteRequest,UpdateNoteRequest}.php`, `backend/tests/Feature/Notes/{ArchiveTest,UpdateTest}.php`
- **Критерии приёмки:**
  - [x] `meta.counts` в ответе списка при любом фильтре; скоуп по search; чужие не считаются
  - [x] Цвет: 4 имени + 4 hex принимаются, прочее — 422
  - [x] Pest tests/Feature/Notes — 32 passed; проверено на проде зондом
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### WEB-52: Заметки ЛК — архив/возврат из формы и карточки, рабочие цветовые маркеры, счётчики «Активные / Архив»
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-23
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** (1) **Архив**: кнопка в карточке была, но заметка после нажатия оставалась в текущей вкладке (replaceNote) — теперь `useLkNotesList.archive` убирает заметку из вкладки, чей фильтр она перестала удовлетворять, и сдвигает счётчики без refetch; в форме редактирования добавлена кнопка «В архив» / «Вернуть из архива» (`notesApi.toggleArchive` → `notifyNoteSaved` → закрытие). Подсказки `title` на кнопках закрепления/архива карточки. (2) **Маркеры**: `NoteColor` расширен до 8 токенов, `NAMED_NOTE_COLORS` рендерит hex-маркеры мобилки своими цветами (раньше — фолбэк по uuid, выбор на мобилке на вебе не был виден), форма показывает 8 свотчей, hex из мобилки подсвечивается в edit-режиме и сохраняется. (3) **Счётчики**: `LkNotesToolbar` получает `counts` (meta.counts) и рисует бейджи у «Активные»/«Архив»; удаление уменьшает счётчик текущей вкладки.
- **Файлы:** `web/src/types/note.ts`, `web/src/api/notesApi.ts`, `web/src/constants/lkNoteColors.ts`, `web/src/composables/{useNotes,useLkNotesList}.ts`, `web/src/components/lk/notes/{LkNotesToolbar,LkNoteCard}.vue`, `web/src/components/lk/LkNoteFormDialog.vue`, `web/src/pages/lk/notes/NotesListView.vue` (+ тесты всех перечисленных)
- **Критерии приёмки:**
  - [x] Архивация/возврат из карточки и формы; заметка уходит из вкладки, счётчики сдвигаются
  - [x] 8 свотчей; hex-маркер мобилки виден на карточке и в форме
  - [x] Счётчики на переключателе из meta.counts
  - [x] Vitest 655 passed, vue-tsc OK; прод пересобран и выложен
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### MOB-66: Мобилка — принимать и рендерить именованные цвета заметок веба (teal/coral/amber/purple)
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MBE-23
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** `notesRepo.isNoteColor` принимает только 4 hex — цвет, выбранный в веб-ЛК (`teal|coral|amber|purple`), на мобилке становится `null`. Расширить `NoteColor` до 8 токенов (зеркально `backend/app/Support/NoteColor.php` и `web/src/constants/lkNoteColors.ts`), добавить маппинг имён в цвета карточки и 4 свотча в форму заметки. Миграция схемы не нужна (колонка text).
- **Файлы:** `mobile/src/db/repositories/notesRepo.ts`, компоненты формы/карточки заметки, тесты
- **Критерии приёмки:**
  - [ ] Заметка с color='teal' из синка рендерится цветом, свотч подсвечен; Jest зелёный
- **Создана:** 2026-09-29

## Feature: Автоудаление выполненных напоминаний

### DEV-25: PurgeCompletedRemindersAction + команда reminders:purge-completed (ежечасно)
- **Исполнитель:** backend-developer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** OPS-12, WEB-53, MOB-67
- **Стандарты:** docs/03-laravel.md
- **Описание:** Напоминания с `is_completed` и `completed_at` старше 7 дней (`RETENTION_DAYS`) мягко удаляются. Удаление — по одной модели через Eloquent (`chunkById` по 200), а не bulk update: срабатывает `TracksSyncRevision::deleting`, tombstone получает новую ревизию и доезжает до устройств через инкрементальный pull — выполненные исчезают и в МП. Граница строгая: ровно 7 дней — ещё хранится, 7 дней + 1 с — удаляется. Команда `reminders:purge-completed` в `routes/console.php`: `hourly()->withoutOverlapping()`. Первый прогон на проде удалил 13 напоминаний.
- **Файлы:** `backend/app/Actions/Reminder/PurgeCompletedRemindersAction.php`, `backend/app/Console/Commands/PurgeCompletedRemindersCommand.php`, `backend/routes/console.php`, `backend/tests/Feature/Reminders/PurgeCompletedTest.php`
- **Критерии приёмки:**
  - [x] Удаляются только выполненные старше 7 дней (все пользователи); pending и свежие — нет
  - [x] Tombstone виден в `GET /sync/changes?since=` с новой ревизией
  - [x] Команда в расписании ежечасно; Pest tests/Feature/Reminders — 48 passed
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### OPS-12: Планировщик Laravel в проде — cron хоста → schedule:run в reminders_serve
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** DEV-25
- **Блокирует:** —
- **Стандарты:** —
- **Описание:** В проде планировщик не запускался вовсе (нет `schedule:work`/cron; horizon-сервис не поднят). Добавлена строка в user-crontab vselug: `* * * * * docker exec reminders_serve php artisan schedule:run >> backend/storage/logs/schedule.log 2>&1`; справочная копия — `deploy/schedule.cron`. `schedule:list` на проде показывает `reminders:purge-completed` ежечасно.
- **Файлы:** `deploy/schedule.cron`, crontab vselug
- **Критерии приёмки:**
  - [x] `crontab -l` содержит schedule:run; `schedule:list` в контейнере видит команду
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### WEB-53: Подсказка о 7-дневном хранении на вкладке «Выполненные»
- **Исполнитель:** web-developer
- **Статус:** completed
- **Приоритет:** low
- **Зависимости:** DEV-25
- **Блокирует:** —
- **Стандарты:** docs/05-typescript-vue.md
- **Описание:** На `/lk/reminders` при фильтре «Выполненные» показывается плашка «Выполненные напоминания удаляются автоматически через 7 дней после закрытия», чтобы исчезновение не выглядело потерей данных. Тест: подсказка есть только на этой вкладке.
- **Файлы:** `web/src/pages/lk/reminders/RemindersView.vue` (+ тест)
- **Критерии приёмки:**
  - [x] Vitest reminders — 19 passed, vue-tsc OK; прод пересобран
- **Создана:** 2026-09-29
- **Завершена:** 2026-09-29

### MOB-67: Локальное автоудаление выполненных напоминаний старше 7 дней (офлайн/без синка)
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** DEV-25
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Для пользователей с синком серверный tombstone удалит выполненные и в МП. Для гостевого режима / выключенного синка сервер не участвует — нужна такая же локальная очистка (`remindersRepo`, при старте приложения и раз в час): soft delete через baseRepo (outbox-запись `delete`, чтобы при включении синка сервер получил tombstone) + отмена локального уведомления. Тот же порог 7 дней, та же подсказка на экране «Выполненные».
- **Файлы:** `mobile/src/db/repositories/remindersRepo.ts`, `mobile/src/services/…`, тесты
- **Критерии приёмки:**
  - [ ] Выполненные > 7 дней исчезают из списка без сервера; Jest зелёный
- **Создана:** 2026-09-29


## Цикл: Передача управления разработкой (2026-09-30)

### MOB-68: Батчи sync по 500 и сохранение новых правок outbox
- **Исполнитель:** Codex (mobile-developer, самопроверка)
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** MBE-21
- **Блокирует:** —
- **Стандарты:** docs/04-typescript-rn.md
- **Описание:** Исправить 422 при очереди >500 без смены API; очистка должна затрагивать только отправленные ID, сохраняя правки во время запроса и остаток при сбое следующего батча. Часть DEV-24.
- **Файлы:** mobile/src/services/sync/pushChanges.ts, mobile/src/services/sync/__tests__/pushChanges.test.ts
- **Критерии приёмки:**
  - [x] Очереди 500/501/1001 отправляются последовательными батчами ≤500
  - [x] Новая правка того же UUID во время запроса остаётся в outbox
  - [x] При ошибке следующего батча остаётся неотправленная очередь; повтор завершает отправку
  - [x] Конфликты и неподтверждённые записи обрабатываются без потери очереди; typecheck и sync 102 теста проходят
- **Результат:** Реализовано и проверено локально в manage-2026-09-30; выпуск приложения не выполнен.
- **Создана:** 2026-09-30
- **Завершена:** 2026-09-30

### OPS-13: Подготовить корневой CI монорепозитория
- **Исполнитель:** Codex (devops-engineer)
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/DEVELOPMENT.md
- **Описание:** Заменить вложенный test.yml со старым project/ корневым workflow для backend/mobile/web; тестовое окружение воспроизводится без серверного .env.testing. Деплой не входит в эту задачу.
- **Файлы:** .github/workflows/ci.yml, backend/.github/workflows/test.yml (удалён), backend/.github/workflows/deploy.yml (пометка), backend/README.md
- **Критерии приёмки:**
  - [x] Workflow в корне, корректные каталоги, PostgreSQL 17, PHP 8.5, Node 22
  - [x] Включены typecheck, тесты всех слоёв, сборка web; тестовый ключ генерируется отдельно
  - [x] Минимальные permissions, ограничение времени, без команд выкладки
- **Результат:** Корневой CI прошёл на GitHub, run 36691202007 (f933b10): backend/mobile/web. Required checks включены и проверены в OPS-14.
- **Создана:** 2026-09-30
- **Завершена:** 2026-09-30

### OPS-14: Отделить production от рабочих файлов и проверить выпуск
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** OPS-13
- **Блокирует:** —
- **Стандарты:** docs/DEVELOPMENT.md
- **Описание:** reminders_serve читает backend из основной рабочей копии, reminders_web — её web/dist. Подготовить отдельные артефакты релиза, staging, SHA, smoke и rollback; перед переключением действующего сервиса представить конкретный план выпуска.
- **Файлы:** deploy/releases/, .github/workflows/ci.yml, .github/rulesets/main.json, docs/DEVELOPMENT.md
- **Критерии приёмки:**
  - [x] Правка dev-кода и локальная сборка не меняют обслуживаемую версию
  - [x] Версия релиза идентифицируется SHA, smoke и откат проверены
  - [x] Корневой CI реально прошёл на GitHub
  - [x] Обязательность проверок подтверждена через GitHub API: active ruleset 24237275 для main, backend/mobile checks/web checks от GitHub Actions
- **Начата:** 2026-09-30. Production перенесён в Napominalky-runtime; активен r9cb10c6-ops14. Backend артефакта 412/1534; public smoke, перенос данных/cron, автоматический откат и повторное переключение прошли. CI в GitHub зелёный. Required checks включены владельцем и проверены через API; отчёт docs/reviews/ops14-release-2026-09-30.md.
- **Результат:** [Правило main](https://github.com/AlexEdkiy/Napominalky/rules/24237275) активно; protected=true, три required checks с strict policy, PR обязателен, force push и удаление запрещены. CI 36692654027 на 34a16d0 — success.
- **Создана:** 2026-09-30
- **Завершена:** 2026-09-30

### ARCH-4: Устойчивый sync с явным подтверждением каждой мутации
- **Исполнитель:** architect
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** REVIEW-1
- **Блокирует:** DEV-24
- **Стандарты:** docs/07-api.md, docs/architecture/mvp-architecture.md
- **Описание:** Спроектировать совместимый ответ push для applied/conflicts/rejected; исключить ложный applied при orphan no-op; определить сохранение/карантин отклонённых правок и безопасный pull при незавершённом push. Согласовать документ перед изменением API.
- **Файлы:** docs/architecture/sync-resilience.md (новый)
- **Критерии приёмки:**
  - [ ] Описаны идентичность мутации, подтверждение, повтор, совместимость со старыми клиентами
  - [ ] Pull не перезаписывает ожидающие отправки локальные правки
  - [ ] План и приёмочные сценарии готовы к согласованию; решение не обозначено согласованным заранее
- **Создана:** 2026-09-30

### DOC-60: Аудит агентской модели и начало управления разработкой
- **Исполнитель:** Codex (координатор / technical-writer)
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** —
- **Блокирует:** —
- **Стандарты:** docs/07-task-management.md
- **Описание:** Сопоставить роли, пайплайн, задачи, Git и runtime; выделить ближайшую задачу и выполнить проверяемое исправление; сохранить инструкции передачи между сессиями.
- **Файлы:** AGENTS.md, mobile/AGENTS.md, docs/DEVELOPMENT.md, docs/reviews/development-audit-2026-09-30.md, docs/TASKS.md, .gitignore
- **Критерии приёмки:**
  - [x] Зафиксированы цель продукта, фактический режим, риски и приоритеты
  - [x] Создан изолированный worktree; реализована MOB-68
  - [x] Сводка реестра пересчитана по статусам; локальная проверка отделена от релиза
  - [x] Правила для Codex доступны через корневой AGENTS.md
- **Создана:** 2026-09-30
- **Завершена:** 2026-09-30

### DOC-61: Устранить противоречия Claude-ролей и регламентов
- **Исполнитель:** technical-writer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** DOC-60
- **Блокирует:** —
- **Стандарты:** docs/DEVELOPMENT.md
- **Описание:** Свести 07/08 и .claude/agents с актуальными ролями, включить UITEST, убрать Orchid/ADM/FE/DB, устранить требования merge/commit без соответствующих инструментов; сделать единого автора реестра и реальную изоляцию worktree явными.
- **Файлы:** docs/07-task-management.md, docs/08-git-workflow.md, docs/multi-agent-roles.md, .claude/agents/, CLAUDE.md
- **Критерии приёмки:**
  - [ ] Все 12 ролей согласованы, действия обеспечены инструментами, фиктивной автоизоляции нет
  - [ ] Малый багфикс не требует полного конвейера; рискованные изменения сохраняют ревью
- **Создана:** 2026-09-30
