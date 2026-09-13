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
  TableLayoutType, VerticalAlign, WidthType, PageNumber,
} = require('docx')

// Arial: có sẵn trên mọi máy và dấu tiếng Việt luôn hiện đúng. Phông đẹp hơn
// nhưng máy giáo viên không có thì Word thay bằng phông khác, chữ vỡ hết.
const PHONG = 'Arial'
const MUC = { xanh: '1C4E80', cam: 'C05621', xam: '5A6472', den: '1A1A1A', nhat: 'D6DEE6' }

// ---------------------------------------------------------------------------
//  Khổ giấy và các cỡ dẫn xuất
// ---------------------------------------------------------------------------
// Lề 2 cm cả bốn phía (trước là 2,5 cm). Khung chữ A4 thành 17 × 25,7 cm, tức
// 643 × 971 điểm ảnh ở 96 dpi — rộng hơn khung cũ khoảng 6% mỗi chiều, đủ để
// bớt hẳn vài trang mà nhìn vẫn không chật.
const LE = 1134           // 2 cm, tính bằng dxa (1440 dxa = 1 inch)
const KHUNG_RONG = 9070   // bảng và hộp: giữ đúng bề ngang khung chữ, tính bằng dxa
const CAO_KHUNG = 971     // chiều cao khung chữ, điểm ảnh

// Ảnh KHÔNG được lấp hết chiều cao khung. Chỉ giới hạn bề ngang thôi thì một
// ảnh cao như cửa sổ bật lên sẽ chiếm trọn một trang, lật sang trang sau mới
// thấy chú thích — đọc rất mệt. Giới hạn cả hai chiều, ảnh luôn còn chỗ cho
// chú thích và mấy dòng chữ quanh nó.
//
// Ảnh NGANG thì bề ngang quyết định, ảnh DỌC thì chiều cao quyết định. Ảnh vừa
// rộng vừa cao (bảng nhiều dòng) sẽ bị thu quá nhỏ để đọc — với những ảnh đó
// phải chụp lại cho ngắn bớt, chứ không phải ép nó vào khung.
const RONG_ANH = 530      // ≈ 14 cm, chừa lề trắng hai bên cho dễ nhìn
const CAO_ANH  = 290      // ≈ 7,7 cm, tức nhiều nhất 30% chiều cao khung chữ

// Cỡ chữ (nửa điểm: 21 = 10,5 pt) và giãn dòng (240 = 1 dòng đơn).
const CO_CHU = 21
const GIAN = 264

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
  text, font: PHONG, size: o.size ?? CO_CHU, bold: o.bold, italics: o.italics,
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
  spacing: { after: o.after ?? 100, line: GIAN },
  alignment: o.canh,
})

// Tựa mục KHÔNG sang trang mới.
//
// Trước đây mỗi mục bắt đầu một trang. Đo trên bản dựng ra: chín trang của bản
// học sinh và mười hai trang của bản giáo viên chỉ dùng dưới 70% chiều cao, có
// trang chỉ 13%. Cắt trang theo mục nghe thì gọn, nhưng thực tế là đuôi mục nào
// cũng để lại một khoảng trắng dài. Bỏ đi, thay bằng một đường kẻ trên đầu mục
// để mắt vẫn thấy rõ chỗ sang mục mới.
//
// keepNext: tựa mà rơi đúng dòng cuối trang thì Word đẩy cả tựa xuống trang sau
// — không bao giờ để tựa đứng một mình.
const tua1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 340, after: 150 },
  border: { top: { style: BorderStyle.SINGLE, size: 12, color: MUC.xanh, space: 10 } },
  keepNext: true,
  children: [chu(text, { size: 28, bold: true, color: MUC.xanh })],
})

const tua2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 },
  keepNext: true,
  children: [chu(text, { size: 24, bold: true, color: MUC.xanh })],
})

// Bước thao tác: đánh số tay thay vì dùng numbering của Word. Lý do: xen ảnh và
// hộp lưu ý vào giữa các bước là Word tự đánh số lại từ 1.
const buoc = (so, text) => new Paragraph({
  spacing: { after: 70, line: GIAN },
  indent: { left: 340, hanging: 340 },
  children: [chu(`${so}. `, { bold: true, color: MUC.cam }), ...chuoi(text)],
})

