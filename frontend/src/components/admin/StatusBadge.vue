<script setup>
import { computed } from 'vue'
import { CONTACT_STATUS, ORDER_STATUS, PAYMENT_STATUS } from './constants'

const props = defineProps({ value: String, kind: { type: String, default: 'order' } })
const map = { order: ORDER_STATUS, payment: PAYMENT_STATUS, contact: CONTACT_STATUS }
const s = computed(
  () => map[props.kind]?.[props.value] || { label: props.value || '—', class: 'bg-neutral-100' },
)
</script>

<template>
  <span
    class="inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-[11px] font-medium"
    :class="s.class"
    >{{ s.label }}</span
  >
</template>
