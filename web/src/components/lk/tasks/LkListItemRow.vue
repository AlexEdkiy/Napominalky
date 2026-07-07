<script setup lang="ts">
import { computed } from 'vue'

import LkCategoryPill from '@/components/lk/LkCategoryPill.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type { ShoppingListItem } from '@/types/shoppingList'
import { formatDate, formatDateTime } from '@/utils/datetime'

interface Props {
  item: ShoppingListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  check: [uuid: string, isChecked: boolean]
  remove: [uuid: string]
}>()

// Вторичная строка метаданных пункта: показываем только то, что реально
// пришло из API (quantity/deadline/reminder_at/link/comment/tags) — пустые
// поля не рендерятся вовсе, ничего не выдумываем.
const hasMeta = computed<boolean>(
  () =>
    props.item.quantity !== null ||
    props.item.deadline !== null ||
    props.item.reminder_at !== null ||
    props.item.link !== null ||
    props.item.comment !== null ||
    props.item.tags.length > 0,
)

const deadlineLabel = computed<string>(() => formatDate(props.item.deadline))
const reminderLabel = computed<string>(() => formatDateTime(props.item.reminder_at))

function handleToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  emit('check', props.item.uuid, checked)
}

function handleRemove(): void {
  emit('remove', props.item.uuid)
}
</script>

<template>
  <li class="lk-list-item-row" :class="{ 'lk-list-item-row--checked': item.is_checked }">
    <div class="lk-list-item-row__main">
      <label class="lk-list-item-row__label" :for="`lk-item-${item.uuid}`">
        <input
          :id="`lk-item-${item.uuid}`"
          type="checkbox"
          class="lk-list-item-row__checkbox"
          :checked="item.is_checked"
          @change="handleToggle"
        />
        <span class="lk-list-item-row__name">{{ item.name }}</span>
      </label>

      <LkCategoryPill :category="item.category" :label="item.category_label" />

      <button
        type="button"
        class="lk-list-item-row__remove"
        :aria-label="`Удалить ${item.name}`"
        @click="handleRemove"
      >
        <LkIcon name="trash" :size="15" />
      </button>
    </div>

    <div v-if="hasMeta" class="lk-list-item-row__meta">
      <span v-if="item.quantity !== null" class="lk-list-item-row__meta-chip">
        × {{ item.quantity }}
      </span>

      <span v-if="item.deadline !== null" class="lk-list-item-row__meta-chip">
        <LkIcon name="calendar" :size="12" />
        {{ deadlineLabel }}
      </span>

      <span v-if="item.reminder_at !== null" class="lk-list-item-row__meta-chip">
        <LkIcon name="bell" :size="12" />
        {{ reminderLabel }}
      </span>

      <a
        v-if="item.link !== null"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="lk-list-item-row__meta-chip lk-list-item-row__meta-chip--link"
      >
        <LkIcon name="link" :size="12" />
        Ссылка
      </a>

      <span v-if="item.comment !== null" class="lk-list-item-row__meta-chip" :title="item.comment">
        <LkIcon name="comment" :size="12" />
        {{ item.comment }}
      </span>

      <LkTagPill v-for="tag in item.tags" :key="tag" :tag="tag" />
    </div>
  </li>
</template>

<style scoped>
.lk-list-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #eef1f0;
}

.lk-list-item-row:last-child {
  border-bottom: none;
}

.lk-list-item-row__main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lk-list-item-row__label {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}

.lk-list-item-row__checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  accent-color: #17897a;
}

.lk-list-item-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
}

.lk-list-item-row--checked .lk-list-item-row__name {
  text-decoration: line-through;
  color: #9aa39f;
}

.lk-list-item-row__remove {
  flex-shrink: 0;
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

.lk-list-item-row__remove:hover {
  background: #f6dfda;
  color: #cf5b4a;
}

.lk-list-item-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding-left: 1.85rem;
}

.lk-list-item-row__meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: #eef1f0;
  color: #6b716e;
  font-size: 0.72rem;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.lk-list-item-row__meta-chip--link {
  color: #4067a8;
  background: #dde6f3;
}
</style>
