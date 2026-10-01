<script setup>
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Autoplay, EffectFade, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { resizeImage } from '@/utils/product'

defineProps({ banners: { type: Array, default: () => [] }, loading: Boolean })

const isInternal = (link) => link && link.startsWith('/')
</script>

<template>
  <section class="relative">
    <div v-if="loading && !banners.length" class="skeleton aspect-[4/5] w-full md:aspect-[16/7]" />
    <Swiper
      v-else-if="banners.length"
      :modules="[Autoplay, EffectFade, Pagination, A11y]"
      effect="fade"
      :loop="banners.length > 1"
      :autoplay="{ delay: 5000, disableOnInteraction: false }"
      :pagination="{ clickable: true }"
      class="hero-swiper"
    >
      <SwiperSlide v-for="(b, i) in banners" :key="b.id">
        <component
          :is="isInternal(b.link) ? 'RouterLink' : 'a'"
          v-bind="isInternal(b.link) ? { to: b.link } : { href: b.link || '#' }"
          class="relative block"
        >
          <picture>
            <source
              v-if="b.image_mobile"
              media="(max-width: 767px)"
              :srcset="resizeImage(b.image_mobile, 800)"
            />
            <img
              :src="resizeImage(b.image, 1920)"
              :alt="b.title"
              width="1920"
              height="840"
              :loading="i === 0 ? 'eager' : 'lazy'"
              :fetchpriority="i === 0 ? 'high' : 'auto'"
              class="aspect-[4/5] w-full bg-mist object-cover md:aspect-[16/7]"
            />
          </picture>
          <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 pb-14 text-center text-white md:pb-20">
            <h2
              class="px-4 font-serif text-4xl uppercase leading-tight tracking-[0.06em] md:text-6xl lg:text-7xl"
            >
              {{ b.title }}
            </h2>
            <p v-if="b.subtitle" class="caps mt-3 text-[11px] text-white/90 md:text-xs">{{ b.subtitle }}</p>
            <span class="btn mt-6 bg-white text-ink transition-colors hover:bg-ink hover:text-white md:mt-8"
              >Mua ngay</span
            >
          </div>
        </component>
      </SwiperSlide>
    </Swiper>
  </section>
</template>

<style>
.hero-swiper .swiper-pagination-bullet {
  width: 28px;
  height: 2px;
  border-radius: 0;
  background: #fff;
  opacity: 0.5;
}
.hero-swiper .swiper-pagination-bullet-active {
  opacity: 1;
}
.hero-swiper .swiper-pagination {
  bottom: 20px !important;
}
</style>
