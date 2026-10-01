<script setup>
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { useSeo } from '@/composables/useSeo'
import { formatPrice } from '@/utils/format'
import AppImage from '@/components/ui/AppImage.vue'
import QuantityInput from '@/components/ui/QuantityInput.vue'
import StateBlock from '@/components/ui/StateBlock.vue'

useSeo(() => ({ title: 'Giỏ hàng', noindex: true }))
const cart = useCartStore()
const settings = useSettingsStore()
const total = computed(() => cart.subtotal + cart.shippingFee)
const freeShipLeft = computed(() => Math.max(0, settings.freeShipFrom - cart.subtotal))
</script>

<template>
  <div class="container-x pb-16 pt-8 md:pt-12">
    <h1 class="mb-8 text-center font-serif text-3xl uppercase tracking-[0.08em] md:mb-12 md:text-5xl">
      Giỏ hàng
    </h1>

    <StateBlock
      v-if="!cart.items.length"
      title="Giỏ hàng đang trống"
      message="Hãy chọn cho mình một bó hoa thật đẹp nhé."
    >
      <RouterLink to="/hang-moi" class="btn-primary">Tiếp tục mua sắm</RouterLink>
    </StateBlock>

    <div v-else class="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div>
        <div
          class="caps hidden grid-cols-[1fr_140px_120px_40px] gap-4 border-b border-line pb-3 text-[11px] text-muted md:grid"
        >
          <span>Sản phẩm</span><span>Số lượng</span><span class="text-right">Thành tiền</span><span />
        </div>
        <ul class="divide-y divide-line">
          <li
            v-for="it in cart.items"
            :key="it.key"
            class="grid grid-cols-[80px_1fr] gap-4 py-6 md:grid-cols-[1fr_140px_120px_40px] md:items-center"
          >
            <div class="contents md:flex md:items-center md:gap-4">
              <RouterLink :to="`/san-pham/${it.slug}`" class="w-20 shrink-0 md:w-24"
                ><AppImage :src="it.image" :alt="it.name" ratio="3/4" :width="200"
              /></RouterLink>
              <div class="min-w-0">
                <RouterLink :to="`/san-pham/${it.slug}`" class="hover:text-accent">{{ it.name }}</RouterLink>
                <p v-if="it.size" class="text-xs text-muted">Kích cỡ: {{ it.size }}</p>
                <p class="mt-1 text-sm text-muted">{{ formatPrice(it.price) }}</p>
                <div class="mt-3 flex items-center gap-4 md:hidden">
                  <QuantityInput
                    :model-value="it.qty"
                    small
                    :max="it.stock > 0 ? it.stock : 99"
                    @update:model-value="cart.setQty(it.key, $event)"
                  />
                  <span class="ml-auto font-medium">{{ formatPrice(it.price * it.qty) }}</span>
                </div>
                <button class="mt-2 text-xs text-muted underline md:hidden" @click="cart.remove(it.key)">
                  Xoá
                </button>
              </div>
            </div>
            <div class="hidden md:block">
              <QuantityInput
                :model-value="it.qty"
                small
                :max="it.stock > 0 ? it.stock : 99"
                @update:model-value="cart.setQty(it.key, $event)"
              />
            </div>
            <p class="hidden text-right font-medium md:block">{{ formatPrice(it.price * it.qty) }}</p>
            <button
              class="hidden justify-self-end p-1 text-muted hover:text-ink md:block"
              aria-label="Xoá"
              @click="cart.remove(it.key)"
            >
              ✕
            </button>
          </li>
        </ul>
        <RouterLink to="/hang-moi" class="link-caps mt-6 text-[11px]">← Tiếp tục mua sắm</RouterLink>
      </div>

      <aside class="h-fit bg-cream p-6 md:p-8 lg:sticky lg:top-36">
        <p class="caps mb-6 font-medium">Tóm tắt đơn hàng</p>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted">Tạm tính</dt>
            <dd>{{ formatPrice(cart.subtotal) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted">Phí giao hàng</dt>
            <dd>{{ cart.shippingFee ? formatPrice(cart.shippingFee) : 'Miễn phí' }}</dd>
          </div>
          <p v-if="freeShipLeft && settings.freeShipFrom" class="text-xs text-muted">
            Mua thêm {{ formatPrice(freeShipLeft) }} để được miễn phí giao.
          </p>
          <div class="flex items-baseline justify-between border-t border-ink/10 pt-4">
            <dt class="caps">Tổng cộng</dt>
            <dd class="text-xl font-medium">{{ formatPrice(total) }}</dd>
          </div>
        </dl>
        <p class="mt-2 text-xs text-muted">Mã giảm giá được áp dụng ở bước thanh toán.</p>
        <RouterLink to="/thanh-toan" class="btn-primary mt-6 w-full">Tiến hành thanh toán</RouterLink>
      </aside>
    </div>
  </div>
</template>
