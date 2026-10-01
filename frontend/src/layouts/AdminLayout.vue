<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'
import AppIcon from '@/components/ui/AppIcon.vue'

useSeo(() => ({ title: 'Quản trị', noindex: true }))
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const navOpen = ref(false)
watch(
  () => route.fullPath,
  () => (navOpen.value = false),
)

const NAV = [
  { to: '/admin', label: 'Tổng quan', icon: 'grid', exact: true },
  { to: '/admin/don-hang', label: 'Đơn hàng', icon: 'box' },
  { to: '/admin/san-pham', label: 'Sản phẩm', icon: 'flower' },
  { to: '/admin/danh-muc', label: 'Danh mục', icon: 'list' },
  { to: '/admin/banner', label: 'Banner', icon: 'image' },
  { to: '/admin/ma-giam-gia', label: 'Mã giảm giá', icon: 'tag' },
  { to: '/admin/lien-he', label: 'Liên hệ', icon: 'mail' },
  { to: '/admin/cai-dat', label: 'Cài đặt', icon: 'settings' },
]
const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to))

async function logout() {
  await auth.logout()
  router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#fafaf9] lg:flex">
    <!-- Thanh trên mobile -->
    <div
      class="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden"
    >
      <button class="p-2" aria-label="Menu" @click="navOpen = !navOpen"><AppIcon name="menu" /></button>
      <span class="font-serif text-lg uppercase tracking-[0.2em]">Admin</span>
      <RouterLink to="/" class="p-2" aria-label="Xem cửa hàng"><AppIcon name="eye" /></RouterLink>
    </div>

    <aside
      class="no-print fixed inset-y-0 left-0 z-40 w-60 shrink-0 flex-col border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen"
      :class="navOpen ? 'flex' : 'hidden'"
    >
      <RouterLink
        to="/admin"
        class="flex h-16 items-center px-6 font-serif text-xl uppercase tracking-[0.2em]"
        >Hoa Mộc</RouterLink
      >
      <nav class="flex-1 space-y-0.5 px-3">
        <RouterLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
          :class="isActive(item) ? 'bg-ink text-white' : 'text-[#444] hover:bg-mist'"
        >
          <AppIcon :name="item.icon" :size="18" /> {{ item.label }}
        </RouterLink>
      </nav>
      <div class="border-t border-line p-3 text-sm">
        <RouterLink to="/" target="_blank" class="flex items-center gap-3 px-3 py-2 text-muted hover:text-ink"
          ><AppIcon name="eye" :size="18" /> Xem cửa hàng</RouterLink
        >
        <button class="flex w-full items-center gap-3 px-3 py-2 text-muted hover:text-ink" @click="logout">
          <AppIcon name="logout" :size="18" /> Đăng xuất ({{ auth.username }})
        </button>
      </div>
    </aside>
    <div v-if="navOpen" class="fixed inset-0 z-30 bg-black/30 lg:hidden" @click="navOpen = false" />

    <main class="min-w-0 flex-1 p-4 md:p-8">
      <RouterView />
    </main>
  </div>
</template>
