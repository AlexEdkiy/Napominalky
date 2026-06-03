<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import NoteCard from '@/components/notes/NoteCard.vue'
import { useNotes } from '@/composables/useNotes'
import type { NoteListParams } from '@/types/note'

const router = useRouter()
const { notes, isLoading, error, load } = useNotes()

const search = ref('')
const showArchived = ref(false)

async function refresh(): Promise<void> {
  const params: NoteListParams = { archived: showArchived.value }
  const trimmed = search.value.trim()
  if (trimmed) {
    params.search = trimmed
  }
  await load(params)
}

function handleCreate(): void {
  void router.push({ name: 'lk-note-create' })
}

function handleOpen(uuid: string): void {
  void router.push({ name: 'lk-note-edit', params: { uuid } })
}

onMounted(refresh)
</script>

<template>
  <main class="notes">
    <header class="notes__header">
      <h1>Заметки</h1>
      <button type="button" @click="handleCreate">Создать</button>
    </header>

    <form class="notes__filters" @submit.prevent="refresh">
      <div class="field">
        <label for="note-search">Поиск</label>
        <input id="note-search" v-model="search" type="search" placeholder="Поиск по заметкам" />
      </div>
      <label class="checkbox">
        <input v-model="showArchived" type="checkbox" @change="refresh" />
        Показывать архив
      </label>
      <button type="submit">Найти</button>
    </form>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="isLoading">Загрузка…</p>
    <p v-else-if="notes.length === 0" class="empty">Заметок пока нет.</p>

    <section v-else class="notes__list">
      <NoteCard v-for="note in notes" :key="note.uuid" :note="note" @open="handleOpen" />
    </section>
  </main>
</template>

<style scoped>
.notes {
  max-width: 720px;
  margin: 0 auto;
}

.notes__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notes__filters {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  margin: 1rem 0;
}

.field {
  display: flex;
  flex-direction: column;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.error {
  color: #c0392b;
}

.empty {
  color: #777;
}
</style>
