/* 舉網的評估層接頭（v2.2，2026-11-10；v2.1 2026-11-09）
   共用模組在 ./assess/（正本 100_Todo/projects/2026-11-06_遊戲評估層/assess/，改正本後跑 sync.sh 複製過來）。
   和釣魚一樣：設定頁選「誰在玩」→ 正式撈魚前的「試網」量測關 → 結算頁的動作報告。和釣魚不同的地方：
   - 兩人同螢幕：左邊、右邊各選一位，也可以一邊訪客。
   - 試網一個一個來，另一位休息。兩人同時做的話，一個人舉手另一個人容易跟著舉，看圖反應就量不準；
     一個一個來，每個人的條件也和釣魚的單人試竿相同。
   - 量測用的手部高度與釣魚同一把尺（assess/signal.js），不是遊戲判定用的手腕訊號（那個經個人校正，不能跨人比）。
   - 肩痛：舉網沒有加分或「再舉高一點」，改成這一側的舉手門檻最多到簡單難度（校正範圍的 30%）。
   兩邊都是訪客、或用按鍵試玩時，流程與第二版完全相同。

   試網（每人約 1 分鐘，每次相同）：
   1. 左手 3 下、右手 3 下：舉到最高、停一下、放下。量絕對高度（軀幹長）、舉起秒數、側傾與聳肩。
   2. 8 題看圖：魚就舉手、垃圾不動，固定順序。量反應時間、該舉沒舉、不該舉卻舉。
   同一位在同一次開啟頁面只量一次（「再玩一次」不再量）；換人會在下一局量。

   v2.2 接上「感．動復能」入口（assess/hub.js，規則寫在那個檔頭）：
   - 入口今天的計畫是誰，而這人還沒坐下：載入時先幫他坐左邊；左邊有人就坐右邊；兩邊都有人就不動。
   - 每個位置各自判斷：入口今天量過的人（同一代號、今天、有舉手資料），開局不再試網，把入口那一筆存成舉網的一筆
     （多記 hub、measuredAt，位置與搭檔照舉網的寫法）；另一位沒量過的照原本輪到他試網。兩位都量過就直接開局。
     展示模式（?demo=1）只沿用入口的展示資料，鏡頭模式只沿用真的資料。
   - 計畫裡有舉網：載入、換人時，設定頁難度切到推薦那一級（easy／normal／hard 與舉網相同），難度說明下多一行
     「感．動復能推薦：…」。網址帶 ?diff= 或帶領者自己按過難度，就照那個，不再自動切。
   - 結算頁動作報告卡最下面加「下一款」卡（renderNext）；這局沒有報告但有計畫時，卡片也會出現。
   入口沒有計畫、兩邊都是訪客：流程與 v2.1 完全相同。 */
import { createStore } from './assess/store.js?v=1';
import { LiftMeasure } from './assess/lift.js?v=1';
import { GoNoGo, GNG } from './assess/gonogo.js?v=1';
import { HandSignal } from './assess/signal.js?v=1';
import { buildSummary } from './assess/advice.js?v=1';
import { mountProfile, renderReport } from './assess/ui.js?v=1';
import { adopt, hubToday, readPlan, planFor, pickFor, renderNext, DIFFS, DIFF_NAME, painToday } from './assess/hub.js?v=1';

const GAME = 'netlift';
const SEAT = { a: '左邊', b: '右邊' }, SIDE = { L: '左手', R: '右手' };
const GO_IDS = ['tilapia'];                 /* 溪邊沒有虱目魚、嘉鱲，看圖只用吳郭魚 */
const NOGO_IDS = ['shoe', 'can', 'shoe'];
const PAIN_THR = 0.30;                      /* 簡單難度的舉手門檻（logic.js DIFF.easy.thr） */
const PAIN_NOTE = '建檔註記舉手會痛：遊戲中這一側的舉手門檻最多到簡單難度（校正範圍的 30%），試網時提示「舉到不會痛的高度」。';
const STALE_MS = 300;                       /* 這麼久沒看到這個人，就當成看不到手 */
/* 入口交接（純函式，node 測得到）：今天在入口量過、而且展示／真實一致，就存成舉網的一筆並回傳；否則 null（照原本試網） */
export function fromHub(store, code, demo, extra, now = Date.now()) {
  const h = hubToday(store, code, now);
  return h && !!h.demo === !!demo ? adopt(store, code, GAME, extra, now) : null;
}
/* 入口推薦的難度（'easy'｜'normal'｜'hard'，和舉網的難度同名），沒有回 null */
export function hubDiff(code, opt) { const p = pickFor(GAME, code, opt); return p && DIFFS.includes(p.diff) ? p.diff : null; }
/* 入口今天計畫的那位要坐哪邊：已經坐了、或兩邊都有人回 null。a、b 是兩個位置現在的代號（訪客 null） */
export function seatFor(code, a, b) { if (!code || a === code || b === code) return null; return !a ? 'a' : !b ? 'b' : null; }
export const ASSESS_VOICES = ['as_intro', 'as_turnL', 'as_turnR', 'as_swap', 'as_left', 'as_right', 'as_again', 'as_low', 'as_rest', 'as_gng', 'as_pain', 'as_done'];

