// 騎遍台灣：人和動物怎麼動（走路、讓路、被撞倒再爬起來）。模型在 world.js（makeRig 等），這裡只管動作。
// 原則：姿勢不瞬間跳，全部用彈簧或緩動接過去；倒下用重力加速、觸地彈一下；動物各走各的步伐，不排成一直線。
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
/** 往目標靠近，rate 越大越快；和每秒幾格無關 */
export const follow = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
/** 道路上的方向（x 往右、z 往後）換成物件自己的方向 */
export function toLocal(wx, wz, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [wx * c - wz * s, wx * s + wz * c]; }

export const newPose = () => ({ph: Math.random() * 6, amp: 0, fall: null});

/** 走路：腳前後擺、手反向擺、身體一上一下。speed＝每秒幾公尺，0 就慢慢停下。opt 可以固定手的姿勢（扛扁擔、拿竹竿） */
export function walkPose(rig, st, dt, speed, opt = {}) {
  const r = rig.userData.rig;
  st.amp = follow(st.amp, clamp(speed / 1.1, 0, 1.25), 6, dt);
  st.ph += dt * speed / (.6 * r.k) * Math.PI;
  const A = .4 * st.amp, s = Math.sin(st.ph);
  r.legL.rotation.x = follow(r.legL.rotation.x, s * A, 18, dt);
  r.legR.rotation.x = follow(r.legR.rotation.x, -s * A, 18, dt);
  r.armL.rotation.x = follow(r.armL.rotation.x, opt.armL ?? -s * A * .75, 12, dt);
  r.armR.rotation.x = follow(r.armR.rotation.x, opt.armR ?? s * A * .75, 12, dt);
  r.armL.rotation.z = follow(r.armL.rotation.z, opt.armLz ?? 0, 10, dt);
  r.armR.rotation.z = follow(r.armR.rotation.z, opt.armRz ?? 0, 10, dt);
  r.upper.rotation.x = follow(r.upper.rotation.x, opt.lean ?? .05 * st.amp, 8, dt);
  r.upper.rotation.y = follow(r.upper.rotation.y, Math.sin(st.ph) * .07 * st.amp, 10, dt);
  r.face.position.y = Math.abs(Math.cos(st.ph)) * .035 * st.amp * r.k;
}

/* ─── 被撞倒：先往後仰一下，越倒越快，觸地彈一下，躺一下，慢慢爬起來，拍拍衣服 ─── */
const T1 = .5, T2 = .74, T3 = 2.4, T4 = 3.5, T5 = 4.1, LIE = Math.PI / 2 - .05;
export const FALL_TIME = T5;
/** dx、dz＝被推出去的方向（人自己的座標） */
export function knock(st, dx, dz) {
  const n = Math.hypot(dx, dz) || 1;
  st.fall = {t: 0, axis: new THREE.Vector3(dz / n, 0, -dx / n).normalize()};
}
/** 倒地動畫；回傳還在不在倒地或爬起來 */
export function fallPose(rig, st, dt) {
  const f = st.fall; if (!f) return false;
  const r = rig.userData.rig; f.t += dt; const u = f.t;
  let th;
  if (u < T1) th = LIE * (u / T1) ** 2;
  else if (u < T2) th = LIE - .16 * Math.sin(Math.PI * (u - T1) / (T2 - T1));
  else if (u < T3) th = LIE;
  else th = LIE * (1 - smooth((u - T3) / (T4 - T3)));
  r.tip.quaternion.setFromAxisAngle(f.axis, th);
  r.tip.position.y = Math.sin(th) * .14 * r.k;   // 躺下時身體有厚度，不陷進地裡
  r.face.position.y = follow(r.face.position.y, 0, 10, dt);
  const fling = u < T2 ? smooth(u / .3) : u < T3 ? 1 - smooth((u - T2) / .6) : u < T4 ? .7 * Math.sin(Math.PI * (u - T3) / (T4 - T3)) : 0;
  r.armL.rotation.z = follow(r.armL.rotation.z, -1.25 * fling, 16, dt);
  r.armR.rotation.z = follow(r.armR.rotation.z, 1.25 * fling, 16, dt);
  const brush = u > T4;
  r.armL.rotation.x = follow(r.armL.rotation.x, u < T2 ? -.6 : 0, 10, dt);
  r.armR.rotation.x = follow(r.armR.rotation.x, brush ? .75 + .3 * Math.sin(u * 26) : u < T2 ? -.6 : 0, 14, dt);
  const bend = u < .22 ? -.4 * Math.sin(Math.PI * u / .22) : u > T3 && u < T4 ? .55 * Math.sin(Math.PI * (u - T3) / (T4 - T3)) : brush ? .2 : 0;
  r.upper.rotation.x = follow(r.upper.rotation.x, bend, 12, dt);
  r.upper.rotation.y = follow(r.upper.rotation.y, 0, 8, dt);
  const knee = u > T1 && u < T3 ? .3 : u > T3 && u < T4 ? .5 * Math.sin(Math.PI * (u - T3) / (T4 - T3)) : 0;
  r.legL.rotation.x = follow(r.legL.rotation.x, knee, 8, dt);
  r.legR.rotation.x = follow(r.legR.rotation.x, -knee * .4, 8, dt);
  if (u >= T5) { st.fall = null; r.tip.quaternion.identity(); r.tip.position.y = 0; return false; }
  return true;
}

