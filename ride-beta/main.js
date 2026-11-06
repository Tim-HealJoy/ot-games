// 騎遍台灣：大螢幕流程（首頁 → 選路線 → 選角色／QR 大廳 → 騎 → 結算）
import * as THREE from 'three';
import {makeKit, makeSky} from './world.js';
import {createRide, ROUTES, PACKS, SOON, TIPS, LABEL, HP, routeInfo} from './ride.js';
import {makePlayerMesh, CHARS, VEHICLES, defaultsFor} from './roster.js';

const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {get(k, d) { try { return localStorage.getItem('ride_' + k) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ride_' + k, v); } catch (e) {} }};
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (TOUCH) document.body.classList.add('touch');
const MUTE = qs.get('mute') === '1', DEMO_N = +(qs.get('demo') || 0), NOPAUSE = qs.has('nopause') || DEMO_N > 0;
const IS_PHONE = TOUCH && Math.min(screen.width, screen.height) < 820;   // 玩法二：手機自己當螢幕，手機感測器轉向
const LOCALHOST = /^(localhost|127\.)/.test(location.hostname);
const CLOUD = window.RIDE_CLOUD || {}, LOCAL_CLOUD = LOCALHOST && !qs.has('lan') && !qs.get('relay') && !window.RIDE_RELAY && !!CLOUD.relay;
// 雲端中繼；空的＝連提供這個網頁的伺服器。本機試玩也走雲端，手機才能開 https 頁讀傾斜
let RELAY = (LOCALHOST && qs.get('relay')) || window.RIDE_RELAY || (LOCAL_CLOUD ? CLOUD.relay : '');
const tilt = window.createTilt();

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TOUCH ? 1.5 : 2));
const kit = makeKit('toon');
function fit() { renderer.setSize($('stage').clientWidth || innerWidth, $('stage').clientHeight || innerHeight, false); }
addEventListener('resize', fit); fit();

/* ───────── 音效 ───────── */
const Snd = {
  ctx: null, on: store.get('snd', '1') === '1', eng: null, bgm: null, amb: null, music: null,
  init() {
    if (MUTE || this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 340; g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.ctx.destination); o.start();
      this.eng = {o, g};
      this.music = this.ctx.createGain(); this.music.gain.value = this.on ? 1 : 0; this.music.connect(this.ctx.destination);
      if (window.createBGM) { this.bgm = window.createBGM(this.ctx, this.music); this.bgm.setVolume(.2); }
      if (window.createAmbience) this.amb = window.createAmbience(this.ctx, this.music);
    } catch (e) {}
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  },
  setOn(v) { this.on = v; store.set('snd', v ? '1' : '0'); if (this.music) this.music.gain.value = v ? 1 : 0; if (!v) this.engine(0, true); },
  song(routeId) { const r = ROUTES[routeId]; try { this.bgm?.play(r.song, r.songBpm ? {bpm: r.songBpm} : undefined); this.amb?.play(routeId); } catch (e) {} },
  stopSong() { try { this.bgm?.stop(); this.amb?.stop(); } catch (e) {} if (this.eng) this.eng.g.gain.value = 0; },
  gust() { this.amb?.gust(); }, thunder() { this.amb?.thunder(); },
  beep(freq, dur, type = 'square', vol = .06, slide = 0, delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + .02);
  },
  tick() { this.beep(1500, .035, 'square', .035); },
  horn() { this.beep(392, .32, 'sawtooth', .05); this.beep(494, .32, 'sawtooth', .04); },
  click() { this.beep(240, .06, 'triangle', .1); },
  see() { this.beep(880, .09, 'triangle', .05); },
  good() { [659, 784, 988].forEach((f, i) => this.beep(f, .16, 'triangle', .07, 0, i * .07)); },
  ok() { this.beep(659, .14, 'triangle', .06); },
  crash() { this.beep(170, .45, 'sawtooth', .13, -120); this.beep(90, .55, 'square', .1, -40); },
  bump() { this.beep(120, .18, 'square', .1, -50); },
  flash() { this.beep(1900, .08, 'square', .05); this.beep(1100, .22, 'square', .05, 0, .09); },
  engine(v, off) { if (this.eng) { this.eng.o.frequency.value = 52 + v * 7.5; this.eng.g.gain.value = this.on && !off ? .012 : 0; } },
};

/* ───────── 展示間：首頁與選角色背後那台轉動的車 ───────── */
const show = (() => {
  const scene = new THREE.Scene(); scene.background = makeSky('toon', false);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b99c, 1.8));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.3); sun.position.set(4, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 24}); sun.shadow.bias = -.0005; scene.add(sun);
  const road = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, .22, 48), new THREE.MeshToonMaterial({color: 0xe7dcbf})); road.position.y = -.11; road.receiveShadow = true; scene.add(road);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(4.86, 4.92, .14, 48), new THREE.MeshBasicMaterial({color: 0x2b2622})); rim.position.y = -.16; scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 60), cache = new Map();
  let cur = null, key = '', spin = .5;
  return {
    set(pack, c, v) {
      const k = `${pack}|${c}|${v}`; if (k === key) return; key = k;
      if (cur) scene.remove(cur);
      if (!cache.has(k)) cache.set(k, makePlayerMesh(kit, pack, c, v));
      cur = cache.get(k); scene.add(cur);
    },
    /** 畫滿整個畫面，用 ox／oy 把主角推到 UI 旁邊（比例：畫面寬高的幾成） */
    draw(W, H, dt, ox = 0, oy = 0) {
      spin += dt * .55; if (cur) cur.rotation.y = Math.PI + .55 + Math.sin(spin) * .75;
      cam.aspect = W / H; cam.position.set(0, 2.6, W < H ? 12.5 : 6.5); cam.lookAt(0, 1.02, 0);
      cam.setViewOffset(W, H, W * ox, H * oy, W, H); cam.updateProjectionMatrix();
      renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false);
      renderer.render(scene, cam);
    },
  };
})();

