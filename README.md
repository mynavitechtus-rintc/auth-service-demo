# Authentication & Session Service

Một **dịch vụ xác thực và quản lý phiên đăng nhập tập trung** được xây dựng như một service độc lập, có thể phục vụ nhiều ứng dụng trong cùng hệ sinh thái như Web, Mobile, Admin Portal hoặc các Backend Service khác.

Dự án tập trung vào các bài toán authentication thường gặp trong hệ thống thực tế: **Access Token / Refresh Token**, **multi-device session**, **token revocation**, **Redis-based session management**, **RBAC**, **email verification** và **password recovery**.

Mục tiêu của project không chỉ là triển khai chức năng đăng nhập, mà còn hiểu rõ cách một hệ thống xác thực được thiết kế, vận hành và mở rộng trong môi trường production.

---

## Mục tiêu của dự án

Trong các project nhỏ, authentication thường chỉ dừng lại ở:

* Register
* Login
* JWT

Tuy nhiên, một hệ thống thực tế còn phải xử lý nhiều vấn đề khác:

* Người dùng đăng nhập trên nhiều thiết bị
* Refresh Token có thời gian sống dài
* Thu hồi token trước khi token hết hạn
* Logout một thiết bị hoặc toàn bộ thiết bị
* Phân quyền theo Role và Permission
* Reset mật khẩu an toàn
* Xác thực email
* Hạn chế brute-force và abuse
* Quản lý trạng thái đăng nhập mà không làm mất lợi ích của JWT

Project này được xây dựng để mô phỏng và giải quyết những bài toán trên theo hướng gần với hệ thống production.

---

## Kiến trúc tổng quan

Auth Service đóng vai trò là điểm xác thực tập trung cho các ứng dụng trong hệ thống.

```text
 Client Applications
(Web / Mobile / Admin Portal)
            │
            ▼
┌──────────────────────────────┐
│ Authentication Service       │
│                              │
│ - Authentication             │
│ - Session Management         │
│ - Token Management           │
│ - Authorization              │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │ Redis        │
│              │  │              │
│ Users        │  │ Sessions     │
│ Roles        │  │ Whitelist    │
│ Permissions  │  │ Blacklist    │
│ Profiles     │  │ TTL Data     │
└──────────────┘  └──────────────┘
```

PostgreSQL được sử dụng cho dữ liệu lâu dài.

Redis được sử dụng cho dữ liệu có tính tạm thời hoặc cần truy cập nhanh như session, token revocation và TTL.

---

## Các tính năng chính

### Authentication

* Đăng ký tài khoản
* Đăng nhập
* Access Token
* Refresh Token
* JWT Authentication
* Logout
* Logout All Devices

### Session Management

* Quản lý nhiều phiên đăng nhập trên nhiều thiết bị
* Liệt kê các session đang hoạt động
* Thu hồi một session cụ thể
* Thu hồi toàn bộ session của user
* Lưu session bằng Redis

### Token Management

* Access Token ngắn hạn
* Refresh Token dài hạn
* Refresh Token Rotation
* Token Whitelist
* Access Token Blacklist
* Token Revocation
* TTL-based expiration

### Authorization

* Role-Based Access Control
* Role Guard
* Permission Guard
* Admin-only API

### Account Security

* Password Hashing
* Email Verification
* Forgot Password
* Reset Password
* Rate Limiting
* Secure Headers

---

## Authentication Flow

### Login

```text
Client
  │
  │ POST /auth/login
  ▼
Auth Service
  │
  ├── Tìm User trong PostgreSQL
  │
  ├── Kiểm tra Password
  │
  ├── Tạo Access Token
  │
  ├── Tạo Refresh Token
  │
  └── Tạo Session trong Redis
          │
          ▼
Access Token + Refresh Token
```

Access Token được sử dụng để gọi các protected API.

```http
Authorization: Bearer <access_token>
```

---

## Refresh Token Flow

Khi Access Token hết hạn:

```text
Protected API
     │
     ▼
401 Unauthorized
     │
     ▼
Client gọi /auth/refresh
     │
     ▼
Verify Refresh Token
     │
     ▼
Kiểm tra Session trong Redis
     │
     ▼
Rotate Token
     │
     ▼
Cấp Access Token mới
     │
     ▼
Retry Request
```

Refresh Token không chỉ được kiểm tra bằng chữ ký JWT mà còn phải tương ứng với một session còn hiệu lực trong Redis.

Điều này cho phép server chủ động thu hồi quyền đăng nhập khi cần.

---

## Multi-Device Session

Một user có thể có nhiều phiên đăng nhập cùng lúc.

```text
User
 │
 ├── Android Phone
 │     └── Session A
 │
 ├── Chrome
 │     └── Session B
 │
 └── iPad
       └── Session C
```

