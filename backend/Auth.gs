/**
 * Auth.gs — đăng nhập admin: SHA-256 + salt, token ngẫu nhiên hết hạn sau 7 ngày.
 */

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

/** password_hash lưu dạng "salt$hash". */
function hashPassword_(password, salt) {
  const s = salt || Utilities.getUuid().replace(/-/g, '');
  return s + '$' + sha256Hex_(s + ':' + password);
}

function verifyPassword_(password, stored) {
  const salt = String(stored || '').split('$')[0];
  return !!salt && hashPassword_(password, salt) === stored;
}

/** POST adminLogin {username, password} → {token, expires, username, role} */
function adminLogin(data) {
  const username = str_(data.username, 50).toLowerCase();
  const password = String(data.password || '');
  if (!username || !password) throw new Error('Vui lòng nhập tài khoản và mật khẩu');

  // Chặn dò mật khẩu: tối đa 5 lần sai / 15 phút cho mỗi tài khoản.
  const cache = CacheService.getScriptCache();
  const failKey = 'login_fail_' + username;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= 5) throw new Error('Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút');

  const admin = findBy(SHEETS.ADMINS, 'username', username);
  if (!admin || !verifyPassword_(password, admin.password_hash)) {
    cache.put(failKey, String(fails + 1), 900);
    throw new Error('Sai tài khoản hoặc mật khẩu');
  }
  cache.remove(failKey);

  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();
  updateRowById(SHEETS.ADMINS, username, { token: token, token_expires: expires });
  return { token: token, expires: expires, username: username, role: admin.role };
}

/** Xác thực token trong body request. Ném 'UNAUTHORIZED' nếu không hợp lệ. */
function requireAdmin_(token) {
  const t = String(token || '');
  if (t.length < 32) throw new Error('UNAUTHORIZED');
  const admin = findBy(SHEETS.ADMINS, 'token', t);
  if (!admin || !admin.token_expires || new Date(admin.token_expires).getTime() < Date.now()) {
    throw new Error('UNAUTHORIZED');
  }
  return admin;
}

function adminLogout(admin) {
  updateRowById(SHEETS.ADMINS, admin.username, { token: '', token_expires: '' });
  return true;
}

/** POST adminChangePassword {oldPassword, newPassword} */
function adminChangePassword(data, admin) {
  if (!verifyPassword_(String(data.oldPassword || ''), admin.password_hash)) throw new Error('Mật khẩu hiện tại không đúng');
  const pw = String(data.newPassword || '');
  if (pw.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
  updateRowById(SHEETS.ADMINS, admin.username, { password_hash: hashPassword_(pw) });
  return true;
}
