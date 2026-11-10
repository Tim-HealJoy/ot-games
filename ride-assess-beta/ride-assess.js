/* 騎遍台灣的評估層接頭（2026-11-10，本機，未上線）
   - 路線頁「個案紀錄（治療師用）」：平常收起來，一般玩家看不到；點開才選個案。
   - 出發前「試車」，約 1 分鐘：
       1. 示範正確動作：手機貼胸口、手肘夾緊、用身體帶著手機傾；錯誤示範：身體不動只轉手腕（老闆 2026-11-10 指示）
       2. 坐正拿穩，定正中間
       3. 往左傾 3 下、往右傾 3 下：記手機傾了幾度、回正花幾秒
       4. 看圖 8 題：路上衝出小狗就按（煞車／鈴），飛過蝴蝶不要按
   - 結算頁：動作報告。
   只在「一個人騎」、選了個案、這次開機還沒量過、讀得到手機傾斜時才跑。
   沒選個案、兩個人比、用鍵盤或按鈕騎：流程和原本完全一樣。
   角度用手機的原始傾斜（tilt.roll，不經遊戲的自動校正），試車時自己定正中間；
   手機當方向盤時，手機要多傳 r（原始角度），中繼站也要放行（room-core.mjs 已改，雲端中繼要重新部署才有）。 */
import { createStore } from './assess/store.js?v=1';
import { TiltMeasure } from './assess/tilt.js?v=1';
import { GoNoGo } from './assess/gonogo.js?v=1';
import { buildSummary } from './assess/advice.js?v=1';
import { mountProfile, renderReport, injectCss } from './assess/ui.js?v=1';

export const GAME = 'ride';
export const VER = 'ride 評估層 v1（2026-11-10）';
const WRIST_DEG = 50;   // 〔待確認〕坐著用身體側傾，手機很少超過 50 度；超過多半是手腕在轉
const ZERO_SEC = 1.2;   // 拿穩多久定正中間
const ZERO_STILL = 2.5; // 拿穩：這段時間內晃動小於幾度
const WAIT_SEC = 4;     // 等手機角度資料最多幾秒，等不到就這次不量
/* 示範動畫（老闆 2026-11-10 審過第二版）：Codex 9 個漸進姿勢＋光流補中間畫面，素材與腳本在 ../素材_評估層/ */
const IMG = {
  correct: 'assess-img/lean_correct.webp',   // 往左傾、回正、往右傾（約 8 秒循環）
  wrong: 'assess-img/lean_wrong.webp',       // 身體不動、只轉手腕（和正確同步）
  left: 'assess-img/lean_left_loop.webp',    // 量往左時：只往左傾、停、回正
  right: 'assess-img/lean_right_loop.webp',
  center: 'assess-img/lean_center.webp',     // 定正中間：坐正（靜態）
};
const STIM = { go: { emoji: '🐕', name: '小狗' }, nogo: { emoji: '🦋', name: '蝴蝶' } };
const OPTS = {
  trial: '試車', goName: '小狗', nogoName: '蝴蝶', act: '按',
  goLabel: '小狗衝出來就按', goValue: '{h}／{n} 次有按到', nogoLabel: '蝴蝶飛過不要按', nogoValue: '{k}／{n} 次忍住',
  tiltNote: '試車前有示範手機貼胸口、手肘夾緊、用身體帶，並提醒不要只轉手腕',
  painNote: '建檔註記舉手會痛：這款不用舉手，沒有另外調整。',
  lib: { lookFirst: '先看清楚是小狗還是蝴蝶再按，慢一點沒關係。', moveSmall: '看到小狗衝出來就按一下，不用急。' },
};

