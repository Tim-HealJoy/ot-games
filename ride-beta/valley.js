// 稻田回家路：民國 50 年代花東縱谷的鐵馬路線（全部程式繪製，沿用 world.js 的畫風積木）
// 目的是讓鐵馬與機車兩條路線共用同一套材質、描邊、光線與鏡頭，不再用照片當背景。
import * as THREE from 'three';
import {T, mulberry, CHUNK, quad} from './world.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
export const RW = 3.1;               // 路半寬（公尺）
export const LANE = 1.92;            // 三條行進線的間距，對應舊版 LANE_OFF 0.62

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, c, h, n = 10) => new THREE.CylinderGeometry(a, c, h, n);
const sph = (r, a = 10, c = 8) => new THREE.SphereGeometry(r, a, c);
function flat(w, d, uvScale = null) {
  const g = new THREE.PlaneGeometry(w, d);
  if (uvScale) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * w / uvScale, a.getY(i) * d / uvScale); }
  g.rotateX(-Math.PI / 2);
  return g;
}
function limb(b, mat, a, c, r, o = .02) {
  const dir = new V3().subVectors(c, a), len = dir.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(.001, len), 3, 8);
  const q = new Q().setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
  b.add(g, mat, new M4().compose(a.clone().add(c).multiplyScalar(.5), q, new V3(1, 1, 1)), o);
}
function prism(w, h, len) { // 屋頂：沿 x 軸延伸的三角柱
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: len, bevelEnabled: false});
  g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2);
  return g;
}

/* ───────── 貼圖 ───────── */
function cv(s) { const c = document.createElement('canvas'); c.width = c.height = s; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
let TEX = null;
function textures() {
  if (TEX) return TEX;
  // 稻田：順著路方向的稻列，近看一叢一叢，遠看收斂成線
  const [rc, rg] = cv(512), r = mulberry(21), rows = 8, rw = 512 / rows;
  rg.fillStyle = '#d9ad38'; rg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < rows; i++) {
    rg.fillStyle = '#b48a2a'; rg.fillRect(i * rw, 0, rw * .16, 512);
    for (let k = 0; k < 150; k++) {
      const x = (i + .16) * rw + r() * rw * .84, y = r() * 512, w = 4 + r() * 7, h = 10 + r() * 16;
      rg.fillStyle = ['#efc853', '#e5bb42', '#caa02f', '#f6d76c'][r() * 4 | 0];
      rg.beginPath(); rg.ellipse(x, y, w, h, (r() - .5) * .5, 0, 7); rg.fill();
    }
  }
  // 土路：壓實的黃土加碎石
  const [dc, dg] = cv(512), d = mulberry(33);
  dg.fillStyle = '#a58a60'; dg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    dg.fillStyle = ['rgba(136,112,76,.45)', 'rgba(184,158,116,.45)'][i % 2];
    dg.beginPath(); dg.ellipse(d() * 512, d() * 512, 16 + d() * 50, 8 + d() * 26, d() * 3, 0, 7); dg.fill();
  }
  for (let i = 0; i < 2200; i++) {
    const v = 100 + d() * 90 | 0;
    dg.fillStyle = `rgba(${v + 18},${v},${v - 24},.7)`;
    dg.fillRect(d() * 512, d() * 512, 1 + d() * 3.4, 1 + d() * 2.6);
  }
  TEX = {rice: tex(rc), dirt: tex(dc)};
  return TEX;
}

