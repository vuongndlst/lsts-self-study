// Video hướng dẫn cho HỌC SINH: tám phân đoạn, ghép thành một cuốn.
//
//   DEMO_MK=<mật khẩu> node scripts/video-hs.mjs          quay tất cả rồi ghép
//   DEMO_MK=<mật khẩu> node scripts/video-hs.mjs 3        chỉ quay lại đoạn 3
//                      node scripts/video-hs.mjs --tron   đổi nhạc, khỏi quay lại
//                      node scripts/video-hs.mjs --ghep   đổi chữ trên thẻ tên
//
// Mỗi đoạn đăng nhập bằng em nào có đúng tình huống cần minh hoạ — xem đầu file
// scripts/demo-class-data.sql để biết em nào đóng vai gì. Toàn bộ tên và số
// liệu trong video là của lớp minh hoạ 8A0, người bịa.
//
// Lời thoại xưng "em" như khi nói với học sinh, khác hẳn bản giáo viên.
//
// Máy chủ phải chạy bản build ở http://localhost:4173. Phần dựng phim nằm ở
// scripts/video-chung.mjs, dùng chung với bản giáo viên.

import path from 'node:path'
import { dangNhap, doi } from './shoot.mjs'
import { LOP_PHU } from './quay.mjs'
import { dungPhim } from './video-chung.mjs'

const RA = 'docs/huong-dan/video/hoc-sinh'
const TAM = process.env.TAM || path.join(process.env.TEMP || '.', 'quay-tam')
const MK = process.env.DEMO_MK
const doiSo = process.argv[2] ?? ''
if (!MK && !doiSo.startsWith('--')) {
  throw new Error('Đặt DEMO_MK=<mật khẩu học sinh lớp mẫu> trước khi chạy.')
}

const EM = {
  guongMau: '2400001',   // Bùi Gia Hân   — dữ liệu đầy đủ, đã được chấm sao
  noPhanTu: '2400006',   // Ngô Bảo Long  — 3 nhiệm vụ quá hạn, sẽ bật popup nhắc
  canHoTro: '2400003',   // Hồ Ngọc Diệp  — có bài bấm "cần hỗ trợ"
  sapChiaSe: '2400004',  // Lê Anh Tuấn   — tới lượt chia sẻ sách, chưa nộp
  biKyLuat: '2400008',   // Trần Đức Huy  — đang phải lao động công ích
}

