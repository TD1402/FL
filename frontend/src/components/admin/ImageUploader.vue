<script setup>
import { ref } from 'vue'
import { uploadImage } from '@/api/admin'
import { toast } from '@/composables/useToast'
import AppIcon from '@/components/ui/AppIcon.vue'

/** Danh sách URL ảnh: upload nhiều file lên Drive, thêm URL ngoài, sắp xếp, xoá. */
const images = defineModel({ type: Array, default: () => [] })
const props = defineProps({ multiple: { type: Boolean, default: true } })
const uploading = ref(0)
const urlInput = ref('')

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  for (const file of props.multiple ? files : files.slice(0, 1)) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name}: ảnh quá lớn (tối đa 10MB)`)
      continue
    }
    uploading.value++
    try {
      const r = await uploadImage(file)
      images.value = props.multiple ? [...images.value, r.url] : [r.url]
    } catch {
      /* toast đã hiển thị */
    } finally {
      uploading.value--
    }
  }
}
function addUrl() {
  const u = urlInput.value.trim()
  if (!/^https?:\/\//.test(u)) return toast.error('URL ảnh phải bắt đầu bằng http(s)://')
  images.value = props.multiple ? [...images.value, u] : [u]
  urlInput.value = ''
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
        <img :src="img" alt="" class="h-full w-full object-cover" />
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
      <div v-for="n in uploading" :key="'u' + n" class="skeleton h-32 w-24" />
      <label
        class="flex h-32 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-ink/30 text-xs text-muted hover:border-ink"
      >
        <AppIcon name="upload" :size="18" />
        Tải ảnh
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :multiple="multiple"
          class="hidden"
          @change="onFiles"
        />
      </label>
    </div>
    <div class="mt-3 flex max-w-xl">
      <input
        v-model="urlInput"
        class="input h-10"
        placeholder="Hoặc dán URL ảnh…"
        @keydown.enter.prevent="addUrl"
      />
      <button type="button" class="btn-outline h-10 shrink-0 px-4" @click="addUrl">Thêm</button>
    </div>
  </div>
</template>
