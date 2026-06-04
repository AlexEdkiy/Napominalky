<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import ItemRow from '@/components/lists/ItemRow.vue'
import ProgressBar from '@/components/lists/ProgressBar.vue'
import { useShoppingListItems } from '@/composables/useShoppingListItems'
import type { ShoppingCategory, ShoppingListItem } from '@/types/shoppingList'

interface CategoryGroup {
  category: ShoppingCategory
  label: string
  items: ShoppingListItem[]
}

const route = useRoute()
const listUuid = route.params.uuid as string

const { items, isLoading, error, totalCount, checkedCount, load, add, remove, check } =
  useShoppingListItems(listUuid)

const newName = ref('')
const newCategory = ref<ShoppingCategory>('products')

const categoryOptions: { value: ShoppingCategory; label: string }[] = [
  { value: 'products', label: 'Продукты' },
  { value: 'household', label: 'Хозтовары' },
  { value: 'pharmacy', label: 'Аптека' },
  { value: 'other', label: 'Другое' },
]

const groups = computed<CategoryGroup[]>(() => {
  const byCategory = new Map<ShoppingCategory, CategoryGroup>()
  for (const item of items.value) {
    const group = byCategory.get(item.category)
    if (group) {
      group.items.push(item)
    } else {
      byCategory.set(item.category, {
        category: item.category,
        label: item.category_label,
        items: [item],
      })
    }
  }
  return [...byCategory.values()]
})

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

onMounted(() => load())
</script>

<template>
  <main class="detail">
    <header class="detail__header">
      <h1>Список покупок</h1>
      <ProgressBar :value="checkedCount" :max="totalCount" />
    </header>

    <form class="detail__add" @submit.prevent="handleAdd">
      <div class="field">
        <label for="item-name">Товар</label>
        <input id="item-name" v-model="newName" type="text" placeholder="Например, Молоко" />
      </div>
      <div class="field">
        <label for="item-category">Категория</label>
        <select id="item-category" v-model="newCategory">
          <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <button type="submit">Добавить</button>
    </form>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="isLoading">Загрузка…</p>
    <p v-else-if="items.length === 0" class="empty">Товаров пока нет.</p>

    <section v-else class="detail__groups">
      <div v-for="group in groups" :key="group.category" class="detail__group">
        <h2 class="detail__group-title">{{ group.label }}</h2>
        <ul class="detail__items">
          <ItemRow
            v-for="item in group.items"
            :key="item.uuid"
            :item="item"
            @check="handleCheck"
            @remove="handleRemove"
          />
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.detail {
  max-width: 720px;
  margin: 0 auto;
}

.detail__add {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  margin: 1rem 0;
}

.field {
  display: flex;
  flex-direction: column;
}

.detail__group-title {
  font-size: 0.95rem;
  color: #444;
  margin: 1rem 0 0.25rem;
}

.detail__items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.error {
  color: #c0392b;
}

.empty {
  color: #777;
}
</style>
