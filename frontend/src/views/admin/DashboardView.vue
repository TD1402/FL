<script setup>
import { getDashboard } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { formatDateTime, formatPrice } from '@/utils/format'
import { ORDER_STATUS } from '@/components/admin/constants'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import RevenueChart from '@/components/admin/RevenueChart.vue'

const { data, loading, error, run } = useAsync(getDashboard, { immediate: true })
</script>

<template>
  <div>
    <h1 class="mb-6 font-serif text-3xl">Tổng quan</h1>
    <p v-if="error" class="text-accent">
      {{ error }} <button class="underline" @click="run()">Thử lại</button>
    </p>
    <div v-else-if="loading && !data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="skeleton h-28" />
    </div>
    <template v-else-if="data">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="border border-line bg-white p-5">
          <p class="label">Doanh thu hôm nay</p>
          <p class="mt-2 text-2xl font-medium">{{ formatPrice(data.revenueToday) }}</p>
          <p class="mt-1 text-xs text-muted">{{ data.ordersToday }} đơn</p>
        </div>
        <div class="border border-line bg-white p-5">
          <p class="label">Doanh thu tháng này</p>
          <p class="mt-2 text-2xl font-medium">{{ formatPrice(data.revenueMonth) }}</p>
          <p class="mt-1 text-xs text-muted">{{ data.ordersMonth }} đơn</p>
        </div>
        <RouterLink
          :to="{ path: '/admin/don-hang', query: { status: 'new' } }"
          class="border border-line bg-white p-5 hover:border-ink"
        >
          <p class="label">Đơn mới cần xử lý</p>
          <p class="mt-2 text-2xl font-medium">{{ data.byStatus.new || 0 }}</p>
          <p class="mt-1 text-xs text-muted">
            {{ data.byStatus.confirmed || 0 }} đã xác nhận · {{ data.byStatus.delivering || 0 }} đang giao
          </p>
        </RouterLink>
        <RouterLink to="/admin/lien-he" class="border border-line bg-white p-5 hover:border-ink">
          <p class="label">Liên hệ mới / Sắp hết hàng</p>
          <p class="mt-2 text-2xl font-medium">
            {{ data.newContacts }} <span class="text-muted">/</span> {{ data.lowStock }}
          </p>
          <p class="mt-1 text-xs text-muted">sản phẩm tồn ≤ 5</p>
        </RouterLink>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section class="border border-line bg-white p-5">
          <p class="label mb-8">Doanh thu 14 ngày gần nhất</p>
          <RevenueChart :data="data.revenueByDay" />
        </section>
        <section class="border border-line bg-white p-5">
          <p class="label mb-4">Đơn theo trạng thái</p>
          <ul class="space-y-3 text-sm">
            <li v-for="(meta, key) in ORDER_STATUS" :key="key" class="flex items-center justify-between">
              <StatusBadge :value="key" />
              <span class="font-medium">{{ data.byStatus[key] || 0 }}</span>
            </li>
          </ul>
        </section>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <section class="border border-line bg-white p-5">
          <p class="label mb-4">Top sản phẩm bán chạy</p>
          <p v-if="!data.topProducts.length" class="text-sm text-muted">Chưa có dữ liệu</p>
          <ol class="space-y-3">
            <li
              v-for="(p, i) in data.topProducts"
              :key="p.product_id"
              class="flex items-center gap-3 text-sm"
            >
              <span class="w-4 text-muted">{{ i + 1 }}</span>
              <img :src="p.image" alt="" class="h-12 w-10 bg-mist object-cover" />
              <span class="flex-1 truncate">{{ p.name }}</span>
              <span class="text-muted">{{ p.qty }} sp</span>
              <span class="w-28 text-right font-medium">{{ formatPrice(p.revenue) }}</span>
            </li>
          </ol>
        </section>
        <section class="border border-line bg-white p-5">
          <div class="mb-4 flex items-center justify-between">
            <p class="label mb-0">Đơn hàng gần đây</p>
            <RouterLink to="/admin/don-hang" class="text-xs underline">Xem tất cả</RouterLink>
          </div>
          <ul class="divide-y divide-line text-sm">
            <li v-for="o in data.recentOrders" :key="o.id">
              <RouterLink
                :to="`/admin/don-hang/${o.id}`"
                class="flex items-center gap-3 py-2.5 hover:text-accent"
              >
                <span class="font-mono text-xs">{{ o.order_code }}</span>
                <span class="flex-1 truncate">{{ o.customer_name }}</span>
                <span class="hidden text-xs text-muted sm:inline">{{ formatDateTime(o.created_at) }}</span>
                <StatusBadge :value="o.status" />
                <span class="w-24 text-right">{{ formatPrice(o.total) }}</span>
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
