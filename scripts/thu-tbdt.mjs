// Thử các luật TBĐT (schema-16 + schema-17) bằng VAI THẬT.
//
//   node scripts/thu-tbdt.mjs
//
// Vì sao không chạy select thẳng qua Management API rồi xem kết quả: API đó
// chạy bằng vai postgres, mà postgres BỎ QUA hết RLS — thử kiểu đó luôn "đúng",
// không chứng minh được gì. Ở đây mỗi ca:
//
//   1. dựng tình huống bằng vai postgres (đặt giới hạn lớp, xoá kế hoạch cũ…);
//   2. đổi sang vai `authenticated` và giả JWT của đúng người (học sinh / GV);
//   3. thử thao tác, ghi lại ĐƯỢC hay BỊ CHẶN kèm lời báo;
//   4. `raise exception` ở cuối → cả giao dịch HUỶ. Không một dòng nào ở lại.
//
// Đã kiểm: Management API chạy cả chuỗi lệnh như MỘT giao dịch, nên raise ở
// cuối huỷ được cả lệnh tạo bảng. Nhờ vậy ca minh chứng chạy được schema-17
// ngay bên trong rồi tự huỷ — thử trước khi nó được áp lên CSDL thật.
//
// Chỉ dùng lớp minh hoạ 8A0: mười học sinh bịa, không đụng học sinh thật.

import fs from 'node:fs'
import { q } from './db.mjs'

let dat = 0, truot = 0
const kiem = (ten, dung, chiTiet = '') => {
  if (dung) { dat++; console.log(`  ✓ ${ten}`) }
  else { truot++; console.log(`  ✗ ${ten}${chiTiet ? `\n      → ${chiTiet}` : ''}`) }
}

