<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import AppIcon from '@/components/ui/AppIcon.vue'

const settings = useSettingsStore()
const showTop = ref(false)
const onScroll = () => (showTop.value = window.scrollY > 600)
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>

<template>
  <div class="fixed bottom-5 right-4 z-30 flex flex-col items-end gap-3 md:bottom-8 md:right-6">
    <a
      v-if="settings.data.zalo"
      :href="`https://zalo.me/${settings.data.zalo}`"
      target="_blank"
      rel="noopener"
      aria-label="Chat Zalo"
      class="flex h-12 w-12 items-center justify-center rounded-full bg-[#0068FF] text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-105"
    >
      Zalo
    </a>
    <a
      v-if="settings.data.hotline"
      :href="`tel:${settings.data.hotline}`"
      aria-label="Gọi hotline"
      class="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105"
    >
      <AppIcon name="phone" :size="20" class="animate-[wiggle_1.5s_ease-in-out_infinite]" />
    </a>
    <Transition name="fade">
      <button
        v-if="showTop"
        aria-label="Lên đầu trang"
        class="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white shadow-lg"
        @click="toTop"
      >
        <AppIcon name="arrow-up" :size="18" />
      </button>
    </Transition>
  </div>
</template>

<style>
@keyframes wiggle {
  0%,
  60%,
  100% {
    transform: rotate(0);
  }
  10%,
  30%,
  50% {
    transform: rotate(-12deg);
  }
  20%,
  40% {
    transform: rotate(12deg);
  }
}
</style>
