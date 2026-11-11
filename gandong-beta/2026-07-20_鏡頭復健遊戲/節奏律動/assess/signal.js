/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/signal.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 量測用的手部高度（2026-11-09）
   與釣魚 game/detector.js 的 HandSignal 逐行相同，讓每款遊戲的量測關用同一把尺：
   - 手腕、食指、小指、拇指取最高點；手看不到但手肘高過肩膀時，沿肩→肘外推一段前臂。
   - 0＝肩膀高度，往上為正，單位是軀幹長（肩到髖的垂直距離，慢慢更新）。
   - 肩膀基準慢慢跟（約 1.5 秒）：快速整體上拉算數，慢慢調整坐姿不算。
   遊戲自己的判定可以用別的訊號（例如舉網用手腕、經個人校正），但餵給 lift.js／gonogo.js 的一律用這裡算的 lh、rh。
   釣魚那份若有改，這裡要一起改；test_assess.mjs 會拿兩份比對，不一致就失敗。 */

export function oneEuro(min = 3, beta = 0.02, dcut = 2) {
  let xP = null, dxP = 0, tP = null;
  const a = (c, dt) => { const T = 1 / (2 * Math.PI * c); return 1 / (1 + T / dt); };
  return {
    reset() { xP = null; dxP = 0; tP = null; },
    f(x, t) {
      if (xP === null) { xP = x; tP = t; return x; }
      const dt = Math.max((t - tP) / 1000, 1e-3); tP = t;
      const dx = (x - xP) / dt, ad = a(dcut, dt), dh = ad * dx + (1 - ad) * dxP; dxP = dh;
      const al = a(min + beta * Math.abs(dh), dt), xh = al * x + (1 - al) * xP;
      xP = xh; return xh;
    },
  };
}

const SIDES = {
  L: { pts: [15, 19, 17, 21], el: 13, sh: 11 },
  R: { pts: [16, 20, 18, 22], el: 14, sh: 12 },
};
const seen = (p, th = 0.3) => p && (p.visibility == null || p.visibility > th);

export class HandSignal {
  constructor({ tauMs = 1500, aspect = 16 / 9, euro = [3, 0.02, 2] } = {}) {
    this.tau = tauMs; this.aspect = aspect; this.euro = oneEuro(...euro);
    this.reset();
  }

  reset() {
    this.torso = null; this.shRef = null; this.tPrev = null; this.lastRaw = null;
    this.last = { L: null, R: null };
    this.euro.reset();
  }

  handY(side, lm, t) {
    const S = SIDES[side];
    let y = null;
    for (const i of S.pts) {
      const p = lm[i]; if (!p) continue;
      /* 超出畫面上緣時 visibility 會掉，但模型外推的位置仍然朝上，可以用 */
      if (seen(p) || p.y < 0.02) y = y == null ? p.y : Math.min(y, p.y);
    }
    /* 手看不到、手肘舉在肩膀以上：沿肩→肘方向外推一段前臂 */
    if (y == null && seen(lm[S.el]) && seen(lm[S.sh]) && lm[S.el].y < lm[S.sh].y) {
      y = lm[S.el].y + (lm[S.el].y - lm[S.sh].y) * 0.9;
    }
    if (y != null) { this.last[side] = { y, t }; return y; }
    const l = this.last[side];
    if (!l) return null;
    /* 從畫面下緣消失才算放下；其他（模糊、被身體擋住、舉出畫面）維持最後位置 */
    if (l.y > 0.82 || t - l.t > 4000) { this.last[side] = null; return null; }
    return l.y;
  }

  update(lm, t, low = -1) {
    const ls = lm[11], rs = lm[12], shY = (ls.y + rs.y) / 2;
    const lh = lm[23], rh = lm[24];
    if (seen(lh, 0.5) && seen(rh, 0.5)) {
      const m = Math.max(0.08, Math.abs((lh.y + rh.y) / 2 - shY));
      this.torso = this.torso == null ? m : this.torso + (m - this.torso) * 0.04;
    } else if (this.torso == null) {
      this.torso = Math.max(0.08, Math.abs(ls.x - rs.x) * this.aspect * 1.25);
    }
    const gap = this.tPrev == null ? Infinity : t - this.tPrev;
    this.tPrev = t;
    if (gap > 500 || this.shRef == null) { this.shRef = shY; this.euro.reset(); }
    else this.shRef += (shY - this.shRef) * (1 - Math.exp(-gap / this.tau));
    const h = (side) => { const y = this.handY(side, lm, t); return y == null ? null : (this.shRef - y) / this.torso; };
    const l = h('L'), r = h('R');
    const raw = l == null && r == null ? null : Math.max(l ?? -9, r ?? -9);
    /* 11-10 修：手從畫面下緣消失時，不可以比最後看到的位置高。
       原本直接填校正最低點，手放得比校正時低（例如放在畫面下緣）就會一閃一閃往上跳，垃圾被冤枉吊起來。 */
    if (raw != null) this.lastRaw = raw;
    const fill = this.lastRaw == null ? low : Math.min(low, this.lastRaw);
    const sig = this.euro.f((raw ?? fill) * 1000, t) / 1000;
    return { raw, sig, lh: l, rh: r };
  }
}
