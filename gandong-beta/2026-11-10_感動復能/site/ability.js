/* 感．動復能 能力層：雷達分數＋今日點心（2026-11-11 v0.2 改讀成績卡，純函式，不碰畫面與儲存）
   依《能力雷達與 App 架構 v0.2》第七、八節，數字全部〔暫定〕：
   - 刻度 1～5 級。一筆紀錄的值＝玩到的等級 × 第一次就答對的比例（最低 1）。
   - 一軸＝最近 5 筆的加權平均（主要要素權重 1、次要 0.5）；主要練到這一軸的活動累積 3 次才解鎖。
   - 兩條線：最近 7 天 vs 第一週（第一筆滿 7 天後才畫第一週）。
   - 「動」：舉高看小測與動作遊戲量到的最高點；伸取看答案卡放哪裡、有沒有被移近；
     軀幹看手機傾斜角度；持續看一天玩了幾樣；下肢先上鎖。
   民眾版只講「練習表現」「第幾級」，不講分數、不講退化。 */
import { MIND_AXES, MOVE_AXES, QUIZ, axesOf } from './catalog.js';
import { buildCards, axisPoints, playedToday, dayKey, heightLevel, tiltLevel } from './scorecard.js';
import { flagsOf } from './recommend.js';

export const RADAR = { unlockN: 3, recentN: 5, days: 30, week: 7 };
const DAY = 864e5;
const r1 = (v) => Math.round(v * 10) / 10;
/* 切點與成績卡在 scorecard.js（11-11 起所有分數都先轉成績卡）；這裡轉出，舊的呼叫方式不變 */
export { dayKey, heightLevel, tiltLevel };

const IDX = Object.fromEntries(MIND_AXES.map((a, i) => [a.id, i]));
const MIND = new Set(MIND_AXES.map((a) => a.id));

/* 「感」各軸的點：答題，加上已回報成功率的動作遊戲 */
export function mindPoints(quizSessions, assessSessions = []) {
  return axisPoints(buildCards({ quizSessions, assessSessions })).filter((p) => MIND.has(p.axis));
}

/* 「動」各軸的點：舉高（入口與遊戲的量測）、伸取（答題卡位置）、軀幹（手機傾斜）、持續（一天玩完幾樣） */
export function movePoints(quizSessions, assessSessions) {
  return axisPoints(buildCards({ quizSessions, assessSessions })).filter((p) => !MIND.has(p.axis));
}

const wmean = (ps) => { const w = ps.reduce((a, p) => a + p.w, 0); return w ? r1(ps.reduce((a, p) => a + p.v * p.w, 0) / w) : null; };

/* 一張雷達：每一軸 { id, name, plain, n, need, score, first, locked } */
export function radar(axes, points, now = Date.now()) {
  return axes.map((a) => {
    const all = points.filter((p) => p.axis === a.id).sort((x, y) => x.at - y.at);
    if (a.locked) return { ...a, n: 0, need: null, score: null, first: null, locked: a.locked };
    const recent30 = all.filter((p) => now - p.at <= RADAR.days * DAY);
    /* 解鎖算「主要練到這一軸的活動」幾次（權重 1）；只是順帶練到（0.5）的不算，免得沒玩過排序就解鎖執行功能 */
    const n = new Set(all.filter((p) => p.w >= 1).map((p) => `${p.at}|${p.src}`)).size;
    if (n < RADAR.unlockN) return { ...a, n, need: RADAR.unlockN - n, score: null, first: null, locked: null };
    const week = recent30.filter((p) => now - p.at <= RADAR.week * DAY);
    const score = wmean((week.length ? week : recent30.length ? recent30 : all).slice(-RADAR.recentN));
    const t0 = all[0].at;
    const firstWeek = all.filter((p) => p.at - t0 <= RADAR.week * DAY);
    const first = now - t0 > RADAR.week * DAY ? wmean(firstWeek.slice(0, RADAR.recentN)) : null;
    return { ...a, n, need: 0, score, first, locked: null };
  });
}