/* ───────── 流程狀態 ───────── */
const app = {screen: 'home', mode: 'solo', routeId: 'rice', pack: 'bike', picks: {1: defaultsFor('bike'), 2: defaultsFor('bike')}, rides: [], racing: false, finishedAt: null, tEnd: 0};
function showScreen(name) {
  app.screen = name;
  for (const id of ['home', 'howPhone', 'routes', 'pick', 'lobby', 'result']) $(id).classList.toggle('on', id === name);
  document.body.classList.toggle('riding', name === 'race');
}
const LEVEL = {1: '新手', 2: '普通', 3: '挑戰', 5: '魔王'};
const medalsOf = id => { try { return JSON.parse(store.get('medals', '{}'))[id] || {}; } catch (e) { return {}; } };
function saveMedals(id, r) { let m = {}; try { m = JSON.parse(store.get('medals', '{}')); } catch (e) {} const o = m[id] || {}; m[id] = {safe: o.safe || r.safe, see: o.see || r.see, time: o.time || r.onTime}; store.set('medals', JSON.stringify(m)); }

/* 路線頁 */
const routeText = id => { const s = routeInfo(id); return `約 ${s.km.toFixed(1)} 公里．${s.bends || s.rounds ? [s.bends ? s.bends + ' 個彎' : '', s.rounds ? s.rounds + ' 座圓環' : ''].filter(Boolean).join('．') : '直路'}`; };
function renderRoutes() {
  let got = 0, all = 0;
  const html = ['bike', 'moto'].map(p => {
    const P = PACKS[p], rs = Object.entries(ROUTES).filter(([, r]) => r.pack === p);
    const cards = rs.map(([id, r]) => {
      const md = medalsOf(id), arr = [['safe', '平安'], ['see', r.kind === 'valley' ? '撿穗' : '預判'], ['time', '準時']];
      arr.forEach(([k]) => { all++; if (md[k]) got++; });
      return `<button class="rc" data-r="${id}"><div class="th"><img src="art/route_${id}.jpg" alt="${r.name}" onerror="this.style.display='none'"><span class="lvl">${LEVEL[r.stars]}<i>${'★'.repeat(r.stars)}</i></span>${r.stars === 1 ? '<span class="startTag" hidden>從這裡開始</span>' : ''}</div><div class="tt"><b>${r.name}</b><span class="rtag">${r.tag}</span><span class="rinfo">${routeText(id)}</span><div class="medals">${arr.map(([k, t]) => `<span class="medal ${md[k] ? 'on' : ''}">${t}</span>`).join('')}</div></div></button>`;
    }).join('');
    const soon = `<p class="soon">之後會加：${SOON[p].map(([n]) => n).join('、')}</p>`;
    return `<div class="pack"><div class="ph"><b>${P.name}</b><span class="pill t">${P.era}</span><span class="pill">${P.ctrl}</span></div><div class="cards">${cards}</div>${soon}</div>`;
  }).join('');
  $('packs').innerHTML = html;
  if (!got) $('packs').querySelectorAll('.startTag').forEach(s => { s.hidden = false; });
  $('medalCount').textContent = `每條路有 3 枚章，已蓋 ${got} / ${all} 枚。`;
  $('modeSolo').classList.toggle('on', app.mode === 'solo'); $('modeDuel').classList.toggle('on', app.mode === 'duel');
  $('packs').querySelectorAll('[data-r]').forEach(b => { b.onclick = () => { Snd.init(); chooseRoute(b.dataset.r); }; });
}
function setRoute(id) {
  app.routeId = id; app.pack = ROUTES[id].pack;
  for (const n of [1, 2]) if (!CHARS[app.pack].some(c => c.id === app.picks[n].char)) app.picks[n] = defaultsFor(app.pack);
}
function chooseRoute(id) {
  setRoute(id);
  if (app.mode === 'solo' && IS_PHONE) { renderPick(); showScreen('pick'); } else enterLobby();
}
/* 選角色 */
function gridHtml(list, prefix, cur) { return list.map(x => `<button class="pc ${x.id === cur ? 'on' : ''}" data-id="${x.id}"><img src="art/${prefix}_${x.id}.jpg" alt="${x.name}"><b>${x.name}</b><small>${x.note}</small></button>`).join(''); }
function renderPick() {
  const p = app.picks[1], pk = app.pack;
  $('pickTitle').textContent = ROUTES[app.routeId].name;
  $('pickHelp').textContent = IS_PHONE ? '' : (pk === 'moto' ? '　鍵盤：← → 或 A、D 轉向，↓、S 或空白鍵煞車。' : '　鍵盤：← → 或 A、D 轉向。');
  $('pickBack').textContent = IS_PHONE ? '← 換路線' : '← 改用手機騎';
  $('charGrid').innerHTML = gridHtml(CHARS[pk], 'char', p.char);
  $('vehGrid').innerHTML = gridHtml(VEHICLES[pk], 'veh', p.veh);
  $('charGrid').querySelectorAll('.pc').forEach(b => { b.onclick = () => { p.char = b.dataset.id; Snd.click(); renderPick(); }; });
  $('vehGrid').querySelectorAll('.pc').forEach(b => { b.onclick = () => { p.veh = b.dataset.id; Snd.click(); renderPick(); }; });
  show.set(pk, p.char, p.veh);
}

