// Các cảnh chụp cho TÀI LIỆU HỌC SINH.
//
// Mỗi cảnh đăng nhập bằng em nào có đúng tình huống cần minh hoạ — xem đầu file
// scripts/demo-class-data.sql để biết em nào đóng vai gì.
//
//   node scripts/shoot-hs.mjs            chụp tất cả
//   node scripts/shoot-hs.mjs hs-09      chỉ chụp cảnh có tên chứa "hs-09"

import { taoTrinh, dangNhap, doi } from './shoot.mjs'

const MK = process.env.DEMO_MK
if (!MK) throw new Error('Đặt DEMO_MK=<mật khẩu học sinh lớp mẫu> trước khi chạy.')

const EM = {
  guongMau: '2400001',   // Bùi Gia Hân   — dữ liệu đầy đủ, đã được chấm sao
  noPhanTu: '2400006',   // Ngô Bảo Long  — 3 nhiệm vụ quá hạn, sẽ bật popup nhắc
  canHoTro: '2400003',   // Hồ Ngọc Diệp  — có bài bấm "cần hỗ trợ"
  sapChiaSe: '2400004',  // Lê Anh Tuấn   — tới lượt chia sẻ sách, chưa nộp
  biKyLuat: '2400008',   // Trần Đức Huy  — đang phải lao động công ích
}

const loc = process.argv[2] ?? ''
const nen = (ten) => !loc || ten.includes(loc)

const t = await taoTrinh()
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

