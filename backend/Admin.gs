/**
 * Admin.gs — API quản trị: list / get / save / delete, upload ảnh, dashboard.
 * Mọi hàm ở đây chỉ được gọi qua ADMIN_POST_ROUTES (đã kiểm tra token).
 */

function resourceSheet_(resource) {
  const sheet = ADMIN_RESOURCES[resource];
  if (!sheet) throw new Error('Resource không hợp lệ: ' + resource);
  return sheet;
}

/** Chuẩn hoá bản ghi trả về cho admin (parse JSON / list). */
function adminView_(resource, row) {
  if (resource === 'products') return parseProduct_(row);
  if (resource === 'orders') return parseOrder_(row);
  return row;
}

/**
 * POST adminList {resource, filters: {q, status, is_active, date_from, date_to}, page, limit}
 * → {items, total, page, limit}
 */
function adminList(data) {
  const resource = data.resource;
  if (resource === 'settings') return { items: [getAllSettings_()], total: 1, page: 1 };
  const sheet = resourceSheet_(resource);
  const f = data.filters || {};
  let list = getSheetData(sheet);

  if (f.q) {
    const q = removeAccents_(f.q);
    list = list.filter(function (r) {
      return removeAccents_(Object.keys(r).map(function (k) { return r[k]; }).join(' ')).indexOf(q) >= 0;
    });
  }
  if (f.status) list = list.filter(function (r) { return r.status === f.status; });
  if (f.payment_status) list = list.filter(function (r) { return r.payment_status === f.payment_status; });
  if (f.is_active !== undefined && f.is_active !== '') {
    const active = toBool_(f.is_active);
    list = list.filter(function (r) { return r.is_active === active; });
  }
  if (resource === 'contacts' && !f.status) list = list.filter(function (r) { return r.status !== 'deleted'; });
  if (f.date_from) list = list.filter(function (r) { return String(r.created_at).slice(0, 10) >= f.date_from; });
  if (f.date_to) list = list.filter(function (r) { return String(r.created_at).slice(0, 10) <= f.date_to; });
  if (f.delivery_date) list = list.filter(function (r) { return r.delivery_date === f.delivery_date; });

  if (list.length && 'created_at' in list[0]) {
    list.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  } else if (list.length && 'sort_order' in list[0]) {
    list.sort(function (a, b) { return a.sort_order - b.sort_order; });
  }

  const limit = Math.min(Math.max(toInt_(data.limit, 20), 1), 500);
  const page = Math.max(toInt_(data.page, 1), 1);
  return {
    items: list.slice((page - 1) * limit, page * limit).map(function (r) { return adminView_(resource, r); }),
    total: list.length,
    page: page,
    limit: limit,
  };
}

/** POST adminGet {resource, id} */
function adminGet(data) {
  const sheet = resourceSheet_(data.resource);
  const row = findBy(sheet, ID_FIELDS[sheet] || 'id', data.id);
  if (!row) throw new Error('Không tìm thấy bản ghi');
  return adminView_(data.resource, row);
}

/** Đảm bảo slug duy nhất trong sheet. */
function uniqueSlug_(sheet, base, selfId) {
  const taken = {};
  getSheetData(sheet).forEach(function (r) { if (r.id !== selfId) taken[r.slug] = true; });
  let slug = base || shortId_();
  for (let i = 2; taken[slug]; i++) slug = base + '-' + i;
  return slug;
}

