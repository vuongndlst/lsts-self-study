-- ============================================================================
--  DỮ LIỆU HỌC TẬP CHO LỚP MINH HOẠ 8A0
--  chạy SAU: node scripts/demo-class.mjs --up
-- ============================================================================
--  Mục đích: mọi màn hình trong tài liệu hướng dẫn đều PHẢI có dữ liệu. Ảnh
--  chụp một bảng trống thì người đọc không hiểu bảng đó để làm gì.
--
--  Nên mười em ở đây được dựng để mỗi em minh hoạ đúng một tình huống:
--    2400001 Bùi Gia Hân    — gương mẫu, kiêm cán sự theo dõi
--    2400002 Đặng Minh Quân — nhiều bài đang chờ chấm sao
--    2400003 Hồ Ngọc Diệp   — có bài bấm "cần hỗ trợ"
--    2400004 Lê Anh Tuấn    — có kế hoạch dùng thiết bị, đang chờ duyệt
--    2400005 Mai Thuỳ Linh  — bị trả về "cần điều chỉnh", có bài bị chấm thấp
--    2400006 Ngô Bảo Long   — nợ phản tư, ba nhiệm vụ quá hạn
--    2400007 Phạm Khánh Vy  — bị hệ thống tự chấm 1 sao
--    2400008 Trần Đức Huy   — quên đăng ký 4 buổi  → lao động công ích 5 lượt
--    2400009 Vũ Hải Yến     — quên 5 buổi          → 10 lượt
--    2400010 Đỗ Nhật Minh   — quên 6 buổi          → mời phụ huynh
--
--  MỌI CÁI TÊN Ở ĐÂY LÀ NGƯỜI BỊA.
--
--  Chạy lại bao nhiêu lần cũng được: xoá sạch dữ liệu học tập của lớp rồi dựng
--  lại từ đầu, nên không bao giờ nhân đôi.
-- ============================================================================

do $seed$
declare
  v_lop   uuid;
  v_gv    uuid;
  v_tuan  uuid;
