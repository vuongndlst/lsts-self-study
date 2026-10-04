import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, ExternalLink, HeartHandshake, Laptop, ListChecks, Settings2, ShieldAlert } from 'lucide-react'
import { parentEmail, studentEmail, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { todayISO } from '../utils/date'
import { outlookWebUrl } from '../utils/disciplineLetter'
import Collapsible from './Collapsible'
import { DeviceRuleTable, LOAI_VI_PHAM, TEN_THU, THANG_VI_PHAM, dmy } from './DeviceRules'

// ---------------------------------------------------------------------------
//  THẺ "THIẾT BỊ" CỦA GVCN
// ---------------------------------------------------------------------------
// Từ 10/2026 đăng ký chỉ còn bắt buộc khi dùng thiết bị điện tử, nên thẻ này
// thay chỗ thẻ "Chưa đăng ký": thầy cô đặt giới hạn, xem tuần này em nào dùng
// bao nhiêu ngày, ghi vi phạm và theo dõi lao động công ích.
//
// Mọi luật đều nằm ở CSDL (schema-16, schema-17). Ở đây chỉ gọi hàm và hiển thị.

const plusDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const isoDow = (iso) => { const w = new Date(iso + 'T00:00:00Z').getUTCDay(); return w === 0 ? 7 : w }
const mondayOf = (iso) => plusDays(iso, 1 - isoDow(iso))
const thangCho = (lan) => THANG_VI_PHAM.find((r) => r.lan === Math.min(lan, 4))

export default function DeviceBoard({ classId, className }) {
  const { profile } = useAuth()
  const [tuan, setTuan] = useState(() => mondayOf(todayISO()))
  const [rows, setRows] = useState([])
  const [loi, setLoi] = useState('')
  const [lich, setLich] = useState([])
  const [ghiCho, setGhiCho] = useState(null)       // dòng học sinh đang ghi vi phạm
  const [msg, setMsg] = useState('')
  const [phienBan, setPhienBan] = useState(0)      // tăng để sổ vi phạm nạp lại

  const load = async () => {
    if (!classId) return
    const { data, error } = await supabase.rpc('class_device_week', { p_class: classId, p_date: tuan })
    setLoi(error ? error.message : '')
    setRows(data ?? [])
  }
  useEffect(() => { load() }, [classId, tuan, phienBan])
  useEffect(() => {
    if (!classId) return
    supabase.from('class_schedule').select('weekday').eq('class_id', classId)
      .then(({ data }) => setLich([...new Set((data ?? []).map((x) => x.weekday))].sort()))
  }, [classId])

  const dangCam = rows.filter((r) => r.cam_den)
  const chuaBao = rows.filter((r) => r.chua_bao_ph)

  return <>
    {msg && <div className={msg.startsWith('✓') ? 'notice' : 'form-error'}>{msg}</div>}

    <DeviceSettings classId={classId} lich={lich} onSaved={() => setPhienBan((k) => k + 1)} />

    <Collapsible storageKey="tbdt-tuan" defaultOpen wrapper="section-block"
      icon={<Laptop size={19} />} title={`Thiết bị điện tử theo tuần — lớp ${className}`}
      badge={dangCam.length > 0 ? <span className="badge danger">{dangCam.length} em đang bị tạm dừng</span> : null}
      subtitle="Mỗi em đã đăng ký dùng thiết bị bao nhiêu ngày (không tính buổi bị từ chối). Ghi vi phạm ngay trên dòng của em.">

      <div className="check-row">
        <button className="button ghost" onClick={() => setTuan(plusDays(tuan, -7))}><ChevronLeft size={16} /> Tuần trước</button>
        <strong>{dmy(tuan)} → {dmy(plusDays(tuan, 6))}</strong>
        <button className="button ghost" onClick={() => setTuan(plusDays(tuan, 7))}>Tuần sau <ChevronRight size={16} /></button>
        {tuan !== mondayOf(todayISO()) && <button className="button ghost" onClick={() => setTuan(mondayOf(todayISO()))}>Tuần này</button>}
      </div>

      {chuaBao.length > 0 && <div className="form-error">
        <strong>{chuaBao.length} em</strong> đã tới mức mời phụ huynh mà sổ chưa ghi nhận là đã báo:
        {' '}{chuaBao.map((r) => r.full_name).join(', ')}. Xem ở sổ vi phạm bên dưới.
      </div>}

      {loi
        ? <div className="form-error">Không tải được bảng thiết bị, nên bảng dưới đây <strong>không phản ánh
            tình hình thật</strong>. Thầy cô tải lại trang.<br /><small>Chi tiết: {loi}</small></div>
        : <div className="card table-card"><div className="table-wrap"><table className="book-table">
            <thead><tr>
              <th>Học sinh</th><th>Số ngày dùng</th><th>Những ngày</th><th>Tình trạng</th>
              <th>Đã vi phạm</th><th>Lao động còn nợ</th><th></th>
            </tr></thead>
            <tbody>{rows.map((r) => <tr key={r.mshs} className={r.cam_den ? 'row-late' : ''}>
              <td><strong>{r.full_name}</strong><br /><small>{r.mshs}</small></td>
              <td><strong>{r.so_ngay}</strong></td>
              <td><small>{(r.cac_ngay ?? []).map((d) => `${TEN_THU[isoDow(d)]} ${dmy(d).slice(0, 5)}`).join(', ') || '—'}</small></td>
              <td>{r.cam_den
                ? <span className="badge danger" title={r.ly_do}>Tạm dừng đến {dmy(r.cam_den)}</span>
                : <span className="muted-text small">bình thường</span>}</td>
              <td>{r.so_lan_vi_pham > 0 ? <strong className="help-flag">{r.so_lan_vi_pham} lần</strong> : <span className="muted-text">0</span>}</td>
              <td>{r.lao_dong_con_no > 0 ? <strong className="help-flag">{r.lao_dong_con_no} lượt</strong> : <span className="muted-text">—</span>}</td>
              <td>{r.student_id
                ? <button className="button ghost" onClick={() => setGhiCho(r)}><ShieldAlert size={15} /> Ghi vi phạm</button>
                : <small className="muted-text">chưa có tài khoản</small>}</td>
            </tr>)}</tbody>
          </table></div></div>}
    </Collapsible>

    <ViolationLog classId={classId} className={className} phienBan={phienBan} msg={msg}
      teacherName={profile?.full_name || 'Giáo viên chủ nhiệm'}
      onChanged={() => setPhienBan((k) => k + 1)} setMsg={setMsg} />

    <Collapsible storageKey="tbdt-quy-dinh" defaultOpen={false} wrapper="section-block"
      icon={<ListChecks size={19} />} title="Quy định xử lý vi phạm thiết bị"
      subtitle="Học sinh thấy đúng bảng này trên trang của các em.">
      <DeviceRuleTable />
      <p className="muted-text small">
        Đang bị tạm dừng mà vi phạm tiếp thì lần cấm mới <strong>nối tiếp</strong> sau lần cũ. Gỡ cấm sớm thì
        lần vi phạm vẫn tính và lượt lao động vẫn còn; chỉ khi <strong>huỷ</strong> (ghi nhầm) thì lần đó mới
        không tính. Số lần đếm trong năm học của lớp.
      </p>
    </Collapsible>

    {ghiCho && <ViolationModal row={ghiCho} onClose={() => setGhiCho(null)}
      onDone={(kq) => {
        setGhiCho(null)
        setMsg(`✓ Đã ghi vi phạm lần ${kq.lan} cho ${ghiCho.full_name}: tạm dừng ${kq.thoi_gian} `
          + `(${dmy(kq.tu)} → ${dmy(kq.den)}), ${kq.lao_dong} lượt lao động`
          + (kq.moi_ph ? ', mời phụ huynh' : '')
          + (kq.huy_duyet ? `. Đã huỷ duyệt ${kq.huy_duyet} nhiệm vụ trong thời gian cấm.` : '.'))
        setPhienBan((k) => k + 1)
      }} />}
  </>
}

// ---------------------------------------------------------------------------
//  CÀI ĐẶT: số ngày tối đa / tuần, những thứ được dùng
// ---------------------------------------------------------------------------
function DeviceSettings({ classId, lich, onSaved }) {
  const [max, setMax] = useState('')               // '' = không giới hạn
  const [thu, setThu] = useState(null)             // null = mọi ngày
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!classId) return
    supabase.from('classes').select('device_days_per_week,device_weekdays').eq('id', classId).maybeSingle()
      .then(({ data }) => {
        setMax(data?.device_days_per_week != null ? String(data.device_days_per_week) : '')
        setThu(data?.device_weekdays ?? null)
      })
  }, [classId])

  // Chỉ cho chọn những thứ lớp có tự học — chọn thứ không có tiết nào thì vô nghĩa.
  const cacThu = lich.length ? lich : [1, 2, 3, 4, 5, 6, 7]
  const bat = (d) => {
    const cur = thu ?? cacThu
    const moi = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()
    // Bỏ hết thì không cho: mảng rỗng là "cấm thiết bị cả tuần", dễ bấm nhầm.
    if (moi.length === 0) return setMsg('Phải chọn ít nhất một thứ. Muốn không cho dùng thiết bị thì đặt số ngày tối đa thấp.')
    setMsg('')
    setThu(cacThu.every((x) => moi.includes(x)) ? null : moi)
  }

  const luu = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase.from('classes')
      .update({ device_days_per_week: max === '' ? null : Number(max), device_weekdays: thu })
      .eq('id', classId)
    setBusy(false)
    if (error) return setMsg('Không lưu được: ' + error.message)
    setMsg('✓ Đã lưu. Áp dụng cho các lần đăng ký từ bây giờ; buổi đã đăng ký trước đó giữ nguyên.')
    onSaved?.()
  }

  return <Collapsible storageKey="tbdt-cai-dat" defaultOpen wrapper="section-block"
    icon={<Settings2 size={19} />} title="Giới hạn dùng thiết bị"
    subtitle="Để giờ tự học còn những buổi không dùng thiết bị. Mặc định không giới hạn.">
    <div className="card sched-card">
      <div className="device-settings">
        <div>
          <label>Số ngày tối đa mỗi tuần</label>
          <select value={max} onChange={(e) => setMax(e.target.value)}>
            <option value="">Không giới hạn</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} ngày / tuần</option>)}
          </select>
        </div>
        <div>
          <label>Những thứ được dùng</label>
          <div className="weekday-picks">
            {cacThu.map((d) => <button key={d} type="button"
              className={`chip-btn ${(thu ?? cacThu).includes(d) ? 'on' : ''}`} onClick={() => bat(d)}>
              {TEN_THU[d]}</button>)}
          </div>
        </div>
        <button className="button primary" onClick={luu} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu giới hạn'}</button>
      </div>
      <p className="muted-text small">
        Nhiều nhiệm vụ dùng thiết bị trong <strong>cùng một ngày</strong> chỉ tính là một ngày. Buổi bị từ chối
        không tính. Học sinh thấy ngay giới hạn này khi đăng ký, và không bật được thiết bị khi đã dùng đủ.
      </p>
      {msg && <div className={msg.startsWith('✓') ? 'notice compact' : 'form-error'}>{msg}</div>}
    </div>
  </Collapsible>
}

