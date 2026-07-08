<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { isAxiosError } from 'axios'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { colorForTag } from '@/constants/lkTagColors'
import type { ValidationErrorResponse } from '@/types/api'
import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'

const emit = defineEmits<{
  close: []
  created: [list: ShoppingList]
}>()

const { isDesktop } = useLkBreakpoint()

const typeOptions: { value: ShoppingListType; label: string }[] = [
  { value: 'goods', label: 'Купить' },
  { value: 'tasks', label: 'Сделать' },
]

const form = reactive({ title: '', type: 'goods' as ShoppingListType })
const tags = ref<string[]>([])
const tagInput = ref('')
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось создать список. Попробуйте позже.'
}

function addTagFromInput(): void {
  const cleaned = tagInput.value.replace(/,/g, '').trim()
  tagInput.value = ''
  if (cleaned === '' || tags.value.includes(cleaned)) {
    return
  }
  tags.value = [...tags.value, cleaned]
}

function handleTagKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTagFromInput()
  }
}

function removeTag(tag: string): void {
  tags.value = tags.value.filter((existing) => existing !== tag)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

async function handleSubmit(): Promise<void> {
  const title = form.title.trim()
  errors.value = {}
  generalError.value = null
  if (title === '') {
    errors.value = { title: ['Введите название списка.'] }
    return
  }
  isSubmitting.value = true
  try {
    const list = await shoppingListsApi.createList({ title, type: form.type, tags: tags.value })
    emit('created', list)
  } catch (error) {
    applyValidation(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    class="lk-create-list-dialog__overlay"
    :class="{ 'lk-create-list-dialog__overlay--desktop': isDesktop }"
    @click.self="emit('close')"
  >
    <div class="lk-create-list-dialog__panel" role="dialog" aria-modal="true" aria-label="Новый список">
      <header class="lk-create-list-dialog__header">
        <h2 class="lk-create-list-dialog__title">Новый список</h2>
        <button type="button" class="lk-create-list-dialog__close" aria-label="Закрыть" @click="emit('close')">
          ×
        </button>
      </header>

      <form novalidate @submit.prevent="handleSubmit">
        <p v-if="generalError" role="alert" class="lk-create-list-dialog__error">{{ generalError }}</p>

        <div class="lk-create-list-dialog__field">
          <label for="create-list-title">Название</label>
          <input id="create-list-title" v-model="form.title" type="text" required autofocus />
          <span v-if="errors.title" class="lk-create-list-dialog__error">{{ errors.title[0] }}</span>
        </div>

        <div class="lk-create-list-dialog__field">
          <span class="lk-create-list-dialog__label">Тип</span>
          <div class="lk-create-list-dialog__type-toggle">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="lk-create-list-dialog__type-btn"
              :class="[
                `lk-create-list-dialog__type-btn--${option.value}`,
                { 'lk-create-list-dialog__type-btn--active': form.type === option.value },
              ]"
              @click="form.type = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="lk-create-list-dialog__field">
          <label for="create-list-tags">Теги</label>
          <div class="lk-create-list-dialog__tags">
            <span
              v-for="tagName in tags"
              :key="tagName"
              class="lk-create-list-dialog__tag"
              :style="{ background: colorForTag(tagName).bg, color: colorForTag(tagName).fg }"
            >
              {{ tagName }}
              <button
                type="button"
                class="lk-create-list-dialog__tag-remove"
                :aria-label="`Удалить тег ${tagName}`"
                @click="removeTag(tagName)"
              >
                ×
              </button>
            </span>
            <input
              id="create-list-tags"
              v-model="tagInput"
              type="text"
              placeholder="Добавить тег"
              @keydown="handleTagKeydown"
            />
          </div>
        </div>

        <div class="lk-create-list-dialog__actions">
          <button type="submit" class="lk-create-list-dialog__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Создание…' : 'Создать' }}
          </button>
          <button type="button" class="lk-create-list-dialog__cancel" @click="emit('close')">Отмена</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.lk-create-list-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 20, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.lk-create-list-dialog__overlay--desktop {
  align-items: center;
}

.lk-create-list-dialog__panel {
  background: #fff;
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  padding: 1.1rem 1.25rem 1.4rem;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
}

.lk-create-list-dialog__overlay--desktop .lk-create-list-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.lk-create-list-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.lk-create-list-dialog__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-create-list-dialog__close {
  border: none;
  background: #eef1f0;
  color: #6b716e;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.lk-create-list-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.lk-create-list-dialog__field label,
.lk-create-list-dialog__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b716e;
}

.lk-create-list-dialog__field input {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
  font-size: 0.92rem;
  font-family: inherit;
  color: #1f2622;
}

.lk-create-list-dialog__type-toggle {
  display: flex;
  gap: 0.6rem;
}

.lk-create-list-dialog__type-btn {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #eef1f0;
  color: #6b716e;
  font-weight: 600;
  cursor: pointer;
}

.lk-create-list-dialog__type-btn--goods.lk-create-list-dialog__type-btn--active {
  background: #d8ebe4;
  color: #17897a;
  border-color: #17897a;
}

.lk-create-list-dialog__type-btn--tasks.lk-create-list-dialog__type-btn--active {
  background: #f7ebd5;
  color: #c98a2b;
  border-color: #c98a2b;
}

.lk-create-list-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
}

.lk-create-list-dialog__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.lk-create-list-dialog__tag-remove {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  padding: 0;
}

.lk-create-list-dialog__tags input {
  flex: 1;
  min-width: 100px;
  border: none;
  outline: none;
  font-size: 0.85rem;
  color: #1f2622;
}

.lk-create-list-dialog__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lk-create-list-dialog__submit {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.lk-create-list-dialog__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lk-create-list-dialog__cancel {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #eef1f0;
  color: #6b716e;
  font-weight: 600;
  cursor: pointer;
}

.lk-create-list-dialog__error {
  display: block;
  color: #cf5b4a;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
</style>
