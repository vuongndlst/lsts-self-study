-- ===========================================================================
--  16. ĐĂNG KÝ CHỈ CÒN BẮT BUỘC KHI DÙNG THIẾT BỊ ĐIỆN TỬ (TBĐT)
-- ===========================================================================
--
-- Đổi luật từ tháng 10/2026, theo yêu cầu của GVCN:
--
--   1. Không dùng TBĐT thì KHÔNG phải đăng ký (vẫn đăng ký được nếu em muốn).
--      Dùng TBĐT thì bắt buộc đăng ký; không đăng ký mà dùng là vi phạm.
--   2. Vi phạm quy định TBĐT → tạm dừng dùng thiết bị 7 ngày.
--   3. Nhiệm vụ có TBĐT bắt buộc có minh chứng (ảnh, tệp hoặc liên kết).
--   4. Kỷ luật "quên đăng ký" TẮT đi — không xoá. Dữ liệu, cài đặt từng lớp và
--      mã nguồn giữ nguyên; bật lại bằng một công tắc.
--   5. Giáo viên giới hạn được số ngày dùng TBĐT mỗi tuần và những thứ được
--      dùng. Mặc định KHÔNG giới hạn.
--
-- Mọi luật đều chặn ở CSDL, không chỉ ở giao diện: em gọi thẳng API cũng không
-- lách được.
--
-- Tương thích ngược, không mất dữ liệu: chỉ THÊM cột / bảng / hàm; 5 hàm kỷ
-- luật được viết lại nhưng thân hàm giữ nguyên từng chữ, chỉ thêm điều kiện
-- công tắc vào đúng chỗ đọc `pol.enabled`.
--
-- Luật 3 (minh chứng) nằm ở schema-18-minh-chung-tbdt.sql, chạy SAU khi giao
-- diện mới lên mạng — xem mục F bên dưới. File này thì chạy trước được: nó
-- không làm gì phá giao diện cũ (mặc định không giới hạn, chưa ai bị cấm).
--
-- Chạy:  node scripts/db.mjs . supabase/schema-16-tbdt.sql
-- Thử:   node scripts/thu-tbdt.mjs        (thử bằng vai thật, không bằng postgres)


-- ===========================================================================
--  A. CÔNG TẮC KỶ LUẬT QUÊN ĐĂNG KÝ — TOÀN TRƯỜNG
-- ===========================================================================
-- `on conflict do nothing`: chạy lại migration sau khi quản trị đã BẬT lại thì
-- không được âm thầm tắt đi lần nữa.
insert into public.app_settings (key, value_bool, note) values
  ('attendance_discipline_enabled', false,
   'Bật: ghi lần quên đăng ký lúc 0h05 và áp kỷ luật lao động công ích. '
   || 'Tắt từ 10/2026 vì đăng ký chỉ còn bắt buộc khi dùng thiết bị. '
   || 'Dữ liệu cũ và cài đặt từng lớp vẫn giữ nguyên; bật lại là chạy như trước.')
on conflict (key) do nothing;

create or replace function public.discipline_on()
returns boolean language sql stable security definer set search_path = public as $$
  -- Thiếu dòng cài đặt thì coi như TẮT: thà không phạt ai còn hơn phạt nhầm.
  select public.setting_bool('attendance_discipline_enabled', false);
$$;

revoke all on function public.discipline_on() from public, anon;
grant execute on function public.discipline_on() to authenticated;


-- ---------------------------------------------------------------------------
--  Năm hàm đọc cờ bật/tắt kỷ luật. Chép NGUYÊN VĂN từ CSDL đang chạy
--  (pg_get_functiondef, 10/2026), chỉ đổi `pol.enabled` thành
--  `pol.enabled and public.discipline_on()`.
--
--  Vì sao vá ở đây chứ không tắt từng lớp: giữ nguyên cài đặt của từng lớp
--  (8A7 đang bật, có 128 lần quên đã ghi). Bật lại công tắc toàn trường là mọi
--  lớp về đúng trạng thái cũ, không ai phải nhớ lớp nào từng bật.
--
--  Phía học sinh, popup "chưa đăng ký hôm nay" và thẻ điểm danh đều hiện theo
--  cờ `bat` của my_attendance_status — hàm trả null thì cả hai tự ẩn.
-- ---------------------------------------------------------------------------

