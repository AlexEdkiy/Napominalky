# 5. Стандарты кодирования TypeScript + Vue.js

## Стек

- **TypeScript 5+** — обязателен для всего нового кода
- **Vue.js 3** — только Composition API с `<script setup lang="ts">`
- **Pinia** — управление состоянием
- **Vue Router 4** — маршрутизация

---

## npm-зависимости

Правила добавления внешних пакетов описаны в `/home/vselug/workspace/docs/01-general.md` (раздел «Внешние зависимости»).

Ключевые правила для JS/TS:
- Допускаются пакеты от **доверенных вендоров** (`vue`, `@vue/*`, `@vitejs/*`, `pinia`, `vue-router`, `vitest`, `@vueuse/*`, `tailwindcss`) или пакеты с **≥ 400k weekly downloads** на npmjs при активном жизненном цикле
- Перед добавлением пакета проверь, не решается ли задача средствами Vue 3, TypeScript или Vite
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

**Никогда не используйте `any`**. `any` отключает проверку типов и сводит на нет пользу от TypeScript. Для неизвестных типов используйте `unknown` — он требует явной проверки перед использованием.

Плохо:
```typescript
function parseResponse(data: any): any {
  return data.result
}
```

Хорошо:
```typescript
function parseResponse(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Неверный формат данных')
  }
  if (!('result' in data) || typeof (data as { result: unknown }).result !== 'string') {
    throw new Error('Поле result отсутствует или не является строкой')
  }
  return (data as { result: string }).result
}
```

**Union types** — для значений, которые могут быть нескольких типов:

```typescript
type Status = 'active' | 'inactive' | 'pending'
type Id = string | number
```

**Discriminated unions** — для моделирования состояний с общим полем-дискриминатором:

```typescript
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'loading' }

function handleResult(result: ApiResult<User>): void {
  if (result.status === 'success') {
    console.log(result.data.name) // TypeScript знает, что data есть
  } else if (result.status === 'error') {
    console.error(result.error)
  }
}
```

---

### Interfaces vs Types

**Используйте `interface`** для описания формы объектов, особенно когда планируется расширение через `extends`:

```typescript
interface User {
  id: number
  name: string
  email: string
}

interface AdminUser extends User {
  permissions: string[]
}
```

**Используйте `type`** для union-типов, mapped types, алиасов примитивов и кортежей:

```typescript
type Status = 'active' | 'inactive'
type Nullable<T> = T | null
type Pair<T, U> = [T, U]
type UserRecord = Record<string, User>
```

Правило выбора:
- Объект с возможным расширением → `interface`
- Union, intersection, mapped type, кортеж, алиас → `type`

---

### Enums

Числовые `enum` создают непрозрачные значения и усложняют отладку. Предпочитайте string literal unions или `const enum`.

Плохо:
```typescript
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right, // 3
}
```

Хорошо — string literal union:
```typescript
type Direction = 'up' | 'down' | 'left' | 'right'
```

Хорошо — `const enum` (когда нужна именованная группа):
```typescript
const enum HttpStatus {
  Ok = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
}

function handleResponse(status: HttpStatus): void {
  if (status === HttpStatus.Ok) {
    // ...
  }
}
```

---

### Утилитарные типы

TypeScript предоставляет встроенные утилитарные типы — используйте их вместо написания собственных аналогов.

```typescript
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

// Partial — все поля необязательны (для patch-запросов)
type UserUpdate = Partial<User>

// Required — все поля обязательны
type StrictUser = Required<User>

// Pick — выбрать подмножество полей
type UserPreview = Pick<User, 'id' | 'name'>

// Omit — исключить поля
type UserWithoutId = Omit<User, 'id'>

// Record — словарь с типизированными ключами и значениями
type UserMap = Record<string, User>

// Readonly — запретить изменение полей
type ImmutableUser = Readonly<User>

// ReturnType — тип возвращаемого значения функции
function getUser(): User { /* ... */ return {} as User }
type GetUserReturn = ReturnType<typeof getUser> // User

// Parameters — типы параметров функции
type GetUserParams = Parameters<typeof getUser> // []
```

---

### Generics

Используйте дженерики для переиспользуемых функций, хуков и компонентов. Называйте параметры типов осмысленно, а не однобуквенно, если это добавляет ясности.

```typescript
// Простая обёртка над fetch с типизацией ответа
async function fetchJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<TResponse>
}

// Использование
const user = await fetchJson<User>('/api/users/1')

// Переиспользуемый тип для пагинированного ответа
interface PaginatedResponse<TItem> {
  data: TItem[]
  total: number
  page: number
  perPage: number
}

type UserListResponse = PaginatedResponse<User>
```

