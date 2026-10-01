/**
 * Orders.gs — tạo đơn (tính lại giá ở server), tra cứu, đổi trạng thái, thông báo.
 */

/** Kiểm tra ngày + khung giờ giao theo múi giờ của script. */
function validateDelivery_(date, slot) {
  const d = str_(date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Vui lòng chọn ngày giao');
  const now = new Date();
  const today = formatDate_(now, 'yyyy-MM-dd');
  if (d < today) throw new Error('Ngày giao không được ở quá khứ');
  if (d > formatDate_(new Date(now.getTime() + 90 * 86400000), 'yyyy-MM-dd')) {
    throw new Error('Chỉ nhận đặt hoa trước tối đa 90 ngày');
  }
  const s = TIME_SLOTS.find(function (x) { return x[0] === slot; });
  if (!s) throw new Error('Vui lòng chọn khung giờ giao');
  if (d === today) {
    const hourNow = Number(formatDate_(now, 'H')) + Number(formatDate_(now, 'm')) / 60;
    if (s[1] < hourNow + PREP_HOURS) throw new Error('Khung giờ ' + s[0] + ' hôm nay đã hết, vui lòng chọn khung giờ khác');
  }
  return { date: d, slot: s[0] };
}

function nextOrderCode_() {
  const prefix = 'HOA' + formatDate_(new Date(), 'yyMMdd');
  let max = 0;
  getSheetData(SHEETS.ORDERS).forEach(function (o) {
    const code = String(o.order_code);
    if (code.indexOf(prefix) === 0) max = Math.max(max, Number(code.slice(prefix.length)) || 0);
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

/** Cộng/trừ tồn kho theo danh sách item. sign = -1 trừ, +1 hoàn. Gọi bên trong lock. */
function adjustStock_(items, sign) {
  const qtyById = {};
  items.forEach(function (it) { qtyById[it.product_id] = (qtyById[it.product_id] || 0) + Number(it.qty || 0); });
  Object.keys(qtyById).forEach(function (id) {
    const p = findBy(SHEETS.PRODUCTS, 'id', id);
    if (!p) return;
    updateRowById(SHEETS.PRODUCTS, id, { stock: p.stock + sign * qtyById[id], updated_at: nowIso_() });
  });
}

/**
 * POST createOrder
 * data: { customer_name, customer_phone, customer_email, receiver_name, receiver_phone, address, district,
 *         city, delivery_date, delivery_time_slot, card_message, note, coupon_code, payment_method,
 *         items: [{ product_id, size, qty }] }
 */
function createOrder(data) {
  const d = data || {};
  if (str_(d.website, 100)) throw new Error('Yêu cầu không hợp lệ'); // honeypot chống bot

  const customerPhone = assertPhone_(d.customer_phone, 'Số điện thoại người đặt');
  const order = {
    customer_name: requireText_(d.customer_name, 'họ tên người đặt', 100),
    customer_phone: customerPhone,
    customer_email: assertEmail_(d.customer_email, false),
    receiver_name: str_(d.receiver_name, 100) || str_(d.customer_name, 100),
    receiver_phone: d.receiver_phone ? assertPhone_(d.receiver_phone, 'Số điện thoại người nhận') : customerPhone,
    address: requireText_(d.address, 'địa chỉ giao hàng', 300),
    district: requireText_(d.district, 'quận/huyện', 100),
    city: requireText_(d.city, 'tỉnh/thành phố', 100),
    card_message: str_(d.card_message, 500),
    note: str_(d.note, 500),
    payment_method: PAYMENT_METHODS.indexOf(d.payment_method) >= 0 ? d.payment_method : 'COD',
  };
  const delivery = validateDelivery_(d.delivery_date, d.delivery_time_slot);
  order.delivery_date = delivery.date;
  order.delivery_time_slot = delivery.slot;

  const rawItems = Array.isArray(d.items) ? d.items : [];
  if (!rawItems.length) throw new Error('Giỏ hàng trống');
  if (rawItems.length > 50) throw new Error('Quá nhiều sản phẩm trong một đơn');

  const result = withLock_(function () {
    // Đọc trực tiếp từ sheet (không cache) để giá & tồn kho luôn mới nhất.
    const products = {};
    getSheetData(SHEETS.PRODUCTS).forEach(function (r) { products[r.id] = parseProduct_(r); });

    const need = {};
    const items = rawItems.map(function (it) {
      const p = products[it.product_id];
      if (!p || !p.is_active) throw new Error('Sản phẩm không còn kinh doanh');
      const qty = toInt_(it.qty, 0);
      if (qty < 1 || qty > 99) throw new Error('Số lượng không hợp lệ: ' + p.name);
      const price = unitPrice_(p, str_(it.size, 50));
      need[p.id] = (need[p.id] || 0) + qty;
      if (need[p.id] > p.stock) throw new Error('"' + p.name + '" chỉ còn ' + Math.max(p.stock, 0) + ' sản phẩm');
      return {
        product_id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        image: p.images[0] || '',
        size: p.sizes.length ? str_(it.size, 50) : '',
        qty: qty,
        price: price,
        line_total: price * qty,
      };
    });

    const subtotal = items.reduce(function (s, it) { return s + it.line_total; }, 0);
    let discount = 0;
    let couponCode = '';
    if (str_(d.coupon_code, 50)) {
      const c = computeCoupon_(d.coupon_code, subtotal);
      discount = c.discount;
      couponCode = c.coupon.code;
      updateRowById(SHEETS.COUPONS, c.coupon.code, { used_count: c.coupon.used_count + 1 });
    }
    const freeFrom = getSettingNumber_('free_ship_from', 0);
    const shippingFee = freeFrom > 0 && subtotal >= freeFrom ? 0 : getSettingNumber_('shipping_fee_default', 0);

    Object.assign(order, {
      id: shortId_(),
      order_code: nextOrderCode_(),
      created_at: nowIso_(),
      items: items,
      subtotal: subtotal,
      shipping_fee: shippingFee,
      discount: discount,
      total: subtotal - discount + shippingFee,
      coupon_code: couponCode,
      payment_status: 'unpaid',
      status: 'new',
    });
    appendRow(SHEETS.ORDERS, order);
    adjustStock_(items, -1);
    return order;
  });

  clearCache_();
  try {
    notifyNewOrder_(result);
  } catch (e) {
    console.warn('Notify failed: ' + e);
  }
  return publicOrder_(result);
}

/** Dữ liệu đơn trả về cho khách (bỏ id nội bộ). */
function publicOrder_(o) {
  const items = parseJson_(o.items, []);
  return {
    order_code: o.order_code,
    created_at: o.created_at,
    customer_name: o.customer_name,
    receiver_name: o.receiver_name,
    receiver_phone: o.receiver_phone,
    address: [o.address, o.district, o.city].filter(String).join(', '),
    delivery_date: o.delivery_date,
    delivery_time_slot: o.delivery_time_slot,
    card_message: o.card_message,
    items: items,
    subtotal: o.subtotal,
    shipping_fee: o.shipping_fee,
    discount: o.discount,
    total: o.total,
    coupon_code: o.coupon_code,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    status: o.status,
  };
}

/** POST trackOrder {code, phone} */
function trackOrder(data) {
  const code = str_(data.code, 30).toUpperCase();
  const phone = normalizePhone_(data.phone);
  if (!code || !phone) throw new Error('Vui lòng nhập mã đơn và số điện thoại');
  const o = findBy(SHEETS.ORDERS, 'order_code', code);
  if (!o || (normalizePhone_(o.customer_phone) !== phone && normalizePhone_(o.receiver_phone) !== phone)) {
    throw new Error('Không tìm thấy đơn hàng phù hợp');
  }
  return publicOrder_(o);
}

/** POST updateOrderStatus {id, status, payment_status} — huỷ đơn thì hoàn tồn kho. */
function updateOrderStatus(data) {
  const id = str_(data.id, 50);
  if (data.status && ORDER_STATUSES.indexOf(data.status) < 0) throw new Error('Trạng thái không hợp lệ');
  if (data.payment_status && PAYMENT_STATUSES.indexOf(data.payment_status) < 0) throw new Error('Trạng thái thanh toán không hợp lệ');

  const updated = withLock_(function () {
    const o = findBy(SHEETS.ORDERS, 'id', id);
    if (!o) throw new Error('Không tìm thấy đơn hàng');
    const patch = {};
    if (data.status && data.status !== o.status) {
      const items = parseJson_(o.items, []);
      if (data.status === 'cancelled') adjustStock_(items, +1);
      else if (o.status === 'cancelled') adjustStock_(items, -1);
      patch.status = data.status;
    }
    if (data.payment_status) patch.payment_status = data.payment_status;
    return updateRowById(SHEETS.ORDERS, id, patch);
  });
  clearCache_();
  return parseOrder_(updated);
}

function parseOrder_(o) {
  return Object.assign({}, o, { items: parseJson_(o.items, []) });
}

/* -------------------------- Thông báo -------------------------- */

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function money_(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

function notifyNewOrder_(o) {
  const settings = getAllSettings_();
  const shopName = settings.shop_name || 'Shop hoa';
  const lines = o.items.map(function (it) {
    return it.qty + ' × ' + it.name + (it.size ? ' (' + it.size + ')' : '') + ' — ' + money_(it.line_total);
  });

  const to = settings.notify_email || settings.email || Session.getEffectiveUser().getEmail();
  if (to) {
    const html =
      '<h2>Đơn hàng mới ' + escapeHtml_(o.order_code) + '</h2>' +
      '<p><b>Người đặt:</b> ' + escapeHtml_(o.customer_name) + ' — ' + escapeHtml_(o.customer_phone) + '</p>' +
      '<p><b>Người nhận:</b> ' + escapeHtml_(o.receiver_name) + ' — ' + escapeHtml_(o.receiver_phone) + '<br>' +
      escapeHtml_([o.address, o.district, o.city].join(', ')) + '</p>' +
      '<p><b>Giao:</b> ' + escapeHtml_(o.delivery_date + ' ' + o.delivery_time_slot) + '</p>' +
      '<p><b>Thiệp:</b> ' + escapeHtml_(o.card_message) + '<br><b>Ghi chú:</b> ' + escapeHtml_(o.note) + '</p>' +
      '<ul>' + lines.map(function (l) { return '<li>' + escapeHtml_(l) + '</li>'; }).join('') + '</ul>' +
      '<p>Tạm tính: ' + money_(o.subtotal) + ' · Giảm: ' + money_(o.discount) + ' · Ship: ' + money_(o.shipping_fee) +
      '<br><b>Tổng: ' + money_(o.total) + '</b> (' + o.payment_method + ')</p>';
    MailApp.sendEmail({ to: to, subject: '[' + shopName + '] Đơn mới ' + o.order_code, htmlBody: html });
  }

  const tgToken = getProp_('TELEGRAM_BOT_TOKEN');
  const tgChat = getProp_('TELEGRAM_CHAT_ID');
  if (tgToken && tgChat) {
    const text =
      '🌸 <b>Đơn mới ' + escapeHtml_(o.order_code) + '</b>\n' +
      escapeHtml_(o.customer_name + ' · ' + o.customer_phone) + '\n' +
      'Giao: ' + escapeHtml_(o.delivery_date + ' ' + o.delivery_time_slot) + '\n' +
      lines.map(escapeHtml_).join('\n') + '\n' +
      '<b>Tổng: ' + money_(o.total) + '</b> (' + o.payment_method + ')';
    UrlFetchApp.fetch('https://api.telegram.org/bot' + tgToken + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: tgChat, text: text, parse_mode: 'HTML' }),
      muteHttpExceptions: true,
    });
  }
}
