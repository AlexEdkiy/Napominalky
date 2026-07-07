<script setup lang="ts">
import LkCategoryPill from '@/components/lk/LkCategoryPill.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import type { ShoppingListItem } from '@/types/shoppingList'

interface Props {
  item: ShoppingListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  check: [uuid: string, isChecked: boolean]
  remove: [uuid: string]
}>()

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
  </li>
</template>

<style scoped>
.lk-list-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #eef1f0;
}

.lk-list-item-row:last-child {
  border-bottom: none;
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
</style>
