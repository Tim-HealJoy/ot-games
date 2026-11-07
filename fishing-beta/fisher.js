/* 阿伯與釣竿的動作。
   身體是零件（腿、軀幹、頭、拳頭），手臂由程式畫，雙手一定握在竿上；竿子是一條會受力彎曲的彈性桿。
   所有會動的量都用彈簧追目標，不瞬間改變。物理與繪圖分開，物理可以在 node 測。
   座標：遊戲虛擬畫面 1920×1080。角度：lean、head 正值往前（順時針），th 正值竿子往上。 */
const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const qb = (a, c, b, t) => { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; };
const easeOut = (t) => 1 - (1 - t) * (1 - t);

export const RIG = {
  hip: { x: 219, y: 240 }, legsAt: { x: 219, y: 292.5 },
  shNear: { x: 200, y: 179 }, shFar: { x: 232, y: 175 }, neck: { x: 218, y: 152 },
  upper: 66, fore: 68, rUpper: [15.5, 12.5], rFore: [12.5, 10],
  /* 後手的軌跡：大腿上 → 胸口到下巴前，繞著肩膀走一段弧 */
  rearLow: { x: 278, y: 232 }, rearMid: { x: 270, y: 186 }, rearHigh: { x: 290, y: 146 },
  rearToButt: 28, frontGap: 57,
  rodLen: 745, thLow: 3 * DEG, thHigh: 14 * DEG, thHooked: 20 * DEG,
  bendSelf: 0.24, bendLoad: 0.52,
  hang: 56, floatDist: 268, hookLift: 40,
  rodSeg: 24,
};

/* 半隱式彈簧：w 是頻率（rad/s），z 是阻尼比 */
function spring(o, k, target, w, z, dt) {
  const vk = `${k}V`;
  o[vk] += (w * w * (target - o[k]) - 2 * z * w * o[vk]) * dt;
  o[k] += o[vk] * dt;
}
const rot = (p, piv, a) => {
  const c = Math.cos(a), s = Math.sin(a), dx = p.x - piv.x, dy = p.y - piv.y;
  return { x: piv.x + dx * c - dy * s, y: piv.y + dx * s + dy * c };
};
/* 兩節手臂的逆運動學：手肘一律往下、往後垂 */
export function ik(S, H, a, b) {
  const dx = H.x - S.x, dy = H.y - S.y, raw = Math.hypot(dx, dy), d = Math.min(raw, a + b - 0.01);
  const ang = Math.atan2(dy, dx);
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d || 1), -1, 1);
  const e = ang + Math.acos(cosA);
  return { elbow: { x: S.x + Math.cos(e) * a, y: S.y + Math.sin(e) * a }, stretched: raw > a + b - 0.01 };
}
/* 魚咬鉤時的抖動：一陣一陣，不是固定節拍 */
function nibble(now) {
  const t = now / 1000, env = Math.max(0, Math.sin(t * 2.3) + Math.sin(t * 3.7 + 1) * 0.6 - 0.1);
  return Math.sin(t * 34) * Math.min(1, env * 1.4);
}

export class FisherRig {
  constructor(lay) { this.lay = lay; this.reset(); }

  reset() {
    Object.assign(this, {
      lift: 0, liftV: 0, lean: 0, leanV: 0, head: 0, headV: 0,
      th: RIG.thLow, thV: 0, bend: RIG.bendSelf, bendV: 0, swing: 0, swingV: 0,
      hook: { x: this.lay.hookX, y: this.lay.hookY }, hookVy: 0, h0: { x: this.lay.hookX, y: this.lay.hookY },
      st: null, reel: 0, lineLen: 0, face: 'smile', faceUntil: 0, plop: false, nib: 0, slack: 0,
    });
    this.solve();
    this.tipPrev = { ...this.tip }; this.tipVx = 0; this.lineLen = Math.hypot(this.tip.x - this.hook.x, this.tip.y - this.hook.y);
    this.floatAt(0);
  }

  /* 有揮手但沒釣到東西，竿子也要有反應 */
  kick() { this.bendV += 1.4; }

  enter(st, { load, dir, good }, now) {
    if (st === 'hooked') {
      this.h0 = { ...this.hook };
      const q = 0.5 + load * 0.5;
      this.leanV -= 1.0 * q;      /* 身體往後一仰 */
      this.headV += 0.9 * q;      /* 頭慢半拍 */
      this.bendV += 3.2 * q;      /* 竿子被魚往下扯 */
      this.swingV = (dir || 1) * -1.4;
      this.setFace('effort', now, 200);
    }
    if (st === 'bank') { this.hookVy = 0; this.bendV -= 1.2; }  /* 魚離開，竿子回彈 */
    if (st === 'escape') { this.setFace('sad', now, 1000); this.bendV -= 0.6; }  /* 魚跑了，線一鬆竿子彈回來 */
    if (st === 'bank' && !good) this.setFace('sad', now, 500);
  }
  setFace(f, now, ms = 0) { this.face = f; this.faceUntil = now + ms; }

