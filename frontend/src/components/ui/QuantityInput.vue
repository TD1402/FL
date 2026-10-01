<script setup>
import AppIcon from './AppIcon.vue'

const model = defineModel({ type: Number, default: 1 })
const props = defineProps({
  min: { type: Number, default: 1 },
  max: { type: Number, default: 99 },
  small: Boolean,
})

function set(v) {
  const n = Number.parseInt(v, 10)
  model.value = Math.max(props.min, Math.min(Number.isNaN(n) ? props.min : n, props.max))
}
</script>

<template>
  <div class="inline-flex items-center border border-line" :class="small ? 'h-9' : 'h-12'">
    <button
      type="button"
      class="flex h-full w-9 items-center justify-center hover:bg-mist"
      aria-label="Giảm"
      @click="set(model - 1)"
    >
      <AppIcon name="minus" :size="14" />
    </button>
    <input
      :value="model"
      inputmode="numeric"
      aria-label="Số lượng"
      class="h-full w-10 border-x border-line text-center text-sm outline-none"
      @change="set($event.target.value)"
    />
    <button
      type="button"
      class="flex h-full w-9 items-center justify-center hover:bg-mist"
      aria-label="Tăng"
      @click="set(model + 1)"
    >
      <AppIcon name="plus" :size="14" />
    </button>
  </div>
</template>
