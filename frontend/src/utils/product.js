/** Có đang giảm giá không (sale_price > 0 và nhỏ hơn price). */
export function hasSale(p) {
  return p && p.sale_price > 0 && p.sale_price < p.price
}

/** Giá cuối: sale_price nếu đang sale, ngược lại price; nếu có size thì dùng giá size. */
export function finalPrice(p, sizeName) {
  if (!p) return 0
  if (p.sizes?.length) {
    const s = p.sizes.find((x) => x.name === sizeName) || p.sizes[0]
    return s.price
  }
  return hasSale(p) ? p.sale_price : p.price
}

/** Giá gốc để gạch ngang (0 nếu không giảm). Sản phẩm có size không hiển thị giá gạch. */
export function comparePrice(p) {
  return !p?.sizes?.length && hasSale(p) ? p.price : 0
}

export function discountPercent(p) {
  return comparePrice(p) ? Math.round((1 - p.sale_price / p.price) * 100) : 0
}

/** Giá "từ" cho thẻ sản phẩm có nhiều size. */
export function fromPrice(p) {
  if (p?.sizes?.length) return Math.min(...p.sizes.map((s) => s.price))
  return finalPrice(p)
}

/** Link Google Drive (uc?id= / open?id= / file/d/ID) → lh3.googleusercontent.com (nhúng được vào <img>). */
export function driveToLh3(url) {
  const m = String(url || '').match(
    /(?:drive|docs)\.google\.com\/(?:uc\?(?:[^#]*&)?id=|open\?(?:[^#]*&)?id=|file\/d\/)([\w-]{20,})/,
  )
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1000` : url
}

const LH3_ID_RE = /lh3\.googleusercontent\.com\/d\/([\w-]{20,})/
const SIZE_BUCKETS = [400, 800, 1200, 1600]
/** Làm tròn lên vài mức cố định → ít URL khác nhau, tận dụng cache trình duyệt/CDN. */
const bucket = (w) => SIZE_BUCKETS.find((b) => b >= w) || SIZE_BUCKETS[SIZE_BUCKETS.length - 1]
/** Proxy ảnh Drive qua wsrv.nl (cache Cloudflare, resize, WebP). Tắt: VITE_IMAGE_PROXY=off */
const USE_PROXY = import.meta.env?.VITE_IMAGE_PROXY !== 'off'

/**
 * Ảnh Google Drive nhúng trực tiếp (lh3.googleusercontent.com/d/…) bị Google giới hạn lượt tải (429).
 * Đi qua proxy có cache: mỗi ảnh chỉ tải từ Drive một lần (bản gốc w1600), proxy tự resize.
 */
export function driveProxy(id, width) {
  const origin = encodeURIComponent(`https://lh3.googleusercontent.com/d/${id}=w1600`)
  return `https://wsrv.nl/?url=${origin}&w=${bucket(width)}&we&output=webp&q=80`
}

/**
 * Đổi URL ảnh sang kích thước phù hợp (Unsplash / Google Drive) để tiết kiệm băng thông.
 * @param {{proxy?: boolean}} [opts] proxy=false: luôn trả link Google gốc (dùng cho og:image, JSON-LD, sitemap)
 */
export function resizeImage(url, width, { proxy = USE_PROXY } = {}) {
  if (!url) return ''
  url = driveToLh3(url)
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url)
    const ratio = Number(u.searchParams.get('h')) / Number(u.searchParams.get('w')) || 0
    u.searchParams.set('w', String(width))
    if (ratio) u.searchParams.set('h', String(Math.round(width * ratio)))
    return u.toString()
  }
  const m = url.match(LH3_ID_RE)
  if (m)
    return proxy ? driveProxy(m[1], width) : `https://lh3.googleusercontent.com/d/${m[1]}=w${bucket(width)}`
  return url
}

/** Link ảnh Google trực tiếp (không proxy) — dùng làm dự phòng khi proxy lỗi. */
export function directImage(url, width) {
  return resizeImage(url, width, { proxy: false })
}
