<script setup>
import { shallowRef } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y } from 'swiper/modules'
import 'swiper/css'
import AppIcon from '@/components/ui/AppIcon.vue'
import ProductCard from './ProductCard.vue'

defineProps({ products: { type: Array, default: () => [] }, loading: Boolean })
const swiper = shallowRef(null)
const isBeginning = shallowRef(true)
const isEnd = shallowRef(false)
function sync(s) {
  isBeginning.value = s.isBeginning
  isEnd.value = s.isEnd
}
const breakpoints = {
  0: { slidesPerView: 2.15, spaceBetween: 12 },
  640: { slidesPerView: 3, spaceBetween: 16 },
  1024: { slidesPerView: 4, spaceBetween: 24 },
  1440: { slidesPerView: 5, spaceBetween: 24 },
}
</script>

<template>
  <div class="relative">
    <div
      v-if="loading && !products.length"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5"
    >
      <div
        v-for="i in 5"
        :key="i"
        :class="{ 'hidden sm:block': i === 3, 'hidden lg:block': i === 4, 'hidden 2xl:block': i === 5 }"
      >
        <div class="skeleton aspect-[3/4]" />
        <div class="skeleton mt-3 h-4 w-4/5" />
        <div class="skeleton mt-2 h-4 w-1/3" />
      </div>
    </div>
    <template v-else>
      <Swiper
        :modules="[A11y]"
        :breakpoints="breakpoints"
        :watch-overflow="true"
        @swiper="
          (s) => {
            swiper = s
            sync(s)
          }
        "
        @slide-change="sync"
        @resize="sync"
      >
        <SwiperSlide v-for="p in products" :key="p.id"><ProductCard :product="p" /></SwiperSlide>
      </Swiper>
      <button
        v-show="!isBeginning"
        class="absolute -left-3 top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm transition hover:border-ink md:flex lg:-left-5"
        aria-label="Trước"
        @click="swiper?.slidePrev()"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <button
        v-show="!isEnd"
        class="absolute -right-3 top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm transition hover:border-ink md:flex lg:-right-5"
        aria-label="Sau"
        @click="swiper?.slideNext()"
      >
        <AppIcon name="chevron-right" :size="18" />
      </button>
    </template>
  </div>
</template>
