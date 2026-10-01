<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/ui/AppIcon.vue'
import { FLOWER_TYPES, NAV_ITEMS } from './navigation'

const ui = useUiStore()
const settings = useSettingsStore()
const route = useRoute()
const expanded = ref(null)

watch(
  () => route.fullPath,
  () => (ui.menuOpen = false),
)
watch(
  () => ui.menuOpen,
  (v) => (document.body.style.overflow = v ? 'hidden' : ''),
)

const groups = computed(() => ({
  collections: settings.collections.map((c) => ({ label: c.name, to: `/bo-suu-tap/${c.slug}` })),
  occasions: settings.occasions.map((c) => ({ label: c.name, to: `/danh-muc/${c.slug}` })),
  types: [
    ...settings.styles.map((c) => ({ label: c.name, to: `/danh-muc/${c.slug}` })),
    ...FLOWER_TYPES.map((f) => ({ label: f, to: { path: '/san-pham', query: { flower: f } } })),
  ],
}))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.menuOpen"
        class="fixed inset-0 z-[60] bg-black/40 lg:hidden"
        @click="ui.menuOpen = false"
      />
    </Transition>
    <Transition name="slide-left">
      <aside
        v-if="ui.menuOpen"
        class="fixed inset-y-0 left-0 z-[61] flex w-[86%] max-w-sm flex-col bg-white lg:hidden"
        aria-label="Menu"
      >
        <div class="flex h-16 items-center justify-between border-b border-line px-4">
          <span class="font-serif text-xl uppercase tracking-[0.2em]">{{ settings.shopName }}</span>
          <button class="p-2" aria-label="Đóng menu" @click="ui.menuOpen = false">
            <AppIcon name="close" />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-4">
          <ul>
            <li v-for="item in NAV_ITEMS" :key="item.label" class="border-b border-line">
              <div v-if="item.mega">
                <button
                  class="caps flex w-full items-center justify-between py-4 text-left"
                  @click="expanded = expanded === item.mega ? null : item.mega"
                >
                  {{ item.label }}
                  <AppIcon :name="expanded === item.mega ? 'minus' : 'plus'" :size="16" />
                </button>
                <ul v-show="expanded === item.mega" class="space-y-3 pb-4 pl-3 text-sm text-muted">
                  <li><RouterLink :to="item.to" class="text-ink">Xem tất cả</RouterLink></li>
                  <li v-for="l in groups[item.mega]" :key="l.label">
                    <RouterLink :to="l.to">{{ l.label }}</RouterLink>
                  </li>
                </ul>
              </div>
              <RouterLink v-else :to="item.to" class="caps block py-4">{{ item.label }}</RouterLink>
            </li>
          </ul>
          <ul class="space-y-4 py-6 text-sm text-muted">
            <li>
              <RouterLink to="/tra-cuu-don" class="flex items-center gap-3"
                ><AppIcon name="box" :size="18" />Tra cứu đơn hàng</RouterLink
              >
            </li>
            <li>
              <RouterLink to="/yeu-thich" class="flex items-center gap-3"
                ><AppIcon name="heart" :size="18" />Yêu thích</RouterLink
              >
            </li>
            <li v-if="settings.data.hotline">
              <a :href="`tel:${settings.data.hotline}`" class="flex items-center gap-3"
                ><AppIcon name="phone" :size="18" />{{ settings.data.hotline }}</a
              >
            </li>
          </ul>
        </nav>
      </aside>
    </Transition>
  </Teleport>
</template>
