/**
 * Client gọi Google Apps Script Web App.
 *
 * - GAS KHÔNG hỗ trợ preflight (OPTIONS) → POST gửi `Content-Type: text/plain;charset=utf-8`,
 *   không thêm header tuỳ chỉnh; token admin nằm trong body.
 * - GAS trả 302 sang script.googleusercontent.com → giữ `redirect: 'follow'`.
 */
import { toast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_USE_PROXY === 'true' ? '/gas' : import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(message, { status, network } = {}) {
    super(message)
    this.status = status
    this.network = !!network
  }
}

/** Token admin do auth store gắn vào (tránh import vòng). */
let tokenProvider = () => null
let unauthorizedHandler = () => {}
export function configureAuth({ getToken, onUnauthorized }) {
  tokenProvider = getToken
  unauthorizedHandler = onUnauthorized
}

async function request(url, init, { silent }) {
  if (!API_URL) {
    const err = new ApiError('Chưa cấu hình VITE_API_URL')
    if (!silent) toast.error(err.message)
    throw err
  }
  let json
  try {
    const res = await fetch(url, { redirect: 'follow', ...init })
    if (!res.ok) throw new ApiError(`Lỗi máy chủ (${res.status})`, { status: res.status })
    json = await res.json()
  } catch (e) {
    const err =
      e instanceof ApiError
        ? e
        : new ApiError('Không thể kết nối máy chủ, vui lòng thử lại', { network: true })
    if (!silent) toast.error(err.message)
    throw err
  }
  if (!json || json.success !== true) {
    const message = json?.error || 'Đã có lỗi xảy ra'
    if (message === 'UNAUTHORIZED') {
      unauthorizedHandler()
      throw new ApiError('Phiên đăng nhập đã hết hạn', { status: 401 })
    }
    if (!silent) toast.error(message)
    throw new ApiError(message)
  }
  return json.data
}

/* Bộ nhớ đệm ngắn cho GET: tránh gọi lại khi quay lui trang. */
const getCache = new Map()
const GET_TTL = 60 * 1000

/**
 * @param {string} action
 * @param {Record<string, any>} [params]
 * @param {{silent?: boolean, cache?: boolean}} [opts]
 */
export function apiGet(action, params = {}, { silent = false, cache = true } = {}) {
  const qs = new URLSearchParams({ action })
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  })
  const url = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${qs}`
  const hit = cache && getCache.get(url)
  if (hit && Date.now() - hit.time < GET_TTL) return hit.promise
  const promise = request(url, { method: 'GET' }, { silent })
  if (cache) {
    getCache.set(url, { time: Date.now(), promise })
    promise.catch(() => getCache.delete(url))
  }
  return promise
}

/**
 * @param {string} action
 * @param {any} [data]
 * @param {{silent?: boolean}} [opts]
 */
export function apiPost(action, data = {}, { silent = false } = {}) {
  const body = { action, data }
  const token = tokenProvider()
  if (token) body.token = token
  return request(
    API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    },
    { silent },
  )
}

export function clearGetCache() {
  getCache.clear()
}
