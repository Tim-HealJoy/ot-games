/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/compare.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 比較：跟自己比（第一階段），跟同齡比（之後有雲端資料才開）。

   「比上次高」只是事實描述，門檻 min 以下的差異視為差不多（鏡頭雜訊）。
   「持續進步」要連續 3 次都比前一次好（需要 4 次紀錄），這是保守規則；
   之後用重測信度算出 MDC，再改用 MDC 判定。 */
export const METRICS = {
  'lift.by.L.best': { name: '左手最高', better: 'up', min: 0.08, unit: '軀幹長' },
  'lift.by.R.best': { name: '右手最高', better: 'up', min: 0.08, unit: '軀幹長' },
  /* 手機角度：雜訊約 1～2 度，3 度以內當差不多（我暫定，未經重測信度） */
  'tilt.by.L.best': { name: '手機往左最多', better: 'up', min: 3, unit: '度' },
  'tilt.by.R.best': { name: '手機往右最多', better: 'up', min: 3, unit: '度' },
  'tilt.by.L.ret': { name: '往左回正秒數', better: 'down', min: 0.3, unit: '秒' },
  'tilt.by.R.ret': { name: '往右回正秒數', better: 'down', min: 0.3, unit: '秒' },
  'gng.rtMedian': { name: '反應時間', better: 'down', min: 0.1, unit: '秒' },
  'gng.commissions': { name: '不該舉卻舉', better: 'down', min: 1, unit: '次' },
  'gng.omissions': { name: '該舉沒舉', better: 'down', min: 1, unit: '次' },
};

export function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj) ?? null;
}

/* history：舊到新，最後一筆是這次 */
export function selfCompare(history, path) {
  const m = METRICS[path], sign = m.better === 'up' ? 1 : -1;
  const vals = history.map((h) => pick(h, path)).filter((v) => v != null && Number.isFinite(v));
  const cur = pick(history.at(-1), path);
  if (cur == null) return { path, cur: null, prev: null, delta: null, change: null, streak: 0, steady: false, trend: vals.slice(-6) };
  const prevRec = [...history.slice(0, -1)].reverse().find((h) => pick(h, path) != null);
  const prev = prevRec ? pick(prevRec, path) : null;
  const delta = prev == null ? null : cur - prev;
  const change = delta == null ? null : sign * delta >= m.min ? 'better' : sign * delta <= -m.min ? 'worse' : 'same';
  let streak = 0;
  for (let i = vals.length - 1; i > 0; i--) { if (sign * (vals[i] - vals[i - 1]) > 0) streak++; else break; }
  return { path, cur, prev, delta, change, streak, steady: streak >= 3, trend: vals.slice(-6) };
}

/* 同齡比較：第一階段沒有雲端資料，一律回「累積中」。
   之後的規則（見規格）：每組不足 30 人只跟自己比；30 人以上分三段；達樣本量且有抽樣設計才稱常模。 */
export const BAND_MIN_N = 30;
export function bandCompare(/* subject, value, group */) {
  return { status: 'none', n: 0, text: '同齡比較：資料還不夠，先跟自己比' };
}
