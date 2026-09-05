import { useEffect, useState } from 'react'
import { CalendarCog, CalendarOff, ShieldAlert, Trash2, UserMinus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { todayISO } from '../utils/date'
import Collapsible from './Collapsible'

const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const shiftISO = (base, n) => {
  const d = new Date(base + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
//  MIỄN BUỔI — cho cả lớp hoặc cho một em
// ---------------------------------------------------------------------------
// Hai tình huống thật khác nhau nhưng cùng một cơ chế:
//   · Thứ Sáu tiết 8–9 cả lớp đi sự kiện  → miễn CẢ LỚP
//   · Em nghỉ ốm hôm đó                    → miễn RIÊNG EM
export function ExemptionPanel({ classId, roster, date, onChanged }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ mshs: '', period: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.rpc('class_exemptions', {
      p_class: classId, p_from: shiftISO(todayISO(), -30), p_to: shiftISO(todayISO(), 60),
    })
    setList(data ?? [])
  }
  useEffect(() => { if (classId) load() }, [classId])

  const add = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase.rpc('set_attendance_exemption', {
      p_class: classId, p_date: date,
      p_reason: form.reason.trim() || 'Lớp có hoạt động khác',
      p_period: form.period ? Number(form.period) : null,
      p_mshs: form.mshs || null,
    })
    setBusy(false)
    if (error) return setMsg('Không miễn được: ' + error.message)
    setForm({ mshs: '', period: '', reason: '' })
    setMsg('✓ Đã miễn. Buổi này sẽ không tính là quên đăng ký.')
    load(); onChanged?.()
  }

  const remove = async (id) => {
    if (!window.confirm('Bỏ lệnh miễn này? Buổi đó sẽ được tính lại như bình thường.')) return
    const { error } = await supabase.rpc('clear_attendance_exemption', { p_id: id })
    if (error) return setMsg('Không bỏ được: ' + error.message)
    load(); onChanged?.()
  }

  // Thu gọn mặc định: đây là công cụ dùng thỉnh thoảng, còn thứ chính của tab
  // này là danh sách em chưa đăng ký ở trên.
  return <Collapsible storageKey="mien-buoi" defaultOpen={false}
    icon={<CalendarOff size={19} />} title="Miễn buổi tự học"
    badge={list.length > 0 ? <span className="badge muted">{list.length} lệnh</span> : null}
    subtitle={<>Buổi đã miễn thì <strong>không ai bị tính là quên đăng ký</strong>. Miễn sau khi
      hết ngày cũng được — hệ thống sẽ gỡ luôn những lần quên đã ghi cho buổi đó.</>}>

    <div className="exempt-form">
      <div>
        <label>Miễn cho</label>
        <select value={form.mshs} onChange={(e) => setForm({ ...form, mshs: e.target.value })}>
          <option value="">Cả lớp — lớp có hoạt động khác</option>
          {(roster ?? []).map((s) => <option key={s.mshs} value={s.mshs}>{s.full_name}</option>)}
        </select>
      </div>
      <div>
        <label>Tiết</label>
        <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
          <option value="">Cả ngày</option>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) =>
            <option key={n} value={n}>Tiết {n}</option>)}
        </select>
      </div>
      <div className="grow">
        <label>Lý do</label>
        <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
               placeholder="Ví dụ: Lớp tham gia hội trại · Em nghỉ ốm có phép" />
      </div>
      <button className="button primary" disabled={busy} onClick={add}>
        {form.mshs ? <UserMinus size={17} /> : <Users size={17} />}
        {busy ? 'Đang lưu…' : `Miễn ngày ${dmy(date)}`}
      </button>
    </div>
    {msg && <div className={msg.startsWith('✓') ? 'notice compact' : 'form-error'}>{msg}</div>}

    {list.length > 0 && <div className="table-wrap"><table className="book-table">
      <thead><tr><th>Ngày</th><th>Tiết</th><th>Miễn cho</th><th>Lý do</th><th></th></tr></thead>
      <tbody>{list.map((x) => <tr key={x.id}>
        <td><strong>{dmy(x.study_date)}</strong></td>
        <td>{x.period ? `Tiết ${x.period}` : 'Cả ngày'}</td>
        <td>{x.mshs ? x.full_name : <strong>Cả lớp</strong>}</td>
        <td>{x.reason}</td>
        <td><button className="icon-button" title="Bỏ miễn" onClick={() => remove(x.id)}>
          <Trash2 size={16} /></button></td>
      </tr>)}</tbody>
    </table></div>}
  </Collapsible>
}

