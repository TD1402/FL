<script setup>
import { useSeo } from '@/composables/useSeo'
useSeo(() => ({ title: 'Không tìm thấy trang', noindex: true }))
</script>

<template>
  <div class="container-x flex flex-col items-center py-24 text-center md:py-36">
    <p class="font-serif text-8xl text-[#d9d4cd] md:text-[160px]">404</p>
    <h1 class="mt-2 font-serif text-3xl">Trang bạn tìm không tồn tại</h1>
    <p class="mt-3 max-w-md text-sm text-muted">
      Có thể đường dẫn đã thay đổi hoặc sản phẩm không còn kinh doanh.
    </p>
    <div class="mt-8 flex gap-3">
      <RouterLink to="/" class="btn-outline">Trang chủ</RouterLink>
      <RouterLink to="/hang-moi" class="btn-primary">Xem hoa mới</RouterLink>
    </div>
  </div>
</template>
