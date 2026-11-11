/* 節奏律動的評估層接頭（v18.2，2026-11-10，只接單人模式；v18.1 同日稍早）
   共用模組在 ./assess/（正本 100_Todo/projects/2026-11-06_遊戲評估層/assess/，改正本後跑 sync.sh 複製過來）。
   這裡負責：設定頁「誰在玩」、正式開始前的「試音」量測關、結算頁的動作報告、肩痛者不加難度。
   沒選個案（訪客）、雙人競賽、團體投影時，遊戲流程與 v18 完全相同。

   試音（約 1 分鐘，每次相同，像表演者上台前的試音）：
   1. 左手 3 下、右手 3 下：舉到最高、停一下、放下。量絕對高度（軀幹長）、舉起秒數、側傾與聳肩。
   2. 8 題看圖：音符就舉手、月亮（睡覺時間）手不動，固定順序。量反應時間、該舉沒舉、不該舉卻舉。
   順序：試音 → 原本的暖身校正 → 倒數 → 開始。同一位在同一次開啟頁面只量一次（「再玩一次」不再量）。

   和釣魚、舉網不同的地方：
   - 量測用 assess/signal.js 的手部高度（跨遊戲同一把尺），不用遊戲自己的高舉判定（那個是肩寬為單位、會個人化縮放）。
   - 遊戲的姿勢模型跑在「自動取景」裁切後的畫面上。試音的舉手與看圖期間鎖住取景框，框一動，量到的高度就會跟著飄。
   - 這款沒有語音，提示用畫面文字加遊戲原有音效。
   - 說法都由 SUMMARY_OPT 傳給共用模組（2026-11-10 正本已支援，不再另外改字）。

   v18.2 接上「感．動復能」入口（assess/hub.js，規則寫在那個檔頭），一樣只接單人：
   - 入口今天已經幫這位量過（同一代號、今天、有舉手資料），按開始就不再試音：把入口那一筆存成節奏律動的一筆
     （多記 hub、measuredAt），當成試音剛做完，接著照原本的暖身校正 → 倒數；結算頁報告照原本的路徑產生。
     展示模式（?demo=1）只沿用入口的展示資料，鏡頭模式只沿用真的資料。
   - 推薦的難度：這款單人沒有「簡單／普通／困難」可選，歌曲難度（輕鬆／標準／挑戰，personal.tier）由暖身量到的節奏決定。
     入口的推薦當「上限」：easy→最多輕鬆、normal→最多標準、hard→不限（照暖身）。暖身量到比較慢就照暖身，不會被推到更難。
     「誰在玩」下面一行小字「感．動復能推薦：…」，旁邊可按「改回暖身自動調整」（帶領者手動改，照他的）。
     舉手會痛的既有處理（挑戰係數 1.0、門檻 ×0.8）不變。
   - 結算頁長輩報告卡下面加「下一款」卡（renderNext）。
   入口沒有計畫、訪客、雙人、團體：流程與 v18.1 完全相同。 */
import { createStore } from './assess/store.js?v=1';
import { LiftMeasure } from './assess/lift.js?v=1';
import { GoNoGo, GNG } from './assess/gonogo.js?v=1';
import { HandSignal } from './assess/signal.js?v=1';
import { buildSummary } from './assess/advice.js?v=1';
import { mountProfile, renderReport, remove } from './assess/ui.js?v=1';
import { adopt, hubToday, pickFor, renderNext, DIFFS, DIFF_NAME, painToday } from './assess/hub.js?v=1';

const GAME = 'rhythm';
const SIDE = { L: '左手', R: '右手' };
const REST = -0.5;            /* 手低於肩膀 0.5 軀幹長（約胸口以下）才算放下。試音在暖身之前，沒有個人校正可用，同釣魚、舉網未校正時的值 */
const STALE_MS = 300;         /* 這麼久沒有新的鏡頭樣本，就當成看不到手 */
const INTRO_MIN = 5;          /* 開場說明至少停幾秒（沒有語音，要留時間讀字） */
const GNG_INTRO = 6;
const OUTRO = 2.6;
const PAIN_NOTE = '建檔註記舉手會痛：這次遊戲的判定時間不再收緊 20%（挑戰係數 1.2 改為 1.0），高舉的偵測門檻降為原本的 80%（不低於安全下限）；試音時提示「舉到不會痛的高度」。這款遊戲本來就沒有「再舉高一點」的提示。';
/* buildSummary 的說法（共用模組 2026-11-10 起支援 goUnit／nogoLabel／headNogo／lib） */
const SUMMARY_OPT = { goName: '音符', nogoName: '月亮', goVerb: '舉', trial: '試音', painNote: PAIN_NOTE, goUnit: '個', nogoUnit: '個', nogoLabel: '看到月亮手不動',
  headNogo: '看到{nogo}時，比上次更能忍住不動', lib: { moveSmall: '看到音符就把手抬起來，不用很高，動一下就算。' } };
