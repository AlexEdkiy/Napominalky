<script setup lang="ts">
import { computed, ref } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import type { ShoppingListType, UpdateShoppingListItemPayload } from '@/types/shoppingList'
import { dateTimeLocalToIso, isoToDateTimeLocal } from '@/utils/datetime'
import {
  ATTRIBUTE_ICONS,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_ORDER,
  formatAttributeToken,
  isAttributeSet,
  isValidLink,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'

/**
 * Панель атрибутов раскрытой строки пункта: дедлайн/напоминание/ссылка/тег +
 * степпер количества (goods). Комментарии — НЕ здесь: тред живёт отдельным
 * компонентом `LkItemCommentsThread` под панелью; удаление строки — крестиком
 * в основной строке пункта (`LkTaskItemRow`).
 */
interface Props {
  values: ItemAttributeValues
  listType: ShoppingListType
  quantity: number
  accentColor: string
  accentSoft: string
  tagSuggestions: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [patch: UpdateShoppingListItemPayload]
}>()

/**
 * Открытый инлайн-редактор значения (веб-эквивалент шторки AttributeSheet из
 * МП): рендерится компактным блоком под рядом токенов/чипсов.
 */
const activeEditor = ref<ItemAttribute | null>(null)
const draftText = ref('')
const draftTags = ref<string[]>([])
const tagInput = ref('')
const linkError = ref<string | null>(null)

const setAttributes = computed<ItemAttribute[]>(() =>
  ATTRIBUTE_ORDER.filter((attribute) => isAttributeSet(attribute, props.values)),
)
const availableAttributes = computed<ItemAttribute[]>(() =>
  ATTRIBUTE_ORDER.filter((attribute) => !isAttributeSet(attribute, props.values)),
)
const availableSuggestions = computed<string[]>(() =>
  props.tagSuggestions.filter((tag) => !draftTags.value.includes(tag)),
)

function currentDraftFor(attribute: ItemAttribute): string {
  switch (attribute) {
    case 'deadline':
      return props.values.deadline ?? ''
    case 'reminder':
      return isoToDateTimeLocal(props.values.reminderAt)
    case 'link':
      return props.values.link ?? ''
    default:
      return ''
  }
}

function openEditor(attribute: ItemAttribute): void {
  activeEditor.value = attribute
  linkError.value = null
  tagInput.value = ''
  draftText.value = currentDraftFor(attribute)
  draftTags.value = attribute === 'tag' ? [...props.values.tags] : []
}

function closeEditor(): void {
  activeEditor.value = null
  linkError.value = null
}

function removeAttribute(attribute: ItemAttribute): void {
  if (activeEditor.value === attribute) {
    closeEditor()
  }
  if (attribute === 'tag') {
    emit('update', { tags: [] })
    return
  }
  const patchByAttribute: Record<Exclude<ItemAttribute, 'tag'>, UpdateShoppingListItemPayload> = {
    deadline: { deadline: null },
    reminder: { reminder_at: null },
    link: { link: null },
  }
  emit('update', patchByAttribute[attribute])
}

function addTagFromInput(): void {
  const tag = tagInput.value.trim()
  if (tag !== '' && !draftTags.value.includes(tag)) {
    draftTags.value = [...draftTags.value, tag]
  }
  tagInput.value = ''
}

function removeDraftTag(tag: string): void {
  draftTags.value = draftTags.value.filter((existing) => existing !== tag)
}

function addSuggestedTag(tag: string): void {
  draftTags.value = [...draftTags.value, tag]
}

function buildPatch(attribute: ItemAttribute): UpdateShoppingListItemPayload | null {
  const text = draftText.value.trim()
  switch (attribute) {
    case 'deadline':
      return { deadline: text === '' ? null : text }
    case 'reminder':
      return { reminder_at: dateTimeLocalToIso(text) }
    case 'link':
      if (text !== '' && !isValidLink(text)) {
        linkError.value = 'Введите корректную ссылку, например ozon.ru/product'
        return null
      }
      return { link: text === '' ? null : text }
    default:
      addTagFromInput()
      return { tags: draftTags.value }
  }
}

function applyEditor(): void {
  const attribute = activeEditor.value
  if (attribute === null) {
    return
  }
  const patch = buildPatch(attribute)
  if (patch === null) {
    return
  }
  emit('update', patch)
  closeEditor()
}

function changeQuantity(delta: number): void {
  const next = Math.max(1, props.quantity + delta)
  if (next !== props.quantity) {
    emit('update', { quantity: next })
  }
}
</script>

<template>
  <div class="lk-item-attrs">
    <!-- Степпер количества — только у goods; «Удалить строку» переехала
         крестиком в основную строку пункта (LkTaskItemRow). -->
    <div v-if="listType === 'goods'" class="lk-item-attrs__toolbar">
      <div class="lk-item-attrs__quantity">
        <span class="lk-item-attrs__quantity-label">Количество</span>
        <button
          type="button"
          class="lk-item-attrs__step"
          aria-label="Уменьшить количество"
          :disabled="quantity <= 1"
          :style="{ color: accentColor }"
          @click="changeQuantity(-1)"
        >
          −
        </button>
        <span class="lk-item-attrs__quantity-value">{{ quantity }}</span>
        <button
          type="button"
          class="lk-item-attrs__step"
          aria-label="Увеличить количество"
          :style="{ color: accentColor }"
          @click="changeQuantity(1)"
        >
          +
        </button>
      </div>
    </div>

    <div class="lk-item-attrs__chips">
      <span
        v-for="attribute in setAttributes"
        :key="`token-${attribute}`"
        class="lk-item-attrs__token"
        :style="{ background: accentSoft, color: accentColor }"
      >
        <button
          type="button"
          class="lk-item-attrs__token-open"
          :style="{ color: accentColor }"
          :aria-label="`${ATTRIBUTE_LABELS[attribute]}: ${formatAttributeToken(attribute, values)}`"
          @click="openEditor(attribute)"
        >
          <LkIcon :name="ATTRIBUTE_ICONS[attribute]" :size="13" />
          <span class="lk-item-attrs__token-text">{{ formatAttributeToken(attribute, values) }}</span>
        </button>
        <button
          type="button"
          class="lk-item-attrs__token-remove"
          :style="{ color: accentColor }"
          :aria-label="`Удалить ${ATTRIBUTE_LABELS[attribute].toLowerCase()}`"
          @click="removeAttribute(attribute)"
        >
          &times;
        </button>
      </span>

      <button
        v-for="attribute in availableAttributes"
        :key="`chip-${attribute}`"
        type="button"
        class="lk-item-attrs__chip"
        :style="{ color: accentColor }"
        :aria-label="`Добавить: ${ATTRIBUTE_LABELS[attribute]}`"
        @click="openEditor(attribute)"
      >
        <LkIcon :name="ATTRIBUTE_ICONS[attribute]" :size="13" />
        {{ ATTRIBUTE_LABELS[attribute] }}
      </button>
    </div>

    <div v-if="activeEditor !== null" class="lk-item-attrs__editor">
      <span class="lk-item-attrs__editor-title">{{ ATTRIBUTE_LABELS[activeEditor] }}</span>

      <input
        v-if="activeEditor === 'deadline'"
        v-model="draftText"
        type="date"
        class="lk-item-attrs__input"
        aria-label="Дата дедлайна"
      />

      <input
        v-else-if="activeEditor === 'reminder'"
        v-model="draftText"
        type="datetime-local"
        class="lk-item-attrs__input"
        aria-label="Дата и время напоминания"
      />

      <template v-else-if="activeEditor === 'link'">
        <input
          v-model="draftText"
          type="url"
          class="lk-item-attrs__input"
          placeholder="https://…"
          aria-label="Адрес ссылки"
          @input="linkError = null"
        />
        <span v-if="linkError" role="alert" class="lk-item-attrs__error">{{ linkError }}</span>
      </template>

      <template v-else>
        <div v-if="draftTags.length > 0" class="lk-item-attrs__tag-list">
          <span v-for="tag in draftTags" :key="tag" class="lk-item-attrs__tag">
            <LkTagPill :tag="tag" />
            <button
              type="button"
              class="lk-item-attrs__tag-remove"
              :aria-label="`Убрать тег ${tag}`"
              @click="removeDraftTag(tag)"
            >
              &times;
            </button>
          </span>
        </div>
        <input
          v-model="tagInput"
          type="text"
          class="lk-item-attrs__input"
          placeholder="Новый тег"
          aria-label="Название тега"
          @keydown.enter.prevent="addTagFromInput"
        />
        <div v-if="availableSuggestions.length > 0" class="lk-item-attrs__suggestions">
          <button
            v-for="tag in availableSuggestions"
            :key="tag"
            type="button"
            class="lk-item-attrs__suggestion"
            @click="addSuggestedTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </template>

      <div class="lk-item-attrs__editor-actions">
        <button type="button" class="lk-item-attrs__editor-cancel" @click="closeEditor">Отмена</button>
        <button
          type="button"
          class="lk-item-attrs__editor-apply"
          :style="{ background: accentColor }"
          @click="applyEditor"
        >
          Готово
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.lk-item-attrs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 2px 12px 32px;
}

