# Nguồn âm thanh

## nhac-nen.mp3 — nhạc nền

| | |
|---|---|
| Nguồn | https://archive.org/details/peaceful-tracks (tệp `001.mp3`) |
| Tác giả | Peaceful Peach |
| Giấy phép | **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/ |
| Dài | 6 phút 28 giây |

CC0 nghĩa là tác giả đã từ bỏ mọi quyền: dùng thoải mái, **không phải ghi công**,
không phải xin phép, kể cả cho mục đích thương mại. Chọn CC0 thay vì CC BY để
nhà trường phát tán video mà không mang theo nghĩa vụ nào.

Tệp trong kho đã hạ âm lượng xuống mức nền (`loudnorm=I=-30`) và nén lại còn
96 kbps — bản gốc 15 MB, bản này 4,7 MB.

## click.wav — tiếng bấm chuột

Tự tạo bằng ffmpeg (nhiễu hồng lọc dải 1,8–7 kHz, tắt dần trong 22 ms). Không
tải từ đâu cả nên không vướng giấy phép nào.

Tạo lại:

```
ffmpeg -f lavfi -i "anoisesrc=d=0.05:c=pink:a=0.9:r=44100" \
  -af "highpass=f=1800,lowpass=f=7000,afade=t=out:st=0.003:d=0.022,volume=1.6,atrim=0:0.045" \
  -ac 1 -ar 44100 click.wav
```
