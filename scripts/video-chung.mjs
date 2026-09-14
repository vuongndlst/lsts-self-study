// Khung dựng video hướng dẫn, dùng chung cho bản giáo viên và bản học sinh.
//
// Hai bộ video chỉ khác nhau ở KỊCH BẢN: quay cái gì, nói câu gì. Còn lại —
// quay, dựng thẻ tên, nối thành một cuốn, lồng nhạc, xuất phụ đề, giữ nguyên
// liệu để sửa mà khỏi quay lại — đều giống hệt. Viết hai lần thì sửa một lỗi
// phải nhớ sửa cả hai chỗ, mà kiểu gì cũng quên một chỗ.
//
// Ba chế độ chạy, đọc từ tham số dòng lệnh:
//
//   (không có)  quay đủ mọi đoạn rồi ghép
//   <tiền tố>   chỉ quay lại đoạn có tên bắt đầu bằng chuỗi đó
//   --tron      trộn lại tiếng từ nguyên liệu lần trước (đổi nhạc, đổi âm lượng)
//   --ghep      dựng lại thẻ tên rồi nối và trộn lại (đổi chữ trên thẻ)
//
// Hai chế độ sau KHÔNG quay lại màn hình, nên hình y nguyên và chạy trong vài
// chục giây thay vì vài phút.

import fs from 'node:fs'
import path from 'node:path'
import { taoTrinh, doi } from './shoot.mjs'
import { taoMayQuay, taoKichBan, longAm, noiDoan, doDai,
         theThanhDoan, vietSrt, HTML_THE, HTML_BIA } from './quay.mjs'

const DAI_BIA = 5.4     // thẻ mở đầu có danh sách các phần, cần thời gian đọc
const DAI_THE = 2.8

