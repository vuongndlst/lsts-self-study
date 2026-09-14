import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, FileText, Film, Loader2, Subtitles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import taiLieu from '../data/tai-lieu.json'

// Video và tài liệu PDF của một bộ hướng dẫn ("hocSinh" hoặc "giaoVien").
//
// Hai bộ lấy tệp từ hai nơi khác nhau:
//
//   Bản HỌC SINH  — công khai trong public/, trỏ thẳng vào tệp.
//   Bản GIÁO VIÊN — nằm trong bucket riêng tư trên Supabase. Ở đây xin một
//       đường dẫn ký hạn ngắn; Supabase chỉ cấp cho ai thật sự là giáo viên
//       (chính sách trong supabase/schema-15-tai-lieu-gv.sql). Học sinh gọi
//       hàm này cũng chỉ nhận về lỗi, không phải chỉ là không thấy nút.
//
// Dữ liệu (tên tệp, số trang, dung lượng, mốc từng phần) do
// scripts/gom-tai-lieu.mjs sinh ra khi build, không viết tay — viết tay thì
// quay lại video xong là mọi con số sai hết mà không ai biết.

// base:'./' trong vite.config nên BASE_URL là '/' khi chạy ở gốc và là đường
// dẫn kho khi chạy trên GitHub Pages. Cứ nối vào là đúng cả hai nơi.
const goc = `${import.meta.env.BASE_URL}tai-lieu/`

// Hai giờ. Đường dẫn ký hạn là thứ ai cầm cũng mở được, nên để càng ngắn càng
// tốt; hai giờ đủ cho một buổi tập huấn, mà chép cho người ngoài thì mai đã hỏng.
const HAN_GIAY = 7200

const phutGiay = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

