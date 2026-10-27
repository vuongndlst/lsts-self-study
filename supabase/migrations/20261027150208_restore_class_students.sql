-- Khôi phục ghi danh đã ngừng; giữ nguyên tài khoản và lịch sử tự học.
-- Danh sách này cần SECURITY DEFINER vì RLS students chỉ đọc học sinh đang học.
create or replace function public.class_removed_students(p_class uuid)
returns table (mshs text, full_name text)
language sql stable security definer set search_path = '' as $$
  select s.mshs, s.full_name
  from public.enrollments e join public.students s on s.mshs = e.mshs
  where e.class_id = p_class and not e.is_active
    and auth.uid() is not null and public.teaches_class(p_class)
  order by s.full_name, s.mshs;
$$;

create or replace function public.restore_to_class(p_class uuid, p_mshs text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_year uuid; v_other_class text; v_changed int;
begin
  if auth.uid() is null or not public.teaches_class(p_class) then
    raise exception 'Thầy/cô không có quyền quản lý lớp này';
  end if;
  select c.school_year_id into v_year
    from public.classes c join public.school_years y on y.id = c.school_year_id and y.is_active
   where c.id = p_class;
  if v_year is null then
    raise exception 'Chỉ khôi phục được vào lớp của năm học hiện tại';
  end if;

  -- Chỉ khôi phục học sinh từng có trong đúng lớp; không tạo tài khoản/ghi danh mới.
  -- Khoá học sinh để hai lần khôi phục đồng thời không chen vào nhau.
  perform 1 from public.students s where s.mshs = p_mshs
    and exists (select 1 from public.enrollments e where e.mshs = s.mshs and e.class_id = p_class)
    for update;
  if not found then raise exception 'Học sinh chưa từng thuộc lớp này'; end if;

  select c.name into v_other_class
    from public.enrollments e join public.classes c on c.id = e.class_id
   where e.mshs = p_mshs and e.is_active and e.school_year_id = v_year and e.class_id <> p_class
   limit 1;
  if v_other_class is not null then
    raise exception 'Học sinh đang thuộc lớp %. Thầy/cô cần xử lý chuyển lớp trước khi khôi phục.', v_other_class;
  end if;

  update public.enrollments set is_active = true
   where class_id = p_class and mshs = p_mshs and not is_active;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into public.audit_log (actor_id, action, entity, entity_id, metadata)
    values (auth.uid(), 'roster.restored', 'classes', p_class, json_build_object('mshs', p_mshs));
  end if;
  return json_build_object('ok', true, 'restored', v_changed > 0);
end;
$$;

revoke all on function public.class_removed_students(uuid) from public, anon;
revoke all on function public.restore_to_class(uuid, text) from public, anon;
grant execute on function public.class_removed_students(uuid) to authenticated;
grant execute on function public.restore_to_class(uuid, text) to authenticated;

-- Nhập lại Excel cũng kích hoạt ghi danh cũ thay vì tạo dòng trùng.
create or replace function public.import_class_roster(
  p_class uuid,
  p_rows jsonb,
  p_client_token text,
  p_filename text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_year uuid; v_current uuid; v_batch uuid; r jsonb;
  v_mshs text; v_name text; v_row int;
  v_db_name text; v_other_class text; v_enrolled boolean;
  n_ins int := 0; n_link int := 0; n_have int := 0; n_skip int := 0; n_total int := 0;
  v_outcome text; v_note text;
begin
  -- 1. Quyền: lấy từ auth.uid(), KHÔNG nhận teacher_id từ client.
  if not public.teaches_class(p_class) then
    raise exception 'Thầy/cô không có quyền quản lý lớp này';
  end if;

  select school_year_id into v_year from public.classes where id = p_class;
  select id into v_current from public.school_years where is_active;
  if v_year is null then raise exception 'Lớp không tồn tại'; end if;
  -- Không cho ghi vào năm đã lưu trữ.
  if v_year <> v_current then
    raise exception 'Chỉ import được vào lớp của năm học hiện tại';
  end if;

  -- 2. Chống bấm hai lần: cùng token thì trả lại kết quả cũ, không import lại.
  select id into v_batch from public.student_import_batches where client_token = p_client_token;
  if v_batch is not null then
    return (select json_build_object('lap_lai', true, 'batch_id', b.id,
              'them_moi', b.inserted_students, 'gan_vao_lop', b.linked_students,
              'da_co_san', b.existing_enrollments, 'bo_qua', b.skipped_rows, 'tong', b.total_rows)
            from public.student_import_batches b where b.id = v_batch);
  end if;

  insert into public.student_import_batches (client_token, teacher_id, class_id, school_year_id, filename)
  values (p_client_token, auth.uid(), p_class, v_year, p_filename)
  returning id into v_batch;

  -- 3. Duyệt từng dòng.
  for r in select * from jsonb_array_elements(p_rows) loop
    v_row  := nullif(r->>'stt','')::int;
    v_mshs := public.norm_mshs(r->>'mshs');
    v_name := public.norm_name(r->>'full_name');

    -- Dòng trống hoàn toàn: bỏ qua lặng lẽ, để file mẫu 50 dòng vẫn dùng được.
    if v_mshs is null and v_name is null then
      continue;
    end if;
    n_total := n_total + 1;
    v_outcome := null; v_note := null;

    if v_mshs is null then
      v_outcome := 'error'; v_note := 'Thiếu MSHS';
    elsif v_mshs !~ '^[0-9]{4,12}$' then
      v_outcome := 'error'; v_note := 'MSHS không hợp lệ';
    elsif v_name is null or char_length(v_name) < 3 then
      v_outcome := 'error'; v_note := 'Thiếu họ tên hoặc họ tên quá ngắn';
    else
      select full_name into v_db_name from public.students where mshs = v_mshs;

      if v_db_name is null then
        -- Học sinh mới với toàn hệ thống.
        insert into public.students (mshs, full_name) values (v_mshs, v_name);
        insert into public.enrollments (mshs, class_id, is_active) values (v_mshs, p_class, true)
            on conflict (mshs, class_id) do update set is_active = true;
        v_outcome := 'inserted'; n_ins := n_ins + 1;

      elsif public.norm_name(v_db_name) is distinct from v_name then
        -- Không ghi đè tên chính thức. Giáo viên báo admin xử lý.
        v_outcome := 'name_mismatch';
        v_note := 'Hệ thống: ' || v_db_name;

      else
        select true into v_enrolled from public.enrollments
         where mshs = v_mshs and class_id = p_class and is_active;

        if coalesce(v_enrolled, false) then
          v_outcome := 'already'; n_have := n_have + 1;
        else
          -- Đang học lớp khác trong CÙNG năm → xung đột, không tự chuyển lớp.
          select c.name into v_other_class
            from public.enrollments e join public.classes c on c.id = e.class_id
           where e.mshs = v_mshs and e.is_active and e.school_year_id = v_year and e.class_id <> p_class
           limit 1;

          if v_other_class is not null then
            v_outcome := 'conflict';
            v_note := 'Đang thuộc lớp ' || v_other_class;
          else
            -- Đã có trên hệ thống (ví dụ năm ngoái học lớp 6) → CHỈ thêm ghi
            -- danh mới. Không tạo học sinh mới, nên tài khoản, ảnh đại diện và
            -- lịch sử năm cũ giữ nguyên.
            insert into public.enrollments (mshs, class_id, is_active) values (v_mshs, p_class, true)
            on conflict (mshs, class_id) do update set is_active = true;
            v_outcome := 'linked'; n_link := n_link + 1;
          end if;
        end if;
      end if;
    end if;

    if v_outcome in ('error','name_mismatch','conflict') then
      n_skip := n_skip + 1;
    end if;

    insert into public.student_import_rows (batch_id, row_no, mshs, full_name, outcome, note)
    values (v_batch, v_row, v_mshs, v_name, v_outcome, v_note);
  end loop;

  update public.student_import_batches
     set total_rows = n_total, inserted_students = n_ins, linked_students = n_link,
         existing_enrollments = n_have, skipped_rows = n_skip
   where id = v_batch;

  insert into public.audit_log (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'roster.imported', 'classes', p_class,
          json_build_object('batch', v_batch, 'tong', n_total, 'them_moi', n_ins,
                            'gan_vao_lop', n_link, 'da_co_san', n_have, 'bo_qua', n_skip));

  return json_build_object('lap_lai', false, 'batch_id', v_batch, 'tong', n_total,
    'them_moi', n_ins, 'gan_vao_lop', n_link, 'da_co_san', n_have, 'bo_qua', n_skip);
end;
$$;

revoke all on function public.import_class_roster(uuid, jsonb, text, text) from public, anon;
grant execute on function public.import_class_roster(uuid, jsonb, text, text) to authenticated;
