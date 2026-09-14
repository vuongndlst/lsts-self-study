// Đẩy tài liệu hướng dẫn GIÁO VIÊN lên Supabase Storage.
//
//   node scripts/tai-len-tai-lieu.mjs
//   node scripts/tai-len-tai-lieu.mjs --kiem      chỉ kiểm, không đẩy
//
// Bản giáo viên KHÔNG nằm trong public/ và KHÔNG nằm trong git, vì kho này công
// khai. Nó nằm trong một bucket riêng tư mà chỉ giáo viên xin được đường dẫn —
// xem supabase/schema-15-tai-lieu-gv.sql.
//
// Đăng nhập bằng tài khoản QUẢN TRỊ chứ không dùng service_role key: chính sách
// ghi trong bucket chỉ mở cho quản trị, nên tài khoản thường của thầy cô là đủ.
// Như vậy cũng khỏi phải có thêm một khoá toàn quyền nằm trên máy.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const KHO = 'tai-lieu-gv'
const NGUON = 'docs/huong-dan'
const chiKiem = process.argv.includes('--kiem')

// Đọc .env thủ công: script này chạy bằng node trần, không qua Vite.
const docEnv = (tep) => {
  const ra = {}
  try {
    for (const dong of fs.readFileSync(path.join(ROOT, tep), 'utf8').split(/\r?\n/)) {
      const m = dong.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
      if (m) ra[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
  return ra
}
const env = { ...docEnv('.env'), ...docEnv('.env.admin') }

const URL_SB = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KHOA = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY
const TK = env.TEACHER_EMAIL
const MK = env.TEACHER_PASSWORD

if (!URL_SB || !KHOA) throw new Error('Thiếu SUPABASE_URL / PUBLISHABLE_KEY trong .env')
if (!TK || !MK) {
  throw new Error('Thiếu TEACHER_EMAIL / TEACHER_PASSWORD trong .env.admin'
    + ' — đây phải là tài khoản QUẢN TRỊ, vì chỉ quản trị mới ghi được vào bucket.')
}

// Tệp nào lên kho, dưới tên nào. Giữ đúng tên gốc cho dễ đối chiếu.
const TEP = [
  { tu: 'Huong-dan-giao-vien.pdf', kieu: 'application/pdf' },
  { tu: 'video/giao-vien/Toan-bo-huong-dan-giao-vien.mp4', kieu: 'video/mp4' },
  { tu: 'video/giao-vien/Toan-bo-huong-dan-giao-vien.srt', kieu: 'text/plain' },
  { tu: 'bia-giao-vien.jpg', kieu: 'image/jpeg' },
]

const mb = (b) => (b / 1048576).toFixed(1)

const sb = createClient(URL_SB, KHOA, { auth: { persistSession: false } })

const { data: phien, error: loiDN } = await sb.auth.signInWithPassword({
  email: TK, password: MK,
})
if (loiDN) throw new Error(`Không đăng nhập được bằng ${TK}: ${loiDN.message}`)

const { data: hoSo } = await sb.from('profiles').select('role,full_name').eq('id', phien.user.id).single()
console.log(`Đăng nhập: ${TK} (${hoSo?.role ?? '?'})`)
if (hoSo?.role !== 'admin') {
  throw new Error('Tài khoản này không phải quản trị — chính sách ghi của bucket sẽ từ chối.')
}

let hong = 0
for (const t of TEP) {
  const tep = path.join(NGUON, t.tu)
  const ten = path.basename(t.tu)
  if (!fs.existsSync(tep)) {
    console.error(`  ✗ thiếu ${tep}`)
    hong++
    continue
  }
  const co = fs.statSync(tep).size
  if (chiKiem) { console.log(`  · ${ten}  ${mb(co)} MB  (chỉ kiểm)`); continue }

  const { error } = await sb.storage.from(KHO).upload(ten, fs.readFileSync(tep), {
    contentType: t.kieu,
    // upsert: đẩy lại sau khi quay lại video thì ghi đè, không sinh bản trùng.
    upsert: true,
  })
  if (error) {
    console.error(`  ✗ ${ten}: ${error.message}`)
    hong++
  } else {
    console.log(`  ✓ ${ten}  ${mb(co)} MB`)
  }
}

// Liệt kê lại để thấy đúng thứ đang nằm trên kho, chứ không chỉ tin vào việc
// lệnh đẩy không báo lỗi.
const { data: dsKho, error: loiDs } = await sb.storage.from(KHO).list('', { limit: 100 })
if (loiDs) console.error(`  ! không đọc được danh sách kho: ${loiDs.message}`)
else {
  console.log(`\nTrên kho ${KHO}:`)
  for (const o of dsKho) {
    console.log(`  ${o.name.padEnd(38)} ${mb(o.metadata?.size ?? 0).padStart(6)} MB`
      + `  ${o.updated_at?.slice(0, 16).replace('T', ' ') ?? ''}`)
  }
}

await sb.auth.signOut()
process.exit(hong ? 1 : 0)