create or replace function public.record_attendance_misses(p_date date default null::date)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare v_date date := coalesce(p_date, public.vn_today() - 1); n int := 0;
begin
  insert into public.attendance_misses (class_id, mshs, study_date, period)
  select pol.class_id, s.mshs, v_date, cs.period
  from public.attendance_policy pol
  join public.class_schedule cs on cs.class_id = pol.class_id
                               and cs.weekday = extract(isodow from v_date)::smallint
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and s.claimed_user_id is not null
  where pol.enabled and public.discipline_on()
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
$function$;

create or replace function public.my_attendance_status()
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_class uuid; v_mshs text; v_uid uuid := auth.uid();
  pol record; b record; v_today date := public.vn_today();
  v_slots int; v_missing int; v_misses int;
begin
  v_mshs  := public.my_mshs();
  v_class := public.student_active_class(v_uid);
  if v_class is null or v_mshs is null then return null; end if;

  select * into pol from public.attendance_policy where class_id = v_class;
  if pol is null or not (pol.enabled and public.discipline_on()) then return null; end if;

  select * into b from public.term_bounds(v_class);

  select count(*) into v_slots
    from public.class_schedule cs
   where cs.class_id = v_class
     and cs.weekday = extract(isodow from v_today)::smallint;

  -- Chỉ nhắc "chưa đăng ký hôm nay" khi hôm nay THỰC SỰ đang trong kỳ theo dõi.
  select count(*) into v_missing
    from public.class_schedule cs
   where cs.class_id = v_class
     and cs.weekday = extract(isodow from v_today)::smallint
     and v_today >= pol.tracking_from
     and not public.is_exempt(v_class, v_mshs, v_today, cs.period)
     and not exists (
       select 1 from public.plans p
       where p.student_id = v_uid and p.study_date = v_today
         and cs.period between p.period and p.period + p.span - 1);

  -- Đếm BUỔI, không đếm tiết.
  select count(*) into v_misses
    from public.attendance_miss_sessions m
   where m.class_id = v_class and m.mshs = v_mshs
     and m.study_date >= b.tu_ngay
     and (b.den_ngay is null or m.study_date <= b.den_ngay);

  return json_build_object(
    'bat',              true,
    'ngay',             v_today::text,
    'hoc_ky',           b.ten,
    'so_tiet_hom_nay',  v_slots,
    'con_thieu_hom_nay',v_missing,
    'da_quen',          v_misses,
    'quyen_mien_tru',   pol.free_passes,
    'con_lai',          greatest(pol.free_passes - v_misses, 0),
    'muc',              public.attendance_level(v_misses, pol.free_passes),
    'tu_ngay',          b.tu_ngay::text,
    'den_ngay',         b.den_ngay::text,
    'chua_bat_dau',     v_today < pol.tracking_from
  );
end;
$function$;

create or replace function public.my_discipline_case()
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_class uuid; v_mshs text; v_uid uuid := auth.uid();
  pol record; b record; v_misses int; v_bac int; v_quota int;
  v_done int; v_due date; v_ph timestamptz;
begin
  v_mshs  := public.my_mshs();
  v_class := public.student_active_class(v_uid);
  if v_class is null or v_mshs is null then return null; end if;

  select * into pol from public.attendance_policy where class_id = v_class;
  if pol is null or not (pol.enabled and public.discipline_on()) then return null; end if;
  select * into b from public.term_bounds(v_class);

  select count(*) into v_misses
    from public.attendance_miss_sessions ms
   where ms.class_id = v_class and ms.mshs = v_mshs
     and ms.study_date >= b.tu_ngay
     and (b.den_ngay is null or ms.study_date <= b.den_ngay);

  v_bac   := (public.attendance_level(v_misses, pol.free_passes)->>'bac')::int;
  v_quota := public.labor_quota(v_bac);
  if v_quota = 0 then return null; end if;

  select labor_done, due_on, parent_notified_at into v_done, v_due, v_ph
    from public.discipline_cases
   where class_id = v_class and mshs = v_mshs and term_from = b.tu_ngay;

  return json_build_object(
    'bac',        v_bac,
    'phai_lam',   v_quota,
    'da_lam',     coalesce(v_done, 0),
    'con_no',     greatest(v_quota - coalesce(v_done, 0), 0),
    'han',        v_due::text,
    'moi_ph',     v_bac >= 3,
    'da_bao_ph',  v_ph is not null,
    'hoc_ky',     b.ten
  );
