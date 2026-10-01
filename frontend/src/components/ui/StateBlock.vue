<script setup>
/** Khối trạng thái rỗng / lỗi dùng chung. */
defineProps({
  type: { type: String, default: 'empty' }, // empty | error
  title: String,
  message: String,
})
defineEmits(['retry'])
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 py-16 text-center">
    <p class="font-serif text-2xl">
      {{ title || (type === 'error' ? 'Đã có lỗi xảy ra' : 'Chưa có dữ liệu') }}
    </p>
    <p v-if="message" class="mt-2 max-w-md text-sm text-muted">{{ message }}</p>
    <div class="mt-6">
      <slot>
        <button v-if="type === 'error'" class="btn-outline" @click="$emit('retry')">Thử lại</button>
      </slot>
    </div>
  </div>
</template>
