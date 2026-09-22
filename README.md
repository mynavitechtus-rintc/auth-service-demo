# Authentication & Session Service (NestJS + PostgreSQL + Redis)

Service trung tâm xác thực (Centralized Authentication Server) và quản lý phiên làm việc đa thiết bị (Multi-device Session Management) cho các ứng dụng Web, Mobile và Admin Portal.

---

## Tài liệu

* **[Bài toán nghiệp vụ (docs/PROBLEM_STATEMENT.md)](docs/PROBLEM_STATEMENT.md)** — bối cảnh, yêu cầu chức năng, tiêu chí hoàn thành, không đi sâu kỹ thuật.
* **[Auth flow giải thích chi tiết (docs/AUTH_FLOW_EXPLAINED.md)](docs/AUTH_FLOW_EXPLAINED.md)** — vì sao thiết kế JWT + Redis whitelist/blacklist + RBAC như vậy, kèm danh sách giới hạn đã biết.

---

## Chức Năng Chính

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
* **API Docs:** Swagger (`@nestjs/swagger`), chỉ bật khi `NODE_ENV != production`
* **Package Manager:** `pnpm`

---

## Yêu Cầu Môi Trường

* Node.js (bản LTS gần nhất) + `pnpm`
* Docker Desktop đang chạy — Postgres và Redis chạy qua `docker-compose.yml`, không cần cài đặt native.

---

## Cài Đặt Lần Đầu

```bash
# 1. Tạo file .env từ mẫu
cp .env.example .env
# Điền JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (chuỗi bất kỳ, đủ dài).
# DATABASE_URL mặc định khớp docker-compose.yml:
#   postgresql://postgres:postgres@localhost:5432/auth_service_demo

# 2. Cài dependencies + lên Docker + migrate + seed role/permission mặc định
make setup
```

`make setup` gộp toàn bộ các bước cần thiết: `docker compose up -d` (Postgres + Redis) → `pnpm install` → `prisma generate` → `prisma migrate dev` → `pnpm run seed` (tạo sẵn 3 role `USER` / `MODERATOR` / `ADMIN` + 7 permission, xem `prisma/seed.ts`).

---

## Khởi Chạy Ứng Dụng

```bash
make dev
```

`make dev` tự đảm bảo Postgres + Redis đang chạy (`db-up`), giải phóng port 3000 nếu đang bị process khác giữ (`kill-port`), rồi start NestJS ở watch mode. App chạy tại `http://localhost:3000`.

### Các Lệnh Make

| Lệnh | Việc làm |
|---|---|
| `make dev` (hoặc `make start`) | Đảm bảo Postgres + Redis chạy, giải phóng port app, start watch mode |
| `make db-up` | Chỉ start container Postgres + Redis, không chạy app |
| `make db-down` | Dừng container Postgres + Redis (giữ nguyên data) |
| `make setup` | Cài đặt lần đầu: cài deps, generate Prisma Client, migrate, seed |
| `make reset` | **Xoá sạch volume Postgres** (mất hết user/session đã tạo), tạo lại container, migrate + seed từ đầu |
| `make kill-port` | Kill process đang giữ port app (mặc định 3000) |
| `make kill-db-ports` | Kill process đang giữ port 5432 (Postgres) / 6379 (Redis) |
| `make help` | In lại bảng lệnh này |

**Khi nào dùng `make reset`:** dữ liệu test bị rối (nhiều session/user cũ), hoặc cần chạy lại bộ Postman collection từ một DB sạch. Đây là thao tác **phá huỷ** và không có bước xác nhận lại — chỉ chạy khi chắc chắn không cần data hiện tại.

### Chạy Docker Thủ Công (Không Qua Makefile)

```bash
docker compose up -d      # start Postgres (5432) + Redis (6379)
docker compose down       # dừng container, giữ data
docker compose down -v    # dừng + xoá luôn volume Postgres (mất data, tương đương bước đầu của make reset)
```

Redis trong `docker-compose.yml` **không có volume** — restart container Redis là mất sạch whitelist/blacklist token (khác với Postgres có `pgdata` volume). Chi tiết hệ quả ở `docs/AUTH_FLOW_EXPLAINED.md` mục 9.

---

## Thao Tác Thủ Công Với Prisma

### Mở Prisma Studio Để Xem/Sửa Data Trực Tiếp

```bash
npx prisma studio
```

Mở UI tại `http://localhost:5555`.

### Gán Quyền ADMIN Cho Một User

