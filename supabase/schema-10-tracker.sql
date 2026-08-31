-- ============================================================================
--  QUYỀN "THEO DÕI ĐĂNG KÝ" CHO TRỢ GIẢNG  —  chạy SAU schema-9-terms.sql
-- ============================================================================
--  Giáo viên giao cho một bạn việc nhắc nhở: bạn nào hôm nay chưa đăng ký, và
--  bạn nào đã quên bao nhiêu lần trong học kỳ.
--
--  Đây là một quyền RIÊNG, không phải kèm theo "xem kế hoạch lớp". Bạn được
--  giao việc nhắc chỉ cần biết AI CHƯA ĐĂNG KÝ — không cần đọc nội dung kế
--  hoạch, phản tư hay minh chứng của cả lớp.
--
--  Chạy lại bao nhiêu lần cũng được.
-- ============================================================================


-- ============================================================================
--  51. CỜ QUYỀN MỚI
-- ============================================================================
alter table public.class_assistants
  add column if not exists can_track_attendance boolean not null default false;

comment on column public.class_assistants.can_track_attendance is
  'Xem ai chua dang ky va so lan quen. Chi doc, khong sua duoc gi.';


-- ============================================================================
--  52. THÊM VÀO CHỐT QUYỀN DUY NHẤT
-- ============================================================================
-- Mọi quyết định phân quyền của hệ thống đi qua đúng hàm này. Thêm quyền mới ở
-- chỗ khác là bắt đầu có hai nguồn sự thật.
create or replace function public.staff_perm(p_class uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $fn$
  select case
    when public.teaches_class(p_class) then true
    else coalesce((
      select case p_perm
        when 'view_plans'        then can_view_plans
        when 'view_help'         then can_view_help
        when 'chat'              then can_chat
        when 'view_reflections'  then can_view_reflections
        when 'view_evidence'     then can_view_evidence
        when 'rate'              then can_rate
        when 'comment'           then can_comment
        when 'review_device'     then can_review_device
        when 'approve_plan'      then can_approve_plan
        when 'review_books'      then can_review_books
        when 'track_attendance'  then can_track_attendance
        else false
      end
      from public.class_assistants
      where class_id = p_class and student_id = auth.uid()
    ), false)
  end;
$fn$;


-- ============================================================================
--  53. "AI CHƯA ĐĂNG KÝ" — MỞ CHO CẢ QUYỀN THEO DÕI
-- ============================================================================
-- Hàm này chỉ trả về TÊN và TIẾT còn thiếu, không hề trả nội dung kế hoạch.
-- Nên mở cho quyền theo dõi là đủ an toàn, không cần kèm 'view_plans'.
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
    where e.class_id = p_class and e.is_active and s.claimed_user_id is not null
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
--  54. BẢNG ĐẾM CHO NGƯỜI ĐI NHẮC
-- ============================================================================
-- Hàm RIÊNG, không dùng chung với bảng của giáo viên. Lý do:
--
--   Bạn được giao việc nhắc cần biết SỐ LẦN QUÊN và CÒN MẤY LẦN MIỄN TRỪ —
--   đủ để nói "bạn còn một lần nữa thôi nhé". Nhưng MỨC KỶ LUẬT (lao động công
--   ích, mời phụ huynh) thì không: đó là việc giữa giáo viên, học sinh và phụ
--   huynh, không phải thứ để một bạn cùng lớp đọc được.
--
-- Giáo viên vẫn xem đủ mọi thứ qua class_attendance_board().
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
  join public.students   s on s.mshs = e.mshs
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
--  55. QUYỀN
-- ============================================================================
do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('staff_perm','missing_registrations','class_attendance_tracker')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;
