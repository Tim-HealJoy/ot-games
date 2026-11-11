/* 感．動復能 動作答題：鏡頭作答格（2026-11-10 v0.1）
   純函式＋狀態機，不碰畫面，Node 可以直接測。

   座標：以「肩寬」為單位的身體座標，鏡像後（畫面上右邊＝長輩的右手邊）。
     u：往右為正，0＝兩肩中點；v：往上為正，0＝兩肩連線。
   規則（老闆 11-05、11-10 定的）：
     - 哪隻手都算；兩隻手各在不同格子＝不算，等其中一隻離開。
     - 手停在格子裡 DWELL 秒才選定（防路過誤選）。
     - 選定後，兩手都回到休息區（膝上）REST 秒，才出下一題。
     - 不倒數。只記錄反應時間，不計分。
   門檻都是暫定（2026-11-10），尚未用真人資料校準。 */

export const ZONE = {
  dwellSec: 1.0,    // 停多久算選定
  restSec: 0.5,     // 回休息區要停多久
  restV: -1.1,      // 手低於這個高度＝休息區（大約胸口以下到膝上）
  radius: 0.62,     // 格子半徑（肩寬）
  lostMs: 600,      // 這麼久沒看到人，當成離開
  stuckSec: 10,     // 這麼久沒選定、但手有動：記一次「動作未完成」
  moveV: -0.6,      // 手舉過這個高度才算「有動」
};

/* 格子位置＝動作處方。low：胸口高度；high：頭頂附近；wide：左右拉遠。
   n＝2：左、右；n＝3：左、上、右（low 的「上」在臉的高度）。 */
export const LAYOUTS = {
  low: { 2: [[-1.3, -0.2], [1.3, -0.2]], 3: [[-1.4, -0.25], [0, 0.35], [1.4, -0.25]] },
  high: { 2: [[-1.1, 0.9], [1.1, 0.9]], 3: [[-1.25, 0.75], [0, 1.15], [1.25, 0.75]] },
  wide: { 2: [[-1.8, -0.1], [1.8, -0.1]], 3: [[-1.8, -0.1], [0, 0.45], [1.8, -0.1]] },
};
/* 連續動作未完成時，往這個方向降一級 */
export const EASIER = { high: 'low', wide: 'low', low: 'near' };
LAYOUTS.near = { 2: [[-1.0, -0.45], [1.0, -0.45]], 3: [[-1.15, -0.5], [0, 0.15], [1.15, -0.5]] };

const LM = { LSH: 11, RSH: 12, LHIP: 23, RHIP: 24, L: [15, 17, 19, 21], R: [16, 18, 20, 22] };
const seen = (p, th = 0.3) => p && (p.visibility == null || p.visibility > th);

/* 一幀骨架 → 身體座標裡的兩隻手。看不到肩膀回 null。
   lm：MediaPipe 33 點（x、y 為 0～1 影像座標，未鏡像）；aspect＝影像寬÷高。 */
export function bodyFrame(lm, aspect = 16 / 9) {
  if (!lm || !seen(lm[LM.LSH]) || !seen(lm[LM.RSH])) return null;
  const ls = lm[LM.LSH], rs = lm[LM.RSH];
  /* 鏡像：長輩的左肩（影像右側）在畫面左邊 */
  const mx = (p) => (1 - p.x) * aspect, my = (p) => p.y;
  const cx = (mx(ls) + mx(rs)) / 2, cy = (my(ls) + my(rs)) / 2;
  const sw = Math.hypot(mx(ls) - mx(rs), my(ls) - my(rs));
  if (sw < 0.03) return null;
  const hand = (ids) => {
    let best = null;
    for (const i of ids) {
      const p = lm[i];
      if (!seen(p, 0.2)) continue;
      const q = { u: (mx(p) - cx) / sw, v: (cy - my(p)) / sw };
      if (!best || q.v > best.v) best = q; // 取最高的那一點（指尖通常比手腕高）
    }
    return best;
  };
  return { sw, L: hand(LM.L), R: hand(LM.R) };
}

/* 手在哪一格；-1＝不在格子裡 */
export function zoneOf(pt, centers, radius = ZONE.radius) {
  if (!pt) return -1;
  let hit = -1, bd = Infinity;
  centers.forEach(([u, v], i) => {
    const d = Math.hypot(pt.u - u, pt.v - v);
    if (d <= radius && d < bd) { bd = d; hit = i; }
  });
  return hit;
}

