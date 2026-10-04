// Video hướng dẫn cho GIÁO VIÊN: bảy phân đoạn, ghép thành một cuốn.
//
//   GV_MK=<mật khẩu> node scripts/video-gv.mjs          quay tất cả rồi ghép
//   GV_MK=<mật khẩu> node scripts/video-gv.mjs 4        chỉ quay lại đoạn 4
//                    node scripts/video-gv.mjs --tron   đổi nhạc, khỏi quay lại
//                    node scripts/video-gv.mjs --ghep   đổi chữ trên thẻ tên
//
// Ra ba thứ: bản gộp có thẻ tên và một nền nhạc chạy suốt, bảy tệp rời để tra
// một chức năng, và .srt đi kèm từng thứ để đưa vào công cụ lồng tiếng.
//
// Máy chủ phải chạy bản build ở http://localhost:4173, và lớp minh hoạ 8A0 phải
// có dữ liệu (xem docs/huong-dan/README.md).
//
// Phần dựng phim nằm ở scripts/video-chung.mjs, dùng chung với bản học sinh.

import path from 'node:path'
import { dangNhap, doi } from './shoot.mjs'
import { LOP_PHU } from './quay.mjs'
import { dungPhim } from './video-chung.mjs'

const RA = 'docs/huong-dan/video/giao-vien'
const TAM = process.env.TAM || path.join(process.env.TEMP || '.', 'quay-tam')
const TK = process.env.GV_TK || 'gv.minhhoa@lsts.edu.vn'
const MK = process.env.GV_MK
const doiSo = process.argv[2] ?? ''
if (!MK && !doiSo.startsWith('--')) {
  throw new Error('Đặt GV_MK=<mật khẩu giáo viên lớp mẫu> trước khi chạy.')
}

