import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import i18n from './i18n'
import './styles/tokens.css'
import './styles/globals.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('seed')) {
  import('@/db/seed').then((m) => m.seedDemoData()).then(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('seed')
    window.location.replace(url.toString())
  })
}
