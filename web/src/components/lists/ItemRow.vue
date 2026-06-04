<script setup lang="ts">
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
  <li class="item-row" :class="{ 'item-row--checked': item.is_checked }">
    <label class="item-row__label" :for="`item-${item.uuid}`">
      <input
        :id="`item-${item.uuid}`"
        type="checkbox"
        :checked="item.is_checked"
        @change="handleToggle"
      />
      <span class="item-row__name">{{ item.name }}</span>
    </label>
    <span class="item-row__category">{{ item.category_label }}</span>
    <button
      type="button"
      class="item-row__remove"
      :aria-label="`Удалить ${item.name}`"
      @click="handleRemove"
    >
      ✕
    </button>
  </li>
</template>

<style scoped>
.item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.item-row__label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.item-row--checked .item-row__name {
  text-decoration: line-through;
  color: #999;
}

.item-row__category {
  font-size: 0.8rem;
  color: #777;
  white-space: nowrap;
}

.item-row__remove {
  color: #c0392b;
}
</style>
