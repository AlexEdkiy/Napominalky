<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkForms } from '@/composables/useLkForms'
import { useShoppingListItems } from '@/composables/useShoppingListItems'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { colorForTag } from '@/constants/lkTagColors'
import type { ValidationErrorResponse } from '@/types/api'
import type { ShoppingList, ShoppingListType } from '@/types/shoppingList'
import { shoppingListAccent } from '@/utils/shoppingList'

/** Пресеты тегов задачи/списка (палитра `lkTagColors`, см. `web-lk-tasks-table.md`). */
const TAG_PRESETS = ['Покупки', 'Дом', 'Личное', 'Важное', 'Звонки', 'Счета', 'Здоровье'] as const

const typeOptions: { value: ShoppingListType; label: string; icon: 'cart' | 'check' }[] = [
  { value: 'goods', label: 'Купить', icon: 'cart' },
  { value: 'tasks', label: 'Сделать', icon: 'check' },
]

const { isDesktop } = useLkBreakpoint()
const { isTaskFormOpen, taskFormList, closeForm, notifyTaskSaved } = useLkForms()

/**
 * Текущий список модалки. В new-режиме — `null` до первого «Добавить пункт»
 * или «Сохранить» (список НЕ создаётся при открытии, чтобы не плодить
 * пустые); после создания модалка продолжает работать в edit-режиме
 * с этим же uuid.
 */
const currentList = ref<ShoppingList | null>(null)

const form = reactive({ title: '', type: 'goods' as ShoppingListType })
const tags = ref<string[]>([])
const newItemName = ref('')
const customTagName = ref('')
const isAddingCustomTag = ref(false)
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isConfirmingDelete = ref(false)
/** Были ли изменения пунктов — чтобы перезагрузить таблицу при закрытии крестиком/Esc. */
const hasItemChanges = ref(false)

const {
  items,
  isLoading: isItemsLoading,
  totalCount,
  checkedCount,
  load: loadItems,
  add: addItem,
  remove: removeItem,
  check: checkItem,
} = useShoppingListItems(() => currentList.value?.uuid ?? '')

const isEdit = computed<boolean>(() => currentList.value !== null)
/**
 * Тип списка фиксируется при создании: если модалка открыта по существующему
 * списку (edit-режим), тумблер «Купить/Сделать» скрыт, а `form.type`
 * инициализирован фактическим типом списка (см. `resetForm`) — `updateList`
 * отправляет его без изменений, акценты красятся по нему же.
 */
const isTypeLocked = computed<boolean>(() => taskFormList.value !== null)
const title = computed<string>(() => form.title.trim() || 'Новая задача / покупка')
const accent = computed(() => shoppingListAccent(form.type))
const itemPlaceholder = computed<string>(() =>
  form.type === 'goods' ? 'Например, Молоко' : 'Например, Помыть окна',
)
/** Выбранные теги вне пресетов («свои») — рендерятся отдельными активными чипами. */
const customTags = computed<string[]>(() =>
  tags.value.filter((tag) => !(TAG_PRESETS as readonly string[]).includes(tag)),
)

function resetForm(): void {
  const list = taskFormList.value
  currentList.value = list
  form.title = list?.title ?? ''
  form.type = list?.type ?? 'goods'
  tags.value = list ? [...list.tags] : []
  items.value = []
  newItemName.value = ''
  customTagName.value = ''
  isAddingCustomTag.value = false
  errors.value = {}
  generalError.value = null
  isConfirmingDelete.value = false
  hasItemChanges.value = false
  if (list !== null) {
    void loadItems()
  }
}

watch(isTaskFormOpen, (open) => {
  if (open) {
    resetForm()
  }
})

function toggleTag(tag: string): void {
  tags.value = tags.value.includes(tag) ? tags.value.filter((existing) => existing !== tag) : [...tags.value, tag]
}

function addCustomTag(): void {
  const tag = customTagName.value.trim()
  if (tag !== '' && !tags.value.includes(tag)) {
    tags.value = [...tags.value, tag]
  }
  customTagName.value = ''
  isAddingCustomTag.value = false
}

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить список. Попробуйте позже.'
}

function validatedTitle(): string | null {
  const trimmed = form.title.trim()
  errors.value = {}
  generalError.value = null
  if (trimmed === '') {
    errors.value = { title: ['Введите название задачи.'] }
    return null
  }
  return trimmed
}

/**
 * Гарантирует существование списка: в new-режиме создаёт его при ПЕРВОМ
 * действии с пунктами (или «Сохранить») и переводит модалку в edit-режим
 * с новым uuid. Возвращает `null`, если название пустое или создание упало.
 */
async function ensureList(): Promise<ShoppingList | null> {
  if (currentList.value !== null) {
    return currentList.value
  }
  const trimmedTitle = validatedTitle()
  if (trimmedTitle === null) {
    return null
  }
  try {
    const created = await shoppingListsApi.createList({ title: trimmedTitle, type: form.type, tags: tags.value })
    currentList.value = created
    notifyTaskSaved()
    return created
  } catch (error) {
    applyValidation(error)
    return null
  }
}

async function handleAddItem(): Promise<void> {
  const name = newItemName.value.trim()
  if (name === '') {
    return
  }
  const list = await ensureList()
  if (list === null) {
    return
  }
  const item = await addItem({ name })
  if (item !== null) {
    newItemName.value = ''
    hasItemChanges.value = true
  }
}

async function handleCheckItem(uuid: string, event: Event): Promise<void> {
  const isChecked = (event.target as HTMLInputElement).checked
  await checkItem(uuid, isChecked)
  hasItemChanges.value = true
}

async function handleRemoveItem(uuid: string): Promise<void> {
  await removeItem(uuid)
  hasItemChanges.value = true
}

