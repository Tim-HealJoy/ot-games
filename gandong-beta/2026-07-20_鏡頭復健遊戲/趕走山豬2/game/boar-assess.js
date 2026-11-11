/* 趕走山豬 2 的評估層接頭（v0.2，2026-11-10）
   共用模組在 ./assess/（正本 100_Todo/projects/2026-11-06_遊戲評估層/assess/，改正本後跑 sync.sh 複製過來，這裡不改）。
   這裡負責：設定頁「誰在玩」、當天第一次開局前的「試手」量測關、收成單下面的動作報告、
   「這一局伸手的表現」格子圖、動作建議、接下來可以玩。沒選個案（訪客）時，流程與 v0.1 相同、不存任何紀錄。

   試手（約 1 分鐘，每次相同）：
   1. 左手 3 下、右手 3 下（量測包 A，lift.js）。
   2. 看圖 8 題：山豬出來就舉手、公雞出來不要動（量測包 B，gonogo.js；順序用模組的固定順序）。
   這款遊戲平常只跑手部模型，量測需要肩膀與髖部，所以試手時另外載入身體模型（PoseLandmarker），量完就關掉；
   手部高度一律用模組的 signal.js 算，跨遊戲才比得起來。同一位個案同一天再玩不重測。 */
import { createStore } from './assess/store.js?v=1';
import { LiftMeasure } from './assess/lift.js?v=1';
import { GoNoGo, GNG } from './assess/gonogo.js?v=1';
import { HandSignal } from './assess/signal.js?v=1';
import { buildSummary, checkBanned } from './assess/advice.js?v=1';
import { mountProfile, renderReport } from './assess/ui.js?v=1';
import { pickBoarAdvice } from './boar-advice.js';
import { recommend, NOTE } from './boar-recommend.js';
import { adopt, pickFor, renderNext, painToday } from './assess/hub.js?v=1';   /* 感．動復能入口的交接 */

/* 代號用 'boar'，和「感．動復能」入口（assess/hub.js）列的遊戲代號一致 */
const GAME = 'boar', VER = '0.2', PLAYS_KEY = 'boar2_plays', REST = -0.5;
const PAIN_NOTE = '建檔註記舉手會痛：麻雀停的竹竿降到不用舉過肩的高度，稻草人集滿後自動幫忙、不要求手舉高停住；試手改說「舉到不會痛的高度」。';
/* 今天量測時說肩膀會痛（試手或入口小測按的，只算今天，不改建檔資料）：
   「今天量測時說肩膀會痛…」那一行由共用的 buildSummary 寫，這裡只補這款遊戲實際調了什麼 */
const PAIN_NOW_NOTE = '這一局的調整：麻雀停的竹竿降到不用舉過肩的高度，稻草人集滿後自動幫忙、不要求手舉高停住。常常會痛的話，請到「誰在玩」把「舉手時肩膀會痛嗎」改成會痛。';
const SAY = { goName: '山豬', nogoName: '公雞', goVerb: '舉手', goUnit: '隻', nogoUnit: '隻', trial: '試手', painNote: PAIN_NOTE,
  goLabel: '山豬出來就舉手', goValue: '{n} 隻舉了 {h} 隻', nogoLabel: '公雞出來忍住', nogoValue: '{n} 隻忍住 {k} 隻',
  headGo: '山豬出來的時候，比上次更快動起來', headNogo: '比上次更能忍住，公雞沒有被趕到' };
/* 沿用入口小測（紀錄帶 hub）時，看圖題是入口的魚／垃圾，不是山豬／公雞；肩痛備註也不提「試手」 */
const SAY_HUB = { ...SAY, goName: '魚', nogoName: '垃圾', goUnit: '條', nogoUnit: '個',
  goLabel: '看到魚就舉手', goValue: '{n} 條舉了 {h} 條', nogoLabel: '看到垃圾忍住', nogoValue: '{n} 個忍住 {k} 個',
  headGo: '看到魚的時候，比上次更快動起來', headNogo: '比上次更能忍住，看到垃圾手沒有動',
  painNote: '建檔註記舉手會痛：麻雀停的竹竿降到不用舉過肩的高度，稻草人集滿後自動幫忙、不要求手舉高停住。這次沿用入口小測的數字，沒有另外試手。' };
