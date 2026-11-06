// 騎遍台灣：路的形狀。
// 遊戲規則都算在「路座標」：s＝沿著路走了幾公尺、x＝離路中線多遠（右為正）。
// 這裡負責把路座標換成世界座標，所以路況、碰撞、計分的程式不用管路有沒有彎。
// 角度 th：0＝朝 -z 前進，往右轉變大。
export const CH = 40;
/** 圓環尺寸（公尺）：環道中線半徑 Rc、進出環的弧半徑 Re；路寬 14，所以環道內緣 17、外緣 31 */
export const RING = {Rc: 24, Re: 26, inner: 17, outer: 31, facade: 34};

/** 一座圓環的形狀。exit：straight＝直行穿過、left＝繞大半圈從左邊出去 */
export function ringShape(exit = 'straight') {
  const {Rc, Re} = RING, yF = Math.sqrt((Rc + Re) ** 2 - Re ** 2), alpha = Math.atan2(yF, Re);
  const sweep = 2 * alpha + (exit === 'left' ? Math.PI / 2 : 0);
  const fil = Re * alpha, arc = Rc * sweep, core = 2 * fil + arc, n = Math.ceil((core + 14) / CH), len = n * CH, lead = (len - core) / 2;
  return {exit, n, len, lead, fil, arc, yF, alpha, sweep, centerZ: -(lead + yF), t1: lead + fil, t2: lead + fil + arc};
}
export function ringKappa(shape, u) {   // u＝進圓環區段後第幾公尺
  const {lead, fil, arc} = shape, {Rc, Re} = RING;
  if (u < lead) return 0;
  if (u < lead + fil) return 1 / Re;
  if (u < lead + fil + arc) return -1 / Rc;
  if (u < lead + fil + arc + fil) return 1 / Re;
  return 0;
}
/** 一段彎道的曲率：頭尾各留兩成慢慢轉，中間定值 */
export function bendKappa(deg, len, u) {
  const rad = deg * Math.PI / 180, km = rad / (.8 * len), t = u / len;
  return km * Math.max(0, Math.min(1, t / .2, (1 - t) / .2));
}
/** 把路線表攤開成一格一格（每格 40 公尺）。seq 一項：[模板, 路名, {turn, n} 或 {exit}] */
export function expandSeq(seq) {
  const out = [];
  for (const [k, name, opt] of seq) {
    if (k === 'round') {
      const shape = ringShape(opt?.exit);
      for (let j = 0; j < shape.n; j++) out.push({k, name: j === 0 ? name : '', ring: shape, j});
    } else if (opt?.turn) {
      const n = opt.n || 1;
      for (let j = 0; j < n; j++) out.push({k, name: j === 0 ? name : '', bend: {deg: opt.turn, n, j}});
    } else out.push({k, name});
  }
  return out;
}
export function routeStats(seq) {
  const cells = expandSeq(seq);
  return {km: cells.length * CH / 1000, cells: cells.length, bends: seq.filter(e => e[2]?.turn).length, rounds: seq.filter(e => e[0] === 'round').length};
}
/** 路的本體：一格一格積分出中線，之後隨時查 */
export function buildRoad(cells, tailCells = 0) {
  const total = (cells.length + tailCells) * CH, STEP = .5, n = Math.ceil(total / STEP) + 2;
  const X = new Float64Array(n), Z = new Float64Array(n), TH = new Float64Array(n), K = new Float32Array(n);
  const spans = [];   // 每段有彎的路段
  cells.forEach((c, i) => {
    const a = i * CH;
    if (c.ring && c.j === 0) spans.push({a, len: c.ring.len, kap: u => ringKappa(c.ring, u), ring: c.ring});
    else if (c.bend && c.bend.j === 0) { const L = c.bend.n * CH; spans.push({a, len: L, kap: u => bendKappa(c.bend.deg, L, u), bend: c.bend}); }
  });
  const curved = spans.length > 0;
  if (curved) {
    // 每 0.5 公尺存一筆，但用 0.05 公尺細算，弧線接弧線的地方才不會累積誤差
    let si = 0, x = 0, z = 0, th = 0;
    const SUB = 10, ds = STEP / SUB;
    for (let i = 1; i < n; i++) {
      for (let q = 0; q < SUB; q++) {
        const s = (i - 1 + (q + .5) / SUB) * STEP;
        while (si < spans.length && s >= spans[si].a + spans[si].len) si++;
        const sp = spans[si], k = sp && s >= sp.a ? sp.kap(s - sp.a) : 0, mid = th + k * ds / 2;
        x += Math.sin(mid) * ds; z -= Math.cos(mid) * ds; th += k * ds;
        if (q === SUB / 2) K[i] = k;
      }
      X[i] = x; Z[i] = z; TH[i] = th;
    }
  }
  const P = {x: 0, z: 0, th: 0, c: 1, s: 0};
  function at(s) {
    if (!curved) { P.x = 0; P.z = -s; P.th = 0; P.c = 1; P.s = 0; return P; }
    const f = s / STEP;
    if (f <= 0) { P.th = 0; P.x = 0; P.z = -s; }
    else if (f >= n - 1) { const th = TH[n - 1], d = s - (n - 1) * STEP; P.th = th; P.x = X[n - 1] + Math.sin(th) * d; P.z = Z[n - 1] - Math.cos(th) * d; }
    else { const i = f | 0, u = f - i; P.x = X[i] + (X[i + 1] - X[i]) * u; P.z = Z[i] + (Z[i + 1] - Z[i]) * u; P.th = TH[i] + (TH[i + 1] - TH[i]) * u; }
    P.c = Math.cos(P.th); P.s = Math.sin(P.th);
    return P;
  }
  const W = {x: 0, z: 0, th: 0};
  /** 路座標 → 世界座標（回傳共用物件，要留著就自己抄） */
  function map(x, s) { const p = at(s); W.x = p.x + x * p.c; W.z = p.z + x * p.s; W.th = p.th; return W; }
  function kappa(s) { if (!curved) return 0; const i = Math.round(s / STEP); return i > 0 && i < n ? K[i] : 0; }
  const rings = spans.filter(sp => sp.ring).map(sp => {
    const sh = sp.ring, p = at(sp.a), a = sp.a, {c, s} = p, px = p.x, pz = p.z, cz = sh.centerZ;
    return {a, shape: sh, end: a + sh.len, t1: a + sh.t1, t2: a + sh.t2, cx: px - cz * s, cz: pz + cz * c};
  });
  const bends = spans.filter(sp => sp.bend).map(sp => ({a: sp.a, len: sp.len, deg: sp.bend.deg}));
  return {at, map, kappa, curved, rings, bends, total, inRing: s => rings.some(r => s > r.a + r.shape.lead && s < r.end - r.shape.lead)};
}

