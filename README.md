# Hoa Mộc — Website bán hoa tươi

Backend **Google Apps Script** (dữ liệu trên Google Sheets, ảnh trên Google Drive) + Frontend **Vue 3 / Vite / Pinia / Vue Router / Tailwind CSS v4**.

```
├── backend/                 Google Apps Script (đẩy bằng clasp hoặc copy tay)
│   ├── appsscript.json
│   ├── Code.gs              doGet / doPost + router theo `action`
│   ├── Config.gs            tên sheet, header, hằng số
│   ├── Utils.gs             đọc/ghi sheet, cache, lock, validate, chống formula injection
│   ├── Products.gs  Categories.gs  Orders.gs  Coupons.gs  Banners.gs  Settings.gs  Contacts.gs
│   ├── Auth.gs              SHA-256 + salt, token 7 ngày, chặn dò mật khẩu
│   ├── Admin.gs             adminList / adminSave / adminDelete / uploadImage / getDashboard
│   ├── Setup.gs             setup(): tạo sheet + dữ liệu mẫu + tài khoản admin
│   └── dev/                 (chỉ dùng local) bộ giả lập GAS, server dev, test API
└── frontend/                Vue 3 + Vite
    ├── src/api/             client.js (fetch wrapper), shop.js, admin.js
    ├── src/stores/          cart, wishlist, auth, settings, ui (Pinia + persist)
    ├── src/layouts/         ShopLayout, AdminLayout
    ├── src/components/      shop/ · admin/ · ui/
    ├── src/views/           trang khách + views/admin/
    └── src/composables/     useSeo, useToast, useAsync, useCurrency, useDebounce
```

---

## 1. Chạy thử ngay trên máy (không cần Google)

Repo có sẵn một **bộ giả lập Apps Script** chạy các file `.gs` thật trên Node, với dữ liệu mẫu.

```bash
# Terminal 1 — backend giả lập tại http://localhost:8787/exec
cd backend
npm run dev            # npm run dev:reset để xoá dữ liệu và chạy lại setup()

# Terminal 2 — frontend tại http://localhost:5173
cd frontend
npm install
npm run dev
```

Admin: http://localhost:5173/admin — tài khoản `admin` / `HoaMoc@2026`.

Test API backend: `cd backend && npm test` (11 nhóm test: lọc sản phẩm, tạo đơn tính lại giá ở server, tồn kho, coupon, auth, CRUD…).

> Yêu cầu Node ≥ 20.

---

## 2. Tạo Google Sheet và deploy backend

### Cách A — copy tay (đơn giản nhất)

1. Tạo một Google Sheet mới (ví dụ “Hoa Mộc Data”).
2. **Tiện ích mở rộng → Apps Script**.
3. Tạo các file `.gs` giống thư mục `backend/` và dán nội dung vào. Không cần thư mục `dev/`.
4. **Project Settings → Show "appsscript.json" manifest file**, rồi dán nội dung `backend/appsscript.json`.

### Cách B — dùng clasp

```bash
npm i -g @google/clasp
clasp login
cd backend
clasp create --type sheets --title "Hoa Moc" --rootDir .   # tạo Sheet + script gắn kèm
clasp push
```

(Hoặc copy `.clasp.json.example` → `.clasp.json` và điền `scriptId` của project có sẵn.)

### Script Properties (Project Settings → Script Properties)

| Key | Bắt buộc | Mô tả |
|---|---|---|
| `SPREADSHEET_ID` | Không* | ID của Sheet. *Bỏ trống nếu script gắn với Sheet (container-bound). |
| `DRIVE_FOLDER_ID` | Không | Thư mục Drive lưu ảnh upload. Bỏ trống → tự tạo “FlowerShop Images”. |
| `ADMIN_PASSWORD` | Nên có | Mật khẩu admin dùng khi chạy `setup()` lần đầu (≥ 8 ký tự). |
| `TELEGRAM_BOT_TOKEN` | Không | Bot token để báo đơn mới qua Telegram. |
| `TELEGRAM_CHAT_ID` | Không | Chat/Group ID nhận thông báo. |

Không có thông tin nhạy cảm nào được hard-code trong code.

### Chạy setup()

Trong trình soạn thảo Apps Script, chọn hàm **`setup`** → **Run** → cấp quyền. Hàm này tạo các sheet `Categories, Products, Orders, Banners, Coupons, Settings, Admins, Contacts, Subscribers`, kèm dữ liệu mẫu (19 danh mục, 26 sản phẩm, 9 banner, 3 mã giảm giá, 8 đơn mẫu) và tài khoản `admin`.
Chạy lại an toàn: sheet đã có dữ liệu sẽ không bị ghi đè.