/* ───────── 雙人連線 ───────── */
const net = {ws: null, ok: false, idle: false, last: null, room: '', key: '', links: {}, lastN: {1: 0, 2: 0}, players: [{slot: 1}, {slot: 2}], keyboard: {1: false, 2: false}, input: {1: {tilt: 0, brake: false, t: 0}, 2: {tilt: 0, brake: false, t: 0}}};
function pickRoom(fresh) {
  if (!fresh) try { net.room = sessionStorage.getItem('ride_room') || ''; net.key = sessionStorage.getItem('ride_key') || ''; } catch (e) {}
  if (fresh || !net.room || !net.key) {
    const r = crypto.getRandomValues(new Uint32Array(3));
    net.room = String(1000 + r[0] % 9000); net.key = r[1].toString(36) + r[2].toString(36);
    try { sessionStorage.setItem('ride_room', net.room); sessionStorage.setItem('ride_key', net.key); } catch (e) {}
  }
}
function connect() {
  if (net.ws && net.ws.readyState <= 1) return;
  if (!net.room) pickRoom(false);
  try {
    const wsBase = RELAY || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const ws = new WebSocket(`${wsBase}/ws?role=host&room=${net.room}&key=${net.key}`);
    net.ws = ws;
    ws.onopen = () => { ws.opened = true; net.fails = 0; net.ok = true; if (net.last) send(net.last); renderLobby(); };   // 斷線接回時，手機回到原本的階段
    ws.onclose = () => {
      net.ok = false;
      if (!ws.opened && RELAY && LOCAL_CLOUD && (net.fails = (net.fails || 0) + 1) >= 3) { RELAY = ''; app.qr = ''; setupQR(); }   // 沒網路：本機試玩退回同一個 Wi-Fi
      if (net.ws === ws) setTimeout(() => { if (app.screen !== 'home' && !net.idle) connect(); }, 1500); renderLobby(); };
    ws.onerror = () => {};
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'taken') { net.ws = null; ws.close(); pickRoom(true); app.qr = ''; connect(); setupQR(); renderLobby(); return; }   // 房間碼撞號，換一個
      if (m.t === 'idle') { net.idle = true; return; }
      if (m.t === 'in') { net.input[m.slot] = {tilt: m.tilt, brake: m.brake, t: performance.now()}; }
      if (m.t === 'rtc') onRtc(m.slot, m.d);
      if (m.t === 'players') { net.players = m.players; onPlayers(); }
    };
  } catch (e) {}
}
function send(o) { if (net.ws?.readyState === 1) net.ws.send(JSON.stringify(o)); }
/* 手機能直連就不繞雲端：連線資訊經中繼交換，之後傾斜直接傳到電腦 */
function onRtc(slot, d) {
  if ((slot !== 1 && slot !== 2) || !window.createLink) return;
  const link = net.links[slot] ||= window.createLink({
    signal: x => send({t: 'rtc', slot, d: x}),
    onData: x => {
      if (x.p != null) { link.send({q: x.p}); return; }
      if (!(x.n > net.lastN[slot])) return;   // 直連不保證順序，舊資料丟掉
      net.lastN[slot] = x.n;
      net.input[slot] = {tilt: clamp(+x.v || 0, -1, 1), brake: !!x.b, t: performance.now()};
    },
  });
  if (d?.sdp?.type === 'offer') net.lastN[slot] = 0;
  link.onSignal(d);
}
function closeLinks() { for (const n of [1, 2]) { net.links[n]?.close(); delete net.links[n]; } }
function syncRoom(extra = {}) { const o = {t: 'room', route: app.routeId, pack: app.pack, max: app.mode === 'solo' ? 1 : 2, ...extra}; net.last = {...o, reset: false, clear: false}; send(o); }
function wakeNet() { if (net.idle) { net.idle = false; if (app.screen !== 'home') connect(); } }
addEventListener('pointerdown', wakeNet); addEventListener('keydown', wakeNet);
setInterval(() => send({t: 'ping'}), 25000);
function slotInfo(n) {
  if (net.keyboard[n]) return {src: 'kb', ready: true, char: app.picks[n].char, veh: app.picks[n].veh};
  const p = net.players.find(x => x.slot === n) || {};
  return {src: p.online ? 'phone' : null, ready: !!p.ready, char: p.char || null, veh: p.veh || null, online: p.online};
}
const seats = () => app.mode === 'solo' ? [1] : [1, 2];
function onPlayers() {
  for (const n of [1, 2]) if (net.links[n] && !net.players.find(x => x.slot === n)?.online) { net.links[n].close(); delete net.links[n]; }
  if (app.screen === 'lobby') { renderLobby(); maybeStart(); }
  else if (app.screen === 'result') maybeStart();   // 手機按「再騎一次」
}
function maybeStart() {
  if (app.starting || (app.screen !== 'lobby' && app.screen !== 'result')) return;
  const ss = seats().map(slotInfo);
  if (ss.every(s => s.ready) && (app.screen === 'lobby' ? ss.some(s => s.src) : ss.some(s => s.src === 'phone'))) {
    app.starting = true;
    seats().forEach((n, i) => { if (ss[i].char && CHARS[app.pack].some(c => c.id === ss[i].char)) app.picks[n] = {char: ss[i].char, veh: ss[i].veh}; });
    setTimeout(() => { clearRace(); startRace(); }, 900);
  }
}
async function baseUrl() {
  if (RELAY && LOCAL_CLOUD) return CLOUD.site;
  if (RELAY) return new URL('.', location.href).href.replace(/\/$/, '');
  let base = location.origin;
  try {
    const c = await (await fetch('/config')).json(); app.cfg = c;
    if (c.publicUrl) base = c.publicUrl; else if (LOCALHOST && c.lanUrl) base = c.lanUrl;
  } catch (e) {}
  return base;
}
function drawQR(el, text) {
  el.innerHTML = '';
  if (window.QRCode) new window.QRCode(el, {text, width: 300, height: 300, correctLevel: window.QRCode.CorrectLevel.M});
  else el.textContent = text;
}
async function setupQR() {
  if (!net.room) pickRoom(false);
  const base = await baseUrl(), url = `${base}/phone.html?room=${net.room}`;
  if (url !== app.qr) { app.qr = url; drawQR($('qr'), url); }
  $('roomCode').textContent = net.room;
  $('qrUrl').textContent = `掃不了？手機打開 ${base.replace(/^https?:\/\//, '')}/phone.html，輸入房間碼`;
  $('qrHelp').innerHTML = base.startsWith('https://') ? '手機用 Wi-Fi 或行動網路都可以，不用跟電腦連同一個，也不用裝 App。' : '連不上雲端，先走同一個 Wi-Fi：手機只能用<b>左右按鈕</b>，沒辦法傾斜。';
}
/* 玩法二的引導：電腦畫面給一個 QR，手機打開就直接在手機上玩 */
async function showHowPhone() {
  showScreen('howPhone');
  const base = await baseUrl();
  drawQR($('qrOwn'), base + '/');
  $('qrOwnHelp').innerHTML = base.startsWith('https://') ? '手機用 Wi-Fi 或行動網路都可以，第一次會問能不能讀取動作，請按「允許」。' : '連不上雲端，先走同一個 Wi-Fi：手機只能用<b>左右按鈕</b>，沒辦法傾斜。';
}
function renderLobby() {
  const isSolo = app.mode === 'solo', Rt = ROUTES[app.routeId];
  $('lobbyTitle').textContent = `${isSolo ? '一個人騎' : '兩個人比'}：${Rt.name}`;
  $('lobbyStep1').textContent = isSolo ? '① 手機掃這裡，手機就是方向盤' : '① 兩個人各用手機掃這裡';
  $('lobbyTip').innerHTML = `<b>這條路：</b>${Rt.tip}`;
  $('lobbyNote').textContent = isSolo ? `血條滿分 ${HP.start}，摔車扣 ${HP.crash}；血條歸零就回起點重騎。` : `同一條路，分數高的贏，先到再加 150 分。血條歸零的人要回起點重騎。`;
  $('kbGo').style.display = isSolo ? '' : 'none'; $('kbGo').textContent = TOUCH ? '不用手機，直接在這台玩 →' : '不用手機，直接用鍵盤騎 →';
  $('slot2').style.display = isSolo ? 'none' : '';
  for (const n of seats()) {
    const s = slotInfo(n), el = $('slot' + n), pk = app.pack;
    const c = CHARS[pk].find(x => x.id === s.char), v = VEHICLES[pk].find(x => x.id === s.veh);
    const st = s.src === 'kb' ? `鍵盤（${n === 1 ? 'A / D 轉向、S 煞車' : '← / → 轉向、↓ 煞車'}）` : !net.ok ? '正在連線，請稍等…' : !s.src ? '等手機掃碼…' : s.ready ? '準備好了！' : c ? '選好了，等按準備' : '手機連上了，正在選角色…';
    el.className = `slot p${n} ${s.ready ? 'ready' : ''}`;
    el.innerHTML = `<img src="${c ? `art/char_${c.id}.jpg` : 'art/char_' + CHARS[pk][n - 1].id + '.jpg'}" alt="" style="${c ? '' : 'opacity:.3'}"><div><div class="num">${isSolo ? '' : n + 'P '}<span style="font-size:19px;color:var(--ink)">${c ? `${c.name}${v ? '＋' + v.name : ''}` : isSolo ? '等你上車' : ''}</span></div><div class="st">${s.ready ? '✔ ' : ''}${st}</div>${isSolo ? '' : `<div class="kb"><button class="btn ghost" data-kb="${n}">${net.keyboard[n] ? '取消鍵盤' : '改用鍵盤'}</button>${net.keyboard[n] ? `<button class="btn ghost" data-cc="${n}">換角色</button><button class="btn ghost" data-vv="${n}">換車</button>` : ''}</div>`}</div>`;
    el.querySelector('[data-kb]')?.addEventListener('click', () => { net.keyboard[n] = !net.keyboard[n]; Snd.init(); renderLobby(); maybeStart(); });
    el.querySelector('[data-cc]')?.addEventListener('click', () => { const L = CHARS[pk], i = L.findIndex(x => x.id === app.picks[n].char); app.picks[n].char = L[(i + 1) % L.length].id; renderLobby(); });
    el.querySelector('[data-vv]')?.addEventListener('click', () => { const L = VEHICLES[pk], i = L.findIndex(x => x.id === app.picks[n].veh); app.picks[n].veh = L[(i + 1) % L.length].id; renderLobby(); });
  }
}
function enterLobby() {
  app.starting = false; net.keyboard = {1: false, 2: false};
  showScreen('lobby'); connect(); setupQR(); renderLobby();
  syncRoom({phase: 'lobby', reset: true});
  clearInterval(app.qrT); app.qrT = setInterval(() => { if (app.screen === 'lobby') setupQR(); }, 5000);
}

