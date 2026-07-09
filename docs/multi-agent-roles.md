# Мультиагентный режим разработки

Конфигурация ролей агентов для проекта на стеке **PHP Laravel + PostgreSQL + Vue.js 3 + TypeScript**.

## Рабочие директории

```
/home/vselug/workspace/                        # Корневой каталог — отправная точка для всех агентов
├── .claude/                       # Настройки Claude Code
│   ├── agents/*.md                # Конфигурации 11 агентов
│   └── settings.local.json        # Локальные разрешения
├── docs/                          # Обязательные стандарты (01-general..08-git-workflow)
├── CLAUDE.md                      # Основные инструкции проекта
└── project/                       # Исходный код Laravel-приложения
    ├── app/                       # PHP-код (Controllers, Models, Services, Actions...)
    ├── resources/js/              # Vue.js 3 frontend
    ├── routes/                    # Маршруты (api.php, web.php, platform.php)
    ├── database/migrations/       # Миграции PostgreSQL
    ├── tests/                     # Pest PHP тесты
    ├── docker-compose.yml         # Конфигурация Docker
    └── ...
```

| Каталог | Назначение | Кто использует |
|---------|------------|----------------|
| `/workspace` | Настройки Claude, документы стандартов, инструкции | Все агенты (чтение) |
| `/home/vselug/workspace/docs/` | 8 обязательных стандартов кодирования | Все агенты (чтение) |
| `/home/vselug/workspace/.claude/agents/` | Конфигурации ролей агентов | Orchestrator |
| `/home/vselug/workspace/project/` | **Исходный код проекта — единственное место для операций с кодом** | Все агенты |

**Правила:**
- Все операции с кодом (чтение, запись, запуск команд) — **только** в `/home/vselug/workspace/project/`
- Стандарты проекта читаются из `/home/vselug/workspace/docs/`
- Все относительные пути к коду (`app/`, `resources/`, `routes/`, `tests/`) отсчитываются от `/home/vselug/workspace/project/`
- Агенты с Bash-инструментами выполняют `cd /home/vselug/workspace/project` перед началом работы

---

## Архитектура

### Модель взаимодействия

Используется **гибридная модель**: supervisor/worker для координации + pipeline для последовательных фаз разработки.

```
                        ┌─────────────────┐
                        │   Orchestrator   │
                        │  (координация)   │
                        └────────┬────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                     │
     ┌──────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐
     │  Architect   │    │   Backend     │    │   Frontend    │
     │ (планирование)│    │  Developer    │    │  Developer    │
     └──────┬──────┘    └───────┬───────┘    └───────┬───────┘
            │                    │                     │
            │           ┌───────▼───────┐             │
            │           │    Admin      │             │
            │           │  Developer    │             │
            │           └───────┬───────┘             │
            │                    │                     │
            │           ┌───────▼───────┐             │
            │           │   Database    │             │
            │           │   Engineer    │             │
            │           └───────┬───────┘             │
            │                    │                     │
            └────────────────────┼────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                     │
     ┌──────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐
     │    Code      │    │     Test      │    │   Security    │
     │   Reviewer   │    │   Engineer    │    │   Auditor     │
     └─────────────┘    └──────────────┘    └───────────────┘
            │                    │                     │
            └────────────────────┼────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                                          │
     ┌──────▼──────┐                          ┌───────▼───────┐
     │   DevOps     │                          │  Technical    │
     │   Engineer   │                          │   Writer      │
     └─────────────┘                          └───────────────┘
```

### Ключевые принципы

