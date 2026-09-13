// Lớp minh hoạ 8A0 — dùng để chụp ảnh cho tài liệu hướng dẫn, và làm sân tập
// cho giáo viên mới bấm thử mà không sợ hỏng dữ liệu lớp mình.
//
// MỌI HỌC SINH TRONG LỚP NÀY LÀ NGƯỜI BỊA. Không có một chữ nào của học sinh
// thật lọt vào ảnh chụp — đó là lý do tồn tại của nó.
//
//   node scripts/demo-class.mjs --up      tạo tài khoản giáo viên + 10 học sinh
//   node scripts/demo-class.mjs --down    xoá sạch lớp và toàn bộ tài khoản
//
// Phần dữ liệu học tập (kế hoạch, phản tư, sao, lượt quên, chia sẻ sách) nằm ở
// scripts/demo-class-data.sql, chạy sau --up.

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const f of ['.env', '.env.admin']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
}
const thuc = (v) => (v && !/^(PASTE_|SET_A_|YOUR_)/i.test(v) ? v : '')
const URL_SB = thuc(env.SUPABASE_URL) || thuc(env.VITE_SUPABASE_URL)
const KEY = thuc(env.SUPABASE_SERVICE_ROLE_KEY) || thuc(env.SUPABASE_SECRET_KEY)
if (!URL_SB || !KEY) throw new Error('Thiếu SUPABASE_URL hoặc khoá server-side trong .env.admin')

const db = createClient(URL_SB, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

export const LOP = '8A0'
export const GV_EMAIL = 'gv.minhhoa@lsts.edu.vn'
export const GV_TEN = 'Nguyễn Thị Thu Hà'
const MIEN = env.VITE_STUDENT_EMAIL_DOMAIN || 'lsts.edu.vn'

// MSHS 24000xx: dải riêng, không đụng học sinh thật (2406xxx / 2407xxx).
export const HOC_SINH = [
  { mshs: '2400001', ten: 'Bùi Gia Hân' },
  { mshs: '2400002', ten: 'Đặng Minh Quân' },
  { mshs: '2400003', ten: 'Hồ Ngọc Diệp' },
  { mshs: '2400004', ten: 'Lê Anh Tuấn' },
  { mshs: '2400005', ten: 'Mai Thuỳ Linh' },
  { mshs: '2400006', ten: 'Ngô Bảo Long' },
  { mshs: '2400007', ten: 'Phạm Khánh Vy' },
  { mshs: '2400008', ten: 'Trần Đức Huy' },
  { mshs: '2400009', ten: 'Vũ Hải Yến' },
  { mshs: '2400010', ten: 'Đỗ Nhật Minh' },
]

const matKhau = () =>
  `Mh${crypto.randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, '')}2026`

async function timUser(email) {
  // listUsers phân trang 1000 — đủ cho quy mô một trường.
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
}

async function taoHoacDoiMatKhau(email, mk, meta) {
  const co = await timUser(email)
  if (co) {
    const { error } = await db.auth.admin.updateUserById(co.id,
      { password: mk, email_confirm: true, user_metadata: meta })
    if (error) throw error
    return co.id
  }
  const { data, error } = await db.auth.admin.createUser(
    { email, password: mk, email_confirm: true, user_metadata: meta })
  if (error) throw error
  return data.user.id
}

async function len() {
  const { data: nam, error: eNam } = await db.from('school_years')
    .select('id,name').eq('is_active', true).maybeSingle()
  if (eNam) throw eNam
  if (!nam) throw new Error('Chưa có năm học nào đang hoạt động.')

  const { data: lop, error: eLop } = await db.from('classes')
    .upsert({ school_year_id: nam.id, name: LOP }, { onConflict: 'school_year_id,name' })
    .select().single()
  if (eLop) throw eLop

  const mkGv = matKhau()
  const gvId = await taoHoacDoiMatKhau(GV_EMAIL, mkGv, { role: 'teacher', full_name: GV_TEN })
  await db.from('profiles').upsert({
    id: gvId, role: 'teacher', mshs: null, full_name: GV_TEN, approval_status: 'approved',
  })
  await db.from('class_teachers')
    .upsert({ class_id: lop.id, teacher_id: gvId, role: 'primary', status: 'active' },
            { onConflict: 'class_id,teacher_id' })

  // Một mật khẩu chung cho cả 10 em: lớp này không có dữ liệu thật nào để mất,
  // và người đọc tài liệu cần đăng nhập thử được bằng bất kỳ em nào.
  const mkHs = matKhau()
  for (const hs of HOC_SINH) {
    const uid = await taoHoacDoiMatKhau(`${hs.mshs}@${MIEN}`, mkHs,
      { role: 'student', full_name: hs.ten, mshs: hs.mshs })
    await db.from('profiles').upsert({
      id: uid, role: 'student', mshs: hs.mshs, full_name: hs.ten,
      must_change_password: false,
    })
    await db.from('students').upsert({ mshs: hs.mshs, full_name: hs.ten, claimed_user_id: uid },
                                     { onConflict: 'mshs' })
    await db.from('enrollments').upsert({ mshs: hs.mshs, class_id: lop.id, is_active: true },
                                        { onConflict: 'mshs,class_id' })
  }

  console.log(`Lớp ${LOP} (${nam.name}) · id = ${lop.id}`)
  console.log(`Giáo viên : ${GV_EMAIL}  /  ${mkGv}`)
  console.log(`Học sinh  : ${HOC_SINH.map((h) => h.mshs).join(', ')}  /  ${mkHs}`)
  console.log(`\nTiếp theo: node scripts/db.mjs . scripts/demo-class-data.sql`)
}

async function xuong() {
  const { data: lop } = await db.from('classes').select('id').eq('name', LOP).maybeSingle()
  if (lop) {
    // enrollments / plans / ... đều on delete cascade theo class_id.
    await db.from('classes').delete().eq('id', lop.id)
    console.log(`Đã xoá lớp ${LOP} và mọi dữ liệu gắn với nó.`)
  }
  for (const hs of HOC_SINH) {
    await db.from('students').delete().eq('mshs', hs.mshs)
    const u = await timUser(`${hs.mshs}@${MIEN}`)
    if (u) await db.auth.admin.deleteUser(u.id)
  }
  const gv = await timUser(GV_EMAIL)
  if (gv) {
    await db.from('profiles').delete().eq('id', gv.id)
    await db.auth.admin.deleteUser(gv.id)
  }
  console.log('Đã xoá 10 tài khoản học sinh và tài khoản giáo viên minh hoạ.')
}

const lenh = process.argv[2]
if (lenh === '--up') await len()
else if (lenh === '--down') await xuong()
else {
  console.log('Dùng: node scripts/demo-class.mjs --up | --down')
  process.exit(1)
}
