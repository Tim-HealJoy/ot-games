// 騎遍台灣：上班打卡五條路線的「一眼認得出來」主題。
// 每條路各有自己的時段光線、建築高度、招牌內容和專屬街景；都放在人行道或高處，不影響騎車判定（騎士 x 只在 -6.4～6.55）。
import * as THREE from 'three';
import {T, mulberry, box, cyl, sph, flat, quad} from './world.js';

const V3 = THREE.Vector3, FONT = '"PingFang TC","Noto Sans TC","Heiti TC","Microsoft JhengHei",sans-serif';
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);

/* ───────── 主題專屬招牌與壁畫（Canvas 自繪，沒有外部素材） ───────── */
const SIGNS = [
  ['豆漿 米漿 蛋餅', '#fff3cf', '#b3201a'], ['燒餅 油條 飯糰', '#b3201a', '#ffe9b8'], ['現做蛋餅', '#f7c948', '#7a1e00'], ['古早味早餐', '#fff3cf', '#7a1e00'], ['饅頭 包子', '#fffdf6', '#b3201a'], ['鮮奶茶 紅茶', '#2d7a5f', '#fff6d6'],
  ['福安市場', '#a81c1c', '#ffd24a'], ['福安宮', '#a81c1c', '#ffd24a'], ['廟口小吃', '#c8102e', '#fff1a8'], ['新鮮蔬果', '#2f8a54', '#ffffff'], ['現切水果', '#f08a1d', '#ffffff'], ['魚丸 貢丸', '#123a6b', '#ffffff'],
  ['學校區 減速慢行', '#f5c518', '#1c1c1c'], ['小心學童', '#f5c518', '#1c1c1c'], ['文具書局', '#2f7fd0', '#ffffff'], ['安親才藝班', '#e8681f', '#ffffff'], ['歡迎光臨 幸福國小', '#1f6b52', '#ffffff'], ['愛心商店', '#ffffff', '#d3263a'],
  ['往 市政府 ▶', '#17559b', '#ffffff'], ['◀ 往 河濱快速道路', '#17559b', '#ffffff'], ['捷運站 ▶', '#0f7a78', '#ffffff'], ['機慢車 兩段左轉', '#17559b', '#ffffff'], ['往 火車站 ▶', '#17559b', '#ffffff'], ['大樓停車場', '#2b2f36', '#ffd24a'],
  ['今日休息', '#fffdf6', '#c8102e'], ['颱風停業', '#fffdf6', '#c8102e'], ['強風注意', '#f5c518', '#1c1c1c'], ['積水慢行', '#f5c518', '#1c1c1c'],
];
const ART = new WeakMap();
function art(kit) {
  if (ART.has(kit)) return ART.get(kit);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const cw = 512, ch = 96, cols = 4, [c, g] = mk(cw * cols, ch * 8);
  SIGNS.forEach(([txt, bg, fg], i) => {
    const x = (i % cols) * cw, y = (i / cols | 0) * ch;
    g.fillStyle = bg; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.strokeStyle = fg; g.globalAlpha = .55; g.lineWidth = 3; g.strokeRect(x + 8, y + 8, cw - 16, ch - 16); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.min(62, 430 / [...txt].length)}px ${FONT}`;
    g.fillText(txt, x + cw / 2, y + ch / 2 + 2);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const W = cw * cols, H = ch * 8;
  const uv = i => { const x = (i % cols) * cw, y = (i / cols | 0) * ch; return {u0: (x + 2) / W, u1: (x + cw - 2) / W, v0: 1 - (y + ch - 2) / H, v1: 1 - (y + 2) / H}; };
  const [mc, m] = mk(1024, 512);
  const cell = (i, fn) => { m.save(); m.translate((i % 2) * 512, (i >> 1) * 256); m.beginPath(); m.rect(0, 0, 512, 256); m.clip(); fn(); m.restore(); };
  cell(0, () => { // 彩虹與太陽
    m.fillStyle = '#bfe7f4'; m.fillRect(0, 0, 512, 256); ['#e8503a', '#f5a623', '#f7d84a', '#5cb85c', '#3f8fd2', '#7a5cc0'].forEach((c0, k) => { m.strokeStyle = c0; m.lineWidth = 15; m.beginPath(); m.arc(256, 270, 210 - k * 15, Math.PI, 0); m.stroke(); });
    m.fillStyle = '#f7c948'; m.beginPath(); m.arc(70, 58, 36, 0, 7); m.fill(); m.fillStyle = '#7fb96a'; m.fillRect(0, 225, 512, 31);
  });
  cell(1, () => { // 黑熊與玉山
    m.fillStyle = '#d7efe0'; m.fillRect(0, 0, 512, 256); m.fillStyle = '#5a8fb0'; m.beginPath(); m.moveTo(0, 256); m.lineTo(170, 60); m.lineTo(260, 170); m.lineTo(350, 90); m.lineTo(512, 256); m.fill();
    m.fillStyle = '#fff'; m.beginPath(); m.moveTo(170, 60); m.lineTo(135, 100); m.lineTo(205, 100); m.fill();
    m.fillStyle = '#1e1e22'; m.beginPath(); m.arc(370, 190, 58, 0, 7); m.fill(); m.beginPath(); m.arc(370, 118, 42, 0, 7); m.fill(); m.beginPath(); m.arc(338, 84, 15, 0, 7); m.arc(402, 84, 15, 0, 7); m.fill();
    m.strokeStyle = '#fff'; m.lineWidth = 10; m.beginPath(); m.moveTo(338, 160); m.lineTo(370, 195); m.lineTo(402, 160); m.stroke();
    m.fillStyle = '#fff'; m.beginPath(); m.arc(356, 112, 6, 0, 7); m.arc(384, 112, 6, 0, 7); m.fill();
  });
  cell(2, () => { // 小朋友牽手
    m.fillStyle = '#fbe6b8'; m.fillRect(0, 0, 512, 256); m.fillStyle = '#7fb96a'; m.fillRect(0, 214, 512, 42);
    ['#e8503a', '#3f8fd2', '#f5a623', '#7a5cc0', '#2f9a63'].forEach((c0, k) => {
      const x = 60 + k * 98; m.fillStyle = c0; m.fillRect(x - 22, 120, 44, 66); m.fillStyle = '#34383f'; m.fillRect(x - 18, 186, 14, 30); m.fillRect(x + 4, 186, 14, 30);
      m.fillStyle = '#e6b48c'; m.beginPath(); m.arc(x, 96, 28, 0, 7); m.fill(); m.fillStyle = '#f7d84a'; m.beginPath(); m.arc(x, 88, 30, Math.PI, 0); m.fill();
      m.strokeStyle = c0; m.lineWidth = 10; if (k < 4) { m.beginPath(); m.moveTo(x + 22, 134); m.lineTo(x + 76, 134); m.stroke(); }
    });
  });
  cell(3, () => { // 海和魚
    m.fillStyle = '#7fd0e6'; m.fillRect(0, 0, 512, 256); m.fillStyle = '#4aa8cf'; for (let k = 0; k < 6; k++) { m.beginPath(); m.arc(45 + k * 86, 240, 58, Math.PI, 0); m.fill(); }
    [[120, 80, '#e8503a'], [290, 120, '#f5a623'], [420, 60, '#fff'], [200, 170, '#7a5cc0']].forEach(([x, y, c0]) => { m.fillStyle = c0; m.beginPath(); m.ellipse(x, y, 44, 24, 0, 0, 7); m.fill(); m.beginPath(); m.moveTo(x - 38, y); m.lineTo(x - 72, y - 22); m.lineTo(x - 72, y + 22); m.fill(); m.fillStyle = '#1e1e22'; m.beginPath(); m.arc(x + 22, y - 5, 5, 0, 7); m.fill(); });
  });
  const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 8;
  const muv = i => { const x = (i % 2) * 512, y = (i >> 1) * 256; return {u0: x / 1024, u1: (x + 512) / 1024, v0: 1 - (y + 256) / 512, v1: 1 - y / 512}; };
  const out = {uv, sign: kit.M(0xffffff, {map: t, unlit: true}), muv, mural: kit.M(0xffffff, {map: mt})};
  ART.set(kit, out);
  return out;
}

/* ───────── 共用小物 ───────── */
const front = (b, a, x, y, z, w, h, i) => b.add(quad(w, h, a.uv(i)), a.sign, T(x, y, z));   // 朝向騎士的招牌
function gantry(kit, b, a, z, i, w = 5.6) {
  const {M} = kit, g = M(0x6f7375);
  b.add(cyl(.17, .22, 7.2, 8), g, T(7.55, 3.6, z), .025);
  b.add(box(9.4, .22, .22), g, T(3, 6.9, z), .02);
  b.add(box(w + .2, 1.5, .1), M(0x2b2f36), T(3.6, 6.3, z), .02);
  front(b, a, 3.6, 6.3, z + .07, w, 1.36, i);
}
function bentTree(kit, b, x, z, dir, r) {
  const {M} = kit;
  b.add(cyl(.12, .2, 3.3, 7), M(0x5a452f), T(x, 1.7, z, 0, 0, dir * -.32), .02);
  const lf = M(0x3d7d3e), lf2 = M(0x4e8f47);
  b.add(ico(1.1, 1), lf, T(x + dir * 1.1, 3.5, z), .03);
  b.add(ico(.8, 1), lf2, T(x + dir * 1.9, 3.1, z + .3), .03);
  b.add(ico(.55, 1), lf, T(x + dir * 2.6, 2.8, z - .3 + r() * .3), .02);
}

/* ───────── 清晨：早餐攤 ───────── */
function breakfastCart(kit, b, a, x, z, s, i, r) {
  const {M, person} = kit, steel = M(0xcfd4d6, {rough: .3, metal: .5}), white = M(0xffffff, {unlit: true});
  b.add(box(1.05, .95, 2.3), steel, T(x, .64, z), .02);
  b.add(box(1.12, .06, 2.4), M(0xeef0ef), T(x, 1.13, z));
  b.add(cyl(.4, .4, .08, 14), M(0x35353a), T(x, 1.2, z - .55));
  b.add(box(.78, .36, .78), M(0xf6f1e2), T(x, 1.33, z + .55), .012);
  for (const dz of [-1.12, 1.12]) for (const dx of [-.62, .62]) b.add(cyl(.03, .03, 2.1, 6), M(0x8d8f8d), T(x + dx, 1.25, z + dz));
  for (let k = 0; k < 5; k++) b.add(box(1.75, .06, .5), M(k % 2 ? 0xf6f1e2 : 0xd8362f), T(x, 2.32, z - 1 + k * .5, 0, 0, s * .08), .012);
  b.add(box(.06, .62, 2.3), M(0x7a1e00), T(x - s * .58, 1.95, z));
  b.add(box(2.1, .46, .06), M(0x7a1e00), T(x, 1.97, z + 1.2), .012);
  front(b, a, x, 1.97, z + 1.24, 2, .4, i);
  for (let k = 0; k < 5; k++) b.add(ico(.12 + k * .05, 0), white, T(x + Math.sin(k * 2.1) * .14, 1.4 + k * .3, z - .55 + Math.cos(k) * .1));
  person(b, x + s * .95, z, {shirt: 0xf4efe2, hat: 0xf4efe2, hair: 0x3a342e});
  person(b, x - s * .95, z + .55, {shirt: [0xd65a5a, 0x4f86c6, 0x6aa86a][r() * 3 | 0], hair: r() < .4 ? 0xc4c0b8 : 0x2a2522});
  const red = M(0xd8362f, {rough: .45});
  for (const dz of [-1.7, -2.3]) { b.add(cyl(.17, .19, .04, 10), red, T(x, .52, z + dz), .01); for (const k of [-1, 1]) for (const q of [-1, 1]) b.add(box(.025, .36, .025), red, T(x + k * .11, .34, z + dz + q * .11)); }
}
function laundry(kit, b, x, z, r) {
  const {M} = kit;
  b.add(cyl(.018, .018, 3, 5).rotateX(Math.PI / 2), M(0x8d8f8d), T(x, 5.9, z));
  for (let k = 0; k < 4; k++) b.add(box(.04, .62 + r() * .3, .52), M([0xf4efe2, 0xd65a5a, 0x4f86c6, 0xf0c63a, 0x9fd0c0][r() * 5 | 0]), T(x, 5.5, z - 1.05 + k * .7));
}
function decoDawn(kit, b, t, key, r) {
  const a = art(kit), cross = key === 'cross', alley = key === 'alley';
  const spots = cross ? [[1, -3.5], [-1, -3.5], [1, -36.5]] : key === 'finish' ? [[1, -8], [-1, -14]] : [[1, -7], [1, -14], [1, -31], [-1, -11], [-1, -26], [-1, -36]];
  spots.filter(([s, z]) => !(alley && s > 0 && z < -13 && z > -26)).forEach(([s, z], i) => breakfastCart(kit, b, a, s * 8.8, z, s, (i + (r() * 6 | 0)) % 6, r));
  if (!cross) for (const [s, z] of [[1, -22], [-1, -18], [-1, -33]]) if (!(alley && s > 0)) kit.tree(b, s * 7.75, z, 1 + r() * .35);
  for (let k = 0; k < 4; k++) { const s = r() < .5 ? 1 : -1, z = -4 - r() * 32; if (cross && z < -8 && z > -32) continue; laundry(kit, b, s * 9.72, z, r); }
  for (let k = 0; k < 3; k++) { const s = r() < .5 ? 1 : -1, z = -5 - r() * 30; if (cross && z < -8 && z > -32) continue; kit.person(b, s * (7.6 + r()), z, {shirt: [0xf4efe2, 0x9fb7c9, 0xd9a5b0][r() * 3 | 0], hair: 0xc9c5bc, hat: k === 0 ? 0xe8d8a8 : null}); }
}

/* ───────── 正午：紅燈籠與市集 ───────── */
function lanterns(kit, b, z, y = 6.5, sag = .55) {
  const {M} = kit, red = M(0xe0392c, {unlit: true}), gold = M(0xe6b73c), n = 7;
  kit.wire(b, new V3(7.7, y, z), new V3(-7.7, y, z), sag, 8);
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, x = 7.1 - u * 14.2, yy = y - Math.sin(u * Math.PI) * sag - .32;
    b.add(sph(.3, 10, 7).scale(1, .84, 1), red, T(x, yy, z), .014);
    b.add(cyl(.11, .11, .06, 8), gold, T(x, yy + .27, z));
    b.add(box(.035, .22, .035), gold, T(x, yy - .36, z));
  }
}
function paifang(kit, b, a, z, i) {
  const {M} = kit, red = M(0xc23a2e), dark = M(0x8d1f1a), gold = M(0xe6b73c), tile = M(0xdb7a35), ridge = M(0x3f9a86);
  for (const s of [-1, 1]) { b.add(box(.72, 7.2, .72), red, T(s * 7.65, 3.6, z), .03); b.add(box(1.15, .5, 1.15), M(0xc7c0b0), T(s * 7.65, .25, z), .012); b.add(box(.86, .34, .86), gold, T(s * 7.65, 7, z)); }
  b.add(box(16.2, .62, .6), dark, T(0, 7.1, z), .03);
  b.add(box(6.5, 1.25, .16), gold, T(0, 8.05, z), .02);
  front(b, a, 0, 8.05, z + .1, 6.2, 1.06, i);
  b.add(box(17.8, .22, 2.1), tile, T(0, 8.85, z), .03);
  b.add(box(16.4, .22, 1.7), tile, T(0, 9.08, z), .02);
  b.add(box(15.2, .3, .38), ridge, T(0, 9.32, z), .02);
  for (const s of [-1, 1]) b.add(box(1.2, .22, .4), ridge, T(s * 8.3, 9.55, z, 0, 0, s * .42), .015);
  b.add(sph(.34, 10, 8), gold, T(0, 9.72, z), .02);
}
function marketStall(kit, b, a, x, z, s, r) {
  const {M, person} = kit, tarp = [0xe0562f, 0x2f7fc4, 0xf0c63a, 0x2c9b7c, 0xd8362f][r() * 5 | 0], prod = [0xe2483c, 0xf09a2a, 0x6db33f, 0xf4d03f, 0xa44bb0];
  b.add(box(3.1, .1, 4.8), M(tarp), T(x, 2.85, z, 0, 0, s * .07), .025);
  for (const dz of [-2.3, 2.3]) for (const dx of [-1.25, 1.25]) b.add(cyl(.035, .035, 2.8, 6), M(0x8a8c88), T(x + dx, 1.45, z + dz));
  b.add(box(1.9, .72, 4.2), M(0xb79a6a), T(x, .54, z), .025);
  for (let i = 0; i < 16; i++) b.add(ico(.13 + r() * .05, 0), M(prod[i % 5]), T(x - .78 + r() * 1.55, 1 + r() * .14, z - 1.9 + r() * 3.8));
  front(b, a, x, 2.42, z + 2.45, 2.5, .46, 8 + (r() * 4 | 0));
  person(b, x + s * .1 + s * 1.05, z, {shirt: [0xf0e6d0, 0xd65a5a, 0x6aa86a][r() * 3 | 0], hat: r() < .4 ? 0xe8d8a8 : null, hair: 0x3a342e});
}
function decoNoon(kit, b, t, key, r) {
  const a = art(kit), cross = key === 'cross';
  for (const z of cross ? [-4, -36] : [-7, -20, -33]) lanterns(kit, b, z);
  if (key === 'temple') paifang(kit, b, a, -4, 7);
  if (key === 'market2') paifang(kit, b, a, -35, 6);
  if (key === 'market' || key === 'market2') for (let z = -5; z > -36; z -= 7.6) marketStall(kit, b, a, -8.9, z, -1, r);
  if (key.startsWith('ord')) for (const [s, z] of [[1, -9], [1, -26], [-1, -16], [-1, -33]]) marketStall(kit, b, a, s * 8.9, z, s, r);
  for (let k = 0; k < 7; k++) { const s = r() < .5 ? 1 : -1, z = -3 - r() * 34; if (cross && z < -8 && z > -32) continue; kit.person(b, s * (7.35 + r() * .5), z, {shirt: [0xd65a5a, 0x4f86c6, 0xf0e6d0, 0x9a6ac0, 0xe0a33a][r() * 5 | 0], hair: r() < .45 ? 0xc4c0b8 : 0x2a2522, hat: r() < .25 ? 0xe8d8a8 : null}); if (r() < .3) kit.cart(b, s * 7.35, z - .6); }
  if (!cross) b.add(flat(2.4, 4.2, null, kit.A.mark.uv(0)), kit.markMat, T(5.2, .022, -26));
}

/* ───────── 綠蔭：校園與路隊 ───────── */
function canopy(kit, b, x, z, s, r) {
  const {M} = kit, lf = M(0x3f9446), lf2 = M(0x5bb050), k = 1 + r() * .25;
  b.add(cyl(.2, .32, 5.4, 7), M(0x6a4f36), T(x, 2.8, z), .02);
  b.add(ico(2.6 * k, 1), lf, T(x - s * 1.2, 7.7, z), .03);
  b.add(ico(1.9 * k, 1), lf2, T(x - s * 2.8, 7.2, z + 1.4), .03);
  b.add(ico(1.8 * k, 1), lf, T(x + s * .9, 7, z - 1.6), .03);
}
function kids(kit, b, x, z, n, r) {
  for (let i = 0; i < n; i++) {
    const zz = z - i * 1.25;
    kit.person(b, x + (r() - .5) * .3, zz, {shirt: 0xf3f2ea, pants: 0x28456f, hat: 0xf6d13b, scale: .72});
    b.add(box(.3, .34, .16), kit.M([0xe8503a, 0x3f8fd2, 0xf5a623, 0x7a5cc0][i % 4]), T(x, .95, zz + .17), .012);
  }
}
function decoShade(kit, b, t, key, r) {
  const a = art(kit), {M} = kit, cross = key === 'cross';
  const zs = cross ? [-3, -37] : [-3, -11, -19, -27, -35];
  for (const s of [-1, 1]) for (const z of zs) { if (key === 'alley' && s > 0 && z < -14 && z > -25) continue; if (key === 'school' && s > 0 && Math.abs(z + 20) < 7) continue; canopy(kit, b, s * 7.72, z, s, r); }
  const green = M(0x5cb574);
  const strip = (z0, z1) => { for (const s of [-1, 1]) b.add(flat(.95, z0 - z1), green, T(s * 6.25, .017, (z0 + z1) / 2)); };
  if (cross) { strip(0, -9); strip(-31, -40); } else strip(0, -40);
  if (key.startsWith('ord')) { // 右邊是校園：矮牆＋壁畫＋操場
    b.add(flat(40, 40, 8), M(0x7fb96a), T(30, .14, -20));
    b.add(box(.3, 1, 40), M(0xeadfc6), T(10, .66, -20), .025);
    b.add(box(.34, .14, 40), M(0xd9734a), T(10, 1.22, -20));
    for (let z = -2; z > -40; z -= 3) b.add(box(.05, 1.3, .05), M(0x4f7f6a), T(10, 1.9, z));
    b.add(box(.04, .05, 40), M(0x4f7f6a), T(10, 2.52, -20));
    [-8, -28].forEach((z, i) => { b.add(box(.22, 2.6, 8.4), M(0xf4efe2), T(9.9, 1.5, z), .025); b.add(quad(8.1, 2.34, a.muv((i + (r() * 4 | 0)) % 4)), a.mural, T(9.76, 1.5, z, -Math.PI / 2)); });
    b.add(flat(20, 36), M(0xc9623a), T(25, .16, -20)); b.add(flat(14.6, 30.6), M(0x69ad5c), T(25, .17, -20));
    for (const dx of [-8.2, 8.2]) b.add(flat(.1, 36), M(0xf4f2ea), T(25 + dx, .172, -20));
    for (let f = 0; f < 3; f++) { b.add(box(9, 3, 34), M(f % 2 ? 0xf0ead8 : 0xf4efe2), T(41, 1.65 + f * 3.1, -20), .04); b.add(box(.3, .9, 34), M(0xd9734a), T(36.4, 1 + f * 3.1, -20)); for (let z = -5; z > -36; z -= 5) b.add(box(.1, 1.3, 2.6), M(0x3f7686), T(36.42, 2.3 + f * 3.1, z)); }
  }
  if (key === 'school') { gantry(kit, b, a, -3, 12); kids(kit, b, 8.1, -8, 5, r); kids(kit, b, -8.3, -22, 4, r); }
  else if (cross) { kit.person(b, 7.4, -7, {shirt: 0xf6d13b, hat: 0xf6d13b, flag: true}); kids(kit, b, 8.3, -3, 4, r); front(b, a, 8.4, 3.1, -35, 2.4, .48, 13); b.add(cyl(.04, .05, 3, 6), M(0x8d8f8d), T(8.4, 1.5, -35.05)); }
  else if (key !== 'finish') { kids(kit, b, -8.2, -6 - r() * 10, 3 + (r() * 3 | 0), r); kids(kit, b, 8.15, -24 - r() * 8, 3, r); b.add(box(2.1, .44, .06), M(0x2f7fd0), T(-8.5, 3.1, -32)); front(b, a, -8.5, 3.1, -31.96, 2, .4, 14 + (r() * 2 | 0)); b.add(cyl(.04, .05, 3, 6), M(0x8d8f8d), T(-8.5, 1.5, -32.05)); }
}

/* ───────── 陰霾：高架捷運與高樓 ───────── */
function viaduct(kit, b, key) {
  const {M} = kit, c = M(0xb9b6ae), d = M(0x9c9a93);
  b.add(box(12, 1, 40), c, T(-8.8, 10.9, -20));
  b.add(box(8, 1, 40), d, T(-8.8, 9.9, -20));
  for (const x of [-2.9, -14.7]) b.add(box(.32, 1.2, 40), d, T(x, 12, -20));
  for (const x of [-7.2, -10.4]) b.add(box(.2, .18, 40), M(0x6a6c70), T(x, 11.5, -20));
  for (const z of key === 'cross' ? [-4, -36] : [-10, -30]) { b.add(cyl(.9, 1, 9.4, 12), c, T(-8.8, 4.7, z), .03); b.add(box(5.4, 1.1, 2.4), d, T(-8.8, 9, z), .025); }
}
function decoHaze(kit, b, t, key, r) {
  const a = art(kit);
  if (key === 'ord2') gantry(kit, b, a, -6, 18);
  if (key === 'ord1') gantry(kit, b, a, -26, 19, 6);
  if (key === 'ord3') gantry(kit, b, a, -14, 22);
  if (key === 'ord4') gantry(kit, b, a, -8, 20);
  if (key !== 'cross' && key !== 'work') { b.add(flat(2.4, 4.2, null, kit.A.mark.uv(1)), kit.markMat, T(5.2, .022, -12)); b.add(flat(1.4, 4.2, null, kit.A.mark.uv(4)), kit.markMat, T(1.8, .022, -30)); }
  for (let k = 0; k < 5; k++) { const s = 1, z = -3 - r() * 34; if (key === 'cross' && z < -8 && z > -32) continue; kit.person(b, s * (8.2 + r() * 1.4), z, {shirt: [0x34383f, 0xf2f2ec, 0x2c5e92][r() * 3 | 0], pants: 0x2a2c32, hair: 0x2a2522}); }
}
function extrasHaze(kit, scene) {
  const {M} = kit, cars = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(), b = kit.nb();
    b.add(box(3, 3, 16), M(0xf2f3f0), T(0, 1.6, 0), .04);
    b.add(box(3.04, .42, 16.02), M(0x2c6fb3), T(0, .9, 0));
    b.add(box(3.06, .86, 14.2), M(0x2b3a45), T(0, 2.2, 0));
    for (const dz of [-4, 4]) b.add(box(3.08, 1.8, 1.2), M(0xd8dcdc), T(0, 1.5, dz));
    if (i === 0) b.add(box(2.7, 1.2, .1), M(0x2b3a45), T(0, 2.3, 8.06));
    b.into(g, {cast: false}); g.position.y = 11.9; scene.add(g); cars.push(g);
  }
  let at = 50;
  return {update(S, dt, road) {
    at += 17 * dt; if (at > S.s + 330) at = S.s - 110;
    cars.forEach((g, i) => { const w = road.map(-8.8, at + i * 17); g.position.x = w.x; g.position.z = w.z; g.rotation.y = -w.th; });
  }};
}

/* ───────── 暴雨：鐵門、沙包、斷枝、積水 ───────── */
const WET = new WeakMap();
function wetMats(kit) {
  if (!WET.has(kit)) WET.set(kit, {sheen: new THREE.MeshBasicMaterial({color: 0x17232e, transparent: true, opacity: .32, depthWrite: false}), pool: new THREE.MeshBasicMaterial({color: 0xaec6d4, transparent: true, opacity: .42, depthWrite: false})});
  return WET.get(kit);
}
function sandbags(kit, b, x, z, r) {
  for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) b.add(box(.36, .2, .68), kit.M(r() < .5 ? 0xcfc3a3 : 0xbfb391), T(x, .3 + row * .2, z + (k - (3 - row) / 2) * .7), .012);
}
function decoStorm(kit, b, t, key, r) {
  const a = art(kit), {M} = kit, W = wetMats(kit), cross = key === 'cross';
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(14, 40).rotateX(-Math.PI / 2), W.sheen); sheen.position.set(0, .03, -20); sheen.renderOrder = 1; t.group.add(sheen);
  const pools = key === 'ord2' ? 6 : 3;
  for (let i = 0; i < pools; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), W.pool), z = -3 - r() * 34;
    m.scale.set(1.1 + r() * 1.6, 1, .9 + r() * 2); m.position.set(-5 + r() * 11.4, .036, z); m.renderOrder = 2; t.group.add(m);
  }
  const shop = cross ? [[1, -3], [-1, -3], [1, -36]] : [[1, -6], [1, -24], [-1, -12], [-1, -30]];
  shop.forEach(([s, z]) => sandbags(kit, b, s * 10.25, z, r));
  if (!cross) {
    bentTree(kit, b, -7.75, -9 - r() * 6, 1, r); bentTree(kit, b, 7.75, -27 - r() * 8, -1, r);
    kit.scooterBody(b, T(8.7, .32, -14 - r() * 4, .5, 0, Math.PI / 2), {body: 0x3f7fc4, lod: true});
    kit.scooterBody(b, T(8.5, .32, -18 - r() * 3, -.4, 0, Math.PI / 2), {body: 0xd64f4f, lod: true});
    kit.scooterBody(b, T(-8.7, .32, -30 - r() * 4, 2.8, 0, -Math.PI / 2), {body: 0xf2f2ec, lod: true});
    b.add(cyl(.05, .09, 2.6, 6).rotateZ(Math.PI / 2), M(0x5a452f), T(-8.2, .3, -20, .5), .012);
    for (let k = 0; k < 4; k++) b.add(ico(.32 + r() * .2, 0), M(0x3d7d3e), T(-8.9 + k * .5, .35, -20.3 + r() * .7), .012);
    b.add(box(.06, 1.2, 3.6), M(0x2b2f36), T(9.2, .75, -33, .1, 0, -.9), .02);
    b.add(cyl(.04, .05, 2.6, 6), M(0x8d8f8d), T(7.45, 1.3, -24)); b.add(box(1.5, .46, .06), M(0x2b2f36), T(7.45, 2.5, -24)); front(b, a, 7.45, 2.5, -23.96, 1.42, .4, 26 + (r() * 2 | 0));
  }
  if (key === 'work') { // 封閉車道上真的有倒樹
    b.add(cyl(.34, .5, 14, 9).rotateX(Math.PI / 2), M(0x5a452f), T(5.2, .5, -23, .08), .03);
    for (let k = 0; k < 7; k++) b.add(ico(1 + r() * .7, 1), M(k % 2 ? 0x3d7d3e : 0x4e8f47), T(4.6 + r() * 1.6, 1 + r() * .9, -16 - k * 2.2), .03);
  }
}
function extrasStorm(kit, scene) {
  const n = 70, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 40; pos[i * 3 + 1] = .4 + Math.random() * 7; pos[i * 3 + 2] = -Math.random() * 44; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({color: 0x6f8f3e, size: .17, fog: false})); pts.frustumCulled = false; scene.add(pts);
  return {update(S, dt, road) {
    const dir = S.gustDur > 0 ? S.gustDir : .35;
    for (let i = 0; i < n; i++) { let x = pos[i * 3] + dir * 13 * dt; if (x > 20) x = -20; if (x < -20) x = 20; pos[i * 3] = x; pos[i * 3 + 1] += Math.sin(S.t * 3 + i) * dt * .8; if (pos[i * 3 + 1] < .3) pos[i * 3 + 1] = 7; if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = .4; }
    geo.attributes.position.needsUpdate = true;
    const w = road.map(S.x, S.s); pts.position.set(w.x, 0, w.z); pts.rotation.y = -w.th;
  }};
}

/* ───────── 主題表 ───────── */
export const THEMES = {
  dawn: {sky: ['#7fa7d8', '#f6c9a8', '#ffe4c2'], clouds: 3, cloudCol: 'rgba(255,226,206,.9)', sunDisk: [200, 330, 42, '#fff0c8'], fog: [0xffe3c8, 70, 300], hemi: [0xfff0e0, 0xc9a98c, 1.5], sun: [0xffc892, 2.5], sunAt: [-42, 20, -30], tint: ['#ffc08a', .1],
    build: {seed: 1000, floors: r => 1 + (r() * 2 | 0), hSigns: [0, 2, 6, 7, 8, 16, 19, 20], vSigns: [17, 18, 1, 2, 9, 16], parkP: .18, propP: .25, noTree: true}, deco: decoDawn},
  noon: {sky: ['#3f9fe0', '#a4dcf2', '#ffe9b8'], clouds: 3, fog: [0xffe6b8, 110, 320], hemi: [0xfff6e0, 0xd8b88c, 1.85], sun: [0xfff0c8, 2.45], sunAt: [12, 70, -14], tint: ['#ffd27a', .07],
    build: {seed: 3000, floors: r => 2 + (r() * 2 | 0), hSigns: [2, 6, 8, 10, 16, 17, 19, 22], vSigns: [2, 7, 9, 1, 16, 12], parkP: .25, propP: .35, noTree: true}, deco: decoNoon},
  shade: {sky: ['#5cc2f2', '#bfe9f6', '#eef9e8'], clouds: 5, fog: [0xdff3e0, 120, 340], hemi: [0xffffff, 0xa9c99c, 1.95], sun: [0xffffff, 2.15], sunAt: [34, 58, -34], tint: null,
    build: {seed: 5000, floors: r => 2 + (r() * 2 | 0), hSigns: [3, 7, 9, 11, 20], vSigns: [0, 5, 6, 19, 15], parkP: .3, propP: .4, noTree: true, campus: true}, deco: decoShade},
  haze: {sky: ['#8b99a6', '#bcc3c6', '#e6dcc8'], clouds: 0, fog: [0xd4d2c8, 55, 270], hemi: [0xf4f4f4, 0xa8a8a8, 1.6], sun: [0xfff2dc, 1.45], sunAt: [30, 62, -20], tint: ['#9cb0c4', .12],
    build: {seed: 7000, floors: r => 6 + (r() * 9 | 0), hSigns: [3, 9, 20, 18, 23, 1], vSigns: [0, 6, 19, 14, 8, 12], parkP: .35, propP: .5, noTree: true}, deco: decoHaze, extras: extrasHaze},
  storm: {sky: ['#3d4752', '#667079', '#8d959a'], clouds: 8, cloudCol: 'rgba(58,66,76,.82)', fog: [0x8f989c, 24, 150], hemi: [0xdfe6ea, 0x707a80, 1.25], sun: [0xcfd8e0, .55], sunAt: [34, 58, -34], tint: ['#5a7088', .16],
    build: {seed: 9000, floors: r => 2 + (r() * 4 | 0), shut: .8, parkP: .1, propP: .2, noTree: true}, deco: decoStorm, extras: extrasStorm},
};

/** 用這個主題的建築樣式做零件（圓環的街區、路尾的大樓） */
export function themedPart(kit, themeId, fn) { return themeId ? kit.withOpts(THEMES[themeId].build, fn) : fn(); }
/** 一路跟著車道的東西（目前只有高架捷運），圓環上也要接著走 */
export function trackSidePiece(kit, themeId) {
  if (themeId !== 'haze') return null;
  const g = new THREE.Group(), b = kit.nb(); viaduct(kit, b, 'ord1'); b.into(g);
  return g;
}
export function themedTemplate(kit, themeId, key) {
  const th = THEMES[themeId], t = kit.withOpts(th.build, () => kit.templates[key]());
  if (key === 'end') return t;
  const r = mulberry(th.build.seed + key.length * 97 + key.charCodeAt(key.length - 1) * 13), b = kit.nb();
  th.deco(kit, b, t, key, r);
  const fine = new THREE.Group(); fine.name = 'fine'; b.into(fine); t.group.add(fine);   // 遠處先不畫，省效能
  if (themeId === 'haze') { const b2 = kit.nb(); viaduct(kit, b2, key); b2.into(t.group); } // 高架橋要一路看得到
  return t;
}
