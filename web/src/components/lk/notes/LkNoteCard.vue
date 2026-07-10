<script setup lang="ts">
import { computed } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import { colorForNoteValue } from '@/constants/lkNoteColors'
import type { Note } from '@/types/note'
import { formatRelativeDate } from '@/utils/datetime'

interface Props {
  note: Note
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [uuid: string]
  pin: [uuid: string, isPinned: boolean]
  archive: [uuid: string, isArchived: boolean]
  remove: [uuid: string]
}>()

const color = computed(() => colorForNoteValue(props.note.color, props.note.uuid))
const updatedLabel = computed<string>(() => formatRelativeDate(props.note.updated_at))
const hasBody = computed<boolean>(() => (props.note.body ?? '').trim().length > 0)

function handleOpen(): void {
  emit('open', props.note.uuid)
}

function handleTogglePin(event: Event): void {
  event.stopPropagation()
  emit('pin', props.note.uuid, !props.note.is_pinned)
}

function handleToggleArchive(event: Event): void {
  event.stopPropagation()
  emit('archive', props.note.uuid, !props.note.is_archived)
}

function handleRemove(event: Event): void {
  event.stopPropagation()
  emit('remove', props.note.uuid)
}
</script>

<template>
  <article
    class="lk-note-card"
    role="button"
    tabindex="0"
    :style="{ background: color.bg, borderTop: `4px solid ${color.accent}` }"
    @click="handleOpen"
    @keydown.enter="handleOpen"
    @keydown.space.prevent="handleOpen"
  >
    <button
      type="button"
      class="lk-note-card__pin"
      :class="{ 'lk-note-card__pin--active': note.is_pinned }"
      :style="note.is_pinned ? { background: color.accent, color: '#fff' } : { color: color.accent }"
      :aria-label="note.is_pinned ? `Открепить «${note.title}»` : `Закрепить «${note.title}»`"
      :aria-pressed="note.is_pinned"
      @click="handleTogglePin"
    >
      <LkIcon name="pin" :size="15" />
    </button>

    <h3 class="lk-note-card__title">{{ note.title }}</h3>
    <p v-if="hasBody" class="lk-note-card__body">{{ note.body }}</p>

    <footer class="lk-note-card__footer">
      <span class="lk-note-card__updated">Обновлено: {{ updatedLabel }}</span>
      <div class="lk-note-card__actions">
        <button
          type="button"
          class="lk-note-card__action"
          :aria-label="note.is_archived ? `Вернуть из архива «${note.title}»` : `В архив «${note.title}»`"
          @click="handleToggleArchive"
        >
          <LkIcon name="archive" :size="15" />
        </button>
        <button
          type="button"
          class="lk-note-card__action lk-note-card__action--danger"
          :aria-label="`Удалить «${note.title}»`"
          @click="handleRemove"
        >
          <LkIcon name="trash" :size="15" />
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.lk-note-card {
  position: relative;
  display: block;
  width: 100%;
  box-sizing: border-box;
  break-inside: avoid;
  margin-bottom: 1rem;
  border-radius: 18px;
  /* Тень как в макете; цветная верхняя граница (4px, accent заметки)
     задаётся inline через `color.accent` — цвет зависит от данных. */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  padding: 1rem 1.1rem 0.75rem;
  cursor: pointer;
  text-align: left;
  border: none;
}

.lk-note-card:hover,
.lk-note-card:focus-visible {
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
  outline: none;
}

.lk-note-card__pin {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-note-card__title {
  margin: 0 1.9rem 0.5rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lk-note-card__body {
  margin: 0 0 0.85rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: #3d453f;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lk-note-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.lk-note-card__updated {
  font-size: 0.72rem;
  color: #6b716e;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-note-card__actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.lk-note-card__action {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.55);
  color: #4a524d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-note-card__action:hover {
  background: rgba(255, 255, 255, 0.85);
}

.lk-note-card__action--danger:hover {
  color: #cf5b4a;
}
</style>
