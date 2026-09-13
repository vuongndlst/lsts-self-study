// Quay video hướng dẫn: ghi lại màn hình trình duyệt thành MP4.
//
// Dùng Page.startScreencast của Chrome — nó bắn về từng khung hình JPEG kèm mốc
// thời gian. Ghép lại bằng ffmpeg theo đúng mốc đó, nên video chạy đúng nhịp
// thật, không bị nhanh chậm thất thường như cách chụp N ảnh mỗi giây.
//
// KHÔNG có lời đọc. Máy này chỉ cài giọng đọc tiếng Anh, đọc tiếng Việt bằng
// giọng đó thì thà im lặng còn hơn. Bù lại:
//
//   · phụ đề in thẳng vào hình, KÈM một tệp .srt rời để lồng tiếng sau;
//   · nhạc nền CC0 (xem docs/huong-dan/am/NGUON.md);
//   · tiếng click mỗi lần bấm chuột, đặt đúng vào thời điểm bấm;
//   · con trỏ chuột vẽ tay — bản ghi của Chrome không chứa con trỏ thật, thiếu
//     nó thì người xem không biết đang bấm vào đâu.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { doi } from './shoot.mjs'

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg']
  .find((p) => p === 'ffmpeg' || fs.existsSync(p))
const NHAC  = 'docs/huong-dan/am/nhac-nen.mp3'
const CLICK = 'docs/huong-dan/am/click.wav'

// ---------------------------------------------------------------------------
//  Dải tiếng click
// ---------------------------------------------------------------------------
// Dựng thẳng bằng tay thay vì nhờ ffmpeg: mỗi cú bấm là một adelay riêng, mười
// lăm cú bấm là mười lăm nhánh filter phải asplit rồi amix — dài, khó đọc, và
// sai một dấu là hỏng cả lệnh. Ghi PCM thì chỉ là cộng mẫu vào đúng vị trí.
function daiClick(tepRa, moc, dai, { tanSo = 44100 } = {}) {
  const src = fs.readFileSync(CLICK)
  // Bỏ qua phần đầu WAV, tìm khối 'data'.
  let i = 12
  while (i < src.length - 8 && src.toString('latin1', i, i + 4) !== 'data') {
    i += 8 + src.readUInt32LE(i + 4)
  }
  const mau = src.subarray(i + 8)
  const soMau = Math.ceil(dai * tanSo)
  const ra = Buffer.alloc(soMau * 2)

  for (const t of moc) {
    const batDau = Math.round(t * tanSo) * 2
    for (let k = 0; k + 1 < mau.length && batDau + k + 1 < ra.length; k += 2) {
      const cu = ra.readInt16LE(batDau + k)
      const them = mau.readInt16LE(k)
      ra.writeInt16LE(Math.max(-32768, Math.min(32767, cu + them)), batDau + k)
    }
  }

  const dau = Buffer.alloc(44)
  dau.write('RIFF', 0); dau.writeUInt32LE(36 + ra.length, 4); dau.write('WAVE', 8)
  dau.write('fmt ', 12); dau.writeUInt32LE(16, 16); dau.writeUInt16LE(1, 20)
  dau.writeUInt16LE(1, 22); dau.writeUInt32LE(tanSo, 24)
  dau.writeUInt32LE(tanSo * 2, 28); dau.writeUInt16LE(2, 32); dau.writeUInt16LE(16, 34)
  dau.write('data', 36); dau.writeUInt32LE(ra.length, 40)
  fs.writeFileSync(tepRa, Buffer.concat([dau, ra]))
  return tepRa
}

// ---------------------------------------------------------------------------
//  Phụ đề rời
// ---------------------------------------------------------------------------
const gio = (s) => {
  const ms = Math.max(0, Math.round(s * 1000))
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const p = String(Math.floor(ms / 60000) % 60).padStart(2, '0')
  const g = String(Math.floor(ms / 1000) % 60).padStart(2, '0')
  return `${h}:${p}:${g},${String(ms % 1000).padStart(3, '0')}`
}

