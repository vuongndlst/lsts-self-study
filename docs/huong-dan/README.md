# Tài liệu hướng dẫn

Hai bộ — một cho giáo viên, một cho học sinh — mỗi bộ gồm **tài liệu Word/PDF**
và **video**. Cả hai bộ đều nhúng sẵn trên trang **Hướng dẫn** của hệ thống
(`/#/guide`, chọn thẻ Học sinh hoặc Giáo viên).

**Không sửa tay file .docx, .pdf hay .mp4** — tất cả đều dựng lại từ mã nguồn,
sửa tay là lần chạy sau mất hết.

| Thứ | Ở đâu | Dựng bằng |
|---|---|---|
| Ảnh chụp màn hình | `img/` | `npm run docs-chup` |
| Tài liệu Word | `Huong-dan-*.docx` | `npm run docs-word` |
| Tài liệu PDF | `Huong-dan-*.pdf` | `npm run docs-pdf` |
| Video | `video/hoc-sinh/`, `video/giao-vien/` | `npm run docs-video` |
| Bản chép sang trang web | `public/tai-lieu/` | `npm run tai-lieu` (tự chạy trước mỗi lần build) |

## Dựng lại khi giao diện đổi

```
node scripts/demo-class.mjs --up          # tạo lớp minh hoạ 8A0 + 10 tài khoản giả
node scripts/db.mjs . scripts/demo-class-data.sql
#   -> in ra mật khẩu, dùng cho các bước sau

# máy chủ phải chạy BẢN BUILD (không phải dev): cổng 4173
npm run build && npm run preview -- --port 4173

DEMO_MK=<mật khẩu học sinh> node scripts/shoot-hs.mjs    # 17 ảnh bản học sinh
GV_MK=<mật khẩu giáo viên>  node scripts/shoot-gv.mjs    # 25 ảnh bản giáo viên
npm run docs-word                                         # hai file Word
npm run docs-pdf                                          # hai file PDF

DEMO_MK=<mật khẩu học sinh> node scripts/video-hs.mjs    # 8 đoạn + bản gộp
GV_MK=<mật khẩu giáo viên>  node scripts/video-gv.mjs    # 7 đoạn + bản gộp

node scripts/demo-class.mjs --down        # xoá sạch lớp minh hoạ
```

Video sửa được mà không phải quay lại (`--tron` đổi nhạc, `--ghep` đổi chữ trên
thẻ tên) — xem [`video/README.md`](video/README.md).

## Vì sao PDF chứ không chỉ .docx

Trang web nhúng được PDF ngay trong khung, người xem không phải tải về rồi mở
Word. Và PDF thì máy nào mở cũng ra đúng một kiểu — `.docx` mở bằng Google Docs
hay WPS là bố cục xô lệch, mà cả tài liệu này là hình với chú thích nên xô lệch
là hỏng.

## Vì sao public/tai-lieu không nằm trong git

Nguồn duy nhất của mấy tệp này là `docs/huong-dan`. Giữ thêm một bản nữa trong
`public/` là hai bản mấy chục MB cùng nằm trong git, lệch nhau lúc nào không
biết. Nên `public/tai-lieu` được `.gitignore` và dựng lại từ `docs` mỗi lần
build (`scripts/gom-tai-lieu.mjs`, npm tự gọi qua `prebuild`/`predev`).

Script đó cũng ghi `src/data/tai-lieu.json` — số trang, dung lượng, mốc từng
phần của video. Trang web đọc file đó nên mọi con số hiện ra đều **đo được từ
tệp thật**, không phải gõ tay rồi quên cập nhật.

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

## Vì sao dựng file Word hai lượt

Trường mục lục của Word chỉ có nội dung sau khi Word tự cập nhật trường — chuyển
sang PDF thì ra một **trang trắng**. Tài liệu này gửi cho hàng chục giáo viên, ai
mở bằng gì cũng phải thấy mục lục, nên mục lục được dựng tĩnh: lượt đầu đo xem
mỗi mục rơi vào trang nào, lượt sau ghi số trang thật vào.

Hệ quả: bộ đếm hình phải tạo mới trong mỗi lượt, nếu không lượt hai đếm tiếp và
cả tài liệu ghi "Hình 18" tới "Hình 34".

## Vì sao mục nào cũng không sang trang mới

Ban đầu mỗi mục bắt đầu một trang. Đo trên bản dựng: bản học sinh có chín trang
dùng dưới 70% chiều cao, một trang chỉ 13%; bản giáo viên mười hai trang như vậy.
Ngắt trang theo mục nghe thì gọn nhưng đuôi mục nào cũng để lại một khoảng trắng
dài. Nay chỉ có một đường kẻ trên đầu mục — hai tài liệu từ 21 và 27 trang xuống
13 và 15, không bỏ chữ nào.

Ba quy tắc giữ cho nó không phình lại:

- **Ảnh giới hạn cả hai chiều** (`RONG_ANH`, `CAO_ANH` trong `scripts/docx-lib.cjs`),
  thu nhỏ theo tỉ lệ chứ không cắt xén. Ảnh vừa rộng vừa cao thì phải **chụp lại
  cho ngắn bớt**, đừng nới `CAO_ANH`.
- **Ảnh cao mà hẹp thì dùng `hinhKem`**, đặt các bước thao tác hoặc chú giải ① ② ③
  vào khoảng trống bên phải ảnh.
- **Dòng chú thích không được `keepNext`.** Ảnh dính chú thích là đúng, nhưng chú
  thích dính tiếp vào tựa mục phía sau (tựa lại dính đoạn đầu mục) thì cả dây bốn
  khối phải nằm chung một trang — đo ra mấy trang chỉ dùng 57% chiều cao.

## Video

Đã quay: 7 đoạn cho giáo viên, xem `docs/huong-dan/video/README.md`. Không lời,
có phụ đề in sẵn trên hình, nhạc nền CC0 và tiếng click theo từng cú bấm; mỗi đoạn
kèm một file `.srt` riêng để đưa vào công cụ lồng tiếng.
