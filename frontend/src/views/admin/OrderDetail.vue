<script setup>
import { resizeImage } from '@/utils/product'
import { computed, onMounted, ref } from 'vue'
import { adminGet, updateOrderStatus } from '@/api/admin'
import { useSettingsStore } from '@/stores/settings'
import { toast } from '@/composables/useToast'
import { formatDate, formatDateTime, formatPrice } from '@/utils/format'
import { ORDER_STATUS, PAYMENT_STATUS } from '@/components/admin/constants'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({ id: { type: String, required: true } })
const settings = useSettingsStore()
const order = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    order.value = await adminGet('orders', props.id)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  settings.load()
  load()
})

async function update(patch) {
  if (patch.status === 'cancelled' && !confirm('Huỷ đơn này? Tồn kho sẽ được hoàn lại.')) return
  saving.value = true
  try {
    order.value = await updateOrderStatus(order.value.id, patch)
    toast.success('Đã cập nhật đơn hàng')
  } catch {
    /* toast */
  } finally {
    saving.value = false
  }
}
const fullAddress = computed(() =>
  order.value ? [order.value.address, order.value.district, order.value.city].filter(Boolean).join(', ') : '',
)
const print = () => window.print()
</script>

<template>
  <div class="max-w-5xl">
    <RouterLink
      to="/admin/don-hang"
      class="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      ><AppIcon name="chevron-left" :size="16" /> Đơn hàng</RouterLink
    >
    <div v-if="loading" class="skeleton h-96" />
    <p v-else-if="error" class="text-accent">{{ error }}</p>

    <template v-else-if="order">
      <div class="no-print mb-6 flex flex-wrap items-center gap-3">
        <h1 class="mr-auto font-serif text-3xl">
          Đơn <span class="font-mono text-2xl">{{ order.order_code }}</span>
        </h1>
        <StatusBadge :value="order.status" />
        <StatusBadge :value="order.payment_status" kind="payment" />
        <button class="btn-outline h-10 px-4" @click="print">
          <AppIcon name="print" :size="16" /> In phiếu giao
        </button>
      </div>

      <div class="no-print mb-6 grid gap-4 border border-line bg-white p-5 sm:grid-cols-2">
        <label class="text-sm">
          <span class="label">Trạng thái đơn</span>
          <select
            :value="order.status"
            class="input h-10"
            :disabled="saving"
            @change="update({ status: $event.target.value })"
          >
            <option v-for="(s, key) in ORDER_STATUS" :key="key" :value="key">{{ s.label }}</option>
          </select>
        </label>
        <label class="text-sm">
          <span class="label"
            >Thanh toán ({{ order.payment_method === 'BANK' ? 'Chuyển khoản' : 'COD' }})</span
          >
          <select
            :value="order.payment_status"
            class="input h-10"
            :disabled="saving"
            @change="update({ payment_status: $event.target.value })"
          >
            <option v-for="(s, key) in PAYMENT_STATUS" :key="key" :value="key">{{ s.label }}</option>
          </select>
        </label>
      </div>

      <!-- Phần in phiếu giao hàng -->
      <article class="border border-line bg-white p-6 print:border-0 print:p-0">
        <header class="mb-6 hidden items-start justify-between border-b border-ink pb-4 print:flex">
          <div>
            <p class="font-serif text-2xl uppercase tracking-[0.2em]">{{ settings.shopName }}</p>
            <p class="text-xs">{{ settings.data.address }} · {{ settings.data.hotline }}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-semibold">PHIẾU GIAO HÀNG</p>
            <p class="font-mono">{{ order.order_code }}</p>
          </div>
        </header>

        <div class="grid gap-6 text-sm md:grid-cols-3 print:grid-cols-3">
          <div>
            <p class="label">Người đặt</p>
            <p>{{ order.customer_name }}</p>
            <p>{{ order.customer_phone }}</p>
            <p v-if="order.customer_email" class="text-muted">{{ order.customer_email }}</p>
            <p class="mt-2 text-xs text-muted">Đặt lúc {{ formatDateTime(order.created_at) }}</p>
          </div>
          <div>
            <p class="label">Người nhận</p>
            <p class="font-medium">{{ order.receiver_name }} · {{ order.receiver_phone }}</p>
            <p>{{ fullAddress }}</p>
          </div>
          <div>
            <p class="label">Thời gian giao</p>
            <p class="text-base font-medium">{{ formatDate(order.delivery_date) }}</p>
            <p>{{ order.delivery_time_slot }}</p>
          </div>
        </div>

        <table class="mt-8 w-full text-sm">
          <thead class="border-b border-line text-left text-xs uppercase text-muted">
            <tr>
              <th class="py-2">Sản phẩm</th>
              <th class="py-2">Size</th>
              <th class="py-2 text-right">SL</th>
              <th class="py-2 text-right">Đơn giá</th>
              <th class="py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="it in order.items" :key="it.product_id + it.size">
              <td class="py-3">
                <div class="flex items-center gap-3">
                  <img
                    :src="resizeImage(it.image, 200)"
                    alt=""
                    class="h-12 w-10 bg-mist object-cover print:hidden"
                  />
                  <span
                    >{{ it.name }} <span class="block text-xs text-muted">{{ it.sku }}</span></span
                  >
                </div>
              </td>
              <td class="py-3">{{ it.size || '—' }}</td>
              <td class="py-3 text-right">{{ it.qty }}</td>
              <td class="py-3 text-right">{{ formatPrice(it.price) }}</td>
              <td class="py-3 text-right">{{ formatPrice(it.line_total) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 grid gap-6 md:grid-cols-2 print:grid-cols-2">
          <div class="space-y-3 text-sm">
            <div v-if="order.card_message" class="border border-dashed border-ink/40 p-4">
              <p class="label">Lời nhắn thiệp</p>
              <p class="whitespace-pre-line font-serif text-lg italic">{{ order.card_message }}</p>
            </div>
            <div v-if="order.note">
              <p class="label">Ghi chú</p>
              <p class="whitespace-pre-line">{{ order.note }}</p>
            </div>
          </div>
          <dl class="space-y-1.5 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">Tạm tính</dt>
              <dd>{{ formatPrice(order.subtotal) }}</dd>
            </div>
            <div v-if="order.discount" class="flex justify-between">
              <dt class="text-muted">Giảm giá ({{ order.coupon_code }})</dt>
              <dd>-{{ formatPrice(order.discount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Phí giao</dt>
              <dd>{{ formatPrice(order.shipping_fee) }}</dd>
            </div>
            <div class="flex justify-between border-t border-ink pt-2 text-base font-semibold">
              <dt>Tổng cộng</dt>
              <dd>{{ formatPrice(order.total) }}</dd>
            </div>
            <div class="flex justify-between pt-1">
              <dt class="text-muted">Thu hộ (COD)</dt>
              <dd class="font-semibold">
                {{
                  order.payment_method === 'COD' && order.payment_status !== 'paid'
                    ? formatPrice(order.total)
                    : '0₫'
                }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-10 hidden grid-cols-2 text-center text-xs print:grid">
          <p>Người giao<br /><br /><br />(Ký, ghi rõ họ tên)</p>
          <p>Người nhận<br /><br /><br />(Ký, ghi rõ họ tên)</p>
        </div>
      </article>
    </template>
  </div>
</template>
