<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkListItemRow from '@/components/lk/tasks/LkListItemRow.vue'
import { useLkForms } from '@/composables/useLkForms'
import { useSetLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { useShoppingList } from '@/composables/useShoppingList'
import { useShoppingListItems } from '@/composables/useShoppingListItems'
import type { ShoppingCategory, ShoppingListItem } from '@/types/shoppingList'
import { shoppingListAccent, shoppingListProgressPercent } from '@/utils/shoppingList'

interface CategoryGroup {
  category: ShoppingCategory
  label: string
  items: ShoppingListItem[]
}

const route = useRoute()
// Геттер, а не снимок: при навигации lk-list-detail → lk-list-detail с другим
// uuid Vue переиспользует компонент (setup не выполняется заново) — композаблы
// должны читать АКТУАЛЬНЫЙ uuid маршрута при каждом вызове своих методов.
const listUuid = (): string => route.params.uuid as string
const { openTaskForm, tasksVersion } = useLkForms()

const { list, isLoading: isListLoading, error: listError, load: loadList } = useShoppingList(listUuid)
const {
  items,
  isLoading: isItemsLoading,
  error: itemsError,
  totalCount,
  checkedCount,
  load: loadItems,
  add,
  remove,
  check,
} = useShoppingListItems(listUuid)

const newName = ref('')
const newCategory = ref<ShoppingCategory>('products')

const categoryOptions: { value: ShoppingCategory; label: string }[] = [
  { value: 'products', label: 'Продукты' },
  { value: 'household', label: 'Хозтовары' },
  { value: 'pharmacy', label: 'Аптека' },
  { value: 'other', label: 'Другое' },
]

const isLoading = computed<boolean>(() => isListLoading.value || isItemsLoading.value)
const error = computed<string | null>(() => listError.value ?? itemsError.value)
const progressPercent = computed<number>(() =>
  list.value ? shoppingListProgressPercent(list.value) : 0,
)
// Акцент формы (прогресс-бар, чекбоксы, кнопка добавления) — по типу списка:
// покупки (goods) — teal, задачи (tasks) — amber (см. utils/shoppingList.ts).
const accent = computed(() => shoppingListAccent(list.value?.type ?? 'goods'))

const groups = computed<CategoryGroup[]>(() => {
  const byCategory = new Map<ShoppingCategory, CategoryGroup>()
  for (const item of items.value) {
    const group = byCategory.get(item.category)
    if (group) {
      group.items.push(item)
    } else {
      byCategory.set(item.category, { category: item.category, label: item.category_label, items: [item] })
    }
  }
  return [...byCategory.values()]
})

// Хлебные крошки («Главная / Задачи и списки / {Название}») читают
// название списка отсюда — из уже загруженной сущности, без лишних запросов.
useSetLkBreadcrumbTail(() => list.value?.title ?? null)

async function handleAdd(): Promise<void> {
  const name = newName.value.trim()
  if (!name) {
    return
  }
  const item = await add({ name, category: newCategory.value })
  if (item) {
    newName.value = ''
  }
}

async function handleCheck(uuid: string, isChecked: boolean): Promise<void> {
  await check(uuid, isChecked)
}

async function handleRemove(uuid: string): Promise<void> {
  await remove(uuid)
}

function handleEditList(): void {
  if (list.value) {
    openTaskForm(list.value)
  }
}

// Модалка «Задача/список» рендерится в `LkLayout`, а не здесь — перезагружаем
// список после успешного сохранения через неё (название/тип/теги могли
// измениться, см. `notifyTaskSaved`).
watch(tasksVersion, () => void loadList())

// Смена uuid в рамках того же маршрута (создали список, находясь на детали
// другого) — компонент переиспользуется, перезагружаем данные под новый uuid
// и сбрасываем форму добавления пункта. Guard по типу: при уходе с маршрута
// uuid становится undefined — перезагрузка не нужна.
watch(
  () => route.params.uuid,
  (uuid) => {
    if (typeof uuid !== 'string') {
      return
    }
    newName.value = ''
    newCategory.value = 'products'
    void loadList()
    void loadItems()
  },
  { flush: 'post' },
)

onMounted(() => {
  void loadList()
  void loadItems()
})
</script>

<template>
  <section class="list-detail">
    <p v-if="isLoading" class="list-detail__state" aria-live="polite">Загрузка…</p>
    <p v-else-if="error" class="list-detail__state list-detail__state--error" role="alert">{{ error }}</p>

    <template v-else>
      <header class="list-detail__header">
        <div class="list-detail__title-row">
          <h1 class="list-detail__title">{{ list?.title ?? 'Список покупок' }}</h1>
          <button
            type="button"
            class="list-detail__edit"
            aria-label="Редактировать список"
            @click="handleEditList"
          >
            <LkIcon name="edit" :size="16" />
          </button>
        </div>
        <div class="list-detail__progress">
          <div class="list-detail__progress-track">
            <div
              class="list-detail__progress-fill"
              :style="{ width: `${progressPercent}%`, background: accent.color }"
            />
          </div>
          <span class="list-detail__progress-label">{{ checkedCount }} / {{ totalCount }}</span>
        </div>
      </header>

      <form class="list-detail__add" @submit.prevent="handleAdd">
        <input
          v-model="newName"
          type="text"
          placeholder="Например, Молоко"
          aria-label="Название нового пункта"
        />
        <select v-model="newCategory" aria-label="Категория пункта">
          <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button type="submit" :style="{ background: accent.color }">Добавить</button>
      </form>

      <p v-if="items.length === 0" class="list-detail__empty">В списке пока нет пунктов.</p>

      <div v-else class="list-detail__groups">
        <div v-for="group in groups" :key="group.category" class="list-detail__group">
          <h2 class="list-detail__group-title">{{ group.label }}</h2>
          <ul class="list-detail__items">
            <LkListItemRow
              v-for="item in group.items"
              :key="item.uuid"
              :item="item"
              :accent-color="accent.color"
              @check="handleCheck"
              @remove="handleRemove"
            />
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.list-detail {
  max-width: 720px;
  margin: 0 auto;
}

.list-detail__state {
  padding: 2rem 0;
  color: #6b716e;
}

.list-detail__state--error {
  color: #cf5b4a;
}

.list-detail__header {
  background: #fff;
  border-radius: 18px;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
}

.list-detail__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.list-detail__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2622;
}

.list-detail__edit {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #eef1f0;
  color: #6b716e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.list-detail__edit:hover {
  background: #d8ebe4;
  color: #17897a;
}

.list-detail__progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.list-detail__progress-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: #eef1f0;
  overflow: hidden;
}

.list-detail__progress-fill {
  height: 100%;
  background: #17897a;
  transition: width 0.2s ease;
}

.list-detail__progress-label {
  font-size: 0.8rem;
  color: #8a938f;
  white-space: nowrap;
}

.list-detail__add {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.list-detail__add input,
.list-detail__add select {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
  font-size: 0.9rem;
}

.list-detail__add input {
  flex: 1;
}

.list-detail__add button {
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.list-detail__empty {
  color: #8a938f;
  padding: 1rem 0;
}

.list-detail__group {
  background: #fff;
  border-radius: 18px;
  padding: 0.5rem 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 0.85rem;
}

.list-detail__group-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b716e;
  margin: 0.75rem 0 0.25rem;
}

.list-detail__items {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
