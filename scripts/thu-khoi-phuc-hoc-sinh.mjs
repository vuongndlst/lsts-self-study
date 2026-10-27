// Chỉ thao tác học sinh giả 8A0, trong giao dịch luôn tự huỷ (kể cả migration thử).
// THU_SQL=supabase/migrations/...sql node scripts/thu-khoi-phuc-hoc-sinh.mjs
import { readFileSync } from 'node:fs'
import { q } from './db.mjs'

const migration = process.env.THU_SQL ? readFileSync(process.env.THU_SQL, 'utf8') : ''
const asTeacher = `perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true); set local role authenticated;`
const asAdmin = `reset role; perform set_config('request.jwt.claims', '{}', true);`
const remember = (label, expression) => `kq := kq || jsonb_build_object('${label}', ${expression});`
let result
try {
  await q(`${migration}
do $test$
declare
  kq jsonb := '{}'; v_class uuid; v_other uuid; v_teacher uuid; v_student uuid;
  v_mshs text; v_name text; v_enrollment uuid; v_before jsonb; v_after jsonb; v_hash text; v_result json;
begin
  select id into v_class from public.classes where name = '8A0'
    and school_year_id = (select id from public.school_years where is_active);
  select id into v_teacher from public.profiles where role = 'teacher' and approval_status = 'approved' limit 1;
  select e.id, s.mshs, s.full_name, s.claimed_user_id into v_enrollment, v_mshs, v_name, v_student
    from public.enrollments e join public.students s on s.mshs = e.mshs
   where e.class_id = v_class and e.is_active and s.mshs ~ '^240000[0-9]$' and s.claimed_user_id is not null limit 1;
  if v_enrollment is null or v_teacher is null then raise exception 'Thiếu lớp mẫu 8A0 hoặc giáo viên thử'; end if;
  select encrypted_password into v_hash from auth.users where id = v_student;
  select jsonb_build_object('plans', (select count(*) from public.plans where student_id = v_student),
    'reflections', (select count(*) from public.reflections where student_id = v_student),
    'evidence', (select count(*) from public.evidence where student_id = v_student)) into v_before;
  insert into public.class_teachers (class_id, teacher_id, role, status)
  values (v_class, v_teacher, 'co', 'active')
  on conflict (class_id, teacher_id) do update set status = 'active';

  ${asTeacher}
  perform public.remove_from_class(v_class, v_mshs);
  ${remember('Giáo viên thấy học sinh vừa chuyển khỏi lớp', "exists(select 1 from public.class_removed_students(v_class) where mshs = v_mshs)")}
  v_result := public.restore_to_class(v_class, v_mshs);
  ${remember('Giáo viên lớp khôi phục được', "(v_result->>'restored')::boolean")}
  ${remember('Học sinh trở lại danh sách lớp', "exists(select 1 from public.class_roster(v_class) where mshs = v_mshs)")}
  ${remember('Không còn ở danh sách đã chuyển', "not exists(select 1 from public.class_removed_students(v_class) where mshs = v_mshs)")}
  v_result := public.restore_to_class(v_class, v_mshs);
  ${remember('Bấm khôi phục lần hai không tạo ghi danh trùng', "not (v_result->>'restored')::boolean")}
  perform public.remove_from_class(v_class, v_mshs);
  v_result := public.import_class_roster(v_class,
    jsonb_build_array(jsonb_build_object('stt', 1, 'mshs', v_mshs, 'full_name', v_name)),
    gen_random_uuid()::text, 'kiem-tra-khoi-phuc.xlsx');
  ${remember('Nhập lại Excel cũng khôi phục được', "(v_result->>'gan_vao_lop')::int = 1")}
  ${asAdmin}
  ${remember('Dùng nguyên bản ghi ghi danh cũ', "exists(select 1 from public.enrollments where id = v_enrollment and is_active)")}
  ${remember('Tài khoản và mật khẩu không đổi', "exists(select 1 from public.students s join auth.users u on u.id = s.claimed_user_id where s.mshs = v_mshs and s.claimed_user_id = v_student and u.encrypted_password = v_hash)")}
  select jsonb_build_object('plans', (select count(*) from public.plans where student_id = v_student),
    'reflections', (select count(*) from public.reflections where student_id = v_student),
    'evidence', (select count(*) from public.evidence where student_id = v_student)) into v_after;
  ${remember('Lịch sử tự học và minh chứng giữ nguyên', 'v_before = v_after')}
  ${remember('Khôi phục có nhật ký đúng người thao tác', "exists(select 1 from public.audit_log where actor_id = v_teacher and action = 'roster.restored' and entity_id = v_class and metadata->>'mshs' = v_mshs)")}

  -- Gỡ phân công tạm thời: giáo viên này không còn quyền đọc/khôi phục lớp.
  update public.class_teachers set status = 'inactive' where class_id = v_class and teacher_id = v_teacher;
  ${asTeacher}
  ${remember('Giáo viên không phụ trách không đọc được danh sách đã chuyển', 'not exists(select 1 from public.class_removed_students(v_class))')}
  begin
    perform public.restore_to_class(v_class, v_mshs);
    ${remember('Giáo viên không phụ trách bị chặn khôi phục', 'false')}
  exception when raise_exception then
    ${remember('Giáo viên không phụ trách bị chặn khôi phục', "position('không có quyền' in sqlerrm) > 0")}
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  begin
    perform public.restore_to_class(v_class, v_mshs);
    ${remember('Học sinh không tự khôi phục ghi danh', 'false')}
  exception when raise_exception then
    ${remember('Học sinh không tự khôi phục ghi danh', "position('không có quyền' in sqlerrm) > 0")}
  end;

  ${asAdmin}
  update public.class_teachers set status = 'active' where class_id = v_class and teacher_id = v_teacher;
  update public.enrollments set is_active = false where id = v_enrollment;
  select id into v_other from public.classes where id <> v_class
    and school_year_id = (select id from public.school_years where is_active) limit 1;
  if v_other is null then raise exception 'Thiếu lớp đối chứng'; end if;
  insert into public.enrollments (mshs, class_id, is_active) values (v_mshs, v_other, true)
    on conflict (mshs, class_id) do update set is_active = true;
  ${asTeacher}
  begin
    perform public.restore_to_class(v_class, v_mshs);
    ${remember('Không kéo học sinh khỏi lớp khác', 'false')}
  exception when raise_exception then
    ${remember('Không kéo học sinh khỏi lớp khác', "position('đang thuộc lớp' in sqlerrm) > 0")}
  end;
  v_result := public.import_class_roster(v_class,
    jsonb_build_array(jsonb_build_object('stt', 1, 'mshs', v_mshs, 'full_name', v_name)),
    gen_random_uuid()::text, 'kiem-tra-xung-dot.xlsx');
  ${remember('Nhập Excel vẫn chặn xung đột lớp', "(v_result->>'bo_qua')::int = 1")}
  raise exception 'KQ:%', kq::text;
end $test$;`)
  throw new Error('Ca thử không tự huỷ giao dịch')
} catch (error) {
  const match = String(error.message).match(/KQ:(\{.*?\})\\nCONTEXT/)
  if (!match) throw error
  result = JSON.parse(match[1].replace(/\\"/g, '"'))
}
for (const [label, passed] of Object.entries(result)) console.log(`${passed ? '✓' : '✗'} ${label}`)
const failed = Object.values(result).filter((v) => v !== true).length
console.log(`${Object.keys(result).length - failed} đạt · ${failed} trượt · giao dịch đã huỷ`)
process.exitCode = failed ? 1 : 0
