<script setup>
import AppIcon from '@/components/ui/AppIcon.vue'

const items = [
  { icon: 'truck', title: 'Giao nhanh 2h', text: 'Nội thành, đúng khung giờ' },
  { icon: 'flower', title: 'Hoa tươi mỗi ngày', text: 'Nhập mới mỗi sáng' },
  { icon: 'card', title: 'Tặng thiệp miễn phí', text: 'Viết tay theo lời nhắn' },
  { icon: 'refresh', title: 'Đổi hoa nếu không hài lòng', text: 'Trong vòng 24 giờ' },
]
</script>

<template>
  <section class="border-y border-line">
    <div class="container-x grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4 md:py-12">
      <div v-for="it in items" :key="it.title" class="flex flex-col items-center px-2 text-center">
        <AppIcon :name="it.icon" :size="28" class="mb-3" />
        <p class="caps text-[11px] font-medium">{{ it.title }}</p>
        <p class="mt-1 text-xs text-muted">{{ it.text }}</p>
      </div>
    </div>
  </section>
</template>
