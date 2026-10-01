<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { toast } from '@/composables/useToast'
import AppModal from '@/components/ui/AppModal.vue'
import NewsletterForm from './NewsletterForm.vue'

/** Popup ưu đãi đơn đầu tiên — chỉ hiện 1 lần (localStorage). */
const KEY = 'promo_popup_seen'
const open = ref(false)
const coupon = ref('')
const settings = useSettingsStore()
let timer

function storage(get, value) {
  try {
    return get
      ? localStorage.getItem(KEY) || localStorage.getItem('subscribed')
      : localStorage.setItem(KEY, value)
  } catch {
    return '1'
  }
}

onMounted(() => {
  if (storage(true)) return
  timer = setTimeout(() => {
    open.value = true
    storage(false, '1')
  }, 8000)
})
onBeforeUnmount(() => clearTimeout(timer))

function onSubscribed(r) {
  coupon.value = r?.coupon || ''
}
async function copy() {
  try {
    await navigator.clipboard.writeText(coupon.value)
    toast.success('Đã sao chép mã')
  } catch {
    /* bỏ qua */
  }
}
</script>

<template>
  <AppModal v-model:open="open">
    <div class="text-center">
      <p class="caps text-accent">Ưu đãi chào mừng</p>
      <h2 class="mt-3 font-serif text-3xl">Giảm 10% cho đơn hoa đầu tiên</h2>
      <template v-if="!coupon">
        <p class="mx-auto mt-3 max-w-sm text-sm text-muted">
          Để lại email để nhận mã ưu đãi và những thiết kế hoa mới nhất từ {{ settings.shopName }}.
        </p>
        <div class="mt-6"><NewsletterForm @subscribed="onSubscribed" /></div>
        <button class="mt-4 text-xs text-muted underline" @click="open = false">Không, cảm ơn</button>
      </template>
      <template v-else>
        <p class="mt-3 text-sm text-muted">Mã của bạn — nhập tại bước thanh toán:</p>
        <button
          class="mt-4 border border-dashed border-ink px-8 py-3 font-mono text-xl tracking-widest"
          title="Sao chép"
          @click="copy"
        >
          {{ coupon }}
        </button>
        <div class="mt-6"><button class="btn-primary" @click="open = false">Mua sắm ngay</button></div>
      </template>
    </div>
  </AppModal>
</template>
