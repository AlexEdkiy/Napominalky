<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type { ShoppingList } from '@/types/shoppingList'
import { formatRelativeDate } from '@/utils/datetime'
import { shoppingListAccent, shoppingListProgressPercent, shoppingListStatus } from '@/utils/shoppingList'

interface Props {
  list: ShoppingList
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [uuid: string]
  rename: [uuid: string, title: string]
  remove: [uuid: string]
}>()

const isRenaming = ref(false)
const renameValue = ref(props.list.title)
const renameInput = ref<HTMLInputElement | null>(null)

const STATUS_LABELS = { new: 'Новый', active: 'В работе', done: 'Завершён' } as const

// Статус списка — производный признак (доля отмеченных пунктов), дополняет
// реальные `type`/`tags` списка (см. utils/shoppingList.ts).
const status = computed(() => shoppingListStatus(props.list))
const statusLabel = computed<string>(() => STATUS_LABELS[status.value])
const accent = computed(() => shoppingListAccent(props.list.type))
const progressPercent = computed<number>(() => shoppingListProgressPercent(props.list))
const updatedLabel = computed<string>(() => formatRelativeDate(props.list.updated_at))
const typeLabel = computed<string>(() => (props.list.type === 'tasks' ? 'Сделать' : 'Купить'))

function handleOpen(): void {
  if (!isRenaming.value) {
    emit('open', props.list.uuid)
  }
}

async function startRename(event: Event): Promise<void> {
  event.stopPropagation()
  renameValue.value = props.list.title
  isRenaming.value = true
  await nextTick()
  renameInput.value?.focus()
}

function saveRename(): void {
  const trimmed = renameValue.value.trim()
  if (trimmed && trimmed !== props.list.title) {
    emit('rename', props.list.uuid, trimmed)
  }
  isRenaming.value = false
}

function cancelRename(): void {
  isRenaming.value = false
}

function handleRemove(event: Event): void {
  event.stopPropagation()
  emit('remove', props.list.uuid)
}
</script>

<template>
  <article class="lk-shopping-list-card" @click="handleOpen">
    <div class="lk-shopping-list-card__main">
      <form v-if="isRenaming" class="lk-shopping-list-card__rename" @submit.prevent="saveRename" @click.stop>
        <input
          ref="renameInput"
          v-model="renameValue"
          type="text"
          :aria-label="`Новое название списка ${list.title}`"
        />
        <button type="submit" class="lk-shopping-list-card__rename-save">Сохранить</button>
        <button type="button" class="lk-shopping-list-card__rename-cancel" @click="cancelRename">Отмена</button>
      </form>
      <h3 v-else class="lk-shopping-list-card__title">{{ list.title }}</h3>

      <span class="lk-shopping-list-card__type" :class="`lk-shopping-list-card__type--${list.type}`">
        {{ typeLabel }}
      </span>
    </div>

    <div v-if="list.tags.length > 0" class="lk-shopping-list-card__tags">
      <LkTagPill v-for="tag in list.tags" :key="tag" :tag="tag" />
    </div>

    <div class="lk-shopping-list-card__progress">
      <div class="lk-shopping-list-card__progress-track">
        <div
          class="lk-shopping-list-card__progress-fill"
          :style="{ width: `${progressPercent}%`, background: accent.color }"
        />
      </div>
      <span class="lk-shopping-list-card__progress-label">
        {{ list.checked_items_count }} / {{ list.items_count }}
      </span>
    </div>

    <div class="lk-shopping-list-card__footer">
      <span class="lk-shopping-list-card__footer-info">
        <span
          class="lk-shopping-list-card__status"
          :class="`lk-shopping-list-card__status--${status}`"
          :style="status !== 'done' ? { background: accent.soft, color: accent.color } : undefined"
        >
          {{ statusLabel }}
        </span>
        <span class="lk-shopping-list-card__updated">Обновлён: {{ updatedLabel }}</span>
      </span>
      <div class="lk-shopping-list-card__actions">
        <button
          type="button"
          class="lk-shopping-list-card__action"
          :aria-label="`Переименовать ${list.title}`"
          @click="startRename"
        >
          <LkIcon name="edit" :size="15" />
        </button>
        <button
          type="button"
          class="lk-shopping-list-card__action lk-shopping-list-card__action--danger"
          :aria-label="`Удалить список ${list.title}`"
          @click="handleRemove"
        >
          <LkIcon name="trash" :size="15" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.lk-shopping-list-card {
  background: #fff;
  border-radius: 18px;
  padding: 1rem 1.15rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.lk-shopping-list-card__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.lk-shopping-list-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-shopping-list-card__type {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.lk-shopping-list-card__type--goods {
  background: #d8ebe4;
  color: #17897a;
}

.lk-shopping-list-card__type--tasks {
  background: #f7ebd5;
  color: #c98a2b;
}

.lk-shopping-list-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.lk-shopping-list-card__footer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
}

.lk-shopping-list-card__status {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.lk-shopping-list-card__status--new,
.lk-shopping-list-card__status--active {
  /* Цвет фона/текста задаётся инлайн по акценту типа списка (goods/tasks). */
}

.lk-shopping-list-card__status--done {
  background: #d8ebe4;
  color: #17897a;
}

.lk-shopping-list-card__progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.lk-shopping-list-card__progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #eef1f0;
  overflow: hidden;
}

.lk-shopping-list-card__progress-fill {
  height: 100%;
  background: #17897a;
  transition: width 0.2s ease;
}

.lk-shopping-list-card__progress-label {
  font-size: 0.78rem;
  color: #8a938f;
  white-space: nowrap;
}

.lk-shopping-list-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.lk-shopping-list-card__updated {
  font-size: 0.75rem;
  color: #9aa39f;
}

.lk-shopping-list-card__actions {
  display: flex;
  gap: 0.4rem;
}

.lk-shopping-list-card__action {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #eef1f0;
  color: #6b716e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-shopping-list-card__action--danger:hover {
  background: #f6dfda;
  color: #cf5b4a;
}

.lk-shopping-list-card__rename {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.lk-shopping-list-card__rename input {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid #d8ebe4;
  font-size: 0.9rem;
}

.lk-shopping-list-card__rename-save,
.lk-shopping-list-card__rename-cancel {
  font-size: 0.78rem;
  border: none;
  border-radius: 8px;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  white-space: nowrap;
}

.lk-shopping-list-card__rename-save {
  background: #17897a;
  color: #fff;
}

.lk-shopping-list-card__rename-cancel {
  background: #eef1f0;
  color: #6b716e;
}
</style>
