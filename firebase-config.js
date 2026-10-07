// ===== Cấu hình đăng nhập Sumi Kanji =====
// Để trống (null) → trang chạy chế độ "tài khoản trên máy": tạo tài khoản bằng email + mật khẩu,
// lưu ngay trên trình duyệt này (không cần mạng, không đồng bộ giữa các máy).
//
// Muốn đăng nhập THẬT bằng Google / Apple / Email và đồng bộ tiến độ giữa điện thoại – máy tính:
// làm theo file HUONG-DAN-DANG-NHAP.md rồi dán cấu hình Firebase của bạn vào đây, ví dụ:
//
// window.SUMI_FIREBASE = {
//   apiKey: "AIza....",
//   authDomain: "sumi-kanji.firebaseapp.com",
//   databaseURL: "https://sumi-kanji-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "sumi-kanji",
//   appId: "1:1234567890:web:abcdef"
// };
window.SUMI_FIREBASE = null;

// Bật / tắt từng cách đăng nhập (Apple cần tài khoản Apple Developer)
window.SUMI_AUTH_PROVIDERS = { google: true, apple: true, email: true };
