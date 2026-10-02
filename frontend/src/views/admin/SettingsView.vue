<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminChangePassword, adminList, adminSave, migrateImages, reorganizeImages } from '@/api/admin'
import ImageUploader from '@/components/admin/ImageUploader.vue'
import { useSettingsStore } from '@/stores/settings'
import { toast } from '@/composables/useToast'

const store = useSettingsStore()
const GROUPS = [
  {
    title: 'Thông tin cửa hàng',
    fields: [
      ['shop_name', 'Tên shop'],
      ['company_name', 'Tên công ty'],
      ['hotline', 'Hotline'],
      ['zalo', 'Số Zalo'],
      ['email', 'Email'],
      ['open_hours', 'Giờ mở cửa'],
      ['address', 'Địa chỉ', true],
    ],
  },
  {
    title: 'Giao hàng & thông báo',
    fields: [
      ['shipping_fee_default', 'Phí giao mặc định (₫)'],
      ['free_ship_from', 'Miễn phí giao từ (₫)'],
      ['top_bar_message', 'Thông báo top bar (nhiều câu cách nhau bằng |)', true],
      ['first_order_coupon', 'Mã ưu đãi gửi khi đăng ký nhận tin'],
      ['notify_email', 'Email nhận thông báo đơn mới (không công khai)'],
    ],
  },
  {
    title: 'Chuyển khoản (VietQR)',
    fields: [
      ['bank_id', 'Mã ngân hàng VietQR (VCB, TCB, MB, ACB…)'],
      ['bank_name', 'Tên ngân hàng'],
      ['bank_account_no', 'Số tài khoản'],
      ['bank_account_name', 'Chủ tài khoản (không dấu)'],
    ],
  },
  {
    title: 'Mạng xã hội',
    fields: [
      ['facebook', 'Facebook URL'],
      ['instagram', 'Instagram URL'],
      ['tiktok', 'TikTok URL'],
    ],
  },
  {
    title: 'SEO',
    fields: [
      ['seo_title', 'Tiêu đề mặc định', true],
      ['seo_description', 'Mô tả mặc định', true],
      ['og_image', 'Ảnh chia sẻ mặc định (Facebook/Zalo, 1200×630)', true],
      ['about_image', 'Ảnh trang Giới thiệu', true],
    ],
  },
]

const form = reactive({})
const loading = ref(true)
const saving = ref(false)
const pw = reactive({ old: '', new1: '', new2: '' })
const subscribers = ref([])

