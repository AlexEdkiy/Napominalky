<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import LkCommentsPopover from '@/components/lk/LkCommentsPopover.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkItemAttributes from '@/components/lk/LkItemAttributes.vue'
import LkItemCommentsThread from '@/components/lk/LkItemCommentsThread.vue'
import LkStatusBadge from '@/components/lk/LkStatusBadge.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type {
  ShoppingListItem,
  ShoppingListType,
  TaskStatus,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'
import { attributeValuesFromItem, formatDeadlineToken } from '@/utils/itemAttributes'

/**
 * Строка пункта в модалке «Задача/покупка»: чекбокс + название + компактная
 * мета-строка (как в МП: чип количества/теги/дедлайн + индикаторы) + кнопка
 * 💬 (счётчик треда; hover — попап-превью, клик — раскрыть к треду) + chevron
 * + крестик удаления строки (подтверждение — у родителя, см. `removeRequest`).
 * В раскрытом виде: панель атрибутов (`LkItemAttributes`) и тред
 * комментариев (`LkItemCommentsThread`). Классы верхнего ряда
 * (`lk-form-dialog__item*`) сохранены от прежней инлайн-разметки диалога.
 */
interface Props {
  item: ShoppingListItem
  listType: ShoppingListType
  accentColor: string
  accentSoft: string
  expanded: boolean
  tagSuggestions: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  check: [checked: boolean]
  removeRequest: []
  toggleExpand: []
  update: [patch: UpdateShoppingListItemPayload]
  addComment: [body: string]
}>()

const values = computed(() => attributeValuesFromItem(props.item))
/** Статусы только у пунктов tasks-списков; у goods их нет вовсе. */
const showStatus = computed<boolean>(() => props.listType === 'tasks')
/**
 * «Выполнен» для зачёркивания/чекбокса: у tasks — по `status === 'done'`
 * (сервер гарантирует эквивалент `is_checked`), у goods — по `is_checked`.
 */
const isDone = computed<boolean>(() =>
  props.listType === 'tasks' ? props.item.status === 'done' : props.item.is_checked,
)
const quantity = computed<number>(() => props.item.quantity ?? 1)
const showQuantityChip = computed<boolean>(() => props.listType === 'goods' && quantity.value > 1)
const showDeadlineChip = computed<boolean>(
  () => props.listType === 'tasks' && props.item.deadline !== null,
)
const hasReminder = computed<boolean>(() => props.item.reminder_at !== null)
/** Индикатор наличия треда — по счётчику комментариев (не по legacy `comment`). */
const hasComment = computed<boolean>(() => props.item.comments_count > 0)
const hasLink = computed<boolean>(() => (props.item.link ?? '') !== '')
const hasMetaLine = computed<boolean>(
  () =>
    showQuantityChip.value ||
    showDeadlineChip.value ||
    props.item.tags.length > 0 ||
    hasReminder.value ||
    hasLink.value,
)

/**
 * Сигнал «раскрыть к треду»: кнопка 💬 инкрементирует счётчик — тред
 * фокусирует поле ввода (в т.ч. сразу после монтирования раскрытой панели).
 * Сбрасывается при сворачивании, чтобы chevron-раскрытие не крало фокус.
 */
const threadFocusSignal = ref(0)

watch(
  () => props.expanded,
  (expanded) => {
    if (!expanded) {
      threadFocusSignal.value = 0
    }
  },
)

function handleCheck(event: Event): void {
  emit('check', (event.target as HTMLInputElement).checked)
}

/** Меню бейджа статуса пункта (без «Авто») → PUT пункта `{ status }` наверху. */
function handleStatusSelect(value: TaskStatus | 'auto'): void {
  if (value !== 'auto') {
    emit('update', { status: value })
  }
}

function handleCommentClick(): void {
  threadFocusSignal.value += 1
  if (!props.expanded) {
    emit('toggleExpand')
  }
}

