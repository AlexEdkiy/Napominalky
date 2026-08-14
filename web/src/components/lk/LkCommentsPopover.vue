<script setup lang="ts">
import { computed, onUnmounted, ref, useId } from 'vue'

import { formatCommentTimestamp } from '@/utils/datetime'

/**
 * Комментарий для превью в попапе. `itemName` опционален: попап таблицы
 * «Задачи и списки» группирует комментарии по пунктам (имя пункта →
 * его комментарии), попап строки пункта работает без группировки.
 */
export interface LkPopoverComment {
  uuid: string
  author_name: string
  body: string
  created_at: string
  itemName?: string
}

/**
 * Popover с содержимым треда при наведении на 💬-триггер (слот). Показ по
 * `mouseenter` (задержка ~250мс) и `focusin` (доступность), скрытие по
 * `mouseleave` (грейс ~150мс, чтобы курсор успел зайти в панель), `focusout`
 * и Esc. Панель монтируется только в открытом состоянии (`v-if`); флип у
 * нижнего/правого края окна; таймеры чистятся в `onUnmounted`.
 */
interface Props {
  comments: LkPopoverComment[]
}

const props = defineProps<Props>()

/** Задержка показа по hover и грейс скрытия по leave (мс). */
const SHOW_DELAY_MS = 250
const HIDE_GRACE_MS = 150

/** Сколько последних комментариев показывать; остальные — «и ещё N». */
const PREVIEW_LIMIT = 5

/** Оценка габаритов панели для флипа у края окна (px). */
const PANEL_MAX_HEIGHT = 260
const PANEL_WIDTH = 300

const isOpen = ref(false)
const flipUp = ref(false)
const alignRight = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const tooltipId = useId()

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const visibleComments = computed<LkPopoverComment[]>(() =>
  props.comments.slice(-PREVIEW_LIMIT),
)
const hiddenCount = computed<number>(() => props.comments.length - visibleComments.value.length)

/** Заголовок группы (имя пункта) — только когда itemName сменился. */
function groupTitle(index: number): string | null {
  const current = visibleComments.value[index]?.itemName
  if (current === undefined) {
    return null
  }
  const previous = visibleComments.value[index - 1]?.itemName
  return current === previous ? null : current
}

function clearTimers(): void {
  if (showTimer !== null) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

/** Позиционирование с флипом: вниз/влево по умолчанию, у края — вверх/вправо. */
function updatePlacement(): void {
  const rect = rootRef.value?.getBoundingClientRect()
  if (rect === undefined) {
    return
  }
  flipUp.value = rect.bottom + PANEL_MAX_HEIGHT > window.innerHeight
  alignRight.value = rect.left + PANEL_WIDTH > window.innerWidth
}

function open(): void {
  clearTimers()
  if (props.comments.length === 0) {
    return
  }
  updatePlacement()
  isOpen.value = true
}

function close(): void {
  clearTimers()
  isOpen.value = false
}

function handleMouseEnter(): void {
  clearTimers()
  showTimer = setTimeout(open, SHOW_DELAY_MS)
}

function handleMouseLeave(): void {
  clearTimers()
  hideTimer = setTimeout(close, HIDE_GRACE_MS)
}

onUnmounted(clearTimers)
</script>

<template>
  <span
    ref="rootRef"
    class="lk-comments-popover"
    :aria-describedby="isOpen ? tooltipId : undefined"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="open"
    @focusout="close"
    @keydown.esc="close"
  >
    <slot />

    <div
      v-if="isOpen"
      :id="tooltipId"
      role="tooltip"
      class="lk-comments-popover__panel"
      :class="{
        'lk-comments-popover__panel--up': flipUp,
        'lk-comments-popover__panel--right': alignRight,
      }"
    >
      <template v-for="(comment, index) in visibleComments" :key="comment.uuid">
        <p v-if="groupTitle(index) !== null" class="lk-comments-popover__group">
          {{ groupTitle(index) }}
        </p>
        <div class="lk-comments-popover__comment">
          <span class="lk-comments-popover__head">
            <span class="lk-comments-popover__author">{{ comment.author_name }}</span>
            <span class="lk-comments-popover__time">{{ formatCommentTimestamp(comment.created_at) }}</span>
          </span>
          <span class="lk-comments-popover__body">{{ comment.body }}</span>
        </div>
      </template>
      <p v-if="hiddenCount > 0" class="lk-comments-popover__more">и ещё {{ hiddenCount }}</p>
    </div>
  </span>
</template>

<style scoped>
.lk-comments-popover {
  position: relative;
  display: inline-flex;
}

.lk-comments-popover__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 80;
  width: 300px;
  max-width: min(300px, 86vw);
  max-height: 260px;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e3e6e5;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 7px;
  cursor: default;
  text-align: left;
}

.lk-comments-popover__panel--up {
  top: auto;
  bottom: calc(100% + 6px);
}

.lk-comments-popover__panel--right {
  left: auto;
  right: 0;
}

.lk-comments-popover__group {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9aa39f;
}

.lk-comments-popover__group:first-child {
  margin-top: 0;
}

.lk-comments-popover__comment {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.lk-comments-popover__head {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.lk-comments-popover__author {
  font-size: 12px;
  font-weight: 700;
  color: #1f2622;
  white-space: nowrap;
}

.lk-comments-popover__time {
  font-size: 10.5px;
  font-weight: 600;
  color: #9aa39f;
  white-space: nowrap;
}

.lk-comments-popover__body {
  font-size: 12.5px;
  font-weight: 500;
  color: #3a423e;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.lk-comments-popover__more {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #8a938f;
}
</style>
