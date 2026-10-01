/**
 * Config.gs — tên sheet, header, kiểu dữ liệu cột và các hằng số.
 * Thông tin nhạy cảm (SPREADSHEET_ID, DRIVE_FOLDER_ID, TELEGRAM_BOT_TOKEN...)
 * được lưu trong Script Properties, KHÔNG hard-code ở đây.
 */

const SHEETS = {
  CATEGORIES: 'Categories',
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  BANNERS: 'Banners',
  COUPONS: 'Coupons',
  SETTINGS: 'Settings',
  ADMINS: 'Admins',
  CONTACTS: 'Contacts',
  SUBSCRIBERS: 'Subscribers',
};

const HEADERS = {
  Categories: ['id', 'name', 'slug', 'parent_id', 'image', 'sort_order', 'is_active'],
  Products: [
    'id', 'sku', 'name', 'slug', 'category_ids', 'collection', 'price', 'sale_price', 'images',
    'short_desc', 'description', 'flowers', 'colors', 'sizes', 'stock', 'is_new', 'is_best_seller',
    'is_active', 'tags', 'created_at', 'updated_at',
  ],
  Orders: [
    'id', 'order_code', 'created_at', 'customer_name', 'customer_phone', 'customer_email',
    'receiver_name', 'receiver_phone', 'address', 'district', 'city', 'delivery_date',
    'delivery_time_slot', 'card_message', 'note', 'items', 'subtotal', 'shipping_fee', 'discount',
    'total', 'coupon_code', 'payment_method', 'payment_status', 'status',
  ],
  Banners: ['id', 'title', 'subtitle', 'image', 'image_mobile', 'link', 'position', 'sort_order', 'is_active'],
  Coupons: [
    'code', 'type', 'value', 'min_order', 'max_discount', 'start_date', 'end_date', 'usage_limit',
    'used_count', 'is_active',
  ],
  Settings: ['key', 'value'],
  Admins: ['username', 'password_hash', 'role', 'token', 'token_expires'],
  Contacts: ['id', 'created_at', 'name', 'phone', 'message', 'status'],
  Subscribers: ['email', 'created_at'],
};

/** Cột kiểu số / boolean — dùng để chuẩn hoá khi đọc và ghi. */
const NUMBER_FIELDS = [
  'price', 'sale_price', 'stock', 'sort_order', 'value', 'min_order', 'max_discount', 'usage_limit',
  'used_count', 'subtotal', 'shipping_fee', 'discount', 'total',
];
const BOOLEAN_FIELDS = ['is_active', 'is_new', 'is_best_seller'];

/** Kiểu của một cột trong một sheet: 'number' | 'bool' | 'text'. Settings luôn là text. */
function fieldType_(sheet, field) {
  if (sheet === SHEETS.SETTINGS) return 'text';
  if (NUMBER_FIELDS.indexOf(field) >= 0) return 'number';
  if (BOOLEAN_FIELDS.indexOf(field) >= 0) return 'bool';
  return 'text';
}

/** Khoá chính của từng sheet (mặc định là `id`). */
const ID_FIELDS = {
  Coupons: 'code',
  Settings: 'key',
  Admins: 'username',
  Subscribers: 'email',
};

/** Resource được phép thao tác qua adminList / adminSave / adminDelete. */
const ADMIN_RESOURCES = {
  products: SHEETS.PRODUCTS,
  categories: SHEETS.CATEGORIES,
  orders: SHEETS.ORDERS,
  banners: SHEETS.BANNERS,
  coupons: SHEETS.COUPONS,
  contacts: SHEETS.CONTACTS,
  subscribers: SHEETS.SUBSCRIBERS,
};

const ORDER_STATUSES = ['new', 'confirmed', 'delivering', 'done', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
const PAYMENT_METHODS = ['COD', 'BANK'];
const CONTACT_STATUSES = ['new', 'processing', 'done', 'deleted'];

/** Khung giờ giao: [label, giờ bắt đầu]. */
const TIME_SLOTS = [
  ['08:00 - 10:00', 8],
  ['10:00 - 12:00', 10],
  ['13:00 - 15:00', 13],
  ['15:00 - 17:00', 15],
  ['17:00 - 19:00', 17],
  ['19:00 - 21:00', 19],
];
/** Thời gian chuẩn bị hoa (giờ) — đặt trong ngày thì ẩn khung giờ bắt đầu trước now + PREP_HOURS. */
const PREP_HOURS = 2;

/** Settings KHÔNG trả về cho khách (chỉ admin thấy). */
const PRIVATE_SETTINGS = ['notify_email'];

const CACHE_TTL = 600; // giây
const CACHE_KEYS = ['products_all', 'categories_all', 'settings_all', 'banners_all'];
const TOKEN_TTL_DAYS = 7;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function getTimeZone_() {
  return Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
}
