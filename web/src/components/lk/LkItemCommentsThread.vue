<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import type { ShoppingListItemComment } from '@/types/shoppingList'
import { formatCommentTimestamp } from '@/utils/datetime'

/**
 * Тред комментариев в раскрытой строке пункта: список (автор жирным, время
 * «HH:MM DD.MM.YY» приглушённо, текст) + форма «текст → Отправить». Время и
 * автор проставляются сервером — форма отправляет только текст. Enter —
 * отправка, Shift+Enter — перенос строки.
 */
interface Props {
  comments: ShoppingListItemComment[]
  accentColor: string
  /**
   * Сигнал «сфокусировать поле ввода» от кнопки 💬 в строке пункта:
   * инкремент счётчика → фокус textarea (в т.ч. сразу после монтирования
   * панели раскрытой строки).
   */
  focusSignal?: number
}

const props = withDefaults(defineProps<Props>(), { focusSignal: 0 })

const emit = defineEmits<{
  submit: [body: string]
}>()

const draft = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSubmit = computed<boolean>(() => draft.value.trim() !== '')

watch(
  () => props.focusSignal,
  async (signal) => {
    if (signal > 0) {
      await nextTick()
      textareaRef.value?.focus()
      textareaRef.value?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
  },
  { immediate: true },
)

function submit(): void {
  const body = draft.value.trim()
  if (body === '') {
    return
  }
  emit('submit', body)
  draft.value = ''
}
</script>

<template>
  <div class="lk-comments-thread">
    <p v-if="comments.length === 0" class="lk-comments-thread__empty">Комментариев пока нет</p>
    <ul v-else class="lk-comments-thread__list">
      <li v-for="comment in comments" :key="comment.uuid" class="lk-comments-thread__item">
        <span class="lk-comments-thread__head">
          <span class="lk-comments-thread__author">{{ comment.author_name }}</span>
          <span class="lk-comments-thread__time">{{ formatCommentTimestamp(comment.created_at) }}</span>
        </span>
        <span class="lk-comments-thread__body">{{ comment.body }}</span>
      </li>
    </ul>

    <div class="lk-comments-thread__form">
      <textarea
        ref="textareaRef"
        v-model="draft"
        rows="2"
        class="lk-comments-thread__input"
        placeholder="Написать комментарий…"
        aria-label="Новый комментарий"
        @keydown.enter.exact.prevent="submit"
      />
      <button
        type="button"
        class="lk-comments-thread__send"
        :style="{ background: accentColor }"
        :disabled="!canSubmit"
        @click="submit"
      >
        Отправить
      </button>
    </div>
  </div>
</template>

<style scoped>
.lk-comments-thread {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px 10px 32px;
}

.lk-comments-thread__empty {
  margin: 0;
  font-size: 12.5px;
  color: #9aa39f;
}

.lk-comments-thread__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lk-comments-thread__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #f6f8f7;
}

.lk-comments-thread__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.lk-comments-thread__author {
  font-size: 12.5px;
  font-weight: 700;
  color: #1f2622;
}

.lk-comments-thread__time {
  font-size: 11px;
  font-weight: 600;
  color: #9aa39f;
}

.lk-comments-thread__body {
  font-size: 13px;
  color: #3a423e;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.lk-comments-thread__form {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.lk-comments-thread__input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  border: 1.5px solid #e3e6e5;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fbfcfb;
  font-size: 13px;
  font-weight: 500;
  color: #1f2622;
  font-family: inherit;
  resize: vertical;
}

.lk-comments-thread__send {
  flex-shrink: 0;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.lk-comments-thread__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