const gach = (text) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: 60, line: GIAN },
  children: chuoi(text),
})

// ---------------------------------------------------------------------------
//  Hình có đánh số
// ---------------------------------------------------------------------------
// Bề ngang khung chữ quy ra điểm ảnh — để biết một ảnh đã thu xong còn chừa
// lại bao nhiêu chỗ trống bên cạnh.
const RONG_KHUNG_PX = 643
const DXA_MOI_PX = KHUNG_RONG / RONG_KHUNG_PX

function taoDemHinh() {
  let n = 0
  // Thu ảnh vừa khung, giữ nguyên tỉ lệ — thu nhỏ chứ không cắt xén. Ảnh chụp
  // ở 2x nên cỡ thật là một nửa.
  const thu = (tep, rong, cao) => {
    if (!fs.existsSync(tep)) throw new Error(`Thiếu ảnh: ${tep}`)
    const { rong: rw, cao: rh } = coPng(tep)
    const ty = Math.min(rong / (rw / 2), cao / (rh / 2), 1)
    return { w: Math.round((rw / 2) * ty), h: Math.round((rh / 2) * ty) }
  }
  const oAnh = (tep, w, h) => new ImageRun({
    type: 'png', data: fs.readFileSync(tep), transformation: { width: w, height: h },
  })
  // Dòng chú thích KHÔNG được keepNext. Ảnh dính với chú thích là đúng, nhưng
  // nếu chú thích lại dính tiếp với đoạn sau nó, mà đoạn sau là một tựa mục
  // (tựa cũng keepNext với đoạn đầu mục) thì cả một dây bốn khối phải nằm chung
  // một trang. Đo ra: mấy trang chỉ dùng 57% chiều cao chỉ vì cái dây đó.
  const dongChuThich = (chuThich, canh = AlignmentType.CENTER, after = 0) => new Paragraph({
    alignment: canh, spacing: { after },
    children: [
      chu(`Hình ${n} — `, { size: 18, bold: true, color: MUC.xam }),
      ...chuoi(chuThich, { size: 18, color: MUC.xam, italics: true }),
    ],
  })

  return {
    hinh(tep, chuThich, { rong = RONG_ANH, cao = CAO_ANH } = {}) {
      const { w, h } = thu(tep, rong, cao)
      n++
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 130, after: 40 },
          // keepNext: giữ ảnh dính với dòng chú thích ngay dưới. Không có nó thì
          // Word đẩy "Hình 7 — …" sang trang sau, thành ra hình một nơi tên một nẻo.
          keepNext: true, keepLines: true,
          children: [oAnh(tep, w, h)],
        }),
        dongChuThich(chuThich, AlignmentType.CENTER, 140),
      ]
    },

    // Ảnh CAO VÀ HẸP (cửa sổ bật lên, biểu mẫu dọc) thu xong chỉ chiếm nửa bề
    // ngang trang, nửa còn lại bỏ trắng suốt chiều cao ảnh — với ảnh cao 400
    // điểm ảnh là mất gần nửa trang giấy. Đặt chữ vào đúng chỗ trống đó: chú
    // giải ① ② ③, hoặc các bước thao tác dẫn tới chính cửa sổ trong ảnh.
    //
    // `ben` nhận một trong hai thứ: mảng cặp [số, lời] thì hiểu là chú giải,
    // còn mảng Paragraph thì đặt nguyên vào.
    //
    // Bảng không viền, nên người đọc không thấy đây là bảng.
    hinhKem(tep, chuThich, ben, { rong = Math.round(RONG_ANH * 0.62), cao = 430 } = {}) {
      const danhSach = Array.isArray(ben[0]) ? ben : null
      const { w, h } = thu(tep, rong, cao)
      n++
      const cotAnh = Math.round(w * DXA_MOI_PX) + 280   // 280 dxa ≈ 5 mm khe hở
      const cotChu = KHUNG_RONG - cotAnh
      const khong = { style: BorderStyle.NONE, size: 0 }
      const oTrong = (children, rongO, phai = 0) => new TableCell({
        width: { size: rongO, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 0, right: phai },
        verticalAlign: VerticalAlign.TOP,
        children,
      })
      return [
        new Table({
          width: { size: KHUNG_RONG, type: WidthType.DXA },
          columnWidths: [cotAnh, cotChu],
          layout: TableLayoutType.FIXED,
          borders: { top: khong, bottom: khong, left: khong, right: khong,
                     insideHorizontal: khong, insideVertical: khong },
          rows: [new TableRow({ children: [
            oTrong([
              new Paragraph({ spacing: { before: 60, after: 40 },
                children: [oAnh(tep, w, h)] }),
              dongChuThich(chuThich, AlignmentType.LEFT),
            ], cotAnh, 280),
            oTrong([
              new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }),
              ...(danhSach
                ? danhSach.map(([so, text], i) => new Paragraph({
                    spacing: { after: i === danhSach.length - 1 ? 0 : 90, line: 252 },
                    indent: { left: 340, hanging: 340 },
                    children: [chu(`${so}  `, { bold: true, color: MUC.cam, size: 20 }),
                               ...chuoi(text, { size: 20 })],
                  }))
                : ben),
            ], cotChu),
          ] })],
        }),
        new Paragraph({ spacing: { after: 150 }, children: [] }),
      ]
    },

    // Chú giải cho các ô đánh số trên ảnh: ① làm gì, ② làm gì.
    chuGiai(danhSach) {
      return danhSach.map(([so, text], i) => new Paragraph({
        spacing: { after: i === danhSach.length - 1 ? 130 : 40, line: 252 },
        indent: { left: 340, hanging: 340 },
        children: [chu(`${so}  `, { bold: true, color: MUC.cam, size: 20 }),
                   ...chuoi(text, { size: 20 })],
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
  const ds = (Array.isArray(dong) ? dong : [dong])
  return new Table({
    width: { size: KHUNG_RONG, type: WidthType.DXA },
    columnWidths: [KHUNG_RONG],
    layout: TableLayoutType.FIXED,
    borders: { top: vien, bottom: vien, left: { ...vien, size: 24 }, right: vien,
               insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: KHUNG_RONG, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: k.nen },
      margins: { top: 90, bottom: 90, left: 150, right: 150 },
      children: [
        // Nhãn nằm cùng dòng với ý đầu tiên khi hộp chỉ có một ý — đỡ một dòng
        // trống trên mỗi hộp, mà cả hai tài liệu có gần bốn mươi cái hộp.
        ...(ds.length === 1 && typeof ds[0] === 'string'
          ? [new Paragraph({ spacing: { after: 0, line: 252 },
              children: [chu(k.nhan + '  ', { bold: true, size: 18, color: k.vien }),
                         ...chuoi(ds[0], { size: 20 })] })]
          : [new Paragraph({ spacing: { after: 50 },
              children: [chu(k.nhan, { bold: true, size: 18, color: k.vien })] }),
             ...ds.map((d) =>
               typeof d === 'string'
                 ? new Paragraph({ spacing: { after: 0, line: 252 }, children: chuoi(d, { size: 20 }) })
                 : d)]),
      ],
    })] })],
  })
}

