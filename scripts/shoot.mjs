// Chụp ảnh màn hình cho tài liệu hướng dẫn.
//
// Vì sao tự lái Chrome thay vì chụp tay: tài liệu có ~46 hình. Giao diện đổi
// một chút là phải chụp lại từ đầu. Chụp tay thì lần sau không ai làm nổi;
// chạy lại một lệnh thì ai cũng làm được.
//
// Không cài thêm gói nào: Chrome đã có sẵn trên máy, Node 22+ đã có WebSocket,
// nên nói chuyện thẳng với Chrome qua DevTools Protocol.
//
//   node scripts/shoot.mjs            chụp tất cả
//   node scripts/shoot.mjs hs         chỉ chụp cảnh có tên bắt đầu bằng "hs"
//
// Máy chủ phải đang chạy ở http://localhost:4173 (bản build production —
// chụp bản thật thì ảnh mới khớp thứ giáo viên nhìn thấy, kể cả nhãn thương hiệu).

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const GOC = process.env.GOC || 'http://localhost:4173'
const THU_MUC = 'docs/huong-dan/img'
const RONG = 1280
const CAO = 900
const NET = 2          // deviceScaleFactor: ảnh gấp đôi cho nét khi in

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('Không tìm thấy Chrome hoặc Edge trên máy.')

const doi = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
//  Nối vào Chrome
// ---------------------------------------------------------------------------
async function moChrome() {
  const hoSo = fs.mkdtempSync(path.join(os.tmpdir(), 'shoot-'))
  const cong = 9333
  const p = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${cong}`, `--user-data-dir=${hoSo}`,
    `--window-size=${RONG},${CAO}`, '--hide-scrollbars', '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    // Không có dòng này thì ô chọn ngày hiện mm/dd/yyyy kiểu Mỹ — tài liệu
    // hướng dẫn mà khác thứ giáo viên nhìn thấy trên máy mình là gây rối.
    '--lang=vi-VN',
    'about:blank',
  ], { stdio: 'ignore' })

  // Chrome mất một lúc mới mở cổng gỡ lỗi; hỏi lại cho tới khi có.
  let ws = null
  for (let i = 0; i < 60 && !ws; i++) {
    await doi(250)
    try {
      const r = await fetch(`http://127.0.0.1:${cong}/json/list`)
      const tabs = await r.json()
      ws = tabs.find((t) => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* chưa sẵn sàng */ }
  }
  if (!ws) { p.kill(); throw new Error('Chrome không mở được cổng gỡ lỗi.') }
  return { proc: p, ws, hoSo }
}

function noiCDP(url) {
  const sock = new WebSocket(url)
  let id = 0
  const cho = new Map()
  const nghe = new Map()       // nghe một lần rồi bỏ
  const nghemai = new Map()    // nghe suốt — dùng cho luồng khung hình khi quay
  const sanSang = new Promise((ok) => sock.addEventListener('open', ok))
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && cho.has(m.id)) {
      const { ok, loi } = cho.get(m.id); cho.delete(m.id)
      m.error ? loi(new Error(m.error.message)) : ok(m.result)
    } else if (m.method) {
      if (nghemai.has(m.method)) nghemai.get(m.method).forEach((f) => f(m.params))
      if (nghe.has(m.method)) {
        nghe.get(m.method).forEach((f) => f(m.params))
        nghe.delete(m.method)
      }
    }
  })
  return {
    sanSang,
    goi: (method, params = {}) => new Promise((ok, loi) => {
      const n = ++id
      cho.set(n, { ok, loi })
      sock.send(JSON.stringify({ id: n, method, params }))
    }),
    motLan: (method) => new Promise((ok) => {
      if (!nghe.has(method)) nghe.set(method, [])
      nghe.get(method).push(ok)
    }),
    nghe: (method, fn) => {
      if (!nghemai.has(method)) nghemai.set(method, [])
      nghemai.get(method).push(fn)
    },
    dong: () => sock.close(),
  }
}

