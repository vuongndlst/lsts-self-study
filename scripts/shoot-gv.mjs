// Các cảnh chụp cho TÀI LIỆU GIÁO VIÊN.
//
//   GV_MK=<mật khẩu> node scripts/shoot-gv.mjs          chụp tất cả
//   GV_MK=<mật khẩu> node scripts/shoot-gv.mjs gv-12    chụp một cảnh
//
// Toàn bộ dữ liệu là của lớp minh hoạ 8A0 — mười em hoàn toàn bịa.

import { taoTrinh, dangNhap, doi } from './shoot.mjs'

const MK = process.env.GV_MK
if (!MK) throw new Error('Đặt GV_MK=<mật khẩu giáo viên lớp mẫu> trước khi chạy.')
const TK = process.env.GV_TK || 'gv.minhhoa@lsts.edu.vn'

const loc = process.argv[2] ?? ''
const nen = (ten) => !loc || ten.includes(loc)

const t = await taoTrinh()
let daVao = false
const vao = async () => {
  if (daVao) return
  await dangNhap(t, { vai: 'gv', tk: TK, mk: MK })
  daVao = true
}
const tab = async (ten, cho = null) => {
  await vao()
  await t.chay(`window.__nut(${JSON.stringify(ten)})?.click(); return 1`)
  await doi(1800)
  if (cho) await t.doiChu(cho)
  await t.cuon(0)
}
const dongCuaSo = async () => {
  await t.chay(`document.querySelector('.modal-head .icon-button')?.click(); return 1`)
  await doi(600)
}

