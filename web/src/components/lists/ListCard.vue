<script setup lang="ts">
import ProgressBar from '@/components/lists/ProgressBar.vue'
import type { ShoppingList } from '@/types/shoppingList'

interface Props {
  list: ShoppingList
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [uuid: string]
  remove: [uuid: string]
}>()

function handleOpen(): void {
  emit('open', props.list.uuid)
}

function handleRemove(): void {
  emit('remove', props.list.uuid)
}
</script>

<template>
  <article class="list-card">
    <button type="button" class="list-card__main" @click="handleOpen">
      <h3 class="list-card__title">{{ list.title }}</h3>
      <ProgressBar :value="list.checked_items_count" :max="list.items_count" />
    </button>
    <button
      type="button"
      class="list-card__remove"
      :aria-label="`Удалить список ${list.title}`"
      @click="handleRemove"
    >
      Удалить
    </button>
  </article>
</template>

<style scoped>
.list-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: #fff;
}

.list-card__main {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.list-card__title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.list-card__remove {
  color: #c0392b;
}
</style>
