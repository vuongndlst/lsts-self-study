// Bộ khối dựng sẵn cho hai tài liệu hướng dẫn (học sinh và giáo viên).
//
// Tách riêng ra vì hai tài liệu phải TRÔNG GIỐNG NHAU: cùng cỡ chữ, cùng kiểu
// đóng khung, cùng cách đánh số hình. Mỗi bản tự định kiểu riêng thì gửi cho
// giáo viên sẽ thành hai thứ rời rạc.

const fs = require('node:fs')
const path = require('node:path')
const {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat,
  PageBreak, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
  TableLayoutType, VerticalAlign, WidthType, PageNumber, TableOfContents,
} = require('docx')

// Arial: có sẵn trên mọi máy và dấu tiếng Việt luôn hiện đúng. Phông đẹp hơn
// nhưng máy giáo viên không có thì Word thay bằng phông khác, chữ vỡ hết.
const PHONG = 'Arial'
const MUC = { xanh: '1C4E80', cam: 'C05621', xam: '5A6472', den: '1A1A1A' }

// Khổ A4, lề 2,5 cm → khung chữ 16 × 24,7 cm, tức 605 × 933 điểm ảnh ở 96 dpi.
//
// Ảnh KHÔNG được lấp hết chiều cao đó. Chỉ giới hạn bề ngang thôi thì một ảnh
// cao như cửa sổ bật lên sẽ chiếm trọn một trang, lật sang trang sau mới thấy
// chú thích — đọc rất mệt. Giới hạn cả hai chiều, ảnh luôn còn chỗ cho chú
// thích và vài dòng chữ bên dưới.
//
// Ảnh NGANG thì bề ngang quyết định, ảnh DỌC thì chiều cao quyết định. Ảnh vừa
// rộng vừa cao (bảng nhiều dòng) sẽ bị thu quá nhỏ để đọc — với những ảnh đó
// phải chụp lại cho ngắn bớt, chứ không phải ép nó vào khung.
const RONG_ANH = 605      // = 16 cm, trọn bề ngang khung chữ
const CAO_ANH  = 545      // ≈ 14,4 cm, tức nhiều nhất 58% chiều cao trang

