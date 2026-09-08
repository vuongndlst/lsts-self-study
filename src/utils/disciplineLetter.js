// Soạn sẵn thư báo kỷ luật quên đăng ký tự học.
//
// Hệ thống KHÔNG gửi thư. Nó chỉ soạn nội dung rồi mở Outlook ra cho thầy cô
// đọc lại, sửa nếu cần, và tự bấm Gửi. Cố ý làm vậy:
//
//   · Thư kỷ luật gửi phụ huynh là việc hệ trọng, không nên để máy tự bấm.
//   · Thư đi từ hộp thư của chính thầy cô, phụ huynh trả lời là về đúng người.
//   · Không phải xin quyền gửi thư thay ai, không giữ mật khẩu hộp thư của ai.

import { formatDate } from './date'

const OUTLOOK_WEB = 'https://outlook.office.com/mail/deeplink/compose'

// Outlook ngăn cách nhiều người nhận bằng dấu chấm phẩy.
const gop = (list) => (list ?? []).filter(Boolean).join(';')

// KHÔNG dùng URLSearchParams ở đây. Nó mã hoá theo kiểu biểu mẫu, tức dấu cách
// thành dấu "+". Trong biểu mẫu thì đúng, nhưng trong mailto: và deeplink của
// Outlook thì không ai giải mã ngược — phụ huynh sẽ nhận lá thư mà mọi dấu cách
// đều là dấu cộng. encodeURIComponent cho ra %20, đúng cho cả hai.
const q = (obj) => Object.entries(obj)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  .join('&')

// Outlook trên web — chắc chắn mở Outlook, không phụ thuộc máy cài gì.
export function outlookWebUrl({ to, cc, subject, body }) {
  return `${OUTLOOK_WEB}?${q({ to: gop(to), cc: gop(cc), subject, body })}`
}

// Outlook cài trên máy. Dùng mailto: nên nó mở ỨNG DỤNG THƯ MẶC ĐỊNH — máy nào
// đặt Gmail làm mặc định thì sẽ ra Gmail. Vì vậy nút này để phụ, không để chính.
export function mailtoUrl({ to, cc, subject, body }) {
  return `mailto:${gop(to)}?${q({ cc: gop(cc), subject, body })}`
}

// Windows truyền mailto: qua dòng lệnh nên có trần độ dài — quá ngưỡng thì thân
// thư bị cắt cụt HOẶC lệnh không chạy, mà cả hai đều im lặng. Tiếng Việt lại rất
// tốn: mỗi chữ có dấu hoá thành 9 ký tự %XX%XX%XX, nên một lá thư 1200 chữ đã
// vượt 2000. Đo trước rồi mới quyết định, đừng để thầy cô gửi đi lá thư mất đuôi.
export const MAILTO_MAX = 1900
export const mailtoQuaDai = (goi) => mailtoUrl(goi).length > MAILTO_MAX

function bangQuyDinh(freePasses = 3) {
  return [
    `Mỗi em được miễn trừ ${freePasses} lần trong một học kỳ. Từ lần kế tiếp, quy định của lớp là:`,
    `  · Lần thứ ${freePasses + 1}: 5 lượt lao động công ích`,
    `  · Lần thứ ${freePasses + 2}: 10 lượt lao động công ích`,
    `  · Lần thứ ${freePasses + 3} trở đi: mời phụ huynh trao đổi trực tiếp`,
  ].join('\n')
}

// Liệt kê buổi cụ thể, không chỉ nói "đã quên 4 lần". Có ngày thì phụ huynh và
// học sinh đối chiếu được — và nếu hệ thống ghi nhầm, sai sót lộ ra ngay.
//
// PHẢI kèm tiết. Sổ ghi quên tính theo TIẾT: bỏ hai tiết trong cùng một buổi là
// hai lần quên. Nói "4 lần" rồi liệt kê 3 dòng thì phụ huynh đếm là thấy vênh,
// và cái vênh đó làm hỏng độ tin của cả lá thư.
function danhSachBuoi(chiTiet = []) {
  if (!chiTiet?.length) return ''
  const dong = chiTiet.map(({ ngay, tiet }) => {
    const t = (tiet ?? []).join(', ')
    return `  · ${formatDate(ngay)}${t ? ` — tiết ${t}` : ''}`
  })
  return '\nCác buổi cụ thể:\n' + dong.join('\n') + '\n'
}