// ---------------------------------------------------------------------------
//  BẢNG KỶ LUẬT — em nào đang lao động công ích, em nào phải mời phụ huynh
// ---------------------------------------------------------------------------
export function DisciplineBoard({ classId, className }) {
  const [rows, setRows] = useState([])
  const [chiHienViPham, setChiHienViPham] = useState(true)

  useEffect(() => {
    if (!classId) return
    supabase.rpc('class_attendance_board', { p_class: classId })
      .then(({ data }) => setRows(data ?? []))
  }, [classId])

  const viPham = rows.filter((r) => r.bac >= 1)
  const shown = chiHienViPham ? viPham : rows.filter((r) => r.so_lan_quen > 0)

  const nhom = [
    ['Trao đổi với phụ huynh', rows.filter((r) => r.bac === 3)],
    ['Lao động công ích 10 lượt', rows.filter((r) => r.bac === 2)],
    ['Lao động công ích 5 lượt', rows.filter((r) => r.bac === 1)],
  ]

  // Mở mặc định: đây chính là nội dung của tab Kỷ luật.
  return <Collapsible storageKey="bang-ky-luat" defaultOpen wrapper="section-block"
    icon={<ShieldAlert size={19} />} title={`Kỷ luật quên đăng ký — lớp ${className}`}
    badge={viPham.length > 0 ? <span className="badge danger">{viPham.length} em</span> : null}
    subtitle="Mỗi em được miễn trừ 3 lần mỗi học kỳ. Từ lần thứ tư mới tính kỷ luật.">

    {viPham.length === 0
      ? <div className="empty-state"><p>✓ Chưa em nào vượt quá quyền miễn trừ.</p></div>
      : <div className="stats-grid">{nhom.map(([nhan, list]) =>
          <div key={nhan} className={`stat-card ${list.length ? 'alert' : 'zero'}`}>
            <span>{nhan}</span><strong>{list.length}</strong>
          </div>)}</div>}

    <div className="quick-views">
      <button type="button" className={`chip-btn ${chiHienViPham ? 'on' : ''}`}
        onClick={() => setChiHienViPham(true)}>Chỉ em có kỷ luật ({viPham.length})</button>
      <button type="button" className={`chip-btn ${chiHienViPham ? '' : 'on'}`}
        onClick={() => setChiHienViPham(false)}>Mọi em từng quên ({rows.filter((r) => r.so_lan_quen > 0).length})</button>
    </div>

    {shown.length > 0 && <div className="card table-card"><div className="table-wrap"><table className="book-table">
      <thead><tr><th>Học sinh</th><th>Số lần quên</th><th>Mức</th><th>Nội dung</th><th>Lần gần nhất</th></tr></thead>
      <tbody>{shown.map((r) => <tr key={r.mshs} className={r.bac >= 2 ? 'row-late' : ''}>
        <td><strong>{r.full_name}</strong><small>{r.mshs}</small></td>
        <td><strong>{r.so_lan_quen}</strong></td>
        <td><span className={`badge ${r.bac >= 2 ? 'danger' : r.bac === 1 ? 'warning' : 'muted'}`}>{r.nhan}</span></td>
        <td>{r.chi_tiet}</td>
        <td>{dmy(r.lan_gan_nhat)}</td>
      </tr>)}</tbody>
    </table></div></div>}
  </Collapsible>
}

