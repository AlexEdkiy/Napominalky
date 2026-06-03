# Реестр задач

> Последнее обновление: 2026-06-03
> Стандарт: `/home/vselug/workspace/docs/07-task-management.md`

## Счётчики

| Префикс | Последний ID | Исполнитель              |
| ------- | :----------: | ------------------------ |
| ARCH    | 1            | architect                 |
| DEV     | 12           | backend-developer         |
| MBE     | 10           | mobile-backend-developer  |
| MOB     | 20           | mobile-developer          |
| WEB     | 9            | web-developer             |
| TEST    | 11           | test-engineer             |
| REVIEW  | 0            | code-reviewer             |
| SEC     | 0            | security-auditor          |
| OPS     | 3            | devops-engineer           |
| DOC     | 1            | technical-writer          |

## Сводка

| Статус | Количество |
|--------|:----------:|
| Completed | 8 |
| In Progress | 0 |
| Pending | 58 |
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`
- **Описание:** Спроектировать полную архитектуру MVP, включая: локальное хранилище (expo-sqlite + Drizzle), sync-стратегию (delta + outbox + LWW + tombstones + server_revision), 10 групп фич (Auth, Notes, ShoppingLists, Reminders, Notifications, LocalFirst, Sync, Calendar, Security, Settings+Admin). Охватить все три слоя: Backend Laravel, Mobile RN+Expo, Web Vue 3.
- **Реализация:** Прочитать требования в CLAUDE.md, проанализировать структуру проекта, определить схему БД, API-контракты, компоненты и хранилища для каждого слоя. Выделить критические решения, требующие согласования. Создать детальный план декомпозиции на задачи для остальных агентов.
- **Файлы:** `/home/vselug/workspace/docs/architecture/mvp-architecture.md`
- **Критерии приёмки:**
  - [ ] Архитектурный документ содержит все 10 групп фич с деталями Backend/MBE/MOB/WEB
  - [ ] Определена полная схема БД (users, devices, notes, shopping_lists, shopping_list_items, reminders, sync_conflicts + sync_revision sequence)
  - [ ] API-контракты описаны для всех 7 групп эндпоинтов
  - [ ] Sync-стратегия полностью задокументирована (идентификаторы, курсор, PULL/PUSH, outbox, LWW, tombstones, конфликты)
  - [ ] Выделены 6 решений для согласования с пользователем
  - [ ] Рекомендуемая декомпозиция на задачи содержит зависимости и критический путь
  - [ ] Документ согласован с пользователем (статус: Согласовано)
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

---

## Feature: Инфраструктура (OPS)

### OPS-1: Инициализировать Laravel 12 backend в project/
- **Исполнитель:** devops-engineer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** DEV-1
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Инициализировать Laravel 12 приложение в `/home/vselug/workspace/project/` с PHP 8.5+, PostgreSQL 17+, Redis 7+, Sanctum для API-аутентификации, Pest для тестов, Docker Compose для локальной разработки. Включить конфиг для HTTPS (FR-41).
- **Реализация:** composer create-project laravel/laravel project "^12.0"; установить Sanctum (php artisan install:api); конфиг PostgreSQL в .env; Docker Compose с PHP/PostgreSQL/Redis/Nginx; миграции и seeds; хук pre-commit; readme с инструкциями.
- **Файлы:** `project/.env.example`, `project/Dockerfile`, `project/docker-compose.yml`, `project/routes/api.php`, `project/.php-cs-fixer.php` (если нужен)
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Инициализировать React Native + Expo SDK 52 приложение в `/home/vselug/workspace/mobile/` с TypeScript strict mode, Expo Router 4, TanStack Query 5, Zustand 5, Drizzle ORM, expo-sqlite, expo-notifications, expo-calendar, expo-local-authentication, expo-secure-store, axios, @react-native-community/netinfo. Включить конфиги для iOS/Android.
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Инициализировать Vue 3.5 веб-приложение в `/home/vselug/workspace/web/` с Vite 6, TypeScript strict mode, Pinia, Vue Router 4, Vitest, axios. Включить конфиг для админка и личный кабинет маршрутов.
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать User и Device модели, миграции, DTO, Actions для базовой аутентификации. Поля User: id, uuid (unique), name (nullable), email (unique), password, sync_enabled (bool, default false), is_admin (bool, default false), soft deletes, timestamps. Поля Device: id, uuid (unique), user_id FK, name, last_synced_revision (bigint, default 0), last_synced_at (nullable), timestamps. Реализовать Actions: RegisterUserAction, IssueTokenAction, DeleteAccountAction.
- **Реализация:** Создать миграции create_users_table, create_devices_table. User модель с HasMany(Device), методами для работы с uuid. Device модель с BelongsTo(User). DTO: RegisterData (readonly props: name, email, password), LoginData (readonly props: email, password). Actions в app/Actions/{User,Device}/*.php. Фабрики: UserFactory, DeviceFactory.
- **Файлы:** `project/database/migrations/*_create_users_table.php`, `project/database/migrations/*_create_devices_table.php`, `project/app/Models/User.php`, `project/app/Models/Device.php`, `project/app/Data/RegisterData.php`, `project/app/Data/LoginData.php`, `project/app/Actions/User/RegisterUserAction.php`, `project/app/Actions/User/IssueTokenAction.php`, `project/app/Actions/User/DeleteAccountAction.php`, `project/database/factories/UserFactory.php`, `project/database/factories/DeviceFactory.php`
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать API контроллеры и endpoints для аутентификации: POST /api/v1/auth/register, POST /api/v1/auth/login, DELETE /api/v1/auth/logout, GET /api/v1/auth/me, DELETE /api/v1/account. Все endpoints возвращают JSON (UserResource + token). Регистрация и логин с throttle. Документировать в OpenAPI.
- **Реализация:** RegisterController(__invoke), LoginController(__invoke), LogoutController(__invoke), MeController(__invoke), Account\DeleteAccountController(__invoke). Form Requests: RegisterRequest (name, email, password, password_confirmation), LoginRequest (email, password, device_name?). UserResource для сериализации. Маршруты в routes/api.php с префиксом /api/v1/auth и /api/v1/account. Middleware: throttle, auth:sanctum.
- **Файлы:** `project/app/Http/Controllers/Auth/RegisterController.php`, `project/app/Http/Controllers/Auth/LoginController.php`, `project/app/Http/Controllers/Auth/LogoutController.php`, `project/app/Http/Controllers/Auth/MeController.php`, `project/app/Http/Controllers/Account/DeleteAccountController.php`, `project/app/Http/Requests/Auth/RegisterRequest.php`, `project/app/Http/Requests/Auth/LoginRequest.php`, `project/app/Http/Resources/UserResource.php`, `project/routes/api.php`
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
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** OPS-2, MBE-1
- **Блокирует:** MOB-2, MOB-3
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать базовую инфраструктуру для мобильного приложения: Zustand authStore (token в expo-secure-store, user, guestMode, syncEnabled), axios HTTP client с interceptors для авторизации, constants для API endpoints и Query ключей.
- **Реализация:** src/stores/authStore.ts (Zustand с persist, secure-store), src/api/client.ts (axios instance с interceptor для Authorization header), src/types/auth.ts (User, AuthResponse), src/types/api.ts (API response format), src/constants/QueryKeys.ts (TanStack Query ключи), src/constants/Config.ts (API_BASE_URL из .env).
- **Файлы:** `mobile/src/stores/authStore.ts`, `mobile/src/api/client.ts`, `mobile/src/types/auth.ts`, `mobile/src/types/api.ts`, `mobile/src/constants/QueryKeys.ts`, `mobile/src/constants/Config.ts`, `mobile/src/api/authApi.ts`
- **Критерии приёмки:**
  - [ ] authStore инстанцируется без ошибок, методы setToken, setUser, logout работают
  - [ ] Token сохраняется в expo-secure-store и восстанавливается при рестарте приложения
  - [ ] axios client добавляет Authorization header со свожим token
  - [ ] client.ts имеет interceptor для ошибки 401 (logout)
  - [ ] QueryKeys экспортирует объекты для auth, notes, lists, reminders, sync, calendar
  - [ ] Config.API_BASE_URL читается из .env (или default для разработки)
  - [ ] authApi.ts экспортирует функции: register, login, logout, getMe
  - [ ] TypeScript strict mode, импорты работают
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-2: Экраны login/register/onboarding + lock-заглушка + useAuth
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать основные экраны аутентификации: login.tsx, register.tsx, onboarding/index.tsx (выбор войти/создать). Заглушка lock.tsx. Хук useAuth для управления состоянием. Навигация через Expo Router.
- **Реализация:** app/(auth)/login.tsx, app/(auth)/register.tsx, app/(onboarding)/index.tsx. Компоненты: TextInput для email/password, Button для submit, ссылка на register/login. useAuth хук экспортирует setToken, setUser, logout, token, user. lock.tsx заглушка с текстом «App locked». Навигация через useRouter() from expo-router.
- **Файлы:** `mobile/src/hooks/useAuth.ts`, `mobile/app/(auth)/login.tsx`, `mobile/app/(auth)/register.tsx`, `mobile/app/(onboarding)/index.tsx`, `mobile/app/lock.tsx`
- **Критерии приёмки:**
  - [ ] Экран login имеет TextInput для email, password, Button «Sign in»
  - [ ] Экран register имеет TextInput для name, email, password, password_confirmation, Button «Create account»
  - [ ] Экран onboarding имеет кнопки «Sign in» и «Create account» с навигацией
  - [ ] lock.tsx отображается с сообщением (заглушка для MOB-18)
  - [ ] useAuth работает, return {setToken, setUser, logout, token, user, isAuth}
  - [ ] Все компоненты используют Expo Router для навигации
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-1: authStore (Pinia), client, router/guards, views (LoginView, RegisterView, AccountView)
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** OPS-3, MBE-1
- **Блокирует:** WEB-3, WEB-4, WEB-5, WEB-6, WEB-8, WEB-9
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать инфраструктуру для веб-приложения: Pinia authStore, axios client с interceptors, Vue Router guards для авторизации, страницы входа, регистрации и управления аккаунтом.
- **Реализация:** src/stores/authStore.ts (Pinia, хранит token в localStorage, user), src/api/client.ts (axios + interceptor для 401), src/api/authApi.ts, src/router/guards.ts (requireAuth, requireGuest), src/pages/auth/LoginView.vue, src/pages/auth/RegisterView.vue, src/pages/lk/AccountView.vue. Router setup в src/router/index.ts с guards.
- **Файлы:** `web/src/stores/authStore.ts`, `web/src/api/client.ts`, `web/src/api/authApi.ts`, `web/src/router/guards.ts`, `web/src/pages/auth/LoginView.vue`, `web/src/pages/auth/RegisterView.vue`, `web/src/pages/lk/AccountView.vue`, `web/src/router/index.ts`
- **Критерии приёмки:**
  - [ ] authStore (Pinia) инстанцируется, методы setToken, setUser, logout работают
  - [ ] Token сохраняется в localStorage и восстанавливается при перезагрузке
  - [ ] axios client добавляет Authorization header
  - [ ] Router guard requireAuth блокирует доступ без токена
  - [ ] LoginView, RegisterView, AccountView рендерятся без ошибок
  - [ ] Переход /login → /lk с авторизацией работает через guard
  - [ ] TypeScript strict mode, composables работают
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-1: Integration auth (register/login/logout/me/delete-account), Policy delete account
- **Исполнитель:** test-engineer
- **Статус:** completed
- **Приоритет:** high
- **Зависимости:** MBE-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Написать integration тесты для всех auth endpoints (регистрация, логин, логаут, получение профиля, удаление аккаунта) через HTTP запросы. Проверить валидацию, авторизацию, каскадное удаление. Тесты Policy для DeleteAccountPolicy.
- **Реализация:** tests/Feature/Auth/{RegisterTest,LoginTest,LogoutTest,MeTest,DeleteAccountTest}.php. Каждый тест проверяет happy path, 422 валидация, 401 без токена, 404 неизвестный endpoint. DeleteAccountTest проверяет каскадное удаление User→Devices.
- **Файлы:** `project/tests/Feature/Auth/RegisterTest.php`, `project/tests/Feature/Auth/LoginTest.php`, `project/tests/Feature/Auth/LogoutTest.php`, `project/tests/Feature/Auth/MeTest.php`, `project/tests/Feature/Auth/DeleteAccountTest.php`
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
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать trait TracksSyncRevision для моделей, которые синхронизируются (notes, lists, items, reminders). Trait автоматически присваивает server_revision из PostgreSQL sequence при сохранении модели. Создать миграцию для sequence `sync_revision_sequence`.
- **Реализация:** app/Models/Concerns/TracksSyncRevision.php с boot методом, который на saving присваивает server_revision из sequence. Миграция create_sync_revision_sequence.php (CREATE SEQUENCE IF NOT EXISTS sync_revision_sequence START 1 INCREMENT 1).
- **Файлы:** `project/app/Models/Concerns/TracksSyncRevision.php`, `project/database/migrations/*_create_sync_revision_sequence.php`
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
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** MOB-1
- **Блокирует:** MOB-5, MOB-7, MOB-9, MOB-13
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать базовую инфраструктуру SQLite для мобильного приложения. Инициализировать expo-sqlite БД, Drizzle ORM конфиг, схемы для служебных таблиц (sync_outbox, sync_meta), базовый репозиторий с CRUD + запись в outbox, DbProvider для передачи db в контекст.
- **Реализация:** src/db/client.ts (openDatabaseAsync + Drizzle client), drizzle.config.ts (SQLite конфиг), src/db/schema/{index.ts, syncOutbox.ts, syncMeta.ts}, src/db/repositories/baseRepo.ts (abstract class с CRUD методами и outbox записью), src/providers/DbProvider.tsx (React context).
- **Файлы:** `mobile/src/db/client.ts`, `mobile/drizzle.config.ts`, `mobile/src/db/schema/index.ts`, `mobile/src/db/schema/syncOutbox.ts`, `mobile/src/db/schema/syncMeta.ts`, `mobile/src/db/repositories/baseRepo.ts`, `mobile/src/providers/DbProvider.tsx`, `mobile/src/db/migrations/` (папка для drizzle миграций)
- **Критерии приёмки:**
  - [ ] openDatabaseAsync() возвращает db объект без ошибок
  - [ ] Drizzle client инстанцируется (import { drizzle } from 'drizzle-orm/expo-sqlite')
  - [ ] sync_outbox и sync_meta таблицы определены в schema
  - [ ] baseRepo.insert(), baseRepo.update(), baseRepo.delete(), baseRepo.findById() работают
  - [ ] insert() автоматически пишет в sync_outbox {entity_type, uuid, operation, payload, updated_at}
  - [ ] DbProvider экспортирует useDb хук
  - [ ] drizzle-kit migrations generate работает (npx drizzle-kit generate)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-4: netStatus (NetInfo) + интеграция baseRepo→outbox
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-3
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать сервис для отслеживания сетевого подключения (онлайн/офлайн) через @react-native-community/netinfo. Интегрировать в baseRepo для условной записи в outbox и попыток синхронизации при возвращении онлайн.
- **Реализация:** src/services/netStatus.ts (useNetStatus хук, возвращает isConnected), интеграция в baseRepo: если офлайн, операция записывается только в outbox, если онлайн, можно пытаться синхронизировать.
- **Файлы:** `mobile/src/services/netStatus.ts`, обновить `mobile/src/db/repositories/baseRepo.ts`
- **Критерии приёмки:**
  - [ ] useNetStatus() возвращает {isConnected: boolean}
  - [ ] NetInfo слушатель добавляет/удаляет listener при mount/unmount
  - [ ] baseRepo.insert() работает офлайн (пишет в outbox)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-2: baseRepo unit (CRUD пишет в outbox), offline CRUD
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-3
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Unit тесты для baseRepo: проверить, что insert/update/delete пишут в sync_outbox, что offline CRUD работает, что миграции Drizzle успешно созданы.
- **Реализация:** tests/baseRepo.test.ts (Jest с mock expo-sqlite), тесты для insert(), update(), delete(), findById(), проверка outbox записей.
- **Файлы:** `mobile/__tests__/baseRepo.test.ts`
- **Критерии приёмки:**
  - [ ] npm test baseRepo.test.ts проходит
  - [ ] insert() пишет в sync_outbox с operation='create'
  - [ ] update() пишет в sync_outbox с operation='update'
  - [ ] delete() пишет в sync_outbox с operation='delete' (tombstone marked_deleted_at)
  - [ ] findById() читает из БД и возвращает данные
  - [ ] Offline CRUD не выбрасывает ошибок
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Заметки

### DEV-3: HasUuid trait + Note модель + миграция + NoteData + NotePolicy + factory
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-4, MBE-2
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать Note модель с HasUuid trait. Миграция: id, uuid, user_id, title (varchar 255), body (text nullable), is_pinned (bool default false), is_archived (bool default false), server_revision, created_at, updated_at, deleted_at. Индексы: user_id, user_id+server_revision, GIN(ts_search), частичный (user_id) WHERE is_pinned AND deleted_at IS NULL. NoteData DTO, NotePolicy, factory.
- **Реализация:** HasUuid trait в Concerns, Note модель с scopes (pinned, archived, active, search). Миграция с индексами. NotePolicy методы: view, create, update, delete, pin, archive (owner проверка). NoteFactory.
- **Файлы:** `project/app/Models/Concerns/HasUuid.php`, `project/app/Models/Note.php`, `project/database/migrations/*_create_notes_table.php`, `project/app/Data/NoteData.php`, `project/app/Policies/NotePolicy.php`, `project/database/factories/NoteFactory.php`
- **Критерии приёмки:**
  - [ ] php artisan migrate:fresh успешна, таблица notes создана
  - [ ] Note::all() работает, uuid unique индекс
  - [ ] HasUuid генерирует uuid при create
  - [ ] Scopes (pinned, archived, active, search) возвращают Query
  - [ ] NotePolicy authorize методы работают
  - [ ] NoteFactory создаёт корректные заметки
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### DEV-4: Note Actions (Create/Update/Delete/TogglePin/ToggleArchive)
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-3
- **Блокирует:** MBE-2
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать Actions для операций с заметками. CreateNoteAction (принимает NoteData, создаёт заметку). UpdateNoteAction (обновляет поля). DeleteNoteAction (soft delete). TogglePinAction, ToggleArchiveAction (переключают флаги).
- **Реализация:** app/Actions/Note/{CreateNoteAction, UpdateNoteAction, DeleteNoteAction, TogglePinAction, ToggleArchiveAction}.php. Каждый Action использует inject для Authorization, вызывает policy authorize перед операцией.
- **Файлы:** `project/app/Actions/Note/CreateNoteAction.php`, `project/app/Actions/Note/UpdateNoteAction.php`, `project/app/Actions/Note/DeleteNoteAction.php`, `project/app/Actions/Note/TogglePinAction.php`, `project/app/Actions/Note/ToggleArchiveAction.php`
- **Критерии приёмки:**
  - [ ] CreateNoteAction(__invoke) создаёт заметку с uuid и server_revision
  - [ ] UpdateNoteAction(__invoke) обновляет поля (title, body, is_pinned, is_archived)
  - [ ] DeleteNoteAction(__invoke) делает soft delete (deleted_at)
  - [ ] TogglePinAction(__invoke) переключает is_pinned
  - [ ] ToggleArchiveAction(__invoke) переключает is_archived
  - [ ] Все Actions проверяют авторизацию через NotePolicy
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-2: Note контроллеры (Index/Store/Show/Update/Destroy/Pin/Archive) + requests + NoteResource + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-4
- **Блокирует:** MOB-5, WEB-3, TEST-3
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для Notes: Index (список + поиск + фильтр), Store (создание), Show, Update, Destroy (soft delete), Pin (POST toggle is_pinned), Archive (POST toggle is_archived). Form Requests для валидации. NoteResource для сериализации. Маршруты в /api/v1/notes.
- **Реализация:** Notes контроллеры в app/Http/Controllers/Notes/, requests в app/Http/Requests/Note/, NoteResource. Маршруты: GET /notes (Index), POST /notes (Store), GET /notes/{uuid} (Show), PUT /notes/{uuid} (Update), DELETE /notes/{uuid} (Destroy), POST /notes/{uuid}/pin (Pin), POST /notes/{uuid}/archive (Archive).
- **Файлы:** `project/app/Http/Controllers/Notes/IndexController.php`, `project/app/Http/Controllers/Notes/StoreController.php`, `project/app/Http/Controllers/Notes/ShowController.php`, `project/app/Http/Controllers/Notes/UpdateController.php`, `project/app/Http/Controllers/Notes/DestroyController.php`, `project/app/Http/Controllers/Notes/PinController.php`, `project/app/Http/Controllers/Notes/ArchiveController.php`, `project/app/Http/Requests/Note/StoreNoteRequest.php`, `project/app/Http/Requests/Note/UpdateNoteRequest.php`, `project/app/Http/Requests/Note/IndexNoteRequest.php`, `project/app/Http/Resources/NoteResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] GET /api/v1/notes возвращает 200 с paginated notes массивом
  - [ ] POST /api/v1/notes с {uuid, title} возвращает 201 с NoteResource
  - [ ] GET /api/v1/notes/{uuid} возвращает 200 с заметкой
  - [ ] PUT /api/v1/notes/{uuid} обновляет и возвращает 200
  - [ ] DELETE /api/v1/notes/{uuid} soft deletes и возвращает 204
  - [ ] POST /api/v1/notes/{uuid}/pin переключает is_pinned
  - [ ] POST /api/v1/notes/{uuid}/archive переключает is_archived
  - [ ] NoteResource не сериализует server_revision, deleted_at для публичного API
  - [ ] Все требуют auth:sanctum
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-5: Drizzle schema notes + notesRepo
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-2
- **Блокирует:** MOB-6
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для notes в SQLite (зеркаль Backend: id, uuid, user_id, title, body, is_pinned, is_archived, server_revision, created_at, updated_at, deleted_at). Создать notesRepo с методами CRUD + search + filter (archived).
- **Реализация:** src/db/schema/notes.ts (table definition с индексами), src/db/repositories/notesRepo.ts (extends baseRepo, методы: createNote, updateNote, deleteNote, getNoteByUuid, listNotes, searchNotes, togglePin, toggleArchive).
- **Файлы:** `mobile/src/db/schema/notes.ts`, `mobile/src/db/repositories/notesRepo.ts`
- **Критерии приёмки:**
  - [ ] Drizzle schema notes с полями совпадает с backend
  - [ ] notesRepo.createNote() пишет в sqlite и outbox
  - [ ] notesRepo.listNotes() возвращает массив
  - [ ] notesRepo.searchNotes(query) ищет по title/body (LIKE)
  - [ ] notesRepo.getNoteByUuid(uuid) возвращает заметку или null
  - [ ] Все операции проверяются через baseRepo
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-6: useNotes + экраны (Главная/new/[uuid]) + NoteCard/NoteForm
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать React хук useNotes для управления состоянием заметок (TanStack Query), компоненты NoteCard и NoteForm. Экраны: (tabs)/index.tsx (список заметок на Главной), notes/new.tsx (новая заметка), notes/[uuid].tsx (редактирование).
- **Реализация:** src/hooks/useNotes.ts (useQuery для listNotes, useMutation для create/update/delete), src/components/notes/{NoteCard.tsx, NoteForm.tsx}, app/(tabs)/index.tsx, app/notes/new.tsx, app/notes/[uuid].tsx. NoteCard показывает title, body snippet, is_pinned indicator. NoteForm имеет TextInput для title, body (autosave через debounce).
- **Файлы:** `mobile/src/hooks/useNotes.ts`, `mobile/src/components/notes/NoteCard.tsx`, `mobile/src/components/notes/NoteForm.tsx`, `mobile/app/(tabs)/index.tsx`, `mobile/app/notes/new.tsx`, `mobile/app/notes/[uuid].tsx`
- **Критерии приёмки:**
  - [ ] useNotes() возвращает {notes, isLoading, createNote, updateNote, deleteNote}
  - [ ] (tabs)/index.tsx показывает FlatList с notes
  - [ ] notes/new.tsx имеет форму для создания
  - [ ] notes/[uuid].tsx загружает и показывает заметку для редактирования
  - [ ] NoteCard показывает title и snippet body
  - [ ] NoteForm имеет autosave (debounce 2s) на изменение
  - [ ] Удаление показывает AlertDialog перед удалением
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-3: notesApi + useNotes + NotesListView/NoteEditView + NoteCard
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-2, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать API функции для заметок, composable useNotes, Vue компоненты и страницы в личном кабинете. API: fetchNotes, createNote, updateNote, deleteNote, togglePin, toggleArchive. Composable: управление состоянием. Страницы: списки заметок, редактирование.
- **Реализация:** src/api/notesApi.ts (fetch функции с axios), src/composables/useNotes.ts (состояние заметок), src/pages/lk/notes/NotesListView.vue (таблица/список), src/pages/lk/notes/NoteEditView.vue (форма редактирования), src/components/notes/NoteCard.vue (компонент карточки).
- **Файлы:** `web/src/api/notesApi.ts`, `web/src/composables/useNotes.ts`, `web/src/pages/lk/notes/NotesListView.vue`, `web/src/pages/lk/notes/NoteEditView.vue`, `web/src/components/notes/NoteCard.vue`, `web/src/types/note.ts`
- **Критерии приёмки:**
  - [ ] notesApi экспортирует fetchNotes, createNote, updateNote, deleteNote
  - [ ] useNotes() возвращает {notes, isLoading, createNote, updateNote, deleteNote}
  - [ ] NotesListView показывает таблицу/список заметок
  - [ ] NoteEditView имеет форму для редактирования с сохранением
  - [ ] NoteCard компонент показывает preview
  - [ ] TypeScript strict mode, компоненты используют script setup lang="ts"
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-3: NotePolicy (owner/foreign 403), Actions unit, API integration (CRUD+pin+archive+search)
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-2
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Написать тесты для NotePolicy (owner может view/edit/delete, другой пользователь получает 403), unit тесты для Actions, integration тесты для всех API endpoints (CRUD, pin, archive, search).
- **Реализация:** tests/Unit/Models/NotePolicyTest.php, tests/Feature/Notes/{CreateTest, UpdateTest, DeleteTest, PinTest, ArchiveTest, SearchTest}.php.
- **Файлы:** `project/tests/Unit/Models/NotePolicyTest.php`, `project/tests/Feature/Notes/CreateTest.php`, `project/tests/Feature/Notes/UpdateTest.php`, `project/tests/Feature/Notes/DeleteTest.php`, `project/tests/Feature/Notes/PinTest.php`, `project/tests/Feature/Notes/ArchiveTest.php`, `project/tests/Feature/Notes/SearchTest.php`
- **Критерии приёмки:**
  - [ ] php artisan test все тесты проходят
  - [ ] NotePolicy: owner 200, другой 403
  - [ ] CreateNoteAction создаёт с uuid и server_revision
  - [ ] SearchTest ищет по title (LIKE)
  - [ ] ArchiveTest: toggle is_archived
  - [ ] PinTest: toggle is_pinned
  - [ ] SoftDelete: deleted_at заполняется
- **Создана:** 2026-06-03
- **Завершена:** —

---

---

## Feature: Списки покупок

### DEV-5: ShoppingCategory enum + ShoppingList/Item модели + миграции + DTO + Policies + factory
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-6, MBE-3
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать enum ShoppingCategory (products/household/pharmacy/other) с методом label(). Модели ShoppingList и ShoppingListItem с relationships. Миграции. ShoppingListData/ShoppingListItemData DTO. Policies. Factories.
- **Реализация:** app/Enums/ShoppingCategory.php, app/Models/{ShoppingList.php, ShoppingListItem.php}, миграции create_shopping_lists_table и create_shopping_list_items_table, app/Data/{ShoppingListData.php, ShoppingListItemData.php}, app/Policies/{ShoppingListPolicy.php, ShoppingListItemPolicy.php}, factories.
- **Файлы:** `project/app/Enums/ShoppingCategory.php`, `project/app/Models/ShoppingList.php`, `project/app/Models/ShoppingListItem.php`, `project/database/migrations/*_create_shopping_lists_table.php`, `project/database/migrations/*_create_shopping_list_items_table.php`, `project/app/Data/ShoppingListData.php`, `project/app/Data/ShoppingListItemData.php`, `project/app/Policies/ShoppingListPolicy.php`, `project/app/Policies/ShoppingListItemPolicy.php`, `project/database/factories/ShoppingListFactory.php`, `project/database/factories/ShoppingListItemFactory.php`
- **Критерии приёмки:**
  - [ ] php artisan migrate:fresh успешна
  - [ ] ShoppingList имеет hasMany(ShoppingListItem), scope active
  - [ ] ShoppingListItem имеет belongsTo(ShoppingList), user_id, category, is_checked, position
  - [ ] ShoppingCategory enum имеет label() метод
  - [ ] Policies проверяют owner
  - [ ] Factories создают корректные данные
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### DEV-6: List Actions + Item Actions (Add/Update/Delete/Check)
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-5
- **Блокирует:** MBE-3
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать Actions для операций со списками и товарами. CreateListAction, UpdateListAction, DeleteListAction. AddItemAction, UpdateItemAction, DeleteItemAction, CheckItemAction (toggle is_checked).
- **Реализация:** app/Actions/ShoppingList/{CreateListAction, UpdateListAction, DeleteListAction}.php, app/Actions/ShoppingListItem/{AddItemAction, UpdateItemAction, DeleteItemAction, CheckItemAction}.php. Каждый Action использует inject для Authorization.
- **Файлы:** `project/app/Actions/ShoppingList/CreateListAction.php`, `project/app/Actions/ShoppingList/UpdateListAction.php`, `project/app/Actions/ShoppingList/DeleteListAction.php`, `project/app/Actions/ShoppingListItem/AddItemAction.php`, `project/app/Actions/ShoppingListItem/UpdateItemAction.php`, `project/app/Actions/ShoppingListItem/DeleteItemAction.php`, `project/app/Actions/ShoppingListItem/CheckItemAction.php`
- **Критерии приёмки:**
  - [ ] CreateListAction создаёт список с uuid, server_revision
  - [ ] AddItemAction добавляет товар с category, is_checked=false, position
  - [ ] CheckItemAction переключает is_checked
  - [ ] DeleteListAction каскадно удаляет товары
  - [ ] Все Actions проверяют авторизацию
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-3: ShoppingLists контроллеры (Index/Store/Show/Update/Destroy)
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-6
- **Блокирует:** MBE-4, MOB-7, WEB-4, TEST-4
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для ShoppingLists CRUD. Routes: GET /api/v1/shopping-lists, POST, GET /{uuid}, PUT /{uuid}, DELETE /{uuid}. ShoppingListResource с вложенными items и прогрессом (checked/total).
- **Реализация:** app/Http/Controllers/ShoppingLists/{IndexController, StoreController, ShowController, UpdateController, DestroyController}.php, app/Http/Requests/ShoppingList/{StoreShoppingListRequest, UpdateShoppingListRequest}.php, app/Http/Resources/ShoppingListResource.php, routes.
- **Файлы:** `project/app/Http/Controllers/ShoppingLists/IndexController.php`, `project/app/Http/Controllers/ShoppingLists/StoreController.php`, `project/app/Http/Controllers/ShoppingLists/ShowController.php`, `project/app/Http/Controllers/ShoppingLists/UpdateController.php`, `project/app/Http/Controllers/ShoppingLists/DestroyController.php`, `project/app/Http/Requests/ShoppingList/StoreShoppingListRequest.php`, `project/app/Http/Requests/ShoppingList/UpdateShoppingListRequest.php`, `project/app/Http/Resources/ShoppingListResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] GET /api/v1/shopping-lists возвращает 200 с paginated lists
  - [ ] POST /api/v1/shopping-lists создаёт список, возвращает 201
  - [ ] PUT /api/v1/shopping-lists/{uuid} обновляет, возвращает 200
  - [ ] DELETE /api/v1/shopping-lists/{uuid} soft deletes, возвращает 204
  - [ ] ShoppingListResource включает items и progress (checked_count/items_count)
  - [ ] Все требуют auth:sanctum
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-4: ShoppingListItems контроллеры (Index/Store/Update/Destroy/Check) + resources + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-3
- **Блокирует:** MOB-7, WEB-4
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать контроллеры для управления товарами в списках. Routes: GET/POST /api/v1/shopping-lists/{uuid}/items, PUT/DELETE /api/v1/shopping-lists/{uuid}/items/{itemUuid}, POST /api/v1/shopping-lists/{uuid}/items/{itemUuid}/check {is_checked}. ShoppingListItemResource.
- **Реализация:** app/Http/Controllers/ShoppingListItems/{IndexController, StoreController, UpdateController, DestroyController, CheckController}.php, requests, app/Http/Resources/ShoppingListItemResource.php, routes.
- **Файлы:** `project/app/Http/Controllers/ShoppingListItems/IndexController.php`, `project/app/Http/Controllers/ShoppingListItems/StoreController.php`, `project/app/Http/Controllers/ShoppingListItems/UpdateController.php`, `project/app/Http/Controllers/ShoppingListItems/DestroyController.php`, `project/app/Http/Controllers/ShoppingListItems/CheckController.php`, `project/app/Http/Requests/ShoppingListItem/StoreShoppingListItemRequest.php`, `project/app/Http/Requests/ShoppingListItem/UpdateShoppingListItemRequest.php`, `project/app/Http/Resources/ShoppingListItemResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] GET /api/v1/shopping-lists/{uuid}/items возвращает 200 с items массивом
  - [ ] POST создаёт товар с category, is_checked, position
  - [ ] PUT обновляет, DELETE удаляет
  - [ ] POST /check переключает is_checked
  - [ ] ShoppingListItemResource сериализует name, category, is_checked, position, uuid
  - [ ] Все требуют auth:sanctum
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-7: Drizzle schema lists+items + shoppingListsRepo
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-4
- **Блокирует:** MOB-8
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для shopping_lists и shopping_list_items в SQLite. Создать shoppingListsRepo с CRUD + check методами.
- **Реализация:** src/db/schema/{shoppingLists.ts, shoppingListItems.ts}, src/db/repositories/shoppingListsRepo.ts с методами: createList, updateList, deleteList, getListByUuid, listAllLists, addItem, updateItem, deleteItem, checkItem.
- **Файлы:** `mobile/src/db/schema/shoppingLists.ts`, `mobile/src/db/schema/shoppingListItems.ts`, `mobile/src/db/repositories/shoppingListsRepo.ts`
- **Критерии приёмки:**
  - [ ] Drizzle schema совпадает с backend
  - [ ] shoppingListsRepo методы работают, пишут в outbox
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-8: useShoppingLists/useShoppingListItems + экраны + компоненты
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-7
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать hooks useShoppingLists/useShoppingListItems, компоненты ListCard/ItemRow/ProgressBar/QuickAddItem, экраны (tabs)/lists.tsx, lists/new.tsx, lists/[uuid].tsx.
- **Реализация:** src/hooks/{useShoppingLists.ts, useShoppingListItems.ts}, src/components/lists/{ListCard.tsx, ItemRow.tsx, ProgressBar.tsx, QuickAddItem.tsx}, экраны app/(tabs)/lists.tsx, app/lists/new.tsx, app/lists/[uuid].tsx.
- **Файлы:** `mobile/src/hooks/useShoppingLists.ts`, `mobile/src/hooks/useShoppingListItems.ts`, `mobile/src/components/lists/ListCard.tsx`, `mobile/src/components/lists/ItemRow.tsx`, `mobile/src/components/lists/ProgressBar.tsx`, `mobile/src/components/lists/QuickAddItem.tsx`, `mobile/app/(tabs)/lists.tsx`, `mobile/app/lists/new.tsx`, `mobile/app/lists/[uuid].tsx`
- **Критерии приёмки:**
  - [ ] useShoppingLists() работает с TanStack Query
  - [ ] ProgressBar показывает checked/total
  - [ ] ItemRow может переключать is_checked (быстрое действие)
  - [ ] QuickAddItem для быстрого добавления товара
  - [ ] Экраны рендерятся без ошибок
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-4: shoppingListsApi + useShoppingLists + ListsView/ListDetailView
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-4, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать API функции, composable и Vue компоненты для управления списками покупок в личном кабинете.
- **Реализация:** src/api/shoppingListsApi.ts, src/composables/useShoppingLists.ts, src/pages/lk/lists/{ListsView.vue, ListDetailView.vue}, src/components/lists/{ListCard.vue, ItemRow.vue, ProgressBar.vue}.
- **Файлы:** `web/src/api/shoppingListsApi.ts`, `web/src/composables/useShoppingLists.ts`, `web/src/pages/lk/lists/ListsView.vue`, `web/src/pages/lk/lists/ListDetailView.vue`, `web/src/components/lists/ListCard.vue`, `web/src/components/lists/ItemRow.vue`, `web/src/components/lists/ProgressBar.vue`
- **Критерии приёмки:**
  - [ ] ListsView показывает таблицу списков
  - [ ] ListDetailView показывает товары и позволяет их редактировать
  - [ ] ProgressBar показывает прогресс (checked/total)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-4: Policies, Actions unit, API integration
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-4
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Unit и integration тесты для ShoppingLists и Items.
- **Реализация:** tests/Feature/ShoppingLists/{CreateTest, UpdateTest, DeleteTest}.php, tests/Feature/ShoppingListItems/{CreateTest, UpdateTest, DeleteTest, CheckTest}.php.
- **Файлы:** `project/tests/Feature/ShoppingLists/CreateTest.php`, `project/tests/Feature/ShoppingLists/UpdateTest.php`, `project/tests/Feature/ShoppingLists/DeleteTest.php`, `project/tests/Feature/ShoppingListItems/CreateTest.php`, `project/tests/Feature/ShoppingListItems/UpdateTest.php`, `project/tests/Feature/ShoppingListItems/DeleteTest.php`, `project/tests/Feature/ShoppingListItems/CheckTest.php`
- **Критерии приёмки:**
  - [ ] php artisan test все проходят
  - [ ] Policies: owner 200, другой 403
  - [ ] CheckTest: toggle is_checked
  - [ ] Каскадное удаление
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Напоминания

### DEV-7: RecurrenceType+SnoozeOption enums + Reminder модель + миграция + ReminderData + Policy + factory
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-1, DEV-2
- **Блокирует:** DEV-8, MBE-5
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать enums RecurrenceType (none/daily/weekly/monthly) с методом nextOccurrence(), SnoozeOption (10m/1h/...) с методом toInterval(). Модель Reminder. Миграция. ReminderData DTO. ReminderPolicy. Factory.
- **Реализация:** app/Enums/{RecurrenceType.php, SnoozeOption.php}, app/Models/Reminder.php, миграция create_reminders_table (title, notes, remind_at, recurrence, is_completed, completed_at, snoozed_until, source_uuid, source_type + sync-контракт), app/Data/ReminderData.php, app/Policies/ReminderPolicy.php, factory.
- **Файлы:** `project/app/Enums/RecurrenceType.php`, `project/app/Enums/SnoozeOption.php`, `project/app/Models/Reminder.php`, `project/database/migrations/*_create_reminders_table.php`, `project/app/Data/ReminderData.php`, `project/app/Policies/ReminderPolicy.php`, `project/database/factories/ReminderFactory.php`
- **Критерии приёмки:**
  - [ ] php artisan migrate:fresh успешна
  - [ ] RecurrenceType::daily()->nextOccurrence($remind_at) возвращает DateTime
  - [ ] SnoozeOption::TEN_MINUTES()->toInterval() возвращает Interval
  - [ ] Reminder модель с scopes (pending, completed, dueBetween)
  - [ ] Индексы на user_id+server_revision, user_id+remind_at
  - [ ] ReminderPolicy проверяет owner
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### DEV-8: Reminder Actions (Create/Update/Delete/Complete/Snooze)
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-7
- **Блокирует:** MBE-5
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать Actions для напоминаний. CreateReminderAction, UpdateReminderAction, DeleteReminderAction, CompleteReminderAction (устанавливает is_completed и completed_at), SnoozeReminderAction (устанавливает snoozed_until).
- **Реализация:** app/Actions/Reminder/{CreateReminderAction, UpdateReminderAction, DeleteReminderAction, CompleteReminderAction, SnoozeReminderAction}.php.
- **Файлы:** `project/app/Actions/Reminder/CreateReminderAction.php`, `project/app/Actions/Reminder/UpdateReminderAction.php`, `project/app/Actions/Reminder/DeleteReminderAction.php`, `project/app/Actions/Reminder/CompleteReminderAction.php`, `project/app/Actions/Reminder/SnoozeReminderAction.php`
- **Критерии приёмки:**
  - [ ] CompleteReminderAction устанавливает is_completed=true, completed_at=now
  - [ ] SnoozeReminderAction устанавливает snoozed_until на +10m или +1h
  - [ ] Все Actions проверяют авторизацию
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-5: Reminder контроллеры (Index/Store/Show/Update/Destroy/Complete/Snooze) + requests + resources + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-8
- **Блокирует:** MOB-9, WEB-5, TEST-5
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать REST API контроллеры для Reminders CRUD + Complete/Snooze. Routes: GET /api/v1/reminders (с фильтрацией status и сортировкой), POST, GET /{uuid}, PUT /{uuid}, DELETE /{uuid}, POST /{uuid}/complete, POST /{uuid}/snooze.
- **Реализация:** app/Http/Controllers/Reminders/{IndexController, StoreController, ShowController, UpdateController, DestroyController, CompleteController, SnoozeController}.php, requests, app/Http/Resources/ReminderResource.php, routes.
- **Файлы:** `project/app/Http/Controllers/Reminders/IndexController.php`, `project/app/Http/Controllers/Reminders/StoreController.php`, `project/app/Http/Controllers/Reminders/ShowController.php`, `project/app/Http/Controllers/Reminders/UpdateController.php`, `project/app/Http/Controllers/Reminders/DestroyController.php`, `project/app/Http/Controllers/Reminders/CompleteController.php`, `project/app/Http/Controllers/Reminders/SnoozeController.php`, `project/app/Http/Requests/Reminder/StoreReminderRequest.php`, `project/app/Http/Requests/Reminder/UpdateReminderRequest.php`, `project/app/Http/Requests/Reminder/IndexReminderRequest.php`, `project/app/Http/Requests/Reminder/SnoozeReminderRequest.php`, `project/app/Http/Resources/ReminderResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] GET /api/v1/reminders?filter[status]=pending возвращает 200 с pending напоминаниями
  - [ ] POST /api/v1/reminders создаёт с uuid, remind_at, recurrence
  - [ ] POST /{uuid}/complete устанавливает is_completed, completed_at
  - [ ] POST /{uuid}/snooze устанавливает snoozed_until
  - [ ] ReminderResource не сериализует server_revision, deleted_at
  - [ ] Все требуют auth:sanctum
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-9: Drizzle schema reminders + remindersRepo + quickTime/recurrence utils
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-3, MBE-5
- **Блокирует:** MOB-10, MOB-11, MOB-16
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать Drizzle schema для reminders в SQLite (+notification_id локальный). Создать remindersRepo с CRUD + complete/snooze. Создать utils quickTime (быстрые шаблоны времени) и recurrence (вычисление следующего напоминания).
- **Реализация:** src/db/schema/reminders.ts, src/db/repositories/remindersRepo.ts, src/utils/{quickTime.ts, recurrence.ts}.
- **Файлы:** `mobile/src/db/schema/reminders.ts`, `mobile/src/db/repositories/remindersRepo.ts`, `mobile/src/utils/quickTime.ts`, `mobile/src/utils/recurrence.ts`
- **Критерии приёмки:**
  - [ ] Drizzle schema совпадает с backend
  - [ ] remindersRepo методы работают
  - [ ] quickTime экспортирует: now (сейчас), in10m, in1h, tomorrow, nextWeek, nextMonth
  - [ ] recurrence calculates next occurrence based on type
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-10: useReminders + экраны + компоненты
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-9
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать useReminders хук, компоненты ReminderForm/QuickTimePresets/RecurrencePicker/SnoozeSheet, экраны reminders/new.tsx, reminders/[uuid].tsx.
- **Реализация:** src/hooks/useReminders.ts, src/components/reminders/{ReminderForm.tsx, QuickTimePresets.tsx, RecurrencePicker.tsx, SnoozeSheet.tsx}, app/reminders/{new.tsx, [uuid].tsx}.
- **Файлы:** `mobile/src/hooks/useReminders.ts`, `mobile/src/components/reminders/ReminderForm.tsx`, `mobile/src/components/reminders/QuickTimePresets.tsx`, `mobile/src/components/reminders/RecurrencePicker.tsx`, `mobile/src/components/reminders/SnoozeSheet.tsx`, `mobile/app/reminders/new.tsx`, `mobile/app/reminders/[uuid].tsx`
- **Критерии приёмки:**
  - [ ] QuickTimePresets показывает кнопки (Now, +10m, +1h, Tomorrow, ...)
  - [ ] RecurrencePicker выбирает none/daily/weekly/monthly
  - [ ] SnoozeSheet всплывает после создания/редактирования
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-5: remindersApi + composable + RemindersView/ReminderEditView
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-5, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать API функции, composable и Vue компоненты для напоминаний в ЛК.
- **Реализация:** src/api/remindersApi.ts, src/composables/useReminders.ts, src/pages/lk/reminders/{RemindersView.vue, ReminderEditView.vue}, src/components/reminders/ReminderCard.vue.
- **Файлы:** `web/src/api/remindersApi.ts`, `web/src/composables/useReminders.ts`, `web/src/pages/lk/reminders/RemindersView.vue`, `web/src/pages/lk/reminders/ReminderEditView.vue`, `web/src/components/reminders/ReminderCard.vue`
- **Критерии приёмки:**
  - [ ] RemindersView показывает таблицу напоминаний, отсортированную по remind_at
  - [ ] ReminderEditView позволяет редактировать и выполнять напоминание
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-5: enums unit (nextOccurrence/snooze), ReminderPolicy, Actions unit, API integration
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Unit тесты для RecurrenceType::nextOccurrence(), SnoozeOption::toInterval(). Integration тесты для Reminder API.
- **Реализация:** tests/Unit/Enums/{RecurrenceTypeTest.php, SnoozeOptionTest.php}, tests/Feature/Reminders/{CreateTest, CompleteTest, SnoozeTest}.php.
- **Файлы:** `project/tests/Unit/Enums/RecurrenceTypeTest.php`, `project/tests/Unit/Enums/SnoozeOptionTest.php`, `project/tests/Feature/Reminders/CreateTest.php`, `project/tests/Feature/Reminders/CompleteTest.php`, `project/tests/Feature/Reminders/SnoozeTest.php`
- **Критерии приёмки:**
  - [ ] php artisan test все проходят
  - [ ] RecurrenceType::daily()->nextOccurrence() возвращает следующий день в то же время
  - [ ] SnoozeOption::TEN_MINUTES()->toInterval() возвращает +10 минут
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Уведомления (Mobile-only)

### MOB-11: notifications.ts (schedule/cancel) + интеграция в remindersRepo
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-9
- **Блокирует:** MOB-12
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать сервис уведомлений через expo-notifications. Функции scheduleReminder (создать локальное уведомление на remind_at) и cancelReminder (отменить). Интегрировать в remindersRepo при create/update/delete. Сохранять notification_id в базе.
- **Реализация:** src/services/notifications.ts с функциями scheduleReminder(reminder) и cancelReminder(notificationId). Вызывать из remindersRepo.createReminder() и remindersRepo.deleteReminder().
- **Файлы:** `mobile/src/services/notifications.ts`, обновить `mobile/src/db/repositories/remindersRepo.ts`
- **Критерии приёмки:**
  - [ ] scheduleReminder() успешно планирует уведомление (можно проверить через Expo Go)
  - [ ] notification_id сохраняется в БД
  - [ ] cancelReminder() отменяет уведомление
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-12: useNotifications (permissions) + deepLinks + подписка в _layout + обработка пропущенных
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-11
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать useNotifications хук для запроса разрешений на уведомления. Добавить deep link handler в app/_layout.tsx: при нажатии на уведомление перейти на reminders/[uuid]. Реализовать логику пропущенных напоминаний при старте (remind_at < now && !is_completed → секция на Главной).
- **Реализация:** src/hooks/useNotifications.ts, src/services/deepLinks.ts (парсинг уведомлений), обновить app/_layout.tsx (подписка на notification response).
- **Файлы:** `mobile/src/hooks/useNotifications.ts`, `mobile/src/services/deepLinks.ts`, обновить `mobile/app/_layout.tsx`
- **Критерии приёмки:**
  - [ ] useNotifications() запрашивает разрешения, возвращает {permissionStatus}
  - [ ] Клик на уведомление → reminders/[uuid]
  - [ ] Пропущенные напоминания отображаются на Главной
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-6: Jest unit schedule/cancel (mock expo-notifications), deep link parsing
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MOB-11
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Unit тесты для notifications.ts и deepLinks.ts с mock expo-notifications.
- **Реализация:** tests/services/notifications.test.ts, tests/services/deepLinks.test.ts.
- **Файлы:** `mobile/__tests__/services/notifications.test.ts`, `mobile/__tests__/services/deepLinks.test.ts`
- **Критерии приёмки:**
  - [ ] npm test services/notifications.test.ts проходит
  - [ ] scheduleReminder мокируется без ошибок
  - [ ] deepLink парсинг корректно извлекает uuid
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Синхронизация (Критический путь)

### DEV-9: SyncConflict модель + миграция + Sync DTO (SyncChangeData, SyncPushResultData, ConflictData)
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** DEV-3, DEV-5, DEV-7, DEV-2
- **Блокирует:** DEV-10, DEV-11
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/04-database.md`
- **Описание:** Создать SyncConflict модель для хранения конфликтов. Миграция: id, uuid (unique), user_id FK, entity_type, entity_uuid, server_payload jsonb, client_payload jsonb (бэкап спорной записи), resolved_at (nullable), created_at. Создать DTO для sync операций: SyncChangeData (entity_type, uuid, operation, payload, updated_at), SyncPushResultData (applied[], conflicts[], cursor), ConflictData.
- **Реализация:** app/Models/SyncConflict.php, миграция, app/Data/{SyncChangeData.php, SyncPushResultData.php, ConflictData.php}.
- **Файлы:** `project/app/Models/SyncConflict.php`, `project/database/migrations/*_create_sync_conflicts_table.php`, `project/app/Data/SyncChangeData.php`, `project/app/Data/SyncPushResultData.php`, `project/app/Data/ConflictData.php`
- **Критерии приёмки:**
  - [ ] php artisan migrate:fresh успешна
  - [ ] SyncConflict::all() работает
  - [ ] uuid UNIQUE индекс
  - [ ] DTO инстанцируются без ошибок
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### DEV-10: SyncPullService + entity-to-Model map
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** DEV-9
- **Блокирует:** MBE-6
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать SyncPullService, который собирает все изменения для пользователя со server_revision > since. Возвращает данные, сгруппированные по entity_type (notes[], shopping_lists[], shopping_list_items[], reminders[]), включая tombstones (deleted_at IS NOT NULL). Реализовать entity-to-Model mapping.
- **Реализация:** app/Services/Sync/SyncPullService.php с методом pull($user, $since): {notes, lists, listItems, reminders, cursor, hasMore}. Использовать лимит 200 записей на запрос.
- **Файлы:** `project/app/Services/Sync/SyncPullService.php`
- **Критерии приёмки:**
  - [ ] SyncPullService::pull() возвращает корректную структуру
  - [ ] Tombstones включены (deleted_at IS NOT NULL)
  - [ ] Пагинация работает (has_more, cursor)
  - [ ] Entity-to-Model map полный (4 типа)
  - [ ] declare(strict_types=1)
- **Создана:** 2026-06-03
- **Завершена:** —

### DEV-11: SyncPushService + ConflictResolver (LWW+бэкап) + RegisterDeviceAction
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** DEV-9
- **Блокирует:** MBE-7
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать SyncPushService для обработки батча изменений от клиента. Логика: upsert по uuid, Last-Write-Wins по updated_at. При конфликте (серверная updated_at новее): сохранить в sync_conflicts, вернуть в conflicts[]. Создать ConflictResolver для реализации LWW. Создать RegisterDeviceAction для логирования последней синхронизации.
- **Реализация:** app/Services/Sync/SyncPushService.php, app/Services/Sync/ConflictResolver.php, app/Actions/Device/RegisterDeviceAction.php.
- **Файлы:** `project/app/Services/Sync/SyncPushService.php`, `project/app/Services/Sync/ConflictResolver.php`, `project/app/Actions/Device/RegisterDeviceAction.php`
- **Критерии приёмки:**
  - [ ] SyncPushService::push($user, $changes) возвращает {applied, conflicts, cursor}
  - [ ] LWW логика: если client_updated_at >= server_updated_at → apply, иначе → conflict
  - [ ] Конфликты сохраняются в sync_conflicts с server_payload и client_payload
  - [ ] RegisterDeviceAction обновляет last_synced_revision, last_synced_at
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-6: ChangesController + ChangesRequest + SyncChangesResource + route
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** DEV-10
- **Блокирует:** MOB-13, WEB-6, TEST-7
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать endpoint GET /api/v1/sync/changes?since={revision}. Контроллер вызывает SyncPullService, возвращает SyncChangesResource с изменениями.
- **Реализация:** app/Http/Controllers/Sync/ChangesController.php (__invoke), app/Http/Requests/Sync/ChangesRequest.php, app/Http/Resources/Sync/SyncChangesResource.php, routes.
- **Файлы:** `project/app/Http/Controllers/Sync/ChangesController.php`, `project/app/Http/Requests/Sync/ChangesRequest.php`, `project/app/Http/Resources/Sync/SyncChangesResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] GET /api/v1/sync/changes?since=0 возвращает 200 с {data:{notes[],lists[],items[],reminders[]},meta:{cursor,has_more}}
  - [ ] Требует auth:sanctum
  - [ ] Tombstones включены
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-7: PushController + PushRequest + результат-resource + ConflictsController + Device контроллеры + routes
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** DEV-11
- **Блокирует:** MOB-13, WEB-6, TEST-7
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать endpoint POST /api/v1/sync/push для отправки изменений, GET /api/v1/sync/conflicts для просмотра конфликтов. Device контроллеры: PUT /api/v1/devices/{uuid}, DELETE /api/v1/devices/{uuid}.
- **Реализация:** app/Http/Controllers/Sync/{PushController.php, ConflictsController.php}, app/Http/Controllers/Devices/{UpdateController.php, DestroyController.php}, requests, resources, routes.
- **Файлы:** `project/app/Http/Controllers/Sync/PushController.php`, `project/app/Http/Controllers/Sync/ConflictsController.php`, `project/app/Http/Controllers/Devices/UpdateController.php`, `project/app/Http/Controllers/Devices/DestroyController.php`, `project/app/Http/Requests/Sync/PushRequest.php`, `project/app/Http/Resources/Sync/SyncPushResultResource.php`, `project/app/Http/Resources/Sync/ConflictResource.php`, `project/app/Http/Resources/DeviceResource.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] POST /api/v1/sync/push возвращает 200 с {data:{applied[],conflicts[],cursor}}
  - [ ] GET /api/v1/sync/conflicts возвращает 200 с массивом конфликтов
  - [ ] PUT /api/v1/devices/{uuid} обновляет name и last_synced_revision
  - [ ] DELETE /api/v1/devices/{uuid} удаляет device (каскад или мягкое удаление)
  - [ ] Все требуют auth:sanctum
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-13: syncApi + types + applyChanges (LWW в SQLite)
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** MOB-3, MBE-6, MBE-7
- **Блокирует:** MOB-14
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать sync API функции (pullChanges, pushChanges), типы для sync операций, функцию applyChanges для применения изменений в SQLite с LWW по updated_at.
- **Реализация:** src/api/syncApi.ts (functions: getChanges, pushChanges), src/types/sync.ts (SyncChange, SyncPushResult, Conflict), src/services/sync/applyChanges.ts (LWW логика для upsert/tombstone).
- **Файлы:** `mobile/src/api/syncApi.ts`, `mobile/src/types/sync.ts`, `mobile/src/services/sync/applyChanges.ts`
- **Критерии приёмки:**
  - [ ] getChanges(since) возвращает structure {notes, lists, items, reminders, cursor, has_more}
  - [ ] pushChanges(changes) возвращает {applied, conflicts, cursor}
  - [ ] applyChanges(changes) применяет LWW к SQLite (новые или одновозрастные записи перезаписываются)
  - [ ] Tombstones (deleted_at) корректно обрабатываются (soft delete в SQLite)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-14: pushChanges + pullChanges + backoff
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** MOB-13
- **Блокирует:** MOB-15
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Реализовать функции pushChanges (отправить outbox) и pullChanges (получить изменения). Добавить exponential backoff при ошибках сети (FR-36): 1s, 2s, 4s, 8s, макс 5 попыток.
- **Реализация:** src/services/sync/{pushChanges.ts, pullChanges.ts, backoff.ts}. pushChanges читает sync_outbox, отправляет на сервер, очищает применённые. pullChanges вызывает applyChanges. Backoff реализован как retry-декоратор.
- **Файлы:** `mobile/src/services/sync/pushChanges.ts`, `mobile/src/services/sync/pullChanges.ts`, `mobile/src/services/sync/backoff.ts`
- **Критерии приёмки:**
  - [ ] pushChanges() читает outbox, отправляет, очищает применённые записи
  - [ ] pullChanges() применяет LWW, обновляет last_pulled_revision
  - [ ] Backoff: exponential delay (1s, 2s, 4s, 8s), макс 5 попыток
  - [ ] При успехе: очистить outbox, обновить cursor в sync_meta
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-15: syncEngine + useSyncEngine + триггеры (онлайн/ручной/full pull при логине)
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** critical
- **Зависимости:** MOB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать главный syncEngine, который управляет синхронизацией: push → pull → apply. Хук useSyncEngine для подписки на события. Триггеры: автоматич при онлайн (используя useNetStatus), ручной trigger (кнопка Sync), full pull при логине (last_pulled_revision=0).
- **Реализация:** src/services/sync/syncEngine.ts, src/hooks/useSyncEngine.ts. syncEngine.sync() выполняет: if (sync_enabled && isOnline) { pushChanges → pullChanges → apply }. useSyncEngine подписывает на onChange событие. App.tsx/layout вызывает sync при старте с lastPulledRevision=0.
- **Файлы:** `mobile/src/services/sync/syncEngine.ts`, `mobile/src/hooks/useSyncEngine.ts`, обновить `mobile/app/_layout.tsx` или основной App компонент
- **Критерии приёмки:**
  - [ ] syncEngine.sync() выполняет push → pull → apply последовательно
  - [ ] useSyncEngine() возвращает {sync, isSyncing, lastError, lastSyncedAt}
  - [ ] При логине: full pull (since=0)
  - [ ] При возвращении онлайн: автоматич sync (с backoff)
  - [ ] Кнопка Sync вручную может запустить syncEngine.sync()
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-6: syncApi + useSync + SyncView (статус, устройства, конфликты)
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-6, MBE-7, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать API функции для sync (pullChanges, getConflicts), composable useSync, страницу SyncView в ЛК, которая показывает статус синхронизации, список устройств и конфликты.
- **Реализация:** src/api/syncApi.ts, src/composables/useSync.ts, src/pages/lk/sync/SyncView.vue. SyncView показывает таблицу конфликтов с сервером payload, client payload, кнопка resolve.
- **Файлы:** `web/src/api/syncApi.ts`, `web/src/composables/useSync.ts`, `web/src/pages/lk/sync/SyncView.vue`
- **Критерии приёмки:**
  - [ ] SyncView загружает и показывает конфликты
  - [ ] Показывает список устройств с last_synced_at
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-7: SyncPushService LWW (старее→конфликт/новее→применяется), идемпотентность, tombstone в pull, ConflictResolver unit
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-6, MBE-7
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Unit и integration тесты для SyncPushService и ConflictResolver. Проверить LWW логику, идемпотентность (двойной push одинаковых данных), tombstones в PULL.
- **Реализация:** tests/Unit/Services/Sync/{ConflictResolverTest.php, SyncPushServiceTest.php}, tests/Feature/Sync/{PushTest.php, PullTest.php}.
- **Файлы:** `project/tests/Unit/Services/Sync/ConflictResolverTest.php`, `project/tests/Unit/Services/Sync/SyncPushServiceTest.php`, `project/tests/Feature/Sync/PushTest.php`, `project/tests/Feature/Sync/PullTest.php`
- **Критерии приёмки:**
  - [ ] php artisan test все проходят
  - [ ] LWW: if client_updated_at >= server_updated_at → apply, else → conflict
  - [ ] Двойной push с одинаковыми данными идемпотентен
  - [ ] PULL включает tombstones (deleted_at IS NOT NULL)
  - [ ] ConflictResolver сохраняет обе версии в sync_conflicts
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-8: applyChanges LWW unit, pushChanges очистка outbox, backoff
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-14
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для applyChanges, pushChanges, backoff с mock sqlite.
- **Реализация:** tests/services/sync/{applyChanges.test.ts, pushChanges.test.ts, backoff.test.ts}.
- **Файлы:** `mobile/__tests__/services/sync/applyChanges.test.ts`, `mobile/__tests__/services/sync/pushChanges.test.ts`, `mobile/__tests__/services/sync/backoff.test.ts`
- **Критерии приёмки:**
  - [ ] npm test services/sync/*.test.ts все проходят
  - [ ] applyChanges LWW корректно (новое перезаписывает старое)
  - [ ] pushChanges очищает outbox после успешной отправки
  - [ ] backoff exponential: 1s, 2s, 4s, 8s
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Календарь

### MOB-16: useCalendar (выборка SQLite по диапазону) + MonthGrid/DayCell/DayRemindersSheet + calendar.tsx
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MOB-9
- **Блокирует:** MOB-17
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать useCalendar хук для выборки напоминаний по месяцу из SQLite. Компоненты MonthGrid (месячный календарь), DayCell (ячейка дня), DayRemindersSheet (всплывающая панель с напоминаниями дня). Экран (tabs)/calendar.tsx.
- **Реализация:** src/hooks/useCalendar.ts (getDaysInMonth, getRemindersByMonth), src/components/calendar/{MonthGrid.tsx, DayCell.tsx, DayRemindersSheet.tsx}, app/(tabs)/calendar.tsx. Используется utils/dateRange для выборки дат.
- **Файлы:** `mobile/src/hooks/useCalendar.ts`, `mobile/src/components/calendar/MonthGrid.tsx`, `mobile/src/components/calendar/DayCell.tsx`, `mobile/src/components/calendar/DayRemindersSheet.tsx`, `mobile/app/(tabs)/calendar.tsx`
- **Критерии приёмки:**
  - [ ] MonthGrid показывает 6 недель (календарь на месяц)
  - [ ] DayCell подсвечивает дни с напоминаниями
  - [ ] DayRemindersSheet всплывает при клике на день
  - [ ] useCalendar возвращает reminders filtered по месяцу
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-17: systemCalendar (expo-calendar экспорт) + кнопка в ReminderForm
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MOB-16
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать сервис systemCalendar для экспорта напоминания в системный календарь (iOS Calendar, Android Calendar) через expo-calendar. Добавить кнопку в ReminderForm для экспорта.
- **Реализация:** src/services/systemCalendar.ts (requestCalendarPermissions, createEvent из reminder), обновить src/components/reminders/ReminderForm.tsx с кнопкой Export.
- **Файлы:** `mobile/src/services/systemCalendar.ts`, обновить `mobile/src/components/reminders/ReminderForm.tsx`
- **Критерии приёмки:**
  - [ ] systemCalendar.createEvent(reminder) экспортирует событие в системный календарь
  - [ ] Запрашиваются права на доступ к календарю
  - [ ] Кнопка Export видна в ReminderForm
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-7: useCalendar + CalendarView + MonthGrid
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** WEB-5
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать composable useCalendar (read-only выборка из API), компоненты MonthGrid, страницу CalendarView в ЛК.
- **Реализация:** src/composables/useCalendar.ts, src/components/calendar/MonthGrid.vue, src/pages/lk/calendar/CalendarView.vue.
- **Файлы:** `web/src/composables/useCalendar.ts`, `web/src/components/calendar/MonthGrid.vue`, `web/src/pages/lk/calendar/CalendarView.vue`
- **Критерии приёмки:**
  - [ ] CalendarView показывает месячный вид с напоминаниями
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-9: dateRange utils unit, useCalendar выборка (mock sqlite)
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MOB-16
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для dateRange utils и useCalendar выборки.
- **Реализация:** tests/utils/dateRange.test.ts, tests/hooks/useCalendar.test.ts.
- **Файлы:** `mobile/__tests__/utils/dateRange.test.ts`, `mobile/__tests__/hooks/useCalendar.test.ts`
- **Критерии приёмки:**
  - [ ] npm test utils/dateRange.test.ts проходит
  - [ ] getDaysInMonth возвращает правильное количество дней
  - [ ] useCalendar выборка корректна
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Безопасность

### MOB-18: lockStore + appLock (secure-store PIN + biometric) + useAppLock
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-1
- **Блокирует:** MOB-19
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать Zustand lockStore (pinSet, isLocked, biometricEnabled). Сервис appLock с методами: setPin (хеш в expo-secure-store), verifyPin, enableBiometric, disableBiometric. Хук useAppLock.
- **Реализация:** src/stores/lockStore.ts (Zustand + persist), src/services/appLock.ts (crypto для PIN-хеша, expo-local-authentication для биометрии), src/hooks/useAppLock.ts.
- **Файлы:** `mobile/src/stores/lockStore.ts`, `mobile/src/services/appLock.ts`, `mobile/src/hooks/useAppLock.ts`
- **Критерии приёмки:**
  - [ ] setPin(pin) хеширует и сохраняет в secure-store
  - [ ] verifyPin(pin) проверяет хеш
  - [ ] enableBiometric() запрашивает разрешение на биометрию
  - [ ] useAppLock() работает
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-19: lock.tsx + LockProvider (AppState gate) + settings/security.tsx
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Реализовать lock.tsx с PIN-вводом и биометрией. Создать LockProvider, который подписывается на AppState (при переходе в фон → lock, при возврате → проверить PIN). Страница settings/security.tsx для установки PIN и включения биометрии.
- **Реализация:** app/lock.tsx (экран введения PIN с кнопками 0-9), src/providers/LockProvider.tsx (AppState listener), app/settings/security.tsx (toggle для PIN и биометрии). _layout.tsx оборачивает приложение в LockProvider.
- **Файлы:** `mobile/app/lock.tsx`, `mobile/src/providers/LockProvider.tsx`, `mobile/app/settings/security.tsx`, обновить `mobile/app/_layout.tsx`
- **Критерии приёмки:**
  - [ ] lock.tsx показывает PIN-pad, проверяет PIN через useAppLock
  - [ ] LockProvider подписывается на AppState (background→locked)
  - [ ] security.tsx имеет toggles для PIN и биометрии
  - [ ] После рестарта приложения требуется PIN (если установлен)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-10: appLock unit (verify PIN, mock secure-store/local-auth)
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** medium
- **Зависимости:** MOB-18
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Jest unit тесты для appLock с mock expo-secure-store и expo-local-authentication.
- **Реализация:** tests/services/appLock.test.ts.
- **Файлы:** `mobile/__tests__/services/appLock.test.ts`
- **Критерии приёмки:**
  - [ ] npm test services/appLock.test.ts проходит
  - [ ] setPin/verifyPin работают с мокированным secure-store
  - [ ] Биометрия мокируется корректно
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Настройки + Админка

### DEV-12: ToggleSyncAction + AdminPolicy + Admin UsersIndex/UserShow контроллеры
- **Исполнитель:** backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-1
- **Блокирует:** MBE-8
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Создать ToggleSyncAction для переключения sync_enabled в профиле. AdminPolicy для проверки is_admin. Контроллеры Admin\UsersIndexController и Admin\UserShowController (read-only).
- **Реализация:** app/Actions/User/ToggleSyncAction.php, app/Policies/AdminPolicy.php, app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}.
- **Файлы:** `project/app/Actions/User/ToggleSyncAction.php`, `project/app/Policies/AdminPolicy.php`, `project/app/Http/Controllers/Admin/UsersIndexController.php`, `project/app/Http/Controllers/Admin/UserShowController.php`
- **Критерии приёмки:**
  - [ ] ToggleSyncAction переключает users.sync_enabled
  - [ ] AdminPolicy::viewAny() проверяет is_admin
  - [ ] UsersIndexController возвращает список пользователей (только админам)
  - [ ] UserShowController возвращает пользователя (только админам)
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MBE-8: ToggleSyncController + request + Admin Users контроллеры + routes (admin middleware)
- **Исполнитель:** mobile-backend-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** DEV-12
- **Блокирует:** MOB-20, WEB-8, WEB-9, TEST-11
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`, `/home/vselug/workspace/docs/07-api.md`
- **Описание:** Создать endpoints PATCH /api/v1/settings/sync {sync_enabled}, GET /api/v1/admin/users (пагинированный список), GET /api/v1/admin/users/{id}. Admin routes с middleware проверкой is_admin.
- **Реализация:** app/Http/Controllers/Settings/ToggleSyncController.php, app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}, requests, routes.
- **Файлы:** `project/app/Http/Controllers/Settings/ToggleSyncController.php`, обновить `project/app/Http/Controllers/Admin/{UsersIndexController.php, UserShowController.php}`, `project/app/Http/Requests/Settings/ToggleSyncRequest.php`, обновить `project/routes/api.php`
- **Критерии приёмки:**
  - [ ] PATCH /api/v1/settings/sync {sync_enabled: true} обновляет users.sync_enabled
  - [ ] GET /api/v1/admin/users требует is_admin, возвращает список (paginated)
  - [ ] GET /api/v1/admin/users/{id} требует is_admin, возвращает пользователя
  - [ ] Нон-админы получают 403
  - [ ] declare(strict_types=1) во всех файлах
- **Создана:** 2026-06-03
- **Завершена:** —

### MOB-20: settingsStore + useSettings + ThemeProvider (light/dark/system) + profile/settings экраны + SettingRow
- **Исполнитель:** mobile-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MOB-1, MBE-8
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/04-typescript-rn.md`
- **Описание:** Создать Zustand settingsStore (notifications_enabled, sync_enabled, theme). Хук useSettings. ThemeProvider для light/dark/system темы. Экраны (tabs)/profile.tsx и app/settings/index.tsx. Компонент SettingRow.
- **Реализация:** src/stores/settingsStore.ts (Zustand + AsyncStorage persist), src/hooks/useSettings.ts, src/providers/ThemeProvider.tsx (ColorScheme context), app/(tabs)/profile.tsx, app/settings/index.tsx, src/components/settings/SettingRow.tsx.
- **Файлы:** `mobile/src/stores/settingsStore.ts`, `mobile/src/hooks/useSettings.ts`, `mobile/src/providers/ThemeProvider.tsx`, `mobile/app/(tabs)/profile.tsx`, `mobile/app/settings/index.tsx`, `mobile/src/components/settings/SettingRow.tsx`
- **Критерии приёмки:**
  - [ ] settingsStore инстанцируется, методы работают (toggleNotifications, toggleSync, setTheme)
  - [ ] Настройки сохраняются в AsyncStorage
  - [ ] ThemeProvider применяет тему при старте (system default)
  - [ ] profile.tsx показывает профиль пользователя (логаут)
  - [ ] settings.tsx показывает SettingRow для notifications, sync, theme
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-8: settingsStore (Pinia) + useTheme + SettingsView (ЛК)
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-8, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать Pinia settingsStore, composable useTheme, страницу SettingsView в ЛК для настроек (notifications, sync, theme).
- **Реализация:** src/stores/settingsStore.ts (Pinia), src/composables/useTheme.ts, src/pages/lk/SettingsView.vue.
- **Файлы:** `web/src/stores/settingsStore.ts`, `web/src/composables/useTheme.ts`, `web/src/pages/lk/SettingsView.vue`
- **Критерии приёмки:**
  - [ ] SettingsView показывает toggles для notifications, sync, theme
  - [ ] Сохранение синхронизируется с сервером (PATCH /api/v1/settings/sync)
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### WEB-9: Админка — UsersListView/UserDetailView/DashboardView + router guard roles:['admin']
- **Исполнитель:** web-developer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-8, WEB-1
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/05-typescript-vue.md`
- **Описание:** Создать админку на Vue: DashboardView (статистика), UsersListView (таблица пользователей), UserDetailView (детали пользователя). Router guard для проверки is_admin.
- **Реализация:** src/pages/admin/{DashboardView.vue, UsersListView.vue, UserDetailView.vue}, src/router/guards.ts (добавить requireAdmin guard).
- **Файлы:** `web/src/pages/admin/DashboardView.vue`, `web/src/pages/admin/UsersListView.vue`, `web/src/pages/admin/UserDetailView.vue`, обновить `web/src/router/guards.ts` и `web/src/router/index.ts`
- **Критерии приёмки:**
  - [ ] /admin требует is_admin (guard)
  - [ ] DashboardView показывает статистику (количество пользователей, напоминаний)
  - [ ] UsersListView показывает таблицу пользователей (GET /api/v1/admin/users)
  - [ ] UserDetailView показывает детали и позволяет редактировать
  - [ ] TypeScript strict mode
- **Создана:** 2026-06-03
- **Завершена:** —

### TEST-11: ToggleSyncAction unit, AdminPolicy (admin 200/non-admin 403), settings store unit
- **Исполнитель:** test-engineer
- **Статус:** pending
- **Приоритет:** high
- **Зависимости:** MBE-8
- **Блокирует:** —
- **Стандарты:** `/home/vselug/workspace/docs/01-general.md`, `/home/vselug/workspace/docs/02-php.md`, `/home/vselug/workspace/docs/03-laravel.md`
- **Описание:** Unit тесты для ToggleSyncAction, AdminPolicy, integration тесты для endpoints.
- **Реализация:** tests/Unit/Models/AdminPolicyTest.php, tests/Feature/Settings/ToggleSyncTest.php, tests/Feature/Admin/{UsersIndexTest.php, UserShowTest.php}.
- **Файлы:** `project/tests/Unit/Models/AdminPolicyTest.php`, `project/tests/Feature/Settings/ToggleSyncTest.php`, `project/tests/Feature/Admin/UsersIndexTest.php`, `project/tests/Feature/Admin/UserShowTest.php`
- **Критерии приёмки:**
  - [ ] php artisan test все проходят
  - [ ] AdminPolicy: is_admin=true 200, false 403
  - [ ] ToggleSyncTest: PATCH /api/v1/settings/sync обновляет users.sync_enabled
  - [ ] Admin endpoints требуют is_admin
- **Создана:** 2026-06-03
- **Завершена:** —

---

## Feature: Документация (DOC)

### DOC-1: Сохранить архитектурный документ и наполнить реестр задач
- **Исполнитель:** technical-writer
- **Статус:** completed
- **Приоритет:** critical
- **Зависимости:** ARCH-1
- **Блокирует:** нет (параллельно с остальными)
- **Стандарты:** `/home/vselug/workspace/docs/07-task-management.md`
- **Описание:** Зафиксировать архитектурный план ARCH-1 в `/home/vselug/workspace/docs/architecture/mvp-architecture.md`. Заполнить реестр задач `/home/vselug/workspace/docs/TASKS.md`: обновить счётчики, добавить все 66 задач с описаниями, критериями приёмки и зависимостями.
- **Реализация:** Создать архитектурный документ со статусом «Согласовано» (6 согласованных решений). Сгруппировать задачи по фичам в TASKS.md. Счётчики: ARCH=1, OPS=3, DEV=12, MBE=10, MOB=20, WEB=9, TEST=11, REVIEW=0, SEC=0, DOC=1. Сводка: Completed=1, Pending=65.
- **Файлы:** `/home/vselug/workspace/docs/architecture/mvp-architecture.md`, `/home/vselug/workspace/docs/TASKS.md`
- **Критерии приёмки:**
  - [ ] Архитектурный документ содержит все 10 групп фич и 3 слоя
  - [ ] TASKS.md содержит все 66 задач (1 completed + 65 pending)
  - [ ] Счётчики обновлены правильно
  - [ ] Зависимости корректны (нет циклов)
  - [ ] Каждая задача имеет описание, реализацию, критерии приёмки, файлы
  - [ ] Критический путь выявлен: MOB-3 → все mobile-репозитории, DEV-2+DEV-9 → sync
  - [ ] Архитектурный документ разместить в /docs/architecture/
- **Создана:** 2026-06-03
- **Завершена:** 2026-06-03

