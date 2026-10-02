<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { trackOrder } from '@/api/shop'
import { useSeo } from '@/composables/useSeo'
import { formatDate, formatDateTime } from '@/utils/format'
import { isPhone } from '@/utils/validate'
import OrderSummary from '@/components/shop/OrderSummary.vue'
import BankTransfer from '@/components/shop/BankTransfer.vue'

useSeo(() => ({
  title: 'Tra cứu đơn hàng',
  description: 'Tra cứu trạng thái đơn hoa bằng mã đơn hàng và số điện thoại.',
}))
const route = useRoute()
const form = reactive({ code: String(route.query.code || ''), phone: '' })
const order = ref(null)
const error = ref('')
const loading = ref(false)

const STEPS = [
  { key: 'new', label: 'Đã đặt' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'delivering', label: 'Đang giao' },
  { key: 'done', label: 'Hoàn thành' },
]
const stepIndex = computed(() => STEPS.findIndex((s) => s.key === order.value?.status))

async function submit() {
  error.value = ''
  if (!form.code.trim()) return (error.value = 'Vui lòng nhập mã đơn hàng')
  if (!isPhone(form.phone)) return (error.value = 'Số điện thoại không hợp lệ')
  loading.value = true
  try {
    order.value = await trackOrder(form.code.trim().toUpperCase(), form.phone)
  } catch (e) {
    order.value = null
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container-x max-w-3xl pb-16 pt-8 md:pt-12">
    <h1 class="text-center font-serif text-3xl uppercase tracking-[0.08em] md:text-5xl">Tra cứu đơn hàng</h1>
    <p class="mt-3 text-center text-sm text-muted">Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng.</p>

    <form class="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="submit">
      <input
        v-model="form.code"
        class="input uppercase"
        placeholder="Mã đơn (VD: HOA2610010001)"
        aria-label="Mã đơn hàng"
      />
      <input
        v-model="form.phone"
        type="tel"
        class="input"
        placeholder="Số điện thoại"
        aria-label="Số điện thoại"
      />
      <button class="btn-primary px-6" :disabled="loading">{{ loading ? '…' : 'Tra cứu' }}</button>
    </form>
    <p v-if="error" class="mt-3 text-center text-sm text-accent">{{ error }}</p>

    <section v-if="order" class="mt-12">
      <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
        <p class="font-mono text-lg">{{ order.order_code }}</p>
        <p class="text-xs text-muted">Đặt lúc {{ formatDateTime(order.created_at) }}</p>
      </div>

      <p v-if="order.status === 'cancelled'" class="mt-6 bg-accent/10 p-4 text-center text-sm text-accent">
        Đơn hàng đã bị huỷ.
      </p>
      <ol v-else class="mt-8 grid grid-cols-4">
        <li v-for="(s, i) in STEPS" :key="s.key" class="relative text-center">
          <div
            v-if="i > 0"
            class="absolute right-1/2 top-3 h-px w-full"
            :class="i <= stepIndex ? 'bg-ink' : 'bg-line'"
          />
          <span
            class="relative z-10 mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
            :class="i <= stepIndex ? 'bg-ink text-white' : 'border border-line bg-white text-muted'"
            >{{ i + 1 }}</span
          >
          <p class="caps mt-2 text-[10px]" :class="i <= stepIndex ? 'text-ink' : 'text-muted'">
            {{ s.label }}
          </p>
        </li>
      </ol>

      <div class="mt-10 grid gap-8 md:grid-cols-2">
        <div class="space-y-1 text-sm">
          <p class="caps mb-3 font-medium">Giao hàng</p>
          <p>{{ order.receiver_name }} · {{ order.receiver_phone }}</p>
          <p class="text-muted">{{ order.address }}</p>
          <p>Ngày {{ formatDate(order.delivery_date) }} · {{ order.delivery_time_slot }}</p>
          <p class="pt-2">
            Thanh toán: {{ order.payment_method === 'BANK' ? 'Chuyển khoản' : 'COD' }} ·
            <b>{{ order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán' }}</b>
          </p>
        </div>
        <OrderSummary
          :items="order.items"
          :subtotal="order.subtotal"
          :discount="order.discount"
          :shipping-fee="order.shipping_fee"
          :total="order.total"
          :coupon-code="order.coupon_code"
        />
      </div>
      <div
        v-if="
          order.payment_method === 'BANK' && order.payment_status !== 'paid' && order.status !== 'cancelled'
        "
        class="mt-10"
      >
        <p class="caps mb-4 font-medium">Thông tin chuyển khoản</p>
        <BankTransfer :code="order.order_code" :amount="order.total" />
      </div>
    </section>
  </div>
</template>
