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

// Mức âm lượng đích của video, tính bằng LUFS. -20 là mức nghe được ngay khi mở
// loa để vừa phải, không phải vặn hết cỡ.
const MUC_DICH = Number(process.env.MUC_DICH ?? -20)

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

// Mốc KẾT THÚC của một dòng là mốc của dòng KẾ TIẾP, kể cả khi dòng kế tiếp là
// một dòng rỗng (lúc phụ đề tắt đi). Lọc bỏ dòng rỗng trước rồi mới lấy dòng
// sau sẽ khiến câu cuối mỗi đoạn kéo dài suốt qua thẻ tên sang tận đoạn sau.
function vietSrt(tepRa, dong, dai) {
  const ra = []
  dong.forEach((d, i) => {
    if (!d.chu) return
    const het = Math.min(dong[i + 1]?.t ?? dai, dai)
    if (het - d.t < 0.4) return
    ra.push(String(ra.length / 4 + 1), `${gio(d.t)} --> ${gio(het)}`, d.chu, '')
  })
  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
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
    'margin:-4px 0 0 -4px;pointer-events:none;transform-origin:4px 4px;' +
    'transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1),' +
    'transform .15s ease-out;left:640px;top:450px';
  ct.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26">' +
    '<path d="M5 2l14 9-6 1.2 3.2 6.3-2.6 1.3L10.4 13 5 17z" fill="#fff" ' +
    'stroke="#12202c" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(ct);

  // Hai lớp cho một cú bấm: quầng sáng loè ra rồi tắt, và một vòng tròn nở
  // rộng dần. Một lớp thôi thì trên nền trắng của ứng dụng gần như không thấy.
  const loe = document.createElement('div');
  loe.id = '__loe';
  loe.style.cssText = 'position:fixed;z-index:2147483598;width:150px;height:150px;' +
    'margin:-75px 0 0 -75px;border-radius:50%;pointer-events:none;opacity:0;' +
    'background:radial-gradient(circle,rgba(232,89,12,.55) 0%,rgba(232,89,12,.28) 45%,' +
    'rgba(232,89,12,0) 70%);transform:scale(.25)';
  document.body.appendChild(loe);

  const vong = document.createElement('div');
  vong.id = '__vong';
  vong.style.cssText = 'position:fixed;z-index:2147483599;width:56px;height:56px;' +
    'margin:-28px 0 0 -28px;border-radius:50%;border:4px solid rgba(232,89,12,.95);' +
    'box-shadow:0 0 0 2px rgba(255,255,255,.75) inset,0 0 14px rgba(232,89,12,.6);' +
    'opacity:0;pointer-events:none;transform:scale(.3)';
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
// Cuộn để phần tử nằm ngay dưới thanh điều hướng, bằng MỘT lần cuộn. Trang đặt
// html{scroll-behavior:smooth}, nên "scrollIntoView rồi scrollBy" thành hai lần
// cuộn mượt — lần sau cắt ngang lần trước và trang đứng yên chỗ cũ.
window.__cuonToiPT = (el, du = 96) => {
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY - du;
  window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
  return true;
};

window.__troToi = (sel, text) => {
  const el = text
    ? [...document.querySelectorAll(sel || 'button,a')].find(e => e.textContent.trim().includes(text))
    : document.querySelector(sel);
  return window.__troToiPhanTu(el);
};

// Nhắm vào một phần tử đã tìm được bằng cách khác. Cần khi thứ phải bấm không
// chỉ ra được bằng một selector — ví dụ "thẻ buổi học nào có chữ Lão Hạc".
// Không có hàm này thì những chỗ đó phải gọi thẳng el.click(), tức là bấm mà
// không có vòng sáng cũng không có tiếng click, người xem không thấy gì xảy ra.
window.__troToiPhanTu = (el) => {
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  window.__dangTro = el;
  window.__ganTro();
  // scrollIntoView mượt chạy xong mới biết phần tử nằm đâu. Đặt con trỏ ngay
  // lúc này là đặt theo vị trí CŨ, rồi trang trượt ra dưới nó — người xem thấy
  // mũi tên chỉ vào khoảng không còn cú bấm thì nổ ở chỗ khác. Đặt lại vài lần
  // trong lúc trang còn trượt.
  [180, 380, 620].forEach(ms => setTimeout(window.__ganTro, ms));
  return true;
};

// Dán con trỏ vào giữa phần tử đang nhắm, theo vị trí HIỆN TẠI của nó.
window.__ganTro = () => {
  const el = window.__dangTro;
  const ct = document.getElementById('__ct');
  if (!el || !ct) return false;
  const b = el.getBoundingClientRect();
  ct.style.left = Math.round(b.left + b.width / 2) + 'px';
  ct.style.top = Math.round(b.top + b.height / 2) + 'px';
  return true;
};

// Hiệu ứng khi bấm — người xem cần thấy "vừa có một cú bấm ở đây".
window.__bamCoHieuUng = () => {
  const el = window.__dangTro;
  if (!el) return false;
  window.__ganTro();
  const b = el.getBoundingClientRect();
  const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);

  const chay = (id, toScale, ms, mo) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.style.left = x + 'px'; e.style.top = y + 'px';
    e.style.transition = 'none';
    e.style.transform = 'scale(' + (id === '__loe' ? .25 : .3) + ')';
    e.style.opacity = mo;
    // Một requestAnimationFrame là chưa chắc: trình duyệt có thể gộp hai lần đổi
    // kiểu vào cùng một lượt tính, thế là transition không chạy và cái vòng đứng
    // im giữa màn hình. Đọc offsetWidth để ép tính lại ngay tại đây.
    void e.offsetWidth;
    e.style.transition = 'transform ' + ms + 'ms cubic-bezier(.2,.7,.3,1), ' +
                         'opacity ' + ms + 'ms ease-out';
    e.style.transform = 'scale(' + toScale + ')';
    e.style.opacity = '0';
  };
  chay('__loe', 1.6, 640, '.95');
  chay('__vong', 2.5, 780, '1');

  // Con trỏ nhấn xuống một cái rồi bật lại — cử chỉ nhỏ nhưng nó nói "chính tay
  // tôi vừa bấm", chứ không phải màn hình tự đổi.
  const ct = document.getElementById('__ct');
  if (ct) {
    ct.style.transform = 'scale(.72)';
    setTimeout(() => { ct.style.transform = 'scale(1)'; }, 170);
  }

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
        // maxHeight phải đủ chứa khung nhìn 1280x900. Để 800 thì Chrome thu
        // khung về 1138x800, rồi ffmpeg lại phóng lên 1280x900 — chữ nhoè đi
        // một lần không vì lý do gì.
        { format: 'jpeg', quality: 82, maxWidth: 1280, maxHeight: 900, everyNthFrame: 1 })
    },
    async tat() {
      dangGhi = false
      try { await cdp.goi('Page.stopScreencast') } catch {}
      return khung.length
    },
    ghiClick() { click.push(Date.now() / 1000) },
    ghiPhuDe(chu) { phuDe.push({ t: Date.now() / 1000, chu }) },
    // Ghép khung thành MP4 KHÔNG TIẾNG, kèm một dải WAV chỉ có tiếng click.
    //
    // Tách tiếng ra khỏi hình là để cùng một lần quay dựng được hai thứ: từng
    // đoạn rời (nhạc mở đầu và tắt cuối đoạn) và bản gộp (một nền nhạc chạy
    // suốt). Nếu nhạc đã nướng vào từng đoạn thì nối lại sẽ nghe nhạc lên
    // xuống bảy lần.
    //
    // Dùng concat demuxer với thời lượng từng khung lấy đúng từ mốc Chrome gửi
    // về — ffmpeg -framerate cố định sẽ làm video trôi nhanh ở đoạn trang đứng
    // yên và giật ở đoạn có hoạt ảnh.
    async ghiDoan(tepRa, { fps = 30 } = {}) {
      if (khung.length < 2) throw new Error('Chưa ghi được khung hình nào.')
      const tam = path.join(thuMucTam, 'khung')
      fs.rmSync(tam, { recursive: true, force: true })
      fs.mkdirSync(tam, { recursive: true })

      const dong = []
      for (let i = 0; i < khung.length; i++) {
        const ten = `k${String(i).padStart(5, '0')}.jpg`
        fs.writeFileSync(path.join(tam, ten), Buffer.from(khung[i].data, 'base64'))
        // Giữ ĐÚNG khoảng cách thật giữa hai khung. Trước đây chỗ này kẹp sàn
        // ở 1/fps — tưởng là vô hại, hoá ra Chrome bắn khung dày hơn 30 hình
        // mỗi giây ở đoạn có hoạt ảnh, nên mỗi khung dày đó bị kéo dãn ra cho
        // đủ 1/30 giây. Cộng lại, đoạn 4 dài 54 giây trong khi quay có 44 giây:
        // hình chạy chậm hơn đời thật 22%, mà tiếng click và phụ đề thì đặt
        // theo mốc đời thật — nghe tiếng bấm xong một lúc lâu mới thấy vòng
        // sáng hiện ra. Khung nào dày quá thì để bộ lọc fps=30 bỏ bớt, đó là
        // việc của nó.
        const keo = i < khung.length - 1
          ? Math.max(khung[i + 1].t - khung[i].t, 0.001)
          : 1.2                                   // giữ khung cuối cho người xem kịp đọc
        dong.push(`file '${ten}'`, `duration ${keo.toFixed(4)}`)
      }
      dong.push(`file '${`k${String(khung.length - 1).padStart(5, '0')}.jpg`}'`)
      fs.writeFileSync(path.join(tam, 'ds.txt'), dong.join('\n'))

      // Mốc 0 của video là khung hình ĐẦU TIÊN, không phải lúc gọi bat(). Lấy
      // nhầm mốc thì tiếng click lệch khỏi cú bấm vài phần mười giây — đủ để
      // người xem thấy sai.
      const t0 = khung[0].t
      const dai = khung[khung.length - 1].t - t0 + 1.2
      const mocClick = click.map((t) => t - t0).filter((t) => t >= 0 && t < dai)
      const dongPd = phuDe.map((d) => ({ t: Math.max(d.t - t0, 0), chu: d.chu }))

      fs.mkdirSync(path.dirname(tepRa), { recursive: true })
      const r = spawnSync(FFMPEG, [
        '-y', '-f', 'concat', '-safe', '0', '-i', 'ds.txt',
        '-vf', `fps=${fps},scale=1280:-2:flags=lanczos,format=yuv420p`,
        // Mọi đoạn và mọi thẻ tên phải mã hoá GIỐNG HỆT nhau, vì bản gộp nối
        // chúng bằng concat demuxer với -c copy. Lệch một tham số là chỗ nối
        // vỡ hình.
        ...THAM_SO_HINH,
        '-an', path.resolve(tepRa),
      ], { cwd: tam, encoding: 'utf8' })
      if (r.status !== 0) throw new Error('ffmpeg lỗi: ' + (r.stderr ?? '').slice(-900))

      fs.rmSync(tam, { recursive: true, force: true })
      return { tep: tepRa, soKhung: khung.length, dai, mocClick, phuDe: dongPd }
    },
  }
}

