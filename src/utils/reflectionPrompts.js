// Gợi ý viết phản tư theo TỪNG LOẠI HOẠT ĐỘNG.
//
// Vì sao cần: đo trên 344 phản tư do chính học sinh viết của 8A7, độ dài trung
// bình là 36 ký tự — khoảng sáu, bảy từ. Hơn một nửa (109/203) viết dưới 30 ký
// tự, kiểu "em làm xong bài tập". Đó không phải phản tư.
//
// Một ô trống kèm câu hỏi chung chung "Em đã làm được gì?" thì nhận lại câu trả
// lời chung chung. Câu hỏi cụ thể mới ra câu trả lời cụ thể — nhất là với học
// sinh lớp 8, khi các em chưa quen tự đặt câu hỏi cho mình.
//
// `sanPham` = loại hoạt động này có thường sinh ra thứ chụp/nộp được không.
// Ôn tập hay đọc sách thì KHÔNG — ép đính kèm minh chứng chỉ khiến các em chụp
// đại một trang giấy cho đủ thủ tục.

const CHUNG = {
  cauHoi: ['Em đã làm được những gì?', 'Chỗ nào em thấy khó hoặc chưa xong?'],
  viDu: 'Em làm xong phần chính, còn một ý chưa rõ nên định hỏi lại thầy cô.',
  sanPham: false,
}

export const PROMPTS = {
  'Bài tập cá nhân': {
    cauHoi: ['Em làm được mấy bài, từ bài nào tới bài nào?', 'Bài nào còn vướng và vướng ở đâu?'],
    viDu: 'Em làm bài 1–8 trang 24, đúng 6 bài. Bài 7 em nhầm dấu khi rút gọn.',
    sanPham: true,
    goiYSanPham: 'Chụp lại vở bài làm là nhanh nhất.',
  },
  'Ôn tập': {
    cauHoi: ['Em ôn phần nào?', 'Phần nào em thấy đã chắc, phần nào còn chưa chắc?'],
    viDu: 'Em ôn 30 từ Unit 1, nhớ chắc khoảng 20 từ. Nhóm từ về nghề nghiệp em còn lẫn.',
    sanPham: false,
  },
  'Đọc sách': {
    cauHoi: ['Em đọc tới đâu?', 'Chi tiết nào làm em nhớ hoặc suy nghĩ?'],
    viDu: 'Em đọc hết chương 3. Đoạn Lão Hạc bán chó làm em thấy thương ông.',
    sanPham: false,
  },
  'Công việc nhóm': {
    cauHoi: ['Nhóm em làm tới đâu?', 'Phần việc của riêng em là gì và xong chưa?'],
    viDu: 'Nhóm xong 8/12 slide. Em phụ trách phần mở đầu, đã viết xong và tập nói một lượt.',
    sanPham: true,
    goiYSanPham: 'Dán liên kết tới bài của nhóm nếu có.',
  },
  'Chuẩn bị nội dung chia sẻ': {
    cauHoi: ['Em đã chuẩn bị được những ý nào?', 'Còn thiếu gì trước khi đứng trước lớp?'],
    viDu: 'Em có 2/3 ý chính và một ví dụ thật. Còn thiếu phần kết, em sẽ làm nốt tối nay.',
    sanPham: true,
    goiYSanPham: 'Dán liên kết tới dàn ý hoặc slide nếu có.',
  },
  'Khác': CHUNG,
}

export const promptFor = (activityType) => PROMPTS[activityType] ?? CHUNG

// Ngưỡng "đã viết đủ ý". Không chặn cứng — chỉ để giao diện nói cho em biết câu
// trả lời đang quá ngắn, kiểu như thanh đo độ mạnh mật khẩu.
export const NOTE_MIN = 10
export const NOTE_GOOD = 40

export function noteQuality(note = '') {
  const n = String(note).trim().length
  if (n === 0) return { muc: 'trong', nhan: '', gioiY: '' }
  if (n < NOTE_MIN) return { muc: 'ngan', nhan: 'Còn quá ngắn', gioiY: `Cần ít nhất ${NOTE_MIN} ký tự.` }
  if (n < NOTE_GOOD) return {
    muc: 'tam', nhan: 'Được rồi — thêm một ý nữa thì tốt hơn',
    gioiY: 'Em nói rõ hơn chỗ nào khó hoặc chưa xong nhé.',
  }
  return { muc: 'tot', nhan: 'Đủ ý rồi, cảm ơn em', gioiY: '' }
}
