// Video hướng dẫn cho giáo viên: bảy phân đoạn, ghép thành MỘT cuốn phim.
//
//   GV_MK=<mật khẩu> node scripts/video-gv.mjs         quay tất cả rồi ghép
//   GV_MK=<mật khẩu> node scripts/video-gv.mjs 4       chỉ quay lại đoạn 4
//
// Ra ba thứ:
//   · Toan-bo-huong-dan-giao-vien.mp4 — bản gộp, mỗi phân đoạn có thẻ tên mở
//     đầu, một nền nhạc chạy suốt từ đầu tới cuối;
//   · bảy tệp .mp4 rời — thầy cô cần tra một chức năng thì mở đúng đoạn đó,
//     không phải tua cả cuốn;
//   · .srt đi kèm từng thứ, để đưa vào công cụ lồng tiếng.
//
// Quay MỘT lần, dựng hai bản. Nhạc không nướng sẵn vào từng đoạn: nếu nướng thì
// nối bảy đoạn lại sẽ nghe nhạc vào rồi tắt bảy lần.
//
// Máy chủ phải chạy bản build ở http://localhost:4173, và lớp minh hoạ 8A0 phải
// có dữ liệu (xem docs/huong-dan/README.md).

import fs from 'node:fs'
import path from 'node:path'
import { taoTrinh, dangNhap, doi } from './shoot.mjs'
import { taoMayQuay, taoKichBan, LOP_PHU, longAm, noiDoan, doDai,
         theThanhDoan, vietSrt, HTML_THE, HTML_BIA } from './quay.mjs'

const TK = process.env.GV_TK || 'gv.minhhoa@lsts.edu.vn'
const RA = 'docs/huong-dan/video'
const TAM = process.env.TAM || path.join(process.env.TEMP || '.', 'quay-tam')
const SO_TAY = path.join(TAM, 'so-tay.json')

const doiSo = process.argv[2] ?? ''
// Trộn lại tiếng từ nguyên liệu lần quay trước — không mở trình duyệt, không
// quay lại gì cả. Chỉnh nhạc to nhỏ mà phải quay lại sáu phút thì không ai
// chỉnh, nên giữ lại hình câm và sổ tay mốc thời gian để làm việc này.
// --tron : trộn lại tiếng (đổi nhạc, đổi âm lượng)
// --ghep : dựng lại thẻ tên rồi nối và trộn lại — đổi chữ trên thẻ thì dùng cái
//          này, chỉ mở trình duyệt để chụp thẻ, không quay lại màn hình nào.
const chiTronLai = doiSo === '--tron'
const chiGhepLai = doiSo === '--ghep'
const khongQuay = chiTronLai || chiGhepLai
const loc = khongQuay ? '' : doiSo

const MK = process.env.GV_MK
if (!MK && !khongQuay) throw new Error('Đặt GV_MK=<mật khẩu giáo viên lớp mẫu> trước khi chạy.')

let t, may, K

const tab = async (ten, cho = null) => {
  await t.chay(`window.__nut(${JSON.stringify(ten)})?.click(); return 1`)
  await doi(1500)
  if (cho) await t.doiChu(cho)
}
const dongCuaSo = async () => {
  await t.chay(`document.querySelector('.modal-head .icon-button')?.click(); return 1`)
  await doi(800)
}
const moKhoi = async (chu) => {
  await t.chay(`
    const h = [...document.querySelectorAll('.collapse-head')]
      .find(e => e.textContent.includes(${JSON.stringify(chu)}));
    if (h && h.closest('.collapsible').classList.contains('shut')) h.click();
    return !!h`)
  await doi(900)
}

// Về trang giáo viên và dựng lại lớp phủ sau mỗi lần chuyển trang.
const veTrangChu = async () => {
  await t.den('/#/teacher', 'Quản lý giờ tự học')
  await t.chay(LOP_PHU + '; window.__dungLopPhu(); return 1')
  await doi(700)
}

