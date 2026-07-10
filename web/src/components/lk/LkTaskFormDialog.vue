<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkForms } from '@/composables/useLkForms'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { colorForTag } from '@/constants/lkTagColors'
import type { ValidationErrorResponse } from '@/types/api'
import type { ShoppingListType } from '@/types/shoppingList'

/** Пресеты тегов задачи/списка (см. `web-lk-forms.md`, форма 1). */
const TAG_PRESETS = ['Покупки', 'Дом', 'Личное', 'Важное', 'Звонки', 'Счета', 'Здоровье'] as const

const typeOptions: { value: ShoppingListType; label: string }[] = [
  { value: 'tasks', label: 'Задача' },
  { value: 'goods', label: 'Покупка / список' },
]

const router = useRouter()
const { isDesktop } = useLkBreakpoint()
const { isTaskFormOpen, taskFormList, closeForm, notifyTaskSaved } = useLkForms()

const form = reactive({ title: '', type: 'goods' as ShoppingListType })
const tags = ref<string[]>([])
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isConfirmingDelete = ref(false)

const isEdit = computed<boolean>(() => taskFormList.value !== null)
const title = computed<string>(() => (isEdit.value ? 'Редактирование задачи / покупки' : 'Новая задача / покупка'))
const submitLabel = computed<string>(() => (isEdit.value ? 'Сохранить' : 'Создать'))

function resetForm(): void {
  const list = taskFormList.value
  form.title = list?.title ?? ''
  form.type = list?.type ?? 'goods'
  tags.value = list ? [...list.tags] : []
  errors.value = {}
  generalError.value = null
  isConfirmingDelete.value = false
}

watch(isTaskFormOpen, (open) => {
  if (open) {
    resetForm()
  }
})

function toggleTag(tag: string): void {
  tags.value = tags.value.includes(tag) ? tags.value.filter((existing) => existing !== tag) : [...tags.value, tag]
}

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить список. Попробуйте позже.'
}

function handleClose(): void {
  closeForm()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isTaskFormOpen.value) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

async function handleSubmit(): Promise<void> {
  const trimmedTitle = form.title.trim()
  errors.value = {}
  generalError.value = null
  if (trimmedTitle === '') {
    errors.value = { title: ['Введите название списка.'] }
    return
  }
  isSubmitting.value = true
  try {
    const current = taskFormList.value
    if (current === null) {
      const list = await shoppingListsApi.createList({ title: trimmedTitle, type: form.type, tags: tags.value })
      notifyTaskSaved()
      closeForm()
      await router.push({ name: 'lk-list-detail', params: { uuid: list.uuid } })
    } else {
      await shoppingListsApi.updateList(current.uuid, { title: trimmedTitle, type: form.type, tags: tags.value })
      notifyTaskSaved()
      closeForm()
    }
  } catch (error) {
    applyValidation(error)
  } finally {
    isSubmitting.value = false
  }
}

function requestDelete(): void {
  isConfirmingDelete.value = true
}

function cancelDelete(): void {
  isConfirmingDelete.value = false
}

