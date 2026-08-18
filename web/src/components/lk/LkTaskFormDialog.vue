<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkStatusBadge from '@/components/lk/LkStatusBadge.vue'
import LkTaskItemRow from '@/components/lk/LkTaskItemRow.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkForms } from '@/composables/useLkForms'
import { useShoppingListItems } from '@/composables/useShoppingListItems'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { colorForTag } from '@/constants/lkTagColors'
import type { ValidationErrorResponse } from '@/types/api'
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListType,
  TaskStatus,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'
import { shoppingListAccent } from '@/utils/shoppingList'

/** Пресеты тегов задачи/списка (палитра `lkTagColors`, см. `web-lk-tasks-table.md`). */
const TAG_PRESETS = ['Покупки', 'Дом', 'Личное', 'Важное', 'Работа', 'Здоровье'] as const

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
/** Облако тегов по умолчанию свёрнуто; разворачивается кнопкой «Выбрать тег». */
const isTagCloudOpen = ref(false)
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isConfirmingDelete = ref(false)
/** Были ли изменения пунктов — чтобы перезагрузить таблицу при закрытии крестиком/Esc. */
const hasItemChanges = ref(false)
/** uuid раскрытого пункта (панель атрибутов); одновременно раскрыт ровно один. */
const expandedItemUuid = ref<string | null>(null)
/** Пункт, ожидающий подтверждения удаления (крестик × в строке → диалог). */
const removingItem = ref<ShoppingListItem | null>(null)

