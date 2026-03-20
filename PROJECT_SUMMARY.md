# ShopTi – Tổng hợp dự án

## 1. Công nghệ (Tech stack)

| Tầng | Công nghệ |
|------|-----------|
| **Frontend** | HTML5, CSS3 (design system theo UI_SPEC), JavaScript thuần (không framework), Fetch API, hash routing (`#/products`, `#/cart`, …) |
| **Backend** | Node.js, Express |
| **Database** | SQLite (file: `backend/database/shopti.db`), better-sqlite3 |
| **Auth** | JWT (Bearer token), bcryptjs (hash mật khẩu) |
| **Khác** | CORS, dotenv (biến môi trường) |

---

## 2. Cấu trúc thư mục

```
ShopTi/
├── frontend/           # Giao diện người dùng
│   ├── css/           # base, layout, buttons, cards, forms, animations
│   ├── js/            # api.js, auth.js, cart.js, products.js, orders.js, ui.js, app.js (routing)
│   ├── admin/         # Trang admin (dashboard, products, orders, users)
│   ├── images/        # Ảnh placeholder
│   └── index.html     # SPA entry
├── backend/
│   ├── routes/        # auth, products, categories, cart, orders, admin
│   ├── middleware/   # authenticate, requireAdmin
│   ├── database/     # schema.sql, init.js, shopti.db
│   └── server.js     # Express app, mount API + static frontend
├── PROJECT_UI_SPEC.md  # Spec màu sắc, typography, layout, components
├── README.md
└── PROJECT_SUMMARY.md  # File này
```

---

## 3. Database (SQLite)

### Bảng

| Bảng | Mô tả |
|------|--------|
| **users** | id, email, password_hash, full_name, phone, address, role (user/admin), created_at, updated_at |
| **categories** | id, name, created_at |
| **products** | id, name, description, price, image_url, stock, **category_id**, **size**, **color**, created_at, updated_at |
| **cart_items** | id, user_id, product_id, quantity, created_at (UNIQUE user_id + product_id) |
| **orders** | id, user_id, status, total_amount, receiver_name, receiver_phone, shipping_address, payment_method, created_at, updated_at |
| **order_items** | id, order_id, product_id, quantity, price_at_order, product_name |

### Trạng thái đơn hàng (orders.status)

- `pending` → `confirmed` → `shipped` → `delivered` (hoàn thành)
- `cancelled` (hủy)

### Thanh toán (orders.payment_method)

- `cod`, `bank`, `wallet`

### Index

- `idx_cart_user`, `idx_orders_user`, `idx_order_items_order`  
- Index `category_id` trên products (tạo trong init.js khi có cột).

---

## 4. Chức năng (Features)

### 4.1 Người dùng (User)

| Chức năng | Mô tả |
|-----------|--------|
| **Đăng ký / Đăng nhập** | JWT, modal flip Login/Register, lưu token |
| **Trang chủ** | Hero, nút “View all products” |
| **Sản phẩm** | Danh sách, **lọc**: danh mục, size, màu, khoảng giá, tìm kiếm; card hiển thị danh mục, size, màu, giá |
| **Chi tiết sản phẩm** | Tên, giá, danh mục, size, màu, mô tả, tồn kho, “Thêm vào giỏ” |
| **Giỏ hàng** | Xem giỏ, đổi số lượng, xóa; badge số lượng trên header; checkout khi có hàng |
| **Checkout** | Nhập tên/SĐT/địa chỉ người nhận, phương thức thanh toán, bảng sản phẩm, thay đổi số lượng, xác nhận xóa; tạo đơn → trừ tồn kho, xóa giỏ |
| **Đơn hàng** | Danh sách đơn của tôi, chi tiết đơn; **hủy đơn** (chỉ khi pending/confirmed) → hoàn lại tồn kho |
| **Tài khoản (Profile)** | Xem/sửa full_name, phone, address; lưu để điền sẵn checkout |

