/**
 * Setup.gs — chạy setup() MỘT LẦN để tạo sheet, header, dữ liệu mẫu và tài khoản admin.
 * Chạy lại an toàn: sheet đã có dữ liệu sẽ không bị ghi đè.
 *
 * Mật khẩu admin mặc định lấy từ Script Property ADMIN_PASSWORD (nếu có),
 * nếu không sẽ dùng DEFAULT_ADMIN_PASSWORD bên dưới — HÃY ĐỔI NGAY sau khi đăng nhập.
 */

const DEFAULT_ADMIN_PASSWORD = 'HoaMoc@2026';

/**
 * Sheet dữ liệu dùng khi script KHÔNG gắn với Sheet (standalone). setup() lưu giá trị này
 * vào Script Property SPREADSHEET_ID; sau đó đổi Sheet chỉ cần sửa Script Property.
 */
const SETUP_SPREADSHEET_ID = '1PcpT9s2yLEqCOItgs_Bh9G_Cc_jDu0wqERWIPNnqfTE';

const SAMPLE_IMAGES = [
  '1490750967868-88aa4486c946', '1487530811176-3780de880c2d', '1508610048659-a06b669e3321',
  '1455659817273-f96807779a8a', '1518895949257-7621c3c786d7', '1561181286-d3fee7d55364',
  '1520763185298-1b434c919102', '1563241527-3004b7be0ffd', '1525310072745-f49212b5ac6d',
  '1494972308805-463bc619d34e', '1457089328109-e5d9bd499191', '1496062031456-07b8f162a322',
  '1462275646964-a0e3386b89fa', '1470509037663-253afd7f0f51', '1526047932273-341f2a7631f9',
  '1533616688419-b7a585564566', '1519378058457-4c29a0a2efac', '1502977249166-824b3a8a4d6d',
  '1477554193778-9562c28588c0', '1444021465936-c6ca81d39b84', '1468327768560-75b778cbb551',
  '1478145046317-39f10e56b5e9', '1453904300235-0f2f60b15b5d', '1509909756405-be0199881695',
  '1567696153798-9111f9cd3d0d', '1597848212624-a19eb35e2651', '1582794543139-8ac9cb0f7b11',
  '1559563362-c667ba5f5480', '1471696035578-3d8c78d99684', '1523694576729-dc99e9c0f9b4',
  '1535909339361-ef56e179d637', '1572454591674-2739f30d8c40', '1591886960571-74d43a9d4166',
  '1563170351-be82bc888aa4', '1548094990-c16ca90f1f0d', '1527061011665-3652c757a4d4',
];

function sampleImg_(i, w, h) {
  return 'https://images.unsplash.com/photo-' + SAMPLE_IMAGES[i % SAMPLE_IMAGES.length] +
    '?auto=format&fit=crop&w=' + w + (h ? '&h=' + h : '') + '&q=80';
}

