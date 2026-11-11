/* 抬手判定 v1（2026-11-06，老闆試玩「握把或揮動常常沒反應」後重寫）

   v0 沒反應的原因與這版的修法：
   ① 魚碰到浮標後要等 0.55 秒才開始判定，人常常正好在這時揮動，等於只量到揮動的尾巴
      → 判定器一直在收資料，開始判定時往回看 0.25 秒，已經開始的揮動也算。
   ② 手一看不到就當成放下：揮太快（模糊）或舉出畫面上緣時，訊號瞬間掉到底
      → 只有從畫面下緣消失才算放下；其他情況維持最後位置，手腕看不到時用肩、肘外推。
   ③ 只看手腕：握著假想握把抖一下手腕，手腕幾乎沒動
      → 手腕、食指、小指、拇指取最高點。
   ④ 手和肩膀同時算：身體往後仰著拉，手跟肩膀一起往上，相減後等於沒動
      → 肩膀基準慢慢跟（約 1.5 秒），快速的整體上拉算數，慢慢調整坐姿不算。
   ⑤ 髖部在畫面邊緣時忽有忽無，軀幹長度跟著跳，訊號也跳
      → 軀幹長度只慢慢更新。
   ⑥ 畫面 60 Hz、鏡頭 30 Hz，同一張影像被算兩次，「連續 2 格」的防呆形同虛設
      → 由呼叫端保證每個新樣本只呼叫一次 update。 */

export const DEFAULTS = {
  rise: 0.10,          /* 慢抬：累積上抬距離（占個人範圍） */
  fastRatio: 0.6,      /* 快抬：門檻的幾成就算 */
  fastFloor: 0.05,     /* 快抬下限（占個人範圍） */
  minFastTorso: 0.07,  /* 快抬下限（軀幹長度，約 3.5 公分）：範圍很小的人，雜訊不能被放大成動作 */
  minRiseTorso: 0.085, /* 慢抬下限（軀幹長度） */
  fastWindowMs: 280,
  confirm: 2,
  keepMs: 1500,
};

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

/* 姿勢點 → 手部高度。單位是軀幹長度，0＝肩膀高度，往上為正。
   raw 給校正用（null＝看不到手），sig 是濾波後給判定用。 */
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

/* 判定器：每個新樣本呼叫一次 update，不論現在有沒有魚。
   arm() 開始判定，可以往回看（graceMs）；strict 放大門檻，用於垃圾，避免冤枉。 */
export class LiftDetector {
  constructor(opts = {}) {
    this.opt = { ...DEFAULTS, ...opts };
    this.loosen = 1;
    this.range = 1.6;
    this.reset();
  }

  setRise(rise) { this.opt.rise = rise; }
  /* 個人校正範圍（軀幹長度），用來換算絕對下限 */
  setRange(range) { this.range = Math.max(0.2, range); }
  /* 連續差一點就放寬；1＝原樣，最低 0.6 */
  setLoosen(v) { this.loosen = Math.min(1, Math.max(0.6, v)); }

  reset() {
    this.hist = [];
    this.active = false; this.armT = 0; this.base = 0; this.over = 0; this.strict = 1; this.maxRise = 0;
    this.swinging = false; this.swingBase = 0; this.swingPeak = 0;
  }

  thresholds(strict = 1) {
    /* 放寬只給魚用（避免一直冤枉沒釣到）；垃圾 strict>1 不放寬，否則越玩越容易被冤枉勾到垃圾（11-10 修） */
    const o = this.opt, k = (strict > 1 ? 1 : this.loosen) * strict;
    const rise = Math.max(o.rise * k, (o.minRiseTorso * strict) / this.range);
    const fast = Math.max(Math.max(o.rise * o.fastRatio, o.fastFloor) * k, (o.minFastTorso * strict) / this.range);
    return { rise, fast };
  }

  arm(t, { graceMs = 0, strict = 1 } = {}) {
    this.active = true; this.armT = t - graceMs; this.over = 0; this.strict = strict; this.maxRise = 0;
    const back = this.hist.filter((h) => h.t >= this.armT);
    this.base = back.length ? Math.min(...back.map((h) => h.s)) : (this.hist.length ? this.hist[this.hist.length - 1].s : 0);
  }

  stop() { this.active = false; }

