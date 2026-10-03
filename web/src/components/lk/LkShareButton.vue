<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import LkIcon from '@/components/lk/LkIcon.vue'

const props = defineProps<{ text: string; disabled?: boolean }>()
const sharing = ref(false)
const fallback = ref(false)
const feedback = ref('')
const preview = ref<HTMLTextAreaElement | null>(null)
watch(() => props.text, () => { feedback.value = '' })

async function share(): Promise<void> {
  if (props.disabled || !props.text.trim() || sharing.value) return
  feedback.value = ''
  if (typeof navigator.share !== 'function') { fallback.value = true; return }
  sharing.value = true
  try {
    // Call directly from the click: no fetch/await before transient user activation.
    await navigator.share({ text: props.text })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return
    fallback.value = true
    feedback.value = 'Не удалось открыть меню отправки. Скопируйте текст для Telegram.'
  } finally { sharing.value = false }
}

async function copy(): Promise<void> {
  const text = props.text
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(text)
    if (props.text === text) feedback.value = 'Текст скопирован. Откройте Telegram, выберите чат и вставьте сообщение.'
  } catch {
    await nextTick()
    preview.value?.focus()
    preview.value?.select()
    feedback.value = 'Скопируйте выделенный текст вручную и вставьте его в Telegram.'
  }
}
</script>

<template>
  <div class="lk-share">
    <button type="button" class="lk-share__button" :disabled="disabled || !text.trim() || sharing"
      aria-label="Поделиться в Telegram" @click="share">
      <LkIcon name="share" :size="18" /> Поделиться в Telegram
    </button>
    <div v-if="fallback && !disabled" class="lk-share__fallback" role="region" aria-label="Текст для Telegram">
      <p>Скопируйте текст, откройте Telegram и вставьте его в нужный чат.</p>
      <textarea ref="preview" :value="text" readonly rows="6" aria-label="Текст сообщения" />
      <div class="lk-share__actions">
        <button type="button" class="lk-share__button" @click="copy">Скопировать текст</button>
        <a class="lk-share__button" href="https://web.telegram.org/" target="_blank" rel="noopener noreferrer">
          Открыть Telegram
        </a>
        <button type="button" class="lk-share__button" @click="fallback = false">Скрыть</button>
      </div>
      <p v-if="feedback" role="status">{{ feedback }}</p>
    </div>
  </div>
</template>

<style scoped>
.lk-share { margin-block: 12px; min-width: 0; }
.lk-share__button { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 8px 12px; border: 1px solid #16897a; border-radius: 10px;
  background: #fff; color: #116b60; font: inherit; font-weight: 600; cursor: pointer;
  text-decoration: none; white-space: normal; }
.lk-share__button:disabled { opacity: .45; cursor: default; }
.lk-share__button:focus-visible { outline: 2px solid #16897a; outline-offset: 2px; }
.lk-share__fallback { margin-top: 10px; padding: 12px; background: #edf3f1; color: #202923; border-radius: 10px; }
.lk-share__fallback p { margin: 0 0 10px; line-height: 1.5; }
.lk-share__fallback textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 100px;
  padding: 10px; border: 1px solid #c5d5ce; border-radius: 8px; color: #202923; background: #fff; font: inherit; }
.lk-share__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block: 10px; }
</style>
