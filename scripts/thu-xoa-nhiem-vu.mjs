// Học sinh giả lớp 8A0; luôn huỷ toàn bộ giao dịch, kể cả migration thử.
// THU_SQL=supabase/migrations/..._controlled_plan_deletion.sql node scripts/thu-xoa-nhiem-vu.mjs
import { readFileSync } from 'node:fs'
import { q } from './db.mjs'

const migration = process.env.THU_SQL ? readFileSync(process.env.THU_SQL, 'utf8') : ''
const role = (id) => `perform set_config('request.jwt.claims', json_build_object('sub', ${id}, 'role', 'authenticated')::text, true); set local role authenticated;`
const admin = `reset role; perform set_config('request.jwt.claims', '{}', true);`
const check = (name, expression) => `kq := kq || jsonb_build_object('${name}', ${expression});`
const blocked = (name, sql, text) => `begin ${sql}; ${check(name, 'false')}
  exception when raise_exception then ${check(name, `position('${text}' in sqlerrm) > 0`)} end;`
const seed = (variable, { student = 'v_student', days = 21, device = false } = {}) => `
 insert into public.plans(student_id, study_date, period, activity_type, subject, task, priority, goal,
   use_device, device_purpose, device_status, review_status)
 values(${student}, public.vn_today() + ${days}, 5, 'Ôn tập', 'Toán', 'Thử xoá nhiệm vụ', 'Trung bình', 'Xong',
   ${device}, ${device ? "'Tra cứu tài liệu'" : 'null'}, '${device ? 'Đã duyệt' : 'Không dùng'}', '${device ? 'Đã duyệt' : 'Không cần duyệt'}')
 returning id into ${variable};`
