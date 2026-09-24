# Auth Service Demo

Service xác thực (Authentication) và quản lý phiên làm việc đa thiết bị (Multi-device Session Management) xây dựng bằng NestJS, PostgreSQL (Prisma ORM) và Redis.

---

## Tech Stack

* **Backend Framework:** NestJS (TypeScript)
* **Database & ORM:** PostgreSQL + Prisma ORM
* **Caching & Token Store:** Redis (`ioredis`)
* **Auth & Security:** JWT (`@nestjs/jwt`, `passport-jwt`), Argon2, Helmet, Throttler (Rate Limiting)
* **API Documentation:** Swagger / OpenAPI 3 (`@nestjs/swagger`)
* **DevOps & Tooling:** Docker Compose, Makefile, `pnpm`

---

## 📖 API Documentation & Swagger

* **Swagger UI:** [http://localhost:3000/docs](http://localhost:3000/docs) *(chạy ở môi trường development)*
* **Postman Collection & Environment:** Thư mục [`postman/`](postman/) (chứa sẵn bộ test flow kèm assertions)
* **Tài liệu chi tiết luồng xác thực:** [`docs/AUTH_FLOW_EXPLAINED.md`](docs/AUTH_FLOW_EXPLAINED.md)
* **Mô tả bài toán & yêu cầu:** [`docs/PROBLEM_STATEMENT.md`](docs/PROBLEM_STATEMENT.md)

---

## 🚀 Cách Setup & Chạy Ứng Dụng

### Yêu cầu môi trường
* Node.js (bản LTS) & `pnpm`
* Docker Desktop đang bật

### Các bước cài đặt

1. **Tạo file cấu hình môi trường:**
   ```bash
   cp .env.example .env
   ```
   *(Các thông số mặc định đã khớp sẵn với cấu hình Docker Compose).*

2. **Cài đặt và chuẩn bị database (chạy 1 lệnh duy nhất):**
   ```bash
   make setup
   ```
   Lệnh này sẽ tự động:
   * Bật container PostgreSQL (5432) và Redis (6379) qua Docker.
   * Cài đặt thư viện dependencies (`pnpm install`).
   * Chạy Prisma migration và seed sẵn Roles (`USER`, `MODERATOR`, `ADMIN`) cùng các Permissions mặc định.

3. **Khởi động server:**
   ```bash
   make dev
   ```
   Server chạy tại: `http://localhost:3000`.

### Các lệnh tiện ích khác (Makefile)

| Lệnh | Ý nghĩa |
|---|---|
| `make dev` | Bật server ở chế độ watch mode (tự động bật container DB nếu chưa chạy) |
| `make db-up` | Chỉ khởi động PostgreSQL & Redis |
| `make db-down` | Dừng các container database (giữ nguyên dữ liệu) |
| `make reset` | Xóa sạch database volume, khởi tạo lại container, chạy lại migrate và seed |
| `make kill-port` | Tắt tiến trình đang chiếm port 3000 |
| `npx prisma studio` | Mở giao diện xem/chỉnh sửa DB tại `http://localhost:5555` |

---

## 🔗 Danh Sách API Endpoints

Base URL: `http://localhost:3000`

### 1. Authentication (`/auth`)
* `POST /auth/register` — Đăng ký tài khoản mới (mặc định gán role `USER`).
* `POST /auth/login` — Đăng nhập, trả về cặp `accessToken` (15m) + `refreshToken` (7d).
* `POST /auth/refresh` — Đổi refresh token cũ lấy cặp access/refresh token mới (Refresh Token Rotation).
* `POST /auth/logout` *(Bearer Token)* — Đăng xuất session hiện tại (đưa token vào blacklist Redis).
* `POST /auth/logout-all` *(Bearer Token)* — Đăng xuất toàn bộ các thiết bị đang đăng nhập của user.

### 2. Quản lý phiên (`/auth/sessions`)
* `GET /auth/sessions` *(Bearer Token)* — Xem danh sách các phiên thiết bị đang hoạt động (IP, User-Agent, hoạt động gần nhất).
* `DELETE /auth/sessions/:id` *(Bearer Token)* — Thu hồi (buộc đăng xuất) một session cụ thể.

### 3. Người dùng (`/users`)
* `GET /users/me` *(Bearer Token)* — Xem thông tin tài khoản đang đăng nhập (giải mã trực tiếp từ payload JWT).
* `GET /users` *(Bearer Token)* — Lấy danh sách toàn bộ user (yêu cầu quyền `users:list` - dành cho `ADMIN`).

### 4. Hệ thống
* `GET /health` — Liveness check kiểm tra trạng thái hoạt động của service.
* `GET /docs` — Giao diện Swagger UI tra cứu schema và test API trực tiếp.

---

## 📌 Lưu Ý Quan Trọng (Notes)

### 1. Gán quyền ADMIN để kiểm tra phân quyền (RBAC)
Mặc định khi đăng ký mới, user chỉ có role `USER`. Endpoint `GET /users` yêu cầu role `ADMIN`. Bạn có thể gán quyền bằng 1 trong 2 cách:

* **Cách 1 (Prisma Studio):** Chạy `npx prisma studio` → Mở bảng `User` → Tìm user cần gán → ở trường `roles` chọn **Connect existing record** và chọn `ADMIN` → Bấm **Save 1 change**.
* **Cách 2 (Chạy lệnh SQL):**
  ```bash
  docker exec -i auth-service-postgres psql -U postgres -d auth_service_demo <<'SQL'
  INSERT INTO "_RoleToUser" ("A", "B")
  SELECT r.id, u.id FROM "Role" r, "User" u
  WHERE r.name = 'ADMIN' AND u.email = 'demo-a@example.com'
  ON CONFLICT ("A", "B") DO NOTHING;
  SQL
  ```


> **Lưu ý:** Sau khi gán role trong DB, user phải gọi `POST /auth/refresh` hoặc đăng nhập lại để nhận access token mới có chứa role `ADMIN` (vì quyền được nhúng tĩnh trong access token khi cấp).

### 2. Redis In-Memory
Container Redis trong `docker-compose.yml` không gắn volume để tối ưu tốc độ cho môi trường dev/demo. Khi restart Redis container, dữ liệu whitelist refresh token và blacklist access token sẽ được làm sạch (các phiên đăng nhập trước đó sẽ hết hiệu lực).

### 3. Kiểm thử với Postman Collection
* Import cả 2 file trong thư mục `postman/` vào Postman.
* Chọn Environment **`auth-service-demo (local)`** trước khi chạy.
* Chạy lần lượt các folder theo thứ tự từ `00` đến `07`.
