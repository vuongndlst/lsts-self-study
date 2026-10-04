-- ===========================================================================
--  17. THANG XỬ LÝ VI PHẠM THIẾT BỊ ĐIỆN TỬ
-- ===========================================================================
--
-- Bổ sung cho schema-16, theo yêu cầu của GVCN (10/2026):
--
--   Ghi lại SỐ LẦN vi phạm, hai loại:
--     · không đăng ký mà tự ý dùng thiết bị;
--     · dùng thiết bị sai mục đích.
--
--   Mỗi lần xử lý ĐỘC LẬP, không cộng dồn:
--     Lần 1        cấm dùng thiết bị 1 tuần   + 5 lượt lao động công ích
--     Lần 2        cấm 2 tuần                 + 10 lượt
--     Lần 3        cấm 1 tháng                + 20 lượt
--     Lần 4 trở đi mời phụ huynh, kèm mức của lần 3 (cấm 1 tháng + 20 lượt)
--
--   "Độc lập" nghĩa là lần 2 phải làm 10 lượt của riêng lần 2 — không phải 5
--   cộng 10, và lượt còn nợ của lần 1 không dồn sang. Mỗi lần có sổ riêng.
--
--   Lần 4 không bỏ cấm: mời phụ huynh mà em lại được dùng thiết bị sớm hơn lần
--   3 thì ngược đời. Muốn đổi thang thì sửa đúng một hàm device_penalty().
--
-- Đếm trong một LỚP (tức một năm học). Lần ghi nhầm thì HUỶ — huỷ rồi không
-- tính vào số lần, nhưng vẫn giữ dòng để còn dấu vết.
--
-- Tương thích ngược: chỉ thêm cột (có mặc định), thêm hàm; viết lại các hàm
-- của schema-16 mà giao diện chưa dùng tới. Chạy trước giao diện mới được.
--
-- Chạy:  node scripts/db.mjs . supabase/schema-17-vi-pham-tbdt.sql
-- Thử:   node scripts/thu-tbdt.mjs


-- ===========================================================================
--  A. CỘT MỚI CHO SỔ VI PHẠM
-- ===========================================================================
alter table public.device_bans add column if not exists kind text not null default 'sai_muc_dich';
alter table public.device_bans add column if not exists lan smallint not null default 1;
alter table public.device_bans add column if not exists labor_required smallint not null default 0;
alter table public.device_bans add column if not exists labor_done smallint not null default 0;
alter table public.device_bans add column if not exists parent_invite boolean not null default false;
alter table public.device_bans add column if not exists parent_notified_at timestamptz;
alter table public.device_bans add column if not exists cancelled_at timestamptz;
alter table public.device_bans add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;

do $rang_buoc$ begin
  alter table public.device_bans drop constraint if exists device_bans_kind_check;
  alter table public.device_bans add constraint device_bans_kind_check
    check (kind in ('khong_dang_ky', 'sai_muc_dich'));
  alter table public.device_bans drop constraint if exists device_bans_lan_check;
  alter table public.device_bans add constraint device_bans_lan_check check (lan >= 1);
  alter table public.device_bans drop constraint if exists device_bans_labor_check;
  alter table public.device_bans add constraint device_bans_labor_check
    check (labor_required >= 0 and labor_done between 0 and labor_required);
end $rang_buoc$;

comment on column public.device_bans.lan is
  'Lần vi phạm thứ mấy của em trong lớp này, tính lúc ghi (không đếm lần đã huỷ).';
comment on column public.device_bans.cancelled_at is
  'Ghi nhầm thì huỷ: không tính vào số lần, không còn cấm, nhưng dòng vẫn giữ.';


