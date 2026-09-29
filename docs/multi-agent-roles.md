# Мультиагентный режим разработки

Роли агентов проекта «Напоминалки» — local-first приложение (заметки, задачи/списки покупок, напоминания, календарь) на стеке **Laravel 12 + PostgreSQL 17** (backend), **React Native + Expo** (mobile), **Vue 3 + TypeScript** (web). Конфигурации агентов — `/home/vselug/workspace/Napominalky/.claude/agents/*.md`; этот документ — обзор, источник истины по каждой роли — её файл.

> Актуализировано 2026-09-29 (DOC-54). Прежняя редакция описывала другой проект (Orchid, Admin/Frontend Developer, Database Engineer) и однорепозиторную структуру.

---

## Рабочие директории

```text
/home/vselug/workspace/Napominalky/     # Корень проекта — отсюда запускается Claude Code
├── CLAUDE.md                # Инструкции проекта (читают все агенты)
├── .claude/agents/          # Конфигурации 12 агентов
├── docs/                    # Стандарты 01–08, архитектура, реестр задач TASKS.md
│   ├── architecture/        # mvp-architecture.md (ARCH-1, согласовано)
│   └── reviews/             # Отчёты REVIEW-N / SEC-N
├── backend/                 # Laravel 12: app/, database/, routes/, tests/ (Pest), docker-compose.yml
├── mobile/                  # Expo Router + TanStack Query + Zustand + Drizzle/expo-sqlite, Jest+RNTL
├── web/                     # Vue 3.5 + Vite 6 + Pinia + Vue Router, Vitest
└── deploy/                  # nginx-конфиги прод-контейнеров (jemsoft.ru/napominalki)
```

| Агент | Пишет в | Читает |
|-------|---------|--------|
| backend-developer, mobile-backend-developer | `backend/` | `docs/` |
| mobile-developer | `mobile/` | `docs/`, `backend/app/Http/Resources` (контракт) |
| web-developer | `web/` | `docs/`, `backend/app/Http/Resources` (контракт) |
| test-engineer, ux-ui-test-engineer | тесты в `backend/tests`, `mobile/`, `web/` | всё |
| devops-engineer | `backend/docker*`, `mobile/eas.json`, `deploy/`, CI | всё |
| technical-writer | `docs/`, README, CHANGELOG | всё |
| architect, code-reviewer, security-auditor | **ничего** (read-only) | всё |

**Правила:**
- Код правится только внутри своего слоя; стандарты читаются из `docs/`.
- Агенты с Bash выполняют `cd` в свой слой перед работой. Backend-команды (`php artisan …`, Pest) идут через Docker: `docker exec reminders_app php artisan test --compact` (локального PHP нет).
- Реестр `docs/TASKS.md` — вне слоёв, доступен по абсолютному пути всем.

---

## Модель взаимодействия

Гибрид supervisor/worker (Orchestrator ↔ агенты) и pipeline по фазам:

```text
ARCH → DEV → MBE → (MOB ‖ WEB) → TEST → UITEST* → (REVIEW ‖ SEC) → DOC
```

\* UITEST — только для задач с дизайн-макетом.

```text
                     ┌──────────────┐
                     │ Orchestrator │  декомпозиция, делегирование, блокировки
                     └──────┬───────┘
      ┌──────────┬──────────┼──────────┬──────────┐
  ┌───▼───┐ ┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌───▼───┐
  │ ARCH  │ │ DEV/MBE │ │MOB/WEB│ │TEST/UIT │ │ OPS   │
  └───────┘ └─────────┘ └───────┘ └─────────┘ └───────┘
                 read-only контроль: REVIEW ‖ SEC   →   DOC (реестр, счётчики)
```

**Ключевые принципы**
- Архитектура согласуется с пользователем до реализации (ARCH → «Согласовано»).
- Контракт API (`docs/07-api.md`, API Resources backend) — источник истины для типов mobile/web; JSON — snake_case без трансформаций.
- Каждая задача выполнима одним агентом за одну сессию, имеет ID `{PREFIX}-{N}` и запись в `docs/TASKS.md`.
- Read-only агенты (ARCH, REVIEW, SEC) не правят файлы; их счётчики и отчёты фиксирует technical-writer.
- Мелкие сквозные фичи допускается вести одной записью `FEAT-N` с подзадачами по слоям (см. FEAT-1, FEAT-2 в реестре).

