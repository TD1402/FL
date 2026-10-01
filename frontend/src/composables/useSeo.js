import { computed, toValue } from 'vue'
import { useHead } from '@unhead/vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * Meta title / description / Open Graph cho từng trang.
 * @param {() => {title?: string, description?: string, image?: string, noindex?: boolean}} getter
 */
export function useSeo(getter) {
  const settings = useSettingsStore()
  const siteUrl =
    import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const meta = computed(() => {
    const m = toValue(getter) || {}
    const shop = settings.shopName
    return {
      title: m.title ? `${m.title} | ${shop}` : settings.data.seo_title || shop,
      description: m.description || settings.data.seo_description || '',
      image: m.image || '',
      noindex: m.noindex,
    }
  })
  useHead(
    computed(() => {
      const m = meta.value
      const url = typeof window !== 'undefined' ? siteUrl + window.location.pathname : ''
      return {
        title: m.title,
        meta: [
          { name: 'description', content: m.description },
          { property: 'og:title', content: m.title },
          { property: 'og:description', content: m.description },
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: url },
          ...(m.image ? [{ property: 'og:image', content: m.image }] : []),
          { name: 'robots', content: m.noindex ? 'noindex,nofollow' : 'index,follow' },
        ],
      }
    }),
  )
}
