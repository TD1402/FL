import { apiPost, clearGetCache } from './client'

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

/** Đọc file ảnh → base64 → upload lên Drive qua GAS. Ảnh lớn được thu nhỏ trước (≤ 1600px). */
export async function uploadImage(file) {
  const { base64, mimeType } = await shrinkImage(file, 1600)
  return apiPost('uploadImage', { filename: file.name, mimeType, base64 })
}

function shrinkImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Không đọc được file'))
    reader.onload = () => {
      const dataUrl = String(reader.result)
      if (file.type === 'image/gif') return resolve({ base64: dataUrl.split(',')[1], mimeType: file.type })
      const img = new Image()
      img.onerror = () => reject(new Error('File không phải ảnh hợp lệ'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve({ base64: canvas.toDataURL(mimeType, 0.88).split(',')[1], mimeType })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}
