-- ============================================================================
--  TÀI KHOẢN THỬ NGHIỆM  —  chạy SAU schema-11-reflection-gate.sql
-- ============================================================================
--  Vấn đề: mỗi lớp cần một tài khoản giả để thầy cô xem thử giao diện học sinh
--  trước khi công bố. Nhưng tài khoản giả đó lại nằm trong sĩ số lớp, nên nó
--  hiện trong "danh sách chưa đăng ký", bị cron ghi vào sổ quên, rồi leo lên
--  bảng kỷ luật — thầy cô phải tự nhớ mà bỏ qua nó mỗi lần nhìn bảng.
--
--  Ranh giới tôi chọn — và vì sao:
--
--    ẨN  ở những danh sách DÙNG ĐỂ NHẮC VÀ KỶ LUẬT (chưa đăng ký, sổ quên,
--        bảng kỷ luật, bảng người đi nhắc, nợ phản tư). Ở đây một dòng giả là
--        rác: nó làm thầy cô đếm nhầm, và làm bạn cán sự đi nhắc một người
--        không có thật.
--
--    GIỮ ở những chỗ thầy cô DÙNG ĐỂ XEM BÀI (hộp chấm sao, thống kê, chia sẻ
--        sách). Ở đây dữ liệu giả chính là thứ cần thấy — ẩn nốt thì tài khoản
--        thử nghiệm chẳng thử được gì.
--
--  Chạy lại bao nhiêu lần cũng được.
-- ============================================================================


-- ============================================================================
--  61. CỜ ĐÁNH DẤU
-- ============================================================================
-- Đặt trên students chứ không phải enrollments: "đây là tài khoản giả" là tính
-- chất của con người, không phải của việc em học lớp nào. Chuyển lớp thì cờ
-- vẫn đi theo.
alter table public.students
  add column if not exists is_test boolean not null default false;

comment on column public.students.is_test is
  'Tai khoan gia de thu giao dien. An khoi cac danh sach nhac nho / ky luat.';

-- Chỉ đánh chỉ mục phần rất nhỏ: mỗi lớp nhiều nhất một tài khoản như vậy.
create index if not exists students_is_test_idx
  on public.students (mshs) where is_test;


-- ============================================================================
--  62. "AI CHƯA ĐĂNG KÝ" — BỎ TÀI KHOẢN THỬ NGHIỆM
-- ============================================================================
-- Giữ nguyên phần còn lại của schema-10 mục 53.
create or replace function public.missing_registrations(p_class uuid, p_date date)
returns table (student_id uuid, mshs text, full_name text, period smallint)
language sql stable security definer set search_path = public as $fn$
  with allowed as (
    select 1 where public.staff_perm(p_class, 'view_plans')
                or public.staff_perm(p_class, 'track_attendance')
  ),
  slots as (
    select cs.period
    from public.class_schedule cs
    where cs.class_id = p_class
      and cs.weekday = extract(isodow from p_date)::smallint
  ),
  has_schedule as (
    select 1 from public.class_schedule where class_id = p_class limit 1
  ),
  roster as (
    select s.claimed_user_id as sid, s.mshs, s.full_name
    from public.enrollments e
    join public.students s on s.mshs = e.mshs
    where e.class_id = p_class and e.is_active
      and s.claimed_user_id is not null
      and not s.is_test
  )
  select r.sid, r.mshs, r.full_name, sl.period
  from roster r
  cross join slots sl
  where exists (select 1 from allowed)
    and not public.is_exempt(p_class, r.mshs, p_date, sl.period)
    and not exists (
      select 1 from public.plans p
      where p.student_id = r.sid and p.study_date = p_date
        and sl.period between p.period and p.period + p.span - 1
    )
  union all
  select r.sid, r.mshs, r.full_name, null::smallint
  from roster r
  where exists (select 1 from allowed)
    and not exists (select 1 from has_schedule)
    and not public.is_exempt(p_class, r.mshs, p_date, null)
    and not exists (
      select 1 from public.plans p
      where p.student_id = r.sid and p.study_date = p_date
    )
  order by 3, 4;
