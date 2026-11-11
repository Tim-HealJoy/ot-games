/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/hub.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 感．動復能：入口和各款遊戲之間的交接（2026-11-10）
   入口小測量完，把「今天量到的」存成一筆 game='hub' 的紀錄，再把「推薦玩什麼、多難」寫成一份計畫。
   各款遊戲開局時來讀：今天在入口量過，就不再做自己的量測關，直接沿用入口那一筆；計畫裡有這款，就用推薦的難度。
   沒有計畫、不是同一個人、不是今天量的，一律回 null，遊戲照原本的流程走。

   計畫（localStorage 'gd_hub_v1'）：
   { v: 1, code: 'A01', at: 1731240000000, session: '入口那筆紀錄的 id', home: '入口首頁網址',
     picks: [{ game: 'fishing', name: '漁港釣魚', url: '…', diff: 'easy', diffName: '簡單', why: '一句理由', tweak: '這次調了什麼' }, …],
     hold:  [{ game: 'rhythm', name: '節奏律動', why: '為什麼先等等' }] }
   diff 一律用 'easy'｜'normal'｜'hard'，各遊戲自己對到內部的難度。
   diffName 是那款遊戲自己畫面上的叫法（例如山豬的「輕鬆」、節奏律動的「標準」），由入口填；沒這個欄位就用這裡的簡單、普通、困難；
   填空字串＝這款沒有三級難度（例如騎遍台灣跟著路線走），卡片上不寫難度。
   各遊戲在自己設定頁寫「感．動復能推薦：〇〇」時，也用自己的叫法，玩家看到的字才對得起來。
   遊戲代號：fishing、netlift、rhythm、ride、boar。 */
export const HUB_KEY = 'gd_hub_v1';
export const HUB_GAME = 'hub';
export const DIFFS = ['easy', 'normal', 'hard'];
export const DIFF_NAME = { easy: '簡單', normal: '普通', hard: '困難' };
/* 給人看的難度：先用那款遊戲自己的叫法 */
export function diffLabel(pick) {
  if (!pick) return null;
  if (typeof pick.diffName === 'string') return pick.diffName.trim() || null;   /* 入口填了空字串＝這款沒有三級難度，不顯示 */
  return DIFF_NAME[pick.diff] || null;
}

const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);

export function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/* 計畫裡每一項都要是有 game 的物件；壞掉的那幾項丟掉，免得遊戲讀到 null 就整個停住 */
const items = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === 'object' && typeof x.game === 'string') : []);

export function readPlan(storage = ls()) {
  try {
    const o = JSON.parse((storage && storage.getItem(HUB_KEY)) || 'null');
    if (!o || typeof o !== 'object' || o.v !== 1 || !o.code || !Array.isArray(o.picks)) return null;
    return { ...o, picks: items(o.picks), hold: items(o.hold) };
  } catch (e) { return null; }
}

export function writePlan(plan, storage = ls()) {
  const o = { v: 1, ...plan };
  try { storage && storage.setItem(HUB_KEY, JSON.stringify(o)); } catch (e) { /* 存不了就算了，遊戲照原本流程 */ }
  return o;
}

export function clearPlan(storage = ls()) { try { storage && storage.removeItem(HUB_KEY); } catch (e) { /* 同上 */ } }

/* 這位個案今天的計畫（不是今天的不算） */
export function planFor(code, { storage = ls(), now = Date.now() } = {}) {
  const p = readPlan(storage);
  return p && code && p.code === code && sameDay(p.at, now) ? p : null;
}

/* 這位個案今天在入口量過了嗎？有就回那一筆（要有舉手資料才算） */
export function hubToday(store, code, now = Date.now()) {
  if (!store || !code) return null;
  const h = store.history(code, HUB_GAME).filter((r) => r.lift && sameDay(r.at, now));
  return h.length ? h[h.length - 1] : null;
}

/* 今天在入口小測按了「肩膀會痛」嗎（2026-11-11，老闆：測試階段有反應肩膀痛，就不用勉強）。
   只算今天，不改建檔的 pain 欄位。各遊戲判斷要不要催舉高時，和建檔 pain==='yes' 一起看。
   欄位名稱 painNow 與山豬 2 自己試手存的相同。 */