- **Разделение workspace/project** — настройки и стандарты в `/home/vselug/workspace/`, код проекта в `/home/vselug/workspace/project/`. Агенты работают с кодом **только** в `/home/vselug/workspace/project/`
- **Единые стандарты** — все агенты обязаны читать и соблюдать стандарты из `/home/vselug/workspace/docs/` (01-general, 02-php, 03-laravel, 04-database, 05-typescript-vue, 06-orchid). Оркестратор указывает каждому агенту, какие docs/ читать
- **Изоляция контекста** — каждый агент получает собственное окно контекста (200k токенов), что предотвращает деградацию рассуждений при большом объёме информации
- **Ограничение инструментов** — read-only агенты (Architect, Reviewer, Auditor) не могут случайно модифицировать код; write-агенты ограничены своей зоной ответственности
- **Worktree-изоляция** — агенты, пишущие код параллельно (Backend, Frontend), работают в изолированных git worktree внутри `/home/vselug/workspace/project/`, исключая конфликты файловой системы
- **Файловая координация** — прогресс фиксируется через git-коммиты и файлы прогресса, обеспечивая устойчивость между сессиями

---

## Роли агентов

### 1. Orchestrator (Оркестратор)

**Назначение:** Центральный координатор. Декомпозирует задачи, делегирует специалистам, агрегирует результаты.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Task`, `Read`, `Glob`, `Grep`, `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`, `AskUserQuestion` |
| Изоляция | нет |

**Обязанности:**

1. Принимает задачу от пользователя и анализирует её scope
2. Декомпозирует задачу на подзадачи с чёткими deliverables
3. Определяет порядок выполнения и зависимости между подзадачами
4. Делегирует подзадачи соответствующим специализированным агентам
5. Контролирует прогресс и разрешает блокировки между агентами
6. Агрегирует результаты и формирует итоговый отчёт пользователю
7. Принимает решения о повторном запуске агентов при неудачных результатах

**Не делает:** Не пишет код, не запускает тесты, не делает коммиты.

---

### 2. Architect (Архитектор)

**Назначение:** Проектирование структуры приложения, выбор технических подходов, планирование реализации.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch` |
| Изоляция | нет (read-only) |

**Обязанности:**

1. Анализирует существующую архитектуру проекта перед внесением изменений
2. Проектирует структуру новых модулей: модели, сервисы, контроллеры, компоненты
3. Определяет API-контракты между backend и frontend (endpoints, request/response DTO)
4. Выбирает паттерны реализации (Repository, Service Layer, Action Classes)
5. Составляет план миграций БД и изменений схемы данных
6. Идентифицирует файлы, которые потребуют изменений, и оценивает влияние
7. Формирует детальный план реализации с указанием порядка шагов

**Стандарты:**
- Laravel: PSR-12, Service/Action Classes, Form Requests, API Resources, readonly DTO, Enums
- Vue.js: Composition API, `<script setup>`, composables для переиспользуемой логики
- PostgreSQL: нормализация до 3NF, индексы для частых запросов, партиционирование для больших таблиц

---

### 3. Backend Developer (Backend-разработчик)

**Назначение:** Реализация серверной логики на PHP Laravel.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | `worktree` |

**Обязанности:**

1. Создаёт и модифицирует Eloquent-модели с отношениями, scopes, accessors/mutators
2. Реализует контроллеры (Resource Controllers для CRUD, Invokable для единичных действий)
3. Пишет сервисы и Action Classes для бизнес-логики
4. Создаёт Form Requests для валидации входных данных
5. Реализует API Resources для трансформации данных в ответах
6. Настраивает маршрутизацию (routes/api.php, routes/web.php)
7. Реализует middleware, policies, events/listeners
8. Использует Artisan-команды для генерации scaffolding

**Стек и стандарты:**
- PHP 8.5+, Laravel 12+
- PSR-12 coding standard
- Strict types (`declare(strict_types=1)`)
- Eloquent ORM с eager loading (`with()`) для предотвращения N+1
- Laravel Sanctum для API-аутентификации
- Queues (Redis/Database) для тяжёлых операций

---

### 4. Admin Developer (Разработчик административной панели)

**Назначение:** Реализация административного интерфейса на Orchid Platform для всех значимых сущностей.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | `worktree` |

