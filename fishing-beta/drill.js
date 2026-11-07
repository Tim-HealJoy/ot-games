/* 開場動作練習（2026-11-06 老闆：要校正學員動作、舉越高越好、一開始就要練習）
   手舉到金線 3 次，金線一次比一次高；沒到線就放下會得到校正。
   這裡只有流程判斷，step() 回傳事件，語音與畫面在 index.html。

   不會卡關的設計：同一條線連續兩次沒到，金線降到他實際舉到的高度；全程超過 maxSec 也直接結束。 */

export const DRILL = {
  reps: 3,
  introSec: 4.9,   /* 第一句語音的時間 */
  first: 0.85,     /* 第一次的金線 */
  topSec: 1.1,     /* 到線後停一下，讓他看到自己舉到哪裡，也等「到了」這句講完 */
  lowLine: 0.42,   /* 手低於這裡才算放下 */
  lowSec: 0.2,
  remindSec: 6,    /* 手一直沒放下，多久提醒一次 */
  idleSec: 7,      /* 手一直沒舉，多久提醒一次 */
  startAt: 0.2,    /* 超過這裡才算開始舉 */
  dropBy: 0.14,    /* 從最高點掉這麼多才算放下，避免手抖被當成放棄 */
  raiseBy: 0.04,   /* 下一次金線比這次舉到的再高一點 */
  capLine: 1.3,
  floorLine: 0.35,
  maxSec: 60,
};

export class Drill {
  constructor(opt = {}) {
    this.o = { ...DRILL, ...opt };
    this.rep = 0; this.st = 'intro'; this.t = 0; this.total = 0;
    this.line = this.o.first; this.peak = 0; this.best = 0;
    this.miss = 0; this.idle = 0; this.lowT = 0; this.peaks = [];
    this.done = false;
  }

  go(st) { this.st = st; this.t = 0; }

  step(s, dt) {
    const o = this.o, ev = [];
    if (this.done) return ev;
    this.t += dt; this.total += dt;
    switch (this.st) {
      case 'intro':
        if (this.t >= o.introSec) this.go('low');
        break;
      case 'low':
        if (s < o.lowLine) {
          this.lowT += dt;
          if (this.lowT >= o.lowSec) { this.lowT = 0; this.peak = s; this.idle = 0; this.go('up'); ev.push('ready'); }
        } else {
          this.lowT = 0;
          if (this.t >= o.remindSec) { this.t = 0; ev.push('remindLow'); }
        }
        break;
      case 'up':
        if (s > this.peak) this.peak = s;
        this.idle += dt;
        if (s >= this.line) { ev.push('reach'); this.go('top'); break; }
        if (this.peak >= o.startAt && s <= this.peak - o.dropBy) {
          this.best = Math.max(this.best, this.peak);
          this.miss += 1;
          if (this.miss >= 2) { this.line = Math.max(o.floorLine, Math.min(this.line, this.peak * 0.97)); this.miss = 0; ev.push('lineDown'); }
          ev.push('miss');
          this.go('low');
          break;
        }
        if (this.idle >= o.idleSec) { this.idle = 0; ev.push('idle'); }
        break;
      case 'top':
        if (s > this.peak) this.peak = s;
        if (this.t >= o.topSec) {
          this.rep += 1; this.miss = 0;
          this.best = Math.max(this.best, this.peak);
          this.peaks.push(this.peak);
          if (this.rep >= o.reps) { this.finish(ev); break; }
          this.line = Math.min(o.capLine, Math.max(this.line + 0.08, this.peak + o.raiseBy));
          ev.push('next');
          this.go('low');
        }
        break;
    }
    if (!this.done && this.total >= o.maxSec) this.finish(ev);
    return ev;
  }

  finish(ev) { this.done = true; this.go('done'); ev.push('done'); }

  /* 練習比校正舉得更高，就把 100% 往上調；回傳新的最高（占舊範圍），沒有更高回傳 null */
  newMax() { return this.best > 1 ? this.best : null; }
}