try {
  // ---------- Trước khi đăng nhập ----------
  if (nen('hs-01')) {
    await t.den('/#/', 'Lập kế hoạch')
    await t.chup('hs-01-trang-chu', { khung: [
      { sel: 'a', text: 'Bắt đầu', n: 1 },
      { sel: 'a', text: 'Xem hướng dẫn', n: 2 },
    ] })
  }

  if (nen('hs-02')) {
    await t.den('/#/register', 'Tạo tài khoản học sinh')
    await t.chup('hs-02-tao-tai-khoan', { chon: 'form', khung: [
      { sel: 'input', idx: 0, n: 1 },
      { sel: 'input[type=password]', idx: 0, n: 2 },
      { sel: 'button', text: 'Tạo tài khoản của em', n: 3 },
    ] })
  }

  if (nen('hs-03')) {
    await t.den('/#/login', 'Học sinh')
    await t.chay(`window.__nut('Học sinh')?.click(); return 1`)
    await doi(500)
    await t.chup('hs-03-dang-nhap', { chon: 'form', khung: [
      { sel: 'input', idx: 0, n: 1 },
      { sel: 'input[type=password]', idx: 0, n: 2 },
      { sel: 'button', text: 'Đăng nhập học sinh', n: 3 },
      { sel: 'button', text: 'Quên mật khẩu', n: 4 },
    ] })
  }

  if (nen('hs-04')) {
    await t.chay(`window.__nut('Quên mật khẩu')?.click(); return 1`)
    await doi(700)
    await t.chup('hs-04-quen-mat-khau', { chon: '.modal', cao: 2200 })
  }

  // ---------- Popup nhắc việc ----------
  if (nen('hs-05')) {
    await vao(EM.noPhanTu)
    await t.chup('hs-05-popup-nhac', { chon: '.modal', cao: 2200 })
  }

  // ---------- Tổng quan ----------
  if (nen('hs-06')) {
    await vao(EM.guongMau)
    await dongPopup()
    await t.cuon(0)
    await t.chup('hs-06-tong-quan', { khung: [
      { sel: 'button', text: 'Đăng ký giờ tự học', n: 1 },
      { sel: '.attend-card', n: 2 },
      { sel: '.quick-views', n: 3 },
    ] })
  }

  // ---------- Đăng ký một buổi ----------
  if (nen('hs-07')) {
    await vao(EM.guongMau)
    await dongPopup()
    // Phần đăng ký là một thẻ NẰM TRONG trang, không phải cửa sổ bật lên —
    // bấm nút chỉ cuộn xuống đó. Cắt nhầm '.modal' thì không khớp gì cả và ảnh
    // ra nguyên màn hình 1280×2200, thu vào tài liệu chữ bé như con kiến.
    await t.chay(`window.__nut('Đăng ký giờ tự học')?.click(); return 1`)
    await doi(1400)
    // Điền sẵn một ngày tự học để phần chọn tiết hiện ra. Chụp lúc còn trống thì
    // ảnh chỉ có dòng "Chọn ngày trước đã", không minh hoạ được bước 2.
    await t.chay(`const d=document.querySelector('.register-card input[type=date]');
                  if (d) window.__dat(d, '2026-09-16'); return !!d`)
    await doi(1000)
    await t.chup('hs-07-dang-ky-buoi', { chon: '.register-card', cao: 1700 })
  }

  // ---------- Danh sách nhiệm vụ ----------
  if (nen('hs-08')) {
    await vao(EM.guongMau)
    await dongPopup()
    await t.cuonToi('.quick-views')
    await t.chup('hs-08-nhiem-vu-cua-em', { khung: [
      { sel: '.quick-views', n: 1 },
      { sel: '.session-card', idx: 0, n: 2 },
    ] })
  }

  // ---------- Cập nhật kết quả ----------
  if (nen('hs-09') || nen('hs-10')) {
    await vao(EM.guongMau)
    await dongPopup()
    await t.chay(`window.__nut('Xem lại / bổ sung kết quả')?.click(); return 1`)
    await doi(1400)
    if (nen('hs-09')) await t.chup('hs-09-cap-nhat-ket-qua', { chon: '.modal', cao: 2200 })
    if (nen('hs-10')) {
      await t.chay(`document.querySelector('.modal')?.scrollTo(0, 99999); return 1`)
      await doi(500)
      await t.chup('hs-10-minh-chung', { chon: '.modal', cao: 2200 })
    }
  }

  // ---------- Xem đánh giá của thầy cô ----------
  if (nen('hs-11')) {
    await vao(EM.guongMau)
    await dongPopup()
    await t.chay(`
      const c = [...document.querySelectorAll('.session-card')]
        .find(e => e.textContent.includes('Lão Hạc'));
      (c || document.querySelectorAll('.session-card')[2])
        ?.querySelector('button')?.click(); return 1`)
    await doi(1200)
    await t.chup('hs-11-xem-danh-gia', { chon: '.modal', cao: 2200 })
  }

  // ---------- Điểm danh và kỷ luật ----------
  if (nen('hs-12') || nen('hs-13')) {
    await vao(EM.biKyLuat)
    await dongPopup()
    await t.cuonToi('.attend-card')
    if (nen('hs-12')) {
      await t.chup('hs-12-the-diem-danh', { chon: '.attend-card', khung: [
        { sel: '.attend-count', n: 1 },
        { sel: '.labor-strip', n: 2 },
      ] })
    }
    if (nen('hs-13')) {
      await t.chay(`document.querySelector('.attend-summary')?.click(); return 1`)
      await doi(700)
      await t.cuonToi('.attend-card')
      await t.chup('hs-13-quy-dinh-ky-luat', { chon: '.attend-card' })
    }
  }

  // ---------- Chia sẻ sách ----------
  if (nen('hs-14')) {
    await vao(EM.sapChiaSe)
    await t.chup('hs-14-popup-chia-se-sach', { chon: '.modal', cao: 2200 })
  }
  if (nen('hs-15')) {
    await vao(EM.sapChiaSe)
    await dongPopup()
    // Thẻ chia sẻ sách mặc định thu gọn — mở ra rồi mới chụp.
    await t.chay(`document.querySelector('.book-summary')?.click(); return 1`)
    await doi(700)
    await t.cuonToi('.book-card')
    await t.chup('hs-15-nop-chia-se-sach', { chon: '.book-card', cao: 1800 })
  }
  if (nen('hs-16')) {
    await vao(EM.guongMau)
    await dongPopup()
    await t.den('/#/books', 'Chia sẻ sách')
    await t.chup('hs-16-ket-qua-ca-lop', { cao: 1500 })
  }

  // ---------- Hỏi giáo viên ----------
  if (nen('hs-17')) {
    await vao(EM.canHoTro)
    await dongPopup()
    await t.chay(`window.__nut('Nhắn giáo viên')?.click(); return 1`)
    await doi(1200)
    await t.chup('hs-17-hoi-giao-vien', { chon: '.modal', cao: 2200 })
  }

  console.log(`\nXong ${t.soAnh} ảnh.`)
} finally {
  await t.dong()
}
