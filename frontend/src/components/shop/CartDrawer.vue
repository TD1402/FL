<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { formatPrice } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppImage from '@/components/ui/AppImage.vue'
import QuantityInput from '@/components/ui/QuantityInput.vue'

const cart = useCartStore()
const settings = useSettingsStore()
const route = useRoute()

watch(
  () => route.fullPath,
  () => (cart.drawerOpen = false),
)
watch(
  () => cart.drawerOpen,
  (v) => (document.body.style.overflow = v ? 'hidden' : ''),
)

const freeShipLeft = computed(() => Math.max(0, settings.freeShipFrom - cart.subtotal))
const freeShipProgress = computed(() =>
  settings.freeShipFrom ? Math.min(100, Math.round((cart.subtotal / settings.freeShipFrom) * 100)) : 100,
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="cart.drawerOpen" class="fixed inset-0 z-[60] bg-black/40" @click="cart.drawerOpen = false" />
    </Transition>
    <Transition name="slide-right">
      <aside
        v-if="cart.drawerOpen"
        class="fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-white"
        aria-label="Giỏ hàng"
      >
        <div class="flex h-16 items-center justify-between border-b border-line px-5">
          <p class="caps">Giỏ hàng ({{ cart.count }})</p>
          <button class="p-2" aria-label="Đóng giỏ hàng" @click="cart.drawerOpen = false">
            <AppIcon name="close" />
          </button>
        </div>

        <div
          v-if="!cart.items.length"
          class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <AppIcon name="bag" :size="40" class="text-[#c9c4bd]" />
          <p class="font-serif text-2xl">Giỏ hàng đang trống</p>
          <RouterLink to="/hang-moi" class="btn-primary">Khám phá hoa mới</RouterLink>
        </div>

        <template v-else>
          <div v-if="settings.freeShipFrom" class="border-b border-line px-5 py-4 text-xs">
            <p v-if="freeShipLeft">
              Mua thêm <b>{{ formatPrice(freeShipLeft) }}</b> để được <b>miễn phí giao hàng</b>
            </p>
            <p v-else>Đơn hàng của bạn được <b>miễn phí giao hàng</b> 🎉</p>
            <div class="mt-2 h-0.5 bg-line">
              <div class="h-full bg-ink transition-all" :style="{ width: freeShipProgress + '%' }" />
            </div>
          </div>

          <ul class="flex-1 divide-y divide-line overflow-y-auto px-5">
            <li v-for="it in cart.items" :key="it.key" class="flex gap-4 py-5">
              <RouterLink :to="`/san-pham/${it.slug}`" class="w-20 shrink-0"
                ><AppImage :src="it.image" :alt="it.name" ratio="3/4" :width="200"
              /></RouterLink>
              <div class="flex min-w-0 flex-1 flex-col">
                <RouterLink :to="`/san-pham/${it.slug}`" class="line-clamp-2 text-sm">{{
                  it.name
                }}</RouterLink>
                <p v-if="it.size" class="mt-0.5 text-xs text-muted">Kích cỡ: {{ it.size }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatPrice(it.price) }}</p>
                <div class="mt-auto flex items-center justify-between pt-2">
                  <QuantityInput
                    :model-value="it.qty"
                    small
                    :max="it.stock > 0 ? it.stock : 99"
                    @update:model-value="cart.setQty(it.key, $event)"
                  />
                  <button class="text-xs text-muted underline hover:text-ink" @click="cart.remove(it.key)">
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <div class="border-t border-line px-5 py-5">
            <div class="mb-4 flex items-center justify-between">
              <span class="caps">Tạm tính</span>
              <span class="text-lg font-medium">{{ formatPrice(cart.subtotal) }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <RouterLink to="/gio-hang" class="btn-outline px-2">Xem giỏ hàng</RouterLink>
              <RouterLink to="/thanh-toan" class="btn-primary px-2">Thanh toán</RouterLink>
            </div>
          </div>
        </template>
      </aside>
    </Transition>
  </Teleport>
</template>
