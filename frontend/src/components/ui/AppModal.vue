<script setup>
import { onBeforeUnmount, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({ title: String, wide: Boolean })

const onKey = (e) => e.key === 'Escape' && (open.value = false)
watch(
  open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
        @click.self="open = false"
      >
        <div
          class="relative max-h-[92vh] w-full overflow-y-auto bg-white p-6 sm:p-8"
          :class="props.wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'"
          role="dialog"
          aria-modal="true"
        >
          <button
            class="absolute right-4 top-4 p-1 text-muted hover:text-ink"
            aria-label="Đóng"
            @click="open = false"
          >
            <AppIcon name="close" />
          </button>
          <h2 v-if="title" class="mb-6 pr-8 font-serif text-2xl">{{ title }}</h2>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