/* ───────── 操作 ───────── */
const keys = {};
const KEY = {KeyA: 'a', KeyD: 'd', KeyS: 's', ArrowLeft: 'l', ArrowRight: 'r', ArrowDown: 'b', Space: 'b'};
addEventListener('keydown', e => { const k = KEY[e.code]; if (k) { keys[k] = true; if (app.screen === 'race') e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEY[e.code]; if (k) keys[k] = false; });
const solo = {l: false, r: false, brake: false};
function bindHold(el, key) {
  const on = e => { e.preventDefault(); solo[key] = true; el.classList.add('down'); };
  const off = e => { e.preventDefault(); solo[key] = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
}
bindHold($('brake'), 'brake'); bindHold($('lBtn'), 'l'); bindHold($('rBtn'), 'r');
/* 玩法二：這台裝置自己就是螢幕和方向盤。讀不到傾斜就顯示左右按鈕 */
const ownDevice = () => app.mode === 'solo' && TOUCH && !app.usesPhone?.[1];
function syncPads() {
  const riding = app.screen === 'race' && ownDevice(), noTilt = !tilt.live;
  $('tiltBtn').style.display = riding && noTilt && tilt.state !== 'insecure' && tilt.state !== 'unsupported' ? '' : 'none';
  $('lBtn').classList.toggle('show', riding && noTilt); $('rBtn').classList.toggle('show', riding && noTilt);
  $('zeroBtn').style.display = riding && !noTilt ? '' : 'none';
}
function askTilt() { const p = tilt.ask(); clearTimeout(app.padT); app.padT = setTimeout(syncPads, 1200); return p; }
if (TOUCH) tilt.listen();   // 不用等點擊，Android 這樣就讀得到；iPhone 要按了才有
const wake = {lock: null,
  async on() { try { if (!this.lock && navigator.wakeLock) { const l = await navigator.wakeLock.request('screen'); this.lock = l; l.addEventListener('release', () => { if (this.lock === l) this.lock = null; }); } } catch (e) {} },
  off() { try { this.lock?.release(); } catch (e) {} this.lock = null; }};
const phoneFresh = n => performance.now() - net.input[n].t < 1500;
const soloInput = () => {
  let k = ((keys.r || solo.r) ? 1 : 0) - ((keys.l || solo.l) ? 1 : 0);
  k += (keys.d ? 1 : 0) - (keys.a ? 1 : 0); k = clamp(k, -1, 1);
  const ph = phoneFresh(1) ? net.input[1] : null;
  if (k === 0) { if (ph) k = ph.tilt; else if (tilt.live) k = tilt.value; }
  return {steer: k, brake: !!(keys.b || keys.s || solo.brake || ph?.brake)};
};
const duelInput = n => () => {
  if (net.keyboard[n]) return n === 1 ? {steer: (keys.d ? 1 : 0) - (keys.a ? 1 : 0), brake: !!keys.s} : {steer: (keys.r ? 1 : 0) - (keys.l ? 1 : 0), brake: !!keys.b};
  const i = net.input[n];
  return performance.now() - i.t > 1500 ? {steer: 0, brake: false} : {steer: i.tilt, brake: i.brake};
};

/* ───────── 比賽 ───────── */
const PCOL = {1: '#e8622c', 2: '#2c6fb3'};
function clearRace() { app.rides.forEach(r => r.dispose()); app.rides = []; $('hudLayer').innerHTML = ''; app.racing = false; app.paused = false; $('pauseBox').classList.remove('on'); $('brief').classList.remove('on'); wake.off(); }
function helpFor(n, duel) {
  if (slotInfo(n).src === 'phone') return {steer: '傾斜手機轉向，眼睛看電腦螢幕', brake: '按住手機上的「煞車」'};
  if (TOUCH && !duel) return {steer: tilt.live ? '左右傾斜手機轉向' : '按畫面左下的 ◀ ▶ 轉向', brake: '按住右下角「煞車」'};
  if (duel) return n === 1 ? {steer: 'A、D 轉向', brake: '按住 S 煞車'} : {steer: '←、→ 轉向', brake: '按住 ↓ 煞車'};
  return {steer: '← → 或 A、D 轉向', brake: '按住 ↓、S 或空白鍵煞車'};
}
function setPause(v) {
  if (!app.racing || app.counting) return;
  app.paused = v; $('pauseBox').classList.toggle('on', v);
  try { if (v) Snd.ctx?.suspend(); else Snd.ctx?.resume(); } catch (e) {}
}
function makeHud(cls) { const n = $('hudT').content.firstElementChild.cloneNode(true); n.classList.add(cls); $('hudLayer').append(n); return n; }
async function startRace() {
  $('load').classList.add('on');
  await new Promise(r => setTimeout(r, 40));
  clearRace();
  app.starting = false;
  const duel = app.mode === 'duel', seed = Math.random() * 1e9 | 0, demoN = DEMO_N;
  app.usesPhone = {1: slotInfo(1).src === 'phone', 2: duel && slotInfo(2).src === 'phone'};
  document.body.classList.toggle('duelOn', duel);
  $('divider').style.display = duel ? 'block' : 'none';
  const mk = (n, rival) => {
    const hud = makeHud(duel ? (n === 1 ? 'left' : 'right') : 'solo'); if (duel) hud.classList.add('duel');
    const c = CHARS[app.pack].find(x => x.id === app.picks[n].char);
    return createRide({kit, routeId: app.routeId, seed, hud, snd: Snd, demo: demoN, player: app.picks[n], label: `${n}P ${c?.name || ''}`, laneOffset: duel ? (n === 1 ? -.55 : .55) : 0,
      rival: rival ? {...app.picks[rival], tag: rival + 'P', color: PCOL[rival]} : null, shadow: duel ? 1024 : TOUCH ? 1024 : 2048, low: perf.lvl >= 2, fineScale: IS_PHONE ? .7 : 1,
      help: helpFor(n, duel), input: duel ? duelInput(n) : soloInput, onFinish: r => onRideFinish(n, r),
      onHit: (k = .6) => { const ms = k >= 1 ? 600 : k < .5 ? 90 : 220; if (!net.links[n]?.send({buzz: ms})) send({t: 'buzz', slot: n, ms}); if (ownDevice()) navigator.vibrate?.(ms); }});
  };
  app.rides = duel ? [mk(1, 2), mk(2, 1)] : [mk(1, null)];
  app.racing = true; app.finishedAt = null; app.results = {};
  showScreen('race');
  syncRoom({phase: 'race'});
  const P = ROUTES[app.routeId].pack;
  $('brake').classList.toggle('show', P === 'moto' && ownDevice());
  syncPads();
  if (TOUCH) wake.on();
  tilt.setFollow(true);   // 倒數時手機怎麼拿都算正中間，出發才定下來
  $('load').classList.remove('on');
  // 出發前先講這條路要注意什麼，再倒數
  const Rt = ROUTES[app.routeId], hp = helpFor(1, duel);
  app.counting = true;
  $('brief').innerHTML = `<b>${Rt.name}</b><span>${Rt.tip}</span><em>${duel ? '手機或鍵盤轉向' + (P === 'moto' ? '＋煞車' : '') : hp.steer + (P === 'moto' ? '；' + hp.brake : '')}</em>`;
  $('brief').classList.add('on');
  const cd = $('count'); cd.textContent = ''; cd.classList.add('on');
  await new Promise(r => setTimeout(r, 1500)); if (!app.racing) { cd.classList.remove('on'); $('brief').classList.remove('on'); return; }
  for (const t of ['3', '2', '1']) { cd.textContent = t; Snd.beep(660, .13, 'triangle', .08); await new Promise(r => setTimeout(r, 800)); if (!app.racing) { cd.classList.remove('on'); return; } }
  $('brief').classList.remove('on');
  cd.textContent = '出發！'; Snd.beep(990, .3, 'triangle', .1); Snd.song(app.routeId);
  tilt.setFollow(false); syncRoom({phase: 'race', go: true}); syncPads();
  app.rides.forEach(r => r.begin()); app.counting = false;
  app.cdHideAt = performance.now() + 650; setTimeout(() => cd.classList.remove('on'), 650);
}
function onRideFinish(n, r) {
  app.results[n] = r;
  if (app.mode === 'duel') {
    if (app.finishedAt == null) {
      app.finishedAt = performance.now();
      if (r.arrived) { r.score += 150; r.first = true; }   // 先到厝／先打卡加分
    }
    if (Object.keys(app.results).length === 2) endRace();
  } else endRace();
}
function endRace() {
  if (!app.racing) return; app.racing = false; Snd.stopSong(); Snd.engine(0, true); wake.off();
  showResult();
  $('divider').style.display = 'none'; document.body.classList.remove('duelOn');
}
function cardFor(n, r, win) {
  const c = CHARS[app.pack].find(x => x.id === app.picks[n].char), v = VEHICLES[app.pack].find(x => x.id === app.picks[n].veh), vl = r.valley;
  const stat = (vl ? `稻穗 ${r.rice}／${r.riceAll}．撞到 ${r.bumps} 次` : `提早反應 ${r.early}．摔車 ${r.crashes}．紅單 ${r.tickets}`) + (r.restarts ? `．血條歸零 ${r.restarts} 次` : '');
  const bonus = [r.bonusSafe ? `平安 +${r.bonusSafe}` : '', r.bonusTime ? `準時 +${r.bonusTime}` : '', r.first ? '先到 +150' : ''].filter(Boolean).join('．');
  const stamp = (got, name, how) => `<div class="sc"><div class="stamp ${got ? 'got' : ''}">${name}</div><small>${how}</small></div>`;
  return `<div class="rCol ${win ? 'win' : ''}"><img src="art/char_${c?.id}.jpg" alt=""><div style="font-weight:900;font-size:18px;margin-top:4px">${app.mode === 'duel' ? n + 'P ' : ''}${c?.name}＋${v?.name}${win ? ' 👑' : ''}</div><div class="rScore">${r.score} 分</div><div class="rTitle">${r.title}</div><div class="rDesc">${r.desc}</div>
    <div class="stamps">${stamp(r.safe, '平安', vl ? '一路沒撞到' : '沒摔車沒紅單')}${stamp(r.see, vl ? '撿穗' : '預判', vl ? '撿到七成' : '七成提早反應')}${stamp(r.onTime, '準時', vl ? '天黑前到厝' : '8:30 前打卡')}</div><div class="stats">${stat}</div>${bonus ? `<div class="stats">${bonus}</div>` : ''}</div>`;
}
function showResult() {
  const duel = app.mode === 'duel', R = app.results, id = app.routeId, ids = Object.keys(ROUTES), nextId = ids[ids.indexOf(id) + 1];
  let head = '', winner = 0;
  if (duel) {
    const a = R[1], b = R[2];
    winner = a.score === b.score ? (a.finishT <= b.finishT ? 1 : 2) : (a.score > b.score ? 1 : 2);
    head = `<div class="rHead"><div class="rWin" style="color:${PCOL[winner]}">${winner}P 贏了！</div><div class="stats">${ROUTES[id].name}</div></div><div class="duelCols">${cardFor(1, a, winner === 1)}${cardFor(2, b, winner === 2)}</div>`;
    syncRoom({phase: 'result', result: {winner, s1: a.score, s2: b.score}, reset: true});
  } else {
    if (!DEMO_N) saveMedals(id, R[1]);
    syncRoom({phase: 'result', result: {solo: true, score: R[1].score, title: R[1].title, arrived: R[1].arrived}, reset: true});
    const tips = R[1].valley ? '' : (R[1].seen || []).slice(0, 2).map(t => `<div><b>${LABEL[t]}：</b>${TIPS[t]}</div>`).join('');
    head = `<div class="rHead"><div class="rWin">${R[1].arrived ? (R[1].valley ? '到厝了！' : '打卡成功！') : (R[1].valley ? '天黑了…' : '這趟結束了')}</div><div class="stats">${ROUTES[id].name}</div></div><div class="soloGrid"><div>${cardFor(1, R[1], false)}</div><div class="soloSide">@@BTNS@@${tips ? `<div class="tips">${tips}</div>` : ''}</div></div>`;
  }
  const btns = `<div class="rBtns"><button class="btn pri" id="again">再騎一次</button>${nextId ? `<button class="btn" id="toNext">下一條：${ROUTES[nextId].name} ▶</button>` : ''}<button class="btn" id="toRoutes">選路線</button><button class="btn ghost" id="toHome">回首頁</button></div>${app.usesPhone?.[1] || app.usesPhone?.[2] ? '<div class="fb" style="color:var(--mut)">也可以直接在手機按「再騎一次」。</div>' : ''}`;
  const fb = `<div class="fb">歡迎給我回饋與建議：<a href="https://www.facebook.com/shihyuting.OT" target="_blank" rel="noopener">職能治療師施昱廷粉專</a></div>`;
  $('resultBox').innerHTML = duel ? `${head}${btns}${fb}` : head.replace('@@BTNS@@', btns + fb);
  window.__lastResult = {results: R, winner};
  showScreen('result');
  $('again').onclick = () => { clearRace(); if (duel) enterLobby(); else startRace(); };
  if (nextId) $('toNext').onclick = () => { clearRace(); chooseRoute(nextId); };
  $('toRoutes').onclick = () => { clearRace(); renderRoutes(); showScreen('routes'); };
  $('toHome').onclick = () => { clearRace(); goHome(); };
}
function goHome() { syncRoom({phase: 'idle', clear: true}); closeLinks(); net.last = null; showScreen('home'); const ws = net.ws; net.ws = null; try { ws?.close(); } catch (e) {} }

/* ───────── 按鈕 ───────── */
$('goSolo').onclick = () => {
  Snd.init();
  if (IS_PHONE) { askTilt(); try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) {} }
  app.mode = 'solo'; renderRoutes(); showScreen('routes');
};
$('goHowPhone').onclick = () => { Snd.init(); showHowPhone(); };
$('howBack').onclick = () => showScreen('home');
$('goJoin').onclick = () => { location.href = 'phone.html'; };
$('zeroBtn').onclick = () => tilt.rezero();
$('tiltBtn').onclick = () => askTilt();
$('modeSolo').onclick = () => { app.mode = 'solo'; renderRoutes(); };
$('modeDuel').onclick = () => { app.mode = 'duel'; renderRoutes(); };
$('kbGo').onclick = () => { Snd.init(); if (TOUCH) askTilt(); renderPick(); showScreen('pick'); };
$('goDuel').onclick = () => { Snd.init(); app.mode = 'duel'; renderRoutes(); showScreen('routes'); };
$('routesBack').onclick = () => goHome();
$('pickBack').onclick = () => { if (IS_PHONE) { renderRoutes(); showScreen('routes'); } else enterLobby(); };
$('lobbyBack').onclick = () => { renderRoutes(); showScreen('routes'); };
$('pickGo').onclick = () => { Snd.init(); if (TOUCH && !tilt.live) askTilt(); startRace(); };
$('pauseBtn').onclick = () => setPause(true);
$('resume').onclick = () => setPause(false);
$('restartBtn').onclick = () => { try { Snd.ctx?.resume(); } catch (e) {} Snd.stopSong(); Snd.engine(0, true); clearRace(); startRace(); };
addEventListener('keydown', e => {
  if (e.code === 'Escape' && app.screen === 'race') setPause(!app.paused);
  if (e.code === 'Enter' && app.screen === 'pick' && document.activeElement?.tagName !== 'BUTTON') { Snd.init(); startRace(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && app.screen === 'race' && !NOPAUSE && !app.paused) setPause(true); if (!document.hidden && app.screen === 'race' && TOUCH) wake.on(); });
$('quit').onclick = () => { try { Snd.ctx?.resume(); } catch (e) {} clearRace(); Snd.stopSong(); Snd.engine(0, true); $('count').classList.remove('on'); $('divider').style.display = 'none'; document.body.classList.remove('duelOn'); syncRoom({phase: 'lobby', reset: true}); renderRoutes(); showScreen('routes'); };
if (IS_PHONE) {   // 手機首頁：直接在手機玩，或接到電腦螢幕當方向盤
  $('goSolo').innerHTML = '用這支手機玩<small>看手機螢幕，傾斜手機轉向</small>';
  $('goJoin').style.display = ''; $('goDuel').style.display = 'none'; $('goHowPhone').style.display = 'none'; $('modeSeg').style.display = 'none';
  if (window.isSecureContext === false && CLOUD.site) { const a = $('httpNote'); a.href = CLOUD.site + '/'; a.style.display = ''; }   // http 網址手機不給傾斜，指路到正式網址
}
$('sndBtn').textContent = Snd.on ? '🔊' : '🔇';
$('sndBtn').onclick = () => { Snd.setOn(!Snd.on); $('sndBtn').textContent = Snd.on ? '🔊' : '🔇'; };

/* ───────── 主迴圈 ───────── */
/* 騎車時每 2 秒看一次流暢度，太慢就降一級：先降解析度，再關影子與近景小物件，最後再降解析度 */
const perf = {t: 0, n: 0, lvl: 0, fps: 0, slow: 0, minPr: TOUCH ? .75 : 1};
function watchFps(sec) {
  if (sec <= 0 || sec > .5) return;
  perf.t += sec; perf.n++;
  if (perf.t < 2) return;
  perf.fps = perf.n / perf.t; perf.t = 0; perf.n = 0;
  perf.slow = perf.fps < 26 ? perf.slow + 1 : 0;
  if (perf.slow < 2 || perf.lvl >= 3 || window.__freeze) return;
  perf.slow = 0; perf.lvl++;
  if (perf.lvl === 2) app.rides.forEach(r => r.setLow(true));
  else renderer.setPixelRatio(Math.max(perf.minPr, renderer.getPixelRatio() * .75));
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (app.screen === 'race' && !app.paused && !document.hidden) watchFps((now - last) / 1000);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (window.__freeze) return;
  const W = $('stage').clientWidth, H = $('stage').clientHeight;
  renderer.setScissorTest(false); renderer.clear();
  if (app.screen === 'race' && app.rides.length) {
    step(dt);
    const duel = app.rides.length === 2;
    app.rides.forEach((r, i) => r.draw(renderer, duel ? {x: i * W / 2, y: 0, w: W / 2, h: H} : {x: 0, y: 0, w: W, h: H}, dt));
    Snd.engine(app.rides[0].S.v, app.pack === 'bike' || app.paused);   // 鐵馬沒有引擎聲
  } else if (app.screen === 'pick') {
    if (W >= 900) show.draw(W, H, dt, .27, 0); else if (W > H) show.draw(W, H, dt, .26, 0); else show.draw(W, H, dt, 0, .3);
  } else if (app.screen === 'home') {
    if (W >= 760) show.draw(W, H, dt, -.2, 0); else show.draw(W, H, dt, 0, -.22);
  } else show.draw(W, H, dt);
}
function step(dt) {
  if (tilt.live !== app.tiltLive) { app.tiltLive = tilt.live; syncPads(); }
  if (app.paused || (!app.racing && !app.rides.every(r => r.S.finished))) return;
  if (app.cdHideAt && performance.now() > app.cdHideAt) { app.cdHideAt = 0; $('count').classList.remove('on'); }
  const n = Math.max(1, Math.ceil(dt / .017));
  for (let i = 0; i < n; i++) app.rides.forEach(r => r.sim(dt / n));
  if (app.rides.length === 2) syncRivals();
  // 雙人：第一位到了之後，另一位還有 20 秒
  if (app.finishedAt != null && performance.now() - app.finishedAt > 20000) app.rides.forEach(r => r.finish());
  else if (app.finishedAt != null && app.rides.length === 2) { const left = Math.max(1, Math.ceil(20 - (performance.now() - app.finishedAt) / 1000)); app.rides.forEach(r => r.banner(r.S.finished ? `到了！等對手，還有 ${left} 秒` : `對手到了！還有 ${left} 秒`)); }
  if (app.racing) app.rides.forEach((r, i) => { const n = i + 1; if (app.usesPhone?.[n]) r.notice(performance.now() - net.input[n].t > 2500 ? '手機連線中斷了，請檢查手機網路或重新掃碼' : ''); });
}
function syncRivals() {
  const [a, b] = app.rides, f = a.FINISH_A;
  a.setRival(b.S.x, b.S.s, b.S.lean, !b.S.finished || true); b.setRival(a.S.x, a.S.s, a.S.lean, true);
  const pa = clamp(a.S.s / f * 100, 0, 100), pb = clamp(b.S.s / f * 100, 0, 100), d = Math.round(a.S.s - b.S.s);
  a.setRivalDot(pb, d > 2 ? `領先 ${d} 公尺` : d < -2 ? `落後 ${-d} 公尺` : '並排！');
  b.setRivalDot(pa, d < -2 ? `領先 ${-d} 公尺` : d > 2 ? `落後 ${d} 公尺` : '並排！');
}

show.set('bike', 'agong', 'iron');
showScreen('home');
requestAnimationFrame(frame);
setTimeout(() => { const pre = ['moto', 'office', 's125']; show.set(...pre); }, 3500);
setInterval(() => { if (app.screen === 'home') { const p = Math.random() < .5 ? 'bike' : 'moto', c = CHARS[p][Math.random() * 4 | 0], v = VEHICLES[p][Math.random() * 4 | 0]; show.set(p, c.id, v.id); } }, 3500);

/* 驗證用介面 */
window.__app = {kit, app, net, tilt, perf, Snd, startRace, enterLobby, chooseRoute, setRoute, setPause, slotInfo, IS_PHONE, get rides() { return app.rides; }, keys, step, showScreen, renderRoutes, renderer,
  drawNow(dt = .016) { const W = $('stage').clientWidth, H = $('stage').clientHeight, duel = app.rides.length === 2; renderer.setScissorTest(false); renderer.clear(); app.rides.forEach((r, i) => r.draw(renderer, duel ? {x: i * W / 2, y: 0, w: W / 2, h: H} : {x: 0, y: 0, w: W, h: H}, dt)); }};
const auto = qs.get('auto');
if (auto) { app.mode = qs.get('duel') ? 'duel' : 'solo'; if (app.mode === 'duel') chooseRoute(auto); else { setRoute(auto); startRace(); } }