async function confirmDelete(): Promise<void> {
  const current = taskFormList.value
  isConfirmingDelete.value = false
  if (current === null) {
    return
  }
  isDeleting.value = true
  try {
    await shoppingListsApi.deleteList(current.uuid)
    notifyTaskSaved()
    closeForm()
    if (router.currentRoute.value.name === 'lk-list-detail') {
      await router.push({ name: 'lk-tasks' })
    }
  } catch {
    generalError.value = 'Не удалось удалить список.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div
    v-if="isTaskFormOpen"
    class="lk-form-dialog__overlay"
    :class="{ 'lk-form-dialog__overlay--desktop': isDesktop }"
    @click.self="handleClose"
  >
    <div
      class="lk-form-dialog__panel"
      :class="{ 'lk-form-dialog__panel--desktop': isDesktop }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header class="lk-form-dialog__header">
        <h2 class="lk-form-dialog__title">{{ title }}</h2>
        <button type="button" class="lk-form-dialog__close" aria-label="Закрыть" @click="handleClose">
          &times;
        </button>
      </header>

      <form novalidate @submit.prevent="handleSubmit">
        <p v-if="generalError" role="alert" class="lk-form-dialog__error">{{ generalError }}</p>

        <label class="lk-form-dialog__label" for="task-form-title">Название</label>
        <input
          id="task-form-title"
          v-model="form.title"
          type="text"
          class="lk-form-dialog__input"
          placeholder="Что нужно сделать или купить?"
          required
          autofocus
        />
        <span v-if="errors.title" class="lk-form-dialog__error">{{ errors.title[0] }}</span>

        <span class="lk-form-dialog__label">Тип</span>
        <div class="lk-form-dialog__pills">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="lk-form-dialog__pill"
            :class="{ 'lk-form-dialog__pill--active': form.type === option.value }"
            @click="form.type = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <span class="lk-form-dialog__label">Теги</span>
        <div class="lk-form-dialog__tags">
          <button
            v-for="tag in TAG_PRESETS"
            :key="tag"
            type="button"
            class="lk-form-dialog__tag"
            :class="{ 'lk-form-dialog__tag--active': tags.includes(tag) }"
            :style="
              tags.includes(tag)
                ? { background: colorForTag(tag).fg, color: '#fff' }
                : { background: colorForTag(tag).bg, color: colorForTag(tag).fg }
            "
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <footer class="lk-form-dialog__footer">
          <button
            v-if="isEdit"
            type="button"
            class="lk-form-dialog__delete"
            :disabled="isDeleting"
            @click="requestDelete"
          >
            <LkIcon name="trash" :size="16" />
            Удалить
          </button>
          <span class="lk-form-dialog__spacer" />
          <button type="button" class="lk-form-dialog__cancel" @click="handleClose">Отмена</button>
          <button type="submit" class="lk-form-dialog__submit" :disabled="isSubmitting">
            {{ isSubmitting ? '…' : submitLabel }}
          </button>
        </footer>
      </form>
    </div>

    <LkConfirmDialog
      v-if="isConfirmingDelete"
      title="Удалить список?"
      message="Список и все его пункты будут удалены безвозвратно."
      confirm-label="Удалить"
      cancel-label="Отмена"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.lk-form-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(12, 50, 44, 0.42);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.lk-form-dialog__panel {
  background: #fff;
  width: 100%;
  max-height: 86%;
  overflow-y: auto;
  border-radius: 22px 22px 0 0;
  padding: 24px 20px;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
}

.lk-form-dialog__panel--desktop {
  max-width: 580px;
  border-radius: 22px;
  padding: 24px 28px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  margin: auto;
}

.lk-form-dialog__overlay--desktop {
  align-items: center;
}

.lk-form-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.lk-form-dialog__title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: #1f2622;
}

.lk-form-dialog__close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: #f2f4f3;
  color: #5a625e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.lk-form-dialog__label {
  display: block;
  margin-top: 16px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa39f;
}

.lk-form-dialog__input {
  display: block;
  width: 100%;
  height: 46px;
  box-sizing: border-box;
  border: 1.5px solid #e3e6e5;
  border-radius: 13px;
  padding: 0 15px;
  background: #fbfcfb;
  font-size: 15px;
  font-weight: 700;
  color: #1f2622;
  font-family: inherit;
}

.lk-form-dialog__pills,
.lk-form-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lk-form-dialog__pill {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 18px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__pill--active {
  background: #17897a;
  color: #fff;
}

.lk-form-dialog__tag {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 15px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}

.lk-form-dialog__spacer {
  flex: 1;
}

.lk-form-dialog__delete {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 13px;
  background: #fbe3df;
  color: #cf5b4a;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__cancel {
  height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 13px;
  background: #eef1f0;
  color: #5a625e;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__submit {
  height: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 13px;
  background: #17897a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(23, 137, 122, 0.35);
}

.lk-form-dialog__submit:disabled,
.lk-form-dialog__delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lk-form-dialog__error {
  display: block;
  color: #cf5b4a;
  font-size: 0.8rem;
  margin-top: 4px;
}
</style>
