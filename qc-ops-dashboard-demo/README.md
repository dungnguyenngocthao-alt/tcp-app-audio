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
- Heatmap theo khung giờ + tab trạng thái **Tất cả / Nghe máy / Không nghe máy**.

*Dữ liệu trong block User ID và phần tách trạng thái heatmap là mock thực tế
(site không public phần dữ liệu này).*
