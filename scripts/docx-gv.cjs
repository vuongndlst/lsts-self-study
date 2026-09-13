// Tài liệu hướng dẫn DÀNH CHO GIÁO VIÊN.
//
//   node scripts/docx-gv.cjs
//
// Ảnh lấy từ docs/huong-dan/img (chụp bằng: GV_MK=… node scripts/shoot-gv.mjs).
// Toàn bộ tên và số liệu trong ảnh là của lớp minh hoạ 8A0 — người bịa.

const path = require('node:path')
const L = require('./docx-lib.cjs')
const { doan, tua1, tua2, buoc, gach, hopVaCach, bang, trangBia, xuatHaiLuot, Paragraph } = L

const anh = (ten) => path.join('docs/huong-dan/img', ten + '.png')
const trong = (n = 120) => new Paragraph({ spacing: { after: n }, children: [] })

const than = () => {
  const H = L.taoDemHinh()
  const hinh = (ten, ct, o) => H.hinh(anh(ten), ct, o)
  const chuGiai = (ds) => H.chuGiai(ds)

  return [
  // =========================================================================
  tua1('1. Hệ thống này làm gì cho thầy cô'),
  doan('Giờ tự học trước đây là một khoảng thời gian khó nhìn thấy: học sinh ngồi trong lớp, nhưng thầy cô không biết em nào đang làm gì, em nào đang tắc, em nào chỉ ngồi cho hết giờ.'),
  doan('Hệ thống này bắt học sinh khai ba thứ, và đưa cả ba lên bàn của thầy cô:'),
  ...hopVaCach('luuY', [
    '**Trước buổi học** — em đăng ký sẽ làm gì, mục tiêu là gì.',
    '**Sau buổi học** — em ghi lại làm được tới đâu, vướng ở đâu.',
    '**Thầy cô** — đọc, chấm sao, nhận xét, và thấy ngay em nào cần giúp.',
  ]),
  doan('Tài liệu này viết theo **thứ tự thao tác**: đầu năm làm gì, hằng ngày làm gì, hằng tuần làm gì. Thầy cô mở ra làm theo được ngay, không cần hiểu hệ thống chạy thế nào.'),
  ...hopVaCach('meo',
    'Mọi ảnh trong tài liệu này chụp từ **lớp minh hoạ 8A0** — mười học sinh hoàn toàn hư cấu. Thầy cô muốn bấm thử mọi nút mà không sợ hỏng dữ liệu lớp mình thì xin tài khoản lớp này từ người quản trị.'),

  // =========================================================================
  tua1('2. Đăng nhập'),
  buoc(1, 'Mở địa chỉ hệ thống, bấm **Bắt đầu**.'),
  buoc(2, 'Chọn thẻ **Giáo viên** — đây là bước hay bị bỏ sót, vì màn hình mặc định mở thẻ Học sinh.'),
  buoc(3, 'Nhập email trường và mật khẩu, bấm **Vào trang giáo viên**.'),
  ...hinh('gv-01-dang-nhap', 'Màn hình đăng nhập, thẻ **Giáo viên**.'),
  ...chuGiai([
    ['1', 'Thẻ **Giáo viên** — phải chọn thẻ này, không phải thẻ Học sinh.'],
    ['2', 'Email trường của thầy cô.'],
    ['3', 'Mật khẩu.'],
    ['4', 'Bấm để vào.'],
  ]),
  trong(),
  ...hopVaCach('canThan',
    'Lần đầu đăng nhập, hệ thống yêu cầu **đổi mật khẩu tạm**. Mật khẩu mới phải đủ các quy tắc hiện trên màn hình. Nếu thầy cô quên mật khẩu, bấm **Quên mật khẩu?** để nhận thư khôi phục, hoặc báo người quản trị.'),

  // =========================================================================
  tua1('3. Màn hình chính'),
  doan('Vào được rồi, thầy cô thấy ngay **hộp việc cần xử lý** — mỗi ô là một nhóm việc đang chờ.'),
  ...hinh('gv-02-tong-quan', 'Trang giáo viên, phần trên cùng.'),
  ...chuGiai([
    ['1', '**Hộp việc cần xử lý.** Mỗi ô **bấm được** — bấm một cái là danh sách bên dưới lọc ra đúng nhóm đó. Đây là cách nhanh nhất để bắt đầu một buổi làm việc.'],
    ['2', '**Tám thẻ chức năng.** Toàn bộ công việc nằm ở đây, tài liệu này đi lần lượt qua từng thẻ.'],
    ['3', '**Xuất CSV** — tải toàn bộ dữ liệu lớp ra Excel để làm báo cáo.'],
  ]),
  trong(),
  doan('Ý nghĩa từng ô trong hộp việc cần xử lý:'),
  bang(['Ô', 'Nghĩa là gì'], [
    ['Chờ duyệt', 'Em xin dùng máy tính/điện thoại, đang chờ thầy cô đồng ý.'],
    ['Cần điều chỉnh', 'Thầy cô đã trả kế hoạch về, em chưa sửa lại.'],
    ['Trễ hạn cập nhật', 'Buổi đã qua 48 giờ mà em chưa ghi kết quả.'],
    ['Chờ chấm sao', 'Em đã ghi kết quả, đang chờ thầy cô chấm.'],
    ['Cần hỗ trợ', 'Em tự bấm nút báo là đang vướng.'],
    ['Hệ thống tự chấm', 'Quá 120 giờ em vẫn không ghi kết quả — hệ thống tự chấm 1 sao.'],
    ['Chưa có kế hoạch ngày mai', 'Mai có tiết tự học mà em chưa đăng ký gì.'],
    ['Có em cần trao đổi với phụ huynh', 'Có em đã quên đăng ký từ 6 lần trở lên.'],
  ], [30, 70]),
  trong(200),
  tua2('Chuông thông báo'),
  doan('Biểu tượng chuông trên thanh trên cùng gom những việc mới: em xin dùng thiết bị, em báo cần hỗ trợ, em nộp bài chia sẻ sách.'),
  ...hinh('gv-25-thong-bao', 'Bảng thông báo. Trong ảnh là lớp minh hoạ nên chưa có thông báo nào.'),

  // =========================================================================
  tua1('4. Thiết lập đầu năm'),
  doan('Bốn việc dưới đây làm **một lần** vào đầu năm học. Làm xong thì cả năm không phải đụng lại, trừ khi lớp đổi lịch.'),

  tua2('4.1 Nhập danh sách lớp từ Excel'),
  buoc(1, 'Vào thẻ **Học sinh**.'),
  buoc(2, 'Bấm **Nhập danh sách từ Excel**.'),
  buoc(3, 'Bấm **Tải file mẫu Excel**, điền ba cột **STT**, **MSHS**, **Họ và tên học sinh** — giữ nguyên tên cột ở dòng đầu — rồi chọn file.'),
  buoc(4, 'Hệ thống hiện **bản xem trước**: em nào thêm mới, em nào đã có, dòng nào bị bỏ qua và vì sao. Đọc kỹ bảng này rồi mới bấm nhập.'),
  ...hinh('gv-10-nhap-excel', 'Cửa sổ nhập danh sách từ Excel.'),
  ...hopVaCach('luuY', [
    'Nhập danh sách **không tạo tài khoản** cho học sinh. Các em tự tạo tài khoản bằng MSHS của mình — xem tài liệu dành cho học sinh.',
    'Nhập lại lần hai **không nhân đôi** học sinh. Em nào không còn trong danh sách mới thì bị ngưng ghi danh, nhưng **dữ liệu cũ vẫn giữ nguyên**, không mất gì.',
  ]),
  ...hinh('gv-09-danh-sach-lop', 'Thẻ Học sinh sau khi nhập xong.'),
  ...chuGiai([
    ['1', 'Nhập danh sách từ Excel.'],
    ['2', 'Xuất danh sách lớp ra CSV.'],
  ]),

  trong(200),
  tua2('4.2 Khai lịch tự học cố định'),
  doan('Đây là **việc quan trọng nhất** trong phần thiết lập. Hệ thống dựa vào lịch này để biết ngày nào lớp có tiết tự học, từ đó mới biết em nào quên đăng ký.'),
  buoc(1, 'Vào thẻ **Lịch tự học**.'),
  buoc(2, 'Bấm chọn các tiết tự học theo từng thứ trong tuần.'),
  buoc(3, 'Lưu.'),
  ...hinh('gv-14-lich-tu-hoc', 'Khai lịch tự học cố định của lớp.'),
  ...hopVaCach('canThan',
    'Chưa khai lịch thì hệ thống **không biết ngày nào là ngày tự học**, nên không tính được ai quên đăng ký, và toàn bộ phần kỷ luật không chạy.'),

  trong(200),
  tua2('4.3 Luật đăng ký của lớp'),
  ...hinh('gv-15-luat-dang-ky', 'Hai công tắc về luật đăng ký.'),
  doan('**Cho phép đăng ký trễ** — bật thì em vẫn đăng ký được sau 24:00 hôm trước, chỉ bị đánh dấu *Trễ*. Tắt thì em không đăng ký được nữa.'),
  doan('**Bắt buộc cập nhật kết quả** — bật thì em còn nợ kết quả quá hạn sẽ **không đăng ký được buổi mới**, cho tới khi ghi xong. Mặc định **tắt**.'),
  ...hopVaCach('meo',
    'Công tắc thứ hai là đòn bẩy mạnh nhất trong hệ thống. Nhưng nên bật sau vài tuần, khi các em đã quen nếp — bật ngay từ đầu năm dễ thành rào cản hơn là động lực.'),

  trong(200),
  tua2('4.4 Mốc học kỳ và quyền miễn trừ'),
  buoc(1, 'Vào thẻ **Kỷ luật**, mở khối **Cài đặt kỷ luật**.'),
  buoc(2, 'Bật phần theo dõi quên đăng ký.'),
  buoc(3, 'Đặt **ngày bắt đầu tính** — thường là ngày lớp bắt đầu nếp tự học, không phải ngày khai giảng.'),
  buoc(4, 'Đặt **ngày đầu và cuối của mỗi học kỳ**, và **số lần được miễn trừ** mỗi học kỳ.'),
  ...hinh('gv-20-cai-dat-ky-luat', 'Cài đặt kỷ luật và mốc học kỳ.'),
  ...hopVaCach('luuY',
    'Mỗi lớp đặt mốc riêng. Lớp bắt đầu nếp tự học muộn hơn thì đặt ngày bắt đầu muộn hơn — những ngày trước mốc đó không bị tính là quên.'),

  // =========================================================================
  tua1('5. Việc hằng ngày'),
  doan('Ba việc dưới đây mất chừng năm phút mỗi ngày.'),

  tua2('5.1 Xem ai chưa đăng ký'),
  buoc(1, 'Vào thẻ **Chưa đăng ký**.'),
  buoc(2, 'Chọn **Hôm nay** hoặc **Ngày mai**.'),
  buoc(3, 'Bấm **Chép danh sách** để có sẵn danh sách tên, dán vào Zalo lớp nhắc các em.'),
  ...hinh('gv-12-chua-dang-ky', 'Danh sách em chưa đăng ký.'),
  ...hopVaCach('meo',
    'Xem **Ngày mai** hiệu quả hơn xem Hôm nay: nhắc trước khi hết hạn 24:00 thì các em còn kịp đăng ký, không ai bị tính là quên.'),

  trong(200),
  tua2('5.2 Miễn buổi tự học'),
  doan('Buổi đã miễn thì **không ai bị tính là quên đăng ký**. Dùng cho hai tình huống:'),
  gach('**Cả lớp** — hôm đó lớp đi hội trại, dự lễ, có hoạt động khác.'),
  gach('**Một em** — em nghỉ ốm, nghỉ có phép.'),
  ...hinh('gv-13-mien-buoi', 'Khối Miễn buổi tự học, nằm ngay trong thẻ Chưa đăng ký.'),
  ...hopVaCach('luuY',
    'Miễn **sau khi hết ngày cũng được**. Hệ thống sẽ gỡ luôn những lần quên đã trót ghi cho buổi đó — nên em xin phép muộn vẫn không bị oan.'),

  trong(200),
  tua2('5.3 Duyệt kế hoạch dùng thiết bị'),
  doan('Em nào cần dùng máy tính hoặc điện thoại trong giờ tự học thì phải xin trước. Bấm ô **Chờ duyệt** ở hộp việc cần xử lý để lọc ra đúng nhóm này.'),
  ...hinh('gv-04-bang-ke-hoach', 'Bảng kế hoạch — nơi duyệt, chấm sao và xem chi tiết.'),

  // =========================================================================
  tua1('6. Việc hằng tuần'),

  tua2('6.1 Chấm sao từng bài'),
  buoc(1, 'Bấm ô **Chờ chấm sao** ở hộp việc cần xử lý.'),
  buoc(2, 'Bấm vào tên môn ở một dòng để mở chi tiết.'),
  buoc(3, 'Đọc phần em ghi, chọn số sao, viết nhận xét nếu cần.'),
  ...hinh('gv-05-cham-sao', 'Cửa sổ chi tiết một nhiệm vụ.'),
  ...hopVaCach('meo',
    'Nhận xét ngắn mà cụ thể có tác dụng hơn nhận xét dài. *"Em ghi rõ sai ở đâu, rất tốt"* dạy được nhiều hơn *"Cố gắng lên"*.'),

  trong(200),
  tua2('6.2 Chấm sao hàng loạt'),
  doan('Khi có hàng chục bài cùng đạt mức tương đương, chấm từng bài mất quá nhiều thời gian.'),
  buoc(1, 'Tích chọn các dòng cần chấm — hoặc bấm **Chọn N chờ chấm sao** để chọn hết một lượt.'),
  buoc(2, 'Thanh thao tác hiện lên ở cuối màn hình.'),
  ...hinh('gv-06-cham-sao-hang-loat', 'Thanh thao tác hàng loạt.'),
  ...chuGiai([
    ['1', 'Bấm **Chấm sao N tiết** để mở cửa sổ chấm.'],
  ]),
  trong(),
  buoc(3, 'Chọn số sao cho cả nhóm, viết nhận xét chung nếu muốn, rồi bấm chấm.'),
  ...hinh('gv-06b-cua-so-cham-hang-loat', 'Cửa sổ chấm sao hàng loạt.'),
  ...hopVaCach('luuY', [
    'Cửa sổ liệt kê **sẽ chấm cho những em nào** trước khi thầy cô bấm — đọc lại danh sách đó rồi mới chấm.',
    'Nếu trong nhóm có tiết đã bị **hệ thống tự chấm 1 sao**, cửa sổ nói rõ số lượng và cảnh báo rằng chấm ở đây sẽ ghi đè lên điểm tự động.',
  ]),
  ...hopVaCach('canThan',
    'Để trống ô **Nhận xét chung** thì nhận xét riêng của từng tiết **được giữ nguyên**. Chỉ khi thầy cô gõ vào ô đó, nhận xét cũ mới bị thay. Nên dùng chấm hàng loạt cho nhóm bài tương đương nhau, còn bài cần nói riêng thì mở lẻ ra chấm.'),

  trong(200),
  tua2('6.3 Bộ lọc'),
  doan('Bảng kế hoạch có bộ lọc đầy đủ: theo em, theo môn, theo tiết, theo khoảng ngày, theo tình trạng duyệt, theo số sao.'),
  ...hinh('gv-03-bo-loc', 'Bộ lọc của bảng kế hoạch.'),
  ...hopVaCach('luuY',
    'Hộp việc cần xử lý ở trên **luôn đếm trên toàn bộ dữ liệu**, không theo bộ lọc. Nhờ vậy lọc xong rồi các con số vẫn đúng — bấm một ô lọc rồi thấy mọi ô khác tụt về 0 thì thầy cô sẽ tưởng đã hết việc.'),

  trong(200),
  tua2('6.4 Nhìn theo từng học sinh'),
  doan('Thẻ **Theo học sinh** đổi góc nhìn: mỗi dòng là một em, kèm số nhiệm vụ, tỉ lệ đúng hạn, điểm sao trung bình, số việc còn tồn.'),
  ...hinh('gv-07-theo-hoc-sinh', 'Bảng theo từng học sinh.'),

  trong(200),
  tua2('6.5 Đặt lại mật khẩu, chuyển lớp, đánh dấu tài khoản thử'),
  doan('Trong thẻ **Học sinh**, mỗi dòng có hai nút ở cuối.'),
  ...hinh('gv-11-thao-tac-tung-em', 'Hai nút thao tác ở cuối mỗi dòng.'),
  ...chuGiai([
    ['1', '**Đánh dấu tài khoản thử nghiệm** — tài khoản giả thầy cô tạo để xem thử giao diện. Đánh dấu rồi thì nó biến khỏi danh sách chưa đăng ký, sổ quên và bảng kỷ luật.'],
    ['2', '**Chuyển khỏi lớp** — em chuyển lớp hoặc chuyển trường. Tài khoản và toàn bộ lịch sử của em **vẫn được giữ**, đây không phải xoá.'],
  ]),
  trong(),
  doan('Muốn đặt lại mật khẩu cho em quên: vào thẻ **Theo học sinh**, tích chọn em rồi bấm **Đặt lại mật khẩu**. Chọn nhiều em một lúc cũng được.'),

  // =========================================================================
  tua1('7. Kỷ luật quên đăng ký'),
  doan('Ngày lớp có tiết tự học mà em không đăng ký gì, hệ thống ghi một lần quên. Việc ghi diễn ra tự động lúc **0 giờ 5 phút sáng hôm sau**.'),
  ...hopVaCach('luuY',
    'Hai tiết **liền nhau** trong cùng một buổi chỉ tính **một** lần quên. Thứ Sáu tiết 8–9 mà em không đăng ký gì là một lần, không phải hai.'),

  tua2('7.1 Bảng kỷ luật'),
  ...hinh('gv-16-bang-ky-luat', 'Bảng kỷ luật quên đăng ký.'),
  doan('Thang kỷ luật **không cộng dồn**: quên lần thứ 5 là *10 lượt*, không phải 5 + 10.'),
  bang(['Số lần quên', 'Mức'], [
    ['Trong số lần miễn trừ', 'Không có kỷ luật.'],
    ['Lần kế tiếp', 'Lao động công ích 5 lượt.'],
    ['Lần sau nữa', 'Lao động công ích 10 lượt.'],
    ['Từ lần tiếp theo', 'Trao đổi trực tiếp với phụ huynh.'],
  ], [32, 68]),

  trong(200),
  tua2('7.2 Sổ lao động công ích'),
  doan('Hệ thống không chỉ nói ra mức kỷ luật rồi thôi — nó theo dõi em đã làm được bao nhiêu lượt.'),
  ...hinh('gv-17-lao-dong-cong-ich', 'Sổ lao động công ích.'),
  ...chuGiai([
    ['1', 'Ô ghi **số lượt em đã làm**. Gõ số rồi bấm **Lưu**.'],
    ['2', 'Bấm **Soạn thư** để báo cho phụ huynh hoặc học sinh.'],
  ]),
  trong(),
  ...hopVaCach('luuY',
    'Số lượt **phải làm** không lưu cố định — nó tính lại từ số lần quên hiện tại. Nên nếu thầy cô miễn buổi cho em sau đó, số lần quên giảm và định mức tự giảm theo. Chỉ **lượt đã làm** là con số thầy cô ghi.'),

  trong(200),
  tua2('7.3 Soạn thư báo phụ huynh'),
  ...hopVaCach('canThan',
    'Hệ thống **không tự gửi thư**. Nó soạn sẵn nội dung rồi mở Outlook — thầy cô đọc lại, sửa nếu cần, và tự bấm Gửi bên Outlook. Thư đi từ hộp thư của chính thầy cô, phụ huynh trả lời là về đúng người.'),
  ...hinh('gv-18-soan-thu', 'Cửa sổ soạn thư.'),
  ...chuGiai([
    ['1', 'Chọn người nhận: **Phụ huynh + học sinh**, hoặc **Chỉ học sinh**.'],
    ['2', 'Địa chỉ người nhận — **suy ra từ MSHS** theo quy tắc của trường, không phải nhập tay.'],
  ]),
  trong(),
  doan('Nội dung thư **sửa được** trước khi gửi. Thư nêu đủ dữ kiện: số lần quên, **từng buổi cụ thể kèm tiết**, mức kỷ luật, số lượt đã làm và còn nợ.'),
  buoc(1, 'Đọc lại nội dung, sửa cho hợp hoàn cảnh từng em.'),
  buoc(2, 'Bấm **Mở Outlook trên web** — nút này chắc chắn mở Outlook.'),
  buoc(3, 'Bấm **Gửi** bên Outlook.'),
  buoc(4, 'Quay lại hệ thống bấm **Đã gửi — ghi vào sổ**.'),
  ...hopVaCach('luuY',
    'Nút **Mở Outlook trên máy** đi qua liên kết thư mặc định của máy nên nó mở **ứng dụng thư mặc định** — máy nào đặt Gmail làm mặc định thì sẽ ra Gmail. Vì vậy nút *trên web* mới là nút chính. Ngoài ra thư tiếng Việt thường dài hơn mức đường liên kết chở được, nên nút *trên máy* sẽ sao chép nội dung để thầy cô dán vào bằng Ctrl+V.'),

  // =========================================================================
  tua1('8. Chia sẻ sách'),
  doan('Phần này **chỉ hiện khi người quản trị đã cấp cho lớp**. Mỗi tuần một em chia sẻ về một cuốn sách đã đọc.'),
  ...hinh('gv-22-chia-se-sach', 'Trang Chia sẻ sách của giáo viên.'),
  ...chuGiai([
    ['1', 'Hai thẻ: **Kết quả chia sẻ** (bài các em đã nộp) và **Xếp lịch & chấm**.'],
    ['2', 'Dải **Sắp chia sẻ sách** — ai tới lượt tuần này và các tuần kế tiếp, kèm tình trạng nộp bài.'],
  ]),

  trong(200),
  tua2('8.1 Xếp lịch'),
  buoc(1, 'Bấm thẻ **Xếp lịch & chấm**.'),
  buoc(2, 'Với mỗi tuần, chọn em phụ trách và đặt **ngày báo cáo**.'),
  buoc(3, 'Tuần ôn thi, thi, nghỉ Tết thì đặt là **tuần nghỉ**; tuần trống còn lại để **dự phòng** cho những lần cần dời lịch.'),
  ...hinh('gv-23-xep-lich-sach', 'Bảng xếp lịch chia sẻ sách.'),
  ...hopVaCach('luuY',
    'Hạn nộp **luôn là ngày báo cáo trừ 3 ngày**, hệ thống tự tính. Thầy cô dời ngày báo cáo thì hạn nộp dời theo, không phải sửa tay.'),

  trong(200),
  tua2('8.2 Chấm bài chia sẻ'),
  ...hinh('gv-24-cham-bai-sach', 'Cửa sổ chấm bài chia sẻ sách.'),
  doan('Cửa sổ hiện đủ tên sách, tóm tắt nội dung, bài học rút ra và liên kết trình chiếu — thầy cô đọc rồi chấm ngay, không phải mở nhiều chỗ.'),

  // =========================================================================
  tua1('9. Giao việc cho cán sự'),
  doan('Thầy cô giao được một phần việc cho học sinh trong lớp — thường là lớp trưởng hoặc cán sự học tập.'),
  ...hinh('gv-21-tro-giang', 'Thẻ Trợ giảng — cấp quyền cho cán sự.'),
  doan('Mỗi quyền cấp riêng, không phải gói chung:'),
  bang(['Quyền', 'Cho phép em làm gì'], [
    ['Xem kế hoạch', 'Đọc kế hoạch của các bạn trong lớp.'],
    ['Xem yêu cầu hỗ trợ', 'Biết bạn nào đang vướng.'],
    ['Nhắn tin', 'Trả lời tin nhắn của các bạn.'],
    ['Theo dõi đăng ký', 'Xem ai chưa đăng ký và mỗi bạn đã quên mấy lần — để đi nhắc.'],
    ['Chấm sao / nhận xét', 'Chỉ nên cấp khi thầy cô thật sự cần.'],
    ['Theo dõi chia sẻ sách', 'Dành cho cán sự thư viện.'],
  ], [34, 66]),
  trong(200),
  ...hopVaCach('luuY',
    'Bạn được giao việc nhắc **không thấy mức kỷ luật** của các bạn khác — chỉ thấy số lần quên và số lần miễn trừ còn lại. Lao động công ích và việc mời phụ huynh là chuyện giữa thầy cô, học sinh và gia đình, không phải thứ để một bạn cùng lớp đọc được.'),

  // =========================================================================
  tua1('10. Phân tích'),
  doan('Thẻ **Phân tích** trả lời những câu hỏi về cả lớp chứ không phải về một em: lớp đăng ký đều hay dồn vào phút chót, môn nào được chọn nhiều nhất, chất lượng bài đang đi lên hay đi xuống.'),
  ...hinh('gv-08-phan-tich', 'Thẻ Phân tích.'),
  ...hopVaCach('meo',
    'Biểu đồ **Thói quen lập kế hoạch** là biểu đồ đáng xem nhất đầu năm: nó cho biết bao nhiêu phần trăm lớp đăng ký đúng hạn. Con số này lên là nếp đang hình thành.'),

  // =========================================================================
  tua1('11. Câu hỏi thường gặp'),
  ...[
    ['Em báo quên mật khẩu, tôi xử lý thế nào?',
     'Thẻ **Theo học sinh** → tích chọn em → **Đặt lại mật khẩu**. Hệ thống sinh mật khẩu tạm, thầy cô đưa trực tiếp cho em và em phải đổi ngay lần đăng nhập đầu.'],
    ['Lớp tôi hôm nay đi hội trại, cả lớp không tự học được.',
     'Thẻ **Chưa đăng ký** → khối **Miễn buổi tự học** → chọn *Cả lớp*, ghi lý do, bấm miễn. Làm sau khi hết ngày cũng được.'],
    ['Tôi lỡ chấm sao nhầm một bài.',
     'Mở lại bài đó và chấm lại. Hệ thống ghi nhận lần chấm mới và gỡ dấu "cần chấm lại".'],
    ['Em đã cập nhật kết quả sau khi bị hệ thống tự chấm 1 sao.',
     'Bài sẽ hiện ở ô **Bổ sung muộn** để thầy cô chấm lại. Điểm tự chấm không phải là điểm cuối cùng.'],
    ['Tôi dạy nhiều lớp thì sao?',
     'Dùng nút đổi lớp trên thanh trên cùng. Mỗi lớp có lịch, mốc học kỳ và số liệu riêng — không lẫn vào nhau.'],
    ['Tôi muốn tắt phần kỷ luật quên đăng ký.',
     'Thẻ **Kỷ luật** → **Cài đặt kỷ luật** → tắt công tắc. Dữ liệu cũ vẫn giữ, chỉ ngừng tính và ngừng hiển thị.'],
    ['Học sinh có thấy được kế hoạch của nhau không?',
     'Không. Mỗi em chỉ thấy dữ liệu của chính mình. Riêng trang **Chia sẻ sách** thì cả lớp xem được — đó là chủ ý.'],
    ['Tôi muốn bấm thử mọi chức năng mà không sợ hỏng.',
     'Xin người quản trị tài khoản của **lớp minh hoạ 8A0**. Mọi học sinh trong lớp đó là người bịa, thầy cô làm gì cũng được.'],
  ].flatMap(([hoi, dap]) => [
    new Paragraph({ spacing: { before: 180, after: 60 }, children: L.chuoi('**' + hoi + '**') }),
    doan(dap),
  ]),
  ]
}

const MUC_LUC = [
  '1. Hệ thống này làm gì cho thầy cô',
  '2. Đăng nhập',
  '3. Màn hình chính',
  '4. Thiết lập đầu năm',
  '5. Việc hằng ngày',
  '6. Việc hằng tuần',
  '7. Kỷ luật quên đăng ký',
  '8. Chia sẻ sách',
  '9. Giao việc cho cán sự',
  '10. Phân tích',
  '11. Câu hỏi thường gặp',
]

xuatHaiLuot('docs/huong-dan/Huong-dan-giao-vien.docx', {
  tieuDeFile: 'Hướng dẫn sử dụng — Giáo viên',
  muc: MUC_LUC,
  bia: trangBia({
    nhan: 'HỆ THỐNG QUẢN LÝ GIỜ TỰ HỌC',
    tua: 'Hướng dẫn dành cho giáo viên',
    phu: 'Thiết lập đầu năm · Việc hằng ngày · Việc hằng tuần',
    truong: 'Trường THCS & THPT Đinh Thiện Lý',
    nam: '2026 – 2027',
  }),
  than,
}).then((bd) => console.log('  Mục lục:', bd ? Object.keys(bd).length + ' mục có số trang' : 'không đo được'))
