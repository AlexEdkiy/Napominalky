# 8. Git Workflow

## Стратегия слияния

Проект использует **merge без rebase** с полным сохранением истории коммитов.

| Параметр | Значение |
|----------|----------|
| Стратегия | `merge --no-ff` (всегда merge-коммит) |
| Rebase | **запрещён** |
| Squash | **запрещён** (каждый коммит сохраняется) |
| Force push | **запрещён** |
| Основная ветка | `main` |

### Почему merge без rebase

- Полная история: видно кто, когда и в рамках какой задачи вносил изменения
- Каждая задача = отдельная ветка = отдельный merge-коммит = точка отката
- Нет потери контекста при разрешении конфликтов
- Упрощённый аудит и ревью

---

## Ветвление

### Правило

Для каждой задачи создаётся **отдельная ветка** с именем, равным **ID задачи** (из `/home/vselug/workspace/Napominalky/docs/07-task-management.md`).

```
main
 ├── ARCH-1
 ├── DB-1
 ├── DEV-1
 ├── DEV-2
 ├── ADM-1
 ├── FE-1
 ├── TEST-1
 └── ...
```

### Формат имени ветки

```
{PREFIX}-{N}
```

| Примеры |
|---------|
| `DEV-1` |
| `ARCH-3` |
| `ADM-2` |
| `DB-5` |
| `FE-7` |
| `TEST-4` |

### Жизненный цикл ветки

Все git-операции выполняются в `/home/vselug/workspace/Napominalky/backend/` (корень репозитория).

```
1. cd /home/vselug/workspace/Napominalky/backend
2. git checkout main
3. git pull origin main
4. git checkout -b {TASK-ID}        # создать ветку
5. ... реализация ...
6. git add {files}
7. git commit                       # по формату ниже
8. Edit /home/vselug/workspace/Napominalky/docs/TASKS.md    # инкрементировать счётчик {PREFIX}
9. ... тестирование (для backend — обязательно) ...
10. git checkout main
11. git merge --no-ff {TASK-ID}     # слияние с сохранением истории
12. git branch -d {TASK-ID}         # удалить ветку после слияния
```

### Worktree-изоляция

Агенты с `isolation: worktree` (Backend Dev, Admin Dev, Frontend Dev, Database Eng, Test Eng) автоматически работают в изолированных git worktree внутри `/home/vselug/workspace/Napominalky/backend/`. Ветка worktree должна именоваться по ID задачи.

---

## Формат коммита

### Структура

```
[{TASK-ID}] {Краткая цель задачи}

{Описание что сделано — 1-3 строки}
```

### Правила

| Элемент | Правило |
|---------|---------|
| Заголовок | `[{TASK-ID}] {цель}` — до 72 символов |
| Пустая строка | Обязательна между заголовком и описанием |
| Описание | Кратко что сделано, 1-3 строки |
| Язык | Русский или английский (единообразно в рамках проекта) |

### Примеры

```
[DEV-1] Реализовать endpoint регистрации пользователя

Создан POST /api/users с валидацией через StoreUserRequest,
бизнес-логикой в CreateUserAction и ответом через UserResource.
Добавлен throttle middleware.
```

```
[DB-3] Создать миграцию таблицы orders

Таблица orders: id, user_id (FK), status (enum), total (numeric),
created_at, updated_at, deleted_at. Индексы на user_id и status.
```

```
[ADM-2] Реализовать экраны управления статьями

ListScreen с пагинацией, фильтрами по статусу и дате.
EditScreen для создания и редактирования.
ViewScreen с Legend-layout.
```

```
[FE-5] Реализовать форму регистрации

Компонент RegisterForm.vue с валидацией email и password.
Pinia store для управления состоянием аутентификации.
```

---

## Git-идентификация агентов

Каждый агент коммитит под своим именем, соответствующим его роли.

| Роль | Git Author |
|------|-----------|
| Backend Developer | `Backend Developer <backend-developer@agent>` |
| Admin Developer | `Admin Developer <admin-developer@agent>` |
| Frontend Developer | `Frontend Developer <frontend-developer@agent>` |
| Database Engineer | `Database Engineer <database-engineer@agent>` |
| Test Engineer | `Test Engineer <test-engineer@agent>` |
| DevOps Engineer | `DevOps Engineer <devops-engineer@agent>` |
| Technical Writer | `Technical Writer <technical-writer@agent>` |

### Настройка в рамках задачи

Перед первым коммитом в ветке агент устанавливает идентификацию в `/home/vselug/workspace/Napominalky/backend/`:

```bash
cd /home/vselug/workspace/Napominalky/backend
git config user.name "Backend Developer"
git config user.email "backend-developer@agent"
```

Эта настройка **локальная** (без `--global`) и действует только в текущем worktree.

---

## Согласование архитектуры

### Правило

Верхнеуровневые архитектурные задачи (ARCH-*) **требуют согласования с пользователем** перед передачей в реализацию.

### Процесс

```
1. Orchestrator создаёт задачу ARCH-{N}
2. Architect выполняет проектирование, возвращает план
3. Orchestrator ОБЯЗАН вызвать AskUserQuestion:
   «Архитектурное решение [ARCH-{N}] готово к реализации.
    [Краткое описание ключевых решений]
    Подтвердите передачу в работу.»
4. Только после подтверждения — создаются задачи реализации (DEV, DB, ADM, FE)
```

