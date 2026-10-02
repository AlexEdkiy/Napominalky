<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import ConnectionPage from '@/components/ConnectionPage.vue'
import { setupConnectionMonitoring, useConnection } from '@/connection'
import { registerOfflineFallback } from '@/offlineFallback'
import { RouterView } from 'vue-router'

import { useTheme } from '@/composables/useTheme'

const { applyTheme } = useTheme()
const { unavailable } = useConnection()
const stopMonitoring = setupConnectionMonitoring()
onUnmounted(stopMonitoring)

onMounted(() => {
  applyTheme()
  registerOfflineFallback()
})
</script>

<template>
  <RouterView />
  <ConnectionPage v-if="unavailable" />
</template>

<style>
/* -----------------------------------------------------------------------
   CSS-переменные: светлая тема (по умолчанию)
   ----------------------------------------------------------------------- */
:root,
html.theme-light {
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e2e2e2;
  --color-primary: #2563eb;
  --color-error: #c0392b;
}

/* -----------------------------------------------------------------------
   CSS-переменные: тёмная тема
   ----------------------------------------------------------------------- */
html.theme-dark {
  --color-bg: #121212;
  --color-bg-secondary: #1e1e1e;
  --color-text: #e8e8e8;
  --color-text-secondary: #aaaaaa;
  --color-border: #333333;
  --color-primary: #60a5fa;
  --color-error: #f87171;
}

/* -----------------------------------------------------------------------
   Глобальные базовые стили
   ----------------------------------------------------------------------- */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

button {
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text);
}

button:hover {
  background-color: var(--color-bg-secondary);
}

a {
  color: var(--color-primary);
}
</style>
