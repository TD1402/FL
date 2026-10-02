import { apiPost, clearGetCache } from './client'
import { prepareImage } from '@/utils/imageEncode'

export const adminLogin = (username, password) => apiPost('adminLogin', { username, password })
export const adminLogout = () => apiPost('adminLogout', {}, { silent: true })
export const adminChangePassword = (oldPassword, newPassword) =>
  apiPost('adminChangePassword', { oldPassword, newPassword })

/** @param {'products'|'categories'|'orders'|'banners'|'coupons'|'contacts'|'subscribers'|'settings'} resource */
export const adminList = (resource, { filters = {}, page = 1, limit = 20 } = {}) =>
  apiPost('adminList', { resource, filters, page, limit })
export const adminGet = (resource, id) => apiPost('adminGet', { resource, id })

export async function adminSave(resource, item, { create = false } = {}) {
  const r = await apiPost('adminSave', { resource, item, create })
  clearGetCache()
  return r
}
export async function adminDelete(resource, id) {
  const r = await apiPost('adminDelete', { resource, id })
  clearGetCache()
  return r
}
export async function updateOrderStatus(id, patch) {
  const r = await apiPost('updateOrderStatus', { id, ...patch })
  clearGetCache()
  return r
}
export const getDashboard = () => apiPost('getDashboard')

/** Nén ảnh ở trình duyệt (JPEG ≤ 1600px) → base64 → upload lên Drive qua GAS. */
/** @param {File} file @param {{folder?: string}} [opts] folder: thư mục con trong thư mục ảnh của shop (vd slug sản phẩm) */
export async function uploadImage(file, { folder = '', productId = '' } = {}) {
  const { base64, mimeType } = await prepareImage(file, 1600)
  return apiPost('uploadImage', { filename: file.name, mimeType, base64, folder, productId })
}

/** Link ảnh bất kỳ → backend tải về & lưu vào Drive → trả link Drive. */
export const importImageUrl = (url, folder = '', productId = '') =>
  apiPost('importImageUrl', { url, folder, productId })
/** Chuyển mọi ảnh ngoài Drive đang có trong Sheet vào Drive (chạy lại được). */
export async function migrateImages() {
  const r = await apiPost('migrateImages')
  clearGetCache()
  return r
}

/** Đưa ảnh đặt sai chỗ về đúng thư mục sản phẩm trên Drive. */
export const reorganizeImages = () => apiPost('reorganizeImages')

/** Duyệt ảnh trong thư mục Drive của shop. folderId trống = thư mục gốc. */
export const listDriveImages = (folderId = '', productId = '') =>
  apiPost('listDriveImages', { folderId, productId })
