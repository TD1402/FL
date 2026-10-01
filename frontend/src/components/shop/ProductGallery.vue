<script setup>
import { ref, watch } from 'vue'
import AppImage from '@/components/ui/AppImage.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { resizeImage } from '@/utils/product'

const props = defineProps({ images: { type: Array, default: () => [] }, alt: String })
const active = ref(0)
const zoom = ref(false)
const origin = ref('50% 50%')
const lightbox = ref(false)
watch(
  () => props.images,
  () => (active.value = 0),
)

function onMove(e) {
  const r = e.currentTarget.getBoundingClientRect()
  origin.value = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`
}
function go(d) {
  const n = props.images.length
  active.value = (active.value + d + n) % n
}
let touchX = 0
const onTouchStart = (e) => (touchX = e.touches[0].clientX)
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
}
</script>

<template>
  <div class="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
    <div
      v-if="images.length > 1"
      class="flex gap-2 overflow-x-auto md:w-20 md:shrink-0 md:flex-col md:overflow-visible"
    >
      <button
        v-for="(img, i) in images"
        :key="img"
        class="w-16 shrink-0 border transition md:w-full"
        :class="i === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'"
        :aria-label="`Ảnh ${i + 1}`"
        @click="active = i"
      >
        <AppImage :src="img" :alt="`${alt} ${i + 1}`" ratio="3/4" :width="160" eager />
      </button>
    </div>

    <div
      class="relative flex-1 cursor-zoom-in overflow-hidden bg-mist"
      @mouseenter="zoom = true"
      @mouseleave="zoom = false"
      @mousemove="onMove"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @click="lightbox = true"
    >
      <AppImage
        :src="images[active]"
        :alt="alt"
        ratio="3/4"
        :width="1100"
        eager
        class="gallery-main"
        :class="{ 'is-zoomed': zoom }"
        :style="{ '--zoom-origin': origin }"
      />
      <div
        v-if="images.length > 1"
        class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden"
      >
        <span
          v-for="(img, i) in images"
          :key="img"
          class="h-0.5 w-5"
          :class="i === active ? 'bg-ink' : 'bg-ink/25'"
        />
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightbox"
          class="fixed inset-0 z-[90] flex items-center justify-center bg-white"
          @click.self="lightbox = false"
        >
          <button class="absolute right-4 top-4 p-2" aria-label="Đóng" @click="lightbox = false">
            <AppIcon name="close" :size="24" />
          </button>
          <button
            v-if="images.length > 1"
            class="absolute left-2 p-3 md:left-6"
            aria-label="Ảnh trước"
            @click="go(-1)"
          >
            <AppIcon name="chevron-left" :size="28" />
          </button>
          <img
            :src="resizeImage(images[active], 1600)"
            :alt="alt"
            class="max-h-[92vh] max-w-[92vw] object-contain"
          />
          <button
            v-if="images.length > 1"
            class="absolute right-2 p-3 md:right-6"
            aria-label="Ảnh sau"
            @click="go(1)"
          >
            <AppIcon name="chevron-right" :size="28" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
.gallery-main img {
  transition: transform 0.2s ease-out;
  transform-origin: var(--zoom-origin, 50% 50%);
}
@media (hover: hover) {
  .gallery-main.is-zoomed img {
    transform: scale(1.8);
  }
}
</style>
