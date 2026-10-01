/**
 * Test API backend trên bộ giả lập GAS:  node --test dev/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGas } from './gas-emulator.mjs'

const gas = createGas()
gas.run('setup')

const ok = (r) => {
  assert.equal(r.success, true, r.error)
  return r.data
}
const tomorrow = () => {
  const d = new Date(Date.now() + 86400000)
  return gas.context.formatDate_(d, 'yyyy-MM-dd')
}

test('setup tạo dữ liệu mẫu đủ số lượng', () => {
  const cats = ok(gas.get({ action: 'getCategories' }))
  assert.ok(cats.length >= 3)
  const flat = cats.flatMap((c) => [c, ...c.children])
  assert.ok(flat.length >= 6)
  const all = ok(gas.get({ action: 'getProducts', limit: 60 }))
  assert.ok(all.total >= 24)
  assert.equal(gas.run('setup'), undefined) // chạy lại không nhân đôi dữ liệu
  assert.equal(ok(gas.get({ action: 'getProducts', limit: 60 })).total, all.total)
})

test('settings công khai không lộ khoá private, SĐT giữ số 0 đầu', () => {
  const s = ok(gas.get({ action: 'getSettings' }))
  assert.equal(s.hotline, '0901234567')
  assert.equal(s.bank_account_no, '0123456789')
  assert.ok(!('notify_email' in s))
  assert.equal(s.time_slots.length, 6)
})

test('getProducts lọc, sắp xếp, phân trang', () => {
  const byCat = ok(gas.get({ action: 'getProducts', category: 'hoa-theo-dip', limit: 60 }))
  const byChild = ok(gas.get({ action: 'getProducts', category: 'hoa-sinh-nhat', limit: 60 }))
  assert.ok(byCat.total >= byChild.total && byChild.total > 0)

  const asc = ok(gas.get({ action: 'getProducts', sort: 'price_asc', limit: 60 })).items
  for (let i = 1; i < asc.length; i++) assert.ok(asc[i - 1].final_price <= asc[i].final_price)

  const ranged = ok(gas.get({ action: 'getProducts', minPrice: 400000, maxPrice: 800000, limit: 60 })).items
  assert.ok(ranged.every((p) => p.final_price >= 400000 && p.final_price <= 800000))

  const q = ok(gas.get({ action: 'getProducts', q: 'huong duong' }))
  assert.ok(q.items.every((p) => /hướng dương/i.test(p.name + p.flowers.join())))

  const col = ok(gas.get({ action: 'getProducts', collection: 'valentine' }))
  assert.ok(col.total > 0)
  const allCollections = ok(gas.get({ action: 'getProducts', category: 'bo-suu-tap', limit: 60 }))
  assert.ok(allCollections.total >= col.total && allCollections.items.every((p) => p.collection))
  assert.ok(ok(gas.get({ action: 'getProducts', isNew: 'true', limit: 60 })).items.every((p) => p.is_new))

  const p2 = ok(gas.get({ action: 'getProducts', page: 2, limit: 5 }))
  assert.equal(p2.items.length, 5)
  assert.ok(!('description' in p2.items[0]))
  assert.ok(byCat.facets.colors.length > 0)
})

test('getProduct trả chi tiết + liên quan, slug sai báo lỗi', () => {
  const list = ok(gas.get({ action: 'getProducts' })).items
  const d = ok(gas.get({ action: 'getProduct', slug: list[0].slug }))
  assert.equal(d.product.slug, list[0].slug)
  assert.ok(d.product.description.length > 0)
  assert.ok(d.related.every((r) => r.id !== d.product.id))
  assert.equal(gas.get({ action: 'getProduct', slug: 'khong-ton-tai' }).success, false)
})

test('checkCoupon', () => {
  assert.equal(ok(gas.post({ action: 'checkCoupon', data: { code: 'chaoban10', subtotal: 500000 } })).discount, 50000)
  assert.equal(ok(gas.post({ action: 'checkCoupon', data: { code: 'CHAOBAN10', subtotal: 5000000 } })).discount, 100000)
  assert.equal(gas.post({ action: 'checkCoupon', data: { code: 'CHAOBAN10', subtotal: 100000 } }).success, false)
  assert.equal(gas.post({ action: 'checkCoupon', data: { code: 'XYZ', subtotal: 100000 } }).success, false)
})

let order
test('createOrder tính lại giá ở server, trừ kho, áp coupon', () => {
  const detail = ok(gas.get({ action: 'getProduct', slug: 'bo-hong-do-mai-yeu' })).product
  const before = detail.stock
  order = ok(
    gas.post({
      action: 'createOrder',
      data: {
        customer_name: 'Khách Test',
        customer_phone: '+84912345678',
        receiver_name: 'Người Nhận',
        receiver_phone: '0987654321',
        address: '1 Lê Lợi',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        delivery_date: tomorrow(),
        delivery_time_slot: '10:00 - 12:00',
        card_message: '=HYPERLINK("http://evil")',
        payment_method: 'BANK',
        coupon_code: 'GIAM50K',
        items: [{ product_id: detail.id, size: 'Vừa', qty: 2, price: 1 }],
      },
    }),
  )
  assert.match(order.order_code, /^HOA\d{6}\d{4}$/)
  assert.equal(order.subtotal, 850000 * 2)
  assert.equal(order.discount, 50000)
  assert.equal(order.shipping_fee, 0)
  assert.equal(order.total, 1700000 - 50000)
  assert.equal(order.card_message, '=HYPERLINK("http://evil")') // lưu nguyên văn dạng text, không thành công thức

  const after = ok(gas.get({ action: 'getProduct', slug: 'bo-hong-do-mai-yeu' })).product.stock
  assert.equal(after, before - 2)
  assert.equal(gas.mails.length, 1)
})

test('createOrder từ chối dữ liệu xấu', () => {
  const base = {
    customer_name: 'A', customer_phone: '0912345678', address: 'x', district: 'y', city: 'z',
    delivery_date: tomorrow(), delivery_time_slot: '10:00 - 12:00', items: [{ product_id: 'p001', qty: 1 }],
  }
  const err = (data) => gas.post({ action: 'createOrder', data }).error
  assert.match(err({ ...base, customer_phone: '012345' }), /điện thoại/)
  assert.match(err({ ...base, delivery_date: '2000-01-01' }), /quá khứ/)
  assert.match(err({ ...base, delivery_time_slot: '3h sáng' }), /khung giờ/)
  assert.match(err({ ...base, items: [] }), /trống/)
  assert.match(err({ ...base, items: [{ product_id: 'p001', qty: 999 }] }), /Số lượng|chỉ còn/)
  assert.match(err({ ...base, items: [{ product_id: 'p002', size: 'XXL', qty: 1 }] }), /Kích cỡ/)
  assert.match(err({ ...base, items: [{ product_id: 'p004', qty: 5 }] }), /chỉ còn/)
})

test('trackOrder cần đúng SĐT', () => {
  const t = ok(gas.post({ action: 'trackOrder', data: { code: order.order_code.toLowerCase(), phone: '0912345678' } }))
  assert.equal(t.total, order.total)
  assert.equal(gas.post({ action: 'trackOrder', data: { code: order.order_code, phone: '0900000000' } }).success, false)
})

test('contact + subscribe', () => {
  ok(gas.post({ action: 'submitContact', data: { name: 'An', phone: '0912345678', message: 'Đặt hoa cưới' } }))
  assert.equal(ok(gas.post({ action: 'subscribe', data: { email: 'a@b.vn' } })).coupon, 'CHAOBAN10')
  assert.equal(gas.post({ action: 'subscribe', data: { email: 'bad' } }).success, false)
})

let token
test('admin: login, phân quyền, CRUD, đổi trạng thái đơn', () => {
  assert.equal(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'sai' } }).success, false)
  token = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  assert.equal(gas.post({ action: 'adminList', data: { resource: 'orders' } }).error, 'UNAUTHORIZED')

  const orders = ok(gas.post({ action: 'adminList', token, data: { resource: 'orders', filters: { q: order.order_code } } }))
  assert.equal(orders.total, 1)
  const o = orders.items[0]
  assert.equal(o.customer_phone, '0912345678')

  const slug = 'bo-hong-do-mai-yeu'
  const stock = () => ok(gas.get({ action: 'getProduct', slug })).product.stock
  const s0 = stock()
  ok(gas.post({ action: 'updateOrderStatus', token, data: { id: o.id, status: 'cancelled' } }))
  assert.equal(stock(), s0 + 2)
  ok(gas.post({ action: 'updateOrderStatus', token, data: { id: o.id, status: 'confirmed', payment_status: 'paid' } }))
  assert.equal(stock(), s0)

  const created = ok(
    gas.post({
      action: 'adminSave', token,
      data: { resource: 'products', item: { name: 'Bó hồng đỏ Mãi Yêu', price: 100000, images: ['a', 'b'], sizes: [{ name: 'S', price: 1 }], category_ids: 'c11' } },
    }),
  )
  assert.equal(created.slug, 'bo-hong-do-mai-yeu-2')
  assert.deepEqual(created.images, ['a', 'b'])
  const updated = ok(gas.post({ action: 'adminSave', token, data: { resource: 'products', item: { id: created.id, price: 120000 } } }))
  assert.equal(updated.price, 120000)
  assert.equal(updated.name, 'Bó hồng đỏ Mãi Yêu')
  ok(gas.post({ action: 'adminDelete', token, data: { resource: 'products', id: created.id } }))
  assert.equal(gas.get({ action: 'getProduct', slug: created.slug }).success, false)

  ok(gas.post({ action: 'adminSave', token, data: { resource: 'coupons', create: true, item: { code: 'new 1', type: 'fixed', value: 20000 } } }))
  assert.equal(gas.post({ action: 'adminSave', token, data: { resource: 'coupons', create: true, item: { code: 'NEW1', type: 'fixed', value: 1 } } }).success, false)

  ok(gas.post({ action: 'adminSave', token, data: { resource: 'settings', item: { hotline: '0911111111' } } }))
  assert.equal(ok(gas.get({ action: 'getSettings' })).hotline, '0911111111')

  const up = ok(gas.post({ action: 'uploadImage', token, data: { filename: 'Ảnh hoa.png', mimeType: 'image/png', base64: 'iVBORw0KGgo=' } }))
  assert.match(up.url, /^https:\/\/lh3\.googleusercontent\.com\/d\/.+=w1000$/)

  const dash = ok(gas.post({ action: 'getDashboard', token }))
  assert.ok(dash.revenueMonth > 0)
  assert.equal(dash.revenueByDay.length, 14)
})

test('link ảnh Google Drive được đổi sang lh3', () => {
  const n = gas.context.normalizeImageUrl_
  const lh3 = 'https://lh3.googleusercontent.com/d/1lllDxD00Ks9um6UEAugNMX7IwDeUInbP=w1000'
  assert.equal(n('https://drive.google.com/uc?export=view&id=1lllDxD00Ks9um6UEAugNMX7IwDeUInbP'), lh3)
  assert.equal(n('https://drive.google.com/open?id=1lllDxD00Ks9um6UEAugNMX7IwDeUInbP'), lh3)
  assert.equal(n('https://drive.google.com/file/d/1lllDxD00Ks9um6UEAugNMX7IwDeUInbP/view?usp=sharing'), lh3)
  assert.equal(n('https://images.unsplash.com/photo-1?w=1'), 'https://images.unsplash.com/photo-1?w=1')
})

test('đổi mật khẩu và đăng xuất', () => {
  assert.equal(gas.post({ action: 'adminChangePassword', token, data: { oldPassword: 'x', newPassword: '12345678' } }).success, false)
  ok(gas.post({ action: 'adminChangePassword', token, data: { oldPassword: 'HoaMoc@2026', newPassword: 'MatKhauMoi1' } }))
  ok(gas.post({ action: 'adminLogout', token }))
  assert.equal(gas.post({ action: 'adminMe', token }).error, 'UNAUTHORIZED')
  ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'MatKhauMoi1' } }))
})
