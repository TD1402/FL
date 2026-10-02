<script setup>
import { computed } from 'vue'
import { getBanners, getProducts } from '@/api/shop'
import { useAsync } from '@/composables/useAsync'
import { siteUrl, useSeo } from '@/composables/useSeo'
import { floristSchema, websiteSchema } from '@/seo/schema'
import { useSettingsStore } from '@/stores/settings'
import AppImage from '@/components/ui/AppImage.vue'
import HeroSlider from '@/components/shop/HeroSlider.vue'
import ProductCarousel from '@/components/shop/ProductCarousel.vue'
import SectionHeading from '@/components/shop/SectionHeading.vue'
import CommitmentStrip from '@/components/shop/CommitmentStrip.vue'
import NewsletterForm from '@/components/shop/NewsletterForm.vue'

const settings = useSettingsStore()

const banners = useAsync(() => getBanners(undefined, (fresh) => (banners.data.value = fresh)), {
  immediate: true,
  initial: [],
})
const newest = useAsync(
  () => getProducts({ isNew: true, limit: 10 }, { silent: true, onUpdate: (r) => (newest.data.value = r) }),
  { immediate: true },
)
const best = useAsync(
  () =>
    getProducts(
      { isBestSeller: true, sort: 'best_seller', limit: 10 },
      { silent: true, onUpdate: (r) => (best.data.value = r) },
    ),
  {
    immediate: true,
  },
)

const byPosition = (pos) => computed(() => (banners.data.value || []).filter((b) => b.position === pos))
const hero = byPosition('hero')
const collections = byPosition('collection')
const styles = byPosition('promo')
const occasions = computed(() => settings.occasions.filter((c) => c.image))

useSeo(() => ({
  path: '/',
  image: settings.data.og_image || hero.value[0]?.image,
  jsonLd: [floristSchema(settings.data, siteUrl()), websiteSchema(settings.data, siteUrl())],
}))

const isInternal = (link) => link && link.startsWith('/')
const linkTag = (link) => (isInternal(link) ? 'RouterLink' : 'a')
const linkAttrs = (link) => (isInternal(link) ? { to: link } : { href: link || '#' })
</script>

<template>
  <div>
    <h1 class="sr-only">{{ settings.data.seo_title || settings.shopName }}</h1>
    <HeroSlider :banners="hero" :loading="banners.loading.value" />

    <!-- HOA MỚI -->
    <section class="section container-x">
      <SectionHeading title="Hoa mới" to="/hang-moi" />
      <ProductCarousel :products="newest.data.value?.items || []" :loading="newest.loading.value" />
      <p v-if="newest.error.value" class="text-center text-sm text-muted">
        Không tải được sản phẩm. <button class="underline" @click="newest.run()">Thử lại</button>
      </p>
    </section>

    <!-- BÁN CHẠY -->
    <section class="section container-x pt-0 md:pt-0 lg:pt-0">
      <SectionHeading title="Bán chạy" to="/ban-chay" />
      <ProductCarousel :products="best.data.value?.items || []" :loading="best.loading.value" />
    </section>

    <!-- BỘ SƯU TẬP NỔI BẬT -->
    <section v-if="collections.length" class="section bg-cream">
      <div class="container-x">
        <SectionHeading title="Bộ sưu tập nổi bật" />
        <div class="grid gap-4 md:grid-cols-2 md:gap-6">
          <component
            :is="linkTag(b.link)"
            v-for="b in collections.slice(0, 2)"
            :key="b.id"
            v-bind="linkAttrs(b.link)"
            class="group relative block overflow-hidden"
          >
            <AppImage
              :src="b.image"
              :alt="b.title"
              ratio="4/5"
              :width="900"
              img-class="transition-transform duration-[1.2s] ease-[var(--ease-soft)] group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div class="absolute inset-x-0 bottom-0 p-6 text-center text-white md:p-10">
              <h3 class="font-serif text-3xl uppercase tracking-[0.06em] md:text-4xl">{{ b.title }}</h3>
              <span class="caps mt-4 inline-block border-b border-white pb-0.5 text-[11px]">{{
                b.subtitle || 'Khám phá'
              }}</span>
            </div>
          </component>
        </div>
      </div>
    </section>

    <!-- HOA THEO DỊP -->
    <section v-if="occasions.length" class="section container-x">
      <SectionHeading title="Hoa theo dịp" to="/danh-muc/hoa-theo-dip" />
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        <RouterLink
          v-for="c in occasions"
          :key="c.id"
          :to="`/danh-muc/${c.slug}`"
          class="group relative block overflow-hidden"
        >
          <AppImage
            :src="c.image"
            :alt="c.name"
            ratio="1/1"
            :width="700"
            img-class="transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/25" />
          <p
            class="caps absolute inset-x-0 bottom-4 text-center text-[11px] text-white md:bottom-6 md:text-sm"
          >
            {{ c.name }}
          </p>
        </RouterLink>
      </div>
    </section>

    <!-- GỢI Ý CHỌN HOA -->
    <section v-if="styles.length" class="section container-x pt-0 md:pt-0 lg:pt-0">
      <SectionHeading
        title="Gợi ý chọn hoa"
        subtitle="Chọn hoa theo phong cách của người nhận — từ dịu dàng đến rực rỡ."
      />
      <div
        class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0"
      >
        <component
          :is="linkTag(b.link)"
          v-for="b in styles"
          :key="b.id"
          v-bind="linkAttrs(b.link)"
          class="group block w-[62%] shrink-0 snap-start md:w-auto"
        >
          <AppImage
            :src="b.image"
            :alt="b.title"
            ratio="2/3"
            :width="600"
            img-class="transition-transform duration-700 group-hover:scale-105"
          />
          <p class="caps mt-4 text-[12px] font-medium">{{ b.title }}</p>
          <p v-if="b.subtitle" class="mt-1 text-xs text-muted">{{ b.subtitle }}</p>
        </component>
      </div>
    </section>

    <CommitmentStrip />

    <!-- ĐĂNG KÝ NHẬN TIN -->
    <section class="section bg-ink text-white">
      <div class="container-x max-w-2xl text-center">
        <h2 class="section-title">Đăng ký nhận tin</h2>
        <p class="mx-auto mt-3 max-w-md text-sm text-white/70">
          Nhận mã giảm 10% cho đơn đầu tiên và cập nhật bộ sưu tập hoa mới nhất.
        </p>
        <div class="mx-auto mt-8 max-w-lg"><NewsletterForm dark /></div>
      </div>
    </section>
  </div>
</template>