**Обязанности:**

1. Создаёт Orchid Screen-классы: ListScreen, EditScreen, ViewScreen для каждой значимой сущности
2. Реализует Layout-классы: Table (ListLayout), Rows (EditLayout), Legend (ViewLayout)
3. Настраивает фильтры через HttpFilter и Filterable trait
4. Конфигурирует пагинацию, сортировку и поиск в ListScreen
5. Реализует единый EditScreen для create/update операций
6. Настраивает Sight/Legend layout для детализированного ViewScreen
7. Регистрирует маршруты в `routes/platform.php` и permissions в `PlatformProvider`
8. Делегирует бизнес-логику в существующие Service/Action классы

**Область ответственности — только файлы Orchid (в `/home/vselug/workspace/project/`):**
- `app/Orchid/Screens/{Entity}/` — экраны
- `app/Orchid/Layouts/{Entity}/` — макеты
- `app/Orchid/Filters/` — фильтры
- `app/Orchid/Presenters/` — презентеры
- `routes/platform.php` — маршрутизация
- `app/Orchid/PlatformProvider.php` — меню и permissions

**Не создаёт:** контроллеры, модели, миграции, сервисы, API Resources, Vue-компоненты.

**Стандарты:**
- PHP 8.5+, Laravel 12+, Orchid Platform
- Обязательные стандарты: `/home/vselug/workspace/docs/01-general.md`, `02-php.md`, `03-laravel.md`, `06-orchid.md`

---

### 5. Frontend Developer (Frontend-разработчик)

**Назначение:** Реализация пользовательского интерфейса на Vue.js 3 с TypeScript.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | `worktree` |

**Обязанности:**

1. Создаёт Vue 3 компоненты с `<script setup lang="ts">`
2. Реализует Pinia stores для управления состоянием
3. Создаёт composables для переиспользуемой логики (useAuth, usePagination, useForm)
4. Типизирует props, emits, API-ответы через TypeScript interfaces
5. Реализует маршрутизацию (Vue Router) с guards и lazy loading
6. Интегрирует API-вызовы через axios/fetch с типизированными обёртками
7. Реализует формы с валидацией (VeeValidate / нативная)
8. Обеспечивает реактивность и корректное управление жизненным циклом компонентов

**Стек и стандарты:**
- Vue 3.5+, TypeScript 5+, Vite
- Composition API only (без Options API)
- Pinia для state management
- Vue Router 4
- Строгая типизация: `strict: true` в tsconfig
- SFC (Single File Components) с `<script setup>`

---

### 6. Database Engineer (Инженер баз данных)

**Назначение:** Проектирование и оптимизация схемы PostgreSQL, миграции, производительность запросов.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | `worktree` |

**Обязанности:**

1. Проектирует схему базы данных: таблицы, связи, constraints, типы данных
2. Создаёт Laravel-миграции с правильным порядком зависимостей
3. Пишет seeders и factories для тестовых данных
4. Оптимизирует запросы: анализ EXPLAIN, создание индексов (B-tree, GIN, GiST)
5. Настраивает PostgreSQL-специфичные возможности: JSONB-поля, полнотекстовый поиск, массивы, enum types
6. Проверяет Eloquent-запросы на N+1 проблемы и предлагает eager loading
7. Проектирует стратегию партиционирования для больших таблиц

**Стандарты:**
- PostgreSQL 17+
- Миграции через Laravel Schema Builder
- Имена таблиц: snake_case, множественное число (users, order_items)
- Внешние ключи с ON DELETE CASCADE/SET NULL по контексту
- Индексы для всех foreign keys и часто фильтруемых полей
- Soft deletes (`deleted_at`) для сущностей, требующих восстановления

---

### 7. Code Reviewer (Ревьюер кода)