---

## Роли агентов

| # | Агент | Префикс | Модель | Инструменты | Слой |
|---|-------|---------|--------|-------------|------|
| 1 | `orchestrator` | — | fable | Task, Read, Glob, Grep, AskUserQuestion, TodoWrite | любой (не пишет код) |
| 2 | `architect` | ARCH | fable | Read, Glob, Grep, WebSearch, WebFetch | все (read-only) |
| 3 | `backend-developer` | DEV | fable | Read, Write, Edit, Bash, Glob, Grep | `backend/` |
| 4 | `mobile-backend-developer` | MBE | fable | Read, Write, Edit, Bash, Glob, Grep | `backend/` |
| 5 | `mobile-developer` | MOB | fable | Read, Write, Edit, Bash, Glob, Grep | `mobile/` |
| 6 | `web-developer` | WEB | fable | Read, Write, Edit, Bash, Glob, Grep | `web/` |
| 7 | `test-engineer` | TEST | fable | Read, Write, Edit, Bash, Glob, Grep | все |
| 8 | `ux-ui-test-engineer` | UITEST | fable | Read, Write, Edit, Bash, Glob, Grep | `mobile/`, `web/` |
| 9 | `code-reviewer` | REVIEW | fable | Read, Glob, Grep, Bash | все (read-only) |
| 10 | `security-auditor` | SEC | fable | Read, Glob, Grep, Bash | все (read-only) |
| 11 | `devops-engineer` | OPS | fable | Read, Write, Edit, Bash, Glob, Grep | все |
| 12 | `technical-writer` | DOC | haiku | Read, Write, Edit, Glob, Grep | `docs/`, README |

### 1. Orchestrator
Центральный координатор: читает `docs/TASKS.md` (счётчики), декомпозирует запрос пользователя на задачи по стандарту `docs/07-task-management.md`, делегирует агентам в порядке зависимостей, разрешает блокировки, агрегирует результаты. Кода не пишет, вопросы пользователю задаёт через AskUserQuestion.

### 2. Architect (ARCH)
Проектирует фичу целиком: схема БД, API-контракт, файловая структура и план реализации для DEV/MBE/MOB/WEB. Результат — архитектурный документ в `docs/architecture/` со статусом «Согласовано» и рекомендуемая декомпозиция. Только читает код.

### 3. Backend Developer (DEV)
Доменный слой Laravel: модели, миграции (+ применение к прод- и тестовой БД `reminders_test`), DTO (readonly), Actions, политики, enum'ы, события, sync-сервисы (`app/Services/Sync`). Стандарты: 02-php, 03-laravel, 04-database.

### 4. Mobile Backend Developer (MBE)
HTTP-слой API: контроллеры (`__invoke`), Form Requests, API Resources, маршруты `routes/api.php` (`/api/v1`), throttle, Sanctum. Стандарты: 03-laravel, 07-api. Ресурсы — контракт для MOB/WEB.

### 5. Mobile Developer (MOB)
Expo-приложение: экраны Expo Router, компоненты, хуки, Zustand-stores, Drizzle-схема и репозитории (local-first, outbox), sync-движок, локальные уведомления (expo-notifications, exact alarms), календарь, PIN/биометрия. Стандарт 04-typescript-rn. Проверка: `tsc --noEmit`, Jest.

### 6. Web Developer (WEB)
Vue 3: личный кабинет (`/lk`) и админка (`/admin`) по дизайн-макетам, Pinia-stores, composables, API-клиенты. Стандарт 05-typescript-vue. Проверка: `vue-tsc --noEmit`, Vitest. Прод-сборка: `VITE_API_URL=/napominalki npm run build -- --base=/napominalki/`.

### 7. Test Engineer (TEST)
Pest (backend: unit Actions/Policies + feature API/sync), Jest+RNTL (mobile), Vitest+Vue Test Utils (web). Ловит регрессии и sync-баги, чинит flaky-тесты. Даты в тестах — относительные (`now()->addDay()`), не константы.

