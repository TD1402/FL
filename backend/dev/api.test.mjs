/**
 * Test API backend trên bộ giả lập GAS:  node --test dev/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGas } from './gas-emulator.mjs'

const gas = createGas()
gas.run('setup')
const DRIVE_A = 'https://lh3.googleusercontent.com/d/1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=w1000'
const DRIVE_B = 'https://drive.google.com/uc?export=view&id=1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

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
      data: { resource: 'products', item: { name: 'Bó hồng đỏ Mãi Yêu', price: 100000, images: [DRIVE_A, DRIVE_B], sizes: [{ name: 'S', price: 1 }], category_ids: 'c11' } },
    }),
  )
  assert.equal(created.slug, 'bo-hong-do-mai-yeu-2')
  assert.deepEqual(created.images, [DRIVE_A, 'https://lh3.googleusercontent.com/d/1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=w1000'])
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

test('warmCache dựng lại cache; memo cập nhật đúng sau khi ghi', () => {
  gas.run('warmCache')
  assert.ok(ok(gas.get({ action: 'getProducts' })).total > 0)
  gas.context._sheetMemo && gas.run('adjustStock_', [{ product_id: 'p001', qty: 1 }, { product_id: 'p001', qty: 2 }], -1)
  const p = gas.context.findBy('Products', 'id', 'p001')
  const fresh = (() => { gas.run('setup'); return gas.context.findBy('Products', 'id', 'p001') })()
  assert.equal(p.stock, fresh.stock)
})

test('link ảnh Google Drive được đổi sang lh3', () => {
  const n = gas.context.normalizeImageUrl_
  const lh3 = 'https://lh3.googleusercontent.com/d/1lllDxD00Ks9um6UEAugNMX7IwDeUInbP=w1000'
  assert.equal(n('https://drive.google.com/uc?export=view&id=1lllDxD00Ks9um6UEAugNMX7IwDeUInbP'), lh3)
  assert.equal(n('https://drive.google.com/open?id=1lllDxD00Ks9um6UEAugNMX7IwDeUInbP'), lh3)
  assert.equal(n('https://drive.google.com/file/d/1lllDxD00Ks9um6UEAugNMX7IwDeUInbP/view?usp=sharing'), lh3)
  assert.equal(n('https://images.unsplash.com/photo-1?w=1'), 'https://images.unsplash.com/photo-1?w=1')
})

test('upload vào thư mục con theo slug & duyệt ảnh Drive', () => {
  const token = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  const img = { mimeType: 'image/jpeg', base64: '/9j/4AAQSkZJRg==' }
  ok(gas.post({ action: 'uploadImage', token, data: { ...img, filename: 'b.jpg', folder: 'Hồng chùm Redcharm' } }))
  ok(gas.post({ action: 'uploadImage', token, data: { ...img, filename: 'a.jpg', folder: 'hong-chum-redcharm' } }))
  ok(gas.post({ action: 'uploadImage', token, data: { ...img, filename: 'root.jpg' } }))

  const root = ok(gas.post({ action: 'listDriveImages', token, data: {} }))
  const sub = root.folders.find((f) => f.name === 'hong-chum-redcharm')
  assert.ok(sub, 'tạo đúng 1 thư mục con theo slug')
  assert.equal(root.folders.filter((f) => f.name === 'hong-chum-redcharm').length, 1)
  assert.ok(root.folders.some((f) => f.name === 'chua-phan-loai'), 'ảnh không có slug → chua-phan-loai')
  assert.ok(!root.images.some((i) => i.name.endsWith('root')), 'không để ảnh lẫn ở thư mục gốc')

  const inSub = ok(gas.post({ action: 'listDriveImages', token, data: { folderId: sub.id } }))
  assert.equal(inSub.images.length, 2)
  assert.deepEqual(inSub.path.map((x) => x.name), [root.folder.name, 'hong-chum-redcharm'])
  assert.match(inSub.images[0].url, /^https:\/\/lh3\.googleusercontent\.com\/d\/.+=w1000$/)

  // Không cho duyệt thư mục ngoài phạm vi
  const outside = gas.context.DriveApp.createFolder('khac').getId()
  assert.equal(gas.post({ action: 'listDriveImages', token, data: { folderId: outside } }).success, false)
})

test('đăng nhập lại → token cũ hết hiệu lực ngay (kể cả khi đang cache)', () => {
  const t1 = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  ok(gas.post({ action: 'adminMe', token: t1 })) // đưa t1 vào cache
  const t2 = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  assert.equal(gas.post({ action: 'adminMe', token: t1 }).error, 'UNAUTHORIZED')
  ok(gas.post({ action: 'adminMe', token: t2 }))
  token = t2
})

test('mọi ảnh nằm trên Drive: setup chuyển ảnh mẫu, lưu link ngoài tự tải vào Drive', () => {
  const nonDrive = (urls) => urls.filter((u) => u && !/^https:\/\/lh3\.googleusercontent\.com\/d\//.test(u))
  const banners = ok(gas.get({ action: 'getBanners' }))
  assert.deepEqual(nonDrive(banners.flatMap((b) => [b.image, b.image_mobile])), [])
  const cats = ok(gas.get({ action: 'getCategories' })).flatMap((c) => [c, ...c.children])
  assert.deepEqual(nonDrive(cats.map((c) => c.image)), [])
  const prods = ok(gas.get({ action: 'getProducts', limit: 60 })).items
  assert.deepEqual(nonDrive(prods.flatMap((p) => p.images)), [])
  assert.ok(gas.fetches.some((u) => u.includes('fm=jpg') && !u.includes('auto=format')), 'Unsplash tải dạng JPEG')

  // Chạy lại: không tải thêm gì
  const n = gas.fetches.length
  const again = gas.run('migrateImagesToDrive')
  assert.equal(again.imported, 0)
  assert.equal(gas.fetches.length, n)

  const t = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  const saved = ok(gas.post({ action: 'adminSave', token: t, data: { resource: 'banners', item: { title: 'X', image: 'https://example.com/a.jpg', position: 'promo' } } }))
  assert.match(saved.image, /^https:\/\/lh3\.googleusercontent\.com\/d\/\w+=w1000$/)
  const banner = ok(gas.post({ action: 'listDriveImages', token: t, data: {} })).folders.find((f) => f.name === 'banner')
  assert.ok(banner, 'ảnh banner nằm trong thư mục banner/')

  assert.match(gas.post({ action: 'importImageUrl', token: t, data: { url: 'https://example.com/notimage' } }).error, /không phải ảnh/)
  assert.match(gas.post({ action: 'importImageUrl', token: t, data: { url: 'https://example.com/missing.jpg' } }).error, /404/)
  assert.match(gas.post({ action: 'importImageUrl', token: t, data: { url: 'javascript:alert(1)' } }).error, /không hợp lệ/)
  const imp = ok(gas.post({ action: 'importImageUrl', token: t, data: { url: DRIVE_B, folder: 'x' } }))
  assert.equal(imp.url, 'https://lh3.googleusercontent.com/d/1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=w1000')
  token = t
})

test('ảnh luôn vào thư mục gốc đúng, không slug → chua-phan-loai; sắp xếp lại ảnh đặt sai', () => {
  const ctx = gas.context
  const t = ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'HoaMoc@2026' } })).token
  token = t
  const img = { mimeType: 'image/jpeg', base64: '/9j/4AAQSkZJRg==' }
  const root = ctx.getRootFolder_()
  const folderOf = (url) => ctx.DriveApp.getFileById(url.match(/d\/(\w+)/)[1]).getParents().next()

  // Tình huống thật: bản cũ tạo "FlowerShop Images" ở My Drive + lưu DRIVE_FOLDER_ID
  const legacy = ctx.DriveApp.createFolder('FlowerShop Images')
  ctx.setProp_('DRIVE_FOLDER_ID', legacy.getId())
  assert.equal(ctx.getRootFolder_().getId(), root.getId(), 'bỏ qua DRIVE_FOLDER_ID cũ')

  // Upload không có slug → chua-phan-loai (không lẫn ở thư mục gốc)
  const loose = ok(gas.post({ action: 'uploadImage', token: t, data: { ...img, filename: 'x.jpg' } })).url
  assert.equal(folderOf(loose).getName(), 'chua-phan-loai')
  assert.equal(folderOf(loose).getParents().next().getId(), root.getId())

  // Ảnh sản phẩm bị đặt sai (nằm trong FlowerShop Images) + thư mục banner cũ
  const misplaced = legacy.createFile(ctx.Utilities.newBlob([1, 2, 3], 'image/jpeg', 'sai.jpg')).getId()
  legacy.createFolder('banner').createFile(ctx.Utilities.newBlob([1], 'image/jpeg', 'bn.jpg'))
  const orphan = legacy.createFile(ctx.Utilities.newBlob([1], 'image/jpeg', 'mo-coi.jpg')).getId()
  // Ảnh bạn tự sắp xếp ở thư mục con khác → phải giữ nguyên
  const curated = root.createFolder('scabiosa-tim').createFile(ctx.Utilities.newBlob([1], 'image/jpeg', 'giu.jpg')).getId()
  ctx.updateRowById('Products', 'p001', {
    images: [`https://lh3.googleusercontent.com/d/${misplaced}=w1000`, `https://lh3.googleusercontent.com/d/${curated}=w1000`, loose].join(','),
  })

  const r = ok(gas.post({ action: 'reorganizeImages', token: t }))
  assert.ok(r.moved >= 2)
  const at = (fid) => ctx.DriveApp.getFileById(fid).getParents().next()
  // Sản phẩm đã có ảnh trong thư mục do shop tự đặt (scabiosa-tim) → ảnh lạc được gom về đó
  assert.equal(at(misplaced).getName(), 'scabiosa-tim')
  assert.equal(at(misplaced).getParents().next().getId(), root.getId())
  assert.equal(folderOf(loose).getName(), 'scabiosa-tim', 'ảnh trong chua-phan-loai của sản phẩm cũng được xếp đúng')
  assert.equal(at(curated).getName(), 'scabiosa-tim', 'không đụng ảnh đã sắp xếp')
  assert.equal(at(orphan).getName(), 'chua-phan-loai', 'ảnh không thuộc sản phẩm nào → chua-phan-loai')
  const rootSubs = ok(gas.post({ action: 'listDriveImages', token: t, data: {} })).folders.map((f) => f.name)
  assert.ok(rootSubs.includes('banner'))
  assert.equal(rootSubs.filter((n) => n === 'banner').length, 1, 'gộp banner/ trùng tên')
  assert.equal(ctx.getProp_('DRIVE_FOLDER_ID'), '', 'xoá property cũ')
})

test('upload cho sản phẩm có sẵn → vào thư mục đang chứa ảnh của nó (giữ cách đặt tên của shop)', () => {
  const ctx = gas.context
  const t = token
  const root = ctx.getRootFolder_()
  const own = root.createFolder('bach-dan') // tên thư mục do shop tự đặt, khác slug
  const fid = own.createFile(ctx.Utilities.newBlob([1], 'image/jpeg', 'co-san.jpg')).getId()
  ctx.updateRowById('Products', 'p005', { images: `https://lh3.googleusercontent.com/d/${fid}=w1000` })
  const img = { mimeType: 'image/jpeg', base64: '/9j/4AAQSkZJRg==', filename: 'moi.jpg' }
  const up = ok(gas.post({ action: 'uploadImage', token: t, data: { ...img, folder: 'ten-khac', productId: 'p005' } })).url
  assert.equal(ctx.DriveApp.getFileById(up.match(/d\/(\w+)/)[1]).getParents().next().getName(), 'bach-dan')
  const list = ok(gas.post({ action: 'listDriveImages', token: t, data: { productId: 'p005' } }))
  assert.equal(list.folder.name, 'bach-dan')
  // Sản phẩm mới (chưa có id) → theo slug
  const up2 = ok(gas.post({ action: 'uploadImage', token: t, data: { ...img, folder: 'san-pham-moi' } })).url
  assert.equal(ctx.DriveApp.getFileById(up2.match(/d\/(\w+)/)[1]).getParents().next().getName(), 'san-pham-moi')
})

test('Google từ chối setSharing: thư mục đã công khai → upload vẫn thành công; chưa công khai → báo lỗi rõ', () => {
  const img = { mimeType: 'image/jpeg', base64: '/9j/4AAQSkZJRg==', filename: 'a.jpg', folder: 'x' }
  gas.driveSettings.setSharingFails = true
  gas.context.CacheService.getScriptCache().remove('root_public')
  const err = gas.post({ action: 'uploadImage', token, data: img }).error
  assert.match(err, /Bất kỳ ai có đường liên kết/)

  gas.driveSettings.rootSharing = 'ANYONE_WITH_LINK'
  gas.context.CacheService.getScriptCache().remove('root_public')
  assert.match(ok(gas.post({ action: 'uploadImage', token, data: img })).url, /^https:\/\/lh3/)
  gas.driveSettings.setSharingFails = false
})

test('đổi mật khẩu và đăng xuất', () => {
  assert.equal(gas.post({ action: 'adminChangePassword', token, data: { oldPassword: 'x', newPassword: '12345678' } }).success, false)
  ok(gas.post({ action: 'adminChangePassword', token, data: { oldPassword: 'HoaMoc@2026', newPassword: 'MatKhauMoi1' } }))
  ok(gas.post({ action: 'adminLogout', token }))
  assert.equal(gas.post({ action: 'adminMe', token }).error, 'UNAUTHORIZED')
  ok(gas.post({ action: 'adminLogin', data: { username: 'admin', password: 'MatKhauMoi1' } }))
})