/* 兩張雷達：先轉成績卡，再分「感」「動」 */
export function radarsFromCards(cards, now = Date.now()) {
  const pts = axisPoints(cards);
  return {
    mind: radar(MIND_AXES, pts.filter((p) => MIND.has(p.axis)), now),
    move: radar(MOVE_AXES, pts.filter((p) => !MIND.has(p.axis)), now),
  };
}
export function radars(quizSessions, assessSessions, now = Date.now()) {
  return radarsFromCards(buildCards({ quizSessions, assessSessions }), now);
}

/* 一句話摘要：只講好消息與下一步，不講弱項是「退化」 */
export function summaryLine(r) {
  const open = [...r.mind, ...r.move].filter((a) => a.score != null);
  const lock = [...r.mind, ...r.move].filter((a) => a.score == null && !a.locked);
  if (!open.length) return lock.length ? `再玩幾次，雷達就會一軸一軸畫出來。` : '';
  const up = open.filter((a) => a.first != null && a.score - a.first >= 0.5).sort((a, b) => (b.score - b.first) - (a.score - a.first));
  const top = [...open].sort((a, b) => b.score - a.score)[0];
  const head = up.length ? `「${up[0].name}」比第一週進步了。` : `目前最穩的是「${top.name}」。`;
  const next = lock.length ? `「${lock[0].name}」再玩 ${lock[0].need} 次就能畫出來。` : '';
  return head + next;
}

/* ---------- 今日遊戲：三樣，至少 1 樣動、1 樣感（第八節） ----------
   2026-11-12 老闆：要依玩家在小測（評估）的表現，給當天適合的遊戲。規則全部〔暫定〕，待老闆審：
   1. 動：今天小測推薦的第一款（recommend.js，看舉手與看圖）。
   （記菜 19:35 起記 5 樣、共問 10 樣，以下用「錯幾樣」）
   2. 記菜錯 3 樣以上（memLow）：一定排「菜市場記清單」，錯 3 樣最高第 2 級、錯 4 樣以上第 1 級。
   3. 記菜錯 1～2 樣：也排記清單，錯 1 樣最高第 4 級、錯 2 樣最高第 3 級。
   4. 看圖慢（slow）或忍不住（impulsive）：排「哪一個比較快」，最高第 2 級，看清楚再答。
   5. 其餘位置照雷達補（還沒畫出來的軸先、分數低的軸次之）。
   6. 記菜錯 3 樣以上、看圖慢／忍不住、或星期幾沒答對：今天其他答題最高第 2 級（今天先輕鬆）；記菜全對、看圖順：沿用上次等級，記清單沒玩過就從第 3 級。
   7. 今天沒做小測：照原本雷達規則（第一樣是「先做小測」）。 */
export function entryMind(entry) {
  if (!entry) return null;
  const f = flagsOf(null, entry);
  const e = f.memErr;
  const memStart = e == null ? null : e <= 0 ? 3 : e <= 2 ? 2 : 1;                         /* 記清單沒玩過時的起點 */
  const memCap = e == null ? 5 : e <= 0 ? 5 : e === 1 ? 4 : e === 2 ? 3 : e === 3 ? 2 : 1;  /* 今天記清單最高幾級 */
  const easy = f.memLow || f.slow || f.impulsive || f.dayWrong;
  return { ...f, memStart, memCap, capOther: easy ? 2 : 5 };
}

/* in：{ code, quizSessions, assessSessions, plan（入口今天的推薦，可為 null）, entry（今天的小測紀錄，可為 null）, lastLevel(act)→等級, now }
   out：[{ kind:'check'|'game'|'quiz', id, level?, diff?, why, done, src? }]；src='entry'＝依今天小測排的 */