// Vẽ thẻ tên bằng chính trình duyệt đang quay: dấu tiếng Việt chắc chắn đúng,
// và thẻ trông cùng một nhà với hai tài liệu Word.
const taoVeThe = (t) => async (html, tep) => {
  await t.cdp.goi('Page.navigate', { url: 'about:blank' })
  await doi(300)
  await t.chay(`document.open(); document.write(${JSON.stringify(html)}); document.close(); return 1`)
  await doi(500)
  const { data } = await t.cdp.goi('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync(path.dirname(tep), { recursive: true })
  fs.writeFileSync(tep, Buffer.from(data, 'base64'))
  return tep
}

// ---------------------------------------------------------------------------
//  Ghép các đoạn thành một cuốn
// ---------------------------------------------------------------------------
// Nhận nguyên liệu đã có (hình câm + mốc thời gian), nên dùng được cả ngay sau
// khi quay lẫn lúc dựng lại từ sổ tay của lần quay trước.
async function ghepTatCa({ ds, t, TAM, raMp4, nhanBia, tuaBia }) {
  process.stdout.write('\n▶ Ghép thành một cuốn\n')
  const veThe = taoVeThe(t)
  const manh = []          // các mảnh hình câm, theo đúng thứ tự nối
  const mocClick = []      // mốc từng cú bấm, tính từ đầu cuốn phim
  const phuDe = []         // { t, chu } — để xuất .srt cho cả cuốn
  const chuong = []        // mốc mở đầu từng phần, cho nút nhảy trên trang web
  let moc = 0

  // Thời lượng in trên bìa phải TÍNH RA, không viết tay — và phải tính từ thời
  // lượng ĐO ĐƯỢC của từng mảnh. Viết tay thì sai (đã ghi "khoảng bốn phút" cho
  // một cuốn dài năm phút rưỡi), mà cộng con số dự tính thì cũng vẫn thiếu, vì
  // mỗi đoạn còn giữ khung cuối thêm hơn một giây.
  const tongGiay = DAI_BIA + DAI_THE * ds.length
    + ds.reduce((a, d) => a + doDai(d.tep), 0)

  const bia = theThanhDoan(
    await veThe(HTML_BIA({
      nhan: nhanBia,
      tua: tuaBia,
      phu: `${ds.length} phần · khoảng ${Math.round(tongGiay / 60)} phút`
         + ' · không lời, có phụ đề',
      muc: ds.map((d) => d.nhan),
    }), path.join(TAM, 'the-0.png')),
    path.join(TAM, 'the-0.mp4'), DAI_BIA)
  manh.push(bia)
  phuDe.push({ t: 0, chu: `${tuaBia}.` })
  // Đo thời lượng THẬT của tệp vừa dựng thay vì cộng dồn con số dự tính: cộng
  // dồn thì sai số tích lại, tới đoạn cuối là tiếng click lệch khỏi cú bấm.
  moc += doDai(bia)

  for (let i = 0; i < ds.length; i++) {
    const d = ds[i]
    const the = theThanhDoan(
      await veThe(HTML_THE({ so: i + 1, tong: ds.length, tua: d.nhan, phu: d.phu }),
        path.join(TAM, `the-${i + 1}.png`)),
      path.join(TAM, `the-${i + 1}.mp4`), DAI_THE)
    // Chương bắt đầu từ THẺ TÊN chứ không từ đoạn quay: bấm vào phần 5 mà rơi
    // thẳng vào giữa thao tác thì người xem không kịp biết đang xem phần nào.
    chuong.push({ so: i + 1, tua: d.nhan, phu: d.phu, batDau: Math.round(moc * 10) / 10 })
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
  longAm(cam, raMp4, { moc: mocClick, dai: daiThat, tam: TAM })
  const soDong = vietSrt(raMp4.replace(/\.mp4$/, '.srt'), phuDe, daiThat)
  fs.writeFileSync(raMp4.replace(/\.mp4$/, '.chuong.json'),
    JSON.stringify({ dai: Math.round(daiThat * 10) / 10, chuong }, null, 2))

  const phut = Math.floor(daiThat / 60), giay = Math.round(daiThat % 60)
  console.log(`   ${phut} phút ${String(giay).padStart(2, '0')}s · ${manh.length} mảnh`
    + ` · ${mocClick.length} tiếng click · ${soDong} dòng phụ đề`
    + ` · ${(fs.statSync(raMp4).size / 1048576).toFixed(1)} MB`)
  console.log(`   ✓ ${raMp4}`)
  return { cam, dai: daiThat, mocClick }
}

// ---------------------------------------------------------------------------
//  Chạy cả bộ
// ---------------------------------------------------------------------------
export async function dungPhim({
  RA, TAM, tenGop, nhanBia, tuaBia,
  dangNhapVao,     // async (t) => {}   — đăng nhập trước khi quay
  taoDoan,         // ({ t, may, K }) => [[tên, nhãn, mô tả, hàm quay], …]
  doiSo = '',
}) {
  const SO_TAY = path.join(TAM, `so-tay-${tenGop}.json`)
  const RA_GOP = path.join(RA, `${tenGop}.mp4`)
  const chiTronLai = doiSo === '--tron'
  const chiGhepLai = doiSo === '--ghep'
  const loc = (chiTronLai || chiGhepLai) ? '' : doiSo

  fs.mkdirSync(RA, { recursive: true })
  fs.mkdirSync(TAM, { recursive: true })

  const docSoTay = () => {
    if (!fs.existsSync(SO_TAY)) {
      throw new Error(`Không thấy ${SO_TAY}. Phải quay đủ một lượt trước đã.`)
    }
    return JSON.parse(fs.readFileSync(SO_TAY, 'utf8'))
  }

  // -------------------------------------------------- chỉ trộn lại tiếng
  if (chiTronLai) {
    const st = docSoTay()
    for (const d of st.doan) {
      longAm(d.tep, path.join(RA, `${d.ten}.mp4`), { moc: d.mocClick, dai: d.dai, tam: TAM })
      console.log(`   ✓ ${d.ten}.mp4`)
    }
    longAm(st.gop.cam, RA_GOP, { moc: st.gop.mocClick, dai: st.gop.dai, tam: TAM })
    console.log(`   ✓ ${RA_GOP}`)
    console.log('\nĐã trộn lại tiếng, hình quay màn hình giữ nguyên.')
    return
  }

  // --------------------------------- dựng lại thẻ tên rồi nối và trộn lại
  if (chiGhepLai) {
    const st = docSoTay()
    const t = await taoTrinh()
    try {
      st.gop = await ghepTatCa({ ds: st.doan, t, TAM, raMp4: RA_GOP, nhanBia, tuaBia })
      fs.writeFileSync(SO_TAY, JSON.stringify(st, null, 2))
    } finally {
      await t.dong()
    }
    console.log('\nĐã dựng lại thẻ tên và ghép lại, không quay lại đoạn nào.')
    return
  }

  // ------------------------------------------------------------------ quay
  const t = await taoTrinh()
  const may = taoMayQuay(t.cdp, TAM)
  const K = taoKichBan(t, may)
  const DOAN = taoDoan({ t, may, K })

  // Quay lại một đoạn thì sổ tay cũ vẫn còn dùng được cho các đoạn kia — đọc
  // lên rồi thay đúng đoạn vừa quay, để `--ghep` sau đó vẫn ghép được đủ bộ.
  const soTay = (loc && fs.existsSync(SO_TAY)) ? docSoTay() : { doan: [], gop: null }
  const ketQua = []
  try {
    await dangNhapVao(t)

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
      ketQua.push({ ten, nhan, phu, ...r })

      // Sổ tay giữ đủ thứ cần để dựng lại mọi khâu SAU khi quay: đổi nhạc, đổi
      // chữ trên thẻ tên, xếp lại thứ tự — đều không phải quay lại.
      const ghi = { ten, nhan, phu, tep: r.tep, dai: r.dai,
                    mocClick: r.mocClick, phuDe: r.phuDe }
      const cho = soTay.doan.findIndex((d) => d.ten === ten)
      if (cho >= 0) soTay.doan[cho] = ghi; else soTay.doan.push(ghi)
    }

    if (loc) {
      console.log(`\n(Chỉ quay lại ${ketQua.length} đoạn nên chưa ghép.`
        + ' Chạy `--ghep` để ghép lại từ nguyên liệu.)')
    } else {
      soTay.gop = await ghepTatCa({ ds: ketQua, t, TAM, raMp4: RA_GOP, nhanBia, tuaBia })
    }
    fs.writeFileSync(SO_TAY, JSON.stringify(soTay, null, 2))
  } finally {
    await t.dong()
    // Chỉ dọn ảnh thẻ tên. Hình câm và sổ tay thì GIỮ, để lần sau đổi nhạc hay
    // đổi chữ trên thẻ chỉ mất vài chục giây thay vì quay lại từ đầu.
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
}
