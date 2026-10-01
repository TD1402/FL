<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { checkCoupon, createOrder } from '@/api/shop'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { useSeo } from '@/composables/useSeo'
import { toast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'
import { isEmail, isPhone } from '@/utils/validate'
import StateBlock from '@/components/ui/StateBlock.vue'
import DeliveryPicker from '@/components/shop/DeliveryPicker.vue'
import OrderSummary from '@/components/shop/OrderSummary.vue'

useSeo(() => ({ title: 'Thanh toán', noindex: true }))
const cart = useCartStore()
const settings = useSettingsStore()
const router = useRouter()

const SAVED_KEY = 'checkout_customer'
const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Bình Dương', 'Đồng Nai']

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}')
  } catch {
    return {}
  }
}
const saved = loadSaved()

const form = reactive({
  customer_name: saved.customer_name || '',
  customer_phone: saved.customer_phone || '',
  customer_email: saved.customer_email || '',
  receiver_same: true,
  receiver_name: '',
  receiver_phone: '',
  address: saved.address || '',
  district: saved.district || '',
  city: saved.city || CITIES[0],
  delivery_date: cart.delivery.date || '',
  delivery_time_slot: cart.delivery.slot || '',
  card_message: cart.delivery.card_message || '',
  note: '',
  payment_method: 'COD',
  website: '', // honeypot
})
const errors = reactive({})
const submitting = ref(false)
const placed = ref(false) // đã đặt xong: tránh chớp trạng thái "giỏ trống" khi chuyển trang

// ---- Mã giảm giá ----
const couponInput = ref(cart.coupon || '')
const coupon = ref(null) // { code, discount }
const couponError = ref('')
const couponLoading = ref(false)

async function applyCoupon(code = couponInput.value, silentFail = false) {
  const c = String(code || '').trim()
  couponError.value = ''
  if (!c) return
  couponLoading.value = true
  try {
    coupon.value = await checkCoupon(c, cart.subtotal)
    cart.coupon = coupon.value.code
    couponInput.value = coupon.value.code
    if (!silentFail) toast.success(`Đã áp dụng mã ${coupon.value.code}`)
  } catch (e) {
    coupon.value = null
    cart.coupon = ''
    couponError.value = e.message
  } finally {
    couponLoading.value = false
  }
}
function removeCoupon() {
  coupon.value = null
  cart.coupon = ''
  couponInput.value = ''
}
// Giỏ thay đổi → kiểm tra lại mã
watch(
  () => cart.subtotal,
  () => cart.coupon && applyCoupon(cart.coupon, true),
  { immediate: true },
)

const discount = computed(() => coupon.value?.discount || 0)
const total = computed(() => Math.max(0, cart.subtotal - discount.value) + cart.shippingFee)

// ---- Validate ----
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  const req = (k, msg) => !String(form[k] || '').trim() && (errors[k] = msg)
  req('customer_name', 'Vui lòng nhập họ tên')
  if (!isPhone(form.customer_phone)) errors.customer_phone = 'Số điện thoại không hợp lệ'
  if (form.customer_email && !isEmail(form.customer_email)) errors.customer_email = 'Email không hợp lệ'
  if (!form.receiver_same) {
    req('receiver_name', 'Vui lòng nhập tên người nhận')
    if (!isPhone(form.receiver_phone)) errors.receiver_phone = 'Số điện thoại không hợp lệ'
  }
  req('address', 'Vui lòng nhập địa chỉ')
  req('district', 'Vui lòng nhập quận/huyện')
  req('city', 'Vui lòng nhập tỉnh/thành')
  if (!form.delivery_date || !form.delivery_time_slot)
    errors.delivery = 'Vui lòng chọn ngày và khung giờ giao'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) {
    toast.error('Vui lòng kiểm tra lại thông tin')
    await nextTick()
    document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      ...form,
      receiver_name: form.receiver_same ? form.customer_name : form.receiver_name,
      receiver_phone: form.receiver_same ? form.customer_phone : form.receiver_phone,
      coupon_code: coupon.value?.code || '',
      items: cart.items.map((it) => ({ product_id: it.product_id, size: it.size, qty: it.qty })),
    }
    delete payload.receiver_same
    const order = await createOrder(payload)
    try {
      const { customer_name, customer_phone, customer_email, address, district, city } = form
      localStorage.setItem(
        SAVED_KEY,
        JSON.stringify({ customer_name, customer_phone, customer_email, address, district, city }),
      )
      sessionStorage.setItem('last_order', JSON.stringify(order))
    } catch {
      /* bỏ qua */
    }
    placed.value = true
    cart.clear()
    router.replace({ name: 'order-success', params: { code: order.order_code } })
  } catch {
    /* toast đã hiển thị lỗi từ server */
  } finally {
    submitting.value = false
  }
}

