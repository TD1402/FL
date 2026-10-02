<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'

useSeo(() => ({ title: 'Đăng nhập quản trị', private: true }))
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function submit() {
  if (!username.value || !password.value) return
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    const redirect = String(route.query.redirect || '')
    router.replace(redirect.startsWith('/admin') ? redirect : '/admin')
  } catch {
    /* toast */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-cream px-4">
    <form class="w-full max-w-sm bg-white p-8 shadow-sm md:p-10" @submit.prevent="submit">
      <p class="text-center font-serif text-3xl uppercase tracking-[0.2em]">Hoa Mộc</p>
      <p class="caps mt-2 text-center text-muted">Trang quản trị</p>
      <div class="mt-8 space-y-4">
        <div>
          <label class="label" for="u">Tài khoản</label>
          <input id="u" v-model="username" class="input" autocomplete="username" autofocus />
        </div>
        <div>
          <label class="label" for="p">Mật khẩu</label>
          <input id="p" v-model="password" type="password" class="input" autocomplete="current-password" />
        </div>
        <button class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Đang đăng nhập…' : 'Đăng nhập' }}
        </button>
      </div>
      <RouterLink to="/" class="mt-6 block text-center text-xs text-muted hover:text-ink"
        >← Về cửa hàng</RouterLink
      >
    </form>
  </div>
</template>
