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
    // Cắt theo .auth-card chứ không phải form: ô ① là THẺ "Giáo viên", nằm
    // ngoài form. Cắt theo form thì ảnh mất hẳn ô ① mà lời dẫn vẫn chỉ vào nó.
    await t.chup('gv-01-dang-nhap', { chon: ['.segmented', 'form'], khung: [
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
    // Lọc còn vài dòng. Chụp cả bảng 12 dòng thì ảnh cao 1900 px, nhét vào trang
    // A4 phải thu còn 29% — bảng chữ nhỏ li ti, in ra không ai đọc được. Bảng
    // 4–5 dòng minh hoạ đủ mà vẫn giữ được cỡ chữ.
    await t.chay(`
      const s = [...document.querySelectorAll('select')]
        .find(e => e.options && [...e.options].some(o => o.textContent.includes('Tất cả học sinh')));
      if (!s) return false;
      const o = [...s.options].find(o => o.textContent.includes('Bùi Gia Hân'));
      if (!o) return false;
      const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      set.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true }));
      return true`)
    await doi(1600)
    await t.cuonToi('.card.table-card')
    await t.chup('gv-04-bang-ke-hoach', { chon: '.card.table-card', cao: 1500 })
  }

  if (nen('gv-05')) {
    await tab('Theo kế hoạch')
    await t.chay(`document.querySelector('.task-link')?.click(); return 1`)
    await doi(1600)
    await t.chup('gv-05-cham-sao', { chon: '.modal', cao: 2200 })
    await dongCuaSo()
  }

  if (nen('gv-06') || nen('gv-06b')) {
    await tab('Theo kế hoạch')
    // Bấm đúng nút "Chọn N chờ chấm sao". Tích bừa vài dòng đầu bảng thì trúng
    // toàn bài CHỜ DUYỆT, thanh thao tác hiện nút Duyệt chứ không hiện nút chấm
    // sao — đúng thứ mục này cần minh hoạ lại không có trong ảnh.
    const co = await t.chay(`
      const b = [...document.querySelectorAll('button')]
        .find(e => e.textContent.includes('chờ chấm sao'));
      if (b) b.click(); return !!b`)
    if (!co) console.warn('   ! không thấy nút "Chọn N chờ chấm sao"')
    await doi(1100)
    if (nen('gv-06')) {
      await t.cuonToi('.bulk-bar')
      await t.chup('gv-06-cham-sao-hang-loat', { chon: '.bulk-bar', cao: 1200, khung: [
        { sel: '.bulk-bar button', text: 'Chấm sao', n: 1 },
      ] })
    }
    if (nen('gv-06b')) {
      await t.chay(`
        const b = [...document.querySelectorAll('.bulk-bar button')]
          .find(e => e.textContent.includes('Chấm sao'));
        if (b) b.click(); return !!b`)
      await doi(1400)
      const mo = await t.chay(`return !!document.querySelector('.modal')`)
      if (mo) { await t.chup('gv-06b-cua-so-cham-hang-loat', { chon: '.modal', cao: 2000 }); await dongCuaSo() }
      else console.warn('   ! không mở được cửa sổ chấm sao hàng loạt')
    }
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

  // ======================= Thiết bị điện tử =======================
  // Từ 10/2026 thẻ "Chưa đăng ký" và "Kỷ luật" ẩn (kỷ luật quên đăng ký tắt);
  // thẻ "Thiết bị" thay chỗ. Mở một khối thu gọn theo tiêu đề của nó.
  const moKhoi = (tieuDe) => t.chay(`
    const h = [...document.querySelectorAll('.collapse-head')]
      .find(e => e.textContent.includes(${JSON.stringify(tieuDe)}));
    if (h && h.closest('.collapsible').classList.contains('shut')) h.click(); return !!h`)

  if (nen('gv-12')) {
    await tab('Thiết bị', 'theo tuần')
    await moKhoi('Thiết bị điện tử theo tuần')
    await doi(700)
    if (!await t.chay(`return window.__danhDau('Thiết bị điện tử theo tuần', '.section-block')`)) console.warn('   ! gv-12')
    await t.chup('gv-12-thiet-bi-tuan', { chon: '#__muc', cao: 1900, khung: [
      { sel: '#__muc .check-row', n: 1 },
      { sel: '#__muc .row-late', n: 2 },
      { sel: '#__muc button', text: 'Ghi vi phạm', n: 3 },
    ] })
  }

  if (nen('gv-13')) {
    await tab('Thiết bị', 'Giới hạn dùng thiết bị')
    await moKhoi('Giới hạn dùng thiết bị')
    await doi(700)
    if (!await t.chay(`return window.__danhDau('Giới hạn dùng thiết bị', '.section-block')`)) console.warn('   ! gv-13')
    await t.chup('gv-13-gioi-han-thiet-bi', { chon: '#__muc', cao: 1500, khung: [
      { sel: '#__muc select', n: 1 },
      { sel: '#__muc .weekday-picks', n: 2 },
    ] })
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

  if (nen('gv-16')) {
    await tab('Thiết bị', 'theo tuần')
    await moKhoi('Thiết bị điện tử theo tuần')
    await doi(600)
    // Ghi cho em đang ở lần 2 — hộp xác nhận sẽ báo trước "lần 3: cấm 1 tháng".
    await t.chay(`
      const tr = [...document.querySelectorAll('tr')].find(e => e.textContent.includes('Trần Đức Huy'));
      [...(tr?.querySelectorAll('button') ?? [])].find(b => b.textContent.includes('Ghi vi phạm'))?.click();
      return !!tr`)
    await doi(1200)
    await t.chup('gv-16-ghi-vi-pham', { chon: '.modal', cao: 1800, khung: [
      { sel: '.modal .quick-views', n: 1 },
      { sel: '.modal .violation-preview', n: 2 },
    ] })
    await dongCuaSo()
  }

  if (nen('gv-17')) {
    await tab('Thiết bị', 'Sổ vi phạm')
    await moKhoi('Sổ vi phạm')
    await doi(800)
    if (!await t.chay(`return window.__danhDau('Sổ vi phạm & lao động công ích', '.section-block')`)) console.warn('   ! gv-17')
    // Sổ nằm dưới hai khối dài; để nguyên thì nó rơi ra ngoài khung nhìn và
    // nửa dưới ảnh ra trắng. Thu gọn hai khối phía trên cho sổ lên đầu trang.
    await t.chay(`
      for (const ten of ['Giới hạn dùng thiết bị', 'Thiết bị điện tử theo tuần']) {
        const h = [...document.querySelectorAll('.collapse-head')].find(e => e.textContent.includes(ten));
        if (h && h.closest('.collapsible').classList.contains('open')) h.click();
      } return 1`)
    await doi(600)
    await t.chup('gv-17-so-vi-pham', { chon: '#__muc', cao: 2100, doiMs: 2000, khung: [
      { sel: '#__muc .luot-o', idx: 0, n: 1 },
      { sel: '#__muc button', text: 'Soạn thư mời', n: 2 },
      { sel: '#__muc button', text: 'Gỡ cấm', n: 3 },
      { sel: '#__muc button', text: 'Huỷ (ghi nhầm)', n: 4 },
    ] })
  }

  if (nen('gv-18')) {
    await tab('Thiết bị', 'Sổ vi phạm')
    await moKhoi('Sổ vi phạm')
    await doi(800)
    await t.chay(`window.__nut('Soạn thư mời')?.click(); return 1`)
    await doi(1400)
    await t.chup('gv-18-thu-moi-phu-huynh', { chon: '.modal', cao: 2400, khung: [
      { sel: '.modal .detail-box', n: 1 },
      { sel: '.modal button', text: 'Mở Outlook trên web', n: 2 },
    ] })
    await dongCuaSo()
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