end;
$function$;

create or replace function public.class_attendance_board(p_class uuid)
returns table(mshs text, full_name text, so_lan_quen integer, bac integer, nhan text, chi_tiet text, lan_gan_nhat date)
language sql stable security definer set search_path to 'public' as $function$
  select s.mshs, s.full_name,
         coalesce(m.n, 0)::int as so_lan_quen,
         (public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'bac')::int,
         public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'nhan',
         public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'chi_tiet',
         m.gan_nhat
  from public.attendance_policy pol
  cross join lateral public.term_bounds(pol.class_id) b
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*) n, max(ms.study_date) gan_nhat
    from public.attendance_miss_sessions ms
    where ms.class_id = pol.class_id and ms.mshs = s.mshs
      and ms.study_date >= b.tu_ngay
      and (b.den_ngay is null or ms.study_date <= b.den_ngay)
  ) m on true
  where pol.class_id = p_class and pol.enabled and public.discipline_on()
    and public.teaches_class(p_class)
  order by coalesce(m.n, 0) desc, s.full_name;
$function$;

create or replace function public.class_attendance_tracker(p_class uuid)
returns table(mshs text, full_name text, so_lan_quen integer, con_lai integer, lan_gan_nhat date)
language sql stable security definer set search_path to 'public' as $function$
  select s.mshs, s.full_name,
         coalesce(m.n, 0)::int,
         greatest(pol.free_passes - coalesce(m.n, 0), 0)::int,
         m.gan_nhat
  from public.attendance_policy pol
  cross join lateral public.term_bounds(pol.class_id) b
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*) n, max(ms.study_date) gan_nhat
    from public.attendance_miss_sessions ms
    where ms.class_id = pol.class_id and ms.mshs = s.mshs
      and ms.study_date >= b.tu_ngay
      and (b.den_ngay is null or ms.study_date <= b.den_ngay)
  ) m on true
  where pol.class_id = p_class and pol.enabled and public.discipline_on()
    and public.staff_perm(p_class, 'track_attendance')
  order by coalesce(m.n, 0) desc, s.full_name;
$function$;


-- ===========================================================================
--  B. CÀI ĐẶT TBĐT CỦA TỪNG LỚP
-- ===========================================================================
-- NULL = không giới hạn. Đây là mặc định: GVCN chọn tạm thời chưa giới hạn,
-- chỉ cần có sẵn chức năng.
alter table public.classes add column if not exists device_days_per_week smallint;
alter table public.classes add column if not exists device_weekdays smallint[];

do $rang_buoc$ begin
  alter table public.classes drop constraint if exists device_days_per_week_range;
  alter table public.classes add constraint device_days_per_week_range
    check (device_days_per_week is null or device_days_per_week between 1 and 7);

  -- Thứ theo chuẩn ISO giống class_schedule.weekday: 1 = Thứ 2 … 7 = Chủ nhật.
  -- Mảng rỗng nghĩa là "không thứ nào được dùng" — dễ bấm nhầm thành khoá
  -- thiết bị cả tuần, nên không cho; muốn không giới hạn thì để NULL.
  alter table public.classes drop constraint if exists device_weekdays_valid;
  alter table public.classes add constraint device_weekdays_valid
    check (device_weekdays is null
           or (cardinality(device_weekdays) between 1 and 7
               and device_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]));
end $rang_buoc$;