const CSS = `
#setup .as-who{margin:calc(var(--u)*.8) 0}
#setup .as-who .lab{margin-bottom:calc(var(--u)*.4)}
#setup .as-who .seg,#setup .as-form .seg{display:flex;flex-wrap:wrap;gap:calc(var(--u)*.5)}
#setup .as-who .seg button{background:#efe6d0;font-size:calc(var(--u)*1.55);padding:calc(var(--u)*.45) calc(var(--u)*.9);min-width:calc(var(--u)*7);display:flex;flex-direction:column;align-items:center;line-height:1.25}
#setup .as-who .seg button.on{background:var(--ink);color:#fff}
#setup .as-who .seg button small{font-size:.68em;font-weight:600;opacity:.85}
#setup .as-who .as-cur{font-size:calc(var(--u)*1.45);color:#1f5f7a;margin:calc(var(--u)*.4) 0 0}
#setup .as-who .note{color:var(--mut);font-size:calc(var(--u)*1.3);margin:calc(var(--u)*.3) 0 0}
#setup .as-who .link-btn{background:none;color:#2c6fb3;text-decoration:underline;padding:0 .3em;font-size:inherit}
#setup .as-form{background:#f6efdc;padding:calc(var(--u)*.8) calc(var(--u)*1.1)}
#setup .as-form .field{margin:0 0 calc(var(--u)*.6)}
#setup .as-form .seg button{flex:1 1 auto;min-height:0;font-size:calc(var(--u)*1.45);padding:calc(var(--u)*.45) calc(var(--u)*.7);min-width:0}
#setup .as-form .hidden{display:none}
#setup .as-form input.as-code{font-size:calc(var(--u)*1.8);width:6em;min-height:0;padding:.15em .4em}
#setup .as-form .btn{background:#efe6d0;font-size:calc(var(--u)*1.5)}
#setup .as-form .btn.primary{background:var(--org);color:#fff}
#setup .as-pair{border-top:2px solid var(--line);margin-top:calc(var(--u)*.8)}

#assess{position:absolute;inset:0;background:rgba(16,44,52,.94);color:#fff;font-weight:800}
#assess .k{position:absolute;left:0;right:0;top:calc(var(--u)*1);text-align:center;font-size:calc(var(--u)*1.6);color:#bfe3e8}
#assess .h{position:absolute;left:0;right:0;top:calc(var(--u)*3.3);text-align:center;font-size:calc(var(--u)*3.6);line-height:1.2}
#assess .seat{position:absolute;top:calc(var(--u)*1);padding:calc(var(--u)*.4) calc(var(--u)*1.4);border-radius:calc(var(--u)*1);font-size:calc(var(--u)*2.2);background:var(--gold);color:var(--ink)}
#assess .seat.a{left:calc(var(--u)*1.5)}#assess .seat.b{right:calc(var(--u)*1.5)}
#assess .seat small{display:block;font-size:.6em;font-weight:700}
#assess .rest{position:absolute;top:calc(var(--u)*1.3);font-size:calc(var(--u)*1.5);color:#bfe3e8}
#assess .rest.a{left:calc(var(--u)*1.5)}#assess .rest.b{right:calc(var(--u)*1.5)}
#assess .body{position:absolute;left:calc(var(--u)*2);right:calc(var(--u)*2);top:calc(var(--u)*9.5);bottom:calc(var(--u)*7);display:flex;gap:calc(var(--u)*1.5);align-items:stretch;justify-content:center}
#assess .side{width:calc(var(--u)*15);background:#fffbf2;color:var(--ink);border-radius:calc(var(--u)*1.2);display:flex;flex-direction:column;justify-content:space-around;align-items:center;padding:calc(var(--u)*1) 0}
#assess .side .nm{font-size:calc(var(--u)*2.6);color:#8a8070}#assess .side .nm.on{color:#c8402e;font-size:calc(var(--u)*3.2)}
#assess .side .dots{display:flex;gap:calc(var(--u)*.6)}
#assess .side .dots i{width:calc(var(--u)*2.6);height:calc(var(--u)*2.6);border-radius:50%;background:#e7eef0;border:3px solid #1f5f7a;display:flex;align-items:center;justify-content:center;font-style:normal;color:#fff;font-size:calc(var(--u)*1.6)}
#assess .side .dots i.cur{background:#ffe9a8}#assess .side .dots i.ok{background:#3cc277}
#assess .side .skip{font-size:calc(var(--u)*1.7);color:#8a8070}
#assess .side .d3{width:calc(var(--u)*13);height:calc(var(--u)*13);object-fit:contain;display:block}#assess.gng .side .d3{display:none}
#assess .side .mirror{font-size:calc(var(--u)*1.3);color:#8a8070}
#assess .cam{position:relative;flex:0 0 auto;aspect-ratio:16/9;height:100%;background:#0b1d22;border-radius:calc(var(--u)*1.2);overflow:hidden;border:3px solid #fff}
#assess .cam video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}
#assess .cam .dim{position:absolute;top:0;bottom:0;width:50%;background:rgba(0,0,0,.62)}
#assess .cam .dim.a{left:50%}#assess .cam .dim.b{left:0}
#assess .cam .tag{position:absolute;top:calc(var(--u)*.6);font-size:calc(var(--u)*1.6);padding:.1em .6em;border-radius:.5em;background:rgba(0,0,0,.5)}
#assess .cam .tag.a{left:calc(var(--u)*.8)}#assess .cam .tag.b{right:calc(var(--u)*.8)}
#assess .cam .tag.on{background:var(--gold);color:var(--ink)}
#assess .cam .none{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--u)*2);color:#bfe3e8}
#assess .meter{position:relative;width:calc(var(--u)*6);background:rgba(255,255,255,.12);border-radius:calc(var(--u)*1)}
#assess .meter b{position:absolute;left:0;right:0;bottom:0;background:#8fd3f0;border-radius:calc(var(--u)*1)}
#assess .meter i{position:absolute;left:-12%;right:-12%;height:3px;background:#fffa;font-style:normal}
#assess .meter i span{position:absolute;left:0;right:0;bottom:4px;text-align:center;font-size:calc(var(--u)*1.2);color:#bfe3e8}
#assess .meter .cap{position:absolute;top:calc(var(--u)*-2.2);left:0;right:0;text-align:center;font-size:calc(var(--u)*1.4);color:#bfe3e8}
#assess .stim{position:relative;flex:1 1 auto;max-width:calc(var(--u)*50);background:rgba(255,255,255,.07);border:3px solid #fff4;border-radius:calc(var(--u)*1.4);display:flex;flex-direction:column;align-items:center;justify-content:center}
#assess .stim img{max-width:70%;max-height:62%;object-fit:contain}
#assess .stim img.dim{opacity:.45}
#assess .stim .res{font-size:calc(var(--u)*3.2);min-height:1.3em}
#assess .stim .rule{font-size:calc(var(--u)*3.6);line-height:1.8;text-align:center}
#assess .stim .gdots{position:absolute;top:calc(var(--u)*1);display:flex;gap:calc(var(--u)*.7)}
#assess .stim .gdots i{width:calc(var(--u)*1.9);height:calc(var(--u)*1.9);border-radius:50%;background:rgba(255,255,255,.14);border:2px solid #fff6}
#assess .stim .gdots i.ok{background:#ffd84d;border-color:#8a5a00}
#assess .msg{position:absolute;left:50%;bottom:calc(var(--u)*1.3);transform:translateX(-50%);font-size:calc(var(--u)*3);padding:calc(var(--u)*.4) calc(var(--u)*2);border-radius:calc(var(--u)*1.2);white-space:nowrap}
#assess .msg.good{background:#1e7a47}#assess .msg.bad{background:#c8402e}
#assess .btns{position:absolute;left:calc(var(--u)*1.5);bottom:calc(var(--u)*1.3);display:flex;gap:calc(var(--u)*.6)}
#assess .btns button{font-size:calc(var(--u)*1.4);padding:calc(var(--u)*.5) calc(var(--u)*.9);background:rgba(255,253,246,.92)}
#assess.lift .stim,#assess.gng .side,#assess.gng .meter{display:none}
#assess.gng .cam{height:70%;align-self:center}

#end .as-endcard{width:calc(var(--u)*42);margin-left:calc(var(--u)*1.5);max-height:100%;overflow:auto;padding:calc(var(--u)*1.4) calc(var(--u)*1.8)}
#end .as-endcard h2{font-size:calc(var(--u)*2.4)}
#end .as-seat+.as-seat{border-top:2px solid var(--line);margin-top:calc(var(--u)*1);padding-top:calc(var(--u)*.8)}
#end .as-report{border-width:2px;padding:calc(var(--u)*.8) calc(var(--u)*1.1);margin:0 0 calc(var(--u)*.6)}
#end .as-report .as-kicker{font-size:calc(var(--u)*1.3)}
#end .as-report .as-head{font-size:calc(var(--u)*2.2)}
#end .as-report .as-rows{grid-template-columns:1fr 1fr;gap:0 calc(var(--u)*1.2)}
#end .as-report .as-rows div{font-size:calc(var(--u)*1.45)}
#end .as-report .as-band{font-size:calc(var(--u)*1.2)}
#end .as-report .as-next{font-size:calc(var(--u)*1.5)}
#end .as-ther{font-size:calc(var(--u)*1.25)}
#end .as-ther ul{font-size:calc(var(--u)*1.25)}
#end .as-ther .note{color:var(--mut)}
#end .as-ther .btn{background:#efe6d0;font-size:calc(var(--u)*1.3)}
`;

