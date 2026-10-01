<script setup>
import { computed, ref } from 'vue'
import { formatPrice } from '@/utils/format'

/** Biểu đồ cột doanh thu theo ngày (một chuỗi dữ liệu). data: [{date, revenue}] */
const props = defineProps({ data: { type: Array, default: () => [] } })
const hover = ref(-1)
const max = computed(() => Math.max(1, ...props.data.map((d) => d.revenue)))
const short = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}tr` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)
const label = (d) => d.date.slice(8, 10) + '/' + d.date.slice(5, 7)
</script>

<template>
  <figure>
    <div
      class="relative flex h-48 items-end gap-[2px] border-b border-line"
      role="img"
      aria-label="Doanh thu 14 ngày gần nhất"
    >
      <div class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
      <span class="absolute -top-5 left-0 text-[10px] text-muted">{{ short(max) }}</span>
      <div
        v-for="(d, i) in data"
        :key="d.date"
        class="relative flex h-full flex-1 items-end"
        @mouseenter="hover = i"
        @mouseleave="hover = -1"
      >
        <div
          class="w-full rounded-t-[4px] transition-colors"
          :class="hover === i ? 'bg-accent' : 'bg-ink/80'"
          :style="{ height: d.revenue ? Math.max(2, (d.revenue / max) * 100) + '%' : '0' }"
        />
        <div
          v-if="hover === i"
          class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap bg-ink px-2.5 py-1.5 text-[11px] text-white shadow"
        >
          {{ label(d) }} · {{ formatPrice(d.revenue) }}
        </div>
      </div>
    </div>
    <div class="mt-1.5 flex gap-[2px] text-[10px] text-muted">
      <span v-for="(d, i) in data" :key="d.date" class="flex-1 text-center">{{
        i % 2 === data.length % 2 ? '' : label(d)
      }}</span>
    </div>
    <table class="sr-only">
      <caption>
        Doanh thu theo ngày
      </caption>
      <tr v-for="d in data" :key="d.date">
        <th>{{ d.date }}</th>
        <td>{{ formatPrice(d.revenue) }}</td>
      </tr>
    </table>
  </figure>
</template>
