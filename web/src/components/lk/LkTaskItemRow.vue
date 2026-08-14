<script setup lang="ts">
import { computed, ref } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkItemAttributes from '@/components/lk/LkItemAttributes.vue'
import LkStatusBadge from '@/components/lk/LkStatusBadge.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type {
  ShoppingListItem,
  ShoppingListType,
  TaskStatus,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'
import {
  attributeValuesFromItem,
  formatDeadlineToken,
  type ItemAttribute,
} from '@/utils/itemAttributes'

/**
 * Строка пункта в модалке «Задача/покупка»: чекбокс + название + компактная
 * мета-строка (как в МП: чип количества/теги/дедлайн + индикаторы) + кнопка
 * «Комментарий» + chevron, раскрывающий панель атрибутов (`LkItemAttributes`).
 * Классы верхнего ряда (`lk-form-dialog__item*`) сохранены от прежней
 * инлайн-разметки диалога.
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
  remove: []
  toggleExpand: []
  update: [patch: UpdateShoppingListItemPayload]
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
const hasComment = computed<boolean>(() => (props.item.comment ?? '') !== '')
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
 * Сигнал авто-открытия редактора атрибута в раскрытой панели: кнопка
 * «Комментарий» в строке ставит `'comment'`, панель открывает редактор
 * и эмитит `autoOpened` — сигнал сбрасывается, чтобы повторный клик
 * срабатывал снова.
 */
const autoOpenAttribute = ref<ItemAttribute | null>(null)

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
  autoOpenAttribute.value = 'comment'
  if (!props.expanded) {
    emit('toggleExpand')
  }
}

function handleAutoOpened(): void {
  autoOpenAttribute.value = null
}
</script>

<template>
  <li
    class="lk-form-dialog__item"
    :class="{ 'lk-form-dialog__item--checked': isDone }"
  >
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
          <span class="lk-form-dialog__item-name">{{ item.name }}</span>
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
      <button
        type="button"
        class="lk-item-row__comment-btn"
        :class="{ 'lk-item-row__comment-btn--active': hasComment }"
        :style="hasComment ? { background: accentSoft, color: accentColor } : undefined"
        :aria-label="`Комментарий: ${item.name}`"
        @click.stop="handleCommentClick"
      >
        <LkIcon name="comment" :size="16" />
      </button>
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
    </div>

    <LkItemAttributes
      v-if="expanded"
      :values="values"
      :list-type="listType"
      :quantity="quantity"
      :accent-color="accentColor"
      :accent-soft="accentSoft"
      :tag-suggestions="tagSuggestions"
      :auto-open-attribute="autoOpenAttribute"
      @update="emit('update', $event)"
      @remove="emit('remove')"
      @auto-opened="handleAutoOpened"
    />
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

/* Компактный бейдж статуса пункта — между названием и кнопкой «Комментарий». */
.lk-item-row__status {
  flex-shrink: 0;
}

/* Кнопка «Комментарий» — визуально как chevron; активная (комментарий задан)
   красится инлайн в accentSoft/accentColor и служит индикатором наличия. */
.lk-item-row__comment-btn,
.lk-item-row__chevron {
  flex-shrink: 0;
  width: 28px;
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

</style>
