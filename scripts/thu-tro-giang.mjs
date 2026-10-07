// Thử TOÀN BỘ quyền trợ giảng bằng VAI THẬT.
//
//   node scripts/thu-tro-giang.mjs            thử trên CSDL đang chạy
//   THU_19=1 node scripts/thu-tro-giang.mjs   chạy schema-19 trong từng ca rồi huỷ
//                                             (thử bản sửa trước khi áp lên thật)
//
// Cùng cách với scripts/thu-tbdt.mjs: mỗi ca đổi sang vai `authenticated` với
// JWT của trợ giảng, thử thao tác, rồi `raise` ở cuối để HUỶ cả giao dịch —
// kể cả lệnh đổi quyền trợ giảng ở đầu ca. Không một dòng nào ở lại.
//
// Lớp minh hoạ 8A0: trợ giảng là 2400001 (Bùi Gia Hân), các bạn khác là người bịa.

import fs from 'node:fs'
import { q } from './db.mjs'

// Dùng biến môi trường chứ không dùng cờ dòng lệnh: db.mjs đọc tham số đầu
// tiên làm thư mục gốc của dự án.
const S19 = process.env.THU_19 ? fs.readFileSync('supabase/schema-19-tro-giang.sql', 'utf8') : ''

let dat = 0, truot = 0
const kiem = (ten, dung, chiTiet = '') => {
  if (dung) { dat++; console.log(`  ✓ ${ten}`) }
  else { truot++; console.log(`  ✗ ${ten}${chiTiet ? `\n      → ${chiTiet}` : ''}`) }
}

