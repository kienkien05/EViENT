# 🎫 EViENT — Hệ thống Quản lý Sự kiện & Bán vé trực tuyến

> **EViENT** là nền tảng quản lý sự kiện toàn diện được xây dựng trên kiến trúc **Microservices**, cho phép tổ chức sự kiện, bán vé trực tuyến, quản lý phòng/chỗ ngồi và check-in bằng QR code.

---

## 📌 Tổng quan hệ thống

| Thành phần               | Công nghệ                               | Mô tả                                   |
| ------------------------ | --------------------------------------- | --------------------------------------- |
| **Frontend**             | React 18, Vite, TailwindCSS, TypeScript | Giao diện người dùng & quản trị         |
| **API Gateway**          | Express.js, http-proxy-middleware       | Điều hướng request, rate limiting, CORS |
| **Auth Service**         | Express.js, MongoDB, JWT, bcrypt        | Xác thực, phân quyền, quản lý user      |
| **Event Service**        | Express.js, MongoDB, Cloudinary         | Quản lý sự kiện, phòng, banner, loại vé |
| **Order Service**        | Express.js, MongoDB                     | Đặt vé, quản lý đơn hàng, QR code       |
| **Notification Service** | Express.js, MongoDB, Nodemailer         | Gửi email OTP, xác nhận vé              |
| **Database**             | MongoDB 7                               | Lưu trữ dữ liệu                         |
| **Email (Dev)**          | MailHog                                 | Mock SMTP server cho development        |
| **Cloud Storage**        | Cloudinary                              | Upload & quản lý hình ảnh               |

---

## 🏗️ Kiến trúc Microservices

```
                    ┌──────────────────┐
                    │    Frontend      │
                    │  React + Vite    │
                    │    :5173         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   API Gateway    │
                    │     :3000        │
                    │  (Proxy + CORS   │
                    │  + Rate Limit)   │
                    └────────┬─────────┘
                             │
          ┌──────────┬───────┼────────┬──────────────┐
          │          │       │        │              │
   ┌──────▼──┐ ┌────▼───┐ ┌─▼─────┐ ┌▼──────────┐ ┌▼───────────┐
   │  Auth   │ │ Event  │ │ Order │ │Notification│ │   Upload   │
   │ :3001   │ │ :3002  │ │ :3003 │ │   :3004    │ │ (via Auth) │
   └────┬────┘ └───┬────┘ └──┬────┘ └─────┬──────┘ └────────────┘
        │          │         │             │
        └──────────┴─────────┴─────────────┘
                         │
                ┌────────▼─────────┐
                │    MongoDB 7     │
                │     :27017       │
                └──────────────────┘
```

---

## 🔑 Tính năng chính

### 👤 Phía Người dùng (User)

- **Đăng ký / Đăng nhập** với OTP verification qua email
- **Quên & đặt lại mật khẩu** qua email OTP
- **Duyệt sự kiện** — trang chủ, danh sách, tìm kiếm, chi tiết sự kiện
- **Mua vé trực tuyến** — chọn loại vé, số lượng, chỗ ngồi
- **Quản lý vé** — xem vé đã mua, mã QR check-in
- **Hồ sơ cá nhân** — cập nhật thông tin, avatar, đổi mật khẩu
- **Liên hệ** — thông tin liên hệ & mạng xã hội

### 🛡️ Phía Quản trị (Admin)

- **Dashboard** — thống kê tổng quan
- **Quản lý sự kiện** — CRUD sự kiện, loại vé, thời gian, banner
- **Quản lý phòng & chỗ ngồi** — tạo/sửa phòng, cấu hình hàng ghế
- **Quản lý đơn hàng** — xem, duyệt, huỷ đơn hàng
- **Quản lý vé** — theo dõi trạng thái vé
- **Quản lý người dùng** — khoá/mở tài khoản, phân quyền
- **Quản lý banner** — CRUD banner trang chủ
- **Quét QR check-in** — scan QR code để check-in vé
- **Báo cáo** — thống kê doanh thu, vé bán