await dungPhim({
  RA, TAM, doiSo,
  tenGop: 'Toan-bo-huong-dan-hoc-sinh',
  nhanBia: 'HƯỚNG DẪN DÀNH CHO HỌC SINH',
  tuaBia: 'Hướng dẫn sử dụng cho học sinh',
  // Đoạn 1 quay màn hình khi CHƯA đăng nhập, nên phiên mở ra để trống; mỗi đoạn
  // tự đăng nhập bằng em mình cần.
  dangNhapVao: async () => {},
  taoDoan: ({ t, may, K }) => {
    let dangLa = null
    const vao = async (mshs) => {
      if (dangLa === mshs) return
      await t.chay(`try { localStorage.clear() } catch {}; return 1`)
      await dangNhap(t, { vai: 'hs', tk: mshs, mk: MK })
      dangLa = mshs
    }
    // Popup nhắc việc che mất trang, nên phần lớn cảnh phải đóng nó trước.
    const dongPopup = async () => {
      await t.chay(`window.__nut('Để sau')?.click(); return 1`)
      await doi(600)
    }
    const dongCuaSo = async () => {
      await t.chay(`document.querySelector('.modal-head .icon-button')?.click(); return 1`)
      await doi(800)
    }
    // Lớp phủ (phụ đề + con trỏ) phải dựng lại sau MỖI lần chuyển trang, vì
    // chuyển trang là nạp lại tài liệu, mọi thứ chèn vào body bay hết.
    const lopPhu = async () => {
      await t.chay(LOP_PHU + '; window.__dungLopPhu(); return 1')
      await doi(500)
    }
    const veTrangEm = async (mshs) => {
      await vao(mshs)
      await t.den('/#/student', 'Kế hoạch của em')
      await lopPhu()
      await dongPopup()
      await t.cuon(0)
    }

    return [
    // ===================================================================== 1
    ['1-tao-tai-khoan-va-dang-nhap', 'Tạo tài khoản và đăng nhập',
     'Đăng ký lần đầu bằng MSHS · đặt mật khẩu · quên mật khẩu thì làm gì.',
     async () => {
      await t.chay(`try { localStorage.clear() } catch {}; return 1`)
      await t.den('/#/', 'Lập kế hoạch')
      await lopPhu()
      await may.bat()
      await K.noi('Em chỉ tạo tài khoản một lần duy nhất trong cả năm học.')
      await K.tro('a', 'Bắt đầu')
      await K.noi('Từ trang chủ, bấm Bắt đầu.', 1400); await K.bam(2600)
      await lopPhu()
      await K.noi('Chưa có tài khoản thì chọn Đăng ký lần đầu.')
      await t.den('/#/register', 'Tạo tài khoản học sinh')
      await lopPhu()
      await K.noi('Nhập mã số học sinh của em — đúng bảy chữ số, ghi trên thẻ.')
      await K.tro('input[type=password]', null, 1000)
      await K.noi('Rồi đặt mật khẩu riêng và gõ lại cho khớp.')
      await K.noi('Các quy tắc hiện ngay dưới ô nhập. Đủ điều kiện nào thì điều kiện đó xanh lên.')
      await K.noi('Mật khẩu KHÔNG được chứa mã số học sinh của em — đây là lỗi hay gặp nhất.')
      await t.den('/#/login', 'Đăng nhập')
      await lopPhu()
      await t.chay(`window.__nut('Học sinh')?.click(); return 1`)
      await doi(600)
      await K.noi('Lúc đăng nhập, nhớ chọn đúng thẻ Học sinh.')
      await K.noi('Nhập mã số học sinh, không phải email.')
      await K.tro('button', 'Quên mật khẩu', 1100)
      await K.noi('Quên mật khẩu thì bấm đây, hệ thống gửi liên kết về email trường của em.')
      await K.bam(2600)
      await K.noi('Không mở được email trường thì báo thầy cô chủ nhiệm, thầy cô đặt lại giúp em.')
      await K.im()
    }],

    // ===================================================================== 2
    ['2-man-hinh-chinh', 'Màn hình chính của em',
     'Nút đăng ký · thẻ điểm danh · bộ lọc nhanh · cửa sổ nhắc việc.',
     async () => {
      await veTrangEm(EM.guongMau)
      await may.bat()
      await K.noi('Đăng nhập xong, tất cả những gì em cần đều nằm ở màn hình này.')
      await K.tro('button', 'Đăng ký giờ tự học', 1200)
      await K.noi('Nút xanh đậm này để đăng ký một buổi tự học mới.')
      await K.tro('.attend-card', null, 1200)
      await K.noi('Thẻ điểm danh cho biết học kỳ này em đã quên đăng ký mấy lần.')
      await K.noi('Và còn mấy lần được miễn trừ.')
      await K.tro('.quick-views', null, 1200)
      await K.noi('Dải bộ lọc nhanh: bấm một cái là hiện đúng nhóm nhiệm vụ đó.')
      await K.noi('Mỗi lần vào trang, em nhìn hai con số: Trễ hạn và Cần viết phản hồi.')
      await K.noi('Hai con số đó bằng không nghĩa là em không nợ việc gì.')
      await K.im()
    }],

    // ===================================================================== 3
    ['3-dang-ky-buoi-tu-hoc', 'Đăng ký một buổi tự học',
     'Hạn 24:00 hôm trước · chọn ngày và tiết · ghi mục tiêu đo được.',
     async () => {
      await veTrangEm(EM.guongMau)
      await may.bat()
      await K.noi('Hạn đăng ký là 24 giờ của ngày hôm trước.')
      await K.noi('Đăng ký sau mốc đó thì buổi của em bị đánh dấu Trễ.')
      await K.tro('button', 'Đăng ký giờ tự học')
      await K.noi('Bấm Đăng ký giờ tự học.', 1400); await K.bam(2800)
      await t.chay(`const d=document.querySelector('.register-card input[type=date]');
                    if (d) window.__dat(d, '2026-09-16'); return !!d`)
      await doi(1200)
      await K.noi('Chọn ngày trước, rồi phần chọn tiết mới hiện ra.')
      await K.noi('Hệ thống chỉ mở những tiết lớp em thực sự có giờ tự học.')
      await K.noi('Thứ nào lớp không có giờ tự học thì không chọn được — như vậy là đúng.')
      await K.cuon(320)
      await K.noi('Rồi ghi nhiệm vụ: môn gì, làm việc cụ thể nào, mục tiêu là gì.')
      await K.noi('Mục tiêu nên đo được. "Học bài" thì không biết thế nào là xong.')
      await K.noi('"Làm bài 1 đến 8 trang 24, đúng ít nhất 6 bài" thì cuối buổi em tự biết mình đạt chưa.')
      await K.noi('Buổi đó cần máy tính hay điện thoại thì bật Cần dùng thiết bị và ghi rõ dùng để làm gì.')
      await K.im()
    }],

    // ===================================================================== 4
    ['4-cap-nhat-ket-qua', 'Cập nhật kết quả — phần quan trọng nhất',
     'Viết gì cho đủ ý · bật cần hỗ trợ · đính kèm sản phẩm.',
     async () => {
      await veTrangEm(EM.guongMau)
      await may.bat()
      await K.noi('Đăng ký mới là một nửa. Nửa còn lại là quay lại ghi em đã làm được tới đâu.')
      await K.noi('Đây là phần nhiều bạn bỏ qua, nhưng lại quan trọng nhất.')
      await K.tro('button', 'Xem lại / bổ sung kết quả')
      await K.noi('Trên thẻ của buổi đã qua có nút này.', 1400); await K.bam(3000)
      await K.noi('Hệ thống gợi ý sẵn hai câu hỏi ngay trên ô nhập.')
      await K.noi('Em cứ trả lời hai câu đó là đủ.')
      await K.noi('Viết "xong rồi" là chưa đủ — thầy cô đọc xong vẫn không biết em vướng ở đâu.')
      await K.noi('Thanh màu dưới ô nhập cho em biết đã viết đủ ý chưa.')
      await K.noi('Khi nào hiện "Đủ ý rồi, cảm ơn em" là được.')
      await K.noi('Còn vướng thì bật công tắc Em cần giáo viên hỗ trợ và ghi rõ vướng chỗ nào.')
      await K.noi('Buổi đó sẽ hiện trên bảng của thầy cô kèm dấu cần hỗ trợ.')
      await t.chay(`document.querySelector('.modal .evidence-block')
                      ?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
      await doi(1000)
      await K.noi('Có sản phẩm chụp được thì đính kèm ở cuối, tối đa ba thứ.')
      await K.noi('Không bắt buộc phải có ảnh — ôn bài hay đọc sách thì phần chữ em viết mới là chính.')
      await dongCuaSo()
      await K.im()
    }],

    // ===================================================================== 5
    // Đổi tài khoản GIỮA một đoạn thì không được: may.bat() xoá sạch khung hình
    // đã ghi, nên nửa đầu đoạn biến mất. Hai tình huống cần hai em khác nhau
    // (em đã được chấm sao, và em đang bị kỷ luật) nên tách hẳn thành hai đoạn.
    ['5-xem-cham-sao', 'Xem thầy cô chấm sao và nhận xét',
     'Mở một buổi đã chấm · vì sao một hai sao lại phải viết phản hồi.',
     async () => {
      await veTrangEm(EM.guongMau)
      await may.bat()
      await K.noi('Thầy cô chấm từ một tới năm sao và viết nhận xét cho từng nhiệm vụ.')
      // Thẻ cần mở không chỉ ra được bằng một selector, nên tìm bằng JS rồi
      // giao cho __troToiPhanTu — để cú bấm vẫn có vòng sáng và tiếng click.
      await t.chay(`
        const c = [...document.querySelectorAll('.session-card')]
          .find(e => e.textContent.includes('Lão Hạc'))
          || document.querySelectorAll('.session-card')[2];
        return window.__troToiPhanTu(c?.querySelector('button'))`)
      await doi(900)
      await K.noi('Bấm vào một buổi đã chấm để xem đầy đủ.', 1400); await K.bam(3000)
      await K.noi('Cửa sổ hiện số sao, nhận xét của thầy cô, và phần em đã ghi.')
      await K.noi('Bị một hoặc hai sao thì em cần viết một dòng cho biết sẽ điều chỉnh thế nào.')
      await K.noi('Đây không phải hình phạt — đó là cách để lần sau em làm tốt hơn.')
      await dongCuaSo()
      await K.noi('Em vẫn sửa lại kết quả đã ghi được. Thầy cô sẽ chấm lại.')
      await K.im()
    }],

    // ===================================================================== 6
    ['6-quen-dang-ky-va-lao-dong', 'Quên đăng ký và lao động công ích',
     'Hai tiết liền nhau tính một lần · thang kỷ luật · xin miễn buổi.',
     async () => {
      await veTrangEm(EM.biKyLuat)
      await may.bat()
      await t.chay(`document.querySelector('.attend-card')
                      ?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
      await doi(1000)
      await K.noi('Ngày lớp có tiết tự học mà em không đăng ký gì thì bị ghi một lần quên.')
      await K.noi('Hệ thống ghi lúc không giờ năm phút sáng hôm sau, nên đăng ký muộn trong ngày vẫn kịp.')
      await K.noi('Hai tiết liền nhau trong cùng một buổi chỉ tính MỘT lần quên, không phải hai.')
      await K.tro('.attend-summary', null, 1100)
      await K.noi('Bấm vào thẻ điểm danh để xem bảng quy định.', 1400); await K.bam(2800)
      await K.noi('Ba lần đầu được miễn trừ. Lần thứ tư là lao động công ích năm lượt.')
      await K.noi('Lần thứ năm là mười lượt. Từ lần thứ sáu thì thầy cô trao đổi với phụ huynh.')
      await K.noi('Thang này không cộng dồn: lần thứ năm là mười lượt, không phải năm cộng mười.')
      await K.noi('Nếu có buổi bị ghi nhầm — em nghỉ có phép, hay cả lớp đi sự kiện — hãy nhắn thầy cô.')
      await K.noi('Thầy cô miễn buổi đó được, và lần quên sẽ bị xoá khỏi sổ.')
      await K.im()
    }],

    // ===================================================================== 7
    ['7-chia-se-sach', 'Chia sẻ sách',
     'Tới lượt thì nộp gì · bài học rút ra · mở quyền xem cho liên kết.',
     async () => {
      await vao(EM.sapChiaSe)
      await t.den('/#/student', 'Kế hoạch của em')
      await lopPhu()
      await may.bat()
      await K.noi('Mỗi bạn có một tuần được phân công chia sẻ về một cuốn sách mình đã đọc.')
      await K.noi('Trước hạn nộp một tuần, hệ thống sẽ nhắc em mỗi lần vào trang.')
      await dongPopup()
      await lopPhu()
      await K.tro('.book-summary', null, 1100)
      await K.noi('Trên màn hình chính có thẻ Lượt chia sẻ sách của em.', 1500)
      await K.bam(2600)
      await t.chay(`document.querySelector('.book-card')
                      ?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
      await doi(900)
      await K.noi('Bấm vào đó để mở phần nhập.')
      await K.noi('Điền tên sách, tác giả, rồi tóm tắt ngắn gọn cuốn sách kể về điều gì.')
      await K.cuon(300)
      await K.noi('Phần quan trọng nhất là Bài học rút ra — và phải là suy nghĩ của chính em.')
      await K.noi('Cuối cùng dán liên kết bài trình chiếu, rồi bấm Lưu bài chia sẻ.')
      await K.noi('Nhớ bật quyền "ai có liên kết cũng xem được" cho bài trình chiếu.')
      await K.noi('Để riêng tư thì thầy cô và các bạn bấm vào chỉ thấy báo lỗi.')
      await t.den('/#/books', 'Chia sẻ sách')
      await lopPhu()
      await K.noi('Bấm Chia sẻ sách trên thanh trên cùng để xem bài của cả lớp, bất cứ lúc nào.')
      await K.im()
    }],

    // ===================================================================== 8
    ['8-hoi-thay-co', 'Hỏi thầy cô',
     'Nhắn riêng trong hệ thống · ai đọc được tin nhắn của em.',
     async () => {
      await veTrangEm(EM.canHoTro)
      await may.bat()
      await K.noi('Có gì chưa rõ, em nhắn thẳng cho giáo viên chủ nhiệm ngay trong hệ thống.')
      await K.tro('button', 'Nhắn giáo viên')
      await K.noi('Bấm Nhắn giáo viên ở góc trên màn hình chính.', 1500); await K.bam(3000)
      await K.noi('Tin nhắn này chỉ em và giáo viên đọc được.')
      await K.noi('Các bạn khác trong lớp không thấy.')
      await K.noi('Nhưng nếu có điều gì em chỉ muốn nói riêng, hãy gặp thầy cô trực tiếp.')
      await K.im()
    }],
    ]
  },
})
