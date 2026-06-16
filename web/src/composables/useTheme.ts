import { computed, onUnmounted, watch } from 'vue'

import { useSettingsStore } from '@/stores/settingsStore'
import type { Theme } from '@/stores/settingsStore'

type EffectiveScheme = 'light' | 'dark'

const DARK_CLASS = 'theme-dark'
const LIGHT_CLASS = 'theme-light'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveScheme(theme: Theme): EffectiveScheme {
  if (theme === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return theme
}

function applyToDocument(scheme: EffectiveScheme): void {
  const { classList } = document.documentElement
  if (scheme === 'dark') {
    classList.add(DARK_CLASS)
    classList.remove(LIGHT_CLASS)
  } else {
    classList.add(LIGHT_CLASS)
    classList.remove(DARK_CLASS)
  }
  document.documentElement.setAttribute('data-theme', scheme)
}

/**
 * Реактивно применяет тему к `document.documentElement`.
 * При теме 'system' подписывается на `prefers-color-scheme`.
 * Вызывайте `applyTheme()` единожды в `App.vue` (onMounted) или `main.ts`.
 */
export function useTheme() {
  const settings = useSettingsStore()

  const effectiveScheme = computed<EffectiveScheme>(() => resolveScheme(settings.theme))

  let mediaQuery: MediaQueryList | null = null
  let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

  function attachMediaListener(): void {
    removeMediaListener()
    if (settings.theme !== 'system') return
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener = () => {
      applyToDocument(resolveScheme('system'))
    }
    mediaQuery.addEventListener('change', mediaListener)
  }

  function removeMediaListener(): void {
    if (mediaQuery !== null && mediaListener !== null) {
      mediaQuery.removeEventListener('change', mediaListener)
      mediaQuery = null
      mediaListener = null
    }
  }

  function applyTheme(): void {
    applyToDocument(effectiveScheme.value)
    attachMediaListener()
  }

  watch(
    () => settings.theme,
    () => {
      applyToDocument(effectiveScheme.value)
      attachMediaListener()
    },
  )

  onUnmounted(() => {
    removeMediaListener()
  })

  return { effectiveScheme, applyTheme }
}