// ---------------------------------------------------------------------------
//  Lớp phủ đánh số — "đóng khung chức năng"
// ---------------------------------------------------------------------------
// Vẽ khung TRƯỚC khi chụp, ngay trong trang, nên khung luôn đúng vị trí thật.
// Vẽ tay lên ảnh thì mỗi lần giao diện xê dịch là lệch hết.
const KHUNG = `
window.__khung = (items) => {
  document.querySelectorAll('.__anno').forEach(e => e.remove());
  let thieu = [];
  items.forEach((it, i) => {
    const n = it.n ?? (i + 1);
    let el = null;
    if (it.text) {
      el = [...document.querySelectorAll(it.sel || '*')]
        .filter(e => e.textContent.trim().includes(it.text))
        .filter(e => !e.querySelector((it.sel || '*') + ':not(:scope)'))
        .pop();
    } else {
      el = document.querySelectorAll(it.sel)[it.idx || 0];
    }
    if (!el) { thieu.push(it.sel || it.text); return; }
    if (it.up) for (let k = 0; k < it.up; k++) el = el.parentElement || el;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { thieu.push(it.sel || it.text); return; }
    const d = document.createElement('div');
    d.className = '__anno';
    d.style.cssText = 'position:fixed;left:' + (r.left - 5) + 'px;top:' + (r.top - 5) +
      'px;width:' + (r.width + 10) + 'px;height:' + (r.height + 10) +
      'px;border:3px solid #e8590c;border-radius:10px;z-index:2147483000;pointer-events:none;' +
      'box-shadow:0 0 0 3px rgba(255,255,255,.95),0 2px 10px rgba(0,0,0,.18)';
    const b = document.createElement('div');
    b.textContent = n;
    b.style.cssText = 'position:absolute;left:-15px;top:-15px;width:30px;height:30px;' +
      'border-radius:50%;background:#e8590c;color:#fff;text-align:center;' +
      'font:700 16px/30px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)';
    d.appendChild(b);
    document.body.appendChild(d);
  });
  return thieu;
};
window.__xoaKhung = () => document.querySelectorAll('.__anno').forEach(e => e.remove());
window.__nut = (t) => [...document.querySelectorAll('button,a')]
  .find(b => b.textContent.trim().includes(t));
// Đánh dấu khối cần cắt bằng NỘI DUNG chữ bên trong. Nhiều trang có vài khối
// cùng class .card.sched-card, chọn theo thứ tự thì đổi bố cục một cái là cắt
// nhầm khối khác. Lấy khối NHỎ NHẤT có chứa chữ đó — khối lớn hơn bao giờ cũng
// là cả trang.
window.__danhDau = (chua, sel = '.card,.section-block,.bell-panel') => {
  const cu = document.getElementById('__muc');
  if (cu) cu.removeAttribute('id');
  const el = [...document.querySelectorAll(sel)]
    .filter(e => e.textContent.includes(chua))
    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
  if (el) el.id = '__muc';
  return !!el;
};
window.__dat = (el, v) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
};
`

