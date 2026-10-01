<script setup>
import { formatDate, formatPrice } from '@/utils/format'
import ResourceManager from '@/components/admin/ResourceManager.vue'

const columns = [
  { key: 'code', label: 'Mã' },
  { key: 'value', label: 'Giảm' },
  { key: 'min_order', label: 'Đơn tối thiểu', type: 'money' },
  { key: 'end_date', label: 'Thời hạn' },
  { key: 'used_count', label: 'Đã dùng' },
]
const fields = [
  { key: 'code', label: 'Mã', required: true, placeholder: 'VD: GIAM20' },
  {
    key: 'type',
    label: 'Loại',
    type: 'select',
    options: [
      { value: 'percent', label: 'Phần trăm (%)' },
      { value: 'fixed', label: 'Số tiền cố định (₫)' },
    ],
  },
  { key: 'value', label: 'Giá trị', type: 'number', required: true },
  { key: 'max_discount', label: 'Giảm tối đa (₫, 0 = không giới hạn)', type: 'number' },
  { key: 'min_order', label: 'Đơn tối thiểu (₫)', type: 'number' },
  { key: 'usage_limit', label: 'Số lượt (0 = không giới hạn)', type: 'number' },
  { key: 'start_date', label: 'Ngày bắt đầu', type: 'date' },
  { key: 'end_date', label: 'Ngày kết thúc', type: 'date' },
  { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
]
</script>

<template>
  <ResourceManager
    resource="coupons"
    title="Mã giảm giá"
    item-label="mã giảm giá"
    id-field="code"
    user-key
    :columns="columns"
    :fields="fields"
    :defaults="
      () => ({
        code: '',
        type: 'percent',
        value: 10,
        min_order: 0,
        max_discount: 0,
        usage_limit: 0,
        start_date: '',
        end_date: '',
        is_active: true,
      })
    "
  >
    <template #cell-code="{ row }"
      ><span class="font-mono">{{ row.code }}</span></template
    >
    <template #cell-value="{ row }">
      {{ row.type === 'percent' ? row.value + '%' : formatPrice(row.value) }}
      <span v-if="row.type === 'percent' && row.max_discount" class="block text-xs text-muted"
        >tối đa {{ formatPrice(row.max_discount) }}</span
      >
    </template>
    <template #cell-end_date="{ row }">
      <span class="text-xs"
        >{{ row.start_date ? formatDate(row.start_date) : '…' }} →
        {{ row.end_date ? formatDate(row.end_date) : '∞' }}</span
      >
    </template>
    <template #cell-used_count="{ row }"
      >{{ row.used_count }}<span v-if="row.usage_limit"> / {{ row.usage_limit }}</span></template
    >
  </ResourceManager>
</template>
