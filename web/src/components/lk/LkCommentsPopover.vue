<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'

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
 * Popover с содержимым треда при наведении на 💬-триггер (слот): тёмное окно
 * (как на макете) с заголовком «КОММЕНТАРИИ · N». Показ по `mouseenter`
 * (задержка ~250мс) и `focusin` (доступность), скрытие по `mouseleave`
 * (грейс ~150мс, чтобы курсор успел зайти в панель), `focusout` и Esc.
 * Панель монтируется только в открытом состоянии (`v-if`); флип у
 * нижнего/правого края окна; таймеры чистятся в `onUnmounted`.
 */
interface Props {
  comments: LkPopoverComment[]
  /** Вынос из прокручиваемой формы; полный тред для названия пункта. */
  teleported?: boolean
  fullThread?: boolean
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
const panelRef = ref<HTMLElement | null>(null)
const position = ref({ top: '0px', left: '0px' })
const tooltipId = useId()

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const visibleComments = computed<LkPopoverComment[]>(() =>
  props.fullThread ? props.comments : props.comments.slice(-PREVIEW_LIMIT),
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

/** Обрезает ли контейнер содержимое по данному значению overflow. */
function clipsOverflow(value: string): boolean {
  return value === 'hidden' || value === 'auto' || value === 'scroll' || value === 'clip'
}

/**
 * Правая/нижняя границы, в которые должна вписаться панель: ближайший
 * обрезающий предок (например, скролл-тело модалки формы — иначе попап
 * режется её краем) либо окно, если таких предков нет.
 */
function clipBounds(): { right: number; bottom: number } {
  let ancestor = rootRef.value?.parentElement ?? null
  while (ancestor !== null) {
    const style = window.getComputedStyle(ancestor)
    if (clipsOverflow(style.overflowX) || clipsOverflow(style.overflowY)) {
      const rect = ancestor.getBoundingClientRect()
      return {
        right: Math.min(rect.right, window.innerWidth),
        bottom: Math.min(rect.bottom, window.innerHeight),
      }
    }
    ancestor = ancestor.parentElement
  }
  return { right: window.innerWidth, bottom: window.innerHeight }
}

/** Позиционирование с флипом: вниз/влево по умолчанию, у края — вверх/вправо. */
function updatePlacement(): void {
  const rect = rootRef.value?.getBoundingClientRect()
  if (rect === undefined) {
    return
  }
  const bounds = clipBounds()
  flipUp.value = rect.bottom + PANEL_MAX_HEIGHT > bounds.bottom
  alignRight.value = rect.left + PANEL_WIDTH > bounds.right
}

async function open(): Promise<void> {
  clearTimers()
  if (props.comments.length === 0) {
    return
  }
  updatePlacement()
  isOpen.value = true
  if (props.teleported) {
    await nextTick()
    const rect = rootRef.value?.getBoundingClientRect()
    if (!rect) return
    const width = panelRef.value?.offsetWidth ?? PANEL_WIDTH
    const height = panelRef.value?.offsetHeight ?? PANEL_MAX_HEIGHT
    position.value = {
      left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
      top: `${Math.max(12, rect.bottom + height + 6 > window.innerHeight ? rect.top - height - 6 : rect.bottom + 6)}px`,
    }
  }
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

function onEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
  }
}

function onScroll(event: Event): void {
  if (!panelRef.value?.contains(event.target as Node)) close()
}

function unbind(): void {
  document.removeEventListener('keydown', onEscape, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
}

watch(isOpen, (value) => {
  if (value && props.teleported) {
    document.addEventListener('keydown', onEscape, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
  } else unbind()
})

onUnmounted(() => {
  clearTimers()
  unbind()
})
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
    @click.capture="teleported && close()"
  >
    <slot :described-by="isOpen ? tooltipId : undefined" />

    <Teleport to="body" :disabled="!teleported">
      <div
        v-if="isOpen"
        :id="tooltipId"
        ref="panelRef"
        :style="teleported ? position : undefined"
        role="tooltip"
        class="lk-comments-popover__panel"
        :class="{
          'lk-comments-popover__panel--up': !teleported && flipUp,
          'lk-comments-popover__panel--right': !teleported && alignRight,
          'lk-comments-popover__panel--fixed': teleported,
        }"
        @mouseenter="clearTimers"
        @mouseleave="handleMouseLeave"
        @click.stop.prevent
      >
        <p class="lk-comments-popover__header">Комментарии · {{ comments.length }}</p>
        <template v-for="(comment, index) in visibleComments" :key="comment.uuid">
          <p v-if="groupTitle(index) !== null" class="lk-comments-popover__group">
            {{ groupTitle(index) }}
          </p>
          <div class="lk-comments-popover__comment">
            <span class="lk-comments-popover__head">
              <span class="lk-comments-popover__author">{{ comment.author_name }}</span>
              <span class="lk-comments-popover__time">{{
                formatCommentTimestamp(comment.created_at)
              }}</span>
            </span>
            <span class="lk-comments-popover__body">{{ comment.body }}</span>
          </div>
        </template>
        <p v-if="hiddenCount > 0" class="lk-comments-popover__more">и ещё {{ hiddenCount }}</p>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.lk-comments-popover {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

/* Тёмное окно — как на макете («КОММЕНТАРИИ · N» на тёмном фоне). */
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
  background: #262d29;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
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

.lk-comments-popover__panel--fixed {
  position: fixed;
  z-index: 110;
  max-width: calc(100vw - 24px);
  max-height: min(260px, calc(100vh - 24px));
}

/* Заголовок окна «КОММЕНТАРИИ · N» (uppercase — визуально как на макете). */
.lk-comments-popover__header {
  margin: 0 0 1px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.lk-comments-popover__group {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
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
  color: #fff;
  white-space: nowrap;
}

.lk-comments-popover__time {
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.lk-comments-popover__body {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.lk-comments-popover__more {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
}
</style>