// Thêm tham số download để trình duyệt tải về thay vì mở trong thẻ mới. Thuộc
// tính `download` của thẻ <a> KHÔNG có tác dụng khi tệp nằm khác tên miền, mà
// đường dẫn ký hạn thì đúng là khác tên miền.
const deTaiVe = (url, ten) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(ten)}` : null

export default function HuongDanTaiLieu({ bo }) {
  const d = taiLieu?.[bo]
  const video = useRef(null)
  const [dangO, setDangO] = useState(-1)
  const [link, setLink] = useState(null)   // null = chưa xin xong
  const [loi, setLoi] = useState('')

  const kho = d && !d.congKhai ? d.kho : null

  // Xin đường dẫn ký hạn cho bản giáo viên.
  useEffect(() => {
    if (!d) return
    if (!kho) {
      setLink(Object.fromEntries(['pdf', 'video', 'srt', 'anhBia']
        .filter((k) => d[k]).map((k) => [k, goc + d[k]])))
      return
    }
    let con = true
    setLink(null); setLoi('')
    const ten = ['pdf', 'video', 'srt', 'anhBia'].filter((k) => d[k])
    supabase.storage.from(kho)
      .createSignedUrls(ten.map((k) => d[k]), HAN_GIAY)
      .then(({ data, error }) => {
        if (!con) return
        if (error) { setLoi(error.message); return }
        const theoTen = Object.fromEntries((data ?? []).map((o) => [o.path, o.signedUrl]))
        // Một tệp hỏng thì chỉ mất tệp đó, phần còn lại vẫn xem được.
        const thieu = ten.filter((k) => !theoTen[d[k]])
        if (thieu.length === ten.length) { setLoi('Không lấy được tài liệu.'); return }
        setLink(Object.fromEntries(ten.map((k) => [k, theoTen[d[k]] ?? null])))
      })
    return () => { con = false }
  }, [d, kho])

  // Tô đậm phần đang chạy. Dùng sự kiện timeupdate của chính thẻ video thay vì
  // hẹn giờ, để người xem tua tay thì danh sách cũng nhảy theo.
  useEffect(() => {
    const v = video.current
    if (!v || !d?.chuong?.length) return
    const theoDoi = () => {
      let i = -1
      d.chuong.forEach((c, k) => { if (v.currentTime + 0.25 >= c.batDau) i = k })
      setDangO(i)
    }
    v.addEventListener('timeupdate', theoDoi)
    v.addEventListener('seeked', theoDoi)
    return () => {
      v.removeEventListener('timeupdate', theoDoi)
      v.removeEventListener('seeked', theoDoi)
    }
  }, [d, link])

  if (!d || (!d.video && !d.pdf)) return null

  if (loi) return <section className="tai-lieu-block">
    <div className="card tl-loi">
      <AlertTriangle size={18} />
      <div>
        <strong>Chưa mở được tài liệu dành cho giáo viên.</strong>
        {/* In nguyên lỗi ra. Nuốt đi rồi ghi "có lỗi xảy ra" thì lần sau hỏng
            lại phải mò từ đầu. */}
        <p className="muted-text small">{loi}</p>
      </div>
    </div>
  </section>

  if (!link) return <section className="tai-lieu-block">
    <div className="card tl-cho"><Loader2 size={18} className="quay" /> Đang mở tài liệu…</div>
  </section>

  const nhay = (giay) => {
    const v = video.current
    if (!v) return
    v.currentTime = giay
    v.play().catch(() => {})   // trình duyệt chặn tự phát thì cứ để yên ở đó
    v.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return <section className="tai-lieu-block">
    {d.video && link.video && <div className="tl-video card">
      <div className="tl-head">
        <Film size={18} />
        <div>
          <h3>Video hướng dẫn</h3>
          <p>
            {d.chuong?.length ? `${d.chuong.length} phần · ` : ''}
            {d.dai ? `${phutGiay(d.dai)} · ` : ''}
            không lời, phụ đề in sẵn trên hình
          </p>
        </div>
      </div>

      <video
        ref={video}
        className="tl-player"
        controls
        preload="metadata"
        playsInline
        poster={link.anhBia ?? undefined}
        src={link.video}
      />

      {d.chuong?.length > 0 && <ol className="tl-chuong">
        {d.chuong.map((c, i) => <li key={c.so}>
          <button
            type="button"
            className={i === dangO ? 'dang-o' : ''}
            onClick={() => nhay(c.batDau)}
          >
            <span className="tl-moc">{phutGiay(c.batDau)}</span>
            <span className="tl-ten">
              <strong>{c.tua}</strong>
              {c.phu && <small>{c.phu}</small>}
            </span>
          </button>
        </li>)}
      </ol>}

      <div className="tl-nut">
        <a className="button ghost" href={deTaiVe(link.video, d.video)} download={d.video}>
          <Download size={16} /> Tải video ({d.videoMb} MB)
        </a>
        {link.srt && <a className="button ghost" href={deTaiVe(link.srt, d.srt)} download={d.srt}>
          <Subtitles size={16} /> Tệp phụ đề .srt
        </a>}
      </div>
    </div>}

    {d.pdf && link.pdf && <div className="tl-pdf card">
      <div className="tl-head">
        <FileText size={18} />
        <div>
          <h3>Tài liệu đầy đủ</h3>
          <p>
            {d.pdfTrang ? `${d.pdfTrang} trang · ` : ''}
            {d.pdfMb} MB · có hình chụp từng bước
          </p>
        </div>
      </div>

      {/* Khung xem nhúng chỉ hiện trên màn hình rộng — điện thoại phần lớn
          không dựng được PDF trong iframe, chỉ ra một ô trắng. Hai nút bên dưới
          luôn hiện, nên máy nào cũng mở được. */}
      <iframe className="tl-khung-pdf" src={`${link.pdf}#view=FitH`}
              title={`Hướng dẫn ${d.nhan} (PDF)`} />

      <div className="tl-nut">
        <a className="button primary" href={link.pdf} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Mở PDF trong thẻ mới
        </a>
        <a className="button ghost" href={deTaiVe(link.pdf, d.pdf)} download={d.pdf}>
          <Download size={16} /> Tải về máy
        </a>
      </div>
    </div>}

    {kho && <p className="tl-rieng">
      Tài liệu này chỉ giáo viên mở được. Đường dẫn có hạn hai giờ, hết hạn thì
      tải lại trang.
    </p>}
  </section>
}
