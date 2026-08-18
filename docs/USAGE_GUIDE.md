# 📘 Hướng Dẫn Sử Dụng Chi Tiết DUZKVIDEOTOOL

Chào mừng bạn đến với hướng dẫn sử dụng chi tiết nền tảng **DUZKVIDEOTOOL** (v3.1.0).

---

## 📑 Mục Lục
1. [Khởi Động Nhanh Hệ Thống](#1-khởi-động-nhanh-hệ-thống)
2. [Sử Dụng Extension Trên Trình Duyệt](#2-sử-dụng-extension-trên-trình-duyệt)
3. [Quy Trình 3 Bước Lồng Tiếng & Dịch Phụ Đề](#3-quy-trình-3-bước-lồng-tiếng--dịch-phụ-đề)
4. [Mẹo Căn Chỉnh Vị Trí Lớp Che Phụ Đề](#4-mẹo-căn-chỉnh-vị-trí-lớp-che-phụ-đề)

---

## 1. Khởi Động Nhanh Hệ Thống

1. Mở cửa sổ Terminal tại thư mục `DUZKVIDEOTOOL/web-studio/server`.
2. Chạy lệnh:
   ```bash
   node index.js
   ```
3. Truy cập vào địa chỉ: **`http://localhost:5000`** trên trình duyệt.

---

## 2. Sử Dụng Extension Trên Trình Duyệt

Khi lướt video trên **Douyin**, **Bilibili** hoặc **Xiaohongshu**:
- Trên góc video sẽ tự động xuất hiện thanh công cụ:
  - **`⚡ Lồng Tiếng AI`**: Bấm vào để tự động mở Web Studio và tải video vào luồng xử lý.
  - **`📥 Tải Video MP4`**: Tải trực tiếp video chất lượng cao không logo về máy tính.
  - **`🎵 MP3`**: Tải riêng file âm thanh gốc.

---

## 3. Quy Trình 3 Bước Lồng Tiếng & Dịch Phụ Đề

### Bước 1: Dán Link & Xem Video Gốc
- Dán bất kỳ link video Douyin, Bilibili, Xiaohongshu hoặc TikTok vào ô nhập liệu và bấm **`⚡ Bóc Tách Video HD`**.

### Bước 2: Bóc Tách Phụ Đề & Dịch Tiếng Việt
- Bấm nút: **`🎙️ Lấy Phụ Đề & Dịch Tiếng Việt (Chuẩn CapCut ASR AI)`**.
- AI sẽ tự động nghe toàn bộ âm thanh và dịch chuẩn xác từng câu tiếng Việt kèm mốc thời gian.
- Bạn có thể bấm nút **`▶️ Phát câu này`** ở từng câu để video nhảy đến đúng đoạn và kiểm tra lời dịch.

### Bước 3: Căn Chỉnh Vị Trí Che & Xuất Video
- **Kéo thả trực tiếp thanh che** trên khung hình video để đè khít lên phụ đề tiếng Trung cũ.
- Chọn giọng đọc AI (*Hoài My - Nữ truyền cảm* hoặc *Nam Minh - Nam dứt khoát*).
- Bấm **`🚀 Lồng Tiếng + Chèn Sub`** để hệ thống render và trả về video hoàn chỉnh!

---

## 4. Mẹo Căn Chỉnh Vị Trí Lớp Che Phụ Đề

- **Đối với video ngang (16:9):** Chọn preset `🎬 16:9 (Đáy 85%)`.
- **Đối với video dọc TikTok/Douyin (9:16):** Chọn preset `📱 9:16 (Đáy 74%)`.
- **Tùy biến tự do:** Dùng chuột bấm giữ vào thanh che và kéo lên/xuống trực tiếp trên video để đạt độ chính xác cao nhất.