/* 入口交接（純函式，node 測得到）：今天在入口量過、而且展示／真實一致，就存成節奏律動的一筆並回傳；否則 null（照原本試音） */
export function fromHub(store, code, demo, extra, now = Date.now()) {
  const h = hubToday(store, code, now);
  return h && !!h.demo === !!demo ? adopt(store, code, GAME, extra, now) : null;
}
/* 入口推薦的難度（'easy'｜'normal'｜'hard'），沒有回 null */
export function hubDiff(code, opt) { const p = pickFor(GAME, code, opt); return p && DIFFS.includes(p.diff) ? p.diff : null; }
/* 推薦當上限：暖身決定的歌曲難度 tier 不超過推薦那一級；沒有推薦就照 tier */
const RANK = { easy: 0, normal: 1, hard: 2 };
export function capTier(tier, rec) { return rec && RANK[rec] != null && RANK[tier] != null && RANK[rec] < RANK[tier] ? rec : tier; }
export const TIER_NAME = { easy: '輕鬆', normal: '標準', hard: '挑戰' };   /* 與 index.html 相同，給推薦那行小字用 */
const FONT = '"Yuanti TC","PingFang TC","Noto Sans TC",sans-serif';
const STIM_BG = '#163440';

const CSS = `
#setup .as-who{margin:16px 0 4px;padding-top:14px;border-top:2px dashed var(--line)}
#setup .as-who .lab{font-weight:900;font-family:var(--round);font-size:1.15rem;margin-bottom:6px}
#setup .as-who>.seg{display:flex;flex-wrap:wrap;border-radius:18px;width:auto}
#setup .as-who .seg button{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.25;color:var(--ink)}
#setup .as-who>.seg button{flex:0 1 auto;min-width:118px;padding:8px 16px;font-size:1.05rem}
#setup .as-who .seg button small{font-size:.72em;color:var(--soft);font-weight:600}
#setup .as-who .seg button[disabled]{opacity:.45;cursor:not-allowed}
#setup .as-who .as-cur{font-size:1rem;font-weight:800;color:#0A6E5E;margin:6px 0 0}
#setup .as-who .note{color:var(--soft);font-size:.9rem;line-height:1.6;margin-top:4px}
#setup .as-who .link-btn{background:none;border:0;color:#0A9C84;text-decoration:underline;cursor:pointer;font:inherit;font-weight:700;padding:0 .3em}
#setup .as-form{background:#F4FBF9;border-radius:16px;padding:12px 14px;margin-top:10px}
#setup .as-form .field{margin:0 0 10px}
#setup .as-form .lab{font-size:1rem;margin-bottom:2px}
#setup .as-form .seg{display:flex;flex-wrap:wrap;width:100%;border-radius:16px}
#setup .as-form .seg button{flex:1 1 110px;min-width:0;padding:9px 10px}
#setup .as-form .as-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#setup .as-form .btn{padding:11px 22px;font-size:1.02rem}
#setup .as-form .btn:not(.primary){background:#fff;color:var(--ink);box-shadow:0 2px 8px rgba(29,59,54,.14)}
#setup .as-form .as-err{color:#E4572E;font-weight:800;min-height:1.2em;margin:4px 0}
.asHeroWho{display:block;width:fit-content;margin-top:12px;background:rgba(255,255,255,.92);border-radius:14px;padding:7px 14px;font-weight:800;font-size:1.02rem;color:#0A6E5E}
@media (max-width:760px){.asHeroWho{margin:12px auto 0}}

/* 這款遊戲把所有 section 設成全螢幕固定層（每個畫面都是 section），共用模組的報告卡也是 section，要改回一般區塊 */
#asElder section.as-report{position:static;inset:auto;overflow:visible}
#asElder .as-report{margin:0 0 14px;border-radius:20px;box-shadow:0 2px 4px rgba(29,59,54,.05),0 10px 24px rgba(29,59,54,.07)}
#asTher details.as-ther{background:#fff;border-radius:20px;padding:16px 20px;margin-bottom:14px;box-shadow:0 2px 4px rgba(29,59,54,.05),0 10px 24px rgba(29,59,54,.07)}
#asTher details.as-ther>summary{font-weight:900;font-family:var(--round);cursor:pointer}
#asTher .as-ther table{width:100%;border-collapse:collapse;margin-top:8px}
#asTher .as-ther th,#asTher .as-ther td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left;font-size:.95rem}
#asTher .as-ther th{color:var(--soft);font-weight:400}
#asTher .as-ther .note{color:var(--soft);font-size:.9rem;line-height:1.6;margin-top:6px}
#asTher .as-ther .btn-row{display:flex;gap:10px;flex-wrap:wrap}
#asTher .as-ther .btn{font-size:1rem;padding:10px 18px}

#assess{position:absolute;inset:0;z-index:15;background:rgba(14,40,46,.96);color:#fff;font-family:var(--round);font-weight:800;
  --u:min(1vw,1.75vh);display:flex;flex-direction:column;padding:calc(var(--u)*1.2) calc(var(--u)*2) calc(var(--u)*.8)}
#assess .top{flex:none;text-align:center}
#assess .k{font-size:calc(var(--u)*1.7);color:#BFE3E8}
#assess .h{font-size:calc(var(--u)*3.5);line-height:1.25;white-space:pre-line;margin-top:calc(var(--u)*.3);min-height:1.25em}
#assess .coach{font-size:calc(var(--u)*2);color:#FFE9A8;margin-top:calc(var(--u)*.3);min-height:1.3em}
#assess .body{flex:1;min-height:0;display:flex;gap:calc(var(--u)*1.5);margin:calc(var(--u)*1.1) 0 calc(var(--u)*.6);align-items:stretch}
#assess .side{flex:0 0 calc(var(--u)*16);background:#FFFBF2;color:var(--ink);border-radius:calc(var(--u)*1.4);display:flex;flex-direction:column;justify-content:space-around;align-items:center;padding:calc(var(--u)*1) 0}
#assess .side .nm{font-size:calc(var(--u)*2.6);color:#8A8070}
#assess .side .nm.on{color:#C8402E;font-size:calc(var(--u)*3.2)}
#assess .side .dots{display:flex;gap:calc(var(--u)*.6)}
#assess .side .dots i{width:calc(var(--u)*2.8);height:calc(var(--u)*2.8);border-radius:50%;background:#E7EEF0;border:3px solid #1D3B36;display:grid;place-items:center;font-style:normal;color:#fff;font-size:calc(var(--u)*1.7)}
#assess .side .dots i.cur{background:#FFE9A8}
#assess .side .dots i.ok{background:#3CC277}
#assess .side .rest{font-size:calc(var(--u)*1.8);color:#8A8070}
#assess .side .mirror{font-size:calc(var(--u)*1.4);color:#8A8070}
#assess .cam{flex:1 1 auto;min-width:0;position:relative;border-radius:calc(var(--u)*1.4);overflow:hidden;background:#0B1D22;border:3px solid #fff}
#assess .cam canvas,#assess .stim canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#assess .meter{flex:0 0 calc(var(--u)*6.5);position:relative;background:rgba(255,255,255,.12);border-radius:calc(var(--u)*1);margin-top:calc(var(--u)*2.6)}
#assess .meter b{position:absolute;left:0;right:0;bottom:0;background:#8FD3F0;border-radius:calc(var(--u)*1)}
#assess .meter i{position:absolute;left:-14%;right:-14%;height:3px;background:#fffa;font-style:normal}
#assess .meter i span{position:absolute;left:0;right:0;bottom:5px;text-align:center;font-size:calc(var(--u)*1.3);color:#BFE3E8}
#assess .meter .cap{position:absolute;top:calc(var(--u)*-2.4);left:0;right:0;text-align:center;font-size:calc(var(--u)*1.5);color:#BFE3E8}
#assess .stim{flex:1.4 1 0;min-width:0;position:relative;border-radius:calc(var(--u)*1.4);border:3px solid #fff4;overflow:hidden;background:${STIM_BG}}
#assess .stim .gdots{position:absolute;top:calc(var(--u)*1);left:0;right:0;display:flex;justify-content:center;gap:calc(var(--u)*.7);z-index:1}
#assess .stim .gdots i{width:calc(var(--u)*1.9);height:calc(var(--u)*1.9);border-radius:50%;background:rgba(255,255,255,.14);border:2px solid #fff6}
#assess .stim .gdots i.ok{background:#FFD84D;border-color:#8A5A00}
#assess .stim .res{position:absolute;left:0;right:0;bottom:calc(var(--u)*1.2);text-align:center;font-size:calc(var(--u)*3.4);z-index:1}
#assess.lift .stim,#assess.gng .side,#assess.gng .meter{display:none}
#assess.gng .cam{flex:1 1 0}
#assess .foot{flex:none;position:relative;display:flex;align-items:center;min-height:calc(var(--u)*5.6)}
#assess .btns{display:flex;gap:calc(var(--u)*.8);flex-wrap:wrap;position:relative;z-index:1}
#assess .btns button{font:inherit;font-size:calc(var(--u)*1.6);padding:calc(var(--u)*.7) calc(var(--u)*1.3);border:0;border-radius:99px;background:rgba(255,253,246,.94);color:var(--ink);cursor:pointer;min-height:44px}
#assess .msg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:calc(var(--u)*3);padding:calc(var(--u)*.35) calc(var(--u)*2.2);border-radius:99px;white-space:nowrap;pointer-events:none}
#assess .msg.good{background:#1E7A47}#assess .msg.bad{background:#C8402E}
`;