/* ───────── 植物與物件 ───────── */
function leafGeo(len = 2.2, w = .5, a0 = 62, a1 = -38) {
  const seg = 7, pos = [], rail = [];
  let y = 0, d = 0;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, a = (a0 + (a1 - a0) * u) * Math.PI / 180;
    if (i) { d += Math.cos(a) * len / seg; y += Math.sin(a) * len / seg; }
    const hw = w * .5 * Math.pow(Math.sin(Math.PI * Math.min(.98, .12 + u * .86)), .6);
    rail.push({c: [0, y, -d], l: [-hw, y - hw * .28, -d], r: [hw, y - hw * .28, -d]});
  }
  const tri = (a, c, e) => pos.push(...a, ...c, ...e, ...e, ...c, ...a);
  for (let i = 0; i < seg; i++) {
    const p = rail[i], q = rail[i + 1];
    tri(p.l, p.c, q.c); tri(p.l, q.c, q.l); tri(p.c, p.r, q.r); tri(p.c, q.r, q.c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // 法線一律朝上：鏡頭多半從葉子下方看，照實算法線整片會變黑
  const nor = new Float32Array(pos.length);
  for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}
const LEAF = {};
const leaf = (k, ...a) => (LEAF[k] ??= leafGeo(...a));

function banana(M, b, x, z, s, r) {
  const trunk = M(0x8a9a52), lf = [M(0x4f9f4a), M(0x69b656), M(0x5aa94f)];
  for (const [dx, dz, k] of [[0, 0, 1], [.34, .18, .78], [-.3, .22, .68]]) {
    const h = 2.1 * s * k;
    b.add(cyl(.11 * s, .19 * s, h, 7), trunk, T(x + dx * s, h / 2, z + dz * s), .02);
    const n = k === 1 ? 8 : 5;
    for (let i = 0; i < n; i++) {
      const ry = i / n * 6.283 + r() * .5, sc = s * k * (.85 + r() * .3);
      b.add(leaf('banana', 2.3, .62), lf[i % 3], T(x + dx * s, h * .94, z + dz * s, ry, 0, 0, sc));
    }
  }
}
function palm(M, b, x, z, s, r) {
  const h = 8.2 * s;
  b.add(cyl(.085 * s, .13 * s, h, 6), M(0x8d7a62), T(x, h / 2, z), .02);
  for (let i = 0; i < 9; i++) b.add(leaf('palm', 2.5, .34, 40, -55), M(i % 2 ? 0x4c9650 : 0x62aa58), T(x, h, z, i / 9 * 6.283 + r() * .3, 0, 0, s));
}
function hayStack(M, b, x, z, s) {
  b.add(cyl(.86 * s, .82 * s, .9 * s, 12), M(0xe2bb58), T(x, .45 * s, z), .022);
  b.add(cyl(.06 * s, .92 * s, 1.15 * s, 12), M(0xd4a944), T(x, 1.47 * s, z), .022);
  b.add(cyl(.9 * s, .9 * s, .06 * s, 12), M(0xa9842f), T(x, .92 * s, z));
}
function farmhouse(M, b, x, z, ry) { // 路邊農舍：紅磚灰瓦、沒有煙囪（要跟終點的厝一眼分得出來）
  const B = T(x, 0, z, ry), X = (lx, ly, lz, lry = 0) => B.clone().multiply(T(lx, ly, lz, lry));
  const brick = M(0xb9663f), tile = M(0x6b7076), dark = M(0x3a3028), cream = M(0xeadfc6);
  b.add(box(12, 2.5, 4), brick, X(0, 1.25, 0), .03);
  b.add(prism(5, 1.5, 12.8), tile, X(0, 2.5, 0), .03);
  for (const s of [-1, 1]) {
    b.add(box(3.4, 2.2, 6.4), brick, X(s * 7.6, 1.1, 3.2), .03);
    b.add(prism(4.3, 1.3, 7).rotateY(Math.PI / 2), tile, X(s * 7.6, 2.2, 3.2), .03);
    b.add(box(.04, 1.1, 1.3), cream, X(s * (7.6 - s * 1.72), 1.4, 3.2));
  }
  b.add(box(1.5, 2, .06), dark, X(0, 1, 2.02));
  for (const s of [-1, 1]) b.add(box(1.4, 1, .06), cream, X(s * 3.5, 1.5, 2.02));
}
function shrine(M, b, x, z, ry) { // 土地公廟：矮紅牆、翹脊紅瓦
  const B = T(x, 0, z, ry), X = (lx, ly, lz) => B.clone().multiply(T(lx, ly, lz));
  b.add(box(1.9, .3, 1.7), M(0x9a9184), X(0, .15, 0), .02);
  b.add(box(1.5, 1.2, 1.3), M(0xc93b2e), X(0, .9, 0), .022);
  b.add(box(.72, .78, .06), M(0x2c1f1a), X(0, .85, .66));
  b.add(prism(2.1, .72, 2).rotateY(Math.PI / 2), M(0xd9622b), X(0, 1.5, 0), .022);
  for (const s of [-1, 1]) b.add(cyl(.01, .08, .36, 5), M(0xf0c23f), new M4().multiplyMatrices(B, T(s * 1.05, 1.62, .9, 0, 0, s * .6)));
  b.add(cyl(.17, .13, .24, 10), M(0xb08a3a), X(0, .42, 1.15), .012);
  b.add(box(.5, .24, .05), M(0xf5d65c), X(0, 1.36, .66));
}
export function riceSheaf(M, b, x, z) { // 路上要撿的稻穗
  const stalk = M(0xc9a23c), ear = M(0xf5cf52);
  for (const s of [-1, 1]) {
    const top = new V3(x + s * .1, 1.05, z);
    limb(b, stalk, new V3(x + s * .03, .02, z), top, .022, .012);
    let p = top.clone();
    for (let i = 0; i < 6; i++) {
      p = p.clone().add(new V3(s * .055, -.06 - i * .012, 0));
      b.add(sph(.075 - i * .006, 8, 6), ear, T(p.x, p.y, p.z, 0, 0, s * .5, 1), .014);
    }
    limb(b, M(0xa8a544), new V3(x, .36, z), new V3(x + s * .3, .68, z), .026, .01);
  }
}
export function basket(M, b, x, z) { // 路上要閃的竹簍
  b.add(cyl(.42, .3, .72, 14), M(0xc79c58), T(x, .36, z), .024);
  for (const y of [.14, .36, .58]) b.add(cyl(.4 - (.58 - y) * .15, .38 - (.58 - y) * .15, .05, 14), M(0x8c6a36), T(x, y, z));
  b.add(cyl(.38, .38, .03, 14), M(0x5a4426), T(x, .71, z));
}

function gr2Water(M, b) {
  b.add(flat(.62, CHUNK), M(0x7cc3d2, {rough: .2}), T(RW + 1.05, .03, -CHUNK / 2));
  b.add(box(.14, .2, CHUNK), M(0xb3ad98), T(RW + .68, .07, -CHUNK / 2));
  b.add(box(.14, .2, CHUNK), M(0xb3ad98), T(RW + 1.42, .07, -CHUNK / 2));
}
function egret(M, b, x, z, ry, y0 = 0, dz0 = 0) {
  const w = M(0xfbfaf4), B = T(x, y0, z, ry).multiply(T(0, 0, dz0)), X = (lx, ly, lz, rx = 0, s = 1) => B.clone().multiply(T(lx, ly, lz, 0, rx, 0, s));
  const body = new THREE.SphereGeometry(1, 10, 8); body.scale(.17, .17, .34);
  b.add(body, w, X(0, .92, 0), .012);
  b.add(cyl(.028, .04, .42, 6), w, X(0, 1.2, -.24, -.35), .01);
  b.add(sph(.065, 8, 6), w, X(0, 1.4, -.33), .01);
  b.add(cyl(.004, .022, .2, 5), M(0xe0a33a), X(0, 1.4, -.43, -1.57));
  for (const s of [-1, 1]) b.add(cyl(.012, .012, .8, 5), M(0x35312c), X(s * .06, .4, 0));
}

function bamboo(M, b, x, z, s, r) { // 竹林
  const stalk = [M(0x7fa84a), M(0x93b552), M(0x6f9a3e)], leaf0 = [M(0x5da848), M(0x74b955), M(0x4e9a48)];
  for (let i = 0; i < 9; i++) {
    const dx = (r() - .5) * 2.4 * s, dz = (r() - .5) * 2.4 * s, h = (5.2 + r() * 2.6) * s, lean = (r() - .5) * .14;
    b.add(cyl(.035 * s, .055 * s, h, 6), stalk[i % 3], T(x + dx, h / 2, z + dz, 0, lean, lean), .01);
    for (let k = 0; k < 4; k++) b.add(new THREE.IcosahedronGeometry((.32 + r() * .26) * s, 0), leaf0[(i + k) % 3], T(x + dx + lean * h * .5 + (r() - .5) * .9, h * (.62 + k * .19), z + dz + (r() - .5) * .9, r() * 3));
  }
}
function buffalo(M, b, x, z, ry) { // 水牛，背上站一隻白鷺鷥
  const B = T(x, 0, z, ry), X = (lx, ly, lz, rx = 0, rz = 0) => B.clone().multiply(T(lx, ly, lz, 0, rx, rz)), dark = M(0x3f3d3e);
  const body = new THREE.SphereGeometry(1, 14, 10); body.scale(.62, .58, 1.12);
  b.add(body, dark, X(0, 1.02, 0), .026);
  b.add(cyl(.26, .3, .54, 10).rotateX(1.2), dark, X(0, 1.2, -1.02), .02);
  const head = new THREE.SphereGeometry(1, 12, 8); head.scale(.27, .28, .4);
  b.add(head, dark, X(0, 1.16, -1.42), .018);
  b.add(box(.3, .16, .18), M(0x5a5656), X(0, 1.02, -1.72));
  for (const s of [-1, 1]) {
    b.add(new THREE.TorusGeometry(.28, .036, 6, 12, 2.4).rotateY(s < 0 ? Math.PI : 0), M(0xcfc9b6), X(s * .28, 1.46, -1.34), .008);
    for (const f of [-.7, .7]) b.add(cyl(.09, .075, .72, 8), dark, X(s * .32, .36, f), .012);
    b.add(sph(.045, 6, 4), M(0x17181a), X(s * .17, 1.25, -1.72));
  }
  b.add(cyl(.02, .05, .58, 6), dark, X(0, .92, 1.2, .4));
  egret(M, b, x, z, ry, 1.56, .45);
}
function farmer(kit, b, x, z, s) { // 戴斗笠彎腰的農人
  const M = kit.M;
  kit.person(b, x, z, {shirt: 0xf0e8d6, pants: 0x4a5a6a, hair: 0x2a2522, scale: .92});
  b.add(cyl(.012, .38, .18, 16), M(0xdcbc7c), T(x, 1.66, z), .018);
  b.add(cyl(.38, .38, .012, 16), M(0xa98c55), T(x, 1.56, z));
  b.add(box(.03, 1.2, .03), M(0x8a6a3c), T(x + s * .36, .65, z - .1, 0, 0, s * .16));
}
function carrier(kit, b, x, z) { // 阿婆挑扁擔
  const M = kit.M;
  kit.person(b, x, z, {shirt: 0x7f6aa8, pants: 0x2f3a4a, hair: 0xb6b2aa, scale: .86});
  b.add(cyl(.012, .34, .17, 16), M(0xdcbc7c), T(x, 1.46, z), .016);
  b.add(box(1.7, .035, .035), M(0xa8843e), T(x, 1.2, z));
  for (const sd of [-1, 1]) {
    b.add(box(.012, .62, .012), M(0x6a5a3a), T(x + sd * .78, .88, z));
    b.add(cyl(.2, .15, .28, 12), M(0xc79c58), T(x + sd * .78, .42, z), .012);
    b.add(new THREE.IcosahedronGeometry(.14, 0), M(sd < 0 ? 0xe8622c : 0x69b356), T(x + sd * .78, .58, z));
  }
}
function cane(M, b, x, z, r) { // 甘蔗田
  const st = [M(0x7a5a6a), M(0x8a6a4a)], lf = [M(0x6fae4a), M(0x86bf58)];
  for (let i = 0; i < 12; i++) for (let k = 0; k < 4; k++) {
    const px = x - k * .8 + (r() - .5) * .2, pz = z - i * .72 + (r() - .5) * .2, h = 2 + r() * .7;
    b.add(cyl(.024, .032, h, 5), st[(i + k) % 2], T(px, h / 2, pz));
    for (let q = 0; q < 3; q++) b.add(leaf('palm', 1.25, .15, 50, -60), lf[q % 2], T(px, h, pz, q * 2.1 + r()));
  }
}
function fence(M, b, x, z, len) { // 竹籬笆
  const c = M(0xbfa467);
  for (let i = 0; i <= len * 2; i++) b.add(cyl(.024, .024, 1.1, 5), c, T(x, .55, z + len / 2 - i * .5));
  for (const y of [.42, .82]) b.add(box(.04, .04, len), M(0x9c8250), T(x, y, z));
}
function wall(M, b, x, y, z, w, h, d, c, o = .03) { b.add(box(w, h, d), M(c), T(x, y, z), o); }

/* ───────── 一段路 ───────── */
const PLOT_X = [RW + .75, 20, 44, 78, 130];
function chunk(kit, v, extra = null) {
  const M = kit.M, A = textures(), r = mulberry(1000 + v * 77);
  const g = new THREE.Group(), gr = kit.nb(), ob = kit.nb(), fine = kit.nb();
  const mats = [M(0xffffff, {map: A.rice}), M(0xfff1c0, {map: A.rice}), M(0xe9efb4, {map: A.rice})];
  gr.add(flat(1200, CHUNK), M(0xd2a93c), T(0, -.08, -CHUNK / 2));
  for (const side of [-1, 1]) for (let c = 0; c < PLOT_X.length - 1; c++) for (let row = 0; row < 2; row++) {
    const x0 = PLOT_X[c], x1 = PLOT_X[c + 1], w = x1 - x0;
    gr.add(flat(w, 20, 4), mats[r() * 3 | 0], T(side * (x0 + x1) / 2, 0, -10 - row * 20));
  }
  // 田埂
  const bank = M(0xa9a35a);
  for (const side of [-1, 1]) {
    for (const x of PLOT_X.slice(1)) ob.add(box(.26, .16, CHUNK), bank, T(side * x, .07, -CHUNK / 2));
    for (const z of [-.15, -20]) ob.add(box(PLOT_X[4] - PLOT_X[0], .14, .22), bank, T(side * (PLOT_X[0] + PLOT_X[4]) / 2, .07, z));
  }
  // 路面
  gr.add(flat(RW * 2, CHUNK, 6), M(0xffffff, {map: A.dirt}), T(0, .012, -CHUNK / 2));
  for (const s of [-1, 1]) {
    gr.add(flat(.62, CHUNK), M(0x98805a), T(s * RW / 3, .018, -CHUNK / 2));
    gr.add(flat(.26, CHUNK), M(0x8a7350), T(s * RW / 3, .022, -CHUNK / 2));
    gr.add(flat(.78, CHUNK), M(0x8d9c4c), T(s * (RW + .36), .016, -CHUNK / 2));
  }
  gr.into(g, {cast: false});
  // 路肩草叢
  const grass = [M(0x7ba544), M(0x93b552), M(0x689640)];
  const tuft = new THREE.IcosahedronGeometry(1, 0); tuft.scale(1, .62, 1.25);
  for (const s of [-1, 1]) for (let i = 0; i < 30; i++) {
    const R = .12 + r() * .13;
    ob.add(tuft, grass[i % 3], T(s * (RW + .05 + r() * .62), R * .4, -r() * CHUNK, r() * 3, 0, 0, R));
  }
  // 路旁幾排有體積的稻子：一排排順著路收斂，田才有高度與景深
  const rice = [M(0xe8c044), M(0xdcb038), M(0xf2cf5e), M(0xd0a430)], riceBase = M(0xbd9630);
  const headGeo = new THREE.OctahedronGeometry(1, 0); headGeo.scale(1, .78, 1.7);
  for (const s of [-1, 1]) for (let col = 0; col < 7; col++) {
    const inner = s > 0 ? RW + 2.05 : RW + 1.25;           // 右側留給水圳
    const x = s * (inner + col * .82);
    ob.add(box(.58, .42, CHUNK), riceBase, T(x, .21, -CHUNK / 2));
    for (let z = -.2; z > -CHUNK; z -= .3) {
      const R = .065 + r() * .05;
      fine.add(headGeo, rice[(r() * 4) | 0], T(x + (r() - .5) * .46, .44 + r() * .1, z + (r() - .5) * .2, (r() - .5) * .6, 0, (r() - .5) * .4, R));
    }
  }
  // 路右的水圳：一條反光的收斂線，也打破整片黃
  gr2Water(M, ob);
  // 白鷺鷥
  for (const [x, z] of [[-13, -7], [10.5, -34]].slice(0, v % 2 + 1)) egret(M, ob, x, z, r() * 6);
  // 路左一排木電線桿（線牽到下一段）
  const wood = M(0x6a4f36), wire = M(0x2c2a2a);
  const topOf = (z, s) => new V3(-5.1 + s * .62, 8.1, z);
  const span = (a, c) => {
    let p = a.clone();
    for (let i = 1; i <= 6; i++) {
      const t = i / 6, q = new V3().lerpVectors(a, c, t); q.y -= Math.sin(t * Math.PI) * .42;
      const d = new V3().subVectors(q, p), len = d.length();
      ob.add(cyl(.018, .018, len, 4), wire, new M4().compose(p.clone().add(q).multiplyScalar(.5), new Q().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()), new V3(1, 1, 1)));
      p = q;
    }
  };
  for (const z of [-6, -26]) {
    ob.add(cyl(.09, .14, 8.4, 8), wood, T(-5.1, 4.2, z), .024);
    ob.add(box(1.6, .13, .13), wood, T(-5.1, 7.95, z), .018);
    for (const s of [-1, 1]) ob.add(cyl(.05, .06, .16, 8), M(0xf3efe2), T(-5.1 + s * .62, 8.08, z), .01);
    for (const s of [-1, 1]) span(topOf(z, s), topOf(z - 20, s));
  }
  // 依段落變化的景物
  if (v === 0) { buffalo(M, ob, -15, -33, .6); farmer(kit, ob, 12.5, -21, 1); bamboo(M, ob, -11, -14, 1, r); banana(M, ob, 7.2, -9, 1.15, r); banana(M, ob, -9.6, -21, 1.05, r); hayStack(M, ob, 13, -30, 1.15); palm(M, ob, 19, -14, 1, r); farmhouse(M, ob, -32, -20, Math.PI / 2); }
  if (v === 1) { bamboo(M, ob, 15, -8, 1.1, r); carrier(kit, ob, -6.6, -30); shrine(M, ob, 5.9, -14, -Math.PI / 2); banana(M, ob, 8.6, -29, 1.1, r); banana(M, ob, -8.2, -8, 1.2, r); hayStack(M, ob, -14, -28, 1); palm(M, ob, -22, -12, 1.1, r); palm(M, ob, -26, -16, .95, r); }
  if (v === 2) { cane(M, ob, -8.5, -8, r); farmer(kit, ob, -13, -32, -1); banana(M, ob, 7.8, -6, 1, r); banana(M, ob, 11, -24, 1.2, r); hayStack(M, ob, 16, -12, 1.1); hayStack(M, ob, 20, -15, .9); farmhouse(M, ob, 36, -24, -Math.PI / 2); palm(M, ob, -17, -30, 1, r); }
  if (v === 3) { buffalo(M, ob, 13.5, -24, -2.2); bamboo(M, ob, -13, -6, 1.2, r); fence(M, ob, 6.9, -18, 12); banana(M, ob, -7.6, -24, 1.1, r); palm(M, ob, 12, -8, 1.05, r); palm(M, ob, 15, -11, .9, r); hayStack(M, ob, -13, -9, 1.2); banana(M, ob, 9, -32, 1, r); }
  extra?.(ob, gr, r);
  ob.into(g);
  const fg = new THREE.Group(); fg.name = 'fine'; fine.into(fg, {cast: false}); g.add(fg);
  return g;
}


