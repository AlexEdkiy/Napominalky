# Reminders Web

Vue 3.5 + Vite 6 + TypeScript 5 — административная панель и личный кабинет.

## Стек

- Vue 3.5, Pinia 2, Vue Router 4
- TypeScript 5 (strict mode)
- Vite 6
- Axios 1
- Vitest 4

## Команды

```bash
# Установка зависимостей
npm install

# Dev-сервер (http://localhost:5173)
npm run dev

# Production-сборка
npm run build

# Тесты (одиночный запуск)
npm run test

# Тесты в watch-режиме
npm run test:watch

# Проверка типов
npm run typecheck
```

## Переменные окружения

Скопируй `.env.example` в `.env.local` и заполни значения:

```bash
cp .env.example .env.local
```

| Переменная | Описание |
|------------|----------|
| `VITE_API_URL` | URL backend API (например `http://localhost:8080`) |
| `VITE_APP_NAME` | Название приложения |

## Структура

```
src/
├── api/           # Axios-клиент и модульные API-запросы
├── components/    # Переиспользуемые компоненты
├── composables/   # Vue composables (use*)
├── pages/
│   ├── auth/      # Страницы аутентификации
│   ├── admin/     # Административная панель (/admin)
│   └── lk/        # Личный кабинет (/lk)
├── router/        # Vue Router: маршруты, guard-ы, типы
├── stores/        # Pinia stores
└── types/         # TypeScript типы (зеркалируют API Resources)
```

## Секции приложения

- `/admin` — административная панель (только для `is_admin = true`)
- `/lk` — личный кабинет пользователя: аккаунт, заметки, списки покупок, напоминания, синхронизация, настройки
