<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { LK_STATUS_COLORS, LK_STATUS_LABELS, LK_STATUS_ORDER } from '@/constants/lkStatusColors'
import type { TaskStatus } from '@/types/shoppingList'

/**
 * Pill-бейдж статуса задачи/пункта (стиль как `LkTagPill`). В интерактивном режиме
 * клик открывает меню из 4 статусов (+ пункт «Авто» для задачи — сброс ручного
 * закрепления); выбор эмитится наверх, PUT делает родитель; закрытие — по выбору/клику вне/Esc.
 */
interface Props {
  status: TaskStatus
  /** Интерактивный режим: бейдж — кнопка с выпадающим меню статусов. */
  interactive?: boolean
  /** Пункт «Авто» в меню — только для задачи (у пунктов автоматики нет). */
  withAuto?: boolean
}

const props = withDefaults(defineProps<Props>(), { interactive: false, withAuto: false })

const emit = defineEmits<{
  select: [value: TaskStatus | 'auto']
}>()

const rootEl = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const label = computed<string>(() => LK_STATUS_LABELS[props.status])
const colors = computed(() => LK_STATUS_COLORS[props.status])

function closeOnOutsideClick(event: MouseEvent): void {
  if (rootEl.value !== null && !rootEl.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function closeOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    // Esc закрывает только меню (верхний слой): гасим событие, чтобы
    // window-обработчик модалки формы не закрыл заодно и модалку.
    event.stopPropagation()
    isOpen.value = false
  }
}

function unbindDocumentListeners(): void {
  document.removeEventListener('mousedown', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
  } else {
    unbindDocumentListeners()
  }
})

onUnmounted(unbindDocumentListeners)

function toggleMenu(): void {
  isOpen.value = !isOpen.value
}

function selectValue(value: TaskStatus | 'auto'): void {
  isOpen.value = false
  emit('select', value)
}
</script>

<template>
  <span ref="rootEl" class="lk-status-badge">
    <button
      v-if="interactive"
      type="button"
      class="lk-status-badge__pill lk-status-badge__pill--interactive"
      :style="{ background: colors.bg, color: colors.fg }"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-label="`Статус: ${label}`"
      @click.stop="toggleMenu"
    >
      {{ label }}
    </button>
    <span v-else class="lk-status-badge__pill" :style="{ background: colors.bg, color: colors.fg }">
      {{ label }}
    </span>

    <span v-if="isOpen" class="lk-status-badge__menu" role="menu" aria-label="Выбор статуса">
      <button
        v-for="option in LK_STATUS_ORDER"
        :key="option"
        type="button"
        role="menuitemradio"
        :aria-checked="option === status"
        class="lk-status-badge__option"
        :class="{ 'lk-status-badge__option--active': option === status }"
        @click.stop="selectValue(option)"
      >
        <span
          class="lk-status-badge__dot"
          :style="{ background: LK_STATUS_COLORS[option].fg }"
          aria-hidden="true"
        />
        {{ LK_STATUS_LABELS[option] }}
      </button>
      <button
        v-if="withAuto"
        type="button"
        role="menuitem"
        class="lk-status-badge__option lk-status-badge__option--auto"
        title="Сбросить ручной статус — вычислять из пунктов"
        @click.stop="selectValue('auto')"
      >
        Авто
      </button>
    </span>
  </span>
</template>

<style scoped>
.lk-status-badge {
  position: relative;
  display: inline-flex;
}

.lk-status-badge__pill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.2rem 0.6rem;
  border: none;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
}

.lk-status-badge__pill--interactive {
  cursor: pointer;
}

.lk-status-badge__pill--interactive:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 1px;
}

.lk-status-badge__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  min-width: 132px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.lk-status-badge__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: none;
  color: #1f2622;
  font-size: 12.5px;
  font-weight: 600;
  font-family: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.lk-status-badge__option:hover,
.lk-status-badge__option:focus-visible {
  background: #f2f4f3;
}

.lk-status-badge__option--active {
  font-weight: 800;
}

.lk-status-badge__option--auto {
  border-top: 1px solid #eef1f0;
  border-radius: 0 0 8px 8px;
  color: #5a625e;
}

.lk-status-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