/* ---------- 看圖的兩張圖：自己畫，不下載任何素材 ---------- */
/* 音符（go）：金色八分音符，發光 */
function drawNote(c, cx, cy, s, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = '#FFD23F'; c.shadowColor = 'rgba(255,210,63,.75)'; c.shadowBlur = s * 0.1;
  const hx = cx - s * 0.12, hy = cy + s * 0.3, rx = s * 0.21, ry = s * 0.145;
  c.beginPath(); c.ellipse(hx, hy, rx, ry, -0.42, 0, Math.PI * 2); c.fill();
  const sx = hx + rx * 0.82, top = cy - s * 0.46, sw = s * 0.075;
  c.fillRect(sx - sw / 2, top, sw, hy - top);
  c.beginPath(); c.moveTo(sx + sw / 2, top);
  c.bezierCurveTo(sx + s * 0.1, top + s * 0.17, sx + s * 0.4, top + s * 0.22, sx + s * 0.27, top + s * 0.56);
  c.bezierCurveTo(sx + s * 0.29, top + s * 0.33, sx + s * 0.15, top + s * 0.27, sx + sw / 2, top + s * 0.25);
  c.closePath(); c.fill();
  c.restore();
}
/* 月亮（no-go）：銀藍色彎月＋zzz，表示睡覺時間 */
function drawMoon(c, cx, cy, s, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  /* 彎月＝外圓扣掉內圓。直接算兩圓交點畫成一條路徑（用 clip 的話，發光會被切出一個暗圓） */
  const ox = cx - s * 0.1, oy = cy + s * 0.06, r = s * 0.42, ix = cx + s * 0.08, iy = cy - s * 0.06, ir = r * 0.84;
  const dx = ix - ox, dy = iy - oy, d = Math.hypot(dx, dy), a = (r * r - ir * ir + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, r * r - a * a));
  const bx = ox + (a * dx) / d, by = oy + (a * dy) / d, px = (-dy / d) * hh, py = (dx / d) * hh;
  const P1 = [bx + px, by + py], P2 = [bx - px, by - py];
  c.save();
  c.fillStyle = '#CFE0FF'; c.shadowColor = 'rgba(207,224,255,.7)'; c.shadowBlur = s * 0.1;
  c.beginPath();
  c.arc(ox, oy, r, Math.atan2(P1[1] - oy, P1[0] - ox), Math.atan2(P2[1] - oy, P2[0] - ox), false);
  c.arc(ix, iy, ir, Math.atan2(P2[1] - iy, P2[0] - ix), Math.atan2(P1[1] - iy, P1[0] - ix), true);
  c.closePath(); c.fill();
  c.restore();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  [[0.26, -0.16, 0.15], [0.39, -0.33, 0.2], [0.55, -0.53, 0.26]].forEach(([dx, dy, fs]) => {
    c.font = `900 ${s * fs}px ${FONT}`; c.fillText('z', cx + s * dx, cy + s * dy);
  });
  c.restore();
}

