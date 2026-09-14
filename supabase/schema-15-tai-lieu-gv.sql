-- ---------------------------------------------------------------------------
--  Tài liệu hướng dẫn dành cho GIÁO VIÊN — cất trong Storage, không để công khai
-- ---------------------------------------------------------------------------
--
-- Trước đây hai tệp này (bản PDF và video hướng dẫn giáo viên) nằm trong
-- public/ của trang web. Ẩn thẻ "Giáo viên" trên giao diện chỉ là che mắt: ai
-- biết đường dẫn vẫn tải được, kể cả học sinh, kể cả người ngoài trường.
--
-- Nay để trong một bucket RIÊNG TƯ. Trang web không trỏ thẳng vào tệp nữa mà
-- xin một đường dẫn ký hạn ngắn; Supabase chỉ cấp khi người xin thật sự là giáo
-- viên. Chặn ở tầng cơ sở dữ liệu, không phải ở tầng giao diện.
--
-- Bản HỌC SINH vẫn để công khai trong public/ — nó vốn dành cho mọi học sinh,
-- và bắt các em đăng nhập mới xem được hướng dẫn đăng nhập thì thành vòng luẩn
-- quẩn.
--
-- Chạy:  node scripts/db.mjs . supabase/schema-15-tai-lieu-gv.sql
-- Rồi:   node scripts/tai-len-tai-lieu.mjs        (đẩy tệp lên bucket)

-- ---------- Bucket ----------
-- 80 MB: video hiện 20 MB, nhưng quay lại dài hơn một chút là chuyện thường.
-- Giới hạn sát quá thì lần sau đẩy lên bị từ chối mà không hiểu vì sao.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tai-lieu-gv', 'tai-lieu-gv', false, 83886080,
        array['application/pdf', 'video/mp4', 'image/jpeg', 'text/plain'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Quyền ----------
drop policy if exists tai_lieu_gv_doc on storage.objects;
drop policy if exists tai_lieu_gv_ghi on storage.objects;

-- Đọc: giáo viên và quản trị. is_teacher() đã gộp cả 'admin' — xem schema.sql.
--
-- Đây cũng là điều kiện để XIN được đường dẫn ký hạn: Supabase bắt người gọi
-- createSignedUrl phải có quyền select trên chính đối tượng đó. Nên không cần
-- thêm Edge Function nào, chính sách này là đủ.
create policy tai_lieu_gv_doc on storage.objects
for select to authenticated
using (bucket_id = 'tai-lieu-gv' and public.is_teacher());

-- Ghi: chỉ quản trị. Tài liệu là bản dựng ra từ mã nguồn, một người đẩy lên cho
-- cả trường; để giáo viên nào cũng ghi đè được thì sớm muộn cũng có bản lạ.
create policy tai_lieu_gv_ghi on storage.objects
for all to authenticated
using (bucket_id = 'tai-lieu-gv' and public.is_admin())
with check (bucket_id = 'tai-lieu-gv' and public.is_admin());

-- ---------- Kiểm ----------
-- Management API chạy bằng vai postgres, mà postgres thì BỎ QUA hết RLS — chạy
-- select ở đây rồi thấy ra dữ liệu không chứng minh được điều gì. Muốn thử thật
-- thì phải đổi vai và giả một người dùng cụ thể, như bên dưới.
do $kiem$
declare
  co_bucket boolean;
  so_chinh_sach int;
begin
  select exists (select 1 from storage.buckets where id = 'tai-lieu-gv' and not public)
    into co_bucket;
  select count(*) from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('tai_lieu_gv_doc', 'tai_lieu_gv_ghi')
    into so_chinh_sach;

  if not co_bucket then
    raise exception 'Chưa tạo được bucket riêng tư tai-lieu-gv';
  end if;
  if so_chinh_sach <> 2 then
    raise exception 'Thiếu chính sách: mới có %/2', so_chinh_sach;
  end if;
  raise notice 'OK: bucket riêng tư + 2 chính sách.';
end $kiem$;
