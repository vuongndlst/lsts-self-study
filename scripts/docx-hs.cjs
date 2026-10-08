// Tài liệu hướng dẫn DÀNH CHO HỌC SINH.
//
//   node scripts/docx-hs.cjs
//
// Ảnh lấy từ docs/huong-dan/img (chụp bằng: node scripts/shoot-hs.mjs).
// Toàn bộ tên và số liệu trong ảnh là của lớp minh hoạ 8A0 — người bịa.

const path = require('node:path')
const L = require('./docx-lib.cjs')
const { doan, tua1, tua2, buoc, gach, hopVaCach, bang, bangVaCach, trangBia,
        xuatHaiLuot, Paragraph } = L

const anh = (ten) => path.join('docs/huong-dan/img', ten + '.png')

// Bộ đếm hình tạo MỚI trong mỗi lượt dựng. Để nó ở ngoài thì lượt thứ hai đếm
// tiếp từ 18 — và vì lượt hai mới là file giao cho người dùng, cả tài liệu sẽ
// ghi "Hình 18" tới "Hình 34". Đã dính đúng lỗi này một lần.
const than = () => {
  const H = L.taoDemHinh()
  const hinh = (ten, ct, o) => H.hinh(anh(ten), ct, o)
  const hinhKem = (ten, ct, ben, o) => H.hinhKem(anh(ten), ct, ben, o)
  const chuGiai = (ds) => H.chuGiai(ds)
  return [
  // =========================================================================
  tua1('1. Hệ thống này để làm gì'),
  doan('Trước đây em tới giờ tự học rồi mới nghĩ xem hôm nay làm gì — thường là mở sách ra ngồi, hết giờ thì cất sách, không nhớ mình đã làm được bao nhiêu. Hệ thống này yêu cầu em làm ba việc, đúng theo thứ tự:'),
  ...hopVaCach('luuY', [
    '**Trước buổi học** — đăng ký em sẽ làm gì, đặt mục tiêu cụ thể.',
    '**Trong buổi học** — làm đúng thứ đã đăng ký.',
    '**Sau buổi học** — ghi lại em làm được tới đâu, chỗ nào còn vướng.',
  ]),
  doan('Việc thứ ba nhiều bạn hay bỏ qua, nhưng lại là việc quan trọng nhất: thầy cô đọc phần em ghi để biết em đang mắc ở đâu mà giúp. Em không ghi thì thầy cô không biết, và hệ thống sẽ tự chấm em **1 sao** sau 5 ngày.'),
  ...hopVaCach('canThan', [
    '**Từ tháng 10/2026:** em **chỉ bắt buộc đăng ký khi cần dùng thiết bị điện tử** (máy tính, điện thoại, máy tính bảng). Không dùng thiết bị thì đăng ký là tuỳ em — nhưng vẫn rất nên làm, vì đó là cách em tự lên kế hoạch.',
    'Không đăng ký mà tự ý dùng thiết bị, hoặc dùng sai mục đích đã đăng ký, là **vi phạm** — xem mục 9.',
  ]),

  // =========================================================================
  tua1('2. Tạo tài khoản lần đầu'),
  doan('Em chỉ làm việc này **một lần duy nhất** trong suốt năm học.'),
  ...hinh('hs-01-trang-chu', 'Trang chủ. Bấm **Bắt đầu** để vào phần đăng nhập.'),
  ...chuGiai([
    ['1', '**Bắt đầu** — vào trang đăng nhập / tạo tài khoản.'],
    ['2', '**Xem hướng dẫn** — trang hướng dẫn ngắn ngay trong hệ thống.'],
  ]),
  ...hinhKem('hs-02-tao-tai-khoan', 'Màn hình tạo tài khoản.', [
    buoc(1, 'Bấm **Bắt đầu**, rồi chọn **Đăng ký lần đầu**.'),
    buoc(2, 'Nhập **MSHS** của em — đúng 7 chữ số, ghi trên thẻ học sinh ①.'),
    buoc(3, 'Đặt **mật khẩu** và gõ lại cho khớp ②. Các quy tắc hiện ngay bên dưới ô nhập, đủ điều kiện nào thì điều kiện đó chuyển sang màu xanh.'),
    buoc(4, 'Bấm **Tạo tài khoản của em** ③.'),
  ], { rong: 300 }),
  ...hopVaCach('canThan', [
    'Mật khẩu **không được chứa MSHS của em**. Đây là lỗi hay gặp nhất: em đặt mật khẩu có sẵn mã số của mình thì hệ thống từ chối.',
    'Tài khoản gắn với email trường cấp cho em (**MSHS@lsts.edu.vn**). Em không cần mở email này để đăng ký, nhưng nếu quên mật khẩu thì thư khôi phục sẽ gửi về đó.',
  ]),

  // =========================================================================
  tua1('3. Đăng nhập và quên mật khẩu'),
  ...hinhKem('hs-03-dang-nhap', 'Màn hình đăng nhập. Nhớ chọn đúng thẻ **Học sinh**.', [
    ['1', 'Nhập **MSHS**, không phải email.'],
    ['2', 'Nhập mật khẩu em đã đặt.'],
    ['3', 'Bấm **Đăng nhập học sinh**.'],
    ['4', 'Bấm đây nếu em quên mật khẩu.'],
  ], { rong: 330 }),
  ...hinhKem('hs-04-quen-mat-khau', 'Cửa sổ khôi phục mật khẩu.', [
    doan('**Nếu em quên mật khẩu:** bấm **Quên mật khẩu?**, nhập MSHS rồi bấm gửi. Hệ thống gửi một liên kết đặt lại mật khẩu về email trường của em.'),
    doan('Không mở được email trường thì báo trực tiếp cho giáo viên chủ nhiệm — thầy cô đặt lại mật khẩu giúp em được, em không phải chờ thư.'),
  ], { rong: 300 }),

  // =========================================================================
  tua1('4. Màn hình chính của em'),
  doan('Đăng nhập xong em thấy màn hình này. Tất cả những gì em cần đều nằm ở đây.'),
  ...hinh('hs-06-tong-quan', 'Màn hình chính sau khi đăng nhập.'),
  ...chuGiai([
    ['1', '**Đăng ký giờ tự học** — nút to màu xanh đậm, dùng để đăng ký buổi mới.'],
    ['2', '**Thẻ thiết bị điện tử** — tuần này em đã dùng thiết bị mấy ngày, lớp giới hạn thế nào, và em đã vi phạm lần nào chưa.'],
    ['3', '**Bộ lọc nhanh** — bấm một cái là hiện đúng nhóm nhiệm vụ đó. Ví dụ bấm *Trễ hạn* thì chỉ còn những buổi em chưa cập nhật kết quả.'],
  ]),
  ...hopVaCach('meo',
    'Mỗi lần vào trang, em nhìn hai chỗ: con số bên cạnh **Trễ hạn** và **Cần viết phản hồi**. Hai con số đó bằng 0 nghĩa là em không nợ việc gì.'),

  // =========================================================================
  tua1('5. Đăng ký một buổi tự học'),
  ...hopVaCach('canThan',
    'Hạn đăng ký là **24:00 của ngày hôm trước**. Đăng ký sau mốc đó, buổi của em bị đánh dấu **Trễ**. Buổi nào **cần dùng thiết bị** thì bắt buộc phải đăng ký trước — xem mục 9.'),
  ...hinhKem('hs-07-dang-ky-buoi', 'Cửa sổ đăng ký một buổi tự học.', [
    buoc(1, 'Bấm **Đăng ký giờ tự học**.'),
    buoc(2, 'Chọn **ngày** và **tiết** tự học.'),
    buoc(3, 'Điền nhiệm vụ: môn, việc cụ thể em sẽ làm, và mục tiêu.'),
    buoc(4, 'Nhiệm vụ nào cần máy tính hoặc điện thoại thì bật **Dùng thiết bị điện tử** và ghi rõ dùng để làm gì — thầy cô sẽ duyệt.'),
    buoc(5, 'Bấm lưu.'),
  ]),
  ...hopVaCach('luuY', [
    'Một **buổi** có thể chứa **nhiều nhiệm vụ**. Ví dụ tiết 8–9 thứ Sáu em làm Toán 45 phút rồi Tiếng Anh 45 phút — đó là một buổi, hai nhiệm vụ.',
    'Mục tiêu nên **đo được**. "Học bài" thì không biết thế nào là xong. "Làm bài 1–8 trang 24, đúng ít nhất 6 bài" thì cuối buổi em tự biết mình đạt hay chưa.',
  ]),
  tua2('Khi công tắc thiết bị bị khoá'),
  ...hinhKem('hs-18-khoa-thiet-bi', 'Công tắc thiết bị bị khoá, kèm lý do.', [
    doan('Có ba trường hợp em **không bật được** công tắc thiết bị, và hệ thống ghi rõ lý do ngay dưới công tắc ①:'),
    gach('Em đang bị **tạm dừng dùng thiết bị** vì vi phạm.'),
    gach('Lớp chỉ cho dùng thiết bị vào **một số thứ** trong tuần, mà ngày em chọn không nằm trong đó.'),
    gach('Tuần đó em đã dùng **đủ số ngày** lớp cho phép. Nhiều nhiệm vụ dùng thiết bị trong cùng một ngày chỉ tính là một ngày.'),
    doan('Em vẫn đăng ký nhiệm vụ **không dùng thiết bị** bình thường.'),
  ], { rong: 300 }),

  // =========================================================================
  tua1('6. Xem lại các buổi đã đăng ký'),
  doan('Phần **Nhiệm vụ của em** liệt kê mọi buổi em đã đăng ký, mới nhất trước. Buổi **trong tương lai** thì em còn sửa hoặc xoá được; buổi **đã qua** thì không sửa được nữa, chỉ còn cập nhật kết quả.'),
  ...hinh('hs-08-nhiem-vu-cua-em', 'Danh sách buổi tự học của em.'),
  ...chuGiai([
    ['1', 'Bộ lọc nhanh — bấm để xem từng nhóm.'],
    ['2', 'Một thẻ là một **buổi**, ghi rõ ngày, tiết, khung giờ, và em đã cập nhật kết quả cho mấy nhiệm vụ.'],
  ]),
  ...bangVaCach(['Nhãn trên thẻ', 'Nghĩa là gì'], [
    ['Đúng hạn', 'Em đăng ký trước 24:00 hôm trước.'],
    ['Trễ', 'Em đăng ký sau hạn. Buổi vẫn được ghi nhận, nhưng thầy cô thấy là em đăng ký muộn.'],
    ['Chưa có kết quả', 'Buổi đã qua mà em chưa ghi mình làm được gì.'],
    ['Chờ duyệt', 'Em xin dùng thiết bị, thầy cô chưa duyệt.'],
    ['Cần điều chỉnh', 'Thầy cô trả về, kèm lý do. Em sửa rồi gửi lại. Tới giờ học mà chưa sửa thì coi như bị từ chối — không cần nộp kết quả.'],
  ], [26, 74]),

  // =========================================================================
  tua1('7. Cập nhật kết quả — phần quan trọng nhất'),
  doan('Làm xong rồi em phải quay lại ghi mình làm được tới đâu. Trên thẻ của buổi đã qua có nút **Xem lại / bổ sung kết quả**.'),
  ...hinhKem('hs-09-cap-nhat-ket-qua', 'Cửa sổ cập nhật kết quả.', [
    doan('**Viết gì vào ô "Em đã làm được gì?"** — hệ thống gợi ý sẵn **hai câu hỏi** ngay trên ô nhập, và câu hỏi đổi theo loại hoạt động em đã chọn. Em cứ trả lời hai câu đó là đủ.'),
    doan('**Nếu em còn vướng** — bật công tắc **Em cần giáo viên hỗ trợ** và ghi rõ vướng chỗ nào. Buổi đó sẽ hiện lên bảng của thầy cô kèm dấu cần hỗ trợ, thầy cô sẽ tìm em.'),
  ], { rong: 280 }),
  ...hopVaCach('canThan', [
    'Viết "**xong rồi**" hay "**em làm hết bài**" là chưa đủ. Thầy cô đọc xong vẫn không biết em làm được gì, vướng ở đâu, nên không giúp được gì cho em.',
    'Thanh màu dưới ô nhập cho em biết đã viết đủ ý chưa — giống thanh đo độ mạnh của mật khẩu. Khi nào hiện **"Đủ ý rồi, cảm ơn em"** là được.',
  ]),
  doan('Hai ví dụ, cùng một buổi học:'),
  ...bangVaCach(['Chưa đạt', 'Đạt'], [
    ['"em làm xong bài tập"', '"Em làm bài 1–8 trang 24, đúng 7 bài. Bài 7 em nhầm dấu khi rút gọn, đã xem lại và hiểu chỗ sai."'],
    ['"học bài rồi"', '"Em ôn 30 từ Unit 1, tự kiểm tra nhớ được 26. Nhóm từ về nghề nghiệp em còn lẫn."'],
  ], [30, 70]),
  tua2('Đính kèm minh chứng'),
  doan('Nếu buổi đó có thứ chụp được — trang vở em đã làm, bài trình chiếu, đường dẫn tới bài của nhóm — em đính kèm ở phần dưới cùng. Tối đa 3 thứ: ảnh, tệp PDF hoặc liên kết.'),
  ...hinh('hs-10-minh-chung', 'Phần đính kèm minh chứng của một nhiệm vụ có dùng thiết bị — ghi rõ **bắt buộc ít nhất 1**.'),
  ...bangVaCach(['Nhiệm vụ', 'Minh chứng'], [
    ['**Được duyệt dùng thiết bị**', '**Bắt buộc ít nhất một** ảnh, tệp hoặc liên kết. Chưa có thì hệ thống chưa cho lưu kết quả. Minh chứng cuối cùng không xoá được — muốn thay thì thêm cái mới trước rồi mới xoá cái cũ.'],
    ['Không dùng thiết bị', 'Không bắt buộc — chỉ cần ghi kết quả. Có những việc không sinh ra sản phẩm nào — ôn bài, đọc sách. Phần chữ em viết mới là chính.'],
    ['Bị từ chối', 'Kế hoạch bị trả về hoặc thiết bị bị từ chối: **không cần nộp kết quả**, không bị nhắc trễ hạn, không bị tự chấm 1 sao.'],
  ], [32, 68]),
  ...hopVaCach('luuY',
    'Minh chứng phải là **kết quả thật** của buổi đó: ảnh chụp màn hình bài làm, tệp em đã làm ra, đường dẫn tới sản phẩm. Đừng chụp đại một trang giấy cho đủ thủ tục.'),

  // =========================================================================
  tua1('8. Xem thầy cô chấm sao và nhận xét'),
  ...hinhKem('hs-11-xem-danh-gia', 'Chi tiết một nhiệm vụ đã được chấm.', [
    doan('Bấm vào một buổi đã được chấm để xem đầy đủ: số sao, nhận xét của thầy cô, và phần em đã ghi.'),
    doan('Nếu bài của em bị chấm **1 hoặc 2 sao**, hệ thống sẽ nhắc em viết phản hồi. Em đọc nhận xét rồi ghi một dòng cho biết em sẽ điều chỉnh thế nào.'),
    doan('Đây không phải hình phạt — đó là cách để lần sau em làm tốt hơn.'),
  ], { rong: 260 }),

  // =========================================================================
  tua1('9. Thiết bị điện tử và xử lý vi phạm'),
  doan('Giờ tự học có thể dùng thiết bị điện tử, nhưng phải **đăng ký trước** và được thầy cô **duyệt**, và chỉ dùng **đúng mục đích** đã ghi. Thầy cô có thể giới hạn số ngày được dùng mỗi tuần, hoặc chỉ cho dùng vào một số thứ.'),
  ...hinh('hs-12-the-thiet-bi', 'Thẻ thiết bị điện tử của một bạn đang bị tạm dừng.'),
  ...chuGiai([
    ['1', 'Số lần em đã vi phạm quy định thiết bị trong năm học.'],
    ['2', 'Tuần này em đã dùng thiết bị mấy ngày — hoặc, nếu đang bị tạm dừng, tạm dừng đến hết ngày nào và vì sao.'],
    ['3', 'Số lượt lao động công ích em còn nợ.'],
  ]),
  tua2('Thế nào là vi phạm'),
  ...hopVaCach('canThan', [
    '**Không đăng ký mà tự ý dùng** thiết bị trong giờ tự học.',
    '**Dùng sai mục đích** — đăng ký để tra cứu tài liệu nhưng lại chơi trò chơi, xem video giải trí, nhắn tin…',
  ]),
  tua2('Quy định xử lý'),
  ...bangVaCach(['Lần vi phạm', 'Hình thức xử lý'], [
    ['Lần 1', 'Cấm dùng thiết bị **1 tuần** + **5 lượt** lao động công ích.'],
    ['Lần 2', 'Cấm dùng thiết bị **2 tuần** + **10 lượt** lao động công ích.'],
    ['Lần 3', 'Cấm dùng thiết bị **1 tháng** + **20 lượt** lao động công ích.'],
    ['Từ lần 4', '**Mời phụ huynh** lên trao đổi; vẫn cấm 1 tháng + 20 lượt.'],
  ], [26, 74]),
  doan('Mỗi lần xử lý **riêng**, không cộng dồn: lần 2 là 10 lượt của riêng lần 2, không phải 5 + 10. Đang bị cấm mà vi phạm tiếp thì lần cấm mới bắt đầu **sau khi** lần cũ hết.'),
  ...hinh('hs-13-quy-dinh-thiet-bi', 'Bấm vào thẻ thiết bị để mở bảng quy định và từng lần vi phạm của em. Mức em đang ở được tô đậm.'),
  ...hopVaCach('meo', [
    'Trong thời gian bị tạm dừng, em **vẫn tự học bình thường** — chỉ không đăng ký dùng thiết bị được. Những buổi thiết bị đã được duyệt rơi vào thời gian đó sẽ tự bị huỷ duyệt và em nhận thông báo.',
    'Nếu em thấy mình bị ghi nhầm, hãy nhắn thầy cô. Thầy cô **huỷ** lần ghi nhầm đó được — lần đó sẽ không tính nữa.',
  ]),

  // =========================================================================
  tua1('10. Cửa sổ nhắc việc'),
  ...hinhKem('hs-05-popup-nhac', 'Cửa sổ nhắc việc khi em vào trang.', [
    doan('Nếu em còn việc chưa xong, mỗi lần vào trang hệ thống sẽ nhắc. Em bấm thẳng từ đây tới chỗ cần làm.'),
    doan('Bấm **Để sau** thì cửa sổ đóng lại, nhưng lần đăng nhập sau nó sẽ nhắc lại — cho tới khi việc xong.'),
  ], { rong: 290 }),

  // =========================================================================
  tua1('11. Chia sẻ sách'),
  doan('Mỗi bạn có một tuần được phân công chia sẻ về một cuốn sách mình đã đọc. Lịch phân công do giáo viên chủ nhiệm xếp từ đầu năm.'),
  ...hinhKem('hs-14-popup-chia-se-sach', 'Nhắc chia sẻ sách, hiện mỗi lần vào trang từ một tuần trước hạn nộp.', [
    doan('**Nộp bài chia sẻ** — trên màn hình chính của em có thẻ **Lượt chia sẻ sách của em**. Bấm vào đó để mở phần nhập.'),
    doan('Bấm **Chia sẻ sách** trên thanh trên cùng để xem toàn bộ bài của cả lớp, bất cứ lúc nào.'),
  ], { rong: 290 }),
  ...hinh('hs-15-nop-chia-se-sach', 'Phần nhập bài chia sẻ sách.'),
  buoc(1, 'Điền **tên sách** và **tác giả**.'),
  buoc(2, '**Tóm tắt nội dung** — cuốn sách kể về điều gì, viết ngắn gọn để các bạn dễ hình dung.'),
  buoc(3, '**Bài học rút ra** — đây là phần quan trọng nhất, và phải là suy nghĩ của chính em.'),
  buoc(4, 'Dán **liên kết bài trình chiếu** (Canva, Google Slides…).'),
  buoc(5, 'Bấm **Lưu bài chia sẻ**.'),
  ...hopVaCach('canThan',
    'Liên kết trình chiếu phải bật quyền **"ai có liên kết cũng xem được"**. Nếu để riêng tư thì thầy cô và các bạn bấm vào chỉ thấy báo lỗi.'),
  ...hinh('hs-16-ket-qua-ca-lop', 'Trang chia sẻ sách của cả lớp.'),

  // =========================================================================
  tua1('12. Hỏi thầy cô'),
  ...hinhKem('hs-17-hoi-giao-vien', 'Cửa sổ nhắn tin với giáo viên.', [
    doan('Em có thể nhắn thẳng cho giáo viên chủ nhiệm trong hệ thống — bấm **Nhắn giáo viên** ở góc trên màn hình chính.'),
    doan('Tin nhắn này chỉ **em và giáo viên** đọc được. Các bạn khác trong lớp không thấy.'),
  ], { rong: 320 }),

  // =========================================================================
  tua1('13. Câu hỏi thường gặp'),
  bang(['Em hỏi', 'Trả lời'], [
    ['Hôm nay em không dùng máy, có phải đăng ký không?',
     'Không bắt buộc. Em vẫn nên đăng ký để tự lên kế hoạch và ghi lại kết quả, nhưng không đăng ký thì cũng không bị xử lý gì.'],
    ['Em quên đăng ký mà buổi đó cần dùng máy thì sao?',
     'Đăng ký ngay trước khi dùng — sau 24:00 hôm trước thì bị đánh dấu **Trễ**, và nếu lớp khoá đăng ký trễ thì không đăng ký được nữa. Khi đó em **không được dùng** thiết bị; dùng là vi phạm.'],
    ['Em đăng ký rồi nhưng hôm đó làm việc khác, ghi sao?',
     'Cứ ghi đúng sự thật vào ô kết quả. Thầy cô cần biết em thực sự làm gì, không phải một bản báo cáo đẹp.'],
    ['Sao công tắc thiết bị của em bị mờ, không bật được?',
     'Đọc dòng chữ đỏ ngay dưới công tắc: em đang bị tạm dừng, hoặc ngày đó lớp không cho dùng thiết bị, hoặc tuần đó em đã dùng đủ số ngày.'],
    ['Em sửa kết quả đã ghi được không?',
     'Được. Mở lại buổi đó và sửa. Nếu thầy cô đã chấm sao rồi thì bài sẽ được đánh dấu để thầy cô chấm lại.'],
    ['Em thấy nhiệm vụ bị hệ thống tự chấm 1 sao, sao vậy?',
     'Vì quá 5 ngày kể từ buổi học mà em chưa ghi kết quả. Em vẫn bổ sung kết quả được, và thầy cô sẽ chấm lại.'],
    ['Em đổi mật khẩu ở đâu?',
     'Nút **Đổi mật khẩu** ở góc trên màn hình chính.'],
  ], [34, 66]),
  ]
}

