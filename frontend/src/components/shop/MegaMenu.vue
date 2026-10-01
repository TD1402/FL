<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import AppImage from '@/components/ui/AppImage.vue'
import { FLOWER_TYPES } from './navigation'

const props = defineProps({ group: String })
defineEmits(['navigate'])
const settings = useSettingsStore()

const columns = computed(() => {
  if (props.group === 'collections') {
    return [
      {
        title: 'Bộ sưu tập theo dịp',
        links: settings.collections.map((c) => ({ label: c.name, to: `/bo-suu-tap/${c.slug}` })),
      },
    ]
  }
  if (props.group === 'occasions') {
    return [
      {
        title: 'Hoa theo dịp',
        links: settings.occasions.map((c) => ({ label: c.name, to: `/danh-muc/${c.slug}` })),
      },
    ]
  }
  return [
    { title: 'Kiểu dáng', links: settings.styles.map((c) => ({ label: c.name, to: `/danh-muc/${c.slug}` })) },
    {
      title: 'Thành phần hoa',
      links: FLOWER_TYPES.map((f) => ({ label: f, to: { path: '/san-pham', query: { flower: f } } })),
    },
  ]
})

const feature = computed(() => {
  const list =
    { collections: settings.collections, occasions: settings.occasions, types: settings.styles }[
      props.group
    ] || []
  const c = list.find((x) => x.image)
  if (!c) return null
  return {
    image: c.image,
    label: c.name,
    to: props.group === 'collections' ? `/bo-suu-tap/${c.slug}` : `/danh-muc/${c.slug}`,
  }
})
</script>

<template>
  <div
    class="absolute inset-x-0 top-full border-t border-line bg-white shadow-[0_12px_24px_-12px_rgba(0,0,0,0.12)]"
  >
    <div class="container-x grid grid-cols-12 gap-8 py-10">
      <div v-for="col in columns" :key="col.title" class="col-span-3">
        <p class="caps mb-5 font-medium">{{ col.title }}</p>
        <ul class="space-y-3 text-sm text-muted">
          <li v-for="l in col.links" :key="l.label">
            <RouterLink :to="l.to" class="transition-colors hover:text-ink" @click="$emit('navigate')">{{
              l.label
            }}</RouterLink>
          </li>
        </ul>
      </div>
      <RouterLink
        v-if="feature"
        :to="feature.to"
        class="group col-span-3 col-start-10 block"
        @click="$emit('navigate')"
      >
        <AppImage
          :src="feature.image"
          :alt="feature.label"
          ratio="4/5"
          :width="500"
          img-class="transition-transform duration-700 group-hover:scale-105"
        />
        <p class="caps mt-3">{{ feature.label }}</p>
      </RouterLink>
    </div>
  </div>
</template>
