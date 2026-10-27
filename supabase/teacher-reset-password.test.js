import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'

// Chạy đúng handler Edge Function; thay Auth/DB bằng dữ liệu giả, không đổi mật khẩu thật.
const common = readFileSync(new URL('./functions/_shared/common.ts', import.meta.url), 'utf8').replace(/^export /gm, '')
const handler = readFileSync(new URL('./functions/teacher-reset-password/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*\n/gm, '')
const code = transformSync(common + '\n' + handler, { loader: 'ts', target: 'es2022' }).code

function setup({ role = 'teacher', approval = 'approved', assigned = true, yearActive = true,
  enrollmentActive = true, assignmentActive = true } = {}) {
  const writes = []
  const rows = {
    profiles: [
      { id: 'caller', role, approval_status: approval },
      { id: 'student', role: 'student', mshs: '2400001', full_name: 'Học sinh thử' },
    ],
    enrollments: [{ class_id: 'class-a', is_active: enrollmentActive,
      students: { claimed_user_id: 'student' }, classes: { school_years: { is_active: yearActive } } }],
    class_teachers: [{ teacher_id: 'caller', class_id: assigned ? 'class-a' : 'class-b',
      status: assignmentActive ? 'active' : 'inactive' }],
  }
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'caller' } } }),
      admin: { updateUserById: async (id, payload) => { writes.push({ table: 'auth', id, payload }); return {} } },
    },
    from(table) {
      let result = rows[table] ?? []
      const query = {
        select() { return query },
        update(payload) { writes.push({ table, payload }); return query },
        eq(key, value) { result = result.filter((r) => key.split('.').reduce((v, k) => v?.[k], r) === value); return query },
        in(key, values) { result = result.filter((r) => values.includes(r[key])); return query },
        maybeSingle: async () => ({ data: result.length === 1 ? result[0] : null }),
        then(resolve, reject) { return Promise.resolve({ data: result }).then(resolve, reject) },
      }
      return query
    },
  }
  let serve
  runInNewContext(code, { createClient: () => client, Response, console,
    Deno: { env: { get: () => 'test-only' }, serve: (fn) => { serve = fn } } })
  return {
    writes,
    async request({ password = 'ValidTemp123!', token = true } = {}) {
      const response = await serve(new Request('https://example.test/reset', {
        method: 'POST', headers: token ? { Authorization: 'Bearer test' } : {},
        body: JSON.stringify({ studentId: 'student', newPassword: password }),
      }))
      return { status: response.status, body: await response.json() }
    },
  }
}

test('giáo viên được duyệt và phụ trách lớp cấp được mật khẩu tạm', async () => {
  const app = setup()
  assert.equal((await app.request()).status, 200)
  assert.equal(app.writes[0].id, 'student')
  assert.equal(app.writes[1].payload.must_change_password, true)
})

for (const [name, options] of [
  ['giáo viên lớp khác', { assigned: false }],
  ['giáo viên đã gỡ phân công', { assignmentActive: false }],
  ['giáo viên chưa duyệt', { approval: 'pending' }],
  ['giáo viên bị khoá', { approval: 'suspended' }],
  ['học sinh / trợ giảng', { role: 'student' }],
  ['ghi danh đã ngừng', { enrollmentActive: false }],
  ['năm học đã lưu trữ', { yearActive: false }],
]) {
  test(`${name} không đổi được mật khẩu học sinh`, async () => {
    const app = setup(options)
    assert.equal((await app.request()).status, 403)
    assert.equal(app.writes.length, 0)
  })
}

test('quản trị viên đặt lại được; mật khẩu yếu và phiên thiếu token bị chặn', async () => {
  assert.equal((await setup({ role: 'admin', assigned: false }).request()).status, 200)
  const app = setup()
  assert.equal((await app.request({ password: 'short' })).status, 400)
  assert.equal((await app.request({ token: false })).status, 401)
  assert.equal(app.writes.length, 0)
})