---

### Именование

- **Интерфейсы** — PascalCase, без префикса `I`: `User`, `ApiResponse`, `ButtonProps`
- **Типы** — PascalCase: `Status`, `Nullable<T>`, `UserRole`
- **Классы** — PascalCase: `UserService`, `ApiClient`
- **Переменные и функции** — camelCase: `userName`, `fetchUser`, `isLoading`
- **Константы** — camelCase или SCREAMING_SNAKE_CASE для глобальных примитивов: `maxRetries`, `API_BASE_URL`
- **Дженерик-параметры** — PascalCase или однобуква для простых случаев: `T`, `TItem`, `TResponse`

Плохо:
```typescript
interface IUserInterface { ... }
type user_status = 'active' | 'inactive'
const FetchUser = () => { ... }
```

Хорошо:
```typescript
interface User { ... }
type UserStatus = 'active' | 'inactive'
const fetchUser = () => { ... }
```

---

## 2. Vue.js 3

### Composition API

**Только `<script setup lang="ts">`**. Options API не используется в новых компонентах. Это обязательное правило для всего нового кода.

Плохо:
```vue
<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'MyComponent',
  setup() {
    const count = ref(0)
    return { count }
  },
})
</script>
```

Хорошо:
```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>
```

---

### Реактивность

**`ref()`** — для примитивных значений и когда нужно передавать реактивное значение по ссылке:

```typescript
const count = ref(0)
const userName = ref('')
const isLoading = ref(false)
const selectedUser = ref<User | null>(null)

// Доступ к значению — через .value в script
count.value++
```

**`reactive()`** — для объектов, когда деструктуризация не нужна:

```typescript
const form = reactive({
  name: '',
  email: '',
  role: 'user' as UserRole,
})

// Прямой доступ без .value
form.name = 'Ivan'
```

Внимание: при деструктуризации `reactive()` теряет реактивность. Используйте `toRefs()` при необходимости:

```typescript
const state = reactive({ count: 0, name: '' })
const { count, name } = toRefs(state) // count и name остаются реактивными
```

**`computed()`** — для производных значений. Кешируются и пересчитываются только при изменении зависимостей:

```typescript
const users = ref<User[]>([])
const searchQuery = ref('')

const filteredUsers = computed(() =>
  users.value.filter(user =>
    user.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

// Computed с геттером и сеттером
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value: string) => {
    const [first, last] = value.split(' ')
    firstName.value = first ?? ''
    lastName.value = last ?? ''
  },
})
```

**`watch()`** — для реакции на изменения с доступом к предыдущему значению:

```typescript
// Наблюдение за одним ref
watch(count, (newValue, oldValue) => {
  console.log(`count изменился с ${oldValue} на ${newValue}`)
})

// Наблюдение за несколькими источниками
watch([firstName, lastName], ([newFirst, newLast]) => {
  console.log(`Имя: ${newFirst} ${newLast}`)
})

// Немедленный запуск + глубокое наблюдение
watch(
  form,
  (newForm) => {
    saveToLocalStorage(newForm)
  },
  { immediate: true, deep: true }
)
```

**`watchEffect()`** — для side effects, которые должны автоматически отслеживать зависимости:

```typescript
watchEffect(() => {
  // Автоматически перезапускается при изменении userId
  fetchUser(userId.value)
})
```

---

### Props

Типизируйте props через дженерик `defineProps<{}>()`. Значения по умолчанию задавайте через `withDefaults()`.

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  variant?: 'primary' | 'secondary' | 'danger'
  user?: User
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  variant: 'primary',
  disabled: false,
})
</script>
```

---

### Emits

Типизируйте события через дженерик `defineEmits<{}>()` — используйте синтаксис объекта для полной типизации аргументов:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  change: [value: string]
  update: [id: number, data: Partial<User>]
  close: []
}>()

function handleChange(value: string): void {
  emit('change', value)
}
</script>
```

---

### Provide / Inject

Для типизированного provide/inject используйте `InjectionKey`:

```typescript
// tokens.ts — определяем ключи централизованно
import type { InjectionKey } from 'vue'
import type { UserStore } from '@/stores/user'

export const userStoreKey: InjectionKey<UserStore> = Symbol('userStore')
export const themeKey: InjectionKey<'light' | 'dark'> = Symbol('theme')
```

```vue
<!-- Родительский компонент -->
<script setup lang="ts">
import { provide } from 'vue'
import { themeKey } from '@/tokens'

provide(themeKey, 'dark')
</script>
```

