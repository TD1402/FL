<script setup>
import { useWishlistStore } from '@/stores/wishlist'
import { useSeo } from '@/composables/useSeo'
import ProductGrid from '@/components/shop/ProductGrid.vue'
import StateBlock from '@/components/ui/StateBlock.vue'

useSeo(() => ({ title: 'Yêu thích', noindex: true }))
const wishlist = useWishlistStore()
</script>

<template>
  <div class="container-x pb-16 pt-8 md:pt-12">
    <h1 class="text-center font-serif text-3xl uppercase tracking-[0.08em] md:text-5xl">Yêu thích</h1>
    <p class="mb-10 mt-3 text-center text-sm text-muted">{{ wishlist.count }} sản phẩm</p>
    <StateBlock
      v-if="!wishlist.count"
      title="Chưa có sản phẩm yêu thích"
      message="Nhấn biểu tượng trái tim trên sản phẩm để lưu lại."
    >
      <RouterLink to="/hang-moi" class="btn-primary">Khám phá hoa mới</RouterLink>
    </StateBlock>
    <ProductGrid v-else :products="wishlist.items" />
  </div>
</template>
