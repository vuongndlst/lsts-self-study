# Video hướng dẫn cho giáo viên

Cùng một lần quay, dựng ra hai kiểu xem:

| Tệp | Dùng khi nào |
|---|---|
| `Toan-bo-huong-dan-giao-vien.mp4` | **Xem một mạch.** Bảy phần nối liền, mỗi phần có thẻ tên mở đầu, một nền nhạc chạy suốt. Dùng cho buổi tập huấn đầu năm. |
| `1-…` … `7-….mp4` | **Tra một chức năng.** Cần xem lại cách soạn thư phụ huynh thì mở đúng đoạn 5, không phải tua cả cuốn. |
| `*.srt` | Lời thoại kèm mốc thời gian, để đưa vào công cụ lồng tiếng. Có cho cả bản gộp lẫn từng đoạn. |

Bảy phần:

1. Đầu năm: nhập danh sách lớp
2. Đầu năm: lịch tự học và mốc học kỳ
3. Việc hằng ngày
4. Chấm sao
5. Kỷ luật và thư phụ huynh
6. Chia sẻ sách
7. Giao việc cho cán sự

## Vì sao nhạc không nướng sẵn vào từng đoạn

Bản gộp phải có **một** nền nhạc chạy từ đầu tới cuối. Nếu mỗi đoạn đã có nhạc
riêng vào đầu và tắt cuối, nối bảy đoạn lại sẽ nghe nhạc lên xuống bảy lần.

Nên `ghiDoan()` chỉ dựng **hình câm** cộng danh sách mốc từng cú bấm, rồi
`longAm()` lồng tiếng riêng cho mỗi bản: bản rời nhạc vào–tắt theo đoạn, bản gộp
một dải nhạc duy nhất. Quay một lần, dựng hai bản.

Nối các đoạn bằng concat demuxer với `-c:v copy` — hình không mã hoá lại lần
nữa, nên chữ trong bản gộp nét đúng bằng bản rời. Đổi lại, **mọi đoạn và mọi thẻ
tên phải mã hoá giống hệt nhau**; tham số dùng chung nằm ở `THAM_SO_HINH` trong
`scripts/quay.mjs`, đừng sửa riêng một chỗ.

Mốc thời gian của tiếng click và phụ đề trong bản gộp lấy từ thời lượng **đo lại
được** của từng mảnh (`doDai()`), không phải cộng dồn con số dự tính — cộng dồn
thì sai số tích lại, tới đoạn cuối là tiếng click rơi lệch khỏi cú bấm.

## Vì sao không có lời đọc

Máy dựng chỉ cài giọng đọc tiếng Anh. Cho giọng Anh đọc tiếng Việt thì ra thứ
không ai nghe nổi — thà im lặng còn hơn. Hai lối đi:

1. **Xem như hiện tại** — phụ đề đọc nhanh hơn nghe, và xem được trong phòng hội
   đồng mà không cần tai nghe.
2. **Lồng tiếng sau** — đưa tệp `.srt` vào công cụ chuyển chữ thành giọng nói,
   hoặc tự thu giọng mình rồi ghép. Mốc thời gian trong `.srt` khớp từng giây
   với hình, và bản gộp có sẵn dòng đọc tên từng phần.

## Âm thanh

Nhạc nền và tiếng click: xem [`../am/NGUON.md`](../am/NGUON.md). Nhạc là **CC0**
— nhà trường phát tán thoải mái, không phải ghi công ai.

Bản trộn thô đo được **-28,6 LUFS** — thấp hơn mức video thông thường chừng
mười decibel, mở trong phòng hội đồng là phải vặn loa hết cỡ. Nên khâu cuối đưa
về **-20 LUFS**, đỉnh -1,5 dBTP.

Hai nút vặn, đổi xong chạy `--tron` là nghe được ngay:

```
MUC_NHAC=0.8 node scripts/video-gv.mjs --tron    # nhạc nhỏ lại (mặc định 1.3)
MUC_DICH=-23 node scripts/video-gv.mjs --tron    # cả video nhỏ lại (mặc định -20)
```

## Quay lại khi giao diện đổi

```
npm run build && npm run preview -- --port 4173     # máy chủ bản thật
GV_MK=<mật khẩu giáo viên lớp mẫu> node scripts/video-gv.mjs
GV_MK=<mật khẩu> node scripts/video-gv.mjs 4        # chỉ quay lại đoạn 4
```

