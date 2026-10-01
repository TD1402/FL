<script setup>
import { computed } from 'vue'
import { useSeo } from '@/composables/useSeo'
import { useSettingsStore } from '@/stores/settings'
import { formatDate } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import OrderSummary from '@/components/shop/OrderSummary.vue'
import BankTransfer from '@/components/shop/BankTransfer.vue'

const props = defineProps({ code: { type: String, required: true } })
useSeo(() => ({ title: 'Đặt hàng thành công', noindex: true }))
const settings = useSettingsStore()

const order = computed(() => {
  try {
    const o = JSON.parse(sessionStorage.getItem('last_order') || 'null')
    return o && o.order_code === props.code ? o : null
  } catch {
    return null
  }
})
</script>

<template>
  <div class="container-x max-w-3xl pb-16 pt-10 md:pt-16">
    <div class="text-center">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white"
        ><AppIcon name="check" :size="26"
      /></span>
      <h1 class="mt-6 font-serif text-3xl md:text-5xl">Cảm ơn bạn đã đặt hoa!</h1>
      <p class="mt-3 text-sm text-muted">Mã đơn hàng của bạn</p>
      <p class="mt-1 font-mono text-2xl tracking-wider">{{ code }}</p>
      <p class="mx-auto mt-4 max-w-md text-sm text-muted">
        {{ settings.shopName }} sẽ gọi xác nhận trong ít phút. Bạn có thể dùng mã đơn và số điện thoại để
        <RouterLink :to="{ name: 'track', query: { code } }" class="text-ink underline"
          >tra cứu đơn hàng</RouterLink
        >.
      </p>
    </div>

    <template v-if="order">
      <section v-if="order.payment_method === 'BANK'" class="mt-10">
        <h2 class="caps mb-4 text-center font-sans font-medium">Hướng dẫn thanh toán chuyển khoản</h2>
        <BankTransfer :code="order.order_code" :amount="order.total" />
        <p class="mt-3 text-center text-xs text-muted">
          Vui lòng ghi đúng nội dung chuyển khoản để đơn được xác nhận tự động.
        </p>
      </section>
      <p v-else class="mt-8 bg-cream p-4 text-center text-sm">
        Bạn sẽ thanh toán <b>khi nhận hàng (COD)</b>.
      </p>

      <section class="mt-10 grid gap-8 md:grid-cols-2">
        <div class="text-sm">
          <p class="caps mb-3 font-medium">Thông tin giao hàng</p>
          <p>{{ order.receiver_name }} · {{ order.receiver_phone }}</p>
          <p class="text-muted">{{ order.address }}</p>
          <p class="mt-2">
            Giao ngày <b>{{ formatDate(order.delivery_date) }}</b
            >, {{ order.delivery_time_slot }}
          </p>
          <p v-if="order.card_message" class="mt-2 italic text-muted">“{{ order.card_message }}”</p>
        </div>
        <OrderSummary
          :items="order.items"
          :subtotal="order.subtotal"
          :discount="order.discount"
          :shipping-fee="order.shipping_fee"
          :total="order.total"
          :coupon-code="order.coupon_code"
        />
      </section>
    </template>

    <div class="mt-12 flex justify-center gap-3">
      <RouterLink to="/" class="btn-outline">Về trang chủ</RouterLink>
      <RouterLink to="/hang-moi" class="btn-primary">Tiếp tục mua sắm</RouterLink>
    </div>
  </div>
</template>