/* ───────── 把直直的路段彎成曲線（做一次就存起來） ───────── */
/** 太長的三角形切細，不然彎起來只會是一條直線。只按 z 方向切：同一條邊一定切在同樣的點，不會裂開 */
export function tessellate(THREE, geo, maxDz = 2) {
  const g = geo.index ? geo.toNonIndexed() : geo, names = ['position', ...Object.keys(g.attributes).filter(k => k !== 'position')];
  const sizes = names.map(k => g.attributes[k].itemSize), src = names.map(k => g.attributes[k].array), count = g.attributes.position.count, Pz = src[0];
  const out = names.map(() => []);
  const copy = i => { for (let a = 0; a < names.length; a++) { const sz = sizes[a], arr = src[a], o = out[a], base = i * sz; for (let j = 0; j < sz; j++) o.push(arr[base + j]); } };
  const vert = i => names.map((_, a) => { const sz = sizes[a], v = new Array(sz); for (let j = 0; j < sz; j++) v[j] = src[a][i * sz + j]; return v; });
  const mid = (p, q) => p.map((pa, a) => pa.map((v, j) => (v + q[a][j]) / 2));
  const Z = v => v[0][2];
  const emit = (p, q, r) => { for (const v of [p, q, r]) v.forEach((vals, a) => { for (const x of vals) out[a].push(x); }); };
  const stack = [];
  for (let t = 0; t < count; t += 3) {
    const z0 = Pz[t * 3 + 2], z1 = Pz[t * 3 + 5], z2 = Pz[t * 3 + 8];
    if (Math.max(z0, z1, z2) - Math.min(z0, z1, z2) <= maxDz) { copy(t); copy(t + 1); copy(t + 2); continue; }
    stack.push([vert(t), vert(t + 1), vert(t + 2)]);
    while (stack.length) {
      const [p, q, r] = stack.pop(), a = Math.abs(Z(p) - Z(q)), b = Math.abs(Z(q) - Z(r)), c = Math.abs(Z(r) - Z(p)), big = Math.max(a, b, c);
      if (big <= maxDz) { emit(p, q, r); continue; }
      if (a === big) { const m = mid(p, q); stack.push([p, m, r], [m, q, r]); }
      else if (b === big) { const m = mid(q, r); stack.push([p, q, m], [p, m, r]); }
      else { const m = mid(r, p); stack.push([p, q, m], [m, q, r]); }
    }
  }
  const res = new THREE.BufferGeometry();
  names.forEach((k, a) => res.setAttribute(k, new THREE.BufferAttribute(new Float32Array(out[a]), sizes[a])));
  return res;
}
/** f(x, z) 回傳新位置與法線旋轉：{x, z, c, s}，法線 (nx, nz) → (nx c − nz s, nx s + nz c) */
export function warpGeometry(geo, f) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const r = f(pos.getX(i), pos.getZ(i));
    pos.setX(i, r.x); pos.setZ(i, r.z);
    if (nor) { const nx = nor.getX(i), nz = nor.getZ(i); nor.setX(i, nx * r.c - nz * r.s); nor.setZ(i, nx * r.s + nz * r.c); }
  }
  pos.needsUpdate = true; if (nor) nor.needsUpdate = true;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