$fn$;


-- ============================================================================
--  63. SỔ GHI QUÊN — ĐỪNG GHI CHO NGƯỜI KHÔNG CÓ THẬT
-- ============================================================================
-- Chặn ở đây quan trọng hơn chặn ở bảng hiển thị: sổ này là dữ liệu dùng để kỷ
-- luật, ghi vào rồi thì phải đi xoá tay mới sạch.
create or replace function public.record_attendance_misses(p_date date default null)
returns json language plpgsql security definer set search_path = public as $fn$
declare v_date date := coalesce(p_date, public.vn_today() - 1); n int := 0;
begin
  insert into public.attendance_misses (class_id, mshs, study_date, period)
  select pol.class_id, s.mshs, v_date, cs.period
  from public.attendance_policy pol
  join public.class_schedule cs on cs.class_id = pol.class_id
                               and cs.weekday = extract(isodow from v_date)::smallint
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and s.claimed_user_id is not null
  where pol.enabled
    and not s.is_test
    and v_date >= pol.tracking_from
    and not public.is_exempt(pol.class_id, s.mshs, v_date, cs.period)
    and not exists (
      select 1 from public.plans p
      where p.student_id = s.claimed_user_id and p.study_date = v_date
        and cs.period between p.period and p.period + p.span - 1)
  on conflict do nothing;
  get diagnostics n = row_count;

  return json_build_object('ngay', v_date::text, 'so_luot_quen_moi', n);
end;
$fn$;

revoke all on function public.record_attendance_misses(date) from anon, public, authenticated;


-- ============================================================================
--  64. BẢNG KỶ LUẬT CỦA GIÁO VIÊN
-- ============================================================================
create or replace function public.class_attendance_board(p_class uuid)
returns table (
  mshs text, full_name text, so_lan_quen int, bac int, nhan text, chi_tiet text,
  lan_gan_nhat date
) language sql stable security definer set search_path = public as $fn$
  select s.mshs, s.full_name,
         coalesce(m.n, 0)::int as so_lan_quen,
         (public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'bac')::int,
         public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'nhan',
         public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'chi_tiet',
         m.gan_nhat
  from public.attendance_policy pol
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*) n, max(study_date) gan_nhat
    from public.attendance_misses am
    where am.class_id = pol.class_id and am.mshs = s.mshs
      and am.study_date >= public.term_start(pol.class_id)
  ) m on true
  where pol.class_id = p_class and pol.enabled and public.teaches_class(p_class)
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  65. BẢNG CỦA BẠN ĐI NHẮC
-- ============================================================================
create or replace function public.class_attendance_tracker(p_class uuid)
returns table (
  mshs text, full_name text, so_lan_quen int, con_lai int, lan_gan_nhat date
) language sql stable security definer set search_path = public as $fn$
  select s.mshs, s.full_name,
         coalesce(m.n, 0)::int,
         greatest(pol.free_passes - coalesce(m.n, 0), 0)::int,
         m.gan_nhat
  from public.attendance_policy pol
  cross join lateral public.term_bounds(pol.class_id) b
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*) n, max(study_date) gan_nhat
    from public.attendance_misses am
    where am.class_id = pol.class_id and am.mshs = s.mshs
      and am.study_date >= b.tu_ngay
      and (b.den_ngay is null or am.study_date <= b.den_ngay)
  ) m on true
  where pol.class_id = p_class and pol.enabled
    and public.staff_perm(p_class, 'track_attendance')
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  66. NỢ PHẢN TƯ
-- ============================================================================
create or replace function public.class_reflection_debt(p_class uuid)
returns table (mshs text, full_name text, so_no int, bi_chan boolean, cu_nhat date)
language sql stable security definer set search_path = public as $fn$
  select s.mshs, s.full_name,
         coalesce(d.n, 0)::int,
         c.require_reflection and coalesce(d.n, 0) >= c.reflection_debt_limit,
         d.cu_nhat
  from public.classes c
  join public.enrollments e on e.class_id = c.id and e.is_active
  join public.students   s on s.mshs = e.mshs
                          and s.claimed_user_id is not null
                          and not s.is_test
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
--  67. QUYỀN
-- ============================================================================
-- create or replace giữ nguyên quyền cũ, nhưng cấp lại cho chắc.
do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('missing_registrations','class_attendance_board',
                        'class_attendance_tracker','class_reflection_debt')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;

