/* 感．動復能 動作答題：手機三方向傾斜作答（2026-11-10 v0.1）
   手機直拿、貼胸口，身體帶著手機往左、往右、往前傾（老闆 11-10：要教用身體帶）。
   角度換算沿用騎遍台灣 tilt.js 的做法：由重力算「地球的上方」落在手機哪個方向，
   不直接用 beta／gamma（直立時 gamma 會在 ±90 度跳）。這裡只處理直拿。

   輸出方向：0＝左、1＝前（畫面上方那張卡）、2＝右；二選一只用 0 與 2。
   門檻暫定，尚未用真人資料校準。 */

export const TILT3 = {
  sideDeg: 13,     // 左右傾超過這麼多度
  fwdDeg: 13,      // 往前傾超過這麼多度
  centerDeg: 6,    // 回到這麼多度以內＝回正
  dwellSec: 1.0,   // 停多久算選定
  restSec: 0.5,    // 回正停多久才出下一題
  stuckSec: 10,
  moveDeg: 7,      // 超過這麼多度算「有動」
  staleMs: 1000,
};

const RAD = Math.PI / 180;

/* beta、gamma（度）→ 重力上方向量（手機座標：x 右、y 上、z 螢幕朝外） */
export function upVector(beta, gamma) {
  const b = beta * RAD, g = gamma * RAD;
  return { x: -Math.cos(b) * Math.sin(g), y: Math.sin(b), z: Math.cos(b) * Math.cos(g) };
}

/* 直拿時的兩個角度：roll 往右傾為正；pitch 手機上緣往前倒為正（螢幕越朝天越大） */
export function anglesOf(u) {
  const roll = Math.atan2(-u.x, Math.max(u.y, 0.35)) / RAD;
  const pitch = Math.atan2(u.z, Math.hypot(u.x, u.y)) / RAD;
  return { roll, pitch };
}

/* 一題的作答狀態機；n＝2 或 3。feed({roll,pitch}|null, tMs) 回傳事件，格式同 zones.js。
   正中間在每題開始（回正那一刻）重新定，所以拿的角度不同也沒關係。 */
export function createTiltAnswerer(n, opt = {}) {
  const o = { ...TILT3, ...opt };
  const s = { phase: 'wait-rest', zero: null, restSince: null, hover: -1, hoverSince: null, shownAt: null, moved: false, stuckAt: null, peak: 0, last: null };
  const dirOf = (d) => {
    const ar = Math.abs(d.roll), ap = d.pitch;
    if (n === 3 && ap >= o.fwdDeg && ap > ar) return 1;
    if (ar >= o.sideDeg) return d.roll < 0 ? 0 : 2;
    return -1;
  };
  function begin(t, a) { s.phase = 'answer'; s.zero = a; s.shownAt = t; s.stuckAt = t; s.moved = false; s.hover = -1; s.hoverSince = null; s.peak = 0; }
  return {
    state: s,
    forceBegin(t, a) { begin(t, a || s.last || { roll: 0, pitch: 0 }); },
    tap(zone, t) { if (s.phase !== 'answer') return []; s.phase = 'done'; return [{ type: 'select', zone, hand: 'tap', rtMs: t - s.shownAt, reach: null }]; },
    next() { s.phase = 'wait-rest'; s.restSince = null; },
    feed(a, t) {
      const ev = [];
      if (!a) return ev;
      s.last = a;
      if (s.phase !== 'answer') {
        /* 等回正：跟上一題的正中間比；第一題沒有正中間，等手機穩住就好 */
        const ref = s.zero || a;
        const off = Math.hypot(a.roll - ref.roll, Math.max(0, a.pitch - ref.pitch));
        if (off <= o.centerDeg) {
          if (s.restSince == null) s.restSince = t;
          if (t - s.restSince >= o.restSec * 1000 && s.phase === 'wait-rest') { begin(t, a); ev.push({ type: 'ready' }); }
        } else { s.restSince = null; if (!s.zero) s.zero = a; }
        if (!s.zero) s.zero = a;
        return ev;
      }
      const d = { roll: a.roll - s.zero.roll, pitch: a.pitch - s.zero.pitch };
      const mag = Math.max(Math.abs(d.roll), d.pitch);
      if (mag > s.peak) s.peak = mag;
      if (mag >= o.moveDeg) s.moved = true;
      const z = dirOf(d);
      if (z !== s.hover) { s.hover = z; s.hoverSince = z >= 0 ? t : null; }
      if (z >= 0) {
        const pr = Math.min(1, (t - s.hoverSince) / (o.dwellSec * 1000));
        ev.push({ type: 'hover', zone: z === 1 && n === 3 ? 1 : (n === 2 ? (z === 0 ? 0 : 1) : z), progress: pr });
        if (pr >= 1) {
          s.phase = 'done';
          const zone = n === 2 ? (z === 0 ? 0 : 1) : z;
          ev.push({ type: 'select', zone, hand: 'tilt', rtMs: s.hoverSince - s.shownAt, reach: { deg: Math.round(s.peak * 10) / 10 } });
        }
      } else if (s.moved && t - s.stuckAt >= o.stuckSec * 1000) {
        s.stuckAt = t; ev.push({ type: 'stuck' });
      }
      return ev;
    },
  };
}