await dungPhim({
  RA, TAM, doiSo,
  tenGop: 'Toan-bo-huong-dan-giao-vien',
  nhanBia: 'HƯỚNG DẪN DÀNH CHO GIÁO VIÊN',
  tuaBia: 'Hướng dẫn sử dụng hệ thống',
  dangNhapVao: (t) => dangNhap(t, { vai: 'gv', tk: TK, mk: MK }),
  taoDoan: ({ t, may, K }) => {
  const tab = async (ten, cho = null) => {
    await t.chay(`window.__nut(${JSON.stringify(ten)})?.click(); return 1`)
    await doi(1500)
    if (cho) await t.doiChu(cho)
  }
  const dongCuaSo = async () => {
    await t.chay(`document.querySelector('.modal-head .icon-button')?.click(); return 1`)
    await doi(800)
  }
  const moKhoi = async (chu) => {
    await t.chay(`
      const h = [...document.querySelectorAll('.collapse-head')]
        .find(e => e.textContent.includes(${JSON.stringify(chu)}));
      if (h && h.closest('.collapsible').classList.contains('shut')) h.click();
      return !!h`)
    await doi(900)
  }

  // Về trang giáo viên và dựng lại lớp phủ sau mỗi lần chuyển trang.
  const veTrangChu = async () => {
    await t.den('/#/teacher', 'Quản lý giờ tự học')
    await t.chay(LOP_PHU + '; window.__dungLopPhu(); return 1')
    await doi(700)
  }

  return [
    // ======================================================================= 1
    ['1-nhap-danh-sach-lop', 'Đầu năm: nhập danh sách lớp', 'Thẻ Học sinh · nhập danh sách từ Excel · đọc bản xem trước rồi mới nhập.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Việc đầu tiên của năm học: đưa danh sách lớp vào hệ thống.')
      await K.tro('button', 'Học sinh'); await K.bam()
      await K.noi('Thẻ Học sinh là nơi quản lý danh sách lớp.')
      await K.tro('button', 'Nhập danh sách từ Excel')
      await K.noi('Bấm Nhập danh sách từ Excel.', 1300); await K.bam(2600)
      await K.noi('Tải file mẫu, điền ba cột: số thứ tự, mã số học sinh, họ và tên.')
      await K.noi('Chọn file xong, hệ thống hiện bản xem trước.')
      await K.noi('Bản xem trước nói rõ em nào thêm mới, em nào đã có, dòng nào bị bỏ qua và vì sao.')
      await K.noi('Đọc kỹ bảng đó rồi mới bấm nhập.')
      await dongCuaSo()
      await K.noi('Lưu ý: nhập danh sách KHÔNG tạo tài khoản cho học sinh.')
      await K.noi('Các em tự tạo tài khoản bằng mã số của mình.')
      await K.noi('Nhập lại lần hai cũng không nhân đôi học sinh, và không mất dữ liệu cũ.')
      await K.im()
    }],

    // ======================================================================= 2
    ['2-lich-tu-hoc-va-gioi-han-thiet-bi', 'Đầu năm: lịch tự học và giới hạn thiết bị', 'Khai lịch tự học cố định · hai công tắc luật đăng ký · giới hạn dùng thiết bị.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Việc quan trọng nhất khi thiết lập: khai lịch tự học của lớp.')
      await K.tro('button', 'Lịch tự học'); await K.bam(2600)
      await K.noi('Chọn các tiết tự học theo từng thứ trong tuần.')
      await K.noi('Học sinh chỉ chọn được đúng những tiết này khi đăng ký.')
      await K.cuon(360)
      await K.noi('Ngay trên đó là hai công tắc về luật đăng ký.')
      await K.noi('Cho phép đăng ký trễ: em vẫn đăng ký được sau hạn, chỉ bị đánh dấu Trễ.')
      await K.noi('Bắt buộc cập nhật kết quả: em còn nợ kết quả thì chưa đăng ký buổi mới được.')
      await tab('Thiết bị')
      await moKhoi('Giới hạn dùng thiết bị')
      await t.chay(`window.scrollTo({top:0,behavior:'smooth'}); return 1`)
      await doi(800)
      await K.noi('Từ tháng mười, học sinh chỉ bắt buộc đăng ký khi cần dùng thiết bị điện tử.')
      await K.tro('.device-settings select', null, 1100)
      await K.noi('Thẻ Thiết bị cho phép giới hạn số ngày một em được dùng thiết bị mỗi tuần.')
      await K.tro('.weekday-picks', null, 1100)
      await K.noi('Và chọn những thứ được dùng. Mặc định là không giới hạn.')
      await K.noi('Nhiều nhiệm vụ trong cùng một ngày chỉ tính là một ngày.')
      await K.noi('Hết lượt thì công tắc thiết bị bên phía học sinh tự khoá, kèm lý do.')
      await K.im()
    }],

    // ======================================================================= 3
    ['3-viec-hang-ngay', 'Việc hằng ngày', 'Bảng thiết bị trong tuần · duyệt thiết bị · ai đang bị tạm dừng.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Mỗi ngày thầy cô chỉ mất chừng năm phút.')
      await K.tro('button', 'Chờ duyệt')
      await K.noi('Ô Chờ duyệt gom những nhiệm vụ em xin dùng thiết bị.', 1500); await K.bam(2600)
      await K.noi('Duyệt sớm để các em biết trước buổi học có được dùng máy hay không.')
      await K.tro('button', 'Thiết bị'); await K.bam(2600)
      await K.noi('Thẻ Thiết bị thay cho thẻ Chưa đăng ký trước đây.')
      await moKhoi('Thiết bị điện tử theo tuần')
      await t.chay(`return window.__danhDau('Thiết bị điện tử theo tuần', '.section-block')`)
      // Không dùng behavior:'smooth' ở đây: scrollBy ngay sau đó cắt ngang lần
      // cuộn mượt, trang đứng yên ở chỗ cũ và bảng nằm ngoài khung.
      await t.chay(`window.__cuonToiPT(document.getElementById('__muc'), 96); return 1`)
      await doi(900)
      await K.noi('Bảng tuần cho biết mỗi em đã đăng ký dùng thiết bị mấy ngày, những ngày nào.')
      await K.tro('.row-late', null, 1100)
      await K.noi('Dòng tô đỏ là em đang bị tạm dừng dùng thiết bị.')
      await K.noi('Trong giờ, em nào dùng máy mà bảng không có ngày hôm nay là không đăng ký mà tự ý dùng.')
      await K.im()
    }],

    // ======================================================================= 4
    ['4-cham-sao', 'Chấm sao', 'Chấm từng bài · chấm hàng loạt · nhận xét chung không đè nhận xét riêng.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Hằng tuần, việc chính của thầy cô là chấm sao.')
      await K.tro('button', 'Chờ chấm sao')
      await K.noi('Bấm ô Chờ chấm sao ở hộp việc cần xử lý.', 1500); await K.bam(2800)
      await K.noi('Danh sách lọc ngay còn những bài đang chờ.')
      await K.tro('.task-link', null, 1200)
      await K.noi('Bấm vào tên môn để mở chi tiết.', 1300); await K.bam(2800)
      await K.noi('Cửa sổ hiện đủ nhiệm vụ, mục tiêu, và phần em tự ghi.')
      await K.noi('Đọc xong thì chọn số sao và viết nhận xét.')
      await K.noi('Nhận xét ngắn mà cụ thể có tác dụng hơn nhận xét dài.')
      await dongCuaSo()
      await K.noi('Khi có hàng chục bài cùng mức, chấm từng bài thì quá lâu.')
      await K.tro('button', 'chờ chấm sao')
      await K.noi('Bấm Chọn tất cả bài chờ chấm sao.', 1400); await K.bam(2400)
      await t.chay(`document.querySelector('.bulk-bar')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
      await K.noi('Thanh thao tác hiện ở cuối màn hình.')
      await K.tro('.bulk-bar button', 'Chấm sao', 1200); await K.bam(2800)
      await K.noi('Cửa sổ liệt kê rõ sẽ chấm cho những em nào.')
      await K.noi('Để trống ô nhận xét chung thì nhận xét riêng của từng tiết vẫn được giữ.')
      await dongCuaSo()
      await K.im()
    }],

    // ======================================================================= 5
    ['5-vi-pham-thiet-bi-va-thu-phu-huynh', 'Vi phạm thiết bị và thư mời phụ huynh', 'Ghi vi phạm · thang lần 1 đến lần 4 · sổ lao động công ích · thư mời phụ huynh.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Không đăng ký mà tự ý dùng thiết bị, hoặc dùng sai mục đích, là vi phạm.')
      await K.tro('button', 'Thiết bị'); await K.bam(2600)
      await moKhoi('Thiết bị điện tử theo tuần')
      await t.chay(`
        const tr = [...document.querySelectorAll('tr')].find(e => e.textContent.includes('Trần Đức Huy'));
        tr?.scrollIntoView({block:'center',behavior:'smooth'});
        return window.__troToiPhanTu([...(tr?.querySelectorAll('button') ?? [])].find(b => b.textContent.includes('Ghi vi phạm')))`)
      await doi(900)
      await K.noi('Bấm Ghi vi phạm trên dòng của em.', 1400); await K.bam(2800)
      await K.noi('Chọn loại vi phạm, ghi chú thêm nếu cần.')
      await K.noi('Hộp này báo trước đây là lần thứ mấy, và em sẽ bị xử lý thế nào.')
      await K.noi('Lần một cấm một tuần và năm lượt lao động. Lần hai, hai tuần và mười lượt.')
      await K.noi('Lần ba, một tháng và hai mươi lượt. Từ lần bốn, mời phụ huynh.')
      await K.noi('Ghi xong, các buổi thiết bị đã duyệt trong thời gian cấm tự bị huỷ duyệt, và em nhận thông báo.')
      await dongCuaSo()
      await moKhoi('Sổ vi phạm')
      await t.chay(`return window.__danhDau('Sổ vi phạm & lao động công ích', '.section-block')`)
      await t.chay(`window.__cuonToiPT(document.getElementById('__muc'), 96); return 1`)
      await doi(900)
      await K.noi('Sổ vi phạm ghi mỗi lần một dòng, lượt lao động tính riêng từng lần.')
      await K.tro('.luot-o button', 'Lưu', 1100)
      await K.noi('Gõ số lượt em đã làm rồi bấm Lưu.')
      await K.tro('button', 'Gỡ cấm', 1100)
      await K.noi('Gỡ cấm cho em dùng máy lại sớm — nhưng lần vi phạm vẫn tính, lượt lao động vẫn nợ.')
      await K.tro('button', 'Huỷ (ghi nhầm)', 1100)
      await K.noi('Chỉ khi ghi nhầm mới bấm Huỷ: lần đó sẽ không tính nữa.')
      await K.tro('button', 'Soạn thư mời', 1200)
      await K.noi('Từ lần bốn, bấm Soạn thư mời để mời phụ huynh.', 1400); await K.bam(3000)
      await K.noi('Địa chỉ phụ huynh suy ra từ mã số học sinh, không phải nhập tay.')
      await K.noi('Nội dung sửa được trước khi gửi.')
      await t.chay(`document.querySelector('.letter-actions')?.scrollIntoView({block:'center',behavior:'smooth'}); return 1`)
      await doi(900)
      await K.noi('Hệ thống KHÔNG tự gửi thư.')
      await K.noi('Nút này mở Outlook với nội dung điền sẵn — thầy cô tự bấm Gửi bên đó.')
      await K.noi('Gửi xong thì quay lại bấm Đã báo phụ huynh để ghi vào sổ.')
      await dongCuaSo()
      await K.im()
    }],

    // ======================================================================= 6
    ['6-chia-se-sach', 'Chia sẻ sách', 'Xếp lịch cả năm · hạn nộp tự tính · trang kết quả cả lớp cùng xem.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Phần chia sẻ sách chỉ hiện khi người quản trị đã cấp cho lớp.')
      await K.tro('a', 'Chia sẻ sách'); await K.bam(3000)
      await t.chay(LOP_PHU + '; window.__dungLopPhu(); return 1')
      await K.noi('Dải trên cùng cho biết ai tới lượt tuần này và các tuần kế tiếp.')
      await K.noi('Kèm luôn tình trạng nộp bài.')
      await K.tro('button', 'Xếp lịch')
      await K.noi('Thẻ Xếp lịch và chấm để phân công cả năm.', 1500); await K.bam(3000)
      await K.noi('Mỗi tuần chọn một em và đặt ngày báo cáo.')
      await K.noi('Hạn nộp luôn là ngày báo cáo trừ ba ngày, hệ thống tự tính.')
      await K.noi('Tuần ôn thi, thi, nghỉ Tết thì đặt là tuần nghỉ.')
      await K.noi('Tuần trống còn lại để dự phòng, dùng khi cần dời lịch.')
      await K.tro('button', 'Kết quả chia sẻ')
      await K.noi('Thẻ Kết quả là nơi cả lớp xem bài của nhau.', 1500); await K.bam(3000)
      await K.im()
    }],

    // ======================================================================= 7
    ['7-giao-viec-can-su', 'Giao việc cho cán sự', 'Cấp từng quyền riêng · cán sự thấy gì và không được thấy gì.', async () => {
      await veTrangChu()
      await may.bat()
      await K.noi('Thầy cô giao được một phần việc cho học sinh trong lớp.')
      await K.tro('button', 'Trợ giảng'); await K.bam(3000)
      await K.noi('Mỗi quyền cấp riêng, không phải gói chung.')
      await K.noi('Quyền hay dùng nhất: theo dõi đăng ký.')
      await K.noi('Bạn được giao sẽ thấy ai chưa đăng ký và mỗi bạn đã quên mấy lần.')
      await K.noi('Nhưng KHÔNG thấy mức kỷ luật của các bạn khác.')
      await K.noi('Lao động công ích và việc mời phụ huynh là chuyện giữa thầy cô và gia đình.')
      await K.noi('Không phải thứ để một bạn cùng lớp đọc được.')
      await K.im()
    }],
  ]
  },
})
