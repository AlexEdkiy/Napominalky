<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'

const search = defineModel<string>('search', { required: true })
const archived = defineModel<boolean>('archived', { required: true })

defineEmits<{ create: [] }>()
</script>

<template>
  <div class="lk-notes-toolbar">
    <label class="lk-notes-toolbar__search">
      <LkIcon name="search" :size="16" />
      <input v-model="search" type="search" placeholder="Поиск по заметкам" aria-label="Поиск по заметкам" />
    </label>

    <div class="lk-notes-toolbar__switch" role="group" aria-label="Фильтр по архиву">
      <button
        type="button"
        class="lk-notes-toolbar__switch-btn"
        :class="{ 'lk-notes-toolbar__switch-btn--active': !archived }"
        :aria-pressed="!archived"
        @click="archived = false"
      >
        Активные
      </button>
      <button
        type="button"
        class="lk-notes-toolbar__switch-btn"
        :class="{ 'lk-notes-toolbar__switch-btn--active': archived }"
        :aria-pressed="archived"
        @click="archived = true"
      >
        Архив
      </button>
    </div>

    <button type="button" class="lk-notes-toolbar__create" @click="$emit('create')">
      <LkIcon name="plus" :size="16" />
      Новая заметка
    </button>
  </div>
</template>

<style scoped>
.lk-notes-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}

.lk-notes-toolbar__search {
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

.lk-notes-toolbar__search input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 0.85rem;
  color: #1f2622;
}

.lk-notes-toolbar__switch {
  display: flex;
  padding: 0.2rem;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.lk-notes-toolbar__switch-btn {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 8px;
  background: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b716e;
  cursor: pointer;
  white-space: nowrap;
}

.lk-notes-toolbar__switch-btn--active {
  background: #d8ebe4;
  color: #17897a;
}

.lk-notes-toolbar__create {
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

.lk-notes-toolbar__create:hover {
  background: #d99a3e;
}

@media (max-width: 640px) {
  .lk-notes-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