const CSS = `
.as-wrap{margin:8px 0 2px;text-align:left}
.as-wrap .as-tog{font-size:15px}
.as-wrap .as-body{margin-top:8px;background:var(--paper);border:3px solid var(--line);border-radius:14px;padding:10px 12px}
.as-wrap .as-body[hidden]{display:none}
.as-wrap .as-hint{font-size:14.5px;font-weight:800;color:var(--mut);margin:0 0 6px;line-height:1.45}
.as-wrap .lab{font-weight:900;font-size:17px;margin:0 0 6px}
.as-wrap .seg{display:flex;flex-wrap:wrap;gap:6px;border:0;box-shadow:none;overflow:visible;border-radius:0}
.as-wrap .seg button,.as-wrap .seg button+button{border:2px solid var(--ink);border-radius:10px;min-height:48px;padding:5px 12px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;box-shadow:0 2px 0 rgba(43,38,34,.85)}
.as-wrap .seg button small{font-size:12.5px;font-weight:800;opacity:.8}
.as-wrap .note{font-size:14.5px;color:var(--mut);font-weight:700;margin:6px 0 0;line-height:1.45}
.as-wrap .link-btn{appearance:none;border:0;background:none;color:var(--blu);font:inherit;font-weight:900;text-decoration:underline;cursor:pointer;padding:0 4px}
.as-wrap .hidden{display:none}
.as-wrap .btn.primary{background:var(--org);color:#fff}
.as-wrap .field{margin:0 0 10px}
.as-wrap .as-form .seg button{flex:1 1 100px;min-height:46px;font-size:16px}
#asOv{position:absolute;inset:0;z-index:7;display:none;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) 10px 8px;background:rgba(43,38,34,.38)}
#asOv.on{display:flex}
#asOv .asBox{width:min(1040px,100%);max-height:100%;overflow:auto;background:rgba(255,253,246,.98);border:3px solid var(--ink);border-radius:18px;box-shadow:0 5px 0 rgba(43,38,34,.85);padding:10px 14px 12px}
#asOv .asTop{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
#asOv .asK{font-weight:900;font-size:clamp(16px,2.2vh,19px);color:var(--org)}
#asOv .asStep{font-weight:900;font-size:clamp(14px,2vh,17px);color:var(--mut)}
#asOv .asTop .sp{flex:1}
#asOv .asMain{display:grid;grid-template-columns:minmax(0,36%) minmax(0,1fr);gap:12px;align-items:center;margin-top:6px}
#asOv .asPic{position:relative;text-align:center}
#asOv .asPic img{display:block;width:auto;max-width:100%;height:min(42vh,340px);margin:0 auto;border-radius:12px;border:2px solid var(--line)}
#asOv .asPic .asTag{position:absolute;left:6px;top:6px;background:var(--grn);color:#fff;font-weight:900;border-radius:8px;padding:1px 8px;font-size:15px}
#asOv .asPic.bad .asTag{background:var(--red)}
#asOv .asHead{font-size:clamp(22px,4.2vh,36px);font-weight:900;line-height:1.3;margin:0}
#asOv .asMsg{font-size:clamp(17px,2.8vh,24px);font-weight:900;color:var(--org);min-height:1.4em;margin:6px 0 0;line-height:1.35}
#asOv .asMsg.ok{color:var(--grn)}
#asOv .asGauge{position:relative;height:clamp(34px,6vh,48px);border:3px solid var(--ink);border-radius:12px;background:#fffdf6;margin:10px 0 2px;overflow:hidden}
#asOv .asGauge .c{position:absolute;left:50%;top:0;bottom:0;width:3px;margin-left:-1.5px;background:var(--ink);opacity:.45}
#asOv .asGauge .tk{position:absolute;top:0;bottom:0;width:1px;background:var(--ink);opacity:.18}
#asOv .asGauge .bL,#asOv .asGauge .bR{position:absolute;top:0;bottom:0;width:4px;margin-left:-2px;background:var(--grn);opacity:.8;display:none}
#asOv .asGauge .now{position:absolute;top:3px;bottom:3px;width:22px;margin-left:-11px;left:50%;border-radius:8px;background:var(--org);transition:left .05s linear}
#asOv .asMain.nopic{grid-template-columns:minmax(0,1fr)}
#asOv .asMain.nopic .asDots{justify-content:center}
#asOv .asScale{position:relative;height:20px;font-size:13px;font-weight:800;color:var(--mut)}
#asOv .asScale span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
#asOv .asScale span.e0{left:0;transform:none}#asOv .asScale span.e1{right:0;left:auto;transform:none}
#asOv .asDots{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
#asOv .asDots i{width:18px;height:18px;border-radius:50%;border:2px solid var(--ink);background:#fffdf6}
#asOv .asDots i.on{background:var(--grn)}#asOv .asDots i.no{background:#cfc4ad}
#asOv .asStim{display:none;font-size:min(22vh,150px);line-height:1;text-align:center;margin:4px 0}
#asOv .asStim.on{display:block}
#asOv .asDemo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:8px}
#asOv .asDemo figure{margin:0;text-align:center;background:#fffdf6;border:3px solid var(--line);border-radius:12px;padding:4px}
#asOv .asDemo figure.ok{border-color:var(--grn)}#asOv .asDemo figure.ok figcaption{color:var(--grn)}
#asOv .asDemo figure.bad{border-color:var(--red)}
#asOv .asDemo img{display:block;width:auto;max-width:100%;height:min(44vh,340px);margin:0 auto;border-radius:8px}
#asOv .asDemo figcaption{font-weight:900;font-size:clamp(14px,2.2vh,18px);line-height:1.3;margin-top:2px}
#asOv .asDemo figure.bad figcaption{color:var(--red)}
#asOv .asCues{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:8px}
#asOv .asCues div{background:#fffdf6;border:3px solid var(--line);border-radius:12px;padding:8px;text-align:center;font-weight:900;font-size:clamp(17px,2.6vh,22px)}
#asOv .asCues span{display:block;font-size:min(13vh,90px);line-height:1.1}
#asOv .asGo{margin-top:10px;font-weight:900;font-size:clamp(17px,2.6vh,22px);color:var(--org)}
#asOv [hidden]{display:none!important}
body.asOn #brake{z-index:8}
body.asOn.asOwn #asOv{padding-right:calc(clamp(92px,17vmin,126px) + max(30px,env(safe-area-inset-right)))}
@media (max-width:700px),(max-height:460px){#asOv .asMain{grid-template-columns:minmax(0,30%) minmax(0,1fr)}#asOv .asDemo{gap:6px}#asOv .asDemo img{height:min(34vh,280px)}#asOv .asIntro .asHead{font-size:clamp(18px,4.6vh,28px)}#asOv .asGo{margin-top:6px}}
.asEnd{margin-top:10px}
.asEnd .as-report{border-color:#9CCBB0}
.asEnd .as-ther{background:var(--paper);border:2px solid var(--line);border-radius:12px;padding:6px 10px;margin-top:6px}
.asEnd .as-ther summary{font-weight:900;cursor:pointer}
.asEnd .as-ther table{width:100%;border-collapse:collapse;font-size:15px}
.asEnd .as-ther th,.asEnd .as-ther td{border-bottom:1px solid var(--line);padding:3px 4px;text-align:left}
.asEnd .note{font-size:14px;color:var(--mut);font-weight:700}
.asEnd .btn-row{display:flex;flex-wrap:wrap;gap:6px}
.asSkipNote{margin-top:8px;font-size:14.5px;font-weight:800;color:var(--mut)}
`;