async function ca(than) {
  try {
    await q(`${S19}
do $ca$
declare kq jsonb := '{}'::jsonb; v_n int; v_s text; v_j json; v_id uuid; v_b boolean;
begin
${than}
  raise exception 'KQ:%', kq::text;
end $ca$;`)
    throw new Error('Ca thử không raise ở cuối — có thể đã ghi thật vào CSDL!')
  } catch (e) {
    const m = String(e.message).match(/KQ:(\{.*?\})\\nCONTEXT/)
    if (!m) throw e
    return JSON.parse(m[1].replace(/\\"/g, '"'))
  }
}

const vai = (uid) => `
  perform set_config('request.jwt.claims', json_build_object('sub','${uid}','role','authenticated')::text, true);
  set local role authenticated;`
const veAdmin = `reset role;`
const thu = (khoa, sql) => `
  begin
    ${sql};
    get diagnostics v_n = row_count;
    kq := kq || jsonb_build_object('${khoa}', case when v_n > 0 then 'duoc' else 'khong_dong_nao' end);
  exception when others then
    kq := kq || jsonb_build_object('${khoa}', 'chan: ' || replace(sqlerrm, '"', ''));
  end;`
const ghi = (khoa, bieuThuc) => `kq := kq || jsonb_build_object('${khoa}', ${bieuThuc});`

const [L] = await q(`
  select c.id lop,
    (select claimed_user_id from public.students where mshs = '2400001') ta,
    (select claimed_user_id from public.students where mshs = '2400002') hs2,
    (select claimed_user_id from public.students where mshs = '2400003') hs3,
    (select claimed_user_id from public.students where mshs = '2400004') hs4,
    (select claimed_user_id from public.students where mshs = '2400005') hs5
  from public.classes c where c.name = '8A0'`)
if (!L?.ta) throw new Error('Không thấy lớp minh hoạ 8A0.')

// Đặt quyền cho trợ giảng (bằng vai postgres, sẽ bị huỷ cùng ca).
const QUYEN = ['can_view_plans', 'can_view_help', 'can_chat', 'can_view_reflections', 'can_view_evidence',
  'can_rate', 'can_comment', 'can_review_device', 'can_approve_plan', 'can_review_books', 'can_track_attendance']
const datQuyen = (bat = []) => `
  insert into public.class_assistants (class_id, student_id) values ('${L.lop}', '${L.ta}')
    on conflict do nothing;
  update public.class_assistants set ${QUYEN.map((k) => `${k} = ${bat.includes(k)}`).join(', ')}
   where class_id = '${L.lop}' and student_id = '${L.ta}';`

// Mấy nhiệm vụ mẫu trong demo-class-data.sql. Lấy MÃ cố định ngay từ đầu:
// để dạng truy vấn con thì sau khi duyệt xong, "nhiệm vụ đang chờ duyệt" lại
// trỏ sang một nhiệm vụ KHÁC, và ca thử đọc nhầm kết quả.
const [M] = await q(`select
  (select id from public.plans where student_id = '${L.hs4}' and use_device and device_status = 'Chờ duyệt' order by study_date limit 1) thiet_bi_cho,
  (select id from public.plans where student_id = '${L.hs5}' and review_status = 'Cần điều chỉnh' limit 1) can_dieu_chinh,
  (select p.id from public.plans p join public.reflections r on r.plan_id = p.id where p.student_id = '${L.hs2}' and r.rating is null order by p.study_date limit 1) chua_cham,
  (select p.id from public.plans p join public.reflections r on r.plan_id = p.id where p.student_id = '${L.hs3}' and r.need_help and not r.help_resolved limit 1) can_ho_tro,
  (select id from public.plans where student_id = '${L.ta}' order by study_date desc limit 1) cua_chinh_em`)
for (const [k, v] of Object.entries(M)) if (!v) throw new Error(`Lớp 8A0 thiếu dữ liệu mẫu: ${k}. Chạy lại scripts/demo-class-data.sql.`)
const KH = {
  thietBiCho: `'${M.thiet_bi_cho}'::uuid`,
  canDieuChinh: `'${M.can_dieu_chinh}'::uuid`,
  chuaCham: `'${M.chua_cham}'::uuid`,
  canHoTro: `'${M.can_ho_tro}'::uuid`,
  cuaChinhEm: `'${M.cua_chinh_em}'::uuid`,
}

console.log(`\nTrợ giảng lớp 8A0${S19 ? ' · CÓ schema-19 (chạy thử rồi huỷ)' : ''}\n`)

// ===========================================================================
console.log('Không được cấp quyền gì')
{
  const r = await ca(`
    ${datQuyen([])}
    ${vai(L.ta)}
    select count(*) into v_n from public.plans where student_id <> '${L.ta}';
    ${ghi('doc_ke_hoach_ban', 'v_n')}
    ${thu('duyet', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.canDieuChinh}`)}`)
  kiem('Không đọc được kế hoạch của bạn', r.doc_ke_hoach_ban === 0, `đọc ${r.doc_ke_hoach_ban}`)
  kiem('Không duyệt được', r.duyet !== 'duoc', r.duyet)
}

// ===========================================================================
console.log('\nChỉ được giao "Duyệt kế hoạch" (lỗi GVCN báo)')
{
  const r = await ca(`
    ${datQuyen(['can_approve_plan'])}
    ${vai(L.ta)}
    ${thu('duyet_khong_tb', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.canDieuChinh}`)}
    ${veAdmin}
    select review_status into v_s from public.plans where id = ${KH.canDieuChinh};
    ${ghi('sau_duyet', 'v_s')}
    select (review_by = '${L.ta}') into v_b from public.plans where id = ${KH.canDieuChinh};
    ${ghi('ghi_nguoi_duyet', 'v_b')}
    ${vai(L.ta)}
    ${thu('duyet_co_tb', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.thietBiCho}`)}
    ${veAdmin}
    select review_status || '/' || device_status into v_s from public.plans where id = ${KH.thietBiCho};
    ${ghi('tb_sau', 'v_s')}`)
  kiem('Duyệt được kế hoạch không dùng thiết bị', r.duyet_khong_tb === 'duoc', r.duyet_khong_tb)
  kiem('…và nó thật sự thành "Đã duyệt", ghi đúng người duyệt', r.sau_duyet === 'Đã duyệt' && r.ghi_nguoi_duyet === true,
       `${r.sau_duyet}, người duyệt đúng: ${r.ghi_nguoi_duyet}`)
  kiem('Kế hoạch có thiết bị: báo rõ cần thêm quyền duyệt thiết bị', r.duyet_co_tb?.includes('Duyệt thiết bị'), r.duyet_co_tb)
  kiem('…và không để vênh "kế hoạch đã duyệt / thiết bị chờ duyệt"', r.tb_sau === 'Chờ duyệt/Chờ duyệt', r.tb_sau)
}

// ===========================================================================
console.log('\nDuyệt kế hoạch + duyệt thiết bị')
{
  const r = await ca(`
    ${datQuyen(['can_view_plans', 'can_approve_plan', 'can_review_device'])}
    ${vai(L.ta)}
    ${thu('duyet', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.thietBiCho}`)}
    ${veAdmin}
    select review_status || '/' || device_status into v_s from public.plans where id = ${KH.thietBiCho};
    ${ghi('sau', 'v_s')}
    ${vai(L.ta)}
    ${thu('tra_ve', `update public.plans set review_status = 'Cần điều chỉnh', review_note = 'Ghi rõ môn giúp tớ' where id = ${KH.canDieuChinh}`)}`)
  kiem('Duyệt kế hoạch có thiết bị → cả hai cùng "Đã duyệt"', r.duyet === 'duoc' && r.sau === 'Đã duyệt/Đã duyệt', `${r.duyet} · ${r.sau}`)
  kiem('Trả về "Cần điều chỉnh" kèm lý do được', r.tra_ve === 'duoc', r.tra_ve)
}