---

## 📂 Cấu trúc dự án

```
evient-app/
├── .env.example              # Mẫu biến môi trường
├── docker-compose.yml        # Docker config cho production
├── package.json              # Monorepo scripts & dependencies
├── tsconfig.base.json        # TypeScript config chung
├── scripts/
│   └── seed.ts               # Seed dữ liệu mẫu
├── packages/
│   └── shared/               # Shared library (types, middleware, utils)
│       └── src/
│           └── types/         # TypeScript interfaces & types
├── services/
│   ├── gateway/               # API Gateway (proxy, rate limit, CORS)
│   ├── auth/                  # Auth Service (JWT, OTP, user CRUD)
│   │   └── src/
│   │       ├── controllers/   # authController, userController, uploadController
│   │       ├── models/        # User, OtpCode models
│   │       └── routes/
│   ├── event/                 # Event Service
│   │   └── src/
│   │       ├── controllers/   # event, room, banner, seat controllers
│   │       ├── models/        # Event, Room, Seat, Banner models
│   │       └── routes/
│   ├── order/                 # Order Service
│   │   └── src/
│   │       ├── controllers/   # order, ticket controllers
│   │       ├── models/        # Order, Ticket models
│   │       └── routes/
│   └── notification/          # Notification Service
│       └── src/
│           └── server.ts      # Email sending (OTP, confirmations)
└── frontend/                  # React SPA
    ├── public/images/         # Static assets (logo, banners)
    └── src/
        ├── App.tsx            # Router config (21 routes)
        ├── components/        # UI components & layouts
        │   └── layout/        # UserLayout, AdminLayout
        ├── pages/
        │   ├── auth/          # Login, OTP, ForgotPassword, ResetPassword
        │   ├── user/          # Home, Events, EventDetail, MyTickets, Profile, Contact, Search, Wallet
        │   ├── admin/         # Dashboard, Events, Users, Tickets, Banners, Orders, Rooms, QRScanner, Reports
        │   └── error/         # ForbiddenPage
        ├── services/          # API service layer (Axios)
        ├── stores/            # Zustand state management (auth, theme)
        └── lib/               # Utility functions
```

---

## 📊 Data Models

### User

| Field           | Type                          | Mô tả                     |
| --------------- | ----------------------------- | ------------------------- |
| email           | string                        | Email đăng nhập (unique)  |
| fullName        | string                        | Họ tên                    |
| role            | `user` \| `admin`             | Phân quyền                |
| isActive        | boolean                       | Trạng thái tài khoản      |
| avatarUrl       | string?                       | Ảnh đại diện (Cloudinary) |
| phoneNumber     | string?                       | Số điện thoại             |
| gender          | `male` \| `female` \| `other` | Giới tính                 |
| passwordHistory | array                         | Lịch sử đổi mật khẩu      |

### Event

| Field               | Type                                                 | Mô tả             |
| ------------------- | ---------------------------------------------------- | ----------------- |
| title               | string                                               | Tên sự kiện       |
| slug                | string                                               | URL-friendly slug |
| description         | string?                                              | Mô tả ngắn        |
| content             | string?                                              | Nội dung chi tiết |
| startTime / endTime | Date                                                 | Thời gian diễn ra |
| bannerImage         | string?                                              | Ảnh banner chính  |
| category            | string?                                              | Danh mục          |
| status              | `draft` \| `published` \| `cancelled` \| `completed` | Trạng thái        |
| isHot               | boolean                                              | Sự kiện nổi bật   |
| roomIds             | string[]                                             | Danh sách phòng   |
| ticketTypes         | array                                                | Các loại vé       |

### Order & Ticket

