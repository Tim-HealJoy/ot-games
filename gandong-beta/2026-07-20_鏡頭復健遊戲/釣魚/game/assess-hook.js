/* 釣魚的評估層接頭（v1.7，2026-11-10；v1.6 2026-11-07）
   共用模組在 ./assess/（正本 100_Todo/projects/2026-11-06_遊戲評估層/assess/，改正本後跑 sync.sh 複製過來）。
   這裡負責：設定頁「誰在玩」、正式開局前的「試竿」量測關、結算頁的動作報告、肩痛者不催舉高。
   沒選個案（訪客）時，遊戲流程與 v1.5 完全相同。

   試竿（約 1 分鐘，每次相同）：
   1. 左手 3 下、右手 3 下：舉到最高、停一下、放下。量絕對高度（軀幹長）、舉起秒數、側傾與聳肩。
   2. 8 題看圖：魚就舉手、垃圾不動，固定順序。量反應時間、該舉沒舉、不該舉卻舉。
   同一個人在同一次開啟頁面只量一次；換人會重新校正、重新練習。

   v1.7 接上「感．動復能」入口（assess/hub.js，規則寫在那個檔頭）：
   - 入口今天已經幫這位量過（同一代號、今天、有舉手資料），開局就不再試竿：把入口那一筆存成釣魚的一筆
     （多記 hub＝入口紀錄 id、measuredAt＝實際量的時間），當成試竿剛做完，結算頁報告照原本的路徑產生。
     展示模式（?demo=1）只沿用入口的展示資料，鏡頭模式只沿用真的資料，兩邊不混。
   - 入口的計畫裡有釣魚：載入、選定個案時，設定頁難度切到推薦那一級（easy／normal／hard＝簡單／普通／困難），
     難度下面一行小字「感．動復能推薦：…」。帶領者自己按過難度，就照他的，不再自動切。
   - 結算頁最下面加「下一款」卡（renderNext）。
   入口今天沒量過、沒有計畫、訪客：流程與 v1.6 完全相同。 */
import { createStore } from './assess/store.js?v=1';
import { LiftMeasure } from './assess/lift.js?v=1';
import { GoNoGo, GNG } from './assess/gonogo.js?v=1';
import { buildSummary } from './assess/advice.js?v=1';
import { mountProfile, renderReport, remove } from './assess/ui.js?v=1';
import { adopt, hubToday, pickFor, renderNext, DIFFS, DIFF_NAME, painToday } from './assess/hub.js?v=1';

const GAME = 'fishing';
const GO_IDS = ['tilapia', 'milkfish', 'snapper', 'tilapia', 'milkfish'];
const NOGO_IDS = ['shoe', 'can', 'shoe'];
export const ASSESS_VOICES = ['as_intro', 'as_left', 'as_right', 'as_again', 'as_low', 'as_rest', 'as_gng', 'as_done', 'as_pain'];
const SIDE = { L: '左手', R: '右手' };

/* 入口交接（純函式，node 測得到）：今天在入口量過、而且展示／真實一致，就存成釣魚的一筆並回傳；否則 null（照原本試竿） */
export function fromHub(store, code, demo, extra, now = Date.now()) {
  const h = hubToday(store, code, now);
  return h && !!h.demo === !!demo ? adopt(store, code, GAME, extra, now) : null;
}
/* 入口推薦的難度（'easy'｜'normal'｜'hard'），沒有回 null；釣魚的難度是 0／1／2 */
export function hubDiff(code, opt) { const p = pickFor(GAME, code, opt); return p && DIFFS.includes(p.diff) ? p.diff : null; }
export const DIFF_IDX = { easy: 0, normal: 1, hard: 2 };

