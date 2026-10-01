/**
 * Products.gs — danh sách, lọc, chi tiết sản phẩm.
 */

/** Chuẩn hoá một dòng Products: tách list, parse sizes, tính giá cuối. */
function parseProduct_(row) {
  const p = Object.assign({}, row);
  p.category_ids = splitList_(row.category_ids);
  p.images = splitList_(row.images);
  p.colors = splitList_(row.colors);
  p.flowers = splitList_(row.flowers);
  p.tags = splitList_(row.tags);
  p.sizes = (parseJson_(row.sizes, []) || [])
    .filter(function (s) { return s && s.name; })
    .map(function (s) { return { name: String(s.name), price: Number(s.price) || 0 }; });
  p.final_price = effectivePrice_(p);
  return p;
}

/** Giá cuối = sale_price (nếu > 0 và nhỏ hơn price) hoặc price. */
function effectivePrice_(p) {
  return p.sale_price > 0 && (p.sale_price < p.price || !p.price) ? p.sale_price : p.price;
}

/** Giá theo size (nếu có) — dùng ở server khi tạo đơn. */
function unitPrice_(p, sizeName) {
  if (p.sizes && p.sizes.length) {
    const size = p.sizes.find(function (s) { return s.name === sizeName; });
    if (!size) throw new Error('Kích cỡ "' + sizeName + '" không hợp lệ cho ' + p.name);
    return size.price;
  }
  return effectivePrice_(p);
}

/** Sản phẩm đang bán (đã parse) — có cache. */
function getPublicProducts_() {
  return withCache_('products_all', function () {
    return getSheetData(SHEETS.PRODUCTS)
      .filter(function (p) { return p.is_active; })
      .map(parseProduct_);
  });
}

function toListItem_(p) {
  const o = Object.assign({}, p);
  delete o.description;
  return o;
}

function uniqueSorted_(arrays) {
  const set = {};
  arrays.forEach(function (arr) { arr.forEach(function (x) { if (x) set[x] = true; }); });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
}

/**
 * GET getProducts
 * params: category, collection, q, minPrice, maxPrice, color, flower, sort, page, limit, isNew, isBestSeller
 * → { items, total, page, limit, facets }
 */
function getProducts(params) {
  const p = params || {};
  let list = getPublicProducts_();

  if (p.category) {
    // Khớp theo category_ids, hoặc theo cột collection (bộ sưu tập là danh mục con của "bo-suu-tap").
    const ids = getCategoryIdsWithDescendants_(p.category);
    const slugs = getActiveCategories_()
      .filter(function (c) { return ids.indexOf(c.id) >= 0; })
      .map(function (c) { return c.slug; });
    list = list.filter(function (x) {
      return x.category_ids.some(function (id) { return ids.indexOf(id) >= 0; }) ||
        splitList_(x.collection).some(function (s) { return slugs.indexOf(s) >= 0; });
    });
  }
  if (p.collection) {
    list = list.filter(function (x) { return splitList_(x.collection).indexOf(p.collection) >= 0; });
  }
  if (p.q) {
    const words = removeAccents_(p.q).split(/\s+/).filter(String);
    list = list.filter(function (x) {
      const hay = removeAccents_([x.name, x.sku, x.short_desc, x.tags.join(' '), x.flowers.join(' '), x.colors.join(' ')].join(' '));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  if (toBool_(p.isNew)) list = list.filter(function (x) { return x.is_new; });
  if (toBool_(p.isBestSeller)) list = list.filter(function (x) { return x.is_best_seller; });

  // Facets tính trước khi lọc giá/màu/loại hoa để bộ lọc luôn đủ lựa chọn.
  const prices = list.map(function (x) { return x.final_price; });
  const facets = {
    colors: uniqueSorted_(list.map(function (x) { return x.colors; })),
    flowers: uniqueSorted_(list.map(function (x) { return x.flowers; })),
    minPrice: prices.length ? Math.min.apply(null, prices) : 0,
    maxPrice: prices.length ? Math.max.apply(null, prices) : 0,
  };

  const minPrice = Number(p.minPrice) || 0;
  const maxPrice = Number(p.maxPrice) || 0;
  if (minPrice) list = list.filter(function (x) { return x.final_price >= minPrice; });
  if (maxPrice) list = list.filter(function (x) { return x.final_price <= maxPrice; });
  if (p.color) {
    const colors = splitList_(p.color);
    list = list.filter(function (x) { return x.colors.some(function (c) { return colors.indexOf(c) >= 0; }); });
  }
  if (p.flower) {
    const flowers = splitList_(p.flower);
    list = list.filter(function (x) { return x.flowers.some(function (f) { return flowers.indexOf(f) >= 0; }); });
  }

  const byNewest = function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); };
  const sorters = {
    newest: byNewest,
    price_asc: function (a, b) { return a.final_price - b.final_price; },
    price_desc: function (a, b) { return b.final_price - a.final_price; },
    best_seller: function (a, b) { return (b.is_best_seller - a.is_best_seller) || byNewest(a, b); },
  };
  list = list.slice().sort(sorters[p.sort] || byNewest);

  const limit = Math.min(Math.max(toInt_(p.limit, 12), 1), 60);
  const page = Math.max(toInt_(p.page, 1), 1);
  return {
    items: list.slice((page - 1) * limit, page * limit).map(toListItem_),
    total: list.length,
    page: page,
    limit: limit,
    facets: facets,
  };
}

/** GET getProduct — sản phẩm + sản phẩm liên quan (cùng danh mục). */
function getProduct(slug) {
  if (!slug) throw new Error('Thiếu slug');
  const all = getPublicProducts_();
  const product = all.find(function (p) { return p.slug === slug; });
  if (!product) throw new Error('Không tìm thấy sản phẩm');
  const related = all
    .filter(function (p) {
      return p.id !== product.id && p.category_ids.some(function (id) { return product.category_ids.indexOf(id) >= 0; });
    })
    .sort(function (a, b) { return b.is_best_seller - a.is_best_seller; })
    .slice(0, 8)
    .map(toListItem_);
  return { product: product, related: related };
}