| Field             | Type                                             | Mô tả                                      |
| ----------------- | ------------------------------------------------ | ------------------------------------------ |
| Order.items       | array                                            | Danh sách vé đặt (loại, số lượng, đơn giá) |
| Order.totalAmount | number                                           | Tổng tiền                                  |
| Order.status      | `pending` \| `paid` \| `cancelled` \| `refunded` | Trạng thái đơn                             |
| Ticket.ticketCode | string                                           | Mã vé duy nhất                             |
| Ticket.qrCode     | string                                           | QR code check-in                           |
| Ticket.status     | `valid` \| `used` \| `cancelled`                 | Trạng thái vé                              |
| Ticket.seatId     | string?                                          | Ghế đã chọn                                |

### Room & Seat

| Field            | Type    | Mô tả                 |
| ---------------- | ------- | --------------------- |
| Room.name        | string  | Tên phòng             |
| Room.rows        | number  | Số hàng ghế           |
| Room.seatsPerRow | number  | Số ghế mỗi hàng       |
| Seat.row         | string  | Hàng (số)             |
| Seat.number      | number  | Số ghế                |
| Seat.isActive    | boolean | Ghế hoạt động         |
| Seat.locks       | array   | Khoá ghế theo sự kiện |

---

## 🔌 API Endpoints

Tất cả API đều qua **Gateway** tại `http://localhost:3000/api`

| Prefix                 | Service      | Mô tả                          |
| ---------------------- | ------------ | ------------------------------ |
| `/api/auth/*`          | Auth         | Đăng ký, đăng nhập, OTP, token |
| `/api/users/*`         | Auth         | CRUD user, profile, avatar     |
| `/api/upload/*`        | Auth         | Upload file lên Cloudinary     |
| `/api/events/*`        | Event        | CRUD sự kiện                   |
| `/api/rooms/*`         | Event        | CRUD phòng & chỗ ngồi          |
| `/api/banners/*`       | Event        | CRUD banner                    |
| `/api/ticket-types/*`  | Event        | Quản lý loại vé                |
| `/api/orders/*`        | Order        | Đặt vé, quản lý đơn hàng       |
| `/api/tickets/*`       | Order        | Quản lý vé, QR check-in        |
| `/api/notifications/*` | Notification | Gửi thông báo, email           |
| `/api/health`          | Gateway      | Health check                   |

---

## 🚀 Hướng dẫn cài đặt & chạy

### Yêu cầu

- **Node.js** v18+
- **MongoDB** Community Server 7+ (chạy trên port 27017)
- **Git**

### Bước 1 — Clone & cài đặt

```bash
git clone https://github.com/kienkien05/new_ass_app.git
cd new_ass_app
npm install
```

### Bước 2 — Cấu hình môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin Cloudinary, JWT secret, v.v.
```

### Bước 3 — Seed dữ liệu mẫu

```bash
npm run seed
```

> Tạo sẵn tài khoản và dữ liệu mẫu:
>
> - 👤 Admin: `admin@evient.vn` / `admin123`
> - 👤 User: `user@evient.vn` / `user123`
> - 🏠 3 phòng mẫu
> - 🎉 3 sự kiện mẫu
> - 🖼️ 2 banner

### Bước 4 — Chạy hệ thống

```bash
npm run dev
```

> Lệnh này sẽ tự động:
>
> 1. Build shared package
> 2. Khởi chạy 5 backend services (Gateway, Auth, Event, Order, Notification)
> 3. Khởi chạy frontend (Vite dev server)

### Bước 5 — Truy cập

| Dịch vụ        | URL                              |
| -------------- | -------------------------------- |
| 🌐 Frontend    | http://localhost:5173            |
| 🔌 API Gateway | http://localhost:3000/api/health |

---

## 🐳 Docker Deployment

```bash
# Khởi chạy tất cả services + MongoDB + MailHog
docker-compose up -d --build

