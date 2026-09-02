-- ============================================================================
--  BẮT BUỘC CẬP NHẬT KẾT QUẢ  —  chạy SAU schema-10-tracker.sql
-- ============================================================================
--  Vấn đề: nhắc mãi mà nhiều em vẫn không cập nhật kết quả. Hệ thống đã có
--  popup, thông báo 2 lần/ngày, và tự chấm 1 sao sau 120 giờ — nhưng tất cả
--  đều là NHẮC, không phải BẮT BUỘC.
--
--  Đòn bẩy thật duy nhất trong một ứng dụng web: chặn thứ em muốn làm tiếp.
--  Còn nợ kết quả thì chưa đăng ký được buổi mới.
--
--  Vì sao chặn được mà không tàn nhẫn: món nợ LUÔN xoá được trong ba chục
--  giây — em chỉ cần ghi một dòng mình đã làm tới đâu, kể cả "em chưa làm
--  được vì…". Đây là gờ giảm tốc, không phải cánh cửa khoá.
--
--  Chạy lại bao nhiêu lần cũng được.
-- ============================================================================


-- ============================================================================
--  56. CÔNG TẮC THEO LỚP
-- ============================================================================
-- Đặt cạnh allow_late_registration vì cùng là luật đăng ký của lớp.
alter table public.classes
  add column if not exists require_reflection boolean not null default false;
alter table public.classes
  add column if not exists reflection_debt_limit smallint not null default 1
    check (reflection_debt_limit between 1 and 10);

comment on column public.classes.require_reflection is
  'Bat: con no ket qua qua han thi chua dang ky duoc buoi moi.';
comment on column public.classes.reflection_debt_limit is
  'So nhiem vu qua han duoc phep no truoc khi bi chan. 1 = chat nhat.';


-- ============================================================================
--  57. ĐẾM MÓN NỢ
-- ============================================================================
-- Chỉ tính nhiệm vụ ĐÃ QUÁ HẠN (mặc định 48 giờ sau tiết), không tính nhiệm vụ
-- vừa xong hôm nay. Chặn ngay trong ngày là quá gắt: em còn đang làm dở.
--
-- Nhiệm vụ hệ thống đã tự chấm 1 sao thì KHÔNG tính là nợ nữa — nó đã có hậu
-- quả riêng rồi, tính thêm lần nữa là phạt hai lần cho một lỗi.
create or replace function public.reflection_debt(p_student uuid)
returns int language sql stable security definer set search_path = public as $fn$
  select count(*)::int
  from public.plan_status ps
  where ps.student_id = p_student
    and ps.progress = 'Trễ hạn cập nhật';
$fn$;

-- Danh sách món nợ, để giao diện chỉ thẳng em phải làm gì.
create or replace function public.my_reflection_debt()
returns json language plpgsql stable security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid(); v_class uuid; v_on boolean; v_limit smallint;
  v_debt int; v_items json;
begin
  v_class := public.student_active_class(v_uid);
  if v_class is null then return null; end if;

  select require_reflection, reflection_debt_limit into v_on, v_limit
    from public.classes where id = v_class;

  select count(*)::int into v_debt
    from public.plan_status ps
   where ps.student_id = v_uid and ps.progress = 'Trễ hạn cập nhật';

  select coalesce(json_agg(x order by x.study_date, x.period), '[]'::json) into v_items
    from (
      select ps.plan_id, ps.study_date::text, ps.period, ps.subject,
             ps.overdue_at::text, ps.auto_evaluate_at::text
      from public.plan_status ps
      where ps.student_id = v_uid and ps.progress = 'Trễ hạn cập nhật'
    ) x;

  return json_build_object(
    'bat',       coalesce(v_on, false),
    'gioi_han',  coalesce(v_limit, 1),
    'so_no',     v_debt,
    'bi_chan',   coalesce(v_on, false) and v_debt >= coalesce(v_limit, 1),
    'danh_sach', v_items
  );
end;
$fn$;