Mỗi session có thể lưu các thông tin:

```text
sessionId
userId
refreshTokenHash
device
ipAddress
userAgent
createdAt
expiresAt
```

Ví dụ Redis key:

```text
session:{sessionId}
```

Khi một session bị xóa khỏi Redis, Refresh Token thuộc session đó không còn được chấp nhận.

---

## Whitelist và Blacklist

### Session Whitelist

Redis lưu danh sách các session đang còn hiệu lực.

```text
session:{sessionId}
```

Refresh Token chỉ hợp lệ khi:

```text
JWT hợp lệ
+
Session tồn tại
+
Session chưa hết hạn
```

Nếu session bị xóa, token sẽ bị vô hiệu hóa ngay cả khi JWT chưa hết hạn.

---

### Access Token Blacklist

Access Token có thể được đưa vào blacklist bằng `jti`.

```text
blacklist:{jti}
```

TTL của blacklist nên bằng thời gian còn lại của Access Token.

```text
Token hết hạn
        │
        ▼
Redis tự xóa blacklist entry
```

Blacklist phù hợp cho các trường hợp:

* Logout cần revoke Access Token ngay
* Token bị lộ
* Admin khóa tài khoản
* Security incident
* Force logout

---

## Vì sao JWT vẫn có thể Logout?

JWT thường được gọi là stateless vì server không cần lưu toàn bộ token để xác thực mỗi request.

Nếu chỉ sử dụng JWT thuần túy:

```text
Token được cấp
      │
      ▼
Valid cho đến khi hết hạn
```

Server không thể thu hồi token ngay lập tức.

Project này kết hợp:

```text
JWT
+
Redis Session
+
Token Blacklist
```

nhằm giữ lợi ích của JWT nhưng vẫn hỗ trợ:

* Logout
* Logout All Devices
* Session Revocation
* Token Revocation
* Security Enforcement

---

## Role-Based Access Control

Authentication trả lời câu hỏi:

```text
Bạn là ai?
```

Authorization trả lời câu hỏi:

```text
Bạn được phép làm gì?
```

Ví dụ:

```text
Request
   │
   ▼
JWT Guard
   │
   ▼
Roles / Permission Guard
   │
   ├── Có quyền     → Allow
   └── Không có quyền → 403 Forbidden
```

Các role mẫu:

```text
USER
ADMIN
SUPER_ADMIN
```

---

## Công nghệ sử dụng

| Thành phần         | Công nghệ                          |
| ------------------ | ---------------------------------- |
| Backend            | NestJS, TypeScript                 |
| Database           | PostgreSQL                         |
| ORM                | Prisma                             |
| Cache / Session    | Redis                              |
| Authentication     | JWT, Passport                      |
| Password Hashing   | Argon2 hoặc bcrypt                 |
| Validation         | class-validator, class-transformer |
| API Documentation  | Swagger / OpenAPI                  |
| API Testing        | Bruno                              |
| Container          | Docker                             |
| Deployment         | Render                             |
| Managed PostgreSQL | Supabase                           |
| Managed Redis      | Upstash                            |

---

## Cấu trúc dự án

```text
auth-service/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── users/
│   │   ├── sessions/
│   │   └── roles/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── types/
│   │
│   ├── config/
│   │
│   ├── providers/
│   │   ├── prisma/
│   │   ├── redis/
│   │   └── mail/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
│
├── bruno/
├── test/
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## API Overview

### Authentication

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
GET    /auth/me
```

### Session Management

```text
GET    /sessions
DELETE /sessions/:id
```

### Account Recovery

```text
POST   /auth/forgot-password
POST   /auth/reset-password
```

### Email Verification

```text
POST   /auth/verify-email
POST   /auth/resend-verification
```

Chi tiết request, response, validation và status code được mô tả trong Swagger.

---

## HTTP Status Code

Một số status code chính được sử dụng trong project:

| Status                     | Trường hợp                                      |
| -------------------------- | ----------------------------------------------- |
| `200 OK`                   | Request thành công                              |
| `201 Created`              | Tạo tài khoản hoặc resource thành công          |
| `400 Bad Request`          | Request không hợp lệ                            |
| `401 Unauthorized`         | Chưa xác thực, token invalid hoặc token hết hạn |
| `403 Forbidden`            | Đã xác thực nhưng không đủ quyền                |
| `404 Not Found`            | Không tìm thấy resource                         |
| `409 Conflict`             | Resource đã tồn tại, ví dụ email đã đăng ký     |
| `422 Unprocessable Entity` | Dữ liệu không đáp ứng business validation       |
| `429 Too Many Requests`    | Vượt quá rate limit                             |