/** 複製一組物件並把所有網格彎過去 */
export function bakeGroup(THREE, src, f, maxDz = 2) {
  const g = src.clone(true), seen = new Map();
  g.updateMatrixWorld(true);
  const rootInv = g.matrixWorld.clone().invert();
  g.traverse(o => {
    if (!o.isMesh) return;
    const m = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld), key = o.geometry.uuid + m.elements.join();
    if (!seen.has(key)) {
      const base = o.geometry.clone(); base.applyMatrix4(m);
      seen.set(key, warpGeometry(tessellate(THREE, base, maxDz), f));
    }
    o.geometry = seen.get(key);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
  });
  // 網格已經烤進最外層座標，路徑上的群組也要歸零
  g.traverse(o => { if (o !== g && !o.isMesh) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); } });
  return g;
}
/** 依曲率函式積分出區段內的中線，給 warp 用。回傳 f(x, z) */
export function trackWarp(kap, len) {
  const STEP = .25, n = Math.ceil(len / STEP) + 2, X = new Float64Array(n), Z = new Float64Array(n), TH = new Float64Array(n);
  let ax = 0, az = 0, ath = 0;
  const SUB = 5, ds = STEP / SUB;
  for (let i = 1; i < n; i++) {
    for (let q = 0; q < SUB; q++) { const k = kap((i - 1 + (q + .5) / SUB) * STEP), mid = ath + k * ds / 2; ax += Math.sin(mid) * ds; az -= Math.cos(mid) * ds; ath += k * ds; }
    X[i] = ax; Z[i] = az; TH[i] = ath;
  }
  const r = {x: 0, z: 0, c: 1, s: 0};
  return (x, z) => {
    const s = -z, f = Math.max(0, Math.min(n - 1.001, s / STEP)), i = f | 0, u = f - i, th = TH[i] + (TH[i + 1] - TH[i]) * u;
    const over = s - f * STEP, c = Math.cos(th), sn = Math.sin(th);   // 超出區段就順著切線延伸
    r.x = X[i] + (X[i + 1] - X[i]) * u + Math.sin(th) * over + x * c;
    r.z = Z[i] + (Z[i + 1] - Z[i]) * u - Math.cos(th) * over + x * sn;
    r.c = c; r.s = sn;
    return r;
  };
}
/** 把一段路邊建築繞著圓環排：x 變半徑、z 變角度 */
export function polarWarp(phiStart, rRoad = RING.Rc, rFacade = RING.facade) {
  const r = {x: 0, z: 0, c: 1, s: 0};
  return (x, z) => {
    const phi = phiStart + (-z) / rFacade, R = rRoad + x, c = Math.cos(phi), s = Math.sin(phi);
    r.x = R * c; r.z = -R * s; r.c = c; r.s = -s;
    return r;
  };
}