-- ===========================================================================
--  B. THANG XỬ LÝ — MỘT HÀM DUY NHẤT
-- ===========================================================================
-- Giao diện (bảng quy định, lời báo trước khi bấm) và hàm ghi vi phạm đều đọc
-- từ đây, nên đổi thang chỉ sửa một chỗ.
create or replace function public.device_penalty(p_lan int)
returns json language sql immutable as $$
  select case
    when p_lan <= 1 then json_build_object('lan', 1, 'cam', '7 days',  'thoi_gian', '1 tuần',
                                           'lao_dong', 5,  'moi_ph', false)
    when p_lan = 2  then json_build_object('lan', 2, 'cam', '14 days', 'thoi_gian', '2 tuần',
                                           'lao_dong', 10, 'moi_ph', false)
    when p_lan = 3  then json_build_object('lan', 3, 'cam', '1 month', 'thoi_gian', '1 tháng',
                                           'lao_dong', 20, 'moi_ph', false)
    else                 json_build_object('lan', p_lan, 'cam', '1 month', 'thoi_gian', '1 tháng',
                                           'lao_dong', 20, 'moi_ph', true)
  end;
$$;

create or replace function public.device_kind_label(p_kind text)
returns text language sql immutable as $$
  select case p_kind
    when 'khong_dang_ky' then 'Dùng thiết bị khi chưa đăng ký'
    when 'sai_muc_dich'  then 'Dùng thiết bị sai mục đích'
    else p_kind end;
$$;

grant execute on function public.device_penalty(int) to authenticated;
grant execute on function public.device_kind_label(text) to authenticated;

