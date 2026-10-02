<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { siteUrl, useSeo } from '@/composables/useSeo'
import { breadcrumbSchema } from '@/seo/schema'
import { useRoute } from 'vue-router'
import { formatPrice } from '@/utils/format'
import AppBreadcrumb from '@/components/ui/AppBreadcrumb.vue'
import AppImage from '@/components/ui/AppImage.vue'
import { STATIC_PAGES } from './staticPages'

const props = defineProps({ pageKey: { type: String, required: true } })
const settings = useSettingsStore()
const page = computed(() => STATIC_PAGES[props.pageKey])

const escape = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const html = computed(() => {
  const s = settings.data
  const vars = {
    shop: settings.shopName,
    hotline: s.hotline,
    email: s.email,
    address: s.address,
    fee: formatPrice(settings.shippingFee),
    free: formatPrice(settings.freeShipFrom),
  }
  return page.value.html.replace(/\{(\w+)\}/g, (_, k) => escape(vars[k] ?? ''))
})

const route = useRoute()
useSeo(() => ({
  title: page.value.title,
  description: html.value,
  image: page.value.image,
  jsonLd: [breadcrumbSchema([{ name: page.value.title, path: route.path }], siteUrl())],
}))
</script>

<template>
  <article class="pb-16">
    <AppImage
      v-if="page.image"
      :src="page.image"
      :alt="page.title"
      ratio="16/7"
      :width="1600"
      eager
      class="max-h-[60vh]"
    />
    <div class="container-x max-w-3xl pt-8 md:pt-12">
      <AppBreadcrumb :items="[{ label: page.title }]" />
      <h1 class="mb-8 mt-6 font-serif text-3xl uppercase tracking-[0.08em] md:text-5xl">{{ page.title }}</h1>
      <div class="prose-shop text-[15px] leading-relaxed text-[#333] [&_a]:underline" v-html="html" />
    </div>
  </article>
</template>
