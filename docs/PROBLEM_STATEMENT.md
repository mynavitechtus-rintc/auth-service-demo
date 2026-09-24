# Bài Toán: Authentication & Session Service

## 1. Bối cảnh

Ứng dụng cần biết "ai đang đăng nhập" và "được phép làm gì" mà không phải tra cứu lại từ đầu mỗi request. Dịch vụ xác minh danh tính người dùng, cấp token dùng cho các lần truy cập sau, và có thể thu hồi token đó bất cứ lúc nào (đăng xuất, nghi ngờ tài khoản bị lộ).

Phạm vi: 1 backend API độc lập cho 1 ứng dụng, chưa hỗ trợ nhiều client khác nhau (chưa CORS, chưa phân biệt audience).

## 2. Vấn đề cần giải quyết

- Đăng ký, đăng nhập, giữ đăng nhập trên nhiều thiết bị mà không phải nhập lại liên tục.
- Xác thực mỗi request nhanh, nhưng vẫn thu hồi được ngay khi cần (đăng xuất, khoá tài khoản).
- Quản lý được các thiết bị đang đăng nhập, đăng xuất riêng từng thiết bị hoặc tất cả.
- Phân quyền theo vai trò — không phải ai cũng làm được mọi thứ.

## 3. Đối tượng sử dụng

| Đối tượng | Mô tả |
| --- | --- |
| Người dùng | Đăng ký, đăng nhập, quản lý phiên đăng nhập của chính mình |
| Quản trị viên | Có quyền cao hơn người dùng thường (ví dụ xem danh sách user) nhờ RBAC. Gán quyền Admin hiện làm trực tiếp ở database, chưa có API riêng cho việc này |

## 4. Yêu cầu chức năng

### Đăng ký & đăng nhập

- Tạo tài khoản bằng email và mật khẩu; mật khẩu lưu an toàn, không ở dạng plain text.
- Tài khoản mới mặc định có vai trò USER.
- Đăng nhập đúng email/mật khẩu để được cấp quyền truy cập.
- Quyền truy cập tự làm mới khi còn dùng app; nếu không có lần làm mới nào trong thời hạn cho phép (ví dụ nhiều ngày không mở app) thì phải đăng nhập lại.

### Quản lý phiên trên nhiều thiết bị

- Mỗi lần đăng nhập trên 1 thiết bị là 1 phiên độc lập.
- Xem được danh sách phiên đang hoạt động: loại thiết bị, IP, lần hoạt động gần nhất.
- Đăng xuất 1 thiết bị cụ thể mà không ảnh hưởng các thiết bị khác.
- Đăng xuất tất cả thiết bị cùng lúc.

### Thu hồi quyền truy cập tức thời

- Đăng xuất (1 thiết bị hay tất cả) phải vô hiệu hoá quyền truy cập ngay lập tức, không chờ đến khi hết hạn tự nhiên.

### Phân quyền theo vai trò (RBAC)

- Mỗi người dùng có 1 hoặc nhiều vai trò; mỗi vai trò gắn 1 tập quyền hạn cụ thể.
- Chức năng bị giới hạn theo vai trò phù hợp; không đủ quyền thì bị từ chối.
- Tạo/gán vai trò và quyền hạn hiện là thao tác thủ công ở database (seed hoặc chỉnh trực tiếp), chưa có API riêng cho việc này.

## 5. Ràng buộc

- Phục vụ 1 ứng dụng, không phải nhiều client khác nhau cùng lúc.
- Cân bằng giữa tiện lợi (không bắt đăng nhập lại liên tục) và an toàn (thu hồi được ngay khi cần).
- Thu hồi quyền truy cập của 1 thiết bị không ảnh hưởng các thiết bị khác, trừ khi chọn đăng xuất tất cả.

## 6. Tiêu chí hoàn thành

- Đăng ký và đăng nhập thành công.
- Sau khi đăng nhập, truy cập được chức năng cần xác thực; chưa đăng nhập hoặc quyền không hợp lệ thì bị từ chối.
- Quyền truy cập tự gia hạn khi còn dùng app, hết hiệu lực khi quá hạn hoặc bị thu hồi.
- Đăng nhập được cùng lúc trên nhiều thiết bị, xem được danh sách thiết bị đang hoạt động.
- Đăng xuất 1 thiết bị chỉ ảnh hưởng thiết bị đó; đăng xuất tất cả vô hiệu hoá mọi thiết bị.
- Sau khi đăng xuất, quyền truy cập cũ bị từ chối ngay, không chờ hết hạn.
- Không đủ vai trò/quyền thì bị chặn khỏi chức năng dành riêng cho vai trò khác.