export function createAssess(g) {
  const doc = document, $ = g.$, store = createStore();
  const ranFor = new Set(), lastBy = new Map();
  let st = null, sig = null, live = null;
  const cur = () => store.current();
  const pain = () => { const s = cur(); return !!s && (s.pain === 'yes' || painToday(store, s.code)); };   /* 建檔會痛，或今天在入口小測按了「肩膀會痛」（只算今天） */

  const css = doc.createElement('style'); css.id = 'as-rhythm-css'; css.textContent = CSS; doc.head.appendChild(css);

  /* ---------- 設定頁：誰在玩（放在「怎麼帶大家玩」卡片裡，只有單人模式看得到） ---------- */
  const modeCard = $('segMode').closest('.card');
  const anchor = doc.createElement('div'); modeCard.insertBefore(anchor, modeCard.querySelector('.devLine'));
  const heroWho = doc.createElement('div'); heroWho.className = 'asHeroWho hidden';
  $('heroStart').insertAdjacentElement('afterend', heroWho);
  const profile = mountProfile(anchor, store, {
    game: '節奏律動', trial: '約 1 分鐘的「試音」',
    onChange: () => syncHero(),
  });
  /* 入口推薦（只在單人、這位有今天的計畫時出現）；按「改回暖身自動調整」就不套推薦 */
  const recLine = doc.createElement('p'); recLine.className = 'legend gd-rec hidden';
  profile.el.insertAdjacentElement('afterend', recLine);
  let recOff = false;
  const rec = () => { const s = cur(); return g.mode() === 'solo' && s && !recOff ? hubDiff(s.code) : null; };
  const hubDone = (s) => { const h = s && hubToday(store, s.code); return !!h && !!h.demo === !!g.DEMO; };
  function syncRec() {
    const s = cur(), d = g.mode() === 'solo' && s ? hubDiff(s.code) : null;
    recLine.classList.toggle('hidden', !d);
    if (!d) return;
    recLine.innerHTML = '';
    /* 用這款自己的難度叫法（輕鬆／標準／挑戰），和入口推薦頁、歌曲卡片上的字一致 */
    const rhy = TIER_NAME[d] || DIFF_NAME[d];
    recLine.append(recOff ? `感．動復能推薦：${rhy}（已改回暖身自動調整）`
      : d === 'hard' ? `感．動復能推薦：${rhy}（歌曲難度照暖身結果）` : `感．動復能推薦：歌曲難度最多到「${rhy}」`);
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'link-btn';
    b.style.cssText = 'background:none;border:0;color:#2c6fb3;text-decoration:underline;font:inherit;cursor:pointer;padding:0 .4em';
    b.textContent = recOff ? '照推薦' : '改回暖身自動調整';
    b.onclick = () => { recOff = !recOff; syncRec(); };
    recLine.append(b);
  }
  function syncHero() {
    const s = cur(), on = g.mode() === 'solo' && !!s;
    heroWho.classList.toggle('hidden', !on);
    if (on) heroWho.textContent = ranFor.has(s.code) ? `誰在玩：${s.code}（這次已試音）` : hubDone(s) ? `誰在玩：${s.code}（今天在入口量過了，不用試音）` : `誰在玩：${s.code}・開始前先「試音」約 1 分鐘`;
    syncRec();
  }
  function syncMode() { profile.el.classList.toggle('hidden', g.mode() !== 'solo'); syncHero(); }
  syncMode();

  /* ---------- 結算頁：長輩卡放在成績下面，治療師細節放在原本的治療師報表下面 ---------- */
  const elderBox = doc.createElement('div'); elderBox.id = 'asElder'; elderBox.className = 'hidden';
  doc.querySelector('#result .heroR').insertAdjacentElement('afterend', elderBox);
  const therBox = doc.createElement('div'); therBox.id = 'asTher'; therBox.className = 'hidden';
  $('rReport').insertAdjacentElement('afterend', therBox);

  /* ---------- 試音畫面 ---------- */
  const ov = doc.createElement('div'); ov.id = 'assess'; ov.className = 'hidden lift';
  ov.innerHTML = `<div class="top"><div class="k">試音：上台前，先看看兩隻手</div><div class="h"></div><div class="coach"></div></div>
    <div class="body">
      <div class="side"><div class="nm" data-s="L">左手</div><div class="dots" data-s="L"></div><div class="rest hidden" data-s="L">先休息</div>
        <div class="nm" data-s="R">右手</div><div class="dots" data-s="R"></div><div class="rest hidden" data-s="R">先休息</div><div class="mirror">畫面是鏡子</div></div>
      <div class="cam"><canvas></canvas></div>
      <div class="meter"><div class="cap">高度</div><b></b><i data-v="0"><span>肩膀</span></i><i data-v="0.6" class="topLine"><span>頭頂</span></i></div>
      <div class="stim"><canvas></canvas><div class="gdots"></div><div class="res"></div></div>
    </div>
    <div class="foot"><div class="btns"><button type="button" data-b="back">← 回設定畫面</button><button type="button" data-b="skip">略過這一手</button></div><div class="msg hidden"></div></div>`;
  $('stage').appendChild(ov);
  const q = (s) => ov.querySelector(s), qa = (s) => ov.querySelectorAll(s);
  const E = { h: q('.h'), coach: q('.coach'), cam: q('.cam canvas'), fill: q('.meter b'), top: q('.meter .topLine'), stim: q('.stim canvas'), res: q('.stim .res'), gdots: q('.stim .gdots'), msg: q('.msg'), skip: q('[data-b=skip]') };
  const LO = -1, HI = 1.3, pct = (v) => Math.max(0, Math.min(1, (v - LO) / (HI - LO))) * 100;
  qa('.meter i').forEach((i) => { i.style.bottom = pct(+i.dataset.v) + '%'; });
  q('[data-b=back]').onclick = () => g.back();
  E.skip.onclick = () => skip();
  const cache = new Map();
  const set = (el, key, val) => { const c = cache.get(el) || {}; if (c[key] === val) return; c[key] = val; cache.set(el, c); if (key === 'text') el.textContent = val; else if (key === 'html') el.innerHTML = val; else el.style[key] = val; };

  /* ---------- 鏡頭樣本：遊戲每推論一格就呼叫（lm＝裁切畫面上的 33 點；沒看到人為 null） ---------- */
  function pose(lm, now) {
    if (!st || !lm) return;
    const r = sig.update(lm, now);
    live = { t: now, lh: r.lh, rh: r.rh, lm, seq: (live ? live.seq : 0) + 1 };
    st.seenAt = now;
  }
  /* 開場時讓取景框先對好人，舉手與看圖期間鎖住 */
  const frameLocked = () => !!st && st.stage !== 'intro';

  function msg(text, sec, good = true) { if (st) st.msg = { text, until: performance.now() + sec * 1000, good }; }

  /* ---------- 流程 ---------- */
  function gate(next) {
    if (st) return true;
    if (g.mode() !== 'solo') return false;
    const s = cur();
    if (!s || ranFor.has(s.code)) return false;
    /* 今天在感．動復能入口量過：不再試音，沿用那一筆，等同試音剛做完（接著照原本暖身） */
    const h = fromHub(store, s.code, !!g.DEMO, { ver: g.ver });
    if (h) { lastBy.set(s.code, { id: h.id, played: false, demo: !!h.demo }); ranFor.add(s.code); syncHero(); return false; }
    sig = new HandSignal({ aspect: g.aspect() }); live = null;
    st = {
      s, next, stage: 'intro', t: 0, lastNow: null, at: Date.now(), seq: -1, sampleAt: null, seenAt: -1e9,
      msg: null, stim: null, ni: 0, demo: {}, last: null,
      lift: new LiftMeasure({ restLine: REST, aspect: g.aspect() }), gng: new GoNoGo({ restLine: REST }),
    };
    cache.clear();
    ov.classList.remove('hidden');
    set(E.top, 'display', pain() ? 'none' : '');   /* 舉手會痛：不畫「頭頂」線，免得看起來像目標 */
    g.enter();
    return true;
  }

  function stage(name) { st.stage = name; st.t = 0; }
  /* 舉手開始時鎖住取景框；量測訊號從這一刻重新起算，肩膀基準直接對準鎖住後的畫面 */
  function startLift() { sig.reset(); live = null; stage('lift'); }

  function skip() {
    if (!st) return;
    const s = st.stage;
    if (s === 'intro') return startLift();
    if (s === 'lift') return onLift(st.lift.skipSide());
    if (s === 'gngIntro') return stage('gng');
    if (s === 'gng') return finish(false);
    if (s === 'outro') return finish(true);
  }

  function onLift(evs) {
    for (const e of evs) {
      if (e.type === 'side') { g.sfx.count(); msg(e.side === 'L' ? '先舉左手' : '換右手', 1.6); }
      else if (e.type === 'rep') { if (e.ok) { g.sfx.ok(); msg('很好', 1); } if (e.held) msg('手放下來', 1.6, false); }
      else if (e.type === 'remindLow') msg('手先放下來', 2, false);
      else if (e.type === 'skipSide') msg('這隻手先休息', 2.2, false);
      else if (e.type === 'done') { g.sfx.mile(); stage('gngIntro'); }
    }
  }

  function onGng(evs, now) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, t: now, res: null }; if (e.kind === 'nogo') st.ni++; g.sfx.count(); }
      else if (e.type === 'hit') { st.stim.res = 'hit'; st.stim.resAt = now; g.sfx.perfect(); }
      else if (e.type === 'reject') { st.stim.res = 'reject'; st.stim.resAt = now; g.sfx.ok(); }
      else if (e.type === 'commission') { st.stim.res = 'commission'; st.stim.resAt = now; g.sfx.wrong(); }
      else if (e.type === 'omission') { st.stim.res = 'omission'; st.stim.resAt = now; }   /* 沒舉：同遊戲「無 MISS」原則，不出音效 */
      else if (e.type === 'remindLow') msg('手先放下來', 2, false);
      else if (e.type === 'done') { g.sfx.mile(); stage('outro'); }
    }
  }

  /* 展示模式（?demo=1）：沒有鏡頭，用假的手跑一遍（左手舉得比右手低、反應約 0.75 秒、第 2 個月亮手滑）。
     ?demo=1&auto=0：不自動舉，按 K 舉一次。 */
  function demoSample(now) {
    const d = st.demo, low = -0.9, auto = g.AUTO;
    const prof = (e, target) => (e < 1 ? low + (target - low) * e : e < 1.6 ? target : e < 2.2 ? target - (target - low) * (e - 1.6) / 0.6 : low);
    if (st.stage === 'lift') {
      const L = st.lift, sd = L.sideId;
      if (L.st === 'up') {
        if (d.upAt == null && (auto || (d.key != null && now - d.key < 400))) d.upAt = now;
        if (d.upAt != null) {
          const v = prof((now - d.upAt) / 1000, sd === 'L' ? 0.32 + 0.04 * L.rep : 0.95);
          return { t: now, lh: sd === 'L' ? v : low, rh: sd === 'R' ? v : low, lm: null };
        }
      } else d.upAt = null;
      return { t: now, lh: low, rh: low, lm: null };
    }
    if (st.stage === 'gng' && st.stim && !st.stim.res) {
      const t0 = auto ? ((st.stim.kind === 'go' || st.ni === 2) ? st.stim.t + 750 : null) : (d.key != null && d.key >= st.stim.t ? d.key : null);
      if (t0 != null && now > t0) return { t: now, lh: low + Math.min(1, (now - t0) / 500) * 1.2, rh: low, lm: null };
    }
    return { t: now, lh: low, rh: low, lm: null };
  }
  function key(type) { if (st && g.DEMO && !g.AUTO && type === 'raise') st.demo.key = performance.now(); }

  /* 這一幀有沒有新的樣本：鏡頭有新的一格才算；看不到人就每 1/30 秒給一個「看不到手」 */
  function sample(now) {
    if (g.DEMO) return demoSample(now);
    if (live && now - live.t <= STALE_MS) {
      if (live.seq === st.seq) return null;
      st.seq = live.seq; return { t: live.t, lh: live.lh, rh: live.rh, lm: live.lm };
    }
    if (st.sampleAt != null && now - st.sampleAt < 33) return null;
    st.sampleAt = now;
    return { t: now, lh: null, rh: null, lm: null };
  }

  function step(now) {
    if (!st) return;
    const dt = st.lastNow == null ? 0 : Math.min(0.1, (now - st.lastNow) / 1000);
    st.lastNow = now; st.t += dt;
    const smp = st.stage === 'lift' || st.stage === 'gng' ? sample(now) : null;
    if (smp) st.last = smp;
    switch (st.stage) {
      case 'intro': if (st.t >= INTRO_MIN && (g.DEMO || now - st.seenAt < 600)) startLift(); break;   /* 看到人才開始，不倒數 */
      case 'lift': if (smp) onLift(st.lift.push(smp)); break;
      case 'gngIntro': if (st.t >= GNG_INTRO) stage('gng'); break;
      case 'gng': if (smp) { const v = Math.max(smp.lh ?? -9, smp.rh ?? -9); onGng(st.gng.push({ t: smp.t, v: v > -9 ? v : null }), now); } break;
      case 'outro': if (st.t >= OUTRO) finish(true); break;
    }
    if (st) render(now);
  }

  function finish(complete) {
    const s = st.s, demo = !!g.DEMO;
    const rec = {
      code: s.code, game: GAME, ver: g.ver, at: st.at, input: demo ? 'demo' : 'cam', complete, pain: s.pain,
      cam: g.camInfo(), lift: st.lift.summary(), gng: st.gng.trials.length ? st.gng.summary() : null, ...(demo ? { demo: true } : {}),
    };
    const r = store.addSession(rec);
    lastBy.set(s.code, { id: r.id, played: false, demo });
    ranFor.add(s.code);
    const next = st.next; st = null; live = null;
    ov.classList.add('hidden'); syncHero();
    next();
  }

  function cancel() { st = null; live = null; ov.classList.add('hidden'); }

  /* ---------- 畫面 ---------- */
  function fitCanvas(cv) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h };
  }

  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];
  function drawCamBox(now) {
    const { c, w, h } = fitCanvas(E.cam);
    c.fillStyle = '#0B1D22'; c.fillRect(0, 0, w, h);
    const src = g.off, sc = Math.min(w / src.width, h / src.height), dw = src.width * sc, dh = src.height * sc, ox = (w - dw) / 2, oy = (h - dh) / 2;
    const act = st.stage === 'lift' ? st.lift.sideId : null;
    const dot = (p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); };
    if (!g.DEMO && g.camOn()) {
      c.save(); c.translate(ox + dw, oy); c.scale(-1, 1); c.drawImage(src, 0, 0, dw, dh); c.restore();
      const lm = live && now - live.t < 500 ? live.lm : null;
      if (lm) {
        const P = (i) => ({ x: ox + (1 - lm[i].x) * dw, y: oy + lm[i].y * dh });
        c.strokeStyle = 'rgba(0,201,167,.9)'; c.lineWidth = Math.max(3, dw * 0.006); c.lineCap = 'round';
        for (const [a, b] of BONES) { const A = P(a), B = P(b); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); }
        dot(P(0), Math.max(5, dw * 0.01), '#fff');
        dot(P(15), Math.max(8, dw * 0.016), act === 'L' ? '#FFD23F' : 'rgba(255,138,61,.95)');
        dot(P(16), Math.max(8, dw * 0.016), act === 'R' ? '#FFD23F' : 'rgba(255,138,61,.95)');
      }
      if (now - st.seenAt > 1500) {
        c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, h * 0.42, w, h * 0.16);
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${Math.max(16, h * 0.06)}px ${FONT}`;
        c.fillText('看不到你了，請坐回畫面中間', w / 2, h / 2);
      }
    } else {
      /* 展示模式：沒有鏡頭，畫一個火柴人跟著假的手動 */
      const smp = st.last, shY = oy + dh * 0.45, T = dh * 0.3, cx = w / 2, sw = dh * 0.16;
      const hand = (side) => { const v = smp ? (side === 'L' ? smp.lh : smp.rh) : -0.9; const sx = cx + (side === 'L' ? -sw : sw); return { sh: { x: sx, y: shY }, h: { x: sx + (side === 'L' ? -1 : 1) * dh * 0.07, y: shY - (v ?? -0.9) * T } }; };
      c.strokeStyle = 'rgba(0,201,167,.9)'; c.lineWidth = Math.max(4, dh * 0.014); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - sw, shY); c.lineTo(cx + sw, shY); c.moveTo(cx, shY); c.lineTo(cx, shY + T); c.stroke();
      c.beginPath(); c.arc(cx, shY - dh * 0.11, dh * 0.07, 0, 7); c.stroke();
      for (const sd of ['L', 'R']) { const H = hand(sd); c.beginPath(); c.moveTo(H.sh.x, H.sh.y); c.lineTo(H.h.x, H.h.y); c.stroke(); dot(H.h, Math.max(7, dh * 0.025), act === sd ? '#FFD23F' : 'rgba(255,138,61,.95)'); }
      c.fillStyle = '#BFE3E8'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = `800 ${Math.max(13, h * 0.045)}px ${FONT}`;
      c.fillText('展示模式（沒有開鏡頭）', w / 2, h - Math.max(10, h * 0.04));
    }
  }

  function drawStim(now) {
    const { c, w, h } = fitCanvas(E.stim);
    c.fillStyle = STIM_BG; c.fillRect(0, 0, w, h);
    const s = Math.min(w, h);
    if (st.stage === 'gngIntro') {
      const ty = h * 0.8, fs = Math.max(16, Math.min(w * 0.06, h * 0.075));
      drawNote(c, w * 0.27, h * 0.42, s * 0.5); drawMoon(c, w * 0.73, h * 0.42, s * 0.5);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${fs}px ${FONT}`;
      c.fillStyle = '#FFD23F'; c.fillText('音符 → 舉手', w * 0.27, ty);
      c.fillStyle = '#CFE0FF'; c.fillText('月亮 → 手不要動', w * 0.73, ty);
      return;
    }
    const S = st.stim;
    if (st.stage === 'gng' && S && !(S.res && now - S.resAt > 700)) {
      const a = S.res ? 0.45 : 1;
      if (S.kind === 'go') drawNote(c, w / 2, h * 0.47, s * 0.62, a); else drawMoon(c, w / 2, h * 0.47, s * 0.62, a);
    }
  }

  function render(now) {
    const S = st, L = S.lift, isLift = S.stage === 'intro' || S.stage === 'lift';
    ov.classList.toggle('lift', isLift); ov.classList.toggle('gng', !isLift);
    const p = pain(), seen = g.DEMO || now - S.seenAt < 1500;
    let head = '', coach = '';
    if (S.stage === 'intro') {
      head = seen ? '先試音：兩隻手各舉 3 下' : '先讓鏡頭看到你';
      coach = seen ? (p ? '背貼椅背、身體坐正。慢慢舉到不會痛的高度，停一下，再放下' : '背貼椅背、身體坐正。慢慢舉到最高，停一下，再慢慢放下') : '坐好，讓頭、肩膀和雙手都在畫面裡';
    } else if (S.stage === 'lift') {
      const nm = SIDE[L.sideId];
      head = L.st === 'low' ? `${nm}先放下來` : p ? `${nm}舉到不會痛的高度，停一下` : `${nm}慢慢舉到最高，停一下`;
      coach = '背貼椅背、身體坐正；準備好再舉，不用趕';
    } else if (S.stage === 'gngIntro') {
      head = '看到音符就把手舉起來；\n看到月亮是睡覺時間，手不要動'; coach = '每一題出現前，手先放下來';
    } else if (S.stage === 'gng') {
      head = S.stim && !S.stim.res ? '' : '手放下來，等下一個'; coach = '音符 → 舉手　　月亮 → 手不要動';
    } else { head = '試音完成，準備上台囉'; coach = ''; }
    set(E.h, 'text', head); set(E.coach, 'text', coach);

    drawCamBox(now);
    if (isLift) {
      for (const sd of ['L', 'R']) {
        const active = S.stage === 'lift' && L.sideId === sd && !L.done;
        const n = L.reps.filter((r) => r.side === sd).length, skipped = L.skipped.includes(sd);
        q(`.nm[data-s=${sd}]`).classList.toggle('on', active);
        q(`.rest[data-s=${sd}]`).classList.toggle('hidden', !skipped);
        set(q(`.dots[data-s=${sd}]`), 'html', skipped ? '' : Array.from({ length: L.o.reps }, (_, i) => `<i class="${i < n ? 'ok' : active && i === n ? 'cur' : ''}">${i < n ? '✓' : ''}</i>`).join(''));
      }
      const sd = S.stage === 'lift' ? L.sideId : 'L', smp = S.last;
      const v = smp ? (sd === 'L' ? smp.lh : smp.rh) : null;
      set(E.fill, 'height', v == null || S.stage !== 'lift' ? '0%' : pct(v) + '%');
      set(E.skip, 'text', S.stage === 'intro' ? '直接開始' : '略過這一手');
    } else {
      drawStim(now);
      const done = S.gng.trials.length;
      set(E.gdots, 'html', S.stage === 'gng' ? GNG.seq.map((_, i) => `<i class="${i < done ? 'ok' : ''}"></i>`).join('') : '');
      const T = S.stim, showRes = S.stage === 'gng' && T && T.res && now - T.resAt <= 700;
      set(E.res, 'text', showRes ? { hit: '舉起來了', reject: '忍住了', commission: '是月亮喔', omission: '音符溜走了' }[T.res] : '');
      set(E.res, 'color', T && (T.res === 'hit' || T.res === 'reject') ? '#5BE08A' : '#FFB4A8');
      set(E.skip, 'text', S.stage === 'gngIntro' ? '直接開始' : '略過看圖');
    }
    set(E.skip, 'display', S.stage === 'outro' ? 'none' : '');
    const m = S.msg && S.msg.until > now ? S.msg : null;
    E.msg.classList.toggle('hidden', !m);
    if (m) { set(E.msg, 'text', m.text); E.msg.classList.toggle('good', m.good); E.msg.classList.toggle('bad', !m.good); }
  }

  /* ---------- 結算頁 ---------- */
  function download(kind, code) {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const csv = kind === 'csv', body = csv ? store.exportCsv(code) : store.exportJson(code);
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }));
    a.download = `動作紀錄_${code}_${stamp}.${csv ? 'csv' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* R：這局的遊戲成績（單人）；雙人、團體或沒有成績時傳 null，報告卡收起來 */
  function afterResult(R) {
    remove(elderBox); remove(therBox);
    const s = cur(), Lk = s && lastBy.get(s.code);
    const on = !!R && g.mode() === 'solo' && !!Lk;
    elderBox.classList.toggle('hidden', !on); therBox.classList.toggle('hidden', !on);
    if (!on) { renderNext(elderBox, GAME, null); return; }   /* 清掉上一局的下一款卡 */
    if (!Lk.played) { store.updateSession(Lk.id, { play: R }); Lk.played = true; }
    const hist = store.history(s.code, GAME).filter((h) => !!h.demo === Lk.demo);
    const summary = buildSummary(s, hist, SUMMARY_OPT);
    renderReport({ host: elderBox, therHost: therBox, subject: s, summary, history: hist, onExport: (k) => download(k, s.code) });
    renderNext(elderBox, GAME, s.code);   /* 感．動復能的「下一款」卡；沒有計畫不畫 */
  }

  return {
    gate, step, pose, cancel, afterResult, frameLocked, syncMode, key, skip,
    /* 入口推薦當上限：index.html 在 applyPersonal 之後呼叫 personal.tier=AS.tier(personal.tier) */
    tier: (t) => capTier(t, rec()),
    noPush: () => g.mode() === 'solo' && pain(),
    get active() { return !!st; },
    get state() { return st && { stage: st.stage, lift: { st: st.lift.st, side: st.lift.sideId, rep: st.lift.rep, done: st.lift.done, reps: st.lift.reps.length }, gng: { st: st.gng.st, i: st.gng.i, trials: st.gng.trials.length }, stim: st.stim }; },
    store, profile, ranFor,
  };
}
