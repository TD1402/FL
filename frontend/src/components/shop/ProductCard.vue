<script setup>
import { computed } from 'vue'
import { prefetchProduct } from '@/api/shop'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { toast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'
import { comparePrice, discountPercent, finalPrice, fromPrice } from '@/utils/product'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppImage from '@/components/ui/AppImage.vue'

const props = defineProps({ product: { type: Object, required: true }, eager: Boolean })
const cart = useCartStore()
const wishlist = useWishlistStore()

const p = computed(() => props.product)
const link = computed(() => `/san-pham/${p.value.slug}`)
const percent = computed(() => discountPercent(p.value))
const soldOut = computed(() => p.value.stock !== undefined && p.value.stock <= 0)
const hasSizes = computed(() => p.value.sizes?.length > 0)

// Tải trước chi tiết khi người dùng có ý định mở (hover desktop / chạm mobile)
let prefetched = false
function prefetch() {
  if (prefetched) return
  prefetched = true
  prefetchProduct(p.value.slug)
}

function addToCart() {
  if (soldOut.value) return
  const size = hasSizes.value ? p.value.sizes[0].name : ''
  cart.add(p.value, { size, qty: 1, price: finalPrice(p.value, size) })
  toast.success(`Đã thêm “${p.value.name}”${size ? ` (${size})` : ''} vào giỏ`)
  cart.drawerOpen = true
}
</script>

<template>
  <article class="group relative" @pointerenter="prefetch" @touchstart.passive="prefetch">
    <RouterLink :to="link" class="relative block overflow-hidden rounded-[2px]">
      <AppImage :src="p.images?.[0]" :alt="p.name" ratio="3/4" :width="600" :eager="eager" />
      <AppImage
        v-if="p.images?.[1]"
        :src="p.images[1]"
        :alt="''"
        ratio="3/4"
        :width="600"
        class="!absolute inset-0 opacity-0 transition-opacity duration-500 ease-[var(--ease-soft)] md:group-hover:opacity-100"
      />
      <div class="absolute left-2 top-2 flex flex-col gap-1 md:left-3 md:top-3">
        <span v-if="soldOut" class="caps bg-ink px-2 py-1 text-[10px] text-white">Hết hàng</span>
        <span v-if="percent" class="caps bg-accent px-2 py-1 text-[10px] text-white">-{{ percent }}%</span>
        <span v-if="p.is_new" class="caps bg-white px-2 py-1 text-[10px]">Mới</span>
      </div>
      <!-- Desktop: nút hiện khi hover -->
      <button
        v-if="!soldOut"
        class="caps absolute inset-x-3 bottom-3 hidden h-10 translate-y-2 items-center justify-center bg-white/95 text-[11px] opacity-0 transition-all duration-300 hover:bg-ink hover:text-white md:flex md:group-hover:translate-y-0 md:group-hover:opacity-100"
        @click.prevent.stop="addToCart"
      >
        {{ hasSizes ? 'Thêm vào giỏ · ' + p.sizes[0].name : 'Thêm vào giỏ' }}
      </button>
    </RouterLink>

    <button
      class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-colors hover:bg-white md:right-3 md:top-3"
      :class="wishlist.has(p.id) ? 'text-accent' : 'text-ink'"
      :aria-label="wishlist.has(p.id) ? 'Bỏ yêu thích' : 'Yêu thích'"
      @click="wishlist.toggle(p)"
    >
      <svg v-if="wishlist.has(p.id)" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 20s-7-4.35-9.33-8.87C1.1 8.06 2.9 4.5 6.4 4.5c2.1 0 3.6 1.3 4.33 2.6h2.54c.73-1.3 2.23-2.6 4.33-2.6 3.5 0 5.3 3.56 3.73 6.63C19 15.65 12 20 12 20Z"
        />
      </svg>
      <AppIcon v-else name="heart" :size="16" />
    </button>

    <div class="mt-3 flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <h3 class="line-clamp-2 font-sans text-[13px] font-normal leading-snug md:text-sm">
          <RouterLink :to="link" class="hover:text-accent">{{ p.name }}</RouterLink>
        </h3>
        <p class="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span class="font-medium" :class="{ 'text-accent': percent }">
            <template v-if="hasSizes && p.sizes.length > 1">Từ </template>{{ formatPrice(fromPrice(p)) }}
          </span>
          <span v-if="comparePrice(p)" class="text-xs text-muted line-through">{{
            formatPrice(comparePrice(p))
          }}</span>
        </p>
      </div>
      <!-- Mobile: icon thêm giỏ luôn hiện -->
      <button
        v-if="!soldOut"
        class="-mr-1 shrink-0 p-1 md:hidden"
        aria-label="Thêm vào giỏ"
        @click="addToCart"
      >
        <AppIcon name="bag" :size="18" />
      </button>
    </div>
  </article>
</template>
