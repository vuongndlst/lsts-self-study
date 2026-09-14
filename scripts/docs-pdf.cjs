// Chuyển hai tài liệu Word sang PDF.
//
//   node scripts/docs-pdf.cjs
//
// Vì sao cần bản PDF khi đã có .docx: trang web nhúng được PDF ngay trong khung,
// người xem không phải tải về rồi mở Word. Và PDF thì máy nào mở cũng ra đúng
// một kiểu — .docx mở bằng Google Docs hay WPS là bố cục xô lệch, mà cả tài
// liệu này là hình với chú thích nên xô lệch là hỏng.
//
// KHÔNG sửa tay bản PDF. Nó dựng lại từ .docx, mà .docx lại dựng lại từ mã
// nguồn — sửa tay là lần chạy sau mất hết.

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { sangPdf } = require('./docx-lib.cjs')

const THU_MUC = 'docs/huong-dan'
const TEP = ['Huong-dan-hoc-sinh', 'Huong-dan-giao-vien']

// Đếm số trang để lỡ LibreOffice ra một tệp hỏng thì biết ngay, chứ không phải
// tới lúc nhúng lên trang web mới thấy PDF trắng.
function soTrang(tepPdf) {
  for (const pdfinfo of ['C:/poppler-25.07.0/Library/bin/pdfinfo.exe', 'pdfinfo']) {
    try {
      const ra = execFileSync(pdfinfo, [tepPdf], { encoding: 'utf8' })
      const m = ra.match(/^Pages:\s+(\d+)/m)
      if (m) return Number(m[1])
    } catch {}
  }
  return null
}

let hong = 0
for (const ten of TEP) {
  const vao = path.join(THU_MUC, ten + '.docx')
  if (!fs.existsSync(vao)) {
    console.error(`  ✗ thiếu ${vao} — chạy \`npm run docs-word\` trước.`)
    hong++
    continue
  }
  const ra = sangPdf(vao, THU_MUC)
  if (!ra) {
    console.error(`  ✗ không chuyển được ${ten}.docx`)
    hong++
    continue
  }
  const n = soTrang(ra)
  const mb = (fs.statSync(ra).size / 1048576).toFixed(1)
  console.log(`✓ ${ra}  (${n ?? '?'} trang · ${mb} MB)`)
  if (n !== null && n < 5) {
    console.error('  ✗ PDF chỉ có vài trang — gần như chắc chắn là hỏng.')
    hong++
  }
}
process.exit(hong ? 1 : 0)
