<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'
import type { LkTasksFilterBy, LkTasksSortBy } from '@/composables/useLkTasksList'

const search = defineModel<string>('search', { required: true })
const sort = defineModel<LkTasksSortBy>('sort', { required: true })
const filter = defineModel<LkTasksFilterBy>('filter', { required: true })
</script>

<template>
  <div class="lk-tasks-filter-bar">
    <label class="lk-tasks-filter-bar__search">
      <LkIcon name="search" :size="16" />
      <input
        v-model="search"
        type="search"
        placeholder="Поиск по названию"
        aria-label="Поиск по названию списков"
      />
    </label>

    <select v-model="sort" class="lk-tasks-filter-bar__select" aria-label="Сортировка списков">
      <option value="updatedAt">По дате обновления</option>
      <option value="title">По названию</option>
      <option value="progress">По прогрессу</option>
    </select>

    <select v-model="filter" class="lk-tasks-filter-bar__select" aria-label="Фильтр списков">
      <option value="all">Все</option>
      <option value="active">Есть незавершённые</option>
      <option value="completed">Завершённые</option>
    </select>
  </div>
</template>

<style scoped>
.lk-tasks-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.lk-tasks-filter-bar__search {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  color: #8a938f;
}

.lk-tasks-filter-bar__search input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 0.85rem;
  color: #1f2622;
}

.lk-tasks-filter-bar__select {
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: none;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  color: #1f2622;
  font-size: 0.85rem;
}
</style>
