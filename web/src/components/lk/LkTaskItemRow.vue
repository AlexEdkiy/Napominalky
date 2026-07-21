<script setup lang="ts">
import { computed } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkItemAttributes from '@/components/lk/LkItemAttributes.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type {
  ShoppingListItem,
  ShoppingListType,
  UpdateShoppingListItemPayload,
} from '@/types/shoppingList'
import { attributeValuesFromItem, formatDeadlineToken } from '@/utils/itemAttributes'

/**
 * Строка пункта в модалке «Задача/покупка»: чекбокс + название + компактная
 * мета-строка (как в МП: чип количества/теги/дедлайн + индикаторы) + chevron,
 * раскрывающий панель атрибутов (`LkItemAttributes`). Классы верхнего ряда
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
  remove: []
  toggleExpand: []
  update: [patch: UpdateShoppingListItemPayload]
}>()

const values = computed(() => attributeValuesFromItem(props.item))
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
    hasComment.value ||
    hasLink.value,
)

function handleCheck(event: Event): void {
  emit('check', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <li
    class="lk-form-dialog__item"
    :class="{ 'lk-form-dialog__item--checked': item.is_checked }"
  >
    <div class="lk-item-row__top">
      <label class="lk-form-dialog__item-label">
        <input
          type="checkbox"
          class="lk-form-dialog__item-checkbox"
          :style="{ accentColor: accentColor }"
          :checked="item.is_checked"
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
            <span v-if="hasReminder || hasComment || hasLink" class="lk-item-row__indicators">
              <LkIcon v-if="hasReminder" name="bell" :size="12" />
              <LkIcon v-if="hasComment" name="comment" :size="12" />
              <LkIcon v-if="hasLink" name="link" :size="12" />
            </span>
          </span>
        </span>
      </label>
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
        class="lk-form-dialog__item-remove"
        :aria-label="`Удалить ${item.name}`"
        @click="emit('remove')"
      >
        &times;
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
      @update="emit('update', $event)"
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
  transition: transform 0.15s ease;
}

.lk-item-row__chevron:hover {
  background: #eef1f0;
}

.lk-item-row__chevron--expanded {
  transform: rotate(180deg);
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
</style>
