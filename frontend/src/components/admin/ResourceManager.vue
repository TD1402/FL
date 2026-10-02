<script setup>
import { resizeImage } from '@/utils/product'
import { computed, ref } from 'vue'
import { adminDelete, adminList, adminSave } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { toast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ImageUploader from './ImageUploader.vue'

/**
 * CRUD chung cho các bảng đơn giản (danh mục, banner, mã giảm giá).
 * columns: [{ key, label, type?: 'image'|'bool'|'money'|'text' }]
 * fields:  [{ key, label, type?: 'text'|'number'|'textarea'|'select'|'checkbox'|'image'|'date', options?, required?, full? }]
 */
const props = defineProps({
  resource: { type: String, required: true },
  title: String,
  itemLabel: { type: String, default: 'mục' },
  idField: { type: String, default: 'id' },
  columns: { type: Array, required: true },
  fields: { type: Array, required: true },
  defaults: { type: Function, default: () => ({ is_active: true }) },
  /** Khoá do người dùng nhập (vd mã coupon) → gửi create: true để chặn trùng. */
  userKey: Boolean,
  /** Thư mục con trên Drive cho ảnh của bảng này (vd 'banner', 'danh-muc') */
  uploadFolder: { type: String, default: '' },
})

const emit = defineEmits(['saved'])
const showInactive = ref(false)
const q = ref('')
const list = useAsync(() => adminList(props.resource, { limit: 500 }).then((r) => r.items), {
  immediate: true,
  initial: [],
})
const rows = computed(() => {
  const term = q.value.trim().toLowerCase()
  return (list.data.value || []).filter(
    (r) =>
      (showInactive.value || r.is_active !== false) &&
      (!term || JSON.stringify(r).toLowerCase().includes(term)),
  )
})

const open = ref(false)
const editing = ref({})
const isNew = ref(true)
const saving = ref(false)
const uploadingImages = ref(false)

function create() {
  editing.value = props.defaults()
  isNew.value = true
  open.value = true
}
function edit(row) {
  editing.value = JSON.parse(JSON.stringify(row))
  isNew.value = false
  open.value = true
}
async function save() {
  for (const f of props.fields) {
    if (f.required && (editing.value[f.key] === '' || editing.value[f.key] == null))
      return toast.error(`Vui lòng nhập ${f.label}`)
  }
  saving.value = true
  try {
    const item = { ...editing.value }
    if (isNew.value && !props.userKey) delete item[props.idField]
    await adminSave(props.resource, item, { create: isNew.value && props.userKey })
    toast.success('Đã lưu')
    open.value = false
    list.run()
    emit('saved')
  } catch {
    /* toast */
  } finally {
    saving.value = false
  }
}
async function remove(row) {
  if (!confirm(`Ẩn ${props.itemLabel} này? (có thể khôi phục)`)) return
  await adminDelete(props.resource, row[props.idField]).catch(() => null)
  list.run()
  emit('saved')
}
async function restore(row) {
  await adminSave(props.resource, { [props.idField]: row[props.idField], is_active: true }).catch(() => null)
  list.run()
  emit('saved')
}

const imageList = (key) =>
  computed({
    get: () => (editing.value[key] ? [editing.value[key]] : []),
    set: (v) => (editing.value[key] = v[0] || ''),
  })
const imageModels = Object.fromEntries(
  props.fields.filter((f) => f.type === 'image').map((f) => [f.key, imageList(f.key)]),
)

defineExpose({ reload: () => list.run() })
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <h1 class="mr-auto font-serif text-3xl">{{ title }}</h1>
      <input v-model="q" class="input h-10 w-56" placeholder="Tìm…" />
      <label class="flex items-center gap-2 text-sm"
        ><input v-model="showInactive" type="checkbox" class="accent-ink" /> Hiện mục đã ẩn</label
      >
      <button class="btn-primary h-10 px-5" @click="create">
        <AppIcon name="plus" :size="16" /> Thêm {{ itemLabel }}
      </button>
    </div>

    <div class="overflow-x-auto border border-line bg-white">
      <table class="w-full min-w-[640px] text-sm">
        <thead class="bg-cream text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th v-for="c in columns" :key="c.key" class="px-4 py-3 font-medium">{{ c.label }}</th>
            <th class="w-28 px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-if="list.loading.value && !rows.length">
            <td :colspan="columns.length + 1" class="px-4 py-10 text-center text-muted">Đang tải…</td>
          </tr>
          <tr v-else-if="list.error.value">
            <td :colspan="columns.length + 1" class="px-4 py-10 text-center text-accent">
              {{ list.error.value }} <button class="underline" @click="list.run()">Thử lại</button>
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length + 1" class="px-4 py-10 text-center text-muted">Chưa có dữ liệu</td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row[idField]"
            class="hover:bg-cream/50"
            :class="{ 'opacity-50': row.is_active === false }"
          >
            <td v-for="c in columns" :key="c.key" class="px-4 py-3 align-middle">
              <slot :name="`cell-${c.key}`" :row="row">
                <img
                  v-if="c.type === 'image' && row[c.key]"
                  :src="resizeImage(row[c.key], 200)"
                  alt=""
                  class="h-14 w-12 bg-mist object-cover"
                  loading="lazy"
                />
                <span v-else-if="c.type === 'image'" class="block h-14 w-12 bg-mist" />
                <span v-else-if="c.type === 'bool'">{{ row[c.key] ? '✓' : '—' }}</span>
                <span v-else-if="c.type === 'money'">{{ row[c.key] ? formatPrice(row[c.key]) : '—' }}</span>
                <span v-else>{{ row[c.key] }}</span>
              </slot>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button class="p-1.5 hover:text-accent" aria-label="Sửa" @click="edit(row)">
                <AppIcon name="edit" :size="16" />
              </button>
              <button
                v-if="row.is_active !== false"
                class="p-1.5 hover:text-accent"
                aria-label="Ẩn"
                @click="remove(row)"
              >
                <AppIcon name="trash" :size="16" />
              </button>
              <button v-else class="p-1.5 text-xs underline" @click="restore(row)">Khôi phục</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal v-model:open="open" :title="(isNew ? 'Thêm ' : 'Sửa ') + itemLabel" wide>
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <div
          v-for="f in fields"
          :key="f.key"
          :class="{ 'sm:col-span-2': f.full || f.type === 'textarea' || f.type === 'image' }"
        >
          <label v-if="f.type === 'checkbox'" class="flex items-center gap-2 pt-6 text-sm">
            <input v-model="editing[f.key]" type="checkbox" class="h-4 w-4 accent-ink" /> {{ f.label }}
          </label>
          <template v-else>
            <label class="label">{{ f.label }}<span v-if="f.required"> *</span></label>
            <select v-if="f.type === 'select'" v-model="editing[f.key]" class="input">
              <option
                v-for="o in typeof f.options === 'function' ? f.options(editing) : f.options"
                :key="o.value"
                :value="o.value"
              >
                {{ o.label }}
              </option>
            </select>
            <textarea v-else-if="f.type === 'textarea'" v-model="editing[f.key]" rows="3" class="input" />
            <ImageUploader
              v-else-if="f.type === 'image'"
              v-model="imageModels[f.key].value"
              :multiple="false"
              :folder="uploadFolder"
              @busy="uploadingImages = $event"
            />
            <input
              v-else
              v-model="editing[f.key]"
              :type="f.type || 'text'"
              class="input"
              :placeholder="f.placeholder"
              :disabled="f.key === idField && !isNew"
            />
            <p v-if="f.help" class="mt-1 text-xs text-muted">{{ f.help }}</p>
          </template>
        </div>
        <div class="flex justify-end gap-3 pt-2 sm:col-span-2">
          <button type="button" class="btn-outline h-10 px-5" @click="open = false">Huỷ</button>
          <button class="btn-primary h-10 px-6" :disabled="saving || uploadingImages">
            {{ uploadingImages ? 'Đang tải ảnh…' : saving ? 'Đang lưu…' : 'Lưu' }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
