import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Laptop, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/date'
import StatusBadge from './StatusBadge'
import RatingStars, { ratingTone } from './RatingStars'

// ---------------------------------------------------------------------------
//  HỘP XỬ LÝ MỘT NHIỆM VỤ — dành cho TRỢ GIẢNG
// ---------------------------------------------------------------------------
// Trước đây trang trợ giảng chỉ LIỆT KÊ quyền đã được giao ("Duyệt kế hoạch",
// "Chấm sao"…) mà không có nút nào để làm — giáo viên giao việc xong, trợ giảng
// không có chỗ bấm.
//
// Mỗi nút chỉ hiện khi đúng quyền đó được bật. Đó là để gọn mắt; còn chặn thật
// thì ở CSDL (schema-19): bấm sai quyền thì máy chủ báo lỗi, và lời báo đó được
// đưa nguyên văn lên đây.
export default function TaPlanModal({ plan, student, reflection, quyen, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [lyDo, setLyDo] = useState('')
  const [moLyDo, setMoLyDo] = useState(null)        // 'ke_hoach' | 'thiet_bi'
  const [rating, setRating] = useState(reflection?.rating ?? null)
  const [nhanXet, setNhanXet] = useState(reflection?.teacher_comment || '')
  const [daHoTro, setDaHoTro] = useState(reflection?.help_resolved || false)
  const [minhChung, setMinhChung] = useState([])

  useEffect(() => {
    if (!quyen.can_view_evidence) return
    supabase.from('evidence').select('*').eq('plan_id', plan.id).order('created_at')
      .then(({ data }) => setMinhChung(data ?? []))
  }, [plan.id, quyen.can_view_evidence])

  const loi = (e, macDinh) => (e?.code === 'P0001' ? e.message : `${macDinh} ${e?.message ?? ''}`.trim())

  const tbCho = plan.use_device && plan.device_status === 'Chờ duyệt'
  // Duyệt kế hoạch có thiết bị đang chờ = duyệt luôn thiết bị, nên phải có cả
  // quyền duyệt thiết bị. Thiếu thì nói thẳng ở đây, đừng để em bấm rồi mới lỗi.
  const duyetDuoc = quyen.can_approve_plan && (!tbCho || quyen.can_review_device)

  const duyet = async (status, note = null) => {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('bulk_review_plans',
      { p_plan_ids: [plan.id], p_status: status, p_note: note })
    setBusy(false)
    if (error) return setMsg(loi(error, 'Không cập nhật được trạng thái duyệt.'))
    if (!data?.da_xu_ly) return setMsg('Không có gì thay đổi — có thể kế hoạch đã được người khác xử lý. Em tải lại trang nhé.')
    onSaved(status === 'Đã duyệt' ? 'Đã duyệt kế hoạch.' : 'Đã gửi yêu cầu điều chỉnh cho bạn.')
  }

  const thietBi = async (status, note = null) => {
    setBusy(true); setMsg('')
    const { error } = await supabase.from('plans')
      .update({ device_status: status, device_review_note: note }).eq('id', plan.id)
    setBusy(false)
    if (error) return setMsg(loi(error, 'Không cập nhật được duyệt thiết bị.'))
    onSaved(status === 'Đã duyệt' ? 'Đã duyệt thiết bị (kế hoạch cũng được duyệt).' : 'Đã từ chối thiết bị.')
  }

  const guiLyDo = () => {
    const n = lyDo.trim()
    if (n.length < 3) return setMsg('Ghi rõ lý do để bạn biết cần sửa gì.')
    if (moLyDo === 'thiet_bi') thietBi('Từ chối', n)
    else duyet('Cần điều chỉnh', n)
  }

  const luuDanhGia = async () => {
    const thayDoi = {}
    if (quyen.can_rate && rating !== (reflection?.rating ?? null)) thayDoi.rating = rating
    if (quyen.can_comment && (nhanXet.trim() || null) !== (reflection?.teacher_comment || null)) thayDoi.teacher_comment = nhanXet.trim() || null
    if (quyen.can_comment && reflection?.need_help && daHoTro !== reflection.help_resolved) thayDoi.help_resolved = daHoTro
    if (!Object.keys(thayDoi).length) return setMsg('Chưa có gì thay đổi để lưu.')
    setBusy(true); setMsg('')
    const { error } = await supabase.from('reflections').update(thayDoi).eq('plan_id', plan.id)
    setBusy(false)
    if (error) return setMsg(loi(error, 'Không lưu được đánh giá.'))
    onSaved('Đã lưu đánh giá.')
  }

  const moMinhChung = async (x) => {
    if (x.kind === 'text') return window.alert(x.body_text || '')
    if (x.kind === 'link') return window.open(x.external_url, '_blank', 'noopener,noreferrer')
    const { data } = await supabase.storage.from('evidence').createSignedUrl(x.storage_path, 180)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    else setMsg('Không mở được tệp minh chứng.')
  }

  const coViecDuyet = (quyen.can_approve_plan || quyen.can_review_device)
    && ['Chờ duyệt', 'Cần điều chỉnh'].includes(plan.review_status)
  const coViecCham = reflection && (quyen.can_rate || quyen.can_comment)

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head">
        <div><span className="eyebrow">TRỢ GIẢNG · XỬ LÝ NHIỆM VỤ</span><h2>{student?.full_name ?? '—'}</h2>
          <p>{formatDate(plan.study_date)} · Tiết {plan.period}{plan.span === 2 ? `–${plan.period + 1}` : ''} · {plan.subject === 'Khác' && plan.subject_other ? plan.subject_other : plan.subject}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
      </div>

      <div className="detail-box">
        <strong>Nhiệm vụ</strong><p>{plan.task}</p>
        <strong>Mục tiêu</strong><p>{plan.goal}</p>
        <div className="detail-inline">
          <span>Duyệt: <StatusBadge value={plan.review_status} /></span>
          {plan.use_device && <span>Thiết bị: <StatusBadge value={plan.device_status} /></span>}
        </div>
        {plan.use_device && plan.device_purpose && <><strong><Laptop size={14} /> Mục đích dùng thiết bị</strong><p>{plan.device_purpose}</p></>}
        {plan.review_note && <><strong>Yêu cầu điều chỉnh đã gửi</strong><p>{plan.review_note}</p></>}
      </div>

      {/* ---------- Duyệt ---------- */}
      {coViecDuyet && <div className="review-actions">
        {tbCho && quyen.can_review_device
          ? <>
              <button className="button primary" disabled={busy} onClick={() => thietBi('Đã duyệt')}>
                <Check size={16} /> Duyệt (cả thiết bị)</button>
              <button className="button ghost danger" disabled={busy} onClick={() => { setMoLyDo('thiet_bi'); setLyDo('') }}>
                Từ chối thiết bị</button>
            </>
          : <>
              {duyetDuoc && plan.review_status !== 'Đã duyệt' &&
                <button className="button primary" disabled={busy} onClick={() => duyet('Đã duyệt')}>
                  <Check size={16} /> Duyệt kế hoạch</button>}
              {quyen.can_approve_plan && plan.review_status !== 'Cần điều chỉnh' &&
                <button className="button ghost danger" disabled={busy} onClick={() => { setMoLyDo('ke_hoach'); setLyDo('') }}>
                  Yêu cầu điều chỉnh</button>}
            </>}
        {tbCho && quyen.can_approve_plan && !quyen.can_review_device &&
          <span className="notice warning compact"><AlertTriangle size={15} /><span>
            Kế hoạch này có dùng thiết bị — em cần thêm quyền <strong>Duyệt thiết bị</strong> mới duyệt được. Em vẫn trả về cho bạn sửa được.
          </span></span>}
      </div>}
      {moLyDo && <div className="detail-box">
        <label>{moLyDo === 'thiet_bi' ? 'Lý do từ chối thiết bị' : 'Bạn cần điều chỉnh gì?'} — gửi thẳng tới bạn</label>
        <textarea rows="2" maxLength={500} value={lyDo} onChange={(e) => setLyDo(e.target.value)}
          placeholder={moLyDo === 'thiet_bi' ? 'Ví dụ: Mục đích chưa rõ, ghi cụ thể trang web cần mở.' : 'Ví dụ: Ghi rõ làm bài nào, trang mấy.'} />
        <div className="form-actions">
          <button className="button ghost" onClick={() => setMoLyDo(null)}>Thôi</button>
          <button className="button primary" disabled={busy} onClick={guiLyDo}>Gửi</button>
        </div>
      </div>}

      {/* ---------- Kết quả, minh chứng, chấm sao ---------- */}
      {quyen.can_view_reflections && (reflection
        ? <div className="detail-box">
            <strong>Bạn tự đánh giá</strong><p><StatusBadge value={reflection.completion_status} /></p>
            {reflection.note && <><strong>Bạn đã làm được</strong><p>{reflection.note}</p></>}
            {reflection.need_help && <><strong>Bạn cần hỗ trợ</strong><p>{reflection.help_note}</p></>}
          </div>
        : <p className="muted-text small">Bạn chưa cập nhật kết quả cho nhiệm vụ này.</p>)}

      {quyen.can_view_evidence && minhChung.length > 0 && <div className="evidence-block">
        <h3>Minh chứng</h3>
        {minhChung.map((x) => <button key={x.id} type="button" className="evidence-item" onClick={() => moMinhChung(x)}>
          {x.kind === 'link' ? '🔗' : x.kind === 'text' ? '📝' : '📎'} {x.kind === 'text' ? (x.body_text || '').slice(0, 80) : (x.display_name || 'Minh chứng')}
          {x.kind !== 'text' && <ExternalLink size={14} />}
        </button>)}
      </div>}

      {coViecCham && <>
        {quyen.can_rate && <div className={`rating-editor ${ratingTone(rating)}`}>
          <label>Chấm sao</label>
          <RatingStars value={rating} onChange={setRating} />
          {rating != null && rating <= 2 && <div className="notice warning compact"><AlertTriangle size={16} />
            <span>Chấm {rating} sao thì bạn sẽ phải viết một dòng phản hồi về cách điều chỉnh.</span></div>}
        </div>}
        {quyen.can_comment && <>
          <label>Nhận xét gửi bạn</label>
          <textarea rows="3" maxLength={1000} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)}
            placeholder="Ngắn gọn, cụ thể: bạn làm tốt chỗ nào, cần sửa chỗ nào." />
          {reflection.need_help && <div className="toggle-row"><label className="switch">
            <input type="checkbox" checked={daHoTro} onChange={(e) => setDaHoTro(e.target.checked)} /><span /></label>
            <div><strong>Đã hỗ trợ xong</strong><small>Bỏ bạn này khỏi danh sách cần hỗ trợ.</small></div></div>}
        </>}
      </>}

      {msg && <div className="form-error">{msg}</div>}
      <div className="form-actions">
        <button className="button ghost" onClick={onClose}>Đóng</button>
        {coViecCham && <button className="button primary" disabled={busy} onClick={luuDanhGia}>{busy ? 'Đang lưu…' : 'Lưu đánh giá'}</button>}
      </div>
    </div>
  </div>
}