/** 扁擔：跟著腳步上下，兩頭比肩膀慢一拍，會彎也會彈回來；竹簍吊著前後晃，往旁邊走時往外甩 */
export function poleSway(pole, st, dt, side = 0) {
  const p = pole.userData.pole, a = st.amp;
  const bend = .05 + .05 * a * Math.sin(2 * st.ph - 1.1);
  p.F.h.rotation.x = follow(p.F.h.rotation.x, -bend, 20, dt);
  p.B.h.rotation.x = follow(p.B.h.rotation.x, bend, 20, dt);
  const sw = .1 * a * Math.sin(st.ph - .6);
  for (const q of [p.F, p.B]) {
    q.hang.rotation.x = follow(q.hang.rotation.x, sw - q.h.rotation.x, 9, dt);
    q.hang.rotation.z = follow(q.hang.rotation.z, -side * .25, 4, dt);
  }
}

/** 鴨子：左右搖著走，頭一伸一縮；flap＞0 時拍翅膀 */
export function duckPose(d, st, dt, speed, flap) {
  const u = d.userData.duck;
  st.ph += dt * (6 + speed * 5);
  u.bodyG.rotation.z = Math.sin(st.ph) * .16 * clamp(speed + .25, 0, 1.2);
  u.bodyG.position.y = Math.abs(Math.sin(st.ph)) * .03;
  u.head.position.z = -.17 - .035 * Math.sin(st.ph * 2);
  st.w = (st.w || 0) + dt * 26;
  const w = flap > 0 ? .3 + 1.1 * Math.abs(Math.sin(st.w)) : 0;
  u.wL.rotation.z = follow(u.wL.rotation.z, -w, 22, dt);
  u.wR.rotation.z = follow(u.wR.rotation.z, w, 22, dt);
}

/** 水牛：對角的腳一起動、身體微晃、尾巴甩；startle＞0 時頭往上一甩 */
export function buffaloPose(b, st, dt, speed, startle) {
  const u = b.userData.buffalo;
  st.amp = follow(st.amp || 0, clamp(speed / .8, 0, 1.2), 4, dt);
  st.ph = (st.ph || 0) + dt * speed / .9 * Math.PI;
  const A = .32 * st.amp, s = Math.sin(st.ph);
  u.legs[0].rotation.x = follow(u.legs[0].rotation.x, s * A, 14, dt); u.legs[3].rotation.x = follow(u.legs[3].rotation.x, s * A, 14, dt);
  u.legs[1].rotation.x = follow(u.legs[1].rotation.x, -s * A, 14, dt); u.legs[2].rotation.x = follow(u.legs[2].rotation.x, -s * A, 14, dt);
  u.body.position.y = Math.abs(Math.cos(st.ph)) * .03 * st.amp;
  u.body.rotation.z = Math.sin(st.ph) * .025 * st.amp;
  u.head.rotation.x = follow(u.head.rotation.x, startle > 0 ? -.55 : .08 * Math.sin(st.ph * 2) * st.amp, startle > 0 ? 12 : 5, dt);
  u.head.rotation.y = follow(u.head.rotation.y, startle > 0 ? .3 * Math.sin(startle * 9) : 0, 8, dt);
  st.tl = (st.tl || 0) + dt * 1.7;
  u.tail.rotation.z = Math.sin(st.tl) * .35;
}
