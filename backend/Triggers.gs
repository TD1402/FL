/**
 * Triggers.gs — giữ cache luôn "nóng" để API phản hồi nhanh.
 *
 * Chạy installTriggers() MỘT LẦN trong trình soạn thảo Apps Script (cấp quyền khi được hỏi):
 *  - onSheetEdit: sửa trực tiếp trên Google Sheet → xoá & dựng lại cache ngay.
 *  - warmCache: mỗi 10 phút dựng lại cache (khách không phải chờ đọc Sheet).
 * Sau đó cache được giữ tối đa 6 giờ (thay vì 10 phút).
 */

function installTriggers() {
  const handlers = ['onSheetEdit', 'warmCache'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  const ssId = getSs_().getId();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ssId).onEdit().create();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ssId).onChange().create();
  ScriptApp.newTrigger('warmCache').timeBased().everyMinutes(10).create();
  setProp_('TRIGGERS_INSTALLED', '1');
  warmCache();
  console.log('Đã cài trigger làm nóng cache.');
}

function uninstallTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['onSheetEdit', 'warmCache'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  PropertiesService.getScriptProperties().deleteProperty('TRIGGERS_INSTALLED');
}

function onSheetEdit() {
  warmCache();
}

/** Dựng lại toàn bộ cache dữ liệu công khai (ghi đè, không xoá trước → không có lúc cache trống). */
function warmCache() {
  _forceRefresh = true;
  try {
    getAllSettings_();
    getActiveCategories_();
    getBanners();
    getPublicProducts_();
  } finally {
    _forceRefresh = false;
  }
}
