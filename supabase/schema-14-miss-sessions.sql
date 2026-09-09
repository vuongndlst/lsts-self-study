-- ============================================================================
--  ĐẾM THEO BUỔI, KHÔNG THEO TIẾT  —  chạy SAU schema-13-discipline.sql
-- ============================================================================
--  Trước đây mỗi TIẾT thiếu đăng ký là một lần quên. Nhưng giờ tự học thứ Sáu
--  gồm tiết 8 và tiết 9 liền nhau — em bỏ buổi đó bị tính hai lần, tức mất hai
--  phần ba quyền miễn trừ chỉ trong một buổi. Không đúng với ý định của quy
--  định: "quên đăng ký" là quên một BUỔI.
--
--  Đổi ở chỗ ĐẾM, không đổi ở chỗ GHI. Sổ attendance_misses vẫn lưu từng tiết:
--    · Đó là dữ kiện thô, xoá đi thì không dựng lại được.
--    · Lá thư báo phụ huynh cần nói rõ "tiết 8, 9" mới đối chiếu được.
--    · Lịch lớp đổi giữa năm cũng không làm số liệu cũ chạy theo.
--
--  Tiết LIỀN NHAU mới gộp. Nếu một ngày có tiết 3 và tiết 8 rời nhau thì đó là
--  hai buổi tự học khác nhau, tính hai lần — đúng như tên gọi.
--
--  Chạy lại bao nhiêu lần cũng được.
-- ============================================================================


-- ============================================================================
--  80. MỘT DÒNG = MỘT BUỔI
-- ============================================================================
-- Thủ thuật "gap and islands": lấy số tiết trừ đi thứ tự chạy trong ngày. Các
-- tiết liền nhau (8, 9) cho ra cùng một hiệu số, tiết rời (3 rồi 8) cho ra hiệu
-- số khác — nên gom theo hiệu số là ra đúng từng dải liền mạch.
--
-- period NULL nghĩa là miễn/quên cả ngày; quy về 0 để nó thành một dải riêng.
create or replace view public.attendance_miss_sessions as
with x as (
  select am.class_id, am.mshs, am.study_date,
         coalesce(am.period, 0) as period,
         coalesce(am.period, 0)
           - row_number() over (partition by am.class_id, am.mshs, am.study_date
                                order by coalesce(am.period, 0))::int as dai
  from public.attendance_misses am
)
select class_id, mshs, study_date,
       array_agg(period order by period) filter (where period > 0) as cac_tiet,
       count(*)::int as so_tiet
from x
group by class_id, mshs, study_date, dai;

comment on view public.attendance_miss_sessions is
  'Moi dong la MOT buoi tu hoc bi quen. Cac tiet lien nhau da duoc gom lai.';

-- Không mở cho ai gọi thẳng: mọi hàm đọc nó đều là security definer và đã tự
-- kiểm quyền. View này bỏ qua RLS của bảng gốc nên để lọt là lộ cả trường.
revoke all on public.attendance_miss_sessions from anon, authenticated, public;


-- ============================================================================
--  81. THẺ CỦA HỌC SINH
-- ============================================================================
create or replace function public.my_attendance_status()
returns json language plpgsql stable security definer set search_path = public as $fn$
declare
  v_class uuid; v_mshs text; v_uid uuid := auth.uid();
  pol record; b record; v_today date := public.vn_today();
  v_slots int; v_missing int; v_misses int;
begin
  v_mshs  := public.my_mshs();
  v_class := public.student_active_class(v_uid);
  if v_class is null or v_mshs is null then return null; end if;

  select * into pol from public.attendance_policy where class_id = v_class;
  if pol is null or not pol.enabled then return null; end if;

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
$fn$;


