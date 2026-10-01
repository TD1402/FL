import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { adminLogin, adminLogout } from '@/api/admin'

/** Token admin chỉ lưu sau khi đăng nhập, tự xoá khi hết hạn. */
export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('')
    const expires = ref('')
    const username = ref('')

    const isLoggedIn = computed(() => !!token.value && new Date(expires.value).getTime() > Date.now())

    function validToken() {
      if (token.value && !isLoggedIn.value) reset()
      return token.value || null
    }

    async function login(user, password) {
      const r = await adminLogin(user, password)
      token.value = r.token
      expires.value = r.expires
      username.value = r.username
    }

    function reset() {
      token.value = ''
      expires.value = ''
      username.value = ''
    }

    async function logout() {
      if (isLoggedIn.value) await adminLogout().catch(() => {})
      reset()
    }

    return { token, expires, username, isLoggedIn, validToken, login, logout, reset }
  },
  { persist: true },
)
