-- ===========================================================================
--  18. MINH CHỨNG BẮT BUỘC CHO NHIỆM VỤ CÓ THIẾT BỊ
-- ===========================================================================
--
-- CHỈ CHẠY SAU KHI GIAO DIỆN MỚI ĐÃ LÊN MẠNG.
--
-- Giao diện cũ lưu kết quả TRƯỚC rồi mới đính kèm minh chứng, và xoá tệp trên
-- kho TRƯỚC rồi mới xoá dòng minh chứng. Với hai luật dưới đây:
--   · lưu kết quả bị chặn ngay bước đầu vì chưa có minh chứng nào;
--   · xoá minh chứng cuối cùng bị chặn ở bước xoá dòng — nhưng tệp trên kho đã
--     mất rồi, để lại một dòng trỏ vào khoảng không.
-- Giao diện mới đảo cả hai thứ tự. Chạy file này trước khi nó lên mạng là em
-- nào đang cập nhật kết quả nhiệm vụ có thiết bị cũng bị chặn.
--
-- Chạy:  node scripts/db.mjs . supabase/schema-18-minh-chung-tbdt.sql

-- Ảnh, tệp hoặc liên kết đều được (GVCN chọn), chỉ cần có ít nhất một.
--
-- LƯU Ý THỨ TỰ: giao diện cũ lưu kết quả TRƯỚC rồi mới đính kèm minh chứng. Với
-- luật này thì cách đó bị chặn ngay ở bước đầu, nên giao diện đã đảo lại: đính
-- kèm trước, lưu kết quả sau.
create or replace function public.require_device_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
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

  if exists (select 1 from public.plans where id = new.plan_id and use_device)
     and not exists (select 1 from public.evidence where plan_id = new.plan_id) then
    raise exception 'Nhiệm vụ có dùng thiết bị cần ít nhất một minh chứng — ảnh, tệp hoặc liên kết. Em đính kèm rồi lưu lại nhé.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_y_device_evidence on public.reflections;
create trigger trg_y_device_evidence
before insert or update on public.reflections
for each row execute function public.require_device_evidence();

-- Nộp xong rồi xoá minh chứng đi thì luật trên thành vô nghĩa. Giữ lại ít nhất
-- một cái; muốn thay thì thêm cái mới trước rồi mới xoá cái cũ.
create or replace function public.keep_last_device_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() is distinct from old.student_id then
    return old;
  end if;
  -- Xoá dây chuyền khi xoá cả nhiệm vụ: lúc đó nhiệm vụ đã không còn nên
  -- exists() bên dưới ra false và cho qua — đúng ý.
  if exists (select 1 from public.plans p
               join public.reflections r on r.plan_id = p.id
              where p.id = old.plan_id and p.use_device)
     and (select count(*) from public.evidence where plan_id = old.plan_id) <= 1 then
    raise exception 'Đây là minh chứng cuối cùng của một nhiệm vụ có dùng thiết bị. Em thêm minh chứng khác trước rồi hãy xoá cái này.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_keep_last_device_evidence on public.evidence;
create trigger trg_keep_last_device_evidence
before delete on public.evidence
for each row execute function public.keep_last_device_evidence();

revoke all on function public.require_device_evidence() from public, anon, authenticated;
revoke all on function public.keep_last_device_evidence() from public, anon, authenticated;

-- ---------- Tự kiểm ----------
do $kiem$
declare n int;
begin
  select count(*) into n from pg_trigger
   where tgname in ('trg_y_device_evidence', 'trg_keep_last_device_evidence') and not tgisinternal;
  if n <> 2 then raise exception 'Thiếu trigger minh chứng: mới có %/2', n; end if;
  raise notice 'OK: minh chứng bắt buộc cho nhiệm vụ có thiết bị đã bật.';
end $kiem$;
