/* 感．動復能：入口「小測」（約 1 分鐘）
   流程與釣魚接頭（釣魚/game/assess-hook.js）相同，只是名稱叫「小測」，畫面用 DOM 畫：
   1. 左手 3 下、右手 3 下（assess/lift.js）：舉到最高、停一下、放下。
   2. 記菜（2026-11-12 新增）：先看 3 樣要買的東西，跟著唸一遍（約 10 秒）。
   3. 看圖 8 題（assess/gonogo.js）：魚就舉手、垃圾不動，順序同釣魚的 GO_IDS／NOGO_IDS。這關同時是記菜的干擾作業。
   4. 想起來 6 題：一次一樣，剛剛要買的就舉手、沒有要買的手不動（同一個 GoNoGo 判定，舉手動作和第 3 關一樣）。
   鏡頭樣本一律用 assess/signal.js 的 HandSignal 算 lh、rh（與各遊戲量測關同一把尺）。
   ?demo=1：不開鏡頭，用假的手跑完（左手比右手低、反應約 0.75 秒、第 2 個垃圾手滑），紀錄標 demo:true。
   ?mute=1：完全不出聲（不建立 AudioContext）。 */
import { LiftMeasure } from './assess/lift.js?v=1';
import { GoNoGo, GNG } from './assess/gonogo.js?v=1';
import { HandSignal } from './assess/signal.js?v=1';
import { itemById } from '../動作答題/banks/market.js';

export const VER = 'hub-0.2';
const GO_IDS = ['tilapia', 'milkfish', 'snapper', 'tilapia', 'milkfish'];
const NOGO_IDS = ['shoe', 'can', 'shoe'];
const VOICES = ['as_left', 'as_right', 'as_again', 'as_low', 'as_rest', 'as_gng', 'as_pain', 'as_mem', 'as_rec'];

/* ---------- 記菜（2026-11-12 老闆：入口評估加記憶；作答選 A「看過就舉手」） ----------
   借 Mini-Cog「記 3 個 → 干擾作業 → 回想」的結構（Borson et al., 2000），改成圖片＋再認（一次一樣、舉手＝有要買）。
   再認比自由回想容易，鑑別力較低〔推論〕；之後連續滿分的人可改記 4 樣（待老闆決定）。
   3 本題本輪流（依這個人做過幾次記菜），每本 3 樣要買＋3 樣沒買；沒買的跟要買的同類（菜對菜、水果對水果），
   但避開長得太像的組合（菜市場記清單的 SIMILAR），也不用魚，免得和「魚和垃圾」混在一起。 */
export const MEM_BOOKS = [
  { id: 'A', buy: ['cabbage', 'banana', 'eggs'], not: ['broccoli', 'pineapple', 'milk'] },
  { id: 'B', buy: ['tomatoes', 'apples', 'tofu'], not: ['carrot', 'grapes', 'pudding'] },
  { id: 'C', buy: ['spring_onion', 'kiwi', 'enoki'], not: ['garlic', 'cherry', 'sweet_potato'] },
];
export const MEM = {
  showSec: 10,                                   /* 看 3 樣多久（語音約 6 秒，固定時間，每次一樣才能比較） */
  seq: ['go', 'nogo', 'go', 'nogo', 'nogo', 'go'],  /* go＝要買的、nogo＝沒買的；固定順序 */
  winSec: 4,                                     /* 每樣看幾秒：要想一下，比魚和垃圾多 1 秒 */
  recIntroSec: 5,
};
const memImg = (id) => `../動作答題/img/price/${id}.jpg`;
const memName = (id) => (itemById(id) || {}).short || id;
const SIDE = { L: '左手', R: '右手' };
const REST_LINE = -0.5;            /* 入口沒有個人校正，放下線用釣魚未校正時的值 */
const LO = -1, HI = 1.3;           /* 高度條的範圍（軀幹長） */
const STALE_MS = 300;
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

