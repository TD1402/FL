<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminGet, adminSave } from '@/api/admin'
import { useSettingsStore } from '@/stores/settings'
import { toast } from '@/composables/useToast'
import { slugify } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import ImageUploader from '@/components/admin/ImageUploader.vue'

const props = defineProps({ id: String })
const router = useRouter()
const settings = useSettingsStore()

const empty = () => ({
  name: '',
  slug: '',
  sku: '',
  category_ids: [],
  collection: '',
  price: 0,
  sale_price: 0,
  images: [],
  short_desc: '',
  description: '',
  flowers: '',
  colors: '',
  tags: '',
  sizes: [],
  stock: 20,
  is_new: true,
  is_best_seller: false,
  is_active: true,
})
const form = ref(empty())
const loading = ref(!!props.id)
const saving = ref(false)
const uploadingImages = ref(false)
const loadError = ref('')
const preview = ref(false)

onMounted(async () => {
  settings.load()
  if (!props.id) return
  try {
    const p = await adminGet('products', props.id)
    form.value = {
      ...p,
      flowers: p.flowers.join(', '),
      colors: p.colors.join(', '),
      tags: p.tags.join(', '),
      sizes: p.sizes.map((s) => ({ ...s })),
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
})

const categoryGroups = computed(() => settings.categories.filter((c) => c.slug !== 'bo-suu-tap'))
const slugPreview = computed(() => form.value.slug || slugify(form.value.name))

function toggleCategory(id) {
  const list = form.value.category_ids
  form.value.category_ids = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
function addSize() {
  form.value.sizes.push({ name: '', price: form.value.sale_price || form.value.price || 0 })
}

async function save() {
  const f = form.value
  if (!f.name.trim()) return toast.error('Vui lòng nhập tên sản phẩm')
  if (!(Number(f.price) > 0) && !f.sizes.length) return toast.error('Vui lòng nhập giá')
  if (Number(f.sale_price) && Number(f.sale_price) >= Number(f.price))
    return toast.error('Giá sale phải nhỏ hơn giá gốc')
  if (f.sizes.some((s) => !s.name.trim() || !(Number(s.price) > 0)))
    return toast.error('Kích cỡ cần có tên và giá')
  if (!f.images.length) return toast.error('Vui lòng thêm ít nhất 1 ảnh')
  saving.value = true
  try {
    const item = {
      ...f,
      price: Number(f.price) || 0,
      sale_price: Number(f.sale_price) || 0,
      stock: Number(f.stock) || 0,
      sizes: f.sizes.map((s) => ({ name: s.name.trim(), price: Number(s.price) })),
    }
    delete item.final_price
    const saved = await adminSave('products', item)
    toast.success('Đã lưu sản phẩm')
    if (!props.id) router.replace(`/admin/san-pham/${saved.id}`)
    else form.value.slug = saved.slug
  } catch {
    /* toast */
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <RouterLink
      to="/admin/san-pham"
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      ><AppIcon name="chevron-left" :size="16" /> Sản phẩm</RouterLink
    >
    <h1 class="mb-6 font-serif text-3xl">{{ id ? 'Sửa sản phẩm' : 'Thêm sản phẩm' }}</h1>

    <div v-if="loading" class="skeleton h-96" />
    <p v-else-if="loadError" class="text-accent">{{ loadError }}</p>

    <form v-else class="grid gap-6 lg:grid-cols-[1fr_300px]" @submit.prevent="save">
      <div class="space-y-6">
        <section class="space-y-4 border border-line bg-white p-5">
          <div>
            <label class="label">Tên sản phẩm *</label>
            <input v-model="form.name" class="input" />
            <p class="mt-1 text-xs text-muted">URL: /san-pham/{{ slugPreview || '…' }}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label">Slug (tuỳ chọn)</label
              ><input v-model="form.slug" class="input" placeholder="tự tạo từ tên" />
            </div>
            <div>
              <label class="label">SKU</label
              ><input v-model="form.sku" class="input" placeholder="tự tạo nếu để trống" />
            </div>
          </div>
          <div>
            <label class="label">Mô tả ngắn</label
            ><textarea v-model="form.short_desc" rows="2" maxlength="300" class="input" />
          </div>
          <div>
            <div class="flex items-center justify-between">
              <label class="label">Mô tả chi tiết (HTML)</label>
              <button type="button" class="text-xs underline" @click="preview = !preview">
                {{ preview ? 'Sửa' : 'Xem trước' }}
              </button>
            </div>
            <div
              v-if="preview"
              class="prose-shop min-h-40 border border-line p-4 text-sm"
              v-html="form.description"
            />
            <textarea
              v-else
              v-model="form.description"
              rows="8"
              class="input font-mono text-xs"
              placeholder="<p>…</p>"
            />
          </div>
        </section>

        <section class="border border-line bg-white p-5">
          <p class="label mb-3">Hình ảnh * (ảnh đầu tiên là ảnh chính, ảnh thứ 2 hiện khi hover)</p>
          <ImageUploader
            v-model="form.images"
            :folder="slugPreview"
            :product-id="id || ''"
            :locked-reason="
              slugPreview
                ? ''
                : 'Nhập tên sản phẩm trước khi tải ảnh — ảnh được lưu vào thư mục Drive theo tên sản phẩm.'
            "
            @busy="uploadingImages = $event"
          />
        </section>

        <section class="space-y-4 border border-line bg-white p-5">
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label">Giá gốc (₫) *</label
              ><input v-model.number="form.price" type="number" min="0" step="1000" class="input" />
            </div>
            <div>
              <label class="label">Giá sale (₫)</label
              ><input v-model.number="form.sale_price" type="number" min="0" step="1000" class="input" />
            </div>
            <div>
              <label class="label">Tồn kho</label
              ><input v-model.number="form.stock" type="number" min="0" class="input" />
            </div>
          </div>
          <div>
            <div class="mb-2 flex items-center justify-between">
              <p class="label mb-0">Kích cỡ (giá theo size — ghi đè giá gốc/sale)</p>
              <button type="button" class="text-xs underline" @click="addSize">+ Thêm size</button>
            </div>
            <div v-for="(s, i) in form.sizes" :key="i" class="mb-2 flex gap-2">
              <input v-model="s.name" class="input h-10" placeholder="Tên (VD: Nhỏ)" />
              <input
                v-model.number="s.price"
                type="number"
                min="0"
                step="1000"
                class="input h-10"
                placeholder="Giá"
              />
              <button
                type="button"
                class="px-2 text-muted hover:text-accent"
                aria-label="Xoá size"
                @click="form.sizes.splice(i, 1)"
              >
                <AppIcon name="trash" :size="16" />
              </button>
            </div>
          </div>
        </section>

        <section class="grid gap-4 border border-line bg-white p-5 sm:grid-cols-3">
          <div>
            <label class="label">Thành phần hoa</label
            ><input v-model="form.flowers" class="input" placeholder="Hoa hồng, Baby" />
          </div>
          <div>
            <label class="label">Màu chủ đạo</label
            ><input v-model="form.colors" class="input" placeholder="Hồng, Trắng" />
          </div>
          <div>
            <label class="label">Tags</label
            ><input v-model="form.tags" class="input" placeholder="pastel, sang trọng" />
          </div>
          <p class="text-xs text-muted sm:col-span-3">
            Phân cách bằng dấu phẩy. Thành phần & màu dùng cho bộ lọc; tags dùng cho tìm kiếm.
          </p>
        </section>
      </div>

      <div class="space-y-6">
        <section class="space-y-3 border border-line bg-white p-5 text-sm">
          <label class="flex items-center gap-2"
            ><input v-model="form.is_active" type="checkbox" class="h-4 w-4 accent-ink" /> Đang bán</label
          >
          <label class="flex items-center gap-2"
            ><input v-model="form.is_new" type="checkbox" class="h-4 w-4 accent-ink" /> Hoa mới</label
          >
          <label class="flex items-center gap-2"
            ><input v-model="form.is_best_seller" type="checkbox" class="h-4 w-4 accent-ink" /> Bán
            chạy</label
          >
          <button class="btn-primary mt-2 w-full" :disabled="saving || uploadingImages">
            {{ uploadingImages ? 'Đang tải ảnh…' : saving ? 'Đang lưu…' : 'Lưu sản phẩm' }}
          </button>
          <a
            v-if="id && form.slug"
            :href="`/san-pham/${form.slug}`"
            target="_blank"
            class="block text-center text-xs underline"
            >Xem trên cửa hàng</a
          >
        </section>

        <section class="border border-line bg-white p-5">
          <p class="label mb-3">Danh mục</p>
          <div v-for="g in categoryGroups" :key="g.id" class="mb-4">
            <p class="mb-1.5 text-xs font-medium">{{ g.name }}</p>
            <label v-for="c in g.children" :key="c.id" class="flex items-center gap-2 py-0.5 text-sm">
              <input
                type="checkbox"
                class="accent-ink"
                :checked="form.category_ids.includes(c.id)"
                @change="toggleCategory(c.id)"
              />
              {{ c.name }}
            </label>
          </div>
          <label class="label mt-2">Bộ sưu tập</label>
          <select v-model="form.collection" class="input h-10">
            <option value="">— Không —</option>
            <option v-for="c in settings.collections" :key="c.id" :value="c.slug">{{ c.name }}</option>
          </select>
        </section>
      </div>
    </form>
  </div>
</template>
