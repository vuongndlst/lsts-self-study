import { useEffect, useState } from 'react'
import { Copy, ExternalLink, HeartHandshake, Mail } from 'lucide-react'
import { parentEmail, studentEmail, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/date'
import { mailtoQuaDai, mailtoUrl, outlookWebUrl, thuHocSinh, thuPhuHuynh } from '../utils/disciplineLetter'
import Collapsible from './Collapsible'

// ---------------------------------------------------------------------------
//  LAO ĐỘNG CÔNG ÍCH — sổ theo dõi + thư báo
// ---------------------------------------------------------------------------
// Hệ thống trước đây chỉ NÓI ra mức kỷ luật rồi thôi: "5 lượt lao động công ích".
// Nói xong không ai biết em đã làm được mấy lượt, còn nợ mấy lượt, phụ huynh đã
// được báo chưa — thầy cô phải nhớ trong đầu hoặc ghi ra giấy.
export default function LaborBoard({ classId, className }) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [freePasses, setFreePasses] = useState(3)
  const [nhap, setNhap] = useState({})   // mshs -> số lượt đang gõ
  const [luu, setLuu] = useState(null)
  const [thu, setThu] = useState(null)   // { r, nguoiNhan }
  const [msg, setMsg] = useState('')
  const [loi, setLoi] = useState('')

  const load = async () => {
    if (!classId) return
    const [{ data: b, error }, { data: pol }] = await Promise.all([
      supabase.rpc('class_discipline_board', { p_class: classId }),
      supabase.rpc('get_attendance_policy', { p_class: classId }),
    ])
    // Gọi hỏng thì PHẢI nói là hỏng. Nếu cứ setRows([]) rồi hiện "chưa em nào
    // vượt quá quyền miễn trừ" thì thầy cô đọc xong yên tâm là lớp không có ai
    // bị kỷ luật — trong khi sự thật chỉ là dữ liệu chưa tải được.
    setLoi(error ? error.message : '')
    setRows(b ?? [])
    setFreePasses(pol?.free_passes ?? 3)
    setNhap(Object.fromEntries((b ?? []).map((r) => [r.mshs, String(r.luot_da_lam)])))
  }
  useEffect(() => { load() }, [classId])

  const ghiLuot = async (r) => {
    const n = Number(nhap[r.mshs])
    if (!Number.isInteger(n) || n < 0) return setMsg('Số lượt phải là số nguyên không âm.')
    setLuu(r.mshs)
    const { error } = await supabase.rpc('set_labor_done',
      { p_class: classId, p_mshs: r.mshs, p_done: n })
    setLuu(null)
    if (error) return setMsg('Không ghi được: ' + error.message)
    setMsg(`✓ ${r.full_name}: đã làm ${n}/${r.luot_phai_lam} lượt.`)
    load()
  }

  const conNo = rows.filter((r) => r.con_no > 0)
  const chuaBaoPh = rows.filter((r) => r.bac >= 3 && !r.da_bao_ph)

  return <>
    <Collapsible storageKey="lao-dong-cong-ich" defaultOpen wrapper="section-block"
      icon={<HeartHandshake size={19} />} title={`Lao động công ích — lớp ${className}`}
      badge={conNo.length > 0 ? <span className="badge warning">{conNo.length} em còn nợ</span> : null}
      subtitle="Ghi số lượt em đã thực hiện, và soạn sẵn thư báo phụ huynh / học sinh.">

      {msg && <div className={msg.startsWith('✓') ? 'notice' : 'form-error'}>{msg}</div>}

      {loi
        ? <div className="form-error">
            Không tải được sổ lao động công ích, nên bảng dưới đây <strong>không phản ánh
            tình hình thật</strong> của lớp. Thầy cô tải lại trang; nếu vẫn vậy thì báo
            người quản trị.<br /><small>Chi tiết: {loi}</small>
          </div>
        : rows.length === 0
        ? <div className="empty-state">
            <p>✓ Chưa em nào vượt quá quyền miễn trừ, chưa phải giao lao động công ích.</p>
          </div>
        : <>
            {chuaBaoPh.length > 0 && <div className="form-error">
              <strong>{chuaBaoPh.length} em</strong> đã tới mức mời phụ huynh mà sổ chưa ghi nhận là đã báo.
            </div>}

            <div className="card table-card"><div className="table-wrap"><table className="book-table">
              <thead><tr>
                <th>Học sinh</th><th>Quên</th><th>Mức</th>
                <th>Lượt đã làm</th><th>Còn nợ</th><th>Đã báo</th><th></th>
              </tr></thead>
              <tbody>{rows.map((r) => <tr key={r.mshs} className={r.bac >= 3 ? 'row-late' : ''}>
                <td><strong>{r.full_name}</strong><br /><small>{r.mshs}</small></td>
                <td><strong>{r.so_lan_quen}</strong></td>
                <td><span className={`badge ${r.bac >= 2 ? 'danger' : 'warning'}`}>{r.nhan}</span></td>
                <td><span className="luot-o">
                  <input type="number" min="0" max={r.luot_phai_lam} value={nhap[r.mshs] ?? ''}
                         onChange={(e) => setNhap({ ...nhap, [r.mshs]: e.target.value })} />
                  <span className="muted-text">/ {r.luot_phai_lam}</span>
                  <button className="button ghost" disabled={luu === r.mshs}
                          onClick={() => ghiLuot(r)}>Lưu</button>
                </span></td>
                <td>{r.con_no > 0
                  ? <strong className="help-flag">{r.con_no}</strong>
                  : <span className="badge success">Xong</span>}</td>
                <td><small>
                  {r.da_bao_ph && <>PH: {formatDate(String(r.da_bao_ph).slice(0, 10))}<br /></>}
                  {r.da_bao_hs && <>HS: {formatDate(String(r.da_bao_hs).slice(0, 10))}</>}
                  {!r.da_bao_ph && !r.da_bao_hs && <span className="muted-text">chưa báo</span>}
                </small></td>
                <td><button className="button ghost"
                            onClick={() => setThu({ r, nguoiNhan: r.bac >= 3 ? 'ca_hai' : 'hs' })}>
                  <Mail size={15} /> Soạn thư</button></td>
              </tr>)}</tbody>
            </table></div></div>
          </>}
    </Collapsible>

    {thu && <LetterModal row={thu.r} nguoiNhanBanDau={thu.nguoiNhan}
      classId={classId} className={className} freePasses={freePasses}
      teacherName={profile?.full_name || 'Giáo viên chủ nhiệm'}
      onClose={() => setThu(null)} onDone={() => { setThu(null); load() }} />}
  </>
}

