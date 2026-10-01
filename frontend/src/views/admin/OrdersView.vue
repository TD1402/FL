<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminList, updateOrderStatus } from '@/api/admin'
import { useDebouncedRef } from '@/composables/useDebounce'
import { toast } from '@/composables/useToast'
import { formatDate, formatDateTime, formatPrice } from '@/utils/format'
import { ORDER_STATUS } from '@/components/admin/constants'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'

const route = useRoute()
const router = useRouter()
const LIMIT = 20

const filters = reactive({
  status: String(route.query.status || ''),
  date_from: '',
  date_to: '',
  delivery_date: '',
})
const q = ref('')
const debouncedQ = useDebouncedRef(q, 350)
const page = ref(1)
const items = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminList('orders', {
      filters: { ...filters, q: debouncedQ.value },
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
watch([() => ({ ...filters }), debouncedQ], () => {
  router.replace({ query: { status: filters.status || undefined } })
  page.value === 1 ? load() : (page.value = 1)
})
watch(page, load, { immediate: true })

async function changeStatus(o, status) {
  if (status === 'cancelled' && !confirm(`Huỷ đơn ${o.order_code}? Tồn kho sẽ được hoàn lại.`)) return load()
  try {
    const updated = await updateOrderStatus(o.id, { status })
    Object.assign(o, updated)
    toast.success(`Đơn ${o.order_code}: ${ORDER_STATUS[status].label}`)
  } catch {
    load()
  }
}
function resetFilters() {
  Object.assign(filters, { status: '', date_from: '', date_to: '', delivery_date: '' })
  q.value = ''
}
</script>

<template>
  <div>
    <h1 class="mb-6 font-serif text-3xl">
      Đơn hàng <span class="text-lg text-muted">({{ total }})</span>
    </h1>

    <div class="mb-4 flex flex-wrap gap-2">
      <button
        class="h-9 border px-3 text-xs"
        :class="!filters.status ? 'border-ink bg-ink text-white' : 'border-line bg-white'"
        @click="filters.status = ''"
      >
        Tất cả
      </button>
      <button
        v-for="(s, key) in ORDER_STATUS"
        :key="key"
        class="h-9 border px-3 text-xs"
        :class="filters.status === key ? 'border-ink bg-ink text-white' : 'border-line bg-white'"
        @click="filters.status = key"
      >
        {{ s.label }}
      </button>
    </div>
    <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input v-model="q" class="input h-10 lg:col-span-2" placeholder="Mã đơn, tên, SĐT…" />
      <label class="text-xs text-muted"
        >Đặt từ<input v-model="filters.date_from" type="date" class="input h-10"
      /></label>
      <label class="text-xs text-muted"
        >Đến<input v-model="filters.date_to" type="date" class="input h-10"
      /></label>
      <label class="text-xs text-muted"
        >Ngày giao<input v-model="filters.delivery_date" type="date" class="input h-10"
      /></label>
    </div>

    <div class="overflow-x-auto border border-line bg-white">
      <table class="w-full min-w-[900px] text-sm">
        <thead class="bg-cream text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">Mã đơn</th>
            <th class="px-4 py-3 font-medium">Khách hàng</th>
            <th class="px-4 py-3 font-medium">Giao</th>
            <th class="px-4 py-3 font-medium">Tổng</th>
            <th class="px-4 py-3 font-medium">Thanh toán</th>
            <th class="px-4 py-3 font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-if="loading && !items.length">
            <td colspan="6" class="px-4 py-10 text-center text-muted">Đang tải…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="6" class="px-4 py-10 text-center text-accent">
              {{ error }} <button class="underline" @click="load">Thử lại</button>
            </td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="6" class="px-4 py-10 text-center text-muted">
              Không có đơn hàng. <button class="underline" @click="resetFilters">Xoá bộ lọc</button>
            </td>
          </tr>
          <tr v-for="o in items" :key="o.id" class="hover:bg-cream/50">
            <td class="px-4 py-3">
              <RouterLink :to="`/admin/don-hang/${o.id}`" class="font-mono text-xs hover:text-accent">{{
                o.order_code
              }}</RouterLink>
              <span class="block text-xs text-muted">{{ formatDateTime(o.created_at) }}</span>
            </td>
            <td class="px-4 py-3">
              {{ o.customer_name }}<span class="block text-xs text-muted">{{ o.customer_phone }}</span>
            </td>
            <td class="px-4 py-3 text-xs">
              {{ formatDate(o.delivery_date)
              }}<span class="block text-muted">{{ o.delivery_time_slot }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 font-medium">{{ formatPrice(o.total) }}</td>
            <td class="px-4 py-3 text-xs">
              {{ o.payment_method }}
              <StatusBadge :value="o.payment_status" kind="payment" class="mt-1 block w-fit" />
            </td>
            <td class="px-4 py-3">
              <select
                :value="o.status"
                class="h-8 border border-line bg-white px-2 text-xs"
                @change="changeStatus(o, $event.target.value)"
              >
                <option v-for="(s, key) in ORDER_STATUS" :key="key" :value="key">{{ s.label }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppPagination v-model="page" :total="total" :limit="LIMIT" class="mt-6" />
  </div>
</template>
