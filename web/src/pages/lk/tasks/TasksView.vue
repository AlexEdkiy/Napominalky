<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkShoppingListCard from '@/components/lk/tasks/LkShoppingListCard.vue'
import LkTasksFilterBar from '@/components/lk/tasks/LkTasksFilterBar.vue'
import LkTasksRightRail from '@/components/lk/tasks/LkTasksRightRail.vue'
import { useLkTasksList } from '@/composables/useLkTasksList'
import { useLkWideDesktop } from '@/composables/useLkBreakpoint'

const router = useRouter()
const { isWideDesktop } = useLkWideDesktop()
const {
  lists,
  filteredLists,
  isLoading,
  error,
  hasMore,
  searchQuery,
  sortBy,
  filterBy,
  load,
  loadMore,
  create,
  update,
  remove,
} = useLkTasksList()

const isCreating = ref(false)
const newListTitle = ref('')

function openCreateForm(): void {
  isCreating.value = true
}

function cancelCreate(): void {
  isCreating.value = false
  newListTitle.value = ''
}

async function handleCreate(): Promise<void> {
  const title = newListTitle.value.trim()
  if (!title) {
    return
  }
  const created = await create({ title })
  if (created) {
    cancelCreate()
  }
}

function handleOpen(uuid: string): void {
  void router.push({ name: 'lk-list-detail', params: { uuid } })
}

async function handleRename(uuid: string, title: string): Promise<void> {
  await update(uuid, { title })
}

async function handleRemove(uuid: string): Promise<void> {
  if (!window.confirm('Удалить список безвозвратно?')) {
    return
  }
  await remove(uuid)
}

onMounted(() => load())
</script>

<template>
  <section class="tasks-view">
    <div class="tasks-view__layout">
      <div class="tasks-view__main">
        <div class="tasks-view__toolbar">
          <LkTasksFilterBar v-model:search="searchQuery" v-model:sort="sortBy" v-model:filter="filterBy" />
          <button type="button" class="tasks-view__create-btn" @click="openCreateForm">
            <LkIcon name="plus" :size="16" />
            Новый список
          </button>
        </div>

        <form v-if="isCreating" class="tasks-view__create-form" @submit.prevent="handleCreate">
          <input
            v-model="newListTitle"
            type="text"
            placeholder="Название списка, например «Продукты»"
            aria-label="Название нового списка"
            autofocus
          />
          <button type="submit">Создать</button>
          <button type="button" class="tasks-view__create-cancel" @click="cancelCreate">Отмена</button>
        </form>

        <p v-if="isLoading && lists.length === 0" class="tasks-view__state" aria-live="polite">Загрузка…</p>
        <p v-else-if="error" class="tasks-view__state tasks-view__state--error" role="alert">{{ error }}</p>

        <template v-else-if="filteredLists.length === 0">
          <p v-if="lists.length === 0" class="tasks-view__empty">
            Пока нет списков.
            <button type="button" class="tasks-view__empty-cta" @click="openCreateForm">
              Создать первый список
            </button>
          </p>
          <p v-else class="tasks-view__empty">Ничего не найдено по заданным фильтрам.</p>
        </template>

        <div v-else class="tasks-view__grid">
          <LkShoppingListCard
            v-for="list in filteredLists"
            :key="list.uuid"
            :list="list"
            @open="handleOpen"
            @rename="handleRename"
            @remove="handleRemove"
          />
        </div>

        <button v-if="hasMore" type="button" class="tasks-view__load-more" @click="loadMore">
          Загрузить ещё
        </button>
      </div>

      <LkTasksRightRail v-if="isWideDesktop" class="tasks-view__rail" />
    </div>
  </section>
</template>

<style scoped>
.tasks-view {
  max-width: 1240px;
  margin: 0 auto;
}

.tasks-view__layout {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.tasks-view__main {
  flex: 1;
  min-width: 0;
}

.tasks-view__toolbar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.tasks-view__create-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #e9a63c;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.tasks-view__create-btn:hover {
  background: #d99a3e;
}

.tasks-view__create-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tasks-view__create-form input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
  font-size: 0.9rem;
}

.tasks-view__create-form button {
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.tasks-view__create-form button[type='submit'] {
  background: #17897a;
  color: #fff;
}

.tasks-view__create-cancel {
  background: #eef1f0;
  color: #6b716e;
}

.tasks-view__state {
  padding: 2rem 0;
  color: #6b716e;
}

.tasks-view__state--error {
  color: #cf5b4a;
}

.tasks-view__empty {
  padding: 2rem 0;
  color: #6b716e;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}

.tasks-view__empty-cta {
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.tasks-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
}

.tasks-view__load-more {
  display: block;
  margin: 1.25rem auto 0;
  padding: 0.5rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: #fff;
  color: #17897a;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.tasks-view__rail {
  position: sticky;
  top: 0;
}

@media (max-width: 900px) {
  .tasks-view__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tasks-view__grid {
    grid-template-columns: 1fr;
  }
}
</style>