/* ---------- 聲音：mute 時什麼都不建立 ---------- */
function createAudio(mute) {
  const A = { ac: null, buf: {}, src: null, speaking: false };
  A.init = () => {
    if (mute || A.ac) { if (A.ac && A.ac.state === 'suspended') A.ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    A.ac = new C();
    VOICES.forEach((v) => fetch(`audio/${v}.m4a`).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => b && A.ac.decodeAudioData(b)).then((d) => { if (d) A.buf[v] = d; }).catch(() => {}));
  };
  A.say = (id) => {
    if (!A.ac || !A.buf[id]) return;
    try { if (A.src) A.src.stop(); } catch (e) { /* 已停 */ }
    const s = A.ac.createBufferSource(); s.buffer = A.buf[id]; s.connect(A.ac.destination);
    A.src = s; A.speaking = true; s.onended = () => { if (A.src === s) { A.speaking = false; A.src = null; } }; s.start();
  };
  A.sayIdle = (id) => { if (!A.speaking) A.say(id); };
  A.tone = (f, dur = 0.18, vol = 0.12) => {
    if (!A.ac) return;
    const t = A.ac.currentTime, o = A.ac.createOscillator(), g = A.ac.createGain();
    o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.ac.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  A.good = () => { A.tone(660); setTimeout(() => A.tone(880), 90); };
  A.soft = () => A.tone(330, 0.22, 0.08);
  A.stop = () => { try { if (A.src) A.src.stop(); } catch (e) { /* 已停 */ } A.speaking = false; };
  return A;
}

/* el：小測畫面的根節點（index.html 的 #scrQuiz）
   getSubject()：現在的個案；onDone(rec)：量完（含略過）回傳要存的紀錄；onExit()：按回首頁 */
export function createQuiz(el, { demo = false, mute = false, getSubject, onDone, onExit, memBook = () => 0 }) {
  const q = (s) => el.querySelector(s);
  const E = {
    h: q('.qz-h'), k: q('.qz-k'), body: q('.qz-body'), video: q('.qz-cam video'), none: q('.qz-none'),
    fill: q('.qz-meter b'), img: q('.qz-stim img'), res: q('.qz-stim .qz-res'), rule: q('.qz-stim .qz-rule'),
    gdots: q('.qz-stim .qz-gdots'), msg: q('.qz-msg'), skip: q('[data-q=skip]'), back: q('[data-q=back]'), hurt: q('[data-q=hurt]'),
    start: q('.qz-start'), startBtn: q('[data-q=go]'), startNote: q('.qz-start .qz-note'), pain: q('.qz-start .qz-pain'),
    sides: { L: q('.qz-side [data-s=L]'), R: q('.qz-side [data-s=R]') },
  };
  const AE = createAudio(mute);
  const IMG = {};
  for (const id of new Set([...GO_IDS, ...NOGO_IDS])) { const im = new Image(); im.src = `assess/img/${id}.webp`; IMG[id] = im; }
  for (const b of MEM_BOOKS) for (const id of [...b.buy, ...b.not]) { const im = new Image(); im.src = memImg(id); IMG[id] = im; }
  /* 記菜的 3 樣：畫面元素由這裡建立（index.html 不用改結構） */
  E.mem = document.createElement('div'); E.mem.className = 'qz-memo'; E.mem.style.display = 'none';
  E.mem.innerHTML = '<div class="qz-memo-row">' + [0, 1, 2].map(() => '<figure><img alt=""><figcaption></figcaption></figure>').join('') + '</div>';
  E.body.appendChild(E.mem);
  E.memFig = [...E.mem.querySelectorAll('figure')];
  E.gdots.innerHTML = GNG.seq.map(() => '<i></i>').join('');
  q('.qz-meter').querySelectorAll('i').forEach((i) => { i.style.bottom = pct(+i.dataset.v) + '%'; });

  /* 鏡頭 */
  const cam = { stream: null, video: null, land: null, ready: false, lastVT: -1, sig: null, live: null, seq: 0, stub: null, failed: false };
  let st = null, timer = null, lastNow = 0, painTimer = null;

  function pct(v) { return Math.max(0, Math.min(1, (v - LO) / (HI - LO))) * 100; }

  async function openCamera() {
    if (cam.ready) return;
    const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: false });
    cam.stream = s;
    const v = document.createElement('video'); v.playsInline = true; v.muted = true; v.srcObject = s; await v.play();
    cam.video = v; E.video.srcObject = s; E.video.play().catch(() => {});
    const { PoseLandmarker, FilesetResolver } = await import(`${MP}`);
    const vision = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
    const mk = (d) => PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL, delegate: d }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { cam.land = await mk('GPU'); } catch (e) { cam.land = await mk('CPU'); }
    cam.ready = true;
  }

  function closeCamera() {
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null; E.video.srcObject = null;
    if (!cam.stub) { cam.ready = false; cam.video = null; }
  }

  /* 每一格：有新的鏡頭畫面才偵測一次 */
  function track(now) {
    if (!cam.ready || !cam.video || !cam.land) return;
    const vt = cam.video.currentTime; if (vt === cam.lastVT) return; cam.lastVT = vt;
    let res; try { res = cam.land.detectForVideo(cam.video, now); } catch (e) { return; }
    const lm = res && res.landmarks && res.landmarks[0];
    if (!lm || !lm[11] || !lm[12]) return;
    if (!cam.sig) cam.sig = new HandSignal({ aspect: cam.video.videoWidth ? cam.video.videoWidth / cam.video.videoHeight : 16 / 9 });
    const r = cam.sig.update(lm, now);
    cam.live = { t: now, lh: r.lh, rh: r.rh, lm, seq: ++cam.seq };
  }

  function camSample(now) {
    const L = cam.live;
    if (L && now - L.t <= STALE_MS) {
      if (L.seq === st.seq) return null;
      st.seq = L.seq; return { t: L.t, lh: L.lh, rh: L.rh, lm: L.lm };
    }
    if (st.sampleAt != null && now - st.sampleAt < 33) return null;
    st.sampleAt = now;
    return { t: now, lh: null, rh: null, lm: null };
  }

  /* 展示模式：同釣魚接頭的 demoSample */
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
    /* 記菜：要買的 3 樣都舉，沒買的第 2 樣手滑舉了（答對 5／6），想得比較久（約 1.3 秒） */
    if (st.stage === 'rec' && st.stim && !st.stim.res) {
      const e = (now - st.stim.t) / 1000;
      const lift = st.stim.kind === 'go' || (st.stim.kind === 'nogo' && st.stim.k === 1);
      if (lift && e > 1.3) { const v = low + Math.min(1, (e - 1.3) / 0.5) * 1.2; return { t: now, lh: low, rh: v, lm: null }; }
    }
    return { t: now, lh: low, rh: low, lm: null };
  }

  const pain = () => { const s = st && st.s; return !!(st && st.painNow) || (!!s && s.pain === 'yes'); };

  /* 「肩膀會痛」（2026-11-11，老闆：測試階段有反應肩膀痛，就不用勉強）
     舉手時按：舉手量測馬上停，已做的幾下留著，接著做看圖，提示「手抬一下就好」。
     看圖時按：小測直接結束。只記在今天這一筆（painNow），不改建檔資料。 */
  /* 2026-11-12 加記菜：看 3 樣、魚和垃圾說明時按＝之後手抬一下就好；看圖、想起來時按＝直接結束（同原本「看圖時按」） */
  const HURT_STAGES = ['intro', 'lift', 'memShow', 'gngIntro', 'gng', 'recIntro', 'rec'];
  function hurt() {
    if (!st || st.painNow) return;
    if (!HURT_STAGES.includes(st.stage)) return;
    st.painNow = true; clearTimeout(painTimer); AE.stop();
    if (st.stage === 'intro' || st.stage === 'lift') {
      while (!st.lift.done) st.lift.skipSide();
      toMem();
      msg('不勉強，手先休息', 3.5, true);
    } else if (st.stage === 'memShow' || st.stage === 'gngIntro') {
      msg('不勉強，等一下手抬一下就好', 3.5, true);
    } else finish(false);
  }
  function msg(text, sec, good = true) { if (st) st.msg = { text, until: performance.now() + sec * 1000, good }; }
  function stage(name) { st.stage = name; st.t = 0; }

  /* ---------- 流程 ---------- */
  function open() {
    const s = getSubject();
    stop();
    st = { s, stage: 'ready', t: 0, at: null, msg: null, stim: null, gi: 0, ni: 0, demo: {}, seq: -1, sampleAt: null, last: null,
      lift: new LiftMeasure({ restLine: REST_LINE, aspect: 16 / 9 }), gng: new GoNoGo({ restLine: REST_LINE }),
      rec: new GoNoGo({ restLine: REST_LINE, seq: MEM.seq, winSec: MEM.winSec }), mem: null, memSkip: false, dots: null };
    /* 題本輪流：做過幾次記菜就往下一本 */
    let k = 0; try { k = Math.max(0, Math.floor(+memBook(s) || 0)); } catch (e) { k = 0; }
    const book = MEM_BOOKS[k % MEM_BOOKS.length];
    let bi = 0, ni = 0;
    st.mem = { book: book.id, buy: book.buy, not: book.not, items: MEM.seq.map((kd) => (kd === 'go' ? book.buy[bi++] : book.not[ni++])), shownAt: null };
    E.memFig.forEach((f, i) => { f.querySelector('img').src = memImg(book.buy[i]); f.querySelector('figcaption').textContent = memName(book.buy[i]); });
    E.pain.hidden = !(s && (s.pain === 'yes' || s.reach === 'effort'));   /* 做不到或會痛、有點吃力：開始前先說舉到舒服的高度就好 */
    E.startBtn.disabled = false;
    E.startBtn.textContent = demo ? '開始（展示，不開鏡頭）' : '開鏡頭，開始';
    E.startNote.textContent = '';
    E.gdots.querySelectorAll('i').forEach((i) => i.className = '');
    render(performance.now());
  }

  async function begin() {
    if (!st || st.stage !== 'ready') return;
    AE.init();
    E.startBtn.disabled = true;
    if (!demo && !cam.ready) {
      stage('loading'); E.startNote.textContent = '正在開鏡頭，第一次會比較久，請稍等。'; render(performance.now());
      try { await openCamera(); }
      catch (e) {
        console.warn('鏡頭沒有開成功', e);
        if (!st) return;
        stage('ready'); E.startBtn.disabled = false; E.startBtn.textContent = '再試一次';
        E.startNote.textContent = '鏡頭沒有開成功。請確認瀏覽器允許使用鏡頭，或請家人幫忙。';
        render(performance.now()); return;
      }
      if (!st || st.stage !== 'loading') return;
    }
    if (cam.stream) { E.video.srcObject = cam.stream; E.video.play().catch(() => {}); }
    st.at = Date.now();
    stage('intro');
    loop();
  }

  function loop() {
    clearInterval(timer); lastNow = performance.now();
    timer = setInterval(() => { const now = performance.now(), dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now; step(now, dt); }, 33);
  }

  function stop() { clearInterval(timer); timer = null; clearTimeout(painTimer); AE.stop(); }

  function skip() {
    if (!st) return;
    if (st.stage === 'intro') return stage('lift');
    if (st.stage === 'lift') return onLift(st.lift.skipSide());
    if (st.stage === 'memShow') { st.memSkip = true; AE.stop(); stage('gngIntro'); AE.say('as_gng'); return; }   /* 略過記菜：之後不問想起來 */
    if (st.stage === 'gngIntro') return stage('gng');
    if (st.stage === 'gng') { if (st.memSkip) return finish(false); return toRec(); }   /* 略過看圖：記菜照樣問 */
    if (st.stage === 'recIntro') return stage('rec');
    if (st.stage === 'rec' || st.stage === 'outro') return finish(false);
  }

  function onLift(evs) {
    for (const e of evs) {
      if (e.type === 'side') {
        AE.say(e.side === 'L' ? 'as_left' : 'as_right');
        clearTimeout(painTimer); if (pain()) painTimer = setTimeout(() => AE.sayIdle('as_pain'), 5200);
      } else if (e.type === 'ready' && e.rep > 0) AE.sayIdle('as_again');
      else if (e.type === 'rep') { if (e.ok) { AE.good(); msg('很好', 1); } if (e.held) { AE.sayIdle('as_low'); msg('手放下來', 1.6, false); } }
      else if (e.type === 'remindLow') { AE.sayIdle('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'skipSide') { AE.say('as_rest'); msg('這隻手先休息', 2.2, false); }
      else if (e.type === 'done') toMem();
    }
  }

  function toMem() { stage('memShow'); st.mem.shownAt = Date.now(); AE.say('as_mem'); }
  function toRec() { st.stim = null; stage('recIntro'); AE.say('as_rec'); }

  function onRec(evs, now) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, k: e.kind === 'go' ? st.mem.items.slice(0, e.i).filter((_, j) => MEM.seq[j] === 'go').length : st.mem.items.slice(0, e.i).filter((_, j) => MEM.seq[j] === 'nogo').length, id: st.mem.items[e.i], t: now, res: null }; AE.soft(); }
      else if (['hit', 'commission', 'reject', 'omission'].includes(e.type)) {
        st.stim.res = e.type; st.stim.resAt = now;
        if (e.type === 'hit' || e.type === 'reject') AE.good(); else AE.soft();
      } else if (e.type === 'remindLow') { AE.sayIdle('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'done') stage('outro');
    }
  }

  function onGng(evs, now) {
    for (const e of evs) {
      if (e.type === 'stim') { st.stim = { kind: e.kind, id: e.kind === 'go' ? GO_IDS[st.gi++ % GO_IDS.length] : NOGO_IDS[st.ni++ % NOGO_IDS.length], t: now, res: null }; AE.soft(); }
      else if (['hit', 'commission', 'reject', 'omission'].includes(e.type)) {
        st.stim.res = e.type; st.stim.resAt = now;
        if (e.type === 'hit' || e.type === 'reject') AE.good(); else AE.soft();
      } else if (e.type === 'remindLow') { AE.sayIdle('as_low'); msg('手先放下來', 2, false); }
      else if (e.type === 'done') { if (st.memSkip) stage('outro'); else toRec(); }
    }
  }

  function step(now, dt) {
    if (!st) return;
    st.t += dt;
    if (!demo) track(now);
    let smp = null;
    if (st.stage === 'lift' || st.stage === 'gng' || st.stage === 'rec') smp = demo ? demoSample(now) : camSample(now);
    else if (!demo) { const L = cam.live; if (L) smp = { t: now, lh: L.lh, rh: L.rh }; }
    if (smp) st.last = smp;
    switch (st.stage) {
      case 'intro': if (st.t >= 2.5) stage('lift'); break;
      case 'lift': if (smp) onLift(st.lift.push(smp)); break;
      case 'memShow': if (st.t >= MEM.showSec) { stage('gngIntro'); AE.say('as_gng'); } break;
      case 'gngIntro': if (st.t >= 5.2) stage('gng'); break;   /* 等「看到魚就舉手…」那句講完（約 4.9 秒） */
      case 'gng': if (smp) { const v = Math.max(smp.lh ?? -9, smp.rh ?? -9); onGng(st.gng.push({ t: smp.t, v: v > -9 ? v : null }), now); } break;
      case 'recIntro': if (st.t >= MEM.recIntroSec) stage('rec'); break;
      case 'rec': if (smp) { const v = Math.max(smp.lh ?? -9, smp.rh ?? -9); onRec(st.rec.push({ t: smp.t, v: v > -9 ? v : null }), now); } break;
      case 'outro': if (st.t >= 2.2) finish(true); break;
    }
    if (st) render(now);
  }

  function finish(complete) {
    const s = st.s;
    const rec = {
      code: s ? s.code : null, game: 'hub', ver: VER, at: st.at || Date.now(), input: demo ? 'demo' : 'cam', complete, pain: s ? s.pain : null,
      lift: st.lift.summary(), gng: st.gng.trials.length ? st.gng.summary() : null, mem: memSummary(), ...(demo ? { demo: true } : {}),
      ...(st.painNow ? { painNow: true } : {}),
    };
    stop(); st = null; closeCamera();
    onDone(rec);
  }

  /* 記菜結果：correct＝要買的舉了＋沒買的忍住（0～6）。沒問到（略過、按會痛提早結束）就 null */
  function memSummary() {
    const T = st.rec.trials;
    if (!T.length) return st.memSkip ? { skipped: true, book: st.mem.book } : null;
    const g = st.rec.summary();
    return {
      book: st.mem.book, buy: st.mem.buy, not: st.mem.not, n: T.length, of: MEM.seq.length, showSec: MEM.showSec,
      hits: g.hits, misses: g.omissions, fa: g.commissions, cr: g.nogoN - g.commissions, correct: g.hits + (g.nogoN - g.commissions),
      rtMedian: g.rtMedian, notLow: g.notLow, trials: T.map((x) => ({ ...x, id: st.mem.items[x.i] })),
    };
  }

  function exit() { stop(); st = null; closeCamera(); onExit(); }

  /* ---------- 畫面 ---------- */
  const cache = new Map();
  const set = (node, key, val) => {
    const c = cache.get(node) || {}; if (c[key] === val) return; c[key] = val; cache.set(node, c);
    if (key === 'text') node.textContent = val; else if (key === 'html') node.innerHTML = val; else if (key === 'cls') node.className = val; else if (key === 'src') node.src = val; else node.style[key] = val;
  };

  function render(now) {
    if (!st) return;
    const S = st.stage, L = st.lift;
    const REC = S === 'recIntro' || S === 'rec' || (S === 'outro' && !st.memSkip);
    const mode = S === 'ready' || S === 'loading' ? 'start' : S === 'memShow' ? 'mem' : ['gngIntro', 'gng', 'recIntro', 'rec', 'outro'].includes(S) ? 'gng' : 'lift';
    set(el, 'cls', `screen qz qz-${mode}${demo ? ' qz-demo' : ''}`);
    set(E.start, 'display', mode === 'start' ? '' : 'none');
    let head = '';
    if (S === 'ready' || S === 'loading') head = '舉手、記菜、看圖，約 1 分半';
    else if (S === 'intro') head = '兩隻手各舉 3 下';
    else if (S === 'lift') { const nm = SIDE[L.sideId]; head = L.st === 'low' ? `${nm}先放下來` : pain() ? `${nm}舉到不會痛的高度，停一下` : `${nm}舉到最高，停一下`; }
    else if (S === 'gngIntro') head = st.painNow ? '看到魚，手抬一下就好；看到垃圾手不要動' : '看到魚就舉手，看到垃圾手不要動';
    else if (S === 'gng') head = st.stim && !st.stim.res ? '' : '手放下來，等下一張';
    else if (S === 'memShow') head = '要買這 3 樣，跟著唸一遍，記起來';
    else if (S === 'recIntro') head = st.painNow ? '剛剛要買的，手抬一下；沒有要買的，手不要動' : '剛剛要買的就舉手，沒有要買的手不要動';
    else if (S === 'rec') head = st.stim && !st.stim.res ? (st.painNow ? '剛剛有要買這一樣？有就手抬一下' : '剛剛有要買這一樣？有就舉手') : '手放下來，等下一樣';
    else head = '小測完成';
    set(E.h, 'text', head);
    set(E.skip, 'display', mode === 'start' || S === 'outro' ? 'none' : '');
    set(E.skip, 'text', S === 'lift' ? '略過這一手' : S === 'gng' ? '略過看圖' : S === 'memShow' ? '略過記菜' : S === 'rec' ? '略過' : '略過');
    set(E.hurt, 'display', !st.painNow && HURT_STAGES.includes(S) ? '' : 'none');
    set(E.mem, 'display', mode === 'mem' ? '' : 'none');
    set(E.none, 'display', demo ? '' : 'none');

    for (const sd of ['L', 'R']) {
      const box = E.sides[sd], n = L.reps.filter((r) => r.side === sd).length, skipped = L.skipped.includes(sd) || L.manual.includes(sd) && !L.reps.some((r) => r.side === sd && r.ok);
      const active = S === 'lift' && L.sideId === sd && !L.done;
      set(box, 'cls', `qz-sd${active ? ' on' : ''}`);
      const dots = box.querySelector('.qz-dots'), rest = box.querySelector('.qz-restx');
      set(dots, 'display', skipped ? 'none' : ''); set(rest, 'display', skipped ? '' : 'none');
      dots.querySelectorAll('i').forEach((d, k) => set(d, 'cls', k < n ? 'ok' : active && k === n ? 'cur' : ''));
    }
    const side = S === 'lift' ? L.sideId : 'L', last = st.last, v = last ? (side === 'L' ? last.lh : last.rh) : null;
    set(E.fill, 'height', (v == null ? 0 : pct(v)) + '%');

    if (mode === 'gng') {
      /* 看圖與想起來共用同一塊：點點數量、規則字、回饋字依階段換 */
      const dotsFor = REC ? 'rec' : 'gng';
      if (st.dots !== dotsFor) { st.dots = dotsFor; E.gdots.innerHTML = (REC ? MEM.seq : GNG.seq).map(() => '<i></i>').join(''); }
      const Sx = st.stim, show = (S === 'gng' || S === 'rec') && Sx && !(Sx.res && now - Sx.resAt > 700);
      set(E.rule, 'display', S === 'gngIntro' || S === 'recIntro' ? '' : 'none');
      set(E.rule, 'html', REC ? '剛剛要買 → 舉手<br>沒有要買 → 不動' : '魚 → 舉手<br>垃圾 → 不動');
      set(E.img, 'display', show ? '' : 'none');
      if (show) { set(E.img, 'src', IMG[Sx.id].src); set(E.img, 'cls', Sx.res ? 'dim' : ''); }
      const RES = REC ? { hit: ['對，有要買', 'good'], reject: ['對，沒有要買', 'good'], commission: ['這樣沒有要買', 'bad'], omission: ['這樣有要買喔', 'bad'] }
        : { hit: ['舉起來了', 'good'], reject: ['忍住了', 'good'], commission: ['是垃圾喔', 'bad'], omission: ['游走了', 'bad'] };
      const r = show && Sx.res ? RES[Sx.res] : null;
      set(E.res, 'text', r ? r[0] : ''); set(E.res, 'cls', `qz-res ${r ? r[1] : ''}`);
      if (S === 'outro') set(E.res, 'text', '');
      const nDone = REC ? st.rec.trials.length : st.gng.trials.length;
      E.gdots.querySelectorAll('i').forEach((d, k) => { d.className = k < nDone ? 'ok' : ''; });
    }
    const m = st.msg && st.msg.until > now ? st.msg : null;
    set(E.msg, 'display', m ? '' : 'none');
    if (m) { set(E.msg, 'text', m.text); set(E.msg, 'cls', `qz-msg ${m.good ? 'good' : 'bad'}`); }
  }

  E.startBtn.onclick = () => begin();
  E.skip.onclick = () => skip();
  E.hurt.onclick = () => hurt();
  E.back.onclick = () => exit();
  q('[data-q=back2]').onclick = () => exit();

  return {
    open, exit,
    get active() { return !!st; },
    get state() {
      return st && { stage: st.stage, painNow: !!st.painNow, lift: { st: st.lift.st, side: st.lift.sideId, rep: st.lift.rep, done: st.lift.done }, gng: { st: st.gng.st, i: st.gng.i }, rec: { st: st.rec.st, i: st.rec.i }, mem: st.mem && { book: st.mem.book, items: st.mem.items }, memSkip: st.memSkip, stim: st.stim && { kind: st.stim.kind, id: st.stim.id, res: st.stim.res }, last: st.last && { lh: st.last.lh, rh: st.last.rh } };
    },
    /* 測試用假鏡頭：fn(now) 回傳這一格的骨架（MediaPipe 33 點陣列的陣列，每人一組），走真正的 signal.js → 量測路線 */
    stubCam(fn) {
      let n = 0;
      cam.stub = fn; cam.ready = true; cam.sig = null; cam.live = null;
      cam.video = { get currentTime() { return ++n; }, videoWidth: 960, videoHeight: 540 };
      cam.land = { detectForVideo: (_v, now) => ({ landmarks: fn(now) || [] }) };
    },
  };
}
