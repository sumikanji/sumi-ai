# Bật đăng nhập Google, Apple ID và Email cho Sumi Kanji

Mặc định Sumi Kanji chạy ở chế độ **tài khoản trên máy**. Ở chế độ này bạn tạo được tài khoản bằng email và mật khẩu, nhưng tài khoản và tiến độ chỉ lưu trong trình duyệt đang dùng. Không cần mạng và không cần cài đặt gì.

Muốn **đăng nhập bằng Gmail hoặc Apple ID** và **đồng bộ tiến độ giữa điện thoại và máy tính** thì cần một dự án Firebase (gói miễn phí là đủ). Bạn cũng phải mở trang web qua một địa chỉ web `https://…`, vì Google và Apple không cho đăng nhập khi mở file trực tiếp trên máy (`file://`).

## 1. Tạo dự án Firebase
1. Vào https://console.firebase.google.com → **Add project**, đặt tên ví dụ `sumi-kanji`.
2. Trong dự án, bấm biểu tượng **</>** (Web app) → đặt tên → **Register app**.
3. Firebase hiện ra đoạn `firebaseConfig = { apiKey: …, authDomain: …, projectId: …, appId: … }`. Giữ lại đoạn này.

## 2. Bật các cách đăng nhập
Vào **Build → Authentication → Get started → Sign-in method**:
- **Email/Password**: bật **Enable**.
- **Google**: bật **Enable**, chọn email hỗ trợ → **Save**.
- **Apple** (không bắt buộc): cần tài khoản **Apple Developer Program** (99 USD/năm). Bạn phải tạo *Services ID* và *Key* bên Apple, rồi điền vào Firebase theo hướng dẫn hiện ngay trên màn hình. Nếu chưa có thì tạm tắt nút Apple bằng cách sửa `apple: false` trong `firebase-config.js`.

Ở thẻ **Settings → Authorized domains**, thêm tên miền bạn dùng để mở trang, ví dụ `sumi-kanji.web.app` hoặc tên miền riêng.

## 3. Tạo cơ sở dữ liệu để đồng bộ tiến độ
1. Vào **Build → Realtime Database → Create database**, chọn vùng **asia-southeast1 (Singapore)**.
2. Ở thẻ **Rules**, dán luật sau rồi bấm **Publish**. Với luật này:
   - tiến độ học: mỗi người chỉ đọc và ghi được dữ liệu của chính mình;
   - góp ý và bảng xếp hạng: ai cũng xem được, nhưng chỉ người viết mới sửa hoặc xóa được góp ý của mình;
   - nút 👍 và 🚩: mỗi người chỉ bấm được một lần cho mỗi góp ý.


```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "tips": {
      ".read": true,
      ".indexOn": ["k", "at"],
      "$id": {
        ".write": "auth != null && ((!data.exists() && newData.child('uid').val() === auth.uid) || (data.exists() && data.child('uid').val() === auth.uid))",
        "text": { ".validate": "newData.isString() && newData.val().length >= 5 && newData.val().length <= 400" },
        "likes":   { "$uid": { ".write": "auth != null && auth.uid === $uid", ".validate": "newData.val() === true" } },
        "reports": { "$uid": { ".write": "auth != null && auth.uid === $uid", ".validate": "newData.val() === true" } }
      }
    },
    "leaderboard": {
      ".read": true,
      ".indexOn": ["xp", "week"],
      "$uid": { ".write": "auth != null && auth.uid === $uid" }
    },
    "rooms": {
      "$code": {
        ".read": "$code.matches(/^[0-9]{4}$/)",
        ".write": "$code.matches(/^[0-9]{4}$/)",
        "ev": { "$id": { ".validate": "newData.hasChildren(['from', 'at', 'e'])" } }
      }
    }
  }
}
```
3. Chép địa chỉ database (dạng `https://….firebasedatabase.app`).

## 4. Điền cấu hình vào Sumi Kanji
Mở `firebase-config.js` và thay dòng `window.SUMI_FIREBASE = null;` bằng:

```js
window.SUMI_FIREBASE = {
  apiKey: "…",
  authDomain: "….firebaseapp.com",
  databaseURL: "https://…firebasedatabase.app",
  projectId: "…",
  appId: "…"
};
```

## 5. Đưa trang lên mạng
Cách đơn giản nhất là dùng **Firebase Hosting**:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting      # chọn dự án vừa tạo, public directory: .  (thư mục sumi-kanji), không ghi đè index.html
firebase deploy
```
Sau đó mở địa chỉ `https://<tên-dự-án>.web.app`.

Bạn cũng có thể dùng server Node/Express sẵn có của mình để phục vụ thư mục này qua https. Khi đó nhớ thêm tên miền của server vào mục **Authorized domains** ở bước 2.

## Dữ liệu được lưu thế nào
- `users/<uid>/progress`: tiến độ học (chữ đã học, lịch ôn, điểm, chuỗi ngày, điểm bài kiểm tra và thi thử).
- `users/<uid>/profile`: tên hiển thị và avatar.
- `tips/<id>`: góp ý / mẹo nhớ cho từng chữ (ai cũng xem được; góp ý bị 3 người báo cáo sẽ tự ẩn).
- `leaderboard/<uid>`: tên, avatar và điểm số để xếp hạng (tự cập nhật khi bạn học).
- `rooms/<mã 4 số>`: phòng chơi tạm của game **Hiyo truy tìm kho báu** (vị trí, số chữ, phép bắn ra). Phòng tự xóa khi người chơi thoát. Không cần đăng nhập để chơi cùng bạn. Nếu chưa bật Firebase, chế độ "Chơi với bạn" chỉ hoạt động giữa 2 tab trên cùng một trình duyệt.
- Khi đăng nhập trên máy mới, tiến độ trên máy và trên đám mây được **gộp lại**. Mỗi chữ giữ lại bản có nhiều lượt ôn hơn, và điểm cao nhất được giữ nguyên.
- Nếu chưa muốn dùng Firebase thì vẫn chuyển được tiến độ sang máy khác bằng **Trang cá nhân → Tải bản sao lưu / Khôi phục**.
