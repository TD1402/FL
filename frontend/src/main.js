import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import router from './router'
import { configureAuth } from './api/client'
import { useAuthStore } from './stores/auth'
import './assets/main.css'

// HTML prerender lúc build (meta + nội dung tĩnh cho crawler) → để Vue/unhead quản lý từ đây.
document.querySelectorAll('[data-prerender]').forEach((el) => el.remove())

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPersist)
app.use(pinia)
app.use(createHead())
app.use(router)

const auth = useAuthStore()
configureAuth({
  getToken: () => auth.validToken(),
  onUnauthorized: () => {
    auth.reset()
    const current = router.currentRoute.value
    if (current.path.startsWith('/admin'))
      router.replace({ name: 'admin-login', query: { redirect: current.fullPath } })
  },
})

app.mount('#app')