// Chạy một ca. Thân ca ghi kết quả vào biến jsonb `kq`; cuối cùng raise để huỷ.
async function ca(than, truocDo = '') {
  try {
    await q(`${truocDo}
do $ca$
declare kq jsonb := '{}'::jsonb; v_n int; v_s text; v_j json; v_id uuid;
begin
${than}
  raise exception 'KQ:%', kq::text;
end $ca$;`)
    throw new Error('Ca thử không raise ở cuối — có thể đã ghi thật vào CSDL!')
  } catch (e) {
    const m = String(e.message).match(/KQ:(\{.*?\})\\nCONTEXT/)
    if (!m) throw e
    // Lỗi trả về là JSON lồng trong JSON nên dấu nháy bị thoát thành \" — gỡ ra.
    return JSON.parse(m[1].replace(/\\"/g, '"'))
  }
}

// ---- Mấy mẩu SQL dùng lại ----
const vai = (uid) => `
  perform set_config('request.jwt.claims', json_build_object('sub','${uid}','role','authenticated')::text, true);
  set local role authenticated;`
const veAdmin = `reset role;`
// Thử một câu lệnh: được thì ghi 'duoc', bị chặn thì ghi lời báo lỗi.
const thu = (khoa, sql) => `
  begin
    ${sql};
    kq := kq || jsonb_build_object('${khoa}', 'duoc');
  exception when others then
    kq := kq || jsonb_build_object('${khoa}', 'chan: ' || sqlerrm);
  end;`
const ghi = (khoa, bieuThuc) => `kq := kq || jsonb_build_object('${khoa}', ${bieuThuc});`
const keHoach = (hs, ngay, tiet, coTB) => `insert into public.plans
  (student_id, study_date, period, activity_type, subject, task, priority, goal, use_device, device_purpose)
  values ('${hs}', ${ngay}, ${tiet}, 'Ôn tập', 'Toán', 'Làm bài tập thử', 'Trung bình', 'Xong 5 bài',
          ${coTB}, ${coTB ? "'Tra cứu tài liệu'" : 'null'})`

// ---- Dò lớp 8A0 lúc chạy, không cắm mã cứng ----
const [L] = await q(`
  select c.id lop,
    (select teacher_id from public.class_teachers where class_id = c.id limit 1) gv,
    (select claimed_user_id from public.students where mshs = '2400001') hs1,
    (select claimed_user_id from public.students where mshs = '2400002') hs2,
    public.vn_today() hom_nay
  from public.classes c where c.name = '8A0'`)
if (!L?.lop || !L.gv || !L.hs1 || !L.hs2) throw new Error('Không tìm thấy lớp minh hoạ 8A0 đủ dữ liệu.')

// Ngày thử: lớp 8A0 tự học T4 tiết 5 và T6 tiết 8–9. Lấy T4 và T6 của TUẦN SAU
// (cùng một tuần, đều ở tương lai nên đăng ký đúng hạn).
const TUAN_SAU = `(date_trunc('week', public.vn_today())::date + 7)`
const T4 = `(${TUAN_SAU} + 2)`
const T6 = `(${TUAN_SAU} + 4)`
// Ngày tự học đầu tiên nằm TRONG 6 ngày tới — chắc chắn rơi vào thời gian cấm.
const TRONG_CAM = `(select d::date from generate_series(public.vn_today() + 1, public.vn_today() + 6, '1 day') d
                    where extract(isodow from d) in (3, 5) order by d limit 1)`
const TIET_CUA = (ngay) => `(case extract(isodow from ${ngay}) when 3 then 5 else 8 end)`
// Dọn kế hoạch sẵn có của em trong tuần thử, để đếm lượt không bị lệch.
const donTuan = (hs) => `delete from public.plans where student_id = '${hs}'
  and study_date between public.vn_today() and ${TUAN_SAU} + 6;`

console.log(`\nLớp 8A0 · hôm nay ${L.hom_nay}\n`)

// ===========================================================================
console.log('Kỷ luật quên đăng ký — tắt chứ không xoá')
{
  const r = await ca(`
    ${ghi('cong_tac', 'public.discipline_on()')}
    ${vai(L.hs1)}
    ${ghi('hs_thay_the_diem_danh', '(public.my_attendance_status() is not null)')}
    ${vai(L.gv)}
    select count(*) into v_n from public.class_attendance_board('${L.lop}');
    ${ghi('gv_thay_bang_ky_luat', 'v_n')}
    ${veAdmin}
    ${ghi('ghi_lan_quen_moi', `(public.record_attendance_misses(${T4} - 7)->>'so_luot_quen_moi')::int`)}

    -- Đối chứng: bật lại công tắc NGAY TRONG giao dịch này (sẽ huỷ). Nếu lúc
    -- bật mà thẻ điểm danh hiện lại thì đúng là công tắc làm nó tắt, không
    -- phải tại lớp 8A0 không bật kỷ luật.
    update public.app_settings set value_bool = true where key = 'attendance_discipline_enabled';
    ${vai(L.hs1)}
    ${ghi('bat_lai_thi_hien', '(public.my_attendance_status() is not null)')}`)
  kiem('Công tắc toàn trường đang TẮT', r.cong_tac === false)
  kiem('Học sinh không còn thấy thẻ điểm danh', r.hs_thay_the_diem_danh === false)
  kiem('Giáo viên không còn thấy bảng kỷ luật', r.gv_thay_bang_ky_luat === 0)
  kiem('Job 0h05 không ghi lần quên nào', r.ghi_lan_quen_moi === 0, `ghi ${r.ghi_lan_quen_moi}`)
  kiem('Bật lại công tắc thì hiện lại — dữ liệu và cài đặt lớp còn nguyên', r.bat_lai_thi_hien === true)
}

// ===========================================================================
console.log('\nMặc định không giới hạn')
{
  const r = await ca(`
    ${donTuan(L.hs1)}
    ${vai(L.hs1)}
    ${thu('t4', keHoach(L.hs1, T4, 5, true))}
    ${thu('t6', keHoach(L.hs1, T6, 8, true))}
    select public.my_device_quota(${T4}) into v_j;
    ${ghi('han_muc', 'v_j')}`)
  kiem('Đăng ký thiết bị thứ 4 được', r.t4 === 'duoc', r.t4)
  kiem('Đăng ký thiết bị thứ 6 cùng tuần cũng được', r.t6 === 'duoc', r.t6)
  kiem('my_device_quota: không giới hạn, đã dùng 2 ngày', r.han_muc?.gioi_han === null && r.han_muc?.da_dung === 2,
       JSON.stringify(r.han_muc))
}

// ===========================================================================
console.log('\nGiới hạn những thứ được dùng')
{
  const r = await ca(`
    ${donTuan(L.hs1)}
    update public.classes set device_weekdays = array[5]::smallint[] where id = '${L.lop}';
    ${vai(L.hs1)}
    ${thu('tb_t4', keHoach(L.hs1, T4, 5, true))}
    ${thu('tb_t6', keHoach(L.hs1, T6, 8, true))}
    ${thu('khong_tb_t4', keHoach(L.hs1, T4, 5, false))}`)
  kiem('Thứ 4 không nằm trong danh sách → chặn', r.tb_t4?.startsWith('chan') && r.tb_t4.includes('Thứ 6'), r.tb_t4)
  kiem('Thứ 6 được dùng → được', r.tb_t6 === 'duoc', r.tb_t6)
  kiem('Không dùng thiết bị thì thứ nào cũng đăng ký được', r.khong_tb_t4 === 'duoc', r.khong_tb_t4)
}

// ===========================================================================
console.log('\nGiới hạn số ngày mỗi tuần — đếm theo NGÀY')
{
  const r = await ca(`
    ${donTuan(L.hs1)}
    update public.classes set device_days_per_week = 1 where id = '${L.lop}';
    ${vai(L.hs1)}
    ${thu('ngay_1', keHoach(L.hs1, T4, 5, true))}
    ${thu('cung_ngay_nhiem_vu_2', keHoach(L.hs1, T4, 5, true))}
    ${thu('ngay_2', keHoach(L.hs1, T6, 8, true))}
    -- Nhiệm vụ không thiết bị rồi BẬT thiết bị lên (đường UPDATE) cũng phải bị chặn.
    ${thu('tao_khong_tb', keHoach(L.hs1, T6, 8, false))}
    ${thu('bat_tb_bang_sua', `update public.plans set use_device = true, device_purpose = 'Tra cứu'
       where student_id = '${L.hs1}' and study_date = ${T6} and not use_device`)}
    select count(*) into v_n from public.plans where student_id = '${L.hs1}' and study_date = ${T6} and use_device;
    ${ghi('t6_co_tb_sau_khi_sua', 'v_n')}`)
  kiem('Ngày thứ nhất được', r.ngay_1 === 'duoc', r.ngay_1)
  kiem('Thêm nhiệm vụ cùng ngày vẫn là một lần → được', r.cung_ngay_nhiem_vu_2 === 'duoc', r.cung_ngay_nhiem_vu_2)
  kiem('Ngày thứ hai trong tuần → chặn', r.ngay_2?.startsWith('chan') && r.ngay_2.includes('1 ngày'), r.ngay_2)
  kiem('Bật thiết bị bằng cách sửa nhiệm vụ → cũng chặn', r.bat_tb_bang_sua?.startsWith('chan'), r.bat_tb_bang_sua)
  kiem('…và nhiệm vụ đó vẫn không có thiết bị', r.t6_co_tb_sau_khi_sua === 0)
}

// ===========================================================================
console.log('\nGhi vi phạm → tạm dừng 7 ngày')
{
  const r = await ca(`
    ${donTuan(L.hs1)}
    -- Một buổi thiết bị ĐÃ DUYỆT nằm trong thời gian sắp bị cấm.
    insert into public.plans (student_id, study_date, period, activity_type, subject, task, priority, goal,
                              use_device, device_purpose, device_status, review_status)
    values ('${L.hs1}', ${TRONG_CAM}, ${TIET_CUA(TRONG_CAM)}, 'Ôn tập', 'Toán', 'Đã duyệt từ trước', 'Trung bình',
            'Xong', true, 'Tra cứu', 'Đã duyệt', 'Đã duyệt')
    returning id into v_id;

    ${vai(L.hs1)}
    ${thu('hs_tu_ghi_vi_pham', `perform public.record_device_violation('${L.hs1}', 'thử')`)}
    ${thu('hs_goi_ham_luat', `perform public.device_rule_violation('${L.hs1}', '${L.lop}', ${T4}, null)`)}

    ${vai(L.gv)}
    select public.record_device_violation('${L.hs1}', 'Dùng điện thoại khi chưa đăng ký') into v_j;
    ${ghi('ket_qua_ghi', 'v_j')}
    select device_status into v_s from public.plans where id = v_id;
    ${ghi('buoi_da_duyet_gio_la', 'v_s')}

    ${vai(L.hs1)}
    ${thu('dang_ky_tb_trong_cam', keHoach(L.hs1, TRONG_CAM, TIET_CUA(TRONG_CAM), true))}
    ${thu('dang_ky_khong_tb_trong_cam', keHoach(L.hs1, TRONG_CAM, TIET_CUA(TRONG_CAM), false))}
    select public.my_device_quota() into v_j;
    ${ghi('hs_thay_cam_den', "v_j->>'cam_den'")}
    select count(*) into v_n from public.notifications where user_id = '${L.hs1}' and title like 'Tạm dừng%';
    ${ghi('hs_nhan_thong_bao', 'v_n')}

    ${vai(L.hs2)}
    select count(*) into v_n from public.device_bans where student_id = '${L.hs1}';
    ${ghi('ban_khac_doc_duoc', 'v_n')}

    ${vai(L.gv)}
    select id into v_id from public.device_bans where student_id = '${L.hs1}' and lifted_at is null;
    perform public.lift_device_ban(v_id);
    ${vai(L.hs1)}
    ${thu('sau_khi_go', keHoach(L.hs1, TRONG_CAM, TIET_CUA(TRONG_CAM), true))}`)
  kiem('Học sinh không tự ghi vi phạm được', r.hs_tu_ghi_vi_pham?.includes('chủ nhiệm'), r.hs_tu_ghi_vi_pham)
  kiem('Học sinh không gọi thẳng hàm luật được (dò ai bị cấm)', r.hs_goi_ham_luat?.includes('permission denied'), r.hs_goi_ham_luat)
  kiem('Giáo viên ghi được, cấm đúng 7 ngày (hôm nay → +6)',
       r.ket_qua_ghi?.tu === L.hom_nay && (new Date(r.ket_qua_ghi.den) - new Date(r.ket_qua_ghi.tu)) / 864e5 === 6,
       JSON.stringify(r.ket_qua_ghi))
  kiem('Buổi thiết bị đã duyệt trong thời gian cấm → tự huỷ duyệt', r.buoi_da_duyet_gio_la === 'Từ chối', r.buoi_da_duyet_gio_la)
  kiem('…và báo số buổi bị huỷ', r.ket_qua_ghi?.huy_duyet === 1, JSON.stringify(r.ket_qua_ghi))
  kiem('Đang bị cấm → đăng ký thiết bị bị chặn', r.dang_ky_tb_trong_cam?.startsWith('chan') && r.dang_ky_tb_trong_cam.includes('tạm dừng'), r.dang_ky_tb_trong_cam)
  kiem('Đang bị cấm vẫn đăng ký tự học KHÔNG thiết bị được', r.dang_ky_khong_tb_trong_cam === 'duoc', r.dang_ky_khong_tb_trong_cam)
  kiem('Học sinh thấy mình bị cấm đến ngày nào', r.hs_thay_cam_den === r.ket_qua_ghi?.den, r.hs_thay_cam_den)
  kiem('Học sinh nhận được thông báo', r.hs_nhan_thong_bao >= 1)
  kiem('Bạn cùng lớp KHÔNG đọc được lệnh cấm của bạn khác', r.ban_khac_doc_duoc === 0, `đọc được ${r.ban_khac_doc_duoc}`)
  kiem('Gỡ cấm xong thì đăng ký thiết bị lại được', r.sau_khi_go === 'duoc', r.sau_khi_go)
}

// ===========================================================================
console.log('\nMinh chứng bắt buộc (schema-17, chạy thử rồi huỷ — chưa áp lên CSDL thật)')
{
  const s17 = fs.readFileSync('supabase/schema-17-minh-chung-tbdt.sql', 'utf8')
  // Nhiệm vụ đã qua (hôm qua về trước) để được phép ghi kết quả và minh chứng.
  const r = await ca(`
    insert into public.plans (student_id, study_date, period, activity_type, subject, task, priority, goal,
                              use_device, device_purpose, device_status, review_status)
    values ('${L.hs1}', public.vn_today() - 7, 5, 'Ôn tập', 'Toán', 'Có thiết bị', 'Trung bình', 'Xong',
            true, 'Tra cứu', 'Đã duyệt', 'Đã duyệt')
    returning id into v_id;
    ${vai(L.hs1)}
    ${thu('ket_qua_chua_co_minh_chung', `insert into public.reflections (plan_id, student_id, completion_status, note)
       values (v_id, '${L.hs1}', 'Hoàn thành', 'Em làm xong')`)}
    ${thu('them_lien_ket', `insert into public.evidence (plan_id, student_id, kind, external_url, display_name)
       values (v_id, '${L.hs1}', 'link', 'https://example.com/bai', 'Bài làm')`)}
    ${thu('ket_qua_sau_khi_co', `insert into public.reflections (plan_id, student_id, completion_status, note)
       values (v_id, '${L.hs1}', 'Hoàn thành', 'Em làm xong')`)}
    ${thu('xoa_minh_chung_cuoi', `delete from public.evidence where plan_id = v_id`)}
    select count(*) into v_n from public.evidence where plan_id = v_id;
    ${ghi('con_lai', 'v_n')}
    ${thu('viet_phan_hoi_sau_cham', `update public.reflections set student_ack_note = 'Em sẽ sửa' where plan_id = v_id`)}`,
  s17)
  kiem('Lưu kết quả khi chưa có minh chứng → chặn', r.ket_qua_chua_co_minh_chung?.includes('minh chứng'), r.ket_qua_chua_co_minh_chung)
  kiem('Liên kết được tính là minh chứng', r.them_lien_ket === 'duoc', r.them_lien_ket)
  kiem('Có minh chứng rồi thì lưu kết quả được', r.ket_qua_sau_khi_co === 'duoc', r.ket_qua_sau_khi_co)
  kiem('Xoá minh chứng cuối cùng → chặn', r.xoa_minh_chung_cuoi?.includes('cuối cùng'), r.xoa_minh_chung_cuoi)
  kiem('…và nó vẫn còn', r.con_lai === 1)
  kiem('Viết phản hồi sau khi bị chấm thì không bị luật minh chứng chặn', r.viet_phan_hoi_sau_cham === 'duoc', r.viet_phan_hoi_sau_cham)
}

// ---- Không được để lại gì ----
const [sau] = await q(`select
  (select count(*) from public.device_bans) cam,
  (select device_days_per_week from public.classes where id = '${L.lop}') gioi_han,
  (select device_weekdays from public.classes where id = '${L.lop}') thu,
  public.discipline_on() cong_tac,
  (select count(*) from pg_trigger where tgname = 'trg_y_device_evidence') trigger_17`)
console.log('\nSau khi chạy')
kiem('Không để lại lệnh cấm nào', Number(sau.cam) === 0, `còn ${sau.cam}`)
kiem('Cài đặt lớp 8A0 trở về như cũ', sau.gioi_han === null && sau.thu === null, JSON.stringify(sau))
kiem('Công tắc kỷ luật vẫn TẮT', sau.cong_tac === false)
kiem('schema-17 chưa bị áp lên CSDL thật', Number(sau.trigger_17) === 0)

console.log(`\n${truot ? '✗' : '✓'} ${dat} đạt · ${truot} trượt`)
process.exit(truot ? 1 : 0)
