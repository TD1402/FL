<script setup>
import { dismiss, toasts } from '@/composables/useToast'
import AppIcon from './AppIcon.vue'
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-2 sm:left-auto sm:right-6 sm:items-end"
  >
    <TransitionGroup name="fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 bg-ink px-4 py-3 text-sm text-white shadow-lg"
        :class="{ 'bg-accent': t.type === 'error' }"
      >
        <AppIcon :name="t.type === 'error' ? 'close' : 'check'" :size="18" class="mt-0.5 shrink-0" />
        <span class="flex-1">{{ t.message }}</span>
        <button class="opacity-70 hover:opacity-100" aria-label="Đóng" @click="dismiss(t.id)">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