### 4.2 Admin (sau khi đăng nhập role admin)

| Chức năng | Mô tả |
|-----------|--------|
| **Dashboard** | **Đơn hoàn thành**, **Đơn hủy**, **Doanh thu ước tính** (tất cả đơn), **Doanh thu thực tế** (chỉ đơn delivered); Tổng đơn, Sản phẩm, Users; bảng recent orders |
| **Products** | Bảng: ID, Name, Danh mục, Size, Màu, Price, Stock, Actions; Thêm/Sửa/Xóa (modal: name, description, **danh mục**, price, **size**, **màu**, image_url, stock) |
| **Orders** | Danh sách đơn, cập nhật trạng thái (pending → confirmed → shipped → delivered / cancelled) |
| **Users** | Danh sách user, sửa (name, role), xóa (trừ chính mình) |

### 4.3 Hành vi nghiệp vụ

- **Tồn kho**: Trừ khi tạo đơn; hoàn lại khi user hoặc admin hủy đơn.
- **Hủy đơn**: User chỉ hủy được khi đơn ở trạng thái pending/confirmed.

---

## 5. API (REST) chính

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | /api/auth/register | - | Đăng ký |
| POST | /api/auth/login | - | Đăng nhập |
| GET | /api/auth/me | JWT | User hiện tại |
| PUT | /api/auth/profile | JWT | Cập nhật profile |
| GET | /api/products | - | List + filter (search, category_id, size, color, min_price, max_price, limit, offset) |
| GET | /api/products/filters | - | Lấy categories, sizes, colors cho dropdown lọc |
| GET | /api/products/:id | - | Chi tiết sản phẩm (kèm category_name) |
| GET | /api/categories | - | Danh sách danh mục |
| GET/POST/PUT/DELETE | /api/cart, /api/cart/:id | JWT | Giỏ hàng |
| GET | /api/orders | JWT | Đơn của tôi |
| GET | /api/orders/:id | JWT | Chi tiết đơn |
| PUT | /api/orders/:id/cancel | JWT | Hủy đơn |
| POST | /api/orders | JWT | Tạo đơn (checkout) |
| GET | /api/admin/dashboard | Admin | Thống kê dashboard |
| GET | /api/admin/categories | Admin | Danh mục (form sản phẩm) |
| GET/POST | /api/admin/products | Admin | List / tạo sản phẩm |
| GET/PUT/DELETE | /api/admin/products/:id | Admin | Chi tiết / sửa / xóa sản phẩm |
| GET | /api/admin/orders | Admin | Danh sách đơn |
| GET/PUT | /api/admin/orders/:id | Admin | Chi tiết / cập nhật trạng thái |
| GET | /api/admin/users | Admin | Danh sách user |
| GET/PUT/DELETE | /api/admin/users/:id | Admin | Chi tiết / sửa / xóa user |

---

## 6. Giao diện & UX (theo PROJECT_UI_SPEC.md)

- **Màu**: Primary #2563EB, Secondary #10B981, nền #F9FAFB, chữ #111827 / #6B7280.
- **Font**: Inter, 32/24/20/16/14/12px.
- **Layout**: Grid 12 cột, max-width 1200px, header sticky.
- **Thành phần**: Product card (hover nâng + shadow), nút, form, skeleton loading.
- **Admin**: Sidebar tối 240px, bảng có hover.
- **Responsive**: 768px, 1024px; mobile hamburger, grid 2 cột sản phẩm.
- **Khác**: Thông báo (toast) 5s, popup TikTok (nếu có), auth dạng modal Login/Register.

---

## 7. Chạy dự án

```bash
cd backend
npm install
npm start
```

- App: **http://localhost:3000**
- Admin: **http://localhost:3000/admin/**
- Tài khoản admin mặc định (seed): **admin@shopti.com** / **admin123**

Tùy chọn `.env`: `PORT=3000`, `JWT_SECRET=...`
