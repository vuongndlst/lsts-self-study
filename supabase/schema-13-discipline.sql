-- ============================================================================
--  QUẢN LÝ LAO ĐỘNG CÔNG ÍCH + THƯ BÁO PHỤ HUYNH
--  chạy SAU schema-12-test-accounts.sql
-- ============================================================================
--  Hệ thống đang dừng ở chỗ NÓI ra mức kỷ luật: "5 lượt lao động công ích".
--  Nói xong rồi thôi — không ai biết em đã làm được mấy lượt, còn nợ mấy lượt,
--  và phụ huynh đã được báo chưa. Thầy cô phải nhớ trong đầu hoặc ghi ra giấy.
--
--  Hai thứ thêm ở đây:
--    1. SỔ THEO DÕI: mỗi em một hồ sơ trong học kỳ, đếm lượt đã làm / còn nợ.
--    2. DẤU MỐC "đã báo phụ huynh / học sinh lúc nào".
--
--  Email thì KHÔNG lưu gì cả: cả email học sinh lẫn email phụ huynh đều suy ra
--  được từ MSHS theo quy tắc chung của trường.
--
--  Số lượt PHẢI LÀM thì KHÔNG lưu — nó suy ra từ số lần quên hiện tại. Lưu lại
--  là sai: thầy cô miễn buổi cho em sau đó (em xin phép muộn), số lần quên giảm,
--  mà con số trong sổ vẫn đứng yên. Chỉ LƯỢT ĐÃ LÀM mới là dữ kiện có thật.
--
--  Chạy lại bao nhiêu lần cũng được.
-- ============================================================================


-- ============================================================================
--  70. KHÔNG LƯU EMAIL PHỤ HUYNH
-- ============================================================================
-- Toàn trường theo một quy tắc: MSHS 2406119 → p2406119@parent.lsts.edu.vn.
-- Suy ra được thì không lưu. Lưu vào đây là tạo ra nguồn sự thật thứ hai —
-- trường đổi tên miền là bảng cũ thành sai mà không ai biết để sửa. Quy tắc
-- nằm ở một chỗ duy nhất: parentEmail() trong src/lib/supabase.js.
--
-- Dọn lại nếu đã lỡ chạy bản trước của file này. Cột chưa từng có giao diện
-- nhập nào ngoài hộp soạn thư vừa gỡ, nên không mất dữ liệu của ai.
drop function if exists public.set_parent_contact(uuid, text, text, text);
do $mig$ begin
  alter table public.students drop constraint if exists parent_email_shape;
  alter table public.students drop column if exists parent_email;
  alter table public.students drop column if exists parent_name;
end $mig$;


-- ============================================================================
--  71. SỔ LAO ĐỘNG CÔNG ÍCH
-- ============================================================================
-- Một dòng cho MỖI EM trong MỖI HỌC KỲ, không phải mỗi lần vi phạm. Vì bậc kỷ
-- luật không cộng dồn: quên lần thứ 5 là "10 lượt", không phải 5 + 10. Nếu ghi
-- mỗi lần vi phạm một dòng thì cộng lại sẽ ra con số sai.
create table if not exists public.discipline_cases (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  mshs          text not null references public.students(mshs) on delete cascade,
  -- Mốc đầu học kỳ tại thời điểm mở hồ sơ: sang kỳ sau em làm lại từ đầu.
  term_from     date not null,

  labor_done    smallint not null default 0 check (labor_done between 0 and 50),
  -- Ngày hẹn hoàn thành, để thầy cô còn đòi.
  due_on        date,

  parent_notified_at  timestamptz,
  student_notified_at timestamptz,
  notified_by         uuid references public.profiles(id) on delete set null,

  note        text check (note is null or char_length(note) <= 1000),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, mshs, term_from)
);

create index if not exists discipline_cases_class_idx
  on public.discipline_cases (class_id, term_from);

comment on table public.discipline_cases is
  'So theo doi lao dong cong ich. So luot PHAI lam khong luu o day — suy ra tu so lan quen.';


