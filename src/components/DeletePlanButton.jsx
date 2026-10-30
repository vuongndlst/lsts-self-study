import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/date'

export default function DeletePlanButton({ plans, onDeleted, student = false, disabled = false,
  disabledReason = '', label = 'Xóa nhiệm vụ' }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(student ? 'Không còn nhu cầu thực hiện nhiệm vụ' : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const close = () => { if (!busy) { setOpen(false); setError('') } }
  const remove = async () => {
    if (reason.trim().length < 5) return setError('Ghi lý do xoá ít nhất 5 ký tự.')
    setBusy(true); setError('')
    try {
      const { data, error: e } = await supabase.rpc('delete_study_plans',
        { p_plan_ids: plans.map((p) => p.id), p_reason: reason.trim() })
      if (e) return setError(e.code === 'P0001' ? e.message : 'Không xoá được nhiệm vụ. Hãy tải lại và thử lại.')
      if (data?.da_xoa !== plans.length) return setError('Danh sách đã thay đổi. Hãy tải lại trước khi xoá.')
      setOpen(false); onDeleted()
    } catch {
      setError('Mất kết nối khi xoá. Hãy tải lại danh sách để kiểm tra trước khi thử lại.')
    } finally { setBusy(false) }
  }
  return <>
    <button type="button" className="button danger ghost" disabled={disabled}
      title={disabledReason || label} onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
      <Trash2 size={16} /> {label}
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={close}>
      <div className="modal small" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2 id={`${id}-title`}>Xóa {plans.length === 1 ? 'nhiệm vụ' : `${plans.length} nhiệm vụ`}?</h2>
          <button type="button" className="icon-button" aria-label="Đóng xác nhận xóa" disabled={busy} onClick={close}><X size={18} /></button></div>
        <ul className="target-list">{plans.map((p) => <li key={p.id}><strong>{p.subject}</strong>
          <small>{formatDate(p.study_date)} · Tiết {p.period}</small><p>{p.task}</p></li>)}</ul>
        <p>Đăng ký thiết bị đi kèm cũng được gỡ. Hệ thống giữ nhật ký người xoá và lý do;
          nhiệm vụ đã có kết quả hoặc minh chứng sẽ không được xoá.</p>
        {student && <p className="muted-text small">Em chỉ tự xoá trước khi tiết học bắt đầu. Sau mốc đó, hãy nhờ giáo viên hoặc trợ giảng có quyền xử lý.</p>}
        <label htmlFor={`${id}-reason`}>Lý do xoá</label>
        <textarea id={`${id}-reason`} rows="2" maxLength={500} value={reason} disabled={busy}
          onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Không còn cần sử dụng thiết bị cho nhiệm vụ này." />
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions"><button type="button" className="button ghost" disabled={busy} onClick={close}>Giữ lại</button>
          <button type="button" className="button danger" disabled={busy} onClick={remove}>{busy ? 'Đang xoá…' : 'Xác nhận xóa'}</button></div>
      </div>
    </div>, document.body)}
  </>
}