// ===========================================================================
console.log('\nChỉ duyệt thiết bị')
{
  const r = await ca(`
    ${datQuyen(['can_view_plans', 'can_review_device'])}
    ${vai(L.ta)}
    ${thu('tu_choi', `update public.plans set device_status = 'Từ chối', device_review_note = 'Mục đích chưa rõ' where id = ${KH.thietBiCho}`)}
    ${veAdmin}
    select review_status || '/' || device_status into v_s from public.plans where id = ${KH.thietBiCho};
    ${ghi('sau', 'v_s')}
    ${vai(L.ta)}
    ${thu('duyet_ke_hoach', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.canDieuChinh}`)}
    ${veAdmin}
    select review_status into v_s from public.plans where id = ${KH.canDieuChinh};
    ${ghi('ke_hoach_sau', 'v_s')}`)
  kiem('Từ chối thiết bị được → kế hoạch về "Cần điều chỉnh"', r.tu_choi === 'duoc' && r.sau === 'Cần điều chỉnh/Từ chối', `${r.tu_choi} · ${r.sau}`)
  kiem('Không có quyền duyệt kế hoạch thì không duyệt được', r.ke_hoach_sau === 'Cần điều chỉnh', r.ke_hoach_sau)
  kiem('…và được BÁO LỖI, không âm thầm bỏ qua', r.duyet_ke_hoach?.startsWith('chan'), r.duyet_ke_hoach)
}

// ===========================================================================
console.log('\nChỉ chấm sao (7A2 đang được giao đúng thế này, không kèm "xem phản tư")')
{
  const r = await ca(`
    ${datQuyen(['can_view_plans', 'can_rate'])}
    ${vai(L.ta)}
    ${thu('cham', `update public.reflections set rating = 4 where plan_id = ${KH.chuaCham}`)}
    ${veAdmin}
    select rating::text into v_s from public.reflections where plan_id = ${KH.chuaCham};
    ${ghi('sao_sau', 'v_s')}
    ${vai(L.ta)}
    ${thu('nhan_xet', `update public.reflections set teacher_comment = 'Tốt' where plan_id = ${KH.chuaCham}`)}`)
  kiem('Chấm sao được', r.cham === 'duoc' && r.sao_sau === '4', `${r.cham} · sao sau: ${r.sao_sau}`)
  kiem('Không có quyền nhận xét thì bị chặn, có báo lỗi', r.nhan_xet?.startsWith('chan') || r.nhan_xet === 'khong_dong_nao', r.nhan_xet)
}

// ===========================================================================
console.log('\nChỉ viết nhận xét')
{
  const r = await ca(`
    ${datQuyen(['can_view_plans', 'can_comment', 'can_view_help'])}
    ${vai(L.ta)}
    ${thu('nhan_xet', `update public.reflections set teacher_comment = 'Bạn ghi rõ lắm' where plan_id = ${KH.chuaCham}`)}
    ${thu('da_ho_tro', `update public.reflections set help_resolved = true where plan_id = ${KH.canHoTro}`)}
    ${thu('cham', `update public.reflections set rating = 5 where plan_id = ${KH.chuaCham}`)}
    select count(*) into v_n from public.help_requests where class_id = '${L.lop}';
    ${ghi('thay_ho_tro', 'v_n')}`)
  kiem('Viết nhận xét được', r.nhan_xet === 'duoc', r.nhan_xet)
  kiem('Đánh dấu "đã hỗ trợ xong" được', r.da_ho_tro === 'duoc', r.da_ho_tro)
  kiem('Không có quyền chấm sao thì bị chặn', r.cham !== 'duoc', r.cham)
  kiem('Thấy danh sách bạn cần hỗ trợ', r.thay_ho_tro >= 1, `${r.thay_ho_tro}`)
}

// ===========================================================================
console.log('\nKhông được tự duyệt, tự chấm cho chính mình')
{
  const r = await ca(`
    ${datQuyen(QUYEN)}
    ${veAdmin}
    update public.plans set review_status = 'Chờ duyệt' where id = ${KH.cuaChinhEm};
    ${vai(L.ta)}
    ${thu('tu_duyet', `update public.plans set review_status = 'Đã duyệt' where id = ${KH.cuaChinhEm}`)}
    ${veAdmin}
    select review_status into v_s from public.plans where id = ${KH.cuaChinhEm};
    ${ghi('sau', 'v_s')}`)
  kiem('Có đủ mọi quyền vẫn không tự duyệt kế hoạch của mình', r.sau === 'Chờ duyệt', r.sau)
}

// ===========================================================================
console.log('\nMinh chứng, tin nhắn, chia sẻ sách, sổ vi phạm')
{
  const r = await ca(`
    insert into public.evidence (plan_id, student_id, kind, external_url, display_name)
    values (${KH.chuaCham}, '${L.hs2}', 'link', 'https://example.com/x', 'Bài thử');
    ${datQuyen(['can_view_plans'])}
    ${vai(L.ta)}
    select count(*) into v_n from public.evidence where student_id = '${L.hs2}';
    ${ghi('mc_khong_quyen', 'v_n')}
    ${thu('chat_khong_quyen', `insert into public.conversations (class_id, student_id) values ('${L.lop}', '${L.hs3}')`)}
    ${veAdmin}
    ${datQuyen(['can_view_plans', 'can_view_evidence', 'can_chat', 'can_review_books'])}
    ${vai(L.ta)}
    select count(*) into v_n from public.evidence where student_id = '${L.hs2}';
    ${ghi('mc_co_quyen', 'v_n')}
    ${thu('chat', `insert into public.conversations (class_id, student_id) values ('${L.lop}', '${L.hs3}') on conflict do nothing`)}
    select count(*) into v_n from public.conversations where class_id = '${L.lop}' and student_id = '${L.hs3}';
    ${ghi('thay_hoi_thoai', 'v_n')}
    ${thu('ghi_chu_sach', `update public.book_shares set monitor_note = 'Bạn nộp đúng hạn' where class_id = '${L.lop}' and mshs = '2400003'`)}
    ${thu('sua_nhan_xet_gv_sach', `update public.book_shares set teacher_comment = 'x' where class_id = '${L.lop}' and mshs = '2400003'`)}
    ${veAdmin}
    select teacher_comment is distinct from 'x' into v_b from public.book_shares where class_id = '${L.lop}' and mshs = '2400003';
    ${ghi('nhan_xet_gv_con_nguyen', 'v_b')}
    ${vai(L.ta)}
    select count(*) into v_n from public.device_bans where student_id <> '${L.ta}';
    ${ghi('doc_so_vi_pham', 'v_n')}`)
  kiem('Không có quyền thì không thấy minh chứng của bạn', r.mc_khong_quyen === 0, `${r.mc_khong_quyen}`)
  kiem('Có quyền "Xem minh chứng" thì thấy', r.mc_co_quyen >= 1, `${r.mc_co_quyen}`)
  kiem('Không có quyền nhắn tin thì không mở được hội thoại', r.chat_khong_quyen?.startsWith('chan'), r.chat_khong_quyen)
  kiem('Có quyền thì mở được hội thoại với bạn', r.thay_hoi_thoai >= 1, `${r.chat} · thấy ${r.thay_hoi_thoai}`)
  kiem('Cán sự thư viện ghi chú bài chia sẻ sách được', r.ghi_chu_sach === 'duoc', r.ghi_chu_sach)
  kiem('…nhưng không sửa được nhận xét của giáo viên', r.nhan_xet_gv_con_nguyen === true)
  kiem('Không đọc được sổ vi phạm thiết bị của các bạn', r.doc_so_vi_pham === 0, `${r.doc_so_vi_pham}`)
}

// ===========================================================================
console.log('\nQuyền kéo theo (schema-19)')
{
  const r = await ca(`
    ${datQuyen(['can_rate'])}
    select can_view_plans and can_view_reflections into v_b from public.class_assistants
     where class_id = '${L.lop}' and student_id = '${L.ta}';
    ${ghi('cham_keo_theo_xem', 'v_b')}
    ${datQuyen(['can_approve_plan'])}
    select can_view_plans into v_b from public.class_assistants
     where class_id = '${L.lop}' and student_id = '${L.ta}';
    ${ghi('duyet_keo_theo_xem', 'v_b')}`)
  kiem('Giao "Chấm sao" thì tự bật "Xem kế hoạch" và "Xem phản tư"', r.cham_keo_theo_xem === true)
  kiem('Giao "Duyệt kế hoạch" thì tự bật "Xem kế hoạch"', r.duyet_keo_theo_xem === true)
}

const [sau] = await q(`select count(*) n from public.class_assistants ca join public.classes c on c.id = ca.class_id
  where c.name = '8A0' and ca.can_approve_plan`)
console.log('\nSau khi chạy')
kiem('Quyền trợ giảng lớp 8A0 trở về như cũ (không ai có quyền duyệt)', Number(sau.n) === 0, `${sau.n}`)

console.log(`\n${truot ? '✗' : '✓'} ${dat} đạt · ${truot} trượt`)
process.exit(truot ? 1 : 0)
