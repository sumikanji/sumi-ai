# Bản quyền & chống sao chép – Sumi Kanji

## Đã có sẵn trong web
- **Chân trang ©** trên mọi trang + trang **Điều khoản** (`terms.html`).
- **Dấu nhận dạng ẩn** `SK-7f3a9c-HIYO-2026` trong mã nguồn, chân trang và mọi hình Hiyo (`data-c="© Sumi Kanji · Hiyo"`).
  Thấy chuỗi này trên web người khác = bằng chứng họ chép của bạn.
- **Sao chép đoạn dài (>200 ký tự)** sẽ tự gắn "— Nguồn: Sumi Kanji". Sao chép 1 chữ, 1 từ, 1 câu thì không bị ảnh hưởng.
- **Chặn chuột phải / kéo-thả hình Hiyo** (chỉ hình linh vật, không chặn chữ).
- **Báo "bản sao trái phép"** khi trang chạy trên tên miền lạ.

## Khi đưa web lên mạng
1. Mở `site.js`, điền:
   ```js
   home: 'https://sumikanji.com',
   domains: ['sumikanji.com', 'sumi-kanji.web.app'],
   contact: 'email-cua-ban@...'
   ```
2. Nén và làm rối mã (cần cài Node.js):
   ```
   npm install
   npm run build
   ```
3. **Chỉ upload thư mục `dist/`**. Giữ bản gốc trên máy và sao lưu kèm ngày tháng (bằng chứng bạn là người làm trước).

## Lưu ý thật lòng
Không web nào chống sao chép 100%, vì trình duyệt luôn phải tải mã về máy người xem.
Các lớp trên giúp làm khó người chép, ghi rõ quyền sở hữu và giữ bằng chứng.
Bảo vệ mạnh nhất vẫn là **đăng ký nhãn hiệu** cho tên + logo Hiyo.

Khi phát hiện trang chép:
- chụp màn hình;
- tìm chuỗi `SK-7f3a9c` trong mã nguồn của họ;
- gửi khiếu nại tới nhà cung cấp hosting (DMCA / 削除申請) và tới Google (công cụ gỡ nội dung vi phạm bản quyền).
