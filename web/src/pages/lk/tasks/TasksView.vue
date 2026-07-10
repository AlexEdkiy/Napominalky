<script setup lang="ts">
import { onMounted, watch } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkTaskTableRow from '@/components/lk/tasks/LkTaskTableRow.vue'
import LkTasksRightRail from '@/components/lk/tasks/LkTasksRightRail.vue'
import { useLkForms } from '@/composables/useLkForms'
import { useLkTasksTable } from '@/composables/useLkTasksTable'
import { useLkWideDesktop } from '@/composables/useLkBreakpoint'
import type { LkTasksSortKey, LkTasksTab } from '@/composables/useLkTasksTable'
import type { ShoppingList } from '@/types/shoppingList'

const TABS: { value: LkTasksTab; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
]

const COLUMNS: { key: LkTasksSortKey; label: string }[] = [
  { key: 'title', label: 'Задача' },
  { key: 'tags', label: 'Теги' },
  { key: 'date', label: 'Дата' },
  { key: 'reminder', label: 'Напоминание' },
]

const { isWideDesktop } = useLkWideDesktop()
const { openTaskForm, tasksVersion } = useLkForms()
const {
  lists,
  visibleLists,
  isLoading,
  error,
  hasMore,
  tab,
  sortKey,
  sortAsc,
  derivedFor,
  toggleSort,
  reload,
  loadNextPage,
  toggleCompleted,
} = useLkTasksTable()

function handleOpen(list: ShoppingList): void {
  openTaskForm(list)
}

async function handleToggleCompleted(list: ShoppingList): Promise<void> {
  await toggleCompleted(list)
}

// Модалка «Задача/список» рендерится в `LkLayout`, а не здесь — при
// успешном создании/изменении/удалении (см. `notifyTaskSaved`)
// перезагружаем таблицу.
watch(tasksVersion, () => void reload())

onMounted(() => reload())
</script>

<template>
  <section class="tasks-view">
    <div class="tasks-view__layout">
      <div class="tasks-view__main">
        <div class="tasks-view__toolbar">
          <div class="tasks-view__tabs" role="tablist" aria-label="Фильтр задач">
            <button
              v-for="tabOption in TABS"
              :key="tabOption.value"
              type="button"
              role="tab"
              class="tasks-view__tab"
              :class="{ 'tasks-view__tab--active': tab === tabOption.value }"
              :aria-selected="tab === tabOption.value"
              @click="tab = tabOption.value"
            >
              {{ tabOption.label }}
            </button>
          </div>

          <button type="button" class="tasks-view__create-btn" @click="openTaskForm()">
            <LkIcon name="plus" :size="16" />
            Новая задача
          </button>
        </div>

        <p v-if="isLoading && lists.length === 0" class="tasks-view__state" aria-live="polite">Загрузка…</p>
        <p v-else-if="error" class="tasks-view__state tasks-view__state--error" role="alert">{{ error }}</p>

        <div v-else class="tasks-view__card">
          <table class="tasks-view__table">
            <thead>
              <tr>
                <th v-for="column in COLUMNS" :key="column.key" class="tasks-view__th" scope="col">
                  <button
                    type="button"
                    class="tasks-view__sort"
                    :class="{ 'tasks-view__sort--active': sortKey === column.key }"
                    @click="toggleSort(column.key)"
                  >
                    {{ column.label }}
                    <span class="tasks-view__sort-arrow" aria-hidden="true">
                      {{ sortKey === column.key && !sortAsc ? '↓' : '↑' }}
                    </span>
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="visibleLists.length === 0">
                <td class="tasks-view__empty-cell" colspan="4">
                  <template v-if="lists.length === 0">
                    Пока нет задач.
                    <button type="button" class="tasks-view__empty-cta" @click="openTaskForm()">
                      Создать первую задачу
                    </button>
                  </template>
                  <template v-else>На этой вкладке пусто.</template>
                </td>
              </tr>

              <LkTaskTableRow
                v-for="list in visibleLists"
                :key="list.uuid"
                :list="list"
                :derived="derivedFor(list.uuid) ?? null"
                @open="handleOpen"
                @toggle-completed="handleToggleCompleted"
              />

              <tr class="tasks-view__add-row" @click="openTaskForm()">
                <td colspan="4">
                  <span class="tasks-view__add">
                    <LkIcon name="plus" :size="15" />
                    Добавить задачу
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button v-if="hasMore && !error" type="button" class="tasks-view__load-more" @click="loadNextPage">
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tasks-view__tabs {
  display: flex;
  gap: 6px;
  background: #fff;
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.tasks-view__tab {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5a625e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tasks-view__tab--active {
  background: #1f2622;
  color: #fff;
}

.tasks-view__create-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: #17897a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(23, 137, 122, 0.35);
}

.tasks-view__create-btn:hover {
  background: #136f63;
}

.tasks-view__state {
  padding: 2rem 0;
  color: #6b716e;
}

.tasks-view__state--error {
  color: #cf5b4a;
}

.tasks-view__card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.tasks-view__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.tasks-view__th {
  text-align: left;
  padding: 12px 16px 8px;
}

.tasks-view__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa39f;
  cursor: pointer;
}

.tasks-view__sort--active {
  color: #17897a;
}

.tasks-view__sort-arrow {
  opacity: 0.35;
}

.tasks-view__sort--active .tasks-view__sort-arrow {
  opacity: 1;
}

.tasks-view__empty-cell {
  padding: 2rem 16px;
  color: #6b716e;
  border-top: 1px solid #eef1f0;
}

.tasks-view__empty-cta {
  margin-left: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 10px;
  border: none;
  background: #17897a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.tasks-view__add-row {
  cursor: pointer;
}

.tasks-view__add-row td {
  padding: 12px 16px;
  border-top: 1px dashed #d9dedb;
}

.tasks-view__add {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8a938f;
  font-weight: 700;
  font-size: 13.5px;
}

.tasks-view__add-row:hover .tasks-view__add {
  color: #17897a;
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

  .tasks-view__tabs {
    justify-content: stretch;
  }

  .tasks-view__tab {
    flex: 1;
  }
}
</style>
