// Thử quyền thật trên bucket tài liệu giáo viên.
//
//   DEMO_MK=<mk học sinh> GV_MK=<mk giáo viên> node scripts/thu-quyen-tai-lieu.mjs
//
// Đăng nhập bằng từng vai rồi xin đường dẫn ký hạn và tải thử. KHÔNG dùng
// Management API: nó chạy bằng vai postgres, mà postgres bỏ qua hết RLS nên
// chạy select ở đó rồi thấy ra dữ liệu chẳng chứng minh được điều gì — đã mắc
// đúng lỗi này một lần khi kiểm chính sách bảng.
//
// Chạy lại mỗi khi đụng vào supabase/schema-15-tai-lieu-gv.sql.
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.argv[2] ?? process.cwd()
const docEnv = (tep) => {
  const ra = {}
  try {
    for (const d of fs.readFileSync(path.join(ROOT, tep), 'utf8').split(/\r?\n/)) {
      const m = d.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
      if (m) ra[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
  return ra
}
const env = { ...docEnv('.env'), ...docEnv('.env.admin') }
const URL_SB = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KHOA = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY

const TEP = 'Toan-bo-huong-dan-giao-vien.mp4'
const VAI = [
  { ten: 'khách (chưa đăng nhập)', tk: null, mk: null, mongDoi: false },
  { ten: 'học sinh 2400001', tk: '2400001@lsts.edu.vn', mk: process.env.DEMO_MK, mongDoi: false },
  { ten: 'giáo viên lớp mẫu', tk: 'gv.minhhoa@lsts.edu.vn', mk: process.env.GV_MK, mongDoi: true },
  { ten: 'quản trị', tk: env.TEACHER_EMAIL, mk: env.TEACHER_PASSWORD, mongDoi: true },
]

let sai = 0
for (const v of VAI) {
  const sb = createClient(URL_SB, KHOA, { auth: { persistSession: false } })
  if (v.tk) {
    const { error } = await sb.auth.signInWithPassword({ email: v.tk, password: v.mk })
    if (error) { console.log(`  ? ${v.ten}: không đăng nhập được (${error.message})`); sai++; continue }
  }
  const { data, error } = await sb.storage.from('tai-lieu-gv').createSignedUrl(TEP, 300)
  let duoc = !!data?.signedUrl && !error

  // Xin được đường dẫn chưa đủ — phải TẢI THỬ. Đường dẫn ký hạn mà tệp vẫn 403
  // thì coi như không xem được.
  let maHttp = null
  if (duoc) {
    const r = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-1023' } })
    maHttp = r.status
    duoc = r.ok
  }
  const dat = duoc === v.mongDoi
  if (!dat) sai++
  console.log(`  ${dat ? '✓' : '✗'} ${v.ten.padEnd(24)} `
    + `xin link: ${error ? 'bị từ chối' : 'được'}`
    + `${maHttp ? `, tải: HTTP ${maHttp}` : ''}`
    + `  → ${duoc ? 'XEM ĐƯỢC' : 'không xem được'}`
    + ` (mong đợi: ${v.mongDoi ? 'xem được' : 'không'})`)
  await sb.auth.signOut()
}
console.log(sai ? `\n✗ ${sai} trường hợp không như mong đợi` : '\n✓ Cả bốn vai đều đúng')
process.exit(sai ? 1 : 0)
