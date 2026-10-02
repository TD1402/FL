/**
 * SEO lúc build (chạy sau `vite build`):
 *  - Prerender HTML tĩnh cho từng trang công khai: <title>, description, canonical, Open Graph, JSON-LD
 *    và nội dung chính (h1, mô tả, danh sách sản phẩm) → Facebook/Zalo/Google đọc được không cần chạy JS.
 *  - Sinh sitemap.xml (kèm ảnh sản phẩm) và robots.txt.
 *  - dist/app.html (+ 404.html) = bản SPA sạch dùng làm fallback cho các route không prerender.
 *
 * Cần VITE_API_URL và VITE_SITE_URL (tên miền thật, vd https://hoamoc.vn). Thiếu → chỉ tạo robots + fallback.
 * Sản phẩm mới thêm vào Sheet cần build lại để có trang prerender (trang vẫn hoạt động bình thường nhờ SPA).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import {
  breadcrumbSchema,
  categoryDescription,
  cleanLd,
  floristSchema,
  itemListSchema,
  joinUrl,
  pageTitle,
  productDescription,
  productSchema,
  shareImage,
  stripHtml,
  truncate,
  websiteSchema,
} from '../src/seo/schema.js'
import { comparePrice, fromPrice, resizeImage } from '../src/utils/product.js'
import { STATIC_PAGES } from '../src/views/staticPages.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const env = loadEnv(process.env.MODE || 'production', ROOT, '')
const API = env.VITE_API_URL
const SITE = (env.VITE_SITE_URL || '').replace(/\/+$/, '')

const PRIVATE_PATHS = [
  '/admin',
  '/gio-hang',
  '/thanh-toan',
  '/dat-hang-thanh-cong',
  '/tim-kiem',
  '/yeu-thich',
]
const STATIC_ROUTES = {
  about: '/gioi-thieu',
  shipping: '/chinh-sach-giao-hang',
  return: '/chinh-sach-doi-tra',
  privacy: '/chinh-sach-bao-mat',
}

const log = (...a) => console.log('[seo]', ...a)
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
const money = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))}₫`

/* ------------------------------- API -------------------------------- */