### Что требует согласования

- Новые сущности (модели, таблицы)
- Изменения API-контрактов
- Новые внешние зависимости
- Изменения схемы БД
- Архитектурные решения, затрагивающие несколько модулей

### Что НЕ требует согласования

- Баг-фиксы в существующем коде
- Рефакторинг без изменения интерфейсов
- Обновление документации
- Добавление тестов

---

## DTT-методология (Design → Test → Type)

### Область применения

**Backend Developer** (`backend-developer`) работает **строго по DTT**:

1. **Design** — спроектировать решение (классы, методы, интерфейсы) на основе задачи от Architect
2. **Test** — написать тесты ДО реализации (unit + integration)
3. **Type** — написать реализацию, добиться прохождения тестов

### Обязательные тесты для backend

| Тип | Что тестировать | Фреймворк |
|-----|----------------|-----------|
| **Unit** | Action-классы, Service-классы, DTO, Enum-методы | Pest PHP |
| **Integration** | API endpoints (HTTP-тесты), валидация Form Request, Eloquent scopes, авторизация (Policies) | Pest PHP + Laravel Testing |

### Порядок работы backend-разработчика

```
1. cd /home/vselug/workspace/Napominalky/backend
2. Прочитать задачу и стандарты из /home/vselug/workspace/Napominalky/docs/
3. Создать ветку {TASK-ID}
4. [Design] Определить структуру классов и методов
5. [Test] Написать тесты:
   - Unit-тесты для Action/Service классов
   - Integration-тесты для API endpoints
   - Тесты валидации Form Requests
6. Убедиться что тесты ПАДАЮТ (red phase)
7. [Type] Написать реализацию
8. Убедиться что тесты ПРОХОДЯТ (green phase)
9. Коммит по формату
10. Финальный запуск: php artisan test
```

### Минимальное покрытие

- Каждый Action/Service класс — минимум 1 unit-тест
- Каждый API endpoint — минимум 1 integration-тест (happy path + validation error)
- Каждый Policy — тест на разрешённый и запрещённый доступ

---

## Тестирование административной панели

### Правило

Код Orchid-экранов (`/home/vselug/workspace/Napominalky/backend/app/Orchid/`) **НЕ покрывается unit/integration тестами**.

Однако **ролевая модель** (permissions, доступ к экранам) **обязательно тестируется**.

### Что тестирует Test Engineer для админки

| Что | Как |
|-----|-----|
| Доступ с правами | HTTP-тест: авторизованный пользователь с permission `platform.{entity}.list` → 200 |
| Доступ без прав | HTTP-тест: пользователь без permission → 403 |
| Доступ неавторизованный | HTTP-тест: гость → redirect на login |
| Разделение ролей | Разные пользователи с разными наборами permissions видят разные экраны |

### Пример теста ролевой модели

```php
describe('Article Admin Screens', function () {
    it('allows access to list screen with correct permission', function () {
        $user = User::factory()->create();
        $user->addPermission('platform.articles.list');

        actingAs($user)
            ->get(route('platform.articles.list'))
            ->assertOk();
    });

    it('denies access to list screen without permission', function () {
        $user = User::factory()->create();

        actingAs($user)
            ->get(route('platform.articles.list'))
            ->assertForbidden();
    });

    it('denies access to edit screen without edit permission', function () {
        $user = User::factory()->create();
        $user->addPermission('platform.articles.list');

        actingAs($user)
            ->get(route('platform.articles.edit'))
            ->assertForbidden();
    });
});
```

---

## Разрешение конфликтов

| Ситуация | Действие |
|----------|----------|
| Merge-конфликт | Разрешить вручную, сохранить оба изменения где возможно |
| Конфликт в миграциях | Перенумеровать миграцию (изменить timestamp) |
| Конфликт в routes | Объединить маршруты, проверить уникальность имён |
| Конфликт в lock-файлах | Перегенерировать: `composer install` / `npm install` |

### Запрещено

- `git rebase` — **нельзя**
- `git push --force` — **нельзя**
- `git reset --hard` на shared ветках — **нельзя**
- Удаление чужих коммитов — **нельзя**
- `--no-verify` при коммите — **нельзя**

---

## Сводка workflow по задаче

```
┌─────────────┐
│ Orchestrator │ создаёт задачу, назначает агента
└──────┬──────┘
       │
┌──────▼──────┐
│   Агент      │ cd /home/vselug/workspace/Napominalky/backend
│              │ прочитать стандарты из /home/vselug/workspace/Napominalky/docs/
│              │ git checkout -b {TASK-ID}
│              │ git config user.name "{Role}"
│              │ ... реализация (DTT для backend) ...
│              │ git add / git commit
│              │ обновить счётчик в /home/vselug/workspace/Napominalky/docs/TASKS.md
└──────┬──────┘
       │
┌──────▼──────┐
│ Test Eng.    │ cd /home/vselug/workspace/Napominalky/backend
│              │ тесты (unit + integration для backend)
│              │ тесты ролевой модели (для admin)
└──────┬──────┘
       │
┌──────▼──────┐
│ Orchestrator │ cd /home/vselug/workspace/Napominalky/backend
│              │ git checkout main
│              │ git merge --no-ff {TASK-ID}
│              │ git branch -d {TASK-ID}
└─────────────┘
```