notify pgrst, 'reload schema';


-- ============================================================================
--  68. THẦY CÔ TỰ ĐÁNH DẤU ĐƯỢC
-- ============================================================================
-- Không để cờ này chỉ đặt được bằng SQL: mỗi giáo viên trong trường sẽ tự tạo
-- một tài khoản thử cho lớp mình, và họ không có ai chạy SQL hộ.
create or replace function public.set_test_account(
  p_class uuid, p_mshs text, p_is_test boolean
) returns json language plpgsql security definer set search_path = public as $fn$
declare v_ten text;
begin
  if not public.teaches_class(p_class) then
    raise exception 'Thầy/cô không phụ trách lớp này.';
  end if;
  -- Chỉ sửa được em ĐANG học lớp mình, không với sang lớp khác.
  if not exists (select 1 from public.enrollments e
                  where e.class_id = p_class and e.mshs = p_mshs and e.is_active) then
    raise exception 'Em này không thuộc lớp.';
  end if;

  update public.students set is_test = p_is_test where mshs = p_mshs
    returning full_name into v_ten;

  -- Đánh dấu là tài khoản thử thì xoá luôn những lần quên đã trót ghi cho nó,
  -- nếu không bảng kỷ luật vẫn còn số liệu ma của một người không có thật.
  if p_is_test then
    delete from public.attendance_misses where class_id = p_class and mshs = p_mshs;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'roster.test_flag', 'classes', p_class,
          json_build_object('mshs', p_mshs, 'is_test', p_is_test));

  return json_build_object('ok', true, 'ten', v_ten, 'is_test', p_is_test);
end;
$fn$;


-- ============================================================================
--  69. DANH SÁCH LỚP HIỂN THỊ CỜ
-- ============================================================================
-- Vẫn TRẢ VỀ tài khoản thử nghiệm — ẩn nốt ở đây thì nó thành tài khoản ma,
-- thầy cô không xoá cũng không sửa được. Chỉ gắn nhãn để nhìn ra ngay.
--
-- Phải DROP chứ không create or replace được: hàm thêm một cột trả về, mà
-- Postgres không cho đổi kiểu trả về của hàm đang tồn tại. Quyền bị xoá theo,
-- nên vòng lặp cấp quyền ở cuối mục này là bắt buộc, không phải cho chắc.
drop function if exists public.class_roster(uuid);
create function public.class_roster(p_class uuid)
returns table (mshs text, full_name text, user_id uuid, avatar_path text,
               must_change_password boolean, so_nhiem_vu bigint,
               hoat_dong_gan_nhat date, is_test boolean)
language sql stable security definer set search_path = public as $fn$
  select s.mshs, s.full_name, s.claimed_user_id, p.avatar_path, p.must_change_password,
         (select count(*) from public.plans pl where pl.student_id = s.claimed_user_id and pl.class_id = p_class),
         (select max(pl.study_date) from public.plans pl where pl.student_id = s.claimed_user_id and pl.class_id = p_class),
         s.is_test
  from public.enrollments e
  join public.students s on s.mshs = e.mshs
  left join public.profiles p on p.id = s.claimed_user_id
  where e.class_id = p_class and e.is_active and public.teaches_class(p_class)
  order by s.is_test, s.full_name;
$fn$;

do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('class_roster','set_test_account')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;

notify pgrst, 'reload schema';
