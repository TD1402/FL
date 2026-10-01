<script setup>
import { ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/ui/AppIcon.vue'
import MegaMenu from './MegaMenu.vue'
import { NAV_ITEMS } from './navigation'

const cart = useCartStore()
const wishlist = useWishlistStore()
const settings = useSettingsStore()
const ui = useUiStore()

const activeMega = ref(null)
let closeTimer
function openMega(item) {
  clearTimeout(closeTimer)
  activeMega.value = item.mega || null
}
function scheduleClose() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => (activeMega.value = null), 120)
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-white" @mouseleave="scheduleClose">
    <div class="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
      <!-- Trái -->
      <div class="flex items-center gap-1">
        <button class="-ml-2 p-2 lg:hidden" aria-label="Mở menu" @click="ui.menuOpen = true">
          <AppIcon name="menu" :size="22" />
        </button>
        <button
          class="p-2 lg:-ml-2 lg:flex lg:items-center lg:gap-2"
          aria-label="Tìm kiếm"
          @click="ui.searchOpen = true"
        >
          <AppIcon name="search" :size="20" />
          <span class="caps hidden text-[11px] text-muted lg:inline">Tìm kiếm</span>
        </button>
      </div>

      <!-- Logo -->
      <RouterLink to="/" class="text-center" aria-label="Trang chủ">
        <span class="block font-serif text-[26px] uppercase leading-none tracking-[0.22em] lg:text-[34px]">{{
          settings.shopName
        }}</span>
        <span class="caps mt-1 hidden text-[9px] text-muted lg:block">Flower studio</span>
      </RouterLink>

      <!-- Phải -->
      <div class="flex items-center justify-end gap-0.5 sm:gap-1">
        <RouterLink
          to="/tra-cuu-don"
          class="hidden p-2 sm:block"
          aria-label="Tra cứu đơn hàng"
          title="Tra cứu đơn hàng"
        >
          <AppIcon name="user" :size="20" />
        </RouterLink>
        <RouterLink to="/yeu-thich" class="relative p-2" aria-label="Yêu thích">
          <AppIcon name="heart" :size="20" />
          <span
            v-if="wishlist.count"
            class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white"
          >
            {{ wishlist.count }}
          </span>
        </RouterLink>
        <button class="relative -mr-2 p-2" aria-label="Giỏ hàng" @click="cart.drawerOpen = true">
          <AppIcon name="bag" :size="20" />
          <span
            class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-white"
          >
            {{ cart.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Menu desktop -->
    <nav class="hidden lg:block" aria-label="Menu chính">
      <ul class="flex items-center justify-center gap-10">
        <li v-for="item in NAV_ITEMS" :key="item.label" @mouseenter="openMega(item)">
          <RouterLink
            :to="item.to"
            class="caps relative block py-3.5 text-[12px] transition-colors hover:text-accent"
            :class="{ 'text-accent': activeMega && activeMega === item.mega }"
            @click="activeMega = null"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <Transition name="fade">
      <MegaMenu
        v-if="activeMega"
        :group="activeMega"
        class="hidden lg:block"
        @mouseenter="openMega({ mega: activeMega })"
        @navigate="activeMega = null"
      />
    </Transition>
  </header>
</template>
