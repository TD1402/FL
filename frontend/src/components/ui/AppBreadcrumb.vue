<script setup>
/** @type {{ items: {label: string, to?: string}[] }} */
defineProps({ items: { type: Array, default: () => [] } })
</script>

<template>
  <nav aria-label="Breadcrumb" class="caps flex flex-wrap items-center gap-2 text-[11px] text-muted">
    <RouterLink to="/" class="hover:text-ink">Trang chủ</RouterLink>
    <template v-for="(it, i) in items" :key="i">
      <span>/</span>
      <RouterLink v-if="it.to" :to="it.to" class="hover:text-ink">{{ it.label }}</RouterLink>
      <span v-else class="text-ink">{{ it.label }}</span>
    </template>
  </nav>
</template>
