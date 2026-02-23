# 🚀 Hướng dẫn Setup Hệ thống EViENT

## Kiến trúc

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Frontend   │────▶│ API Gateway  │────▶│  MongoDB   │
│  Vite:5173  │     │   :3000      │     │  :27017    │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │                   ▲
              ┌────────────┼────────────┐      │
              │            │            │      │
       ┌──────┴──┐  ┌──────┴──┐  ┌─────┴───┐  │
       │  Auth   │  │  Event  │  │  Order  │──┘
       │  :3001  │  │  :3002  │  │  :3003  │
       └─────────┘  └─────────┘  └─────────┘
                                      │
                               ┌──────┴──────┐
                               │Notification │
                               │  :3004      │
                               └─────────────┘
```

---

## Bước 1: Cài đặt yêu cầu

### ✅ Node.js (đã có)

```bash
node --version   # cần v18+
npm --version
```

### ⬇️ MongoDB Community Server (BẮT BUỘC)

**Cách 1 — Tải installer (khuyến nghị):**

1. Vào trang: https://www.mongodb.com/try/download/community
2. Chọn **Windows x64**, tải file **.msi**
3. Cài đặt, chọn **"Install MongoDB as a Service"** (tự chạy khi khởi động Windows)
4. Cài xong, MongoDB sẽ tự chạy trên port `27017`

**Cách 2 — Dùng winget:**

```bash
winget install MongoDB.Server --accept-source-agreements
```

**Kiểm tra MongoDB đã chạy:**

```bash
mongosh --eval "db.runCommand({ping:1})"
# hoặc
Get-Service MongoDB
```

---

## Bước 2: Cài dependencies

```bash
cd c:\Users\admin\Desktop\evient-app
npm install
```

> Lệnh này cài tất cả packages cho monorepo (shared + 5 services + frontend)

---

## Bước 3: Seed dữ liệu mẫu (chỉ cần lần đầu)

```bash
npm run seed
```

> Tạo sẵn:
>
> - 👤 Admin: `admin@evient.vn` / `admin123`
> - 👤 User: `user@evient.vn` / `user123`
> - 🖼️ 2 banner
> - 🏠 3 phòng
> - 🎉 3 sự kiện mẫu

---

## Bước 4: Chạy toàn bộ hệ thống

```bash
npm run dev
```

> Lệnh duy nhất này sẽ:
>
> 1. Auto build shared package
> 2. Chạy 5 backend services (Gateway, Auth, Event, Order, Notification)
> 3. Chạy frontend (Vite dev server)

---

## Bước 5: Truy cập

| Dịch vụ         | URL                              |
| --------------- | -------------------------------- |
| 🌐 **Frontend** | http://localhost:5173            |
| 🔌 API Gateway  | http://localhost:3000/api/health |

---

## Tài khoản đăng nhập

| Role      | Email             | Password   |
| --------- | ----------------- | ---------- |
| **Admin** | `admin@evient.vn` | `admin123` |
| **User**  | `user@evient.vn`  | `user123`  |

---

## Cấu trúc thư mục

```
evient-app/
├── .env                    ← Biến môi trường
├── package.json            ← Scripts: dev, seed, build
├── scripts/seed.ts         ← Tạo dữ liệu mẫu
├── packages/shared/        ← Types, middleware, utils chung
├── services/
│   ├── gateway/            ← API Gateway (proxy + rate limit)
│   ├── auth/               ← Đăng nhập, OTP, user management
│   ├── event/              ← Sự kiện, phòng, banner
│   ├── order/              ← Đơn hàng, vé, QR
│   └── notification/       ← Gửi email
└── frontend/               ← React + Vite + TailwindCSS
    ├── public/images/       ← Logo, banner
    └── src/
        ├── pages/           ← 19 trang (auth + user + admin)
        ├── components/      ← UI components + layouts
        ├── services/        ← API services
        └── stores/          ← Zustand (auth + theme)
```

---

## Troubleshooting

### ❌ MongoDB connection error

→ Kiểm tra MongoDB đang chạy: `Get-Service MongoDB` hoặc mở MongoDB Compass kết nối `mongodb://localhost:27017`

### ❌ Port đã bị chiếm

→ Đổi port trong file `.env`

### ❌ Shared package lỗi build

```bash
npm run build:shared
```

### 🔄 Reset dữ liệu

```bash
npm run seed   # sẽ xóa dữ liệu cũ và tạo lại
```
