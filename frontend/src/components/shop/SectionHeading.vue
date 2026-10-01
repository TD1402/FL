<script setup>
defineProps({
  title: String,
  subtitle: String,
  to: [String, Object],
  linkLabel: { type: String, default: 'Xem tất cả' },
})
</script>

<template>
  <div class="mb-8 text-center md:mb-12">
    <h2 class="section-title">{{ title }}</h2>
    <p v-if="subtitle" class="mx-auto mt-3 max-w-xl text-sm text-muted">{{ subtitle }}</p>
    <RouterLink v-if="to" :to="to" class="link-caps mt-4 text-[11px]">{{ linkLabel }}</RouterLink>
  </div>
</template>
