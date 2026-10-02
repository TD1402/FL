/**
 * Dữ liệu SEO dùng chung cho runtime (useSeo) và script prerender lúc build (scripts/seo-build.mjs).
 * Chỉ dùng JS thuần — không import Vue / alias '@' để chạy được trên Node.
 */
import { fromPrice, finalPrice, hasSale, resizeImage } from '../utils/product.js'

export const SEO_DESC_MAX = 160

export function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cắt mô tả ≤ max ký tự, không cắt giữa chữ. */
export function truncate(s, max = SEO_DESC_MAX) {
  const t = stripHtml(s)
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,.;:–-]+$/, '') + '…'
}

export function joinUrl(siteUrl, path = '/') {
  const base = String(siteUrl || '').replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base + (p === '/' ? '/' : p.replace(/\/+$/, ''))
}

/* ------------------------------ Nội dung ------------------------------ */

export function pageTitle(title, shopName) {
  return title ? `${title} | ${shopName}` : shopName
}

export function categoryDescription(name, shopName) {
  return `Mẫu ${String(name).toLowerCase()} đẹp, thiết kế tinh tế tại ${shopName}. Hoa tươi mỗi ngày, giao nhanh 2h nội thành, tặng thiệp viết tay miễn phí.`
}

export function productDescription(p, shopName) {
  const base = p.short_desc || stripHtml(p.description) || p.name
  const price = fromPrice(p)
  return truncate(
    `${base} Giá từ ${new Intl.NumberFormat('vi-VN').format(price)}₫ — giao nhanh 2h tại ${shopName}.`,
  )
}

/** Ảnh chia sẻ: kích thước lớn, URL tuyệt đối. */
export function shareImage(url) {
  return url ? resizeImage(url, 1200) : ''
}

/* ------------------------------ JSON-LD ------------------------------- */

/** "7:00 – 21:00 hằng ngày" → "Mo-Su 07:00-21:00" */
function openingHours(text) {
  const m = String(text || '').match(/(\d{1,2})[:h](\d{2})?\s*[–\-—]\s*(\d{1,2})[:h](\d{2})?/)
  if (!m) return undefined
  const pad = (h, mm) => `${String(h).padStart(2, '0')}:${mm || '00'}`
  return `Mo-Su ${pad(m[1], m[2])}-${pad(m[3], m[4])}`
}

const isProfileUrl = (u) => /^https?:\/\/[^/]+\/[^/?#]+/.test(String(u || ''))

/** Cửa hàng hoa (LocalBusiness › Florist) — hiển thị thông tin doanh nghiệp trên Google. */
export function floristSchema(settings, siteUrl) {
  const s = settings || {}
  return {
    '@context': 'https://schema.org',
    '@type': 'Florist',
    '@id': joinUrl(siteUrl, '/') + '#store',
    name: s.shop_name,
    legalName: s.company_name || undefined,
    url: joinUrl(siteUrl, '/'),
    image: s.og_image || undefined,
    logo: joinUrl(siteUrl, '/favicon.svg'),
    telephone: s.hotline || undefined,
    email: s.email || undefined,
    priceRange: '₫₫',
    currenciesAccepted: 'VND',
    paymentAccepted: 'Cash, Bank transfer',
    openingHours: openingHours(s.open_hours),
    address: s.address
      ? { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'VN' }
      : undefined,
    sameAs: [s.facebook, s.instagram, s.tiktok].filter(isProfileUrl),
  }
}

/** WebSite + ô tìm kiếm (sitelinks search box). */
export function websiteSchema(settings, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings?.shop_name,
    url: joinUrl(siteUrl, '/'),
    inLanguage: 'vi-VN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: joinUrl(siteUrl, '/tim-kiem') + '?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** @param {{name: string, path: string}[]} items — không gồm "Trang chủ" */
export function breadcrumbSchema(items, siteUrl) {
  const all = [{ name: 'Trang chủ', path: '/' }, ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: joinUrl(siteUrl, it.path),
    })),
  }
}

export function itemListSchema(products, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: joinUrl(siteUrl, `/san-pham/${p.slug}`),
      name: p.name,
    })),
  }
}

export function productSchema(p, siteUrl, shopName) {
  const url = joinUrl(siteUrl, `/san-pham/${p.slug}`)
  const availability = p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const nextYear = `${new Date().getFullYear() + 1}-12-31`
  const offers =
    p.sizes?.length > 1
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'VND',
          lowPrice: Math.min(...p.sizes.map((s) => s.price)),
          highPrice: Math.max(...p.sizes.map((s) => s.price)),
          offerCount: p.sizes.length,
          availability,
          url,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: finalPrice(p, p.sizes?.[0]?.name),
          priceValidUntil: hasSale(p) ? undefined : nextYear,
          availability,
          itemCondition: 'https://schema.org/NewCondition',
          url,
          seller: { '@type': 'Organization', name: shopName },
        }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url + '#product',
    name: p.name,
    sku: p.sku,
    image: (p.images || []).map((u) => resizeImage(u, 1200)),
    description: truncate(p.short_desc || stripHtml(p.description), 5000),
    brand: { '@type': 'Brand', name: shopName },
    color: p.colors?.join(', ') || undefined,
    material: p.flowers?.join(', ') || undefined,
    offers,
  }
}

/** Bỏ các khoá undefined để JSON-LD gọn. */
export function cleanLd(obj) {
  return JSON.parse(JSON.stringify(obj))
}