comment on column public.classes.device_days_per_week is
  'Số NGÀY tối đa mỗi tuần (T2–CN) một em được đăng ký dùng TBĐT. NULL = không giới hạn.';
comment on column public.classes.device_weekdays is
  'Những thứ được dùng TBĐT (1 = T2 … 7 = CN). NULL = mọi ngày có tự học.';

-- Giáo viên đổi được qua RLS classes_teacher_update sẵn có (teaches_class);
-- classes_guard_columns chỉ khoá id/tên/năm học nên không cần sửa.
grant update (device_days_per_week, device_weekdays) on public.classes to authenticated;


-- ===========================================================================
--  C. TẠM DỪNG DÙNG THIẾT BỊ (vi phạm → 7 ngày)
-- ===========================================================================
create table if not exists public.device_bans (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  reason      text not null check (char_length(trim(reason)) between 2 and 500),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Gỡ sớm thì ĐÁNH DẤU, không xoá: lịch sử vi phạm là thứ thầy cô cần xem lại
  -- khi trao đổi với phụ huynh, xoá đi là mất.
  lifted_at   timestamptz,
  lifted_by   uuid references public.profiles(id) on delete set null,
  constraint device_ban_range check (ends_on >= starts_on)
);

create index if not exists device_bans_student_idx on public.device_bans (student_id, ends_on desc);
create index if not exists device_bans_class_idx   on public.device_bans (class_id, ends_on desc);

alter table public.device_bans enable row level security;

drop policy if exists device_bans_read on public.device_bans;
create policy device_bans_read on public.device_bans
for select to authenticated
using (student_id = auth.uid() or public.teaches_class(class_id) or public.is_admin());

-- Không ai ghi thẳng vào bảng. Chỉ qua record_device_violation / lift_device_ban,
-- vì ghi vi phạm còn kéo theo huỷ duyệt và gửi thông báo — ghi tay sẽ thiếu.
revoke insert, update, delete on public.device_bans from anon, authenticated;
grant select on public.device_bans to authenticated;

-- Hạn cấm đang có hiệu lực vào ngày p_date (null = không bị cấm).
create or replace function public.device_ban_until(p_student uuid, p_date date)
returns date language sql stable security definer set search_path = public as $$
  select max(ends_on) from public.device_bans
  where student_id = p_student and lifted_at is null
    and p_date between starts_on and ends_on;
$$;


-- ===========================================================================
--  D. MỘT HÀM DUY NHẤT QUYẾT ĐỊNH "ĐƯỢC DÙNG TBĐT HAY KHÔNG"
-- ===========================================================================
-- Trigger chặn và giao diện hiển thị đều gọi đúng hàm này. Viết luật hai nơi
-- thì sớm muộn giao diện nói "được" mà CSDL lại chặn.
--
-- Trả về lý do (tiếng Việt, nói với học sinh) nếu KHÔNG được; null nếu được.
-- p_plan: nhiệm vụ đang xét, để không tự đếm chính nó.
create or replace function public.ten_thu(p_dow smallint)
returns text language sql immutable as $$
  select case p_dow when 7 then 'Chủ nhật' else 'Thứ ' || (p_dow + 1) end;
$$;