/* ───────── 里程碑段 ───────── */
function bridgeChunk(kit) { // 石橋：一條溪橫過稻田，橋欄杆貼著路
  const M = kit.M;
  return chunk(kit, 2, (ob, gr, r) => {
    const zc = -20;
    ob.add(flat(300, 11), M(0x6fbcd0, {rough: .2}), T(0, .03, zc));
    for (const sd of [-1, 1]) ob.add(flat(300, .8), M(0x8a7a58), T(0, .035, zc + sd * 5.7));
    ob.add(flat(RW * 2 + .5, 14, 6), M(0xb6b0a0), T(0, .05, zc));
    for (const s of [-1, 1]) {
      for (let z = -13; z >= -27; z -= 2.33) { ob.add(box(.34, 1.1, .34), M(0xa6a092), T(s * (RW + .36), .55, z), .02); ob.add(box(.42, .12, .42), M(0x8d877a), T(s * (RW + .36), 1.14, z)); }
      ob.add(box(.2, .28, 14), M(0xb6b0a0), T(s * (RW + .36), .82, zc), .016);
      ob.add(box(.2, .1, 14), M(0xc4beae), T(s * (RW + .36), .44, zc));
    }
    for (const [x, z] of [[17, -18], [-24, -22]]) ob.add(new THREE.IcosahedronGeometry(.8, 0), M(0x9c978c), T(x, .2, z));
  });
}
function shrineChunk(kit) { // 大榕樹下的土地公廟
  const M = kit.M;
  return chunk(kit, 3, (ob, gr, r) => {
    const x = 8.6, z = -20;
    ob.add(flat(11, 13, 3), M(0xbeb5a0), T(x + 1.4, .03, z));
    shrine(M, ob, x, z, -Math.PI / 2);
    shrine(M, ob, x, z, -Math.PI / 2);
    ob.add(cyl(.7, 1.05, 4.2, 10), M(0x6a5038), T(x + 4.2, 2.1, z - 3.2), .03);
    for (let i = 0; i < 16; i++) ob.add(new THREE.IcosahedronGeometry(1.5 + r() * 1.2, 1), M(i % 3 ? 0x4c8f46 : 0x63a652), T(x + 4.2 + (r() - .5) * 7, 5 + r() * 3, z - 3.2 + (r() - .5) * 7), .03);
    for (let i = 0; i < 5; i++) ob.add(box(.02, 1.2 + r(), .02), M(0x6a5038), T(x + 2.3 + i * .7, 2.8, z - 1.6));
    for (const dz of [-3, 3]) { ob.add(cyl(.09, .11, 1.2, 8), M(0xa6a092), T(x - 1.8, .6, z + dz), .014); ob.add(sph(.2, 10, 8), M(0xd8362f, {unlit: true}), T(x - 1.8, 1.4, z + dz), .01); }
    ob.add(box(.03, 1.7, .03), M(0x8a6a3c), T(x - 2.3, .85, z + 4.8));
    ob.add(box(.04, .62, .9), M(0xd8362f), T(x - 2.3, 1.64, z + 4.3), .012);
  });
}
function railChunk(kit) { // 五分車平交道：甘蔗小火車停在路旁等
  const M = kit.M;
  return chunk(kit, 2, (ob, gr, r) => {
    const z = -20;
    for (const dz of [-.55, .55]) ob.add(box(280, .1, .08), M(0x6a6d70, {rough: .35, metal: .4}), T(0, .1, z + dz));
    for (let x = -130; x <= 130; x += .95) ob.add(box(.3, .08, 1.7), M(0x5c4630), T(x, .05, z));
    ob.add(flat(RW * 2 + .4, 3.6), M(0x8d8476), T(0, .065, z));
    for (const s of [-1, 1]) {
      const x = s * (RW + 1.1);
      ob.add(cyl(.06, .07, 3, 8), M(0x2a2a2a), T(x, 1.5, z + 1.8), .012);
      for (const a of [.7, -.7]) { ob.add(box(1.25, .17, .03), M(0xf2d21a), T(x, 2.9, z + 1.85, 0, 0, a), .012); for (let i = -1; i <= 1; i += 2) ob.add(box(.18, .172, .032), M(0x17181a), T(x + Math.cos(a) * i * .4, 2.9 + Math.sin(a) * i * .4, z + 1.85, 0, 0, a)); }
    }
    // 小火車：車頭加三節甘蔗車
    const tx = -24;
    ob.add(box(4.2, 1.5, 1.5), M(0x2a3a4a), T(tx, 1.15, z), .03);
    ob.add(box(2, 1, 1.5), M(0xb5322b), T(tx + 1.1, 2.3, z), .03);
    ob.add(box(2.4, .1, 1.7), M(0x24262a), T(tx + 1.1, 2.85, z));
    ob.add(cyl(.16, .2, .9, 10), M(0x24262a), T(tx - 1.4, 2.2, z), .02);
    for (const dx of [-1.4, 0, 1.4]) ob.add(cyl(.3, .3, 1.5, 12).rotateX(Math.PI / 2), M(0x18181b), T(tx + dx, .36, z));
    for (let c = 1; c <= 3; c++) {
      const cx = tx - c * 4.7;
      ob.add(box(4.2, .22, 1.6), M(0x3a3028), T(cx, .62, z), .018);
      for (const dx of [-1.3, 1.3]) ob.add(cyl(.26, .26, 1.5, 10).rotateX(Math.PI / 2), M(0x18181b), T(cx + dx, .3, z));
      for (let i = 0; i < 26; i++) ob.add(cyl(.05, .05, 3.9, 5).rotateZ(Math.PI / 2), M(i % 3 ? 0x7a5a6a : 0x8d6e58), T(cx, .8 + (i % 5) * .15, z - .6 + (i % 7) * .2));
    }
  });
}
function barnChunk(kit) { // 穀倉與曬穀場
  const M = kit.M;
  return chunk(kit, 0, (ob, gr, r) => {
    const x = -13.5, z = -20;
    ob.add(flat(13, 20), M(0xd9c47a), T(x + 1, .03, z));
    for (let i = 0; i < 12; i++) ob.add(box(11.4, .035, .12), M(0xe9c85a), T(x + 1, .05, z - 8.6 + i * 1.55));
    ob.add(box(7, 4.4, 5.6), M(0x8a6a48), T(x - 3.4, 2.2, z - 3), .04);
    ob.add(prism(6.8, 2, 7.6), M(0x6b7076), T(x - 3.4, 4.4, z - 3), .04);
    for (let i = 0; i < 6; i++) ob.add(box(.05, 4.4, .05), M(0x5f4830), T(x + .13, 2.2, z - 5.6 + i));
    ob.add(box(.06, 2, 1.7), M(0x3a2c20), T(x + .17, 1, z - 2.2));
    for (const dz of [5, 8]) { ob.add(cyl(.82, .78, .85, 12), M(0xe2bb58), T(x - 2.8, .42, z + dz), .022); ob.add(cyl(.06, .88, 1, 12), M(0xd4a944), T(x - 2.8, 1.35, z + dz), .022); }
    kit.person(ob, x + 2.4, z + 3, {shirt: 0xf0e8d6, pants: 0x4a5a6a, hair: 0x2a2522, scale: .92});
    ob.add(cyl(.012, .38, .18, 16), M(0xdcbc7c), T(x + 2.4, 1.66, z + 3), .018);
    ob.add(box(.03, 1.5, .03), M(0x8a6a3c), T(x + 2.8, .85, z + 2.8, 0, 0, -.5));
    ob.add(box(.7, .06, .08), M(0x6a5a3a), T(x + 3.35, .12, z + 2.8));
  });
}
function homeChunk(kit) { // 終點：土牆紅瓦三合院、紅布條、春聯、一家人在門口
  const M = kit.M, misc = kit.miscMat, A = kit.A;
  return chunk(kit, 1, (ob, gr, r) => {
    const x = 16, z = -26;
    ob.add(flat(26, 18, 3), M(0xd4c08a), T(x, .03, z + 1));
    ob.add(box(13, 3, 4.4), M(0xcdae78), T(x, 1.5, z - 6), .05);
    ob.add(prism(5.6, 1.9, 14), M(0xb84a30), T(x, 3, z - 6), .05);
    for (const s of [-1, 1]) {
      ob.add(box(3.6, 2.5, 8), M(0xcdae78), T(x + s * 7.3, 1.25, z), .04);
      ob.add(prism(4.6, 1.4, 8.7).rotateY(Math.PI / 2), M(0xb84a30), T(x + s * 7.3, 2.5, z), .04);
    }
    ob.add(box(1.7, 2.3, .1), M(0x4a3524), T(x, 1.15, z - 3.77));
    for (const s of [-1, 1]) { ob.add(box(.3, 1.9, .03), M(0xd8362f), T(x + s * 1.12, 1.25, z - 3.74)); ob.add(box(1.4, 1.05, .06), M(0x3a4048), T(x + s * 3.8, 1.6, z - 3.76)); }
    ob.add(box(1.5, .28, .03), M(0xd8362f), T(x, 2.5, z - 3.74));
    ob.add(box(1, 2.6, 1), M(0x8d7a62), T(x - 3.8, 4.6, z - 6), .03);
    // 跨路的竹竿紅布條
    for (const s of [-1, 1]) ob.add(cyl(.07, .09, 5.4, 8), M(0xa8843e), T(s * (RW + .7), 2.7, -22), .014);
    ob.add(box(RW * 2 + 1.4, 1, .1), M(0xc8342a), T(0, 4.8, -22), .02);
    ob.add(quad(RW * 2 + 1, .84, A.misc.uv(7)), misc, T(0, 4.8, -21.94));
    // 門口飯桌與一家人
    ob.add(cyl(.9, .9, .06, 18), M(0x8a5a35), T(x - 3, .86, z + 1), .014);
    ob.add(cyl(.09, .13, .8, 8), M(0x6a4630), T(x - 3, .44, z + 1));
    for (const [dx, dz, c] of [[-.3, -.2, 0xf4f2ea], [.25, .2, 0xe8622c], [.2, -.3, 0x69b356]]) ob.add(cyl(.16, .1, .1, 12), M(c), T(x - 3 + dx, .94, z + 1 + dz));
    kit.person(ob, x - 6.2, z + 2.6, {shirt: 0xc85a7a, pants: 0x2f3a4a, hair: 0xb6b2aa, scale: .92});
    kit.person(ob, x - 7.4, z + 3, {shirt: 0xf3f2ea, pants: 0x28456f, hair: 0x241f1c, scale: .7});
    extra2(ob, M, x, z);
  });
}
function extra2(ob, M, x, z) { for (let i = 0; i < 2; i++) ob.add(cyl(.17, .15, .35, 10), M(0xd8362f), T(x - 1.6 - i * 2.9, .2, z + 2)); }

