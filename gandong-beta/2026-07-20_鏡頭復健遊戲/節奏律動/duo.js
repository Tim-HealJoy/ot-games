/* 雙人模式共用邏輯（純函式，可用 node 測）。
   畫面是鏡像：坐在「畫面左邊」的人，在原始影像裡是右半邊（x 較大）。 */
const LSH = 11, RSH = 12, LWR = 15, RWR = 16;

export const shoulderX = lm => (lm[LSH].x + lm[RSH].x) / 2;

/* 把模型回傳的人（順序不固定）分到畫面左／右。
   兩人都在：x 大的是左邊，一定各得一人；只有一人：看他坐哪半邊。
   兩組骨架的肩膀中心幾乎疊在一起＝模型把同一個人認了兩次，只算一人（否則沒來的那位會被當成「看到了」）。 */
export const SAME_PERSON_GAP = 0.07;
export function assignPoses(poses) {
  const list = (poses || []).filter(Boolean);
  if (list.length >= 2) {
    const [a, b] = [...list].sort((p, q) => shoulderX(q) - shoulderX(p));
    if (shoulderX(a) - shoulderX(b) >= SAME_PERSON_GAP) return { L: a, R: b };
    return shoulderX(a) > 0.5 ? { L: a, R: null } : { L: null, R: a };
  }
  if (list.length === 1) return shoulderX(list[0]) > 0.5 ? { L: list[0], R: null } : { L: null, R: list[0] };
  return { L: null, R: null };
}

/* 畫面左／右對應原始影像的裁切範圍（鏡像，所以左右對調） */
export function cropOf(side, vw, vh) {
  const w = vw / 2;
  return { sx: side === 'L' ? w : 0, sy: 0, sw: w, sh: vh };
}

/* 手有沒有過中線（分區模式下過線就會被切掉，要提醒）。回傳畫面座標的判斷 */
export function crossedMid(lm, side, margin = 0.02) {
  if (!lm) return false;
  return [LWR, RWR].some(i => {
    const x = lm[i].x;
    return side === 'L' ? x < 0.5 - margin : x > 0.5 + margin;
  });
}

/* 同心：兩人同一動作在時間窗內都發生 */
export function isSync(a, b, winSec = 0.45) {
  return !!a && !!b && a.type === b.type && Math.abs(a.t - b.t) <= winSec;
}

/* ═══ 雙人競賽 ═══ 一人一條軌道，可選不同難度。
   不同難度的音符數不同，所以一顆音符的分數用「整首基礎分 ÷ 音符數」換算，
   連擊加成也看連擊佔整首的比例；這樣簡單和困難可以放在一起比。 */
export const BATTLE_BASE = 10000, BATTLE_GOOD = 0.6, BATTLE_CLAP_PTS = 20;
export function battleNotePts(judge, total) {
  const one = BATTLE_BASE / Math.max(1, total);
  return judge === 'perfect' ? one : one * BATTLE_GOOD;
}
export function battleMult(combo, total) {
  return 1 + 0.5 * Math.min(1, combo / Math.max(1, total * 0.25));
}
/* 領先條：左邊佔幾成（0～1）。分數還少時不要大幅擺動，兩端留一點讓輸的人看得到自己的顏色 */
export function leadShare(scoreL, scoreR) {
  const d = (scoreL - scoreR) / (scoreL + scoreR + 1000);
  return Math.max(0.06, Math.min(0.94, 0.5 + d * 0.8));
}
export function battleWinner(scoreL, scoreR) {
  return scoreL === scoreR ? 'tie' : scoreL > scoreR ? 'L' : 'R';
}

/* 判定一位玩家的音符。notes：{t,type,state:'wait'|'done',judge,off}；events：{t,type,used}；W：{p,g}。
   回傳 {kind:'hit',note,judge,off} 或 {kind:'miss',note}。不動任何畫面，方便用 node 測。 */
export function stepSideNotes(notes, events, t, W) {
  const out = [];
  for (const n of notes) {
    if (n.state !== 'wait') continue;
    let best = null, bestAbs = 1e9;
    for (const ev of events) {
      if (ev.used || ev.type !== n.type) continue;
      const ab = Math.abs(ev.t - n.t);
      if (ab <= W.g && ab < bestAbs) { best = ev; bestAbs = ab; }
    }
    if (best) {
      best.used = true;
      const off = best.t - n.t, judge = bestAbs <= W.p ? 'perfect' : off < 0 ? 'early' : 'late';
      n.state = 'done'; n.judge = judge; n.off = off;
      out.push({ kind: 'hit', note: n, judge, off });
    } else if (t - n.t > W.g) {
      n.state = 'done'; n.judge = 'miss';
      out.push({ kind: 'miss', note: n });
    }
  }
  return out;
}
