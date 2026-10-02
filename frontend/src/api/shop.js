import { apiGet, apiPost } from './client'

/*
 * Dữ liệu công khai dùng stale-while-revalidate (persist): hiện ngay bản đã lưu, cập nhật ngầm.
 * Truyền onUpdate để nhận dữ liệu mới khi bản nền khác bản đã hiển thị.
 */

/** Bản tóm tắt sản phẩm đã thấy trong các danh sách → trang chi tiết hiện ngay khi bấm vào. */
const previews = new Map()
const remember = (r) => {
  r?.items?.forEach((p) => previews.set(p.slug, p))
  return r
}
export const peekProduct = (slug) => previews.get(slug) || null

export const getSettings = (onUpdate) => apiGet('getSettings', {}, { silent: true, persist: true, onUpdate })
export const getCategories = (onUpdate) =>
  apiGet('getCategories', {}, { silent: true, persist: true, onUpdate })
export const getBanners = (position, onUpdate) =>
  apiGet('getBanners', { position }, { silent: true, persist: true, onUpdate })

/**
 * @param {{category?, collection?, q?, minPrice?, maxPrice?, color?, flower?, sort?, page?, limit?, isNew?, isBestSeller?}} params
 * @param {{silent?: boolean, onUpdate?: Function}} [opts]
 * @returns {Promise<{items: any[], total: number, page: number, limit: number, facets: any}>}
 */
export const getProducts = (params = {}, { onUpdate, ...opts } = {}) =>
  apiGet('getProducts', params, {
    persist: !params.q,
    ...opts,
    onUpdate: onUpdate && ((r) => onUpdate(remember(r))),
  }).then(remember)

export const getProduct = (slug, onUpdate) =>
  apiGet('getProduct', { slug }, { silent: true, persist: true, onUpdate })

/** Tải trước chi tiết sản phẩm (khi hover/chạm vào thẻ sản phẩm). */
export const prefetchProduct = (slug) => getProduct(slug).catch(() => {})

export const checkCoupon = (code, subtotal) => apiPost('checkCoupon', { code, subtotal }, { silent: true })
export const createOrder = (order) => apiPost('createOrder', order)
export const trackOrder = (code, phone) => apiPost('trackOrder', { code, phone }, { silent: true })
export const submitContact = (data) => apiPost('submitContact', data)
export const subscribe = (email) => apiPost('subscribe', { email })
