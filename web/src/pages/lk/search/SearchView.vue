<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { searchApi } from '@/api/searchApi'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import LkSearchForm from '@/components/lk/LkSearchForm.vue'
import { useLkForms } from '@/composables/useLkForms'
import { useAuthStore } from '@/stores/authStore'
import type { SearchResult, SearchType } from '@/types/search'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const forms = useLkForms()
const filters: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'Все' }, { value: 'list', label: 'Задачи и покупки' },
  { value: 'item', label: 'Пункты' }, { value: 'note', label: 'Заметки' },
  { value: 'reminder', label: 'Напоминания' },
]
const query = computed(() => typeof route.query.q === 'string' ? route.query.q.trim() : '')
const type = computed<SearchType>(() => filters.find(f => f.value === route.query.type)?.value ?? 'all')
const page = computed(() => {
  const value = typeof route.query.page === 'string' ? Number(route.query.page) : 1
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const validQuery = computed(() => Array.from(query.value).length >= 2 && Array.from(query.value).length <= 200)
const results = ref<SearchResult[]>([])
const total = ref(0)
const lastPage = ref(1)
const loading = ref(false)
const error = ref('')
const openError = ref('')
const opening = ref<string | null>(null)
let sequence = 0
let openSequence = 0
let controller: AbortController | null = null

async function navigate(q: string, filter: SearchType = type.value, targetPage = 1): Promise<void> {
  if (q === query.value && filter === type.value && targetPage === page.value) {
    await load()
    return
  }
  await router.push({ name: 'lk-search', query: {
    ...(q ? { q } : {}), ...(filter !== 'all' ? { type: filter } : {}),
    ...(targetPage > 1 ? { page: String(targetPage) } : {}),
  } })
}

async function load(): Promise<void> {
  const current = ++sequence
  ++openSequence
  controller?.abort()
  results.value = []
  total.value = 0
  lastPage.value = 1
  error.value = ''
  openError.value = ''
  opening.value = null
  loading.value = false
  if (!validQuery.value || !auth.token) return
  controller = new AbortController()
  loading.value = true
  try {
    const response = await searchApi.search({ q: query.value, type: type.value, page: page.value }, controller.signal)
    if (current !== sequence) return
    results.value = response.data
    total.value = response.meta.total
    lastPage.value = response.meta.last_page
  } catch {
    if (current === sequence) error.value = 'Не удалось выполнить поиск. Попробуйте ещё раз.'
  } finally {
    if (current === sequence) loading.value = false
  }
}

watch([query, type, page, () => auth.token, forms.tasksVersion, forms.notesVersion, forms.remindersVersion], () => { void load() }, { immediate: true })
onBeforeUnmount(() => { ++sequence; ++openSequence; controller?.abort() })

async function openResult(result: SearchResult): Promise<void> {
  const current = ++openSequence
  const token = auth.token
  const isCurrent = () => current === openSequence && token === auth.token
  opening.value = `${result.type}:${result.uuid}`
  openError.value = ''
  try {
    if (result.type === 'note') {
      const note = await notesApi.fetchNote(result.uuid)
      if (isCurrent()) forms.openNoteForm(note)
    } else if (result.type === 'reminder') {
      const reminder = await remindersApi.fetchReminder(result.uuid)
      if (isCurrent()) forms.openReminderForm(reminder)
    } else {
      const uuid = result.type === 'item' ? result.list_uuid : result.uuid
      if (!uuid) throw new Error('Missing parent list')
      const list = await shoppingListsApi.fetchList(uuid)
      if (isCurrent()) forms.openTaskForm(list, result.type === 'item' ? result.uuid : undefined)
    }
  } catch {
    if (isCurrent()) openError.value = 'Не удалось открыть запись. Возможно, она удалена. Обновите результаты и попробуйте снова.'
  } finally {
    if (isCurrent()) opening.value = null
  }
}

function label(result: SearchResult): string {
  if (result.type === 'list') return result.list_type === 'tasks' ? 'Задача' : 'Покупки'
  if (result.type === 'item') return result.list_type === 'tasks' ? 'Пункт задачи' : 'Пункт покупок'
  return result.type === 'note' ? 'Заметка' : 'Напоминание'
}

function highlight(text: string): { text: string; match: boolean }[] {
  if (!query.value) return [{ text, match: false }]
  const literal = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${literal})`, 'gi')).map((part, index) => ({ text: part, match: index % 2 === 1 }))
}
</script>

<template>
  <section class="lk-search" aria-label="Результаты поиска">
    <div class="lk-search__controls">
      <LkSearchForm :query="query" label="Поисковый запрос" @search="navigate($event)" />
      <label class="lk-search__filter">Где искать
        <select :value="type" aria-label="Где искать" @change="navigate(query, ($event.target as HTMLSelectElement).value as SearchType)">
          <option v-for="filter in filters" :key="filter.value" :value="filter.value">{{ filter.label }}</option>
        </select>
      </label>
    </div>

    <p v-if="!query" class="lk-search__message">Введите название или текст — найдём задачи, покупки, их пункты, заметки и напоминания.</p>
    <p v-else-if="!validQuery" class="lk-search__message">Введите от 2 до 200 символов.</p>
    <p v-else-if="loading" role="status" class="lk-search__message">Ищем…</p>
    <div v-else-if="error" role="alert" class="lk-search__message">
      <p>{{ error }}</p><button type="button" class="lk-search__action" @click="load">Повторить поиск</button>
    </div>
    <template v-else>
      <p role="status" class="lk-search__summary">Найдено: {{ total }} <span v-if="total > 0">· Страница {{ page }} из {{ lastPage }}</span></p>
      <p v-if="!results.length" class="lk-search__message">{{ total ? 'На этой странице результатов нет.' : 'Ничего не найдено. Попробуйте другое слово или выберите «Все».' }}</p>
      <div v-if="openError" role="alert" class="lk-search__message"><p>{{ openError }}</p><button type="button" class="lk-search__action" @click="load">Обновить результаты</button></div>
      <ul class="lk-search__results" :aria-busy="opening !== null">
        <li v-for="result in results" :key="`${result.type}:${result.uuid}`" class="lk-search__result">
          <div class="lk-search__meta"><span>{{ label(result) }}</span><span v-if="result.is_archived">В архиве</span><span v-if="result.is_completed">Выполнено</span></div>
          <button type="button" class="lk-search__title" :disabled="opening !== null" @click="openResult(result)">
            <template v-for="(part, index) in highlight(result.title)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>
          </button>
          <p v-if="result.list_title" class="lk-search__parent">В списке «{{ result.list_title }}»</p>
          <p v-if="result.excerpt" class="lk-search__excerpt"><template v-for="(part, index) in highlight(result.excerpt)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></p>
          <span v-if="opening === `${result.type}:${result.uuid}`" role="status">Открываем…</span>
        </li>
      </ul>
      <nav v-if="lastPage > 1 || page > 1" class="lk-search__pages" aria-label="Страницы результатов">
        <button v-if="page > lastPage" type="button" class="lk-search__action" @click="navigate(query, type, 1)">В начало</button>
        <button type="button" class="lk-search__action" :disabled="page <= 1" @click="navigate(query, type, page - 1)">Назад</button>
        <span>{{ page }} / {{ lastPage }}</span>
        <button type="button" class="lk-search__action" :disabled="page >= lastPage" @click="navigate(query, type, page + 1)">Далее</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.lk-search { max-width: 1000px; margin: 0 auto; }
.lk-search__controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 20px; background: #fff; border-radius: 18px; }
.lk-search__controls > :first-child { flex: 1; min-width: 200px; }
.lk-search__filter { display: flex; align-items: center; gap: 10px; color: #5a625e; font-size: 14px; }
.lk-search__filter select { min-width: 0; padding: 10px; border: 1px solid #cfd6d3; border-radius: 10px; background: #fff; color: #1f2622; font-size: 16px; }
.lk-search__summary { margin: 22px 4px 14px; font-weight: 700; color: #5a625e; }
.lk-search__summary span { font-weight: 400; }
.lk-search__results { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.lk-search__result { padding: 20px; border: 1px solid #e6e9e7; border-radius: 16px; background: #fff; overflow-wrap: anywhere; }
.lk-search__meta { display: flex; flex-wrap: wrap; gap: 12px; color: #65736c; font-size: 13px; margin-bottom: 8px; }
.lk-search__title { text-align: left; border: 0; background: none; padding: 0; font: inherit; font-size: 18px; font-weight: 700; color: #116e60; cursor: pointer; overflow-wrap: anywhere; }
.lk-search__title:hover { text-decoration: underline; }
.lk-search__title:disabled { opacity: .65; cursor: wait; }
.lk-search__excerpt { white-space: pre-wrap; line-height: 1.55; margin: 10px 0 0; color: #34443b; }
.lk-search__parent { color: #65736c; font-size: 13px; margin: 8px 0 0; }
.lk-search mark { color: inherit; background: #fff0bb; border-radius: 2px; }
.lk-search__message { background: #fff; padding: 24px; border-radius: 16px; line-height: 1.5; }
.lk-search__pages { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 20px; }
.lk-search__action { color: #fff; background: #17897a; padding: 10px 16px; border-radius: 10px; border: 0; cursor: pointer; }
.lk-search__action:disabled { background: #e3e9e6; color: #66736c; cursor: default; }
@media (max-width: 600px) {
  .lk-search__controls { padding: 14px; gap: 12px; }
  .lk-search__controls > :first-child { flex-basis: 100%; min-width: 0; }
  .lk-search__filter { width: 100%; }
  .lk-search__filter select { flex: 1; width: 0; }
  .lk-search__result { padding: 16px; }
}
</style>
