/**
 * Images.gs — mọi ảnh của shop đều nằm trên Google Drive (thư mục DEFAULT_DRIVE_FOLDER_ID).
 *  - Link Drive (uc?id=, open?id=, file/d/…, lh3) → chuẩn hoá về lh3.googleusercontent.com.
 *  - Link ngoài (Unsplash, web…) → tải về, lưu vào Drive, trả link Drive.
 *  - migrateImagesToDrive(): chuyển toàn bộ ảnh ngoài Drive đang có trong Sheet vào Drive và ghi lại link.
 */

const DRIVE_ID_RE = /(?:lh3\.googleusercontent\.com\/d\/|(?:drive|docs)\.google\.com\/(?:uc\?(?:[^#]*&)?id=|open\?(?:[^#]*&)?id=|file\/d\/))([\w-]{20,})/;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
/** Thư mục con theo loại dữ liệu (ảnh sản phẩm dùng slug sản phẩm). */
const IMAGE_FOLDERS = { banners: 'banner', categories: 'danh-muc', settings: 'trang' };

function driveImageUrl_(id) {
  return 'https://lh3.googleusercontent.com/d/' + id + '=w1000';
}

function isDriveImage_(url) {
  return DRIVE_ID_RE.test(String(url || ''));
}

/** Thư mục ảnh gốc đã chia sẻ công khai (Bất kỳ ai có đường liên kết) chưa — cache 1 giờ. */
function rootFolderIsPublic_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('root_public');
  if (hit) return hit === '1';
  let pub = false;
  try {
    const access = getRootFolder_().getSharingAccess();
    pub = access === DriveApp.Access.ANYONE_WITH_LINK || access === DriveApp.Access.ANYONE;
  } catch (e) {
    pub = false;
  }
  cache.put('root_public', pub ? '1' : '0', 3600);
  return pub;
}

/**
 * Ảnh phải xem được công khai để hiển thị trên web.
 * Thư mục ảnh đã chia sẻ "Bất kỳ ai có đường liên kết" → file mới tự thừa hưởng, KHÔNG gọi setSharing
 * (Google có thể từ chối setSharing từng file: "Truy cập bị từ chối: DriveApp").
 */
function ensurePublic_(file) {
  if (rootFolderIsPublic_()) return;
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    throw new Error(
      'Ảnh đã lưu vào Drive nhưng không bật được chia sẻ công khai (' + e.message + '). ' +
      'Hãy mở thư mục ảnh của shop trên Google Drive → Chia sẻ → "Bất kỳ ai có đường liên kết" (Người xem).'
    );
  }
}

/**
 * Đảm bảo ảnh nằm trên Drive: link Drive → chuẩn hoá; link ngoài → tải về lưu vào thư mục `folder`.
 * @param {string} url
 * @param {string} folder  slug thư mục con
 * @param {Object=} memo   { url: driveUrl } — tránh tải trùng một ảnh nhiều lần
 */
function ensureDriveImage_(url, folder, memo) {
  const s = String(url || '').trim();
  if (!s) return '';
  const m = s.match(DRIVE_ID_RE);
  if (m) return driveImageUrl_(m[1]);
  if (!/^https?:\/\//i.test(s)) throw new Error('Link ảnh không hợp lệ: ' + s.slice(0, 80));
  if (memo && memo[s]) return memo[s];

  // Unsplash: ép JPEG (auto=format có thể trả AVIF)
  const src = /images\.unsplash\.com/.test(s) ? s.replace(/([?&])auto=format&?/, '$1').replace(/[?&]$/, '') + (s.indexOf('?') >= 0 ? '&' : '?') + 'fm=jpg' : s;
  const res = UrlFetchApp.fetch(src, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error('Không tải được ảnh (' + res.getResponseCode() + '): ' + s.slice(0, 80));
  const blob = res.getBlob();
  const type = String(blob.getContentType() || '').split(';')[0];
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) throw new Error('Link không phải ảnh JPG/PNG/WEBP/GIF: ' + s.slice(0, 80));
  if (blob.getBytes().length > MAX_IMPORT_BYTES) throw new Error('Ảnh quá lớn (> 10MB): ' + s.slice(0, 80));

  const base = slugify_(s.split('?')[0].split('/').pop().replace(/\.[^.]+$/, '')).slice(0, 60) || 'image';
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[type];
  blob.setName(Date.now() + '-' + base + '.' + ext);
  const target = folder && typeof folder === 'object' ? folder : getUploadFolder_(folder);
  const file = target.createFile(blob);
  ensurePublic_(file);
  const out = driveImageUrl_(file.getId());
  if (memo) memo[s] = out;
  return out;
}

/** POST importImageUrl {url, folder} → {url}: dán link ảnh bất kỳ trong admin → lưu vào Drive. */
function importImageUrl(data) {
  const own = productFolder_(str_(data.productId, 50));
  return { url: ensureDriveImage_(str_(data.url, 2000), own ? own : str_(data.folder, 100)) };
}

/**
 * Chuyển mọi ảnh ngoài Drive trong Sheet vào Drive (Products, Banners, Categories, Settings, ảnh trong Orders).
 * Chạy lại an toàn: ảnh đã ở Drive được bỏ qua. Dừng trước giới hạn thời gian Apps Script → chạy lại để tiếp tục.
 * @returns {{imported: number, normalized: number, rowsUpdated: number, errors: string[], done: boolean}}
 */
function migrateImagesToDrive() {
  const started = Date.now();
  const budgetMs = 4.5 * 60 * 1000;
  const memo = {};
  const stats = { imported: 0, normalized: 0, rowsUpdated: 0, errors: [], done: true };
  const outOfTime = function () {
    if (Date.now() - started > budgetMs) {
      stats.done = false;
      return true;
    }
    return false;
  };
  const fix = function (url, folder) {
    if (!url) return url;
    try {
      const before = Object.keys(memo).length;
      const out = ensureDriveImage_(url, folder, memo);
      if (Object.keys(memo).length > before) stats.imported++;
      else if (out !== url) stats.normalized++;
      return out;
    } catch (e) {
      stats.errors.push(e.message);
      return url;
    }
  };

  // Sản phẩm: ảnh vào thư mục con theo slug
  getSheetData(SHEETS.PRODUCTS).forEach(function (p) {
    if (outOfTime()) return;
    const imgs = splitList_(p.images);
    const fixed = imgs.map(function (u) { return fix(u, p.slug); });
    if (fixed.join(',') !== imgs.join(',') || p.images !== imgs.join(',')) {
      updateRowById(SHEETS.PRODUCTS, p.id, { images: fixed.join(',') });
      stats.rowsUpdated++;
    }
  });

  // Banner & danh mục
  [[SHEETS.BANNERS, ['image', 'image_mobile'], IMAGE_FOLDERS.banners], [SHEETS.CATEGORIES, ['image'], IMAGE_FOLDERS.categories]].forEach(function (cfg) {
    getSheetData(cfg[0]).forEach(function (row) {
      if (outOfTime()) return;
      const patch = {};
      cfg[1].forEach(function (k) {
        const v = fix(row[k], cfg[2]);
        if (v !== row[k]) patch[k] = v;
      });
      if (Object.keys(patch).length) {
        updateRowById(cfg[0], row.id, patch);
        stats.rowsUpdated++;
      }
    });
  });

  // Settings chứa ảnh
  IMAGE_SETTINGS.forEach(function (key) {
    if (outOfTime()) return;
    const row = findBy(SHEETS.SETTINGS, 'key', key);
    if (!row || !row.value) return;
    const v = fix(row.value, IMAGE_FOLDERS.settings);
    if (v !== row.value) {
      updateRowById(SHEETS.SETTINGS, key, { value: v });
      stats.rowsUpdated++;
    }
  });

  // Ảnh lưu trong đơn hàng (items JSON) — dùng lại ảnh đã chuyển (memo), không tải thêm
  getSheetData(SHEETS.ORDERS).forEach(function (o) {
    if (outOfTime()) return;
    const items = parseJson_(o.items, []);
    let changed = false;
    items.forEach(function (it) {
      if (!it.image || isDriveImage_(it.image)) {
        if (it.image && it.image !== fix(it.image, '')) {
          it.image = fix(it.image, '');
          changed = true;
        }
        return;
      }
      const product = findBy(SHEETS.PRODUCTS, 'id', it.product_id);
      const replacement = memo[it.image] || (product && splitList_(product.images)[0]);
      if (replacement && replacement !== it.image) {
        it.image = replacement;
        changed = true;
      }
    });
    if (changed) {
      updateRowById(SHEETS.ORDERS, o.id, { items: items });
      stats.rowsUpdated++;
    }
  });

  clearCache_();
  stats.errors = stats.errors.slice(0, 20);
  console.log(JSON.stringify(stats));
  return stats;
}

/* ------------------------- Sắp xếp lại ảnh trên Drive ------------------------- */

/** Thư mục "FlowerShop Images" do bản đầu tự tạo (nếu có). */
function legacyFolders_(rootId) {
  const out = [];
  const seen = {};
  const add = function (f) {
    if (f && f.getId() !== rootId && !seen[f.getId()]) {
      seen[f.getId()] = true;
      out.push(f);
    }
  };
  const legacyId = getProp_('DRIVE_FOLDER_ID');
  if (legacyId) {
    try { add(DriveApp.getFolderById(legacyId)); } catch (e) { /* đã xoá */ }
  }
  const it = DriveApp.getFoldersByName(LEGACY_FOLDER_NAME);
  while (it.hasNext()) add(it.next());
  return out;
}

/** Chuyển toàn bộ nội dung thư mục `src` vào `dest` (gộp thư mục con trùng tên). */
function mergeFolderInto_(src, dest, stats) {
  const files = src.getFiles();
  while (files.hasNext()) {
    files.next().moveTo(dest);
    stats.moved++;
  }
  const subs = src.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    const existing = dest.getFoldersByName(sub.getName());
    if (existing.hasNext()) mergeFolderInto_(sub, existing.next(), stats);
    else {
      sub.moveTo(dest);
      stats.foldersMoved++;
    }
  }
}

/**
 * Đưa ảnh về đúng chỗ trong thư mục ảnh của shop:
 *  1. Ảnh sản phẩm đang nằm lẫn ở thư mục gốc, "chua-phan-loai" hoặc "FlowerShop Images"
 *     → chuyển vào thư mục con theo slug sản phẩm (dựa vào cột images trong Sheet).
 *  2. Nội dung còn lại của "FlowerShop Images" (banner/, danh-muc/…) → gộp vào thư mục gốc.
 * Ảnh đang nằm trong thư mục con khác (do bạn tự sắp xếp) được giữ nguyên.
 */
function reorganizeDriveImages() {
  const root = getRootFolder_();
  const rootId = root.getId();
  const legacy = legacyFolders_(rootId);
  const looseParents = {};
  looseParents[rootId] = true;
  legacy.forEach(function (f) { looseParents[f.getId()] = true; });
  const unsorted = root.getFoldersByName(UNSORTED_FOLDER);
  if (unsorted.hasNext()) looseParents[unsorted.next().getId()] = true;

  const stats = { moved: 0, foldersMoved: 0, legacyFolders: legacy.length, errors: [] };
  const done = {};
  getSheetData(SHEETS.PRODUCTS).forEach(function (p) {
    if (!p.slug) return;
    let target = null;
    splitList_(p.images).forEach(function (url) {
      const m = String(url).match(DRIVE_ID_RE);
      if (!m || done[m[1]]) return;
      done[m[1]] = true;
      try {
        const file = DriveApp.getFileById(m[1]);
        const parents = file.getParents();
        const parent = parents.hasNext() ? parents.next() : null;
        if (!parent || !looseParents[parent.getId()]) return; // đã nằm trong thư mục con → giữ nguyên
        target = target || productFolder_(p.id) || childFolder_(root, p.slug);
        file.moveTo(target);
        stats.moved++;
      } catch (e) {
        stats.errors.push(p.slug + ': ' + e.message);
      }
    });
  });

  legacy.forEach(function (f) {
    try {
      mergeFolderInto_(f, childFolder_(root, UNSORTED_FOLDER), stats);
    } catch (e) {
      stats.errors.push(f.getName() + ': ' + e.message);
    }
  });
  // banner/, danh-muc/, trang/ nằm trong chua-phan-loai sau khi gộp → đưa lên thư mục gốc
  const un = root.getFoldersByName(UNSORTED_FOLDER);
  if (un.hasNext()) {
    const unFolder = un.next();
    Object.keys(IMAGE_FOLDERS).forEach(function (k) {
      const it = unFolder.getFoldersByName(IMAGE_FOLDERS[k]);
      while (it.hasNext()) {
        const sub = it.next();
        const existing = root.getFoldersByName(IMAGE_FOLDERS[k]);
        if (existing.hasNext()) mergeFolderInto_(sub, existing.next(), stats);
        else {
          sub.moveTo(root);
          stats.foldersMoved++;
        }
      }
    });
  }
  if (getProp_('DRIVE_FOLDER_ID')) PropertiesService.getScriptProperties().deleteProperty('DRIVE_FOLDER_ID');
  stats.errors = stats.errors.slice(0, 20);
  console.log(JSON.stringify(stats));
  return stats;
}