  step(dt, inp) {
    const { s = 0, st = null, load = 0, fishLike = false, fly = 1, good = true, dir = 1, now = 0 } = inp;
    if (st !== this.st) { this.enter(st, { load, dir, good }, now); this.st = st; }
    const hooked = st === 'hooked', bite = st === 'bite';
    this.nib = bite && fishLike ? nibble(now) : 0;
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const drift = 0.006 * Math.sin(now / 1700) + 0.004 * Math.sin(now / 730 + 1);
      spring(this, 'lift', clamp(s) + drift, 22, 0.9, h);
      const thLift = lerp(RIG.thLow, RIG.thHigh, clamp(this.lift));
      const thT = (hooked ? Math.max(RIG.thHooked, thLift) : thLift) - (bite && fishLike ? 1.2 * DEG : 0);
      spring(this, 'th', thT, 13, 0.75, h);
      const bendT = RIG.bendSelf
        + (hooked ? RIG.bendLoad * load * (fly < 1 ? 1.25 : 1) : 0)
        + (bite && fishLike ? 0.1 + 0.09 * this.nib : 0)
        + clamp(this.liftV * 0.09, -0.1, 0.22);
      spring(this, 'bend', bendT, 17, 0.16, h);
      const leanT = -0.14 * clamp(this.lift) + (bite ? 0.05 : 0) + (hooked ? -0.02 : 0) + 0.006 * Math.sin(now / 1400);
      spring(this, 'lean', leanT, 8.5, 0.55, h);
      const look = hooked ? (good ? -0.13 : 0.03) : bite ? 0.06 : st === 'escape' ? 0.13 : 0.02;
      spring(this, 'head', -this.lean * 0.55 + look, 7, 0.55, h);
      /* 掛在竿尖的魚像鐘擺：竿尖一動就晃 */
      this.swingV += (-36 * Math.sin(this.swing) - 2 * 0.12 * 6 * this.swingV - this.tipVa * 0.0035) * h;
      this.swing = clamp(this.swing + this.swingV * h, -0.55, 0.55);
    }
    this.solve();
    const vx = (this.tip.x - this.tipPrev.x) / Math.max(dt, 1e-3);
    this.tipVa = clamp((vx - this.tipVx) / Math.max(dt, 1e-3), -6000, 6000);
    this.tipVx = vx; this.tipPrev = { ...this.tip };
    this.stepHook(dt, { st, fly });
    this.stepFace(st, good, now, hooked);
    this.floatAt(now, bite, fishLike);
    const len = Math.hypot(this.tip.x - this.hook.x, this.tip.y - this.hook.y);
    this.reel += (this.lineLen - len) * 0.06; this.lineLen = len;
  }

  stepHook(dt, { st, fly }) {
    const { lay, hook, tip } = this;
    if (st === 'hooked') {
      /* 收線上來，到位後變成掛在竿尖 */
      const e = easeOut(clamp(fly)), hx = tip.x + Math.sin(this.swing) * RIG.hang, hy = tip.y + Math.cos(this.swing) * RIG.hang;
      hook.x = lerp(this.h0.x, hx, e); hook.y = lerp(this.h0.y, hy, e); this.hookVy = 0; this.slack = 0;
      return;
    }
    const ty = lay.hookY - clamp(this.lift) * RIG.hookLift;
    if (hook.y < ty - 2) {
      /* 鉤子掉回水裡：空中快、水裡慢，碰到水面濺一下 */
      const inWater = hook.y > lay.water, was = hook.y;
      this.hookVy = Math.min(this.hookVy + 2400 * dt, inWater ? 800 : 1500);
      hook.y = Math.min(ty, hook.y + this.hookVy * dt);
      if (was < lay.water && hook.y >= lay.water) this.plop = true;
      this.slack = clamp((ty - hook.y) / 500);
    } else {
      this.hookVy = 0; this.slack = 0;
      hook.y += (ty - hook.y) * (1 - Math.exp(-dt * 14));
    }
    hook.x += (lay.hookX - hook.x) * (1 - Math.exp(-dt * 5));
  }

  stepFace(st, good, now, hooked) {
    if (now < this.faceUntil) return;
    if (hooked) this.face = good ? 'joy' : 'sad';
    else if (st === 'bank') this.face = good ? 'joy' : 'sad';
    else if (this.liftV > 1.1) this.face = 'effort';
    else this.face = 'smile';
  }

  /* 浮標：鉤子在水裡時浮在水面；線收短時沿著線被帶上來 */
  floatAt(now, bite = false, fishLike = false) {
    const { hook, tip, lay } = this;
    const dx = tip.x - hook.x, dy = tip.y - hook.y, len = Math.hypot(dx, dy) || 1;
    const d = Math.min(RIG.floatDist, len * 0.62);
    let bx = hook.x + (dx / len) * d, by = hook.y + (dy / len) * d;
    const dip = bite ? (fishLike ? 22 + 14 * this.nib : 12) : 0;
    const surface = lay.water + Math.sin(now / 520) * 4 + dip;
    if (hook.y > surface && by > surface) { const t = (hook.y - surface) / Math.max(1, hook.y - tip.y); bx = lerp(hook.x, tip.x, t); by = surface; }
    this.float = { x: bx, y: by };
  }

  /* 由目前的狀態算出每個關節與竿子的位置 */
  solve() {
    const { hip, shNear, shFar, neck, rearLow: L, rearMid: M, rearHigh: H, rearToButt, frontGap, rodLen, rodSeg, upper, fore } = RIG;
    const t = clamp(this.lift), a = this.lean;
    const sN = rot(shNear, hip, a), sF = rot(shFar, hip, a), nk = rot(neck, hip, a);
    const rear = { x: qb(L.x, M.x, H.x, t) + (sN.x - shNear.x) * 0.5, y: qb(L.y, M.y, H.y, t) + (sN.y - shNear.y) * 0.5 };
    const cth = Math.cos(this.th), sth = Math.sin(this.th);
    const butt = { x: rear.x - rearToButt * cth, y: rear.y + rearToButt * sth };
    /* 竿子：靠手的地方硬、越往前越軟，往上拱再往下彎 */
    const pts = [{ ...butt }], ds = rodLen / rodSeg;
    let x = butt.x, y = butt.y;
    for (let i = 0; i < rodSeg; i++) {
      const u = (i + 0.5) / rodSeg, g = this.th - this.bend * u * u;
      x += Math.cos(g) * ds; y -= Math.sin(g) * ds; pts.push({ x, y });
    }
    const onRod = (dist) => { const f = dist / ds, i = Math.min(rodSeg - 1, Math.floor(f)), k = f - i; return { x: lerp(pts[i].x, pts[i + 1].x, k), y: lerp(pts[i].y, pts[i + 1].y, k) }; };
    const handN = onRod(rearToButt), handF = onRod(rearToButt + frontGap);
    const armN = ik(sN, handN, upper, fore), armF = ik(sF, handF, upper, fore);
    this.joint = { sN, sF, neck: nk, handN, handF, elN: armN.elbow, elF: armF.elbow, stretched: armN.stretched || armF.stretched };
    this.rod = pts; this.tip = pts[rodSeg];
    if (this.tipVa === undefined) this.tipVa = 0;
  }
}

