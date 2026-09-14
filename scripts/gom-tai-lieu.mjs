// Gom tài liệu hướng dẫn cho trang web dùng.
//
//   node scripts/gom-tai-lieu.mjs
//
// Chạy tự động trước `npm run dev` và `npm run build` (npm gọi pre<script>).
//
// HAI BỘ, HAI ĐƯỜNG KHÁC HẲN NHAU:
//
//   Bản HỌC SINH  → chép vào public/, trang trỏ thẳng vào tệp.
//       Nó vốn dành cho mọi học sinh. Bắt các em đăng nhập mới xem được hướng
//       dẫn đăng nhập thì thành vòng luẩn quẩn.
//
//   Bản GIÁO VIÊN → KHÔNG chép đi đâu cả.
//       Tệp nằm trong bucket riêng tư trên Supabase (xem
//       supabase/schema-15-tai-lieu-gv.sql, đẩy lên bằng
//       scripts/tai-len-tai-lieu.mjs). Trang xin đường dẫn ký hạn ngắn, và
//       Supabase chỉ cấp cho giáo viên. Ở đây chỉ ghi lại TÊN TỆP trên kho
//       cùng mấy con số để hiển thị.
//
// Vì sao chép chứ không để thẳng trong public/: nguồn duy nhất của mấy tệp này
// là docs/huong-dan — README, tài liệu Word, phụ đề, video đều nằm đó, và các
// script dựng đều ghi vào đó. Đặt thêm một bản trong public/ nữa là hai bản
// cùng nằm trong git, lệch nhau lúc nào không biết.
//
// Chỉ dùng BẢN GỘP, không dùng từng đoạn rời. Trang web cho nhảy tới từng phần
// ngay trên bản gộp, nên thêm mười lăm tệp rời chỉ tổ nặng gấp đôi mà không
// thêm gì cho người xem.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const NGUON = 'docs/huong-dan'
const DICH = 'public/tai-lieu'
const DU_LIEU = 'src/data/tai-lieu.json'
const KHO_GV = 'tai-lieu-gv'          // bucket riêng tư, khớp với schema-15

const BO = [
  {
    khoa: 'hocSinh',
    nhan: 'Học sinh',
    congKhai: true,
    pdf: 'Huong-dan-hoc-sinh.pdf',
    video: 'video/hoc-sinh/Toan-bo-huong-dan-hoc-sinh.mp4',
  },
  {
    khoa: 'giaoVien',
    nhan: 'Giáo viên',
    congKhai: false,
    pdf: 'Huong-dan-giao-vien.pdf',
    video: 'video/giao-vien/Toan-bo-huong-dan-giao-vien.mp4',
  },
]

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg']
  .find((p) => p === 'ffmpeg' || fs.existsSync(p))

const soTrangPdf = (tep) => {
  for (const lenh of ['C:/poppler-25.07.0/Library/bin/pdfinfo.exe', 'pdfinfo']) {
    try {
      const m = execFileSync(lenh, [tep], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)
      if (m) return Number(m[1])
    } catch {}
  }
  return null
}

const mb = (b) => Math.round(b / 1048576 * 10) / 10

const chep = (tuongDoi) => {
  const tu = path.join(NGUON, tuongDoi)
  if (!fs.existsSync(tu)) return null
  const ten = path.basename(tuongDoi)
  const den = path.join(DICH, ten)
  fs.mkdirSync(DICH, { recursive: true })
  // Chỉ chép khi khác nhau — build lại liên tục mà lần nào cũng chép 20 MB thì
  // chậm vô ích.
  const cu = fs.existsSync(den) ? fs.statSync(den) : null
  const moi = fs.statSync(tu)
  if (!cu || cu.size !== moi.size || cu.mtimeMs < moi.mtimeMs) fs.copyFileSync(tu, den)
  return ten
}

// Ảnh bìa cho thẻ <video>. Không có nó thì trước khi bấm phát, trang chỉ hiện
// một ô đen thui — nhìn như chỗ đó bị lỗi. Lấy khung ở giây thứ hai, tức là
// giữa thẻ mở đầu, nên ảnh bìa chính là tên cuốn phim.
//
// Dựng vào docs/ chứ không vào public/: bìa của bản giáo viên cũng phải lên
// kho riêng tư như mấy tệp kia, mà tệp trên kho thì lấy từ docs.
function anhBia(tepVideo, tenRa) {
  const den = path.join(NGUON, tenRa)
  if (!fs.existsSync(tepVideo)) return null
  if (fs.existsSync(den)
      && fs.statSync(den).mtimeMs >= fs.statSync(tepVideo).mtimeMs) return tenRa
  try {
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', '2', '-i', tepVideo,
      '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', den], { stdio: 'ignore' })
    return fs.existsSync(den) ? tenRa : null
  } catch { return null }
}