const SIDE = { L: '左手', R: '右手' };
const LAYERS = [['high', '高處', '麻雀'], ['mid', '中間', '山豬'], ['low', '低處', '老鼠']];
const DAY_LAYERS = { 1: ['mid'], 2: ['mid', 'low'], 3: ['high', 'mid', 'low'] };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/* 每隻動物一筆 → 3×2 格子 */
export function computeCells(log, day) {
  const present = DAY_LAYERS[day] || ['high', 'mid', 'low'];
  const cells = {};
  for (const [k] of LAYERS) {
    if (!present.includes(k)) { cells[k] = null; continue; }
    cells[k] = {};
    for (const sd of ['L', 'R']) {
      const g = log.filter((x) => x.layer === k && x.side === sd), ch = g.filter((x) => x.outcome === 'chased');
      cells[k][sd] = { n: g.length, chased: ch.length, rate: g.length ? ch.length / g.length : null,
        rtMed: median(ch.filter((x) => x.hand !== 'scare' && x.rt != null).map((x) => x.rt)) };
    }
  }
  const ch = log.filter((x) => x.outcome === 'chased');
  return { cells, extra: { n: log.length, chased: ch.length, crossN: ch.filter((x) => x.cross).length,
    handL: ch.filter((x) => x.hand === 'L').length, handR: ch.filter((x) => x.hand === 'R').length, scareBirds: ch.filter((x) => x.hand === 'scare').length } };
}