const bank = computed(() => settings.data)
</script>

<template>
  <div class="container-x pb-16 pt-8 md:pt-12">
    <h1 class="mb-8 text-center font-serif text-3xl uppercase tracking-[0.08em] md:mb-12 md:text-5xl">
      Thanh toán
    </h1>

    <p v-if="placed" class="py-24 text-center text-sm text-muted">Đang chuyển đến trang xác nhận đơn hàng…</p>

    <StateBlock
      v-else-if="!cart.items.length"
      title="Giỏ hàng đang trống"
      message="Bạn chưa có sản phẩm nào để thanh toán."
    >
      <RouterLink to="/hang-moi" class="btn-primary">Khám phá hoa mới</RouterLink>
    </StateBlock>

    <form v-else class="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16" novalidate @submit.prevent="submit">
      <div class="space-y-10">
        <!-- Người đặt -->
        <fieldset>
          <legend class="caps mb-5 font-medium">1. Thông tin người đặt</legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2" :data-error="!!errors.customer_name">
              <label class="label" for="c-name">Họ và tên *</label>
              <input
                id="c-name"
                v-model="form.customer_name"
                class="input"
                :class="{ 'input-error': errors.customer_name }"
                autocomplete="name"
              />
              <p v-if="errors.customer_name" class="mt-1 text-xs text-accent">{{ errors.customer_name }}</p>
            </div>
            <div :data-error="!!errors.customer_phone">
              <label class="label" for="c-phone">Số điện thoại *</label>
              <input
                id="c-phone"
                v-model="form.customer_phone"
                type="tel"
                inputmode="tel"
                class="input"
                :class="{ 'input-error': errors.customer_phone }"
                autocomplete="tel"
                placeholder="0901 234 567"
              />
              <p v-if="errors.customer_phone" class="mt-1 text-xs text-accent">{{ errors.customer_phone }}</p>
            </div>
            <div :data-error="!!errors.customer_email">
              <label class="label" for="c-email">Email</label>
              <input
                id="c-email"
                v-model="form.customer_email"
                type="email"
                class="input"
                :class="{ 'input-error': errors.customer_email }"
                autocomplete="email"
              />
              <p v-if="errors.customer_email" class="mt-1 text-xs text-accent">{{ errors.customer_email }}</p>
            </div>
          </div>
        </fieldset>

        <!-- Người nhận -->
        <fieldset>
          <legend class="caps mb-5 font-medium">2. Thông tin người nhận</legend>
          <label class="mb-4 flex cursor-pointer items-center gap-3 text-sm">
            <input v-model="form.receiver_same" type="checkbox" class="h-4 w-4 accent-ink" /> Người nhận là
            tôi
          </label>
          <div v-if="!form.receiver_same" class="mb-4 grid gap-4 sm:grid-cols-2">
            <div :data-error="!!errors.receiver_name">
              <label class="label" for="r-name">Tên người nhận *</label>
              <input
                id="r-name"
                v-model="form.receiver_name"
                class="input"
                :class="{ 'input-error': errors.receiver_name }"
              />
              <p v-if="errors.receiver_name" class="mt-1 text-xs text-accent">{{ errors.receiver_name }}</p>
            </div>
            <div :data-error="!!errors.receiver_phone">
              <label class="label" for="r-phone">SĐT người nhận *</label>
              <input
                id="r-phone"
                v-model="form.receiver_phone"
                type="tel"
                inputmode="tel"
                class="input"
                :class="{ 'input-error': errors.receiver_phone }"
              />
              <p v-if="errors.receiver_phone" class="mt-1 text-xs text-accent">{{ errors.receiver_phone }}</p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2" :data-error="!!errors.address">
              <label class="label" for="addr">Địa chỉ giao hàng *</label>
              <input
                id="addr"
                v-model="form.address"
                class="input"
                :class="{ 'input-error': errors.address }"
                placeholder="Số nhà, tên đường, phường/xã"
                autocomplete="street-address"
              />
              <p v-if="errors.address" class="mt-1 text-xs text-accent">{{ errors.address }}</p>
            </div>
            <div :data-error="!!errors.district">
              <label class="label" for="district">Quận / Huyện *</label>
              <input
                id="district"
                v-model="form.district"
                class="input"
                :class="{ 'input-error': errors.district }"
              />
              <p v-if="errors.district" class="mt-1 text-xs text-accent">{{ errors.district }}</p>
            </div>
            <div :data-error="!!errors.city">
              <label class="label" for="city">Tỉnh / Thành phố *</label>
              <input
                id="city"
                v-model="form.city"
                list="city-list"
                class="input"
                :class="{ 'input-error': errors.city }"
              />
              <datalist id="city-list"><option v-for="c in CITIES" :key="c" :value="c" /></datalist>
              <p v-if="errors.city" class="mt-1 text-xs text-accent">{{ errors.city }}</p>
            </div>
          </div>
        </fieldset>

        <!-- Giao hàng -->
        <fieldset :data-error="!!errors.delivery">
          <legend class="caps mb-5 font-medium">3. Thời gian giao & lời nhắn</legend>
          <DeliveryPicker
            v-model:date="form.delivery_date"
            v-model:slot="form.delivery_time_slot"
            :error="errors.delivery"
          />
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="card">Lời nhắn trên thiệp</label>
              <textarea
                id="card"
                v-model="form.card_message"
                rows="3"
                maxlength="300"
                class="input resize-none"
              />
            </div>
            <div>
              <label class="label" for="note">Ghi chú cho shop</label>
              <textarea
                id="note"
                v-model="form.note"
                rows="3"
                maxlength="500"
                class="input resize-none"
                placeholder="Ví dụ: gọi trước khi giao, giao bí mật…"
              />
            </div>
          </div>
          <input
            v-model="form.website"
            type="text"
            tabindex="-1"
            autocomplete="off"
            class="hidden"
            aria-hidden="true"
          />
        </fieldset>

        <!-- Thanh toán -->
        <fieldset>
          <legend class="caps mb-5 font-medium">4. Phương thức thanh toán</legend>
          <div class="space-y-3">
            <label
              class="flex cursor-pointer gap-4 border p-4 transition-colors"
              :class="form.payment_method === 'COD' ? 'border-ink' : 'border-line'"
            >
              <input v-model="form.payment_method" type="radio" value="COD" class="mt-1 accent-ink" />
              <span>
                <span class="block text-sm font-medium">Thanh toán khi nhận hàng (COD)</span>
                <span class="text-xs text-muted">Thanh toán tiền mặt cho nhân viên giao hàng.</span>
              </span>
            </label>
            <label
              class="flex cursor-pointer gap-4 border p-4 transition-colors"
              :class="form.payment_method === 'BANK' ? 'border-ink' : 'border-line'"
            >
              <input v-model="form.payment_method" type="radio" value="BANK" class="mt-1 accent-ink" />
              <span class="flex-1">
                <span class="block text-sm font-medium">Chuyển khoản ngân hàng (VietQR)</span>
                <span class="text-xs text-muted"
                  >Mã QR với nội dung là mã đơn hàng sẽ hiển thị sau khi đặt hàng.</span
                >
                <span
                  v-if="form.payment_method === 'BANK' && bank.bank_account_no"
                  class="mt-3 block bg-cream p-3 text-xs leading-relaxed"
                >
                  {{ bank.bank_name }} · STK <b>{{ bank.bank_account_no }}</b
                  ><br />Chủ TK: {{ bank.bank_account_name }}
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <!-- Tóm tắt -->
      <aside class="h-fit bg-cream p-6 md:p-8 lg:sticky lg:top-36">
        <p class="caps mb-2 font-medium">Đơn hàng ({{ cart.count }})</p>
        <div class="mb-4 border-b border-ink/10 pb-4">
          <label class="label" for="coupon">Mã giảm giá</label>
          <div v-if="coupon" class="flex items-center justify-between bg-white px-4 py-3 text-sm">
            <span
              ><b>{{ coupon.code }}</b> · -{{ formatPrice(coupon.discount) }}</span
            >
            <button type="button" class="text-xs text-muted underline" @click="removeCoupon">Bỏ</button>
          </div>
          <div v-else class="flex">
            <input
              id="coupon"
              v-model="couponInput"
              class="input uppercase"
              placeholder="Nhập mã"
              @keydown.enter.prevent="applyCoupon()"
            />
            <button
              type="button"
              class="btn-primary shrink-0 px-5"
              :disabled="couponLoading || !couponInput"
              @click="applyCoupon()"
            >
              {{ couponLoading ? '…' : 'Áp dụng' }}
            </button>
          </div>
          <p v-if="couponError" class="mt-1 text-xs text-accent">{{ couponError }}</p>
        </div>
        <OrderSummary
          :items="cart.items"
          :subtotal="cart.subtotal"
          :discount="discount"
          :shipping-fee="cart.shippingFee"
          :total="total"
          :coupon-code="coupon?.code"
        />
        <button type="submit" class="btn-primary mt-6 w-full" :disabled="submitting">
          {{ submitting ? 'Đang đặt hàng…' : 'Đặt hàng' }}
        </button>
        <p class="mt-3 text-center text-[11px] text-muted">
          Giá cuối cùng được xác nhận bởi hệ thống khi đặt hàng. Bằng việc đặt hàng, bạn đồng ý với
          <RouterLink to="/chinh-sach-doi-tra" class="underline">chính sách đổi trả</RouterLink>.
        </p>
      </aside>
    </form>
  </div>
</template>