const DOAN = [
  // ======================================================================= 1
  ['1-nhap-danh-sach-lop', 'Đầu năm: nhập danh sách lớp', 'Thẻ Học sinh · nhập danh sách từ Excel · đọc bản xem trước rồi mới nhập.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Việc đầu tiên của năm học: đưa danh sách lớp vào hệ thống.')
    await K.tro('button', 'Học sinh'); await K.bam()
    await K.noi('Thẻ Học sinh là nơi quản lý danh sách lớp.')
    await K.tro('button', 'Nhập danh sách từ Excel')
    await K.noi('Bấm Nhập danh sách từ Excel.', 1300); await K.bam(2600)
    await K.noi('Tải file mẫu, điền ba cột: số thứ tự, mã số học sinh, họ và tên.')
    await K.noi('Chọn file xong, hệ thống hiện bản xem trước.')
    await K.noi('Bản xem trước nói rõ em nào thêm mới, em nào đã có, dòng nào bị bỏ qua và vì sao.')
    await K.noi('Đọc kỹ bảng đó rồi mới bấm nhập.')
    await dongCuaSo()
    await K.noi('Lưu ý: nhập danh sách KHÔNG tạo tài khoản cho học sinh.')
    await K.noi('Các em tự tạo tài khoản bằng mã số của mình.')
    await K.noi('Nhập lại lần hai cũng không nhân đôi học sinh, và không mất dữ liệu cũ.')
    await K.im()
  }],

  // ======================================================================= 2
  ['2-lich-tu-hoc-va-moc-hoc-ky', 'Đầu năm: lịch tự học và mốc học kỳ', 'Khai lịch tự học cố định · hai công tắc luật đăng ký · mốc học kỳ và quyền miễn trừ.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Việc quan trọng nhất khi thiết lập: khai lịch tự học của lớp.')
    await K.tro('button', 'Lịch tự học'); await K.bam(2600)
    await K.noi('Chọn các tiết tự học theo từng thứ trong tuần.')
    await K.noi('Chưa khai lịch thì hệ thống không biết ngày nào là ngày tự học.')
    await K.noi('Và như vậy sẽ không tính được ai quên đăng ký.')
    await K.cuon(360)
    await K.noi('Ngay trên đó là hai công tắc về luật đăng ký.')
    await K.noi('Cho phép đăng ký trễ: em vẫn đăng ký được sau hạn, chỉ bị đánh dấu Trễ.')
    await K.noi('Bắt buộc cập nhật kết quả: em còn nợ kết quả thì chưa đăng ký buổi mới được.')
    await K.noi('Công tắc thứ hai nên bật sau vài tuần, khi các em đã quen nếp.')
    await tab('Kỷ luật')
    await K.noi('Cuối cùng là mốc học kỳ, nằm trong thẻ Kỷ luật.')
    await moKhoi('Cài đặt kỷ luật')
    await t.chay(`return window.__danhDau('Cài đặt kỷ luật')`)
    await t.chay(`document.getElementById('__muc')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
    await K.noi('Đặt ngày bắt đầu tính, ngày đầu và cuối mỗi học kỳ, và số lần được miễn trừ.')
    await K.noi('Ngày bắt đầu thường là ngày lớp vào nếp tự học, không phải ngày khai giảng.')
    await K.im()
  }],

  // ======================================================================= 3
  ['3-viec-hang-ngay', 'Việc hằng ngày', 'Xem ai chưa đăng ký · miễn buổi cho cả lớp hoặc cho một em.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Mỗi ngày thầy cô chỉ mất chừng năm phút.')
    await K.tro('button', 'Chưa đăng ký'); await K.bam(2600)
    await K.noi('Thẻ Chưa đăng ký liệt kê những em chưa có kế hoạch.')
    await K.tro('button', 'Ngày mai')
    await K.noi('Nên xem Ngày mai thay vì Hôm nay.', 1400); await K.bam(2400)
    await K.noi('Nhắc trước khi hết hạn thì các em còn kịp đăng ký.')
    await K.noi('Không ai bị tính là quên.')
    await moKhoi('Miễn buổi')
    await t.chay(`return window.__danhDau('Miễn buổi tự học')`)
    await t.chay(`document.getElementById('__muc')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
    await K.noi('Ngay dưới là phần Miễn buổi tự học.')
    await K.noi('Lớp đi hội trại thì miễn cả lớp. Em nghỉ ốm thì miễn riêng em đó.')
    await K.noi('Buổi đã miễn thì không ai bị tính là quên đăng ký.')
    await K.noi('Miễn sau khi hết ngày cũng được — hệ thống gỡ luôn lần quên đã trót ghi.')
    await K.im()
  }],

  // ======================================================================= 4
  ['4-cham-sao', 'Chấm sao', 'Chấm từng bài · chấm hàng loạt · nhận xét chung không đè nhận xét riêng.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Hằng tuần, việc chính của thầy cô là chấm sao.')
    await K.tro('button', 'Chờ chấm sao')
    await K.noi('Bấm ô Chờ chấm sao ở hộp việc cần xử lý.', 1500); await K.bam(2800)
    await K.noi('Danh sách lọc ngay còn những bài đang chờ.')
    await K.tro('.task-link', null, 1200)
    await K.noi('Bấm vào tên môn để mở chi tiết.', 1300); await K.bam(2800)
    await K.noi('Cửa sổ hiện đủ nhiệm vụ, mục tiêu, và phần em tự ghi.')
    await K.noi('Đọc xong thì chọn số sao và viết nhận xét.')
    await K.noi('Nhận xét ngắn mà cụ thể có tác dụng hơn nhận xét dài.')
    await dongCuaSo()
    await K.noi('Khi có hàng chục bài cùng mức, chấm từng bài thì quá lâu.')
    await K.tro('button', 'chờ chấm sao')
    await K.noi('Bấm Chọn tất cả bài chờ chấm sao.', 1400); await K.bam(2400)
    await t.chay(`document.querySelector('.bulk-bar')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
    await K.noi('Thanh thao tác hiện ở cuối màn hình.')
    await K.tro('.bulk-bar button', 'Chấm sao', 1200); await K.bam(2800)
    await K.noi('Cửa sổ liệt kê rõ sẽ chấm cho những em nào.')
    await K.noi('Để trống ô nhận xét chung thì nhận xét riêng của từng tiết vẫn được giữ.')
    await dongCuaSo()
    await K.im()
  }],

  // ======================================================================= 5
  ['5-ky-luat-va-thu-phu-huynh', 'Kỷ luật và thư phụ huynh', 'Bảng kỷ luật · sổ lao động công ích · soạn sẵn thư rồi mở Outlook.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Em không đăng ký gì vào ngày có tiết tự học thì bị ghi một lần quên.')
    await K.noi('Hệ thống ghi tự động lúc không giờ năm phút sáng hôm sau.')
    await K.tro('button', 'Kỷ luật'); await K.bam(2800)
    await K.noi('Bảng kỷ luật cho biết em nào đang ở mức nào.')
    await K.noi('Hai tiết liền nhau trong cùng một buổi chỉ tính một lần quên.')
    await moKhoi('Lao động công ích')
    await t.chay(`return window.__danhDau('Lao động công ích —')`)
    await t.chay(`document.getElementById('__muc')?.scrollIntoView({block:'start'}); window.scrollBy(0,-96); return 1`)
    await doi(900)
    await K.noi('Bên dưới là sổ lao động công ích.')
    await K.noi('Gõ số lượt em đã làm rồi bấm Lưu. Cột Còn nợ tự tính lại.')
    await K.tro('.luot-o button', 'Lưu', 1100)
    await K.noi('Số lượt phải làm thì hệ thống tự tính từ số lần quên.')
    await K.tro('button', 'Soạn thư', 1200)
    await K.noi('Bấm Soạn thư để báo cho phụ huynh.', 1400); await K.bam(3000)
    await K.noi('Địa chỉ người nhận suy ra từ mã số học sinh, không phải nhập tay.')
    await K.noi('Thư nêu đủ từng buổi em đã quên, kèm tiết, để phụ huynh đối chiếu được.')
    await K.noi('Nội dung sửa được trước khi gửi.')
    await t.chay(`document.querySelector('.letter-actions')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
    await doi(900)
    await K.noi('Hệ thống KHÔNG tự gửi thư.')
    await K.noi('Nút này mở Outlook với nội dung điền sẵn — thầy cô tự bấm Gửi bên đó.')
    await K.noi('Thư đi từ hộp thư của chính thầy cô, phụ huynh trả lời là về đúng người.')
    await dongCuaSo()
    await K.im()
  }],

  // ======================================================================= 6
  ['6-chia-se-sach', 'Chia sẻ sách', 'Xếp lịch cả năm · hạn nộp tự tính · trang kết quả cả lớp cùng xem.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Phần chia sẻ sách chỉ hiện khi người quản trị đã cấp cho lớp.')
    await K.tro('a', 'Chia sẻ sách'); await K.bam(3000)
    await t.chay(LOP_PHU + '; window.__dungLopPhu(); return 1')
    await K.noi('Dải trên cùng cho biết ai tới lượt tuần này và các tuần kế tiếp.')
    await K.noi('Kèm luôn tình trạng nộp bài.')
    await K.tro('button', 'Xếp lịch')
    await K.noi('Thẻ Xếp lịch và chấm để phân công cả năm.', 1500); await K.bam(3000)
    await K.noi('Mỗi tuần chọn một em và đặt ngày báo cáo.')
    await K.noi('Hạn nộp luôn là ngày báo cáo trừ ba ngày, hệ thống tự tính.')
    await K.noi('Tuần ôn thi, thi, nghỉ Tết thì đặt là tuần nghỉ.')
    await K.noi('Tuần trống còn lại để dự phòng, dùng khi cần dời lịch.')
    await K.tro('button', 'Kết quả chia sẻ')
    await K.noi('Thẻ Kết quả là nơi cả lớp xem bài của nhau.', 1500); await K.bam(3000)
    await K.im()
  }],

  // ======================================================================= 7
  ['7-giao-viec-can-su', 'Giao việc cho cán sự', 'Cấp từng quyền riêng · cán sự thấy gì và không được thấy gì.', async () => {
    await veTrangChu()
    await may.bat()
    await K.noi('Thầy cô giao được một phần việc cho học sinh trong lớp.')
    await K.tro('button', 'Trợ giảng'); await K.bam(3000)
    await K.noi('Mỗi quyền cấp riêng, không phải gói chung.')
    await K.noi('Quyền hay dùng nhất: theo dõi đăng ký.')
    await K.noi('Bạn được giao sẽ thấy ai chưa đăng ký và mỗi bạn đã quên mấy lần.')
    await K.noi('Nhưng KHÔNG thấy mức kỷ luật của các bạn khác.')
    await K.noi('Lao động công ích và việc mời phụ huynh là chuyện giữa thầy cô và gia đình.')
    await K.noi('Không phải thứ để một bạn cùng lớp đọc được.')
    await K.im()
  }],
]


