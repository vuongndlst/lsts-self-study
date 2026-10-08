-- ===========================================================================
--  20. BA LỖI NHỎ (10/2026)
-- ===========================================================================
--
--   1. Trợ giảng được giao duyệt / chấm sao / nhận xét thì làm được cả trên
--      kế hoạch CỦA CHÍNH MÌNH. (schema-19 chặn việc này; GVCN muốn mở.)
--      Học sinh thường vẫn không tự duyệt, tự chấm được — quyền đó chỉ có khi
--      giáo viên đã giao.
--
--   2. Kế hoạch BỊ TỪ CHỐI (thiết bị bị từ chối, hoặc kế hoạch bị trả về "Cần
--      điều chỉnh" mà tới giờ học vẫn chưa sửa) thì KHÔNG cần nộp kết quả:
--        · tiến độ hiện "Không cần kết quả", không còn "Trễ hạn cập nhật";
--        · không nhắc trễ hạn, không tự chấm 1 sao sau 5 ngày;
--        · không tính là nợ kết quả khi lớp bật "bắt buộc cập nhật kết quả".
--      Em vẫn TỰ NGUYỆN nộp được nếu muốn.
--      Những lần hệ thống đã lỡ tự chấm 1 sao cho kế hoạch bị từ chối thì gỡ
--      đi — sao lưu trước vào bảng auto_eval_go_bo để khôi phục được.
--
--   (Kèm theo) Trợ giảng có quyền duyệt từng sửa được NỘI DUNG kế hoạch đã qua
--      của chính mình (luật sửa của trợ giảng phủ lên kế hoạch của em đó). Chặn.
--
--   3. Minh chứng chỉ bắt buộc khi thiết bị ĐÃ ĐƯỢC DUYỆT. Thiết bị bị từ chối
--      (hoặc chưa ai duyệt) thì em không được dùng máy — bắt chụp minh chứng
--      là vô lý. Nhiệm vụ không dùng thiết bị: như cũ, chỉ cần ghi kết quả.
--
-- Chạy:  node scripts/db.mjs . supabase/schema-20-ba-loi-nho.sql
-- Thử:   node scripts/thu-tbdt.mjs && node scripts/thu-tro-giang.mjs


-- ===========================================================================
--  1. TRỢ GIẢNG XỬ LÝ CẢ KẾ HOẠCH CỦA MÌNH — hai trigger bảo vệ cột
-- ===========================================================================
-- Chép từ schema-19, chỉ đổi điều kiện vào nhánh học sinh.
create or replace function public.plans_guard_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  -- auth.uid() NULL = service role (migration, script quản trị, job nền).
  -- Không chặn gì cả, nếu không mọi lệnh sửa từ server sẽ bị hoàn nguyên âm thầm.
  if auth.uid() is null then
    return new;
  end if;

  -- Trợ giảng xử lý kế hoạch CỦA CHÍNH MÌNH (schema-20): khi lệnh chỉ đổi
  -- kết luận duyệt / duyệt thiết bị và em có đúng quyền đó, đi nhánh nhân sự
  -- lớp như với kế hoạch của bạn khác. Học sinh thường không có quyền nên vẫn
  -- đi nhánh học sinh như cũ.
  if auth.uid() = old.student_id
     and not ((new.review_status is distinct from old.review_status
               and public.staff_perm(old.class_id, 'approve_plan'))
           or (new.device_status is distinct from old.device_status
               and public.staff_perm(old.class_id, 'review_device'))) then
    -- Học sinh chỉ sửa được kế hoạch TƯƠNG LAI (RLS plans_student_update).
    -- Trợ giảng thì có thêm luật plans_staff_update, nên trước đây sửa được cả
    -- NỘI DUNG kế hoạch đã qua của chính mình. Chặn ở đây (schema-20).
    if old.study_date <= public.vn_today() then
      raise exception 'Kế hoạch đã tới ngày học thì không sửa nội dung được nữa.' using errcode = 'P0001';
    end if;

    -- Ngày và tiết thuộc về BUỔI tự học, không thuộc về nhiệm vụ. Cho sửa ở đây
    -- thì nhiệm vụ sẽ lệch khỏi buổi chứa nó. Muốn đổi khung giờ thì xóa và
    -- đăng ký lại buổi khác.
    new.study_date := old.study_date;
    new.period     := old.period;

    -- Bật kéo dài 2 tiết khi sửa: tiết liền sau vẫn phải là giờ tự học của lớp.
    if new.span = 2 and old.span <> 2
       and exists (select 1 from public.class_schedule where class_id = old.class_id)
       and not exists (
         select 1 from public.class_schedule cs
         where cs.class_id = old.class_id
           and cs.weekday  = extract(isodow from old.study_date)::smallint
           and cs.period   = old.period + 1
       ) then
      raise exception 'Tiết % không phải giờ tự học của lớp nên nhiệm vụ không thể kéo dài sang tiết đó.', old.period + 1;
    end if;

    -- Học sinh: không đụng vào kết quả duyệt thiết bị.
    new.device_status      := old.device_status;
    new.device_reviewed_by := old.device_reviewed_by;
    new.device_reviewed_at := old.device_reviewed_at;
    new.device_review_note := old.device_review_note;
    -- Kết luận duyệt là việc của giáo viên: mặc định giữ nguyên.
    -- ĐẶT TRƯỚC hai khối bên dưới, vì chúng mới là ngoại lệ được phép đổi.
    new.review_status  := old.review_status;
    new.review_by      := old.review_by;
    new.review_at      := old.review_at;
    new.review_note    := old.review_note;
    new.review_version := old.review_version;

    -- Ngoại lệ 1: bật/tắt thiết bị. Bật → phải chờ duyệt. Tắt → không cần duyệt.
    if new.use_device is distinct from old.use_device then
      new.device_status := case when new.use_device then 'Chờ duyệt' else 'Không dùng' end;
      new.device_reviewed_by := null;
      new.device_reviewed_at := null;
      new.device_review_note := null;
      new.review_status  := case when new.use_device then 'Chờ duyệt' else 'Không cần duyệt' end;
      new.review_by      := null;
      new.review_at      := null;
      new.review_note    := null;
      new.review_version := old.review_version + 1;

    -- Ngoại lệ 2: sửa nội dung kế hoạch đang bị "Cần điều chỉnh" → quay lại hàng chờ.
    elsif old.review_status = 'Cần điều chỉnh'
       and (new.task is distinct from old.task
            or new.goal is distinct from old.goal
            or new.subject is distinct from old.subject) then
      new.review_status  := case when new.use_device then 'Chờ duyệt' else 'Không cần duyệt' end;
      new.review_version := old.review_version + 1;
    end if;
  else
    -- Nhân sự lớp: CHỈ được duyệt thiết bị / duyệt kế hoạch, không sửa nội dung.
    new.student_id        := old.student_id;
    new.class_id          := old.class_id;
    new.study_date        := old.study_date;
    new.span              := old.span;
    new.period            := old.period;
    new.activity_type     := old.activity_type;
    new.subject           := old.subject;
    new.task              := old.task;
    new.priority          := old.priority;
    new.goal              := old.goal;
    new.use_device        := old.use_device;
    new.device_purpose    := old.device_purpose;
    new.fallback_activity := old.fallback_activity;

    -- Đổi kết luận mà không có quyền: BÁO LỖI. Trước đây hoàn ngược âm thầm,
    -- màn hình báo thành công mà tải lại thì vẫn như cũ.
    if new.review_status is distinct from old.review_status
       and not public.staff_perm(old.class_id, 'approve_plan') then
      raise exception 'Em chưa được giao quyền duyệt kế hoạch của lớp này.' using errcode = 'P0001';
    end if;
    if new.device_status is distinct from old.device_status
       and not public.staff_perm(old.class_id, 'review_device') then
      raise exception 'Em chưa được giao quyền duyệt thiết bị của lớp này.' using errcode = 'P0001';
    end if;
    -- Kế hoạch có thiết bị đang chờ: duyệt kế hoạch là duyệt luôn thiết bị,
    -- nên phải có cả quyền duyệt thiết bị. Không thì kế hoạch "Đã duyệt" mà
    -- thiết bị vẫn "Chờ duyệt".
    if new.review_status = 'Đã duyệt' and old.review_status is distinct from 'Đã duyệt'
       and old.use_device and old.device_status = 'Chờ duyệt'
       and not public.staff_perm(old.class_id, 'review_device') then
      raise exception 'Kế hoạch này có dùng thiết bị: cần thêm quyền Duyệt thiết bị mới duyệt được.' using errcode = 'P0001';
    end if;

    if new.review_status is distinct from old.review_status then
      new.review_by      := auth.uid();
      new.review_at      := now();
      new.review_version := old.review_version + 1;
    end if;
    if new.device_status is distinct from old.device_status then
      new.device_reviewed_by := auth.uid();
      new.device_reviewed_at := now();
    end if;

    -- Duyệt thiết bị và duyệt kế hoạch là MỘT quyết định. Đồng bộ hai chiều ngay
    -- trong trigger để thầy cô bấm một lần là xong, và để mọi đường vào (bảng,
    -- popup chi tiết, duyệt hàng loạt) đều cho ra cùng một kết quả.
    if new.device_status is distinct from old.device_status
       and new.device_status in ('Đã duyệt', 'Từ chối') then
      new.review_status  := case when new.device_status = 'Đã duyệt' then 'Đã duyệt' else 'Cần điều chỉnh' end;
      new.review_by      := auth.uid();
      new.review_at      := now();
      new.review_version := old.review_version + 1;
      if new.device_status = 'Từ chối' then
        new.review_note := coalesce(nullif(trim(coalesce(new.device_review_note, '')), ''), new.review_note);
      end if;
    end if;

    -- Chiều ngược lại: duyệt kế hoạch có dùng thiết bị thì thiết bị cũng được duyệt.
    if new.review_status = 'Đã duyệt'
       and old.review_status is distinct from 'Đã duyệt'
       and old.use_device and old.device_status = 'Chờ duyệt' then
      new.device_status      := 'Đã duyệt';
      new.device_reviewed_by := auth.uid();
      new.device_reviewed_at := now();
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.reflections_guard_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_class uuid;
begin
  -- Xem chú thích ở plans_guard_columns: service role không bị chặn.
  if auth.uid() is null then
    return new;
  end if;

  select class_id into v_class from public.plans where id = new.plan_id;

  -- Trợ giảng tự chấm / tự nhận xét bài của mình (schema-20): đi nhánh nhân
  -- sự lớp khi lệnh đổi đúng phần em có quyền. Học sinh thường vẫn bị giữ nguyên.
  if auth.uid() = old.student_id
     and not ((new.rating is distinct from old.rating and public.staff_perm(v_class, 'rate'))
           or (new.teacher_comment is distinct from old.teacher_comment and public.staff_perm(v_class, 'comment'))
           or (new.help_resolved is distinct from old.help_resolved and public.staff_perm(v_class, 'comment'))) then
    -- Học sinh: không tự chấm sao, không tự viết nhận xét, không tự đánh dấu đã xử lý.
    new.teacher_comment    := old.teacher_comment;
    new.teacher_comment_by := old.teacher_comment_by;
    new.teacher_comment_at := old.teacher_comment_at;
    new.help_resolved      := old.help_resolved;
    new.rating             := old.rating;
    new.rating_by          := old.rating_by;
    new.rating_at          := old.rating_at;
    -- Dấu vết hệ thống: học sinh không tự đặt được.
    new.auto_evaluated     := old.auto_evaluated;
    new.auto_evaluated_at  := old.auto_evaluated_at;
    new.late_result_at     := old.late_result_at;
    new.needs_recheck      := old.needs_recheck;
    -- Phản hồi khi bị đánh giá thấp: chỉ ghi được khi thực sự có sao 1–2.
    if new.student_ack_note is distinct from old.student_ack_note then
      if coalesce(old.rating, 5) > 2 then
        new.student_ack_note := old.student_ack_note;
        new.student_ack_at   := old.student_ack_at;
      else
        new.student_ack_at := case when nullif(trim(new.student_ack_note), '') is null then null else now() end;
      end if;
    end if;
  else
    -- Nhân sự lớp: KHÔNG đụng vào phần học sinh tự viết.
    new.student_id        := old.student_id;
    new.completion_status := old.completion_status;
    new.note              := old.note;
    new.need_help         := old.need_help;
    new.help_note         := old.help_note;
    new.completed_at      := old.completed_at;
    new.student_ack_note  := old.student_ack_note;
    new.student_ack_at    := old.student_ack_at;
    new.auto_evaluated    := old.auto_evaluated;
    new.auto_evaluated_at := old.auto_evaluated_at;
    new.late_result_at    := old.late_result_at;
    -- Giáo viên được tắt cờ "cần xem lại" sau khi đã chấm lại.

    -- Nhận xét: giáo viên luôn được; trợ giảng phải được bật quyền.
    if new.teacher_comment is distinct from old.teacher_comment then
      if not public.staff_perm(v_class, 'comment') then
        raise exception 'Em chưa được giao quyền viết nhận xét.' using errcode = 'P0001';
      end if;
      new.teacher_comment_by := auth.uid();
      new.teacher_comment_at := now();
    end if;

    -- Chấm sao: tương tự.
    if new.rating is distinct from old.rating then
      if not public.staff_perm(v_class, 'rate') then
        raise exception 'Em chưa được giao quyền chấm sao.' using errcode = 'P0001';
      end if;
      new.rating_by := auth.uid();
      new.rating_at := now();
      -- Chấm lại từ thấp lên cao thì xóa phần phản hồi cũ cho sạch.
      if coalesce(new.rating, 5) > 2 then
        new.student_ack_note := null;
        new.student_ack_at   := null;
      end if;
    end if;

    -- Đánh dấu "đã hỗ trợ xong" đi cùng quyền nhận xét — giữ như cũ.
    if new.help_resolved is distinct from old.help_resolved
       and not public.staff_perm(v_class, 'comment') then
      raise exception 'Em chưa được giao quyền đánh dấu đã hỗ trợ (cần quyền Viết nhận xét).' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

-- ===========================================================================
--  2. KẾ HOẠCH BỊ TỪ CHỐI THÌ KHÔNG CẦN KẾT QUẢ
-- ===========================================================================
-- Một chỗ định nghĩa "bị từ chối", mọi nơi khác gọi lại.
create or replace function public.plan_rejected(p_review text, p_device text)
returns boolean language sql immutable as $$
  select coalesce(p_device = 'Từ chối', false) or coalesce(p_review = 'Cần điều chỉnh', false);
$$;
grant execute on function public.plan_rejected(text, text) to authenticated;

-- View plan_status: giữ nguyên mọi cột cũ đúng thứ tự (create or replace view
-- chỉ cho THÊM cột ở cuối), đổi cách tính progress, thêm cột can_ket_qua.
-- "Không cần kết quả" chỉ áp từ khi tiết bắt đầu: trước đó em còn sửa kế hoạch
-- được, nên vẫn là "Chưa tới buổi".
create or replace view public.plan_status as
 SELECT p.id AS plan_id,
    p.student_id,
    p.class_id,
    p.study_date,
    p.period,
    p.subject,
    p.created_at,
    p.review_status,
    p.review_note,
    result_clock_start(p.study_date, p.period, p.span, p.created_at) AS clock_start,
    (result_clock_start(p.study_date, p.period, p.span, p.created_at) + make_interval(hours => COALESCE(( SELECT app_settings.value_int
           FROM app_settings
          WHERE (app_settings.key = 'overdue_hours'::text)), 48))) AS overdue_at,
    (result_clock_start(p.study_date, p.period, p.span, p.created_at) + make_interval(hours => COALESCE(( SELECT app_settings.value_int
           FROM app_settings
          WHERE (app_settings.key = 'auto_rating_hours'::text)), 120))) AS auto_evaluate_at,
    (r.plan_id IS NOT NULL) AS has_result,
    COALESCE(r.auto_evaluated, false) AS auto_evaluated,
    CASE
      WHEN r.plan_id IS NULL
       AND plan_rejected(p.review_status, p.device_status)
       AND now() >= result_available_at(p.study_date, p.period, p.created_at)
        THEN 'Không cần kết quả'::text
      ELSE progress_status(p.study_date, p.period, p.span, p.created_at, (r.plan_id IS NOT NULL), COALESCE(r.auto_evaluated, false))
    END AS progress,
    r.rating,
    r.needs_recheck,
    round((EXTRACT(epoch FROM (((((p.study_date)::text || ' 00:00:00'::text))::timestamp without time zone AT TIME ZONE 'Asia/Ho_Chi_Minh'::text) - p.created_at)) / 3600.0), 1) AS lead_time_hours,
    result_available_at(p.study_date, p.period, p.created_at) AS available_at,
    (NOT plan_rejected(p.review_status, p.device_status)) AS can_ket_qua
   FROM (plans p
     LEFT JOIN reflections r ON ((r.plan_id = p.id)));

-- Job nhắc trễ hạn + tự chấm: bỏ qua kế hoạch bị từ chối.
create or replace function public.process_self_study_deadlines()
returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_overdue int := 0;
  v_auto    int := 0;
  r record;
  v_body text;
begin
  -- 1) Quá 48 giờ mà chưa cập nhật kết quả → nhắc học sinh (mỗi kế hoạch một lần).
  for r in
    select ps.plan_id, ps.student_id, ps.study_date, ps.period, ps.subject
    from public.plan_status ps
    where not ps.has_result and ps.can_ket_qua
      and now() >= ps.overdue_at
      and now() <  ps.auto_evaluate_at
  loop
    insert into public.notifications (user_id, kind, title, body, plan_id, dedupe_key)
    values (
      r.student_id, 'overdue',
      'Đừng quên cập nhật kết quả',
      'Em chưa cập nhật kết quả cho nhiệm vụ ' || r.subject || ' ngày '
        || to_char(r.study_date, 'DD/MM') || ' · Tiết ' || r.period
        || '. Hãy dành một chút thời gian ghi lại những gì em đã hoàn thành nhé.',
      r.plan_id, 'task-overdue:' || r.plan_id
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    if found then v_overdue := v_overdue + 1; end if;
  end loop;

  -- 2) Quá 120 giờ mà vẫn chưa cập nhật → hệ thống tự đánh giá 1 sao kèm phản hồi.
  --    Kế hoạch bị từ chối thì KHÔNG (schema-20): em không cần nộp kết quả.
  for r in
    select ps.plan_id, ps.student_id, ps.study_date, ps.period, ps.subject
    from public.plan_status ps
    where not ps.has_result and ps.can_ket_qua
      and now() >= ps.auto_evaluate_at
  loop
    -- Chọn ngẫu nhiên MỘT LẦN rồi lưu vào CSDL, không random lại mỗi lần hiển thị.
    select body into v_body from public.auto_feedback_templates order by random() limit 1;

    insert into public.reflections (
      plan_id, student_id, completion_status, note,
      rating, rating_at, teacher_comment, teacher_comment_at,
      auto_evaluated, auto_evaluated_at
    ) values (
      r.plan_id, r.student_id, 'Chưa hoàn thành', null,
      1, now(), v_body, now(),
      true, now()
    )
    on conflict (plan_id) do nothing;

    if found then
      v_auto := v_auto + 1;
      insert into public.notifications (user_id, kind, title, body, plan_id, dedupe_key)
      values (
        r.student_id, 'auto_rating',
        'Nhiệm vụ ' || r.subject || ' ngày ' || to_char(r.study_date, 'DD/MM') || ' được đánh giá 1/5',
        v_body,
        r.plan_id, 'task-auto-rating:' || r.plan_id
      )
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
    end if;
  end loop;

  return json_build_object(
    'chay_luc', timezone('Asia/Ho_Chi_Minh', now())::text,
    'nhac_tre_han', v_overdue,
    'tu_danh_gia', v_auto
  );