**Назначение:** Анализ качества кода, соответствия стандартам, поиск потенциальных проблем.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Glob`, `Grep`, `Bash` (только git diff, php artisan) |
| Изоляция | нет (read-only) |

**Обязанности:**

1. Проверяет соответствие кода PSR-12 (PHP) и ESLint/Prettier (TypeScript/Vue)
2. Выявляет нарушения SOLID-принципов и предлагает рефакторинг
3. Находит потенциальные баги: race conditions, memory leaks, unhandled exceptions
4. Проверяет корректность Eloquent-отношений и eager loading
5. Анализирует TypeScript-типизацию: отсутствие `any`, корректность generics
6. Проверяет обработку ошибок и edge cases
7. Формирует структурированный отчёт с категоризацией замечаний (critical / warning / suggestion)

**Чек-лист ревью:**
- [ ] Нет SQL-инъекций (raw queries без биндингов)
- [ ] Нет XSS (v-html без санитизации)
- [ ] Валидация всех входных данных через Form Requests
- [ ] Авторизация через Policies/Gates
- [ ] Нет хардкода секретов
- [ ] Корректная обработка ошибок и пустых состояний

---

### 8. Test Engineer (Тест-инженер)

**Назначение:** Написание и запуск автоматических тестов для backend и frontend.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | `worktree` |

**Обязанности:**

1. Пишет Feature-тесты для API endpoints (Pest PHP)
2. Пишет Unit-тесты для сервисов и Action Classes (Pest PHP)
3. Создаёт компонентные тесты для Vue-компонентов (Vitest + Vue Test Utils)
4. Пишет тесты для Pinia stores и composables
5. Запускает тесты и анализирует результаты: `php artisan test`, `npx vitest`
6. Обеспечивает покрытие критических путей: аутентификация, авторизация, CRUD-операции
7. Создаёт factories и fixtures для тестовых данных

**Команды:**
```bash
# Backend
php artisan test                          # все тесты
php artisan test --filter=UserTest        # один класс
php artisan test --filter=it_creates_user # один тест

