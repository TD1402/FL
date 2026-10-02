<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { importImageUrl, uploadImage } from '@/api/admin'
import { toast } from '@/composables/useToast'
import AppIcon from '@/components/ui/AppIcon.vue'
import DrivePicker from './DrivePicker.vue'
import { driveToLh3, resizeImage } from '@/utils/product'

/**
 * Danh sách URL ảnh: upload nhiều file lên Drive (song song, có ảnh xem trước), thêm URL ngoài, sắp xếp, xoá.
 * Phát sự kiện `busy` (true/false) để form khoá nút Lưu khi đang tải ảnh.
 */
const images = defineModel({ type: Array, default: () => [] })
const props = defineProps({
  multiple: { type: Boolean, default: true },
  /** Thư mục con trong thư mục ảnh Drive của shop: ảnh upload vào đây, picker mở sẵn thư mục này */
  folder: { type: String, default: '' },
  /** Lý do chưa cho upload (vd chưa có tên sản phẩm → chưa biết thư mục) — hiện thông báo, khoá upload */
  lockedReason: { type: String, default: '' },
  /** Sản phẩm đang sửa: ảnh vào thư mục đang chứa ảnh hiện có của sản phẩm (nếu có) */
  productId: { type: String, default: '' },
})
const pickerOpen = ref(false)
const emit = defineEmits(['busy'])
const CONCURRENCY = 3
const MAX_BYTES = 15 * 1024 * 1024

/** Ảnh đang tải: { key, preview (object URL), name } */
const pending = ref([])
const urlInput = ref('')
watch(
  () => pending.value.length > 0,
  (v) => emit('busy', v),
)
onBeforeUnmount(() =>
  pending.value.forEach((p) => p.preview.startsWith('blob:') && URL.revokeObjectURL(p.preview)),
)