async function api(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params })
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API}?${qs}`, { redirect: 'follow', signal: AbortSignal.timeout(30000) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    } catch (e) {
      if (attempt === 3) throw new Error(`${action}: ${e.message}`, { cause: e })
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
}

async function allProducts(params = {}) {
  const out = []
  for (let page = 1; ; page++) {
    const r = await api('getProducts', { ...params, page, limit: 60 })
    out.push(...r.items)
    if (out.length >= r.total || !r.items.length) return out
  }
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (i < list.length) {
        const idx = i++
        out[idx] = await fn(list[idx])
      }
    }),
  )
  return out
}

/* ------------------------------ Render ------------------------------ */

function headTags(page, settings) {
  const url = joinUrl(SITE, page.path)
  const image = shareImage(page.image || settings.og_image || '')
  const title = page.ogTitle || page.title
  const tags = [
    `<meta name="description" content="${esc(page.description)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(settings.shop_name)}">`,
    `<meta property="og:locale" content="vi_VN">`,
    `<meta property="og:type" content="${page.type || 'website'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(page.description)}">`,
    ...(image
      ? [
          `<meta property="og:image" content="${esc(image)}">`,
          `<meta property="og:image:alt" content="${esc(title)}">`,
          `<meta name="twitter:image" content="${esc(image)}">`,
        ]
      : []),
    ...(page.meta || []).map((m) => `<meta property="${esc(m.property)}" content="${esc(m.content)}">`),
    ...(page.jsonLd || [])
      .filter(Boolean)
      .map(
        (d) =>
          `<script type="application/ld+json">${JSON.stringify(cleanLd(d)).replace(/</g, '\\u003c')}</script>`,
      ),
  ]
  return tags.map((t) => t.replace(/^<(\w+)/, '<$1 data-prerender')).join('\n    ')
}

function productLinks(products) {
  if (!products.length) return ''
  return `<ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:24px;list-style:none;padding:0">${products
    .map((p) => {
      const compare = comparePrice(p)
      return `<li><a href="/san-pham/${esc(p.slug)}" style="color:inherit;text-decoration:none">
        <img src="${esc(resizeImage(p.images?.[0] || '', 400))}" alt="${esc(p.name)}" width="400" height="533" loading="lazy" style="width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;background:#f3f2f0">
        <span style="display:block;margin-top:8px">${esc(p.name)}</span>
        <b>${money(fromPrice(p))}</b>${compare ? ` <s style="color:#6b6b6b">${money(compare)}</s>` : ''}</a></li>`
    })
    .join('')}</ul>`
}

function bodyHtml(page, ctx) {
  const nav = [
    ['/hang-moi', 'Hoa mới'],
    ['/ban-chay', 'Bán chạy'],
    ...ctx.categories.filter((c) => c.depth > 0).map((c) => [c.href, c.name]),
    ['/lien-he', 'Liên hệ'],
  ]
  const crumbs = page.crumbs?.length
    ? `<nav aria-label="Breadcrumb"><a href="/">Trang chủ</a>${page.crumbs
        .map((c) => ` / <a href="${esc(c.path)}">${esc(c.name)}</a>`)
        .join('')}</nav>`
    : ''
  return `<div data-prerender style="max-width:1280px;margin:0 auto;padding:24px 16px;font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#111">
  <header><a href="/" style="font-family:'Cormorant Garamond',serif;font-size:28px;letter-spacing:.2em;text-transform:uppercase;color:inherit;text-decoration:none">${esc(ctx.settings.shop_name)}</a>
  <nav aria-label="Menu" style="margin:12px 0 24px;font-size:13px;line-height:2">${nav
    .map(
      ([href, label]) => `<a href="${esc(href)}" style="margin-right:16px;color:inherit">${esc(label)}</a>`,
    )
    .join('')}</nav></header>
  <main>${crumbs}
    <h1 style="font-family:'Cormorant Garamond',serif;font-weight:500">${esc(page.h1 || page.title)}</h1>
    ${page.content || `<p>${esc(page.description)}</p>`}
  </main>
  <footer style="margin-top:48px;font-size:13px;color:#6b6b6b">${esc(ctx.settings.company_name || ctx.settings.shop_name)} · ${esc(ctx.settings.address || '')} · Hotline <a href="tel:${esc(ctx.settings.hotline)}">${esc(ctx.settings.hotline || '')}</a></footer>
</div>`
}

function renderHtml(template, page, ctx) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title data-prerender>${esc(page.title)}</title>`)
    .replace(/\s*<meta[^>]*name="description"[^>]*>/, '')
    .replace('</head>', `    ${headTags(page, ctx.settings)}\n  </head>`)
    .replace('<div id="app"></div>', `<div id="app">${bodyHtml(page, ctx)}</div>`)
}

async function writePage(routePath, html) {
  const file = routePath === '/' ? path.join(DIST, 'index.html') : path.join(DIST, routePath, 'index.html')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, html)
}

/* ------------------------------- Main ------------------------------- */

