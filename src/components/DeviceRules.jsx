import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
//  THIẾT BỊ ĐIỆN TỬ (TBĐT) — luật, thang xử lý, thẻ của học sinh
// ---------------------------------------------------------------------------
// Thang này CHỈ để hiển thị. Hàm quyết định thật là device_penalty() trong
// supabase/schema-17-vi-pham-tbdt.sql — đổi thang thì sửa cả hai, và
// scripts/thu-tbdt.mjs sẽ báo nếu bên CSDL lệch.
export const THANG_VI_PHAM = [
  { lan: 1, khi: 'Lần 1', cam: '1 tuần', laoDong: 5 },
  { lan: 2, khi: 'Lần 2', cam: '2 tuần', laoDong: 10 },
  { lan: 3, khi: 'Lần 3', cam: '1 tháng', laoDong: 20 },
  { lan: 4, khi: 'Từ lần 4', cam: '1 tháng', laoDong: 20, moiPh: true },
]

export const LOAI_VI_PHAM = {
  khong_dang_ky: 'Không đăng ký mà tự ý dùng',
  sai_muc_dich: 'Dùng sai mục đích',
}

export const TEN_THU = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
export const dmy = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—')

// Một dòng tóm tắt hạn mức tuần, dùng chung cho thẻ trang chủ và form đăng ký.
// Form đăng ký hỏi theo NGÀY ĐANG CHỌN, có thể là tuần sau — khi đó ghi rõ
// tuần nào, đừng nói "tuần này" rồi đưa con số của tuần khác.
export function hanMucText(q, tuanNay = true) {
  if (!q) return ''
  const tuan = tuanNay ? 'Tuần này' : `Tuần ${dmy(q.tuan_tu).slice(0, 5)}–${dmy(q.tuan_den).slice(0, 5)}`
  const ngay = q.gioi_han != null
    ? `${tuan} em đã dùng ${q.da_dung}/${q.gioi_han} ngày`
    : `${tuan} em đã dùng ${q.da_dung} ngày (lớp không giới hạn số ngày)`
  const thu = q.thu_duoc_dung?.length
    ? ` · chỉ được dùng ${q.thu_duoc_dung.map((d) => TEN_THU[d]).join(', ')}`
    : ''
  return ngay + thu + '.'
}

// Bảng thang xử lý. `lan` = số lần em ĐÃ vi phạm, để tô dòng em đang ở.
export function DeviceRuleTable({ lan = 0 }) {
  return <div className="rule-table">
    <span className="rule-caption">Vi phạm quy định thiết bị điện tử — mỗi lần xử lý riêng, không cộng dồn</span>
    {THANG_VI_PHAM.map((r) => {
      const dangO = r.moiPh ? lan >= r.lan : lan === r.lan
      return <div key={r.lan} className={`rule-row ${dangO ? 'now' : ''}`}>
        <span>{r.khi}</span>
        <strong>Cấm dùng thiết bị {r.cam} + {r.laoDong} lượt lao động công ích{r.moiPh ? ' + mời phụ huynh' : ''}</strong>
        {dangO && <em>em đang ở mức này</em>}
      </div>
    })}
    <div className="rule-row muted-row">
      <span>Tính là vi phạm</span>
      <strong>Không đăng ký mà tự ý dùng thiết bị, hoặc dùng sai mục đích đã đăng ký.</strong>
    </div>
  </div>
}

// ---------------------------------------------------------------------------
//  THẺ THƯỜNG TRỰC TRÊN TRANG CHỦ HỌC SINH
// ---------------------------------------------------------------------------
// Luôn hiện, kể cả khi em chưa vi phạm lần nào: đăng ký giờ đây CHỈ bắt buộc
// khi dùng thiết bị, nên đây là chỗ em biết mình còn được dùng mấy ngày.
export function MyDevice({ reloadKey }) {
  const { profile } = useAuth()
  const [q, setQ] = useState(null)
  const [lanList, setLanList] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'student') return
    supabase.rpc('my_device_quota').then(({ data }) => setQ(data ?? null))
    // RLS chỉ cho em đọc dòng của chính mình.
    supabase.from('device_bans')
      .select('id,lan,kind,reason,starts_on,ends_on,labor_required,labor_done,parent_invite,lifted_at,created_at')
      .eq('student_id', profile.id).is('cancelled_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLanList(data ?? []))
  }, [profile?.id, reloadKey])

  if (!q) return null
  const lan = q.so_lan_vi_pham ?? 0
  const tone = q.cam_den ? 'danger' : lan > 0 ? 'warn' : 'ok'

  return <section className={`card attend-card device-card tone-${tone}`}>
    <button type="button" className="attend-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="attend-count"><strong>{lan}</strong><small>lần vi phạm</small></span>
      <span className="attend-main">
        <span className="eyebrow">THIẾT BỊ ĐIỆN TỬ · TUẦN NÀY</span>
        <strong>{q.cam_den
          ? `Em đang bị tạm dừng dùng thiết bị đến hết ${dmy(q.cam_den)}`
          : hanMucText(q)}</strong>
        <small>{q.cam_den
          ? `Lý do: ${q.ly_do_cam}. Em vẫn tự học bình thường, chỉ không đăng ký dùng thiết bị được.`
          : 'Không dùng thiết bị thì không bắt buộc đăng ký. Cần dùng thì đăng ký trước và chờ thầy cô duyệt.'}</small>
      </span>
      <ChevronDown size={20} className={`chev ${open ? 'up' : ''}`} />
    </button>
    {q.lao_dong_con_no > 0 && <div className="labor-strip">
      <span className="labor-num"><strong>{q.lao_dong_con_no}</strong><small>lượt còn nợ</small></span>
      <span className="labor-text">
        <strong>Lao động công ích do vi phạm thiết bị</strong>
        <small>Mỗi lần vi phạm có số lượt riêng — mở ra để xem từng lần.
          {lanList.some((x) => x.parent_invite) && ' Thầy cô sẽ trao đổi với phụ huynh của em.'}</small>
      </span>
    </div>}
    {open && <div className="attend-body">
      <DeviceRuleTable lan={lan} />
      {lanList.length > 0 && <ul className="device-history">
        {lanList.map((x) => <li key={x.id}>
          <strong>Lần {x.lan}</strong> · {dmy(x.created_at)} — {x.reason}
          <small>Cấm {dmy(x.starts_on)} → {dmy(x.ends_on)}{x.lifted_at ? ' (đã được gỡ sớm)' : ''}
            {' · '}lao động {x.labor_done}/{x.labor_required} lượt
            {x.parent_invite ? ' · mời phụ huynh' : ''}</small>
        </li>)}
      </ul>}
      <p className="muted-text small">
        Nhiệm vụ <strong>được duyệt</strong> dùng thiết bị phải kèm <strong>ít nhất một minh chứng</strong> (ảnh, tệp hoặc
        liên kết) khi cập nhật kết quả. Thấy bị ghi nhầm thì nhắn thầy cô để kiểm tra lại.
      </p>
    </div>}
  </section>
}