- Mật khẩu admin = `ADMIN_PASSWORD`, hoặc `HoaMoc@2026` nếu chưa đặt. **Đổi ngay** trong Admin → Cài đặt.
- Quên mật khẩu: đặt lại `ADMIN_PASSWORD` rồi chạy hàm `resetAdminPassword`.

### Deploy Web App

1. **Deploy → New deployment → Web app**
2. **Execute as: Me** · **Who has access: Anyone**
3. Copy URL kết thúc bằng `/exec`, rồi kiểm tra trên trình duyệt: `…/exec?action=getProducts&limit=2`
4. **Mỗi lần sửa code**: Deploy → **Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL giữ nguyên).
   Nếu tạo “New deployment”, bạn sẽ nhận một URL mới.

Email báo đơn mới được gửi tới `notify_email` (cài đặt trong Admin), nếu trống thì gửi tới `email` của shop hoặc tài khoản Google deploy.

---

## 3. Frontend

```bash
cd frontend
cp .env.example .env.production.local     # hoặc .env.local
# sửa VITE_API_URL=https://script.google.com/macros/s/xxx/exec
npm run build        # → dist/
npm run preview      # xem thử bản build
npm run lint         # ESLint (flat config) · npm run format → Prettier
```

Muốn chạy dev với Web App thật, tạo `frontend/.env.development.local` chứa `VITE_API_URL=…/exec`.

### Gọi API Apps Script (CORS)

Apps Script không hỗ trợ preflight `OPTIONS`, nên `src/api/client.js`:
- **GET** `?action=…` bình thường;
- **POST** với `Content-Type: text/plain;charset=utf-8`, body `JSON.stringify({ action, token, data })`, **không** thêm header tuỳ chỉnh. Token admin nằm trong body;
- giữ `redirect: 'follow'` (GAS trả 302 sang `script.googleusercontent.com`).

Server giả lập trả `405` cho OPTIONS giống GAS, nên lỗi CORS sẽ lộ ra ngay khi dev.
Có thể bật proxy Vite khi dev bằng `VITE_USE_PROXY=true`, nhưng production không cần.

### Deploy

| Nền tảng | Cấu hình |
|---|---|
| **Vercel** | Import thư mục `frontend`, build `npm run build`, output `dist`. Đã có `vercel.json` rewrite mọi route về `index.html`. Thêm env `VITE_API_URL`. |
| **Netlify** | Base `frontend`. Đã có `netlify.toml` + `public/_redirects`. Thêm env `VITE_API_URL`. |
| **GitHub Pages** | Đặt `VITE_ROUTER_MODE=hash` (URL dạng `/#/san-pham/...`) và `VITE_BASE=/<tên-repo>/` nếu là project page, rồi deploy thư mục `dist`. |

---

## 4. Ghi chú nghiệp vụ

- **Giá cuối** = `sale_price` (nếu > 0 và < `price`), ngược lại = `price`. Nếu sản phẩm có `sizes` thì dùng giá của size đã chọn.
- **createOrder** đọc lại sheet Products trong `LockService`: tính lại giá, kiểm tra tồn kho, áp coupon, trừ kho, tăng `used_count`, sinh mã `HOA` + `yyMMdd` + số thứ tự 4 chữ số. Giá gửi từ client bị bỏ qua.
- **Phí ship**: `shipping_fee_default`, miễn phí khi tạm tính ≥ `free_ship_from`.
- **Giao hàng**: không chọn được ngày quá khứ. Đặt trong ngày thì ẩn khung giờ bắt đầu trước *giờ hiện tại + 2h*, theo giờ Việt Nam ở cả client và server.
- **Huỷ đơn** (`cancelled`) sẽ hoàn tồn kho. Khôi phục đơn đã huỷ sẽ trừ kho lại.
- **Bộ sưu tập** (20/10, 8/3, Valentine, 20/11, Tết) là danh mục con của “Bộ sưu tập”. Cột `collection` của sản phẩm lưu **slug** của bộ sưu tập.
- **Xoá** trong admin là xoá mềm (`is_active = false`, liên hệ → `status = deleted`).
- **Cache**: sản phẩm, danh mục, settings, banner được cache 10 phút (CacheService, chia nhỏ khi > 100KB), và tự xoá khi admin lưu dữ liệu hoặc có đơn mới.
- **An toàn dữ liệu**: chuỗi bắt đầu bằng `= + - @` hoặc chữ số được ghi dạng text (thêm `'`). Điều này chống formula injection và giữ số 0 đầu SĐT. Form công khai có honeypot chống bot.
- Nội dung trang tĩnh (Giới thiệu, chính sách) nằm ở `frontend/src/views/staticPages.js`.
