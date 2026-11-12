/* 認知遊戲（用身體答題）背景音樂 v1（2026-11-11）
   - 三首 CC0 輪流（同一位作者 MintoDog 的 Cozy Puzzle 系列，風格一致；來源見 audio/LICENSES.md）。
     一局從上次停的下一首開始；一首播完 2.5 秒交叉淡化接下一首，不用循環點，所以沒有接縫問題。
   - 音量刻意壓低（想題目時不搶注意力）：三首原始響度約 −13.5 dBFS，乘 0.10 ≈ 釣魚配樂的感覺再小一點。
   - 答對音效、語音出來時自動壓低（duck），結束後慢慢回來。
   - 開關記在 localStorage（gd_music_v1，'0'＝關），整個感．動復能共用同一個鍵；?mute=1 一律不出聲。
   - 分頁切到背景就暫停（AudioContext suspend），回來再繼續。
   - 結算頁：淡出配樂，播一次過關小曲（clear.m4a）。 */

const TRACKS = [
  { id: 'cozy2', file: 'audio/bgm_1.m4a', title: 'Cozy Puzzle In-Game 2', by: 'MintoDog' },
  { id: 'cozyT', file: 'audio/bgm_2.m4a', title: 'Cozy Puzzle Title', by: 'MintoDog' },
  { id: 'cozy3', file: 'audio/bgm_3.m4a', title: 'Cozy Puzzle In-Game 3', by: 'MintoDog' },
];
const VOL = 0.10, DUCK = 0.035, XFADE = 2.5;
const KEY_ON = 'gd_music_v1', KEY_I = 'gd_quiz_bgm_i';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

export function createBgm({ muted = false, base = '' } = {}) {
  let ac = null, master = null, cur = null, playing = false, ti = Math.max(0, parseInt(lsGet(KEY_I), 10) || 0) % TRACKS.length;
  const bufs = {}, loading = {};
  let on = lsGet(KEY_ON) !== '0';
  let duckT = 0, swapT = 0;

  function ctx() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); master = ac.createGain(); master.gain.value = muted || !on ? 0 : VOL; master.connect(ac.destination);
      document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (playing) ac.resume(); });
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume();
    return ac;
  }
  function load(i) {
    const t = TRACKS[i];
    if (bufs[t.id] || loading[t.id]) return loading[t.id] || Promise.resolve(bufs[t.id]);
    loading[t.id] = fetch(base + t.file).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ctx().decodeAudioData(b, ok, no)))
      .then((buf) => { bufs[t.id] = buf; return buf; }).catch(() => null);
    return loading[t.id];
  }
  /* 播第 i 首；舊的那首淡出 */
  async function playTrack(i, fadeIn) {
    const buf = await load(i);
    if (!buf || !playing) return;
    const a = ctx(), now = a.currentTime;
    const g = a.createGain(), s = a.createBufferSource();
    s.buffer = buf; s.connect(g).connect(master);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + fadeIn);
    s.start(now);
    if (cur) fadeOut(cur, XFADE);
    cur = { s, g, i, t0: now, dur: buf.duration };
    ti = i; lsSet(KEY_I, String((i + 1) % TRACKS.length));
    /* 快播完時接下一首（交叉淡化） */
    clearTimeout(swapT);
    swapT = setTimeout(() => { if (playing && cur && cur.s === s) playTrack((i + 1) % TRACKS.length, XFADE); }, Math.max(1, buf.duration - XFADE) * 1000);
    load((i + 1) % TRACKS.length);   // 先把下一首載好
  }
  function fadeOut(c, sec) {
    try { const now = ac.currentTime; c.g.gain.cancelScheduledValues(now); c.g.gain.setValueAtTime(c.g.gain.value, now); c.g.gain.linearRampToValueAtTime(0, now + sec); c.s.stop(now + sec + 0.05); } catch (e) {}
  }

  return {
    TRACKS,
    ctx,
    get on() { return on; },
    get state() { return { on, muted, playing, track: cur ? TRACKS[cur.i].id : null, next: TRACKS[(ti + 1) % TRACKS.length].id, loaded: Object.keys(bufs), vol: master ? +master.gain.value.toFixed(3) : null }; },
    /* 開始一局（要在使用者按鍵當下呼叫，瀏覽器才准出聲）；已經在播就不重來 */
    start() {
      if (muted || playing) return;
      if (!ctx()) return;
      playing = true;
      playTrack(parseInt(lsGet(KEY_I), 10) % TRACKS.length || 0, 1.2);
    },
    stop(sec = 1.2) { playing = false; clearTimeout(swapT); if (cur) { fadeOut(cur, sec); cur = null; } },
    /* 答對音效、語音時壓低 */
    duck(sec = 0.8) {
      if (!master || muted || !on) return;
      const now = ac.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(DUCK, now, 0.04);
      clearTimeout(duckT); duckT = setTimeout(() => { if (on && ac) master.gain.setTargetAtTime(VOL, ac.currentTime, 0.25); }, sec * 1000);
    },
    setOn(v) {
      on = !!v; lsSet(KEY_ON, on ? '1' : '0');
      if (master) { const now = ac.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(on && !muted ? VOL : 0, now, 0.08); }
      return on;
    },
    /* 結算：配樂淡出，播一次過關小曲（音樂關掉時也不播） */
    async fanfare() {
      this.stop(1.5);
      if (muted || !on || !ctx()) return;
      try {
        const buf = bufs.clear || (bufs.clear = await fetch(base + 'audio/clear.m4a').then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))));
        const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 1.4;   // 小曲本身比配樂小聲一點，放大一些（總音量仍 ≈ 0.14）
        s.buffer = buf; s.connect(g).connect(master); s.start(ac.currentTime + 0.6);
        if (master) master.gain.setTargetAtTime(VOL, ac.currentTime, 0.05);
      } catch (e) {}
    },
  };
}