let lastPain = null;   /* 遊戲每一格畫面都會問，2 秒內同一個人直接用上次的答案，不重讀整份紀錄 */
export function painToday(store, code, now = Date.now()) {
  if (lastPain && lastPain.store === store && lastPain.code === code && Math.abs(now - lastPain.at) < 2000) return lastPain.v;
  const h = hubToday(store, code, now);
  lastPain = { store, code, at: now, v: !!(h && h.painNow) };
  return lastPain.v;
}

/* 遊戲開局：沿用入口今天量的，存成這款遊戲的一筆紀錄並回傳；今天沒量過回 null（遊戲就做自己的量測關）。
   量測數字照抄，另外記 hub（入口那筆的 id）與 measuredAt（實際量的時間），匯出時分得出來不是重量的。 */
export function adopt(store, code, game, extra = {}, now = Date.now()) {
  const h = hubToday(store, code, now);
  if (!h) return null;
  return store.addSession({
    code, game, at: now, hub: h.id, measuredAt: h.at, input: h.input, complete: h.complete !== false,
    pain: h.pain, lift: h.lift, gng: h.gng || null, ...(h.demo ? { demo: true } : {}), ...(h.painNow ? { painNow: true } : {}), ...extra,
  });
}

/* 這款遊戲今天的推薦（含難度）；沒有回 null */
export function pickFor(game, code, opt) {
  const p = planFor(code, opt);
  return (p && p.picks.find((x) => x.game === game)) || null;
}

/* 玩完這款，下一款推薦什麼：計畫裡排在這款後面的第一個；這款是最後一個或不在計畫裡，就回第一個不是它的 */
export function nextFor(game, code, opt) {
  const p = planFor(code, opt);
  if (!p) return null;
  const i = p.picks.findIndex((x) => x.game === game);
  const rest = i >= 0 ? [...p.picks.slice(i + 1), ...p.picks.slice(0, i)] : p.picks.filter((x) => x.game !== game);
  return rest.find((x) => okUrl(x.url)) || null;
}

/* 只接受一般網址或相對路徑；javascript: 這類不當成網址 */
function okUrl(u) { return typeof u === 'string' && u.trim() !== '' && !/^\s*(javascript|data|vbscript):/i.test(u); }

export function homeUrl(code, opt) { const p = planFor(code, opt); return p && okUrl(p.home) ? p.home : null; }

/* 結算頁最下面的「下一款」卡。沒有計畫就什麼都不畫，回 null。樣式自帶，不靠遊戲的 CSS。
   字級跟著畫面高度縮（手機橫放約 375 高時，內文約 18px、標題約 22px），不會撐破結算頁。
   計畫裡只有這一款時，卡片只剩「回感．動復能」：回入口再挑，是預期的行為。 */
export function renderNext(host, game, code, opt) {
  if (!host || typeof document === 'undefined') return null;
  host.querySelectorAll('.gd-next').forEach((n) => n.remove());
  const p = planFor(code, opt);
  if (!p) return null;
  const nx = nextFor(game, code, opt);
  if (!nx && !okUrl(p.home)) return null;   /* 沒有下一款、也沒有入口網址：不畫空卡 */
  const box = document.createElement('div');
  box.className = 'gd-next';
  box.style.cssText = 'margin:14px 0 0;padding:14px 16px;border-radius:14px;background:#FFF8E6;border:2px solid #E0B94A;color:#3A2A00;font-size:min(20px,5vh);line-height:1.5;text-align:left';
  const btn = 'display:inline-block;margin:8px 10px 0 0;padding:min(10px,2.4vh) 18px;border-radius:12px;font-size:min(20px,5vh);font-weight:700;text-decoration:none';
  const el = (tag, text, css) => { const n = document.createElement(tag); n.textContent = text; if (css) n.style.cssText = css; return n; };
  if (nx) {
    box.appendChild(el('div', '下一款可以玩', 'font-size:min(16px,4.4vh);color:#7A5A00'));
    const nm = nx.name || '下一款';
    const dl = diffLabel(nx);
    box.appendChild(el('div', dl ? `${nm}（${dl}）` : nm, 'font-size:min(24px,6vh);font-weight:800'));
    if (nx.why) box.appendChild(el('div', nx.why));
    const a = el('a', `去玩${nm}`, btn + ';background:#C8402E;color:#fff'); a.href = nx.url; box.appendChild(a);
  }
  if (okUrl(p.home)) { const a = el('a', '回感．動復能', btn + ';background:#fff;color:#3A2A00;border:2px solid #E0B94A'); a.href = p.home; box.appendChild(a); }
  host.appendChild(box);
  return box;
}