Lớp minh hoạ 8A0 phải có dữ liệu trước — xem [`../README.md`](../README.md).

Quay lại **một** đoạn thì bản gộp không tự dựng lại; chạy `--ghep` sau đó.

## Sửa mà không phải quay lại

Quay đủ một lượt mất bảy phút. Đổi nhạc hay sửa một chữ trên thẻ tên mà phải
chờ bảy phút thì sẽ không ai sửa, nên lần quay giữ lại hình câm và một cuốn sổ
tay (`so-tay.json` trong thư mục tạm) ghi đủ mốc từng cú bấm và từng dòng phụ đề:

```
node scripts/video-gv.mjs --tron    # đổi nhạc, đổi âm lượng — vài giây
node scripts/video-gv.mjs --ghep    # đổi chữ trên thẻ tên, xếp lại — vài chục giây
```

Cả hai đều **không** quay lại màn hình, nên hình y nguyên. `--ghep` chỉ mở
trình duyệt đúng lúc chụp mấy tấm thẻ tên.

## Bốn thứ phải tự dựng vì Chrome không có sẵn

- **Con trỏ chuột.** Bản ghi màn hình của Chrome *không* chứa con trỏ. Thiếu nó
  thì người xem thấy màn hình tự đổi mà không biết vừa bấm vào đâu.
- **Hiệu ứng bấm**: một quầng sáng loè ra cộng một vòng tròn nở rộng, kèm tiếng
  click đặt đúng vào thời điểm bấm. Phải hai lớp — trên nền trắng của ứng dụng,
  một lớp thôi thì gần như không thấy.
- **Phụ đề in thẳng vào hình**, để gửi đi đâu cũng còn.
- **Thẻ tên phân đoạn**, vẽ bằng chính trình duyệt đang quay rồi chụp lại, chứ
  không dùng `drawtext` của ffmpeg — dấu tiếng Việt chắc chắn đúng, và thẻ trông
  cùng một nhà với hai tài liệu Word.

Nhịp video lấy theo mốc thời gian thật của từng khung hình, nên đoạn trang đứng
yên không bị tua nhanh và đoạn có hoạt ảnh không bị giật.

## Ba cái bẫy đã dính

**Con trỏ đặt trước khi trang trượt xong.** `scrollIntoView({behavior:'smooth'})`
chưa chạy xong thì `getBoundingClientRect()` còn trả vị trí cũ. Đặt con trỏ theo
vị trí đó rồi trang trượt ra dưới nó — video thành ra mũi tên chỉ vào khoảng
không còn cú bấm nổ ở chỗ khác. Nay `__troToi` đặt lại con trỏ vài lần trong lúc
trang còn trượt, và `__bamCoHieuUng` đặt lại lần nữa ngay trước khi bấm.

**Một `requestAnimationFrame` là chưa đủ** để khởi động một transition CSS vừa
đặt: trình duyệt có thể gộp hai lần đổi kiểu vào cùng một lượt tính, thế là
hiệu ứng không chạy và cái vòng đứng im giữa màn hình. Đọc `offsetWidth` để ép
tính lại ngay tại đó.

**Hình chạy chậm hơn tiếng.** Danh sách khung hình đưa cho ffmpeg từng kẹp sàn
thời lượng mỗi khung ở 1/30 giây. Nghe thì vô hại, nhưng Chrome bắn khung dày
hơn 30 hình mỗi giây ở đoạn có hoạt ảnh, nên những khung dày đó bị kéo dãn ra:
đoạn 4 dài **54 giây trong khi quay chỉ 44 giây**, hình chậm hơn đời thật 22%.
Tiếng click và phụ đề lại đặt theo mốc đời thật, thành ra nghe tiếng bấm xong
một lúc lâu mới thấy vòng sáng. Tệ hơn: `-shortest` cắt video về đúng độ dài
dải tiếng, nên mỗi đoạn rời còn bị cụt mất mấy giây cuối.

Nay giữ đúng khoảng cách thật giữa hai khung, khung nào dày quá thì để bộ lọc
`fps=30` bỏ bớt — đó là việc của nó. Kiểm lại bằng cách lấy khung hình ở đúng
mốc từng tiếng click trong bản gộp: cả mười lăm cú đều thấy vòng sáng nằm đúng
trên nút vừa bấm.