const TUA = DOAN.map(([, nhan]) => nhan)

// Vẽ thẻ tên bằng chính trình duyệt đang quay: dấu tiếng Việt chắc chắn đúng,
// và thẻ trông cùng một nhà với hai tài liệu Word.
const veThe = async (html, tep) => {
  await t.cdp.goi('Page.navigate', { url: 'about:blank' })
  await doi(300)
  await t.chay(`document.open(); document.write(${JSON.stringify(html)}); document.close(); return 1`)
  await doi(500)
  const { data } = await t.cdp.goi('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync(path.dirname(tep), { recursive: true })
  fs.writeFileSync(tep, Buffer.from(data, 'base64'))
  return tep
}


const DAI_BIA = 5.4     // thẻ mở đầu có danh sách bảy phần, cần thời gian đọc
const DAI_THE = 2.8
const RA_GOP = path.join(RA, 'Toan-bo-huong-dan-giao-vien.mp4')

fs.mkdirSync(RA, { recursive: true })
fs.mkdirSync(TAM, { recursive: true })

// ---------------------------------------------------------------------------
//  Ghép bảy đoạn thành một cuốn
// ---------------------------------------------------------------------------
// Nhận nguyên liệu đã có (hình câm + mốc thời gian), nên dùng được cả ngay sau
// khi quay lẫn lúc dựng lại từ sổ tay của lần quay trước.
async function ghepTatCa(ds) {
  process.stdout.write('\n▶ Ghép thành một cuốn\n')
  const manh = []          // các mảnh hình câm, theo đúng thứ tự nối
  const mocClick = []      // mốc từng cú bấm, tính từ đầu cuốn phim
  const phuDe = []         // { t, chu } — để xuất .srt cho cả cuốn
  let moc = 0

  // Thời lượng in trên bìa phải TÍNH RA, không viết tay — và phải tính từ
  // thời lượng ĐO ĐƯỢC của từng mảnh. Viết tay thì sai (đã ghi "khoảng bốn
  // phút" cho một cuốn dài năm phút rưỡi), mà cộng con số dự tính thì cũng
  // vẫn thiếu, vì mỗi đoạn còn giữ khung cuối thêm hơn một giây.
  const tongGiay = DAI_BIA + DAI_THE * ds.length
    + ds.reduce((a, d) => a + doDai(d.tep), 0)

  const bia = theThanhDoan(
    await veThe(HTML_BIA({
      tua: 'Hướng dẫn sử dụng hệ thống',
      phu: `${ds.length} phần · khoảng ${Math.round(tongGiay / 60)} phút`
         + ' · không lời, có phụ đề',
      muc: ds.map((d) => d.nhan),
    }), path.join(TAM, 'the-0.png')),
    path.join(TAM, 'the-0.mp4'), DAI_BIA)
  manh.push(bia)
  phuDe.push({ t: 0, chu: 'Hướng dẫn sử dụng hệ thống quản lý giờ tự học, dành cho giáo viên.' })
  // Đo thời lượng THẬT của tệp vừa dựng thay vì cộng dồn con số dự tính: cộng
  // dồn thì sai số tích lại, tới đoạn cuối là tiếng click lệch khỏi cú bấm.
  moc += doDai(bia)

  for (let i = 0; i < ds.length; i++) {
    const d = ds[i]
    const the = theThanhDoan(
      await veThe(HTML_THE({ so: i + 1, tong: ds.length, tua: d.nhan, phu: d.phu }),
        path.join(TAM, `the-${i + 1}.png`)),
      path.join(TAM, `the-${i + 1}.mp4`), DAI_THE)
    manh.push(the)
    phuDe.push({ t: moc, chu: `Phần ${i + 1}: ${d.nhan}.` })
    moc += doDai(the)

    manh.push(d.tep)
    for (const c of d.mocClick) mocClick.push(moc + c)
    for (const pd of d.phuDe) phuDe.push({ t: moc + pd.t, chu: pd.chu })
    moc += doDai(d.tep)
  }

  const cam = noiDoan(manh, path.join(TAM, 'gop-cam.mp4'), TAM)
  const daiThat = doDai(cam)
  longAm(cam, RA_GOP, { moc: mocClick, dai: daiThat, tam: TAM })
  const soDong = vietSrt(RA_GOP.replace(/\.mp4$/, '.srt'), phuDe, daiThat)

  const phut = Math.floor(daiThat / 60), giay = Math.round(daiThat % 60)
  console.log(`   ${phut} phút ${String(giay).padStart(2, '0')}s · ${manh.length} mảnh`
    + ` · ${mocClick.length} tiếng click · ${soDong} dòng phụ đề`
    + ` · ${(fs.statSync(RA_GOP).size / 1048576).toFixed(1)} MB`)
  console.log(`   ✓ ${RA_GOP}`)
  return { cam, dai: daiThat, mocClick }
}

const docSoTay = () => {
  if (!fs.existsSync(SO_TAY)) {
    throw new Error(`Không thấy ${SO_TAY}. Phải quay đủ một lượt trước đã.`)
  }
  return JSON.parse(fs.readFileSync(SO_TAY, 'utf8'))
}

// ---------------------------------------------------------- chỉ trộn lại tiếng
if (chiTronLai) {
  const st = docSoTay()
  for (const d of st.doan) {
    longAm(d.tep, path.join(RA, `${d.ten}.mp4`), { moc: d.mocClick, dai: d.dai, tam: TAM })
    console.log(`   ✓ ${d.ten}.mp4`)
  }
  longAm(st.gop.cam, RA_GOP, { moc: st.gop.mocClick, dai: st.gop.dai, tam: TAM })
  console.log(`   ✓ ${RA_GOP}`)
  console.log('')
  console.log('Đã trộn lại tiếng, hình quay màn hình giữ nguyên.')
  process.exit(0)
}

// ------------------------------------------- dựng lại thẻ tên rồi ghép lại
if (chiGhepLai) {
  const st = docSoTay()
  t = await taoTrinh()
  try {
    st.gop = await ghepTatCa(st.doan)
    fs.writeFileSync(SO_TAY, JSON.stringify(st, null, 2))
  } finally {
    await t.dong()
  }
  console.log('')
  console.log('Đã dựng lại thẻ tên và ghép lại, không quay lại đoạn nào.')
  process.exit(0)
}

// ---------------------------------------------------------------------- quay
t = await taoTrinh()
may = taoMayQuay(t.cdp, TAM)
K = taoKichBan(t, may)

const soTay = { doan: [], gop: null }
const ketQua = []
try {
  await dangNhap(t, { vai: 'gv', tk: TK, mk: MK })

  for (const [ten, nhan, phu, chay] of DOAN) {
    if (loc && !ten.startsWith(loc)) continue
    process.stdout.write(`\n▶ ${nhan}\n`)
    await chay()
    await may.tat()
    const r = await may.ghiDoan(path.join(TAM, `cam-${ten}.mp4`))

    // Bản rời: nhạc vào đầu đoạn, tắt cuối đoạn.
    longAm(r.tep, path.join(RA, `${ten}.mp4`), { moc: r.mocClick, dai: r.dai, tam: TAM })
    const soDong = vietSrt(path.join(RA, `${ten}.srt`), r.phuDe, r.dai)
    const mb = (fs.statSync(path.join(RA, `${ten}.mp4`)).size / 1048576).toFixed(1)
    console.log(`   ${r.dai.toFixed(1)}s · ${r.mocClick.length} tiếng click`
      + ` · ${soDong} dòng phụ đề · ${mb} MB`)
    // Sổ tay giữ đủ thứ cần để dựng lại mọi thứ SAU khâu quay: đổi nhạc, đổi
    // chữ trên thẻ tên, xếp lại thứ tự — đều không phải quay lại.
    ketQua.push({ ten, nhan, phu, ...r })
    soTay.doan.push({ ten, nhan, phu, tep: r.tep, dai: r.dai,
                      mocClick: r.mocClick, phuDe: r.phuDe })
  }

  if (loc) {
    console.log('\n(Chỉ quay lại một đoạn nên không dựng lại bản gộp.'
      + ' Chạy `node scripts/video-gv.mjs --ghep` để ghép lại từ nguyên liệu.)')
  } else {
    soTay.gop = await ghepTatCa(ketQua)
  }
  fs.writeFileSync(SO_TAY, JSON.stringify(soTay, null, 2))
} finally {
  if (t) await t.dong()
  // Chỉ dọn ảnh thẻ tên. Hình câm và sổ tay thì GIỮ, để lần sau đổi nhạc hay
  // đổi chữ trên thẻ chỉ mất vài chục giây thay vì quay lại bảy phút.
  for (const f of fs.existsSync(TAM) ? fs.readdirSync(TAM) : []) {
    if (/^the-\d+\.png$/.test(f) || f === 'noi.txt') {
      try { fs.rmSync(path.join(TAM, f), { force: true }) } catch {}
    }
  }
}

console.log(`\nXong ${ketQua.length} đoạn, tổng ${
  ketQua.reduce((a, b) => a + b.dai, 0).toFixed(0)}s hình quay màn hình.`)
console.log(`Nguyên liệu giữ ở ${TAM} —`
  + ' `--tron` để đổi nhạc, `--ghep` để đổi chữ trên thẻ tên. Không phải quay lại.')