.lk-item-attrs__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lk-item-attrs__quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lk-item-attrs__quantity-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #5a625e;
  margin-right: 4px;
}

.lk-item-attrs__quantity-value {
  min-width: 24px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #1f2622;
}

.lk-item-attrs__step {
  width: 30px;
  height: 30px;
  border: 1px solid #e3e6e5;
  border-radius: 9px;
  background: #fff;
  font-size: 17px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
}

.lk-item-attrs__step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lk-item-attrs__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.lk-item-attrs__token {
  display: inline-flex;
  align-items: center;
  height: 30px;
  border-radius: 15px;
  padding: 0 4px 0 0;
  max-width: 240px;
}

.lk-item-attrs__token-open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 100%;
  padding: 0 2px 0 11px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.lk-item-attrs__token-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-item-attrs__token-remove {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: none;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.lk-item-attrs__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border: 1.4px solid #e3e6e5;
  border-radius: 15px;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.lk-item-attrs__editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e3e6e5;
  border-radius: 12px;
  background: #fff;
}

.lk-item-attrs__editor-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa39f;
}

.lk-item-attrs__input {
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  border: 1.5px solid #e3e6e5;
  border-radius: 10px;
  padding: 0 10px;
  background: #fbfcfb;
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2622;
  font-family: inherit;
}

.lk-item-attrs__error {
  color: #cf5b4a;
  font-size: 0.78rem;
}

.lk-item-attrs__tag-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.lk-item-attrs__tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.lk-item-attrs__tag-remove {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #eef1f0;
  color: #6b716e;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.lk-item-attrs__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lk-item-attrs__suggestion {
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 13px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.lk-item-attrs__editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.lk-item-attrs__editor-cancel {
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 9px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.lk-item-attrs__editor-apply {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
</style>
