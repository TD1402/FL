<script setup>
import { computed, ref, watch } from 'vue'
import { listDriveImages } from '@/api/admin'
import { resizeImage } from '@/utils/product'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'

/**
 * Chọn ảnh có sẵn trong thư mục Google Drive của shop (và các thư mục con).
 * Mở lần đầu: vào thẳng thư mục con trùng `folder` (vd slug sản phẩm) nếu có.
 */
const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  multiple: { type: Boolean, default: true },
  folder: { type: String, default: '' },
  productId: { type: String, default: '' },
  /** URL đã có trong danh sách → đánh dấu "đã thêm" */
  existing: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

const data = ref(null)
const loading = ref(false)
const error = ref('')
const selected = ref([])
const q = ref('')
const cache = new Map() // folderId → kết quả (trong phiên mở picker)

const idOf = (url) => String(url).match(/\/d\/([\w-]{20,})/)?.[1]
const existingIds = computed(() => new Set(props.existing.map(idOf).filter(Boolean)))

async function load(folderId = '', { auto = false } = {}) {
  loading.value = true
  error.value = ''
  try {
    const r =
      cache.get(folderId || 'start') || (await listDriveImages(folderId, folderId ? '' : props.productId))
    cache.set(folderId || 'start', r)
    // Lần đầu: tự vào thư mục con trùng tên với slug (nếu có)
    const match = auto && props.folder && r.folders.find((f) => f.name === props.folder)
    if (match) return load(match.id)
    data.value = r
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (!v) return
  selected.value = []
  q.value = ''
  cache.clear()
  load('', { auto: true })
})

const images = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (data.value?.images || []).filter((i) => !term || i.name.toLowerCase().includes(term))
})
const folders = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (data.value?.folders || []).filter((f) => !term || f.name.toLowerCase().includes(term))
})

function toggle(img) {
  if (!props.multiple) {
    selected.value = [img.url]
    return confirm()
  }
  const i = selected.value.indexOf(img.url)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(img.url)
}
function confirm() {
  emit('select', [...selected.value])
  open.value = false
}
</script>

<template>
  <AppModal v-model:open="open" title="Chọn ảnh từ Google Drive" wide>
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <template v-for="(p, i) in data?.path || []" :key="p.id">
        <span v-if="i" class="text-muted">/</span>
        <button
          class="hover:underline"
          :class="i === data.path.length - 1 ? 'font-medium' : 'text-muted'"
          @click="load(p.id)"
        >
          {{ i ? p.name : 'Thư mục ảnh' }}
        </button>
      </template>
      <input v-model="q" class="input ml-auto h-9 w-48" placeholder="Lọc theo tên…" />
    </div>

    <div class="mt-4 min-h-64">
      <div v-if="loading" class="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <div v-for="i in 10" :key="i" class="skeleton aspect-[3/4]" />
      </div>
      <p v-else-if="error" class="py-10 text-center text-sm text-accent">
        {{ error }} <button class="underline" @click="load(data?.folder?.id || '')">Thử lại</button>
      </p>
      <template v-else-if="data">
        <div v-if="folders.length" class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="f in folders"
            :key="f.id"
            class="flex items-center gap-2 truncate border border-line px-3 py-2.5 text-left text-sm hover:border-ink"
            @click="load(f.id)"
          >
            <AppIcon name="box" :size="16" class="shrink-0 text-muted" />
            <span class="truncate">{{ f.name }}</span>
          </button>
        </div>
        <p v-if="!images.length" class="py-10 text-center text-sm text-muted">
          {{ folders.length ? 'Chọn một thư mục bên trên.' : 'Thư mục này chưa có ảnh.' }}
        </p>
        <div v-else class="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <button
            v-for="img in images"
            :key="img.id"
            type="button"
            class="group relative overflow-hidden border-2 text-left"
            :class="selected.includes(img.url) ? 'border-ink' : 'border-transparent'"
            :title="img.name"
            @click="toggle(img)"
          >
            <img
              :src="resizeImage(img.url, 400)"
              :alt="img.name"
              loading="lazy"
              class="aspect-[3/4] w-full bg-mist object-cover"
            />
            <span
              v-if="selected.includes(img.url)"
              class="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-[11px] text-white"
            >
              {{ selected.indexOf(img.url) + 1 }}
            </span>
            <span
              v-else-if="existingIds.has(img.id)"
              class="absolute left-1.5 top-1.5 bg-white/90 px-1.5 text-[10px]"
              >Đã thêm</span
            >
            <span class="block truncate px-1 py-1 text-[11px] text-muted">{{ img.name }}</span>
          </button>
        </div>
      </template>
    </div>

    <div v-if="multiple" class="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
      <span class="mr-auto text-sm text-muted">Đã chọn {{ selected.length }} ảnh</span>
      <button class="btn-outline h-10 px-5" @click="open = false">Huỷ</button>
      <button class="btn-primary h-10 px-6" :disabled="!selected.length" @click="confirm">
        Thêm {{ selected.length || '' }} ảnh
      </button>
    </div>
  </AppModal>
</template>
