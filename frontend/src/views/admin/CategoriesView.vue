<script setup>
import { computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import ResourceManager from '@/components/admin/ResourceManager.vue'

const settings = useSettingsStore()
onMounted(() => settings.load())

const parentOptions = computed(() => [
  { value: '', label: '— Danh mục gốc —' },
  ...settings.categories.map((c) => ({ value: c.id, label: c.name })),
])
const parentName = (id) => settings.flatCategories.find((c) => c.id === id)?.name || '—'

const columns = [
  { key: 'image', label: 'Ảnh', type: 'image' },
  { key: 'name', label: 'Tên' },
  { key: 'slug', label: 'Slug' },
  { key: 'parent_id', label: 'Thuộc' },
  { key: 'sort_order', label: 'Thứ tự' },
]
const fields = computed(() => [
  { key: 'name', label: 'Tên danh mục', required: true },
  {
    key: 'slug',
    label: 'Slug',
    placeholder: 'tự tạo từ tên',
    help: 'Danh mục con của "Bộ sưu tập" dùng slug này làm giá trị cột collection của sản phẩm.',
  },
  { key: 'parent_id', label: 'Danh mục cha', type: 'select', options: parentOptions.value },
  { key: 'sort_order', label: 'Thứ tự', type: 'number' },
  { key: 'image', label: 'Ảnh đại diện', type: 'image' },
  { key: 'is_active', label: 'Hiển thị', type: 'checkbox' },
])
</script>

<template>
  <ResourceManager
    resource="categories"
    upload-folder="danh-muc"
    title="Danh mục"
    item-label="danh mục"
    :columns="columns"
    :fields="fields"
    :defaults="() => ({ parent_id: '', sort_order: 99, is_active: true })"
    @saved="settings.load(true)"
  >
    <template #cell-parent_id="{ row }">{{ parentName(row.parent_id) }}</template>
  </ResourceManager>
</template>
