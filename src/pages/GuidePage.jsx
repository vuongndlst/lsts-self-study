import { useState } from 'react'
import { AlertTriangle, CalendarCheck2, CheckCircle2, ClipboardList, Clock, FileCheck2, GraduationCap, ImagePlus, KeyRound, Laptop, Layers, ListPlus, Lock, LockKeyhole, Mail, MessageSquare, ShieldCheck, Star, UploadCloud, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HuongDanTaiLieu from '../components/HuongDanTaiLieu'
import { DeviceRuleTable } from '../components/DeviceRules'

// Một trang cho cả hai bộ hướng dẫn.
//
// Ai thấy gì:
//   · khách chưa đăng nhập và học sinh → chỉ phần học sinh;
//   · giáo viên (và quản trị) → thêm thẻ để xem phần giáo viên, và vẫn xem
//     được phần học sinh, vì thầy cô hay phải chỉ lại cho các em.
//
// Chọn thẻ chứ không tách thành hai địa chỉ: tách ra thì giáo viên mới sẽ phải
// được cho biết là có địa chỉ thứ hai.
export default function GuidePage() {
  const { isStaff, session } = useAuth()
  const [chon, setChon] = useState('hocSinh')

  // SUY RA chứ không đặt bằng useEffect. Thầy cô đang mở thẻ Giáo viên rồi đăng
  // xuất thì trang tự rơi về phần học sinh ngay, không cần thêm hiệu ứng nào —
  // mà cũng không có kẽ hở một nhịp nào để phần giáo viên còn nằm trên màn hình.
  const vai = isStaff ? chon : 'hocSinh'

  return <div className="page narrow-page guide-page">
    <section className="page-heading centered-heading">
      <span className="pill-label">HƯỚNG DẪN SỬ DỤNG</span>
      <h1>{vai === 'hocSinh' ? 'Những điều em cần biết' : 'Hướng dẫn dành cho giáo viên'}</h1>
      <p>{vai === 'hocSinh'
        ? 'Đọc một lần trước khi bắt đầu. Sau đó mỗi tuần chỉ cần khoảng một phút để lập kế hoạch, và vài phút sau giờ tự học để ghi lại kết quả.'
        : 'Thiết lập một lần vào đầu năm, rồi mỗi ngày khoảng năm phút. Video và tài liệu dưới đây đi theo đúng thứ tự thao tác.'}</p>

      {isStaff && <div className="segmented guide-chon">
        <button type="button" className={vai === 'hocSinh' ? 'active' : ''}
                onClick={() => setChon('hocSinh')}><GraduationCap size={17} /> Học sinh</button>
        <button type="button" className={vai === 'giaoVien' ? 'active' : ''}
                onClick={() => setChon('giaoVien')}><ShieldCheck size={17} /> Giáo viên</button>
      </div>}

      {vai === 'hocSinh' && <div className="hero-actions centered-actions">
        <Link className="button primary" to="/register">Tạo tài khoản lần đầu</Link>
        <Link className="button ghost" to="/login">Đăng nhập</Link>
      </div>}
    </section>

    {vai === 'giaoVien' ? <PhanGiaoVien /> : <PhanHocSinh moiGiaoVien={!session} />}
  </div>
}

function PhanHocSinh({ moiGiaoVien }) {
  return <>
    <HuongDanTaiLieu bo="hocSinh" />

    {/* Không có dòng này thì giáo viên vào trang chỉ thấy phần học sinh và
        tưởng hệ thống không có tài liệu cho mình. Chỉ hiện với KHÁCH chưa đăng
        nhập — học sinh đã đăng nhập rồi mà vẫn bị mời đăng nhập thì vô duyên. */}
    {moiGiaoVien && <p className="guide-doi-vai">
      <ShieldCheck size={16} />
      <span>Thầy cô <Link to="/login">đăng nhập</Link> để xem phần hướng dẫn dành cho giáo viên.</span>
    </p>}

    {/* Luật từ 10/2026 — đặt lên đầu vì nó đổi hẳn câu hỏi "có phải đăng ký
        không". Bảng thang xử lý là đúng bảng em thấy trên trang của mình. */}
    <section className="card deadline-card">
      <div className="deadline-head"><Laptop size={22}/><div>
        <span className="eyebrow">THIẾT BỊ ĐIỆN TỬ</span>
        <h2>Chỉ bắt buộc đăng ký khi em cần dùng thiết bị</h2>
      </div></div>
      <div className="timeline-rule">
        <div><span className="step-dot ok">1</span><div>
          <strong>Không dùng thiết bị → không bắt buộc đăng ký</strong>
          <small>Em vẫn đăng ký được nếu muốn tự lên kế hoạch và nhìn lại kết quả — rất nên làm, nhưng không ai bắt.</small>
        </div></div>
        <div><span className="step-dot warn">2</span><div>
          <strong>Cần dùng thiết bị → bắt buộc đăng ký trước</strong>
          <small>Bật <em>Dùng thiết bị điện tử</em>, ghi rõ mục đích và chờ thầy cô duyệt. Không đăng ký mà tự ý dùng, hoặc dùng sai mục đích đã đăng ký, là <strong>vi phạm</strong>.</small>
        </div></div>
        <div><span className="step-dot warn">3</span><div>
          <strong>Mỗi tuần có giới hạn</strong>
          <small>Thầy cô có thể giới hạn số ngày được dùng thiết bị mỗi tuần, hoặc chỉ cho dùng vào một số thứ. Thẻ <em>Thiết bị điện tử · tuần này</em> trên trang của em cho biết em đã dùng mấy ngày; hết lượt thì công tắc tự khoá và ghi rõ lý do.</small>
        </div></div>
        <div><span className="step-dot danger">4</span><div>
          <strong>Được duyệt dùng thiết bị thì phải có minh chứng kết quả</strong>
          <small>Khi cập nhật kết quả, nhiệm vụ được duyệt thiết bị cần <strong>ít nhất một</strong> ảnh, tệp PDF hoặc liên kết sản phẩm. Không dùng thiết bị thì chỉ cần ghi kết quả. Kế hoạch <strong>bị từ chối</strong> thì không cần nộp kết quả.</small>
        </div></div>
      </div>
      <DeviceRuleTable />
      <div className="guide-tip"><AlertTriangle size={16}/><span>
        Trong thời gian bị tạm dừng, em <strong>vẫn tự học bình thường</strong> — chỉ không đăng ký dùng thiết bị được.
        Những buổi thiết bị đã được duyệt rơi vào thời gian đó sẽ tự bị huỷ duyệt. Thấy bị ghi nhầm thì nhắn thầy cô.
      </span></div>
    </section>

    <section className="card deadline-card">
      <div className="deadline-head"><Lock size={22}/><div>
        <span className="eyebrow">HẠN ĐĂNG KÝ</span>
        <h2>Đăng ký trước khi hết ngày hôm trước</h2>
      </div></div>
      <p>Muốn tự học ngày mai — nhất là khi cần thiết bị — em đăng ký <strong>chậm nhất trong tối nay</strong>. Mốc chốt là
         <strong> 24:00 của ngày hôm trước</strong> (0:00 của ngày tự học). Đăng ký sau đó sẽ được tính là <em>Trễ</em>.</p>
      <div className="guide-tip"><AlertTriangle size={16}/><span>
        Giáo viên có thể <strong>khóa đăng ký trễ</strong>. Khi đó, sau 24:00 em không thể đăng ký
        cho ngày vừa bắt đầu; ô chọn ngày sẽ bắt đầu từ ngày mai. Đây là quy định của lớp.
      </span></div>
    </section>

    {/* Phần quan trọng nhất đặt lên đầu: hạn cập nhật kết quả. */}
    <section className="card deadline-card">
      <div className="deadline-head"><Clock size={22} /><div>
        <span className="eyebrow">QUY TẮC QUAN TRỌNG NHẤT</span>
        <h2>Cập nhật kết quả ngay khi em làm xong</h2>
      </div></div>
      <p>Đăng ký kế hoạch mới là một nửa. Nửa còn lại là quay lại ghi xem em đã làm được đến đâu — đó mới là phần giúp em nhìn ra mình đang tiến bộ thế nào.</p>

      <div className="timeline-rule">
        <div><span className="step-dot ok">1</span><div>
          <strong>Từ khi tiết tự học bắt đầu</strong>
          <small>Nếu hoàn thành sớm, kể cả mới học khoảng 20 phút, em có thể cập nhật ngay. Không cần chờ hết tiết.</small>
        </div></div>
        <div><span className="step-dot warn">2</span><div>
          <strong>Sau 2 ngày mà chưa cập nhật</strong>
          <small>Thời gian được tính từ lúc tiết học kết thúc. Tiết đó chuyển sang <em>Trễ hạn cập nhật</em> và em nhận thêm thông báo.</small>
        </div></div>
        <div><span className="step-dot danger">3</span><div>
          <strong>Sau 5 ngày mà vẫn chưa cập nhật</strong>
          <small>Hệ thống tự ghi nhận <strong>1 sao</strong> cho tiết đó kèm một lời nhắc.</small>
        </div></div>
      </div>

      <div className="notice"><CheckCircle2 size={18} /><span>
        Bị tự đánh giá <strong>không phải là kết thúc</strong>. Em vẫn cập nhật bổ sung được bất cứ lúc nào — hệ thống sẽ báo cho thầy cô xem lại và chấm lại.
      </span></div>

      <p className="muted-text small">
        Thời hạn được tính từ <strong>lúc kết thúc buổi tự học</strong>, không phải lúc em đăng ký.
        Nên em đăng ký trước cả tuần cũng hoàn toàn không sao.
      </p>
    </section>

    <div className="guide-list modern-guide">
      <article className="guide-step"><span className="step-number">1</span><div>
        <h3><UserPlus size={20}/> Tạo tài khoản một lần</h3>
        <p>Nhập <strong>đúng họ và tên có dấu</strong> và <strong>đúng MSHS 7 chữ số</strong> theo danh sách lớp. Sau đó tự đặt mật khẩu riêng.</p>
        <div className="guide-tip"><LockKeyhole size={16}/> Mỗi MSHS chỉ tạo được một tài khoản. Tài khoản gắn với email trường của em.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">2</span><div>
        <h3><KeyRound size={20}/> Ghi nhớ mật khẩu</h3>
        <p>Mật khẩu cần tối thiểu <strong>10 ký tự</strong>, có chữ hoa, chữ thường và số; không có khoảng trắng và không chứa MSHS.</p>
        <div className="guide-tip">Quên mật khẩu thì báo giáo viên để nhận mật khẩu tạm. Ngay lần đăng nhập kế tiếp, em sẽ được yêu cầu tự đặt lại mật khẩu riêng.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">3</span><div>
        <h3><CalendarCheck2 size={20}/> Đăng ký một <em>buổi</em>, trong buổi có thể có nhiều nhiệm vụ</h3>
        <p>Bấm <strong>Đăng ký giờ tự học</strong> rồi làm theo 3 bước: chọn <strong>ngày</strong> → chọn <strong>tiết</strong> → ghi <strong>nhiệm vụ</strong>.
           Màn hình mặc định chỉ hiện <strong>một nhiệm vụ</strong>. Nếu buổi đó em định làm nhiều việc, bấm
           <strong> “+ Thêm nhiệm vụ”</strong> để thêm khối thứ hai, thứ ba… Mỗi nhiệm vụ có môn, nội dung và mục tiêu riêng,
           và sau này được chấm sao riêng.</p>
        <div className="guide-tip"><ListPlus size={16}/> Ở bước chọn tiết, hệ thống chỉ mở <strong>những tiết lớp mình thực sự
          được phân giờ tự học</strong> theo thời khóa biểu. Thứ nào lớp không có giờ tự học thì không chọn được — như vậy là đúng, không phải lỗi.</div>
        <div className="guide-tip"><Layers size={16}/><span>
          Nếu lớp có <strong>hai tiết tự học liền nhau</strong> và em có nhiệm vụ lớn, tick ô
          <strong> “Làm suốt 2 tiết”</strong>. Nhiệm vụ đó tính cho cả hai tiết — em chỉ ghi một lần và
          cập nhật kết quả một lần. Ô này chỉ hiện khi tiết liền sau cũng là giờ tự học của lớp mình.
        </span></div>
        <div className="guide-tip">Nếu buổi đó em đã đăng ký rồi, nhiệm vụ mới sẽ được <strong>thêm vào buổi đang có</strong> chứ không tạo buổi trùng.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">4</span><div>
        <h3><CheckCircle2 size={20}/> Duyệt: chỉ nhiệm vụ có dùng thiết bị mới cần chờ</h3>
        <p>Nhiệm vụ <strong>không dùng thiết bị điện tử</strong> ghi <em>Không cần duyệt</em> và có hiệu lực ngay — em cứ thế mà học.</p>
        <p>Nhiệm vụ <strong>có dùng thiết bị</strong> thì ở trạng thái <strong>Chờ duyệt</strong> cho tới khi thầy cô xem. Khi thầy cô
           duyệt thiết bị thì nhiệm vụ cũng chuyển sang <strong>Đã duyệt</strong> ngay trong cùng một lần — em không phải chờ hai lượt.</p>
        <div className="guide-tip"><Laptop size={16}/> Nhớ ghi <strong>rõ mục đích</strong> dùng thiết bị. “Tra tài liệu” chung chung
          thường bị trả về; “Mở đề bài tập Toán trên Canvas” thì được duyệt nhanh. Dùng đúng mục đích đã ghi —
          làm việc khác trên máy là vi phạm.</div>
        <div className="guide-tip">Công tắc thiết bị <strong>bị khoá kèm lý do</strong> khi em đang bị tạm dừng, chọn thứ lớp không cho dùng,
          hoặc đã dùng đủ số ngày của tuần. Nhiều nhiệm vụ dùng thiết bị trong cùng một ngày chỉ tính là một ngày.</div>
        <div className="guide-tip">Nếu bị <strong>Cần điều chỉnh</strong>, em sửa lại ngay trong thẻ kế hoạch — nó tự quay về hàng chờ duyệt,
          không cần đăng ký lại từ đầu.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">5</span><div>
        <h3><UploadCloud size={20}/> Cập nhật kết quả — nút to màu xanh</h3>
        <p>Những nhiệm vụ em chưa ghi kết quả được gom lên đầu trang ở mục
           <strong> “Cần cập nhật kết quả”</strong>, thẻ có viền cam và dòng nhiệm vụ có vạch cam bên trái —
           em không thể bỏ sót. Mỗi nhiệm vụ như vậy có một nút lớn
           <strong> “Cập nhật kết quả”</strong> ngay bên dưới. Bấm vào đó, chọn Hoàn thành / Một phần / Chưa hoàn thành,
	           ghi vài dòng em đã làm được gì, và bật <em>“Em cần giáo viên hỗ trợ”</em> nếu còn vướng.
	           Nhiệm vụ <strong>được duyệt dùng thiết bị</strong> bắt buộc kèm ít nhất một minh chứng; kế hoạch bị từ chối thì không cần nộp kết quả; các nhiệm vụ khác thì minh chứng được khuyến khích nhưng không bắt buộc.</p>
        <div className="guide-tip"><ListPlus size={16}/><span>
          Ở mục <strong>“Nhiệm vụ của em”</strong> bên dưới, em lọc nhanh bằng các nút
          <em> Tất cả · Sắp tới · Chưa có kết quả · Đã xong · Cần viết phản hồi</em>, tìm theo môn hoặc nội dung,
          đổi thứ tự sắp xếp, và chuyển trang khi danh sách dài.
        </span></div>
        <div className="guide-tip"><FileCheck2 size={16}/><span>
          <strong>Minh chứng nộp kiểu nào cũng được</strong> (tối đa 3 mục mỗi nhiệm vụ):
          <ul className="tip-list">
            <li><strong>Mô tả bằng chữ</strong> — làm bài trong vở thì chỉ cần tả lại em đã làm gì.</li>
            <li><strong>Ảnh hoặc file</strong> — JPG, PNG, WebP (tối đa 12 MB, tự thu nhỏ) hoặc PDF (tối đa 5 MB).</li>
            <li><strong>Liên kết</strong> — Canva, Google Docs, Padlet…</li>
          </ul>
          Không dùng thiết bị mà không có sản phẩm số cũng không sao — phần mô tả bằng chữ là đủ. Có dùng thiết bị thì
          phải có ảnh, tệp hoặc liên kết; minh chứng cuối cùng của nhiệm vụ đó không xoá được (thêm cái mới trước rồi mới xoá cái cũ).
        </span></div>
      </div></article>

      <article className="guide-step"><span className="step-number">6</span><div>
        <h3><Star size={20}/> Xem đánh giá và nhận xét</h3>
        <p>Thầy cô chấm <strong>1–5 sao</strong> và viết nhận xét cho từng nhiệm vụ.</p>
        <div className="guide-tip"><AlertTriangle size={16}/> Nhiệm vụ bị <strong>1 hoặc 2 sao</strong> sẽ có viền đỏ/vàng, và em cần viết một dòng cho biết sẽ điều chỉnh thế nào ở lần sau. Đây không phải hình phạt — chỉ là cách để em dừng lại một chút và nghĩ về cách làm khác.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">7</span><div>
        <h3><ImagePlus size={20}/> Ảnh đại diện (tùy chọn)</h3>
        <p>Bấm vào vòng tròn tên viết tắt ở góc trên trang <strong>Kế hoạch của em</strong> để đổi ảnh. Ảnh được cắt vuông và thu nhỏ tự động.</p>
        <div className="guide-tip"><LockKeyhole size={16}/> Ảnh này <strong>không công khai</strong>. Chỉ giáo viên và trợ giảng lớp em nhìn thấy. Em có thể bỏ ảnh bất cứ lúc nào.</div>
      </div></article>
    </div>

    <section className="guide-rules card">
      <h2>Trước · Trong · Sau giờ tự học</h2>
      <div className="three-rule-grid">
        <div><span>TRƯỚC</span><strong>Lên kế hoạch</strong><p>Chọn ngày và tiết, ghi một hoặc nhiều nhiệm vụ. Cần thiết bị thì <strong>bắt buộc</strong> đăng ký và gửi sớm để được duyệt.</p></div>
        <div><span>TRONG</span><strong>Học theo kế hoạch</strong><p>Ổn định đúng giờ và tập trung vào mục tiêu đã đặt.</p></div>
        <div><span>SAU</span><strong>Nhìn lại</strong><p>Bấm <em>Cập nhật kết quả</em>, ghi ngắn gọn em đã làm được gì và điều còn vướng. Có dùng thiết bị thì kèm ảnh, file hoặc link làm minh chứng.</p></div>
      </div>
    </section>

    <section className="card privacy-card">
      <h2><MessageSquare size={20}/> Ai nhìn thấy gì</h2>
      <p className="muted-text">Em nên biết rõ điều này trước khi viết phần phản tư.</p>
      <ul className="privacy-list">
        <li><strong>Giáo viên chủ nhiệm lớp em</strong> đọc được toàn bộ kế hoạch, phản tư, minh chứng và tin nhắn của em.</li>
        <li><strong>Bạn cùng lớp</strong> không đọc được gì của em — kể cả kế hoạch và ảnh đại diện.</li>
        <li><strong>Trợ giảng</strong> là bạn được thầy cô cử ra để hỗ trợ. Mặc định các bạn ấy chỉ thấy kế hoạch và danh sách ai đang cần giúp — <strong>không</strong> đọc được phần phản tư riêng hay minh chứng của em, trừ khi thầy cô mở thêm quyền.</li>
        <li>Tin nhắn em gửi nằm trong <strong>một luồng chung với thầy cô</strong>, không phải tin nhắn riêng tư tuyệt đối.</li>
      </ul>
      <div className="guide-tip">Nếu có điều gì em chỉ muốn nói riêng với thầy cô, hãy gặp trực tiếp thay vì ghi vào phần phản tư.</div>
    </section>

    <div className="notice warning"><AlertTriangle/><div>
      <strong>Lưu ý quan trọng</strong>
      <p>Không dùng tên, MSHS hoặc tài khoản của bạn khác. Không tạo tài khoản lần hai. Kế hoạch và kết quả là của riêng em — hãy ghi trung thực, vì mục đích là để em nhìn thấy sự tiến bộ của chính mình, không phải để lấy điểm.</p>
    </div></div>
  </>
}

// Bản giáo viên: phần chữ chỉ nêu những điều dễ làm sai. Chi tiết từng bước đã
// nằm trong video và tài liệu PDF ở trên; chép lại ra HTML nữa là ba chỗ cùng
// một nội dung, sửa một chỗ quên hai chỗ.
function PhanGiaoVien() {
  return <>
    <HuongDanTaiLieu bo="giaoVien" />

    <section className="card deadline-card">
      <div className="deadline-head"><ClipboardList size={22} /><div>
        <span className="eyebrow">LÀM MỘT LẦN ĐẦU NĂM</span>
        <h2>Bốn việc thiết lập, xong là cả năm không phải đụng lại</h2>
      </div></div>
      <div className="timeline-rule">
        <div><span className="step-dot ok">1</span><div>
          <strong>Nhập danh sách lớp từ Excel</strong>
          <small>Ba cột: STT · MSHS · Họ và tên học sinh. Nhập danh sách <strong>không</strong> tạo tài khoản — các em tự tạo bằng MSHS của mình.</small>
        </div></div>
        <div><span className="step-dot ok">2</span><div>
          <strong>Khai lịch tự học cố định</strong>
          <small>Việc quan trọng nhất. Chưa khai lịch thì học sinh không chọn được tiết, và giới hạn thiết bị theo thứ cũng dựa vào lịch này.</small>
        </div></div>
        <div><span className="step-dot warn">3</span><div>
          <strong>Hai công tắc luật đăng ký</strong>
          <small><em>Cho phép đăng ký trễ</em> và <em>Bắt buộc cập nhật kết quả</em>. Công tắc thứ hai mạnh nhất, nhưng nên bật sau vài tuần khi các em đã quen nếp.</small>
        </div></div>
        <div><span className="step-dot ok">4</span><div>
          <strong>Giới hạn thiết bị (tuỳ chọn)</strong>
          <small>Thẻ <em>Thiết bị</em>: số ngày tối đa mỗi tuần và những thứ được dùng. Mặc định <strong>không giới hạn</strong> — chỉ đặt khi lớp cần thêm những giờ học không dùng máy.</small>
        </div></div>
      </div>
    </section>

    <div className="guide-list modern-guide">
      <article className="guide-step"><span className="step-number">1</span><div>
        <h3><CheckCircle2 size={20} /> Hộp việc cần xử lý là chỗ bắt đầu mỗi ngày</h3>
        <p>Mỗi ô trong hộp <strong>bấm được</strong> — bấm một cái là danh sách bên dưới lọc ra đúng nhóm đó.</p>
        <div className="guide-tip"><AlertTriangle size={16} /><span>
          Các con số trong hộp <strong>luôn đếm trên toàn bộ dữ liệu</strong>, không theo bộ lọc đang bật.
          Nhờ vậy lọc xong rồi số vẫn đúng — nếu chúng tụt về 0 theo bộ lọc thì thầy cô sẽ tưởng đã hết việc.
        </span></div>
      </div></article>

      <article className="guide-step"><span className="step-number">2</span><div>
        <h3><Laptop size={20} /> Đăng ký chỉ còn bắt buộc khi dùng thiết bị</h3>
        <p>Từ 10/2026, học sinh <strong>không dùng thiết bị thì không bắt buộc đăng ký</strong>. Kỷ luật “quên đăng ký” đã được
           <strong> tắt</strong> trên toàn trường — không xoá: số liệu cũ, cài đặt từng lớp vẫn còn nguyên, người quản trị bật lại là chạy như trước.
           Vì vậy thẻ <em>Chưa đăng ký</em>, <em>Kỷ luật</em> và ô <em>Chưa có kế hoạch ngày mai</em> tạm ẩn.</p>
        <div className="guide-tip"><Laptop size={16} /> Thẻ <strong>Thiết bị</strong> thay chỗ thẻ <em>Chưa đăng ký</em>: bảng tuần cho biết
          mỗi em đã đăng ký dùng thiết bị mấy ngày, ai đang bị tạm dừng, đã vi phạm mấy lần, còn nợ bao nhiêu lượt lao động.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">3</span><div>
        <h3><Star size={20} /> Chấm sao hàng loạt</h3>
        <p>Tích chọn nhiều dòng rồi chấm một lượt. Cửa sổ liệt kê rõ <strong>sẽ chấm cho những em nào</strong> trước khi thầy cô bấm.</p>
        <div className="guide-tip"><AlertTriangle size={16} /> Để trống ô <strong>Nhận xét chung</strong> thì nhận xét riêng của từng tiết <strong>được giữ nguyên</strong>. Chỉ khi thầy cô gõ vào ô đó, nhận xét cũ mới bị thay.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">4</span><div>
        <h3><Mail size={20} /> Thư mời phụ huynh</h3>
        <p>Hệ thống <strong>không tự gửi thư</strong>. Nó soạn sẵn nội dung rồi mở Outlook — thầy cô đọc lại, sửa nếu cần, và tự bấm Gửi bên đó. Thư đi từ hộp thư của chính thầy cô nên phụ huynh trả lời là về đúng người.</p>
        <div className="guide-tip"><Mail size={16} /><span>
          Dùng nút <strong>Mở Outlook trên web</strong>. Nút <em>trên máy</em> đi qua liên kết thư mặc định
          của máy, nên máy nào đặt Gmail làm mặc định thì sẽ ra Gmail — đúng thứ không muốn.
        </span></div>
        <div className="guide-tip">Từ <strong>lần vi phạm thứ 4</strong>, sổ vi phạm hiện nút <em>Soạn thư mời</em>. Gửi xong (hoặc đã gọi điện) thì bấm
          <em> Đã báo phụ huynh — ghi vào sổ</em>; chưa ghi thì hộp việc cần xử lý còn nhắc.</div>
        <div className="guide-tip">Địa chỉ phụ huynh <strong>suy ra từ MSHS</strong> theo quy tắc của trường: không phải nhập tay, và không lưu ở đâu cả.</div>
      </div></article>

      <article className="guide-step"><span className="step-number">5</span><div>
        <h3><Layers size={20} /> Ghi vi phạm thiết bị</h3>
        <p>Ở thẻ <strong>Thiết bị</strong>, bấm <em>Ghi vi phạm</em> trên dòng của em, chọn loại — <em>không đăng ký mà tự ý dùng</em>
           hoặc <em>dùng sai mục đích</em>. Hộp xác nhận nói trước đây là lần thứ mấy và em sẽ bị xử lý thế nào.</p>
        <DeviceRuleTable />
        <div className="guide-tip">Ghi xong là: em bị tạm dừng dùng thiết bị, các buổi thiết bị đã duyệt trong thời gian đó tự bị huỷ duyệt,
          em nhận thông báo. Đang bị cấm mà vi phạm tiếp thì lần cấm mới <strong>nối tiếp</strong> sau lần cũ.</div>
        <div className="guide-tip"><AlertTriangle size={16} /><span>
          <strong>Gỡ cấm</strong> (cho dùng lại sớm) thì lần vi phạm vẫn tính và lượt lao động vẫn nợ. Chỉ <strong>Huỷ (ghi nhầm)</strong> mới làm lần đó
          không tính. Lượt lao động đã làm ghi ở <em>Sổ vi phạm &amp; lao động công ích</em>, mỗi lần một dòng riêng.
        </span></div>
      </div></article>

      <article className="guide-step"><span className="step-number">6</span><div>
        <h3><UserPlus size={20} /> Giao việc cho cán sự</h3>
        <p>Mỗi quyền cấp riêng, không phải gói chung: xem kế hoạch, xem yêu cầu hỗ trợ, nhắn tin, theo dõi đăng ký, chấm sao, theo dõi chia sẻ sách.</p>
        <div className="guide-tip"><LockKeyhole size={16} /> Trợ giảng <strong>không ghi được vi phạm</strong> và không xem được sổ vi phạm thiết bị của các bạn khác — đó là việc giữa thầy cô, học sinh và gia đình.</div>
      </div></article>
    </div>

    <section className="card privacy-card">
      <h2><ClipboardList size={20} /> Muốn bấm thử mà không sợ hỏng</h2>
      <p className="muted-text">Mọi màn hình trong video và tài liệu đều chụp từ <strong>lớp minh hoạ 8A0</strong> — mười học sinh hoàn toàn hư cấu, không có một chữ nào của học sinh thật.</p>
      <p className="muted-text">Thầy cô muốn bấm thử mọi nút mà không sợ hỏng dữ liệu lớp mình thì xin tài khoản lớp này từ người quản trị.</p>
    </section>
  </>
}