```vue
<!-- Дочерний компонент -->
<script setup lang="ts">
import { inject } from 'vue'
import { themeKey } from '@/tokens'

const theme = inject(themeKey) // Тип: 'light' | 'dark' | undefined
const themeWithDefault = inject(themeKey, 'light') // Тип: 'light' | 'dark'
</script>
```

---

### Composables

Composable — функция с префиксом `use`, которая инкапсулирует реактивную логику и может использоваться в нескольких компонентах.

Правила создания composables:
- Файл называется `use*.ts` и располагается в `src/composables/`
- Возвращайте `ref`-значения, а не их `.value` — чтобы реактивность сохранялась
- Принимайте `ref` или getter-функцию в качестве аргументов, если значение может меняться
- Всегда очищайте side effects в `onUnmounted`

```typescript
// src/composables/useCounter.ts
import { ref, computed } from 'vue'

interface UseCounterOptions {
  min?: number
  max?: number
  step?: number
}

export function useCounter(initial = 0, options: UseCounterOptions = {}) {
  const { min = -Infinity, max = Infinity, step = 1 } = options

  const count = ref(initial)

  const isAtMin = computed(() => count.value <= min)
  const isAtMax = computed(() => count.value >= max)

  function increment(): void {
    count.value = Math.min(count.value + step, max)
  }

  function decrement(): void {
    count.value = Math.max(count.value - step, min)
  }

  function reset(): void {
    count.value = initial
  }

  return { count, isAtMin, isAtMax, increment, decrement, reset }
}
```

```typescript
// src/composables/useLocalStorage.ts
import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  const value = ref<T>(stored !== null ? (JSON.parse(stored) as T) : defaultValue)

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue))
    },
    { deep: true }
  )

  return value
}
```

---

### Жизненный цикл

Используйте хуки жизненного цикла для управления side effects. Всегда очищайте подписки, таймеры и обработчики событий в `onUnmounted`.

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const windowWidth = ref(window.innerWidth)

function handleResize(): void {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
```

Чаще cleanup удобнее делать прямо в composable:

```typescript
// src/composables/useWindowSize.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)

  function update(): void {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))

  return { width, height }
}
```

---

## 3. Управление состоянием (Pinia)

### Структура store

Предпочитайте **Composition API store** — он более явный, лучше типизируется и согласуется с остальным кодом.

```typescript
// src/stores/user.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types'
import { userApi } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => currentUser.value !== null)
  const adminUsers = computed(() =>
    users.value.filter(user => user.role === 'admin')
  )

  // Actions
  async function fetchUsers(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      users.value = await userApi.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Неизвестная ошибка'
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    try {
      currentUser.value = await userApi.login(email, password)
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    currentUser.value = null
  }

  return {
    currentUser,
    users,
    isLoading,
    error,
    isAuthenticated,
    adminUsers,
    fetchUsers,
    login,
    logout,
  }
})

// Экспортируем тип store для использования с InjectionKey
export type UserStore = ReturnType<typeof useUserStore>
```

---

### Когда использовать store, local state или composable

| Сценарий | Решение |
|---|---|
| Данные нужны в нескольких несвязанных компонентах | Pinia store |
| Данные нужны только внутри компонента и его потомков | Local state + provide/inject |
| Переиспользуемая логика без глобального состояния | Composable |
| Данные нужны только в одном компоненте | Local state (`ref`/`reactive`) |

Не создавайте store для каждой мелочи — локальное состояние в компоненте зачастую правильнее.

---

## 4. Маршрутизация (Vue Router)

### Типизация маршрутов

Объявляйте мета-информацию маршрутов через расширение типов Vue Router:

```typescript
// src/router/types.ts
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    roles?: string[]
  }
}
```

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Главная' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Панель управления' },
  },
  {
    path: '/users/:id',
    name: 'user-detail',
    component: () => import('@/views/UserDetailView.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
```

---

### Navigation Guards

```typescript
// src/router/guards.ts
import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'

export function setupGuards(router: Router): void {
  router.beforeEach((to, _from) => {
    const userStore = useUserStore()

    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.roles && !to.meta.roles.some(role => userStore.currentUser?.role === role)) {
      return { name: 'forbidden' }
    }

    if (to.meta.title) {
      document.title = `${to.meta.title} — MyApp`
    }
  })
}
```

```typescript
// src/main.ts
import { router } from '@/router'
import { setupGuards } from '@/router/guards'

setupGuards(router)
```

---

### Lazy loading

