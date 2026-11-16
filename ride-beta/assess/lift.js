/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/lift.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 量測包 A：上肢舉高（鏡頭，坐姿）
   用在釣魚、舉網、搗麻糬、節奏律動的「量測關」。

   輸入：每個新的鏡頭樣本 {t(ms), lh, rh, lm}
     lh / rh：手部最高點高於肩膀多少，單位是軀幹長（肩到髖），往上為正；看不到為 null。
              與釣魚 detector.js 的 HandSignal 同一個定義，跨人可比，不經個人校正。
     lm：MediaPipe Pose 33 點（影像座標），用來看代償；沒有就不判代償。
   流程：左手 reps 下 → 右手 reps 下。每下：放下 → 舉到最高 → 放下。
         不計分、不倒數、不隨難度或個人校正改變，所以每次、每個人條件相同。
   這裡只做流程與計算，畫面與語音由各遊戲的 adapter 處理。

   代償門檻是我暫定的（2026-11-07），尚未用真人資料校準：
   - 側傾：從開始舉到最高點，肩膀中點相對髖部中點的傾斜角改變 ≥ 10 度
   - 聳肩：舉起那一側的肩膀相對另一側升高 ≥ 0.08 軀幹長（正常舉手肩胛也會上移，所以門檻不能太低） */
export const LIFT = {
  sides: ['L', 'R'],
  reps: 3,
  lowSec: 0.3,      // 手放下要維持這麼久，才開始算下一下
  onsetBy: 0.06,    // 比放下時高 0.06 軀幹長，算開始舉
  minRise: 0.15,    // 舉起至少 0.15 軀幹長（約 7～8 公分）才算一下
  dropBy: 0.15,     // 從最高點掉 0.15 才算放下
  holdMax: 5,       // 舉著超過 5 秒也算完成，請他放下
  noMoveSec: 8,     // 這一手第一下 8 秒都沒動：這手略過；之後的下也一樣，略過剩下的
  repMaxSec: 15,    // 單下最長
  remindSec: 6,     // 手一直沒放下，多久提醒一次
  leanDeg: 10,
  hike: 0.08,
};

const ok = (p, th = 0.3) => p && (p.visibility == null || p.visibility > th);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* 姿勢：軀幹側傾角（度，正＝肩膀往影像 +x 偏）、兩肩高低差（正＝左肩較高，軀幹長）。看不到髖部時不判側傾 */
export function posture(lm, aspect = 16 / 9) {
  if (!lm) return null;
  const ls = lm[11], rs = lm[12], lh = lm[23], rh = lm[24];
  if (!ok(ls) || !ok(rs)) return null;
  const sh = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  let torso, lean = null;
  if (ok(lh, 0.5) && ok(rh, 0.5)) {
    const hp = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
    torso = Math.max(0.08, Math.hypot((sh.x - hp.x) * aspect, sh.y - hp.y));
    lean = (Math.atan2((sh.x - hp.x) * aspect, hp.y - sh.y) * 180) / Math.PI;
  } else {
    torso = Math.max(0.08, Math.abs(ls.x - rs.x) * aspect * 1.25);
  }
  return { lean, tilt: (rs.y - ls.y) / torso, torso };
}

/* 給長輩看的高度說法。依成人身體比例粗估（軀幹長約等於肩到頭頂再多一點），不是精確量測 */
export const HEIGHT_WORDS = [
  [-0.45, '肚子的高度'],
  [-0.15, '胸口的高度'],
  [0.15, '肩膀的高度'],
  [0.45, '臉的高度'],
  [0.75, '頭頂的高度'],
  [Infinity, '高過頭頂'],
];
export function heightWord(v) {
  if (v == null) return null;
  for (const [lim, w] of HEIGHT_WORDS) if (v < lim) return w;
  return HEIGHT_WORDS.at(-1)[1];
}

export class LiftMeasure {
  /* restLine：手低於這個高度（軀幹長）才算放下。由 adapter 依個人校正給；沒給就用 -0.35（約胸口以下） */
  constructor(opt = {}) {
    this.o = { ...LIFT, ...opt };
    this.restLine = opt.restLine ?? -0.35;
    this.aspect = opt.aspect ?? 16 / 9;
    this.side = 0; this.rep = 0; this.reps = []; this.skipped = []; this.manual = [];
    this.done = false; this.started = false;
    this.go('low');
  }

  get sideId() { return this.o.sides[this.side]; }

  go(st) { this.st = st; this.stT = null; this.lowSince = null; this.cur = null; this.remindAt = null; }

