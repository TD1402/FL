import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsStore } from './settings'

/**
 * Giỏ hàng (lưu localStorage). Giá ở đây chỉ để hiển thị — server luôn tính lại khi tạo đơn.
 * item: { key, product_id, slug, name, image, size, price, compare_price, qty, stock }
 */
export const useCartStore = defineStore(
  'cart',
  () => {
    const items = ref([])
    /** Thông tin giao chọn ở trang sản phẩm, dùng để điền sẵn ở trang thanh toán. */
    const delivery = ref({ date: '', slot: '', card_message: '' })
    const coupon = ref('')
    const drawerOpen = ref(false)

    const count = computed(() => items.value.reduce((s, it) => s + it.qty, 0))
    const subtotal = computed(() => items.value.reduce((s, it) => s + it.price * it.qty, 0))
    const shippingFee = computed(() => useSettingsStore().shippingFor(subtotal.value))

    function add(product, { size = '', qty = 1, price } = {}) {
      const key = `${product.id}::${size}`
      const existing = items.value.find((it) => it.key === key)
      const max = product.stock > 0 ? product.stock : 99
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, max)
      } else {
        items.value.push({
          key,
          product_id: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images?.[0] || '',
          size,
          price,
          qty: Math.min(qty, max),
          stock: product.stock,
        })
      }
    }

    function setQty(key, qty) {
      const it = items.value.find((x) => x.key === key)
      if (!it) return
      const max = it.stock > 0 ? it.stock : 99
      it.qty = Math.max(1, Math.min(qty, max))
    }

    function remove(key) {
      items.value = items.value.filter((x) => x.key !== key)
    }

    function clear() {
      items.value = []
      coupon.value = ''
      delivery.value = { date: '', slot: '', card_message: '' }
    }

    return { items, delivery, coupon, drawerOpen, count, subtotal, shippingFee, add, setQty, remove, clear }
  },
  { persist: { pick: ['items', 'delivery', 'coupon'] } },
)
