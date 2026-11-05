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

/* 雙人過關量表：每位命中各加一半；都命中再加 sync 倍。公式對應規格「線 90＋同心加量表」 */
export const DUO_CLEAR = 90, DUO_SYNC_BONUS = 0.1;
export function duoGaugeDelta(gain, judgeL, judgeR) {
  const one = j => j === 'perfect' ? gain / 2 : (j === 'early' || j === 'late') ? gain * 0.65 / 2 : -gain * 0.8 / 2;
  const hit = j => j === 'perfect' || j === 'early' || j === 'late';
  return one(judgeL) + one(judgeR) + (hit(judgeL) && hit(judgeR) ? gain * DUO_SYNC_BONUS : 0);
}


/* 共用一條軌道的判定：一顆音符兩人各判一次。
   notes：{t,type,state:'wait'|'done',j:{L,R},off:{L,R}}；events：{L:[...],R:[...]}，事件 {t,type,used}
   W：{p,g} 判定窗。回傳依序發生的結果：
     {kind:'hit',side,note,judge,off}：這位跟上了
     {kind:'note',note,hits}：這顆音符結束（兩人都判完，或判定窗過了），hits＝幾位跟上
   規則：兩人都做了就立刻結束；窗過了還沒做的記 miss。不動任何畫面，方便用 node 測。 */
export function stepDuoNotes(notes, events, t, W) {
  const out = [];
  for (const n of notes) {
    if (n.state !== 'wait') continue;
    for (const s of ['L', 'R']) {
      if (n.j[s]) continue;
      let best = null, bestAbs = 1e9;
      for (const ev of events[s]) {
        if (ev.used || ev.type !== n.type) continue;
        const ab = Math.abs(ev.t - n.t);
        if (ab <= W.g && ab < bestAbs) { best = ev; bestAbs = ab; }
      }
      if (!best) continue;
      best.used = true;
      const off = best.t - n.t, judge = bestAbs <= W.p ? 'perfect' : off < 0 ? 'early' : 'late';
      n.j[s] = judge; n.off[s] = off;
      out.push({ kind: 'hit', side: s, note: n, judge, off });
    }
    const both = n.j.L && n.j.R;
    if (!both && t - n.t <= W.g) continue;
    if (!n.j.L) n.j.L = 'miss';
    if (!n.j.R) n.j.R = 'miss';
    n.state = 'done';
    out.push({ kind: 'note', note: n, hits: (n.j.L !== 'miss') + (n.j.R !== 'miss') });
  }
  return out;
}
