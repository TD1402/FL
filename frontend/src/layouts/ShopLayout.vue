<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import TopBar from '@/components/shop/TopBar.vue'
import AppHeader from '@/components/shop/AppHeader.vue'
import AppFooter from '@/components/shop/AppFooter.vue'
import MobileMenu from '@/components/shop/MobileMenu.vue'
import SearchOverlay from '@/components/shop/SearchOverlay.vue'
import CartDrawer from '@/components/shop/CartDrawer.vue'
import FloatingButtons from '@/components/shop/FloatingButtons.vue'
import PromoPopup from '@/components/shop/PromoPopup.vue'

const settings = useSettingsStore()
onMounted(() => settings.load())
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >Bỏ qua đến nội dung</a
    >
    <TopBar />
    <AppHeader />
    <div v-if="settings.error" class="bg-accent/10 px-4 py-2 text-center text-xs text-accent">
      Không tải được dữ liệu cửa hàng. <button class="underline" @click="settings.load(true)">Thử lại</button>
    </div>
    <main id="main" class="flex-1">
      <RouterView v-slot="{ Component, route }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
    <MobileMenu />
    <SearchOverlay />
    <CartDrawer />
    <FloatingButtons />
    <PromoPopup />
  </div>
</template>