try {
  // ======================= Đăng nhập và tổng quan =======================
  if (nen('gv-01')) {
    await t.den('/#/login', 'Đăng nhập')
    await t.chay(`window.__nut('Giáo viên')?.click(); return 1`)
    await doi(600)
    await t.chup('gv-01-dang-nhap', { chon: 'form', khung: [
      { sel: 'button', text: 'Giáo viên', n: 1 },
      { sel: 'input[type=email]', n: 2 },
      { sel: 'input[type=password]', n: 3 },
      { sel: 'button', text: 'Vào trang giáo viên', n: 4 },
    ] })
  }

  if (nen('gv-02')) {
    await vao(); await t.cuon(0)
    await t.chup('gv-02-tong-quan', { khung: [
      { sel: '.stats-grid.inbox-grid', n: 1 },
      { sel: '.segmented', n: 2 },
      { sel: 'button', text: 'Xuất CSV', n: 3 },
    ] })
  }

  // ======================= Theo kế hoạch =======================
  if (nen('gv-03')) {
    await tab('Theo kế hoạch')
    await t.cuonToi('.filters')
    await t.chup('gv-03-bo-loc', { chon: '.card.filters', cao: 1400 })
  }

  if (nen('gv-04')) {
    await tab('Theo kế hoạch')
    await t.cuonToi('.card.table-card')
    await t.chup('gv-04-bang-ke-hoach', { chon: '.card.table-card', cao: 1900 })
  }

  if (nen('gv-05')) {
    await tab('Theo kế hoạch')
    await t.chay(`document.querySelector('.task-link')?.click(); return 1`)
    await doi(1600)
    await t.chup('gv-05-cham-sao', { chon: '.modal', cao: 2200 })
    await dongCuaSo()
  }

  if (nen('gv-06')) {
    await tab('Theo kế hoạch')
    // Chọn vài kế hoạch để thanh thao tác hàng loạt hiện lên.
    await t.chay(`
      const o = [...document.querySelectorAll('.card.table-card input[type=checkbox]')].slice(1, 5);
      o.forEach(c => { if (!c.checked) c.click() }); return o.length`)
    await doi(900)
    await t.cuonToi('.bulk-bar')
    await t.chup('gv-06-cham-sao-hang-loat', { chon: '.bulk-bar', cao: 1200 })
  }

  // ======================= Theo học sinh · Phân tích =======================
  if (nen('gv-07')) {
    await tab('Theo học sinh', 'đã đăng ký')
    await t.cuonToi('.card.table-card')
    await t.chup('gv-07-theo-hoc-sinh', { chon: '.card.table-card', cao: 1900 })
  }

  if (nen('gv-08')) {
    await tab('Phân tích', 'Thói quen lập kế hoạch')
    await t.cuonToi('.chart-card')
    await t.chup('gv-08-phan-tich')
  }

  // ======================= Danh sách lớp =======================
  if (nen('gv-09')) {
    await tab('Học sinh', 'Danh sách lớp')
    await t.cuonToi('.table-wrap')
    await t.chup('gv-09-danh-sach-lop', { khung: [
      { sel: 'button', text: 'Nhập danh sách từ Excel', n: 1 },
      { sel: 'button', text: 'Xuất CSV', idx: 1, n: 2 },
    ] })
  }

  if (nen('gv-10')) {
    await tab('Học sinh', 'Danh sách lớp')
    await t.chay(`window.__nut('Nhập danh sách từ Excel')?.click(); return 1`)
    await doi(1500)
    await t.chup('gv-10-nhap-excel', { chon: '.modal', cao: 2200 })
    await dongCuaSo()
  }

  if (nen('gv-11')) {
    await tab('Học sinh', 'Danh sách lớp')
    await t.cuonToi('.table-wrap')
    await t.chup('gv-11-thao-tac-tung-em', { khung: [
      { sel: '.row-actions button', idx: 0, n: 1 },
      { sel: '.row-actions button', idx: 1, n: 2 },
    ] })
  }

  // ======================= Chưa đăng ký · miễn buổi =======================
  if (nen('gv-12')) {
    await tab('Chưa đăng ký', 'chưa đăng ký')
    await t.chup('gv-12-chua-dang-ky', { chon: '.card.sched-card', cao: 1500 })
  }

  if (nen('gv-13')) {
    await tab('Chưa đăng ký', 'Miễn buổi')
    await t.chay(`
      const h = [...document.querySelectorAll('.collapse-head')]
        .find(e => e.textContent.includes('Miễn buổi'));
      if (h && h.closest('.collapsible').classList.contains('shut')) h.click(); return !!h`)
    await doi(900)
    await t.cuonToi('.collapsible')
    await t.chup('gv-13-mien-buoi', { chon: '.card.sched-card.collapsible', cao: 1800 })
  }

  // ======================= Lịch tự học =======================
  if (nen('gv-14')) {
    await tab('Lịch tự học', 'Lịch tự học cố định')
    if (!await t.chay(`return window.__danhDau('Lịch tự học cố định')`)) console.warn('   ! gv-14')
    await t.chup('gv-14-lich-tu-hoc', { chon: '#__muc', cao: 1700 })
  }

  if (nen('gv-15')) {
    await tab('Lịch tự học', 'Hạn đăng ký')
    await t.cuonToi('.sched-card')
    await t.chup('gv-15-luat-dang-ky', { chon: '.card.sched-card', cao: 1500 })
  }

  // ======================= Kỷ luật =======================
  if (nen('gv-16')) {
    await tab('Kỷ luật', 'Kỷ luật quên đăng ký')
    await t.cuonToi('.section-block.collapsible')
    await t.chup('gv-16-bang-ky-luat', { chon: '.section-block.collapsible', cao: 1900 })
  }

  if (nen('gv-17')) {
    await tab('Kỷ luật', 'Lao động công ích')
    await t.chay(`
      const h = [...document.querySelectorAll('.collapse-head')]
        .find(e => e.textContent.includes('Lao động công ích'));
      if (h && h.closest('.collapsible').classList.contains('shut')) h.click(); return !!h`)
    await doi(900)
    const ok = await t.chay(`
      const s = [...document.querySelectorAll('.collapsible')]
        .find(e => e.textContent.includes('Lao động công ích'));
      if (s) { s.scrollIntoView({ block: 'start' }); window.scrollBy(0, -96) } return !!s`)
    if (!ok) console.warn('   ! không thấy khối Lao động công ích')
    await t.chay(`return window.__danhDau('Lao động công ích —')`)
    await doi(600)
    await t.chup('gv-17-lao-dong-cong-ich', { chon: '#__muc', cao: 1700, khung: [
      { sel: '.luot-o', idx: 0, n: 1 },
      { sel: 'button', text: 'Soạn thư', n: 2 },
    ] })
  }

  if (nen('gv-18')) {
    await tab('Kỷ luật', 'Lao động công ích')
    await t.chay(`
      const h = [...document.querySelectorAll('.collapse-head')]
        .find(e => e.textContent.includes('Lao động công ích'));
      if (h && h.closest('.collapsible').classList.contains('shut')) h.click(); return 1`)
    await doi(800)
    await t.chay(`window.__nut('Soạn thư')?.click(); return 1`)
    await doi(1600)
    if (nen('gv-18')) {
      // Phải ghi rõ '.modal ...': trang giáo viên phía sau cửa sổ CŨNG có
      // .quick-views (thanh "Xem nhanh"), và nó đứng trước trong DOM nên bị
      // chọn mất — khung vẽ ra ngoài vùng cắt, ảnh mất hẳn ô số 1.
      await t.chup('gv-18-soan-thu', { chon: '.modal', cao: 2400, khung: [
        { sel: '.modal .quick-views', n: 1 },
        { sel: '.modal .detail-box', n: 2 },
      ] })
    }
    // Trước đây có thêm cảnh gv-19 chụp phần cuối cửa sổ. Bỏ đi: màn hình ảo
    // nay đủ cao nên cả cửa sổ lọt vào một ảnh, hai tấm thành ra giống hệt nhau.
    await dongCuaSo()
  }

  if (nen('gv-20')) {
    await tab('Kỷ luật', 'Cài đặt kỷ luật')
    await t.chay(`
      const h = [...document.querySelectorAll('.collapse-head')]
        .find(e => e.textContent.includes('Cài đặt kỷ luật'));
      if (h && h.closest('.collapsible').classList.contains('shut')) h.click(); return 1`)
    await doi(900)
    await t.cuonToi('.card.sched-card.collapsible')
    await t.chup('gv-20-cai-dat-ky-luat', { chon: '.card.sched-card.collapsible', cao: 1900 })
  }

  // ======================= Trợ giảng =======================
  if (nen('gv-21')) {
    await tab('Trợ giảng', 'Trợ giảng lớp')
    await t.chup('gv-21-tro-giang', { chon: '.card.ta-panel', cao: 1900 })
  }

  // ======================= Chia sẻ sách =======================
  if (nen('gv-22')) {
    await vao()
    await t.den('/#/books', 'Chia sẻ')
    await doi(1200)
    await t.chup('gv-22-chia-se-sach', { cao: 1150, khung: [
      { sel: '.view-switch', n: 1 },
      { sel: '.card.sched-card', n: 2 },
    ] })
  }

  if (nen('gv-23') || nen('gv-24')) {
    await vao()
    await t.den('/#/books', 'Chia sẻ')
    await t.chay(`window.__nut('Xếp lịch')?.click(); return 1`)
    await t.doiChu('Lịch chia sẻ sách lớp')
    await doi(1200)
    if (nen('gv-23')) {
      // 'Tuần' xuất hiện cả ở dải "Sắp chia sẻ sách" phía trên, và dải đó NGẮN
      // hơn nên bị chọn nhầm. Bám vào tiêu đề riêng của bảng xếp lịch.
      if (!await t.chay(`return window.__danhDau('Lịch chia sẻ sách lớp')`)) console.warn('   ! gv-23')
      await t.chup('gv-23-xep-lich-sach', { chon: '#__muc', cao: 2100 })
    }
    if (nen('gv-24')) {
      await t.chay(`window.__nut('Chấm')?.click(); return 1`)
      await doi(1400)
      const co = await t.chay(`return !!document.querySelector('.modal')`)
      if (co) { await t.chup('gv-24-cham-bai-sach', { chon: '.modal', cao: 2200 }); await dongCuaSo() }
      else console.warn('   ! không mở được cửa sổ chấm bài chia sẻ sách')
    }
  }

  // ======================= Thông báo =======================
  if (nen('gv-25')) {
    await vao()
    await t.den('/#/teacher', 'Quản lý giờ tự học')
    await t.chay(`document.querySelector('button.bell')?.click(); return 1`)
    await doi(1200)
    // Bảng thông báo được đẩy ra document.body bằng portal, nên nó KHÔNG nằm
    // trong .topbar — tìm theo class riêng của nó.
    const co = await t.chay(`return !!document.querySelector('.bell-panel')`)
    if (co) await t.chup('gv-25-thong-bao', { chon: '.bell-panel', cao: 1400 })
    else console.warn('   ! không mở được bảng thông báo')
  }

  console.log(`\nXong ${t.soAnh} ảnh.`)
} finally {
  await t.dong()
}
