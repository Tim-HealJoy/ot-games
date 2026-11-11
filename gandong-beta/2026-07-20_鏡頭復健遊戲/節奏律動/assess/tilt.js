/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/tilt.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 量測包 D：手機傾斜／轉身（騎遍台灣：手機左右傾；找貓咪：拿著手機左右轉）
   輸入：每個樣本 {t(ms), deg}；deg＝手機相對「正中間」轉了幾度，往右為正；讀不到為 null。
   只知道手機轉了幾度，分不出是身體還是手在轉，所以報告一律寫「手機往左傾幾度」；
   各遊戲在試玩前要示範「手機貼胸口、手肘夾緊、用身體帶」（老闆 2026-11-10 指示）。

   流程：左邊 reps 下 → 右邊 reps 下。每下：回到正中間 → 往那一邊轉到最多 → 回到正中間。
   不計分、不倒數、不隨難度改變。
   - 最遠：這一下離正中間最多幾度。
   - 轉出秒數：開始動 → 最遠點。
   - 回正秒數：最遠點 → 回到正中間（±centerDeg）。停在外面太久時，從提醒回來那一刻起算。
   門檻都是我暫定的（2026-11-10），尚未用真人資料校準。 */
export const TILT = {
  sides: ['L', 'R'],
  reps: 3,
  centerDeg: 6,     // 離正中間 6 度以內算回正
  centerSec: 0.4,   // 回正要停這麼久才開始下一下
  onsetDeg: 4,      // 比回正時多轉 4 度，算開始動
  minDeg: 8,        // 至少轉 8 度才算一下
  dropDeg: 5,       // 從最遠處往回 5 度，算開始回正
  holdMax: 6,       // 停在外面超過 6 秒，請他回來
  noMoveSec: 10,    // 這一邊第一下 10 秒都沒動：這邊略過
  repMaxSec: 20,
  backMaxSec: 8,    // 開始往回 8 秒還沒回到正中間：回正秒數記為沒有
  remindSec: 6,     // 一直沒回正，多久提醒一次
  wrongDeg: 10,     // 往反方向轉超過 10 度：提醒方向
  wristDeg: null,   // 手機角度超過這個值多半是手腕在轉（各遊戲自己給；null＝不判）
  staleMs: 1000,    // 超過這麼久沒有新數值，當成讀不到
};

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const round = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

export class TiltMeasure {
  /* kind：'roll'（左右傾）或 'yaw'（左右轉），只用來寫進紀錄與報告用字 */
  constructor(opt = {}) {
    this.o = { ...TILT, ...opt };
    this.kind = opt.kind || 'roll';
    this.side = 0; this.rep = 0; this.reps = []; this.skipped = []; this.manual = [];
    this.done = false; this.started = false;
    this.go('center');
  }

  get sideId() { return this.o.sides[this.side]; }
  get dir() { return this.sideId === 'L' ? -1 : 1; }

  go(st) { this.st = st; this.stT = null; this.cenSince = null; this.cenVals = []; this.cur = null; this.remindAt = null; }