let seq = 0
async function onFiles(e) {
  const files = Array.from(e.target.files || []).filter((f) => {
    if (f.size <= MAX_BYTES) return true
    toast.error(`${f.name}: ảnh quá lớn (tối đa 15MB)`)
    return false
  })
  e.target.value = ''
  const batch = (props.multiple ? files : files.slice(0, 1)).map((file) => ({
    key: ++seq,
    file,
    name: file.name,
    preview: URL.createObjectURL(file),
  }))
  if (!batch.length) return
  pending.value = [...pending.value, ...batch]

  // Upload song song (tối đa CONCURRENCY), giữ đúng thứ tự đã chọn khi thêm vào danh sách
  const results = new Array(batch.length).fill(null)
  let next = 0
  const started = Date.now()
  const worker = async () => {
    while (next < batch.length) {
      const i = next++
      try {
        results[i] = (
          await uploadImage(batch[i].file, { folder: props.folder, productId: props.productId })
        ).url
      } catch {
        /* toast đã hiển thị lỗi */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker))

  const urls = results.filter(Boolean)
  if (urls.length) images.value = props.multiple ? [...images.value, ...urls] : [urls[0]]
  const keys = new Set(batch.map((b) => b.key))
  batch.forEach((b) => URL.revokeObjectURL(b.preview))
  pending.value = pending.value.filter((p) => !keys.has(p.key))
  if (urls.length > 1)
    toast.success(`Đã tải ${urls.length} ảnh (${((Date.now() - started) / 1000).toFixed(1)}s)`)
}
/** Ảnh chọn từ Drive: thêm (bỏ trùng) theo thứ tự đã chọn */
function onPick(urls) {
  if (!props.multiple) return (images.value = urls.slice(0, 1))
  const id = (u) => String(u).match(/\/d\/([\w-]{20,})/)?.[1] || u
  const have = new Set(images.value.map(id))
  images.value = [...images.value, ...urls.filter((u) => !have.has(id(u)))]
}
/** Dán link: link Drive dùng luôn; link web khác → backend tải về lưu vào Drive (mọi ảnh đều nằm trên Drive). */
async function addUrl() {
  const u = urlInput.value.trim()
  if (!/^https?:\/\//.test(u)) return toast.error('URL ảnh phải bắt đầu bằng http(s)://')
  urlInput.value = ''
  const add = (url) => (images.value = props.multiple ? [...images.value, url] : [url])
  const drive = driveToLh3(u)
  if (drive !== u || /lh3\.googleusercontent\.com\/d\//.test(u)) return add(drive)
  const item = { key: ++seq, name: u, preview: u }
  pending.value = [...pending.value, item]
  try {
    add((await importImageUrl(u, props.folder, props.productId)).url)
    toast.success('Đã lưu ảnh vào Google Drive')
  } catch {
    /* toast đã hiển thị lỗi */
  } finally {
    pending.value = pending.value.filter((p) => p.key !== item.key)
  }
}
function remove(i) {
  images.value = images.value.filter((_, j) => j !== i)
}
function move(i, d) {
  const arr = [...images.value]
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  images.value = arr
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-3">
      <div
        v-for="(img, i) in images"
        :key="img + i"
        class="group relative h-32 w-24 overflow-hidden border border-line bg-mist"
      >
        <img :src="resizeImage(img, 300)" alt="" class="h-full w-full object-cover" />
        <span v-if="i === 0 && multiple" class="absolute left-1 top-1 bg-ink px-1.5 text-[10px] text-white"
          >Ảnh chính</span
        >
        <div
          class="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 opacity-0 transition group-hover:opacity-100"
        >
          <button v-if="multiple" type="button" class="p-1" aria-label="Sang trái" @click="move(i, -1)">
            <AppIcon name="chevron-left" :size="14" />
          </button>
          <button type="button" class="p-1 text-accent" aria-label="Xoá ảnh" @click="remove(i)">
            <AppIcon name="trash" :size="14" />
          </button>
          <button v-if="multiple" type="button" class="p-1" aria-label="Sang phải" @click="move(i, 1)">
            <AppIcon name="chevron-right" :size="14" />
          </button>
        </div>
      </div>
      <div
        v-for="p in pending"
        :key="'u' + p.key"
        class="relative h-32 w-24 overflow-hidden border border-line bg-mist"
        :title="p.name"
      >
        <img :src="p.preview" alt="" class="h-full w-full object-cover opacity-50" />
        <span class="absolute inset-0 flex items-center justify-center">
          <span class="h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
        </span>
      </div>
      <label
        class="flex h-32 w-24 flex-col items-center justify-center gap-1 border border-dashed border-ink/30 text-xs text-muted"
        :class="lockedReason ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-ink'"
        :title="lockedReason"
      >
        <AppIcon name="upload" :size="18" />
        Tải ảnh
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :multiple="multiple"
          :disabled="!!lockedReason"
          class="hidden"
          @change="onFiles"
        />
      </label>
      <button
        type="button"
        class="flex h-32 w-24 flex-col items-center justify-center gap-1 border border-dashed border-ink/30 text-xs text-muted hover:border-ink"
        @click="pickerOpen = true"
      >
        <AppIcon name="image" :size="18" />
        Chọn từ Drive
      </button>
    </div>
    <DrivePicker
      v-model:open="pickerOpen"
      :multiple="multiple"
      :folder="folder"
      :product-id="productId"
      :existing="images"
      @select="onPick"
    />
    <p v-if="lockedReason" class="mt-2 text-xs text-accent">{{ lockedReason }}</p>
    <p v-else-if="folder" class="mt-2 text-xs text-muted">
      Ảnh tải lên được lưu vào
      <template v-if="productId">thư mục Drive đang chứa ảnh của sản phẩm (chưa có thì</template>
      thư mục <b>{{ folder }}/</b><template v-if="productId">)</template>.
    </p>
    <div class="mt-3 flex max-w-xl">
      <input
        v-model="urlInput"
        :disabled="!!lockedReason"
        class="input h-10"
        placeholder="Hoặc dán link ảnh (Drive hoặc web — tự lưu vào Drive)…"
        @keydown.enter.prevent="addUrl"
      />
      <button type="button" class="btn-outline h-10 shrink-0 px-4" :disabled="!!lockedReason" @click="addUrl">
        Thêm
      </button>
    </div>
  </div>
</template>