# Dừng services
docker-compose down
```

| Container            | Port  |
| -------------------- | ----- |
| MongoDB              | 27017 |
| MailHog SMTP         | 1025  |
| MailHog Web UI       | 8025  |
| API Gateway          | 3000  |
| Auth Service         | 3001  |
| Event Service        | 3002  |
| Order Service        | 3003  |
| Notification Service | 3004  |

---

## ⚙️ Biến môi trường (.env)

| Biến                        | Mô tả                     | Mặc định                    |
| --------------------------- | ------------------------- | --------------------------- |
| `MONGODB_URI`               | MongoDB connection string | `mongodb://localhost:27017` |
| `JWT_SECRET`                | Secret key cho JWT        | —                           |
| `JWT_EXPIRES_IN`            | Thời hạn token            | `7d`                        |
| `GATEWAY_PORT`              | Port API Gateway          | `3000`                      |
| `AUTH_SERVICE_PORT`         | Port Auth Service         | `3001`                      |
| `EVENT_SERVICE_PORT`        | Port Event Service        | `3002`                      |
| `ORDER_SERVICE_PORT`        | Port Order Service        | `3003`                      |
| `NOTIFICATION_SERVICE_PORT` | Port Notification Service | `3004`                      |
| `CLOUDINARY_CLOUD_NAME`     | Cloudinary cloud name     | —                           |
| `CLOUDINARY_API_KEY`        | Cloudinary API key        | —                           |
| `CLOUDINARY_API_SECRET`     | Cloudinary API secret     | —                           |
| `SMTP_HOST`                 | SMTP server host          | `localhost`                 |
| `SMTP_PORT`                 | SMTP server port          | `1025`                      |
| `VITE_API_URL`              | Frontend API URL          | `http://localhost:3000/api` |
| `CORS_ORIGIN`               | Allowed CORS origin       | `http://localhost:5173`     |

---

## 🛠️ Tech Stack chi tiết

### Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Authentication**: JWT + bcrypt
- **OTP**: 6-digit code qua email
- **Database**: MongoDB (Mongoose ODM)
- **API Pattern**: RESTful + Proxy Gateway
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Custom logger (Winston-based)
- **File Upload**: Cloudinary

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **Routing**: React Router v7
- **State Management**: Zustand 5
- **Data Fetching**: TanStack React Query 5
- **HTTP Client**: Axios
- **UI Components**: Radix UI, Lucide Icons
- **Animations**: Framer Motion
- **Charts**: Recharts
- **QR Scanner**: html5-qrcode
- **Notifications**: Sonner (toast)
- **Date Utils**: date-fns

### DevOps

- **Containerization**: Docker + Docker Compose
- **Monorepo**: npm workspaces
- **Development**: ts-node-dev, concurrently
- **Linting**: ESLint

---

## 📜 NPM Scripts

| Script                     | Mô tả                                       |
| -------------------------- | ------------------------------------------- |
| `npm run dev`              | Chạy toàn bộ hệ thống (services + frontend) |
| `npm run dev:services`     | Chạy 5 backend services                     |
| `npm run dev:frontend`     | Chạy frontend                               |
| `npm run dev:gateway`      | Chạy API Gateway                            |
| `npm run dev:auth`         | Chạy Auth Service                           |
| `npm run dev:event`        | Chạy Event Service                          |
| `npm run dev:order`        | Chạy Order Service                          |
| `npm run dev:notification` | Chạy Notification Service                   |
| `npm run build`            | Build tất cả packages                       |
| `npm run build:shared`     | Build shared package                        |
| `npm run seed`             | Seed dữ liệu mẫu (xoá cũ + tạo mới)         |
| `npm run docker:up`        | Docker Compose up                           |
| `npm run docker:down`      | Docker Compose down                         |
| `npm run docker:build`     | Docker Compose build & up                   |

---

## 👥 Tài khoản mặc định

| Role      | Email             | Mật khẩu   |
| --------- | ----------------- | ---------- |
| **Admin** | `admin@evient.vn` | `admin123` |
| **User**  | `user@evient.vn`  | `user123`  |

---

## 👥 Tài khoản mặc định

| Role      | Email             | Mật khẩu   |
| --------- | ----------------- | ---------- |
| **Admin** | `admin@evient.vn` | `admin123` |
| **User**  | `user@evient.vn`  | `user123`  |

---

## 📄 License

Private project © 2026