let result
try {
  await q(`${migration}
do $test$
declare
 kq jsonb := '{}'; v_class uuid; v_teacher uuid; v_student uuid; v_ta uuid;
 v_id uuid; v_sibling uuid; v_past uuid; v_result_id uuid; v_ev_id uuid; v_session uuid; v_result json;
begin
 select id into v_class from public.classes where name='8A0'
   and school_year_id=(select id from public.school_years where is_active);
 select id into v_teacher from public.profiles where role='teacher' and approval_status='approved' limit 1;
 select claimed_user_id into v_student from public.students where mshs='2400002';
 select claimed_user_id into v_ta from public.students where mshs='2400001';
 if v_class is null or v_teacher is null or v_student is null or v_ta is null then raise exception 'Thiếu dữ liệu mẫu'; end if;
 insert into public.class_teachers(class_id,teacher_id,role,status) values(v_class,v_teacher,'co','active')
   on conflict(class_id,teacher_id) do update set status='active';
 insert into public.class_assistants(class_id,student_id,can_view_plans,can_rate,can_comment,can_review_device,can_approve_plan,can_delete_plans)
 values(v_class,v_ta,false,false,false,false,false,false)
 on conflict(class_id,student_id) do update set can_view_plans=false,can_rate=false,can_comment=false,
   can_review_device=false,can_approve_plan=false,can_delete_plans=false;
 ${check('Khách không được gọi API xoá', "not has_function_privilege('anon','public.delete_study_plans(uuid[],text)','EXECUTE')")}
 ${seed('v_id', { device: true })}
 select session_id into v_session from public.plans where id=v_id;
 ${role('v_ta')}
 ${blocked('Trợ giảng chưa được giao quyền không xoá được', "perform public.delete_study_plans(array[v_id], 'Không còn nhu cầu')", 'Không có quyền')}
 ${admin}
 update public.class_assistants set can_delete_plans=true where class_id=v_class and student_id=v_ta;
 ${check('Cấp quyền xoá tự bật xem kế hoạch', 'exists(select 1 from public.class_assistants where class_id=v_class and student_id=v_ta and can_view_plans and not can_rate and not can_comment)')}
 ${role('v_ta')}
 v_result := public.delete_study_plans(array[v_id], 'Bạn không còn cần dùng thiết bị');
 ${check('Trợ giảng được giao quyền xoá được nhiệm vụ đã duyệt thiết bị', "(v_result->>'da_xoa')::int=1")}
 ${admin}
 ${check('Xoá có nhật ký kèm bản chụp nhiệm vụ và lý do', "exists(select 1 from public.audit_log where action='plan.deleted' and entity_id=v_id and actor_id=v_ta and metadata->>'reason'='Bạn không còn cần dùng thiết bị' and metadata->'plan'->>'id'=v_id::text)")}
 ${blocked('Không âm thầm báo xoá thành công với ID không còn tồn tại', `${role('v_teacher')} perform public.delete_study_plans(array[v_id], 'Không còn nhu cầu')`, 'đã thay đổi')}
 ${admin}
 ${seed('v_id')}
 ${role('v_student')}
 v_result := public.delete_study_plans(array[v_id], 'Em không còn nhu cầu');
 ${check('Học sinh tự xoá nhiệm vụ trước tiết học', "(v_result->>'da_xoa')::int=1")}
 ${admin}
 ${seed('v_past', { days: -1 })}
 ${role('v_student')}
 ${blocked('Học sinh không tự xoá sau giờ bắt đầu', "perform public.delete_study_plans(array[v_past], 'Em không còn nhu cầu')", 'Không có quyền')}
 ${admin}
 ${seed('v_id')}
 ${role('v_student')}
 ${blocked('Xoá nhiều nhiệm vụ tự hoàn tác nếu có một nhiệm vụ bị chặn', "perform public.delete_study_plans(array[v_id,v_past], 'Em không còn nhu cầu')", 'Không có quyền')}
 ${admin}
 ${check('Không xoá dở dang một phần của buổi', 'exists(select 1 from public.plans where id=v_id) and exists(select 1 from public.plans where id=v_past)')}
 update public.class_teachers set status='inactive' where class_id=v_class and teacher_id=v_teacher;
 ${role('v_teacher')}
 ${blocked('Giáo viên không phụ trách không xoá được', "perform public.delete_study_plans(array[v_id], 'Không còn nhu cầu')", 'Không có quyền')}
 ${admin}
 update public.class_teachers set status='active' where class_id=v_class and teacher_id=v_teacher;
 ${role('v_teacher')}
 ${blocked('Giáo viên phải ghi lý do rõ ràng', "perform public.delete_study_plans(array[v_id], 'xoá')", 'Lý do')}
 v_result := public.delete_study_plans(array[v_past], 'Nhiệm vụ nhập nhầm, chưa thực hiện');
 ${check('Giáo viên lớp xoá nhiệm vụ cũ chưa có kết quả', "(v_result->>'da_xoa')::int=1")}
 ${admin}
 ${seed('v_result_id')}
 insert into public.reflections(plan_id,student_id,completion_status,note) values(v_result_id,v_student,'Hoàn thành','Kết quả thử nghiệm');
 ${seed('v_ev_id')}
 insert into public.evidence(plan_id,student_id,kind,external_url) values(v_ev_id,v_student,'link','https://example.com/test');
 ${role('v_teacher')}
 ${blocked('Giữ nhiệm vụ đã có phản tư hoặc điểm', "perform public.delete_study_plans(array[v_result_id], 'Không còn nhu cầu')", 'đã có kết quả')}
 ${blocked('Giữ nhiệm vụ đã có minh chứng', "perform public.delete_study_plans(array[v_ev_id], 'Không còn nhu cầu')", 'đã có kết quả')}
 ${role('v_student')}
 ${blocked('DELETE trực tiếp cũng không xoá được kết quả', 'delete from public.plans where id=v_result_id', 'đã có kết quả')}
 ${admin}
 select session_id into v_session from public.plans where id=v_result_id;
 ${role('v_student')}
 ${blocked('Không lách luật bằng xoá cả buổi rồi cascade', 'delete from public.self_study_sessions where id=v_session', 'đã có kết quả')}
 ${admin}
 -- Buổi riêng có đúng hai nhiệm vụ: xoá một vẫn giữ buổi và nhiệm vụ còn lại.
 ${seed('v_id', { days: 35 })}
 ${seed('v_sibling', { days: 35 })}
 select session_id into v_session from public.plans where id=v_id;
 ${role('v_teacher')}
 perform public.delete_study_plans(array[v_id], 'Nhiệm vụ này không còn cần thiết');
 ${check('Xoá một nhiệm vụ không xoá buổi đang còn nhiệm vụ khác', 'exists(select 1 from public.self_study_sessions where id=v_session) and exists(select 1 from public.plans where id=v_sibling)')}
 perform public.delete_study_plans(array[v_sibling], 'Không còn nhu cầu thực hiện');
 ${check('Xoá nhiệm vụ cuối tự dọn buổi trống', 'not exists(select 1 from public.self_study_sessions where id=v_session)')}
 ${admin}
 ${check('Kết quả và minh chứng bị chặn vẫn còn nguyên', 'exists(select 1 from public.reflections where plan_id=v_result_id) and exists(select 1 from public.evidence where plan_id=v_ev_id)')}
 raise exception 'KQ:%',kq::text;
end $test$;`)
  throw new Error('Ca thử không tự huỷ giao dịch')
} catch (error) {
  const m = String(error.message).match(/KQ:(\{.*?\})\\nCONTEXT/)
  if (!m) throw error
  result = JSON.parse(m[1].replace(/\\"/g, '"'))
}
for (const [label, passed] of Object.entries(result)) console.log(`${passed ? '✓' : '✗'} ${label}`)
const failed = Object.values(result).filter((v) => v !== true).length
console.log(`${Object.keys(result).length - failed} đạt · ${failed} trượt · toàn bộ giao dịch đã huỷ`)
process.exitCode = failed ? 1 : 0
