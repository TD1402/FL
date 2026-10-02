import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCategories, getSettings } from '@/api/shop'
import { DEFAULT_SLOTS } from '@/utils/delivery'

/** Settings + cây danh mục: tải một lần, dùng chung cho mọi trang. */
export const useSettingsStore = defineStore('settings', () => {
  const data = ref({})
  const categories = ref([])
  const loaded = ref(false)
  const error = ref('')
  let loading = null

  function load(force = false) {
    if ((loaded.value && !force) || (loading && !force)) return loading || Promise.resolve()
    loading = Promise.all([
      getSettings((s) => (data.value = s || {})),
      getCategories((c) => (categories.value = c || [])),
    ])
      .then(([s, c]) => {
        data.value = s || {}
        categories.value = c || []
        loaded.value = true
        error.value = ''
      })
      .catch((e) => {
        error.value = e.message
        loading = null
      })
    return loading
  }

  const shopName = computed(() => data.value.shop_name || 'Hoa Mộc')
  const topBarMessages = computed(() =>
    String(data.value.top_bar_message || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  const shippingFee = computed(() => Number(data.value.shipping_fee_default) || 0)
  const freeShipFrom = computed(() => Number(data.value.free_ship_from) || 0)
  const timeSlots = computed(() => data.value.time_slots || DEFAULT_SLOTS)
  const prepHours = computed(() => Number(data.value.prep_hours ?? 2))

  const flatCategories = computed(() => {
    const out = []
    const walk = (list, depth) =>
      list.forEach((c) => {
        out.push({ ...c, depth })
        walk(c.children || [], depth + 1)
      })
    walk(categories.value, 0)
    return out
  })
  const childrenOf = (slug) => categories.value.find((c) => c.slug === slug)?.children || []
  const occasions = computed(() => childrenOf('hoa-theo-dip'))
  const styles = computed(() => childrenOf('kieu-dang'))
  const collections = computed(() => childrenOf('bo-suu-tap'))
  const findCategory = (slug) => flatCategories.value.find((c) => c.slug === slug)

  function shippingFor(subtotal) {
    if (!subtotal) return 0
    return freeShipFrom.value > 0 && subtotal >= freeShipFrom.value ? 0 : shippingFee.value
  }

  return {
    data,
    categories,
    loaded,
    error,
    load,
    shopName,
    topBarMessages,
    shippingFee,
    freeShipFrom,
    timeSlots,
    prepHours,
    flatCategories,
    occasions,
    styles,
    collections,
    findCategory,
    shippingFor,
  }
})
