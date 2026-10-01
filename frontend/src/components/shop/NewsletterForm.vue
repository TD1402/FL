<script setup>
import { ref } from 'vue'
import { subscribe } from '@/api/shop'
import { toast } from '@/composables/useToast'
import { isEmail } from '@/utils/validate'

defineProps({ dark: Boolean })
const emit = defineEmits(['subscribed'])
const email = ref('')
const loading = ref(false)

async function submit() {
  if (!isEmail(email.value)) return toast.error('Vui lòng nhập email hợp lệ')
  loading.value = true
  try {
    const r = await subscribe(email.value.trim())
    toast.success('Cảm ơn bạn đã đăng ký nhận tin!')
    try {
      localStorage.setItem('subscribed', '1')
    } catch {
      /* bỏ qua */
    }
    emit('subscribed', r)
    email.value = ''
  } catch {
    /* toast đã hiển thị */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="flex w-full" @submit.prevent="submit">
    <input
      v-model="email"
      type="email"
      required
      placeholder="Email của bạn"
      aria-label="Email"
      class="input flex-1"
      :class="
        dark ? 'border-white/30 bg-transparent text-white placeholder:text-white/50 focus:border-white' : ''
      "
    />
    <button
      class="btn-primary shrink-0 px-6"
      :class="dark ? 'bg-white text-ink hover:bg-white/90' : ''"
      :disabled="loading"
    >
      {{ loading ? '...' : 'Đăng ký' }}
    </button>
  </form>
</template>
