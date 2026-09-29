# Workspace — Мобильное приложение (Напоминания и Списки покупок)

## Структура проекта

```
/home/vselug/workspace/Napominalky/
├── .claude/agents/          # Агенты мультиагентной системы
├── docs/                    # Стандарты разработки и задачи
├── backend/                 # Laravel backend (PHP 8.5+, PostgreSQL 17)
├── mobile/                  # React Native + Expo (iOS + Android)
└── web/                     # Vue.js 3 (Админ-панель + Личный кабинет)
```

## Стандарты разработки

| Файл | Содержание |
|------|------------|
| `docs/01-general.md` | Общие принципы, лимиты длины кода |
| `docs/02-php.md` | PHP 8.5+ стандарты кодирования |
| `docs/03-laravel.md` | Laravel стандарты и паттерны |
| `docs/04-database.md` | PostgreSQL, миграции, индексы |
| `docs/04-typescript-rn.md` | TypeScript 5 + React Native стандарты |
| `docs/05-typescript-vue.md` | TypeScript 5 + Vue.js 3 стандарты |
| `docs/06-orchid.md` | Orchid Platform (если используется) |
| `docs/07-api.md` | REST API контракт |
| `docs/07-task-management.md` | Управление задачами в мультиагентной системе |
| `docs/08-git-workflow.md` | Git workflow, ветки, коммиты |
| `docs/multi-agent-roles.md` | Роли и взаимодействие агентов |
| `docs/TASKS.md` | Реестр задач и счётчики |

## Агенты

| Агент | Префикс | Рабочая директория | Описание |
|-------|---------|-------------------|----------|
| `orchestrator` | — | любая | Координирует команду, не пишет код |
| `architect` | ARCH | — | Проектирует архитектуру всех слоёв |
| `backend-developer` | DEV | `backend/` | Доменный слой: модели, сервисы, политики |
| `mobile-backend-developer` | MBE | `backend/` | HTTP API: контроллеры, ресурсы, маршруты |
| `mobile-developer` | MOB | `mobile/` | React Native + Expo приложение |
| `web-developer` | WEB | `web/` | Vue.js 3 веб-приложение |
| `test-engineer` | TEST | все | Тесты: Pest PHP, Jest/RNTL, Vitest |
| `ux-ui-test-engineer` | UITEST | `mobile/`, `web/` | Соответствие форм дизайн-макету (вёрстка/навигация/состояния) |
| `code-reviewer` | REVIEW | все | Ревью кода (read-only) |
| `security-auditor` | SEC | все | Аудит безопасности (read-only) |
| `devops-engineer` | OPS | все | Docker, CI/CD, EAS Build |
| `technical-writer` | DOC | все | Документация, счётчики read-only агентов |

## Порядок выполнения задач

```
ARCH → DEV → MBE → (MOB ‖ WEB) → TEST → UITEST* → (REVIEW ‖ SEC) → DOC
```
\* `UITEST` (ux-ui-test-engineer) — для задач с дизайн-макетом: проверяет соответствие формы вёрстке.

## Ключевые правила

- Стандарт управления задачами: `docs/07-task-management.md`
- Git workflow: `docs/08-git-workflow.md`
- Реестр задач: `docs/TASKS.md` (каждый агент инкрементирует свой счётчик)
- Read-only агенты (ARCH, REVIEW, SEC) — счётчик обновляет `technical-writer`
