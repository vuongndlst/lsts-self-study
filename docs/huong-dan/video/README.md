# Video hướng dẫn cho giáo viên

Bảy đoạn, mỗi đoạn một việc. Cố ý **không gộp thành một video dài**: thầy cô cần
tra một chức năng thì mở đúng đoạn đó, không phải tua hai mươi phút.

Mỗi đoạn có hai tệp:

| Tệp | Dùng để làm gì |
|---|---|
| `*.mp4` | Xem ngay. Phụ đề đã in vào hình, có nhạc nền và tiếng click. |
| `*.srt` | Lời thoại kèm mốc thời gian, để đưa vào công cụ lồng tiếng. |

## Vì sao không có lời đọc

Máy dựng chỉ cài giọng đọc tiếng Anh. Cho giọng Anh đọc tiếng Việt thì ra thứ
không ai nghe nổi — thà im lặng còn hơn. Hai lối đi:

1. **Xem như hiện tại** — phụ đề đọc nhanh hơn nghe, và xem được trong phòng hội
   đồng mà không cần tai nghe.
2. **Lồng tiếng sau** — đưa tệp `.srt` vào công cụ chuyển chữ thành giọng nói,
   hoặc tự thu giọng mình rồi ghép. Mốc thời gian trong `.srt` khớp từng giây
   với hình.

## Âm thanh

Nhạc nền và tiếng click: xem [`../am/NGUON.md`](../am/NGUON.md). Nhạc là **CC0**
— nhà trường phát tán thoải mái, không phải ghi công ai.

Muốn chỉnh to nhỏ nhạc nền thì đặt biến `MUC_NHAC` khi quay lại (mặc định `1.3`):

```
MUC_NHAC=0.8 GV_MK=<mật khẩu> node scripts/video-gv.mjs
```

## Quay lại khi giao diện đổi

```
npm run build && npm run preview -- --port 4173     # máy chủ bản thật
GV_MK=<mật khẩu giáo viên lớp mẫu> node scripts/video-gv.mjs
GV_MK=<mật khẩu> node scripts/video-gv.mjs 4        # chỉ quay lại đoạn 4
```

Lớp minh hoạ 8A0 phải có dữ liệu trước — xem [`../README.md`](../README.md).

## Ba thứ phải tự dựng vì Chrome không có sẵn

- **Con trỏ chuột.** Bản ghi màn hình của Chrome *không* chứa con trỏ. Thiếu nó
  thì người xem thấy màn hình tự đổi mà không biết vừa bấm vào đâu.
- **Hiệu ứng gợn khi bấm**, kèm tiếng click đặt đúng vào thời điểm bấm.
- **Phụ đề in thẳng vào hình**, để gửi đi đâu cũng còn.

Nhịp video lấy theo mốc thời gian thật của từng khung hình, nên đoạn trang đứng
yên không bị tua nhanh và đoạn có hoạt ảnh không bị giật.
