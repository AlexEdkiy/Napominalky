<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}

withDefaults(defineProps<Props>(), {
  message: '',
  confirmLabel: 'Да',
  cancelLabel: 'Отмена',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmButtonRef = ref<HTMLButtonElement | null>(null)

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  confirmButtonRef.value?.focus()
})

onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="lk-confirm-dialog__overlay" @click.self="emit('cancel')">
    <div
      class="lk-confirm-dialog__panel"
      role="alertdialog"
      aria-modal="true"
      :aria-label="title"
    >
      <h2 class="lk-confirm-dialog__title">{{ title }}</h2>
      <p v-if="message" class="lk-confirm-dialog__message">{{ message }}</p>

      <div class="lk-confirm-dialog__actions">
        <button type="button" class="lk-confirm-dialog__cancel" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          ref="confirmButtonRef"
          type="button"
          class="lk-confirm-dialog__confirm"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lk-confirm-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 23, 20, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lk-confirm-dialog__panel {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 1.25rem 1.35rem;
  width: 100%;
  max-width: 380px;
}

.lk-confirm-dialog__title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-confirm-dialog__message {
  margin: 0 0 1rem;
  color: #6b716e;
  font-size: 0.9rem;
}

.lk-confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.lk-confirm-dialog__cancel {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #eef1f0;
  color: #6b716e;
  font-weight: 600;
  cursor: pointer;
}

.lk-confirm-dialog__confirm {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.lk-confirm-dialog__confirm:focus-visible,
.lk-confirm-dialog__cancel:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 2px;
}
</style>