-- ============================================================================
--  82. BẢNG KỶ LUẬT CỦA GIÁO VIÊN
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
  where pol.class_id = p_class and pol.enabled and public.teaches_class(p_class)
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  83. BẢNG CỦA BẠN ĐI NHẮC
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
    select count(*) n, max(ms.study_date) gan_nhat
    from public.attendance_miss_sessions ms
    where ms.class_id = pol.class_id and ms.mshs = s.mshs
      and ms.study_date >= b.tu_ngay
      and (b.den_ngay is null or ms.study_date <= b.den_ngay)
  ) m on true
  where pol.class_id = p_class and pol.enabled
    and public.staff_perm(p_class, 'track_attendance')
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  84. SỔ LAO ĐỘNG CÔNG ÍCH
-- ============================================================================
-- Bỏ cột so_buoi: nay số buổi CHÍNH LÀ số lần quên, giữ lại hai con số bằng
-- nhau chỉ khiến người đọc tưởng chúng khác nhau.
drop function if exists public.class_discipline_board(uuid);
create function public.class_discipline_board(p_class uuid)
returns table (
  mshs text, full_name text, so_lan_quen int, bac int, nhan text,
  luot_phai_lam int, luot_da_lam int, con_no int,
  -- [{"ngay":"2026-09-04","tiet":[8,9]}, …] — mỗi phần tử là MỘT buổi, nên số
  -- phần tử luôn khớp với so_lan_quen. Thư liệt kê ra là phụ huynh đếm được.
  cac_ngay_quen jsonb, lan_gan_nhat date,
  da_bao_ph timestamptz, da_bao_hs timestamptz,
  due_on date, ghi_chu text, hoc_ky text, tu_ngay date
) language sql stable security definer set search_path = public as $fn$
  with b as (select * from public.term_bounds(p_class))
  select s.mshs, s.full_name,
         coalesce(m.n, 0)::int,
         (public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'bac')::int,
         public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'nhan',
         public.labor_quota((public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'bac')::int)::int,
         coalesce(dc.labor_done, 0)::int,
         greatest(
           public.labor_quota((public.attendance_level(coalesce(m.n, 0)::int, pol.free_passes)->>'bac')::int)
           - coalesce(dc.labor_done, 0), 0)::int,
         coalesce(m.chi_tiet, '[]'::jsonb),
         m.gan_nhat,
         dc.parent_notified_at, dc.student_notified_at,
         dc.due_on, dc.note, b.ten, b.tu_ngay
  from public.attendance_policy pol
  cross join b
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*)::int n, max(ms.study_date) gan_nhat,
           jsonb_agg(jsonb_build_object('ngay', ms.study_date, 'tiet', ms.cac_tiet)
                     order by ms.study_date, ms.cac_tiet) chi_tiet
    from public.attendance_miss_sessions ms
    where ms.class_id = pol.class_id and ms.mshs = s.mshs
      and ms.study_date >= b.tu_ngay
      and (b.den_ngay is null or ms.study_date <= b.den_ngay)
  ) m on true
  left join public.discipline_cases dc
    on dc.class_id = pol.class_id and dc.mshs = s.mshs and dc.term_from = b.tu_ngay
  where pol.class_id = p_class and pol.enabled and public.teaches_class(p_class)
    and coalesce(m.n, 0) > pol.free_passes
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  85. GHI LƯỢT — ĐẾM LẠI CHO KHỚP
-- ============================================================================
-- Hàm này tự đếm số lần quên để biết định mức. Không sửa ở đây thì nó vẫn đếm
-- theo tiết, và sẽ cho ghi nhiều lượt hơn bảng hiển thị.
create or replace function public.set_labor_done(
  p_class uuid, p_mshs text, p_done int,
  p_due date default null, p_note text default null
) returns json language plpgsql security definer set search_path = public as $fn$
declare v_term date; v_quota int; v_bac int; v_misses int; pol record;
begin
  if not public.teaches_class(p_class) then
    raise exception 'Thầy/cô không phụ trách lớp này.';
  end if;
  if p_done is null or p_done < 0 or p_done > 50 then
    raise exception 'Số lượt phải từ 0 đến 50.';
  end if;

  select * into pol from public.attendance_policy where class_id = p_class;
  if pol is null or not pol.enabled then
    raise exception 'Lớp chưa bật phần kỷ luật quên đăng ký.';
  end if;
  select tu_ngay into v_term from public.term_bounds(p_class);

  select count(*) into v_misses
    from public.attendance_miss_sessions ms
   where ms.class_id = p_class and ms.mshs = p_mshs and ms.study_date >= v_term;
  v_bac   := (public.attendance_level(v_misses, pol.free_passes)->>'bac')::int;
  v_quota := public.labor_quota(v_bac);

  if p_done > v_quota then
    raise exception 'Em này chỉ phải làm % lượt, không ghi được % lượt.', v_quota, p_done;
  end if;

  insert into public.discipline_cases (class_id, mshs, term_from, labor_done, due_on, note, created_by)
  values (p_class, p_mshs, v_term, p_done, p_due, nullif(trim(coalesce(p_note,'')),''), auth.uid())
  on conflict (class_id, mshs, term_from) do update
    set labor_done = excluded.labor_done,
        due_on     = coalesce(excluded.due_on, discipline_cases.due_on),
        note       = coalesce(excluded.note,   discipline_cases.note),
        updated_at = now();

  return json_build_object('ok', true, 'da_lam', p_done, 'phai_lam', v_quota,
                           'con_no', greatest(v_quota - p_done, 0));
end;
$fn$;


-- ============================================================================
--  86. HỌC SINH XEM PHẦN CỦA MÌNH
-- ============================================================================
create or replace function public.my_discipline_case()
returns json language plpgsql stable security definer set search_path = public as $fn$
declare
  v_class uuid; v_mshs text; v_uid uuid := auth.uid();
  pol record; b record; v_misses int; v_bac int; v_quota int;
  v_done int; v_due date; v_ph timestamptz;
begin
  v_mshs  := public.my_mshs();
  v_class := public.student_active_class(v_uid);
  if v_class is null or v_mshs is null then return null; end if;

  select * into pol from public.attendance_policy where class_id = v_class;
  if pol is null or not pol.enabled then return null; end if;
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
$fn$;


-- ============================================================================
--  87. QUYỀN
-- ============================================================================
do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('my_attendance_status','class_attendance_board',
                        'class_attendance_tracker','class_discipline_board',
                        'set_labor_done','my_discipline_case')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;

notify pgrst, 'reload schema';