-- ============================================================================
--  72. SỐ LƯỢT THEO BẬC
-- ============================================================================
-- Một chỗ duy nhất định nghĩa hình phạt, để đổi thì đổi ở đây.
--   bậc 1 (quên lần thứ 4) → 5 lượt
--   bậc 2 (lần thứ 5)      → 10 lượt
--   bậc 3 (lần thứ 6 trở đi) → 10 lượt VÀ mời phụ huynh
create or replace function public.labor_quota(p_bac int)
returns smallint language sql immutable as $fn$
  select case coalesce(p_bac, 0) when 1 then 5 when 2 then 10 when 3 then 10
                                 else 0 end::smallint;
$fn$;


-- ============================================================================
--  73. BẢNG THEO DÕI CỦA GIÁO VIÊN
-- ============================================================================
-- Trả về đủ để dựng cả bảng lẫn lá thư trong một lượt gọi: số lần quên, bậc,
-- lượt phải làm / đã làm / còn nợ, và các NGÀY đã quên — thư phải nêu ngày cụ
-- thể thì phụ huynh mới đối chiếu được.
-- Phải DROP: bản trước có thêm hai cột parent_*, mà Postgres không cho đổi kiểu
-- trả về của hàm đang tồn tại. Quyền mất theo nên mục 79 phải cấp lại.
drop function if exists public.class_discipline_board(uuid);
create function public.class_discipline_board(p_class uuid)
returns table (
  mshs text, full_name text, so_lan_quen int, bac int, nhan text,
  luot_phai_lam int, luot_da_lam int, con_no int,
  cac_ngay_quen date[], lan_gan_nhat date,
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
         coalesce(m.ngay, '{}'::date[]),
         m.gan_nhat,
         -- Email học sinh và email phụ huynh KHÔNG trả ở đây: cả hai suy ra từ
         -- MSHS, và quy tắc đã khai một lần trong src/lib/supabase.js. Khai lần
         -- thứ hai trong SQL là để hai chỗ lệch nhau về sau.
         dc.parent_notified_at, dc.student_notified_at,
         dc.due_on, dc.note, b.ten, b.tu_ngay
  from public.attendance_policy pol
  cross join b
  join public.enrollments e on e.class_id = pol.class_id and e.is_active
  join public.students   s on s.mshs = e.mshs and not s.is_test
  left join lateral (
    select count(*) n, max(am.study_date) gan_nhat,
           array_agg(distinct am.study_date order by am.study_date) ngay
    from public.attendance_misses am
    where am.class_id = pol.class_id and am.mshs = s.mshs
      and am.study_date >= b.tu_ngay
      and (b.den_ngay is null or am.study_date <= b.den_ngay)
  ) m on true
  left join public.discipline_cases dc
    on dc.class_id = pol.class_id and dc.mshs = s.mshs and dc.term_from = b.tu_ngay
  where pol.class_id = p_class and pol.enabled and public.teaches_class(p_class)
    and coalesce(m.n, 0) > pol.free_passes
  order by coalesce(m.n, 0) desc, s.full_name;
$fn$;


-- ============================================================================
--  74. GHI LƯỢT ĐÃ LÀM
-- ============================================================================
-- Không có nút "+1" ở backend mà nhận thẳng con số: thầy cô hay ghi bù cho cả
-- tuần một lượt, và bấm +1 năm lần thì lần mất mạng giữa chừng là sai số.
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
    from public.attendance_misses am
   where am.class_id = p_class and am.mshs = p_mshs and am.study_date >= v_term;
  v_bac   := (public.attendance_level(v_misses, pol.free_passes)->>'bac')::int;
  v_quota := public.labor_quota(v_bac);

  -- Chặn ghi quá số lượt được giao: con số này về sau dùng để đối chiếu với
  -- phụ huynh, không được phép vô lý.
  if p_done > v_quota then
    raise exception 'Em này chỉ phải làm % lượt, không ghi được % lượt.', v_quota, p_done;
  end if;

  insert into public.discipline_cases (class_id, mshs, term_from, labor_done, due_on, note, created_by)
  values (p_class, p_mshs, v_term, p_done, p_due, nullif(trim(coalesce(p_note,'')),''), auth.uid())
  -- Trong ON CONFLICT, dòng đang có được gọi bằng TÊN BẢNG KHÔNG kèm schema.
  -- Viết public.discipline_cases.due_on ở đây là lỗi "missing FROM-clause entry".
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
--  75. ĐÁNH DẤU ĐÃ BÁO
-- ============================================================================
-- Hệ thống KHÔNG tự gửi thư. Nó chỉ soạn sẵn rồi mở Outlook cho thầy cô bấm
-- Gửi. Nên mốc này là thầy cô TỰ xác nhận đã gửi, không phải hệ thống suy ra —
-- và giao diện phải nói đúng như vậy, đừng để tưởng máy đã gửi hộ.
create or replace function public.mark_discipline_notified(
  p_class uuid, p_mshs text, p_who text
) returns json language plpgsql security definer set search_path = public as $fn$
declare v_term date;
begin
  if not public.teaches_class(p_class) then
    raise exception 'Thầy/cô không phụ trách lớp này.';
  end if;
  if p_who not in ('ph', 'hs', 'ca_hai') then
    raise exception 'Chỉ nhận ph / hs / ca_hai.';
  end if;
  select tu_ngay into v_term from public.term_bounds(p_class);

  insert into public.discipline_cases (class_id, mshs, term_from, created_by,
    parent_notified_at, student_notified_at, notified_by)
  values (p_class, p_mshs, v_term, auth.uid(),
    case when p_who in ('ph','ca_hai') then now() end,
    case when p_who in ('hs','ca_hai') then now() end,
    auth.uid())
  on conflict (class_id, mshs, term_from) do update
    set parent_notified_at = case when p_who in ('ph','ca_hai')
                                  then now() else discipline_cases.parent_notified_at end,
        student_notified_at = case when p_who in ('hs','ca_hai')
                                  then now() else discipline_cases.student_notified_at end,
        notified_by = auth.uid(),
        updated_at  = now();

  return json_build_object('ok', true);
end;
$fn$;


-- ============================================================================
--  77. HỌC SINH XEM ĐƯỢC PHẦN CỦA MÌNH
-- ============================================================================
-- Đã nói với em mức kỷ luật thì phải nói luôn em đã trả được bao nhiêu. Bắt em
-- lao động mà không cho em biết còn nợ mấy lượt là thứ dễ gây ấm ức nhất.
create or replace function public.my_discipline_case()
returns json language plpgsql stable security definer set search_path = public as $fn$
declare
  v_class uuid; v_mshs text; v_uid uuid := auth.uid();
  pol record; b record; v_misses int; v_bac int; v_quota int;
  -- Biến rời chứ không dùng biến record: em chưa có hồ sơ trong sổ là chuyện
  -- thường (mới bị kỷ luật, thầy cô chưa ghi lượt nào), lúc đó truy vào trường
  -- của một record rỗng là chỗ dễ nổ nhất.
  v_done int; v_due date; v_ph timestamptz;
begin
  v_mshs  := public.my_mshs();
  v_class := public.student_active_class(v_uid);
  if v_class is null or v_mshs is null then return null; end if;

  select * into pol from public.attendance_policy where class_id = v_class;
  if pol is null or not pol.enabled then return null; end if;
  select * into b from public.term_bounds(v_class);

  select count(*) into v_misses
    from public.attendance_misses m
   where m.class_id = v_class and m.mshs = v_mshs
     and m.study_date >= b.tu_ngay
     and (b.den_ngay is null or m.study_date <= b.den_ngay);

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
--  78. RLS
-- ============================================================================
alter table public.discipline_cases enable row level security;

drop policy if exists discipline_teacher_all on public.discipline_cases;
create policy discipline_teacher_all on public.discipline_cases
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

-- Em đọc được dòng của chính mình. Không sửa được: labor_done là con số thầy cô
-- ghi, em tự sửa thì sổ mất hết giá trị.
drop policy if exists discipline_student_read on public.discipline_cases;
create policy discipline_student_read on public.discipline_cases
  for select using (mshs = public.my_mshs());


-- ============================================================================
--  79. QUYỀN
-- ============================================================================
-- Supabase mặc định cấp đủ quyền cho anon/authenticated trên BẢNG và HÀM mới
-- trong schema public. Bảng thì RLS chặn, nhưng hàm thì không — phải thu hồi.
revoke all on public.discipline_cases from anon;
grant select, insert, update, delete on public.discipline_cases to authenticated;

do $mig$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('labor_quota','class_discipline_board','set_labor_done',
                        'mark_discipline_notified','my_discipline_case')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $mig$;

notify pgrst, 'reload schema';
