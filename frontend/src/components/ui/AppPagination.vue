<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const page = defineModel({ type: Number, default: 1 })
const props = defineProps({ total: Number, limit: Number })
const pages = computed(() => Math.max(1, Math.ceil((props.total || 0) / (props.limit || 1))))
const list = computed(() => {
  const n = pages.value
  const out = []
  for (let i = 1; i <= n; i++) {
    if (i === 1 || i === n || Math.abs(i - page.value) <= 1) out.push(i)
    else if (out[out.length - 1] !== '…') out.push('…')
  }
  return out
})
</script>

<template>
  <nav v-if="pages > 1" class="flex items-center justify-center gap-1 text-sm" aria-label="Phân trang">
    <button
      class="flex h-9 w-9 items-center justify-center disabled:opacity-30"
      :disabled="page <= 1"
      aria-label="Trang trước"
      @click="page--"
    >
      <AppIcon name="chevron-left" :size="16" />
    </button>
    <template v-for="(p, i) in list" :key="i">
      <span v-if="p === '…'" class="px-2 text-muted">…</span>
      <button
        v-else
        class="h-9 min-w-9 px-2"
        :class="p === page ? 'bg-ink text-white' : 'hover:bg-mist'"
        @click="page = p"
      >
        {{ p }}
      </button>
    </template>
    <button
      class="flex h-9 w-9 items-center justify-center disabled:opacity-30"
      :disabled="page >= pages"
      aria-label="Trang sau"
      @click="page++"
    >
      <AppIcon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>
