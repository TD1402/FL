<script setup>
import ProductCard from './ProductCard.vue'

defineProps({
  products: { type: Array, default: () => [] },
  loading: Boolean,
  skeletons: { type: Number, default: 8 },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 lg:gap-y-12">
    <ProductCard v-for="(p, i) in products" :key="p.id" :product="p" :eager="i < 4" />
    <template v-if="loading">
      <div v-for="i in skeletons" :key="'s' + i">
        <div class="skeleton aspect-[3/4]" />
        <div class="skeleton mt-3 h-4 w-4/5" />
        <div class="skeleton mt-2 h-4 w-1/3" />
      </div>
    </template>
  </div>
</template>