-- ============================================================================
--  58. CHẶN Ở CƠ SỞ DỮ LIỆU, KHÔNG PHẢI Ở GIAO DIỆN
-- ============================================================================
-- Ẩn nút ở giao diện chỉ ngăn được em không biết gọi API. Luật phải nằm ở đây.
create or replace function public.enforce_reflection_debt()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_on boolean; v_limit smallint; v_debt int;
begin
  -- service role (script quản trị) và giáo viên tạo hộ thì bỏ qua.
  if auth.uid() is null then return new; end if;
  if auth.uid() is distinct from new.student_id then return new; end if;

  select require_reflection, reflection_debt_limit into v_on, v_limit
    from public.classes where id = new.class_id;
  if not coalesce(v_on, false) then return new; end if;

  v_debt := public.reflection_debt(new.student_id);
  if v_debt >= coalesce(v_limit, 1) then
    raise exception
      'Em còn % nhiệm vụ quá hạn chưa cập nhật kết quả. Hãy cập nhật xong rồi đăng ký buổi mới nhé.',
      v_debt
      using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

-- Tên bắt đầu bằng trg_a để chạy TRƯỚC plans_set_class: chặn sớm thì không tạo
-- ra buổi tự học rỗng rồi mới báo lỗi.
drop trigger if exists trg_a_reflection_debt on public.plans;
create trigger trg_a_reflection_debt before insert on public.plans
for each row execute function public.enforce_reflection_debt();

-- Buổi tự học cũng phải chặn: giao diện tạo buổi TRƯỚC khi tạo nhiệm vụ, nên
-- nếu chỉ chặn ở plans thì mỗi lần em thử là để lại một buổi rỗng.
create or replace function public.enforce_reflection_debt_session()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_on boolean; v_limit smallint; v_debt int;
begin
  if auth.uid() is null then return new; end if;
  if auth.uid() is distinct from new.student_id then return new; end if;

  select require_reflection, reflection_debt_limit into v_on, v_limit
    from public.classes where id = new.class_id;
  if not coalesce(v_on, false) then return new; end if;

  v_debt := public.reflection_debt(new.student_id);
  if v_debt >= coalesce(v_limit, 1) then
    raise exception
      'Em còn % nhiệm vụ quá hạn chưa cập nhật kết quả. Hãy cập nhật xong rồi đăng ký buổi mới nhé.',
      v_debt
      using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_a_reflection_debt_session on public.self_study_sessions;
create trigger trg_a_reflection_debt_session before insert on public.self_study_sessions
for each row execute function public.enforce_reflection_debt_session();


-- ============================================================================
--  59. GIÁO VIÊN NHÌN THẤY AI ĐANG BỊ CHẶN
-- ============================================================================
-- Chặn mà thầy cô không biết ai đang bị chặn thì thành ra em kẹt im lặng.
create or replace function public.class_reflection_debt(p_class uuid)
returns table (mshs text, full_name text, so_no int, bi_chan boolean, cu_nhat date)
language sql stable security definer set search_path = public as $fn$
  select s.mshs, s.full_name,
         coalesce(d.n, 0)::int,
         c.require_reflection and coalesce(d.n, 0) >= c.reflection_debt_limit,
         d.cu_nhat
  from public.classes c
  join public.enrollments e on e.class_id = c.id and e.is_active
  join public.students   s on s.mshs = e.mshs and s.claimed_user_id is not null
  left join lateral (
    select count(*) n, min(ps.study_date) cu_nhat
    from public.plan_status ps
    where ps.student_id = s.claimed_user_id and ps.progress = 'Trễ hạn cập nhật'
  ) d on true
  where c.id = p_class
    and (public.staff_perm(p_class, 'view_plans') or public.staff_perm(p_class, 'track_attendance'))
    and coalesce(d.n, 0) > 0
  order by coalesce(d.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  60. QUYỀN
-- ============================================================================
do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('reflection_debt','my_reflection_debt','class_reflection_debt')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;

-- Hàm trigger chạy dưới quyền chủ sở hữu khi trigger kích hoạt, không cấp cho ai.
revoke all on function public.enforce_reflection_debt() from anon, public, authenticated;
revoke all on function public.enforce_reflection_debt_session() from anon, public, authenticated;

notify pgrst, 'reload schema';
