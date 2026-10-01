/**
 * Settings.gs — cài đặt chung dạng key | value.
 */

function getAllSettings_() {
  return withCache_('settings_all', function () {
    const map = {};
    getSheetData(SHEETS.SETTINGS).forEach(function (r) {
      if (r.key) map[String(r.key).trim()] = r.value;
    });
    return map;
  });
}

function getPublicSettings() {
  const all = getAllSettings_();
  const out = {};
  Object.keys(all).forEach(function (k) {
    if (PRIVATE_SETTINGS.indexOf(k) < 0) out[k] = all[k];
  });
  out.time_slots = TIME_SLOTS.map(function (s) { return { label: s[0], start: s[1] }; });
  out.prep_hours = PREP_HOURS;
  return out;
}

function getSettingNumber_(key, def) {
  const v = Number(getAllSettings_()[key]);
  return isNaN(v) || getAllSettings_()[key] === '' ? def : v;
}

/** Admin: lưu nhiều key cùng lúc. `item` = { key: value, ... } */
function saveSettings_(item) {
  if (!item || typeof item !== 'object') throw new Error('Dữ liệu cài đặt không hợp lệ');
  const existing = {};
  getSheetData(SHEETS.SETTINGS).forEach(function (r) { existing[r.key] = true; });
  Object.keys(item).forEach(function (rawKey) {
    const key = str_(rawKey, 100);
    if (!/^[a-z0-9_]+$/.test(key)) return;
    const value = str_(item[rawKey], 5000);
    if (existing[key]) updateRowById(SHEETS.SETTINGS, key, { value: value });
    else appendRow(SHEETS.SETTINGS, { key: key, value: value });
  });
  clearCache_();
  return getAllSettings_();
}
