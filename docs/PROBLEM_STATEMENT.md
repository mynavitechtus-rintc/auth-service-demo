# Bài Toán: Authentication & Session Service

## 1. Bối Cảnh

Hệ thống hiện có nhiều ứng dụng khác nhau cần dùng chung (Web, Mobile App, Admin Portal). Mỗi ứng dụng đều cần biết "ai đang đăng nhập" và "người này được phép làm gì". Thay vì mỗi ứng dụng tự làm phần đăng nhập/phân quyền riêng, ta xây dựng **một dịch vụ xác thực dùng chung** để tất cả ứng dụng gọi vào.

Dịch vụ này đóng vai trò như một "người gác cổng" trung tâm: xác minh danh tính người dùng, cấp "vé ra vào" (token) để họ dùng cho các lần truy cập sau, và có thể thu hồi "vé" đó bất cứ lúc nào (ví dụ khi người dùng đăng xuất, hoặc nghi ngờ tài khoản bị lộ).

## 2. Vấn Đề Cần Giải Quyết

- Người dùng cần đăng ký và đăng nhập một lần, rồi dùng chung danh tính đó trên nhiều ứng dụng/thiết bị.
- Hệ thống cần biết một yêu cầu (request) có hợp lệ hay không mà không phải hỏi lại "bạn là ai" mỗi lần — nhưng vẫn phải có cách **hủy quyền truy cập ngay lập tức** khi cần (đăng xuất, khóa tài khoản...).
- Người dùng có thể đăng nhập cùng lúc trên nhiều thiết bị (điện thoại, máy tính, tablet...) và cần xem/quản lý được các thiết bị đó.
- Không phải ai cũng được làm mọi thứ — cần phân biệt vai trò (người dùng thường, quản trị viên...) để giới hạn những gì mỗi người được phép thực hiện.

## 3. Đối Tượng Sử Dụng

| Đối tượng | Mô tả |
| :--- | :--- |
| **Người dùng cuối** | Đăng ký, đăng nhập, sử dụng dịch vụ qua Web/Mobile, quản lý phiên đăng nhập của chính mình |
| **Quản trị viên (Admin)** | Có thêm quyền quản lý người dùng, vai trò, quyền hạn |
| **Các ứng dụng khách** | Web Application, Mobile App, Admin Portal — đều xác thực người dùng thông qua dịch vụ này thay vì tự làm riêng |

## 4. Yêu Cầu Chức Năng

### 4.1. Đăng ký & Đăng nhập
- Người dùng tạo tài khoản bằng email/username và mật khẩu. Mật khẩu phải được lưu trữ an toàn (không lưu dạng chữ thường/plain text).
- Tài khoản mới mặc định có vai trò "Người dùng" (USER).
- Đăng nhập bằng đúng email/mật khẩu để được cấp quyền truy cập.
- Sau một khoảng thời gian, quyền truy cập cần được làm mới tự động (người dùng không phải đăng nhập lại liên tục), nhưng nếu không hoạt động quá lâu thì phải đăng nhập lại.

### 4.2. Quản lý phiên đăng nhập trên nhiều thiết bị
- Một người dùng có thể đăng nhập cùng lúc trên nhiều thiết bị khác nhau, mỗi thiết bị là một "phiên" (session) độc lập.
- Người dùng xem được danh sách các thiết bị/phiên đang đăng nhập, kèm thông tin như loại thiết bị, địa chỉ IP, thời gian hoạt động gần nhất.
- Người dùng có thể đăng xuất khỏi **một thiết bị cụ thể** (ví dụ: quên đăng xuất ở máy tính công cộng) mà không ảnh hưởng đến các thiết bị khác.
- Người dùng có thể đăng xuất **toàn bộ thiết bị cùng lúc** (ví dụ: nghi ngờ mất tài khoản).

### 4.3. Thu hồi quyền truy cập tức thời
- Khi người dùng đăng xuất (một thiết bị hoặc tất cả), quyền truy cập tương ứng phải bị vô hiệu hóa **ngay lập tức** — không chờ đến khi "vé" hết hạn tự nhiên mới bị từ chối.

### 4.4. Phân quyền theo vai trò (RBAC)
- Mỗi người dùng có một hoặc nhiều **vai trò** (ví dụ: Người dùng, Kiểm duyệt viên, Quản trị viên).
- Mỗi vai trò gắn với một tập các **quyền hạn** cụ thể (ví dụ: xem thông tin người dùng, chỉnh sửa người dùng, cấu hình hệ thống).
- Một số chức năng chỉ dành riêng cho vai trò phù hợp; người không có quyền sẽ bị từ chối truy cập.

## 5. Ràng Buộc & Giả Định

- Dịch vụ hoạt động như một hệ thống trung tâm, phục vụ nhiều ứng dụng khác nhau cùng lúc.
- Cần cân bằng giữa **tiện lợi** (không bắt người dùng đăng nhập lại liên tục) và **an toàn** (có thể thu hồi quyền truy cập ngay khi cần).
- Việc thu hồi quyền truy cập của một thiết bị không được ảnh hưởng đến các thiết bị khác của cùng người dùng (trừ khi người dùng chủ động chọn đăng xuất tất cả).

## 6. Tiêu Chí Hoàn Thành (Acceptance Criteria)

- [ ] Người dùng đăng ký được tài khoản mới và đăng nhập thành công.
- [ ] Sau khi đăng nhập, người dùng có thể truy cập các chức năng yêu cầu xác thực; nếu chưa đăng nhập hoặc quyền truy cập không hợp lệ thì bị từ chối.
- [ ] Quyền truy cập được tự động gia hạn khi còn hoạt động, và hết hiệu lực khi quá hạn hoặc bị thu hồi.
- [ ] Người dùng đăng nhập được cùng lúc trên nhiều thiết bị và xem được danh sách các thiết bị đang hoạt động.
- [ ] Đăng xuất một thiết bị chỉ ảnh hưởng đến thiết bị đó; đăng xuất tất cả sẽ vô hiệu hóa mọi thiết bị.
- [ ] Sau khi đăng xuất, quyền truy cập cũ bị từ chối ngay lập tức, không phải chờ hết hạn.
- [ ] Người dùng không có vai trò/quyền phù hợp sẽ bị chặn khi truy cập chức năng dành riêng cho vai trò khác (ví dụ: chức năng chỉ dành cho Quản trị viên).
