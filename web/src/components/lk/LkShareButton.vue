<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { telegramShareUrl } from '@/utils/telegramShare'

const props = defineProps<{ text: string; disabled?: boolean; feedbackTarget?: HTMLElement | null }>()
const preparedUrl = computed(() => telegramShareUrl(props.text))
const telegramAppUrl = computed(() => preparedUrl.value ?? 'tg://')
const telegramWebUrl = 'https://web.telegram.org/'
const copying = ref(false)
const attempted = ref(false)
const manualCopy = ref(false)
const feedback = ref('')
const preview = ref<HTMLTextAreaElement | null>(null)

watch(() => props.text, () => {
  feedback.value = ''
  attempted.value = false
  manualCopy.value = false
})

async function copyText(text: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(text)
    if (props.text !== text) return
    manualCopy.value = false
    feedback.value = preparedUrl.value
      ? 'Текст скопирован в буфер на случай ручной вставки.'
      : 'Полный текст скопирован. В Telegram выберите чат и вставьте сообщение.'
  } catch {
    if (props.text !== text) return
    manualCopy.value = true
    feedback.value = 'Не удалось скопировать автоматически. Скопируйте выделенный текст и вставьте его в Telegram.'
    await nextTick()
    preview.value?.focus()
    preview.value?.select()
  }
}

async function share(openTelegram = true): Promise<void> {
  if (props.disabled || !props.text.trim() || copying.value) return
  copying.value = true
  attempted.value = true
  feedback.value = ''
  // Start copying while this document still has focus. Invoke the OS protocol
  // handler in the same click, before awaiting the clipboard. _self avoids an
  // empty browser tab. A share link asks Telegram to choose a chat and prepare
  // a draft; oversized messages use copy/paste without truncating the content.
  const copied = copyText(props.text)
  if (openTelegram) {
    try {
      window.open(telegramAppUrl.value, '_self')
    } catch {
      // Browsers cannot reliably report whether the app launched. Keep explicit
      // retry and Web links; never open Web automatically or claim app success.
    }
  }
  try {
    await copied
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div class="lk-share">
    <button type="button" class="lk-share__telegram" :disabled="disabled || !text.trim() || copying"
      aria-label="Поделиться в Telegram" title="Поделиться в Telegram" @click="share()">
      <LkIcon name="share" :size="22" />
    </button>
    <Teleport :to="feedbackTarget ?? 'body'" :disabled="!feedbackTarget">
      <div v-if="attempted && !disabled" class="lk-share__result">
        <p v-if="preparedUrl">Выберите чат в Telegram — текст и ссылка на сайт появятся в поле сообщения.</p>
        <p v-else>Этот текст нельзя передать целиком через ссылку Telegram. Вставьте его из буфера.</p>
        <p v-if="feedback" role="status">{{ feedback }}</p>
        <textarea v-if="manualCopy" ref="preview" :value="text" readonly rows="6" aria-label="Текст сообщения" />
        <p>Если приложение не открылось, повторите запуск или используйте Telegram Web.</p>
        <div class="lk-share__actions">
          <button v-if="manualCopy" type="button" class="lk-share__action" :disabled="copying"
            @click="share(false)">Скопировать ещё раз</button>
          <a class="lk-share__action" :href="telegramAppUrl">Открыть приложение</a>
          <a class="lk-share__action" :href="telegramWebUrl" target="_blank" rel="noopener noreferrer">
            Telegram Web
          </a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.lk-share { display: inline-flex; flex-shrink: 0; min-width: 0; }
.lk-share__telegram { display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; padding: 0; border: none; border-radius: 10px;
  background: transparent; color: #16897a; cursor: pointer; }
.lk-share__telegram:hover:not(:disabled) { background: #e5f3ef; }
.lk-share__action { display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 8px 12px; border: 1px solid #16897a; border-radius: 10px;
  background: #fff; color: #116b60; font: inherit; font-weight: 600; cursor: pointer;
  text-decoration: none; white-space: normal; }
.lk-share__telegram:disabled, .lk-share__action:disabled { opacity: .45; cursor: default; }
.lk-share__telegram:focus-visible, .lk-share__action:focus-visible { outline: 2px solid #16897a; outline-offset: 2px; }
.lk-share__result { margin-top: 10px; color: #202923; }
.lk-share__result p { margin: 0 0 10px; line-height: 1.5; }
.lk-share__result textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 100px;
  padding: 10px; border: 1px solid #c5d5ce; border-radius: 8px; color: #202923; background: #fff; font: inherit; }
.lk-share__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block: 10px; }
</style>