begin
  select id into v_lop from public.classes where name = '8A0';
  if v_lop is null then
    raise exception 'Chưa có lớp 8A0. Chạy: node scripts/demo-class.mjs --up';
  end if;
  select teacher_id into v_gv from public.class_teachers where class_id = v_lop limit 1;

  -- ---------- Dọn trước, để chạy lại không nhân đôi ----------
  delete from public.self_study_sessions where class_id = v_lop;   -- plans cascade theo
  delete from public.plans                where class_id = v_lop;
  delete from public.attendance_misses    where class_id = v_lop;
  delete from public.discipline_cases     where class_id = v_lop;
  delete from public.class_assistants     where class_id = v_lop;
  delete from public.book_share_weeks     where class_id = v_lop;  -- book_shares cascade

  -- ---------- Lịch tự học: thứ Tư tiết 5, thứ Sáu tiết 8–9 ----------
  delete from public.class_schedule where class_id = v_lop;
  insert into public.class_schedule (class_id, weekday, period) values
    (v_lop, 3, 5), (v_lop, 5, 8), (v_lop, 5, 9);

  -- ---------- Mốc kỷ luật và học kỳ ----------
  insert into public.attendance_policy
    (class_id, enabled, free_passes, tracking_from, term1_from, term1_to, term2_from, term2_to)
  values (v_lop, true, 3, date '2026-08-24', date '2026-08-03', date '2026-12-18',
          date '2026-12-21', date '2027-05-28')
  on conflict (class_id) do update
    set enabled = true, free_passes = 3, tracking_from = date '2026-08-24',
        term1_from = date '2026-08-03', term1_to = date '2026-12-18',
        term2_from = date '2026-12-21', term2_to = date '2027-05-28';

  update public.classes set book_share_enabled = true, allow_late_registration = true
   where id = v_lop;

  -- ---------- Buổi tự học + nhiệm vụ ----------
  -- Một bảng dữ liệu duy nhất rồi sinh ra cả session lẫn plan lẫn reflection.
  -- Viết ba lệnh insert rời thì ba chỗ dễ lệch nhau khi sửa.
  create temporary table nv (
    mshs text, ngay date, tiet smallint, span smallint,
    mon text, viec text, muc_tieu text, uu_tien text,
    thiet_bi boolean, tt_duyet text, tt_tb text, ghi_chu_duyet text,
    co_pt boolean, hoan_thanh text, pt_note text,
    can_ho_tro boolean, ho_tro_note text,
    sao smallint, nx_gv text, tu_cham boolean,
    tre boolean default false
  ) on commit drop;

  insert into nv (mshs, ngay, tiet, span, mon, viec, muc_tieu, uu_tien, thiet_bi,
    tt_duyet, tt_tb, ghi_chu_duyet, co_pt, hoan_thanh, pt_note, can_ho_tro,
    ho_tro_note, sao, nx_gv, tu_cham) values
  -- === 2400001 Bùi Gia Hân — gương mẫu ===
  ('2400001','2026-08-26',5,1,'Toán','Luyện tập hằng đẳng thức, bài 1–8 trang 24','Làm đúng ít nhất 6/8 bài','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm bài 1–8 trang 24, đúng 7 bài. Bài 7 em nhầm dấu khi rút gọn, đã xem lại và hiểu chỗ sai.',false,null,5,'Em ghi rõ sai ở đâu, rất tốt. Giữ cách viết này nhé.',false),
  ('2400001','2026-08-28',8,2,'Tiếng Anh','Ôn 30 từ vựng Unit 1 và làm bài nghe','Nhớ chắc 25/30 từ','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em ôn 30 từ, tự kiểm tra nhớ được 26. Nhóm từ về nghề nghiệp còn lẫn giữa engineer và engine.',false,null,5,'Biết mình lẫn chỗ nào là đã đi được nửa đường.',false),
  ('2400001','2026-09-02',5,1,'Ngữ văn','Đọc và tóm tắt văn bản "Lão Hạc"','Viết được tóm tắt 10 dòng','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em đọc hết và viết tóm tắt 12 dòng. Đoạn Lão Hạc bán chó làm em thấy thương ông.',false,null,4,null,false),
  ('2400001','2026-09-04',8,2,'Toán','Ôn tập chương I chuẩn bị kiểm tra','Làm hết đề ôn thầy phát','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm hết 12 câu đề ôn, đúng 10. Hai câu sai đều ở phần phân tích đa thức thành nhân tử.',false,null,5,null,false),
  ('2400001','2026-09-09',5,1,'Khoa học tự nhiên','Làm bài tập về lực ma sát','Hiểu và làm được 5 bài','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm 5 bài, đúng 4. Bài cuối em chưa biết đổi đơn vị nên ra sai số.',false,null,4,null,false),
  ('2400001','2026-09-11',8,2,'Khoa học tự nhiên','Chuẩn bị báo cáo thí nghiệm nhóm','Viết xong phần kết luận','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Nhóm em xong 8/12 slide. Em phụ trách phần mở đầu, đã viết xong và tập nói một lượt.',false,null,null,null,false),
  ('2400001','2026-09-16',5,1,'Toán','Làm đề ôn số 2','Xong trước giờ về','Cao',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),

  -- === 2400002 Đặng Minh Quân — nhiều bài chờ chấm sao ===
  ('2400002','2026-09-02',5,1,'Tin học','Luyện gõ mười ngón và làm bài Scratch','Gõ được 25 từ/phút','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em gõ được 22 từ/phút, chưa đạt mục tiêu. Bài Scratch em làm xong phần điều khiển nhân vật.',false,null,3,'Chưa đạt cũng không sao, quan trọng là em đo được.',false),
  ('2400002','2026-09-04',8,2,'Lịch sử & Địa lý','Lập bảng so sánh hai cuộc khởi nghĩa','Xong bảng 2 cột','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em lập xong bảng 2 cột, 6 tiêu chí. Phần nguyên nhân thất bại em còn chưa chắc.',false,null,null,null,false),
  ('2400002','2026-09-09',5,1,'Toán','Làm bài tập về nhà phần phân thức','Làm hết 6 bài','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm được 4/6 bài. Hai bài cuối có mẫu phức tạp, em chưa rút gọn được.',false,null,null,null,false),
  ('2400002','2026-09-11',8,2,'Tiếng Anh','Viết đoạn văn 100 từ về sở thích','Viết xong và tự soát lỗi','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em viết được 95 từ. Tự soát thấy sai 3 chỗ chia thì, đã sửa.',false,null,null,null,false),
  ('2400002','2026-09-16',5,1,'Ngữ văn','Soạn bài mới','Đọc và trả lời câu hỏi SGK','Trung bình',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),

  -- === 2400003 Hồ Ngọc Diệp — cần hỗ trợ ===
  ('2400003','2026-09-04',8,2,'Toán','Làm bài tập phân tích đa thức','Làm được 5 bài','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Một phần','Em làm được 2 bài thì tắc. Em không biết khi nào thì dùng hằng đẳng thức, khi nào đặt nhân tử chung.',true,'Thầy/cô giảng lại giúp em phần chọn phương pháp với ạ.',null,null,false),
  ('2400003','2026-09-09',5,1,'Khoa học tự nhiên','Ôn công thức về áp suất','Thuộc 4 công thức','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Một phần','Em học thuộc được công thức nhưng vào bài tập lại không biết dùng cái nào.',true,'Em cần ví dụ mẫu cho từng dạng ạ.',null,null,false),
  ('2400003','2026-09-11',8,2,'Ngữ văn','Viết mở bài cho đề nghị luận','Viết được 2 mở bài khác nhau','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em viết được 2 mở bài. Cái thứ hai em thấy tự nhiên hơn.',false,null,3,'Mở bài thứ hai đúng là hay hơn. Em thử viết thêm thân bài nhé.',false),
  ('2400003','2026-09-16',5,1,'Toán','Làm lại bài tập hôm trước còn tắc','Làm được 4 bài','Cao',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),

  -- === 2400004 Lê Anh Tuấn — chờ duyệt thiết bị ===
  ('2400004','2026-09-09',5,1,'Công nghệ','Vẽ bản vẽ kỹ thuật chi tiết máy','Vẽ xong hình chiếu đứng','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em vẽ xong hình chiếu đứng và bằng. Hình chiếu cạnh em còn lúng túng.',false,null,4,null,false),
  ('2400004','2026-09-11',8,2,'Tin học','Hoàn thiện bài trình chiếu nhóm','Xong 5 slide phần mình','Cao',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm xong 5 slide. Còn phần hiệu ứng chuyển cảnh chưa biết chỉnh.',false,null,null,null,false),
  ('2400004','2026-09-16',5,1,'Tin học','Tra cứu tài liệu cho bài thuyết trình','Tìm được 3 nguồn tin cậy','Cao',true,'Chờ duyệt','Chờ duyệt',null,
    false,null,null,false,null,null,null,false),
  ('2400004','2026-09-18',8,2,'Khoa học tự nhiên','Xem video thí nghiệm và ghi chép','Ghi được quy trình 5 bước','Trung bình',true,'Chờ duyệt','Chờ duyệt',null,
    false,null,null,false,null,null,null,false),

  -- === 2400005 Mai Thuỳ Linh — cần điều chỉnh, bị chấm thấp ===
  ('2400005','2026-09-09',5,1,'Tiếng Anh','Làm bài tập ngữ pháp thì hiện tại hoàn thành','Làm hết 10 câu','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm hết 10 câu, đúng 7. Em hay nhầm giữa hiện tại hoàn thành và quá khứ đơn.',false,null,3,null,false),
  ('2400005','2026-09-11',8,2,'Ngữ văn','Học bài','Học xong','Thấp',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','xong rồi',false,null,2,'Em ghi ngắn quá nên thầy/cô không biết em đã làm được gì. Lần sau em ghi rõ học phần nào, chỗ nào còn chưa chắc nhé.',false),
  ('2400005','2026-09-16',5,1,'Khác','Ôn bài','Ôn xong','Thấp',false,'Cần điều chỉnh','Không dùng','Em ghi rõ hơn giúp thầy/cô: ôn môn nào, phần nào, và làm sao em biết là đã ôn xong?',
    false,null,null,false,null,null,null,false),

  -- === 2400006 Ngô Bảo Long — nợ phản tư ===
  ('2400006','2026-09-02',5,1,'Toán','Làm bài tập trang 30','Làm hết bài chẵn','Trung bình',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),
  ('2400006','2026-09-04',8,2,'Tiếng Anh','Ôn từ vựng Unit 2','Nhớ 20 từ','Trung bình',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),
  ('2400006','2026-09-09',5,1,'Lịch sử & Địa lý','Đọc bài và gạch ý chính','Gạch xong 3 trang','Thấp',false,'Không cần duyệt','Không dùng',null,
    false,null,null,false,null,null,null,false),
  ('2400006','2026-09-11',8,2,'Khoa học tự nhiên','Làm bài tập về nhà','Làm hết 5 bài','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm được 5 bài, đúng 3. Hai bài sai em chưa hiểu vì sao.',false,null,null,null,false),

  -- === 2400007 Phạm Khánh Vy — hệ thống tự chấm ===
  ('2400007','2026-08-26',5,1,'Ngữ văn','Đọc trước bài mới','Đọc xong','Thấp',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','đọc rồi',false,null,1,null,true),
  ('2400007','2026-08-28',8,2,'Toán','Làm bài tập','Làm xong','Thấp',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','làm xong',false,null,1,null,true),
  ('2400007','2026-09-09',5,1,'Nghệ thuật','Hoàn thiện bài vẽ phối cảnh','Tô xong phần nền','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em tô xong nền và đánh bóng. Phần xa gần em vẽ chưa đúng tỉ lệ lắm.',false,null,3,'Lần này em ghi rõ hơn hẳn, thầy/cô đọc là hình dung được.',false),

  -- === 2400008 Trần Đức Huy — quên 4 buổi ===
  ('2400008','2026-09-04',8,2,'Toán','Làm đề cương ôn tập','Xong 10 câu','Trung bình',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em làm được 8/10 câu. Câu hình học em chưa vẽ được hình.',false,null,3,null,false),
  ('2400008','2026-09-11',8,2,'Giáo dục thể chất','Ôn lý thuyết luật bóng rổ','Nhớ các lỗi cơ bản','Thấp',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em nhớ được lỗi chạy bước và lỗi 3 giây. Còn lỗi khác em chưa thuộc.',false,null,3,null,false),

  -- === 2400009 Vũ Hải Yến — quên 5 buổi ===
  ('2400009','2026-09-11',8,2,'GDCD','Đọc tình huống và trả lời câu hỏi','Trả lời hết 4 câu','Thấp',false,'Không cần duyệt','Không dùng',null,
    true,'Hoàn thành','Em trả lời được 4 câu nhưng câu cuối em chưa chắc.',false,null,2,'Em cố gắng đăng ký đều hơn nhé, thầy/cô muốn theo dõi được em.',false);

  -- Vài em đăng ký muộn — sáng ngày học mới vào đăng ký, quá hạn 24:00 hôm
  -- trước. Cần có trong ảnh để người đọc thấy nhãn "Trễ" trông thế nào.
  update nv set tre = true
   where (mshs, ngay) in (('2400005', date '2026-09-11'), ('2400002', date '2026-09-09'));

  -- 2400010 Đỗ Nhật Minh cố tình KHÔNG có kế hoạch nào: minh hoạ trường hợp em
  -- chưa từng đăng ký buổi tự học nào.

  -- Buổi tự học (một buổi có thể chứa nhiều nhiệm vụ, ở đây mỗi buổi một nhiệm vụ).
  insert into public.self_study_sessions (student_id, class_id, study_date, period)
  select distinct s.claimed_user_id, v_lop, n.ngay, n.tiet
  from nv n join public.students s on s.mshs = n.mshs;

  insert into public.plans (student_id, class_id, session_id, study_date, period, span,
    activity_type, subject, task, priority, goal, use_device, device_purpose, device_status,
    review_status, review_note, review_by, review_at, created_at)
  select s.claimed_user_id, v_lop, ss.id, n.ngay, n.tiet, n.span,
         case when n.viec ilike '%ôn%' then 'Ôn tập'
              when n.viec ilike '%nhóm%' then 'Công việc nhóm'
              when n.viec ilike '%đọc%' then 'Đọc sách'
              else 'Bài tập cá nhân' end,
         n.mon, n.viec, n.uu_tien, n.muc_tieu, n.thiet_bi,
         case when n.thiet_bi then 'Em cần tra cứu tài liệu trên máy tính của trường.' end,
         n.tt_tb, n.tt_duyet, n.ghi_chu_duyet,
         case when n.ghi_chu_duyet is not null then v_gv end,
         case when n.ghi_chu_duyet is not null then n.ngay - 2 end,
         -- Đăng ký lúc 20:30 tối hôm trước — TRƯỚC hạn 24:00, nên hiện "Đúng hạn".
         -- Phải ghi kèm +07: ::timestamptz của một date lấy theo múi giờ máy chủ
         -- (UTC), cộng 20:30 vào là thành 3:30 sáng giờ Việt Nam của ngày học,
         -- tức quá hạn. Cả lớp sẽ hiện "Trễ" — sai, mà nhìn ảnh mới thấy.
         case when n.tre then ((n.ngay)::text || ' 07:40+07')::timestamptz
              else ((n.ngay - 1)::text || ' 20:30+07')::timestamptz end
  from nv n
  join public.students s on s.mshs = n.mshs
  join public.self_study_sessions ss
    on ss.student_id = s.claimed_user_id and ss.study_date = n.ngay and ss.period = n.tiet;

  insert into public.reflections (plan_id, student_id, completion_status, note,
    need_help, help_note, rating, rating_by, rating_at, teacher_comment,
    teacher_comment_by, teacher_comment_at, auto_evaluated, auto_evaluated_at, completed_at)
  select p.id, p.student_id, n.hoan_thanh, n.pt_note,
         n.can_ho_tro, n.ho_tro_note,
         n.sao, case when n.sao is not null then v_gv end,
         case when n.sao is not null then n.ngay::timestamptz + time '19:00' end,
         n.nx_gv, case when n.nx_gv is not null then v_gv end,
         case when n.nx_gv is not null then n.ngay::timestamptz + time '19:00' end,
         n.tu_cham, case when n.tu_cham then n.ngay::timestamptz + interval '5 days' end,
         n.ngay::timestamptz + time '16:30'
  from nv n
  join public.students s on s.mshs = n.mshs
  join public.plans p on p.student_id = s.claimed_user_id
                     and p.study_date = n.ngay and p.period = n.tiet
  where n.co_pt;

  -- ---------- Những buổi quên đăng ký ----------
  -- Thứ Sáu có tiết 8 và 9 liền nhau nên ghi hai dòng, hệ thống gộp lại thành
  -- MỘT lần quên — đúng thứ tài liệu cần minh hoạ.
  insert into public.attendance_misses (class_id, mshs, study_date, period)
  select v_lop, x.mshs, x.ngay, x.tiet from (values
    ('2400008', date '2026-08-26', 5::smallint), ('2400008', date '2026-08-28', 8::smallint),
    ('2400008', date '2026-08-28', 9::smallint), ('2400008', date '2026-09-02', 5::smallint),
    ('2400008', date '2026-09-09', 5::smallint),

    ('2400009', date '2026-08-26', 5::smallint), ('2400009', date '2026-08-28', 8::smallint),
    ('2400009', date '2026-08-28', 9::smallint), ('2400009', date '2026-09-02', 5::smallint),
    ('2400009', date '2026-09-04', 8::smallint), ('2400009', date '2026-09-04', 9::smallint),
    ('2400009', date '2026-09-09', 5::smallint),

    ('2400010', date '2026-08-26', 5::smallint), ('2400010', date '2026-08-28', 8::smallint),
    ('2400010', date '2026-08-28', 9::smallint), ('2400010', date '2026-09-02', 5::smallint),
    ('2400010', date '2026-09-04', 8::smallint), ('2400010', date '2026-09-04', 9::smallint),
    ('2400010', date '2026-09-09', 5::smallint), ('2400010', date '2026-09-11', 8::smallint),
    ('2400010', date '2026-09-11', 9::smallint),

    ('2400006', date '2026-08-26', 5::smallint),
    ('2400003', date '2026-08-28', 8::smallint), ('2400003', date '2026-08-28', 9::smallint)
  ) as x(mshs, ngay, tiet);

  -- ---------- Sổ lao động công ích ----------
  insert into public.discipline_cases (class_id, mshs, term_from, labor_done, due_on,
    parent_notified_at, student_notified_at, notified_by, created_by)
  values
    (v_lop, '2400008', date '2026-08-24', 2, date '2026-09-30', null,
       timestamptz '2026-09-10 08:00+07', v_gv, v_gv),
    (v_lop, '2400010', date '2026-08-24', 4, date '2026-09-30',
       timestamptz '2026-09-12 09:15+07', timestamptz '2026-09-12 09:15+07', v_gv, v_gv);

  -- ---------- Cán sự được giao việc nhắc ----------
  insert into public.class_assistants (class_id, student_id, can_view_plans, can_view_help,
    can_chat, can_track_attendance, can_review_books, granted_by)
  select v_lop, s.claimed_user_id, true, true, true, true, true, v_gv
  from public.students s where s.mshs = '2400001';

  -- ---------- Lịch chia sẻ sách ----------
  insert into public.book_share_weeks (class_id, week_no, starts_on, ends_on, kind, report_date)
  values
    (v_lop, 1, date '2026-08-24', date '2026-08-30', 'share',  date '2026-08-28'),
    (v_lop, 2, date '2026-08-31', date '2026-09-06', 'share',  date '2026-09-04'),
    (v_lop, 3, date '2026-09-07', date '2026-09-13', 'share',  date '2026-09-11'),
    (v_lop, 4, date '2026-09-14', date '2026-09-20', 'share',  date '2026-09-18'),
    (v_lop, 5, date '2026-09-21', date '2026-09-27', 'reserve', null);

  -- Tuần 1 — đã chia sẻ xong và đã được nhận xét
  select id into v_tuan from public.book_share_weeks where class_id = v_lop and week_no = 1;
  insert into public.book_shares (class_id, week_id, mshs, book_title, author, summary, lesson,
    link_url, submitted_at, shared_on, teacher_rating, teacher_comment, teacher_by, teacher_at)
  values (v_lop, v_tuan, '2400001', 'Nhà giả kim', 'Paulo Coelho',
    'Cậu bé chăn cừu Santiago bán đàn cừu để đi tìm kho báu ở kim tự tháp Ai Cập. Trên đường đi cậu gặp người bán pha lê, nhà giả kim, và học được cách lắng nghe trái tim mình.',
    'Em học được rằng thứ mình tìm kiếm đôi khi ở ngay chỗ mình bắt đầu, nhưng phải đi hết đường mới nhận ra. Em cũng thấy Santiago dám bỏ cái chắc chắn để đi tìm cái mình thực sự muốn.',
    'https://www.canva.com/design/vi-du-minh-hoa-1/view',
    timestamptz '2026-08-25 21:10+07', date '2026-08-28', 5,
    'Em kể lại mạch truyện gọn mà vẫn đủ ý, phần bài học rút ra là suy nghĩ của chính em chứ không phải chép. Rất tốt.',
    v_gv, timestamptz '2026-08-28 16:00+07');

  -- Tuần 2 — đã chia sẻ, đã nhận xét
  select id into v_tuan from public.book_share_weeks where class_id = v_lop and week_no = 2;
  insert into public.book_shares (class_id, week_id, mshs, book_title, author, summary, lesson,
    link_url, submitted_at, shared_on, teacher_rating, teacher_comment, teacher_by, teacher_at)
  values (v_lop, v_tuan, '2400002', 'Dế Mèn phiêu lưu ký', 'Tô Hoài',
    'Dế Mèn là chú dế khoẻ mạnh nhưng kiêu ngạo. Vì trêu chị Cốc mà Dế Choắt chết oan. Từ đó Dế Mèn đi phiêu lưu, gặp nhiều bạn và dần trưởng thành.',
    'Em thấy Dế Mèn giống em ở chỗ hay nghĩ mình đúng. Cái chết của Dế Choắt làm em nhớ là lời nói đùa cũng có thể làm người khác đau.',
    'https://www.canva.com/design/vi-du-minh-hoa-2/view',
    timestamptz '2026-09-01 20:40+07', date '2026-09-04', 4,
    'Phần liên hệ bản thân rất thật. Lần sau em nói thêm một chi tiết cụ thể trong sách để minh hoạ nhé.',
    v_gv, timestamptz '2026-09-04 16:20+07');

  -- Tuần 3 — vừa nộp, chưa nhận xét
  select id into v_tuan from public.book_share_weeks where class_id = v_lop and week_no = 3;
  insert into public.book_shares (class_id, week_id, mshs, book_title, author, summary, lesson,
    link_url, submitted_at, shared_on)
  values (v_lop, v_tuan, '2400003', 'Tôi thấy hoa vàng trên cỏ xanh', 'Nguyễn Nhật Ánh',
    'Truyện kể về hai anh em Thiều và Tường ở một làng quê nghèo. Thiều nhiều lần ganh tị với em, có lần đánh em bị thương nặng.',
    'Em nhận ra mình cũng từng ganh tị với em trai. Đọc xong em thấy sợ, vì Thiều chỉ nhận ra mình sai khi mọi thứ đã muộn.',
    'https://www.canva.com/design/vi-du-minh-hoa-3/view',
    timestamptz '2026-09-08 19:55+07', date '2026-09-11');

  -- Tuần 4 — đã phân công nhưng em CHƯA nộp: minh hoạ popup nhắc trước hạn.
  select id into v_tuan from public.book_share_weeks where class_id = v_lop and week_no = 4;
  insert into public.book_shares (class_id, week_id, mshs) values (v_lop, v_tuan, '2400004');

  raise notice 'Xong. Lop 8A0 da co du lieu minh hoa.';
end
$seed$;

-- Kiểm lại ngay để biết dựng có đúng không.
select 'nhiem vu'      as muc, count(*)::text as so from public.plans p
  join public.classes c on c.id = p.class_id where c.name = '8A0'
union all select 'phan tu', count(*)::text from public.reflections r
  join public.plans p on p.id = r.plan_id join public.classes c on c.id = p.class_id where c.name='8A0'
union all select 'luot quen (tiet)', count(*)::text from public.attendance_misses am
  join public.classes c on c.id = am.class_id where c.name='8A0'
union all select 'buoi quen', count(*)::text from public.attendance_miss_sessions ms
  join public.classes c on c.id = ms.class_id where c.name='8A0'
union all select 'bai chia se sach', count(*)::text from public.book_shares bs
  join public.classes c on c.id = bs.class_id where c.name='8A0';
