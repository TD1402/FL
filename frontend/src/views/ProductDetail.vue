<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProduct } from '@/api/shop'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useSettingsStore } from '@/stores/settings'
import { siteUrl, useSeo } from '@/composables/useSeo'
import { breadcrumbSchema, productDescription, productSchema } from '@/seo/schema'
import { toast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'
import { comparePrice, discountPercent, finalPrice } from '@/utils/product'
import AppBreadcrumb from '@/components/ui/AppBreadcrumb.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import QuantityInput from '@/components/ui/QuantityInput.vue'
import StateBlock from '@/components/ui/StateBlock.vue'
import ProductGallery from '@/components/shop/ProductGallery.vue'
import ProductCarousel from '@/components/shop/ProductCarousel.vue'
import SectionHeading from '@/components/shop/SectionHeading.vue'
import DeliveryPicker from '@/components/shop/DeliveryPicker.vue'

const props = defineProps({ slug: { type: String, required: true } })
const router = useRouter()
const cart = useCartStore()
const wishlist = useWishlistStore()
const settings = useSettingsStore()

const product = ref(null)
const related = ref([])
const loading = ref(true)
const error = ref('')

const size = ref('')
const qty = ref(1)
const deliveryDate = ref(cart.delivery.date)
const deliverySlot = ref(cart.delivery.slot)
const cardMessage = ref(cart.delivery.card_message)
const tab = ref('desc')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await getProduct(props.slug)
    product.value = r.product
    related.value = r.related
    size.value = r.product.sizes?.[0]?.name || ''
    qty.value = 1
    tab.value = 'desc'
  } catch (e) {
    error.value = e.message
    product.value = null
  } finally {
    loading.value = false
  }
}
watch(() => props.slug, load, { immediate: true })

const price = computed(() => finalPrice(product.value, size.value))
const compare = computed(() => comparePrice(product.value))
const percent = computed(() => discountPercent(product.value))
const soldOut = computed(() => product.value && product.value.stock <= 0)
const maxQty = computed(() => Math.max(1, Math.min(99, product.value?.stock || 1)))
const primaryCategory = computed(() =>
  settings.flatCategories.find((c) => product.value?.category_ids?.includes(c.id) && c.depth > 0),
)

useSeo(() => {
  const p = product.value
  if (!p) return { title: error.value ? 'Không tìm thấy sản phẩm' : '', noindex: !!error.value }
  const crumbs = [
    ...(primaryCategory.value
      ? [{ name: primaryCategory.value.name, path: `/danh-muc/${primaryCategory.value.slug}` }]
      : []),
    { name: p.name, path: `/san-pham/${p.slug}` },
  ]
  return {
    title: p.name,
    description: productDescription(p, settings.shopName),
    image: p.images?.[0],
    path: `/san-pham/${p.slug}`,
    type: 'product',
    meta: [
      { property: 'product:price:amount', content: String(price.value) },
      { property: 'product:price:currency', content: 'VND' },
      { property: 'product:availability', content: soldOut.value ? 'out of stock' : 'in stock' },
    ],
    jsonLd: [productSchema(p, siteUrl(), settings.shopName), breadcrumbSchema(crumbs, siteUrl())],
  }
})

function saveDelivery() {
  cart.delivery = {
    date: deliveryDate.value || cart.delivery.date,
    slot: deliverySlot.value || cart.delivery.slot,
    card_message: cardMessage.value.trim() || cart.delivery.card_message,
  }
}

function addToCart(buyNow = false) {
  if (!product.value || soldOut.value) return
  cart.add(product.value, { size: size.value, qty: qty.value, price: price.value })
  saveDelivery()
  if (buyNow) return router.push('/thanh-toan')
  toast.success(`Đã thêm “${product.value.name}” vào giỏ hàng`)
  cart.drawerOpen = true
}
</script>