const {
  items,
  isLoading: isItemsLoading,
  error: itemsError,
  totalCount,
  checkedCount,
  load: loadItems,
  add: addItem,
  update: updateItem,
  remove: removeItem,
  check: checkItem,
  addComment,
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
/** Предложения тегов для редактора атрибутов пункта: пресеты + теги списка + теги пунктов. */
const itemTagSuggestions = computed<string[]>(() => {
  const fromItems = items.value.flatMap((item) => item.tags)
  return [...new Set([...TAG_PRESETS, ...tags.value, ...fromItems])]
})

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
  isTagCloudOpen.value = false
  errors.value = {}
  generalError.value = null
  isConfirmingDelete.value = false
  hasItemChanges.value = false
  expandedItemUuid.value = null
  removingItem.value = null
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

async function handleCheckItem(uuid: string, isChecked: boolean): Promise<void> {
  await checkItem(uuid, isChecked)
  hasItemChanges.value = true
}

/** Крестик × в строке пункта: удаление ТОЛЬКО после подтверждения в диалоге. */
function requestRemoveItem(item: ShoppingListItem): void {
  removingItem.value = item
}

function cancelRemoveItem(): void {
  removingItem.value = null
}

async function confirmRemoveItem(): Promise<void> {
  const target = removingItem.value
  removingItem.value = null
  if (target === null) {
    return
  }
  const removed = await removeItem(target.uuid)
  if (removed) {
    hasItemChanges.value = true
  }
}

/** Отправка комментария из треда пункта: POST + локальный append в composable. */
async function handleAddComment(uuid: string, body: string): Promise<void> {
  const created = await addComment(uuid, body)
  if (created !== null) {
    hasItemChanges.value = true
  }
}

/** Раскрыть/свернуть панель атрибутов пункта (одновременно раскрыт один). */
function toggleItemExpand(uuid: string): void {
  expandedItemUuid.value = expandedItemUuid.value === uuid ? null : uuid
}

/**
 * Изменение атрибутов пункта (дедлайн/напоминание/ссылка/комментарий/теги/
 * количество): PUT items/{uuid}; состояние заменяется ответом сервера
 * (`replaceItem` в composable), ошибка — в `itemsError` под списком.
 */
async function handleUpdateItem(uuid: string, patch: UpdateShoppingListItemPayload): Promise<void> {
  const updated = await updateItem(uuid, patch)
  if (updated !== null) {
    hasItemChanges.value = true
    if (patch.status !== undefined) {
      // Статус пункта мог поменять деривированный статус задачи — обновляем список.
      await refreshCurrentList()
    }
  }
}

/** Перечитывает текущий список (статус/закрепление/is_completed) с сервера. */
async function refreshCurrentList(): Promise<void> {
  const current = currentList.value
  if (current === null) {
    return
  }
  try {
    currentList.value = await shoppingListsApi.fetchList(current.uuid)
  } catch {
    // Второстепенное обновление: при сбое остаётся прежнее состояние.
  }
}

/**
 * Выбор в статус-переключателе шапки (`LkStatusBadge` с меню, только tasks в
 * edit-режиме): PUT сразу — как и атрибуты пунктов, — чтобы деривация статуса
 * и бейджи не расходились. Статус — закрепляет вручную; «Авто» — сбрасывает
 * закрепление. После смены перечитываем пункты: сервер мог свести их
 * `is_checked`/`status`.
 */
async function handleSelectStatus(value: TaskStatus | 'auto'): Promise<void> {
  const current = currentList.value
  if (current === null) {
    return
  }
  try {
    const payload = value === 'auto' ? { status_is_manual: false as const } : { status: value }
    currentList.value = await shoppingListsApi.updateList(current.uuid, payload)
    hasItemChanges.value = true
    void loadItems()
  } catch (error) {
    applyValidation(error)
  }
}

function handleClose(): void {
  if (hasItemChanges.value) {
    notifyTaskSaved()
  }
  closeForm()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isTaskFormOpen.value) {
    // Открытый confirm-диалог сам ловит Esc (отмена) — модалку не закрываем.
    if (isConfirmingDelete.value || removingItem.value !== null) {
      return
    }
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
        <!-- Статус задачи — компактный переключатель в шапке (только edit-режим
             tasks-списка; у goods статусов нет). Точка слева — индикатор
             ручного закрепления статуса; меню бейджа раскрывается вниз поверх
             тела (шапка ничего не клипает — overflow у неё не задан). -->
        <template v-if="currentList !== null && form.type === 'tasks'">
          <span
            v-if="currentList.status_is_manual"
            class="lk-form-dialog__status-pin"
            title="Статус закреплён вручную"
            aria-label="Статус закреплён вручную"
          />
          <LkStatusBadge
            class="lk-form-dialog__header-status"
            :status="currentList.status"
            interactive
            with-auto
            @select="handleSelectStatus"
          />
        </template>
        <button type="button" class="lk-form-dialog__close" aria-label="Закрыть" @click="handleClose">
          &times;
        </button>
      </header>

      <form novalidate class="lk-form-dialog__form" @submit.prevent="handleSubmit">
        <div class="lk-form-dialog__body">
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
            <LkTaskItemRow
              v-for="item in items"
              :key="item.uuid"
              :item="item"
              :list-type="form.type"
              :accent-color="accent.color"
              :accent-soft="accent.soft"
              :expanded="expandedItemUuid === item.uuid"
              :tag-suggestions="itemTagSuggestions"
              @check="handleCheckItem(item.uuid, $event)"
              @remove-request="requestRemoveItem(item)"
              @toggle-expand="toggleItemExpand(item.uuid)"
              @update="handleUpdateItem(item.uuid, $event)"
              @add-comment="handleAddComment(item.uuid, $event)"
            />
          </ul>
          <p v-if="itemsError" role="alert" class="lk-form-dialog__error">{{ itemsError }}</p>

          <span class="lk-form-dialog__label">Теги</span>
          <!-- Свёрнутый вид (по умолчанию): выбранные теги компактными чипами
               (клик — убрать тег) + кнопка «Выбрать тег», раскрывающая облако. -->
          <div v-if="!isTagCloudOpen" class="lk-form-dialog__tags lk-form-dialog__tags--summary">
            <button
              v-for="tag in tags"
              :key="tag"
              type="button"
              class="lk-form-dialog__tag lk-form-dialog__tag--active"
              :style="{ background: colorForTag(tag).fg, color: '#fff' }"
              :title="`Убрать тег «${tag}»`"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
            <button type="button" class="lk-form-dialog__tags-toggle" @click="isTagCloudOpen = true">
              Выбрать тег
            </button>
          </div>
          <div v-else class="lk-form-dialog__tags">
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
            <button type="button" class="lk-form-dialog__tags-toggle" @click="isTagCloudOpen = false">
              Свернуть
            </button>
          </div>
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

    <LkConfirmDialog
      v-if="removingItem !== null"
      :title="`Удалить строку «${removingItem.name}»?`"
      message="Строка и её комментарии будут удалены безвозвратно."
      confirm-label="Удалить"
      cancel-label="Отмена"
      @confirm="confirmRemoveItem"
      @cancel="cancelRemoveItem"
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

/*
 * Панель — flex-колонка с overflow:hidden: скроллится только середина
 * (`__body`), шапка и футер зафиксированы. Горизонтальные паддинги вынесены
 * с панели на шапку/тело/футер, чтобы скроллбар тела не обрезался
 * скруглённым углом панели и не налезал на контент.
 */
.lk-form-dialog__panel {
  background: #fff;
  width: 100%;
  max-height: 86%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 22px 22px 0 0;
  padding: 24px 0;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
}

/* Ширина ×2 (было 580px): влезают длинные пункты, панель атрибутов и попапы
   тредов (`LkCommentsPopover`, 300px) без обрезки правым краем панели.
   Панель остаётся адаптивной: width:100% + max-width, на узких экранах —
   прежний мобильный fullscreen-вид. */
.lk-form-dialog__panel--desktop {
  max-width: 1160px;
  border-radius: 22px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  margin: auto;
}

/* Паддинг — чтобы широкая панель не прилипала к краям средних экранов. */
.lk-form-dialog__overlay--desktop {
  align-items: center;
  padding: 24px;
}

.lk-form-dialog__form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

/* Скролл-область: вертикально между фиксированными шапкой и футером, поэтому
   скроллбар не пересекается со скруглёнными углами; тонкий скроллбар живёт
   внутри правого паддинга и не наезжает на поля/кнопки. */
.lk-form-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px;
  scrollbar-width: thin;
  scrollbar-color: #cfd6d3 transparent;
}

.lk-form-dialog__body::-webkit-scrollbar {
  width: 8px;
}

.lk-form-dialog__body::-webkit-scrollbar-thumb {
  background: #cfd6d3;
  border-radius: 4px;
}

.lk-form-dialog__body::-webkit-scrollbar-track {
  background: transparent;
}

.lk-form-dialog__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 0 20px;
  margin-bottom: 4px;
}

.lk-form-dialog__panel--desktop .lk-form-dialog__header,
.lk-form-dialog__panel--desktop .lk-form-dialog__body,
.lk-form-dialog__panel--desktop .lk-form-dialog__footer {
  padding-left: 28px;
  padding-right: 28px;
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

/* Точка-индикатор ручного закрепления статуса — слева от бейджа в шапке. */
.lk-form-dialog__status-pin {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #1f2622;
}

.lk-form-dialog__header-status {
  flex-shrink: 0;
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

/* Стили строки пункта (чекбокс/имя/мета/chevron/удалить) — в `LkTaskItemRow.vue`. */
.lk-form-dialog__items {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
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

/* «Выбрать тег» / «Свернуть» — пунктирный чип-переключатель облака тегов. */
.lk-form-dialog__tags-toggle {
  height: 30px;
  padding: 0 12px;
  border: 1.5px dashed #c3cbc7;
  border-radius: 15px;
  background: none;
  color: #5a625e;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.lk-form-dialog__tags-toggle:hover {
  background: #f2f4f3;
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
  flex-shrink: 0;
  padding: 0 20px;
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
