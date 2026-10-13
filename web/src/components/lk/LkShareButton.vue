<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { telegramShareUrl } from '@/utils/telegramShare'

const props = defineProps<{ text: string; disabled?: boolean }>()
const copying = ref(false)
const manualCopy = ref(false)
const notice = ref('')
const button = ref<HTMLButtonElement | null>(null)
const preview = ref<HTMLTextAreaElement | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false

function clearFeedback(): void {
  clearTimeout(noticeTimer)
  notice.value = ''
  manualCopy.value = false
}

watch(() => [props.text, props.disabled], clearFeedback)
onBeforeUnmount(() => { disposed = true; clearFeedback() })

function notify(message: string): void {
  clearTimeout(noticeTimer)
  notice.value = message
  noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function share(): Promise<void> {
  if (props.disabled || !props.text.trim() || copying.value) return
  const text = props.text
  const url = telegramShareUrl(text)
  copying.value = true
  clearFeedback()
  // Start the backup copy while focused; launch the app within the original click.
  // The URI carries the message independently of clipboard permission.
  const copied = copyText(text)
  let launchFailed = false
  try {
    window.open(url ?? 'tg://', '_self')
  } catch {
    launchFailed = true
  }
  const didCopy = await copied
  copying.value = false
  if (disposed || props.disabled || props.text !== text) return
  // A null window handle is normal for external protocols; it is not an error.
  // No success block, fallback links or focus changes after a regular share.
  if (url && !launchFailed) return
  if (didCopy) {
    notify(launchFailed
      ? 'Не удалось открыть Telegram. Текст скопирован — вставьте его в чат.'
      : 'Полный текст скопирован. Вставьте его в чат Telegram.')
  } else {
    manualCopy.value = true
    await nextTick()
    preview.value?.focus()
    preview.value?.select()
  }
}

function closeManualCopy(): void {
  manualCopy.value = false
  button.value?.focus()
}

function trapFocus(event: KeyboardEvent): void {
  const panel = event.currentTarget as HTMLElement
  const controls = Array.from(panel.querySelectorAll<HTMLElement>('textarea, button'))
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <div class="lk-share">
    <button ref="button" type="button" class="lk-share__telegram" :disabled="disabled || !text.trim() || copying"
      aria-label="Поделиться в Telegram" title="Поделиться в Telegram" @click="share">
      <LkIcon name="share" :size="22" />
    </button>
    <Teleport to="body">
      <p v-if="notice" class="lk-share__notice" role="status">{{ notice }}</p>
      <div v-if="manualCopy" class="lk-share__overlay" @click.self="closeManualCopy"
        @keydown.esc.stop.prevent="closeManualCopy">
        <section class="lk-share__dialog" role="dialog" aria-modal="true" aria-label="Скопировать текст"
          @keydown.tab="trapFocus">
          <h2>Скопировать текст</h2>
          <p>Автоматическая передача недоступна. Скопируйте выделенный текст и вставьте его в Telegram.</p>
          <textarea ref="preview" :value="text" readonly rows="6" aria-label="Текст сообщения" />
          <button type="button" class="lk-share__close" @click="closeManualCopy">Закрыть</button>
        </section>
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
.lk-share__telegram:disabled { opacity: .45; cursor: default; }
.lk-share__telegram:focus-visible, .lk-share__close:focus-visible { outline: 2px solid #16897a; outline-offset: 2px; }
.lk-share__notice { position: fixed; z-index: 100; left: 50%; transform: translateX(-50%);
  bottom: calc(20px + env(safe-area-inset-bottom, 0px)); width: max-content; max-width: calc(100% - 32px);
  box-sizing: border-box; margin: 0; padding: 12px 16px; border-radius: 12px;
  background: #1f2622; color: #fff; box-shadow: 0 4px 16px #0003; line-height: 1.5; }
.lk-share__overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center;
  justify-content: center; padding: 16px; background: #0c322c6b; }
.lk-share__dialog { width: 100%; max-width: 440px; max-height: 90%; overflow-y: auto;
  box-sizing: border-box; padding: 20px; border-radius: 18px; background: #fff; color: #202923; }
.lk-share__dialog h2 { margin: 0 0 12px; font-size: 20px; }
.lk-share__dialog p { margin: 0 0 12px; line-height: 1.5; }
.lk-share__dialog textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 100px;
  padding: 10px; border: 1px solid #c5d5ce; border-radius: 8px; color: #202923; background: #fff; font: inherit; }
.lk-share__close { display: block; min-height: 44px; margin: 12px 0 0 auto; padding: 8px 16px;
  border: none; border-radius: 10px; background: #16897a; color: #fff; font: inherit; cursor: pointer; }
</style>