// Bản ghi của lần trước. Cần nó vì src/data/tai-lieu.json NẰM TRONG git còn tệp
// bản giáo viên thì KHÔNG (kho công khai) — nên khi GitHub Actions dựng trang,
// máy đó không có tệp nào của bản giáo viên cả. Dựng lại từ đầu là ghi đè mất
// phần giáo viên, trang lên mạng thành thiếu hẳn một nửa. Thiếu nguồn thì giữ
// nguyên bản ghi cũ, đúng hơn là xoá nó đi.
let truoc = {}
try { truoc = JSON.parse(fs.readFileSync(DU_LIEU, 'utf8')) } catch {}

const ra = {}
const thieu = []
const giuLai = []

for (const b of BO) {
  // Thiếu cả hai nguồn thì coi như máy này không dựng bộ đó — giữ bản ghi cũ.
  if (!fs.existsSync(path.join(NGUON, b.pdf)) && !fs.existsSync(path.join(NGUON, b.video))
      && truoc[b.khoa]) {
    ra[b.khoa] = truoc[b.khoa]
    giuLai.push(b.khoa)
    continue
  }

  const muc = { nhan: b.nhan, congKhai: b.congKhai }
  if (!b.congKhai) muc.kho = KHO_GV

  const tepPdf = path.join(NGUON, b.pdf)
  if (fs.existsSync(tepPdf)) {
    muc.pdf = b.congKhai ? chep(b.pdf) : path.basename(b.pdf)
    muc.pdfMb = mb(fs.statSync(tepPdf).size)
    muc.pdfTrang = soTrangPdf(tepPdf)
  } else thieu.push(b.pdf)

  const tepVideo = path.join(NGUON, b.video)
  if (fs.existsSync(tepVideo)) {
    muc.video = b.congKhai ? chep(b.video) : path.basename(b.video)
    muc.videoMb = mb(fs.statSync(tepVideo).size)

    const srt = b.video.replace(/\.mp4$/, '.srt')
    if (fs.existsSync(path.join(NGUON, srt))) {
      muc.srt = b.congKhai ? chep(srt) : path.basename(srt)
    }

    const tenBia = `bia-${b.khoa === 'hocSinh' ? 'hoc-sinh' : 'giao-vien'}.jpg`
    const bia = anhBia(tepVideo, tenBia)
    if (bia) muc.anhBia = b.congKhai ? chep(bia) : bia

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

// Dọn tệp bản giáo viên nếu lần build trước đã trót chép vào public/. Không dọn
// thì trang vẫn kín, nhưng tệp vẫn nằm trong dist và tải được bằng đường dẫn
// trực tiếp — đúng cái lỗ vừa bịt.
if (fs.existsSync(DICH)) {
  for (const f of fs.readdirSync(DICH)) {
    if (/giao-vien/i.test(f)) {
      fs.rmSync(path.join(DICH, f), { force: true })
      console.log(`  dọn khỏi public/: ${f}`)
    }
  }
}

fs.mkdirSync(path.dirname(DU_LIEU), { recursive: true })
fs.writeFileSync(DU_LIEU, JSON.stringify(ra, null, 2) + '\n')

for (const [khoa, m] of Object.entries(ra)) {
  console.log(`${khoa.padEnd(10)} ${(m.congKhai ? 'public/' : `kho ${m.kho}`).padEnd(18)}`
    + ` pdf ${m.pdf ? `${m.pdfTrang} trang, ${m.pdfMb} MB` : '—'}`
    + ` · video ${m.video ? `${m.dai ?? '?'}s, ${m.videoMb} MB, ${m.chuong?.length ?? 0} phần` : '—'}`
    + (giuLai.includes(khoa) ? '   (giữ nguyên, máy này không có tệp nguồn)' : ''))
}
if (thieu.length) {
  // Cảnh báo chứ KHÔNG dừng: thiếu video thì trang vẫn dựng được, chỉ là phần
  // đó không hiện. Dừng hẳn thì ai vừa clone về đã không build nổi — mà bản
  // giáo viên thì đúng là không có trong kho mã nguồn.
  console.warn(`\n! Thiếu ${thieu.length} tệp: ${thieu.join(', ')}`)
  console.warn('  Bản học sinh: `npm run docs-word && npm run docs-pdf` và scripts/video-hs.mjs.')
  console.warn('  Bản giáo viên: không nằm trong git — dựng lại tại máy rồi'
    + ' `node scripts/tai-len-tai-lieu.mjs`.')
}
