/**
 * Contacts.gs — form liên hệ / đặt hoa theo yêu cầu, đăng ký nhận tin.
 */

/** POST submitContact {name, phone, message} */
function submitContact(data) {
  if (str_(data.website, 100)) throw new Error('Yêu cầu không hợp lệ'); // honeypot
  const row = {
    id: shortId_(),
    created_at: nowIso_(),
    name: requireText_(data.name, 'họ tên', 100),
    phone: assertPhone_(data.phone),
    message: requireText_(data.message, 'nội dung', 2000),
    status: 'new',
  };
  appendRow(SHEETS.CONTACTS, row);
  return { id: row.id };
}

/** POST subscribe {email} → trả về mã ưu đãi đơn đầu (nếu có trong Settings). */
function subscribe(data) {
  const email = assertEmail_(data.email, true);
  if (!findBy(SHEETS.SUBSCRIBERS, 'email', email)) {
    appendRow(SHEETS.SUBSCRIBERS, { email: email, created_at: nowIso_() });
  }
  return { email: email, coupon: getAllSettings_().first_order_coupon || '' };
}
