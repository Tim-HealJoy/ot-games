// 騎遍台灣：街景、車輛、人物（全部用程式繪製，沒有外部美術素材）
// 2026-11-05 由 prototype 升級：車牌、機車零件、台灣街景小物
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion, Eu = THREE.Euler;
export const CHUNK = 40, ROAD = 7, WALK = 10;
export const T = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) =>
  new M4().compose(new V3(x, y, z), new Q().setFromEuler(new Eu(rx, ry, rz)), new V3(s, s, s));

export function mulberry(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const FONT = '"PingFang TC","Noto Sans TC","Heiti TC","Microsoft JhengHei",sans-serif';

/* ───────── 貼圖（各畫風共用） ───────── */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rect = (cx, cy, cw, ch, W, H) => ({u0: cx / W, u1: (cx + cw) / W, v0: 1 - (cy + ch) / H, v1: 1 - cy / H});

const SCHEMES = [
  ['#ece3d0', '#d8cdb6'], ['#e8c8bb', '#d6b1a2'], ['#bdccba', '#a6b8a4'], ['#bd6a52', '#a65843'],
  ['#edd89c', '#d9c382'], ['#b9c8d6', '#a3b4c4'], ['#bab5aa', '#a49f94'], ['#a3846a', '#8d7058'],
];
const FCELL = {w: 160, h: 124};
function makeFacadeAtlas() {
  const W = FCELL.w * 8, H = FCELL.h * 5, [c, g] = cv(W, H);
  const glass = ['#3f7686', '#55909b', '#2f6372', '#4a8390'];
  const awning = ['#2b9a93', '#e0702c', '#c8343a', '#3a6fb0'];
  for (let s = 0; s < 8; s++) for (let v = 0; v < 5; v++) {
    const x = s * FCELL.w, y = v * FCELL.h, w = FCELL.w, h = FCELL.h;
    g.fillStyle = SCHEMES[s][0]; g.fillRect(x, y, w, h);
    g.strokeStyle = SCHEMES[s][1]; g.lineWidth = 1; g.beginPath();
    for (let i = 8; i < h; i += 8) { g.moveTo(x, y + i); g.lineTo(x + w, y + i); }
    for (let i = 12; i < w; i += 12) { g.moveTo(x + i, y); g.lineTo(x + i, y + h); }
    g.stroke();
    g.fillStyle = 'rgba(40,30,20,.28)'; g.fillRect(x, y + h - 5, w, 5);
    const ww = w * .66, wh = h * .55, wx = x + (w - ww) / 2, wy = y + h * .16;
    g.fillStyle = '#e8e8e2'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    g.fillStyle = glass[(s + v) % 4]; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.beginPath(); g.moveTo(wx + 8, wy + wh); g.lineTo(wx + ww * .42, wy); g.lineTo(wx + ww * .62, wy); g.lineTo(wx + 26, wy + wh); g.fill();
    g.fillStyle = '#d6d7d0'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
    if (v <= 1 || v === 3) { // 鐵窗
      g.strokeStyle = v === 3 ? '#42564e' : '#f5f4ee'; g.lineWidth = 2.4; g.beginPath();
      for (let i = 0; i <= 6; i++) { const bx = wx - 2 + (ww + 4) * i / 6; g.moveTo(bx, wy - 3); g.lineTo(bx, wy + wh + 3); }
      for (const f of [0, .5, 1]) { g.moveTo(wx - 3, wy + wh * f); g.lineTo(wx + ww + 3, wy + wh * f); }
      g.stroke();
    }
    if (v === 1) { // 冷氣室外機
      g.fillStyle = 'rgba(30,25,20,.3)'; g.fillRect(wx + ww * .56, wy + wh + 2, 46, 28);
      g.fillStyle = '#ecebe4'; g.fillRect(wx + ww * .54, wy + wh, 46, 26);
      g.strokeStyle = '#a9a89f'; g.lineWidth = 1.4; g.beginPath(); g.arc(wx + ww * .54 + 16, wy + wh + 13, 9, 0, 7); g.stroke();
    }
    if (v === 2) { // 雨遮
      g.fillStyle = awning[s % 4]; g.fillRect(wx - 12, wy - 16, ww + 24, 15);
      g.fillStyle = 'rgba(255,255,255,.24)'; for (let i = 0; i < ww + 24; i += 12) g.fillRect(wx - 12 + i, wy - 16, 5, 15);
      g.fillStyle = 'rgba(30,25,20,.28)'; g.fillRect(wx - 8, wy - 1, ww + 16, 5);
    }
    if (v === 3) { // 曬衣
      const cl = ['#d94f4f', '#f0f0ea', '#4f86c6', '#f1c04a', '#6aa86a'];
      g.fillStyle = '#555'; g.fillRect(wx - 3, wy + 10, ww + 6, 2);
      for (let i = 0; i < 4; i++) { g.fillStyle = cl[(i + s) % 5]; g.fillRect(wx + 6 + i * (ww / 4), wy + 12, ww / 5, 24 + (i % 2) * 8); }
    }
    if (v === 4) { // 陽台盆栽
      g.fillStyle = 'rgba(80,80,80,.5)'; g.fillRect(wx - 5, wy + wh * .7, ww + 10, 3);
      g.strokeStyle = '#6a6d68'; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i <= 10; i++) { const bx = wx - 5 + (ww + 10) * i / 10; g.moveTo(bx, wy + wh * .7); g.lineTo(bx, wy + wh + 5); }
      g.stroke();
      g.fillStyle = '#4d9a4a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(wx + 14 + i * ww / 4, wy + wh * .66, 10, 0, 7); g.fill(); }
    }
  }
  return {t: tex(c), uv: (s, v) => rect(s * FCELL.w + 1, v * FCELL.h + 1, FCELL.w - 2, FCELL.h - 2, W, H)};
}