/* ───────── 遠山（不吃霧，永遠跟著鏡頭，做出花東縱谷的兩側山脈） ───────── */
const FAR_PAL = {
  toon: [[0x9cc4d8, 0xbcdae4], [0x6fa6a6, 0x8fbfb8], [0x4f9270, 0x70ad85]],
  model: [[0xa8c4d2, 0xc4d8e0], [0x7ea5a6, 0x9abcba], [0x608f75, 0x7ca68c]],
  pixel: [[0x8ec0dc, 0xb4dcea], [0x5fa4a4, 0x84c0b4], [0x429468, 0x68b480]],
};
function farRange(style) {
  const pal = FAR_PAL[style] || FAR_PAL.toon, pos = [], col = [];
  const c = new THREE.Color(), haze = new THREE.Color(0xf6e8c4);
  const vtx = (v, hex, k, h) => { c.set(hex).multiplyScalar(k).lerp(haze, h); pos.push(...v); col.push(c.r, c.g, c.b); };
  const tri = (a, e, f, hex, k) => { vtx(a[0], hex, k, a[1]); vtx(e[0], hex, k, e[1]); vtx(f[0], hex, k, f[1]); };
  const layer = (z0, H, hex, gap, seed) => {
    const rr = mulberry(seed);
    for (let x = -1250; x < 1250;) {
      const side = Math.min(1, Math.abs(x + 20) / gap);
      const h = H * (.2 + .8 * Math.pow(side, 1.15)) * (.72 + rr() * .42);
      const w = Math.max(70, h * (1.5 + rr() * .9));
      const z = z0 - h * .22 - rr() * 5, tx = x + (rr() - .5) * w * .28, top = [[tx, h, z], .02];
      const L = [[x - w, -2, z], .5], R = [[x + w, -2, z], .5], C = [[tx + (rr() - .5) * w * .18, -2, z], .5];
      const ml = [[tx - w * .46, h * (.46 + rr() * .1), z], .22], mr = [[tx + w * .48, h * (.44 + rr() * .1), z], .22];
      tri(top, ml, C, hex, .84); tri(ml, L, C, hex, .8);
      tri(top, C, mr, hex, 1.1); tri(mr, C, R, hex, 1.04);
      x += w * (.8 + rr() * .5);
    }
  };
  layer(-830, 215, pal[0][0], 470, 3);
  layer(-690, 165, pal[1][0], 380, 7);
  layer(-560, 96, pal[2][0], 330, 11);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors: true, fog: false, side: THREE.DoubleSide}));
}
function treeLine(kit) { // 地平線那排防風林，蓋住田與山的接縫
  const b = kit.nb(), r = mulberry(91), g = new THREE.Group(), M = kit.M;
  const tones = [M(0x4e8a5a, {unlit: true}), M(0x5d9a62, {unlit: true}), M(0x447f52, {unlit: true})];
  for (let x = -640; x < 640; x += 13 + r() * 16) {
    if (Math.abs(x + 40) < 60 && r() < .75) continue;
    const s = 8 + r() * 11;
    b.add(new THREE.IcosahedronGeometry(s, 0), tones[r() * 3 | 0], T(x, s * .68, -460 - r() * 26, r() * 3));
  }
  b.into(g, {cast: false, receive: false});
  g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } });
  return g;
}
/* 終點的厝：土黃牆＋紅瓦＋煙囪＋炊煙。全路線只有這裡冒煙，是最強的「那是我家」線索 */
function homeFar(kit) {
  const M = kit.M, b = kit.nb(), g = new THREE.Group();
  b.add(box(9, 2.8, 4), M(0xcdae78), T(0, 1.4, 0), .05);
  b.add(prism(5, 1.8, 10).rotateY(Math.PI / 2 * 0), M(0xb84a30), T(0, 2.8, 0), .05);
  b.add(box(.9, 2.2, .9), M(0x8d7a62), T(-2.6, 4.1, 0), .03);
  b.add(box(1.5, 2.1, .1), M(0x4a3524), T(0, 1.05, 2.03));
  b.into(g);
  for (let i = 0; i < 18; i++) {
    const u = i / 17, s = .9 + u * u * 5.2;
    const puff = new THREE.MeshBasicMaterial({color: 0xeee8da, fog: false, transparent: true, opacity: .86 - u * .5, depthWrite: false});
    const m = new THREE.Mesh(sph(s, 10, 8), puff);
    m.position.set(-2.6 + u * u * 15 + Math.sin(i * 1.7) * u * 1.6, 5.5 + u * 40, Math.sin(i) * .6);
    g.add(m);
  }
  return g;
}