const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* ctx：$, mode(), input()→{raw, brake}, tilt, syncRoom(extra), btn()→「煞車」或「按鈴」, demo, quit(), playStats(r) */
export function createRideAssess(ctx) {
  const store = createStore();
  const ranFor = new Set();
  let wrapEl = null, prof = null, ov = null, run = null, lastRec = null, skipNote = '';
  const $ = ctx.$;

  /* ───────── 路線頁：個案紀錄 ───────── */
  function mountUi() {
    injectCss();
    if (!document.getElementById('asRideCss')) { const st = document.createElement('style'); st.id = 'asRideCss'; st.textContent = CSS; document.head.appendChild(st); }
    wrapEl = document.createElement('div'); wrapEl.className = 'as-wrap'; wrapEl.id = 'asWrap';
    wrapEl.innerHTML = `<button type="button" class="btn ghost as-tog" aria-expanded="false"></button>
      <div class="as-body" hidden><p class="as-hint">試車要讀得到手機傾斜（手機當方向盤，或用這支手機玩）；用鍵盤或畫面按鈕騎不會量。</p><div class="as-anchor"></div></div>`;
    $('packs').before(wrapEl);
    const tog = wrapEl.querySelector('.as-tog'), body = wrapEl.querySelector('.as-body');
    tog.onclick = () => { body.hidden = !body.hidden; tog.setAttribute('aria-expanded', String(!body.hidden)); label(); };
    prof = mountProfile(wrapEl.querySelector('.as-anchor'), store, { game: '騎車', trial: '約 1 分鐘的「試車」', onChange: () => label() });
    if (store.current()) body.hidden = false;
    refresh();
  }
  function label() {
    if (!wrapEl) return;
    const cur = store.current(), open = !wrapEl.querySelector('.as-body').hidden;
    wrapEl.querySelector('.as-tog').textContent = cur ? `個案紀錄：${cur.code}（${open ? '收起' : '展開'}）` : open ? '個案紀錄（治療師用）收起' : '個案紀錄（治療師用）';
  }
  function refresh() {
    if (!wrapEl) return;
    wrapEl.style.display = ctx.mode() === 'solo' ? '' : 'none';
    prof && prof.render(); label();
  }

  /* ───────── 試車 ───────── */
  const need = () => { const s = store.current(); return !!s && ctx.mode() === 'solo' && !ranFor.has(s.code); };

  function overlay() {
    if (ov) return ov;
    ov = document.createElement('div'); ov.id = 'asOv';
    ov.innerHTML = `<div class="asBox" role="dialog" aria-label="試車">
      <div class="asTop"><b class="asK"></b><span class="asStep"></span><span class="sp"></span>
        <button type="button" class="btn ghost" data-x="next">我準備好了</button>
        <button type="button" class="btn ghost" data-x="skip">略過這一段</button>
        <button type="button" class="btn ghost" data-x="stop">不量了，直接騎</button>
        <button type="button" class="btn ghost" data-x="quit">← 回選路線</button></div>
      <div class="asIntro">
        <p class="asHead"></p>
        <div class="asDemo">
          <figure class="ok"><img src="${IMG.correct}" alt="正確：手機貼在胸口，用身體帶著手機往左、往右傾"><figcaption>✓ 手機貼在胸口、手肘夾緊，用身體帶著手機往左、往右傾</figcaption></figure>
          <figure class="bad"><img src="${IMG.wrong}" alt="錯誤：身體不動，只轉手腕"><figcaption>✗ 身體不動、只轉手腕</figcaption></figure>
        </div>
        <div class="asCues" hidden><div><span>${STIM.go.emoji}</span>小狗衝出來：按一下</div><div><span>${STIM.nogo.emoji}</span>蝴蝶飛過：不要按</div></div>
        <p class="asGo"></p>
      </div>
      <div class="asMain" hidden>
        <div class="asPic"><img alt=""><span class="asTag"></span></div>
        <div><p class="asHead"></p><p class="asMsg"></p>
          <div class="asStim"></div>
          <div class="asMeter"><div class="asGauge"><span class="c"></span><span class="bL"></span><span class="bR"></span><span class="now"></span></div>
            <div class="asScale"><span class="e0">◀ 左</span>${[-45, -30, -15, 0, 15, 30, 45].map((d) => `<span style="left:${pos(d)}%">${d ? Math.abs(d) + '°' : '正中間'}</span>`).join('')}<span class="e1">右 ▶</span></div></div>
          <div class="asDots"></div></div>
      </div></div>`;
    const g = ov.querySelector('.asGauge');
    for (const d of [-45, -30, -15, 15, 30, 45]) { const tk = document.createElement('span'); tk.className = 'tk'; tk.style.left = pos(d) + '%'; g.appendChild(tk); }
    ov.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => act(b.dataset.x)));
    $('tut').parentNode.appendChild(ov);
    return ov;
  }
  const pos = (d) => 50 + Math.max(-1, Math.min(1, d / 60)) * 47;
  const q = (sel) => ov.querySelector(sel);

  function show(view) {
    q('.asIntro').hidden = view !== 'intro' && view !== 'gngIntro';
    q('.asMain').hidden = view === 'intro' || view === 'gngIntro';
    q('.asDemo').hidden = view !== 'intro';
    q('.asCues').hidden = view !== 'gngIntro';
    q('[data-x="next"]').hidden = view !== 'intro' && view !== 'gngIntro';
    q('[data-x="skip"]').hidden = !(view === 'tilt' || view === 'gng');
  }
  function pic(which, tag, bad = false) {
    const p = q('.asPic'), img = p.querySelector('img');
    q('.asMain').classList.toggle('nopic', !which);
    if (!which) { p.hidden = true; return; }
    p.hidden = false; if (img.getAttribute('src') !== IMG[which]) img.setAttribute('src', IMG[which]);
    p.querySelector('.asTag').textContent = tag || ''; p.classList.toggle('bad', bad);
  }
  function head(t) { ov.querySelectorAll('.asHead').forEach((h) => (h.textContent = t)); }
  function msg(t, ok = false, holdMs = 0) {
    if (run && run.msgUntil > performance.now() && !holdMs) return;
    const m = q('.asMsg'); m.textContent = t || ''; m.classList.toggle('ok', ok);
    if (run) run.msgUntil = holdMs ? performance.now() + holdMs : 0;
  }
  function step(n, t) { q('.asStep').textContent = `${n}／4 ${t}`; }
  function dots(list) { const h = list.map((c) => `<i class="${c}"></i>`).join(''), el = q('.asDots'); if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; } }

  function start() {
    const s = store.current();
    return new Promise((res) => {
      overlay(); ov.classList.add('on');
      document.body.classList.add('asOn'); document.body.classList.toggle('asOwn', ctx.inputKind() !== 'phone');   // 用這支手機玩：右下角的按鈕要按得到
      q('.asK').textContent = `試車｜${s.code}`;
      run = { s, res, stage: 'wait', t0: performance.now(), zero: null, zeroBuf: [], tm: null, gng: null, demo: ctx.demo ? { v: 0, until: 0, back: false, side: null, rep: -1 } : null, msgUntil: 0, wristUntil: 0, input: null };
      ctx.tilt && ctx.tilt.setDrift(false);
      ctx.syncRoom({ assess: true });
      enter('wait');
    });
  }

  function enter(stage) {
    const R = run; R.stage = stage; R.stT = performance.now();
    const btn = ctx.btn();
    if (stage === 'wait') { show('main'); pic(null); head('正在讀手機的傾斜…'); msg(''); q('.asMeter').hidden = true; dots([]); step(1, '準備'); }
    if (stage === 'intro') {
      show('intro'); step(1, '看示範');
      head('看動畫：手機貼胸口、手肘夾緊，用身體帶著手機左右傾，像騎車轉彎。一隻手不方便，用另一隻手貼著胸口也可以。');
      q('.asGo').textContent = `看懂了，就按一下「${btn}」開始（也可以按上面的「我準備好了」）`;
    }
    if (stage === 'zero') { show('main'); pic('center', '坐正'); head('坐正，背靠椅背，手機貼在胸口，拿好不動'); msg(''); q('.asMeter').hidden = false; dots([]); step(2, '定正中間'); R.zeroBuf = []; }
    if (stage === 'tilt') {
      show('tilt'); step(3, '左右傾');
      R.tm = new TiltMeasure({ kind: 'roll', wristDeg: WRIST_DEG });
      q('.asMeter').hidden = false;
    }
    if (stage === 'gngIntro') {
      show('gngIntro'); step(4, '看圖');
      head(`最後一段：路上衝出小狗，就按一下「${btn}」；飛過蝴蝶，不要按。手先放開「${btn}」。`);
      q('.asGo').textContent = `看懂了，就按一下「${btn}」開始（也可以按上面的「我準備好了」）`;
      R.gngArm = false;
    }
    if (stage === 'gng') {
      show('gng'); step(4, '看圖'); pic(null); q('.asMeter').hidden = true;
      head(`小狗：按「${btn}」；蝴蝶：不要按`); msg('');
      R.gng = new GoNoGo({ restLine: 0.5 });
      dots(R.gng.o.seq.map(() => ''));
    }
  }

  /* 每一幀：main.js 的 step() 呼叫 */
  function tick() {
    const R = run; if (!R) return;
    const now = performance.now(), inp = R.demo ? demoInput(now) : ctx.input();
    const raw = inp.raw == null || !Number.isFinite(inp.raw) ? null : inp.raw, brake = !!inp.brake;
    const pressed = brake && !R.lastB; R.lastB = brake;
    const deg = raw == null || R.zero == null ? null : wrap180(raw - R.zero);
    if (deg != null) q('.asGauge .now').style.left = pos(deg) + '%';

    switch (R.stage) {
      case 'wait':
        if (raw != null) enter('intro');
        else if (now - R.stT > WAIT_SEC * 1000) { skipNote = '這次讀不到手機的傾斜角度，沒有試車。'; finish(false, 'noTilt'); }
        break;
      case 'intro':
        if (pressed || R.next) { R.next = false; enter('zero'); }
        break;
      case 'zero': {
        if (raw == null) break;
        R.zeroBuf.push({ t: now, v: raw });
        R.zeroBuf = R.zeroBuf.filter((x) => now - x.t <= ZERO_SEC * 1000);
        const vs = R.zeroBuf.map((x) => x.v), span = Math.max(...vs) - Math.min(...vs);
        const full = now - R.zeroBuf[0].t >= ZERO_SEC * 1000 - 60;
        msg(span < ZERO_STILL ? (full ? '' : '很好，拿穩…') : '再拿穩一點');
        if (full && span < ZERO_STILL) { R.zero = median(vs); msg('好，這裡就是正中間', true, 1200); enter('tilt'); }
        break;
      }
      case 'tilt': {
        const tm = R.tm;
        for (const e of tm.push({ t: now, deg })) onTilt(e);
        const sd = tm.sideId;
        if (!tm.done && now > R.wristUntil) pic(sd === 'L' ? 'left' : 'right', sd === 'L' ? '往左' : '往右');
        const mine = tm.reps.filter((r) => r.side === sd);
        dots(Array.from({ length: tm.o.reps }, (_, i) => (mine[i] ? (mine[i].ok ? 'on' : 'no') : '')));
        if (tm.done) { R.tilt = tm.summary(); enter('gngIntro'); }
        break;
      }
      case 'gngIntro':
        if (!brake) R.gngArm = true;
        if ((pressed && R.gngArm) || R.next) { R.next = false; enter('gng'); }
        break;
      case 'gng': {
        const g = R.gng;
        for (const e of g.push({ t: now, v: brake ? 1 : 0 })) onGng(e);
        if (g.done) { R.gngSum = g.summary(); finish(true); }
        break;
      }
    }
  }

  function onTilt(e) {
    const R = run, sd = R.tm.sideId, w = sd === 'L' ? '左' : '右';
    if (e.type === 'side') { head(`用身體帶著手機，慢慢往${w}傾到最多，停一下，再回到正中間`); msg(''); }
    if (e.type === 'ready') msg(R.tm.rep === 0 ? `往${w}傾，慢慢來` : `很好！再往${w}傾一次`);
    if (e.type === 'onset') msg('很好，用身體帶，繼續慢慢傾');
    if (e.type === 'back' || e.type === 'holdLong') msg('很好！慢慢回到正中間', true);
    if (e.type === 'wrongDir') msg(`這一下是往${w}邊喔`, false, 2000);
    if (e.type === 'wrist') { msg('手機貼著胸口、手肘夾緊，用身體帶，不要只轉手腕', false, 3000); pic('wrong', '✗ 只轉手腕', true); R.wristUntil = performance.now() + 3000; }
    if (e.type === 'rep' && e.small) msg('可以再多傾一點點，停一下再回來', false, 2200);
    if (e.type === 'remindCenter') msg('先回到正中間，坐正拿穩');
    if (e.type === 'skipSide') msg(e.manual ? '這一邊先略過' : '這一邊先休息', false, 1500);
  }
  function onGng(e) {
    const R = run, st = q('.asStim'), i = R.gng.trials.length;
    if (e.type === 'stim') { st.textContent = STIM[e.kind].emoji; st.classList.add('on'); msg(''); }
    const done = (t, ok) => { st.classList.remove('on'); msg(t, ok, 1200); const d = R.gng.o.seq.map((_, k) => (k < i ? (R.gng.trials[k].outcome === 'hit' || R.gng.trials[k].outcome === 'reject' ? 'on' : 'no') : '')); dots(d); };
    if (e.type === 'hit') done('按到了！', true);
    if (e.type === 'reject') done('忍住了！', true);
    if (e.type === 'commission') done('是蝴蝶喔，不用按', false);
    if (e.type === 'omission') done('下次看到小狗就按一下', false);
    if (e.type === 'remindLow') msg(`先放開「${ctx.btn()}」`);
  }

  function act(x) {
    const R = run; if (!R) return;
    if (x === 'next') R.next = true;
    if (x === 'skip') {
      if (R.stage === 'tilt') for (const e of R.tm.skipSide()) onTilt(e);
      else if (R.stage === 'gng') { R.gngSum = R.gng.summary(); finish(true, 'gngSkipped'); }
    }
    if (x === 'stop') { skipNote = '這次按了「不量了」，沒有存紀錄。'; finish(false, 'stopped'); }
    if (x === 'quit') { cancel(); ctx.quit(); }
  }

  function finish(save, why = '') {
    const R = run; if (!R) return;
    if (save) {
      const s = R.s, tilt = R.tilt || (R.tm ? R.tm.summary() : null), gng = R.gngSum || null;
      lastRec = store.addSession({
        code: s.code, game: GAME, ver: VER, at: Date.now(), input: ctx.inputKind(), route: ctx.route(),
        complete: !!(R.tilt && gng && gng.trials.length === 8), why: why || null,
        warm: { demo: true }, pain: s.pain, tilt, gng, ...(R.demo ? { demo: true } : {}),
      });
      ranFor.add(s.code); skipNote = '';
    } else if (why === 'noTilt' || why === 'stopped') { /* 不存，也不算量過：下一趟還會再問 */ }
    end(); R.res(true);
  }
  function end() {
    if (ov) { ov.classList.remove('on'); q('.asStim').classList.remove('on'); }
    document.body.classList.remove('asOn', 'asOwn');
    ctx.tilt && ctx.tilt.setDrift(true);
    if (run) ctx.syncRoom({ assess: false });
    run = null;
  }
  function cancel() { if (!run) return; const r = run; end(); r.res(false); }

  /* 展示模式：自己動，跑完整流程（左邊 18 度、右邊 26 度；看圖第 5 題按錯） */
  function demoInput(now) {
    const R = run, D = R.demo, dt = Math.min(0.05, (now - (D.last || now)) / 1000); D.last = now;
    const toward = (v, sp) => { const d = v - D.v; D.v += Math.sign(d) * Math.min(Math.abs(d), sp * dt); };
    let brake = false;
    if (R.stage === 'intro' || R.stage === 'gngIntro') { if (now - R.stT > 1200) brake = (now - R.stT) % 600 < 300; }
    if (R.stage === 'tilt' && R.tm) {
      const tm = R.tm, tgt = tm.sideId === 'L' ? -18 : 26;
      if (tm.st === 'center') { D.back = false; D.hold = 0; toward(0, 30); }
      else if (tm.st === 'out' && !D.back) { toward(tgt, 22); if (Math.abs(D.v - tgt) < 0.2) { D.hold += dt; if (D.hold > 0.6) D.back = true; } }
      else toward(0, 25);
    }
    if (R.stage === 'gng' && R.gng && R.gng.st === 'stim') {
      const c = R.gng.cur, el = now - c.t0;
      brake = (c.kind === 'go' && el > 800) || (c.kind === 'nogo' && c.i === 4 && el > 1000);
    }
    return { raw: D.v, brake };
  }

  /* ───────── 結算頁 ───────── */
  function afterResult(r, host) {
    host.querySelectorAll('.asEnd,.asSkipNote').forEach((x) => x.remove());
    const s = store.current();
    if (!s || ctx.mode() !== 'solo') return;
    const hist = store.history(s.code, GAME);
    const rec = lastRec && lastRec.code === s.code ? hist.find((h) => h.id === lastRec.id) : null;
    if (!rec) { if (skipNote) { const p = document.createElement('p'); p.className = 'asSkipNote'; p.textContent = `${s.code}：${skipNote}`; host.appendChild(p); } return; }
    if (!rec.play) store.updateSession(rec.id, { play: ctx.playStats(r) });
    const h2 = store.history(s.code, GAME), sum = buildSummary(s, h2, OPTS);
    const box = document.createElement('div'); box.className = 'asEnd'; host.appendChild(box);
    renderReport({ host: box, therHost: box, subject: s, summary: sum, history: h2, act: '按', onExport: (k) => exportFile(s.code, k) });
  }
  function exportFile(code, kind) {
    const txt = kind === 'csv' ? store.exportCsv(code) : store.exportJson(code);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `動作紀錄_${code}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${kind === 'csv' ? 'csv' : 'json'}`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: kind === 'csv' ? 'text/csv' : 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* 選了個案但這次沒辦法試車（用鍵盤或畫面按鈕騎）：結算頁寫一句原因 */
  function note(t) { skipNote = t; }

  return { mountUi, refresh, need, start, tick, cancel, afterResult, note, store, get active() { return !!run; }, get run() { return run; }, ranFor };
}
