// Gom tài liệu hướng dẫn vào public/ để trang web phát được.
//
//   node scripts/gom-tai-lieu.mjs
//
// Chạy tự động trước `npm run dev` và `npm run build` (npm gọi pre<script>).
//
// Vì sao phải chép chứ không để thẳng trong public/: nguồn duy nhất của mấy tệp
// này là docs/huong-dan — README, tài liệu Word, phụ đề, video đều nằm đó, và
// các script dựng đều ghi vào đó. Đặt thêm một bản trong public/ nữa là hai bản
// cùng nằm trong git, lệch nhau lúc nào không biết. Nên public/tai-lieu được
// .gitignore, dựng lại từ docs mỗi lần build.
//
// Chỉ chép BẢN GỘP, không chép từng đoạn rời. Trang web cho nhảy tới từng phần
// ngay trên bản gộp, nên chép thêm mười lăm tệp rời chỉ tổ nặng gấp đôi mà
// không thêm gì cho người xem.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const NGUON = 'docs/huong-dan'
const DICH = 'public/tai-lieu'
const DU_LIEU = 'src/data/tai-lieu.json'

const BO = [
  {
    khoa: 'hocSinh',
    nhan: 'Học sinh',
    pdf: 'Huong-dan-hoc-sinh.pdf',
    video: 'video/hoc-sinh/Toan-bo-huong-dan-hoc-sinh.mp4',
  },
  {
    khoa: 'giaoVien',
    nhan: 'Giáo viên',
    pdf: 'Huong-dan-giao-vien.pdf',
    video: 'video/giao-vien/Toan-bo-huong-dan-giao-vien.mp4',
  },
]

const soTrangPdf = (tep) => {
  for (const lenh of ['C:/poppler-25.07.0/Library/bin/pdfinfo.exe', 'pdfinfo']) {
    try {
      const m = execFileSync(lenh, [tep], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)
      if (m) return Number(m[1])
    } catch {}
  }
  return null
}

const chep = (tuongDoi) => {
  const tu = path.join(NGUON, tuongDoi)
  if (!fs.existsSync(tu)) return null
  const ten = path.basename(tuongDoi)
  const den = path.join(DICH, ten)
  fs.mkdirSync(DICH, { recursive: true })
  // Chỉ chép khi khác nhau — build lại liên tục mà lần nào cũng chép 40 MB thì
  // chậm vô ích.
  const cu = fs.existsSync(den) ? fs.statSync(den) : null
  const moi = fs.statSync(tu)
  if (!cu || cu.size !== moi.size || cu.mtimeMs < moi.mtimeMs) fs.copyFileSync(tu, den)
  return { ten, co: moi.size }
}

const mb = (b) => Math.round(b / 1048576 * 10) / 10

// Ảnh bìa cho thẻ <video>. Không có nó thì trước khi bấm phát, trang chỉ hiện
// một ô đen thui — nhìn như chỗ đó bị lỗi. Lấy khung ở giây thứ hai, tức là
// giữa thẻ mở đầu, nên ảnh bìa chính là tên cuốn phim.
const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg']
  .find((p) => p === 'ffmpeg' || fs.existsSync(p))

function anhBia(tepVideo, tenRa) {
  const den = path.join(DICH, tenRa)
  if (fs.existsSync(den)
      && fs.statSync(den).mtimeMs >= fs.statSync(tepVideo).mtimeMs) return tenRa
  try {
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', '2', '-i', tepVideo,
      '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', den], { stdio: 'ignore' })
    return fs.existsSync(den) ? tenRa : null
  } catch { return null }
}

const ra = {}
const thieu = []
for (const b of BO) {
  const muc = { nhan: b.nhan }

  const pdf = chep(b.pdf)
  if (pdf) {
    muc.pdf = pdf.ten
    muc.pdfMb = mb(pdf.co)
    muc.pdfTrang = soTrangPdf(path.join(NGUON, b.pdf))
  } else thieu.push(b.pdf)

  const vid = chep(b.video)
  if (vid) {
    muc.video = vid.ten
    muc.videoMb = mb(vid.co)
    const srt = chep(b.video.replace(/\.mp4$/, '.srt'))
    if (srt) muc.srt = srt.ten
    const bia = anhBia(path.join(NGUON, b.video), `bia-${b.khoa}.jpg`)
    if (bia) muc.anhBia = bia
    // Mốc từng phần nằm trong file .chuong.json do script quay ghi ra. Nó nhỏ
    // nên nhét thẳng vào dữ liệu của ứng dụng, khỏi phải fetch lúc chạy.
    const tepChuong = path.join(NGUON, b.video.replace(/\.mp4$/, '.chuong.json'))
    if (fs.existsSync(tepChuong)) {
      const c = JSON.parse(fs.readFileSync(tepChuong, 'utf8'))
      muc.dai = c.dai
      muc.chuong = c.chuong
    }
  } else thieu.push(b.video)

  ra[b.khoa] = muc
}

fs.mkdirSync(path.dirname(DU_LIEU), { recursive: true })
fs.writeFileSync(DU_LIEU, JSON.stringify(ra, null, 2) + '\n')

for (const [khoa, m] of Object.entries(ra)) {
  console.log(`${khoa.padEnd(10)} pdf ${m.pdf ? `${m.pdfTrang} trang, ${m.pdfMb} MB` : '—'}`
    + ` · video ${m.video ? `${m.dai ?? '?'}s, ${m.videoMb} MB, ${m.chuong?.length ?? 0} phần` : '—'}`)
}
if (thieu.length) {
  // Cảnh báo chứ KHÔNG dừng: thiếu video thì trang vẫn dựng được, chỉ là phần
  // đó không hiện. Dừng hẳn thì ai vừa clone về đã không build nổi.
  console.warn(`\n! Thiếu ${thieu.length} tệp: ${thieu.join(', ')}`)
  console.warn('  Chạy `npm run docs-word && node scripts/docs-pdf.cjs`'
    + ' và các script video để dựng lại.')
}
