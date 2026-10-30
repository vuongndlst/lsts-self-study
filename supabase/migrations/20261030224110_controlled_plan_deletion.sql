-- Xoá nhiệm vụ chưa có kết quả; học sinh chỉ tự xoá trước giờ tiết học.
alter table public.class_assistants add column if not exists can_delete_plans boolean not null default false;

create or replace function public.staff_perm(p_class uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.teaches_class(p_class) then true else coalesce((
    select case p_perm
      when 'view_plans' then can_view_plans
      when 'view_help' then can_view_help
      when 'chat' then can_chat
      when 'view_reflections' then can_view_reflections
      when 'view_evidence' then can_view_evidence
      when 'rate' then can_rate
      when 'comment' then can_comment
      when 'review_device' then can_review_device
      when 'approve_plan' then can_approve_plan
      when 'review_books' then can_review_books
      when 'track_attendance' then can_track_attendance
      when 'delete_plans' then can_delete_plans
      else false end
    from public.class_assistants where class_id = p_class and student_id = auth.uid()
  ), false) end;
$$;

create or replace function public.assistants_implied_perms()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.can_approve_plan or new.can_review_device or new.can_rate or new.can_comment or new.can_delete_plans then
    new.can_view_plans := true;
  end if;
  if new.can_rate or new.can_comment then new.can_view_reflections := true; end if;
  return new;
end;
$$;

-- Trigger chặn cả đường DELETE trực tiếp và xoá dây chuyền từ buổi tự học.
create or replace function public.guard_plan_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_reason text; v_staff boolean;
begin
  -- Các script quản trị dùng service role giữ cách làm hiện tại.
  if auth.uid() is null then return old; end if;
  v_staff := public.staff_perm(old.class_id, 'delete_plans');
  if not v_staff and not (
    old.student_id = auth.uid()
    and now() < public.study_period_start(old.study_date, old.period)
    and exists(select 1 from public.profiles where id = auth.uid() and role = 'student')
  ) then
    raise exception 'Không có quyền xoá nhiệm vụ này. Học sinh chỉ tự xoá trước khi tiết học bắt đầu.';
  end if;
  if exists(select 1 from public.reflections where plan_id = old.id)
     or exists(select 1 from public.evidence where plan_id = old.id) then
    raise exception 'Nhiệm vụ đã có kết quả, minh chứng hoặc đánh giá nên không thể xoá. Lịch sử học tập cần được giữ lại.';
  end if;
  v_reason := nullif(btrim(current_setting('app.plan_delete_reason', true)), '');
  if v_staff and (v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500) then
    raise exception 'Hãy dùng nút Xoá nhiệm vụ và ghi lý do từ 5 đến 500 ký tự.';
  end if;
  insert into public.audit_log(actor_id, action, entity, entity_id, metadata)
  values(auth.uid(), 'plan.deleted', 'plans', old.id,
    jsonb_build_object('reason', coalesce(v_reason, 'Học sinh xoá trước giờ học'), 'plan', to_jsonb(old)));
  return old;
end;
$$;
drop trigger if exists trg_guard_plan_delete on public.plans;
create trigger trg_guard_plan_delete before delete on public.plans
for each row execute function public.guard_plan_delete();

drop policy if exists plans_student_delete on public.plans;
create policy plans_student_delete on public.plans for delete to authenticated
using (student_id = auth.uid() and now() < public.study_period_start(study_date, period));

create or replace function public.delete_study_plans(p_plan_ids uuid[], p_reason text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_sessions uuid[]; v_count int; v_deleted int; v_previous_reason text;
begin
  if auth.uid() is null then raise exception 'Em/thầy cô cần đăng nhập trước khi xoá nhiệm vụ.'; end if;
  select array_agg(distinct id) into v_ids from unnest(p_plan_ids) id where id is not null;
  if coalesce(cardinality(v_ids), 0) = 0 or cardinality(v_ids) > 100 then
    raise exception 'Chọn từ 1 đến 100 nhiệm vụ để xoá.';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception 'Lý do xoá cần từ 5 đến 500 ký tự.';
  end if;
  -- Khoá buổi trước để không xoá dây chuyền nhiệm vụ vừa được thêm cùng lúc.
  select array_agg(distinct session_id) into v_sessions from public.plans where id = any(v_ids);
  perform 1 from public.self_study_sessions where id = any(v_sessions) order by id for update;
  perform 1 from public.plans where id = any(v_ids) order by id for update;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(v_ids) then raise exception 'Nhiệm vụ đã thay đổi hoặc đã được xoá. Hãy tải lại danh sách.'; end if;
  v_previous_reason := current_setting('app.plan_delete_reason', true);
  perform set_config('app.plan_delete_reason', btrim(p_reason), true);
  -- Trigger kiểm từng nhiệm vụ. Một dòng bị chặn thì toàn bộ thao tác tự hoàn tác.
  delete from public.plans where id = any(v_ids);
  get diagnostics v_deleted = row_count;
  perform set_config('app.plan_delete_reason', coalesce(v_previous_reason, ''), true);
  delete from public.self_study_sessions s where s.id = any(v_sessions)
    and not exists(select 1 from public.plans p where p.session_id = s.id);
  return json_build_object('da_xoa', v_deleted);
end;
$$;

revoke all on function public.guard_plan_delete() from public, anon, authenticated;
revoke all on function public.assistants_implied_perms() from public, anon, authenticated;
revoke all on function public.staff_perm(uuid, text) from public, anon;
grant execute on function public.staff_perm(uuid, text) to authenticated;
revoke all on function public.delete_study_plans(uuid[], text) from public, anon;
grant execute on function public.delete_study_plans(uuid[], text) to authenticated;