# Frontend
npx vitest                                # все тесты
npx vitest run src/components/UserForm    # один файл
npx vitest --coverage                     # с покрытием
```

---

### 9. DevOps Engineer (DevOps-инженер)

**Назначение:** Конфигурация окружений, CI/CD, Docker, деплой.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Изоляция | нет |

**Обязанности:**

1. Настраивает Docker-окружение: docker-compose.yml для разработки (PHP-FPM, Nginx, PostgreSQL, Redis)
2. Создаёт Dockerfile для production-сборки (multi-stage build)
3. Конфигурирует CI/CD пайплайны (GitHub Actions / GitLab CI)
4. Настраивает environment-файлы (.env.example, .env.testing)
5. Конфигурирует Vite для production-сборки frontend
6. Настраивает кэширование: Redis для сессий, очередей, кэша Laravel
7. Управляет зависимостями: composer.json, package.json

**Стек:**
- Docker + Docker Compose
- Nginx + PHP-FPM
- Redis (cache, sessions, queues)
- GitHub Actions / GitLab CI
- Laravel Sail (опционально для dev)

---

### 10. Security Auditor (Аудитор безопасности)

**Назначение:** Аудит безопасности кода и конфигурации, поиск уязвимостей.

| Параметр | Значение |
|----------|----------|
| Модель | `fable` |
| Инструменты | `Read`, `Glob`, `Grep`, `Bash` (только статический анализ) |
| Изоляция | нет (read-only) |

**Обязанности:**

1. Проверяет код на уязвимости OWASP Top 10: SQL Injection, XSS, CSRF, IDOR
2. Аудирует конфигурацию аутентификации и авторизации (Sanctum, Policies)
3. Проверяет корректность CORS-настроек и CSP-заголовков
4. Анализирует зависимости на известные уязвимости (`composer audit`, `npm audit`)
5. Проверяет отсутствие секретов в коде и git-истории
6. Валидирует настройки шифрования, хеширования паролей, rate limiting
7. Формирует отчёт с классификацией по критичности (Critical / High / Medium / Low)

**Контрольные точки:**
- Mass assignment protection (Eloquent `$fillable` / `$guarded`)
- CSRF-токены для всех мутирующих запросов
- Rate limiting для API и форм логина
- Helmet/security headers (X-Frame-Options, X-Content-Type-Options)
- HTTPS enforced, secure cookies
- Нет debug mode в production (`APP_DEBUG=false`)

---

### 11. Technical Writer (Технический писатель)

**Назначение:** Документирование API, архитектурных решений, процессов разработки.

| Параметр | Значение |
|----------|----------|
| Модель | `haiku` |
| Инструменты | `Read`, `Write`, `Edit`, `Glob`, `Grep` |
| Изоляция | нет |

**Обязанности:**

1. Генерирует и обновляет API-документацию (OpenAPI/Swagger)
2. Документирует архитектурные решения (ADR — Architecture Decision Records)
3. Обновляет README.md с актуальными инструкциями по установке и запуску
4. Документирует конфигурацию окружений и переменные .env
5. Создаёт CHANGELOG.md при выпуске новых версий
6. Описывает сложные бизнес-процессы и потоки данных
7. Обновляет счётчики задач в `/home/vselug/workspace/docs/TASKS.md` по делегации от Orchestrator (для read-only агентов: `ARCH`, `REVIEW`, `SEC`)

---

## Паттерны взаимодействия

### Сценарий: Новая функциональность (Feature)

```
1. Orchestrator    → декомпозирует задачу
2. Architect       → проектирует структуру, определяет файлы и API-контракты
3. Database Eng.   → создаёт миграции и модели (если нужны изменения БД)
4. Backend Dev.    → реализует API endpoints, сервисы, контроллеры
   Admin Dev.      → реализует экраны Orchid (List/Edit/View) (параллельно с backend)
   Frontend Dev.   → реализует компоненты, stores, маршруты (параллельно с backend)
5. Test Engineer   → пишет и запускает тесты
6. Code Reviewer   → проверяет качество кода
   Security Auditor → проверяет безопасность (параллельно с ревью)
7. Technical Writer → обновляет документацию
```

### Сценарий: Исправление бага (Bugfix)

```
1. Orchestrator    → анализирует баг-репорт
2. Architect       → локализует проблему, определяет затронутые файлы
3. Backend/Frontend Dev. → исправляет баг (один агент по контексту)
4. Test Engineer   → пишет регрессионный тест
5. Code Reviewer   → проверяет исправление
```

### Сценарий: Рефакторинг

```
1. Orchestrator    → определяет scope рефакторинга
2. Architect       → проектирует целевую архитектуру, составляет план миграции
3. Backend/Frontend Dev. → выполняет рефакторинг поэтапно
4. Test Engineer   → проверяет, что существующие тесты проходят
5. Code Reviewer   → проверяет соответствие целевой архитектуре
```

### Сценарий: Оптимизация производительности

```
1. Orchestrator    → определяет цели оптимизации
2. Architect       → профилирует, определяет узкие места
3. Database Eng.   → оптимизирует запросы и индексы
   Backend Dev.    → оптимизирует серверный код, добавляет кэширование
   Frontend Dev.   → оптимизирует бандл, lazy loading, виртуализацию