export function todaySnack({ code = '', quizSessions = [], assessSessions = [], plan = null, entry = null, lastLevel = () => null, now = Date.now() } = {}) {
  /* 完成＝玩完一局或按「肩膀會痛」安全停止；遊戲只開了頭（入口量測抄過去）不算 */
  const cards = buildCards({ quizSessions, assessSessions }).filter((c) => !c.demo && c.who === code);
  const { quiz: playedQuiz, game: playedGame } = playedToday(cards, code, now);
  const out = [];
  /* 1 動：今天做過小測就用入口推薦的第一款；沒做過先做小測 */
  if (plan && plan.picks && plan.picks[0]) {
    const p = plan.picks[0];
    out.push({ kind: 'game', id: p.game, diff: p.diff, diffName: p.diffName, url: p.url, why: p.why, done: playedGame.has(p.game) });
  } else out.push({ kind: 'check', id: 'quiz', why: '先動一動手，幫你挑今天的身體遊戲。', done: false });

  /* 2、3 感：先補還沒解鎖的軸（差最少次的優先），再補分數最低的軸；同一軸不重複 */
  const r = radar(MIND_AXES, axisPoints(cards).filter((p) => MIND.has(p.axis)), now);
  const order = [...r].sort((a, b) => {
    const la = a.score == null ? 0 : 1, lb = b.score == null ? 0 : 1;
    if (la !== lb) return la - lb;
    if (la === 0) return a.need - b.need || IDX[a.id] - IDX[b.id];
    return a.score - b.score;
  });
  const chosen = new Set(), usedAxis = new Set();
  const E = entryMind(entry);
  const addQuiz = (id, level, why, axis) => {
    const q = QUIZ.find((x) => x.id === id); if (!q || chosen.has(id) || out.length >= 3) return;
    chosen.add(id); axesOf(q.elements).forEach((a) => usedAxis.add(a));
    out.push({ kind: 'quiz', id, level, why, axis, done: playedQuiz.has(id), src: 'entry' });
  };
  if (E) {
    if (!E.noMem && !E.memOk) {   /* 規則 2、3 */
      const last = lastLevel('memo');
      const lv = last ? Math.max(1, Math.min(E.memCap, last)) : E.memStart;
      addQuiz('memo', lv, E.memLow ? `剛剛記菜之後，今天從第 ${lv} 級慢慢練「記得住」。` : `剛剛記菜答對 ${E.memCorrect} 樣，今天用第 ${lv} 級再練一下「記得住」。`, 'mem');
    }
    if (E.slow || E.impulsive) {  /* 規則 4 */
      addQuiz('speed', Math.max(1, Math.min(2, lastLevel('speed') || 1)), '剛剛看圖之後，選一樣看清楚再答的，慢慢來不用急。', 'att');
    }
  }
  for (const ax of order) {
    if (out.length >= 3) break;
    if (usedAxis.has(ax.id)) continue;
    const cand = QUIZ.filter((q) => !chosen.has(q.id) && axesOf(q.elements).includes(ax.id));
    if (!cand.length) continue;
    /* 今天還沒玩的優先 */
    const q = cand.find((c) => !playedQuiz.has(c.id)) || cand[0];
    chosen.add(q.id); axesOf(q.elements).forEach((a) => usedAxis.add(a));
    const why = ax.score == null ? `「${ax.name}」再玩 ${ax.need} 次，雷達就畫得出來。` : `多練「${ax.name}」：${ax.plain}。`;
    let level = lastLevel(q.id) || (q.id === 'memo' && E && E.memStart ? E.memStart : 2);
    if (E) level = Math.max(1, Math.min(E.capOther, q.id === 'memo' ? E.memCap : 5, level));   /* 規則 6 */
    out.push({ kind: 'quiz', id: q.id, level, why: E && E.capOther < 5 ? `${why}今天先從第 ${level} 級輕鬆玩。` : why, axis: ax.id, done: playedQuiz.has(q.id) });
  }
  return out;
}