const resting = (pt, o) => !pt || pt.v < o.restV;

/* 一題的作答狀態機。
   feed(frame, tMs) 每幀呼叫；回傳事件陣列：
     {type:'hover', zone, progress}  手在某格，progress 0～1
     {type:'select', zone, hand, rtMs, reach}
     {type:'stuck'}                   手有動但一直選不到（每 stuckSec 一次）
     {type:'ready'}                   回到休息區，可以出下一題
   phase：'wait-rest'（等手放下）→ 'answer' → 'done'。第一題也要先放下手，避免手舉著就直接選到。 */
export function createAnswerer(centers, opt = {}) {
  const o = { ...ZONE, ...opt };
  const s = {
    phase: 'wait-rest', restSince: null, hoverZone: -1, hoverSince: null, hoverHand: null,
    shownAt: null, lastSeen: null, moved: false, stuckAt: null, maxV: { L: -9, R: -9 },
  };
  function begin(t) { s.phase = 'answer'; s.shownAt = t; s.stuckAt = t; s.moved = false; s.hoverZone = -1; s.hoverSince = null; }
  return {
    state: s,
    centers,
    setCenters(c) { centers = c; this.centers = c; s.hoverZone = -1; s.hoverSince = null; },
    /* 沒有鏡頭時（點螢幕備援）也能直接開始 */
    forceBegin(t) { begin(t); },
    /* 點螢幕作答 */
    tap(zone, t) {
      if (s.phase !== 'answer') return [];
      s.phase = 'done';
      return [{ type: 'select', zone, hand: 'tap', rtMs: t - s.shownAt, reach: null }];
    },
    /* 選定後，下一題開始前呼叫 */
    next() { s.phase = 'wait-rest'; s.restSince = null; },
    feed(fr, t) {
      const ev = [];
      if (!fr) {
        if (s.lastSeen != null && t - s.lastSeen > o.lostMs) { s.hoverZone = -1; s.hoverSince = null; s.restSince = null; }
        return ev;
      }
      s.lastSeen = t;
      const { L, R } = fr;
      if (s.phase === 'wait-rest' || s.phase === 'done') {
        if (resting(L, o) && resting(R, o)) {
          if (s.restSince == null) s.restSince = t;
          if (t - s.restSince >= o.restSec * 1000 && s.phase === 'wait-rest') { begin(t); ev.push({ type: 'ready' }); }
        } else s.restSince = null;
        return ev;
      }
      /* answer */
      for (const k of ['L', 'R']) { const p = fr[k]; if (p && p.v > s.maxV[k]) s.maxV[k] = p.v; }
      if ((L && L.v > o.moveV) || (R && R.v > o.moveV)) s.moved = true;
      const zl = zoneOf(L, centers, o.radius), zr = zoneOf(R, centers, o.radius);
      let z = -1, hand = null;
      if (zl >= 0 && zr >= 0 && zl !== zr) z = -1;          // 兩手各指一格：不算
      else if (zl >= 0) { z = zl; hand = zr === zl ? 'both' : 'L'; }
      else if (zr >= 0) { z = zr; hand = 'R'; }
      if (z !== s.hoverZone) { s.hoverZone = z; s.hoverSince = z >= 0 ? t : null; s.hoverHand = hand; }
      if (z >= 0) {
        const pr = Math.min(1, (t - s.hoverSince) / (o.dwellSec * 1000));
        ev.push({ type: 'hover', zone: z, progress: pr });
        if (pr >= 1) {
          s.phase = 'done';
          const p = hand === 'R' ? R : L;
          ev.push({ type: 'select', zone: z, hand: s.hoverHand, rtMs: s.hoverSince - s.shownAt, reach: p ? { u: p.u, v: p.v } : null });
          s.maxV = { L: -9, R: -9 };
        }
      } else if (s.moved && t - s.stuckAt >= o.stuckSec * 1000) {
        s.stuckAt = t;
        ev.push({ type: 'stuck' });
      }
      return ev;
    },
  };
}

/* 身體座標 → 畫面位置（0～1），讓卡片和游標畫在對應的地方 */
export function toScreen(u, v) {
  return { x: 0.5 + u / 4.6, y: 0.58 - v * 0.27 };
}
