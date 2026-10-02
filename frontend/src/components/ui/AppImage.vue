<script setup>
import { computed, ref, watch } from 'vue'
import { directImage, resizeImage } from '@/utils/product'

/**
 * Ảnh lazy-load có skeleton + ảnh dự phòng khi lỗi.
 * Đặt khung tỉ lệ bằng `ratio` (vd "3/4") để tránh layout shift.
 */
const props = defineProps({
  src: String,
  alt: { type: String, default: '' },
  ratio: { type: String, default: '' },
  width: { type: Number, default: 800 },
  eager: Boolean,
  imgClass: { type: String, default: '' },
})

const loaded = ref(false)
const failed = ref(false)
/** 0: URL chuẩn (có thể qua proxy) · 1: link Google trực tiếp · 2: thử lại lần cuối sau 2s */
const attempt = ref(0)
watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
    attempt.value = 0
  },
)

const url = computed(() => {
  const primary = resizeImage(props.src, props.width)
  if (attempt.value === 0) return primary
  const direct = directImage(props.src, props.width)
  return attempt.value === 2 ? `${direct}${direct.includes('?') ? '&' : '?'}r=1` : direct
})

function onError() {
  const direct = directImage(props.src, props.width)
  if (attempt.value === 0 && direct !== resizeImage(props.src, props.width)) attempt.value = 1
  else if (attempt.value <= 1 && direct.includes('googleusercontent'))
    setTimeout(() => (attempt.value = 2), 2000)
  else failed.value = true
}
const [rw, rh] = (props.ratio || '3/4').split('/').map(Number)
</script>

<template>
  <div class="relative overflow-hidden bg-mist" :style="ratio ? { aspectRatio: ratio } : null">
    <div v-if="!loaded && !failed" class="skeleton absolute inset-0" />
    <div v-if="failed || !src" class="absolute inset-0 flex items-center justify-center text-[#c9c4bd]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path
          d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6a3 3 0 0 1 0 6 3 3 0 0 1 0-6Zm0 12a3 3 0 0 1 0 6 3 3 0 0 1 0-6ZM3 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0Zm12 0a3 3 0 0 1 6 0 3 3 0 0 1-6 0Z"
        />
      </svg>
    </div>
    <img
      v-if="src && !failed"
      :src="url"
      :alt="alt"
      :width="width"
      :height="Math.round((width * rh) / rw)"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      class="h-full w-full object-cover transition-opacity duration-300"
      :class="[loaded ? 'opacity-100' : 'opacity-0', imgClass]"
      @load="loaded = true"
      @error="onError"
    />
  </div>
</template>