  /* 回傳 {swing, hit}：swing＝這一刻剛開始往上揮（給釣竿、音效用）；hit＝判定成立 */
  update(s, t) {
    const o = this.opt;
    this.hist.push({ s, t });
    while (this.hist.length > 1 && t - this.hist[0].t > o.keepMs) this.hist.shift();
    const from = t - o.fastWindowMs;
    let wMin = s;
    for (const h of this.hist) if (h.t >= from && h.s < wMin) wMin = h.s;

    let swing = false;
    if (!this.swinging && s - wMin >= this.thresholds(1).fast) {
      this.swinging = true; this.swingBase = wMin; this.swingPeak = s; swing = true;
    }
    if (this.swinging) {
      if (s > this.swingPeak) this.swingPeak = s;
      if (s <= this.swingBase + (this.swingPeak - this.swingBase) * 0.5) this.swinging = false;
    }

    let hit = null;
    if (this.active) {
      if (s < this.base) this.base = s;
      let aMin = s;
      for (const h of this.hist) if (h.t >= Math.max(this.armT, from) && h.s < aMin) aMin = h.s;
      const th = this.thresholds(this.strict), rise = s - this.base;
      if (rise > this.maxRise) this.maxRise = rise;
      const fast = s - aMin >= th.fast, slow = rise >= th.rise;
      if (fast || slow) {
        this.over += 1;
        if (this.over >= o.confirm) {
          this.active = false;
          hit = { kind: fast ? 'fast' : 'slow', rise, base: this.base };
        }
      } else this.over = 0;
    }
    return { swing, hit };
  }
}

/* 手放下判定：從這次最高點回落一半以上，或已回到很低的位置 */
export function isLowered(s, base, peak) {
  return s <= base + (peak - base) * 0.5 || s < 0.08;
}

/* 動作校正：看姿勢點，回報鏡頭看得出來的三種問題（練習時用，不影響判定）。
   nearTop＝手快超出畫面上緣；lean＝身體歪一邊；bent＝手舉過肩但手肘彎著。 */
export function postureHints(lm, aspect = 16 / 9) {
  const out = { nearTop: false, lean: false, bent: false };
  if (!lm) return out;
  const ls = lm[11], rs = lm[12];
  if (!seen(ls) || !seen(rs)) return out;
  for (const side of [SIDES.L, SIDES.R]) for (const i of side.pts) {
    const p = lm[i];
    if (p && p.y < 0.035) out.nearTop = true;
  }
  const lh = lm[23], rh = lm[24];
  if (seen(lh, 0.5) && seen(rh, 0.5)) {
    const dx = (((ls.x + rs.x) - (lh.x + rh.x)) / 2) * aspect;
    const torso = Math.max(0.08, Math.abs((lh.y + rh.y) / 2 - (ls.y + rs.y) / 2));
    out.lean = Math.abs(dx) / torso > 0.3;
  } else {
    out.lean = Math.abs(ls.y - rs.y) / Math.max(0.02, Math.abs(ls.x - rs.x) * aspect) > 0.42;
  }
  /* 手肘：看舉比較高的那隻手。正面看手往前舉時上臂會變短、角度不準，上臂太短就不判斷 */
  const lw = lm[15], rw = lm[16];
  const arm = (!seen(rw) || (seen(lw) && lw.y < rw.y)) ? SIDES.L : SIDES.R;
  const sh = lm[arm.sh], el = lm[arm.el], wr = lm[arm.pts[0]];
  if (seen(sh) && seen(el) && seen(wr) && wr.y < sh.y - 0.02) {
    const ux = (sh.x - el.x) * aspect, uy = sh.y - el.y, fx = (wr.x - el.x) * aspect, fy = wr.y - el.y;
    const nu = Math.hypot(ux, uy), nf = Math.hypot(fx, fy);
    if (nu > nf * 0.4 && nf > 0.01) {
      const deg = (Math.acos(Math.max(-1, Math.min(1, (ux * fx + uy * fy) / (nu * nf)))) * 180) / Math.PI;
      out.bent = deg < 115;
    }
  }
  return out;
}

/* 校正：回傳 {min,max}；動作範圍太小時用最小範圍，避免雜訊被放大 */
export function calibrate(lowSamples, highSamples, { minRange = 0.7, defaultLow = -1 } = {}) {
  const sorted = (a) => [...a].sort((x, y) => x - y);
  const low = sorted(lowSamples);
  const high = sorted(highSamples);
  const min = low.length ? low[Math.floor(low.length / 2)] : defaultLow;
  let max = high.length ? high[Math.floor(high.length * 0.9)] : min + minRange;
  const narrow = max - min < minRange;
  if (narrow) max = min + minRange;
  return { min, max, narrow };
}