/* ========== 繪圖 ========== */
const SKIN = '#FDB978', INK = '#1C0300', STICK = '#FFFFFF', OUT = 3, STK = 2.6;

function capsule(ctx, a, b, ra, rb) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath(); ctx.arc(a.x, a.y, ra, ang + Math.PI / 2, ang - Math.PI / 2); ctx.arc(b.x, b.y, rb, ang - Math.PI / 2, ang + Math.PI / 2); ctx.closePath(); ctx.fill();
}
function armFill(ctx, S, E, H, grow, color) {
  ctx.fillStyle = color;
  capsule(ctx, S, E, RIG.rUpper[0] + grow, RIG.rUpper[1] + grow);
  capsule(ctx, E, H, RIG.rFore[0] + grow, RIG.rFore[1] + grow);
}
/* 零件依身體關節擺放。k＝零件像素換算遊戲像素 */
function place(ctx, part, img, at, ang, sticker) {
  const { pivot, k } = part;
  ctx.save(); ctx.translate(at.x, at.y); if (ang) ctx.rotate(ang); ctx.scale(k, k);
  if (sticker) ctx.drawImage(sticker.cv, -pivot[0] - sticker.pad, -pivot[1] - sticker.pad);
  else ctx.drawImage(img, -pivot[0], -pivot[1]);
  ctx.restore();
}
/* 白色貼紙邊：把零件外擴成白色剪影，先全部畫一次，顏色再蓋上去，接縫就不會有白線 */
export function makeSticker(img, r) {
  const pad = Math.ceil(r) + 1, cv = document.createElement('canvas'); cv.width = img.width + pad * 2; cv.height = img.height + pad * 2;
  const c = cv.getContext('2d');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.drawImage(img, pad + Math.cos(a) * r, pad + Math.sin(a) * r); }
  c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
  return { cv, pad };
}
function drawRod(ctx, rig) {
  const pts = rig.rod, n = pts.length - 1, w = (u) => lerp(10.5, 3.6, u);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3B2410';
  for (let i = 0; i < n; i++) { ctx.lineWidth = w(i / n) + 5.5; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke(); }
  for (let i = 0; i < n; i++) {
    const u = i / n; ctx.lineWidth = w(u);
    ctx.strokeStyle = u < 0.16 ? '#4A3426' : u > 0.74 ? '#E0B56A' : '#B9823F';
    ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
  }
  /* 竿上的線圈與節 */
  ctx.strokeStyle = '#3B2410'; ctx.lineWidth = 3;
  for (const u of [0.3, 0.46, 0.6, 0.74, 0.86, 0.95]) {
    const i = Math.round(u * n), a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l, r = w(u) / 2 + 2;
    ctx.beginPath(); ctx.moveTo(pts[i].x - nx * r, pts[i].y - ny * r); ctx.lineTo(pts[i].x + nx * r, pts[i].y + ny * r); ctx.stroke();
  }
}
function drawReel(ctx, rig) {
  const { handN, handF } = rig.joint, cx = (handN.x + handF.x) / 2 + 3, cy = (handN.y + handF.y) / 2 + 22, r = 15;
  ctx.strokeStyle = '#3B2410'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo((handN.x + handF.x) / 2, (handN.y + handF.y) / 2); ctx.lineTo(cx, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = '#C9D3D8'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = '#51616B'; ctx.beginPath();
  for (let i = 0; i < 2; i++) { const a = rig.reel + (i * Math.PI) / 2; ctx.moveTo(cx - Math.cos(a) * (r - 4), cy - Math.sin(a) * (r - 4)); ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); }
  ctx.stroke();
}
/* A＝{parts,img,sticker}。層次：遠手 → 腿 → 軀幹 → 頭 → 竿 → 近手 */
export function drawFisher(ctx, rig, A) {
  const j = rig.joint, P = A.parts, bodyA = rig.lean, headA = rig.lean + rig.head, headName = `head_${rig.face}`;
  const foreAng = (E, H) => Math.atan2(H.y - E.y, H.x - E.x);
  const items = [
    ['legs', RIG.legsAt, 0],
    ['torso', RIG.hip, bodyA],
    [headName, j.neck, headA],
    ['fist', j.handF, foreAng(j.elF, j.handF)],
    ['fist', j.handN, foreAng(j.elN, j.handN)],
  ];
  /* 白邊 */
  armFill(ctx, j.sF, j.elF, j.handF, OUT + STK, STICK);
  armFill(ctx, j.sN, j.elN, j.handN, OUT + STK, STICK);
  for (const [n, at, ang] of items) place(ctx, P[n], A.img[n], at, ang, A.sticker[n]);
  /* 遠手 */
  armFill(ctx, j.sF, j.elF, j.handF, OUT, INK); armFill(ctx, j.sF, j.elF, j.handF, 0, SKIN);
  place(ctx, P.fist, A.img.fist, j.handF, foreAng(j.elF, j.handF));
  place(ctx, P.legs, A.img.legs, RIG.legsAt, 0);
  place(ctx, P.torso, A.img.torso, RIG.hip, bodyA);
  place(ctx, P[headName], A.img[headName], j.neck, headA);
  drawRod(ctx, rig);
  drawReel(ctx, rig);
  /* 近手 */
  armFill(ctx, j.sN, j.elN, j.handN, OUT, INK); armFill(ctx, j.sN, j.elN, j.handN, 0, SKIN);
  place(ctx, P.fist, A.img.fist, j.handN, foreAng(j.elN, j.handN));
}
/* 釣線：鉤子往下掉時有一點鬆，其他時候是繃直的 */
export function drawLine(ctx, rig, to) {
  const a = rig.tip, b = to, sag = rig.slack * 34, mx = (a.x + b.x) / 2 + sag, my = (a.y + b.y) / 2;
  for (const [c, lw] of [['rgba(10,30,45,.75)', 6], ['#fff', 3]]) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke();
  }
}