create or replace function public.device_rule_violation(
  p_student uuid, p_class uuid, p_date date, p_plan uuid default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_ban    date;
  v_max    smallint;
  v_days   smallint[];
  v_dow    smallint := extract(isodow from p_date)::smallint;
  v_tuan   date := date_trunc('week', p_date)::date;   -- Thứ 2 của tuần đó
  v_used   int;
  v_co_roi boolean;
begin
  v_ban := public.device_ban_until(p_student, p_date);
  if v_ban is not null then
    return format('Em đang tạm dừng dùng thiết bị đến hết ngày %s vì vi phạm quy định.',
                  to_char(v_ban, 'DD/MM'));
  end if;

  select device_days_per_week, device_weekdays into v_max, v_days
    from public.classes where id = p_class;

  if v_days is not null and not (v_dow = any(v_days)) then
    return format('Lớp chỉ cho dùng thiết bị vào %s.',
                  (select string_agg(public.ten_thu(d), ', ' order by d) from unnest(v_days) d));
  end if;

  if v_max is not null then
    -- Đếm NGÀY, không đếm tiết hay nhiệm vụ: hai tiết liền nhau, hay ba nhiệm vụ
    -- trong cùng một buổi, vẫn chỉ là một lần dùng thiết bị.
    -- Chờ duyệt CÓ tính (không thì em gửi tràn chờ duyệt rồi để thầy cô chọn),
    -- Từ chối KHÔNG tính.
    select count(distinct study_date), coalesce(bool_or(study_date = p_date), false)
      into v_used, v_co_roi
      from public.plans
     where student_id = p_student and use_device and device_status <> 'Từ chối'
       and study_date between v_tuan and v_tuan + 6
       and (p_plan is null or id <> p_plan);

    -- Ngày này đã có thiết bị rồi thì thêm nhiệm vụ nữa vẫn là cùng một lần.
    if not v_co_roi and v_used >= v_max then
      return format('Tuần này em đã dùng thiết bị đủ %s ngày — mức tối đa của lớp.', v_max);
    end if;
  end if;

  return null;
end;
$$;

-- Nhận mã học sinh tuỳ ý → gọi được thì dò ra ai đang bị cấm. Chỉ để các hàm
-- security definer bên dưới gọi.
revoke all on function public.device_rule_violation(uuid, uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.device_ban_until(uuid, date) from public, anon, authenticated;


-- ===========================================================================
--  E. CHẶN Ở CSDL KHI HỌC SINH ĐĂNG KÝ / BẬT THIẾT BỊ
-- ===========================================================================
-- Tên bắt đầu bằng "z" để chạy SAU trg_plans_set_class (trigger cùng loại chạy
-- theo thứ tự tên): lúc đó class_id và study_date mới được chép từ buổi xuống.
create or replace function public.enforce_device_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_loi text;
begin
  -- Service role (script, job nền) và giáo viên thì không chặn. Giáo viên vốn
  -- không bật được thiết bị hộ em (plans_guard_columns giữ nguyên use_device).
  if auth.uid() is null or auth.uid() is distinct from new.student_id then
    return new;
  end if;
  if not new.use_device then return new; end if;
  -- Nhiệm vụ đã dùng thiết bị từ trước: em sửa nội dung thì không xét lại,
  -- không thì thầy cô vừa hạ giới hạn là em không sửa nổi một chữ.
  if tg_op = 'UPDATE' and old.use_device then return new; end if;

  v_loi := public.device_rule_violation(new.student_id, new.class_id, new.study_date, new.id);
  if v_loi is not null then
    raise exception '%', v_loi using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_z_device_rules on public.plans;
create trigger trg_z_device_rules
before insert or update on public.plans
for each row execute function public.enforce_device_rules();

revoke all on function public.enforce_device_rules() from public, anon, authenticated;


-- ===========================================================================
--  F. MINH CHỨNG BẮT BUỘC — tách sang schema-18-minh-chung-tbdt.sql
-- ===========================================================================
-- Phần này PHÁ giao diện cũ: giao diện cũ lưu kết quả trước rồi mới đính kèm
-- minh chứng, nên luật "phải có minh chứng" chặn ngay bước đầu. Chạy nó trước
-- khi giao diện mới lên mạng là em nào đang cập nhật kết quả cũng bị chặn. Vì
-- vậy tách riêng, chỉ chạy SAU khi bản giao diện mới đã được đưa lên.


-- ===========================================================================
--  G. HÀM CHO GIAO DIỆN
-- ===========================================================================

-- Học sinh: tuần chứa p_date em đã dùng bao nhiêu ngày, được dùng thứ nào, có
-- đang bị cấm không, và ngày p_date có đăng ký thiết bị được không.
create or replace function public.my_device_quota(p_date date default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_date  date := coalesce(p_date, public.vn_today());
  v_class uuid := public.student_active_class(auth.uid());
  v_tuan  date := date_trunc('week', coalesce(p_date, public.vn_today()))::date;
  v_max   smallint; v_days smallint[]; v_used int;
  -- Hai biến vô hướng chứ không dùng một biến record: không có lệnh cấm nào thì
  -- đọc trường của record rỗng là lỗi "not assigned yet" — đã dính đúng lỗi này
  -- ở my_discipline_case.
  v_cam_den date; v_ly_do text;
begin
  if v_class is null then return null; end if;
  select device_days_per_week, device_weekdays into v_max, v_days
    from public.classes where id = v_class;

  select count(distinct study_date) into v_used
    from public.plans
   where student_id = v_uid and use_device and device_status <> 'Từ chối'
     and study_date between v_tuan and v_tuan + 6;

  -- Lệnh cấm đang hiệu lực HÔM NAY (không phải ngày p_date): băng cảnh báo trên
  -- trang chủ nói về hiện tại.
  select ends_on, reason into v_cam_den, v_ly_do
    from public.device_bans
   where student_id = v_uid and lifted_at is null
     and public.vn_today() between starts_on and ends_on
   order by ends_on desc limit 1;

  return json_build_object(
    'tuan_tu',      v_tuan::text,
    'tuan_den',     (v_tuan + 6)::text,
    'gioi_han',     v_max,
    'da_dung',      v_used,
    'thu_duoc_dung', v_days,
    'cam_den',      v_cam_den::text,
    'ly_do_cam',    v_ly_do,
    'ngay',         v_date::text,
    'loi',          public.device_rule_violation(v_uid, v_class, v_date, null)
  );
end;
$$;

-- Giáo viên: tuần chứa p_date, mỗi em dùng thiết bị bao nhiêu ngày, đang bị cấm
-- đến bao giờ.
create or replace function public.class_device_week(p_class uuid, p_date date default null)
returns table(student_id uuid, mshs text, full_name text, so_ngay int, cac_ngay date[],
              ban_id uuid, cam_den date, ly_do text, so_lan_vi_pham int)
language sql stable security definer set search_path = public as $$
  with tuan as (select date_trunc('week', coalesce(p_date, public.vn_today()))::date t)
  select s.claimed_user_id, s.mshs, s.full_name,
         coalesce(d.n, 0)::int, d.ngay,
         b.id, b.ends_on, b.reason,
         (select count(*) from public.device_bans x
           where x.student_id = s.claimed_user_id and x.class_id = p_class)::int
  from tuan
  join public.enrollments e on e.class_id = p_class and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(distinct p.study_date) n, array_agg(distinct p.study_date order by p.study_date) ngay
      from public.plans p
     where p.student_id = s.claimed_user_id and p.use_device and p.device_status <> 'Từ chối'
       and p.study_date between tuan.t and tuan.t + 6
  ) d on true
  left join lateral (
    select x.id, x.ends_on, x.reason from public.device_bans x
     where x.student_id = s.claimed_user_id and x.lifted_at is null
       and public.vn_today() between x.starts_on and x.ends_on
     order by x.ends_on desc limit 1
  ) b on true
  where public.teaches_class(p_class) or public.is_admin()
  order by s.full_name;
$$;

-- Ghi vi phạm: tạm dừng 7 ngày kể từ hôm nay, tự huỷ duyệt mọi buổi thiết bị
-- rơi vào khoảng đó, báo cho em biết.
--
-- Chỉ GVCN (teaches_class), không mở cho trợ giảng: đây là kỷ luật, là chuyện
-- giữa thầy cô, học sinh và gia đình — cùng lý do bạn trợ giảng không được thấy
-- mức kỷ luật của các bạn khác.
create or replace function public.record_device_violation(p_student uuid, p_reason text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_class uuid := public.student_active_class(p_student);
  v_tu    date := public.vn_today();
  v_den   date := public.vn_today() + 6;
  v_id    uuid;
  v_huy   int;
begin
  if v_class is null then
    raise exception 'Học sinh chưa được ghi danh vào lớp nào của năm học hiện hành.';
  end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới ghi được vi phạm.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Cần ghi lý do vi phạm.';
  end if;

  insert into public.device_bans (class_id, student_id, starts_on, ends_on, reason, created_by)
  values (v_class, p_student, v_tu, v_den, trim(p_reason), auth.uid())
  returning id into v_id;

  -- Huỷ duyệt các buổi thiết bị trong thời gian cấm. Đi qua plans_guard_columns
  -- với tư cách giáo viên (có quyền review_device) nên đồng bộ duyệt, ghi người
  -- duyệt và gửi thông báo y như khi thầy cô bấm "Từ chối" bằng tay.
  update public.plans
     set device_status = 'Từ chối',
         device_review_note = format('Tạm dừng dùng thiết bị đến hết ngày %s do vi phạm quy định.',
                                     to_char(v_den, 'DD/MM'))
   where student_id = p_student and use_device
     and device_status in ('Chờ duyệt', 'Đã duyệt')
     and study_date between v_tu and v_den;
  get diagnostics v_huy = row_count;

  insert into public.notifications (user_id, kind, title, body)
  values (p_student, 'device',
          'Tạm dừng dùng thiết bị đến hết ngày ' || to_char(v_den, 'DD/MM'),
          'Lý do: ' || trim(p_reason)
          || case when v_huy > 0 then format(' — %s nhiệm vụ đã đăng ký trong thời gian này bị huỷ duyệt.', v_huy) else '' end);

  return json_build_object('id', v_id, 'tu', v_tu::text, 'den', v_den::text, 'huy_duyet', v_huy);
end;
$$;

create or replace function public.lift_device_ban(p_ban uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_class uuid; v_student uuid;
begin
  select class_id, student_id into v_class, v_student
    from public.device_bans where id = p_ban and lifted_at is null;
  if v_class is null then raise exception 'Không tìm thấy lệnh tạm dừng đang có hiệu lực.'; end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới gỡ được.';
  end if;
  update public.device_bans set lifted_at = now(), lifted_by = auth.uid() where id = p_ban;
  -- Không tự khôi phục các buổi đã bị huỷ duyệt: em đăng ký lại, thầy cô duyệt
  -- lại. Tự bật lại thì thầy cô không biết buổi nào vừa sống lại.
  insert into public.notifications (user_id, kind, title, body)
  values (v_student, 'device', 'Em đã được dùng thiết bị trở lại',
          'Thầy cô đã gỡ lệnh tạm dừng. Buổi nào cần thiết bị thì em đăng ký lại nhé.');
end;
$$;

revoke all on function public.my_device_quota(date) from public, anon;
revoke all on function public.class_device_week(uuid, date) from public, anon;
revoke all on function public.record_device_violation(uuid, text) from public, anon;
revoke all on function public.lift_device_ban(uuid) from public, anon;
grant execute on function public.my_device_quota(date) to authenticated;
grant execute on function public.class_device_week(uuid, date) to authenticated;
grant execute on function public.record_device_violation(uuid, text) to authenticated;
grant execute on function public.lift_device_ban(uuid) to authenticated;


-- ===========================================================================
--  H. TỰ KIỂM
-- ===========================================================================
do $kiem$
declare n_trg int; n_ham int; v_on boolean;
begin
  select count(*) into n_trg from pg_trigger
   where tgname = 'trg_z_device_rules' and not tgisinternal;
  if n_trg <> 1 then raise exception 'Thiếu trigger trg_z_device_rules'; end if;

  select count(*) into n_ham from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and p.proname in ('record_attendance_misses', 'my_attendance_status', 'my_discipline_case',
                       'class_attendance_board', 'class_attendance_tracker')
     and p.prosrc like '%discipline_on()%';
  if n_ham <> 5 then raise exception 'Mới vá công tắc cho %/5 hàm kỷ luật', n_ham; end if;

  v_on := public.setting_bool('attendance_discipline_enabled', true);
  raise notice 'OK: trigger chặn TBĐT, 5 hàm kỷ luật đã gắn công tắc; kỷ luật quên đăng ký đang %.',
               case when v_on then 'BẬT' else 'TẮT' end;
end $kiem$;