// ---------------------------------------------------------------------------
//  CÀI ĐẶT KỶ LUẬT — mỗi lớp tự khai mốc của mình
// ---------------------------------------------------------------------------
// Hệ thống dùng cho toàn trường: mỗi lớp bắt đầu áp dụng ở một thời điểm khác
// nhau, và mốc học kỳ đổi theo từng năm. Nên đây là ô nhập, không phải hằng số.
export function AttendancePolicyPanel({ classId, className }) {
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.rpc('get_attendance_policy', { p_class: classId })
    setF({
      enabled: data?.enabled ?? false,
      free_passes: data?.free_passes ?? 3,
      tracking_from: data?.tracking_from ?? todayISO(),
      term1_from: data?.term1_from ?? '',
      term1_to: data?.term1_to ?? '',
      term2_from: data?.term2_from ?? '',
      term2_to: data?.term2_to ?? '',
      dang_ap_dung: data?.dang_ap_dung ?? null,
    })
  }
  useEffect(() => { if (classId) load() }, [classId])
  if (!f) return null

  const save = async () => {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('set_attendance_policy', {
      p_class: classId,
      p_enabled: f.enabled,
      p_free_passes: Number(f.free_passes),
      p_tracking_from: f.tracking_from || null,
      p_term1_from: f.term1_from || null,
      p_term1_to: f.term1_to || null,
      p_term2_from: f.term2_from || null,
      p_term2_to: f.term2_to || null,
    })
    setBusy(false)
    if (error) return setMsg(error.message)
    setMsg(`✓ Đã lưu. Đang tính cho ${data.hoc_ky}: ${dmy(data.tu_ngay)} → ${dmy(data.den_ngay)}.`)
    load()
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // Đổi tiêu đề: trước đây khối này và bảng kỷ luật ở trên trùng tên nhau y hệt
  // trong cùng một tab, nhìn tưởng vẽ hai lần. Đây là phần CÀI ĐẶT.
  return <Collapsible storageKey="cai-dat-ky-luat" defaultOpen={false}
    icon={<CalendarCog size={19} />} title={`Cài đặt kỷ luật — lớp ${className}`}
    badge={<span className={`badge ${f.enabled ? 'success' : 'muted'}`}>{f.enabled ? 'Đang bật' : 'Đang tắt'}</span>}
    subtitle={<>Mỗi lớp tự chọn thời điểm bắt đầu áp dụng. Khi chưa bật, học sinh không thấy hộp
      nhắc việc và hệ thống không ghi nhận lần quên nào.</>}>

    <div className="toggle-row">
      <label className="switch">
        <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /><span />
      </label>
      <div><strong>Áp dụng kỷ luật quên đăng ký</strong>
        <small>{f.enabled
          ? 'Đang áp dụng — hệ thống chốt danh sách lúc 00:05 của ngày hôm sau, sau khi hạn 24:00 đã qua.'
          : 'Chưa áp dụng — hệ thống không ghi nhận, nhắc nhở hay tính kỷ luật.'}</small></div>
    </div>

    <div className="form-grid two">
      <div>
        <label>Bắt đầu tính từ ngày *</label>
        <input type="date" value={f.tracking_from} onChange={set('tracking_from')} />
        <small className="muted-text">Lớp áp dụng giữa chừng thì chọn ngày hôm nay trở đi —
          những buổi trước mốc này không bị tính.</small>
      </div>
      <div>
        <label>Số lần được miễn trừ mỗi học kỳ *</label>
        <input type="number" min="0" max="10" value={f.free_passes} onChange={set('free_passes')} />
        <small className="muted-text">Quá số này mới bắt đầu có kỷ luật.</small>
      </div>
    </div>

    <div className="form-grid two">
      <div><label>Học kỳ I — từ ngày</label>
        <input type="date" value={f.term1_from} onChange={set('term1_from')} /></div>
      <div><label>Học kỳ I — đến ngày</label>
        <input type="date" value={f.term1_to} onChange={set('term1_to')} /></div>
    </div>
    <div className="form-grid two">
      <div><label>Học kỳ II — từ ngày</label>
        <input type="date" value={f.term2_from} onChange={set('term2_from')} /></div>
      <div><label>Học kỳ II — đến ngày</label>
        <input type="date" value={f.term2_to} onChange={set('term2_to')} /></div>
    </div>

    <div className="notice compact"><ShieldAlert size={16} /><span>
      Bộ đếm <strong>tự về 0 khi sang học kỳ II</strong>. Ngoài hai khoảng đã khai —
      nghỉ hè, nghỉ Tết, giữa hai học kỳ — hệ thống không ghi nhận lần quên nào.
    </span></div>

    {f.dang_ap_dung?.tu_ngay && <p className="muted-text small">
      Hiện đang tính cho <strong>{f.dang_ap_dung.hoc_ky}</strong>: {dmy(f.dang_ap_dung.tu_ngay)}
      {f.dang_ap_dung.den_ngay ? ` → ${dmy(f.dang_ap_dung.den_ngay)}` : ''}.
    </p>}

    <div className="rule-table">
      <span className="rule-caption">Thang kỷ luật hiện tại</span>
      <div className="rule-row"><span>1–{f.free_passes} lần</span><strong>Được miễn trừ</strong></div>
      <div className="rule-row"><span>Lần {Number(f.free_passes) + 1}</span><strong>Lao động công ích 5 lượt</strong></div>
      <div className="rule-row"><span>Lần {Number(f.free_passes) + 2}</span><strong>Lao động công ích 10 lượt</strong></div>
      <div className="rule-row"><span>Từ lần {Number(f.free_passes) + 3}</span><strong>Trao đổi với phụ huynh</strong></div>
    </div>

    {msg && <div className={msg.startsWith('✓') ? 'notice compact' : 'form-error'}>{msg}</div>}
    <div className="form-actions">
      <button className="button primary large" disabled={busy} onClick={save}>
        {busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button>
    </div>
  </Collapsible>
}

// ---------------------------------------------------------------------------
//  BẢNG ĐẾM CHO BẠN ĐƯỢC GIAO VIỆC NHẮC
// ---------------------------------------------------------------------------
// Cố tình KHÔNG hiện mức kỷ luật. Bạn đi nhắc cần biết số lần quên và còn mấy
// lần miễn trừ — đủ để nói "bạn còn một lần nữa thôi nhé". Còn lao động công
// ích hay mời phụ huynh là việc giữa giáo viên, học sinh và phụ huynh, không
// phải thứ để một bạn cùng lớp đọc được.
export function AttendanceTracker({ classId }) {
  const [rows, setRows] = useState([])
  const [chiHienDaQuen, setChiHienDaQuen] = useState(true)

  useEffect(() => {
    if (!classId) return
    supabase.rpc('class_attendance_tracker', { p_class: classId })
      .then(({ data }) => setRows(data ?? []))
  }, [classId])

  if (!rows.length) return null
  const daQuen = rows.filter((r) => r.so_lan_quen > 0)
  const sapHet = rows.filter((r) => r.so_lan_quen > 0 && r.con_lai <= 1)
  const shown = chiHienDaQuen ? daQuen : rows

  return <Collapsible storageKey="theo-doi-quen" defaultOpen wrapper="section-block"
    icon={<ShieldAlert size={19} />} title="Số lần quên đăng ký"
    badge={sapHet.length > 0 ? <span className="badge warning">{sapHet.length} bạn sắp hết</span> : null}
    subtitle={<>Dùng để nhắc các bạn. Số này tính trong <strong>học kỳ hiện tại</strong>.
      Bạn nào sắp hết quyền miễn trừ thì nhắc sớm giúp nhé.</>}>

    {sapHet.length > 0 && <div className="notice warning"><ShieldAlert size={17} /><span>
      <strong>{sapHet.length} bạn</strong> chỉ còn 1 lần miễn trừ hoặc đã hết:
      {' '}{sapHet.map((r) => r.full_name).join(' · ')}
    </span></div>}

    <div className="quick-views">
      <button type="button" className={`chip-btn ${chiHienDaQuen ? 'on' : ''}`}
        onClick={() => setChiHienDaQuen(true)}>Bạn đã từng quên ({daQuen.length})</button>
      <button type="button" className={`chip-btn ${chiHienDaQuen ? '' : 'on'}`}
        onClick={() => setChiHienDaQuen(false)}>Cả lớp ({rows.length})</button>
    </div>

    {shown.length === 0
      ? <div className="empty-state"><p>✓ Chưa bạn nào quên đăng ký trong học kỳ này.</p></div>
      : <div className="card table-card"><div className="table-wrap"><table className="book-table">
          <thead><tr><th>Bạn</th><th>Số lần quên</th><th>Còn được miễn trừ</th><th>Lần gần nhất</th></tr></thead>
          <tbody>{shown.map((r) => <tr key={r.mshs} className={r.con_lai === 0 ? 'row-late' : ''}>
            <td><strong>{r.full_name}</strong><small>{r.mshs}</small></td>
            <td><strong>{r.so_lan_quen}</strong></td>
            <td>{r.con_lai === 0
              ? <span className="badge danger">đã hết</span>
              : <span className={`badge ${r.con_lai <= 1 ? 'warning' : 'muted'}`}>còn {r.con_lai} lần</span>}</td>
            <td>{dmy(r.lan_gan_nhat)}</td>
          </tr>)}</tbody>
        </table></div></div>}
  </Collapsible>
}
