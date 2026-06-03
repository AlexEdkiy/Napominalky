<script setup lang="ts">
import { computed } from 'vue'

import type { Note } from '@/types/note'

interface Props {
  note: Note
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [uuid: string]
}>()

const SNIPPET_LIMIT = 120

const snippet = computed<string>(() => {
  const body = props.note.body ?? ''
  if (body.length <= SNIPPET_LIMIT) {
    return body
  }
  return `${body.slice(0, SNIPPET_LIMIT)}…`
})

function handleOpen(): void {
  emit('open', props.note.uuid)
}
</script>

<template>
  <article
    class="note-card"
    role="button"
    tabindex="0"
    @click="handleOpen"
    @keydown.enter="handleOpen"
    @keydown.space.prevent="handleOpen"
  >
    <header class="note-card__header">
      <h3 class="note-card__title">{{ note.title }}</h3>
      <span class="note-card__badges">
        <span v-if="note.is_pinned" class="badge" title="Закреплено" aria-label="Закреплено">📌</span>
        <span v-if="note.is_archived" class="badge" title="В архиве" aria-label="В архиве">🗄</span>
      </span>
    </header>
    <p v-if="snippet" class="note-card__snippet">{{ snippet }}</p>
  </article>
</template>

<style scoped>
.note-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  background: #fff;
}

.note-card:hover,
.note-card:focus-visible {
  border-color: #888;
  outline: none;
}

.note-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.note-card__title {
  margin: 0;
  font-size: 1rem;
}

.note-card__snippet {
  margin: 0.5rem 0 0;
  color: #555;
  white-space: pre-wrap;
}

.badge {
  font-size: 0.9rem;
}
</style>