Все страницы-компоненты (`views`) загружайте лениво через динамический импорт — это уменьшает размер начального бандла:

```typescript
// Правильно — все views через dynamic import
{
  path: '/settings',
  component: () => import('@/views/SettingsView.vue'),
}

// Можно группировать чанки с помощью webpackChunkName / rollupChunkName
{
  path: '/admin',
  component: () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminView.vue'),
}
```

---

## 5. API-интеграция

### Типизированный API-клиент

Создайте базовый клиент с обработкой ошибок и типизацией:

```typescript
// src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL as string

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      data,
    )
  }

  return response.json() as Promise<TResponse>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

---

### Интерфейсы для request/response

```typescript
// src/api/types.ts
export interface PaginationParams {
  page?: number
  perPage?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}

// src/api/user.ts
import type { User } from '@/types'
import type { PaginationParams, PaginatedResponse } from './types'
import { apiClient } from './client'

interface CreateUserRequest {
  name: string
  email: string
  role: 'admin' | 'user'
}

interface UpdateUserRequest {
  name?: string
  email?: string
}

export const userApi = {
  getAll: (params?: PaginationParams): Promise<PaginatedResponse<User>> =>
    apiClient.get(`/users?page=${params?.page ?? 1}&per_page=${params?.perPage ?? 20}`),

  getById: (id: number): Promise<User> =>
    apiClient.get(`/users/${id}`),

  create: (data: CreateUserRequest): Promise<User> =>
    apiClient.post('/users', data),

  update: (id: number, data: UpdateUserRequest): Promise<User> =>
    apiClient.patch(`/users/${id}`, data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/users/${id}`),
}
```

---

### Composable useApi

```typescript
// src/composables/useApi.ts
import { ref } from 'vue'

interface UseApiReturn<T> {
  data: Ref<T | null>
  error: Ref<string | null>
  isLoading: Ref<boolean>
  execute: (...args: Parameters<() => Promise<T>>) => Promise<void>
}

export function useApi<T>(apiFn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const isLoading = ref(false)

  async function execute(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      data.value = await apiFn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Неизвестная ошибка'
    } finally {
      isLoading.value = false
    }
  }

  return { data, error, isLoading, execute }
}
```

```vue
<!-- Использование в компоненте -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { userApi } from '@/api/user'

const { data: users, error, isLoading, execute: fetchUsers } = useApi(() =>
  userApi.getAll()
)

onMounted(fetchUsers)
</script>

<template>
  <div v-if="isLoading">Загрузка...</div>
  <div v-else-if="error">{{ error }}</div>
  <ul v-else>
    <li v-for="user in users?.data" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

---

## 6. Структура компонентов

### Порядок секций в SFC

Строго соблюдайте порядок секций в Single File Component:

1. `<script setup lang="ts">`
2. `<template>`
3. `<style scoped>`

```vue
<script setup lang="ts">
// Код компонента
</script>

<template>
  <!-- Разметка -->
</template>

<style scoped>
/* Стили */
</style>
```

---

### Порядок внутри `<script setup>`

Соблюдайте единый порядок для удобства навигации:

```vue
<script setup lang="ts">
// 1. Импорты (Vue, внешние библиотеки, внутренние модули)
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import type { User } from '@/types'

// 2. Типы и интерфейсы (специфичные для компонента)
interface Props {
  userId: number
  readonly?: boolean
}

// 3. Props и emits
const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  save: [user: User]
  cancel: []
}>()

// 4. Composables и store
const router = useRouter()
const userStore = useUserStore()

// 5. Реактивное состояние
const user = ref<User | null>(null)
const isLoading = ref(false)
const formData = reactive({ name: '', email: '' })

// 6. Computed
const isFormValid = computed(() =>
  formData.name.trim().length > 0 && formData.email.includes('@')
)

// 7. Watch
watch(
  () => props.userId,
  (newId) => loadUser(newId),
  { immediate: true }
)

// 8. Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 9. Methods
async function loadUser(id: number): Promise<void> {
  isLoading.value = true
  try {
    user.value = await userApi.getById(id)
    formData.name = user.value.name
    formData.email = user.value.email
  } finally {
    isLoading.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel')
  }
}

async function handleSave(): Promise<void> {
  if (!isFormValid.value || !user.value) return
  const updated = await userApi.update(user.value.id, formData)
  emit('save', updated)
}
</script>
```

---

### Именование компонентов

- Имена компонентов в файловой системе — **PascalCase**: `UserCard.vue`, `BaseButton.vue`, `AppHeader.vue`
- В `<template>` — предпочтительно **PascalCase** (но допустим kebab-case): `<UserCard />`, `<BaseButton />`
- Базовые/общие компоненты — с префиксом `Base` или `App`: `BaseInput`, `BaseModal`, `AppLogo`
- Компоненты-страницы — с суффиксом `View`: `HomeView.vue`, `UserDetailView.vue`

```vue
<template>
  <AppHeader />
  <main>
    <UserCard :user="user" @edit="handleEdit" />
    <BaseButton variant="primary" @click="handleSave">
      Сохранить
    </BaseButton>
  </main>
</template>
```

---

## 7. Общие рекомендации

### Форматирование

- **2 пробела** для отступов в `.ts`, `.vue` файлах — никаких табуляций
- Максимальная длина строки — **120 символов**
- Настройте ESLint + Prettier для автоматического форматирования

---

### Объявление переменных

- **`const` по умолчанию** — используйте `const`, если значение не переприсваивается
- **`let`** — только если переменная будет изменена
- **Никогда `var`** — `var` не используется

```typescript
// Плохо
var users = []
let API_URL = 'https://api.example.com'

// Хорошо
const API_URL = 'https://api.example.com'
const users: User[] = []
let currentPage = 1 // изменяется при пагинации
```

---

### Стрелочные функции

Предпочитайте стрелочные функции для коллбеков и коротких функций:

```typescript
// Плохо
const doubled = numbers.map(function(n) { return n * 2 })

// Хорошо
const doubled = numbers.map(n => n * 2)

// Для функций-методов и именованных функций — обычное объявление
function fetchData(): Promise<void> {
  // ...
}
```

---

### Template literals

Используйте шаблонные строки вместо конкатенации:

```typescript
// Плохо
const message = 'Привет, ' + user.name + '! У вас ' + count + ' сообщений.'
const url = '/api/users/' + id + '/posts'

// Хорошо
const message = `Привет, ${user.name}! У вас ${count} сообщений.`
const url = `/api/users/${id}/posts`
```

---

### Optional chaining и Nullish coalescing

```typescript
// Optional chaining — вместо цепочек проверок на null/undefined
const city = user?.address?.city
const firstTag = article?.tags?.[0]
user?.save()

// Nullish coalescing — значение по умолчанию только для null/undefined
const name = user.name ?? 'Аноним'
const timeout = config.timeout ?? 5000

// Комбинирование
const label = response?.data?.label ?? 'Неизвестно'
```

---

### Строгое сравнение

Всегда используйте `===` и `!==` вместо `==` и `!=`:

```typescript
// Плохо
if (userId == '123') { ... }
if (value != null) { ... }

// Хорошо
if (userId === '123') { ... }
if (value !== null && value !== undefined) { ... }
// Или через optional chaining/nullish
if (value != null) { ... } // допустимое исключение для проверки на null/undefined
```

---

### Деструктуризация

Используйте деструктуризацию для улучшения читаемости:

```typescript
// Плохо
const name = user.name
const email = user.email
const firstName = response.data.user.firstName

// Хорошо
const { name, email } = user
const { data: { user: { firstName } } } = response

// Деструктуризация массивов
const [first, second, ...rest] = items
const [error, data] = await someOperation()

// С переименованием
const { name: userName, id: userId } = user

// В параметрах функции
function renderUser({ name, email, role }: User): string {
  return `${name} (${email}) — ${role}`
}
```

---

### Запрет eval

Никогда не используйте `eval()`, `Function()` с динамическим кодом или `setTimeout`/`setInterval` со строковым аргументом:

```typescript
// Запрещено
eval('console.log("hello")')
new Function('return ' + userInput)()
setTimeout('doSomething()', 1000)

// Правильно
setTimeout(() => doSomething(), 1000)
```

---

### Async/await

Предпочитайте `async/await` вместо цепочек `.then()/.catch()`. Всегда обрабатывайте ошибки:

```typescript
// Плохо
function loadUser(id: number) {
  return fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(data => {
      user.value = data
    })
    .catch(err => {
      console.error(err)
    })
}

// Хорошо
async function loadUser(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/users/${id}`)
    user.value = await response.json() as User
  } catch (error) {
    console.error('Не удалось загрузить пользователя:', error)
  }
}
```

---

### Не замалчивайте ошибки

```typescript
// Плохо — ошибка проглочена молча
try {
  await loadData()
} catch {
  // ничего
}

// Хорошо — ошибка обрабатывается явно
try {
  await loadData()
} catch (error) {
  logger.error('loadData failed', { error })
  showNotification('Не удалось загрузить данные', 'error')
}
```
