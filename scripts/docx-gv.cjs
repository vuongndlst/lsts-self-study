// Tài liệu hướng dẫn DÀNH CHO GIÁO VIÊN.
//
//   node scripts/docx-gv.cjs
//
// Ảnh lấy từ docs/huong-dan/img (chụp bằng: GV_MK=… node scripts/shoot-gv.mjs).
// Toàn bộ tên và số liệu trong ảnh là của lớp minh hoạ 8A0 — người bịa.

const path = require('node:path')
const L = require('./docx-lib.cjs')
const { doan, tua1, tua2, buoc, gach, hopVaCach, bang, bangVaCach, trangBia,
        xuatHaiLuot } = L

const anh = (ten) => path.join('docs/huong-dan/img', ten + '.png')

const than = () => {
  const H = L.taoDemHinh()
  const hinh = (ten, ct, o) => H.hinh(anh(ten), ct, o)
  const hinhKem = (ten, ct, ben, o) => H.hinhKem(anh(ten), ct, ben, o)
  const chuGiai = (ds) => H.chuGiai(ds)

  return [
  // =========================================================================
  tua1('1. Hệ thống này làm gì cho thầy cô'),
  doan('Giờ tự học trước đây là một khoảng thời gian khó nhìn thấy: học sinh ngồi trong lớp, nhưng thầy cô không biết em nào đang làm gì, em nào đang tắc, em nào chỉ ngồi cho hết giờ. Hệ thống này bắt học sinh khai ba thứ, và đưa cả ba lên bàn của thầy cô:'),
  ...hopVaCach('luuY', [
    '**Trước buổi học** — em đăng ký sẽ làm gì, mục tiêu là gì.',
    '**Sau buổi học** — em ghi lại làm được tới đâu, vướng ở đâu.',
    '**Thầy cô** — đọc, chấm sao, nhận xét, và thấy ngay em nào cần giúp.',
  ]),
  doan('Tài liệu này viết theo **thứ tự thao tác**: đầu năm làm gì, hằng ngày làm gì, hằng tuần làm gì. Thầy cô mở ra làm theo được ngay, không cần hiểu hệ thống chạy thế nào.'),
  ...hopVaCach('canThan', [
    '**Từ tháng 10/2026:** học sinh **chỉ bắt buộc đăng ký khi cần dùng thiết bị điện tử**. Không đăng ký mà tự ý dùng, hoặc dùng sai mục đích, là vi phạm — xử lý theo thang ở mục 7.',
    'Kỷ luật **quên đăng ký** đã được **tắt** trên toàn trường — không xoá: số liệu cũ và cài đặt từng lớp vẫn còn, người quản trị bật lại là chạy như trước. Vì vậy thẻ *Chưa đăng ký*, thẻ *Kỷ luật* và ô *Chưa có kế hoạch ngày mai* tạm ẩn.',
  ]),
  ...hopVaCach('meo',
    'Mọi ảnh trong tài liệu này chụp từ **lớp minh hoạ 8A0** — mười học sinh hoàn toàn hư cấu. Thầy cô muốn bấm thử mọi nút mà không sợ hỏng dữ liệu lớp mình thì xin tài khoản lớp này từ người quản trị.'),

  // =========================================================================
  tua1('2. Đăng nhập'),
  ...hinhKem('gv-01-dang-nhap', 'Màn hình đăng nhập, thẻ **Giáo viên**.', [
    buoc(1, 'Mở địa chỉ hệ thống, bấm **Bắt đầu**.'),
    buoc(2, 'Chọn thẻ **Giáo viên** ① — bước này hay bị bỏ sót, vì màn hình mặc định mở thẻ Học sinh.'),
    buoc(3, 'Nhập email trường ② và mật khẩu ③, rồi bấm **Vào trang giáo viên** ④.'),
  ], { rong: 330 }),
  ...hopVaCach('canThan',
    'Lần đầu đăng nhập, hệ thống yêu cầu **đổi mật khẩu tạm**. Mật khẩu mới phải đủ các quy tắc hiện trên màn hình. Nếu thầy cô quên mật khẩu, bấm **Quên mật khẩu?** để nhận thư khôi phục, hoặc báo người quản trị.'),

  // =========================================================================
  tua1('3. Màn hình chính'),
  doan('Vào được rồi, thầy cô thấy ngay **hộp việc cần xử lý** — mỗi ô là một nhóm việc đang chờ.'),
  ...hinh('gv-02-tong-quan', 'Trang giáo viên, phần trên cùng.'),
  ...chuGiai([
    ['1', '**Hộp việc cần xử lý.** Mỗi ô **bấm được** — bấm một cái là danh sách bên dưới lọc ra đúng nhóm đó. Đây là cách nhanh nhất để bắt đầu một buổi làm việc.'],
    ['2', '**Các thẻ chức năng.** Toàn bộ công việc nằm ở đây, tài liệu này đi lần lượt qua từng thẻ.'],
    ['3', '**Xuất CSV** — tải toàn bộ dữ liệu lớp ra Excel để làm báo cáo.'],
  ]),
  doan('Ý nghĩa từng ô trong hộp việc cần xử lý:'),
  ...bangVaCach(['Ô', 'Nghĩa là gì'], [
    ['Chờ duyệt', 'Em xin dùng máy tính/điện thoại, đang chờ thầy cô đồng ý.'],
    ['Cần điều chỉnh', 'Thầy cô đã trả kế hoạch về, em chưa sửa lại.'],
    ['Trễ hạn cập nhật', 'Buổi đã qua 48 giờ mà em chưa ghi kết quả.'],
    ['Chờ chấm sao', 'Em đã ghi kết quả, đang chờ thầy cô chấm.'],
    ['Cần hỗ trợ', 'Em tự bấm nút báo là đang vướng.'],
    ['Hệ thống tự chấm', 'Quá 120 giờ em vẫn không ghi kết quả — hệ thống tự chấm 1 sao.'],
    ['Vi phạm thiết bị chưa xong', 'Số em còn nợ lượt lao động công ích do vi phạm thiết bị, hoặc đã tới lần 4 mà sổ chưa ghi là đã báo phụ huynh (nhãn ghi thêm "… em cần mời PH"). Chỉ hiện khi có.'],
  ], [30, 70]),
  ...hinhKem('gv-25-thong-bao', 'Bảng thông báo. Trong ảnh là lớp minh hoạ nên chưa có thông báo nào.', [
    doan('**Chuông thông báo** — biểu tượng chuông trên thanh trên cùng gom những việc mới: em xin dùng thiết bị, em báo cần hỗ trợ, em nộp bài chia sẻ sách.'),
  ], { rong: 300 }),

  // =========================================================================
  tua1('4. Thiết lập đầu năm'),
  doan('Bốn việc dưới đây làm **một lần** vào đầu năm học. Làm xong thì cả năm không phải đụng lại, trừ khi lớp đổi lịch.'),

  tua2('4.1 Nhập danh sách lớp từ Excel'),
  ...hinhKem('gv-10-nhap-excel', 'Cửa sổ nhập danh sách từ Excel.', [
    buoc(1, 'Vào thẻ **Học sinh**, bấm **Nhập danh sách từ Excel**.'),
    buoc(2, 'Bấm **Tải file mẫu Excel**, điền ba cột **STT**, **MSHS**, **Họ và tên học sinh** — giữ nguyên tên cột ở dòng đầu — rồi chọn file.'),
    buoc(3, 'Hệ thống hiện **bản xem trước**: em nào thêm mới, em nào đã có, dòng nào bị bỏ qua và vì sao. Đọc kỹ bảng này rồi mới bấm nhập.'),
  ], { rong: 290 }),
  ...hopVaCach('luuY', [
    'Nhập danh sách **không tạo tài khoản** cho học sinh. Các em tự tạo tài khoản bằng MSHS của mình — xem tài liệu dành cho học sinh.',
    'Nhập lại lần hai **không nhân đôi** học sinh. Em nào không còn trong danh sách mới thì bị ngưng ghi danh, nhưng **dữ liệu cũ vẫn giữ nguyên**, không mất gì.',
  ]),
  ...hinh('gv-09-danh-sach-lop', 'Thẻ Học sinh sau khi nhập xong: ① nhập danh sách từ Excel, ② xuất danh sách lớp ra CSV.'),

  tua2('4.2 Khai lịch tự học cố định'),
  doan('Đây là **việc quan trọng nhất** trong phần thiết lập: hệ thống dựa vào lịch này để biết ngày nào lớp có tiết tự học — học sinh chỉ chọn được đúng những tiết đó, và giới hạn thiết bị theo thứ cũng dựa vào lịch này. Vào thẻ **Lịch tự học**, bấm chọn các tiết theo từng thứ trong tuần, rồi lưu.'),
  ...hinh('gv-14-lich-tu-hoc', 'Khai lịch tự học cố định của lớp.'),
  ...hopVaCach('canThan',
    'Chưa khai lịch thì hệ thống **không biết ngày nào là ngày tự học**: học sinh được chọn tự do cả 9 tiết, và phần chọn thứ được dùng thiết bị không có gì để chọn.'),

  tua2('4.3 Luật đăng ký của lớp'),
  ...hinh('gv-15-luat-dang-ky', 'Hai công tắc về luật đăng ký.'),
  doan('**Cho phép đăng ký trễ** — bật thì em vẫn đăng ký được sau 24:00 hôm trước, chỉ bị đánh dấu *Trễ*. Tắt thì em không đăng ký được nữa.'),
  doan('**Bắt buộc cập nhật kết quả** — bật thì em còn nợ kết quả quá hạn sẽ **không đăng ký được buổi mới**, cho tới khi ghi xong. Mặc định **tắt**.'),
  ...hopVaCach('meo',
    'Công tắc thứ hai là đòn bẩy mạnh nhất trong hệ thống. Nhưng nên bật sau vài tuần, khi các em đã quen nếp — bật ngay từ đầu năm dễ thành rào cản hơn là động lực.'),

  tua2('4.4 Giới hạn thiết bị (tuỳ chọn)'),
  ...hinhKem('gv-13-gioi-han-thiet-bi', 'Khối Giới hạn dùng thiết bị, trong thẻ **Thiết bị**.', [
    buoc(1, 'Vào thẻ **Thiết bị**, mở khối **Giới hạn dùng thiết bị**.'),
    buoc(2, 'Chọn **số ngày tối đa mỗi tuần** ① một em được dùng thiết bị — hoặc để *Không giới hạn*.'),
    buoc(3, 'Bỏ chọn những **thứ không cho dùng** ② — chỉ hiện những thứ lớp có tiết tự học.'),
    buoc(4, 'Bấm **Lưu giới hạn**.'),
  ], { rong: 300 }),
  ...hopVaCach('luuY', [
    'Mặc định **không giới hạn**. Chỉ đặt khi lớp cần thêm những giờ học không dùng máy — ví dụ 2 hoặc 3 ngày mỗi tuần.',
    'Đếm theo **ngày**: nhiều nhiệm vụ dùng thiết bị trong cùng một ngày chỉ là một ngày. Buổi bị từ chối không tính. Giới hạn áp dụng cho các lần đăng ký từ lúc lưu; buổi đã đăng ký trước đó giữ nguyên.',
    'Học sinh thấy ngay giới hạn khi đăng ký: hết lượt thì công tắc thiết bị tự khoá kèm lý do. Hệ thống chặn ở cả máy chủ, nên em không lách được.',
  ]),

  // =========================================================================
  tua1('5. Việc hằng ngày'),
  doan('Ba việc dưới đây mất chừng năm phút mỗi ngày.'),

  tua2('5.1 Bảng thiết bị trong tuần'),
  doan('Thẻ **Thiết bị** thay chỗ thẻ *Chưa đăng ký* cũ. Bảng tuần cho biết mỗi em đã đăng ký dùng thiết bị mấy ngày, những ngày nào, ai đang bị tạm dừng, đã vi phạm mấy lần, còn nợ bao nhiêu lượt lao động.'),
  ...hinh('gv-12-thiet-bi-tuan', 'Bảng thiết bị theo tuần.'),
  ...chuGiai([
    ['1', 'Chuyển **tuần trước / tuần sau**. Bảng đếm từ thứ Hai tới Chủ nhật.'],
    ['2', 'Dòng tô đỏ: em **đang bị tạm dừng** dùng thiết bị — trỏ chuột vào nhãn để xem lý do.'],
    ['3', 'Nút **Ghi vi phạm** trên dòng của từng em — xem mục 7.'],
  ]),
  ...hopVaCach('meo',
    'Đối chiếu nhanh trong giờ: em nào đang dùng máy mà bảng không có ngày hôm nay, hoặc đang bị tạm dừng, là **không đăng ký mà tự ý dùng**.'),

  tua2('5.2 Học sinh không còn bắt buộc đăng ký'),
  doan('Không dùng thiết bị thì em **không bắt buộc** đăng ký, nên không còn danh sách "chưa đăng ký" để đi nhắc. Các em vẫn đăng ký được để tự lên kế hoạch, và thầy cô vẫn chấm sao, nhận xét như cũ cho mọi nhiệm vụ đã đăng ký.'),

  tua2('5.3 Duyệt kế hoạch dùng thiết bị'),
  doan('Em nào cần dùng máy tính hoặc điện thoại trong giờ tự học thì phải xin trước. Bấm ô **Chờ duyệt** ở hộp việc cần xử lý để lọc ra đúng nhóm này. Khi các em cập nhật kết quả, nhiệm vụ có thiết bị **bắt buộc** kèm ít nhất một minh chứng (ảnh, tệp hoặc liên kết) — thầy cô xem minh chứng ngay trong cửa sổ chi tiết.'),
  ...hinh('gv-04-bang-ke-hoach', 'Bảng kế hoạch — nơi duyệt, chấm sao và xem chi tiết.'),

  // =========================================================================
  tua1('6. Việc hằng tuần'),

  tua2('6.1 Chấm sao từng bài'),
  ...hinhKem('gv-05-cham-sao', 'Cửa sổ chi tiết một nhiệm vụ.', [
    buoc(1, 'Bấm ô **Chờ chấm sao** ở hộp việc cần xử lý.'),
    buoc(2, 'Bấm vào tên môn ở một dòng để mở chi tiết.'),
    buoc(3, 'Đọc phần em ghi, chọn số sao, viết nhận xét nếu cần.'),
    doan('Nhận xét ngắn mà cụ thể có tác dụng hơn nhận xét dài: *"Em ghi rõ sai ở đâu, rất tốt"* dạy được nhiều hơn *"Cố gắng lên"*.'),
  ], { rong: 300 }),

  tua2('6.2 Chấm sao hàng loạt'),
  doan('Khi có hàng chục bài cùng đạt mức tương đương, chấm từng bài mất quá nhiều thời gian.'),
  buoc(1, 'Tích chọn các dòng cần chấm — hoặc bấm **Chọn N chờ chấm sao** để chọn hết một lượt.'),
  buoc(2, 'Thanh thao tác hiện lên ở cuối màn hình; bấm **Chấm sao N tiết** ① để mở cửa sổ chấm.'),
  ...hinh('gv-06-cham-sao-hang-loat', 'Thanh thao tác hàng loạt.'),
  ...hinhKem('gv-06b-cua-so-cham-hang-loat', 'Cửa sổ chấm sao hàng loạt.', [
    buoc(3, 'Chọn số sao cho cả nhóm, viết nhận xét chung nếu muốn, rồi bấm chấm.'),
    doan('Cửa sổ liệt kê **sẽ chấm cho những em nào** trước khi thầy cô bấm — đọc lại danh sách đó rồi mới chấm.'),
    doan('Nếu trong nhóm có tiết đã bị **hệ thống tự chấm 1 sao**, cửa sổ nói rõ số lượng và cảnh báo rằng chấm ở đây sẽ ghi đè lên điểm tự động.'),
  ], { rong: 290 }),
  ...hopVaCach('canThan',
    'Để trống ô **Nhận xét chung** thì nhận xét riêng của từng tiết **được giữ nguyên**. Chỉ khi thầy cô gõ vào ô đó, nhận xét cũ mới bị thay. Nên dùng chấm hàng loạt cho nhóm bài tương đương nhau, còn bài cần nói riêng thì mở lẻ ra chấm.'),

  tua2('6.3 Bộ lọc'),
  doan('Bảng kế hoạch có bộ lọc đầy đủ: theo em, theo môn, theo tiết, theo khoảng ngày, theo tình trạng duyệt, theo số sao.'),
  ...hinh('gv-03-bo-loc', 'Bộ lọc của bảng kế hoạch.'),
  ...hopVaCach('luuY',
    'Hộp việc cần xử lý ở trên **luôn đếm trên toàn bộ dữ liệu**, không theo bộ lọc. Nhờ vậy lọc xong rồi các con số vẫn đúng — bấm một ô lọc rồi thấy mọi ô khác tụt về 0 thì thầy cô sẽ tưởng đã hết việc.'),

  tua2('6.4 Nhìn theo từng học sinh'),
  doan('Thẻ **Theo học sinh** đổi góc nhìn: mỗi dòng là một em, kèm số nhiệm vụ, tỉ lệ đúng hạn, điểm sao trung bình, số việc còn tồn.'),
  ...hinh('gv-07-theo-hoc-sinh', 'Bảng theo từng học sinh.'),

  tua2('6.5 Đặt lại mật khẩu, chuyển lớp, đánh dấu tài khoản thử'),
  doan('Trong thẻ **Học sinh**, mỗi dòng có hai nút ở cuối.'),
  ...hinh('gv-11-thao-tac-tung-em', 'Hai nút thao tác ở cuối mỗi dòng.'),
  ...chuGiai([
    ['1', '**Đánh dấu tài khoản thử nghiệm** — tài khoản giả thầy cô tạo để xem thử giao diện. Đánh dấu rồi thì nó biến khỏi sĩ số, bảng thiết bị và các danh sách đi nhắc.'],
    ['2', '**Chuyển khỏi lớp** — em chuyển lớp hoặc chuyển trường. Tài khoản và toàn bộ lịch sử của em **vẫn được giữ**, đây không phải xoá.'],
  ]),
  doan('Muốn đặt lại mật khẩu cho em quên: vào thẻ **Theo học sinh**, tích chọn em rồi bấm **Đặt lại mật khẩu**. Chọn nhiều em một lúc cũng được.'),

  // =========================================================================
  tua1('7. Vi phạm thiết bị và lao động công ích'),
  doan('Hai loại vi phạm: **không đăng ký mà tự ý dùng** thiết bị, và **dùng sai mục đích** đã đăng ký. Mỗi lần xử lý **riêng**, không cộng dồn — lần 2 là 10 lượt của riêng lần 2, không phải 5 + 10.'),
  ...bangVaCach(['Lần vi phạm', 'Xử lý'], [
    ['Lần 1', 'Cấm dùng thiết bị **1 tuần** + **5 lượt** lao động công ích.'],
    ['Lần 2', 'Cấm **2 tuần** + **10 lượt**.'],
    ['Lần 3', 'Cấm **1 tháng** + **20 lượt**.'],
    ['Từ lần 4', '**Mời phụ huynh**; vẫn cấm 1 tháng + 20 lượt.'],
  ], [26, 74]),
  doan('Số lần đếm trong **năm học** của lớp. Học sinh thấy đúng bảng này trên trang của các em.'),

  tua2('7.1 Ghi vi phạm'),
  ...hinhKem('gv-16-ghi-vi-pham', 'Hộp ghi vi phạm — báo trước đây là lần thứ mấy và em sẽ bị xử lý thế nào.', [
    buoc(1, 'Thẻ **Thiết bị** → bảng tuần → bấm **Ghi vi phạm** trên dòng của em.'),
    buoc(2, 'Chọn loại vi phạm ①, ghi chú thêm nếu cần.'),
    buoc(3, 'Đọc khung báo trước ② rồi bấm **Ghi vi phạm lần N**.'),
    doan('Ghi xong: em bị tạm dừng dùng thiết bị, các buổi thiết bị đã duyệt trong thời gian đó **tự bị huỷ duyệt**, và em nhận thông báo ngay.'),
  ], { rong: 290 }),
  ...hopVaCach('luuY', [
    'Đang bị cấm mà vi phạm tiếp thì lần cấm mới **nối tiếp** sau lần cũ, không chồng lên nhau.',
    'Chỉ **giáo viên chủ nhiệm** ghi được vi phạm. Trợ giảng không ghi được, và không xem được sổ vi phạm của các bạn.',
  ]),

  tua2('7.2 Sổ vi phạm và lao động công ích'),
  ...hinh('gv-17-so-vi-pham', 'Sổ vi phạm: mỗi lần một dòng, lượt lao động tính riêng từng lần.'),
  ...chuGiai([
    ['1', 'Ô ghi **số lượt em đã làm** của lần đó — gõ số rồi bấm **Lưu**.'],
    ['2', 'Từ lần 4: **Soạn thư mời** phụ huynh. Gửi xong thì ghi vào sổ.'],
    ['3', '**Gỡ cấm** — cho em dùng thiết bị lại sớm. Lần vi phạm **vẫn tính**, lượt lao động **vẫn nợ**.'],
    ['4', '**Huỷ (ghi nhầm)** — lần đó **không tính** nữa và không còn nợ lao động. Dòng vẫn giữ, gạch ngang, để còn dấu vết.'],
  ]),

  tua2('7.3 Thư mời phụ huynh'),
  ...hopVaCach('canThan',
    'Hệ thống **không tự gửi thư**. Nó soạn sẵn nội dung rồi mở Outlook — thầy cô đọc lại, sửa nếu cần, và tự bấm Gửi bên Outlook. Thư đi từ hộp thư của chính thầy cô, phụ huynh trả lời là về đúng người.'),
  ...hinhKem('gv-18-thu-moi-phu-huynh', 'Cửa sổ soạn thư mời phụ huynh.', [
    doan('① Người nhận: phụ huynh, cc học sinh — địa chỉ **suy ra từ MSHS** theo quy tắc của trường, không phải nhập tay.'),
    doan('Nội dung thư **sửa được** trước khi gửi, nêu đủ số lần vi phạm, lần gần nhất, thang xử lý và thời gian tạm dừng.'),
    buoc(1, 'Đọc lại, sửa cho hợp hoàn cảnh từng em.'),
    buoc(2, 'Bấm **Mở Outlook trên web** ②, rồi bấm **Gửi** bên Outlook.'),
    buoc(3, 'Quay lại hệ thống bấm **Đã báo phụ huynh — ghi vào sổ**. Đã gọi điện thay vì gửi thư thì bấm **Đã báo cách khác**.'),
  ], { rong: 260 }),

  // =========================================================================
  tua1('8. Chia sẻ sách'),
  doan('Phần này **chỉ hiện khi người quản trị đã cấp cho lớp**. Mỗi tuần một em chia sẻ về một cuốn sách đã đọc.'),
  ...hinhKem('gv-22-chia-se-sach', 'Trang Chia sẻ sách của giáo viên.', [
    ['1', 'Hai thẻ: **Kết quả chia sẻ** (bài các em đã nộp) và **Xếp lịch & chấm**.'],
    ['2', 'Dải **Sắp chia sẻ sách** — ai tới lượt tuần này và các tuần kế tiếp, kèm tình trạng nộp bài.'],
  ], { rong: 330 }),

  tua2('8.1 Xếp lịch'),
  buoc(1, 'Bấm thẻ **Xếp lịch & chấm**.'),
  buoc(2, 'Với mỗi tuần, chọn em phụ trách và đặt **ngày báo cáo**.'),
  buoc(3, 'Tuần ôn thi, thi, nghỉ Tết thì đặt là **tuần nghỉ**; tuần trống còn lại để **dự phòng** cho những lần cần dời lịch.'),
  ...hinh('gv-23-xep-lich-sach', 'Bảng xếp lịch chia sẻ sách.'),
  ...hopVaCach('luuY',
    'Hạn nộp **luôn là ngày báo cáo trừ 3 ngày**, hệ thống tự tính. Thầy cô dời ngày báo cáo thì hạn nộp dời theo, không phải sửa tay.'),

  tua2('8.2 Chấm bài chia sẻ'),
  ...hinhKem('gv-24-cham-bai-sach', 'Cửa sổ chấm bài chia sẻ sách.', [
    doan('Cửa sổ hiện đủ tên sách, tóm tắt nội dung, bài học rút ra và liên kết trình chiếu — thầy cô đọc rồi chấm ngay, không phải mở nhiều chỗ.'),
  ], { rong: 300 }),

  // =========================================================================
  tua1('9. Giao việc cho cán sự'),
  doan('Thầy cô giao được một phần việc cho học sinh trong lớp — thường là lớp trưởng hoặc cán sự học tập. Mỗi quyền cấp riêng, không phải gói chung.'),
  ...hinh('gv-21-tro-giang', 'Thẻ Trợ giảng — cấp quyền cho cán sự.'),
  ...bangVaCach(['Quyền', 'Cho phép em làm gì'], [
    ['Xem kế hoạch', 'Đọc kế hoạch của các bạn trong lớp.'],
    ['Xem yêu cầu hỗ trợ', 'Biết bạn nào đang vướng.'],
    ['Nhắn tin', 'Trả lời tin nhắn của các bạn.'],
    ['Theo dõi đăng ký', 'Chỉ có tác dụng khi kỷ luật quên đăng ký được bật lại.'],
    ['Chấm sao / nhận xét', 'Chỉ nên cấp khi thầy cô thật sự cần.'],
    ['Theo dõi chia sẻ sách', 'Dành cho cán sự thư viện.'],
  ], [34, 66]),
  ...hopVaCach('luuY',
    'Trợ giảng **không ghi được vi phạm** và **không xem được sổ vi phạm** của các bạn khác. Lao động công ích và việc mời phụ huynh là chuyện giữa thầy cô, học sinh và gia đình, không phải thứ để một bạn cùng lớp đọc được.'),

  // =========================================================================
  tua1('10. Phân tích'),
  doan('Thẻ **Phân tích** trả lời những câu hỏi về cả lớp chứ không phải về một em: lớp đăng ký đều hay dồn vào phút chót, môn nào được chọn nhiều nhất, chất lượng bài đang đi lên hay đi xuống.'),
  ...hinh('gv-08-phan-tich', 'Thẻ Phân tích.'),
  ...hopVaCach('meo',
    'Biểu đồ **Thói quen lập kế hoạch** là biểu đồ đáng xem nhất đầu năm: nó cho biết bao nhiêu phần trăm lớp đăng ký đúng hạn. Con số này lên là nếp đang hình thành.'),

  // =========================================================================
  tua1('11. Câu hỏi thường gặp'),
  bang(['Thầy cô hỏi', 'Trả lời'], [
    ['Em báo quên mật khẩu, tôi xử lý thế nào?',
     'Thẻ **Theo học sinh** → tích chọn em → **Đặt lại mật khẩu**. Hệ thống sinh mật khẩu tạm, thầy cô đưa trực tiếp cho em và em phải đổi ngay lần đăng nhập đầu.'],
    ['Tôi ghi vi phạm nhầm em.',
     'Thẻ **Thiết bị** → **Sổ vi phạm** → **Huỷ (ghi nhầm)** trên dòng đó. Lần đó không tính nữa, em nhận thông báo đã huỷ. Các buổi thiết bị đã bị huỷ duyệt thì em đăng ký lại.'],
    ['Em đã biết lỗi, tôi muốn cho em dùng máy lại sớm.',
     'Bấm **Gỡ cấm**. Em dùng thiết bị lại được ngay, nhưng lần vi phạm vẫn tính và lượt lao động vẫn nợ.'],
    ['Tôi lỡ chấm sao nhầm một bài.',
     'Mở lại bài đó và chấm lại. Hệ thống ghi nhận lần chấm mới và gỡ dấu "cần chấm lại".'],
    ['Em đã cập nhật kết quả sau khi bị hệ thống tự chấm 1 sao.',
     'Bài sẽ hiện ở ô **Bổ sung muộn** để thầy cô chấm lại. Điểm tự chấm không phải là điểm cuối cùng.'],
    ['Tôi dạy nhiều lớp thì sao?',
     'Dùng nút đổi lớp trên thanh trên cùng. Mỗi lớp có lịch, mốc học kỳ và số liệu riêng — không lẫn vào nhau.'],
    ['Kỷ luật quên đăng ký cũ đi đâu rồi?',
     'Đã **tắt** trên toàn trường từ 10/2026, không xoá. Số lần quên cũ và cài đặt từng lớp vẫn còn; người quản trị bật lại là các thẻ *Chưa đăng ký*, *Kỷ luật* hiện lại như trước.'],
    ['Học sinh có thấy được kế hoạch của nhau không?',
     'Không. Mỗi em chỉ thấy dữ liệu của chính mình. Riêng trang **Chia sẻ sách** thì cả lớp xem được — đó là chủ ý.'],
    ['Tôi muốn bấm thử mọi chức năng mà không sợ hỏng.',
     'Xin người quản trị tài khoản của **lớp minh hoạ 8A0**. Mọi học sinh trong lớp đó là người bịa, thầy cô làm gì cũng được.'],
  ], [36, 64]),
  ]
}

const MUC_LUC = [
  '1. Hệ thống này làm gì cho thầy cô',
  '2. Đăng nhập',
  '3. Màn hình chính',
  '4. Thiết lập đầu năm',
  '5. Việc hằng ngày',
  '6. Việc hằng tuần',
  '7. Vi phạm thiết bị và lao động công ích',
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