// "4 lần quên trong 3 buổi" — nói cả hai con số thì không ai phải tự suy ra.
function cauSoLan(r) {
  const n = r.so_lan_quen
  const b = r.so_buoi ?? (r.cac_ngay_quen?.length ?? 0)
  return b && b !== n
    ? `${n} lần (mỗi tiết tự học tính một lần), rơi vào ${b} buổi`
    : `${n} lần`
}

// ---------------------------------------------------------------------------
//  THƯ GỬI PHỤ HUYNH
// ---------------------------------------------------------------------------
export function thuPhuHuynh(r, { className, teacherName, freePasses = 3 }) {
  const subject = `[${className}] Thông báo về giờ tự học của em ${r.full_name}`

  const moiPh = r.bac >= 3
    ? '\nĐây là mức cao nhất trong thang kỷ luật của lớp. Kính mong Quý phụ huynh sắp xếp thời gian trao đổi trực tiếp với giáo viên chủ nhiệm để cùng tìm cách hỗ trợ em.\n'
    : ''

  const han = r.due_on ? `\nHạn hoàn thành: ${formatDate(r.due_on)}.` : ''

  const body = [
    // Nêu tên em ngay dòng đầu. Hộp thư phụ huynh của trường theo MSHS nên
    // không có tên người, mà nhà có hai anh em cùng trường thì phụ huynh phải
    // đọc hết đoạn mới biết thư nói về đứa nào.
    `Kính gửi Quý phụ huynh em ${r.full_name} — lớp ${className},`,
    '',
    `Tôi là ${teacherName}, giáo viên chủ nhiệm lớp ${className}.`,
    '',
    `Lớp có giờ tự học, mỗi buổi học sinh đăng ký trước kế hoạch của mình trên hệ thống. Trong ${r.hoc_ky || 'học kỳ này'} (tính từ ${formatDate(r.tu_ngay)}), em ${r.full_name} đã không đăng ký kế hoạch tự học ${cauSoLan(r)}.`,
    danhSachBuoi(r.cac_ngay_quen),
    bangQuyDinh(freePasses),
    '',
    `Hiện em ${r.full_name} ở mức: ${r.nhan}.`,
    `Lao động công ích: cần thực hiện ${r.luot_phai_lam} lượt, đã thực hiện ${r.luot_da_lam} lượt, còn lại ${r.con_no} lượt.${han}`,
    moiPh,
    'Kính mong Quý phụ huynh nhắc em đăng ký kế hoạch tự học đầy đủ. Nếu có buổi em vắng mặt có phép mà hệ thống vẫn tính là quên, xin Quý phụ huynh báo lại để tôi điều chỉnh.',
    '',
    'Trân trọng cảm ơn Quý phụ huynh.',
    '',
    teacherName,
    `Giáo viên chủ nhiệm lớp ${className}`,
  ].join('\n')

  return { subject, body }
}

// ---------------------------------------------------------------------------
//  THƯ GỬI HỌC SINH
// ---------------------------------------------------------------------------
// Giọng khác hẳn thư phụ huynh: nói thẳng với em, và luôn kết bằng lối ra.
// Thư kỷ luật mà chỉ có trách thì em đọc xong cũng không biết phải làm gì tiếp.
export function thuHocSinh(r, { className, teacherName, freePasses = 3 }) {
  const subject = `[${className}] Về việc đăng ký giờ tự học của em`
  const han = r.due_on ? ` Hạn hoàn thành: ${formatDate(r.due_on)}.` : ''

  const body = [
    `Chào em ${r.full_name},`,
    '',
    `Thầy/cô ghi nhận trong ${r.hoc_ky || 'học kỳ này'} em đã không đăng ký kế hoạch tự học ${cauSoLan(r)}.`,
    danhSachBuoi(r.cac_ngay_quen),
    `Mỗi bạn được miễn trừ ${freePasses} lần mỗi học kỳ, em đã dùng hết. Mức hiện tại của em: ${r.nhan}.`,
    '',
    `Em cần thực hiện ${r.luot_phai_lam} lượt lao động công ích. Em đã làm ${r.luot_da_lam} lượt, còn lại ${r.con_no} lượt.${han}`,
    '',
    'Nếu em thấy có buổi nào bị ghi nhầm — hôm đó em nghỉ có phép hoặc lớp có sự kiện — hãy nhắn lại cho thầy/cô để kiểm tra và sửa.',
    '',
    'Từ nay em nhớ vào hệ thống đăng ký kế hoạch trước mỗi buổi tự học nhé. Chỉ mất một phút, và em sẽ không phải nhận thư như thế này nữa.',
    '',
    teacherName,
  ].join('\n')

  return { subject, body }
}