const MUC_LUC = [
  '1. Hệ thống này để làm gì',
  '2. Tạo tài khoản lần đầu',
  '3. Đăng nhập và quên mật khẩu',
  '4. Màn hình chính của em',
  '5. Đăng ký một buổi tự học',
  '6. Xem lại các buổi đã đăng ký',
  '7. Cập nhật kết quả — phần quan trọng nhất',
  '8. Xem thầy cô chấm sao và nhận xét',
  '9. Thiết bị điện tử và xử lý vi phạm',
  '10. Cửa sổ nhắc việc',
  '11. Chia sẻ sách',
  '12. Hỏi thầy cô',
  '13. Câu hỏi thường gặp',
]

xuatHaiLuot('docs/huong-dan/Huong-dan-hoc-sinh.docx', {
  tieuDeFile: 'Hướng dẫn sử dụng — Học sinh',
  muc: MUC_LUC,
  bia: trangBia({
    nhan: 'HỆ THỐNG QUẢN LÝ GIỜ TỰ HỌC',
    tua: 'Hướng dẫn dành cho học sinh',
    phu: 'Đăng ký · Thực hiện · Nhìn lại kết quả',
    truong: 'Trường THCS & THPT Đinh Thiện Lý',
    nam: '2026 – 2027',
  }),
  than,
}).then((bd) => console.log('  Mục lục:', bd ? JSON.stringify(bd) : 'không đo được'))