  push(s) {
    const ev = [], o = this.o, t = s.t, deg = s.deg == null || !Number.isFinite(s.deg) ? null : s.deg;
    if (this.done) return ev;
    if (!this.started) { this.started = true; ev.push({ type: 'side', side: this.sideId }); }
    if (this.stT == null) this.stT = t;

    if (this.st === 'center') {
      if (this.remindAt == null) this.remindAt = t + o.remindSec * 1000;
      if (deg != null && Math.abs(deg) <= o.centerDeg) {
        if (this.cenSince == null) { this.cenSince = t; this.cenVals = []; }
        this.cenVals.push(deg);
        if (t - this.cenSince >= o.centerSec * 1000) {
          /* 起點用後半段（剛回到 ±centerDeg 的那幾筆還在移動，不採） */
          const base = median(this.cenVals.slice(this.cenVals.length >> 1));
          this.st = 'out'; this.stT = t; this.cenSince = null;
          this.cur = { base, onsetT: null, peak: -Infinity, peakT: null, peakDeg: null, wrong: false, wrist: false, heldAt: null, backT0: null, backAt: null };
          ev.push({ type: 'ready', side: this.sideId, rep: this.rep });
        }
      } else {
        this.cenSince = null;
        if (t >= this.remindAt) { this.remindAt = t + o.remindSec * 1000; ev.push({ type: 'remindCenter' }); }
      }
      return ev;
    }

    const c = this.cur;
    if (this.st === 'out') {
      if (deg != null) {
        /* 還沒開始動、仍在正中間附近：起點慢慢跟著（回正比較慢的人，起點才不會停在半路） */
        if (c.onsetT == null && Math.abs(deg) < Math.abs(c.base)) c.base = c.base * 0.8 + deg * 0.2;
        const a = (deg - c.base) * this.dir;
        if (c.onsetT == null && a > o.onsetDeg) { c.onsetT = t; ev.push({ type: 'onset' }); }
        if (a > c.peak) { c.peak = a; c.peakT = t; c.peakDeg = deg; }
        if (!c.wrong && a < -o.wrongDeg) { c.wrong = true; ev.push({ type: 'wrongDir', side: this.sideId }); }
        if (!c.wrist && o.wristDeg != null && Math.abs(deg) > o.wristDeg) { c.wrist = true; ev.push({ type: 'wrist', side: this.sideId }); }
      }
      if (c.onsetT == null && t - this.stT >= o.noMoveSec * 1000) {
        if (this.rep === 0) this.skipped.push(this.sideId);
        ev.push({ type: 'skipSide', side: this.sideId, rep: this.rep });
        this.nextSide(ev);
        return ev;
      }
      const enough = c.peak >= o.minDeg;
      const a = deg == null ? null : (deg - c.base) * this.dir;
      if (enough && a != null && a <= c.peak - o.dropDeg) {
        c.backT0 = c.peakT; c.backAt = t; this.st = 'back';
        ev.push({ type: 'back' });
      } else if (enough && c.peakT != null && t - c.peakT >= o.holdMax * 1000 && c.heldAt == null) {
        c.heldAt = t; c.backT0 = t; c.backAt = t; this.st = 'back';
        ev.push({ type: 'holdLong' });
      } else if (!enough && c.onsetT != null && a != null && a < o.onsetDeg / 2 && t - c.peakT >= 1000) {
        /* 動了一點又回來，還不到 minDeg：這下不算，請他再多一點 */
        this.finishRep('small', null);
        ev.push({ type: 'rep', side: this.sideId, rep: this.rep, ok: false, small: true });
        this.afterRep(ev);
      } else if (t - this.stT >= o.repMaxSec * 1000) {
        this.finishRep(enough ? 'noReturn' : 'small', null);
        ev.push({ type: 'rep', side: this.sideId, rep: this.rep, ok: enough });
        this.afterRep(ev);
      }
      return ev;
    }

    if (this.st === 'back') {
      if (deg != null && Math.abs(deg - c.base) <= o.centerDeg) {
        this.finishRep(c.heldAt != null ? 'held' : 'ok', (t - c.backT0) / 1000);
        ev.push({ type: 'rep', side: this.sideId, rep: this.rep, ok: true });
        this.afterRep(ev);
      } else if (t - c.backAt >= o.backMaxSec * 1000) {
        this.finishRep('noReturn', null);
        ev.push({ type: 'rep', side: this.sideId, rep: this.rep, ok: true, noReturn: true });
        this.afterRep(ev);
      }
    }
    return ev;
  }

  finishRep(how, ret) {
    const c = this.cur, ok = c.peak >= this.o.minDeg;
    this.reps.push({
      side: this.sideId, ok, how,
      base: round(c.base), peak: c.peak === -Infinity ? null : round(c.peak),
      moveTime: c.onsetT != null && c.peakT != null && c.peakT > c.onsetT ? round((c.peakT - c.onsetT) / 1000, 2) : null,
      ret: ret == null ? null : round(ret, 2),
      wrong: c.wrong, wrist: c.wrist,
    });
    this.rep += 1;
  }

  afterRep(ev) {
    if (this.rep >= this.o.reps) this.nextSide(ev);
    else this.go('center');
  }

  nextSide(ev) {
    this.side += 1; this.rep = 0;
    if (this.side >= this.o.sides.length) { this.done = true; this.st = 'done'; ev.push({ type: 'done' }); return; }
    this.go('center');
    ev.push({ type: 'side', side: this.sideId });
  }

  /* 略過這一邊（帶領者按的） */
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
      /* 最多、平均先排除「可能手腕代勞」的那幾下（全部都是才用全部），原始最大另外留 bestAll */
      const clean = r.filter((x) => !x.wrist), use = clean.length ? clean : r;
      by[s] = {
        n: r.length, of: this.o.reps, skipped: this.skipped.includes(s), manual: this.manual.includes(s),
        best: use.length ? Math.max(...use.map((x) => x.peak)) : null,
        bestAll: r.length ? Math.max(...r.map((x) => x.peak)) : null,
        mean: use.length ? round(mean(use.map((x) => x.peak))) : null,
        moveTime: round(median(r.map((x) => x.moveTime).filter((x) => x != null)), 2),
        ret: round(median(r.map((x) => x.ret).filter((x) => x != null)), 2),
        noReturn: r.filter((x) => x.how === 'noReturn').length,
        wrist: r.filter((x) => x.wrist).length,
      };
    }
    const L = by.L && by.L.best, R = by.R && by.R.best;
    return { kind: this.kind, by, asym: L != null && R != null ? round(R - L) : null, reps: this.reps, tune: { centerDeg: this.o.centerDeg, minDeg: this.o.minDeg, wristDeg: this.o.wristDeg } };
  }
}