export function createAssess(g) {
  const store = createStore();
  let st = null, sig = null, live = null;
  const cur = () => store.current();
  /* 會痛就不勉強：建檔註記會痛，或今天試手／入口小測時按了「肩膀會痛」（記在今天那筆紀錄的 painNow，不改建檔資料） */
  const painNow = new Map();   /* 個案代號 → 今天試手時有沒有說會痛 */
  const saidPain = (s) => { if (!painNow.has(s.code)) { const r = todaySession(s.code); painNow.set(s.code, !!(r && r.painNow)); } return painNow.get(s.code); };
  const pain = () => { const s = cur(); return !!s && (s.pain === 'yes' || saidPain(s) || painToday(store, s.code)); };

  /* ---------- 感．動復能：入口推薦的難度 ----------
     有今天、同一位個案的計畫就把難度切到推薦的；玩家自己按過難度就照他的，不再蓋回去（每位個案各記）。
     換成沒有計畫的人時，還原成切換前的難度。「哪隻手」不動。 */
  const manual = new Set(); let beforeHub = null;
  function applyPick() {
    const s = cur(), pk = s ? pickFor(GAME, s.code) : null;
    if (pk && ['easy', 'normal', 'hard'].includes(pk.diff)) {
      g.setHubHint(`感．動復能推薦：${g.diffName(pk.diff)}`);
      if (!manual.has(s.code)) { if (beforeHub == null) beforeHub = g.getDiff(); g.setDiff(pk.diff); }
    } else {
      g.setHubHint('');
      if (beforeHub != null) { g.setDiff(beforeHub); beforeHub = null; }
    }
    return pk;
  }
  function manualDiff() { const s = cur(); if (s) manual.add(s.code); beforeHub = null; }

  const profile = mountProfile(g.$('rowHand'), store, { game: '趕走山豬', trial: '約 1 分鐘的「試手」', onChange: () => applyPick() });
  applyPick();

  /* 今天這款的紀錄：自己試手的（展示／鏡頭要一致），或從入口沿用的（帶 hub；入口可能是展示資料，所以不比 demo） */
  function todaySession(code) {
    return store.history(code, GAME).filter((r) => (r.hub || !!r.demo === g.DEMO) && dayKey(r.at) === dayKey(Date.now())).at(-1) || null;
  }

  /* ---------- 流程 ---------- */
  function gate(next) {
    if (st) return true;
    const s = cur();
    if (!s || todaySession(s.code)) return false;
    /* 入口今天量過：沿用那一筆（存成本遊戲的紀錄），不進試手、直接開局。放在 todaySession 之後，免得同一天再玩又抄一筆 */
    if (adopt(store, s.code, GAME, { ver: VER })) return false;
    sig = new HandSignal({ aspect: g.aspect() }); live = null;
    st = { s, next, stage: 'load', at: Date.now(), now: 0, stageAt: 0, seq: -1, msg: null, stim: null, gi: 0, ni: 0, demo: {}, lm: null, h: { lh: null, rh: null },
      lift: new LiftMeasure({ restLine: REST, aspect: g.aspect() }), gng: new GoNoGo({ restLine: REST }) };
    g.enterTrial(); g.$('btnTrialPain').classList.remove('hidden');
    if (g.DEMO) stage('intro');
    else g.TR.initPose().then(() => { if (st && st.stage === 'load') stage('intro'); }).catch(() => { if (st) { msg('身體偵測載入不了，這次先略過', 2.5, false); finish(false); } });
    return true;
  }
  function stage(name) { st.stage = name; st.stageAt = st.now; if (name === 'lift') { sig.reset(); live = null; } head(); }
  function msg(text, sec, good = true) { if (st) st.msg = { text, until: st.now + sec * 1000, good }; }
  function head() {
    if (!st) return;
    let t = '';
    if (st.stage === 'load') t = '準備中，請稍等';
    else if (st.stage === 'intro') t = '阿公：「下田前先試試手。左手、右手各舉 3 下，會痛就不要勉強。」';
    else if (st.stage === 'lift') { const L = st.lift, nm = SIDE[L.sideId];
      t = L.st === 'low' ? `${nm}先放下來` : pain() ? `${nm}舉到不會痛的高度，停一下` : `${nm}舉到最高，停一下`; }
    else if (st.stage === 'gngIntro') t = pain() ? '看到山豬手抬一下就好，看到公雞手不要動' : '看到山豬就舉手，看到公雞手不要動';
    else if (st.stage === 'gng') t = st.stim && !st.stim.res ? (pain() ? '山豬手抬一下，公雞不動' : '山豬舉手，公雞不動') : '手放下來，等下一個';
    else t = '試好了，下田囉！';
    if (t !== st.headText) { st.headText = t; g.$('trialHead').textContent = t; }
  }
  function skip() {
    if (!st) return;
    if (st.stage === 'load' || st.stage === 'intro') return stage('lift');
    if (st.stage === 'lift') return onLift(st.lift.skipSide());
    if (st.stage === 'gngIntro') return stage('gng');
    finish(st.stage === 'outro');
  }
  /* 試手時說肩膀會痛：不勉強。舉手量測直接停（已經做的留著），看圖題只要手抬一下；這一局照「舉手會痛」的玩法。
     已經在看圖題才說的，剩下的也不做了，直接下田。 */
  function reportPain() {
    if (!st || st.painNow) return;
    st.painNow = true; painNow.set(st.s.code, true);
    g.$('btnTrialPain').classList.add('hidden');
    if (st.stage === 'gngIntro' || st.stage === 'gng') return finish(false);
    if (st.stage === 'outro') return;
    while (!st.lift.done) st.lift.skipSide();
    stage('gngIntro');
    msg('好，不勉強。這一局不用舉高', 2.8);
  }
  function onLift(evs) {
    for (const e of evs) {
      if (e.type === 'side') { g.sfx('ding'); msg(e.side === 'L' ? '先舉左手' : '換右手', 1.6); }
      else if (e.type === 'rep') { if (e.ok) { g.sfx('shoo'); msg('很好', 1); } if (e.held) msg('手放下來', 1.6, false); }
      else if (e.type === 'remindLow') msg('手先放下來', 2, false);
      else if (e.type === 'skipSide') msg('這隻手先休息', 2.2, false);
      else if (e.type === 'done') { g.sfx('fanfare'); stage('gngIntro'); }
    }
  }
  function onGng(evs) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, id: e.kind === 'go' ? (st.gi++ % 3 === 2 ? 'fierce' : 'boar') : 'rooster', t: st.now, res: null }; if (e.kind === 'nogo') st.ni++; g.sfx(e.kind === 'go' ? 'grunt' : 'beep'); }
      else if (['hit', 'reject', 'commission', 'omission'].includes(e.type)) { st.stim.res = e.type; st.stim.resAt = st.now; if (e.type === 'hit' || e.type === 'reject') g.sfx('shoo'); }
      else if (e.type === 'remindLow') msg('手先放下來', 2, false);
      else if (e.type === 'done') stage('outro');
    }
  }
  /* 試手時鏡頭的身體骨架（33 點）；在 game.js 的主迴圈裡呼叫 */
  function pose(lm, now) {
    if (!st || !lm) return;
    const r = sig.update(lm, now);
    live = { t: now, lh: r.lh, rh: r.rh, lm, seq: (live ? live.seq : 0) + 1 };
  }

  /* 示範模式：合成的身體骨架，照樣走 signal.js 算高度（左手舉得較低且身體往旁邊歪、右手舉到頭頂以上；反應約 0.75 秒；第 2 隻公雞手滑） */
  function synthPose(lh, rh, lean) {
    const shY = 0.45, torso = 0.30, sx = lean || 0;
    const P = (x, y) => ({ x, y, z: 0, visibility: 0.99 });
    const lm = Array.from({ length: 33 }, () => P(0.5, 0.3));
    lm[0] = P(0.5 + sx, 0.3);
    lm[11] = P(0.58 + sx, shY); lm[12] = P(0.42 + sx, shY); lm[23] = P(0.56, shY + torso); lm[24] = P(0.44, shY + torso);
    const arm = (sh, el, wr, fingers, v, dir) => { const y = shY - v * torso, x = lm[sh].x + dir * 0.06;
      lm[el] = P((lm[sh].x + x) / 2 + dir * 0.03, (shY + y) / 2); lm[wr] = P(x, y); for (const i of fingers) lm[i] = P(x, y); };
    arm(11, 13, 15, [17, 19, 21], lh, 1); arm(12, 14, 16, [18, 20, 22], rh, -1);
    return lm;
  }
  function demoSample(now) {
    const d = st.demo, low = -0.9;
    let lh = low, rh = low, lean = 0;
    if (st.stage === 'lift') {
      const L = st.lift, sd = L.sideId;
      if (L.st === 'up') {
        if (d.upAt == null) d.upAt = now;
        const e = (now - d.upAt) / 1000, target = sd === 'L' ? 0.32 + 0.04 * L.rep : 0.95;
        const v = e < 1 ? low + (target - low) * e : e < 1.6 ? target : e < 2.2 ? target - (target - low) * (e - 1.6) / 0.6 : low;
        if (sd === 'L') { lh = v; lean = 0.06 * Math.max(0, Math.min(1, (v - low) / (target - low))); } else rh = v;
      } else d.upAt = null;
    } else if (st.stage === 'gng' && st.stim && !st.stim.res) {
      const e = (now - st.stim.t) / 1000, go = st.stim.kind === 'go' || (st.stim.kind === 'nogo' && st.ni === 2);
      if (go && e > 0.75) rh = low + Math.min(1, (e - 0.75) / 0.5) * 1.2;
    }
    const lm = synthPose(lh, rh, lean), r = sig.update(lm, now);
    return { t: now, lh: r.lh, rh: r.rh, lm };
  }
  function step(now) {
    if (!st) return;
    st.now = now;
    const t = (now - st.stageAt) / 1000;
    let smp = null;
    if (g.DEMO) { if (st.stage !== 'load') smp = demoSample(now); }
    else if (live && live.seq !== st.seq) { st.seq = live.seq; smp = live; }
    if (smp) { st.lm = smp.lm; st.h = { lh: smp.lh, rh: smp.rh }; }
    switch (st.stage) {
      case 'intro': if (t >= 4.5) stage('lift'); break;
      case 'lift': if (smp) onLift(st.lift.push(smp)); break;
      case 'gngIntro': if (t >= 4.5) stage('gng'); break;
      case 'gng': if (smp) { const v = Math.max(smp.lh ?? -9, smp.rh ?? -9); onGng(st.gng.push({ t: smp.t, v: v > -9 ? v : null })); } break;
      case 'outro': if (t >= 2.5) finish(true); break;
    }
    if (st) head();
  }
  function finish(complete) {
    const s = st.s;
    const rec = { code: s.code, game: GAME, ver: VER, at: st.at, input: g.DEMO ? 'demo' : 'cam', complete, pain: s.pain,
      lift: st.lift.summary(), gng: st.gng.trials.length ? st.gng.summary() : null, ...(st.painNow ? { painNow: true } : {}), ...(g.DEMO ? { demo: true } : {}) };
    store.addSession(rec);
    const next = st.next; st = null; g.TR.closePose?.(); g.exitTrial();
    next();
  }
  function cancel() { if (st) { st = null; g.TR.closePose?.(); } }

  /* ---------- 結算 ---------- */
  function download(kind, code) {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const csv = kind === 'csv', body = csv ? store.exportCsv(code) : store.exportJson(code);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }));
    a.download = `動作紀錄_${code}_${stamp}.${csv ? 'csv' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const loadPlays = () => { try { return JSON.parse(localStorage.getItem(PLAYS_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const savePlays = (o) => { try { localStorage.setItem(PLAYS_KEY, JSON.stringify(o)); } catch (e) { /* 存不了就算了 */ } };

  function gridHTML(cells, prev) {
    const fmt = (c) => `趕走 ${c.chased}／${c.n}`;
    const lv = (r) => (r == null ? 'lv0' : r >= 0.8 ? 'lv3' : r >= 0.5 ? 'lv2' : 'lv1');
    const cmp = (k, sd, c) => {
      const p = prev && prev.cells && prev.cells[k] && prev.cells[k][sd];
      if (!p || !p.n || !c.n) return '';
      const better = c.rate - p.rate >= 0.15 || (c.rtMed != null && p.rtMed != null && p.rtMed - c.rtMed >= 0.1);
      return `<i class="${better ? 'up' : ''}">${better ? '比上次好' : '差不多'}</i>`;
    };
    const rows = LAYERS.map(([k, nm, who]) => `<tr><th>${nm}<small>${who}</small></th>${['L', 'R'].map((sd) => {
      const c = cells[k] && cells[k][sd];
      if (!cells[k]) return '<td class="lv0">這天還沒有</td>';
      if (!c.n) return '<td class="lv0">這次沒有出來</td>';
      return `<td class="${lv(c.rate)}">${cmp(k, sd, c)}${fmt(c)}<small>${c.rtMed != null ? `反應 ${c.rtMed.toFixed(1)} 秒` : '—'}</small></td>`;
    }).join('')}</tr>`).join('');
    return `<table class="bx-grid"><tr><th></th><th>左邊</th><th>右邊</th></tr>${rows}</table>`;
  }

  function afterResult(f, log, x) {
    const host = g.$('asWrap'); host.innerHTML = '';
    const s = cur();
    if (!s) { host.classList.add('hidden'); return null; }            /* 訪客：不存、不出報告 */
    host.classList.remove('hidden');
    const { cells, extra } = computeCells(log, x.day);
    const sess = todaySession(s.code), hurts = pain();
    const plays = loadPlays(), list = plays[s.code] || [];
    const prev = list.filter((p) => !!p.demo === g.DEMO).at(-1) || null;
    const entry = { at: Date.now(), sessionId: sess ? sess.id : null, demo: g.DEMO || undefined, day: x.day, diff: x.diff, side: x.side, cells,
      extra: { ...extra, maxCombo: x.maxCombo, scareN: x.scareN, score: x.score, kept: x.kept, max: x.max } };
    list.push(entry); plays[s.code] = list.slice(-200); savePlays(plays);
    if (sess && !sess.play) store.updateSession(sess.id, { play: { score: x.score, diff: x.diff, day: x.day, kept: x.kept, max: x.max, boar: { cells, extra: entry.extra } } });

    /* 跟上次比：用跟今天這筆同一類的紀錄（入口是展示資料就跟展示資料比） */
    const refDemo = sess ? !!sess.demo : g.DEMO;
    const hist = store.history(s.code, GAME).filter((h) => !!h.demo === refDemo);
    let summary = null;
    if (sess) {
      /* 今天量測時說會痛（建檔不是會痛）：多一行這款遊戲實際調了什麼；個案資料那一行照建檔的原樣顯示 */
      const nowOnly = hurts && s.pain !== 'yes', say = sess.hub ? SAY_HUB : SAY;
      summary = buildSummary(nowOnly ? { ...s, pain: 'yes' } : s, hist, nowOnly ? { ...say, painNote: PAIN_NOW_NOTE } : say);
      renderReport({ host, therHost: host, subject: s, summary, history: hist, onExport: (k) => download(k, s.code) });
    }
    const both = x.side === 'none';
    const adv = pickBoarAdvice(cells, { pain: hurts, both, crossN: extra.crossN, chased: extra.chased });
    const minRate = (k) => { const c = cells[k]; if (!c) return null; const r = ['L', 'R'].map((sd) => c[sd].rate).filter((v) => v != null); return r.length ? Math.min(...r) : null; };
    const midRt = cells.mid ? median(['L', 'R'].map((sd) => cells.mid[sd].rtMed).filter((v) => v != null)) : null;
    const rec = sess || hist.at(-1) || {};
    const asym = rec.lift ? rec.lift.asym : null, gng = rec.gng || null;
    const rcm = recommend({
      /* 舉手會痛：不推薦「多練把手舉高」的遊戲 */
      highWeak: !hurts && minRate('high') != null && minRate('high') < 0.6, liftGap: !hurts && asym != null && Math.abs(asym) >= 0.3,
      slow: (gng && gng.rtMedian != null && gng.rtMedian > 0.8) || (midRt != null && midRt > 1.2), commission: !!(gng && gng.commissions >= 1),
      lowWeak: minRate('low') != null && minRate('low') < 0.6 });

    const blk = document.createElement('div'); blk.className = 'bx-blocks';
    blk.innerHTML = `
      <section class="bx-block"><h3>這一局伸手的表現</h3>
        ${gridHTML(cells, prev)}
        <ul class="bx-extra">
          <li>最長連趕 <b>${x.maxCombo}</b></li>
          ${x.day >= 3 ? `<li>稻草人幫忙 <b>${x.scareN} 次</b></li>` : ''}
          <li>跨過中線趕走 <b>${extra.crossN} 隻</b></li>
          <li>左手趕走 <b>${extra.handL} 隻</b>、右手 <b>${extra.handR} 隻</b></li>
        </ul>
        <p class="bx-note">這些數字受難度與個人校正影響，只能跟自己比，不跟別人比。${prev ? '' : '下次再玩，格子右上角會標出跟這次比。'}</p>
      </section>
      <section class="bx-block"><h3>動作建議</h3>
        <p class="bx-note">由遊戲紀錄整理，僅供參考</p>
        <ul class="bx-adv">
          ${summary ? `<li><small>${sess && sess.hub ? '小測' : '試手'}</small>${esc(summary.elder.next.text)}</li>` : ''}
          <li><small>下一局可以試</small>${esc(adv.text)}</li>
        </ul>
        <p class="bx-src">建議句：${esc(adv.src)}</p>
      </section>`;
    host.appendChild(blk);
    /* 有入口計畫：畫入口的「下一款＋回感．動復能」卡，不畫本遊戲自己的推薦表；沒有才畫自己的 */
    const hubCard = renderNext(blk, GAME, s.code);
    if (!hubCard) {
      const sec = document.createElement('section'); sec.className = 'bx-block bx-rec';
      sec.innerHTML = `<h3>接下來可以玩 <small>${NOTE}</small></h3>
        <div class="bx-games">${rcm.games.map((m) => `<div class="bx-game"><b>${esc(m.name)}</b><span>${esc(rcm.why)}</span><em>${m.url ? `<a href="${esc(m.url)}">去玩</a>` : '即將開放'}</em></div>`).join('')}</div>`;
      blk.appendChild(sec);
    }
    return { cells, extra, adv, rcm, summary, entry, hubCard: !!hubCard };
  }

  /* 報告全文跑禁用字（「不是診斷」這句聲明不算） */
  function bannedCheck() {
    const host = g.$('asWrap'), c = host.cloneNode(true);
    c.querySelectorAll('[data-nocheck]').forEach((e) => e.remove());
    return checkBanned(c.textContent);
  }

  /* ---------- 試手畫面（畫在遊戲畫布上） ---------- */
  function draw(ctx, CW, CH) {
    if (!st) return;
    const F = g.font, m = Math.min(CW, CH), top = Math.max(70, CH * 0.14), bot = CH - Math.max(70, CH * 0.12), bh = bot - top;
    ctx.fillStyle = 'rgba(58,40,22,.93)'; ctx.fillRect(0, 0, CW, CH);
    const txt = (t, x, y, s, c = '#fff8e8', al = 'center') => { ctx.font = `900 ${Math.round(s)}px ${F}`; ctx.textAlign = al; ctx.fillStyle = c; ctx.fillText(t, x, y); };
    const card = (x, y, w, h) => { ctx.fillStyle = '#fbf3e1'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill(); };
    const camBox = (x, y, w, h) => {
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.clip(); ctx.fillStyle = '#2c2116'; ctx.fillRect(x, y, w, h);
      const v = g.TR.cam.video;
      if (!g.DEMO && v && v.videoWidth) { const s = Math.max(w / v.videoWidth, h / v.videoHeight), vw = v.videoWidth * s, vh = v.videoHeight * s;
        ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(v, (w - vw) / 2, (h - vh) / 2, vw, vh); }
      ctx.restore();
      if (st.lm) {                                                     /* 骨架（鏡像）：示範模式看得到合成的身體 */
        const P = (i) => ({ x: x + w * (1 - st.lm[i].x), y: y + h * st.lm[i].y });
        ctx.strokeStyle = 'rgba(255,230,170,.9)'; ctx.lineWidth = Math.max(3, m * 0.008); ctx.lineCap = 'round';
        for (const [a, b] of [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16]]) { const p = P(a), q = P(b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        const hd = P(0); ctx.beginPath(); ctx.arc(hd.x, hd.y, h * 0.06, 0, 7); ctx.stroke();
      }
    };
    if (st.stage === 'load' || st.stage === 'intro' || st.stage === 'lift') {
      const L = st.lift, lw = Math.min(CW * 0.24, 300), mw = Math.min(CW * 0.08, 90);
      card(16, top, lw, bh);
      for (const [i, sd] of ['L', 'R'].entries()) {
        const y = top + bh * (0.28 + i * 0.42), act = st.stage === 'lift' && L.sideId === sd && !L.done, n = L.reps.filter((r) => r.side === sd).length;
        txt(SIDE[sd], 16 + lw / 2, y - bh * 0.06, m * (act ? 0.07 : 0.055), act ? '#c0452f' : '#7a6248');
        if (L.skipped.includes(sd)) txt('先休息', 16 + lw / 2, y + bh * 0.1, m * 0.045, '#7a6248');
        else for (let k = 0; k < 3; k++) { const cx = 16 + lw / 2 + (k - 1) * lw * 0.28, r = Math.min(lw * 0.11, m * 0.045), on = k < n;
          ctx.beginPath(); ctx.arc(cx, y + bh * 0.08, r, 0, 7); ctx.fillStyle = on ? '#4f8f3a' : act ? '#ffe08a' : '#eadcc0'; ctx.fill();
          if (on) txt('✓', cx, y + bh * 0.08 + r * 0.4, r * 1.2, '#fff'); }
      }
      camBox(32 + lw, top, CW - lw - mw - 80, bh);
      const mx = CW - mw - 16, side = st.stage === 'lift' ? L.sideId : 'L', v = side === 'L' ? st.h.lh : st.h.rh, lo = -1, hi = 1.3;
      const yv = (q) => top + bh - bh * Math.max(0, Math.min(1, (q - lo) / (hi - lo)));
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(mx, top, mw, bh, 12); ctx.fill();
      if (v != null) { ctx.fillStyle = '#ffd45a'; ctx.beginPath(); ctx.roundRect(mx + 6, yv(v), mw - 12, top + bh - yv(v), 10); ctx.fill(); }
      for (const [lv, nm] of pain() ? [[0, '肩膀']] : [[0, '肩膀'], [0.6, '頭頂']]) { ctx.fillStyle = '#fff8'; ctx.fillRect(mx - 6, yv(lv) - 2, mw + 12, 4); txt(nm, mx - 10, yv(lv) + m * 0.012, m * 0.032, '#ffe9b8', 'right'); }
    } else {
      const lw = (CW - 48) * 0.42; camBox(16, top, lw, bh);
      const rx = 32 + lw, rw = CW - rx - 16; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(rx, top, rw, bh, 16); ctx.fill();
      const cx = rx + rw / 2;
      if (st.stage === 'gng') {
        const S = st.stim, im = S && g.sprite(S.id === 'rooster' ? '3d_rooster' : S.id === 'fierce' ? '3d_fierce' : '3d_boar');
        if (S && im && im.naturalWidth && !(S.res && st.now - S.resAt > 700)) {
          const w = Math.min(rw * 0.6, bh * 0.6), h = w * im.naturalHeight / im.naturalWidth;
          ctx.save(); ctx.globalAlpha = S.res ? 0.5 : 1; ctx.drawImage(im, cx - w / 2, top + bh / 2 - h / 2, w, h); ctx.restore();
          const R = { hit: ['趕到了', '#8ef08e'], reject: ['忍住了', '#8ef08e'], commission: ['是公雞喔', '#ffb4a8'], omission: ['跑掉了', '#ffb4a8'] }[S.res];
          if (R) txt(R[0], cx, top + bh - bh * 0.08, m * 0.07, R[1]);
        }
        const n = GNG.seq.length, done = st.gng.trials.length, r = Math.min(rw / n * 0.3, m * 0.025);
        for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(cx + (i - (n - 1) / 2) * r * 2.8, top + r * 2, r, 0, 7); ctx.fillStyle = i < done ? '#ffd45a' : 'rgba(255,255,255,.2)'; ctx.fill(); }
      } else if (st.stage === 'gngIntro') {
        txt(pain() ? '山豬 → 手抬一下' : '山豬 → 舉手', cx, top + bh * 0.38, m * 0.08, '#8ef08e'); txt('公雞 → 不動', cx, top + bh * 0.62, m * 0.08, '#ffb4a8');
      } else txt('試好了！', cx, top + bh / 2, m * 0.1, '#ffe9a8');
    }
    if (st.msg && st.msg.until > st.now) {
      ctx.font = `900 ${Math.round(m * 0.07)}px ${F}`; const tw = ctx.measureText(st.msg.text).width + 60;
      ctx.fillStyle = st.msg.good ? '#3f7a2b' : '#c0452f'; ctx.beginPath(); ctx.roundRect(CW / 2 - tw / 2, CH * 0.5 - m * 0.06, tw, m * 0.12, 18); ctx.fill();
      txt(st.msg.text, CW / 2, CH * 0.5 + m * 0.025, m * 0.07);
    }
  }

  return {
    gate, step, pose, draw, cancel, afterResult, skip, reportPain, bannedCheck, applyPick, manualDiff,
    noPush: pain,
    get active() { return !!st; },
    get state() { return st && { stage: st.stage, lift: { st: st.lift.st, side: st.lift.sideId, rep: st.lift.rep, done: st.lift.done }, gng: { st: st.gng.st, i: st.gng.i }, h: st.h }; },
    store, profile, loadPlays,
  };
}
