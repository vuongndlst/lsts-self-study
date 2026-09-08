import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!supabaseUrl || !supabaseKey) throw new Error('Thiếu cấu hình Supabase')

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// MSHS chính là phần trước @ trong email trường cấp: 2406002@lsts.edu.vn
export const STUDENT_EMAIL_DOMAIN = import.meta.env.VITE_STUDENT_EMAIL_DOMAIN || 'lsts.edu.vn'
export const studentEmail = (mshs) => `${String(mshs).trim()}@${STUDENT_EMAIL_DOMAIN}`

// Email phụ huynh cũng suy ra được từ MSHS, toàn trường theo cùng một quy tắc:
// 2406119 → p2406119@parent.lsts.edu.vn
//
// Vì vậy KHÔNG lưu email phụ huynh vào cơ sở dữ liệu. Lưu một thứ suy ra được
// chỉ tạo ra hai nguồn sự thật: trường đổi tên miền là bảng cũ thành sai, mà
// không ai biết để sửa. Đây cũng là lý do email học sinh ở ngay trên không lưu.
export const PARENT_EMAIL_DOMAIN = import.meta.env.VITE_PARENT_EMAIL_DOMAIN || 'parent.lsts.edu.vn'
export const PARENT_EMAIL_PREFIX = import.meta.env.VITE_PARENT_EMAIL_PREFIX ?? 'p'
export const parentEmail = (mshs) => `${PARENT_EMAIL_PREFIX}${String(mshs).trim()}@${PARENT_EMAIL_DOMAIN}`

export async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session?.access_token ?? supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  let payload = null
  try { payload = await res.json() } catch { /* thân rỗng */ }
  return { status: res.status, ok: res.ok && payload?.ok === true, data: payload }
}
