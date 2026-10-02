<script setup lang="ts">
import { ref, watch } from 'vue'
import LkIcon from '@/components/lk/LkIcon.vue'

const props = withDefaults(defineProps<{ query?: string; label?: string; dark?: boolean }>(), {
  query: '', label: 'Поиск по всему', dark: false,
})
const emit = defineEmits<{ search: [query: string] }>()
const draft = ref(props.query)
const input = ref<HTMLInputElement | null>(null)
watch(() => props.query, (value) => { draft.value = value })
function submit(): void {
  input.value?.blur()
  emit('search', draft.value.trim())
}
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <form class="lk-search-form" :class="{ 'lk-search-form--dark': dark }" role="search" :aria-label="label" novalidate @submit.prevent="submit">
    <input ref="input" v-model="draft" type="search" :placeholder="label" :aria-label="label" maxlength="200" enterkeyhint="search" />
    <button type="submit" aria-label="Найти" title="Найти"><LkIcon name="search" :size="20" /></button>
  </form>
</template>

<style scoped>
.lk-search-form { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 10px; border-radius: 12px; background: #f2f4f3; color: #5a625e; }
.lk-search-form input { flex: 1; min-width: 0; width: 100%; border: none; background: transparent; color: #1f2622; font: inherit; font-size: 16px; padding: 6px 0; }
.lk-search-form input:focus-visible { outline: 2px solid #17897a; outline-offset: 2px; border-radius: 4px; }
.lk-search-form button { flex: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; border: none; border-radius: 8px; color: inherit; background: transparent; cursor: pointer; }
.lk-search-form button:hover { background: #dce8e4; }
.lk-search-form--dark { background: rgba(255, 255, 255, .14); color: #fff; }
.lk-search-form--dark input { color: #fff; }
.lk-search-form--dark input::placeholder { color: rgba(255, 255, 255, .75); }
.lk-search-form--dark button:hover { background: rgba(255, 255, 255, .14); }
</style>
