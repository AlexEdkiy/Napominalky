import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router'
import { setupGuards } from './router/guards'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

setupGuards(router)
app.use(router)

app.mount('#app')
