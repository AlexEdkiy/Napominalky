# 4. Стандарты кодирования TypeScript + React Native

## Стек

- **TypeScript 5+** — обязателен для всего нового кода
- **React Native 0.76+** (New Architecture)
- **Expo SDK 52+** (managed workflow)
- **Expo Router 4+** — файловая маршрутизация
- **Zustand 5+** — управление клиентским состоянием
- **TanStack Query 5+** — серверное состояние и кеш

---

## npm-зависимости

Правила добавления внешних пакетов описаны в `/home/vselug/workspace/Napominalky/docs/01-general.md` (раздел «Внешние зависимости»).

Ключевые правила для JS/TS:
- Допускаются пакеты от **доверенных вендоров** (`expo`, `@expo/*`, `react-native`, `@react-native/*`, `@tanstack/*`, `zustand`) или пакеты с **≥ 400k weekly downloads** на npmjs при активном жизненном цикле
- Перед добавлением пакета проверь, не решается ли задача средствами Expo SDK или React Native Core
- После установки: `npm audit` для проверки уязвимостей
- `package-lock.json` всегда фиксируется в git

---

## 1. TypeScript

### Strict mode

Флаг `strict: true` в `tsconfig.json` обязателен. Он включает весь набор строгих проверок: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` и другие.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

### Типизация

**Никогда не используйте `any`**. `any` отключает проверку типов и сводит на нет пользу от TypeScript. Для неизвестных типов используйте `unknown`.

```typescript
// Плохо
function parseResponse(data: any): any {
  return data.result
}

// Хорошо
function parseApiResponse(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Неверный формат данных')
  }
  if (!('result' in data) || typeof (data as { result: unknown }).result !== 'string') {
    throw new Error('Поле result отсутствует')
  }
  return (data as { result: string }).result
}
```

**Union types** — для значений нескольких типов:

```typescript
type Status = 'active' | 'inactive' | 'pending'
```

**Discriminated unions** — для моделирования состояний:

```typescript
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'loading' }
```

---

### Interfaces vs Types

**`interface`** — для описания формы объектов и Props компонентов:

```typescript
interface ReminderCardProps {
  reminder: Reminder
  onComplete: (id: string) => void
}

interface Reminder {
  uuid: string
  title: string
  dueAt: string
  isCompleted: boolean
}
```

**`type`** — для unions, mapped types, псевдонимов:

```typescript
type ReminderStatus = 'pending' | 'completed' | 'overdue'
type ReminderById = Record<string, Reminder>
```

---

### Утилитарные типы

Используй встроенные утилитарные типы вместо ручной копии полей:

```typescript
type UpdateReminderParams = Partial<Pick<Reminder, 'title' | 'dueAt' | 'notes'>>
type ReminderPreview = Omit<Reminder, 'notes' | 'shoppingListId'>
```

---

### Generics

Для переиспользуемых хуков и компонентов:

```typescript
// Хук с дженериком
function useListQuery<T>(queryKey: string[], fetcher: () => Promise<T[]>) {
  return useQuery({ queryKey, queryFn: fetcher })
}

// Компонент с дженериком
interface ListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T) => React.ReactElement
}
```

---

## 2. React Native — Компоненты

### Правила

- **Только функциональные компоненты** — class components запрещены
- `const` + стрелочная функция: `const ReminderCard: React.FC<Props> = ...`
- Props типизируются через `interface`, не `type`
- Деструктуризация props в параметрах функции
- Никакой бизнес-логики в компонентах — только рендеринг и вызов хуков
- `StyleSheet.create()` для стилей — никаких inline-объектов `style={{}}`
- `KeyboardAvoidingView` + `Platform.OS` для форм
- `FlatList` / `SectionList` вместо `ScrollView` для списков > 20 элементов
- `ActivityIndicator` для состояния загрузки

---

### Порядок внутри компонента

```typescript
// 1. Импорты (React, RN, библиотеки, внутренние модули)
import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { useReminders } from '@/hooks/useReminders'

// 2. Интерфейс Props
interface ReminderListProps {
  onItemPress: (uuid: string) => void
}

// 3. Объявление компонента
const ReminderList: React.FC<ReminderListProps> = ({ onItemPress }) => {
  // 4. Хуки (store, query, state, ref, callback)
  const { reminders, isLoading } = useReminders()

  // 5. Вычисляемые значения
  const pendingCount = reminders.filter(r => !r.isCompleted).length

  // 6. Эффекты
  // (useEffect здесь)

  // 7. Handlers
  const handlePress = (uuid: string) => onItemPress(uuid)

  // 8. Рендер
  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => <ReminderCard reminder={item} onPress={handlePress} />}
      />
    </View>
  )
}