### 8. UX/UI Test Engineer (UITEST)
Сверяет реализованные формы/экраны с дизайн-макетом поэлементно: вёрстка, навигация, состояния, варианты. Усиливает presence-тесты структурными. Только для задач с макетом.

### 9. Code Reviewer (REVIEW)
Ревью по стандартам (PSR-12/TS strict, лимиты длины из 01-general, SOLID, edge cases). Отчёт: Резюме / Critical / Warning / Suggestion / Пройдено → сохраняется в `docs/reviews/REVIEW-N.md`. Идёт параллельно с SEC.

### 10. Security Auditor (SEC)
OWASP Top 10, авторизация API (policies, sync push/pull), секреты, зависимости, мобильное хранение (expo-secure-store), CORS/заголовки/токены. Отчёт с приоритизацией → `docs/reviews/SEC-N.md`; исправления — задачами OPS/MBE/WEB.

### 11. DevOps Engineer (OPS)
Docker Compose backend (`name: project`, тома `project_*`), прод-контейнеры на jemsoft.ru (`reminders_serve`, `reminders_web`, nginx-proxy), EAS Build (`preview` = APK, `.easignore` для монорепо), CI, структура репозитория.

### 12. Technical Writer (DOC)
Ведёт `docs/TASKS.md` (записи задач, счётчики всех агентов, включая read-only ARCH/REVIEW/SEC, сводка Completed), README/CHANGELOG, архитектурные документы, отчёты ревью. Завершает каждый цикл коммитом `[DOC] TASKS: …`.

---

## Матрица стандартов

| Стандарт | Кто обязан читать |
|----------|-------------------|
| `01-general.md` | все |
| `02-php.md`, `03-laravel.md`, `04-database.md` | DEV, MBE, TEST, REVIEW, SEC, OPS |
| `04-typescript-rn.md` | MOB, TEST, UITEST, REVIEW |
| `05-typescript-vue.md` | WEB, TEST, UITEST, REVIEW |
| `07-api.md` | MBE, MOB, WEB, TEST, REVIEW, SEC |
| `07-task-management.md` | Orchestrator, DOC |
| `08-git-workflow.md` | все, кто коммитит |
| `06-orchid.md` | не используется (решение ARCH-1: админка на Vue без Orchid) |

---

## Управление задачами и счётчики

Стандарт — `docs/07-task-management.md`. ID `{PREFIX}-{N}` уникальны и не переиспользуются; текущие значения — таблица «Счётчики» в `docs/TASKS.md`.

| Кто инкрементирует | Префиксы |
|--------------------|----------|
| сам исполнитель после коммита | DEV, MBE, MOB, WEB, TEST, UITEST, OPS, DOC |
| technical-writer по итогам отчёта | ARCH, REVIEW, SEC |

Жизненный цикл: `pending → in_progress → completed` (или `blocked` / `cancelled`). Запись задачи содержит исполнителя, статус, приоритет, зависимости, стандарты, описание, файлы, критерии приёмки (чеклист), даты.

---

## Git workflow

Стандарт — `docs/08-git-workflow.md`. Ветка `main`; фичи — в ветках `feat-*` с merge-коммитом, мелкие задачи — напрямую. Коммит: `[{TASK-ID}] {цель}` (например `[MOB-64] Диалог закрытия повторяющегося напоминания …`), цикл закрывается коммитом `[DOC] TASKS: …` с обновлёнными счётчиками.

---

## Сценарии

**Новая фича.** Orchestrator → ARCH (документ, согласование) → DEV (домен, миграции обеих БД) → MBE (API) → MOB ‖ WEB → TEST → UITEST (если есть макет) → REVIEW ‖ SEC → DOC.

**Багфикс.** Orchestrator → исполнитель слоя (воспроизведение, фикс) → TEST (регрессионный тест) → DOC. Прод-инциденты (sync, Redis, миграции) — фиксируются в реестре с причиной и симптомом.

**Задача по макету (MOB/WEB).** Исполнитель → UITEST (сверка поэлементно, доводка тестов) → DOC.

**Инфраструктура.** OPS (Docker/EAS/деплой/структура) → проверка прода (API 422 на пустой логин, веб 200, `migrate:status`) → DOC.