end;
$function$;

-- Gỡ những lần đã lỡ tự chấm 1 sao cho kế hoạch bị từ chối. Chỉ gỡ dòng do
-- HỆ THỐNG tạo (auto_evaluated, em chưa ghi gì); dòng em đã tự nộp thì giữ.
-- Sao lưu trước để khôi phục được.
create table if not exists public.auto_eval_go_bo (like public.reflections);
alter table public.auto_eval_go_bo add column if not exists go_luc timestamptz default now();
alter table public.auto_eval_go_bo enable row level security;    -- không policy: chỉ quản trị đọc
revoke all on public.auto_eval_go_bo from anon, authenticated;

with bo as (
  select r.* from public.reflections r join public.plans p on p.id = r.plan_id
   where r.auto_evaluated and r.note is null
     and public.plan_rejected(p.review_status, p.device_status)
)
insert into public.auto_eval_go_bo select bo.*, now() from bo;

delete from public.reflections r using public.plans p
 where p.id = r.plan_id and r.auto_evaluated and r.note is null
   and public.plan_rejected(p.review_status, p.device_status);


-- ===========================================================================
--  3. MINH CHỨNG CHỈ BẮT BUỘC KHI THIẾT BỊ ĐÃ ĐƯỢC DUYỆT
-- ===========================================================================
create or replace function public.require_device_evidence()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null or auth.uid() is distinct from new.student_id then
    return new;
  end if;
  -- Chỉ xét khi em ghi KẾT QUẢ. Em viết phản hồi sau khi bị chấm 1–2 sao cũng
  -- là cập nhật bảng này — chặn cả lúc đó thì nhiệm vụ cũ (trước luật mới,
  -- chưa có minh chứng) không bao giờ viết phản hồi được nữa.
  if tg_op = 'UPDATE'
     and new.completion_status is not distinct from old.completion_status
     and new.note is not distinct from old.note then
    return new;
  end if;

  -- Chỉ khi thiết bị ĐÃ ĐƯỢC DUYỆT (schema-20). Bị từ chối / chưa duyệt thì
  -- em không được dùng máy, không có gì để chụp.
  if exists (select 1 from public.plans where id = new.plan_id and use_device and device_status = 'Đã duyệt')
     and not exists (select 1 from public.evidence where plan_id = new.plan_id) then
    raise exception 'Nhiệm vụ có dùng thiết bị cần ít nhất một minh chứng — ảnh, tệp hoặc liên kết. Em đính kèm rồi lưu lại nhé.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

