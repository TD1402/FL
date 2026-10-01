<script setup>
import { formatPrice } from '@/utils/format'
import AppImage from '@/components/ui/AppImage.vue'

/** Bảng tóm tắt đơn: dùng ở thanh toán, đặt hàng thành công, tra cứu đơn. */
defineProps({
  items: { type: Array, default: () => [] },
  subtotal: Number,
  discount: Number,
  shippingFee: Number,
  total: Number,
  couponCode: String,
})
</script>

<template>
  <div>
    <ul class="divide-y divide-line">
      <li v-for="it in items" :key="it.key || it.product_id + it.size" class="flex gap-4 py-4">
        <div class="relative w-16 shrink-0">
          <AppImage :src="it.image" :alt="it.name" ratio="3/4" :width="160" />
          <span
            class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-white"
            >{{ it.qty }}</span
          >
        </div>
        <div class="min-w-0 flex-1 text-sm">
          <p class="line-clamp-2">{{ it.name }}</p>
          <p v-if="it.size" class="text-xs text-muted">Kích cỡ: {{ it.size }}</p>
        </div>
        <p class="text-sm">{{ formatPrice(it.line_total ?? it.price * it.qty) }}</p>
      </li>
    </ul>
    <dl class="space-y-2 border-t border-line pt-4 text-sm">
      <div class="flex justify-between">
        <dt class="text-muted">Tạm tính</dt>
        <dd>{{ formatPrice(subtotal) }}</dd>
      </div>
      <div v-if="discount" class="flex justify-between text-accent">
        <dt>
          Giảm giá <span v-if="couponCode">({{ couponCode }})</span>
        </dt>
        <dd>-{{ formatPrice(discount) }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted">Phí giao hàng</dt>
        <dd>{{ shippingFee ? formatPrice(shippingFee) : 'Miễn phí' }}</dd>
      </div>
      <div class="flex items-baseline justify-between border-t border-line pt-3">
        <dt class="caps">Tổng cộng</dt>
        <dd class="text-xl font-medium">{{ formatPrice(total) }}</dd>
      </div>
    </dl>
  </div>
</template>