-- Số lần đã vi phạm (không tính lần đã huỷ) của em trong lớp.
create or replace function public.device_violation_count(p_student uuid, p_class uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.device_bans
   where student_id = p_student and class_id = p_class and cancelled_at is null;
$$;
revoke all on function public.device_violation_count(uuid, uuid) from public, anon, authenticated;


-- ===========================================================================
--  C. GHI VI PHẠM
-- ===========================================================================
-- Bản cũ của schema-16 nhận (học sinh, lý do). Bỏ đi để không có hai bản cùng
-- tên mà khác luật — giao diện chưa từng gọi bản cũ.
drop function if exists public.record_device_violation(uuid, text);

create or replace function public.record_device_violation(
  p_student uuid, p_kind text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_class   uuid := public.student_active_class(p_student);
  v_today   date := public.vn_today();
  v_lan     int;
  v_pen     json;
  v_dang_cam date;
  v_tu      date;
  v_den     date;
  v_ly_do   text;
  v_id      uuid;
  v_huy     int;
begin
  if v_class is null then
    raise exception 'Học sinh chưa được ghi danh vào lớp nào của năm học hiện hành.';
  end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới ghi được vi phạm.';
  end if;
  if p_kind is null or p_kind not in ('khong_dang_ky', 'sai_muc_dich') then
    raise exception 'Cần chọn loại vi phạm: chưa đăng ký mà tự ý dùng, hoặc dùng sai mục đích.';
  end if;

  v_lan := public.device_violation_count(p_student, v_class) + 1;
  v_pen := public.device_penalty(v_lan);

  -- Đang bị cấm mà vi phạm tiếp thì lần cấm mới nối ĐUÔI lần cũ, không chồng
  -- lên nhau — chồng lên thì em bị cấm 2 tuần mà thực chất chỉ thêm vài ngày.
  select max(ends_on) into v_dang_cam from public.device_bans
   where student_id = p_student and lifted_at is null and ends_on >= v_today;
  v_tu  := greatest(v_today, coalesce(v_dang_cam + 1, v_today));
  v_den := (v_tu + (v_pen->>'cam')::interval)::date - 1;

  v_ly_do := public.device_kind_label(p_kind)
             || coalesce(': ' || nullif(trim(p_note), ''), '');
  if char_length(v_ly_do) > 500 then v_ly_do := left(v_ly_do, 500); end if;

  insert into public.device_bans (class_id, student_id, starts_on, ends_on, reason, created_by,
                                  kind, lan, labor_required, parent_invite)
  values (v_class, p_student, v_tu, v_den, v_ly_do, auth.uid(),
          p_kind, v_lan, (v_pen->>'lao_dong')::int, (v_pen->>'moi_ph')::boolean)
  returning id into v_id;

  -- Huỷ duyệt các buổi thiết bị từ hôm nay tới hết thời gian cấm. Đi qua
  -- plans_guard_columns với tư cách giáo viên (có quyền review_device) nên đồng
  -- bộ duyệt, ghi người duyệt và gửi thông báo y như khi bấm "Từ chối" bằng tay.
  update public.plans
     set device_status = 'Từ chối',
         device_review_note = format('Tạm dừng dùng thiết bị đến hết ngày %s do vi phạm quy định (lần %s).',
                                     to_char(v_den, 'DD/MM'), v_lan)
   where student_id = p_student and use_device
     and device_status in ('Chờ duyệt', 'Đã duyệt')
     and study_date between v_today and v_den;
  get diagnostics v_huy = row_count;

  insert into public.notifications (user_id, kind, title, body)
  values (p_student, 'device',
          format('Vi phạm thiết bị lần %s: tạm dừng đến hết ngày %s', v_lan, to_char(v_den, 'DD/MM')),
          'Lý do: ' || v_ly_do
          || format('. Em bị tạm dừng dùng thiết bị %s', v_pen->>'thoi_gian')
          || format(' và cần thực hiện %s lượt lao động công ích.', v_pen->>'lao_dong')
          || case when (v_pen->>'moi_ph')::boolean
                  then ' Thầy cô sẽ mời phụ huynh lên trao đổi.' else '' end
          || case when v_huy > 0
                  then format(' %s nhiệm vụ đã đăng ký trong thời gian này bị huỷ duyệt.', v_huy)
                  else '' end);

  return json_build_object('id', v_id, 'lan', v_lan, 'tu', v_tu::text, 'den', v_den::text,
                           'thoi_gian', v_pen->>'thoi_gian', 'lao_dong', (v_pen->>'lao_dong')::int,
                           'moi_ph', (v_pen->>'moi_ph')::boolean, 'huy_duyet', v_huy);
end;
$$;

revoke all on function public.record_device_violation(uuid, text, text) from public, anon;
grant execute on function public.record_device_violation(uuid, text, text) to authenticated;


-- ===========================================================================
--  D. GỠ CẤM / HUỶ LẦN GHI NHẦM / SỔ LAO ĐỘNG / ĐÃ BÁO PHỤ HUYNH
-- ===========================================================================
-- Gỡ cấm = cho em dùng thiết bị lại sớm. Vi phạm VẪN TÍNH, lượt lao động vẫn nợ.
-- Gỡ hết các lần cấm còn hiệu lực của em, kể cả lần đã nối đuôi — bấm "gỡ" mà
-- hôm sau em vẫn bị chặn vì lần nối đuôi thì không ai hiểu nổi.
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
  update public.device_bans set lifted_at = now(), lifted_by = auth.uid()
   where student_id = v_student and lifted_at is null and ends_on >= public.vn_today();
  -- Không tự khôi phục các buổi đã bị huỷ duyệt: em đăng ký lại, thầy cô duyệt
  -- lại. Tự bật lại thì thầy cô không biết buổi nào vừa sống lại.
  insert into public.notifications (user_id, kind, title, body)
  values (v_student, 'device', 'Em đã được dùng thiết bị trở lại',
          'Thầy cô đã gỡ lệnh tạm dừng. Buổi nào cần thiết bị thì em đăng ký lại nhé.');
end;
$$;

-- Huỷ = ghi nhầm. Khác gỡ cấm: lần này không tính vào số lần, không nợ lao động.
create or replace function public.cancel_device_violation(p_ban uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_class uuid; v_student uuid; v_lan int;
begin
  select class_id, student_id, lan into v_class, v_student, v_lan
    from public.device_bans where id = p_ban and cancelled_at is null;
  if v_class is null then raise exception 'Không tìm thấy lần vi phạm này, hoặc nó đã được huỷ.'; end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới huỷ được.';
  end if;
  update public.device_bans
     set cancelled_at = now(), cancelled_by = auth.uid(),
         lifted_at = coalesce(lifted_at, now()), lifted_by = coalesce(lifted_by, auth.uid())
   where id = p_ban;
  insert into public.notifications (user_id, kind, title, body)
  values (v_student, 'device', format('Đã huỷ vi phạm thiết bị lần %s', v_lan),
          'Thầy cô đã huỷ lần ghi vi phạm này (ghi nhầm). Lần đó không còn tính, em không phải lao động cho lần đó.');
end;
$$;

create or replace function public.set_device_labor_done(p_ban uuid, p_done int)
returns void language plpgsql security definer set search_path = public as $$
declare v_class uuid; v_max int;
begin
  select class_id, labor_required into v_class, v_max
    from public.device_bans where id = p_ban and cancelled_at is null;
  if v_class is null then raise exception 'Không tìm thấy lần vi phạm này.'; end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới ghi được.';
  end if;
  if p_done is null or p_done < 0 or p_done > v_max then
    raise exception 'Số lượt đã làm phải từ 0 đến %.', v_max;
  end if;
  update public.device_bans set labor_done = p_done where id = p_ban;
end;
$$;

create or replace function public.mark_device_parent_notified(p_ban uuid, p_done boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_class uuid;
begin
  select class_id into v_class from public.device_bans where id = p_ban and cancelled_at is null;
  if v_class is null then raise exception 'Không tìm thấy lần vi phạm này.'; end if;
  if not public.teaches_class(v_class) then
    raise exception 'Chỉ giáo viên chủ nhiệm lớp mới ghi được.';
  end if;
  update public.device_bans
     set parent_notified_at = case when p_done then now() else null end
   where id = p_ban;
end;
$$;

revoke all on function public.cancel_device_violation(uuid) from public, anon;
revoke all on function public.set_device_labor_done(uuid, int) from public, anon;
revoke all on function public.mark_device_parent_notified(uuid, boolean) from public, anon;
grant execute on function public.cancel_device_violation(uuid) to authenticated;
grant execute on function public.set_device_labor_done(uuid, int) to authenticated;
grant execute on function public.mark_device_parent_notified(uuid, boolean) to authenticated;


-- ===========================================================================
--  E. HÀM CHO GIAO DIỆN — viết lại bản của schema-16
-- ===========================================================================

-- Học sinh. Thêm: số lần vi phạm, lượt lao động còn nợ, lần tới bị xử thế nào.
-- cam_den = ngày cuối của chuỗi cấm (kể cả lần nối đuôi), không phải lần đầu.
create or replace function public.my_device_quota(p_date date default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_date  date := coalesce(p_date, public.vn_today());
  v_class uuid := public.student_active_class(auth.uid());
  v_tuan  date := date_trunc('week', coalesce(p_date, public.vn_today()))::date;
  v_max   smallint; v_days smallint[]; v_used int;
  -- Biến vô hướng chứ không dùng record: không có lệnh cấm nào thì đọc trường
  -- của record rỗng là lỗi "not assigned yet" — đã dính ở my_discipline_case.
  v_cam_den date; v_ly_do text; v_lan int; v_no int;
begin
  if v_class is null then return null; end if;
  select device_days_per_week, device_weekdays into v_max, v_days
    from public.classes where id = v_class;

  select count(distinct study_date) into v_used
    from public.plans
   where student_id = v_uid and use_device and device_status <> 'Từ chối'
     and study_date between v_tuan and v_tuan + 6;

  if public.device_ban_until(v_uid, public.vn_today()) is not null then
    select max(ends_on) into v_cam_den from public.device_bans
     where student_id = v_uid and lifted_at is null and ends_on >= public.vn_today();
    select reason into v_ly_do from public.device_bans
     where student_id = v_uid and lifted_at is null and ends_on >= public.vn_today()
     order by created_at desc limit 1;
  end if;

  v_lan := public.device_violation_count(v_uid, v_class);
  select coalesce(sum(labor_required - labor_done), 0) into v_no
    from public.device_bans
   where student_id = v_uid and class_id = v_class and cancelled_at is null;

  return json_build_object(
    'tuan_tu',        v_tuan::text,
    'tuan_den',       (v_tuan + 6)::text,
    'gioi_han',       v_max,
    'da_dung',        v_used,
    'thu_duoc_dung',  v_days,
    'cam_den',        v_cam_den::text,
    'ly_do_cam',      v_ly_do,
    'ngay',           v_date::text,
    'loi',            public.device_rule_violation(v_uid, v_class, v_date, null),
    'so_lan_vi_pham', v_lan,
    'lao_dong_con_no', v_no,
    'lan_toi',        public.device_penalty(v_lan + 1)
  );
end;
$$;

-- Giáo viên: bảng tuần. Đổi kiểu trả về nên phải drop.
drop function if exists public.class_device_week(uuid, date);
create or replace function public.class_device_week(p_class uuid, p_date date default null)
returns table(student_id uuid, mshs text, full_name text, so_ngay int, cac_ngay date[],
              ban_id uuid, cam_den date, ly_do text,
              so_lan_vi_pham int, lao_dong_con_no int, chua_bao_ph boolean)
language sql stable security definer set search_path = public as $$
  with tuan as (select date_trunc('week', coalesce(p_date, public.vn_today()))::date t)
  select s.claimed_user_id, s.mshs, s.full_name,
         coalesce(d.n, 0)::int, d.ngay,
         b.id, b.den, b.reason,
         coalesce(v.n, 0)::int, coalesce(v.no, 0)::int, coalesce(v.chua_bao, false)
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
    -- Lần đang hiệu lực hôm nay; cam_den là cuối chuỗi (kể cả lần nối đuôi).
    select x.id, x.reason,
           (select max(y.ends_on) from public.device_bans y
             where y.student_id = s.claimed_user_id and y.lifted_at is null
               and y.ends_on >= public.vn_today()) den
      from public.device_bans x
     where x.student_id = s.claimed_user_id and x.lifted_at is null
       and public.vn_today() between x.starts_on and x.ends_on
     order by x.ends_on desc limit 1
  ) b on true
  left join lateral (
    select count(*) n, sum(x.labor_required - x.labor_done) no,
           bool_or(x.parent_invite and x.parent_notified_at is null) chua_bao
      from public.device_bans x
     where x.student_id = s.claimed_user_id and x.class_id = p_class and x.cancelled_at is null
  ) v on true
  where public.teaches_class(p_class) or public.is_admin()
  order by s.full_name;
$$;

-- Giáo viên: sổ vi phạm của cả lớp, mới nhất trước. Kể cả lần đã huỷ (ghi rõ).
create or replace function public.class_device_violations(p_class uuid)
returns table(id uuid, student_id uuid, mshs text, full_name text, lan int, kind text, ly_do text,
              tu date, den date, lao_dong int, da_lam int, moi_ph boolean, da_bao_ph timestamptz,
              ghi_luc timestamptz, go_luc timestamptz, huy_luc timestamptz)
language sql stable security definer set search_path = public as $$
  select x.id, x.student_id, s.mshs, s.full_name, x.lan::int, x.kind, x.reason,
         x.starts_on, x.ends_on, x.labor_required::int, x.labor_done::int, x.parent_invite,
         x.parent_notified_at, x.created_at, x.lifted_at, x.cancelled_at
    from public.device_bans x
    join public.students s on s.claimed_user_id = x.student_id
   where x.class_id = p_class
     and (public.teaches_class(p_class) or public.is_admin())
   order by x.created_at desc;
$$;

revoke all on function public.class_device_week(uuid, date) from public, anon;
revoke all on function public.class_device_violations(uuid) from public, anon;
grant execute on function public.my_device_quota(date) to authenticated;
grant execute on function public.class_device_week(uuid, date) to authenticated;
grant execute on function public.class_device_violations(uuid) to authenticated;


-- ===========================================================================
--  F. TỰ KIỂM
-- ===========================================================================
do $kiem$
declare n int;
begin
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'record_device_violation';
  if n <> 1 then raise exception 'record_device_violation: có % bản, phải đúng 1', n; end if;
  if (public.device_penalty(1)->>'lao_dong')::int <> 5
     or (public.device_penalty(2)->>'lao_dong')::int <> 10
     or (public.device_penalty(3)->>'lao_dong')::int <> 20
     or not (public.device_penalty(4)->>'moi_ph')::boolean then
    raise exception 'Thang xử lý sai';
  end if;
  raise notice 'OK: thang xử lý vi phạm TBĐT 1 tuần/5 · 2 tuần/10 · 1 tháng/20 · lần 4 mời PH.';
end $kiem$;
