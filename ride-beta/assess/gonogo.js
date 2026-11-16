/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/gonogo.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 量測包 B：反應與抑制（看到「該做」就舉手，看到「不該做」手不動）
   用在釣魚（魚／垃圾）、之後的騎遍台灣與節奏律動。

   輸入：每個新的鏡頭樣本 {t(ms), v}；v＝兩手較高者的高度（軀幹長，與 lift.js 同定義），看不到為 null。
   固定順序、固定時間：每個人、每一次都一樣，才能比較。不隨機、不加速、不計分。

   反應時間取「開始動」的時間（比刺激出現前高 0.06 軀幹長），不取「舉過門檻」的時間：
   動作慢的人不會因此被算成反應慢。舉起 0.22 軀幹長（約 11 公分）才算有反應。 */
export const GNG = {
  seq: ['go', 'go', 'nogo', 'go', 'nogo', 'go', 'go', 'nogo'],
  gapSec: 1.4,      // 上一題結束後，至少隔多久
  lowSec: 0.4,      // 手要放下維持這麼久才出下一題（同時量基準高度）
  waitLowMax: 8,    // 等太久手還沒放下，照樣出題並標記
  remindSec: 5,
  winSec: 3,        // 每題看幾秒
  onsetBy: 0.06,
  respBy: 0.22,
  earlySec: 0.15,   // 出現後 0.15 秒內就開始動，視為搶先（不列入反應時間）
};

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (v, d = 3) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

export class GoNoGo {
  constructor(opt = {}) {
    this.o = { ...GNG, ...opt };
    this.restLine = opt.restLine ?? -0.35;
    this.i = 0; this.trials = []; this.done = false;
    this.st = 'gap'; this.stT = null; this.cur = null;
  }

  get kind() { return this.o.seq[this.i]; }

  push(s) {
    const ev = [], o = this.o, t = s.t, v = s.v;
    if (this.done) return ev;
    if (this.stT == null) this.stT = t;
    const low = v == null || v < this.restLine;
    switch (this.st) {
      case 'gap':
        if (t - this.stT >= o.gapSec * 1000) { this.st = 'wait'; this.stT = t; this.lowSince = null; this.base = []; this.remindAt = t + o.remindSec * 1000; }
        break;
      case 'wait': {
        if (low) {
          if (this.lowSince == null) { this.lowSince = t; this.base = []; }
          this.base.push(v ?? this.restLine);
          if (t - this.lowSince >= o.lowSec * 1000) this.present(t, false, ev);
        } else {
          this.lowSince = null;
          if (t >= this.remindAt) { this.remindAt = t + o.remindSec * 1000; ev.push({ type: 'remindLow' }); }
          if (t - this.stT >= o.waitLowMax * 1000) { this.base = [v]; this.present(t, true, ev); }
        }
        break;
      }
      case 'stim': {
        const c = this.cur;
        if (v != null) {
          if (c.onsetT == null && v > c.base + o.onsetBy) c.onsetT = t;
          if (v > c.peak) c.peak = v;
        }
        const responded = v != null && v >= c.base + o.respBy;
        if (responded) { this.close(t, true, ev); break; }
        if (t - c.t0 >= o.winSec * 1000) this.close(t, false, ev);
        break;
      }
    }
    return ev;
  }

  present(t, notLow, ev) {
    const base = this.base.length ? this.base.reduce((a, b) => a + b, 0) / this.base.length : this.restLine;
    this.cur = { i: this.i, kind: this.kind, t0: t, base, onsetT: null, peak: base, notLow };
    this.st = 'stim'; this.stT = t;
    ev.push({ type: 'stim', kind: this.kind, i: this.i });
  }

  close(t, responded, ev) {
    const c = this.cur, o = this.o;
    const onset = c.onsetT != null ? (c.onsetT - c.t0) / 1000 : null;
    const early = onset != null && onset < o.earlySec;
    const outcome = c.kind === 'go' ? (responded ? 'hit' : 'omission') : (responded ? 'commission' : 'reject');
    this.trials.push({ i: c.i, kind: c.kind, outcome, rt: responded ? round(onset) : null, early: responded && early, notLow: c.notLow, rise: round(c.peak - c.base) });
    ev.push({ type: outcome, i: c.i });
    this.i += 1;
    if (this.i >= o.seq.length) { this.done = true; this.st = 'done'; ev.push({ type: 'done' }); return; }
    this.st = 'gap'; this.stT = t; this.cur = null;
  }

  summary() {
    const T = this.trials, go = T.filter((x) => x.kind === 'go'), no = T.filter((x) => x.kind === 'nogo');
    const rts = go.filter((x) => x.outcome === 'hit' && !x.early && x.rt != null).map((x) => x.rt);
    return {
      goN: go.length, hits: go.filter((x) => x.outcome === 'hit').length, omissions: go.filter((x) => x.outcome === 'omission').length,
      nogoN: no.length, commissions: no.filter((x) => x.outcome === 'commission').length,
      early: T.filter((x) => x.early).length, notLow: T.filter((x) => x.notLow).length,
      rtMedian: round(median(rts)), rts, trials: T,
    };
  }
}