function handleClose(): void {
  if (hasItemChanges.value) {
    notifyTaskSaved()
  }
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
  isSubmitting.value = true
  try {
    if (currentList.value === null) {
      if ((await ensureList()) === null) {
        return
      }
    } else {
      const trimmedTitle = validatedTitle()
      if (trimmedTitle === null) {
        return
      }
      await shoppingListsApi.updateList(currentList.value.uuid, {
        title: trimmedTitle,
        type: form.type,
        tags: tags.value,
      })
      notifyTaskSaved()
    }
    closeForm()
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
  const current = currentList.value
  isConfirmingDelete.value = false
  if (current === null) {
    return
  }
  isDeleting.value = true
  try {
    await shoppingListsApi.deleteList(current.uuid)
    notifyTaskSaved()
    closeForm()
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
        <span v-if="isEdit" class="lk-form-dialog__progress">{{ checkedCount }} / {{ totalCount }}</span>
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

        <template v-if="!isTypeLocked">
          <span class="lk-form-dialog__label">Тип</span>
          <div class="lk-form-dialog__types">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="lk-form-dialog__type"
              :class="{ [`lk-form-dialog__type--active-${option.value}`]: form.type === option.value }"
              @click="form.type = option.value"
            >
              <LkIcon :name="option.icon" :size="17" />
              {{ option.label }}
            </button>
          </div>
        </template>

        <span class="lk-form-dialog__label">Пункты</span>
        <div class="lk-form-dialog__item-form">
          <input
            v-model="newItemName"
            type="text"
            class="lk-form-dialog__input lk-form-dialog__item-input"
            :placeholder="itemPlaceholder"
            aria-label="Название нового пункта"
            @keydown.enter.prevent="handleAddItem"
          />
          <button
            type="button"
            class="lk-form-dialog__item-add"
            :style="{ background: accent.color }"
            @click="handleAddItem"
          >
            Добавить
          </button>
        </div>

        <p v-if="isItemsLoading" class="lk-form-dialog__items-state" aria-live="polite">Загрузка…</p>
        <p v-else-if="items.length === 0" class="lk-form-dialog__items-state">В списке пока нет пунктов.</p>
        <ul v-else class="lk-form-dialog__items">
          <li
            v-for="item in items"
            :key="item.uuid"
            class="lk-form-dialog__item"
            :class="{ 'lk-form-dialog__item--checked': item.is_checked }"
          >
            <label class="lk-form-dialog__item-label">
              <input
                type="checkbox"
                class="lk-form-dialog__item-checkbox"
                :style="{ accentColor: accent.color }"
                :checked="item.is_checked"
                @change="handleCheckItem(item.uuid, $event)"
              />
              <span class="lk-form-dialog__item-name">{{ item.name }}</span>
            </label>
            <button
              type="button"
              class="lk-form-dialog__item-remove"
              :aria-label="`Удалить ${item.name}`"
              @click="handleRemoveItem(item.uuid)"
            >
              &times;
            </button>
          </li>
        </ul>

        <span class="lk-form-dialog__label">Теги</span>
        <div class="lk-form-dialog__tags">
          <button
            v-for="tag in [...TAG_PRESETS, ...customTags]"
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

          <input
            v-if="isAddingCustomTag"
            v-model="customTagName"
            type="text"
            class="lk-form-dialog__tag-input"
            placeholder="Свой тег"
            aria-label="Название своего тега"
            @keydown.enter.prevent="addCustomTag"
            @blur="addCustomTag"
          />
          <button
            v-else
            type="button"
            class="lk-form-dialog__tag lk-form-dialog__tag-add"
            @click="isAddingCustomTag = true"
          >
            + Свой тег
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
            {{ isSubmitting ? '…' : 'Сохранить' }}
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
  gap: 10px;
  margin-bottom: 4px;
}

.lk-form-dialog__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: #1f2622;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-form-dialog__progress {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #8a938f;
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

.lk-form-dialog__types {
  display: flex;
  gap: 10px;
}

.lk-form-dialog__type {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  border: none;
  border-radius: 13px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__type--active-goods {
  background: #17897a;
  color: #fff;
}

.lk-form-dialog__type--active-tasks {
  background: #d99a3e;
  color: #fff;
}

.lk-form-dialog__item-form {
  display: flex;
  gap: 8px;
}

.lk-form-dialog__item-input {
  flex: 1;
}

.lk-form-dialog__item-add {
  flex-shrink: 0;
  height: 46px;
  padding: 0 18px;
  border: none;
  border-radius: 13px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__items-state {
  margin: 10px 2px 0;
  font-size: 13.5px;
  color: #8a938f;
}

.lk-form-dialog__items {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.lk-form-dialog__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 2px;
  border-bottom: 1px solid #eef1f0;
}

.lk-form-dialog__item:last-child {
  border-bottom: none;
}

.lk-form-dialog__item-label {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.lk-form-dialog__item-checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.lk-form-dialog__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
  font-weight: 600;
}

.lk-form-dialog__item--checked .lk-form-dialog__item-name {
  text-decoration: line-through;
  color: #9aa39f;
}

.lk-form-dialog__item-remove {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #eef1f0;
  color: #6b716e;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}

.lk-form-dialog__item-remove:hover {
  background: #f6dfda;
  color: #cf5b4a;
}

.lk-form-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
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

.lk-form-dialog__tag-add {
  background: #eef1f0;
  color: #5a625e;
}

.lk-form-dialog__tag-input {
  height: 30px;
  width: 130px;
  border: 1.5px solid #e3e6e5;
  border-radius: 15px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 700;
  color: #1f2622;
  font-family: inherit;
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