function setup() {
  if (!getProp_('SPREADSHEET_ID')) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    setProp_('SPREADSHEET_ID', active ? active.getId() : SETUP_SPREADSHEET_ID);
  }
  const ss = getSs_();
  console.log('Dùng spreadsheet: ' + ss.getName() + ' (' + ss.getId() + ')');
  Object.keys(HEADERS).forEach(function (name) { ensureSheet_(ss, name, HEADERS[name]); });

  seedIfEmpty_(SHEETS.SETTINGS, sampleSettings_);
  seedIfEmpty_(SHEETS.CATEGORIES, sampleCategories_);
  seedIfEmpty_(SHEETS.PRODUCTS, sampleProducts_);
  seedIfEmpty_(SHEETS.BANNERS, sampleBanners_);
  seedIfEmpty_(SHEETS.COUPONS, sampleCoupons_);
  seedIfEmpty_(SHEETS.ORDERS, sampleOrders_);

  if (!getSheetData(SHEETS.ADMINS).length) {
    const pw = getProp_('ADMIN_PASSWORD') || DEFAULT_ADMIN_PASSWORD;
    appendRow(SHEETS.ADMINS, { username: 'admin', password_hash: hashPassword_(pw), role: 'owner' });
    console.log('Đã tạo tài khoản admin / ' + (getProp_('ADMIN_PASSWORD') ? '(ADMIN_PASSWORD)' : DEFAULT_ADMIN_PASSWORD));
  }

  // Xoá sheet trống mặc định ("Sheet1" / "Trang tính1").
  ss.getSheets().forEach(function (sh) {
    if (!HEADERS[sh.getName()] && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  // Mọi ảnh phải nằm trên Drive: chuyển ảnh mẫu (Unsplash) vào thư mục ảnh của shop
  try {
    migrateImagesToDrive();
  } catch (e) {
    console.warn('Chưa chuyển được ảnh mẫu vào Drive: ' + e.message + ' — chạy lại migrateImagesToDrive() sau.');
  }

  clearCache_();
  console.log('Setup hoàn tất.');
}

/** Đặt lại mật khẩu admin theo Script Property ADMIN_PASSWORD (khi quên mật khẩu). */
function resetAdminPassword() {
  const pw = getProp_('ADMIN_PASSWORD');
  if (!pw || pw.length < 8) throw new Error('Hãy đặt Script Property ADMIN_PASSWORD (≥ 8 ký tự) trước.');
  updateRowById(SHEETS.ADMINS, 'admin', { password_hash: hashPassword_(pw), token: '', token_expires: '' });
  console.log('Đã đặt lại mật khẩu cho admin.');
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function seedIfEmpty_(name, factory) {
  if (getSheetData(name).length) return;
  const rows = factory();
  if (!rows.length) return;
  const headers = readSheet_(name).headers;
  getSheet_(name)
    .getRange(2, 1, rows.length, headers.length)
    .setValues(rows.map(function (r) { return headers.map(function (h) { return toCell_(name, h, r[h]); }); }));
  delete _sheetMemo[name];
}

/* ------------------------- Dữ liệu mẫu ------------------------- */

function sampleSettings_() {
  const s = {
    shop_name: 'Hoa Mộc',
    company_name: 'Công ty TNHH Hoa Mộc',
    hotline: '0901234567',
    zalo: '0901234567',
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/',
    address: '123 Đường Hoa Lan, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    email: 'hello@hoamoc.vn',
    open_hours: '7:00 – 21:00 hằng ngày',
    shipping_fee_default: '30000',
    free_ship_from: '500000',
    top_bar_message: 'GIAO HOA NHANH 2H NỘI THÀNH|MIỄN PHÍ GIAO TỪ 500.000₫|TẶNG THIỆP VIẾT TAY MIỄN PHÍ',
    bank_id: 'VCB',
    bank_name: 'Vietcombank',
    bank_account_no: '0123456789',
    bank_account_name: 'CONG TY TNHH HOA MOC',
    first_order_coupon: 'CHAOBAN10',
    seo_title: 'Hoa Mộc — Hoa tươi thiết kế, giao nhanh 2h',
    seo_description: 'Shop hoa tươi Hoa Mộc: bó hoa, lẵng hoa, hoa khai trương, hoa sinh nhật thiết kế tinh tế. Giao nhanh 2h nội thành, tặng thiệp miễn phí.',
    notify_email: '',
    about_image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1600&h=900&q=80',
  };
  return Object.keys(s).map(function (k) { return { key: k, value: s[k] }; });
}

function sampleCategories_() {
  const rows = [
    ['c10', 'Hoa theo dịp', 'hoa-theo-dip', '', 0],
    ['c11', 'Hoa sinh nhật', 'hoa-sinh-nhat', 'c10', 9],
    ['c12', 'Hoa khai trương', 'hoa-khai-truong', 'c10', 31],
    ['c13', 'Hoa chúc mừng', 'hoa-chuc-mung', 'c10', 13],
    ['c14', 'Hoa cưới', 'hoa-cuoi', 'c10', 21],
    ['c15', 'Hoa tình yêu', 'hoa-tinh-yeu', 'c10', 4],
    ['c16', 'Hoa chia buồn', 'hoa-chia-buon', 'c10', 22],
    ['c20', 'Kiểu dáng', 'kieu-dang', '', 1],
    ['c21', 'Bó hoa', 'bo-hoa', 'c20', 0],
    ['c22', 'Lẵng hoa', 'lang-hoa', 'c20', 12],
    ['c23', 'Giỏ hoa', 'gio-hoa', 'c20', 10],
    ['c24', 'Hoa để bàn', 'hoa-de-ban', 'c20', 6],
    ['c25', 'Hoa sáp & hoa khô', 'hoa-sap-hoa-kho', 'c20', 28],
    ['c30', 'Bộ sưu tập', 'bo-suu-tap', '', 2],
    ['c31', '20/10 – Phụ nữ Việt Nam', '20-10', 'c30', 16],
    ['c32', '8/3 – Quốc tế Phụ nữ', '8-3', 'c30', 19],
    ['c33', 'Valentine 14/2', 'valentine', 'c30', 4],
    ['c34', '20/11 – Tri ân Thầy Cô', '20-11', 'c30', 13],
    ['c35', 'Hoa Tết', 'hoa-tet', 'c30', 23],
  ];
  return rows.map(function (r, i) {
    return {
      id: r[0], name: r[1], slug: r[2], parent_id: r[3],
      image: r[3] ? sampleImg_(r[4], 600, 800) : '', sort_order: i + 1, is_active: true,
    };
  });
}

function sampleProducts_() {
  // [tên, danh mục, bộ sưu tập, giá, giá sale, [ảnh], thành phần, màu, mới, bán chạy, tags, giá theo size]
  const data = [
    ['Bó hồng Pastel Dịu Dàng', 'c11,c15,c21', '20-10', 450000, 390000, [0, 16], 'Hoa hồng,Baby', 'Hồng', 1, 1, 'pastel,nhẹ nhàng'],
    ['Bó hồng đỏ Mãi Yêu', 'c15,c21', 'valentine', 650000, 0, [4, 3], 'Hoa hồng', 'Đỏ', 0, 1, 'sang trọng,lãng mạn', [650000, 850000, 1200000]],
    ['Bó hướng dương Nắng Mai', 'c11,c13,c21', '20-11', 420000, 0, [13, 25], 'Hướng dương,Cúc tana', 'Vàng', 1, 0, 'rực rỡ'],
    ['Lẵng khai trương Phát Lộc', 'c12,c22', '', 1500000, 1350000, [31, 2], 'Hoa hồng,Lan,Đồng tiền', 'Đỏ,Vàng', 0, 1, 'rực rỡ,sang trọng'],
    ['Kệ khai trương Thịnh Vượng', 'c12,c22', '', 2200000, 0, [12, 26], 'Hướng dương,Đồng tiền,Lan', 'Vàng', 0, 0, 'rực rỡ', [2200000, 2800000, 3500000]],
    ['Giỏ hoa Ngọt Ngào', 'c11,c13,c23', '8-3', 550000, 0, [10, 9], 'Hoa hồng,Cẩm chướng', 'Hồng', 1, 0, 'pastel,nhẹ nhàng'],
    ['Bình tulip Hà Lan', 'c24,c15', 'valentine', 890000, 790000, [6, 20], 'Tulip', 'Hồng,Trắng', 1, 1, 'tối giản,sang trọng'],
    ['Lan hồ điệp Vương Giả', 'c12,c24,c13', 'hoa-tet', 2500000, 0, [32, 30], 'Lan hồ điệp', 'Trắng,Tím', 0, 1, 'sang trọng', [2500000, 3900000]],
    ['Bó cẩm tú cầu Xanh Biển', 'c11,c21', '', 480000, 0, [18, 27], 'Cẩm tú cầu', 'Xanh', 1, 0, 'tối giản'],
    ['Bó hoa cưới Trắng Tinh Khôi', 'c14,c21', '', 1200000, 0, [21, 7], 'Hoa hồng,Cát tường,Baby', 'Trắng', 0, 0, 'tối giản,sang trọng'],
    ['Hoa cưới Mẫu Đơn Hồng', 'c14,c21', '', 1800000, 1600000, [11, 19], 'Mẫu đơn', 'Hồng', 1, 0, 'pastel,sang trọng'],
    ['Kệ chia buồn Vĩnh Hằng', 'c16,c22', '', 1600000, 0, [22, 33], 'Cúc trắng,Lan,Hoa hồng', 'Trắng', 0, 0, 'trang nghiêm'],
    ['Lẵng chia buồn Thanh Thản', 'c16,c22', '', 1100000, 0, [33, 22], 'Cúc trắng,Cát tường', 'Trắng,Tím', 0, 0, 'trang nghiêm'],
    ['Hộp hoa sáp Yêu Thương', 'c25,c15', '8-3', 350000, 290000, [29, 16], 'Hoa sáp', 'Hồng', 0, 1, 'pastel,quà tặng'],
    ['Bó hoa khô Vintage', 'c25,c21', '', 390000, 0, [28, 35], 'Hoa khô,Lavender', 'Nâu,Tím', 1, 0, 'tối giản,vintage'],
    ['Bó baby trắng Tinh Tú', 'c11,c21', '20-10', 320000, 0, [17, 21], 'Baby', 'Trắng', 0, 0, 'tối giản', [320000, 450000, 650000]],
    ['Bó hồng Ohara Kem Sữa', 'c11,c15,c21', '20-10', 750000, 690000, [1, 0], 'Hoa hồng', 'Kem', 0, 1, 'pastel,sang trọng'],
    ['Giỏ hoa Rạng Rỡ', 'c13,c23,c11', '20-11', 680000, 0, [15, 13], 'Hướng dương,Hoa hồng,Cúc', 'Vàng,Cam', 0, 0, 'rực rỡ'],
    ['Bình hoa để bàn Thanh Lịch', 'c24', '', 590000, 0, [24, 34], 'Cát tường,Hoa hồng', 'Trắng,Xanh', 1, 0, 'tối giản'],
    ['Bó tulip Mộng Mơ', 'c15,c21', '8-3', 790000, 0, [20, 6], 'Tulip', 'Tím,Hồng', 1, 0, 'pastel'],
    ['Hộp hoa Hồng Đỏ Luxury', 'c15,c11', 'valentine', 1290000, 0, [3, 4], 'Hoa hồng', 'Đỏ', 0, 1, 'sang trọng,lãng mạn'],
    ['Lẵng hoa chúc mừng Thành Công', 'c13,c22', '20-11', 950000, 850000, [2, 12], 'Hoa hồng,Đồng tiền,Lan', 'Cam,Vàng', 0, 0, 'rực rỡ'],
    ['Bình đào đông Tết An Khang', 'c24', 'hoa-tet', 1500000, 0, [23, 5], 'Đào đông,Hoa khô', 'Đỏ', 1, 0, 'rực rỡ,tết'],
    ['Giỏ cúc mẫu đơn Hạnh Phúc', 'c13,c23', 'hoa-tet', 720000, 0, [8, 15], 'Cúc mẫu đơn', 'Vàng', 0, 0, 'rực rỡ'],
    ['Bó lavender Thì Thầm', 'c25,c15', '', 450000, 0, [35, 28], 'Lavender', 'Tím', 0, 0, 'pastel,tối giản'],
    ['Bó cát tường Xanh Mint', 'c11,c21', '20-10', 420000, 0, [27, 18], 'Cát tường', 'Xanh,Trắng', 1, 0, 'pastel'],
  ];
  const sizeNames = ['Nhỏ', 'Vừa', 'Lớn'];
  const now = Date.now();
  return data.map(function (d, i) {
    const created = new Date(now - (i + 1) * 36 * 3600000).toISOString();
    return {
      id: 'p' + ('00' + (i + 1)).slice(-3),
      sku: 'HM' + ('000' + (i + 1)).slice(-4),
      name: d[0],
      slug: slugify_(d[0]),
      category_ids: d[1],
      collection: d[2],
      price: d[3],
      sale_price: d[4],
      images: d[5].map(function (x) { return sampleImg_(x, 900, 1200); }).join(','),
      short_desc: 'Thiết kế ' + d[0].toLowerCase() + ' với ' + d[6].split(',').join(', ').toLowerCase() + ' tươi chọn lọc trong ngày.',
      description:
        '<p><strong>' + d[0] + '</strong> được các nghệ nhân Hoa Mộc cắm thủ công từ những bông hoa tươi nhất, nhập mới mỗi sáng.</p>' +
        '<p>Phù hợp để tặng sinh nhật, kỷ niệm, chúc mừng hoặc trang trí không gian sống. Mỗi thiết kế đi kèm thiệp viết tay miễn phí.</p>' +
        '<ul><li>Hoa tươi 3–5 ngày nếu chăm sóc đúng cách</li><li>Giao nhanh 2 giờ nội thành</li><li>Ảnh thực tế được gửi trước khi giao</li></ul>',
      flowers: d[6],
      colors: d[7],
      sizes: d[11] ? JSON.stringify(d[11].map(function (p, j) { return { name: sizeNames[j] || 'Size ' + (j + 1), price: p }; })) : '',
      stock: i % 7 === 3 ? 4 : 30,
      is_new: !!d[8],
      is_best_seller: !!d[9],
      is_active: true,
      tags: d[10],
      created_at: created,
      updated_at: created,
    };
  });
}

function sampleBanners_() {
  return [
    { title: 'Hoa tươi mỗi ngày', subtitle: 'Thiết kế tinh tế · Giao nhanh 2 giờ nội thành', img: 0, link: '/hang-moi', position: 'hero' },
    { title: 'Bộ sưu tập 20/10', subtitle: 'Trao gửi yêu thương đến người phụ nữ của bạn', img: 16, link: '/bo-suu-tap/20-10', position: 'hero' },
    { title: 'Lan hồ điệp sang trọng', subtitle: 'Món quà khai trương đẳng cấp', img: 32, link: '/danh-muc/hoa-khai-truong', position: 'hero' },
    { title: '20/10 – Ngày Phụ nữ Việt Nam', subtitle: 'Khám phá bộ sưu tập', img: 9, link: '/bo-suu-tap/20-10', position: 'collection' },
    { title: 'Valentine – Lời yêu ngọt ngào', subtitle: 'Khám phá bộ sưu tập', img: 4, link: '/bo-suu-tap/valentine', position: 'collection' },
    { title: 'Pastel nhẹ nhàng', subtitle: 'Dịu dàng, tinh khôi', img: 19, link: '/tim-kiem?q=pastel', position: 'promo' },
    { title: 'Rực rỡ', subtitle: 'Tràn đầy năng lượng', img: 13, link: '/tim-kiem?q=rực rỡ', position: 'promo' },
    { title: 'Tối giản', subtitle: 'Ít mà tinh', img: 28, link: '/tim-kiem?q=tối giản', position: 'promo' },
    { title: 'Sang trọng', subtitle: 'Đẳng cấp, cuốn hút', img: 3, link: '/tim-kiem?q=sang trọng', position: 'promo' },
  ].map(function (b, i) {
    const hero = b.position === 'hero';
    return {
      id: 'b' + (i + 1),
      title: b.title,
      subtitle: b.subtitle,
      image: hero ? sampleImg_(b.img, 1920, 900) : sampleImg_(b.img, 900, 1200),
      image_mobile: hero ? sampleImg_(b.img, 800, 1100) : '',
      link: b.link,
      position: b.position,
      sort_order: i + 1,
      is_active: true,
    };
  });
}

function sampleCoupons_() {
  const year = new Date().getFullYear();
  return [
    { code: 'CHAOBAN10', type: 'percent', value: 10, min_order: 300000, max_discount: 100000, start_date: '', end_date: '', usage_limit: 0, used_count: 0, is_active: true },
    { code: 'GIAM50K', type: 'fixed', value: 50000, min_order: 500000, max_discount: 0, start_date: '', end_date: '', usage_limit: 100, used_count: 0, is_active: true },
    { code: 'HOA2010', type: 'percent', value: 15, min_order: 400000, max_discount: 150000, start_date: year + '-10-01', end_date: year + '-10-21', usage_limit: 200, used_count: 0, is_active: true },
  ];
}

function sampleOrders_() {
  const products = getSheetData(SHEETS.PRODUCTS).map(parseProduct_);
  if (!products.length) return [];
  const statuses = ['new', 'confirmed', 'delivering', 'done', 'done', 'cancelled', 'new', 'done'];
  const names = ['Nguyễn Minh Anh', 'Trần Thu Hà', 'Lê Quốc Bảo', 'Phạm Ngọc Lan', 'Võ Thanh Tùng', 'Đặng Mai Chi', 'Bùi Gia Huy', 'Hoàng Bảo Ngọc'];
  const now = Date.now();
  return statuses.map(function (status, i) {
    const created = new Date(now - i * 26 * 3600000);
    const p = products[(i * 5) % products.length];
    const qty = (i % 2) + 1;
    const price = p.sizes.length ? p.sizes[0].price : p.final_price;
    const subtotal = price * qty;
    const ship = subtotal >= 500000 ? 0 : 30000;
    return {
      id: 'o' + (i + 1),
      order_code: 'HOA' + formatDate_(created, 'yyMMdd') + ('000' + (90 + i)).slice(-4),
      created_at: created.toISOString(),
      customer_name: names[i],
      customer_phone: '09' + ('0000000' + (12345678 + i * 1111)).slice(-8),
      customer_email: '',
      receiver_name: names[i],
      receiver_phone: '09' + ('0000000' + (12345678 + i * 1111)).slice(-8),
      address: (10 + i) + ' Nguyễn Huệ',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      delivery_date: formatDate_(created, 'yyyy-MM-dd'),
      delivery_time_slot: TIME_SLOTS[i % TIME_SLOTS.length][0],
      card_message: 'Chúc mừng sinh nhật!',
      note: '',
      items: JSON.stringify([{ product_id: p.id, sku: p.sku, name: p.name, slug: p.slug, image: p.images[0], size: p.sizes.length ? p.sizes[0].name : '', qty: qty, price: price, line_total: subtotal }]),
      subtotal: subtotal,
      shipping_fee: ship,
      discount: 0,
      total: subtotal + ship,
      coupon_code: '',
      payment_method: i % 3 === 0 ? 'BANK' : 'COD',
      payment_status: status === 'done' ? 'paid' : 'unpaid',
      status: status,
    };
  });
}
