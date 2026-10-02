<script setup>
import { ref, watch } from 'vue'
import { adminDelete, adminList, adminSave } from '@/api/admin'
import { useDebouncedRef } from '@/composables/useDebounce'
import { formatPrice } from '@/utils/format'
import { comparePrice, fromPrice, resizeImage } from '@/utils/product'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppPagination from '@/components/ui/AppPagination.vue'

const q = ref('')
const debouncedQ = useDebouncedRef(q, 350)
const active = ref('true')
const page = ref(1)
const items = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const LIMIT = 20

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminList('products', {
      filters: { q: debouncedQ.value, is_active: active.value },
      page: page.value,
      limit: LIMIT,
    })
    items.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
watch([debouncedQ, active], () => (page.value === 1 ? load() : (page.value = 1)))
watch(page, load, { immediate: true })

async function remove(p) {
  if (!confirm(`Ngừng bán "${p.name}"?`)) return
  await adminDelete('products', p.id).catch(() => null)
  load()
}
async function restore(p) {
  await adminSave('products', { id: p.id, is_active: true }).catch(() => null)
  load()
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <h1 class="mr-auto font-serif text-3xl">
        Sản phẩm <span class="text-lg text-muted">({{ total }})</span>
      </h1>
      <input v-model="q" class="input h-10 w-60" placeholder="Tìm tên, SKU, loại hoa…" />
      <select v-model="active" class="input h-10 w-40">
        <option value="true">Đang bán</option>
        <option value="false">Ngừng bán</option>
        <option value="">Tất cả</option>
      </select>
      <RouterLink to="/admin/san-pham/moi" class="btn-primary h-10 px-5"
        ><AppIcon name="plus" :size="16" /> Thêm sản phẩm</RouterLink
      >
    </div>

    <div class="overflow-x-auto border border-line bg-white">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-cream text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">Sản phẩm</th>
            <th class="px-4 py-3 font-medium">Giá</th>
            <th class="px-4 py-3 font-medium">Tồn kho</th>
            <th class="px-4 py-3 font-medium">Nhãn</th>
            <th class="w-28 px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-if="loading && !items.length">
            <td colspan="5" class="px-4 py-10 text-center text-muted">Đang tải…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="5" class="px-4 py-10 text-center text-accent">
              {{ error }} <button class="underline" @click="load">Thử lại</button>
            </td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="5" class="px-4 py-10 text-center text-muted">Không có sản phẩm</td>
          </tr>
          <tr
            v-for="p in items"
            :key="p.id"
            class="hover:bg-cream/50"
            :class="{ 'opacity-50': !p.is_active }"
          >
            <td class="px-4 py-3">
              <RouterLink :to="`/admin/san-pham/${p.id}`" class="flex items-center gap-3 hover:text-accent">
                <img
                  :src="resizeImage(p.images[0], 200)"
                  alt=""
                  class="h-14 w-11 shrink-0 bg-mist object-cover"
                  loading="lazy"
                />
                <span>
                  <span class="block">{{ p.name }}</span>
                  <span class="text-xs text-muted">{{ p.sku }}</span>
                </span>
              </RouterLink>
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              {{ formatPrice(fromPrice(p)) }}
              <span v-if="comparePrice(p)" class="block text-xs text-muted line-through">{{
                formatPrice(comparePrice(p))
              }}</span>
              <span v-if="p.sizes.length" class="block text-xs text-muted">{{ p.sizes.length }} kích cỡ</span>
            </td>
            <td class="px-4 py-3" :class="{ 'font-medium text-accent': p.stock <= 5 }">{{ p.stock }}</td>
            <td class="px-4 py-3 text-xs">
              <span v-if="p.is_new" class="mr-1 bg-mist px-1.5 py-0.5">Mới</span>
              <span v-if="p.is_best_seller" class="bg-mist px-1.5 py-0.5">Bán chạy</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <a
                :href="`/san-pham/${p.slug}`"
                target="_blank"
                class="inline-block p-1.5 hover:text-accent"
                aria-label="Xem"
                ><AppIcon name="eye" :size="16"
              /></a>
              <RouterLink
                :to="`/admin/san-pham/${p.id}`"
                class="inline-block p-1.5 hover:text-accent"
                aria-label="Sửa"
                ><AppIcon name="edit" :size="16"
              /></RouterLink>
              <button
                v-if="p.is_active"
                class="p-1.5 hover:text-accent"
                aria-label="Ngừng bán"
                @click="remove(p)"
              >
                <AppIcon name="trash" :size="16" />
              </button>
              <button v-else class="p-1.5 text-xs underline" @click="restore(p)">Bán lại</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppPagination v-model="page" :total="total" :limit="LIMIT" class="mt-6" />
  </div>
</template>
