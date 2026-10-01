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

/** Đổi URL ảnh sang kích thước nhỏ hơn (Unsplash / Google) để tiết kiệm băng thông. */
export function resizeImage(url, width) {
  if (!url) return ''
  url = driveToLh3(url)
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url)
    const ratio = Number(u.searchParams.get('h')) / Number(u.searchParams.get('w')) || 0
    u.searchParams.set('w', String(width))
    if (ratio) u.searchParams.set('h', String(Math.round(width * ratio)))
    return u.toString()
  }
  if (url.includes('googleusercontent.com/d/')) return url.replace(/=w\d+$/, '') + `=w${width}`
  return url
}
