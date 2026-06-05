import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Цель dev-прокси: backend. По умолчанию nginx из docker-compose (8080).
// Переопределяется VITE_PROXY_TARGET (напр. при занятом 8080 на хосте).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue()],

    server: {
      host: true, // слушать 0.0.0.0 (доступ через проброс портов VSCode и по сети)
      proxy: {
        // Фронт и API на одном origin: Vite проксирует /api на backend,
        // поэтому при пустом VITE_API_URL клиент использует относительный baseURL.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }
})
