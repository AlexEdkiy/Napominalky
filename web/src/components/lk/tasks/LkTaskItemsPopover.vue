<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'
import LkStatusBadge from '@/components/lk/LkStatusBadge.vue'
import type { ShoppingListItem } from '@/types/shoppingList'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  items?: Pick<ShoppingListItem, 'uuid' | 'name' | 'is_checked' | 'status'>[] | undefined
}>()

const anchor = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const open = ref(false)
const tooltipId = useId()
const position = ref({ top: '0px', left: '0px' })
let timer: ReturnType<typeof setTimeout> | undefined

function clearTimer(): void {
  clearTimeout(timer)
}

function close(): void {
  clearTimer()
  open.value = false
}

async function show(): Promise<void> {
  clearTimer()
  open.value = true
  await updatePosition()
}

async function updatePosition(): Promise<void> {
  await nextTick()
  const rect = anchor.value?.getBoundingClientRect()
  if (!rect) return
  const width = Math.min(320, window.innerWidth - 24)
  const height = panel.value?.offsetHeight ?? 260
  position.value = {
    left: String(Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))) + 'px',
    top:
      String(
        Math.max(
          12,
          rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 8 : rect.bottom + 8,
        ),
      ) + 'px',
  }
}

watch(() => props.items, () => {
  if (open.value) void updatePosition()
})

function enter(): void {
  clearTimer()
  timer = setTimeout(() => void show(), 250)
}

function leave(): void {
  clearTimer()
  timer = setTimeout(close, 150)
}

function onEscape(event: KeyboardEvent): void {
  if (open.value && event.key === 'Escape') {
    event.stopPropagation()
    close()
  }
}

function onScroll(event: Event): void {
  if (!panel.value?.contains(event.target as Node)) close()
}

function unbind(): void {
  document.removeEventListener('keydown', onEscape, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('keydown', onEscape, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
  } else unbind()
})

onUnmounted(() => {
  clearTimer()
  unbind()
})
</script>

<template>
  <span
    v-bind="$attrs"
    ref="anchor"
    class="task-items-popover"
    :aria-describedby="open ? tooltipId : undefined"
    @mouseenter="enter"
    @mouseleave="leave"
    @focusin="show"
    @focusout="close"
    @keydown.esc="onEscape"
    @click.capture="close"
  >
    <slot :described-by="open ? tooltipId : undefined" />
  </span>
  <Teleport to="body">
    <div
      v-if="open"
      :id="tooltipId"
      ref="panel"
      role="tooltip"
      class="task-items-popover__panel"
      :style="position"
      @mouseenter="clearTimer"
      @mouseleave="leave"
    >
      <strong
        >Пункты задачи<span v-if="items"> · {{ items.length }}</span></strong
      >
      <p v-if="!items">Пункты пока недоступны.</p>
      <p v-else-if="items.length === 0">Пока нет пунктов</p>
      <ul v-else>
        <li v-for="item in items" :key="item.uuid" :class="{ 'is-done': item.is_checked }">
          <span :aria-label="item.is_checked ? 'Выполнено' : 'Не выполнено'">{{
            item.is_checked ? '✓' : '○'
          }}</span>
          <span class="task-items-popover__name">{{ item.name }}</span>
          <LkStatusBadge :status="item.status" />
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<style scoped>
.task-items-popover {
  display: inline-flex;
  min-width: 0;
}
.task-items-popover__panel {
  position: fixed;
  z-index: 100;
  width: min(320px, calc(100vw - 24px));
  max-height: min(260px, calc(100vh - 24px));
  overflow-y: auto;
  box-sizing: border-box;
  padding: 14px;
  border-radius: 12px;
  color: #fff;
  background: #262d29;
  box-shadow: 0 12px 32px #0004;
  font-size: 13px;
}
strong {
  color: #c1cbc5;
  font-size: 12px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  gap: 9px;
}
li {
  display: flex;
  gap: 8px;
  align-items: start;
  overflow-wrap: anywhere;
}
li > span:first-child {
  flex-shrink: 0;
}
.task-items-popover__name {
  flex: 1;
  min-width: 0;
}
.is-done {
  color: #a5b2aa;
}
.is-done > .task-items-popover__name {
  text-decoration: line-through;
}
</style>