function makeShopAtlas() {
  const cw = 256, ch = 128, W = cw * 4, H = ch * 2, [c, g] = cv(W, H);
  const cell = (i, fn) => { const x = (i % 4) * cw, y = (i >> 2) * ch; g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip(); g.translate(x, y); fn(); g.restore(); };
  const warm = () => { g.fillStyle = '#ffdf9e'; g.fillRect(0, 0, cw, ch); g.fillStyle = 'rgba(120,70,30,.14)'; for (let i = 0; i < cw; i += 32) g.fillRect(i, 0, 2, ch); };
  const shelves = (cols) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 18; i++) { g.fillStyle = cols[(i * 3 + r) % cols.length]; g.fillRect(10 + i * 13, 22 + r * 28, 11, 20); } g.fillStyle = '#8d7a60'; for (let r = 0; r < 3; r++) g.fillRect(6, 42 + r * 28, cw - 12, 3); };
  cell(0, () => { warm(); g.fillStyle = '#3a3a3d'; g.fillRect(0, 56, cw, ch); g.fillStyle = '#a8aaad'; g.fillRect(0, 0, cw, 60); g.fillStyle = '#8c8e91'; for (let i = 0; i < 60; i += 8) g.fillRect(0, i, cw, 3); g.fillStyle = '#6a2f22'; g.fillRect(36, 70, 60, 58); g.fillStyle = '#b8b0a0'; g.fillRect(130, 80, 90, 48); });
  cell(1, () => { warm(); g.fillStyle = '#c23a2a'; g.fillRect(14, 12, 228, 18); g.fillStyle = '#fff'; g.font = `800 13px ${FONT}`; g.textAlign = 'center'; g.fillText('蛋餅 飯糰 豆漿 蘿蔔糕', 128, 26); g.fillStyle = '#e8dcc4'; g.fillRect(8, 74, 240, 54); g.fillStyle = '#b8a888'; g.fillRect(8, 74, 240, 6); g.fillStyle = '#d9d9d2'; g.fillRect(28, 50, 70, 26); g.fillStyle = '#f3c64d'; g.fillRect(120, 54, 50, 20); g.fillStyle = '#8b5a2b'; g.fillRect(180, 40, 44, 34); });
  cell(2, () => { g.fillStyle = '#39363a'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#ffd98a'; g.fillRect(16, 6, 224, 6); g.fillStyle = '#1a1a1c'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(34 + i * 34, 96, 25, 0, 7); g.fill(); } g.fillStyle = '#6b6b70'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(34 + i * 34, 96, 10, 0, 7); g.fill(); } g.fillStyle = '#c8452e'; g.fillRect(176, 62, 60, 40); g.fillStyle = '#1a1a1c'; g.beginPath(); g.arc(186, 108, 12, 0, 7); g.arc(226, 108, 12, 0, 7); g.fill(); });
  cell(3, () => { g.fillStyle = '#f7f8f4'; g.fillRect(0, 0, cw, ch); shelves(['#3f9e62', '#e8843a', '#4a84c4', '#d7504d', '#f1c34c', '#7a5cb0']); g.fillStyle = '#d9e8df'; g.fillRect(0, 108, cw, 20); });
  cell(4, () => { warm(); g.fillStyle = '#5c4a38'; g.fillRect(0, 0, cw, 12); shelves(['#7d7f83', '#b7803f', '#3f6f9e', '#c8a53a', '#8d4d38']); g.fillStyle = '#4c4a48'; g.fillRect(0, 100, cw, 28); for (let i = 0; i < 9; i++) { g.fillStyle = ['#d2533f', '#3f7fa8', '#e3b23d'][i % 3]; g.fillRect(10 + i * 27, 102, 22, 24); } });
  cell(5, () => { g.fillStyle = '#f2ece2'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#7a7a7a'; g.fillRect(14, 22, 228, 3); const cl = ['#d85a6a', '#5a8fd8', '#eab84a', '#6ab07a', '#9a6ac0']; for (let i = 0; i < 12; i++) { g.fillStyle = cl[i % 5]; g.fillRect(20 + i * 18, 25, 15, 52 + (i % 3) * 8); } g.fillStyle = '#d8d0c0'; g.fillRect(0, 106, cw, 22); });
  cell(6, () => { warm(); g.fillStyle = '#b22f26'; g.fillRect(8, 8, 90, 26); g.fillStyle = '#fff'; g.font = `800 16px ${FONT}`; g.textAlign = 'center'; g.fillText('魯肉飯 35', 53, 27); for (let i = 0; i < 3; i++) { g.fillStyle = '#c23a2a'; g.fillRect(16 + i * 80, 86, 58, 8); g.fillStyle = '#d8d4c6'; g.fillRect(40 + i * 80, 94, 8, 34); } g.fillStyle = '#e8e6df'; g.fillRect(170, 36, 74, 44); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(196, 28, 12, 0, 7); g.arc(214, 18, 9, 0, 7); g.fill(); });
  cell(7, () => { g.fillStyle = '#9ea1a4'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#868a8e'; for (let i = 0; i < ch; i += 8) g.fillRect(0, i, cw, 3); g.fillStyle = '#505357'; g.fillRect(cw / 2 - 10, 116, 20, 4); g.strokeStyle = '#5d7fb2'; g.lineWidth = 5; g.beginPath(); g.moveTo(24, 72); g.lineTo(60, 44); g.lineTo(82, 80); g.stroke(); });
  return {t: tex(c), uv: i => rect((i % 4) * cw + 1, (i >> 2) * ch + 1, cw - 2, ch - 2, W, H)};
}

const V_SIGNS = [
  ['牙醫診所', '#1f6fb2', '#ffffff'], ['豆花', '#f5c518', '#a81616'], ['滷肉飯', '#c8102e', '#ffe14d'], ['五金行', '#0b7a4b', '#ffffff'],
  ['機車行', '#e8681f', '#ffffff'], ['藥局', '#ffffff', '#0a7a3c'], ['補習班', '#20409a', '#ffe14d'], ['雞排', '#ffe14d', '#b3201a'],
  ['彩券', '#d62a6f', '#ffffff'], ['便當', '#f08a1d', '#ffffff'], ['水電', '#0e8fa8', '#ffffff'], ['洗衣', '#7b4bb3', '#ffffff'],
  ['中醫', '#7a2d1f', '#f7e7b0'], ['檳榔', '#1a8f3a', '#fff43a'], ['當舖', '#8a1c1c', '#ffd24a'], ['剪髮', '#ffffff', '#d3263a'],
  ['珍奶', '#2d7a5f', '#fff6d6'], ['早餐', '#f2b705', '#7a1e00'], ['豆漿油條', '#b3201a', '#ffe9b8'], ['通訊行', '#e5352b', '#ffffff'],
];
const H_SIGNS = [
  ['阿美早餐店', '#f7c948', '#a3260c'], ['大順機車行', '#e8681f', '#ffffff'], ['福來便當', '#c8102e', '#fff1a8'], ['金和藥局', '#ffffff', '#0a7a3c'],
  ['順安五金', '#0b7a4b', '#ffffff'], ['永興水電行', '#0e8fa8', '#ffffff'], ['三代豆花', '#6a3d1f', '#ffe9b8'], ['鄰里超市', '#2f7fd0', '#ffffff'],
  ['巷口滷味', '#b81f2d', '#ffffff'], ['明亮眼鏡', '#123a6b', '#ffffff'], ['長青中藥行', '#7a2d1f', '#f7e7b0'], ['快剪理髮', '#ffffff', '#d3263a'],
  ['福安宮', '#a81c1c', '#ffd24a'], ['幸福國小', '#1f6b52', '#ffffff'], ['前方施工 減速慢行', '#f5c518', '#1c1c1c'], ['終點・到公司打卡', '#1f4f8f', '#ffffff'],
  ['古早味紅茶冰', '#7a2d1f', '#ffe9b8'], ['阿伯雞排', '#f7c948', '#a3260c'], ['珍珠奶茶', '#2d7a5f', '#ffffff'], ['魷魚羹米粉', '#c8102e', '#ffffff'],
  ['便利商店 24H', '#1a8f5a', '#ffffff'], ['檳榔 香菸', '#123a2a', '#7dff8a'], ['麵線大腸', '#f08a1d', '#ffffff'], ['機車修理', '#2b4f8f', '#ffffff'],
];
function makeSignAtlas() {
  const vw = 96, vh = 320, hw = 512, hh = 96, W = 2048, H = 1024, [c, g] = cv(W, H);
  V_SIGNS.forEach(([txt, bg, fg], i) => {
    const x = i * vw, y = 0;
    g.fillStyle = bg; g.fillRect(x + 2, y + 2, vw - 4, vh - 4);
    g.strokeStyle = fg; g.globalAlpha = .55; g.lineWidth = 3; g.strokeRect(x + 7, y + 7, vw - 14, vh - 14); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = [...txt].length, sz = Math.min(78, (vh - 30) / n * .93);
    g.font = `900 ${sz}px ${FONT}`;
    [...txt].forEach((ch, k) => g.fillText(ch, x + vw / 2, y + vh / 2 + (k - (n - 1) / 2) * (vh - 30) / n));
  });
  H_SIGNS.forEach(([txt, bg, fg], i) => {
    const x = (i % 4) * hw, y = vh + (i >> 2) * hh + 2;
    g.fillStyle = bg; g.fillRect(x + 2, y + 2, hw - 4, hh - 4);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.min(66, 440 / [...txt].length)}px ${FONT}`;
    g.fillText(txt, x + hw / 2, y + hh / 2 + 2);
  });
  return {t: tex(c), v: i => rect(i * vw + 2, 2, vw - 4, vh - 4, W, H), h: i => rect((i % 4) * hw + 2, vh + (i >> 2) * hh + 4, hw - 4, hh - 4, W, H)};
}

function makeMarkAtlas() {
  const s = 256, W = s * 4, H = s * 2, [c, g] = cv(W, H);
  g.fillStyle = '#f4f2ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['慢', '機車', '待轉', '停'].forEach((t, i) => { g.font = `900 ${t.length > 1 ? 104 : 200}px ${FONT}`; g.fillText(t, i * s + s / 2, s / 2 + 8); });
  // 直行箭頭
  g.save(); g.translate(s / 2, s + s / 2);
  g.beginPath(); g.moveTo(0, -110); g.lineTo(50, -38); g.lineTo(20, -38); g.lineTo(20, 110); g.lineTo(-20, 110); g.lineTo(-20, -38); g.lineTo(-50, -38); g.closePath(); g.fill(); g.restore();
  // 人孔蓋
  g.save(); g.translate(s + s / 2, s + s / 2);
  g.fillStyle = '#3a3b3e'; g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fill();
  g.strokeStyle = '#6f7074'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 106, 0, 7); g.stroke();
  g.lineWidth = 5; for (let i = -80; i <= 80; i += 26) { g.beginPath(); g.moveTo(-Math.sqrt(9000 - Math.min(8900, i * i)), i); g.lineTo(Math.sqrt(9000 - Math.min(8900, i * i)), i); g.stroke(); }
  g.restore();
  // 坑洞
  g.save(); g.translate(2 * s + s / 2, s + s / 2);
  g.fillStyle = '#232326'; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = 92 + 24 * Math.sin(i * 2.7); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  g.fillStyle = '#3f6e8a'; g.globalAlpha = .55; g.beginPath(); g.ellipse(-8, 8, 50, 34, .3, 0, 7); g.fill(); g.globalAlpha = 1;
  g.restore();
  // 施工箭頭板（紅綠燈倒數另外做）
  g.save(); g.translate(3 * s + s / 2, s + s / 2);
  g.fillStyle = '#1c1c20'; g.fillRect(-124, -80, 248, 160);
  g.fillStyle = '#ffb21f'; const dot = (x, y) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); };
  for (let x = -96; x <= 48; x += 24) dot(x, 0); for (let k = 0; k < 4; k++) { dot(72 - k * 22, k * 22); dot(72 - k * 22, -k * 22); }
  g.restore();
  const t = tex(c);
  return {t, uv: i => rect((i % 4) * s + 2, (i >> 2) * s + 2, s - 4, s - 4, W, H)};
}

function makeAsphalt() {
  const s = 512, [c, g] = cv(s, s), r = mulberry(7);
  g.fillStyle = '#5b5c61'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) { const v = 70 + r() * 62 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.55)`; g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2); }
  g.strokeStyle = 'rgba(30,30,33,.35)'; g.lineWidth = 1.3;
  for (let i = 0; i < 7; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 60; y += r() * 40; g.lineTo(x, y); } g.stroke(); }
  return tex(c, true);
}
function makePaving() {
  const s = 256, [c, g] = cv(s, s), r = mulberry(11);
  g.fillStyle = '#c9c2b2'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = r(); g.fillStyle = v > .84 ? '#b8ae9c' : v > .68 ? '#d3ccbd' : '#c6bfae'; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  return tex(c, true);
}
export function makeSky(style, rain) {
  const W = 1024, H = 576, [c, g] = cv(W, H), gr = g.createLinearGradient(0, 0, 0, H);
  const pal = rain ? ['#6d7a84', '#a3acb1', '#c3c8c9'] : style === 'toon' ? ['#4fb3e8', '#a4dcf2', '#fdf0d0'] : style === 'model' ? ['#7ec0e4', '#c5e2ec', '#fbeed8'] : ['#3d9be0', '#8fd0ee', '#f7e5b6'];
  gr.addColorStop(0, pal[0]); gr.addColorStop(.55, pal[1]); gr.addColorStop(.8, pal[2]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (!rain) {
    const r = mulberry(5);
    const cloud = (x, y, s) => { g.fillStyle = 'rgba(255,255,255,.93)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + i * 34 * s, y - Math.sin(i / 5 * 3.14) * 30 * s, (40 + r() * 22) * s, (22 + r() * 14) * s, 0, 0, 7); g.fill(); } g.fillRect(x - 10 * s, y, 190 * s, 12 * s); };
    cloud(90, 150, 1.2); cloud(560, 90, 1.5); cloud(820, 200, .9); cloud(330, 240, .7);
  }
  return tex(c);
}

/* 路線主題的天空：清晨、正午、陰霾、暴雨各畫一張，同一主題共用 */
const SKY_CACHE = new Map();
export function makeThemeSky(key, pal, o = {}) {
  if (SKY_CACHE.has(key)) return SKY_CACHE.get(key);
  const W = 1024, H = 576, [c, g] = cv(W, H), gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, pal[0]); gr.addColorStop(.55, pal[1]); gr.addColorStop(.8, pal[2]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (o.sunDisk) {
    const [x, y, rr, col] = o.sunDisk, gl = g.createRadialGradient(x, y, 4, x, y, rr * 3.4);
    gl.addColorStop(0, col); gl.addColorStop(.28, col + 'aa'); gl.addColorStop(1, col + '00');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y, rr * 3.4, 0, 7); g.fill();
  }
  const r = mulberry(5), n = o.clouds ?? 4, col = o.cloudCol || 'rgba(255,255,255,.93)';
  const cloud = (x, y, s) => { g.fillStyle = col; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + i * 34 * s, y - Math.sin(i / 5 * 3.14) * 30 * s, (40 + r() * 22) * s, (22 + r() * 14) * s, 0, 0, 7); g.fill(); } g.fillRect(x - 10 * s, y, 190 * s, 12 * s); };
  [[90, 150, 1.2], [560, 90, 1.5], [820, 200, .9], [330, 240, .7], [690, 250, 1.1], [180, 70, 1.3], [430, 150, 1.6], [860, 70, 1.4]].slice(0, n).forEach(a => cloud(...a));
  const t = tex(c); SKY_CACHE.set(key, t);
  return t;
}

function makePlateAtlas() {
  const cw = 128, ch = 64, W = cw * 4, H = ch * 2, [c, g] = cv(W, H), T0 = ['ABC-1688', 'MEN-5201', 'KTP-3388', 'NGL-7777', 'RAA-2046', 'PHC-1314', 'EMA-6060', 'BDK-9527'];
  T0.forEach((t, i) => {
    const x = (i % 4) * cw, y = (i >> 2) * ch;
    g.fillStyle = '#f7f7f0'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 2.5; g.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
    g.fillStyle = '#16171a'; g.font = `800 25px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x + cw / 2, y + ch / 2 + 1);
  });
  return {t: tex(c), uv: i => rect((i % 4) * cw + 1, (i >> 2) * ch + 1, cw - 2, ch - 2, W, H)};
}
function makeRoadAtlas() {
  const cw = 256, ch = 100, W = cw * 2, H = ch * 4, [c, g] = cv(W, H);
  [['中山路', 'Zhongshan Rd.'], ['民生路', 'Minsheng Rd.'], ['中正路', 'Zhongzheng Rd.'], ['復興路', 'Fuxing Rd.'], ['光復路', 'Guangfu Rd.'], ['忠孝路', 'Zhongxiao Rd.'], ['仁愛路', "Ren'ai Rd."], ['信義路', 'Xinyi Rd.']].forEach(([a, e], i) => {
    const x = (i % 2) * cw, y = (i >> 1) * ch;
    g.fillStyle = '#17559b'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.strokeStyle = '#f4f4ee'; g.lineWidth = 4; g.strokeRect(x + 7, y + 7, cw - 14, ch - 14);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 46px ${FONT}`; g.fillText(a, x + cw / 2, y + 39);
    g.font = `700 19px ${FONT}`; g.fillText(e, x + cw / 2, y + 76);
  });
  return {t: tex(c), uv: i => rect((i % 2) * cw + 2, (i >> 1) * ch + 2, cw - 4, ch - 4, W, H)};
}
function makeMiscAtlas() {
  const cw = 256, ch = 128, W = cw * 4, H = ch * 2, [c, g] = cv(W, H);
  [['垃圾車', '#f5c518', '#1c1c1c'], ['請隨手做環保', '#f5c518', '#1c5a2c'], ['計程車', '#fff6d0', '#1c1c1c'], ['檳榔', '#10241a', '#7dff8a'], ['呷飽未', '#e8622c', '#ffffff'], ['公車站', '#1f6fb2', '#ffffff'], ['307', '#20242a', '#ffa21f'], ['平安', '#c8102e', '#ffe14d']].forEach(([t, bg, fg], i) => {
    const x = (i % 4) * cw, y = (i >> 2) * ch;
    g.fillStyle = bg; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.min(84, 220 / [...t].length)}px ${FONT}`; g.fillText(t, x + cw / 2, y + ch / 2 + 4);
    if (i === 3) { g.strokeStyle = '#ff5fb0'; g.lineWidth = 7; g.strokeRect(x + 10, y + 10, cw - 20, ch - 20); }
  });
  return {t: tex(c), uv: i => rect((i % 4) * cw + 2, (i >> 2) * ch + 2, cw - 4, ch - 4, W, H)};
}
function makeFabric() { // 客家花布：紅底牡丹
  const [c, g] = cv(256, 256), r = mulberry(77);
  g.fillStyle = '#c8233a'; g.fillRect(0, 0, 256, 256);
  const flower = (x, y, s, col, core) => {
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      g.fillStyle = col;
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.beginPath(); g.ellipse(x + dx + Math.cos(a) * s * .62, y + dy + Math.sin(a) * s * .62, s * .55, s * .42, a, 0, 7); g.fill(); }
      g.fillStyle = core; g.beginPath(); g.arc(x + dx, y + dy, s * .36, 0, 7); g.fill();
    }
  };
  for (let i = 0; i < 26; i++) { g.fillStyle = '#2f8a54'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 13, 6, r() * 3, 0, 7); g.fill(); }
  flower(62, 66, 30, '#f9a6c0', '#ffd24a'); flower(188, 48, 22, '#ffffff', '#f06a3c'); flower(150, 170, 32, '#f7d24a', '#e8622c'); flower(40, 196, 22, '#f9a6c0', '#ffffff'); flower(232, 208, 18, '#ffffff', '#ffd24a');
  return tex(c, true);
}
function makeStripe() { // 茄芷袋：紅白藍條紋
  const [c, g] = cv(128, 128);
  ['#c8233a', '#f6f3ea', '#1f4f9e', '#f6f3ea'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 32, 128, 32); });
  g.strokeStyle = 'rgba(0,0,0,.14)'; for (let x = 0; x < 128; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  return tex(c, true);
}
let SHARED = null;
function shared() {
  if (SHARED) return SHARED;
  SHARED = {facade: makeFacadeAtlas(), shop: makeShopAtlas(), sign: makeSignAtlas(), mark: makeMarkAtlas(), asphalt: makeAsphalt(), paving: makePaving(), plate: makePlateAtlas(), road: makeRoadAtlas(), misc: makeMiscAtlas(), fabric: makeFabric(), stripe: makeStripe()};
  return SHARED;
}

/* ───────── 材質工廠（三種畫風差異集中在這裡） ───────── */
export function makeMats(style) {
  const data = new Uint8Array([120, 195, 255]);
  const ramp = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  const cache = new Map();
  const tone = (hex) => {
    const col = new THREE.Color(hex), h = {}; col.getHSL(h);
    if (style === 'toon') { h.s = Math.min(1, h.s * 1.12); h.l = Math.min(1, h.l * 1.02); }
    if (style === 'pixel') { h.s = Math.min(1, h.s * 1.18); }
    col.setHSL(h.h, h.s, h.l); return col;
  };
  const build = (p, o) => {
    if (o.unlit) return new THREE.MeshBasicMaterial(p);
    if (style === 'toon') return new THREE.MeshToonMaterial({...p, gradientMap: ramp});
    if (style === 'model') return new THREE.MeshStandardMaterial({...p, roughness: o.rough ?? .6, metalness: o.metal ?? 0});
    return new THREE.MeshLambertMaterial({...p, flatShading: true});
  };
  const shared = {
    unlit: build({vertexColors: true}, {unlit: true}),
    matte: build({vertexColors: true}, {rough: .72}),
    gloss: build({vertexColors: true}, {rough: .28, metal: .12}),
  };
  return (c, o = {}) => {
    const key = `${c}|${o.unlit ? 1 : 0}|${o.map ? o.map.uuid : ''}|${o.alpha ? 1 : 0}|${o.rough ?? ''}|${o.metal ?? ''}`;
    if (cache.has(key)) return cache.get(key);
    const p = {color: tone(c)};
    if (o.map) p.map = o.map;
    if (o.alpha) { p.alphaTest = .45; p.transparent = false; }
    const m = build(p, o);
    if (!o.map) m.userData.vc = o.unlit ? shared.unlit : (o.rough != null && o.rough < .45) ? shared.gloss : shared.matte;
    cache.set(key, m);
    return m;
  };
}

/* ───────── 合併繪製 ───────── */
function clean(g) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  n.clearGroups();
  return n;
}
class Batch {
  constructor(style, inkMat) { this.style = style; this.items = new Map(); this.ol = []; this.ink = inkMat; }
  add(geo, mat, m = null, o = 0) {
    const base = clean(geo), g = base.clone();
    if (m) g.applyMatrix4(m);
    let target = mat;
    if (mat.userData.vc) {
      target = mat.userData.vc;
      const n = g.attributes.position.count, arr = new Float32Array(n * 3), c = mat.color;
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    if (!this.items.has(target)) this.items.set(target, []);
    this.items.get(target).push(g);
    if (o > 0 && this.style === 'toon') {
      const h = base.clone(); h.computeBoundingBox();
      const c = h.boundingBox.getCenter(new V3()), s = h.boundingBox.getSize(new V3());
      h.translate(-c.x, -c.y, -c.z);
      h.scale(1 + 2 * o / Math.max(s.x, .04), 1 + 2 * o / Math.max(s.y, .04), 1 + 2 * o / Math.max(s.z, .04));
      h.translate(c.x, c.y, c.z);
      if (m) h.applyMatrix4(m);
      this.ol.push(h);
    }
    return this;
  }
  into(group, {cast = true, receive = true} = {}) {
    for (const [mat, list] of this.items) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = cast && !mat.isMeshBasicMaterial; mesh.receiveShadow = receive;
      group.add(mesh);
    }
    if (this.ol.length) group.add(new THREE.Mesh(mergeGeometries(this.ol), this.ink));
    return group;
  }
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, n = 10) => new THREE.CylinderGeometry(r1, r2, h, n);
const sph = (r, a = 10, b = 8) => new THREE.SphereGeometry(r, a, b);
function quad(w, h, uv) {
  const g = new THREE.PlaneGeometry(w, h);
  if (uv) { const a = g.attributes.uv; a.setXY(0, uv.u0, uv.v1); a.setXY(1, uv.u1, uv.v1); a.setXY(2, uv.u0, uv.v0); a.setXY(3, uv.u1, uv.v0); }
  return g;
}
function flat(w, d, uvScale = null, uv = null) {
  const g = quad(w, d, uv);
  if (uvScale) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * w / uvScale, a.getY(i) * d / uvScale); }
  g.rotateX(-Math.PI / 2);
  return g;
}
function extrudeSide(pts, width, bevel = .04) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: Math.max(.01, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1});
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(Math.PI / 2);
  return g;
}
function limb(b, mat, a, c, r, o = .02) {
  const dir = new V3().subVectors(c, a), len = dir.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(.001, len), 3, 8);
  const q = new Q().setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
  b.add(g, mat, new M4().compose(a.clone().add(c).multiplyScalar(.5), q, new V3(1, 1, 1)), o);
}

/* ───────── 工具組 ───────── */
export function makeKit(style) {
  const A = shared(), M = makeMats(style);
  const ink = new THREE.MeshBasicMaterial({color: 0x33261f, side: THREE.BackSide});
  const nb = () => new Batch(style, ink);
  const facadeMat = M(0xffffff, {map: A.facade.t}), shopMat = M(0xffffff, {map: A.shop.t}), signMat = M(0xffffff, {map: A.sign.t, unlit: true});
  const markMat = M(0xffffff, {map: A.mark.t, alpha: true, unlit: false});
  const roadMat = M(0xffffff, {map: A.asphalt, rough: .92}), pavingMat = M(0xffffff, {map: A.paving, rough: .85});
  const patchMat = M(0xc4c5ca, {map: A.asphalt, rough: .95});
  const plateMat = M(0xffffff, {map: A.plate.t, unlit: true}), roadSignMat = M(0xffffff, {map: A.road.t, unlit: true}), miscMat = M(0xffffff, {map: A.misc.t, unlit: true});
  const fabricMat = M(0xffffff, {map: A.fabric}), stripeMat = M(0xffffff, {map: A.stripe});
  let plateI = 0; const plateUv = () => A.plate.uv(plateI++ % 8);
  let BO = {}; // 路線主題的建築參數（樓高、招牌、鐵門…），withOpts 期間有效

  /* 人物 */
  function person(b, x, z, o = {}, base = null) {
    const P = (a, y, c) => { const v = new V3(x + a, y, z + c); return base ? v.applyMatrix4(base) : v; };
    const skin = M(o.skin ?? 0xe6b48c), shirt = M(o.shirt ?? 0x4f86c6), pants = M(o.pants ?? 0x34383f), hair = M(o.hair ?? 0x2a2522);
    const k = o.scale ?? 1;
    limb(b, pants, P(-.1 * k, .82 * k, 0), P(-.1 * k, .1, 0), .075 * k);
    limb(b, pants, P(.1 * k, .82 * k, 0), P(.1 * k, .1, 0), .075 * k);
    limb(b, shirt, P(0, .9 * k, 0), P(0, 1.32 * k, 0), .175 * k, .025);
    limb(b, shirt, P(-.25 * k, 1.36 * k, 0), P(-.28 * k, .92 * k, 0), .055 * k);
    limb(b, shirt, P(.25 * k, 1.36 * k, 0), P(.28 * k, .92 * k, 0), .055 * k);
    const hd = P(0, 1.62 * k, 0);
    b.add(sph(.135 * k), skin, T(hd.x, hd.y, hd.z), .02);
    b.add(sph(.142 * k, 10, 6), hair, T(hd.x, hd.y + .04 * k, hd.z + .015));
    if (o.hat) b.add(cyl(.05, .28 * k, .14, 12), M(o.hat), T(hd.x, hd.y + .14 * k, hd.z), .02);
    if (o.flag) { const f = P(.4, 1.1, 0); b.add(box(.04, 1.4, .04), M(0x8a6a3c), T(f.x, f.y + .3, f.z)); b.add(box(.02, .42, .56), M(0xe23b35), T(f.x, f.y + .78, f.z - .28)); }
  }
  function cart(b, x, z) {
    b.add(box(.46, .5, .36), M(0xc8405a), T(x, .55, z), .02);
    b.add(cyl(.06, .06, .06), M(0x222222), T(x - .18, .08, z, 0, 0, Math.PI / 2));
    b.add(cyl(.06, .06, .06), M(0x222222), T(x + .18, .08, z, 0, 0, Math.PI / 2));
    b.add(box(.03, .8, .03), M(0x777777), T(x, .75, z - .22, 0, -.2));
  }

  /* 機車 */
  function scooterBody(b, base, o = {}) {
    const col = M(o.body ?? 0xf06a3c, {rough: .32}), trim = M(o.trim ?? 0xf4ead6, {rough: .35}), dark = M(0x26262a), rubber = M(0x18181b), metal = M(0xb9bcc0, {rough: .3, metal: .5});
    const X = m => base ? base.clone().multiply(m) : m, lod = o.lod;
    // 車身側面輪廓：尾段→座墊下→腳踏板→前擋→把手
    b.add(extrudeSide([[-.78, .3], [-.92, .62], [-.9, .76], [-.25, .72], [-.1, .46], [.22, .38], [.33, .44], [.45, .98], [.6, 1.06], [.72, .92], [.7, .5], [.52, .26], [-.3, .24]], .36, lod ? 0 : .05), col, base, .022);
    b.add(extrudeSide([[-.88, .75], [-.86, .87], [-.5, .91], [-.14, .87], [-.08, .72]], .31, lod ? 0 : .03), dark, base, lod ? 0 : .02);
    for (const f of [.62, -.6]) {
      b.add(cyl(.21, .21, .11, lod ? 8 : 16).rotateZ(Math.PI / 2), rubber, X(T(0, .21, -f)), lod ? 0 : .02);
      if (!lod) b.add(cyl(.115, .115, .125, 12).rotateZ(Math.PI / 2), metal, X(T(0, .21, -f)));
    }
    b.add(cyl(.018, .018, .68, 5).rotateZ(Math.PI / 2), metal, X(T(0, 1.07, -.47)));
    if (lod) { b.add(box(.13, .07, .02), M(0xf4f4ef), X(T(0, .5, .86))); b.add(box(.2, .06, .03), M(0xb51f22), X(T(0, .68, .91))); return; }
    // 雙色飾板、腳踏墊
    b.add(extrudeSide([[.3, .4], [.42, .84], [.5, .84], [.4, .4]], .372, .01), trim, base);
    b.add(box(.33, .025, .46), rubber, X(T(0, .43, -.05)));
    for (const z of [-.2, -.1, 0, .1, .2]) b.add(box(.31, .012, .025), metal, X(T(0, .447, -.05 + z)));
    // 前後土除
    b.add(extrudeSide([[.42, .37], [.5, .45], [.76, .44], [.86, .28], [.8, .32], [.62, .38]], .15, .01), col, base, .012);
    b.add(extrudeSide([[-.45, .42], [-.84, .46], [-.95, .3], [-.88, .36], [-.6, .36]], .14, .01), dark, base);
    // 後扶手、排氣管
    b.add(box(.3, .025, .03), metal, X(T(0, .86, .9)));
    for (const k of [-1, 1]) b.add(box(.024, .024, .3), metal, X(T(k * .15, .84, .76)));
    b.add(cyl(.05, .062, .52, 10).rotateX(Math.PI / 2), metal, X(T(.19, .3, .62)), .012);
    b.add(cyl(.032, .032, .06, 8).rotateX(Math.PI / 2), M(0x2a2a2e), X(T(.19, .3, .9)));
    // 龍頭：把手蓋、手把、拉桿、儀表、後照鏡
    b.add(box(.4, .12, .17), col, X(T(0, 1.08, -.5)), .016);
    b.add(box(.15, .03, .1), M(0x10141a, {rough: .15}), X(T(0, 1.15, -.47)));
    for (const s of [-1, 1]) {
      b.add(cyl(.028, .028, .11, 8).rotateZ(Math.PI / 2), rubber, X(T(s * .34, 1.07, -.47)));
      b.add(box(.13, .012, .02), metal, X(T(s * .27, 1.05, -.54, s * .25)));
      b.add(cyl(.009, .009, .25, 5), metal, X(T(s * .24, 1.2, -.46, 0, 0, -s * .26)));
      b.add(cyl(.066, .066, .018, 12).rotateX(Math.PI / 2), dark, X(T(s * .285, 1.33, -.46)), .008);
      b.add(cyl(.054, .054, .004, 12).rotateX(Math.PI / 2), M(0xaec7d2, {rough: .1, metal: .6}), X(T(s * .285, 1.33, -.451)));
      // 方向燈殼
      b.add(box(.07, .05, .05), M(0xe08a1c), X(T(s * .2, .71, .9)));
      b.add(box(.07, .05, .05), M(0xe08a1c), X(T(s * .24, 1.0, -.66)));
    }
    b.add(box(.24, .13, .05), M(0xfff5c2, {unlit: true}), X(T(0, .94, -.71)));
    b.add(box(.27, .03, .06), metal, X(T(0, 1.02, -.7)));
    // 尾燈、車牌
    b.add(box(.27, .075, .03), M(0xc22222, {unlit: true}), X(T(0, .7, .92)));
    b.add(box(.16, .02, .14), dark, X(T(0, .57, .84)));
    b.add(quad(.2, .1, plateUv()), plateMat, X(T(0, .5, .87)));
    if (o.drink) { // 掛勾上的手搖飲
      b.add(cyl(.05, .04, .15, 10), M(0xf1e2c6), X(T(.03, .78, -.27)));
      b.add(cyl(.052, .052, .012, 10), M(0xeaf2f2), X(T(.03, .86, -.27)));
      b.add(cyl(.009, .009, .13, 5), M(0xe8622c), X(T(.05, .9, -.26, 0, 0, -.2)));
      b.add(box(.012, .13, .012), M(0xf4f4ef), X(T(.03, .92, -.27)));
    }
    if (o.box) {
      b.add(box(.5, .48, .48), M(o.box), X(T(0, 1.06, .7)), .02);
      if (o.boxText) { b.add(quad(.42, .21, A.misc.uv(4)), miscMat, X(T(0, 1.08, .945))); for (const k of [-1, 1]) b.add(box(.012, .06, .3), M(0xf4f4ef), X(T(k * .255, 1.18, .7))); }
    }
  }
  function riderOn(b, base, o = {}) {
    const P = (a, y, f) => { const v = new V3(a, y, -f); return base ? v.applyMatrix4(base) : v; };
    const shirt = M(o.shirt ?? 0x3f7fc4), pants = M(o.pants ?? 0x2d3138), skin = M(0xe6b48c), helm = M(o.helmet ?? 0xf7c52b, {rough: .3});
    limb(b, shirt, P(0, .93, -.36), P(0, 1.42, -.24), .18, .026);
    for (const s of [-1, 1]) {
      limb(b, shirt, P(s * .22, 1.42, -.22), P(s * .28, 1.19, .1), .058);
      limb(b, skin, P(s * .28, 1.19, .1), P(s * .31, 1.08, .42), .046);
      limb(b, pants, P(s * .1, .92, -.34), P(s * .14, .8, .06), .082);
      limb(b, pants, P(s * .14, .8, .06), P(s * .14, .42, .13), .068);
      const q = P(s * .14, .39, .18); b.add(box(.1, .08, .24), M(0x1e1e22), base ? base.clone().multiply(T(s * .14, .39, -.18)) : T(q.x, q.y, q.z));
    }
    const h = P(0, 1.68, -.2);
    b.add(cyl(.05, .06, .12, 8), skin, T(h.x, h.y - .1, h.z));
    b.add(sph(.122), skin, T(h.x, h.y, h.z));
    b.add(sph(.168, 14, 10), helm, T(h.x, h.y + .035, h.z + .012), .022);
    b.add(box(.3, .035, .03), M(o.stripe ?? 0x2b3a55), T(h.x, h.y + .02, h.z + .17));
    b.add(box(.15, .09, .04), M(o.mask ?? 0xf1f3f0), T(h.x, h.y - .055, h.z - .105));
    b.add(box(.24, .03, .02), M(0xe9ece4), T(0, 1.26, .22 + .03));
  }
  const addLamp = (g, name, col, x, y, z, w = .14, h = .1, d = .04) => {
    const m = new THREE.Mesh(box(w, h, d), new THREE.MeshBasicMaterial({color: col}));
    m.position.set(x, y, z); m.name = name; m.visible = false; g.add(m); return m;
  };
  function makeScooter(o = {}) {
    const g = new THREE.Group(), b = nb();
    scooterBody(b, null, o);
    if (o.rider !== false) riderOn(b, null, o);
    if (o.bag) { // 掛在前掛勾的早餐袋
      b.add(box(.2, .22, .14), M(0xfbfaf4), T(0, .68, -.28), .012);
      b.add(box(.1, .05, .1), M(0xe6a13a), T(0, .8, -.28));
      limb(b, M(0x7a4a2b), new V3(-.17, 1.5, .05), new V3(.2, 1.05, .36), .022, 0);
      b.add(box(.3, .24, .1), M(0x7a4a2b), T(.2, 1.03, .38), .018);
    }
    b.into(g);
    addLamp(g, 'blinkL', 0xffa414, -.2, .71, .93, .08, .06, .03); addLamp(g, 'blinkR', 0xffa414, .2, .71, .93, .08, .06, .03);
    addLamp(g, 'blinkL', 0xffa414, -.34, 1.0, -.62); addLamp(g, 'blinkR', 0xffa414, .34, 1.0, -.62);
    addLamp(g, 'brake', 0xff2020, 0, .7, .94, .28, .08, .03);
    return g;
  }

  /* 汽車 */
  function wheels(b, xs, y, r, lat, w = .22) { for (const f of xs) for (const s of [-1, 1]) { b.add(cyl(r, r, w, 14).rotateZ(Math.PI / 2), M(0x202024), T(s * lat, y, -f), .02); b.add(cyl(r * .5, r * .5, w + .02, 10).rotateZ(Math.PI / 2), M(0xbfc2c6), T(s * lat, y, -f)); } }
  function lampsCar(g, W, rearZ, frontZ, y = .78) {
    for (const s of [-1, 1]) {
      addLamp(g, s < 0 ? 'blinkL' : 'blinkR', 0xffa414, s * (W / 2 - .1), y, rearZ + .03, .2, .13, .03);
      addLamp(g, s < 0 ? 'blinkL' : 'blinkR', 0xffa414, s * (W / 2 - .1), y - .1, frontZ - .03, .2, .1, .03);
      addLamp(g, 'brake', 0xff2020, s * (W / 2 - .34), y, rearZ + .035, .38, .13, .03);
    }
  }
  function makeSedan(color = 0xf2f2ee, o = {}) {
    const g = new THREE.Group(), b = nb(), W = 1.82, c = M(color, {rough: .32});
    b.add(extrudeSide([[-2.2, .38], [-2.24, .84], [-1.75, 1], [1, 1], [2.12, .84], [2.2, .38]], W, .07), c, null, .03);
    b.add(extrudeSide([[-1.6, .96], [-1.14, 1.44], [.36, 1.44], [.98, .96]], W - .22, .02), M(0x27343c, {rough: .15, metal: .4}));
    b.add(box(W - .34, .06, 1.52), c, T(0, 1.47, .39), .025);
    b.add(box(W - .1, .14, .08), M(0x2a2a2e), T(0, .46, 2.21));
    b.add(box(W - .1, .14, .08), M(0x2a2a2e), T(0, .46, -2.21));
    b.add(quad(.46, .15, plateUv()), plateMat, T(0, .6, 2.27));
    for (const s of [-1, 1]) {
      b.add(box(.44, .14, .03), M(0xb51f22, {unlit: true}), T(s * (W / 2 - .34), .78, 2.24));
      b.add(box(.38, .14, .03), M(0xfff6c8, {unlit: true}), T(s * (W / 2 - .3), .74, -2.2));
      b.add(box(.16, .07, .1), c, T(s * (W / 2 + .05), 1.03, -.7));
    }
    wheels(b, [1.34, -1.34], .33, .33, W / 2 - .08);
    for (const s of [-1, 1]) { for (const z of [-.42, .66]) b.add(box(.012, .56, .018), M(0x34383c), T(s * (W / 2 + .012), .68, z)); for (const z of [-.15, .95]) b.add(box(.016, .04, .18), M(0xd8dadc), T(s * (W / 2 + .018), .86, z)); }
    if (o.taxi) { b.add(box(.68, .22, .3), M(0xfafaf2), T(0, 1.61, .4), .02); b.add(quad(.64, .2, A.misc.uv(2)), miscMat, T(0, 1.61, .56)); }
    b.into(g); lampsCar(g, W, 2.24, -2.2);
    if (o.door) {
      const piv = new THREE.Group(); piv.position.set(-W / 2 - .01, .72, -.35); piv.name = 'door';
      const db = nb();
      db.add(box(.07, .62, 1.12), c, T(0, 0, .56), .02);
      db.add(box(.075, .3, .9), M(0x27343c, {rough: .15, metal: .4}), T(0, .42, .56));
      db.into(piv); g.add(piv);
    }
    return g;
  }
  function makePickup(color = 0xe9ece8, o = {}) { // 發財車
    const g = new THREE.Group(), b = nb(), W = 1.7, c = M(color, {rough: .4});
    b.add(extrudeSide([[.2, .46], [.2, 1.82], [1.2, 1.82], [1.72, 1.08], [1.86, .46]], W, .05), c, null, .03);
    b.add(extrudeSide([[.82, 1.12], [.82, 1.68], [1.14, 1.68], [1.52, 1.12]], W + .02, .005), M(0x27343c, {rough: .15, metal: .4}));
    b.add(box(W - .3, .5, .02), M(0x27343c), T(0, 1.42, -.2 + .0));
    b.add(box(W, .1, 2.3), M(0x3f4347), T(0, .62, 1));
    for (const s of [-1, 1]) b.add(box(.05, .42, 2.3), M(o.rail ?? 0x4f8fc0), T(s * (W / 2 - .02), .88, 1), .015);
    b.add(box(W, .42, .05), M(o.rail ?? 0x4f8fc0), T(0, .88, 2.13), .015);
    b.add(quad(.3, .13, plateUv()), plateMat, T(0, .5, 2.19));
    for (const s of [-1, 1]) { b.add(box(.3, .13, .03), M(0xb51f22, {unlit: true}), T(s * (W / 2 - .28), .55, 2.16)); b.add(box(.3, .14, .03), M(0xfff6c8, {unlit: true}), T(s * (W / 2 - .28), .76, -1.84)); }
    wheels(b, [1.22, -1.12], .3, .3, W / 2 - .06);
    b.into(g); lampsCar(g, W, 2.16, -1.84, .55);
    const cargo = new THREE.Group(); cargo.name = 'cargo';
    const cb = nb(), crate = M(0xc99a5a), crate2 = M(0xd8aa6e);
    cb.add(box(.8, .56, .7), crate, T(-.36, 1, 1.5), .02); cb.add(box(.78, .56, .7), crate2, T(.4, 1, 1.5), .02);
    cb.add(box(.8, .56, .7), crate2, T(-.36, 1, .68), .02); cb.add(box(.78, .56, .7), crate, T(.4, 1, .68), .02);
    cb.add(box(.8, .5, .7), crate2, T(.05, 1.53, .9), .02);
    cb.into(cargo); g.add(cargo);
    if (o.loose !== false) {
      const top = new THREE.Group(); top.name = 'looseCrate'; top.position.set(0, 1.56, 1.72);
      const lb = nb(); lb.add(box(1.0, .6, .8), M(0xd49a4d), null, .025); lb.add(box(1.02, .06, .1), M(0x8a5a2b)); lb.into(top); g.add(top);
    }
    return g;
  }
  function makeBus(body = 0xf3f3ee, strip = 0x1e8e8a) {
    const g = new THREE.Group(), b = nb(), W = 2.5;
    b.add(extrudeSide([[-5.6, .42], [-5.6, 3.06], [5.2, 3.06], [5.62, 2.5], [5.66, .42]], W, .1), M(body, {rough: .4}), null, .035);
    b.add(box(W + .02, 1.05, 9.4), M(0x24323a, {rough: .15, metal: .4}), T(0, 2.1, .1));
    b.add(box(W + .02, .34, 11), M(strip), T(0, 1.24, 0));
    b.add(box(W - .3, 1.3, .03), M(0x24323a, {rough: .15, metal: .4}), T(0, 2.05, -5.66));
    b.add(box(W - .3, 1, .03), M(0x24323a, {rough: .15, metal: .4}), T(0, 2.2, 5.63));
    b.add(box(1.5, .3, .04), M(0x20242a), T(0, 2.82, -5.5)); b.add(quad(1.4, .27, A.misc.uv(6)), miscMat, T(0, 2.82, 5.66)); b.add(quad(.5, .2, plateUv()), plateMat, T(0, .78, 5.69));
    for (const s of [-1, 1]) { b.add(box(.44, .16, .03), M(0xb51f22, {unlit: true}), T(s * .85, 1, 5.63)); b.add(box(.36, .18, .03), M(0xfff6c8, {unlit: true}), T(s * .85, .88, -5.68)); }
    wheels(b, [3.5, -3.3], .52, .52, W / 2 - .1, .34);
    b.into(g); lampsCar(g, W, 5.63, -5.68, 1);
    return g;
  }
  function makeTruck() { // 砂石車
    const g = new THREE.Group(), b = nb(), W = 2.5, c = M(0x2f8a54, {rough: .4});
    b.add(extrudeSide([[1.6, .9], [1.6, 3.1], [3.3, 3.1], [3.75, 2], [3.8, .9]], W, .08), c, null, .035);
    b.add(extrudeSide([[2.9, 2.05], [2.9, 2.92], [3.26, 2.92], [3.62, 2.05]], W + .02, .005), M(0x24323a, {rough: .15, metal: .4}));
    b.add(box(W - .2, 1.2, .03), M(0x24323a, {rough: .15, metal: .4}), T(0, 2.45, -3.68));
    b.add(box(W - .1, .3, 6), M(0x2c2d31), T(0, .95, 1.5));
    b.add(extrudeSide([[-4.3, 1.2], [-4.5, 3.2], [1.45, 3.4], [1.45, 1.2]], W + .02, .05), M(0x7d8791, {rough: .7}), null, .035);
    b.add(box(W + .04, .16, 5.8), M(0xe6b422), T(0, 1.5, 1.45));
    for (const s of [-1, 1]) { b.add(box(.36, .16, .03), M(0xb51f22, {unlit: true}), T(s * .9, .98, 4.52)); b.add(box(.36, .18, .03), M(0xfff6c8, {unlit: true}), T(s * .9, 1.12, -3.82)); }
    b.add(quad(.5, .24, plateUv()), plateMat, T(0, 1.02, 4.56));
    wheels(b, [2.7, -2.4, -3.6], .55, .55, W / 2 - .1, .4);
    b.into(g); lampsCar(g, W, 4.52, -3.82, 1);
    return g;
  }
  function makeGarbageTruck() {
    const g = new THREE.Group(), b = nb(), W = 2.2, Y = M(0xf2c21a, {rough: .4});
    b.add(extrudeSide([[1.5, .7], [1.5, 2.5], [2.6, 2.5], [3.05, 1.5], [3.1, .7]], W, .07), Y, null, .03);
    b.add(extrudeSide([[2.2, 1.55], [2.2, 2.34], [2.52, 2.34], [2.86, 1.55]], W + .02, .005), M(0x27343c, {rough: .15, metal: .4}));
    b.add(extrudeSide([[-3, .85], [-3.1, 2.7], [-1.9, 2.95], [1.35, 2.95], [1.35, .85]], W + .1, .08), M(0xf6d94a, {rough: .5}), null, .035);
    b.add(box(W + .02, .5, 4.5), M(0xf0f0e8), T(0, 1.2, .8));
    for (const s of [-1, 1]) { b.add(quad(2.5, 1.2, A.misc.uv(0)), miscMat, T(s * (W / 2 + .07), 2, .75, s * Math.PI / 2)); }
    b.add(quad(1.7, .85, A.misc.uv(1)), miscMat, T(0, 2.05, 3.1));
    b.add(box(W - .1, .2, .3), M(0x3a3d41), T(0, .7, 3.05));
    b.add(quad(.5, .22, plateUv()), plateMat, T(0, .92, 3.13));
    for (const s of [-1, 1]) { b.add(box(.36, .16, .03), M(0xb51f22, {unlit: true}), T(s * .85, 1.05, 3.12)); b.add(box(.36, .18, .03), M(0xfff6c8, {unlit: true}), T(s * .8, 1.15, -3.14)); }
    wheels(b, [2, -2.2], .46, .46, W / 2 - .1, .34);
    b.into(g); lampsCar(g, W, 3.12, -3.14, 1);
    return g;
  }
  function makeBox() { const g = new THREE.Group(), b = nb(); b.add(box(1, .6, .8), M(0xd49a4d), null, .025); b.add(box(1.02, .06, .1), M(0x8a5a2b)); b.into(g); return g; }
  function makePerson(o = {}) { const g = new THREE.Group(), b = nb(); person(b, 0, 0, o); if (o.cart) cart(b, .1, -.55); b.into(g); return g; }

  /* 街道元件 */
  function wire(b, a, c, sag = .4, seg = 6, r = .022) {
    const mat = M(0x2a2a2e); let p = a.clone();
    for (let i = 1; i <= seg; i++) {
      const t = i / seg, q = new V3().lerpVectors(a, c, t); q.y -= Math.sin(t * Math.PI) * sag;
      const d = new V3().subVectors(q, p), len = d.length();
      const gq = new Q().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
      b.add(cyl(r, r, len, 4), mat, new M4().compose(p.clone().add(q).multiplyScalar(.5), gq, new V3(1, 1, 1)));
      p = q;
    }
  }
  function pole(b, x, z, tr = false) {
    const c = M(0x8d8f8d);
    b.add(cyl(.11, .16, 10, 8), c, T(x, 5, z), .025);
    b.add(box(1.5, .1, .1), M(0x55565a), T(x, 9.1, z), .02);
    b.add(box(1.1, .08, .08), M(0x55565a), T(x, 8.3, z), .015);
    if (tr) { b.add(cyl(.28, .28, .9, 10), M(0x7c8d92), T(x + .36 * Math.sign(x), 7.2, z), .02); }
  }
  function tree(b, x, z, s = 1) {
    b.add(cyl(.11 * s, .16 * s, 2.2 * s, 7), M(0x6a4f36), T(x, 1.1 * s + .16, z), .02);
    const lf = M(0x4c9a48), lf2 = M(0x69b356);
    b.add(new THREE.IcosahedronGeometry(1.15 * s, 1), lf, T(x, 3 * s, z), .03);
    b.add(new THREE.IcosahedronGeometry(.85 * s, 1), lf2, T(x + .55 * s, 3.5 * s, z + .3), .03);
    b.add(new THREE.IcosahedronGeometry(.8 * s, 1), lf, T(x - .5 * s, 3.45 * s, z - .35), .03);
    b.add(box(.9, .16, .9), M(0x8d8a80), T(x, .22, z));
  }
  const SCOOT_COL = [0xd64f4f, 0x3f7fc4, 0xf2f2ec, 0x2b2d33, 0x7eb4a8, 0xe0a33a, 0x9a6ac0, 0x9aa0a6];
  function parked(b, x, z, ry, col) { scooterBody(b, T(x, .16, z, ry), {body: col, lod: true}); }
  function building(b, r, side, zc, w, opt = {}) {
    const n = BO.floors ? BO.floors(r) : opt.floors ?? 2 + (r() * 4 | 0), H = 3.4 + n * 3.1, s = opt.scheme ?? (BO.schemes ? BO.schemes[r() * BO.schemes.length | 0] : r() * 8 | 0);
    const fx = side * WALK, mid = side * (WALK + 4.5), wall = M(new THREE.Color(SCHEMES[s][1]).getHex(), {rough: .9});
    b.add(box(9, H - 3.4, w), wall, T(mid, (H + 3.4) / 2, zc), .05);
    b.add(box(6.4, 3.4, w), M(0x6c645a), T(side * (WALK + 5.8), 1.7, zc));
    b.add(box(9.02, .1, w), M(0x4a443c), T(mid, 3.36, zc));
    const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const bays = Math.max(1, Math.round(w / 3.6)), bw = w / bays;
    for (let f = 0; f < n; f++) for (let k = 0; k < bays; k++) {
      const v = [0, 1, 2, 3, 4, 0, 1, 2][r() * 8 | 0];
      b.add(quad(bw, 3.1, A.facade.uv(s, v)), facadeMat, T(fx - side * .01, 3.4 + 3.1 * f + 1.55, zc - w / 2 + bw * (k + .5), ry));
    }
    b.add(box(.3, .34, w + .02), M(0xe8e4d8), T(fx, H + .12, zc), .02);
    // 騎樓
    for (const e of [-1, 1]) b.add(box(.46, 3.4, .46), M(new THREE.Color(SCHEMES[s][0]).getHex()), T(fx + side * .28, 1.7 + .16, zc + e * (w / 2 - .26)), .025);
    const shop = opt.shop ?? (r() * 8 | 0);
    b.add(quad(w - .6, 3.3, A.shop.uv(shop)), shopMat, T(side * (WALK + ARC - .02), 1.75 + .16, zc, ry));
    if (BO.shut && r() < BO.shut) { const sx = side * (WALK + ARC - .08), c0 = M(0x8d9398), c1 = M(0x6f757a); b.add(box(.06, 3.1, w - .7), c0, T(sx, 1.75, zc)); for (let y = .5; y < 3.2; y += .36) b.add(box(.08, .05, w - .7), c1, T(sx - side * .02, y, zc)); }
    b.add(flat(ARC + .5, w, 3, null), pavingMat, T(side * (WALK + ARC / 2 - .1), .165, zc));
    // 橫招牌
    const hPool = BO.hSigns || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23], hi = opt.hSign ?? hPool[r() * hPool.length | 0];
    b.add(box(.14, 1.04, w - .3), M(0x3a3a3e), T(fx - side * .1, 3.92, zc));
    b.add(quad(w - .34, 1, A.sign.h(hi)), signMat, T(fx - side * .18, 3.92, zc, ry));
    // 直招牌（朝向騎士）
    const signs = opt.noV ? 0 : 1 + (r() * 2.3 | 0);
    for (let i = 0; i < signs; i++) {
      const vi = BO.vSigns ? BO.vSigns[r() * BO.vSigns.length | 0] : r() * V_SIGNS.length | 0, sh = 2.5 + r() * 1.5, y = 5.6 + i * 3.1 + r() * .5;
      if (y + sh / 2 > H + 1) continue;
      const sz = zc + (i ? -w * .22 : w * .22), sx = fx - side * .66;
      b.add(box(1.02, sh + .08, .16), M(0x45474b), T(sx, y, sz), .03);
      b.add(quad(1, sh, A.sign.v(vi)), signMat, T(sx, y, sz + .09));
      b.add(box(.5, .07, .07), M(0x3f4044), T(fx - side * .24, y + sh / 3, sz));
    }
    // 屋頂：鐵皮加蓋＋水塔
    const top = H + .28;
    if (r() < .62) {
      const cl = [0x2f9a94, 0x3a78b4, 0xd8703a, 0xa8b0b2][r() * 4 | 0];
      b.add(box(5.6, 2.3, w - 1), M(0xcfd0c8), T(side * (WALK + 5), top + 1.15, zc), .03);
      b.add(extrudeSide([[-(w - .6) / 2, 0], [(w - .6) / 2, 0], [(w - .6) / 2, .55], [-(w - .6) / 2, .95]], 6.3, 0).rotateY(0), M(cl), T(side * (WALK + 5), top + 2.3, zc), .03);
    }
    if (r() < .7) {
      const tx = side * (WALK + 2.1 + r() * 1.5), tz = zc + (r() - .5) * (w - 2.4);
      b.add(cyl(.62, .62, 1.3, 12), M(r() < .5 ? 0xd4d8da : 0x3e7fb5, {rough: .25, metal: .4}), T(tx, top + .95, tz), .03);
      b.add(box(1, .3, 1), M(0x8a8c88), T(tx, top + .15, tz));
    }
    return H;
  }
  function row(b, r, side, z0, z1, opt = {}) { // z0 > z1，往遠方排
    let z = z0;
    while (z > z1 + .5) {
      let w = 5 + r() * 3.4;
      if (z - w < z1 + 2.6) w = z - z1;
      building(b, r, side, z - w / 2, w, opt);
      z -= w;
    }
  }
  function sidewalk(b, side, z0, z1) {
    const len = z0 - z1, zm = (z0 + z1) / 2;
    b.add(flat(3, len, 3), pavingMat, T(side * 8.58, .16, zm));
    b.add(box(.2, .19, len), M(0xa8a59c), T(side * 7.08, .08, zm));
  }
  function baseRoad(b, o = {}) {
    b.add(flat(14, CHUNK, 7), roadMat, T(0, 0, -CHUNK / 2));
    const white = M(0xf4f2ea), yel = M(0xf3bd2b), red = M(0xd8362f);
    const skip = o.noMarkFrom != null ? [o.noMarkFrom, o.noMarkTo] : null;
    const inGap = z => skip && z < skip[0] && z > skip[1];
    const strip = (mat, w, x, z0, z1) => b.add(flat(w, z0 - z1), mat, T(x, .018, (z0 + z1) / 2));
    const segs = skip ? [[0, skip[0]], [skip[1], -CHUNK]] : [[0, -CHUNK]];
    for (const [a, c] of segs) {
      if (a - c < .1) continue;
      strip(yel, .12, -.14, a, c); strip(yel, .12, .14, a, c);
      strip(o.curbR === 'yellow' ? yel : red, .17, 6.82, a, c);
      strip(o.curbL === 'red' ? red : yel, .17, -6.82, a, c);
    }
    for (let z = -2; z > -CHUNK; z -= 10) if (!inGap(z) && !inGap(z - 4)) for (const x of [-3.5, 3.5]) strip(white, .14, x, z, z - 4);
    for (const s of [-1, 1]) {
      const list = o.walks?.[s] ?? [[0, -CHUNK]];
      for (const [a, c] of list) sidewalk(b, s, a, c);
    }
  }
  function furnish(b, r, o = {}) {
    pole(b, 7.72, -.5, true); pole(b, -7.72, -.5);
    for (const [a, c] of [[new V3(7.72, 9.14, -.5), new V3(7.72, 9.14, -CHUNK - .5)], [new V3(-7.72, 9.14, -.5), new V3(-7.72, 9.14, -CHUNK - .5)]]) {
      wire(b, a, c, .75); wire(b, new V3(a.x + .55, a.y, a.z), new V3(c.x + .55, c.y, c.z), .75); wire(b, new V3(a.x - .55, a.y, a.z), new V3(c.x - .55, c.y, c.z), .9);
      wire(b, new V3(a.x, 8.32, a.z), new V3(c.x, 8.32, c.z), .55);
    }
    wire(b, new V3(7.72, 9.14, -.5), new V3(-7.72, 9.14, -.5), .9, 8);
    const used = twProps(b, r, {block: o.park ? (s, z) => !o.park(s, z) : null, p: o.propP ?? BO.propP});
    if (!o.noParked) for (const s of [-1, 1]) for (let z = -3; z > -CHUNK + 2; z -= 1.15) {
      if (used.some(([us, uz]) => us === s && Math.abs(uz - z) < 2.2)) continue;
      if (r() < (o.parkP ?? BO.parkP ?? .46) && !(o.park && !o.park(s, z))) parked(b, s * (8.62 + r() * .2), z, s * (1.25 + r() * .32), SCOOT_COL[r() * 8 | 0]);
    }
    if (!o.noTree && !BO.noTree) for (const s of [-1, 1]) if (r() < .7) tree(b, s * 7.75, -12 - r() * 16, .9 + r() * .3);
    if (r() < .6) b.add(box(.7, 1.3, .4), M(0x7e9186), T(9.5, .8, -7 - r() * 8), .02);
    for (let i = 0; i < 2; i++) { const s = r() < .5 ? 1 : -1; person(b, s * (9.3 + r()), -6 - r() * 28, {shirt: [0xd65a5a, 0x4f86c6, 0xf0e6d0, 0x6aa86a, 0xe0a33a][r() * 5 | 0], hair: r() < .3 ? 0xbcb8b0 : 0x2a2522}); }
  }
  /* 台灣街景小物（都放人行道，不影響騎車） */
  function postbox(b, x, z) {
    [[0xc8342a, 0], [0x2f8a54, .62]].forEach(([c, dx]) => {
      const m = M(c, {rough: .4});
      b.add(box(.5, .92, .42), m, T(x + dx, .62, z), .02);
      b.add(cyl(.25, .25, .42, 14).rotateX(Math.PI / 2), m, T(x + dx, 1.08, z), .02);
      b.add(box(.32, .05, .02), M(0x17181a), T(x + dx, .92, z + .22));
      b.add(box(.14, .14, .02), M(0xf4f2ea), T(x + dx, .62, z + .22));
      b.add(box(.42, .1, .34), M(0x4a4c50), T(x + dx, .2, z));
    });
  }
  function betelStand(b, x, z, s) {
    const fr = M(0x2b2f36), gl = M(0x7fc7c4, {rough: .15, metal: .3});
    b.add(box(1.9, 2.2, 1.5), fr, T(x, 1.26, z), .03);
    b.add(box(1.72, 1.3, 1.52), gl, T(x, 1.42, z));
    b.add(box(2.1, .72, .12), M(0x10241a), T(x, 2.66, z + .7), .02);
    b.add(quad(2, .64, A.misc.uv(3)), miscMat, T(x, 2.66, z + .77));
    b.add(box(2.1, .05, 1.7), M(0x7dff8a, {unlit: true}), T(x, 2.32, z));
    b.add(box(1.5, .1, .4), M(0xd8dadc), T(x - s * .1, .92, z + .85));
    b.add(cyl(.17, .15, .34, 10), M(0xd8362f), T(x + s * .5, .34, z + 1), .012);
  }
  function convexMirror(b, x, z, ry) { // 巷口的反光鏡
    b.add(cyl(.04, .05, 3.1, 8), M(0xe8681f), T(x, 1.7, z), .015);
    const R = T(x, 3.3, z, ry);
    b.add(cyl(.42, .42, .07, 20).rotateX(Math.PI / 2), M(0xe8681f), R, .018);
    b.add(cyl(.36, .36, .012, 20).rotateX(Math.PI / 2), M(0xc9e0ea, {rough: .08, metal: .7}), R.clone().multiply(T(0, 0, .042)));
  }
  function roadName(b, x, z, i) {
    b.add(cyl(.05, .06, 4.2, 8), M(0x8d8f8d), T(x, 2.25, z), .015);
    b.add(box(1.72, .68, .05), M(0x1a3f70), T(x, 4.15, z), .015);
    b.add(quad(1.66, .64, A.road.uv(i)), roadSignMat, T(x, 4.15, z + .03));
  }
  function busStop(b, x, z, s) {
    const blue = M(0x2c6fb3, {rough: .4});
    for (const dz of [-1.2, 1.2]) b.add(box(.09, 2.4, .09), M(0x8d9094), T(x + s * .5, 1.36, z + dz), .012);
    b.add(box(1.3, .09, 2.8), blue, T(x, 2.58, z), .02);
    b.add(box(.06, 1.2, 2.3), M(0xbcd8e0, {rough: .15, metal: .3}), T(x + s * .5, 1.5, z));
    b.add(box(.42, .07, 1.7), M(0xb9bcc0), T(x + s * .25, .62, z), .012);
    for (const dz of [-.7, .7]) b.add(box(.05, .44, .05), M(0x6a6c70), T(x + s * .25, .38, z + dz));
    b.add(cyl(.04, .05, 2.9, 8), M(0x6a6c70), T(x - s * .55, 1.6, z + 1.5), .012);
    b.add(box(.86, .48, .05), blue, T(x - s * .55, 2.85, z + 1.5), .012);
    b.add(quad(.8, .42, A.misc.uv(5)), miscMat, T(x - s * .55, 2.85, z + 1.53));
  }
  function streetFood(b, x, z, r) { // 路邊攤：紅塑膠椅、圓桌、飲料箱
    const red = M(0xd8362f, {rough: .45});
    b.add(cyl(.5, .5, .04, 18), M(0xe8e2d0), T(x, .78, z), .012);
    b.add(cyl(.04, .05, .62, 8), M(0x8d8f8d), T(x, .47, z));
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .4, sx = x + Math.cos(a) * .78, sz = z + Math.sin(a) * .78; b.add(cyl(.17, .19, .04, 12), red, T(sx, .55, sz), .01); for (const k of [-1, 1]) for (const q of [-1, 1]) b.add(box(.025, .38, .025), red, T(sx + k * .11, .36, sz + q * .11)); }
    b.add(cyl(.09, .07, .1, 10), M(0xf4f2ea), T(x + .16, .85, z - .12));
    b.add(box(.46, .3, .34), M(0x2c6fb3), T(x + 1.25, .32, z - .4), .012);
    b.add(box(.46, .3, .34), M(0xe8622c), T(x + 1.25, .62, z - .4), .012);
  }
  function hydrant(b, x, z) {
    b.add(cyl(.12, .14, .68, 10), M(0xe6b422, {rough: .4}), T(x, .5, z), .015);
    b.add(sph(.13, 10, 6), M(0xc8342a, {rough: .4}), T(x, .86, z), .012);
    for (const s of [-1, 1]) b.add(cyl(.05, .05, .12, 8).rotateZ(Math.PI / 2), M(0xc8342a), T(x + s * .16, .6, z));
  }
  function planters(b, x, z, r) {
    for (let i = 0; i < 3; i++) {
      const dz = i * .62; b.add(cyl(.2, .15, .28, 10), M([0x8a5a35, 0x2c6fb3, 0xc8703a][i]), T(x, .3, z - dz), .012);
      b.add(new THREE.IcosahedronGeometry(.25 + r() * .08, 0), M(i % 2 ? 0x4e9a48 : 0x69b356), T(x, .58, z - dz), .012);
    }
  }
  function twProps(b, r, o = {}) {
    const zones = [[1, -5], [1, -17], [1, -29], [-1, -9], [-1, -22], [-1, -34]].filter(([s, z]) => !(o.block && o.block(s, z)));
    const list = [(s, z) => postbox(b, s * 7.7 - .3, z), (s, z) => betelStand(b, s * 9, z, s), (s, z) => roadName(b, s * 7.5, z, r() * 8 | 0), (s, z) => busStop(b, s * 8.7, z, s), (s, z) => streetFood(b, s * 8.9, z, r), (s, z) => hydrant(b, s * 7.6, z), (s, z) => planters(b, s * 9.6, z, r), (s, z) => roadName(b, s * 7.5, z, r() * 8 | 0)];
    for (let i = list.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [list[i], list[j]] = [list[j], list[i]]; }
    const used = [];
    zones.forEach(([s, z], i) => { if (r() < (o.p ?? .72) && list[i]) { list[i](s, z); used.push([s, z]); } });
    return used;
  }

  /* 地面補丁、人孔 */
  function roadDetail(b, r) {
    for (let i = 0; i < 3; i++) {
      const w = 1.4 + r() * 2.2, d = 2 + r() * 5;
      b.add(flat(w, d, 7), patchMat, T(-5.5 + r() * 11, .009 + i * .001, -5 - r() * 30, (r() - .5) * .15));
    }
    b.add(flat(1, 1, null, A.mark.uv(5)), markMat, T(2 + r() * 4, .022, -8 - r() * 22));
  }

  /* ─── 區塊模板 ─── */
  function tOrd(seed, o = {}) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    const gap = o.alley ? [-17, -23] : null;
    baseRoad(b, {curbR: o.curbR, walks: o.alley ? {1: [[0, gap[0] + .4], [gap[1] - .4, -CHUNK]]} : null});
    roadDetail(b, r);
    if (o.arrow) b.add(flat(1.4, 4.2, null, A.mark.uv(4)), markMat, T(5.2, .022, -30));
    if (gap) {
      row(b, r, 1, 0, gap[0]); row(b, r, 1, gap[1], -CHUNK);
      b.add(flat(26, -gap[1] + gap[0] + 0, 7), roadMat, T(7 + 13, .012, (gap[0] + gap[1]) / 2));
      b.add(box(9, 16, 6), M(0xb6ae9f), T(36, 8, (gap[0] + gap[1]) / 2));
      convexMirror(b, 7.6, gap[1] - .9, -.55);
    } else if (!BO.campus) row(b, r, 1, 0, -CHUNK);
    row(b, r, -1, 0, -CHUNK);
    furnish(b, r, {park: gap ? (s, z) => !(s > 0 && z < gap[0] + 1 && z > gap[1] - 1) : null});
    b.into(g);
    return {group: g, type: o.alley ? 'alley' : 'ord'};
  }
  function tMarket(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {}); roadDetail(b, r);
    row(b, r, 1, 0, -CHUNK, {floors: 3}); row(b, r, -1, 0, -CHUNK);
    const tarp = [0xe0562f, 0x2f7fc4, 0xf0c63a, 0x2c9b7c], prod = [0xe2483c, 0xf09a2a, 0x6db33f, 0xf4d03f, 0xa44bb0, 0xe8e2c8];
    for (let z = -2.5; z > -CHUNK; z -= 6.2) {
      const c = tarp[r() * 4 | 0], w = 5.4;
      b.add(box(3.4, .1, w), M(c), T(8.7, 2.85, z - 2.7, 0, 0, -.07), .025);
      b.add(box(.04, .3, w), M(0xf8f4e8), T(7, 2.72, z - 2.7));
      for (const dz of [0, -w]) for (const dx of [7.2, 10]) b.add(cyl(.035, .035, 2.8, 6), M(0x8a8c88), T(dx, 1.45, z + dz));
      b.add(box(2.2, .75, w - 1), M(0xb79a6a), T(8.4, .54, z - 2.7), .025);
      for (let i = 0; i < 26; i++) b.add(new THREE.IcosahedronGeometry(.12 + r() * .05, 0), M(prod[(i * 7 + (z | 0)) % 6 < 0 ? 0 : (i * 7 + Math.abs(z | 0)) % 6]), T(7.5 + r() * 1.9, 1.02 + r() * .12, z - .7 - r() * 4));
      person(b, 10.2, z - 2.7, {shirt: [0xf0e6d0, 0xd65a5a, 0x6aa86a][r() * 3 | 0], hat: r() < .4 ? 0xe8d8a8 : null, hair: 0x3a342e});
    }
    for (const [x, z] of [[7.9, -9], [8.1, -20.5], [7.8, -26]]) { b.add(box(.42, .5, .2), stripeMat, T(x, .52, z), .012); for (const k of [-1, 1]) b.add(box(.03, .24, .03), M(0xc8233a), T(x + k * .13, .88, z)); }
    person(b, 7.6, -14, {shirt: 0x9a6ac0, hair: 0xc4c0b8}); cart(b, 7.6, -14.6);
    person(b, 7.5, -31, {shirt: 0xe07a5a, hair: 0xc4c0b8}); cart(b, 7.5, -30.4);
    furnish(b, r, {noTree: true, parkP: .3, park: s => s < 0});
    b.into(g);
    return {group: g, type: 'market'};
  }
  function tTemple(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {}); roadDetail(b, r);
    row(b, r, 1, 0, -CHUNK);
    row(b, r, -1, 0, -5); row(b, r, -1, -35, -CHUNK);
    const red = M(0xb5322b), tile = M(0xdb7a35), ridge = M(0x3f9a86), gold = M(0xe6b73c), stone = M(0xc7c0b0);
    b.add(flat(16, 30, 3), pavingMat, T(-18, .15, -20));
    const roof = (x, y, z, w, depth, col) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 - .5, .15); s.quadraticCurveTo(-w / 4, -.25, 0, -.2); s.quadraticCurveTo(w / 4, -.25, w / 2 + .5, .15);
      s.quadraticCurveTo(w / 2 - .4, 1, w / 2 - 1, 1.9); s.lineTo(w / 2 - .4, 2.9); s.quadraticCurveTo(w / 2 - 2, 2.25, w / 2 - 3, 2.2);
      s.lineTo(-w / 2 + 3, 2.2); s.quadraticCurveTo(-w / 2 + 2, 2.25, -w / 2 + .4, 2.9); s.lineTo(-w / 2 + 1, 1.9); s.quadraticCurveTo(-w / 2 + .4, 1, -w / 2 - .5, .15);
      const e = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false}); e.translate(0, 0, -depth / 2); e.rotateY(Math.PI / 2);
      b.add(e, col, T(x, y, z), .05);
    };
    b.add(box(10, 6, 24), red, T(-27, 3.2, -20), .05);
    b.add(box(.6, .5, 25), stone, T(-21.8, .3, -20));
    for (let k = -2; k <= 2; k++) {
      b.add(cyl(.32, .36, 5.6, 12), M(0xc23a2e), T(-21.2, 3, -20 + k * 5), .03);
      b.add(sph(.42, 10, 8), M(0xd8362f, {unlit: true}), T(-21, 5.1, -17.5 + (k - 1) * 5));
    }
    b.add(box(.12, 3.8, 3.4), M(0x7a1f1a), T(-21.95, 2.1, -20));
    b.add(box(.12, 2.8, 2.2), M(0x7a1f1a), T(-21.95, 1.6, -24.6)); b.add(box(.12, 2.8, 2.2), M(0x7a1f1a), T(-21.95, 1.6, -15.4));
    for (const dz of [-.8, .8]) b.add(cyl(.5, .5, .02, 16).rotateZ(Math.PI / 2), gold, T(-21.88, 2.4, -20 + dz));
    roof(-26, 6.2, -20, 27, 12, tile); roof(-26.5, 8.4, -20, 17, 7, tile);
    b.add(box(1, .3, 12), ridge, T(-26.5, 10.72, -20));
    b.add(sph(.45, 10, 8), gold, T(-26.5, 11.3, -20), .03);
    // 牌樓
    for (const dz of [-3.4, 3.4]) b.add(box(.6, 5.4, .6), M(0xc23a2e), T(-11.4, 2.7, -20 + dz), .03);
    b.add(box(.5, .8, 8.6), M(0x8d1f1a), T(-11.4, 5.1, -20));
    b.add(quad(5, 1.08, A.sign.h(12)), signMat, T(-11.1, 5.05, -20, Math.PI / 2));
    roof(-11.4, 5.5, -20, 10.4, 1.6, tile);
    // 金爐與石獅
    b.add(cyl(.8, 1, 2, 8), M(0x8a6a34, {metal: .5, rough: .4}), T(-16, 1.15, -28), .03);
    b.add(cyl(.2, .55, 1.2, 8), M(0x6a5228), T(-16, 2.7, -28));
    for (const dz of [-4.8, 4.8]) { b.add(box(.9, .7, .9), stone, T(-14, .5, -20 + dz)); b.add(sph(.45, 8, 6), stone, T(-14, 1.2, -20 + dz)); }
    furnish(b, r, {park: (s, z) => s > 0 || z > -5 || z < -35, noTree: true});
    for (const z of [-3, -36.5]) tree(b, -7.75, z);
    b.into(g);
    return {group: g, type: 'temple'};
  }
  function tSchool(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {curbR: 'red', noMarkFrom: null});
    row(b, r, -1, 0, -CHUNK);
    b.add(flat(40, CHUNK, 8), M(0x7fb96a), T(30, .14, -20));
    b.add(box(.3, 1.6, CHUNK), M(0xeadfc6), T(10, .95, -20), .025);
    b.add(box(.32, .18, CHUNK), M(0xd9734a), T(10, 1.82, -20));
    for (let z = -2; z > -CHUNK; z -= 4) b.add(box(.05, 1.1, .05), M(0x5f7f6a), T(10, 2.3, z));
    b.add(box(.04, .05, CHUNK), M(0x5f7f6a), T(10, 2.85, -20));
    // 校門
    b.add(box(.9, 4.6, .9), M(0xe9e2d0), T(10, 2.3, -15.2), .03); b.add(box(.9, 4.6, .9), M(0xe9e2d0), T(10, 2.3, -24.8), .03);
    b.add(box(.8, 1.1, 10.4), M(0x1f6b52), T(10, 4.7, -20), .03);
    b.add(quad(8, 1, A.sign.h(13)), signMat, T(9.55, 4.72, -20, -Math.PI / 2));
    // 校舍
    for (let f = 0; f < 3; f++) {
      b.add(box(9, 3, 36), M(f % 2 ? 0xf0ead8 : 0xf4efe2), T(36, 1.65 + f * 3.1, -20), .05);
      b.add(box(.3, .9, 36), M(0xd9734a), T(31.4, 1 + f * 3.1, -20));
      for (let z = -4; z > -36; z -= 4) b.add(box(.1, 1.3, 2.4), M(0x3f7686), T(31.42, 2.3 + f * 3.1, z));
    }
    for (const z of [-5, -30, -36]) tree(b, 14 + r() * 5, z, 1.3);
    tree(b, 7.75, -6); tree(b, 7.75, -34);
    // 行穿線＋慢
    for (let x = -6.5; x < 7; x += 1) b.add(flat(.5, 3.6), M(0xf4f2ea), T(x, .02, -20));
    b.add(flat(2.4, 4.2, null, A.mark.uv(0)), markMat, T(5.2, .022, -9));
    b.add(flat(2.4, 4.2, null, A.mark.uv(0)), markMat, T(-5.2, .022, -31));
    person(b, 7.7, -16.7, {shirt: 0xf6d13b, hat: 0xf6d13b, flag: true});
    furnish(b, r, {noTree: true, park: s => s < 0});
    b.into(g);
    return {group: g, type: 'school'};
  }
  function makeSignal(g, x, z) {
    const b = nb(), arm = M(0x77797a);
    b.add(cyl(.13, .17, 6.6, 8), arm, T(x, 3.3, z), .025);
    b.add(cyl(.06, .08, 7.6, 6).rotateZ(Math.PI / 2), arm, T(x - 3.8, 6.2, z), .015);
    b.add(box(1.5, .5, .32), M(0x1b1b1e), T(x - 3.2, 6.15, z + .12), .02);
    b.add(box(1.5, .5, .32), M(0x1b1b1e), T(x - 6.4, 6.15, z + .12), .02);
    for (const cx of [x - 3.2, x - 6.4]) for (const dx of [-.5, 0, .5]) b.add(cyl(.17, .17, .03, 12).rotateX(Math.PI / 2), M(0x3a3a3e), T(cx + dx, 6.15, z + .29));
    b.add(box(.42, .9, .24), M(0x1b1b1e), T(x, 3.2, z + .2), .02);
    b.into(g);
    const lamp = (name, col, dx) => {
      for (const cx of [x - 3.2, x - 6.4]) {
        const m = new THREE.Mesh(cyl(.19, .19, .04, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: col}));
        m.position.set(cx + dx, 6.15, z + .31); m.name = name; m.visible = false; g.add(m);
      }
    };
    lamp('lampR', 0xff3026, -.5); lamp('lampY', 0xffc31f, 0); lamp('lampG', 0x25d366, .5);
    const walk = new THREE.Mesh(box(.22, .3, .02), new THREE.MeshBasicMaterial({color: 0x25d366})); walk.position.set(x, 3.2, z + .33); walk.name = 'lampG'; walk.visible = false; g.add(walk);
  }
  function tCross(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {noMarkFrom: -9.5, noMarkTo: -30.5, walks: {1: [[0, -9], [-31, -CHUNK]], [-1]: [[0, -9], [-31, -CHUNK]]}});
    b.add(flat(90, 21, 7), roadMat, T(0, .004, -20));
    row(b, r, 1, 0, -8, {floors: 4}); row(b, r, -1, 0, -8, {floors: 3}); row(b, r, 1, -32, -CHUNK); row(b, r, -1, -32, -CHUNK);
    // 橫向街道兩側的街屋：遠側正面朝向騎士，近側只需要量體
    for (const s of [-1, 1]) {
      b.add(flat(30, 9, 3), pavingMat, T(s * 34, .14, -4.6)); b.add(flat(30, 9, 3), pavingMat, T(s * 34, .14, -35.4));
      for (let x = 19.5; x < 47; x += 6.6) {
        const n = 2 + (r() * 3 | 0), H = 3.4 + n * 3.1, sc = r() * 8 | 0, cx = s * (x + 3.3);
        b.add(box(6.6, H, 8), M(new THREE.Color(SCHEMES[sc][1]).getHex()), T(cx, H / 2, -37), .05);
        for (let f = 0; f < n; f++) for (let k = 0; k < 2; k++) b.add(quad(3.3, 3.1, A.facade.uv(sc, r() * 5 | 0)), facadeMat, T(cx - 1.65 + k * 3.3, 3.4 + f * 3.1 + 1.55, -32.98));
        b.add(quad(6.2, 3.3, A.shop.uv(r() * 8 | 0)), shopMat, T(cx, 1.8, -32.98));
        b.add(quad(6.2, .9, A.sign.h(r() * 12 | 0)), signMat, T(cx, 3.75, -32.9));
        const m2 = 2 + (r() * 3 | 0), H2 = 3.4 + m2 * 3.1;
        b.add(box(6.6, H2, 8), M(new THREE.Color(SCHEMES[r() * 8 | 0][1]).getHex()), T(cx, H2 / 2, -3), .05);
      }
      b.add(box(9, 15, 34), M(0xb6ae9f), T(s * 53, 7.5, -20), .05);
    }
    const white = M(0xf4f2ea);
    b.add(flat(7, .45), white, T(3.5, .02, -9.2));
    b.add(flat(7, .45), white, T(3.5, .02, -5.6));
    b.add(flat(2.8, 2.4, null, A.mark.uv(1)), markMat, T(5.1, .022, -7.4));
    b.add(flat(2.8, 2.4, null, A.mark.uv(1)), markMat, T(1.8, .022, -7.4));
    for (let x = -6.5; x < 7; x += 1) { b.add(flat(.5, 3.4), white, T(x, .02, -12)); b.add(flat(.5, 3.4), white, T(x, .02, -28)); }
    for (const s of [-1, 1]) for (let z = -14.6; z > -25.6; z -= 1) { b.add(flat(3.4, .5), white, T(s * 8.8, .02, z)); }
    // 機車待轉格
    const bx = (x0, x1, z0, z1) => { b.add(flat(x1 - x0, .14), white, T((x0 + x1) / 2, .02, z0)); b.add(flat(x1 - x0, .14), white, T((x0 + x1) / 2, .02, z1)); b.add(flat(.14, z0 - z1), white, T(x0, .02, (z0 + z1) / 2)); b.add(flat(.14, z0 - z1), white, T(x1, .02, (z0 + z1) / 2)); };
    bx(10.8, 13.8, -15, -18); b.add(flat(2.4, 2.2, null, A.mark.uv(2)), markMat, T(12.3, .022, -16.5));
    furnish(b, r, {noTree: true, park: (s, z) => z > -8 || z < -32});
    b.into(g);
    makeSignal(g, 7.9, -30.6);
    makeCountdown(g, 2.9, -30.5);
    return {group: g, type: 'cross'};
  }
  let countdownCanvas = null;
  function makeCountdown(g, x, z) {
    if (!countdownCanvas) { const [c, gc] = cv(128, 96); countdownCanvas = {c, gc, t: tex(c)}; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .82), new THREE.MeshBasicMaterial({map: countdownCanvas.t}));
    m.position.set(x, 6.15, z + .1); m.name = 'countdown'; g.add(m);
    const frame = new THREE.Mesh(box(1.2, .92, .1), new THREE.MeshBasicMaterial({color: 0x121214})); frame.position.set(x, 6.15, z + .03); g.add(frame);
  }
  function setCountdown(n, color) {
    if (!countdownCanvas) return;
    const {c, gc, t} = countdownCanvas;
    gc.fillStyle = '#0d0d10'; gc.fillRect(0, 0, c.width, c.height);
    if (n != null) { gc.fillStyle = color; gc.font = '900 80px Menlo,monospace'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(String(n).padStart(2, '0'), 64, 52); }
    t.needsUpdate = true;
  }
  function tWork(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {}); row(b, r, 1, 0, -CHUNK); row(b, r, -1, 0, -CHUNK);
    furnish(b, r, {});
    const cone = (x, z) => { b.add(cyl(.03, .19, .72, 10), M(0xf0642a), T(x, .4, z), .018); b.add(cyl(.09, .13, .14, 10), M(0xf8f4ea), T(x, .44, z)); b.add(box(.44, .05, .44), M(0x2a2a2e), T(x, .03, z)); };
    const bar = (x, z, ry, i) => { b.add(box(.45, .78, 1.5), M(i % 2 ? 0xf2f0e8 : 0xd8362f), T(x, .39, z, ry), .022); };
    for (let k = 0; k < 7; k++) cone(6.7 - k * .55, -2 - k * 1.6);
    let i = 0;
    for (let z = -13.5; z > -32; z -= 1.55) bar(3.05, z, 0, i++);
    for (let k = 0; k < 5; k++) cone(3.2 + k * .75, -33 - k * 1.3);
    b.add(flat(3.4, 15), M(0x7a5f43), T(5.1, .02, -23));
    b.add(box(2, .5, 3.6), M(0x8a6b4a), T(5.2, .25, -21, 0, 0, 0), .025);
    person(b, 4.6, -16.5, {shirt: 0xf07a2a, hat: 0xf5c518});
    person(b, 5.8, -26.5, {shirt: 0xf07a2a, hat: 0xf5c518});
    person(b, 4.05, -11, {shirt: 0xf5a01f, hat: 0xf5c518, flag: true});
    // 箭頭導引板
    b.add(box(.12, 2.2, .12), M(0x555555), T(5.1, 1.1, -11.5)); b.add(box(2.6, 1.7, .1), M(0x1c1c20), T(5.1, 2.8, -11.5), .025);
    b.add(quad(2.5, 1.62, A.mark.uv(7)), M(0xffffff, {map: A.mark.t, unlit: true, alpha: true}), T(5.1, 2.8, -11.44));
    b.add(box(1.5, 2, .08), M(0xf5c518), T(6.3, 1.2, -3.2), .02);
    b.add(quad(1.44, .5, A.sign.h(14)), signMat, T(6.3, 1.6, -3.14));
    b.into(g);
    return {group: g, type: 'work', colliders: [{x0: 2.75, x1: 7, z0: -12.5, z1: -33}, {x0: 5.2, x1: 7, z0: -6, z1: -12.5}, {x0: 3.6, x1: 5.2, z0: -9.8, z1: -12.5}]};
  }
  function tFinish(seed) {
    const r = mulberry(seed + (BO.seed || 0)), g = new THREE.Group(), b = nb();
    baseRoad(b, {}); row(b, r, 1, 0, -CHUNK); row(b, r, -1, 0, -CHUNK); furnish(b, r, {});
    for (const x of [-.3, 7.6]) b.add(box(.3, 6, .3), M(0x1f4f8f), T(x, 3, -24), .03);
    b.add(box(8.3, 1.3, .2), M(0x1f4f8f), T(3.65, 6, -24), .03);
    b.add(quad(8, 1.2, A.sign.h(15)), signMat, T(3.65, 6, -23.88));
    for (let x = 0; x < 7; x += 1) for (let k = 0; k < 2; k++) if ((x + k) % 2 === 0) b.add(flat(1, .7), M(0x222224), T(x + .5, .022, -24 + k * .7));
    for (let x = 0; x < 7; x += 1) for (let k = 0; k < 2; k++) if ((x + k) % 2 === 1) b.add(flat(1, .7), M(0xf4f2ea), T(x + .5, .022, -24 + k * .7));
    b.into(g);
    return {group: g, type: 'finish'};
  }

  return {
    withOpts(o, fn) { BO = o || {}; try { return fn(); } finally { BO = {}; } },
    tree, wire, cart, busStop, streetFood, hydrant, planters, signMat, markMat, pavingMat, roadMat,
    style, M, ink, nb, A, person, scooterBody, addLamp, plateUv, plateMat, miscMat, fabricMat, stripeMat, makeGarbageTruck, makeScooter, makeSedan, makePickup, makeBus, makeTruck, makeBox, makePerson, setCountdown,
    templates: {
      ord1: () => tOrd(101), ord2: () => tOrd(202, {arrow: true}), ord3: () => tOrd(303, {curbR: 'yellow'}), ord4: () => tOrd(404),
      alley: () => tOrd(505, {alley: true}), market: () => tMarket(606), market2: () => tMarket(616), temple: () => tTemple(707), school: () => tSchool(808),
      cross: () => tCross(909), work: () => tWork(111), finish: () => tFinish(222),
    },
    potholeMesh() {
      const m = new THREE.Mesh(flat(2.6, 2.6, null, A.mark.uv(6)), markMat); return m;
    },
  };
}
const ARC = 2.6;
export {box, cyl, sph, flat, quad, extrudeSide, limb};
