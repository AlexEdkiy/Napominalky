<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useConnection } from '@/connection'

const { checking, retryConnection } = useConnection()
const dialog = ref<HTMLDialogElement | null>(null)
let overflow = ''
onMounted(() => {
  overflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onUnmounted(() => {
  dialog.value?.close()
  document.body.style.overflow = overflow
})
</script>

<template>
  <!-- Top-layer modal keeps the mounted form/URL intact and makes the background inert. -->
  <dialog ref="dialog" class="connection-page" aria-labelledby="connection-title"
    aria-describedby="connection-description" @cancel.prevent @keydown.stop>
    <section class="connection-page__card">
      <span class="connection-page__brand">Напоминалки</span>
      <h1 id="connection-title">Что-то пошло не так.</h1>
      <p id="connection-description">Проверьте подключение к интернету</p>
      <button type="button" class="connection-page__retry" autofocus
        :aria-disabled="checking" @click="retryConnection">
        {{ checking ? 'Проверяем соединение…' : 'Попробовать снова' }}
      </button>
      <p class="connection-page__hint" role="status" aria-live="polite">
        {{ checking ? 'Подключаемся…' : 'Как только связь восстановится, можно продолжить.' }}
      </p>
    </section>
  </dialog>
</template>