async function main() {
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')
  // Fallback SPA sạch (Vercel/Netlify rewrite về đây; GitHub Pages dùng 404.html)
  await fs.writeFile(path.join(DIST, 'app.html'), template)
  await fs.writeFile(path.join(DIST, '404.html'), template)

  const robots = ['User-agent: *', 'Allow: /', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`)]
  if (SITE) robots.push('', `Sitemap: ${SITE}/sitemap.xml`)
  await fs.writeFile(path.join(DIST, 'robots.txt'), robots.join('\n') + '\n')

  if (!SITE || !API) {
    log('⚠️  Thiếu VITE_SITE_URL hoặc VITE_API_URL → bỏ qua prerender & sitemap (chỉ tạo robots.txt).')
    return
  }

  log('Lấy dữ liệu từ API…')
  const [settings, tree, products] = await Promise.all([
    api('getSettings'),
    api('getCategories'),
    allProducts(),
  ])
  const shop = settings.shop_name || 'Shop hoa'
  const details = await mapLimit(products, 4, (p) =>
    api('getProduct', { slug: p.slug }).then((r) => r.product),
  )

  // Danh mục phẳng; con của "Bộ sưu tập" dùng URL /bo-suu-tap/:slug
  const categories = []
  const walk = (list, depth, parent) =>
    list.forEach((c) => {
      const isCollection = parent?.slug === 'bo-suu-tap'
      categories.push({
        ...c,
        depth,
        parent,
        href: isCollection ? `/bo-suu-tap/${c.slug}` : `/danh-muc/${c.slug}`,
      })
      walk(c.children || [], depth + 1, c)
    })
  walk(tree, 0, null)
  const ctx = { settings, categories }

  const listPage = (p) => ({
    ...p,
    title: pageTitle(p.h1, shop),
    ogTitle: p.h1,
    image: p.products[0]?.images?.[0],
    content: `<p>${esc(p.description)}</p>${productLinks(p.products)}`,
    jsonLd: [
      breadcrumbSchema(p.crumbs || [{ name: p.h1, path: p.path }], SITE),
      p.products.length ? itemListSchema(p.products, SITE) : null,
    ],
  })

  const pages = []

  // Trang chủ
  pages.push({
    path: '/',
    title: settings.seo_title || shop,
    h1: settings.seo_title || shop,
    description: truncate(settings.seo_description || ''),
    image: settings.og_image || products[0]?.images?.[0],
    content: `<p>${esc(settings.seo_description || '')}</p><h2>Sản phẩm</h2>${productLinks(products.slice(0, 24))}`,
    jsonLd: [floristSchema(settings, SITE), websiteSchema(settings, SITE)],
    priority: '1.0',
    changefreq: 'daily',
  })

  // Danh sách tổng hợp
  for (const [p, h1, filter] of [
    ['/hang-moi', 'Hoa mới', (x) => x.is_new],
    ['/ban-chay', 'Bán chạy', (x) => x.is_best_seller],
    ['/san-pham', 'Tất cả sản phẩm', () => true],
  ]) {
    const list = products.filter(filter)
    if (!list.length) continue
    pages.push(
      listPage({
        path: p,
        h1,
        description: categoryDescription(p === '/san-pham' ? 'Hoa tươi' : h1, shop),
        products: list,
        priority: '0.8',
        changefreq: 'daily',
      }),
    )
  }

  // Danh mục & bộ sưu tập
  const catProducts = await mapLimit(categories, 4, (c) =>
    allProducts(c.href.startsWith('/bo-suu-tap/') ? { collection: c.slug } : { category: c.slug }),
  )
  categories.forEach((c, i) => {
    const list = catProducts[i]
    if (!list.length) return
    const crumbs = [
      ...(c.parent ? [{ name: c.parent.name, path: `/danh-muc/${c.parent.slug}` }] : []),
      { name: c.name, path: c.href },
    ]
    pages.push(
      listPage({
        path: c.href,
        h1: c.name,
        description: categoryDescription(c.name, shop),
        products: list,
        crumbs,
        priority: '0.7',
        changefreq: 'weekly',
      }),
    )
  })

  // Sản phẩm
  for (const p of details) {
    const cat = categories.find((c) => c.depth > 0 && p.category_ids.includes(c.id))
    const crumbs = [
      ...(cat ? [{ name: cat.name, path: cat.href }] : []),
      { name: p.name, path: `/san-pham/${p.slug}` },
    ]
    const compare = comparePrice(p)
    const sizes = p.sizes?.length
      ? `<p>Kích cỡ: ${p.sizes.map((s) => `${esc(s.name)} — ${money(s.price)}`).join(' · ')}</p>`
      : ''
    pages.push({
      path: `/san-pham/${p.slug}`,
      title: pageTitle(p.name, shop),
      ogTitle: p.name,
      h1: p.name,
      type: 'product',
      description: productDescription(p, shop),
      image: p.images?.[0],
      crumbs,
      meta: [
        { property: 'product:price:amount', content: String(fromPrice(p)) },
        { property: 'product:price:currency', content: 'VND' },
        { property: 'product:availability', content: p.stock > 0 ? 'in stock' : 'out of stock' },
      ],
      content: `${p.images
        .slice(0, 4)
        .map(
          (u, i) =>
            `<img src="${esc(resizeImage(u, 800))}" alt="${esc(`${p.name} ${i + 1}`)}" width="800" height="1067" style="max-width:360px;width:100%;height:auto">`,
        )
        .join('')}
        <p><b>${money(fromPrice(p))}</b>${compare ? ` <s>${money(compare)}</s>` : ''}</p>${sizes}
        <p>${esc(p.short_desc)}</p>
        <div>${String(p.description || '').replace(/<script[\s\S]*?<\/script>/gi, '')}</div>
        ${p.flowers?.length ? `<p>Thành phần hoa: ${esc(p.flowers.join(', '))}</p>` : ''}`,
      jsonLd: [productSchema(p, SITE, shop), breadcrumbSchema(crumbs, SITE)],
      lastmod: p.updated_at,
      images: p.images,
      priority: '0.9',
      changefreq: 'weekly',
    })
  }

  // Trang tĩnh
  const vars = {
    shop,
    hotline: settings.hotline,
    email: settings.email,
    address: settings.address,
    fee: money(Number(settings.shipping_fee_default)),
    free: money(Number(settings.free_ship_from)),
  }
  for (const [key, route] of Object.entries(STATIC_ROUTES)) {
    const sp = STATIC_PAGES[key]
    const html = sp.html.replace(/\{(\w+)\}/g, (_, k) => esc(vars[k] ?? ''))
    const crumbs = [{ name: sp.title, path: route }]
    pages.push({
      path: route,
      title: pageTitle(sp.title, shop),
      ogTitle: sp.title,
      h1: sp.title,
      description: truncate(stripHtml(html)),
      image: sp.image,
      crumbs,
      content: html,
      jsonLd: [breadcrumbSchema(crumbs, SITE)],
      priority: '0.4',
      changefreq: 'monthly',
    })
  }
  pages.push({
    path: '/lien-he',
    title: pageTitle('Liên hệ đặt hoa', shop),
    ogTitle: 'Liên hệ đặt hoa',
    h1: 'Liên hệ',
    description: truncate(
      `Liên hệ ${shop} đặt hoa theo yêu cầu, hoa sự kiện, hoa cưới. Hotline ${settings.hotline || ''} · ${settings.address || ''}`,
    ),
    content: `<p>Địa chỉ: ${esc(settings.address)}</p><p>Hotline: <a href="tel:${esc(settings.hotline)}">${esc(settings.hotline)}</a></p><p>Email: ${esc(settings.email)}</p><p>Giờ mở cửa: ${esc(settings.open_hours)}</p>`,
    jsonLd: [floristSchema(settings, SITE)],
    priority: '0.5',
    changefreq: 'monthly',
  })

  for (const page of pages) await writePage(page.path, renderHtml(template, page, ctx))

  // Sitemap (kèm ảnh sản phẩm)
  const today = new Date().toISOString().slice(0, 10)
  const urls = pages
    .map((p) => {
      const images = (p.images || [])
        .slice(0, 5)
        .map(
          (u) =>
            `\n    <image:image><image:loc>${esc(resizeImage(u, 1200, { proxy: false }))}</image:loc></image:image>`,
        )
        .join('')
      return `  <url>\n    <loc>${esc(joinUrl(SITE, p.path))}</loc>\n    <lastmod>${String(p.lastmod || today).slice(0, 10)}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${images}\n  </url>`
    })
    .join('\n')
  await fs.writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`,
  )

  log(`✓ Prerender ${pages.length} trang (${details.length} sản phẩm) · sitemap.xml · robots.txt`)
}

main().catch((e) => {
  // Lỗi API không làm hỏng bản build: site vẫn chạy như SPA bình thường.
  console.warn('[seo] ⚠️  Bỏ qua prerender:', e.message)
})
