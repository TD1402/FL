<script setup>
import ResourceManager from '@/components/admin/ResourceManager.vue'

const POSITIONS = [
  { value: 'hero', label: 'Hero (slider đầu trang)' },
  { value: 'collection', label: 'Bộ sưu tập nổi bật' },
  { value: 'promo', label: 'Gợi ý chọn hoa' },
]
const columns = [
  { key: 'image', label: 'Ảnh', type: 'image' },
  { key: 'title', label: 'Tiêu đề' },
  { key: 'position', label: 'Vị trí' },
  { key: 'link', label: 'Liên kết' },
  { key: 'sort_order', label: 'Thứ tự' },
]
const fields = [
  { key: 'title', label: 'Tiêu đề', required: true },
  { key: 'subtitle', label: 'Phụ đề' },
  { key: 'position', label: 'Vị trí', type: 'select', options: POSITIONS },
  { key: 'link', label: 'Liên kết', placeholder: '/bo-suu-tap/20-10' },
  { key: 'sort_order', label: 'Thứ tự', type: 'number' },
  { key: 'is_active', label: 'Hiển thị', type: 'checkbox' },
  { key: 'image', label: 'Ảnh desktop (hero: 1920×840)', type: 'image' },
  { key: 'image_mobile', label: 'Ảnh mobile (tuỳ chọn, 800×1000)', type: 'image' },
]
const positionLabel = (v) => POSITIONS.find((p) => p.value === v)?.label || v
</script>

<template>
  <ResourceManager
    resource="banners"
    upload-folder="banner"
    title="Banner"
    item-label="banner"
    :columns="columns"
    :fields="fields"
    :defaults="() => ({ position: 'hero', sort_order: 99, is_active: true })"
  >
    <template #cell-position="{ row }">{{ positionLabel(row.position) }}</template>
  </ResourceManager>
</template>