// ---------------------------------------------------------------------------
//  HỘP SOẠN THƯ
// ---------------------------------------------------------------------------
// Nội dung để SỬA ĐƯỢC. Thư mẫu chỉ đúng phần dữ kiện — số lần, ngày tháng, số
// lượt. Hoàn cảnh từng em thì chỉ thầy cô biết, và một lá thư máy soạn không sửa
// được thì tới lá thứ hai phụ huynh nhận ra ngay là thư hàng loạt.
function LetterModal({ row, nguoiNhanBanDau, classId, className, freePasses, teacherName, onClose, onDone }) {
  const [nguoiNhan, setNguoiNhan] = useState(nguoiNhanBanDau)
  const [daMo, setDaMo] = useState(false)
  const [msg, setMsg] = useState('')

  const guiPh = nguoiNhan === 'ca_hai'
  const soan = (ph) => (ph
    ? thuPhuHuynh(row, { className, teacherName, freePasses })
    : thuHocSinh(row, { className, teacherName, freePasses }))

  const [tieuDe, setTieuDe] = useState(() => soan(nguoiNhanBanDau === 'ca_hai').subject)
  const [noiDung, setNoiDung] = useState(() => soan(nguoiNhanBanDau === 'ca_hai').body)

  // Đổi người nhận là đổi hẳn giọng thư, nên soạn lại từ mẫu.
  useEffect(() => {
    const m = soan(nguoiNhan === 'ca_hai')
    setTieuDe(m.subject); setNoiDung(m.body); setDaMo(false)
  }, [nguoiNhan])

  // Cả hai địa chỉ đều suy ra từ MSHS theo quy tắc chung của trường, không phải
  // nhập tay và không lưu ở đâu cả.
  const emailHs = studentEmail(row.mshs)
  const emailPh = parentEmail(row.mshs)
  const to = guiPh ? [emailPh] : [emailHs]
  const cc = guiPh ? [emailHs] : []

  const mo = (url) => { window.open(url, '_blank', 'noopener,noreferrer'); setDaMo(true) }

  // Outlook trên máy đi qua mailto:, mà mailto: có trần độ dài. Thư dài quá thì
  // chép thân thư vào bộ nhớ tạm rồi chỉ mở cửa sổ trống có sẵn người nhận và
  // tiêu đề — thầy cô Ctrl+V một cái là xong. Thà thêm một thao tác còn hơn gửi
  // đi lá thư bị cắt mất đoạn cuối mà không ai biết.
  const moTrenMay = async () => {
    if (!mailtoQuaDai(goi)) return mo(mailtoUrl(goi))
    try {
      await navigator.clipboard.writeText(noiDung)
      // Chép được là việc ĐÃ XONG, không phải lỗi — nên báo màu xanh. Tô đỏ một
      // đường đi bình thường thì thầy cô tưởng hỏng và bỏ giữa chừng.
      setMsg('✓ Đã sao chép nội dung. Thư dài hơn mức Outlook trên máy nhận qua liên kết, thầy cô bấm Ctrl+V trong cửa sổ vừa mở.')
    } catch {
      setMsg('Thư dài hơn mức Outlook trên máy nhận được, mà trình duyệt lại không cho sao chép. Thầy cô bấm nút Sao chép rồi dán vào Outlook giúp em.')
      return
    }
    mo(mailtoUrl({ ...goi, body: '' }))
  }

  const danhDau = async () => {
    const { error } = await supabase.rpc('mark_discipline_notified',
      { p_class: classId, p_mshs: row.mshs, p_who: nguoiNhan })
    if (error) return setMsg('Không ghi được: ' + error.message)
    onDone()
  }

  const goi = { to, cc, subject: tieuDe, body: noiDung }
  const quaDaiChoMailto = mailtoQuaDai(goi)

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><span className="eyebrow">SOẠN THƯ</span>
        <h2>{row.full_name} — {row.nhan}</h2></div>
        <button className="icon-button" onClick={onClose}>✕</button></div>

      {msg && <div className={msg.startsWith('✓') ? 'notice' : 'form-error'}>{msg}</div>}

      <div className="quick-views">
        <button type="button" className={`chip-btn ${guiPh ? 'on' : ''}`}
          onClick={() => setNguoiNhan('ca_hai')}>Phụ huynh + học sinh</button>
        <button type="button" className={`chip-btn ${guiPh ? '' : 'on'}`}
          onClick={() => setNguoiNhan('hs')}>Chỉ học sinh</button>
      </div>

      <div className="detail-box">
        <strong>Người nhận</strong>
        <p>{to.join('; ')}
          {cc.length > 0 && <><br /><small>Cc: {cc.join('; ')}</small></>}
          <br /><small className="muted-text">Địa chỉ suy ra từ MSHS theo quy tắc của trường.</small></p>
      </div>

      <label>Tiêu đề
        <input value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} /></label>
      <label className="letter-body">Nội dung — sửa được trước khi gửi
        <textarea rows={16} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} /></label>

      {/* Nói thẳng: hệ thống không gửi hộ. Thầy cô còn phải bấm Gửi trong Outlook,
          rồi tự bấm "Đã gửi" ở dưới. Nhập nhèm chỗ này là thầy cô tưởng thư đã đi. */}
      <p className="muted-text letter-note">
        Hệ thống <strong>không tự gửi thư</strong>. Nút dưới đây mở Outlook với nội dung điền sẵn —
        thầy cô đọc lại rồi bấm Gửi bên Outlook.
        {quaDaiChoMailto && <><br />
          Thư tiếng Việt thường dài hơn mức <em>Outlook trên máy</em> nhận qua đường liên kết, nên
          nút đó sẽ <strong>sao chép nội dung</strong> rồi mở cửa sổ soạn thư trống —
          thầy cô bấm Ctrl+V. Dùng <strong>Outlook trên web</strong> thì điền sẵn được cả thư.
        </>}
      </p>

      <div className="button-row letter-actions">
        <button className="button primary"
                onClick={() => mo(outlookWebUrl(goi))}>
          <ExternalLink size={16} /> Mở Outlook trên web</button>
        <button className="button ghost"
                onClick={moTrenMay}>Mở Outlook trên máy</button>
        <button className="button ghost" onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${tieuDe}\n\n${noiDung}`)
            setMsg('✓ Đã sao chép tiêu đề và nội dung.')
          } catch { setMsg('Trình duyệt không cho sao chép. Thầy cô bôi đen nội dung rồi Ctrl+C giúp.') }
        }}><Copy size={16} /> Sao chép</button>
      </div>

      {daMo && <div className="notice letter-confirm">
        Đã mở Outlook. Sau khi bấm Gửi bên đó, ghi lại vào sổ:
        <div className="form-actions">
          <button className="button ghost" onClick={onClose}>Chưa gửi</button>
          <button className="button primary" onClick={danhDau}>Đã gửi — ghi vào sổ</button>
        </div>
      </div>}
    </div>
  </div>
}
