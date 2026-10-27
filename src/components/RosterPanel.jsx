import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FlaskConical, History, KeyRound, MessageSquare, RotateCcw, Search, UserMinus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/date'
import { LOAD_WINDOWS } from '../lib/query'
import { ratingTone } from './RatingStars'
import Avatar from './Avatar'
import StudentImport from './StudentImport'

const PAGE = 25

// Một danh sách chung cho tiến độ tự học, tài khoản và quản lý ghi danh.
export default function RosterPanel({ classId, className, yearName, studentStats = [], statsLoading = false,
  refreshKey = 0, windowDays = 60, onWindowChange, onOpenStudent, onChat, onResetPassword, onChanged }) {
  const [roster, setRoster] = useState([])
  const [batches, setBatches] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [marking, setMarking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [removed, setRemoved] = useState([])
  const [showRemoved, setShowRemoved] = useState(false)
  const [restoring, setRestoring] = useState(null)

  const load = async () => {
    if (!classId) return
    setLoading(true)
    const [r, b, inactive] = await Promise.all([
      supabase.rpc('class_roster', { p_class: classId }),
      supabase.from('student_import_batches')
        .select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(10),
      supabase.rpc('class_removed_students', { p_class: classId }),
    ])
    if (r.error || b.error || inactive.error) {
      setMsg('Không tải đầy đủ được danh sách lớp. Thầy/cô thử tải lại nhé.')
      setLoading(false)
      return
    }
    setRoster(r.data ?? []); setBatches(b.data ?? [])
    setRemoved(inactive.data ?? [])
    setLoading(false)
  }
  useEffect(() => { setSelected(new Set()); load() }, [classId, refreshKey])
  useEffect(() => { setPage(1); setSelected(new Set()) }, [search])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((r) => `${r.full_name} ${r.mshs}`.toLowerCase().includes(q))
  }, [roster, search])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE))
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE)
  useEffect(() => { setPage((n) => Math.min(n, totalPages)) }, [totalPages])
  const stats = new Map(studentStats.map((r) => [r.mshs, r]))
  const targetFor = (r) => ({ ...stats.get(r.mshs), id: r.user_id, mshs: r.mshs,
    name: r.full_name, hasAccount: Boolean(r.user_id) })
  const selectedRows = rows.filter((r) => r.user_id && selected.has(r.mshs)).map(targetFor)
  const selectablePage = pageRows.filter((r) => r.user_id)
  const toggle = (mshs) => setSelected((prev) => {
    const next = new Set(prev); next.has(mshs) ? next.delete(mshs) : next.add(mshs); return next
  })
  const togglePage = () => setSelected((prev) => {
    const next = new Set(prev)
    const all = selectablePage.every((r) => next.has(r.mshs))
    selectablePage.forEach((r) => all ? next.delete(r.mshs) : next.add(r.mshs))
    return next
  })
  // Sĩ số thật không tính tài khoản thử nghiệm — con số này thầy cô hay đối
  // chiếu với sổ điểm danh, lệch một em là phải đi tìm. "Đã tạo tài khoản"
  // cũng phải đếm trên cùng tập đó, không thì ra "31 học sinh · 32 đã tạo".
  const that = roster.filter((r) => !r.is_test)
  const soThat = that.length
  const soThu = roster.length - soThat
  const claimed = that.filter((r) => r.user_id).length
  const mustChange = that.filter((r) => r.must_change_password).length

  const changed = () => { setSelected(new Set()); load(); onChanged?.() }

  const remove = async (r) => {
    const { error } = await supabase.rpc('remove_from_class', { p_class: classId, p_mshs: r.mshs })
    setRemoving(null)
    if (error) return setMsg('Không chuyển được: ' + error.message)
    setMsg(`✓ Đã chuyển ${r.full_name} khỏi lớp. Tài khoản và lịch sử của em vẫn được giữ.`)
    setShowRemoved(true)
    changed()
  }

  const restore = async (r) => {
    setRestoring(r.mshs); setMsg('')
    const { error } = await supabase.rpc('restore_to_class', { p_class: classId, p_mshs: r.mshs })
    setRestoring(null)
    if (error) return setMsg('Không khôi phục được: ' + error.message)
    setMsg(`✓ Đã đưa ${r.full_name} trở lại lớp. Tài khoản và lịch sử tự học được giữ nguyên.`)
    changed()
  }

  const markTest = async (r, on) => {
    const { error } = await supabase.rpc('set_test_account',
      { p_class: classId, p_mshs: r.mshs, p_is_test: on })
    setMarking(null)
    if (error) return setMsg('Không đổi được: ' + error.message)
    setMsg(on
      ? `✓ Đã đánh dấu ${r.full_name} là tài khoản thử nghiệm. Em này sẽ không còn hiện ở danh sách chưa đăng ký và bảng kỷ luật.`
      : `✓ ${r.full_name} trở lại là học sinh bình thường, được theo dõi như các bạn.`)
    changed()
  }

  const exportCsv = () => {
    const lines = [['MSHS', 'Họ và tên', 'Tình trạng tài khoản', 'Tổng nhiệm vụ trong lớp', 'Hoạt động gần nhất',
      'Nhiệm vụ trong khoảng đang xem', 'Đúng hạn', 'Điểm TB', 'Chưa cập nhật', 'Cần hỗ trợ'].join(',')]
    // Bỏ tài khoản thử nghiệm: file này thầy cô in ra, gửi đi, đối chiếu sổ —
    // một cái tên giả trong đó là lỗi chứ không phải thông tin.
    rows.filter((r) => !r.is_test).forEach((r) => lines.push([
      r.mshs, r.full_name,
      r.user_id ? (r.must_change_password ? 'Chờ đổi mật khẩu' : 'Đã kích hoạt') : 'Chưa đăng ký',
      r.so_nhiem_vu, r.hoat_dong_gan_nhat ?? '',
      stats.get(r.mshs)?.total ?? '', stats.get(r.mshs)?.ontime ?? '', stats.get(r.mshs)?.avg ?? '',
      stats.get(r.mshs)?.pending ?? '', stats.get(r.mshs)?.help ?? '',
    ].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')))
    // ﻿ để Excel nhận ra UTF-8, nếu không tên tiếng Việt sẽ thành ký tự lạ.
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `danh-sach-${className}-${yearName}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!classId) return <section className="card empty-state">
    <p>Thầy/cô chưa được phân công lớp nào trong năm học này.</p>
  </section>

  return <>
    <section className="card roster-card">
      <div className="section-title">
        <div>
          <h2><Users size={19} /> Danh sách lớp {className}</h2>
          <p>{soThat} học sinh · {claimed} đã tạo tài khoản
            {soThu > 0 && <> · {soThu} tài khoản thử nghiệm</>} · Năm học {yearName}
            {mustChange > 0 && <> · {mustChange} chờ đổi mật khẩu</>}</p>
        </div>
        <div className="button-row">
          <button className="button ghost" onClick={() => setShowRemoved((v) => !v)} aria-expanded={showRemoved}>
            <RotateCcw size={17} /> Đã chuyển khỏi lớp ({removed.length})</button>
          <button className="button ghost" onClick={exportCsv} disabled={!rows.length}>
            <Download size={17} /> Xuất CSV</button>
          <button className="button primary" onClick={() => setImporting(true)}>
            <FileSpreadsheet size={17} /> Nhập danh sách từ Excel</button>
        </div>
      </div>

      {msg && <div className={msg.startsWith('✓') ? 'notice' : 'form-error'}>{msg}</div>}
      {showRemoved && <div className="detail-box">
        <h3>Khôi phục học sinh đã chuyển khỏi lớp</h3>
        <p className="muted-text small">Chọn đúng học sinh để đưa trở lại lớp. Tài khoản và lịch sử tự học vẫn được giữ.</p>
        {removed.length === 0 ? <p>Không có học sinh nào đã chuyển khỏi lớp.</p>
          : <ul className="restore-list">{removed.map((r) => <li key={r.mshs}>
            <span><strong>{r.full_name}</strong><small>MSHS {r.mshs}</small></span>
            <button className="button ghost" disabled={Boolean(restoring)} onClick={() => restore(r)}>
              <RotateCcw size={16} /> {restoring === r.mshs ? 'Đang khôi phục…' : 'Khôi phục vào lớp'}</button>
          </li>)}</ul>}
      </div>}

      {roster.length === 0 && !loading
        ? <div className="empty-state">
            <p>Lớp chưa có học sinh. Thầy cô tải file mẫu, điền danh sách rồi nhập vào hệ thống để bắt đầu.</p>
            <button className="button primary" onClick={() => setImporting(true)}>
              <FileSpreadsheet size={17} /> Nhập danh sách học sinh</button>
          </div>
        : <>
            <div className="roster-tools">
              <div className="search-box"><Search size={17} />
                <input aria-label="Tìm học sinh" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoặc MSHS…" /></div>
              {onWindowChange && <select aria-label="Khoảng dữ liệu tự học" value={windowDays} onChange={(e) => onWindowChange(Number(e.target.value))}>
                {LOAD_WINDOWS.map(([d, label]) => <option key={d} value={d}>Tự học: {label}</option>)}
              </select>}
            </div>
            <div className="bulk-bar roster-passwords">
              <div><strong>{selectedRows.length}</strong> học sinh được chọn
                <small className="muted-text"> · Giáo viên phụ trách lớp có thể cấp mật khẩu tạm cho học sinh đã tạo tài khoản.</small></div>
              <button className="button primary" disabled={selectedRows.length === 0 || !onResetPassword || loading || statsLoading}
                onClick={() => onResetPassword(selectedRows)}>
                <KeyRound size={17} /> Đặt lại mật khẩu {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}</button>
            </div>
            <p className="muted-text small">Số liệu tự học theo khoảng đang xem. Bấm tên học sinh để xem hồ sơ, kết quả và minh chứng.</p>

            {loading || statsLoading ? <div className="empty-state">Đang tải…</div>
              : <div className="table-wrap"><table>
                  <thead><tr><th className="pick"><input type="checkbox" aria-label="Chọn học sinh có tài khoản trên trang này"
                    disabled={selectablePage.length === 0} onChange={togglePage}
                    checked={selectablePage.length > 0 && selectablePage.every((r) => selected.has(r.mshs))}
                    ref={(el) => { if (el) { const n = selectablePage.filter((r) => selected.has(r.mshs)).length
                      el.indeterminate = n > 0 && n < selectablePage.length } }} /></th>
                    <th>Học sinh</th><th>Tài khoản</th><th>Kế hoạch</th><th>Đúng hạn</th><th>Điểm TB</th>
                    <th>Chưa cập nhật</th><th>Cần hỗ trợ</th><th>Hoạt động gần nhất</th><th>Thao tác</th></tr></thead>
                  <tbody>{pageRows.map((r) => { const s = stats.get(r.mshs); return <tr key={r.mshs} className={selected.has(r.mshs) ? 'picked' : ''}>
                    <td className="pick"><input type="checkbox" aria-label={`Chọn ${r.full_name}`} disabled={!r.user_id}
                      checked={selected.has(r.mshs)} onChange={() => toggle(r.mshs)} /></td>
                    <td><span className="cell-with-avatar">
                      <Avatar name={r.full_name} path={r.avatar_path} size={30} />
                      <span>{r.user_id && onOpenStudent
                        ? <button className="link-button name-link" onClick={() => onOpenStudent(targetFor(r))}>{r.full_name}</button>
                        : <strong>{r.full_name}</strong>}
                        <small>{r.mshs}{s?.isTa ? ' · TA' : ''}</small>
                        {r.is_test && <> <span className="chip test">Thử nghiệm</span></>}</span></span></td>
                    <td>{r.user_id
                      ? (r.must_change_password
                        ? <span className="chip off">Chờ đổi mật khẩu</span>
                        : <span className="chip on">Đã kích hoạt</span>)
                      : <span className="chip off">Chưa đăng ký</span>}</td>
                    <td>{s?.total ?? '—'}</td>
                    <td>{s?.total ? `${Math.round(s.ontime / s.total * 100)}%` : '—'}</td>
                    <td>{s?.avg != null ? <span className={ratingTone(Math.round(s.avg))}>{s.avg.toFixed(1)}{s.low > 0 ? ` (${s.low}⚠)` : ''}</span> : '—'}</td>
                    <td>{s?.pending > 0 ? <strong className="help-flag">{s.pending}</strong> : '—'}</td>
                    <td>{s?.help > 0 ? <strong className="help-flag">{s.help}</strong> : '—'}</td>
                    <td><small>{r.hoat_dong_gan_nhat ? formatDate(r.hoat_dong_gan_nhat) : '—'}</small></td>
                    <td><span className="row-actions">
                      <button className="button ghost" disabled={!r.user_id || !onResetPassword}
                        title={r.user_id ? 'Cấp mật khẩu tạm; học sinh phải tự đổi khi đăng nhập' : 'Học sinh cần tạo tài khoản trước'}
                        onClick={() => onResetPassword([targetFor(r)])}><KeyRound size={16} /> Đặt lại mật khẩu</button>
                      <button className="icon-button" title="Nhắn tin" aria-label={`Nhắn tin với ${r.full_name}`}
                        disabled={!r.user_id || !onChat} onClick={() => onChat(r.user_id, r.full_name)}><MessageSquare size={16} /></button>
                      <button className={`icon-button${r.is_test ? ' on' : ''}`}
                              title={r.is_test
                                ? 'Bỏ đánh dấu thử nghiệm — theo dõi em như bình thường'
                                : 'Đánh dấu là tài khoản thử nghiệm'}
                              onClick={() => setMarking(r)}><FlaskConical size={16} /></button>
                      <button className="icon-button danger" title="Chuyển khỏi lớp"
                              onClick={() => setRemoving(r)}><UserMinus size={16} /></button>
                    </span></td>
                  </tr> })}</tbody>
                </table>{rows.length === 0 && <div className="empty-state">Không tìm thấy học sinh nào.</div>}</div>}

            {rows.length > PAGE && <div className="pager">
              <button className="button ghost" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>← Trước</button>
              {/* "dòng" chứ không phải "học sinh": bảng này có thể kèm tài khoản
                  thử nghiệm, mà tiêu đề ở trên lại đếm sĩ số thật — hai con số
                  khác nhau cùng gọi là "học sinh" thì thầy cô tưởng đếm sai. */}
              <span>Trang <strong>{page}</strong> / {totalPages} · {rows.length} dòng</span>
              <button className="button ghost" disabled={page === totalPages} onClick={() => setPage((n) => n + 1)}>Sau →</button>
            </div>}
          </>}
    </section>

    {batches.length > 0 && <section className="card">
      <div className="section-title"><div>
        <h2><History size={19} /> Lịch sử nhập danh sách</h2>
        <p>Dùng để đối chiếu khi nhập nhầm file.</p>
      </div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Thời điểm</th><th>File</th><th>Tổng</th><th>Mới</th><th>Thêm vào lớp</th><th>Bỏ qua</th></tr></thead>
        <tbody>{batches.map((b) => <tr key={b.id}>
          <td><small>{new Date(b.created_at).toLocaleString('vi-VN')}</small></td>
          <td><small>{b.filename ?? '—'}</small></td>
          <td>{b.total_rows}</td><td>{b.inserted_students}</td>
          <td>{b.linked_students}</td>
          <td>{b.skipped_rows > 0 ? <strong className="help-flag">{b.skipped_rows}</strong> : '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}

    {importing && <StudentImport classId={classId} className={className} yearName={yearName}
      onClose={() => setImporting(false)} onDone={changed} />}

    {marking && <div className="modal-backdrop" onMouseDown={() => setMarking(null)}>
      <div className="modal small" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">XÁC NHẬN</span>
          <h2>{marking.is_test
            ? `${marking.full_name} trở lại là học sinh thật?`
            : `Đánh dấu ${marking.full_name} là tài khoản thử nghiệm?`}</h2></div>
          <button className="icon-button" onClick={() => setMarking(null)}>✕</button></div>
        {marking.is_test
          ? <p className="muted-text">
              Em sẽ được theo dõi trở lại như các bạn: hiện ở <strong>danh sách chưa đăng ký</strong>,
              được ghi sổ quên và tính bậc kỷ luật. Những lần quên cũ đã bị xoá thì không lấy lại được.
            </p>
          : <>
              <p className="muted-text">
                Dùng cho tài khoản giả mà thầy cô tạo để xem thử giao diện học sinh. Sau khi đánh dấu,
                em này <strong>không còn hiện ở danh sách chưa đăng ký, sổ quên, bảng kỷ luật</strong> và
                bảng của bạn được giao nhắc nhở. Nhiệm vụ và bài chia sẻ sách vẫn hiện bình thường
                để thầy cô còn thử được.
              </p>
              {/* Cảnh báo thật, không phải câu lịch sự: hàm này xoá dữ liệu. */}
              <p className="form-error">
                Thao tác này <strong>xoá toàn bộ những lần quên đăng ký đã ghi</strong> cho em.
                Chỉ dùng cho tài khoản giả — đừng dùng để xoá kỷ luật của một học sinh thật.
              </p>
            </>}
        <div className="form-actions">
          <button className="button ghost" onClick={() => setMarking(null)}>Hủy</button>
          <button className={marking.is_test ? 'button primary' : 'button danger'}
                  onClick={() => markTest(marking, !marking.is_test)}>
            {marking.is_test ? 'Bỏ đánh dấu' : 'Đánh dấu thử nghiệm'}</button>
        </div>
      </div>
    </div>}

    {removing && <div className="modal-backdrop" onMouseDown={() => setRemoving(null)}>
      <div className="modal small" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">XÁC NHẬN</span>
          <h2>Chuyển {removing.full_name} khỏi lớp {className}?</h2></div>
          <button className="icon-button" onClick={() => setRemoving(null)}>✕</button></div>
        <p className="muted-text">
          Em sẽ không còn trong danh sách lớp này. <strong>Tài khoản, ảnh đại diện và toàn bộ lịch sử
          tự học của em vẫn được giữ nguyên</strong> — đây không phải là xóa học sinh khỏi hệ thống.
        </p>
        <div className="form-actions">
          <button className="button ghost" onClick={() => setRemoving(null)}>Hủy</button>
          <button className="button danger" onClick={() => remove(removing)}>Chuyển khỏi lớp</button>
        </div>
      </div>
    </div>}
  </>
}