/* ───────── 組裝 ───────── */
const BUILD = {0: k => chunk(k, 0), 1: k => chunk(k, 1), 2: k => chunk(k, 2), 3: k => chunk(k, 3), bridge: bridgeChunk, shrine: shrineChunk, rail: railChunk, barn: barnChunk, home: homeChunk};
const CACHE = new WeakMap();
/** seq＝段落序列（數字＝一般田野，字串＝地標段）。回傳區塊與遠景 */
export function buildValley(kit, scene, seq = [0, 1, 2, 3]) {
  if (!CACHE.has(kit)) CACHE.set(kit, {});
  const c = CACHE.get(kit), chunks = [];
  seq.forEach((v, i) => {
    const tpl = c[v] ??= BUILD[v](kit);
    const g = tpl.clone(true);
    g.position.z = -i * CHUNK;
    scene.add(g); chunks.push(g);
  });
  // 起點後方多接一段，鏡頭往回看不會露空
  const back = (c[0] ??= BUILD[0](kit)).clone(true); back.position.z = CHUNK; scene.add(back);
  const far = new THREE.Group();
  far.add(farRange(kit.style), treeLine(kit));
  scene.add(far);
  const home = homeFar(kit);
  home.position.set(32, 0, -420); home.scale.setScalar(2.1);
  far.add(home);
  return {chunks, far, home, back};
}
/** 路上會動的物件：回傳可複製的模板 */
export function itemTemplates(kit) {
  const M = kit.M, one = fn => { const g = new THREE.Group(), b = kit.nb(); fn(b); b.into(g); return g; };
  return {rice: one(b => riceSheaf(M, b, 0, 0)), basket: one(b => basket(M, b, 0, 0))};
}
