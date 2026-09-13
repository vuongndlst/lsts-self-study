# Tài liệu hướng dẫn

Hai bản Word gửi cho giáo viên và học sinh. **Không sửa tay file .docx** — nó
được dựng lại từ mã nguồn, sửa tay là lần chạy sau mất hết.

## Dựng lại khi giao diện đổi

```
node scripts/demo-class.mjs --up          # tạo lớp minh hoạ 8A0 + 10 tài khoản giả
node scripts/db.mjs . scripts/demo-class-data.sql
#   -> in ra mật khẩu, dùng cho bước sau

# máy chủ phải chạy BẢN BUILD (không phải dev): cổng 4173
npm run build && npm run preview -- --port 4173

DEMO_MK=<mật khẩu học sinh> node scripts/shoot-hs.mjs    # chụp 17 ảnh
node scripts/docx-hs.cjs                                  # dựng file Word

node scripts/demo-class.mjs --down        # xoá sạch lớp minh hoạ
```

## Vì sao có lớp minh hoạ 8A0

Mọi màn hình giáo viên đều hiện tên thật, phản tư thật, hồ sơ kỷ luật thật.
Tài liệu này gửi cho toàn bộ giáo viên trong trường nên **không được để lọt một
chữ nào** của học sinh thật. Lớp 8A0 gồm 10 em hoàn toàn bịa, mỗi em dựng sẵn
một tình huống (xem đầu `scripts/demo-class-data.sql`).

Lớp này cũng dùng được làm sân tập: giáo viên mới bấm thử thoải mái, không sợ
hỏng dữ liệu lớp mình.

## Vì sao chụp bằng máy chứ không chụp tay

Tài liệu có hàng chục hình. Giao diện đổi một chút là phải chụp lại từ đầu —
chụp tay thì lần sau không ai làm nổi. `scripts/shoot.mjs` lái Chrome qua
DevTools Protocol (không cài thêm gói nào), và vẽ khung đánh số **ngay trong
trang** trước khi chụp, nên khung luôn đúng vị trí thật.