onMounted(async () => {
  try {
    const [s, subs] = await Promise.all([adminList('settings'), adminList('subscribers', { limit: 500 })])
    Object.assign(form, s.items[0] || {})
    subscribers.value = subs.items
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  try {
    await adminSave('settings', { ...form })
    await store.load(true)
    toast.success('Đã lưu cài đặt')
  } catch {
    /* toast */
  } finally {
    saving.value = false
  }
}

/** Các cài đặt là ảnh → chọn/upload qua Google Drive (thư mục trang/) */
const IMAGE_KEYS = ['og_image', 'about_image']
const imageModel = (key) =>
  computed({
    get: () => (form[key] ? [form[key]] : []),
    set: (v) => (form[key] = v[0] || ''),
  })
const imageModels = Object.fromEntries(IMAGE_KEYS.map((k) => [k, imageModel(k)]))
const uploadingImages = ref(false)

const migrating = ref(false)
const migrateResult = ref(null)
const organizing = ref(false)
const organizeResult = ref(null)
async function runOrganize() {
  organizing.value = true
  organizeResult.value = null
  try {
    organizeResult.value = await reorganizeImages()
    toast.success('Đã sắp xếp lại ảnh trên Drive')
  } catch {
    /* toast */
  } finally {
    organizing.value = false
  }
}

async function runMigrate() {
  if (
    !confirm(
      'Chuyển mọi ảnh chưa nằm trên Google Drive (banner, danh mục, sản phẩm, cài đặt, đơn hàng) vào thư mục ảnh của shop và cập nhật Sheet?',
    )
  )
    return
  migrating.value = true
  migrateResult.value = null
  try {
    migrateResult.value = await migrateImages()
    const s = await adminList('settings')
    Object.assign(form, s.items[0] || {})
    await store.load(true)
    toast.success(
      migrateResult.value.done
        ? 'Đã chuyển xong ảnh vào Drive'
        : 'Đã chuyển một phần — bấm chạy lại để tiếp tục',
    )
  } catch {
    /* toast */
  } finally {
    migrating.value = false
  }
}

async function changePassword() {
  if (pw.new1.length < 8) return toast.error('Mật khẩu mới tối thiểu 8 ký tự')
  if (pw.new1 !== pw.new2) return toast.error('Mật khẩu nhập lại không khớp')
  try {
    await adminChangePassword(pw.old, pw.new1)
    toast.success('Đã đổi mật khẩu')
    Object.assign(pw, { old: '', new1: '', new2: '' })
  } catch {
    /* toast */
  }
}

function exportSubscribers() {
  const csv = 'email,created_at\n' + subscribers.value.map((s) => `${s.email},${s.created_at}`).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'subscribers.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="max-w-4xl">
    <h1 class="mb-6 font-serif text-3xl">Cài đặt</h1>
    <div v-if="loading" class="skeleton h-96" />
    <template v-else>
      <form class="space-y-6" @submit.prevent="save">
        <section v-for="g in GROUPS" :key="g.title" class="border border-line bg-white p-5">
          <p class="caps mb-4 font-medium">{{ g.title }}</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="[key, label, full] in g.fields" :key="key" :class="{ 'sm:col-span-2': full }">
              <label class="label" :for="key">{{ label }}</label>
              <ImageUploader
                v-if="IMAGE_KEYS.includes(key)"
                v-model="imageModels[key].value"
                :multiple="false"
                folder="trang"
                @busy="uploadingImages = $event"
              />
              <textarea v-else-if="full" :id="key" v-model="form[key]" rows="2" class="input" />
              <input v-else :id="key" v-model="form[key]" class="input" />
            </div>
          </div>
        </section>
        <div class="sticky bottom-4 flex justify-end">
          <button class="btn-primary shadow-lg" :disabled="saving || uploadingImages">
            {{ uploadingImages ? 'Đang tải ảnh…' : saving ? 'Đang lưu…' : 'Lưu cài đặt' }}
          </button>
        </div>
      </form>

      <div class="mt-10 grid gap-6 md:grid-cols-2">
        <form class="space-y-3 border border-line bg-white p-5" @submit.prevent="changePassword">
          <p class="caps mb-2 font-medium">Đổi mật khẩu</p>
          <input
            v-model="pw.old"
            type="password"
            class="input"
            placeholder="Mật khẩu hiện tại"
            autocomplete="current-password"
          />
          <input
            v-model="pw.new1"
            type="password"
            class="input"
            placeholder="Mật khẩu mới (≥ 8 ký tự)"
            autocomplete="new-password"
          />
          <input
            v-model="pw.new2"
            type="password"
            class="input"
            placeholder="Nhập lại mật khẩu mới"
            autocomplete="new-password"
          />
          <button class="btn-outline h-10 px-5">Đổi mật khẩu</button>
        </form>
        <section class="border border-line bg-white p-5 md:col-span-2">
          <p class="caps mb-2 font-medium">Ảnh trên Google Drive</p>
          <p class="text-sm text-muted">
            Mọi ảnh của shop được lưu trong thư mục Google Drive (sản phẩm theo thư mục slug, banner/,
            danh-muc/, trang/). Ảnh dán từ web sẽ tự được tải vào Drive. Bấm nút dưới để chuyển các ảnh cũ
            chưa nằm trên Drive và cập nhật Sheet.
          </p>
          <button class="btn-outline mr-2 mt-4 h-10 px-5" :disabled="organizing" @click="runOrganize">
            {{ organizing ? 'Đang sắp xếp…' : 'Sắp xếp ảnh vào thư mục sản phẩm' }}
          </button>
          <button class="btn-outline mt-4 h-10 px-5" :disabled="migrating" @click="runMigrate">
            {{ migrating ? 'Đang chuyển ảnh… (có thể mất vài phút)' : 'Chuyển tất cả ảnh vào Drive' }}
          </button>
          <p v-if="organizeResult" class="mt-3 text-sm">
            Đã chuyển <b>{{ organizeResult.moved }}</b> ảnh và {{ organizeResult.foldersMoved }} thư mục về
            đúng chỗ.
            <span v-for="e in organizeResult.errors" :key="e" class="mt-1 block text-xs text-accent">{{
              e
            }}</span>
          </p>
          <p v-if="migrateResult" class="mt-3 text-sm">
            Đã tải vào Drive <b>{{ migrateResult.imported }}</b> ảnh · chuẩn hoá
            {{ migrateResult.normalized }} link · cập nhật {{ migrateResult.rowsUpdated }} dòng
            <span v-if="!migrateResult.done" class="text-accent"> — chưa xong, hãy bấm chạy lại.</span>
            <span v-for="e in migrateResult.errors" :key="e" class="mt-1 block text-xs text-accent">{{
              e
            }}</span>
          </p>
        </section>
        <section class="border border-line bg-white p-5">
          <p class="caps mb-2 font-medium">Email đăng ký nhận tin</p>
          <p class="text-3xl">{{ subscribers.length }}</p>
          <button
            class="btn-outline mt-4 h-10 px-5"
            :disabled="!subscribers.length"
            @click="exportSubscribers"
          >
            Xuất CSV
          </button>
        </section>
      </div>
    </template>
  </div>
</template>
