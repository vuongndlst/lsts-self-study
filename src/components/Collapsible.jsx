import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Khối có thể thu gọn / mở rộng, dùng chung cho những mục dài trên dashboard.
//
// Nhớ lựa chọn của người dùng theo `storageKey`: thầy cô thu gọn "Miễn buổi tự
// học" xong, lần sau vào vẫn thấy nó gọn. Không nhớ thì mỗi lần mở trang lại
// phải thu lại — thà đừng làm nút còn hơn.
//
// localStorage có thể ném lỗi (chế độ riêng tư, trình duyệt chặn lưu), nên mọi
// lần đọc/ghi đều bọc try/catch và rơi về `defaultOpen`.
const doc = (key, fallback) => {
  if (!key) return fallback
  try {
    const v = localStorage.getItem('selfstudy.open.' + key)
    return v === null ? fallback : v === '1'
  } catch { return fallback }
}
const ghi = (key, open) => {
  if (!key) return
  try { localStorage.setItem('selfstudy.open.' + key, open ? '1' : '0') } catch {}
}

export default function Collapsible({
  icon, title, subtitle, storageKey, defaultOpen = true,
  badge, wrapper = 'card sched-card', children,
}) {
  const [open, setOpen] = useState(() => doc(storageKey, defaultOpen))
  useEffect(() => { ghi(storageKey, open) }, [storageKey, open])

  return <section className={`${wrapper} collapsible ${open ? 'open' : 'shut'}`}>
    <button type="button" className="collapse-head" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="collapse-main">
        <span className="collapse-title">{icon}{title}</span>
        {/* Mô tả chỉ có nghĩa khi đang mở. Thu gọn rồi mà vẫn để hai dòng giải
            thích thì chẳng gọn hơn bao nhiêu. */}
        {open && subtitle && <span className="collapse-sub">{subtitle}</span>}
      </span>
      <span className="collapse-right">
        {badge}
        <span className="collapse-hint">{open ? 'Thu gọn' : 'Mở rộng'}</span>
        <ChevronDown size={20} className={`chev ${open ? 'up' : ''}`} />
      </span>
    </button>
    {open && <div className="collapse-body">{children}</div>}
  </section>
}