export function createAssess(g) {
  const store = createStore();
  let ranFor = null, st = null, last = null;
  const cur = () => store.current();
  const pain = () => { const s = cur(); return !!s && (s.pain === 'yes' || painToday(store, s.code)); };   /* 建檔會痛，或今天在入口小測按了「肩膀會痛」（只算今天） */
  const skipBtn = () => g.$('btnSkip');

  const profile = mountProfile(g.$('segDiff').closest('.field'), store, {
    game: '釣魚',
    onChange: (s) => { g.resetForNewPlayer(); last = null; if (s && ranFor !== s.code) ranFor = null; recommend(); },
  });

  /* 入口推薦的難度：載入與換人時套用；帶領者自己按過難度就不再自動切 */
  const recLine = document.createElement('p'); recLine.className = 'note gd-rec'; recLine.hidden = true;
  g.$('segDiff').insertAdjacentElement('afterend', recLine);
  let diffTouched = false, applying = false;
  g.$('segDiff').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (!applying) diffTouched = true; }));
  function recommend() {
    const s = cur(), d = s && hubDiff(s.code);
    recLine.hidden = !d;
    if (!d) return;
    const done = hubToday(store, s.code);
    recLine.textContent = `感．動復能推薦：${DIFF_NAME[d]}${done ? '；今天在入口量過了，不用再試竿' : ''}`;
    if (diffTouched) return;
    const b = g.$('segDiff').querySelector(`[data-v="${DIFF_IDX[d]}"]`);
    if (b && !b.classList.contains('on')) { applying = true; b.click(); applying = false; }
  }
  recommend();

  function msg(text, sec, good = true) { if (st) st.msg = { text, until: performance.now() + sec * 1000, good }; }

  function gate(next) {
    const s = cur();
    if (!s || st || ranFor === s.code) return false;
    if (g.cfg.input !== 'cam' && g.cfg.input !== 'demo') return false;
    /* 今天在感．動復能入口量過：不再試竿，沿用那一筆，等同試竿剛做完 */
    const h = fromHub(store, s.code, g.cfg.input === 'demo', { ver: g.ver });
    if (h) { last = { id: h.id, code: s.code, played: false, demo: !!h.demo }; ranFor = s.code; return false; }
    const P = g.P, cam = g.cfg.input === 'cam';
    const rest = cam && P.calibrated ? P.calMin + 0.3 * (P.calMax - P.calMin) : -0.5;
    st = {
      s, next, stage: 'intro', t: 0, at: Date.now(), seq: -1, warm: g.warm(), msg: null, stim: null, gi: 0, ni: 0, demo: {},
      lift: new LiftMeasure({ restLine: rest, aspect: g.sigT.aspect || 16 / 9 }), gng: new GoNoGo({ restLine: rest }),
    };
    g.enter('assess'); g.hudOn(true);
    const b = skipBtn(); g.show(b); b.onclick = skip;
    g.AE.say('as_intro');
    return true;
  }

  function stage(name) { st.stage = name; st.t = 0; }

  function skip() {
    if (!st) return;
    if (st.stage === 'intro') return stage('lift');
    if (st.stage === 'lift') return onLift(st.lift.skipSide());
    if (st.stage === 'gngIntro') return stage('gng');
    if (st.stage === 'gng' || st.stage === 'outro') return finish(false);
  }

  function onLift(evs) {
    for (const e of evs) {
      if (e.type === 'side') { g.AE.say(e.side === 'L' ? 'as_left' : 'as_right'); if (pain()) setTimeout(() => g.AE.sayIdle('as_pain'), 5200); }
      else if (e.type === 'ready' && e.rep > 0) g.AE.sayIdle('as_again');
      else if (e.type === 'rep') { if (e.ok) { g.AE.high(); msg('很好', 1); } if (e.held) { g.AE.sayIdle('as_low'); msg('手放下來', 1.6, false); } }
      else if (e.type === 'remindLow') { g.AE.sayIdle('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'skipSide') { g.AE.say('as_rest'); msg('這隻手先休息', 2.2, false); }
      else if (e.type === 'done') { stage('gngIntro'); g.AE.say('as_gng'); }
    }
  }

  function onGng(evs, now) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, id: e.kind === 'go' ? GO_IDS[st.gi++ % GO_IDS.length] : NOGO_IDS[st.ni++ % NOGO_IDS.length], t: now, res: null }; g.AE.plop(); }
      else if (e.type === 'hit') { st.stim.res = 'hit'; st.stim.resAt = now; g.AE.catch(10); }
      else if (e.type === 'commission') { st.stim.res = 'commission'; st.stim.resAt = now; g.AE.clunk(); }
      else if (e.type === 'reject') { st.stim.res = 'reject'; st.stim.resAt = now; g.AE.hold(); }
      else if (e.type === 'omission') { st.stim.res = 'omission'; st.stim.resAt = now; g.AE.away(); }
      else if (e.type === 'remindLow') { g.AE.sayIdle('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'done') { stage('outro'); g.AE.say('as_done'); }
    }
  }

  /* 展示模式：沒有鏡頭，用假的手跑一遍（左手舉得比右手低、反應時間約 0.75 秒、第 2 個垃圾手滑） */
  function demoSample(now) {
    const d = st.demo, low = -0.9;
    if (st.stage === 'lift') {
      const L = st.lift, sd = L.sideId;
      if (L.st === 'up') {
        if (d.upAt == null) d.upAt = now;
        const e = (now - d.upAt) / 1000, target = sd === 'L' ? 0.32 + 0.04 * L.rep : 0.95;
        const v = e < 1 ? low + (target - low) * e : e < 1.6 ? target : e < 2.2 ? target - (target - low) * (e - 1.6) / 0.6 : low;
        return { t: now, lh: sd === 'L' ? v : low, rh: sd === 'R' ? v : low, lm: null };
      }
      d.upAt = null;
      return { t: now, lh: low, rh: low, lm: null };
    }
    if (st.stage === 'gng' && st.stim && !st.stim.res) {
      const e = (now - st.stim.t) / 1000;
      const lift = st.stim.kind === 'go' || (st.stim.kind === 'nogo' && st.ni === 2);
      if (lift && e > 0.75) { const v = low + Math.min(1, (e - 0.75) / 0.5) * 1.2; return { t: now, lh: v, rh: low, lm: null }; }
    }
    return { t: now, lh: low, rh: low, lm: null };
  }

  function step(now, dt) {
    if (!st) return;
    st.t += dt;
    const P = g.P;
    let smp = null;
    if (g.cfg.input === 'demo') smp = demoSample(now);
    else if (P.seq !== st.seq) { st.seq = P.seq; smp = { t: now, lh: P.lh, rh: P.rh, lm: P.lm }; }
    switch (st.stage) {
      case 'intro': if (st.t >= 5.8) stage('lift'); break;   /* 等開場那句講完（約 5.3 秒） */
      case 'lift': if (smp) onLift(st.lift.push(smp)); break;
      case 'gngIntro': if (st.t >= 5.2) stage('gng'); break;
      case 'gng': if (smp) onGng(st.gng.push({ t: smp.t, v: Math.max(smp.lh ?? -9, smp.rh ?? -9) > -9 ? Math.max(smp.lh ?? -9, smp.rh ?? -9) : null }), now); break;
      case 'outro': if (st.t >= 2.8) finish(true); break;
    }
  }

  function finish(complete) {
    const s = st.s, demo = g.cfg.input === 'demo';
    const rec = {
      code: s.code, game: GAME, ver: g.ver, at: st.at, input: g.cfg.input, complete, warm: st.warm, pain: s.pain,
      lift: st.lift.summary(), gng: st.gng.trials.length ? st.gng.summary() : null, ...(demo ? { demo: true } : {}),
    };
    const r = store.addSession(rec);
    last = { id: r.id, code: s.code, played: false, demo };
    ranFor = s.code;
    const next = st.next; st = null; g.hide(skipBtn());
    next();
  }

  function cancel() { if (st) { st = null; g.hide(skipBtn()); } }

  function download(kind, code) {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const csv = kind === 'csv', body = csv ? store.exportCsv(code) : store.exportJson(code);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }));
    a.download = `動作紀錄_${code}_${stamp}.${csv ? 'csv' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function afterResult() {
    const more = g.$('resGrid').parentNode; remove(more);
    const s = cur();
    if (!s || !last || last.code !== s.code) { renderNext(more, GAME, s && s.code); return; }
    if (!last.played) {
      const stat = g.stat(), sum = (ids) => ids.reduce((a, k) => a + (stat.counts[k] || 0), 0), avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      store.updateSession(last.id, { play: { score: g.score(), diff: g.cfg.diff, fish: sum(g.FISH_ORDER), trash: sum(g.TRASH_ORDER), high: stat.high, low: stat.low, reps: stat.reps, lPeak: avg(stat.lPeaks), rPeak: avg(stat.rPeaks) } });
      last.played = true;
    }
    const hist = store.history(s.code, GAME).filter((h) => !!h.demo === last.demo);
    const summary = buildSummary(s, hist, { goName: '魚', nogoName: '垃圾' });
    renderReport({ host: more, therHost: more, subject: s, summary, history: hist, onExport: (k) => download(k, s.code) });
    renderNext(more, GAME, s.code);   /* 感．動復能的「下一款」卡；訪客或沒有計畫不畫 */
  }

  /* ---------- 畫面（虛擬 1920×1080） ---------- */
  function dots(ctx, cx, y, n, done, r = 26) {
    for (let i = 0; i < n; i++) {
      const x = cx + (i - (n - 1) / 2) * (r * 2.8), on = i < done;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = on ? '#FFD84D' : 'rgba(255,255,255,.14)'; ctx.fill();
      ctx.strokeStyle = on ? '#8A5A00' : '#fff6'; ctx.lineWidth = 4; ctx.stroke();
      g.txt(on ? '✓' : String(i + 1), x, y + 2, r * 1.2, on ? '#5A3000' : '#fff');
    }
  }

  function draw(ctx, now) {
    if (!st) return;
    const { W, H, txt, rr } = g;
    ctx.fillStyle = 'rgba(8,34,50,.95)'; ctx.fillRect(0, 0, W, H);
    txt('試竿：開始釣魚前，看看兩隻手', W / 2, 50, 36, '#BFE3F4');
    let head = '';
    if (st.stage === 'intro') head = '先試試竿子：兩隻手各舉 3 下';
    else if (st.stage === 'lift') {
      const L = st.lift, nm = SIDE[L.sideId];
      head = L.st === 'low' ? `${nm}先放下來` : pain() ? `${nm}舉到不會痛的高度，停一下` : `${nm}舉到最高，停一下`;
    } else if (st.stage === 'gngIntro') head = '看到魚就舉手，看到垃圾手不要動';
    else if (st.stage === 'gng') head = st.stim && !st.stim.res ? '' : '手放下來，等下一個';
    else head = '試竿完成，開始釣魚囉';
    if (head) txt(head, W / 2, 124, 72, '#fff', 'center', 'rgba(15,40,55,.95)', 10);

    if (st.stage === 'intro' || st.stage === 'lift') {
      const L = st.lift, by = 300, bh = 740;
      /* 左邊：哪一手、第幾下 */
      rr(40, by, 410, bh, 18, '#FFFBF2', '#134F72', 4);
      for (const [i, sd] of ['L', 'R'].entries()) {
        const y = by + 150 + i * 330, active = st.stage === 'lift' && L.sideId === sd && !L.done;
        const n = L.reps.filter((r) => r.side === sd).length, skipped = L.skipped.includes(sd);
        txt(SIDE[sd], 245, y - 60, active ? 76 : 58, active ? '#C8402E' : '#62707A', 'center', '', 0);
        if (skipped) txt('先休息', 245, y + 40, 40, '#62707A', 'center', '', 0);
        else for (let k = 0; k < L.o.reps; k++) {
          const x = 245 + (k - 1) * 92, on = k < n;
          ctx.beginPath(); ctx.arc(x, y + 40, 32, 0, 7); ctx.fillStyle = on ? '#3CC277' : active ? '#FFE9A8' : '#E7EEF0'; ctx.fill();
          ctx.strokeStyle = '#134F72'; ctx.lineWidth = 3; ctx.stroke(); if (on) txt('✓', x, y + 42, 38, '#fff', 'center', '', 0);
        }
      }
      txt('畫面是鏡子', 245, by + bh - 50, 32, '#62707A', 'center', '', 0);
      g.drawCam(474, by, 1190, bh, { big: true });
      /* 右邊：這隻手現在多高（軀幹長，不經個人校正） */
      const side = st.stage === 'lift' ? L.sideId : 'L', v = side === 'L' ? g.P.lh : g.P.rh, lo = -1, hi = 1.3, mx = 1690, mw = 110;
      const y = (x) => by + bh - bh * Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
      rr(mx - 6, by - 6, mw + 12, bh + 12, 18, 'rgba(15,40,55,.9)');
      if (v != null && g.cfg.input === 'cam') rr(mx, y(v), mw, by + bh - y(v), 14, '#8FD3F0');
      for (const [lv, name] of [[0, '肩膀'], [0.6, '頭頂']]) { ctx.fillStyle = '#fff8'; ctx.fillRect(mx - 10, y(lv) - 2, mw + 20, 4); txt(name, mx + mw / 2, y(lv) - 22, 26, '#BFE3F4'); }
      txt('高度', mx + mw / 2, by - 30, 32, '#BFE3F4');
    } else {
      /* 看圖：左邊自己的畫面，右邊大大的魚或垃圾 */
      const by = 240, bh = 800;
      g.drawCam(40, by, 760, bh, { big: true });
      rr(840, by, 1040, bh, 22, 'rgba(255,255,255,.08)', '#fff4', 3);
      if (st.stage === 'gng') {
        const S = st.stim, im = S && g.IMG[S.id];
        if (S && im && !(S.res && now - S.resAt > 700)) {
          const w = 620, h = (w * im.height) / im.width, a = S.res ? 0.5 : 1;
          ctx.save(); ctx.globalAlpha = a; ctx.drawImage(im, 1360 - w / 2, by + bh / 2 - h / 2 - 30, w, h); ctx.restore();
          if (S.res === 'hit') txt('拉到了', 1360, by + bh - 90, 64, '#5BE08A');
          else if (S.res === 'reject') txt('忍住了', 1360, by + bh - 90, 64, '#5BE08A');
          else if (S.res === 'commission') txt('是垃圾喔', 1360, by + bh - 90, 64, '#FFB4A8');
          else if (S.res === 'omission') txt('游走了', 1360, by + bh - 90, 64, '#FFB4A8');
        }
        dots(ctx, 1360, by + 60, GNG.seq.length, st.gng.trials.length, 22);
      } else {
        g.txt('魚 → 舉手', 1360, by + 300, 80, '#5BE08A');
        g.txt('垃圾 → 不動', 1360, by + 460, 80, '#FFB4A8');
      }
    }
    if (st.msg && st.msg.until > now) {
      ctx.font = `900 66px ${g.FONT}`; const tw = ctx.measureText(st.msg.text).width + 80;
      rr(W / 2 - tw / 2, 930, tw, 100, 22, st.msg.good ? '#1E7A47' : '#C8402E'); txt(st.msg.text, W / 2, 981, 66, '#fff');
    }
  }

  return {
    gate, step, draw, cancel, afterResult,
    noPush: pain,
    get active() { return !!st; },
    get state() { return st && { stage: st.stage, lift: { st: st.lift.st, side: st.lift.sideId, rep: st.lift.rep, done: st.lift.done }, gng: { st: st.gng.st, i: st.gng.i }, stim: st.stim }; },
    store, profile,
  };
}
