import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Film, Subtitles } from 'lucide-react'
import taiLieu from '../data/tai-lieu.json'

// Video và tài liệu PDF của một bộ hướng dẫn ("hocSinh" hoặc "giaoVien").
//
// Dữ liệu (tên tệp, số trang, dung lượng, mốc từng phần) do
// scripts/gom-tai-lieu.mjs sinh ra khi build, không viết tay — viết tay thì
// quay lại video xong là mọi con số sai hết mà không ai biết.

// base:'./' trong vite.config nên BASE_URL là './' khi chạy ở gốc và là đường
// dẫn kho khi chạy trên GitHub Pages. Cứ nối vào là đúng cả hai nơi.
const goc = `${import.meta.env.BASE_URL}tai-lieu/`

const phutGiay = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export default function HuongDanTaiLieu({ bo }) {
  const d = taiLieu?.[bo]
  const video = useRef(null)
  const [dangO, setDangO] = useState(-1)

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
  }, [d])

  if (!d || (!d.video && !d.pdf)) return null

  const nhay = (giay) => {
    const v = video.current
    if (!v) return
    v.currentTime = giay
    v.play().catch(() => {})   // trình duyệt chặn tự phát thì cứ để yên ở đó
    v.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return <section className="tai-lieu-block">
    {d.video && <div className="tl-video card">
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
        poster={d.anhBia ? goc + d.anhBia : undefined}
        src={goc + d.video}
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
        <a className="button ghost" href={goc + d.video} download>
          <Download size={16} /> Tải video ({d.videoMb} MB)
        </a>
        {d.srt && <a className="button ghost" href={goc + d.srt} download>
          <Subtitles size={16} /> Tệp phụ đề .srt
        </a>}
      </div>
    </div>}

    {d.pdf && <div className="tl-pdf card">
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
      <iframe className="tl-khung-pdf" src={`${goc + d.pdf}#view=FitH`}
              title={`Hướng dẫn ${d.nhan} (PDF)`} />

      <div className="tl-nut">
        <a className="button primary" href={goc + d.pdf} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Mở PDF trong thẻ mới
        </a>
        <a className="button ghost" href={goc + d.pdf} download>
          <Download size={16} /> Tải về máy
        </a>
      </div>
    </div>}
  </section>
}