// Đọc kích thước PNG từ 24 byte đầu — khỏi kéo thêm thư viện ảnh chỉ để biết
// mỗi chiều rộng và chiều cao.
function coPng(tep) {
  const b = fs.readFileSync(tep)
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${tep} không phải PNG hợp lệ.`)
  }
  return { rong: b.readUInt32BE(16), cao: b.readUInt32BE(20) }
}

const chu = (text, o = {}) => new TextRun({
  text, font: PHONG, size: o.size ?? 22, bold: o.bold, italics: o.italics,
  color: o.color ?? MUC.den, break: o.break,
})

// Cho phép viết "Bấm **Lưu kết quả** rồi đóng" — in đậm chen giữa câu mà không
// phải tự tay tách thành nhiều TextRun. Một dấu sao là in nghiêng: *Trễ hạn*.
//
// Phải tách ** TRƯỚC rồi mới tách *, không thì "**đậm**" bị hiểu thành hai lần
// nghiêng rỗng. Quên chỗ này thì dấu sao hiện nguyên trong tài liệu — đã dính.
function chuoi(text, o = {}) {
  const ra = []
  String(text).split(/\*\*/).forEach((phan, i) => {
    const dam = o.bold || i % 2 === 1
    phan.split(/\*/).forEach((p, j) => {
      if (p === '') return
      ra.push(chu(p, { ...o, bold: dam, italics: o.italics || j % 2 === 1 }))
    })
  })
  return ra.length ? ra : [chu('', o)]
}

const doan = (text, o = {}) => new Paragraph({
  children: Array.isArray(text) ? text : chuoi(text, o),
  spacing: { after: o.after ?? 140, line: 288 },
  alignment: o.canh,
})

const tua1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
  spacing: { before: 240, after: 200 },
  children: [chu(text, { size: 32, bold: true, color: MUC.xanh })],
})

const tua2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 140 },
  children: [chu(text, { size: 26, bold: true, color: MUC.xanh })],
})

// Bước thao tác: đánh số tay thay vì dùng numbering của Word. Lý do: xen ảnh và
// hộp lưu ý vào giữa các bước là Word tự đánh số lại từ 1.
const buoc = (so, text) => new Paragraph({
  spacing: { after: 120, line: 288 },
  indent: { left: 360, hanging: 360 },
  children: [chu(`${so}. `, { bold: true, color: MUC.cam }), ...chuoi(text)],
})

const gach = (text) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: 90, line: 288 },
  children: chuoi(text),
})

// ---------------------------------------------------------------------------
//  Hình có đánh số
// ---------------------------------------------------------------------------
function taoDemHinh() {
  let n = 0
  return {
    hinh(tep, chuThich, { rong = RONG_ANH, cao = CAO_ANH } = {}) {
      if (!fs.existsSync(tep)) throw new Error(`Thiếu ảnh: ${tep}`)
      const { rong: rw, cao: rh } = coPng(tep)
      // Ảnh chụp ở 2x nên cỡ thật là một nửa; rồi thu vừa khung, giữ nguyên tỉ
      // lệ — thu nhỏ chứ không cắt xén.
      const ty = Math.min(rong / (rw / 2), cao / (rh / 2), 1)
      const w = Math.round((rw / 2) * ty)
      const h = Math.round((rh / 2) * ty)
      n++
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 },
          // keepNext: giữ ảnh dính với dòng chú thích ngay dưới. Không có nó thì
          // Word đẩy "Hình 7 — …" sang trang sau, thành ra hình một nơi tên một nẻo.
          keepNext: true, keepLines: true,
          children: [new ImageRun({
            type: 'png', data: fs.readFileSync(tep),
            transformation: { width: w, height: h },
          })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 220 },
          keepNext: true,
          children: [
            chu(`Hình ${n} — `, { size: 19, bold: true, color: MUC.xam }),
            ...chuoi(chuThich, { size: 19, color: MUC.xam, italics: true }),
          ],
        }),
      ]
    },
    // Chú giải cho các ô đánh số trên ảnh: ① làm gì, ② làm gì.
    chuGiai(danhSach) {
      return danhSach.map(([so, text]) => new Paragraph({
        spacing: { after: 70, line: 276 },
        indent: { left: 360, hanging: 360 },
        children: [chu(`${so}  `, { bold: true, color: MUC.cam, size: 21 }),
                   ...chuoi(text, { size: 21 })],
      }))
    },
    get so() { return n },
  }
}

// ---------------------------------------------------------------------------
//  Hộp đóng khung
// ---------------------------------------------------------------------------
const HOP = {
  luuY:   { nhan: 'LƯU Ý',     vien: '2F6FAF', nen: 'EAF2FB' },
  canThan:{ nhan: 'CẨN THẬN',  vien: 'C05621', nen: 'FDF1E7' },
  meo:    { nhan: 'MẸO',       vien: '2F855A', nen: 'EAF6EF' },
}

function hop(loai, dong) {
  const k = HOP[loai] ?? HOP.luuY
  const vien = { style: BorderStyle.SINGLE, size: 8, color: k.vien }
  return new Table({
    width: { size: 9070, type: WidthType.DXA },
    columnWidths: [9070],
    layout: TableLayoutType.FIXED,
    borders: { top: vien, bottom: vien, left: { ...vien, size: 24 }, right: vien,
               insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9070, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: k.nen },
      margins: { top: 140, bottom: 140, left: 180, right: 180 },
      children: [
        new Paragraph({ spacing: { after: 70 },
          children: [chu(k.nhan, { bold: true, size: 19, color: k.vien })] }),
        ...(Array.isArray(dong) ? dong : [dong]).map((d) =>
          typeof d === 'string'
            ? new Paragraph({ spacing: { after: 0, line: 276 }, children: chuoi(d, { size: 21 }) })
            : d),
      ],
    })] })],
  })
}

// Khoảng trống sau bảng: Word dính bảng vào đoạn kế tiếp nếu không chèn.
const hopVaCach = (loai, dong) => [hop(loai, dong), new Paragraph({ spacing: { after: 160 }, children: [] })]

// ---------------------------------------------------------------------------
//  Bảng thường
// ---------------------------------------------------------------------------
function bang(tieuDe, hang, tyLe) {
  const TONG = 9070
  const cot = tyLe.map((p) => Math.round((p / tyLe.reduce((a, b) => a + b, 0)) * TONG))
  cot[cot.length - 1] = TONG - cot.slice(0, -1).reduce((a, b) => a + b, 0)
  const vien = { style: BorderStyle.SINGLE, size: 4, color: 'C9D2DA' }
  const o = (text, { dam = false, nen = null, i }) => new TableCell({
    width: { size: cot[i], type: WidthType.DXA },
    shading: nen ? { type: ShadingType.CLEAR, fill: nen } : undefined,
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ spacing: { after: 0, line: 264 },
      children: chuoi(text, { size: 20, bold: dam }) })],
  })
  return new Table({
    width: { size: TONG, type: WidthType.DXA }, columnWidths: cot,
    layout: TableLayoutType.FIXED,
    borders: { top: vien, bottom: vien, left: vien, right: vien,
               insideHorizontal: vien, insideVertical: vien },
    rows: [
      new TableRow({ tableHeader: true, children: tieuDe.map((t, i) =>
        o(t, { dam: true, nen: 'EDF2F7', i })) }),
      ...hang.map((h) => new TableRow({ children: h.map((t, i) => o(t, { i })) })),
    ],
  })
}

// ---------------------------------------------------------------------------
//  Khung tài liệu
// ---------------------------------------------------------------------------
function trangBia({ nhan, tua, phu, truong, nam }) {
  return [
    new Paragraph({ spacing: { before: 2600, after: 200 }, alignment: AlignmentType.CENTER,
      children: [chu(nhan, { size: 22, bold: true, color: MUC.cam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [chu(tua, { size: 56, bold: true, color: MUC.xanh })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 },
      children: [chu(phu, { size: 24, color: MUC.xam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [chu(truong, { size: 22, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [chu(`Năm học ${nam}`, { size: 21, color: MUC.xam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [chu(`Cập nhật ${new Date().toLocaleDateString('vi-VN')}`,
        { size: 19, color: MUC.xam, italics: true })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

async function xuat(tep, { bia, than, tieuDeFile }) {
  const doc = new Document({
    creator: 'Trường THCS & THPT Đinh Thiện Lý',
    title: tieuDeFile,
    // Bảo Word tự cập nhật mục lục khi mở. Không có dòng này thì người nhận
    // thấy một mục lục trống và phải tự biết bấm F9 — không ai biết cả.
    features: { updateFields: true },
    numbering: {
      config: [{
        reference: 'cham',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } } }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: PHONG, size: 22, color: MUC.den } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1418, right: 1418 } },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ font: PHONG, size: 18, color: MUC.xam,
            children: [tieuDeFile + '  ·  trang ', PageNumber.CURRENT] })],
        })] }),
      },
      children: [...bia, ...than],
    }],
  })
  fs.mkdirSync(path.dirname(tep), { recursive: true })
  fs.writeFileSync(tep, await Packer.toBuffer(doc))
  console.log(`✓ ${tep}  (${(fs.statSync(tep).size / 1024 / 1024).toFixed(1)} MB)`)
}

// ---------------------------------------------------------------------------
//  Mục lục
// ---------------------------------------------------------------------------
// KHÔNG dùng trường TableOfContents của Word. Nó chỉ có nội dung sau khi Word
// tự cập nhật trường, mà bản chuyển sang PDF thì ra một trang TRẮNG — thử rồi.
// Tài liệu này gửi cho hàng chục giáo viên, ai mở bằng gì cũng phải thấy mục
// lục, nên dựng tĩnh: chạy hai lượt, lượt đầu đo xem mỗi mục rơi vào trang nào,
// lượt sau ghi số trang thật vào.
function mucLucTinh(muc, banDo) {
  return [
    new Paragraph({ spacing: { after: 240 },
      children: [chu('MỤC LỤC', { size: 28, bold: true, color: MUC.xanh })] }),
    ...muc.map((ten, i) => new Paragraph({
      spacing: { after: 110, line: 276 },
      tabStops: [{ type: 'right', position: 9070, leader: 'dot' }],
      children: [
        ...chuoi(ten, { size: 22 }),
        chu('	' + (banDo?.[i + 1] ?? '·'), { size: 22, bold: true, color: MUC.xam }),
      ],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

// Đọc bản PDF vừa dựng, xem mục số N nằm ở trang nào. Mỗi mục đều bắt đầu bằng
// một trang mới nên chỉ cần tìm trang đầu tiên mở đầu bằng "N." là đủ — khỏi so
// khớp tiếng Việt, vì pdftotext ở máy này làm rụng hết dấu.
function doSoTrang(tepPdf, soMuc) {
  const { execFileSync } = require('node:child_process')
  let text
  try {
    text = execFileSync('pdftotext', ['-layout', tepPdf, '-'], { encoding: 'latin1' })
  } catch { return null }
  const trang = text.split('')
  const banDo = {}
  for (let i = 0; i < trang.length; i++) {
    const dau = trang[i].trim().slice(0, 12)
    const m = dau.match(/^(\d{1,2})\./)
    if (m) {
      const n = Number(m[1])
      if (n >= 1 && n <= soMuc && banDo[n] === undefined) banDo[n] = i + 1
    }
  }
  return banDo
}

const SOFFICE = 'C:/Program Files/LibreOffice/program/soffice.exe'

function sangPdf(tepDocx, thuMuc) {
  const { execFileSync } = require('node:child_process')
  try {
    execFileSync(SOFFICE, ['--headless', '--convert-to', 'pdf', '--outdir', thuMuc, tepDocx],
      { stdio: 'ignore' })
    const ra = path.join(thuMuc, path.basename(tepDocx).replace(/\.docx$/, '.pdf'))
    return fs.existsSync(ra) ? ra : null
  } catch { return null }
}

// Dựng hai lượt: lượt đầu để đo số trang, lượt sau để ghi vào mục lục.
async function xuatHaiLuot(tep, { bia, tieuDeFile, muc, than }) {
  const tam = path.join(path.dirname(tep), '.tam')
  await xuat(tep, { bia, tieuDeFile, than: [...mucLucTinh(muc, null), ...than()] })
  fs.mkdirSync(tam, { recursive: true })
  const pdf = sangPdf(tep, tam)
  const banDo = pdf ? doSoTrang(pdf, muc.length) : null
  if (!banDo || Object.keys(banDo).length < muc.length) {
    console.warn(`  ! Chưa đo được đủ số trang (${Object.keys(banDo ?? {}).length}/${muc.length}).`
      + ' Mục lục sẽ không có số trang.')
  } else {
    await xuat(tep, { bia, tieuDeFile, than: [...mucLucTinh(muc, banDo), ...than()] })
  }
  try { fs.rmSync(tam, { recursive: true, force: true }) } catch {}
  return banDo
}

module.exports = {
  chu, chuoi, doan, tua1, tua2, buoc, gach, taoDemHinh, hop, hopVaCach, bang,
  trangBia, mucLucTinh, xuat, xuatHaiLuot, sangPdf, MUC, PHONG,
  AlignmentType, Paragraph, PageBreak, HeadingLevel,
}