/**
 * Инлайн-редактирование названия пункта: карандаш рядом с именем переводит
 * его в `<input>`. Enter/blur сохраняют (PUT `{ name }` наверху), Esc —
 * отмена с откатом. Триггер — ТОЛЬКО кнопка-карандаш (`.prevent.stop`):
 * клик по самому имени по-прежнему работает как label чекбокса, а Esc в
 * инпуте гасится `.stop`, чтобы не закрыть модалку.
 */
const isEditingName = ref(false)
const nameDraft = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

async function startNameEdit(): Promise<void> {
  nameDraft.value = props.item.name
  isEditingName.value = true
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

/** Enter/blur: пустое/пробельное или неизменённое имя НЕ отправляем — откат. */
function commitNameEdit(): void {
  if (!isEditingName.value) {
    return
  }
  isEditingName.value = false
  const name = nameDraft.value.trim()
  if (name !== '' && name !== props.item.name) {
    emit('update', { name })
  }
}

function cancelNameEdit(): void {
  isEditingName.value = false
  nameDraft.value = props.item.name
}
</script>

<template>
  <li class="lk-form-dialog__item" :class="{ 'lk-form-dialog__item--checked': isDone }">
    <div class="lk-item-row__top">
      <label class="lk-form-dialog__item-label">
        <input
          type="checkbox"
          class="lk-form-dialog__item-checkbox"
          :style="{ accentColor: accentColor }"
          :checked="isDone"
          @change="handleCheck"
        />
        <span class="lk-item-row__name-block">
          <!-- Редактирование имени: карандаш → input. `.prevent.stop` на кнопке
               и инпуте не дают label переключить чекбокс; Enter — `.prevent`,
               чтобы не сабмитить форму диалога; Esc — `.stop`, чтобы не закрыть
               модалку (слушатель на window его не увидит). -->
          <input
            v-if="isEditingName"
            ref="nameInput"
            v-model="nameDraft"
            type="text"
            class="lk-item-row__name-input"
            maxlength="255"
            :aria-label="`Новое название пункта ${item.name}`"
            @click.prevent.stop
            @keydown.enter.prevent.stop="commitNameEdit"
            @keydown.esc.stop="cancelNameEdit"
            @blur="commitNameEdit"
          />
          <span v-else class="lk-item-row__name-line">
            <LkCommentsPopover
              v-if="listType === 'tasks' && hasComment"
              v-slot="{ describedBy }"
              :comments="item.comments"
              teleported
              full-thread
            >
              <span
                class="lk-form-dialog__item-name"
                tabindex="0"
                :aria-describedby="describedBy"
                >{{ item.name }}</span
              >
            </LkCommentsPopover>
            <span v-else class="lk-form-dialog__item-name">{{ item.name }}</span>
            <button
              type="button"
              class="lk-item-row__name-edit"
              :aria-label="`Переименовать ${item.name}`"
              @click.prevent.stop="startNameEdit"
            >
              <LkIcon name="edit" :size="12" />
            </button>
          </span>
          <span v-if="hasMetaLine" class="lk-item-row__meta">
            <span
              v-if="showQuantityChip"
              class="lk-item-row__meta-chip"
              :style="{ background: accentSoft, color: accentColor }"
            >
              ×{{ quantity }}
            </span>
            <LkTagPill v-for="tag in item.tags" :key="tag" :tag="tag" />
            <span
              v-if="showDeadlineChip && item.deadline"
              class="lk-item-row__meta-chip"
              :style="{ background: accentSoft, color: accentColor }"
            >
              <LkIcon name="calendar" :size="11" />
              {{ formatDeadlineToken(item.deadline) }}
            </span>
            <span v-if="hasReminder || hasLink" class="lk-item-row__indicators">
              <LkIcon v-if="hasReminder" name="bell" :size="12" />
              <LkIcon v-if="hasLink" name="link" :size="12" />
            </span>
          </span>
        </span>
      </label>
      <LkStatusBadge
        v-if="showStatus"
        class="lk-item-row__status"
        :status="item.status"
        interactive
        @select="handleStatusSelect"
      />
      <LkCommentsPopover :comments="item.comments">
        <button
          type="button"
          class="lk-item-row__comment-btn"
          :class="{ 'lk-item-row__comment-btn--active': hasComment }"
          :style="hasComment ? { background: accentSoft, color: accentColor } : undefined"
          :aria-label="`Комментарии: ${item.name}`"
          @click.stop="handleCommentClick"
        >
          <LkIcon name="comment" :size="16" />
          <span v-if="hasComment" class="lk-item-row__comment-count">{{
            item.comments_count
          }}</span>
        </button>
      </LkCommentsPopover>
      <button
        type="button"
        class="lk-item-row__chevron"
        :class="{ 'lk-item-row__chevron--expanded': expanded }"
        :aria-expanded="expanded"
        :aria-label="expanded ? `Свернуть ${item.name}` : `Развернуть ${item.name}`"
        @click="emit('toggleExpand')"
      >
        <LkIcon name="chevron-down" :size="16" />
      </button>
      <button
        type="button"
        class="lk-item-row__remove"
        :aria-label="`Удалить строку ${item.name}`"
        @click.stop="emit('removeRequest')"
      >
        &times;
      </button>
    </div>

    <template v-if="expanded">
      <LkItemAttributes
        :values="values"
        :list-type="listType"
        :quantity="quantity"
        :accent-color="accentColor"
        :accent-soft="accentSoft"
        :tag-suggestions="tagSuggestions"
        @update="emit('update', $event)"
      />
      <LkItemCommentsThread
        :comments="item.comments"
        :accent-color="accentColor"
        :focus-signal="threadFocusSignal"
        @submit="emit('addComment', $event)"
      />
    </template>
  </li>
</template>

<style scoped>
.lk-form-dialog__item {
  display: flex;
  flex-direction: column;
  padding: 9px 2px;
  border-bottom: 1px solid #eef1f0;
}

.lk-form-dialog__item:last-child {
  border-bottom: none;
}

.lk-item-row__top {
  display: flex;
  align-items: center;
  gap: 6px;
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

.lk-item-row__name-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lk-item-row__name-line {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lk-form-dialog__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
  font-weight: 600;
}

/* Карандаш переименования — приглушён, подсвечивается на hover строки. */
.lk-item-row__name-edit {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #b3bab6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-item-row__name-edit:hover {
  background: #eef1f0;
  color: #5a625e;
}

/* Инлайн-инпут имени — компактный, на месте названия. */
.lk-item-row__name-input {
  width: 100%;
  height: 28px;
  box-sizing: border-box;
  border: 1.5px solid #e3e6e5;
  border-radius: 8px;
  padding: 0 8px;
  background: #fbfcfb;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #1f2622;
}

.lk-form-dialog__item--checked .lk-form-dialog__item-name {
  text-decoration: line-through;
  color: #9aa39f;
}

.lk-item-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.lk-item-row__meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.lk-item-row__indicators {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #9aa39f;
}

/* Компактный бейдж статуса пункта — между названием и кнопкой 💬. */
.lk-item-row__status {
  flex-shrink: 0;
}

/* Кнопка 💬 — визуально как chevron; активная (есть комментарии) красится
   инлайн в accentSoft/accentColor и несёт бейдж-счётчик треда. */
.lk-item-row__comment-btn,
.lk-item-row__chevron,
.lk-item-row__remove {
  flex-shrink: 0;
  min-width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: none;
  color: #8a938f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-item-row__comment-btn {
  gap: 3px;
  padding: 0 5px;
}

.lk-item-row__comment-count {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.lk-item-row__chevron {
  transition: transform 0.15s ease;
}

.lk-item-row__comment-btn:hover:not(.lk-item-row__comment-btn--active),
.lk-item-row__chevron:hover {
  background: #eef1f0;
}

.lk-item-row__chevron--expanded {
  transform: rotate(180deg);
}

/* Крестик удаления строки — как в дизайне: последний в ряду, деструктивный
   красный появляется на hover. */
.lk-item-row__remove {
  font-size: 18px;
  line-height: 1;
}

.lk-item-row__remove:hover {
  background: #fbe3df;
  color: #cf5b4a;
}
</style>
