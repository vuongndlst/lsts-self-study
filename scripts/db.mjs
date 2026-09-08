import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath chứ không phải URL.pathname: đường dẫn dự án có dấu cách và
// tiếng Việt nên pathname trả về bản đã mã hóa %20, đọc file sẽ hỏng.
const ROOT = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envOf = (file) => {
  const out = {}
  try {
    for (const line of readFileSync(resolve(ROOT, file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
  return out
}
const env = { ...envOf('.env'), ...envOf('.env.admin') }
const ref = (env.SUPABASE_URL || env.VITE_SUPABASE_URL).match(/https:\/\/([^.]+)\./)[1]
const token = env.SUPABASE_ACCESS_TOKEN

// Token này là Personal Access Token của tài khoản Supabase (sbp_…), KHÁC hẳn
// service_role / secret key. Nó có hạn và thu hồi được, nên hỏng là chuyện sẽ
// xảy ra lại. Lần đầu gặp, thông báo trần trụi "401 Unauthorized" kèm vệt lỗi
// Node làm mất khá nhiều thời gian đoán xem hỏng ở đâu — nên nói hẳn ra.
const HET_HAN = `
Token Management API không dùng được nữa (401).

  Đây là SUPABASE_ACCESS_TOKEN trong .env.admin — token cá nhân sbp_…,
  không phải service_role / secret key (hai khoá kia vẫn chạy bình thường).

  Cách khôi phục:
    1. Vào https://supabase.com/dashboard/account/tokens
    2. Generate new token, đặt tên gì cũng được
    3. Mở .env.admin, thay giá trị dòng SUPABASE_ACCESS_TOKEN=

  .env.admin đã nằm trong .gitignore nên không bị đẩy lên GitHub.
`

export async function q(sql) {
  if (!token) throw new Error(HET_HAN)
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await r.text()
  if (r.status === 401 || r.status === 403) throw new Error(HET_HAN)
  if (!r.ok) throw new Error(`${r.status} ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

if (process.argv[3]) {
  const sql = readFileSync(process.argv[3], 'utf8')
  try {
    const res = await q(sql)
    console.log('OK', JSON.stringify(res).slice(0, 2000))
  } catch (e) {
    // In gọn thông báo thay vì ném ra để Node dựng vệt lỗi che mất nội dung.
    console.error(e.message)
    process.exit(1)
  }
}
