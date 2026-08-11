# Authentication & Session Service (NestJS + PostgreSQL + Redis)

Service trung tâm xác thực (Centralized Authentication Server) và quản lý phiên làm việc đa thiết bị (Multi-device Session Management) cho các ứng dụng Web, Mobile và Admin Portal.

---

## Tài liệu Bài toán

Mô tả bài toán nghiệp vụ (bối cảnh, vấn đề cần giải quyết, yêu cầu chức năng, tiêu chí hoàn thành) — không đi sâu kỹ thuật, phù hợp cho cả người không chuyên đọc hiểu:

* **[Bài toán: Authentication & Session Service (docs/PROBLEM_STATEMENT.md)](docs/PROBLEM_STATEMENT.md)**

---

## Chức năng Chính

* **Authentication:** Đăng ký (Register), Đăng nhập (Login) bằng Email & Password.
* **Stateless JWT:** Cấp phát Access Token có thời gian sống ngắn (short-lived JWT).
* **Refresh Token Rotation:** Quản lý Refresh Token theo Session và cấp mới token an toàn.
* **Multi-device Session Management:** Quản lý và theo dõi danh sách các thiết bị đang đăng nhập của từng người dùng.
* **Token Blacklist & Whitelist (Redis):**
  * **Whitelist:** Lưu giữ Refresh Token theo `sessionId` hợp lệ.
  * **Blacklist:** Thu hồi Access Token lập tức khi Logout / Logout All thông qua Redis cache.
* **Phân quyền Role-Based Access Control (RBAC):** Phân quyền người dùng theo Vai trò (Roles) và Quyền hạn (Permissions).
* **Storage Stack:** PostgreSQL (Prisma ORM) cho dữ liệu hệ thống & Redis cho Session/Token tracking.

---

## Công Nghệ Sử Dụng

* **Framework:** NestJS (TypeScript)
* **ORM:** Prisma ORM
* **Database:** PostgreSQL
* **Cache / In-Memory Store:** Redis
* **Token Standard:** JWT (`@nestjs/jwt`, `passport-jwt`)
* **Package Manager:** `pnpm`

---

## Cài Đặt & Khởi Chạy

### 1. Phục hồi dependencies
```bash
$ pnpm install
```

### 2. Thiết lập Biến Môi Trường (.env)
Tạo file `.env` từ `.env.example`:
```bash
$ cp .env.example .env
```

Cấu hình các thông số PostgreSQL, Redis và JWT secret keys trong `.env`.

### 3. Khởi chạy Database & Prisma
```bash
# Generate Prisma Client
$ pnpm prisma generate

# Run Database Migrations
$ pnpm prisma migrate dev
```

### 4. Khởi chạy Ứng Dụng NestJS
```bash
# Watch mode (Development)
$ pnpm run start:dev

# Production mode
$ pnpm run start:prod
```

### 5. Chạy Kiểm Thử (Tests)
```bash
# Unit tests
$ pnpm run test

# End-to-End tests
$ pnpm run test:e2e
```

---

## Giấy phép

[MIT licensed](LICENSE)
