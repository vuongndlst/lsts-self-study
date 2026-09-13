// Quay video hướng dẫn: ghi lại màn hình trình duyệt thành MP4.
//
// Dùng Page.startScreencast của Chrome — nó bắn về từng khung hình JPEG kèm mốc
// thời gian. Ghép lại bằng ffmpeg theo đúng mốc đó, nên video chạy đúng nhịp
// thật, không bị nhanh chậm thất thường như cách chụp N ảnh mỗi giây.
//
// KHÔNG có tiếng. Máy này chỉ cài giọng đọc tiếng Anh, đọc tiếng Việt bằng giọng
// đó thì thà im lặng còn hơn. Bù lại: phụ đề in thẳng vào hình, và một con trỏ
// chuột vẽ tay — bản ghi của Chrome không chứa con trỏ thật, thiếu nó thì người
// xem không biết đang bấm vào đâu.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg']
  .find((p) => p === 'ffmpeg' || fs.existsSync(p))

// Lớp phủ: phụ đề dưới chân màn hình + con trỏ chuột giả.
export const LOP_PHU = `
window.__dungLopPhu = () => {
  if (document.getElementById('__pd')) return;
  const pd = document.createElement('div');
  pd.id = '__pd';
  pd.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483600;' +
    'padding:18px 28px 22px;background:linear-gradient(transparent,rgba(12,20,28,.92) 38%);' +
    'color:#fff;font:600 21px/1.45 system-ui,Segoe UI,sans-serif;text-align:center;' +
    'opacity:0;transition:opacity .25s';
  document.body.appendChild(pd);

  const ct = document.createElement('div');
  ct.id = '__ct';
  ct.style.cssText = 'position:fixed;z-index:2147483601;width:26px;height:26px;' +
    'margin:-4px 0 0 -4px;pointer-events:none;transition:left .45s cubic-bezier(.4,0,.2,1),' +
    'top .45s cubic-bezier(.4,0,.2,1);left:640px;top:450px';
  ct.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26">' +
    '<path d="M5 2l14 9-6 1.2 3.2 6.3-2.6 1.3L10.4 13 5 17z" fill="#fff" ' +
    'stroke="#12202c" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(ct);

  const vong = document.createElement('div');
  vong.id = '__vong';
  vong.style.cssText = 'position:fixed;z-index:2147483599;width:44px;height:44px;' +
    'margin:-22px 0 0 -22px;border-radius:50%;background:rgba(232,89,12,.45);' +
    'opacity:0;pointer-events:none;transform:scale(.4)';
  document.body.appendChild(vong);
};

window.__phuDe = (t) => {
  const pd = document.getElementById('__pd');
  if (!pd) return;
  pd.textContent = t || '';
  pd.style.opacity = t ? '1' : '0';
};

// Đưa con trỏ tới giữa một phần tử. Trả về false nếu không tìm thấy, để kịch bản
// biết mà báo lỗi thay vì quay ra một video bấm vào khoảng không.
window.__troToi = (sel, text) => {
  let el = text
    ? [...document.querySelectorAll(sel || 'button,a')].find(e => e.textContent.trim().includes(text))
    : document.querySelector(sel);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const b = el.getBoundingClientRect();
  const ct = document.getElementById('__ct');
  ct.style.left = Math.round(b.left + b.width / 2) + 'px';
  ct.style.top = Math.round(b.top + b.height / 2) + 'px';
  window.__dangTro = el;
  return true;
};

// Hiệu ứng gợn khi bấm — người xem cần thấy "vừa có một cú bấm ở đây".
window.__bamCoHieuUng = () => {
  const el = window.__dangTro;
  if (!el) return false;
  const b = el.getBoundingClientRect();
  const v = document.getElementById('__vong');
  v.style.left = Math.round(b.left + b.width / 2) + 'px';
  v.style.top = Math.round(b.top + b.height / 2) + 'px';
  v.style.transition = 'none'; v.style.transform = 'scale(.4)'; v.style.opacity = '1';
  requestAnimationFrame(() => {
    v.style.transition = 'transform .5s ease-out, opacity .5s ease-out';
    v.style.transform = 'scale(1.6)'; v.style.opacity = '0';
  });
  setTimeout(() => el.click(), 140);
  return true;
};
`

// ---------------------------------------------------------------------------
//  Ghi hình
// ---------------------------------------------------------------------------
export function taoMayQuay(cdp, thuMucTam) {
  let khung = []
  let dangGhi = false

  cdp.nghe('Page.screencastFrame', async (p) => {
    if (dangGhi) khung.push({ data: p.data, t: p.metadata.timestamp })
    // Phải báo đã nhận, nếu không Chrome ngừng bắn khung tiếp theo.
    try { await cdp.goi('Page.screencastFrameAck', { sessionId: p.sessionId }) } catch {}
  })

  return {
    async bat() {
      khung = []; dangGhi = true
      await cdp.goi('Page.startScreencast',
        { format: 'jpeg', quality: 82, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 })
    },
    async tat() {
      dangGhi = false
      try { await cdp.goi('Page.stopScreencast') } catch {}
      return khung.length
    },
    // Ghép khung thành MP4. Dùng concat demuxer với thời lượng từng khung lấy
    // đúng từ mốc Chrome gửi về — ffmpeg -framerate cố định sẽ làm video trôi
    // nhanh ở đoạn trang đứng yên và giật ở đoạn có hoạt ảnh.
    async xuat(tepRa, { fps = 30 } = {}) {
      if (khung.length < 2) throw new Error('Chưa ghi được khung hình nào.')
      const tam = path.join(thuMucTam, 'khung')
      fs.rmSync(tam, { recursive: true, force: true })
      fs.mkdirSync(tam, { recursive: true })

      const dong = []
      for (let i = 0; i < khung.length; i++) {
        const ten = `k${String(i).padStart(5, '0')}.jpg`
        fs.writeFileSync(path.join(tam, ten), Buffer.from(khung[i].data, 'base64'))
        const keo = i < khung.length - 1
          ? Math.max(khung[i + 1].t - khung[i].t, 1 / fps)
          : 1.2                                   // giữ khung cuối cho người xem kịp đọc
        dong.push(`file '${ten}'`, `duration ${keo.toFixed(4)}`)
      }
      dong.push(`file '${`k${String(khung.length - 1).padStart(5, '0')}.jpg`}'`)
      fs.writeFileSync(path.join(tam, 'ds.txt'), dong.join('\n'))

      fs.mkdirSync(path.dirname(tepRa), { recursive: true })
      const r = spawnSync(FFMPEG, [
        '-y', '-f', 'concat', '-safe', '0', '-i', 'ds.txt',
        '-vf', `fps=${fps},scale=1280:-2:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
        // faststart: video xem được ngay khi mới tải một phần, quan trọng khi
        // gửi qua Drive hay Zalo.
        '-movflags', '+faststart',
        path.resolve(tepRa),
      ], { cwd: tam, encoding: 'utf8' })
      if (r.status !== 0) throw new Error('ffmpeg lỗi: ' + (r.stderr ?? '').slice(-600))
      fs.rmSync(tam, { recursive: true, force: true })

      const co = fs.statSync(tepRa)
      return { soKhung: khung.length, mb: (co.size / 1048576).toFixed(1) }
    },
  }
}