create or replace function public.keep_last_device_evidence()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null or auth.uid() is distinct from old.student_id then
    return old;
  end if;
  -- Xoá dây chuyền khi xoá cả nhiệm vụ: lúc đó nhiệm vụ đã không còn nên
  -- exists() bên dưới ra false và cho qua — đúng ý.
  if exists (select 1 from public.plans p
               join public.reflections r on r.plan_id = p.id
              where p.id = old.plan_id and p.use_device and p.device_status = 'Đã duyệt')
     and (select count(*) from public.evidence where plan_id = old.plan_id) <= 1 then
    raise exception 'Đây là minh chứng cuối cùng của một nhiệm vụ có dùng thiết bị. Em thêm minh chứng khác trước rồi hãy xoá cái này.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$function$;


-- ===========================================================================
--  TỰ KIỂM
-- ===========================================================================
do $kiem$
declare n int;
begin
  select count(*) into n from public.plans p join public.reflections r on r.plan_id = p.id
   where r.auto_evaluated and r.note is null and public.plan_rejected(p.review_status, p.device_status);
  if n > 0 then raise exception 'Còn % lần tự chấm trên kế hoạch bị từ chối', n; end if;
  raise notice 'OK: kế hoạch bị từ chối không cần kết quả; minh chứng chỉ khi thiết bị đã duyệt; trợ giảng tự xử lý được.';
end $kiem$;
