/**
 * Code.gs — điểm vào Web App: doGet / doPost và bộ định tuyến theo `action`.
 *
 * GET  ?action=...&...                 → dữ liệu công khai
 * POST body (text/plain) {action, token?, data} → thao tác ghi
 * Response: { success: true, data } | { success: false, error }
 */

const GET_ROUTES = {
  ping: function () { return { time: nowIso_() }; },
  getSettings: function () { return getPublicSettings(); },
  getCategories: function () { return getCategoryTree(); },
  getBanners: function (p) { return getBanners(p.position); },
  getProducts: function (p) { return getProducts(p); },
  getProduct: function (p) { return getProduct(p.slug); },
};

const PUBLIC_POST_ROUTES = {
  checkCoupon: function (d) { return checkCoupon(d); },
  createOrder: function (d) { return createOrder(d); },
  trackOrder: function (d) { return trackOrder(d); },
  submitContact: function (d) { return submitContact(d); },
  subscribe: function (d) { return subscribe(d); },
  adminLogin: function (d) { return adminLogin(d); },
};

/** Các route cần token: hàm nhận (data, admin). */
const ADMIN_POST_ROUTES = {
  adminMe: function (d, admin) { return { username: admin.username, role: admin.role }; },
  adminLogout: function (d, admin) { return adminLogout(admin); },
  adminChangePassword: function (d, admin) { return adminChangePassword(d, admin); },
  adminList: function (d) { return adminList(d); },
  adminGet: function (d) { return adminGet(d); },
  adminSave: function (d) { return adminSave(d); },
  adminDelete: function (d) { return adminDelete(d); },
  updateOrderStatus: function (d) { return updateOrderStatus(d); },
  uploadImage: function (d) { return uploadImage(d); },
  getDashboard: function (d) { return getDashboard(d); },
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  return respond_(function () {
    const fn = GET_ROUTES[params.action];
    if (!fn) throw new Error('Action không hợp lệ: ' + (params.action || '(trống)'));
    return fn(params);
  });
}

function doPost(e) {
  return respond_(function () {
    let body;
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      throw new Error('Body phải là JSON hợp lệ');
    }
    const action = body.action;
    const data = body.data || {};
    if (PUBLIC_POST_ROUTES[action]) return PUBLIC_POST_ROUTES[action](data);
    if (ADMIN_POST_ROUTES[action]) return ADMIN_POST_ROUTES[action](data, requireAdmin_(body.token));
    throw new Error('Action không hợp lệ: ' + (action || '(trống)'));
  });
}

function respond_(fn) {
  try {
    return jsonOut_({ success: true, data: fn() });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonOut_({ success: false, error: (err && err.message) || String(err) });
  }
}