/** Làm sạch dữ liệu theo từng resource trước khi ghi. */
function cleanItem_(resource, item, existing) {
  const it = Object.assign({}, existing || {}, item); // cập nhật một phần: giữ các trường cũ
  const now = nowIso_();

  if (resource === 'products') {
    it.name = requireText_(it.name, 'tên sản phẩm', 200);
    it.slug = uniqueSlug_(SHEETS.PRODUCTS, slugify_(it.slug || it.name), existing && existing.id);
    if (!it.sku) it.sku = 'HM' + String(Date.now()).slice(-6);
    if ('images' in it) it.images = splitList_(it.images).map(normalizeImageUrl_);
    ['category_ids', 'images', 'colors', 'flowers', 'tags'].forEach(function (k) {
      if (k in it) it[k] = splitList_(it[k]).join(',');
    });
    if ('sizes' in it) {
      const sizes = parseJson_(it.sizes, []);
      if (!Array.isArray(sizes)) throw new Error('Kích cỡ không hợp lệ');
      it.sizes = JSON.stringify(
        sizes.filter(function (s) { return s && s.name; })
          .map(function (s) { return { name: str_(s.name, 50), price: Math.max(0, Math.round(Number(s.price) || 0)) }; })
      );
    }
    if (Number(it.price) < 0 || Number(it.sale_price) < 0) throw new Error('Giá không hợp lệ');
    it.description = String(it.description || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
    it.updated_at = now;
    if (!existing) it.created_at = now;
  }

  if (resource === 'categories') {
    it.name = requireText_(it.name, 'tên danh mục', 100);
    it.slug = uniqueSlug_(SHEETS.CATEGORIES, slugify_(it.slug || it.name), existing && existing.id);
    if (existing && it.parent_id === existing.id) throw new Error('Danh mục cha không hợp lệ');
    it.image = normalizeImageUrl_(it.image);
  }

  if (resource === 'banners') {
    it.image = normalizeImageUrl_(requireText_(it.image, 'ảnh banner', 1000));
    it.image_mobile = normalizeImageUrl_(it.image_mobile);
    if (['hero', 'promo', 'collection'].indexOf(it.position) < 0) it.position = 'hero';
  }

  if (resource === 'coupons') {
    it.code = requireText_(it.code, 'mã giảm giá', 50).toUpperCase().replace(/\s+/g, '');
    if (['percent', 'fixed'].indexOf(it.type) < 0) throw new Error('Loại giảm giá không hợp lệ');
    if (it.type === 'percent' && (Number(it.value) <= 0 || Number(it.value) > 100)) throw new Error('Phần trăm giảm phải từ 1 đến 100');
  }

  if (resource === 'contacts') {
    if (!existing) throw new Error('Không thể tạo liên hệ từ trang quản trị');
    return { status: CONTACT_STATUSES.indexOf(it.status) >= 0 ? it.status : existing.status };
  }

  return it;
}

/**
 * POST adminSave {resource, item, create?} — có id → update, không có → create.
 * Với coupons (khoá là `code`), gửi `create: true` để báo lỗi khi mã đã tồn tại.
 */
function adminSave(data) {
  const resource = data.resource;
  if (resource === 'settings') return saveSettings_(data.item);
  if (resource === 'orders' || resource === 'subscribers') throw new Error('Dùng updateOrderStatus để cập nhật đơn hàng');
  const sheet = resourceSheet_(resource);
  const idField = ID_FIELDS[sheet] || 'id';
  const item = data.item || {};
  const headers = HEADERS[sheet];

  if (resource === 'coupons' && item.code) item.code = String(item.code).toUpperCase().replace(/\s+/g, '');
  const id = item[idField];
  const existing = id ? findBy(sheet, idField, id) : null;
  if (id && !existing && idField === 'id') throw new Error('Không tìm thấy bản ghi để cập nhật');
  if (existing && data.create) throw new Error('Mã "' + id + '" đã tồn tại');

  const clean = cleanItem_(resource, item, existing);
  const row = {};
  headers.forEach(function (h) { if (h in clean) row[h] = clean[h]; });

  let saved;
  if (existing) {
    delete row[idField];
    saved = updateRowById(sheet, existing[idField], row);
  } else {
    if (idField === 'id') row.id = shortId_();
    if (headers.indexOf('is_active') >= 0 && !('is_active' in row)) row.is_active = true;
    if (resource === 'coupons') row.used_count = 0;
    saved = appendRow(sheet, row);
  }
  clearCache_();
  return adminView_(resource, saved);
}

/** POST adminDelete {resource, id} — xoá mềm. */
function adminDelete(data) {
  const sheet = resourceSheet_(data.resource);
  if (data.resource === 'orders') throw new Error('Không xoá đơn hàng — hãy chuyển sang trạng thái Đã huỷ');
  const patch = data.resource === 'contacts' ? { status: 'deleted' } : { is_active: false };
  updateRowById(sheet, data.id, patch);
  clearCache_();
  return true;
}

/* -------------------------- Upload ảnh -------------------------- */

function getUploadFolder_() {
  const id = getProp_('DRIVE_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const folder = DriveApp.createFolder('FlowerShop Images');
  setProp_('DRIVE_FOLDER_ID', folder.getId());
  return folder;
}

/** POST uploadImage {filename, mimeType, base64} → {id, url} */
function uploadImage(data) {
  const mime = str_(data.mimeType, 50);
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF');
  const b64 = String(data.base64 || '').replace(/^data:[^,]+,/, '');
  const bytes = Utilities.base64Decode(b64);
  if (!bytes.length) throw new Error('Ảnh trống');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Ảnh vượt quá 5MB');
  const name = slugify_(str_(data.filename, 100).replace(/\.[^.]+$/, '')) || 'image';
  const blob = Utilities.newBlob(bytes, mime, Date.now() + '-' + name);
  const file = getUploadFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: file.getId(), url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1000' };
}

/* --------------------------- Dashboard --------------------------- */

/** POST getDashboard → doanh thu hôm nay/tháng, đơn theo trạng thái, top sản phẩm, doanh thu 14 ngày. */
function getDashboard() {
  const orders = getSheetData(SHEETS.ORDERS);
  const now = new Date();
  const today = formatDate_(now, 'yyyy-MM-dd');
  const month = today.slice(0, 7);
  const localDay = function (iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso).slice(0, 10) : formatDate_(d, 'yyyy-MM-dd');
  };

  const days = [];
  for (let i = 13; i >= 0; i--) days.push(formatDate_(new Date(now.getTime() - i * 86400000), 'yyyy-MM-dd'));
  const revenueByDay = {};
  days.forEach(function (d) { revenueByDay[d] = 0; });

  const byStatus = {};
  ORDER_STATUSES.forEach(function (s) { byStatus[s] = 0; });
  const productStats = {};
  let revenueToday = 0, revenueMonth = 0, ordersToday = 0, ordersMonth = 0;

  orders.forEach(function (o) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const day = localDay(o.created_at);
    if (day === today) ordersToday++;
    if (day.slice(0, 7) === month) ordersMonth++;
    if (o.status === 'cancelled') return;
    if (day === today) revenueToday += o.total;
    if (day.slice(0, 7) === month) revenueMonth += o.total;
    if (day in revenueByDay) revenueByDay[day] += o.total;
    parseJson_(o.items, []).forEach(function (it) {
      const s = productStats[it.product_id] || (productStats[it.product_id] = { product_id: it.product_id, name: it.name, image: it.image, qty: 0, revenue: 0 });
      s.qty += Number(it.qty) || 0;
      s.revenue += Number(it.line_total) || 0;
    });
  });

  const topProducts = Object.keys(productStats)
    .map(function (k) { return productStats[k]; })
    .sort(function (a, b) { return b.qty - a.qty; })
    .slice(0, 5);

  const recentOrders = orders
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .slice(0, 8)
    .map(function (o) {
      return { id: o.id, order_code: o.order_code, created_at: o.created_at, customer_name: o.customer_name, total: o.total, status: o.status };
    });

  const newContacts = getSheetData(SHEETS.CONTACTS).filter(function (c) { return c.status === 'new'; }).length;
  const lowStock = getSheetData(SHEETS.PRODUCTS).filter(function (p) { return p.is_active && p.stock <= 5; }).length;

  return {
    revenueToday: revenueToday,
    revenueMonth: revenueMonth,
    ordersToday: ordersToday,
    ordersMonth: ordersMonth,
    byStatus: byStatus,
    topProducts: topProducts,
    recentOrders: recentOrders,
    revenueByDay: days.map(function (d) { return { date: d, revenue: revenueByDay[d] }; }),
    newContacts: newContacts,
    lowStock: lowStock,
  };
}