Hệ thống **chưa có API quản lý role** (xem `docs/AUTH_FLOW_EXPLAINED.md` mục 11 — giới hạn đã biết), nên đây là thao tác bắt buộc phải làm tay, chưa có endpoint thay thế. Có 2 cách, chọn 1:

**Cách 1 — Prisma Studio (UI):**

1. Đảm bảo đã seed dữ liệu (`make setup` hoặc `pnpm run seed`) — cần có sẵn role `ADMIN` trong DB trước.
2. `npx prisma studio` → bảng `User` → tìm đúng row theo `email` → mở quan hệ `roles` → **connect** thêm role `ADMIN` (giữ `USER` cũng được, không bắt buộc gỡ).

**Cách 2 — SQL trực tiếp (khi Prisma Studio thao tác bị fail):**

Quan hệ `User` ↔ `Role` là bảng trung gian ẩn `_RoleToUser` (`A` = `Role.id`, `B` = `User.id`, xem `prisma/migrations/*/migration.sql`). Đảm bảo đã seed trước (cần role `ADMIN` tồn tại), sau đó chạy:

```bash
docker exec -i auth-service-postgres psql -U postgres -d auth_service_demo <<'SQL'
INSERT INTO "_RoleToUser" ("A", "B")
SELECT r.id, u.id
FROM "Role" r, "User" u
WHERE r.name = 'ADMIN' AND u.email = 'demo-a@example.com'
ON CONFLICT ("A", "B") DO NOTHING;
SQL
```

Đổi `demo-a@example.com` thành email thật. `ON CONFLICT ("A", "B") DO NOTHING` khớp đúng primary key composite của `_RoleToUser`, giúp chạy lại nhiều lần vẫn an toàn (không lỗi nếu user đã có role đó). Kiểm tra lại:

```bash
docker exec -i auth-service-postgres psql -U postgres -d auth_service_demo <<'SQL'
SELECT u.email, r.name AS role
FROM "User" u
JOIN "_RoleToUser" rtu ON rtu."B" = u.id
JOIN "Role" r ON r.id = rtu."A"
WHERE u.email = 'demo-a@example.com';
SQL
```

Cả 2 cách xong đều cần bước cuối giống nhau:

**Bước cuối (bắt buộc, áp dụng cho cả 2 cách trên):** User đó phải **gọi lại `/auth/login` hoặc `/auth/refresh`** để nhận access token mới mang role `ADMIN` — access token đang cầm trong tay **không tự cập nhật quyền**, roles/permissions bị đóng băng vào token tại thời điểm mint (xem `docs/AUTH_FLOW_EXPLAINED.md` mục 7).

### Các Lệnh Prisma Khác

| Lệnh | Việc làm |
|---|---|
| `pnpm prisma generate` | Generate lại Prisma Client sau khi đổi `prisma/schema.prisma` |
| `pnpm prisma migrate dev` | Tạo và áp dụng migration mới (dev) khi đổi schema |
| `pnpm run seed` | Seed lại role/permission — dùng `upsert` nên chạy lại nhiều lần vẫn an toàn |

---

## Kiểm Thử API

### Swagger

Sau khi `make dev`, mở `http://localhost:3000/docs` để xem và thử trực tiếp trên trình duyệt. Chỉ bật khi `NODE_ENV != production` (mặc định bật ở local).

### Postman Collection

Bộ test flow đầy đủ kèm assertion tự động, nằm ở `postman/auth-service-demo.postman_collection.json` và `postman/auth-service-demo.postman_environment.json`.

1. Import cả 2 file vào Postman.
2. Chọn Environment **"auth-service-demo (local)"** ở góc trên phải (quên bước này thì mọi biến `{{baseUrl}}`, `{{accessToken1}}`, ... không resolve được).
3. Chạy lần lượt từng folder theo thứ tự `00` → `07`.

   ⚠️ Riêng folder **`01 - RBAC Enforcement`**: giữa request thứ 2 (`GET /users` expect 403) và request thứ 3 (`Refresh` expect ADMIN) có **bước thủ công bắt buộc** — promote User A lên `ADMIN` qua Prisma Studio (xem mục Prisma ở trên) trước khi chạy tiếp. Bỏ qua bước này, request thứ 3 vẫn trả 200 nhưng assertion "carries ADMIN role" sẽ fail — không phải lỗi script hay lỗi server.

### Test Tự Động (Jest)

```bash
pnpm run test       # unit test
pnpm run test:e2e   # end-to-end test
pnpm run test:cov   # coverage
```

---

## Giấy Phép

[MIT licensed](LICENSE)
