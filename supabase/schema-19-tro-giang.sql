-- ===========================================================================
--  19. TRỢ GIẢNG LÀM ĐƯỢC ĐÚNG NHỮNG VIỆC ĐÃ ĐƯỢC GIAO
-- ===========================================================================
--
-- Lỗi GVCN báo (10/2026): "trợ giảng được phân công duyệt kế hoạch nhưng không
-- duyệt được". Soát toàn bộ quyền trợ giảng bằng vai thật (scripts/thu-tro-giang.mjs)
-- ra ba chỗ hỏng phía CSDL — phần giao diện thiếu nút thì sửa ở TaPage.jsx:
--
--   1. QUYỀN KÉO THEO KHÔNG ĐƯỢC BẬT. Cấp "Chấm sao" mà không cấp "Xem phản
--      tư" thì trợ giảng không đọc được bài — mà Postgres áp luật ĐỌC cho cả
--      lệnh UPDATE có WHERE, nên chấm cũng không được, không báo lỗi gì. Lớp
--      7A2 đang đúng tình trạng này. Tương tự: duyệt kế hoạch mà không được
--      xem kế hoạch. Nay bật tự động phần kéo theo, ngay trong bảng — nên ô
--      quyền giáo viên nhìn thấy cũng là quyền thật đang có.
--
--   2. LÀM SAI QUYỀN THÌ BỊ HOÀN NGƯỢC ÂM THẦM. Trigger bảo vệ cột trả giá trị
--      cũ về mà không nói gì: bấm "Duyệt" xong, màn hình báo thành công, tải lại
--      thì vẫn "Chờ duyệt". Nay báo lỗi rõ ràng.
--
--   3. DUYỆT KẾ HOẠCH CÓ THIẾT BỊ khi không có quyền duyệt thiết bị: kế hoạch
--      thành "Đã duyệt" mà thiết bị vẫn "Chờ duyệt" — hai trạng thái vênh nhau.
--      Nay phải có quyền duyệt thiết bị mới duyệt được kế hoạch đó.
--
-- Giáo viên không bị ảnh hưởng: staff_perm() luôn trả true cho giáo viên.
-- Học sinh không bị ảnh hưởng: nhánh học sinh của hai trigger giữ nguyên.
--
-- Chạy:  node scripts/db.mjs . supabase/schema-19-tro-giang.sql
-- Thử:   node scripts/thu-tro-giang.mjs


-- ===========================================================================
--  1. QUYỀN KÉO THEO
-- ===========================================================================
create or replace function public.assistants_implied_perms()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Duyệt, chấm, nhận xét đều phải NHÌN THẤY kế hoạch trước đã.
  if new.can_approve_plan or new.can_review_device or new.can_rate or new.can_comment then
    new.can_view_plans := true;
  end if;
  -- Chấm sao, nhận xét phải đọc được phần em tự ghi.
  if new.can_rate or new.can_comment then
    new.can_view_reflections := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assistants_implied_perms on public.class_assistants;
create trigger trg_assistants_implied_perms
before insert or update on public.class_assistants
for each row execute function public.assistants_implied_perms();

revoke all on function public.assistants_implied_perms() from public, anon, authenticated;

-- Sửa luôn những dòng đang thiếu (7A2: 2 em chấm sao mà không xem được bài).
update public.class_assistants set can_view_plans = can_view_plans
 where (can_approve_plan or can_review_device or can_rate or can_comment) and not can_view_plans
    or (can_rate or can_comment) and not can_view_reflections;


-- ===========================================================================
--  2 + 3. plans_guard_columns — báo lỗi thay vì hoàn ngược âm thầm
-- ===========================================================================
-- Nhánh học sinh chép NGUYÊN VĂN bản đang chạy. Chỉ nhánh nhân sự lớp đổi.
create or replace function public.plans_guard_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  -- auth.uid() NULL = service role (migration, script quản trị, job nền).
  -- Không chặn gì cả, nếu không mọi lệnh sửa từ server sẽ bị hoàn nguyên âm thầm.
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() = old.student_id then
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


-- ===========================================================================
--  2'. reflections_guard_columns — cũng báo lỗi thay vì hoàn ngược âm thầm
-- ===========================================================================
create or replace function public.reflections_guard_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_class uuid;
begin
  -- Xem chú thích ở plans_guard_columns: service role không bị chặn.
  if auth.uid() is null then
    return new;
  end if;

  select class_id into v_class from public.plans where id = new.plan_id;

  if auth.uid() = old.student_id then
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
--  4. Lời thông báo chấm sao không còn nói "Giáo viên" khi trợ giảng chấm
-- ===========================================================================
create or replace function public.notify_on_reflection_feedback()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_plan record;
begin
  select p.study_date, p.period, p.subject into v_plan from public.plans p where p.id = new.plan_id;

  if new.rating is distinct from old.rating and new.rating is not null then
    insert into public.notifications (user_id, kind, title, body, plan_id)
    values (
      new.student_id, 'rating',
      'Tiết ' || v_plan.period || ' môn ' || v_plan.subject || ' được chấm ' || new.rating || '/5',
      case when new.rating <= 2
        then 'Kết quả chưa đạt yêu cầu. Em hãy mở lại tiết này, đọc nhận xét và viết một dòng cho biết sẽ điều chỉnh thế nào.'
        else 'Tiết tự học của em đã được chấm sao.' end,
      new.plan_id
    );
  end if;

  if new.teacher_comment is distinct from old.teacher_comment and nullif(trim(new.teacher_comment), '') is not null then
    insert into public.notifications (user_id, kind, title, body, plan_id)
    values (new.student_id, 'comment',
            'Nhận xét mới cho tiết ' || v_plan.period || ' môn ' || v_plan.subject,
            new.teacher_comment, new.plan_id);
  end if;

  return new;
end;
$function$;


-- ===========================================================================
--  TỰ KIỂM
-- ===========================================================================
do $kiem$
declare n int;
begin
  select count(*) into n from public.class_assistants
   where (can_approve_plan or can_review_device or can_rate or can_comment) and not can_view_plans
      or (can_rate or can_comment) and not can_view_reflections;
  if n > 0 then raise exception 'Còn % trợ giảng thiếu quyền kéo theo', n; end if;
  raise notice 'OK: quyền kéo theo đã đủ, trigger báo lỗi thay vì hoàn ngược âm thầm.';
end $kiem$;