// Khoảng trống sau bảng: Word dính bảng vào đoạn kế tiếp nếu không chèn.
const hopVaCach = (loai, dong) => [hop(loai, dong), new Paragraph({ spacing: { after: 110 }, children: [] })]

// ---------------------------------------------------------------------------
//  Bảng thường
// ---------------------------------------------------------------------------
function bang(tieuDe, hang, tyLe) {
  const TONG = KHUNG_RONG
  const cot = tyLe.map((p) => Math.round((p / tyLe.reduce((a, b) => a + b, 0)) * TONG))
  cot[cot.length - 1] = TONG - cot.slice(0, -1).reduce((a, b) => a + b, 0)
  const vien = { style: BorderStyle.SINGLE, size: 4, color: 'C9D2DA' }
  const o = (text, { dam = false, nen = null, i }) => new TableCell({
    width: { size: cot[i], type: WidthType.DXA },
    shading: nen ? { type: ShadingType.CLEAR, fill: nen } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ spacing: { after: 0, line: 240 },
      children: chuoi(text, { size: 19, bold: dam }) })],
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

const bangVaCach = (...a) => [bang(...a), new Paragraph({ spacing: { after: 110 }, children: [] })]

// ---------------------------------------------------------------------------
//  Khung tài liệu
// ---------------------------------------------------------------------------
function trangBia({ nhan, tua, phu, truong, nam }) {
  return [
    new Paragraph({ spacing: { before: 2400, after: 180 }, alignment: AlignmentType.CENTER,
      children: [chu(nhan, { size: 22, bold: true, color: MUC.cam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
      children: [chu(tua, { size: 52, bold: true, color: MUC.xanh })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
      children: [chu(phu, { size: 23, color: MUC.xam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 70 },
      children: [chu(truong, { size: 22, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 70 },
      children: [chu(`Năm học ${nam}`, { size: 21, color: MUC.xam })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [chu(`Cập nhật ${new Date().toLocaleDateString('vi-VN')}`,
        { size: 18, color: MUC.xam, italics: true })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

async function xuat(tep, { bia, than, tieuDeFile }) {
  const doc = new Document({
    creator: 'Trường THCS & THPT Đinh Thiện Lý',
    title: tieuDeFile,
    features: { updateFields: true },
    numbering: {
      config: [{
        reference: 'cham',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340, hanging: 190 } } } }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: PHONG, size: CO_CHU, color: MUC.den } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: LE, bottom: LE, left: LE, right: LE, footer: 567 } },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ font: PHONG, size: 17, color: MUC.xam,
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
    new Paragraph({ spacing: { after: 200 },
      children: [chu('MỤC LỤC', { size: 26, bold: true, color: MUC.xanh })] }),
    ...muc.map((ten, i) => new Paragraph({
      spacing: { after: 80, line: 252 },
      tabStops: [{ type: 'right', position: KHUNG_RONG, leader: 'dot' }],
      children: [
        ...chuoi(ten, { size: 21 }),
        chu('\t' + (banDo?.[i + 1] ?? '·'), { size: 21, bold: true, color: MUC.xam }),
      ],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

// Đọc bản PDF vừa dựng, xem mục số N nằm ở trang nào.
//
// Trước đây hàm này tìm trang nào MỞ ĐẦU bằng "N." — làm được vì hồi đó mỗi mục
// bắt đầu một trang mới. Bỏ ngắt trang rồi thì cách đó chết, phải dò theo chính
// dòng tựa.
//
// Khó ở chỗ: pdftotext trên máy này làm RỤNG mọi ký tự ngoài bảng latin-1. "Hệ
// thống" ra "H thng", còn "này" vẫn là "này" vì à nằm trong latin-1. Rụng như
// vậy nhưng rụng ĐỀU, nên chỉ cần bỏ y hệt các ký tự đó khỏi tựa gốc là ra đúng
// chuỗi pdftotext in ra. Đọc PDF ở latin1 để mấy byte cao khỏi bị diễn giải lại.
const xuongLatin1 = (s) => [...s].filter((c) => c.codePointAt(0) < 256).join('')

function doSoTrang(tepPdf, tuaMuc) {
  const { execFileSync } = require('node:child_process')
  let text
  try {
    text = execFileSync('pdftotext', ['-layout', tepPdf, '-'], { encoding: 'latin1' })
  } catch { return null }
  const trang = text.split('\f')
  const banDo = {}
  tuaMuc.forEach((ten, i) => {
    const can = xuongLatin1(ten).trim()
    // Tựa dài có thể xuống dòng, nên so khớp phần đầu. 14 ký tự đã đủ phân biệt
    // "7. Cp nht kt qu" với bước thao tác "7. ..." nào đó.
    const dau = can.slice(0, Math.min(14, can.length))
    for (let p = 0; p < trang.length; p++) {
      const co = trang[p].split('\n').some((d) => {
        const t = d.trim()
        // Dòng trong mục lục có dấu chấm dẫn — bỏ qua, không thì mục nào cũng
        // báo là nằm ở trang mục lục.
        return t.startsWith(dau) && !t.includes('..')
      })
      if (co) { banDo[i + 1] = p + 1; break }
    }
  })
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
  const banDo = pdf ? doSoTrang(pdf, muc) : null
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
  chu, chuoi, doan, tua1, tua2, buoc, gach, taoDemHinh, hop, hopVaCach, bang, bangVaCach,
  trangBia, mucLucTinh, xuat, xuatHaiLuot, sangPdf, MUC, PHONG, CAO_KHUNG,
  AlignmentType, Paragraph, PageBreak, HeadingLevel,
}
