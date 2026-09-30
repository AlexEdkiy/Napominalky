<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId } from 'vue'
import type { ShoppingListItem } from '@/types/shoppingList'

defineProps<{ items: Pick<ShoppingListItem, 'uuid' | 'name' | 'is_checked'>[] }>()

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
  await nextTick()
  const rect = anchor.value?.getBoundingClientRect()
  if (!rect) return
  const width = Math.min(320, window.innerWidth - 24)
  const height = panel.value?.offsetHeight ?? 260
  position.value = {
    left: String(Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))) + 'px',
    top:
      String(Math.max(12, rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 8 : rect.bottom + 8)) +
      'px',
  }
}

function enter(): void {
  clearTimer()
  timer = setTimeout(() => void show(), 250)
}

function leave(): void {
  clearTimer()
  timer = setTimeout(close, 150)
}

onUnmounted(clearTimer)
</script>

<template>
  <span
    ref="anchor"
    class="task-items-popover"
    :aria-describedby="open ? tooltipId : undefined"
    @mouseenter="enter"
    @mouseleave="leave"
    @focusin="show"
    @focusout="close"
    @keydown.esc.stop="close"
  >
    <slot />
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
      <strong>Пункты задачи · {{ items.length }}</strong>
      <p v-if="items.length === 0">Пока нет пунктов</p>
      <ul v-else>
        <li v-for="item in items" :key="item.uuid" :class="{ 'is-done': item.is_checked }">
          <span :aria-label="item.is_checked ? 'Выполнено' : 'Не выполнено'">{{ item.is_checked ? '✓' : '○' }}</span>
          <span>{{ item.name }}</span>
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
  align-items: baseline;
  overflow-wrap: anywhere;
}
li > span:first-child {
  flex-shrink: 0;
}
.is-done {
  color: #a5b2aa;
}
.is-done > span:last-child {
  text-decoration: line-through;
}
</style>
