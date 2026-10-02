import { computed, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useSettingsStore } from '@/stores/settings'
import { cleanLd, joinUrl, pageTitle, shareImage, truncate } from '@/seo/schema'

/** URL gốc của site (canonical, og:url). Đặt VITE_SITE_URL khi deploy để canonical luôn đúng tên miền. */
export function siteUrl() {
  return (
    import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '')
}

/**
 * Meta SEO chuẩn cho một trang: title, description, canonical, robots, Open Graph, Twitter, JSON-LD.
 *
 * @param {() => {
 *   title?: string,          // tiêu đề trang (tự thêm " | Tên shop")
 *   description?: string,    // tự bỏ HTML và cắt ≤ 160 ký tự
 *   image?: string,          // ảnh chia sẻ
 *   path?: string,           // canonical path (mặc định: path hiện tại, bỏ query lọc/sắp xếp)
 *   type?: string,           // og:type (website | product | article)
 *   noindex?: boolean,       // trang không cần index (giỏ hàng, thanh toán…) — vẫn follow link
 *   private?: boolean,       // trang quản trị: noindex, nofollow
 *   meta?: object[],         // meta bổ sung (vd product:price:amount)
 *   jsonLd?: object[],       // structured data
 * }} getter
 */
export function useSeo(getter) {
  const settings = useSettingsStore()
  const route = useRoute()

  const head = computed(() => {
    const m = toValue(getter) || {}
    const s = settings.data
    const shop = settings.shopName
    const title = m.title ? pageTitle(m.title, shop) : s.seo_title || shop
    const description = truncate(m.description || s.seo_description || '')
    const url = joinUrl(siteUrl(), m.path ?? route.path)
    const image = shareImage(m.image || s.og_image || '')
    const robots = m.private
      ? 'noindex,nofollow'
      : m.noindex
        ? 'noindex,follow'
        : 'index,follow,max-image-preview:large'

    return {
      title,
      link: m.private || m.noindex ? [] : [{ rel: 'canonical', href: url, key: 'canonical' }],
      meta: [
        { name: 'description', content: description },
        { name: 'robots', content: robots },
        { property: 'og:site_name', content: shop },
        { property: 'og:locale', content: 'vi_VN' },
        { property: 'og:type', content: m.type || 'website' },
        { property: 'og:title', content: m.title || title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        ...(image
          ? [
              { property: 'og:image', content: image },
              { property: 'og:image:alt', content: m.title || title },
              { name: 'twitter:image', content: image },
            ]
          : []),
        { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: m.title || title },
        { name: 'twitter:description', content: description },
        ...(m.meta || []),
      ],
      script: (m.jsonLd || []).filter(Boolean).map((data, i) => ({
        key: `ld-${i}`,
        type: 'application/ld+json',
        innerHTML: JSON.stringify(cleanLd(data)),
      })),
    }
  })

  useHead(head)
}