// ---------------------------------------------------------------------------
//  GHI VI PHẠM
// ---------------------------------------------------------------------------
function ViolationModal({ row, onClose, onDone }) {
  const [kind, setKind] = useState('khong_dang_ky')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const lan = (row.so_lan_vi_pham ?? 0) + 1
  const muc = thangCho(lan)

  const ghi = async () => {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('record_device_violation',
      { p_student: row.student_id, p_kind: kind, p_note: note.trim() || null })
    setBusy(false)
    if (error) return setMsg('Không ghi được: ' + error.message)
    onDone(data)
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal small" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><span className="eyebrow">GHI VI PHẠM THIẾT BỊ</span>
        <h2>{row.full_name}</h2></div>
        <button className="icon-button" onClick={onClose}>✕</button></div>

      <div className="violation-form">
        <div className="quick-views">
          {Object.entries(LOAI_VI_PHAM).map(([k, nhan]) =>
            <button key={k} type="button" className={`chip-btn ${kind === k ? 'on' : ''}`}
              onClick={() => setKind(k)}>{nhan}</button>)}
        </div>
        <label>Ghi chú (không bắt buộc)
          <input maxLength={400} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: chơi game trong tiết 5" /></label>

        {/* Nói trước hậu quả, trước khi bấm. Ghi xong là em nhận thông báo ngay. */}
        <div className={`violation-preview ${muc.moiPh ? 'moi-ph' : ''}`}>
          Đây sẽ là <strong>lần {lan}</strong> của em. Hệ thống sẽ:
          <br />· tạm dừng dùng thiết bị <strong>{muc.cam}</strong>{row.cam_den ? ` (nối tiếp sau ngày ${dmy(row.cam_den)})` : ' kể từ hôm nay'};
          <br />· giao <strong>{muc.laoDong} lượt</strong> lao động công ích;
          {muc.moiPh && <><br />· đánh dấu <strong>mời phụ huynh</strong>;</>}
          <br />· huỷ duyệt các buổi thiết bị đã đăng ký trong thời gian cấm, và báo cho em.
        </div>
      </div>

      {msg && <div className="form-error">{msg}</div>}
      <div className="form-actions">
        <button className="button ghost" onClick={onClose}>Huỷ</button>
        <button className="button danger" onClick={ghi} disabled={busy}>{busy ? 'Đang ghi…' : `Ghi vi phạm lần ${lan}`}</button>
      </div>
    </div>
  </div>
}

// ---------------------------------------------------------------------------
//  SỔ VI PHẠM + LAO ĐỘNG CÔNG ÍCH
// ---------------------------------------------------------------------------
function ViolationLog({ classId, className, teacherName, phienBan, onChanged, msg, setMsg }) {
  const [rows, setRows] = useState([])
  const [nhap, setNhap] = useState({})
  const [loi, setLoi] = useState('')
  const [chiDangNo, setChiDangNo] = useState(false)
  const [thu, setThu] = useState(null)

  useEffect(() => {
    if (!classId) return
    supabase.rpc('class_device_violations', { p_class: classId }).then(({ data, error }) => {
      setLoi(error ? error.message : '')
      setRows(data ?? [])
      setNhap(Object.fromEntries((data ?? []).map((r) => [r.id, String(r.da_lam)])))
    })
  }, [classId, phienBan])

  const hom = todayISO()
  const tinhTrang = (r) => r.huy_luc ? 'Đã huỷ (ghi nhầm)'
    : r.go_luc && r.den >= hom ? 'Đã gỡ sớm'
    : r.den >= hom ? (r.tu > hom ? `Chờ tới ${dmy(r.tu)}` : 'Đang tạm dừng')
    : 'Đã hết hạn'

  const goi = async (ham, args, ok) => {
    const { error } = await supabase.rpc(ham, args)
    if (error) return setMsg('Không thực hiện được: ' + error.message)
    setMsg('✓ ' + ok); onChanged()
  }

  const hien = useMemo(() => rows.filter((r) => !chiDangNo || (!r.huy_luc && r.da_lam < r.lao_dong)), [rows, chiDangNo])
  const dangNo = rows.filter((r) => !r.huy_luc && r.da_lam < r.lao_dong).length

  return <>
    <Collapsible storageKey="tbdt-so-vi-pham" defaultOpen wrapper="section-block"
      icon={<HeartHandshake size={19} />} title={`Sổ vi phạm & lao động công ích — lớp ${className}`}
      badge={dangNo > 0 ? <span className="badge warning">{dangNo} lần còn nợ lao động</span> : null}
      subtitle="Mỗi lần vi phạm một dòng, lượt lao động tính riêng từng lần.">
      {/* Nhắc lại lời báo ngay tại sổ: bấm Lưu ở cuối trang mà lời báo nằm tận
          đầu trang thì thầy cô không thấy gì, tưởng chưa lưu. */}
      {msg && <div className={msg.startsWith('✓') ? 'notice compact' : 'form-error'}>{msg}</div>}
      {loi
        ? <div className="form-error">Không tải được sổ vi phạm.<br /><small>Chi tiết: {loi}</small></div>
        : rows.length === 0
        ? <div className="empty-state"><p>✓ Lớp chưa có lần vi phạm thiết bị nào.</p></div>
        : <>
            <div className="quick-views">
              <button type="button" className={`chip-btn ${chiDangNo ? '' : 'on'}`} onClick={() => setChiDangNo(false)}>Tất cả <b>{rows.length}</b></button>
              <button type="button" className={`chip-btn ${chiDangNo ? 'on' : ''}`} onClick={() => setChiDangNo(true)}>Còn nợ lao động <b>{dangNo}</b></button>
            </div>
            <div className="card table-card"><div className="table-wrap"><table className="book-table">
              <thead><tr>
                <th>Học sinh</th><th>Lần</th><th>Lý do</th><th>Tạm dừng</th>
                <th>Lao động đã làm</th><th>Phụ huynh</th><th></th>
              </tr></thead>
              <tbody>{hien.map((r) => <tr key={r.id} className={r.huy_luc ? 'row-cancelled' : r.moi_ph ? 'row-late' : ''}>
                <td><strong>{r.full_name}</strong><br /><small>{r.mshs} · ghi {dmy(r.ghi_luc)}</small></td>
                <td><span className={`badge ${r.lan >= 3 ? 'danger' : 'warning'}`}>Lần {r.lan}</span></td>
                <td><small>{r.ly_do}</small></td>
                <td><small>{dmy(r.tu)} → {dmy(r.den)}<br /><em>{tinhTrang(r)}</em></small></td>
                <td>{r.huy_luc ? '—' : <span className="luot-o">
                  <input type="number" min="0" max={r.lao_dong} value={nhap[r.id] ?? ''}
                    onChange={(e) => setNhap({ ...nhap, [r.id]: e.target.value })} />
                  <span className="muted-text">/ {r.lao_dong}</span>
                  <button className="button ghost" onClick={() => {
                    const n = Number(nhap[r.id])
                    if (!Number.isInteger(n) || n < 0 || n > r.lao_dong) return setMsg(`Số lượt phải từ 0 đến ${r.lao_dong}.`)
                    goi('set_device_labor_done', { p_ban: r.id, p_done: n }, `${r.full_name}: lần ${r.lan} đã làm ${n}/${r.lao_dong} lượt.`)
                  }}>Lưu</button>
                </span>}</td>
                <td>{r.huy_luc ? '—' : r.moi_ph
                  ? (r.da_bao_ph
                      ? <small>Đã báo {dmy(r.da_bao_ph)}</small>
                      : <button className="button ghost" onClick={() => setThu(r)}>Soạn thư mời</button>)
                  : <span className="muted-text small">không cần</span>}</td>
                <td>{!r.huy_luc && <span className="button-row">
                  {!r.go_luc && r.den >= hom && <button className="button ghost" onClick={() => {
                    if (window.confirm(`Gỡ tạm dừng cho ${r.full_name}? Em dùng thiết bị lại được ngay; lần vi phạm và lượt lao động vẫn giữ.`))
                      goi('lift_device_ban', { p_ban: r.id }, `Đã gỡ tạm dừng cho ${r.full_name}.`)
                  }}>Gỡ cấm</button>}
                  <button className="button ghost danger" onClick={() => {
                    if (window.confirm(`Huỷ lần ${r.lan} của ${r.full_name} vì ghi nhầm? Lần này sẽ không tính và không còn nợ lao động.`))
                      goi('cancel_device_violation', { p_ban: r.id }, `Đã huỷ lần ${r.lan} của ${r.full_name}.`)
                  }}>Huỷ (ghi nhầm)</button>
                </span>}</td>
              </tr>)}</tbody>
            </table></div></div>
          </>}
    </Collapsible>
    {thu && <ParentLetter r={thu} className={className} teacherName={teacherName}
      onClose={() => setThu(null)}
      onSent={() => { setThu(null); goi('mark_device_parent_notified', { p_ban: thu.id }, `Đã ghi nhận báo phụ huynh của ${thu.full_name}.`) }} />}
  </>
}

// Thư mời phụ huynh — soạn sẵn, thầy cô sửa rồi tự bấm Gửi trong Outlook. Hệ
// thống KHÔNG gửi hộ (cùng lý do với thư kỷ luật cũ, xem disciplineLetter.js).
function ParentLetter({ r, className, teacherName, onClose, onSent }) {
  const [tieuDe, setTieuDe] = useState(`[${className}] Mời Quý phụ huynh em ${r.full_name} trao đổi về việc sử dụng thiết bị điện tử`)
  const [noiDung, setNoiDung] = useState([
    `Kính gửi Quý phụ huynh em ${r.full_name} — lớp ${className},`,
    '',
    `Tôi là ${teacherName}, giáo viên chủ nhiệm lớp ${className}.`,
    '',
    'Trong giờ tự học, học sinh chỉ được dùng thiết bị điện tử khi đã đăng ký trước và được giáo viên duyệt, và chỉ dùng đúng mục đích đã đăng ký.',
    `Năm học này em ${r.full_name} đã vi phạm quy định đó ${r.lan} lần. Lần gần nhất (${dmy(r.ghi_luc)}): ${r.ly_do}.`,
    '',
    'Quy định xử lý của lớp (mỗi lần xử lý riêng):',
    ...THANG_VI_PHAM.map((x) => `  · ${x.khi}: tạm dừng dùng thiết bị ${x.cam} + ${x.laoDong} lượt lao động công ích${x.moiPh ? ' + mời phụ huynh' : ''}`),
    '',
    `Hiện em tạm dừng dùng thiết bị từ ${dmy(r.tu)} đến hết ${dmy(r.den)} và cần thực hiện ${r.lao_dong} lượt lao động công ích.`,
    '',
    'Kính mong Quý phụ huynh sắp xếp thời gian trao đổi trực tiếp với giáo viên chủ nhiệm để cùng hỗ trợ em sử dụng thiết bị đúng mục đích.',
    '',
    'Trân trọng cảm ơn Quý phụ huynh.',
    '',
    teacherName,
    `Giáo viên chủ nhiệm lớp ${className}`,
  ].join('\n'))
  const [daMo, setDaMo] = useState(false)
  const [msg, setMsg] = useState('')
  const goi = { to: [parentEmail(r.mshs)], cc: [studentEmail(r.mshs)], subject: tieuDe, body: noiDung }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><span className="eyebrow">THƯ MỜI PHỤ HUYNH</span>
        <h2>{r.full_name} — vi phạm lần {r.lan}</h2></div>
        <button className="icon-button" onClick={onClose}>✕</button></div>
      {msg && <div className="notice">{msg}</div>}
      <div className="detail-box"><strong>Người nhận</strong>
        <p>{goi.to.join('; ')}<br /><small>Cc: {goi.cc.join('; ')}</small></p></div>
      <label>Tiêu đề<input value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} /></label>
      <label className="letter-body">Nội dung — sửa được trước khi gửi
        <textarea rows={14} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} /></label>
      <p className="muted-text letter-note">Hệ thống <strong>không tự gửi thư</strong>. Nút dưới mở Outlook trên web với nội dung điền sẵn.</p>
      <div className="button-row letter-actions">
        <button className="button primary" onClick={() => { window.open(outlookWebUrl(goi), '_blank', 'noopener,noreferrer'); setDaMo(true) }}>
          <ExternalLink size={16} /> Mở Outlook trên web</button>
        <button className="button ghost" onClick={async () => {
          try { await navigator.clipboard.writeText(`${tieuDe}\n\n${noiDung}`); setMsg('✓ Đã sao chép tiêu đề và nội dung.') }
          catch { setMsg('Trình duyệt không cho sao chép. Thầy cô bôi đen nội dung rồi Ctrl+C giúp.') }
        }}><Copy size={16} /> Sao chép</button>
        <button className="button ghost" onClick={() => setDaMo(true)}>Đã báo cách khác</button>
      </div>
      {daMo && <div className="notice letter-confirm">
        Sau khi đã gửi thư (hoặc đã gọi điện), ghi lại vào sổ:
        <div className="form-actions">
          <button className="button ghost" onClick={onClose}>Chưa báo</button>
          <button className="button primary" onClick={onSent}>Đã báo phụ huynh — ghi vào sổ</button>
        </div>
      </div>}
    </div>
  </div>
}
