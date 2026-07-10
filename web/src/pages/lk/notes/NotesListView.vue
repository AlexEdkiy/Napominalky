<script setup lang="ts">
import { onMounted, watch } from 'vue'

import LkNoteCard from '@/components/lk/notes/LkNoteCard.vue'
import LkNoteSkeleton from '@/components/lk/notes/LkNoteSkeleton.vue'
import LkNotesToolbar from '@/components/lk/notes/LkNotesToolbar.vue'
import { useLkForms } from '@/composables/useLkForms'
import { useLkNotesList } from '@/composables/useLkNotesList'

const { openNoteForm, notesVersion } = useLkForms()
const {
  notes,
  pinnedNotes,
  otherNotes,
  isLoading,
  error,
  hasMore,
  searchQuery,
  showArchived,
  load,
  loadMore,
  pin,
  archive,
  remove,
} = useLkNotesList()

function handleCreate(): void {
  openNoteForm()
}

function handleOpen(uuid: string): void {
  const note = notes.value.find((candidate) => candidate.uuid === uuid)
  openNoteForm(note)
}

async function handlePin(uuid: string, isPinned: boolean): Promise<void> {
  await pin(uuid, isPinned)
}

async function handleArchive(uuid: string, isArchived: boolean): Promise<void> {
  await archive(uuid, isArchived)
}

async function handleRemove(uuid: string): Promise<void> {
  if (!window.confirm('Удалить заметку безвозвратно?')) {
    return
  }
  await remove(uuid)
}

// Модалка «Заметка» рендерится в `LkLayout`, а не здесь — перезагружаем
// после успешного сохранения/удаления через неё (см. `notifyNoteSaved`).
watch(notesVersion, () => void load())

onMounted(load)
</script>

<template>
  <section class="notes-view">
    <LkNotesToolbar v-model:search="searchQuery" v-model:archived="showArchived" @create="handleCreate" />

    <div v-if="isLoading && notes.length === 0" class="notes-view__masonry" aria-live="polite">
      <LkNoteSkeleton v-for="n in 6" :key="n" :variant="n % 2 === 0 ? 'tall' : 'short'" />
    </div>

    <div v-else-if="error" class="notes-view__state notes-view__state--error" role="alert">
      <span>{{ error }}</span>
      <button type="button" class="notes-view__retry-btn" @click="load">Повторить</button>
    </div>

    <template v-else-if="notes.length === 0">
      <p class="notes-view__empty">
        {{ showArchived ? 'В архиве пусто.' : 'Пока нет заметок.' }}
        <button v-if="!showArchived" type="button" class="notes-view__empty-cta" @click="handleCreate">
          Создать первую заметку
        </button>
      </p>
    </template>

    <template v-else>
      <template v-if="pinnedNotes.length > 0">
        <h2 class="notes-view__group-title">Закреплённые</h2>
        <div class="notes-view__masonry">
          <LkNoteCard
            v-for="note in pinnedNotes"
            :key="note.uuid"
            :note="note"
            @open="handleOpen"
            @pin="handlePin"
            @archive="handleArchive"
            @remove="handleRemove"
          />
        </div>
        <h2 v-if="otherNotes.length > 0" class="notes-view__group-title">Остальные</h2>
      </template>

      <div v-if="otherNotes.length > 0" class="notes-view__masonry">
        <LkNoteCard
          v-for="note in otherNotes"
          :key="note.uuid"
          :note="note"
          @open="handleOpen"
          @pin="handlePin"
          @archive="handleArchive"
          @remove="handleRemove"
        />
      </div>

      <button v-if="hasMore" type="button" class="notes-view__load-more" @click="loadMore">Загрузить ещё</button>
    </template>
  </section>
</template>

<style scoped>
.notes-view {
  max-width: 1240px;
  margin: 0 auto;
}

.notes-view__masonry {
  column-count: 1;
  column-gap: 1rem;
}

@media (min-width: 480px) {
  .notes-view__masonry {
    column-count: 2;
  }
}

@media (min-width: 1024px) {
  .notes-view__masonry {
    column-count: 3;
  }
}

@media (min-width: 1400px) {
  .notes-view__masonry {
    column-count: 4;
  }
}

.notes-view__group-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b716e;
  margin: 0 0 0.6rem;
}

.notes-view__state {
  padding: 2rem 0;
  color: #6b716e;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notes-view__state--error {
  color: #cf5b4a;
}

.notes-view__retry-btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #cf5b4a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.notes-view__empty {
  padding: 2rem 0;
  color: #6b716e;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}

.notes-view__empty-cta {
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.notes-view__load-more {
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
</style>