---

## Security

Project hướng đến áp dụng các nguyên tắc bảo mật cơ bản:

* Không lưu password dạng plain text
* Hash password bằng Argon2 hoặc bcrypt
* Không lưu Refresh Token dạng plain text
* Access Token có thời gian sống ngắn
* Refresh Token có thời gian sống dài hơn
* Refresh Token Rotation
* Session Revocation
* Access Token Blacklist khi cần
* Redis TTL
* Rate Limiting
* Secure Headers
* Validate input
* Không expose thông tin nhạy cảm trong response
* Không commit secrets vào Git
* Reset Password Token có expiration
* Email Verification Token có expiration

---

## Database Responsibilities

PostgreSQL lưu dữ liệu có tính persistent:

```text
User
Profile
Role
Permission
Password Hash
Account Status
```

Redis không thay thế database.

Redis được sử dụng cho dữ liệu cần tốc độ cao hoặc có vòng đời ngắn:

```text
Session
Refresh Token State
Token Blacklist
Rate Limit
Password Reset Token
Email Verification Token
```

---

## Development Roadmap

### Phase 1 — Core Authentication

* [ ] Register
* [ ] Login
* [ ] Password Hashing
* [ ] DTO Validation
* [ ] Exception Handling
* [ ] `/auth/me`

### Phase 2 — JWT & Dual Token

* [ ] Access Token
* [ ] Refresh Token
* [ ] JWT Strategy
* [ ] JWT Guard
* [ ] Refresh Token Rotation

### Phase 3 — Session & Token Revocation

* [ ] Redis Integration
* [ ] Session Storage
* [ ] Multi-Device Session
* [ ] Logout
* [ ] Logout All Devices
* [ ] Revoke Session
* [ ] Whitelist
* [ ] Blacklist

### Phase 4 — Authorization & Security

* [ ] Role
* [ ] Permission
* [ ] RBAC Guard
* [ ] Rate Limiting
* [ ] Security Headers

### Phase 5 — Account Lifecycle

* [ ] Email Verification
* [ ] Forgot Password
* [ ] Reset Password

---

## Chạy project

### Yêu cầu

```text
Node.js >= 18
PostgreSQL
Redis
```

Có thể sử dụng local infrastructure hoặc:

```text
Supabase PostgreSQL
Upstash Redis
```

### Cài đặt

```bash
git clone <repository-url>
cd auth-service

npm install
```

Tạo file environment:

```bash
cp .env.example .env
```

Ví dụ:

```env
PORT=3000

DATABASE_URL=

REDIS_URL=

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d
```

### Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

---

## Deployment

Kiến trúc triển khai dự kiến:

```text
GitHub
   │
   ▼
Render
   │
   ├────────► Supabase PostgreSQL
   │
   └────────► Upstash Redis
```

---

## Những câu hỏi project này hướng đến giải quyết

Sau khi hoàn thành project, mục tiêu là hiểu rõ các câu hỏi như:

* Vì sao cần cả Access Token và Refresh Token?
* Vì sao Access Token nên có thời gian sống ngắn?
* Vì sao Refresh Token cần được quản lý phía server?
* JWT là stateless nhưng Logout được bằng cách nào?
* Redis đóng vai trò gì trong hệ thống authentication?
* Whitelist và Blacklist khác nhau như thế nào?
* Refresh Token Rotation giải quyết vấn đề gì?
* Logout All Devices hoạt động như thế nào?
* Làm sao revoke một JWT trước khi nó hết hạn?
* Session của nhiều thiết bị được quản lý như thế nào?
* Khi nào nên trả `401`?
* Khi nào nên trả `403`?
* Khi nào nên trả `409`?
* Khi nào nên trả `422`?

---

## Future Improvements

Sau khi hoàn thành core authentication flow, project có thể mở rộng thêm:

* Refresh Token Reuse Detection
* Two-Factor Authentication
* OAuth2
* Google Login
* GitHub Login
* API Key Authentication
* Audit Log
* Login History
* Device Fingerprinting
* Account Lockout
* Suspicious Login Detection
* Security Event Tracking

---

## Project Philosophy

Project được triển khai theo hướng:

```text
Bắt đầu đơn giản
      │
      ▼
Hiểu rõ vấn đề
      │
      ▼
Triển khai giải pháp
      │
      ▼
Đo lường trade-off
      │
      ▼
Refactor khi complexity xuất hiện
```

Mục tiêu không phải xây dựng một hệ thống authentication "enterprise" ngay từ đầu, mà là hiểu rõ vì sao từng thành phần như JWT, Refresh Token, Redis, Session, RBAC và Token Revocation tồn tại.

---

## License

Dự án được phát hành theo giấy phép MIT.