<template>
  <div class="container-x pb-16 pt-6 md:pt-8">
    <div v-if="loading" class="grid gap-8 md:grid-cols-2 lg:gap-16">
      <div class="skeleton aspect-[3/4]" />
      <div class="space-y-4 pt-4">
        <div class="skeleton h-4 w-1/3" />
        <div class="skeleton h-10 w-4/5" />
        <div class="skeleton h-6 w-1/4" />
        <div class="skeleton mt-8 h-24 w-full" />
        <div class="skeleton h-12 w-full" />
      </div>
    </div>

    <StateBlock v-else-if="error" type="error" title="Không tìm thấy sản phẩm" :message="error" @retry="load">
      <div class="flex gap-3">
        <button class="btn-outline" @click="load">Thử lại</button>
        <RouterLink to="/hang-moi" class="btn-primary">Xem hoa mới</RouterLink>
      </div>
    </StateBlock>

    <template v-else-if="product">
      <AppBreadcrumb
        :items="[
          ...(primaryCategory
            ? [{ label: primaryCategory.name, to: `/danh-muc/${primaryCategory.slug}` }]
            : []),
          { label: product.name },
        ]"
      />

      <div class="mt-6 grid gap-8 md:grid-cols-2 lg:gap-16">
        <ProductGallery :images="product.images" :alt="product.name" />

        <div class="md:sticky md:top-36 md:self-start">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="caps text-[11px] text-muted">Mã: {{ product.sku }}</p>
              <h1 class="mt-2 font-serif text-3xl leading-tight md:text-4xl">{{ product.name }}</h1>
            </div>
            <button
              class="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line transition-colors hover:border-ink"
              :class="{ 'text-accent': wishlist.has(product.id) }"
              :aria-label="wishlist.has(product.id) ? 'Bỏ yêu thích' : 'Yêu thích'"
              @click="wishlist.toggle(product)"
            >
              <AppIcon name="heart" :size="18" />
            </button>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <span class="text-2xl font-medium" :class="{ 'text-accent': percent }">{{
              formatPrice(price)
            }}</span>
            <span v-if="compare" class="text-muted line-through">{{ formatPrice(compare) }}</span>
            <span v-if="percent" class="caps bg-accent px-2 py-1 text-[10px] text-white"
              >-{{ percent }}%</span
            >
          </div>
          <p v-if="product.short_desc" class="mt-4 text-sm leading-relaxed text-muted">
            {{ product.short_desc }}
          </p>

          <div class="mt-8 space-y-6 border-t border-line pt-6">
            <div v-if="product.sizes.length">
              <p class="label">Kích cỡ</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in product.sizes"
                  :key="s.name"
                  class="min-w-24 border px-4 py-2.5 text-sm transition-colors"
                  :class="size === s.name ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'"
                  @click="size = s.name"
                >
                  {{ s.name }}
                  <span class="block text-[11px] opacity-70">{{ formatPrice(s.price) }}</span>
                </button>
              </div>
            </div>

            <DeliveryPicker v-model:date="deliveryDate" v-model:slot="deliverySlot" />

            <div>
              <label for="card-msg" class="label">Lời nhắn trên thiệp (miễn phí)</label>
              <textarea
                id="card-msg"
                v-model="cardMessage"
                rows="3"
                maxlength="300"
                class="input resize-none"
                placeholder="Ví dụ: Chúc mừng sinh nhật em yêu!"
              />
              <p class="mt-1 text-right text-[11px] text-muted">{{ cardMessage.length }}/300</p>
            </div>

            <div class="flex items-center gap-3">
              <QuantityInput v-model="qty" :max="maxQty" />
              <p class="text-xs text-muted">
                <template v-if="soldOut">Tạm hết hàng</template>
                <template v-else-if="product.stock <= 5">Chỉ còn {{ product.stock }} sản phẩm</template>
                <template v-else>Còn hàng</template>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button class="btn-outline px-2" :disabled="soldOut" @click="addToCart(false)">
                Thêm vào giỏ
              </button>
              <button class="btn-primary px-2" :disabled="soldOut" @click="addToCart(true)">Mua ngay</button>
            </div>

            <ul class="space-y-2 text-xs text-muted">
              <li class="flex items-center gap-2">
                <AppIcon name="truck" :size="16" /> Giao nhanh 2h nội thành · Miễn phí giao từ
                {{ formatPrice(settings.freeShipFrom) }}
              </li>
              <li class="flex items-center gap-2">
                <AppIcon name="card" :size="16" /> Tặng thiệp viết tay miễn phí
              </li>
              <li class="flex items-center gap-2">
                <AppIcon name="phone" :size="16" /> Tư vấn đặt hoa:
                <a :href="`tel:${settings.data.hotline}`" class="text-ink underline">{{
                  settings.data.hotline
                }}</a>
              </li>
            </ul>
          </div>

          <!-- Tabs -->
          <div class="mt-10">
            <div class="flex gap-6 border-b border-line" role="tablist">
              <button
                v-for="t in [
                  { key: 'desc', label: 'Mô tả' },
                  { key: 'flowers', label: 'Thành phần hoa' },
                  { key: 'policy', label: 'Giao hàng & đổi trả' },
                ]"
                :key="t.key"
                role="tab"
                :aria-selected="tab === t.key"
                class="caps -mb-px border-b pb-3 text-[11px] transition-colors"
                :class="
                  tab === t.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
                "
                @click="tab = t.key"
              >
                {{ t.label }}
              </button>
            </div>
            <div class="prose-shop py-6 text-sm leading-relaxed text-[#333]">
              <div v-if="tab === 'desc'" v-html="product.description || '<p>Đang cập nhật.</p>'" />
              <div v-else-if="tab === 'flowers'">
                <p><b>Thành phần:</b> {{ product.flowers.join(', ') || 'Đang cập nhật' }}</p>
                <p v-if="product.colors.length"><b>Tông màu:</b> {{ product.colors.join(', ') }}</p>
                <p v-if="product.sizes.length">
                  <b>Kích cỡ:</b>
                  {{ product.sizes.map((s) => `${s.name} (${formatPrice(s.price)})`).join(' · ') }}
                </p>
                <p class="text-muted">
                  Hoa có thể được thay thế bằng loại tương đương về màu sắc và giá trị khi hoa theo mùa không
                  có sẵn. Chúng tôi sẽ liên hệ trước khi thay đổi.
                </p>
              </div>
              <div v-else>
                <ul>
                  <li>Giao nhanh 2 giờ trong nội thành; khung giờ giao cố định theo lựa chọn của bạn.</li>
                  <li>
                    Phí giao {{ formatPrice(settings.shippingFee) }}, miễn phí cho đơn từ
                    {{ formatPrice(settings.freeShipFrom) }}.
                  </li>
                  <li>
                    Gửi ảnh thực tế trước khi giao. Đổi hoa miễn phí trong 24 giờ nếu hoa không đúng mô tả
                    hoặc bị dập héo.
                  </li>
                </ul>
                <RouterLink to="/chinh-sach-giao-hang" class="underline">Xem chính sách giao hàng</RouterLink>
                ·
                <RouterLink to="/chinh-sach-doi-tra" class="underline">Chính sách đổi trả</RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section v-if="related.length" class="mt-16 border-t border-line pt-12 md:mt-24 md:pt-20">
        <SectionHeading title="Sản phẩm liên quan" />
        <ProductCarousel :products="related" />
      </section>
    </template>
  </div>
</template>
