import { apiGet, apiPost } from './client'

export const getSettings = () => apiGet('getSettings', {}, { silent: true })
export const getCategories = () => apiGet('getCategories', {}, { silent: true })
export const getBanners = (position) => apiGet('getBanners', { position }, { silent: true })

/**
 * @param {{category?, collection?, q?, minPrice?, maxPrice?, color?, flower?, sort?, page?, limit?, isNew?, isBestSeller?}} params
 * @returns {Promise<{items: any[], total: number, page: number, limit: number, facets: any}>}
 */
export const getProducts = (params = {}, opts) => apiGet('getProducts', params, opts)
export const getProduct = (slug) => apiGet('getProduct', { slug }, { silent: true })

export const checkCoupon = (code, subtotal) => apiPost('checkCoupon', { code, subtotal }, { silent: true })
export const createOrder = (order) => apiPost('createOrder', order)
export const trackOrder = (code, phone) => apiPost('trackOrder', { code, phone }, { silent: true })
export const submitContact = (data) => apiPost('submitContact', data)
export const subscribe = (email) => apiPost('subscribe', { email })
