/**
 * Utils.gs — đọc/ghi sheet, JSON response, cache, lock, validate.
 */

/** Bộ nhớ tạm trong 1 lần thực thi: tránh đọc lại cùng một sheet nhiều lần. */
const _sheetMemo = {};

function getSs_() {
  const id = getProp_('SPREADSHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Chưa cấu hình SPREADSHEET_ID. Hãy chạy setup() trong trình soạn thảo Apps Script.');
  return ss;
}

function getSheet_(name) {
  const sh = getSs_().getSheetByName(name);
  if (!sh) throw new Error('Thiếu sheet "' + name + '". Hãy chạy setup().');
  return sh;
}

/**
 * Đọc toàn bộ sheet bằng 1 lần getDataRange().getValues().
 * Mỗi object có thuộc tính ẩn `__row` (số dòng thực trên sheet) — không xuất hiện trong JSON.
 */
function readSheet_(name) {
  if (_sheetMemo[name]) return _sheetMemo[name];
  const values = getSheet_(name).getDataRange().getValues();
  const headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r.every(function (c) { return c === '' || c === null; })) continue;
    const o = {};
    headers.forEach(function (h, j) {
      if (h) o[h] = normalizeValue_(name, h, r[j]);
    });
    Object.defineProperty(o, '__row', { value: i + 1, enumerable: false });
    rows.push(o);
  }
  _sheetMemo[name] = { headers: headers, rows: rows };
  return _sheetMemo[name];
}

/** Mảng object theo header (bản sao, an toàn để chỉnh sửa). */
function getSheetData(name) {
  return readSheet_(name).rows.map(function (r) { return Object.assign({}, r); });
}

function findBy(name, field, value) {
  const v = String(value);
  const row = readSheet_(name).rows.find(function (r) { return String(r[field]) === v; });
  return row ? Object.assign({}, row) : null;
}

function appendRow(name, obj) {
  const sh = getSheet_(name);
  const headers = readSheet_(name).headers;
  sh.appendRow(headers.map(function (h) { return toCell_(name, h, obj[h]); }));
  delete _sheetMemo[name];
  return obj;
}

/** Cập nhật (merge) một dòng theo khoá chính. Trả về object sau khi cập nhật. */
function updateRowById(name, id, patch) {
  const idField = ID_FIELDS[name] || 'id';
  const data = readSheet_(name);
  const row = data.rows.find(function (r) { return String(r[idField]) === String(id); });
  if (!row) throw new Error('Không tìm thấy bản ghi: ' + id);
  const merged = Object.assign({}, row, patch);
  getSheet_(name)
    .getRange(row.__row, 1, 1, data.headers.length)
    .setValues([data.headers.map(function (h) { return toCell_(name, h, merged[h]); })]);
  delete _sheetMemo[name];
  return merged;
}

/** Giá trị từ sheet → JS (số, boolean, chuỗi; Date → chuỗi ISO theo múi giờ script). */
function normalizeValue_(sheet, field, v) {
  const type = fieldType_(sheet, field);
  if (type === 'number') return Number(v) || 0;
  if (type === 'bool') return toBool_(v);
  if (v instanceof Date) {
    const hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
    return formatDate_(v, hasTime ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v);
}

/**
 * JS → ô sheet. Chuỗi bắt đầu bằng = + - @ (formula injection) hoặc chữ số
 * (SĐT, ngày tháng — tránh Sheets tự đổi kiểu) được thêm dấu ' để giữ nguyên dạng văn bản.
 */
function toCell_(sheet, field, v) {
  const type = fieldType_(sheet, field);
  if (type === 'number') return Math.round(Number(v) || 0);
  if (type === 'bool') return toBool_(v);
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (s.length > 45000) s = s.slice(0, 45000);
  if (/^[=+\-@\d]/.test(s)) s = "'" + s;
  return s;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------- Cache ---------------------------- */

const CACHE_CHUNK = 30000; // ký tự; giới hạn 100KB/khoá, tiếng Việt UTF-8 tới 3 byte/ký tự

function cacheGetJson_(key) {
  const c = CacheService.getScriptCache();
  const meta = c.get(key);
  if (!meta) return null;
  try {
    if (meta.indexOf('chunks:') !== 0) return JSON.parse(meta);
    const n = Number(meta.slice(7));
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(key + '_' + i);
    const parts = c.getAll(keys);
    let s = '';
    for (let i = 0; i < keys.length; i++) {
      if (parts[keys[i]] == null) return null;
      s += parts[keys[i]];
    }
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function cachePutJson_(key, value, ttl) {
  const c = CacheService.getScriptCache();
  const s = JSON.stringify(value);
  try {
    if (s.length <= CACHE_CHUNK) {
      c.put(key, s, ttl || CACHE_TTL);
      return;
    }
    const map = {};
    const n = Math.ceil(s.length / CACHE_CHUNK);
    for (let i = 0; i < n; i++) map[key + '_' + i] = s.substr(i * CACHE_CHUNK, CACHE_CHUNK);
    c.putAll(map, ttl || CACHE_TTL);
    c.put(key, 'chunks:' + n, ttl || CACHE_TTL);
  } catch (e) {
    console.warn('Cache put failed: ' + e);
  }
}

function withCache_(key, fn) {
  const hit = cacheGetJson_(key);
  if (hit !== null) return hit;
  const value = fn();
  cachePutJson_(key, value);
  return value;
}

function clearCache_() {
  CacheService.getScriptCache().removeAll(CACHE_KEYS);
}

/* ---------------------------- Lock ---------------------------- */

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/* --------------------------- Helpers --------------------------- */

function toBool_(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'x';
}

function toInt_(v, def) {
  const n = parseInt(v, 10);
  return isNaN(n) ? def : n;
}

function parseJson_(s, def) {
  if (s && typeof s === 'object') return s;
  if (!s) return def;
  try {
    return JSON.parse(s);
  } catch (e) {
    return def;
  }
}

function splitList_(s) {
  if (Array.isArray(s)) return s.map(function (x) { return String(x).trim(); }).filter(String);
  return String(s || '')
    .split(',')
    .map(function (x) { return x.trim(); })
    .filter(String);
}

/** Chuỗi an toàn: ép kiểu, trim, giới hạn độ dài. */
function str_(v, max) {
  return String(v === null || v === undefined ? '' : v).trim().slice(0, max || 500);
}

function nowIso_() {
  return new Date().toISOString();
}

function formatDate_(date, fmt) {
  return Utilities.formatDate(date, getTimeZone_(), fmt);
}

function shortId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

/** Bỏ dấu tiếng Việt, chữ thường — dùng cho slug và tìm kiếm. */
function removeAccents_(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function slugify_(s) {
  return removeAccents_(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const PHONE_RE = /^(0|\+84)[35789][0-9]{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizePhone_(p) {
  const s = String(p || '').replace(/[\s.\-()]/g, '');
  return s.indexOf('+84') === 0 ? '0' + s.slice(3) : s;
}

function assertPhone_(p, label) {
  const s = String(p || '').replace(/[\s.\-()]/g, '');
  if (!PHONE_RE.test(s)) throw new Error((label || 'Số điện thoại') + ' không hợp lệ');
  return normalizePhone_(s);
}

function assertEmail_(e, required) {
  const s = str_(e, 200);
  if (!s && !required) return '';
  if (!EMAIL_RE.test(s)) throw new Error('Email không hợp lệ');
  return s.toLowerCase();
}

function requireText_(v, label, max) {
  const s = str_(v, max);
  if (!s) throw new Error('Vui lòng nhập ' + label);
  return s;
}