// 9. Стили в конце файла
const styles = StyleSheet.create({
  container: { flex: 1 },
})

export default ReminderList
```

---

### Стили

```typescript
// Хорошо — StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
})

// Плохо — inline объект
<View style={{ flex: 1, padding: 16 }} />  // пересоздаётся при каждом рендере
```

---

## 3. Хуки

### Правила

- Файл `use*.ts` в `src/hooks/`
- Один хук — одна ответственность (`useReminders` для CRUD, `useAuth` для аутентификации)
- Используй TanStack Query (`useQuery`, `useMutation`) для серверного состояния
- Zustand — только для клиентского состояния (токен, настройки UI)
- Cleanup в `useEffect` return-функции

### Пример хука с TanStack Query

```typescript
// src/hooks/useReminders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remindersApi } from '@/api/remindersApi'
import { QueryKeys } from '@/constants/QueryKeys'

export function useReminders() {
  return useQuery({
    queryKey: QueryKeys.reminders.all,
    queryFn: remindersApi.getAll,
  })
}

export function useCompleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: remindersApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.reminders.all })
    },
  })
}
```

---

## 4. Zustand Stores

### Структура

```typescript
// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AuthState {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

### Правила

- Store — только клиентское состояние (auth, UI-настройки)
- Серверные данные (списки, напоминания) — TanStack Query
- Используй `persist` только для токена и настроек, не для серверных данных
- Токен хранится в `expo-secure-store` через кастомный `storage` adapter

---

## 5. TanStack Query — ключи запросов

```typescript
// src/constants/QueryKeys.ts
export const QueryKeys = {
  reminders: {
    all: ['reminders'] as const,
    list: (params: ReminderListParams) => ['reminders', 'list', params] as const,
    detail: (uuid: string) => ['reminders', uuid] as const,
  },
  shoppingLists: {
    all: ['shopping-lists'] as const,
    detail: (uuid: string) => ['shopping-lists', uuid] as const,
    items: (listUuid: string) => ['shopping-lists', listUuid, 'items'] as const,
  },
} as const
```

**Правила:**
- Ключи строго типизированы через `as const`
- UUID, не `id`, как ключ детального запроса
- Параметры фильтрации/сортировки включаются в ключ для корректной инвалидации

---

## 6. API-клиент

```typescript
// src/api/client.ts
import axios, { type AxiosError } from 'axios'
import { Config } from '@/constants/Config'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: Config.API_URL,
  headers: { Accept: 'application/json' },
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)
```

**Правила:**
- Базовый URL только из `Config` (который читает из `.env`)
- Интерсептор токена — в одном месте, не в каждом хуке
- 401 → автоматический logout
- Timeout 10 секунд по умолчанию

---

## 7. Типы API-ответов

Типы в `src/types/` должны точно соответствовать API Resources от Mobile Backend Developer.

```typescript
// src/types/api.ts — базовые структуры ответа
export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// src/types/reminder.ts — доменные типы
export interface Reminder {
  uuid: string
  title: string
  notes: string | null
  due_at: string
  is_completed: boolean
  created_at: string
}
```

---

## 8. Лимиты длины

| Единица        | Лимит       |
|----------------|-------------|
| Строка         | ≤ 120 символов |
| Функция/хук    | ≤ 20 строк  |
| Компонент      | ≤ 150 строк |
| Файл           | ≤ 500 строк |

---

## 9. Именование

| Сущность              | Правило                           | Пример                               |
|-----------------------|-----------------------------------|--------------------------------------|
| Компонент             | PascalCase + `.tsx`               | `ReminderCard.tsx`                   |
| Экран (Expo Router)   | kebab-case + `.tsx`               | `reminders/[id].tsx`                 |
| Хук                   | `use` + PascalCase + `.ts`        | `useReminders.ts`                    |
| Store                 | camelCase + `Store.ts`            | `authStore.ts`                       |
| API-модуль            | camelCase + `Api.ts`              | `remindersApi.ts`                    |
| Тип/интерфейс         | PascalCase                        | `Reminder`, `ShoppingList`           |
| Константа             | SCREAMING_SNAKE_CASE              | `API_BASE_URL`, `MAX_LIST_ITEMS`     |
| QueryKey              | camelCase в объекте `QueryKeys`   | `QueryKeys.reminders.list(params)`   |
