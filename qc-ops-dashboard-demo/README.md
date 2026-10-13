# TCPVoiceAI — QC Ops Dashboard (Demo)

Bản demo dựng lại trang **Dashboard (Tổng quan)** của
https://qc-ops.talentconnectplus.edu.vn/dashboard (giao diện shadcn-admin),
cộng các bổ sung theo yêu cầu.

## Mở demo
- **Nhanh nhất:** mở thẳng `standalone.html` bằng trình duyệt (đã nhúng sẵn CSS + JS,
  không cần web server).
- **Bản nhiều file:** mở `index.html` (dùng `css/styles.css`, `js/data.js`, `js/app.js`).

> Font Inter / JetBrains Mono tải từ Google Fonts; không có mạng vẫn chạy (fallback font hệ thống).

## Cấu trúc
```
index.html          # bản nhiều file (cấu trúc mirror shadcn: sidebar header/content/footer…)
standalone.html     # bản 1 file duy nhất (CSS + JS inline)
css/styles.css
js/data.js          # dữ liệu mock (seed từ số liệu thật đã capture)
js/app.js           # render donut/chart/top5/heatmap + block User ID + popup
```

## Tính năng chính
- Sidebar chỉ hiển thị **Dashboard** (nút thu gọn → icon rail; mobile → drawer).
- Chart **7 ngày / 30 ngày / 12 tháng**, luôn có dữ liệu (tính tới 05/10/2026).
- Donut Inbound/Outbound, Cơ cấu BU; Top 5 Caller/Callee.
- Block **Lưu lượng cuộc gọi theo User ID**: Tổng cuộc gọi, Cuộc gọi từ Odoo,
  biểu đồ stacked, lọc theo ID, Top 7, nút **Xem chi tiết** → popup toàn bộ ID.
- Heatmap theo khung giờ + dropdown trạng thái (có chấm màu từng trạng thái) **Tất cả / Nghe máy / Không nghe máy / Bận / Thất bại /
  Huỷ cuộc gọi / Mất sóng / Hộp thư thoại**.

## Cập nhật theo feedback
- Top 5 Caller / Callee: thêm cột **Ext.** (bấm để lọc); email dài tự rút gọn bằng "…" (hover xem đầy đủ).
- Block **Trạng thái cuộc gọi** (biểu đồ tròn 7 trạng thái) đặt cạnh block Lưu lượng cuộc gọi, chạy theo bộ lọc.
- Cuộc gọi đã thực hiện: thêm **TL gọi dài nhất** và **TL gọi ngắn nhất** (theo 7 ngày / 30 ngày / 12 tháng).
- Danh sách cuộc gọi: thêm cột **Trạng thái** (cũng có trong file CSV xuất báo cáo).
- Dashboard chia 2 phân mục: **I. Tổng quan** (Cuộc gọi đã thực hiện, Inbound/Outbound, Top 5 Caller/Callee,
  Cơ cấu BU, Lưu lượng cuộc gọi) và **II. Trạng thái cuộc gọi** (Trạng thái cuộc gọi, Tỷ lệ gọi thành công
  theo nhân viên, Phễu chuyển đổi cuộc gọi, Mật độ cuộc gọi theo khung giờ).
- Bố cục Tổng quan: AI phân tích tổng quan → [Cuộc gọi đã thực hiện | Inbound/Outbound] → [Top 5 Caller |
  Top 5 Callee | Cơ cấu BU] → [Phân bổ thời lượng cuộc gọi | AI phân tích thời lượng] → Lưu lượng cuộc gọi.
- Bố cục Trạng thái cuộc gọi: AI phân tích trạng thái → [Trạng thái | Tỷ lệ gọi thành công] → [Phễu chuyển đổi |
  AI phân tích phễu] → Mật độ theo khung giờ → AI phân tích mật độ.
- Các block "AI phân tích" sinh nhận xét + đề xuất tự động từ số liệu đang hiển thị (rule-based, cập nhật theo
  bộ lọc / khoảng thời gian / trạng thái). Khi tích hợp AI thật chỉ cần thay hàm aiCompose() bằng lời gọi API.
- Phân bổ thời lượng cuộc gọi: hàng số liệu (Cuộc gọi hiệu quả > 30s, TB / dài nhất / ngắn nhất) phía trên histogram
  (< 30s / 30s–1 phút / 1–3 phút / > 3 phút), chạy theo 7 ngày / 30 ngày /
  12 tháng và bộ lọc.
- Lưu lượng cuộc gọi: thêm cột **TB thời lượng gọi** (cả bảng và popup).
- Lưu lượng cuộc gọi: bảng đứng riêng, không có dropdown trạng thái (vẫn chạy theo bộ lọc Trạng thái chung).
- Tỷ lệ gọi thành công theo nhân viên: Email, Ext., Tổng cuộc gọi, Nghe máy, % cuộc gọi nghe máy thành công; Top 7 +
  nút **Xem chi tiết** mở popup toàn bộ Ext (tìm theo Ext / Email).
- Bộ lọc: thêm dropdown **Trạng thái** chọn nhiều, mỗi trạng thái chọn hiện thành pill (như Email / Ext.).
  Áp dụng cho toàn dashboard, danh sách cuộc gọi và Xuất báo cáo. Dropdown trạng thái trong từng block
  chỉ mở các trạng thái đang nằm trong bộ lọc.

*Dữ liệu trong block User ID và phần tách trạng thái heatmap là mock thực tế
(site không public phần dữ liệu này).*
- Phễu chuyển đổi cuộc gọi: Tổng cuộc gọi → Tín hiệu kết nối (trừ Thất bại, Mất sóng) → Đổ chuông / Khách bắt máy
  (trừ Bận, Huỷ cuộc gọi) → Nghe máy thực tế → Cuộc gọi chất lượng (nghe máy, thời lượng > 30 giây). Mỗi tầng có
  % trên tổng, % so với tầng trước và số bị rơi theo lý do. Chạy theo bộ lọc ngày / email / ext (không áp dụng
  bộ lọc Trạng thái để phễu luôn đủ tầng).