export function createAssess(g) {
  const doc = document, $ = g.$, store = createStore();
  const sig = { a: null, b: null }, live = { a: null, b: null }, cal = { a: null, b: null };
  const ranFor = new Set(), last = { a: null, b: null };
  const IMG = {};
  for (const id of [...new Set([...GO_IDS, ...NOGO_IDS])]) { const im = new Image(); im.src = `assess/img/${id}.webp`; IMG[id] = im; }
  let st = null;
  const cur = (k) => store.current(k);
  const pain = (k) => { const s = cur(k); return !!s && (s.pain === 'yes' || painToday(store, s.code)); };   /* 建檔會痛，或今天在入口小測按了「肩膀會痛」（只算今天） */

  const css = doc.createElement('style'); css.id = 'as-netlift-css'; css.textContent = CSS; doc.head.appendChild(css);

  /* ---------- 設定頁：左邊、右邊誰在玩 ---------- */
  const firstRow = $('oDiff').closest('.row');
  const pair = doc.createElement('div'); pair.className = 'as-pair'; firstRow.parentNode.insertBefore(pair, firstRow);
  const anchor = doc.createElement('div'); pair.appendChild(anchor);
  const prof = {};
  const other = (k) => (k === 'a' ? 'b' : 'a');
  /* 感．動復能入口今天計畫的那位還沒坐下：先坐左邊，左邊有人就坐右邊 */
  { const p = readPlan(), c = p && planFor(p.code) && store.get(p.code) ? p.code : null, a = cur('a'), b = cur('b');
    const k = seatFor(c, a && a.code, b && b.code); if (k) store.setCurrent(c, k); }
  for (const k of ['a', 'b']) {
    prof[k] = mountProfile(anchor, store, {
      slot: k, title: `${SEAT[k]}誰在玩`, game: '撈魚', trial: '「試網」（每人約 1 分鐘，兩人輪流）', showNote: k === 'b',
      busy: (code) => { const o = cur(other(k)); return o && o.code === code ? SEAT[other(k)] : null; },
      onChange: () => { last[k] = null; if (prof[other(k)]) prof[other(k)].render(); recommend(); },
    });
  }
  /* 兩個位置選到同一位（例如舊資料）：右邊改回訪客 */
  if (cur('a') && cur('b') && cur('a').code === cur('b').code) { store.setCurrent(null, 'b'); prof.b.render(); }

  /* ---------- 入口推薦的難度：載入與換人時套用；?diff= 或帶領者自己按過就不再自動切 ---------- */
  const recLine = doc.createElement('div'); recLine.className = 'hint gd-rec'; recLine.hidden = true;
  $('hDiff').insertAdjacentElement('afterend', recLine);
  let diffTouched = new URLSearchParams(location.search).has('diff'), applying = false;
  $('oDiff').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (!applying) diffTouched = true; }));
  function recommend() {
    const s = ['a', 'b'].map(cur).find((x) => x && hubDiff(x.code)), d = s && hubDiff(s.code);
    recLine.hidden = !d;
    if (!d) return;
    recLine.textContent = `感．動復能推薦：${DIFF_NAME[d]}${hubToday(store, s.code) ? `（${s.code} 今天在入口量過了，不用再試網）` : ''}`;
    if (diffTouched) return;
    const b = $('oDiff').querySelector(`[data-v="${d}"]`);
    if (b && g.diff() !== d) { applying = true; b.click(); applying = false; }
  }
  queueMicrotask(recommend);   /* 等 main.js 把難度按鈕的 onclick 綁好再按 */

  /* ---------- 結算頁的報告卡 ---------- */
  const endCard = doc.createElement('div'); endCard.className = 'card as-endcard hide';
  $('end').appendChild(endCard);

  /* ---------- 試網的畫面 ---------- */
  const ov = doc.createElement('div'); ov.id = 'assess'; ov.className = 'hide';
  ov.innerHTML = `<div class="k">試網：開始撈魚前，看看每個人的手</div><div class="h"></div>
    <div class="seat a hide"></div><div class="seat b hide"></div><div class="rest a hide">休息一下</div><div class="rest b hide">休息一下</div>
    <div class="body">
      <div class="side"><img class="d3" alt="示範：一隻手往上舉到最高，停一下，再放下來" src="demo3d/demo3d_up_L.webp?v=1"><div class="nm" data-s="L">左手</div><div class="dots" data-s="L"></div><div class="skip hide" data-s="L">先休息</div>
        <div class="nm" data-s="R">右手</div><div class="dots" data-s="R"></div><div class="skip hide" data-s="R">先休息</div><div class="mirror">畫面是鏡子</div></div>
      <div class="cam"><video playsinline muted></video><div class="dim"></div><div class="tag a">左邊</div><div class="tag b">右邊</div><div class="none hide">展示模式（沒有開鏡頭）</div></div>
      <div class="meter"><div class="cap">高度</div><b></b><i data-v="0"><span>肩膀</span></i><i data-v="0.6"><span>頭頂</span></i></div>
      <div class="stim"><div class="gdots"></div><img alt=""><div class="res"></div><div class="rule">魚 → 舉手<br>垃圾 → 不動</div></div>
    </div>
    <div class="msg hide"></div>
    <div class="btns"><button type="button" data-b="back">← 回設定畫面</button><button type="button" data-b="skip">略過這一手</button></div>`;
  $('stage').appendChild(ov);
  const q = (s) => ov.querySelector(s), qa = (s) => ov.querySelectorAll(s);
  const E = { d3: q('.side .d3'), h: q('.h'), video: q('.cam video'), dim: q('.cam .dim'), none: q('.cam .none'), fill: q('.meter b'), img: q('.stim img'), res: q('.stim .res'), rule: q('.stim .rule'), gdots: q('.stim .gdots'), msg: q('.msg'), skip: q('[data-b=skip]') };
  const LO = -1, HI = 1.3, pct = (v) => Math.max(0, Math.min(1, (v - LO) / (HI - LO))) * 100;
  qa('.meter i').forEach((i) => { i.style.bottom = pct(+i.dataset.v) + '%'; });
  q('[data-b=back]').onclick = () => g.back();
  E.skip.onclick = () => skip();
  const cache = new Map();
  const set = (el, key, val) => { const k = el; const c = cache.get(k) || {}; if (c[key] === val) return; c[key] = val; cache.set(k, c); if (key === 'text') el.textContent = val; else if (key === 'cls') el.className = val; else if (key === 'html') el.innerHTML = val; else el.style[key] = val; };

  /* ---------- 鏡頭樣本：每個位置自己的量測訊號 ---------- */
  function pose(k, lm, now) {
    if (!lm) return;
    if (!sig[k]) sig[k] = new HandSignal({ aspect: g.aspect() });
    const r = sig[k].update(lm, now);
    live[k] = { t: now, lh: r.lh, rh: r.rh, lm, seq: (live[k] ? live[k].seq : 0) + 1 };
    if (g.phase() === 'calib' && r.raw != null) {
      const c = cal[k] || (cal[k] = { min: r.raw, max: r.raw });
      c.min = Math.min(c.min, r.raw); c.max = Math.max(c.max, r.raw);
    }
  }
  /* 新一局重新校正：舊的範圍不要沿用 */
  function resetCal() { cal.a = cal.b = null; }

  function say(id) { const A = g.AE; if (!A.ac) return; if (A.speaking) { if (!A.queue.includes(id)) A.queue.push(id); } else A.say(id, true); }
  function msg(text, sec, good = true) { if (st) st.msg = { text, until: performance.now() + sec * 1000, good }; }

  /* ---------- 流程 ---------- */
  function gate(next) {
    if (st) return true;
    if (!(g.mode() === 'camera' || g.demo)) return false;
    const queue = ['a', 'b'].filter((k) => { const s = cur(k); return s && !ranFor.has(s.code); });
    /* 今天在感．動復能入口量過的人不再試網，沿用那一筆，等同他的試網剛做完；沒量過的照原本排隊 */
    for (const k of [...queue]) {
      const s = cur(k), o = cur(other(k));
      const h = fromHub(store, s.code, !!g.demo, { ver: g.ver, seat: k === 'a' ? 'L' : 'R', partner: o ? o.code : null });
      if (h) { last[k] = { id: h.id, code: s.code, played: false, demo: !!h.demo }; ranFor.add(s.code); queue.splice(queue.indexOf(k), 1); }
    }
    if (!queue.length) return false;
    st = { next, queue, k: null, s: null, stage: 'intro', t: 0, msg: null, first: true, sampleAt: {} };
    const stream = g.stream();
    if (stream && E.video.srcObject !== stream) { E.video.srcObject = stream; }
    if (stream) E.video.play().catch(() => {});
    E.none.classList.toggle('hide', !!stream);
    E.none.textContent = g.demo ? '展示模式（沒有開鏡頭）' : '沒有鏡頭畫面';
    g.setPhase('assess');
    say('as_intro');
    return true;
  }

  function stage(name) { st.stage = name; st.t = 0; }

  function startSeat() {
    const k = st.queue.shift(); st.k = k; st.s = cur(k);
    const c = cal[k], camOk = g.mode() === 'camera' && c && c.max - c.min >= 0.45;
    const rest = camOk ? c.min + 0.3 * (c.max - c.min) : -0.5;
    st.lift = new LiftMeasure({ restLine: rest, aspect: g.aspect() });
    st.gng = new GoNoGo({ restLine: rest });
    st.seq = -1; st.stim = null; st.gi = 0; st.ni = 0; st.demo = {}; st.at = Date.now();
    say(st.first ? (k === 'a' ? 'as_turnL' : 'as_turnR') : 'as_swap');
    st.first = false;
    stage('turn');
  }

  function skip() {
    if (!st) return;
    const s = st.stage;
    if (s === 'intro') return startSeat();
    if (s === 'turn') return stage('lift');
    if (s === 'lift') return onLift(st.lift.skipSide());
    if (s === 'gngIntro') return stage('gng');
    if (s === 'gng') return finishSeat(false);
    if (s === 'seatDone') return startSeat();
    if (s === 'outro') return finishAll();
  }

  function onLift(evs) {
    for (const e of evs) {
      if (e.type === 'side') { say(e.side === 'L' ? 'as_left' : 'as_right'); if (pain(st.k)) say('as_pain'); }
      else if (e.type === 'ready' && e.rep > 0) say('as_again');
      else if (e.type === 'rep') { if (e.ok) { g.AE.tick(); msg('很好', 1); } if (e.held) { say('as_low'); msg('手放下來', 1.6, false); } }
      else if (e.type === 'remindLow') { say('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'skipSide') { say('as_rest'); msg('這隻手先休息', 2.2, false); }
      else if (e.type === 'done') { stage('gngIntro'); say('as_gng'); }
    }
  }

  function onGng(evs, now) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, id: e.kind === 'go' ? GO_IDS[st.gi++ % GO_IDS.length] : NOGO_IDS[st.ni++ % NOGO_IDS.length], t: now, res: null }; g.AE.burst(1300, 0.12, 0.25); }
      else if (e.type === 'hit') { st.stim.res = 'hit'; st.stim.resAt = now; g.AE.together(); }
      else if (e.type === 'commission') { st.stim.res = 'commission'; st.stim.resAt = now; g.AE.boing(); }
      else if (e.type === 'reject') { st.stim.res = 'reject'; st.stim.resAt = now; g.AE.single(); }
      else if (e.type === 'omission') { st.stim.res = 'omission'; st.stim.resAt = now; g.AE.splash(); }
      else if (e.type === 'remindLow') { say('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'done') finishSeat(true);
    }
  }

  /* 展示模式：沒有鏡頭，用假的手跑一遍。左邊：左手低右手高、反應約 0.75 秒、第 2 個垃圾手滑；右邊：兩手差不多、反應約 1 秒 */
  function demoSample(now) {
    const d = st.demo, low = -0.9, k = st.k;
    if (st.stage === 'lift') {
      const L = st.lift, sd = L.sideId;
      if (L.st === 'up') {
        if (d.upAt == null) d.upAt = now;
        const e = (now - d.upAt) / 1000;
        const target = k === 'a' ? (sd === 'L' ? 0.32 + 0.04 * L.rep : 0.95) : (sd === 'L' ? 0.7 : 0.62 + 0.03 * L.rep);
        const v = e < 1 ? low + (target - low) * e : e < 1.6 ? target : e < 2.2 ? target - (target - low) * (e - 1.6) / 0.6 : low;
        return { t: now, lh: sd === 'L' ? v : low, rh: sd === 'R' ? v : low, lm: null };
      }
      d.upAt = null;
      return { t: now, lh: low, rh: low, lm: null };
    }
    if (st.stage === 'gng' && st.stim && !st.stim.res) {
      const e = (now - st.stim.t) / 1000, rt = k === 'a' ? 0.75 : 1.0;
      const lift = st.stim.kind === 'go' || (k === 'a' && st.stim.kind === 'nogo' && st.ni === 2);
      if (lift && e > rt) { const v = low + Math.min(1, (e - rt) / 0.5) * 1.2; return { t: now, lh: v, rh: low, lm: null }; }
    }
    return { t: now, lh: low, rh: low, lm: null };
  }

  /* 這一幀有沒有新的樣本：鏡頭有新的一格才算；看不到人就每 1/30 秒給一個「看不到手」 */
  function sample(now) {
    if (g.demo) return demoSample(now);
    const L = live[st.k];
    if (L && now - L.t <= STALE_MS) {
      if (L.seq === st.seq) return null;
      st.seq = L.seq; return { t: L.t, lh: L.lh, rh: L.rh, lm: L.lm };
    }
    if (st.sampleAt.t != null && now - st.sampleAt.t < 33) return null;
    st.sampleAt.t = now;
    return { t: now, lh: null, rh: null, lm: null };
  }

  function step(now, dt) {
    if (!st) return;
    st.t += dt;
    const smp = st.k && (st.stage === 'lift' || st.stage === 'gng') ? sample(now) : null;
    if (smp) st.last = smp;
    switch (st.stage) {
      case 'intro': if (st.t >= 7.2) startSeat(); break;      /* 等開場那句講完（約 6.9 秒） */
      case 'turn': if (st.t >= 3.8) stage('lift'); break;     /* 「請左邊的來…」約 3.4～3.6 秒 */
      case 'lift': if (smp) onLift(st.lift.push(smp)); break;
      case 'gngIntro': if (st.t >= 5.2) stage('gng'); break;
      case 'gng': if (smp) { const v = Math.max(smp.lh ?? -9, smp.rh ?? -9); onGng(st.gng.push({ t: smp.t, v: v > -9 ? v : null }), now); } break;
      case 'seatDone': if (st.t >= 1.6) startSeat(); break;
      case 'outro': if (st.t >= 2.8) finishAll(); break;
    }
    if (st) render(now);
  }

  function finishSeat(complete) {
    const k = st.k, s = st.s, demo = !!g.demo, o = cur(other(k));
    const rec = {
      code: s.code, game: GAME, ver: g.ver, at: st.at, input: demo ? 'demo' : 'camera', complete, seat: k === 'a' ? 'L' : 'R',
      partner: o ? o.code : null, warm: { calib: !!cal[k] }, pain: s.pain,
      lift: st.lift.summary(), gng: st.gng.trials.length ? st.gng.summary() : null, ...(demo ? { demo: true } : {}),
    };
    const r = store.addSession(rec);
    last[k] = { id: r.id, code: s.code, played: false, demo };
    ranFor.add(s.code);
    st.stim = null;
    if (st.queue.length) { msg(`${SEAT[k]}完成了，謝謝`, 1.5); stage('seatDone'); }
    else { stage('outro'); say('as_done'); }
  }

  function finishAll() { const next = st.next; st = null; next(); }

  function cancel() { st = null; ov.classList.add('hide'); }

  /* 每局開始（新的一局 newGame）呼叫：這一局兩邊的舉手門檻；肩痛的那一側最多到簡單難度 */
  function thrBy(thr) { resetCal(); return { a: pain('a') ? Math.min(thr, PAIN_THR) : thr, b: pain('b') ? Math.min(thr, PAIN_THR) : thr }; }

  /* ---------- 畫面 ---------- */
  function render(now) {
    const S = st, k = S.k, isLift = S.stage === 'intro' || S.stage === 'turn' || S.stage === 'lift', L = S.lift;
    ov.classList.toggle('lift', isLift); ov.classList.toggle('gng', !isLift);   /* 顯示與否由 setPhase 管，這裡不動 hide */
    let head = '';
    if (S.stage === 'intro') head = '一個一個來，兩隻手各舉 3 下';
    else if (S.stage === 'turn') head = `請${SEAT[k]}的來，${SEAT[other(k)]}的休息一下`;
    else if (S.stage === 'lift') { const nm = SIDE[L.sideId]; head = L.st === 'low' ? `${nm}先放下來` : pain(k) ? `${nm}舉到不會痛的高度，停一下` : `${nm}舉到最高，停一下`; }
    else if (S.stage === 'gngIntro') head = '看到魚就舉手，看到垃圾手不要動';
    else if (S.stage === 'gng') head = S.stim && !S.stim.res ? '' : '手放下來，等下一個';
    else if (S.stage === 'seatDone') head = '換下一位';
    else head = '試網完成，開始撈魚囉';
    set(E.h, 'text', head);
    for (const x of ['a', 'b']) {
      const on = !!k && x === k && S.stage !== 'outro';
      const tag = q(`.seat.${x}`), rest = q(`.rest.${x}`), s = on ? S.s : null;
      set(tag, 'cls', `seat ${x}${on ? '' : ' hide'}`);
      if (s) set(tag, 'html', `${SEAT[x]}　${s.code}<small>請舉手</small>`);
      set(rest, 'cls', `rest ${x}${k && !on && S.stage !== 'outro' ? '' : ' hide'}`);
      set(q(`.cam .tag.${x}`), 'cls', `tag ${x}${on ? ' on' : ''}`);
    }
    set(E.dim, 'cls', k ? `dim ${k}` : 'dim hide');
    if (isLift) {
      for (const sd of ['L', 'R']) {
        const active = S.stage === 'lift' && L && L.sideId === sd && !L.done;
        const n = L ? L.reps.filter((r) => r.side === sd).length : 0, skipped = L ? L.skipped.includes(sd) : false;
        set(q(`.nm[data-s=${sd}]`), 'cls', `nm${active ? ' on' : ''}`);
        set(q(`.skip[data-s=${sd}]`), 'cls', `skip${skipped ? '' : ' hide'}`);
        const reps = L ? L.o.reps : 3;
        set(q(`.dots[data-s=${sd}]`), 'html', skipped ? '' : Array.from({ length: reps }, (_, i) => `<i class="${i < n ? 'ok' : active && i === n ? 'cur' : ''}">${i < n ? '✓' : ''}</i>`).join(''));
      }
      const sd = S.stage === 'lift' && L ? L.sideId : 'L', smp = S.last;
      /* 3D 示範人（11-12 起全遊戲共用）：輪到哪隻手就示範哪隻手；畫面是鏡子，「左手」示範舉在畫面左邊 */
      const d3 = `demo3d/demo3d_up_${sd}.webp?v=1`; if (E.d3.getAttribute('src') !== d3) E.d3.setAttribute('src', d3);
      const v = smp ? (sd === 'L' ? smp.lh : smp.rh) : null;
      set(E.fill, 'height', v == null || S.stage !== 'lift' ? '0%' : pct(v) + '%');
      set(E.skip, 'text', '略過這一手');
    } else {
      const G = S.gng, done = G ? G.trials.length : 0;
      set(E.gdots, 'html', S.stage === 'gng' ? GNG.seq.map((_, i) => `<i class="${i < done ? 'ok' : ''}"></i>`).join('') : '');
      const T = S.stim, show = S.stage === 'gng' && T && !(T.res && now - T.resAt > 700);
      set(E.rule, 'cls', `rule${S.stage === 'gngIntro' ? '' : ' hide'}`);
      if (show) { const src = `assess/img/${T.id}.webp`; if (E.img.getAttribute('src') !== src) E.img.setAttribute('src', src); }
      set(E.img, 'cls', show ? (T.res ? 'dim' : '') : 'hide');
      set(E.res, 'text', show && T.res ? { hit: '撈到了', reject: '忍住了', commission: '是垃圾喔', omission: '游走了' }[T.res] : '');
      set(E.res, 'color', T && (T.res === 'hit' || T.res === 'reject') ? '#5be08a' : '#ffb4a8');
      set(E.skip, 'text', '略過看圖');
    }
    set(E.skip, 'display', S.stage === 'outro' ? 'none' : '');
    const m = S.msg && S.msg.until > now ? S.msg : null;
    set(E.msg, 'cls', m ? `msg ${m.good ? 'good' : 'bad'}` : 'msg hide');
    if (m) set(E.msg, 'text', m.text);
  }

  /* ---------- 結算頁 ---------- */
  function download(kind, code) {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const csv = kind === 'csv', body = csv ? store.exportCsv(code) : store.exportJson(code);
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }));
    a.download = `動作紀錄_${code}_${stamp}.${csv ? 'csv' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function afterResult(R) {
    endCard.innerHTML = '<h2>動作報告</h2>';
    let any = false;
    for (const k of ['a', 'b']) {
      const s = cur(k), Lk = last[k];
      if (!s || !Lk || Lk.code !== s.code) continue;
      if (!Lk.played && R) {
        const p = k === 'a' ? R.left : R.right;
        store.updateSession(Lk.id, { play: { score: R.score, diff: g.diff(), lifts: p.lifts, avgRel: p.avgHeight, maxRel: p.maxHeight, hands: p.hands, singleNets: p.singleNets, together: R.together, nets: R.nets, togetherRatio: R.togetherRatio, avgGapMs: R.avgGapMs } });
        Lk.played = true;
      }
      const box = doc.createElement('div'); box.className = 'as-seat'; endCard.appendChild(box);
      const hist = store.history(s.code, GAME).filter((h) => !!h.demo === Lk.demo);
      const summary = buildSummary(s, hist, { goName: '魚', nogoName: '垃圾', goVerb: '舉', trial: '試網', painNote: PAIN_NOTE });
      renderReport({ host: box, therHost: box, subject: s, summary, history: hist, kicker: `${SEAT[k]} `, onExport: (x) => download(x, s.code) });
      any = true;
    }
    /* 感．動復能的「下一款」卡：哪一位有今天的計畫就用他的；兩位都沒有就不畫 */
    const ps = ['a', 'b'].map(cur).find((x) => x && planFor(x.code));
    if (renderNext(endCard, GAME, ps ? ps.code : null)) any = true;
    endCard.classList.toggle('hide', !any);
  }

  return {
    gate, step, cancel, afterResult, pose, thrBy,
    get active() { return !!st; },
    get state() { return st && { stage: st.stage, k: st.k, lift: st.lift && { st: st.lift.st, side: st.lift.sideId, rep: st.lift.rep, done: st.lift.done }, gng: st.gng && { st: st.gng.st, i: st.gng.i }, stim: st.stim }; },
    store, prof, cal, live,
  };
}