// Tham số mã hoá hình dùng CHUNG cho mọi đoạn và mọi thẻ tên.
export const THAM_SO_HINH = [
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
  '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
]

// ---------------------------------------------------------------------------
//  Lồng tiếng vào một video câm
// ---------------------------------------------------------------------------
// `moc` là mốc từng cú bấm tính theo giây kể từ đầu video. Nhạc nền chạy suốt,
// vào êm ra êm.
export function longAm(tepHinh, tepRa, { moc = [], dai, tam, mucNhac = null }) {
  const wav = path.join(tam, 'am-' + path.basename(tepRa).replace(/\.mp4$/, '') + '.wav')
  fs.mkdirSync(tam, { recursive: true })
  daiClick(wav, moc, dai)

  const coNhac = fs.existsSync(NHAC)
  if (!coNhac) console.warn('   ! không thấy nhạc nền, video sẽ chỉ có tiếng click')

  // Nhạc là nền, tiếng click là tín hiệu — click phải nổi lên trên nhạc.
  // normalize=0 để amix không tự hạ âm lượng cả hai khi cộng vào nhau.
  //
  // Cả hai nhánh PHẢI quy về stereo trước khi trộn. Dải click là mono, để
  // nguyên thì amix lấy theo nhánh đầu và cả video thành mono — nghe bằng
  // tai nghe là biết ngay.
  const muc = mucNhac ?? Number(process.env.MUC_NHAC ?? 1.3)
  const vao = ['-i', path.resolve(tepHinh), '-i', path.resolve(wav)]
  if (coNhac) vao.push('-stream_loop', '-1', '-i', path.resolve(NHAC))
  const tron = coNhac
    ? `[1:a]aformat=channel_layouts=stereo[c];` +
      `[2:a]atrim=0:${dai.toFixed(2)},asetpts=N/SR/TB,` +
      `aformat=channel_layouts=stereo,volume=${muc},` +
      `afade=t=in:d=1.6,afade=t=out:st=${Math.max(dai - 3, 0).toFixed(2)}:d=2.8[m];` +
      `[c][m]amix=inputs=2:normalize=0:duration=first[t]`
    : `[1:a]aformat=channel_layouts=stereo[t]`

  // Cân âm lượng về mức thường của video.
  //
  // Bản trộn thô đo được -28,6 LUFS — thấp hơn mức video thông thường chừng
  // mười decibel. Mở trong phòng hội đồng là phải vặn loa hết cỡ, rồi clip sau
  // của người khác lại inh tai. LRA đặt rộng hơn dải động thật của nhạc (8,5 LU)
  // để loudnorm chỉ nâng mức chứ không bóp dải, khỏi phập phồng theo tiếng click.
  //
  // loudnorm chạy ở 192 kHz bên trong, phải kéo về 44,1 kHz trước khi vào AAC.
  const loc = `${tron};[t]loudnorm=I=${MUC_DICH}:TP=-1.5:LRA=14,aresample=44100[a]`

  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
  const r = spawnSync(FFMPEG, [
    '-y', ...vao,
    '-filter_complex', loc,
    '-map', '0:v', '-map', '[a]',
    // Hình đã mã hoá rồi, chép nguyên — khỏi mã hoá lần hai làm nhoè chữ.
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest',
    // faststart: video xem được ngay khi mới tải một phần, quan trọng khi gửi
    // qua Drive hay Zalo.
    '-movflags', '+faststart',
    path.resolve(tepRa),
  ], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('ffmpeg lỗi khi lồng tiếng: ' + (r.stderr ?? '').slice(-900))
  try { fs.rmSync(wav) } catch {}
  return tepRa
}

// ---------------------------------------------------------------------------
//  Thẻ tên phân đoạn
// ---------------------------------------------------------------------------
// Vẽ bằng trình duyệt chứ không bằng drawtext của ffmpeg: dấu tiếng Việt chắc
// chắn đúng, và thẻ tên trông cùng một nhà với hai tài liệu Word.
export const HTML_THE = ({ so, tua, phu, tong }) => `
<style>
  html,body{margin:0;height:100%;background:#fff;font-family:Arial,system-ui,sans-serif}
  .khung{height:100%;display:flex;flex-direction:column;justify-content:center;
         padding:0 96px;box-sizing:border-box;
         background:linear-gradient(135deg,#f7fafc 0%,#eef3f8 60%,#e6eef6 100%)}
  .so{font-size:20px;font-weight:700;letter-spacing:.16em;color:#C05621;margin-bottom:18px}
  h1{font-size:62px;line-height:1.15;font-weight:700;color:#1C4E80;margin:0 0 26px}
  .ke{width:120px;height:6px;background:#C05621;border-radius:3px;margin-bottom:26px}
  .phu{font-size:27px;line-height:1.5;color:#5A6472;max-width:900px;margin:0}
  .chan{position:fixed;left:96px;bottom:64px;font-size:18px;color:#8a94a0}
</style>
<div class="khung">
  <div class="so">PHẦN ${so} / ${tong}</div>
  <h1>${tua}</h1>
  <div class="ke"></div>
  <p class="phu">${phu}</p>
</div>
<div class="chan">Hệ thống quản lý giờ tự học · Trường THCS &amp; THPT Đinh Thiện Lý</div>`

// Thẻ mở đầu cả cuốn phim.
export const HTML_BIA = ({ nhan, tua, phu, muc }) => `
<style>
  html,body{margin:0;height:100%;font-family:Arial,system-ui,sans-serif}
  .khung{height:100%;display:flex;flex-direction:column;justify-content:center;
         padding:0 96px;box-sizing:border-box;color:#fff;
         background:linear-gradient(135deg,#12385f 0%,#1C4E80 55%,#2a6ba8 100%)}
  .nhan{font-size:20px;font-weight:700;letter-spacing:.18em;color:#f6b27a;margin-bottom:20px}
  h1{font-size:70px;line-height:1.1;font-weight:700;margin:0 0 22px}
  .phu{font-size:28px;color:#cfe0f0;margin:0 0 40px}
  ol{margin:0;padding-left:26px;font-size:21px;line-height:1.85;color:#dbe8f5;
     columns:2;column-gap:60px}
  .chan{position:fixed;left:96px;bottom:60px;font-size:18px;color:#9dbada}
</style>
<div class="khung">
  <div class="nhan">${nhan}</div>
  <h1>${tua}</h1>
  <p class="phu">${phu}</p>
  <ol>${muc.map((m) => `<li>${m}</li>`).join('')}</ol>
</div>
<div class="chan">Trường THCS &amp; THPT Đinh Thiện Lý · năm học 2026–2027</div>`

// Ảnh thẻ tên → một đoạn phim câm, mã hoá y hệt các đoạn quay màn hình.
export function theThanhDoan(tepAnh, tepRa, dai, { fps = 30 } = {}) {
  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
  const r = spawnSync(FFMPEG, [
    '-y', '-loop', '1', '-framerate', String(fps), '-i', path.resolve(tepAnh),
    '-t', dai.toFixed(2),
    // Thẻ chụp ở 2x nên phải thu về đúng khổ video, không thì concat từ chối.
    '-vf', `scale=1280:900:flags=lanczos,fps=${fps},format=yuv420p`,
    ...THAM_SO_HINH, '-an', path.resolve(tepRa),
  ], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('ffmpeg lỗi khi dựng thẻ tên: ' + (r.stderr ?? '').slice(-900))
  return tepRa
}

// ---------------------------------------------------------------------------
//  Nối các đoạn câm
// ---------------------------------------------------------------------------
export function noiDoan(dsTep, tepRa, tam) {
  fs.mkdirSync(tam, { recursive: true })
  const ds = path.join(tam, 'noi.txt')
  fs.writeFileSync(ds, dsTep.map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'))
  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
  const r = spawnSync(FFMPEG, [
    '-y', '-f', 'concat', '-safe', '0', '-i', ds,
    '-c:v', 'copy', '-an', path.resolve(tepRa),
  ], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('ffmpeg lỗi khi nối: ' + (r.stderr ?? '').slice(-900))
  return tepRa
}

// Đo lại thời lượng THẬT của tệp vừa dựng. Cộng dồn thời lượng dự tính sẽ lệch
// dần, mà lệch thì tiếng click và phụ đề của những đoạn sau trôi khỏi chỗ.
export function doDai(tep) {
  const r = spawnSync(FFMPEG.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1'),
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.resolve(tep)],
    { encoding: 'utf8' })
  const d = Number((r.stdout ?? '').trim())
  if (!Number.isFinite(d) || d <= 0) throw new Error('Không đo được thời lượng: ' + tep)
  return d
}

export { vietSrt, gio }


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