  push(s) {
    const ev = [], o = this.o, t = s.t;
    if (this.done) return ev;
    if (!this.started) { this.started = true; ev.push({ type: 'side', side: this.sideId }); }
    if (this.stT == null) this.stT = t;
    const v = this.sideId === 'L' ? s.lh : s.rh;
    const low = v == null || v < this.restLine;
    if (this.st === 'low') {
      if (this.remindAt == null) this.remindAt = t + o.remindSec * 1000;
      if (low) {
        if (this.lowSince == null) this.lowSince = t;
        if (t - this.lowSince >= o.lowSec * 1000) {
          this.lowSince = null;
          this.st = 'up'; this.stT = t;
          this.cur = { base: v ?? this.restLine, baseLm: s.lm || null, onsetT: null, onsetLm: null, peak: -Infinity, peakT: null, peakLm: null };
          ev.push({ type: 'ready', side: this.sideId, rep: this.rep });
        }
      } else {
        this.lowSince = null;
        if (t >= this.remindAt) { this.remindAt = t + o.remindSec * 1000; ev.push({ type: 'remindLow' }); }
      }
      return ev;
    }
    /* up：等他舉、追最高點、等他放下 */
    const c = this.cur;
    if (v != null) {
      if (c.onsetT == null && v > c.base + o.onsetBy) { c.onsetT = t; c.onsetLm = s.lm || c.baseLm; ev.push({ type: 'onset' }); }
      if (v > c.peak) { c.peak = v; c.peakT = t; c.peakLm = s.lm || c.peakLm; }
    }
    const rise = c.peak - c.base;
    if (c.onsetT == null && t - this.stT >= o.noMoveSec * 1000) {
      /* 沒動：這一手剩下的都略過 */
      if (this.rep === 0) this.skipped.push(this.sideId);
      ev.push({ type: 'skipSide', side: this.sideId, rep: this.rep });
      this.nextSide(ev);
      return ev;
    }
    const enough = rise >= o.minRise;
    const dropped = enough && v != null && v <= c.peak - o.dropBy;
    const loweredOut = enough && v == null;           /* 手掉出畫面下緣 */
    const heldLong = enough && c.onsetT != null && t - c.onsetT >= o.holdMax * 1000;
    const timeout = t - this.stT >= o.repMaxSec * 1000;
    if (dropped || loweredOut || heldLong || timeout) {
      this.finishRep(enough, heldLong && !dropped ? 'held' : timeout && !enough ? 'small' : 'ok');
      ev.push({ type: 'rep', side: this.sideId, rep: this.rep, ok: enough, held: heldLong && !dropped });
      if (this.rep >= o.reps) this.nextSide(ev);
      else this.go('low');
    }
    return ev;
  }

  finishRep(enough, how) {
    const c = this.cur, o = this.o, sid = this.sideId;
    const p0 = posture(c.onsetLm || c.baseLm, this.aspect), p1 = posture(c.peakLm, this.aspect);
    let lean = null, hike = null;
    if (p0 && p1) {
      if (p0.lean != null && p1.lean != null) lean = Math.abs(p1.lean - p0.lean);
      hike = (sid === 'L' ? 1 : -1) * (p1.tilt - p0.tilt);
    }
    const moveTime = c.onsetT != null && c.peakT != null && c.peakT > c.onsetT ? (c.peakT - c.onsetT) / 1000 : null;
    this.reps.push({
      side: sid, ok: enough, how,
      base: round(c.base), peak: c.peak === -Infinity ? null : round(c.peak), rise: c.peak === -Infinity ? null : round(c.peak - c.base),
      moveTime: moveTime == null ? null : round(moveTime),
      speed: moveTime ? round((c.peak - c.base) / moveTime) : null,
      lean: lean == null ? null : round(lean, 1), hike: hike == null ? null : round(hike),
      leanFlag: lean != null && lean >= o.leanDeg, hikeFlag: hike != null && hike >= o.hike,
    });
    this.rep += 1;
  }

  nextSide(ev) {
    this.side += 1; this.rep = 0;
    if (this.side >= this.o.sides.length) { this.done = true; this.st = 'done'; ev.push({ type: 'done' }); return; }
    this.go('low');
    ev.push({ type: 'side', side: this.sideId });
  }

  /* 略過這一手（帶領者按的） */
  skipSide() {
    const ev = [];
    if (this.done) return ev;
    if (!this.reps.some((r) => r.side === this.sideId && r.ok)) this.skipped.push(this.sideId);
    this.manual.push(this.sideId);
    ev.push({ type: 'skipSide', side: this.sideId, rep: this.rep, manual: true });
    this.nextSide(ev);
    return ev;
  }

  summary() {
    const by = {};
    for (const s of this.o.sides) {
      const r = this.reps.filter((x) => x.side === s && x.ok);
      const comp = r.filter((x) => x.lean != null || x.hike != null);
      by[s] = {
        n: r.length, of: this.o.reps, skipped: this.skipped.includes(s), manual: this.manual.includes(s),
        best: r.length ? Math.max(...r.map((x) => x.peak)) : null,
        mean: r.length ? round(mean(r.map((x) => x.peak))) : null,
        moveTime: round(median(r.map((x) => x.moveTime).filter((x) => x != null))),
        speed: round(median(r.map((x) => x.speed).filter((x) => x != null))),
        lean: r.filter((x) => x.leanFlag).length, hike: r.filter((x) => x.hikeFlag).length, compN: comp.length,
      };
    }
    const L = by.L && by.L.best, R = by.R && by.R.best;
    return { by, asym: L != null && R != null ? round(R - L) : null, restLine: round(this.restLine), reps: this.reps, tune: { leanDeg: this.o.leanDeg, hike: this.o.hike } };
  }
}

function round(v, d = 3) { return v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d; }