// ---------------------------------------------------------------------------
//  Trình điều khiển
// ---------------------------------------------------------------------------
export async function taoTrinh() {
  const { proc, ws, hoSo } = await moChrome()
  const cdp = noiCDP(ws)
  await cdp.sanSang
  await cdp.goi('Page.enable')
  await cdp.goi('Runtime.enable')
  await cdp.goi('Emulation.setDeviceMetricsOverride',
    { width: RONG, height: CAO, deviceScaleFactor: NET, mobile: false })
  try { await cdp.goi('Emulation.setLocaleOverride', { locale: 'vi-VN' }) } catch {}
  try { await cdp.goi('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' }) } catch {}

  const chay = async (js) => {
    const r = await cdp.goi('Runtime.evaluate',
      { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'Lỗi JS')
    return r.result.value
  }

  // Chờ tới khi chữ mong đợi xuất hiện, chứ không chờ theo giây. Chờ theo giây
  // thì máy chậm là chụp phải màn hình "Đang mở trang...", mà máy nhanh thì lại
  // phí thời gian — và cả hai đều chỉ lộ ra khi xem lại 46 tấm ảnh.
  const doiChu = async (chu, hanMs = 15000) => {
    const het = Date.now() + hanMs
    while (Date.now() < het) {
      const co = await chay(
        `return document.body.innerText.includes(${JSON.stringify(chu)})`)
      if (co) { await doi(400); return true }
      await doi(300)
    }
    throw new Error(`Chờ mãi không thấy "${chu}" trên trang.`)
  }

  const den = async (duong, chu = null) => {
    await cdp.goi('Page.navigate', { url: GOC + duong })
    await doi(900)
    await chay(KHUNG + ';return 1')
    if (chu) await doiChu(chu)
    return true
  }

  const doMan = (cao) => cdp.goi('Emulation.setDeviceMetricsOverride',
    { width: RONG, height: cao, deviceScaleFactor: NET, mobile: false })

  let dem = 0
  // `cao`: nới cao màn hình ảo trước khi chụp. Cửa sổ bật lên có max-height 90vh
  // và tự cuộn bên trong, nên màn hình thấp thì ảnh ra một khung cuộn dở dang.
  // Nới cao lên là nội dung duỗi hết ra, chụp một phát đủ.
  const chup = async (ten, { khung = [], chon = null, cao = null, doiMs = 600 } = {}) => {
    if (cao) {
      await doMan(cao)
      await doi(500)
      // Nới cao màn hình xong là trang dàn lại, thứ vừa cuộn tới có thể trôi lên
      // trên mép. Cuộn lại lần nữa RỒI mới đo, và lùi thêm để thanh điều hướng
      // dính trên đầu không đè lên mép khung.
      if (chon) {
        await chay(`const e=document.querySelector(${JSON.stringify(Array.isArray(chon) ? chon[0] : chon)});
                    if (e) { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -96) }
                    return 1`)
        await doi(400)
      }
    }
    await doi(doiMs)
    if (khung.length) {
      const thieu = await chay(`return window.__khung(${JSON.stringify(khung)})`)
      if (thieu?.length) console.warn(`   ! ${ten}: không tìm thấy ${thieu.join(' / ')}`)
    }
    let clip
    if (chon) {
      // `chon` nhận một selector, hoặc một MẢNG selector thì lấy khung bao trùm
      // tất cả. Cần mảng khi hai thứ phải cùng có mặt mà thẻ cha chung của chúng
      // lại thừa ra một mảng trống lớn — ví dụ thẻ đăng nhập: phải thấy cả dải
      // chọn "Học sinh / Giáo viên" lẫn biểu mẫu, nhưng .auth-card thì dưới đáy
      // trống gần nửa thẻ.
      const ds = Array.isArray(chon) ? chon : [chon]
      const r = await chay(
        `const ds=${JSON.stringify(ds)};
         const bs=ds.map(s=>document.querySelector(s)).filter(Boolean)
                    .map(e=>e.getBoundingClientRect());
         if (!bs.length) return null;
         const t=Math.min(...bs.map(b=>b.top)), d=Math.max(...bs.map(b=>b.bottom));
         const l=Math.min(...bs.map(b=>b.left)), ph=Math.max(...bs.map(b=>b.right));
         // getBoundingClientRect cho toạ độ theo KHUNG NHÌN, còn clip của
         // captureScreenshot tính theo TRANG. Trang đang cuộn thì hai hệ lệch
         // nhau đúng bằng scrollY — ảnh ra đúng kích thước nhưng chụp nhầm chỗ,
         // nhìn tưởng cửa sổ bị cắt cụt. Cộng scroll vào là khớp.
         return {x:Math.max(l+window.scrollX-16,0),
                 y:Math.max(t+window.scrollY-16,0),
                 width:Math.min(ph-l+32, window.innerWidth),
                 height:Math.min(d-t+32, window.innerHeight)}`)
      // scale PHẢI là 1: deviceScaleFactor đã cho ảnh gấp đôi rồi. Để scale=2 ở
      // đây là nhân hai lần, ảnh phóng to gấp bốn và cắt mất nửa nội dung.
      if (r) clip = { ...r, scale: 1 }

      // Ô đánh số nằm NGOÀI vùng cắt thì ảnh ra thiếu ô đó, mà tài liệu vẫn chú
      // giải "① là …" — người đọc dò mãi không thấy. Đã dính đúng lỗi này ở hai
      // ảnh màn hình đăng nhập: cắt theo <form> nên mất hẳn ô ① là cái thẻ chọn
      // Học sinh / Giáo viên nằm trên form. Báo ngay lúc chụp, đừng để lọt vào
      // file Word rồi mới phát hiện.
      if (clip && khung.length) {
        const ngoai = await chay(
          `const c=${JSON.stringify({ x: clip.x, y: clip.y, w: clip.width, h: clip.height })};
           return [...document.querySelectorAll('.__anno')].filter(e=>{
             const b=e.getBoundingClientRect();
             const x=b.left+window.scrollX, y=b.top+window.scrollY;
             return x < c.x - 1 || y < c.y - 1
                 || x + b.width > c.x + c.w + 1 || y + b.height > c.y + c.h + 1;
           }).map(e=>e.firstChild.textContent)`)
        if (ngoai?.length) {
          console.warn(`   ! ${ten}: ô ${ngoai.join(', ')} nằm ngoài vùng cắt — ảnh sẽ thiếu ô đó.`)
        }
      }
      if (process.env.SHOOT_DEBUG) console.log('     do:', JSON.stringify(r),
        'vh=', await chay('return window.innerHeight'))
    }
    const { data } = await cdp.goi('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) })
    fs.mkdirSync(THU_MUC, { recursive: true })
    const tep = path.join(THU_MUC, `${ten}.png`)
    fs.writeFileSync(tep, Buffer.from(data, 'base64'))
    await chay('window.__xoaKhung && window.__xoaKhung(); return 1')
    if (cao) await doMan(CAO)
    dem++
    console.log(`   ✓ ${tep}`)
    return tep
  }

  return {
    cdp, den, chay, chup, doiChu,
    cuon: (y) => chay(`window.scrollTo(0, ${y}); return 1`),
    cuonToi: (sel) => chay(
      `const e=document.querySelector(${JSON.stringify(sel)}); if(e) e.scrollIntoView({block:'center'}); return !!e`),
    bam: (text) => chay(`const b=window.__nut(${JSON.stringify(text)}); if(b) b.click(); return !!b`),
    dong: async () => { cdp.dong(); proc.kill(); try { fs.rmSync(hoSo, { recursive: true, force: true }) } catch {} },
    get soAnh() { return dem },
  }
}

// Đăng nhập giúp — hai vai dùng chung một hàm để khỏi lệch nhau.
export async function dangNhap(t, { vai, tk, mk }) {
  await t.den('/#/login', 'Đăng nhập')
  await t.chay(`window.__nut(${JSON.stringify(vai === 'gv' ? 'Giáo viên' : 'Học sinh')})?.click(); return 1`)
  // Chờ đủ HAI ô nhập rồi mới điền. Điền sớm một nhịp thì `id` là undefined và
  // Chrome ném "Illegal invocation" — lỗi trông như hỏng thư viện, thật ra chỉ
  // là chụp nhanh hơn React vẽ.
  for (let i = 0; i < 40; i++) {
    const xong = await t.chay(`const ins=[...document.querySelectorAll('input')];
      return ins.some(i=>i.type!=='password') && ins.some(i=>i.type==='password')`)
    if (xong) break
    await doi(250)
  }
  await t.chay(`
    const ins = [...document.querySelectorAll('input')];
    const id = ins.find(i => i.type !== 'password'), pw = ins.find(i => i.type === 'password');
    if (!id || !pw) throw new Error('Trang đăng nhập chưa có đủ ô nhập.');
    window.__dat(id, ${JSON.stringify(tk)}); window.__dat(pw, ${JSON.stringify(mk)});
    return 1`)
  await doi(300)
  await t.chay(`window.__nut(${JSON.stringify(vai === 'gv' ? 'Vào trang giáo viên' : 'Đăng nhập học sinh')})?.click(); return 1`)
  await t.doiChu(vai === 'gv' ? 'Quản lý giờ tự học' : 'Nhiệm vụ của em')
  // Trang vừa hiện nhưng dữ liệu còn đang về; đợi thêm một nhịp cho số liệu lên.
  await doi(1200)
}

export { doi, GOC, THU_MUC }