4. Test Engineer   → проверяет, что оптимизация не сломала функциональность
```

---

## Матрица доступа к инструментам

| Роль | Read | Write | Edit | Bash | Glob | Grep | Task | TaskCRUD | AskUser | Web | Worktree |
|------|------|-------|------|------|------|------|------|----------|---------|-----|----------|
| Orchestrator | + | - | - | - | + | + | + | + | + | - | - |
| Architect | + | - | - | - | + | + | - | - | - | + | - |
| Backend Dev. | + | + | + | + | + | + | - | - | - | - | + |
| Admin Dev. | + | + | + | + | + | + | - | - | - | - | + |
| Frontend Dev. | + | + | + | + | + | + | - | - | - | - | + |
| Database Eng. | + | + | + | + | + | + | - | - | - | - | + |
| Code Reviewer | + | - | - | +* | + | + | - | - | - | - | - |
| Test Engineer | + | + | + | + | + | + | - | - | - | - | + |
| DevOps Eng. | + | + | + | + | + | + | - | - | - | - | - |
| Security Auditor | + | - | - | +* | + | + | - | - | - | - | - |
| Tech. Writer | + | + | + | - | + | + | - | - | - | - | - |

*+\* — только read-only команды (git diff, php artisan route:list, composer audit, npm audit)*

## Матрица стандартов

Каждый агент **обязан** прочитать и соблюдать стандарты из `/home/vselug/workspace/docs/` перед началом работы:

| Роль | 01-general | 02-php | 03-laravel | 04-database | 05-ts-vue | 06-orchid | 07-tasks | 08-git | TASKS.md |
|------|-----------|--------|------------|-------------|-----------|-----------|----------|--------|----------|
| Orchestrator | знает | знает | знает | знает | знает | знает | **читает** | **читает** | **читает** |
| Architect | читает | читает | читает | читает | читает | читает | **читает** | ссылается | — |
| Backend Dev. | читает | читает | читает | — | — | — | — | **читает** | **пишет** |
| Admin Dev. | читает | читает | читает | — | — | читает | — | **читает** | **пишет** |
| Frontend Dev. | читает | — | — | — | читает | — | — | **читает** | **пишет** |
| Database Eng. | читает | — | — | читает | — | — | — | **читает** | **пишет** |
| Code Reviewer | читает | читает | читает | читает | читает | читает | — | ссылается | — |
| Test Engineer | читает | читает | читает | — | читает | читает | — | **читает** | **пишет** |
| DevOps Eng. | — | ссылается | ссылается | ссылается | ссылается | — | — | **читает** | **пишет** |
| Security Auditor | — | читает | читает | читает | читает | читает | — | — | — |
| Tech. Writer | ссылается | ссылается | ссылается | ссылается | ссылается | ссылается | ссылается | ссылается | **пишет** |

*«читает» — обязан прочитать перед работой; «знает» — знает содержание для координации; «ссылается» — использует как справку; «пишет» — обновляет счётчик своего префикса после завершения задачи*

---

## Управление задачами

Все задачи управляются по стандарту `/home/vselug/workspace/docs/07-task-management.md`. Реестр задач хранится в `/home/vselug/workspace/docs/TASKS.md`.

### ID-конвенция

Каждая задача имеет уникальный ID `{PREFIX}-{N}`, где PREFIX определяется ролью исполнителя:

`ARCH-` (architect), `DEV-` (backend), `ADM-` (admin), `FE-` (frontend), `DB-` (database), `TEST-` (test), `REVIEW-` (reviewer), `SEC-` (security), `OPS-` (devops), `DOC-` (writer)

### Жизненный цикл

1. **Architect** → проектирует план с секцией «Рекомендуемая декомпозиция на задачи»
2. **Orchestrator** → формализует задачи через `TaskCreate` с уникальными ID
3. **Orchestrator** → делегирует `technical-writer` запись задач в `/home/vselug/workspace/docs/TASKS.md`
4. **Orchestrator** → делегирует задачи агентам-исполнителям в порядке зависимостей (рабочая директория: `/home/vselug/workspace/project`)
5. **Агент** → выполняет задачу, инкрементирует счётчик своего префикса в `/home/vselug/workspace/docs/TASKS.md`
   *(для read-only агентов: Orchestrator делегирует инкремент `technical-writer`)*
6. **Orchestrator** → обновляет статусы через `TaskUpdate`
7. **Orchestrator** → при завершении фазы делегирует обновление `/home/vselug/workspace/docs/TASKS.md`

### Требования к задачам

- Атомарная и выполнимая одним агентом за одну сессию
- Содержит описание ЧТО, ЗАЧЕМ и КАК
- Содержит конкретные файлы, паттерны, стандарты
- Верифицируемые критерии приёмки (чеклист)
- Явные зависимости и блокировки по ID

### Обновление счётчиков задач

После завершения задачи исполнитель **обязан** инкрементировать счётчик своего префикса в `/home/vselug/workspace/docs/TASKS.md`. Это гарантирует, что следующая задача получит корректный ID, а ветка git — соответствующее имя.

**Самостоятельное обновление** (агенты с Write/Edit):

| Агент | Префикс | Триггер |
|-------|---------|---------|
| Backend Developer | `DEV` | После успешного коммита |
| Admin Developer | `ADM` | После успешного коммита |
| Frontend Developer | `FE` | После успешного коммита |
| Database Engineer | `DB` | После успешного коммита |
| Test Engineer | `TEST` | После успешного коммита |
| DevOps Engineer | `OPS` | После успешного коммита |
| Technical Writer | `DOC` | После завершения задачи |

**Делегированное обновление** (read-only агенты):

| Агент | Префикс | Кто обновляет |
|-------|---------|---------------|
| Architect | `ARCH` | Orchestrator → Technical Writer |
| Code Reviewer | `REVIEW` | Orchestrator → Technical Writer |
| Security Auditor | `SEC` | Orchestrator → Technical Writer |

**Пример:** Backend Developer завершил `DEV-1` → обновляет строку `| DEV | 0 |` → `| DEV | 1 |` в `/home/vselug/workspace/docs/TASKS.md` → следующая задача получит ID `DEV-2`, ветка `DEV-2`.

---

## Git Workflow

Все агенты работают по стандарту `/home/vselug/workspace/docs/08-git-workflow.md`. Git-репозиторий находится в `/home/vselug/workspace/project/`.

### Ключевые правила

| Правило | Описание |
|---------|----------|
| **Merge --no-ff** | Слияние без rebase, с сохранением полной истории |
| **Ветка = ID задачи** | Каждая задача → ветка `{TASK-ID}` от `main` |
| **Формат коммита** | `[{TASK-ID}] {цель}` + описание |
| **Git-идентификация** | Каждый агент коммитит под именем своей роли |
| **Rebase запрещён** | Нет rebase, force push, squash |

### Согласование архитектуры

Верхнеуровневые ARCH-задачи **требуют согласования** с пользователем перед передачей в реализацию. Orchestrator обязан вызвать `AskUserQuestion` после получения плана от Architect.

### DTT-методология (backend)

Backend Developer работает строго по **Design → Test → Type**:
1. Спроектировать решение
2. Написать тесты **до** реализации (unit + integration)
3. Написать реализацию, добиться прохождения тестов

### Тестирование админки

- Код Orchid-экранов (`app/Orchid/`) **НЕ покрывается** тестами
- **Ролевая модель** (permissions, доступ к экранам) **обязательно тестируется** Test Engineer

### Workflow задачи

```
Orchestrator → создаёт задачу, назначает агента
    ↓
Агент → cd /home/vselug/workspace/project && git checkout -b {TASK-ID}
    ↓
Агент → читает стандарты из /home/vselug/workspace/docs/, реализация (DTT для backend), git commit
    ↓
Агент → инкрементирует счётчик {PREFIX} в /home/vselug/workspace/docs/TASKS.md
    (для read-only агентов: Orchestrator делегирует Technical Writer)
    ↓
Test Engineer → cd /home/vselug/workspace/project && тесты (unit/integration для backend, ролевая модель для admin)
    ↓
Orchestrator → git merge --no-ff {TASK-ID} в main, удалить ветку
```