function vietSrt(tepRa, dong, dai) {
  const ra = []
  dong.filter((d) => d.chu).forEach((d, i, ds) => {
    const het = Math.min(ds[i + 1]?.t ?? dai, dai)
    if (het - d.t < 0.4) return
    ra.push(String(ra.length / 4 + 1), `${gio(d.t)} --> ${gio(het)}`, d.chu, '')
  })
  fs.writeFileSync(tepRa, ra.join(String.fromCharCode(10)), 'utf8')
  return ra.length / 4
}

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
  let click = []      // mốc từng cú bấm, tính theo giây epoch
  let phuDe = []      // { t, chu } — dùng để xuất .srt

  cdp.nghe('Page.screencastFrame', async (p) => {
    if (dangGhi) khung.push({ data: p.data, t: p.metadata.timestamp })
    // Phải báo đã nhận, nếu không Chrome ngừng bắn khung tiếp theo.
    try { await cdp.goi('Page.screencastFrameAck', { sessionId: p.sessionId }) } catch {}
  })

  return {
    async bat() {
      khung = []; click = []; phuDe = []; dangGhi = true
      await cdp.goi('Page.startScreencast',
        { format: 'jpeg', quality: 82, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 })
    },
    async tat() {
      dangGhi = false
      try { await cdp.goi('Page.stopScreencast') } catch {}
      return khung.length
    },
    ghiClick() { click.push(Date.now() / 1000) },
    ghiPhuDe(chu) { phuDe.push({ t: Date.now() / 1000, chu }) },
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

      // Mốc 0 của video là khung hình ĐẦU TIÊN, không phải lúc gọi bat(). Lấy
      // nhầm mốc thì tiếng click lệch khỏi cú bấm vài phần mười giây — đủ để
      // người xem thấy sai.
      const t0 = khung[0].t
      const dai = khung[khung.length - 1].t - t0 + 1.2
      const mocClick = click.map((t) => t - t0).filter((t) => t >= 0 && t < dai)
      const dongPd = phuDe.map((d) => ({ t: Math.max(d.t - t0, 0), chu: d.chu }))

      const wavClick = daiClick(path.join(tam, 'click.wav'), mocClick, dai)
      const coNhac = fs.existsSync(NHAC)
      if (!coNhac) console.warn('   ! không thấy nhạc nền, video sẽ chỉ có tiếng click')

      // Nhạc là nền, tiếng click là tín hiệu — click phải nổi lên trên nhạc.
      // normalize=0 để amix không tự hạ âm lượng cả hai khi cộng vào nhau.
      //
      // Cả hai nhánh PHẢI quy về stereo trước khi trộn. Dải click là mono, để
      // nguyên thì amix lấy theo nhánh đầu và cả video thành mono — nghe bằng
      // tai nghe là biết ngay.
      const mucNhac = Number(process.env.MUC_NHAC ?? 1.3)
      const vao = ['-f', 'concat', '-safe', '0', '-i', 'ds.txt', '-i', 'click.wav']
      if (coNhac) vao.push('-stream_loop', '-1', '-i', path.resolve(NHAC))
      const loc = coNhac
        ? `[1:a]aformat=channel_layouts=stereo[c];` +
          `[2:a]atrim=0:${dai.toFixed(2)},asetpts=N/SR/TB,` +
          `aformat=channel_layouts=stereo,volume=${mucNhac},` +
          `afade=t=in:d=1.2,afade=t=out:st=${Math.max(dai - 2.2, 0).toFixed(2)}:d=2[m];` +
          `[c][m]amix=inputs=2:normalize=0:duration=first[a]`
        : `[1:a]aformat=channel_layouts=stereo[a]`

      const r = spawnSync(FFMPEG, [
        '-y', ...vao,
        '-filter_complex', loc,
        '-map', '0:v', '-map', '[a]',
        '-vf', `fps=${fps},scale=1280:-2:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k', '-shortest',
        // faststart: video xem được ngay khi mới tải một phần, quan trọng khi
        // gửi qua Drive hay Zalo.
        '-movflags', '+faststart',
        path.resolve(tepRa),
      ], { cwd: tam, encoding: 'utf8' })
      if (r.status !== 0) throw new Error('ffmpeg lỗi: ' + (r.stderr ?? '').slice(-900))

      const tepSrt = tepRa.replace(/\.mp4$/, '.srt')
      const soDong = vietSrt(tepSrt, dongPd, dai)
      fs.rmSync(tam, { recursive: true, force: true })

      const co = fs.statSync(tepRa)
      return {
        soKhung: khung.length, giay: dai.toFixed(1),
        click: mocClick.length, phuDe: soDong,
        mb: (co.size / 1048576).toFixed(1), srt: tepSrt,
      }
    },
  }
}


// ---------------------------------------------------------------------------
//  Bộ trợ giúp viết kịch bản
// ---------------------------------------------------------------------------
// Gói ba việc luôn đi cùng nhau: đặt phụ đề, đưa con trỏ tới, bấm. Viết tay ba
// việc đó ở mỗi bước thì rất dễ quên ghi mốc click hoặc mốc phụ đề, mà thiếu
// mốc là tiếng click rơi vào khoảng không và tệp .srt trống một đoạn.
export function taoKichBan(t, may) {
  return {
    async noi(chu, cho = 2400) {
      may.ghiPhuDe(chu)
      await t.chay(`window.__phuDe(${JSON.stringify(chu)}); return 1`)
      await doi(cho)
    },
    async im(cho = 500) {
      may.ghiPhuDe('')
      await t.chay(`window.__phuDe(''); return 1`)
      await doi(cho)
    },
    async tro(sel, text = null, cho = 900) {
      const co = await t.chay(
        `return window.__troToi(${JSON.stringify(sel)}, ${JSON.stringify(text)})`)
      if (!co) throw new Error(`Không thấy thứ cần trỏ tới: ${text ?? sel}`)
      await doi(cho)
    },
    async bam(cho = 2200) {
      may.ghiClick()
      const co = await t.chay('return window.__bamCoHieuUng()')
      if (!co) throw new Error('Chưa trỏ tới thứ gì mà đã bấm.')
      await doi(cho)
    },
    async cuon(y, cho = 1100) {
      await t.chay(`window.scrollBy({ top: ${y}, behavior: 'smooth' }); return 1`)
      await doi(cho)
    },
  }
}
