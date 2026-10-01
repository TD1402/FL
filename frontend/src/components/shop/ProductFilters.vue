<script setup>
import { computed } from 'vue'
import { formatPrice } from '@/utils/format'

/**
 * Bộ lọc danh sách. `modelValue` = { price: 'min-max' | '', color: [], flower: [] }
 * facets từ API: { colors, flowers }
 */
const model = defineModel({ type: Object, required: true })
const props = defineProps({ facets: { type: Object, default: () => ({}) } })

const PRICE_RANGES = [
  [0, 500000],
  [500000, 1000000],
  [1000000, 2000000],
  [2000000, 0],
]
const priceLabel = ([a, b]) =>
  !a ? `Dưới ${formatPrice(b)}` : !b ? `Trên ${formatPrice(a)}` : `${formatPrice(a)} – ${formatPrice(b)}`

const COLOR_HEX = {
  Đỏ: '#b42d2d',
  Hồng: '#eaa4b4',
  Trắng: '#ffffff',
  Vàng: '#eac54f',
  Cam: '#e88a3c',
  Tím: '#8e6bb8',
  Xanh: '#7fa8c9',
  Kem: '#efe3cf',
  Nâu: '#8a6a4f',
  'Đỏ thẫm': '#7a1f2b',
  'Xanh bạc': '#a9b8b3',
  'Xanh lá': '#6f9a5b',
  'Hồng phấn': '#f2c4cc',
  'Tím pastel': '#c3b1e1',
}
const colors = computed(() => props.facets.colors || [])
const flowers = computed(() => props.facets.flowers || [])

function toggle(key, value) {
  const list = model.value[key] || []
  model.value = {
    ...model.value,
    [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
  }
}
function setPrice(range) {
  const v = range.join('-')
  model.value = { ...model.value, price: model.value.price === v ? '' : v }
}
</script>

<template>
  <div class="space-y-8">
    <fieldset>
      <legend class="caps mb-4 font-medium">Khoảng giá</legend>
      <div class="space-y-2.5">
        <label
          v-for="r in PRICE_RANGES"
          :key="r.join()"
          class="flex cursor-pointer items-center gap-3 text-sm"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-ink"
            :checked="model.price === r.join('-')"
            @change="setPrice(r)"
          />
          {{ priceLabel(r) }}
        </label>
      </div>
    </fieldset>

    <fieldset v-if="colors.length">
      <legend class="caps mb-4 font-medium">Màu chủ đạo</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          class="flex items-center gap-2 border px-3 py-1.5 text-xs transition-colors"
          :class="model.color?.includes(c) ? 'border-ink' : 'border-line hover:border-ink/50'"
          @click="toggle('color', c)"
        >
          <span
            class="h-3.5 w-3.5 rounded-full border border-line"
            :style="{ background: COLOR_HEX[c] || '#ddd' }"
          />
          {{ c }}
        </button>
      </div>
    </fieldset>

    <fieldset v-if="flowers.length">
      <legend class="caps mb-4 font-medium">Loại hoa</legend>
      <div class="max-h-64 space-y-2.5 overflow-y-auto pr-2">
        <label v-for="f in flowers" :key="f" class="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            class="h-4 w-4 accent-ink"
            :checked="model.flower?.includes(f)"
            @change="toggle('flower', f)"
          />
          {{ f }}
        </label>
      </div>
    </fieldset>
  </div>
</template>
