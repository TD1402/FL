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

/* ---------------------------------------------------------------------------
 * Cache GET 2 tầng:
 *  - Bộ nhớ (60s): gộp các request trùng, quay lui trang không gọi lại.
 *  - localStorage (≤ 24h, stale-while-revalidate): mở lại trang hiện dữ liệu cũ NGAY,
 *    đồng thời gọi API ngầm; có dữ liệu mới thì báo qua onUpdate. Apps Script luôn mất ≥ 1–2s/request
 *    nên đây là cách hiệu quả nhất để giao diện phản hồi tức thì.
 * ------------------------------------------------------------------------- */
const memCache = new Map()
const MEM_TTL = 60 * 1000
const STORE_PREFIX = 'api:v1:'
const STORE_MAX_AGE = 24 * 60 * 60 * 1000
const STORE_MAX_ENTRIES = 80

function storeRead(url) {
  try {
    const e = JSON.parse(localStorage.getItem(STORE_PREFIX + url) || 'null')
    return e && Date.now() - e.t < STORE_MAX_AGE ? e : null
  } catch {
    return null
  }
}

function storeKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORE_PREFIX)) keys.push(k)
  }
  return keys
}

/** Xoá các mục cũ nhất khi vượt giới hạn hoặc khi localStorage đầy. */
function storePrune(keep = STORE_MAX_ENTRIES) {
  const entries = storeKeys().map((k) => {
    try {
      return [k, JSON.parse(localStorage.getItem(k)).t || 0]
    } catch {
      return [k, 0]
    }
  })
  entries.sort((a, b) => a[1] - b[1])
  entries.slice(0, Math.max(0, entries.length - keep)).forEach(([k]) => localStorage.removeItem(k))
}

function storeWrite(url, data) {
  const value = JSON.stringify({ t: Date.now(), d: data })
  try {
    localStorage.setItem(STORE_PREFIX + url, value)
    if (storeKeys().length > STORE_MAX_ENTRIES) storePrune()
  } catch {
    try {
      storePrune(STORE_MAX_ENTRIES / 2)
      localStorage.setItem(STORE_PREFIX + url, value)
    } catch {
      /* localStorage không khả dụng — bỏ qua */
    }
  }
}

function fetchGet(url, silent) {
  const hit = memCache.get(url)
  if (hit && Date.now() - hit.time < MEM_TTL) return hit.promise
  const promise = request(url, { method: 'GET' }, { silent })
  memCache.set(url, { time: Date.now(), promise })
  promise.catch(() => memCache.delete(url))
  return promise
}

/**
 * @param {string} action
 * @param {Record<string, any>} [params]
 * @param {{silent?: boolean, cache?: boolean, persist?: boolean, onUpdate?: (fresh: any) => void}} [opts]
 *   persist: bật stale-while-revalidate qua localStorage; onUpdate: gọi khi dữ liệu nền khác bản đã trả.
 */
export function apiGet(
  action,
  params = {},
  { silent = false, cache = true, persist = false, onUpdate } = {},
) {
  const qs = new URLSearchParams({ action })
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  })
  const url = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${qs}`
  if (!cache) return request(url, { method: 'GET' }, { silent })

  const memHit = memCache.get(url)
  const memFresh = memHit && Date.now() - memHit.time < MEM_TTL
  const stored = persist && !memFresh ? storeRead(url) : null
  const network = fetchGet(url, silent || !!stored)
  if (persist) {
    network
      .then((fresh) => {
        const changed = !stored || JSON.stringify(stored.d) !== JSON.stringify(fresh)
        if (changed) storeWrite(url, fresh)
        if (stored && changed) onUpdate?.(fresh)
      })
      .catch(() => {})
  }
  return stored ? Promise.resolve(stored.d) : network
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

/** Xoá cache GET (sau khi admin lưu dữ liệu) để lần xem sau lấy dữ liệu mới. */
export function clearGetCache() {
  memCache.clear()
  try {
    storeKeys().forEach((k) => localStorage.removeItem(k))
  } catch {
    /* bỏ qua */
  }
}
