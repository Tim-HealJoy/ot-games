/* 感．動復能 成績卡（2026-11-11 v0.1，純函式，不碰畫面與儲存）
   依《評估流程與回饋報告 v0.2》第六節：四個來源格式不同，每一局都先轉成同一種「成績卡」，
   雷達、今日點心、報告、後台、同齡百分比都只讀成績卡。

   來源（都在本機 localStorage）：
   - 用身體答題 gandong_quiz_v1 → fromQuiz
   - 入口小測 assess_v1 game='hub' → fromAssess（kind 'entry'）
   - 動作遊戲 assess_v1 game=各款 → fromAssess（kind 'game'）

   一張成績卡：
   { ver, id, who, at, kind:'entry'|'game'|'quiz', activity, level(1～5|null), rate(0～1|null),
     axes:[{axis, v(1～5), w(1|0.5)}], raw:{…原始指標}, quality:{ok, flags:[]},
     end:'done'|'safe'|'started', task:null, demo }
   - end：done 玩完；safe 按了「肩膀會痛」提前停（算完成，不讓長者為了任務忍痛）；started 只開了頭。
   - task：今日點心或治療師指派的第幾樣，由呼叫端標上（tagTasks）。 */
import { MIND_AXES, ELEMENTS, GAME_ELEMENTS } from './catalog.js';

export const CARD_VER = 1;
const MIND = new Set(MIND_AXES.map((a) => a.id));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const fin = (v) => typeof v === 'number' && isFinite(v);
export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/* 手舉高度（軀幹長，0＝肩膀）→ 1～5 級；與 lift.js 的 HEIGHT_WORDS 同一組切點 */
export function heightLevel(v) {
  if (v == null || !isFinite(v)) return null;
  return v < -0.15 ? 1 : v < 0.15 ? 2 : v < 0.45 ? 3 : v < 0.75 ? 4 : 5;
}
export function tiltLevel(deg) {
  if (deg == null || !isFinite(deg)) return null;
  return deg < 8 ? 1 : deg < 12 ? 2 : deg < 16 ? 3 : deg < 20 ? 4 : 5;
}
/* 入口記菜（6 樣答對幾樣）→ 「感．記得住」的值〔暫定〕
   入口只記 3 樣、再認，題目比「菜市場記清單」第 2 級還簡單，全對只給 3 級，免得把雷達拉得比實際高。 */
export function memLevel(correct) {
  if (correct == null || !isFinite(correct)) return null;
  return correct >= 6 ? 3 : correct >= 5 ? 2.5 : correct >= 4 ? 2 : 1;
}
/* 坐著轉身的角度（左右兩邊都轉得到的，取小的那邊）→ 1～5 級〔暫定切點，等資料再調〕；植物園拍鳥回報 play.turnDeg */
export function turnLevel(deg) {
  if (deg == null || !isFinite(deg)) return null;
  return deg < 20 ? 1 : deg < 35 ? 2 : deg < 50 ? 3 : deg < 70 ? 4 : 5;
}
export const REACH_BASE = { near: 1, low: 2, high: 3, wide: 4 };
/* 動作遊戲的難度 → 等級〔暫定〕 */
export const DIFF_LEVEL = { easy: 2, normal: 3, hard: 4 };

/* 一局的值＝等級 × 第一次就成功的比例（最低 1，最高 5） */
export const valueOf = (level, rate) => clamp(r1(level * rate), 1, 5);

/* 一組要素 → 「感」各軸的點（動作軸只由量測給分，不由答對率給） */
function mindAxes(elements, v) {
  const out = [];
  for (const e of elements || []) for (const [axis, w] of ELEMENTS[e] || []) if (MIND.has(axis)) out.push({ axis, v, w });
  return out;
}

function card(o) {
  return {
    ver: CARD_VER, id: o.id, who: o.who || '', at: o.at, kind: o.kind, activity: o.activity,
    level: o.level ?? null, rate: o.rate ?? null, axes: o.axes || [], raw: o.raw || {},
    quality: o.quality || { ok: true, flags: [] }, end: o.end || 'done', task: null, demo: !!o.demo,
  };
}

/* 用身體答題一局 → 成績卡 */
export function fromQuiz(s) {
  const sm = s.summary || {};
  const has = !!sm.n;
  const level = s.level || 1;
  const rate = has ? (fin(sm.firstRate) ? sm.firstRate : 0) : null;
  const axes = has ? mindAxes(s.elements && s.elements.mind, valueOf(level, rate)) : [];
  const flags = [];
  if (!has) flags.push('noItems');
  if (s.input === 'cam' && REACH_BASE[s.layout]) {
    const clean = !(s.layoutChanges && s.layoutChanges.length) && !sm.stuck;
    if (!clean) flags.push('layoutMoved');
    axes.push({ axis: 'reach', v: clamp(REACH_BASE[s.layout] + (clean ? 1 : 0), 1, 5), w: 1 });
  }
  if (s.input === 'tilt' && sm.tiltDegMed != null) axes.push({ axis: 'trunk', v: tiltLevel(sm.tiltDegMed), w: 1 });
  return card({
    id: s.id || `quiz:${s.activity}:${s.at}`, who: s.who, at: s.at, kind: 'quiz', activity: s.activity, level, rate, axes,
    raw: { n: sm.n || 0, first: sm.first ?? null, input: s.input || null, layout: s.layout || null, stuck: sm.stuck || 0,
      tiltDegMed: sm.tiltDegMed ?? null, nextLevel: sm.nextLevel ?? null, durationSec: s.durationSec ?? null },
    quality: { ok: has, flags }, end: 'done', demo: s.demo,
  });
}

const liftBest = (lift, side) => {
  const b = lift && lift.by && lift.by[side];
  return b && b.n && fin(b.best) ? b.best : null;
};

/* 入口小測或動作遊戲一局 → 成績卡 */
export function fromAssess(s) {
  const entry = s.game === 'hub';
  const flags = [];
  const axes = [];
  const L = liftBest(s.lift, 'L'), R = liftBest(s.lift, 'R');
  const best = L == null && R == null ? null : Math.max(L ?? -9, R ?? -9);
  /* 遊戲開局沿用入口今天量的（hub.js adopt），量測是抄來的：不再算一次，避免同一次舉手算兩分 */
  const copied = !!s.hub;
  if (copied) flags.push('copiedMeasure');
  if (best != null && !copied) axes.push({ axis: 'lift', v: heightLevel(best), w: 1 });

  const play = s.play || null;
  const level = play ? (DIFF_LEVEL[play.diff] ?? null) : null;
  /* 各款遊戲回報 play.rate（這局成功的比例）後，才進「感」雷達；還沒回報就只記分數 */
  const rate = play && fin(play.rate) ? clamp(play.rate, 0, 1) : null;
  if (play && rate == null) flags.push('noRate');
  if (!entry && level && rate != null) axes.push(...mindAxes(GAME_ELEMENTS[s.game], valueOf(level, rate)));
  /* 用身體帶著手機轉身的遊戲（拍鳥）：轉身角度進「坐得穩」；滑鼠拖曳不算，所以遊戲只在用手機時回報 turnDeg */
  if (!entry && play && fin(play.turnDeg)) axes.push({ axis: 'trunk', v: turnLevel(play.turnDeg), w: 1 });
  /* 入口記菜（2026-11-12）：問完 6 樣才算進「記得住」，只問一半不算 */
  const m = entry && s.mem && fin(s.mem.correct) ? s.mem : null;
  if (m && m.n >= (m.of || 6)) axes.push({ axis: 'mem', v: memLevel(m.correct), w: 1 });
  else if (m) flags.push('memPartial');

  const end = entry ? (best != null || s.gng || m ? (s.painNow ? 'safe' : 'done') : 'started')
    : play ? 'done' : s.painNow ? 'safe' : 'started';
  const g = s.gng || null;
  return card({
    id: s.id || `${s.game}:${s.at}`, who: s.code, at: s.at, kind: entry ? 'entry' : 'game', activity: s.game, level, rate, axes,
    /* gng 欄位名以 gonogo.js summary() 為準（commissions／omissions／rtMedian），舊名留著相容 */
    raw: { liftL: L, liftR: R, gng: g ? { commission: g.commissions ?? g.commission ?? null, omission: g.omissions ?? g.omission ?? null, rtMed: g.rtMedian ?? g.rtMed ?? null } : null,
      mem: m ? { book: m.book || null, correct: m.correct, of: m.of || 6, n: m.n, hits: m.hits, fa: m.fa, rtMed: m.rtMedian ?? null } : null,
      score: play ? play.score ?? null : null, diff: play ? play.diff ?? null : null, turnDeg: play ? play.turnDeg ?? null : null, pain: s.pain || null, painNow: !!s.painNow },
    quality: { ok: best != null || !!g || !!m || !!play, flags }, end, demo: s.demo,
  });
}

/* 兩個本機紀錄 → 全部成績卡（舊到新） */
export function buildCards({ quizSessions = [], assessSessions = [] } = {}) {
  const out = [];
  for (const s of quizSessions || []) if (s && fin(s.at)) out.push(fromQuiz(s));
  for (const s of assessSessions || []) if (s && fin(s.at) && s.game) out.push(fromAssess(s));
  return out.sort((a, b) => a.at - b.at);
}

export const finished = (c) => c.end === 'done' || c.end === 'safe';

/* 成績卡 → 雷達的點 [{at, axis, v, w, src}]。展示資料不算。
   「持續」＝一天玩完幾樣（入口小測不算，只開了頭的不算）。 */
export function axisPoints(cards) {
  const pts = [];
  const real = (cards || []).filter((c) => !c.demo);
  for (const c of real) for (const a of c.axes) pts.push({ at: c.at, axis: a.axis, v: a.v, w: a.w, src: c.activity });
  const byDay = new Map();
  for (const c of real) {
    if (c.kind === 'entry' || !finished(c)) continue;
    const k = dayKey(c.at), o = byDay.get(k) || { at: c.at, n: 0 };
    o.n++; o.at = Math.max(o.at, c.at); byDay.set(k, o);
  }
  for (const o of byDay.values()) pts.push({ at: o.at, axis: 'endure', v: clamp(o.n, 1, 5), w: 1, src: 'day' });
  return pts;
}

/* 今天玩完了哪些活動：{ quiz:Set, game:Set } */
export function playedToday(cards, who, now = Date.now()) {
  const today = dayKey(now);
  const quiz = new Set(), game = new Set();
  for (const c of cards || []) {
    if (c.demo || c.who !== who || dayKey(c.at) !== today || !finished(c)) continue;
    if (c.kind === 'quiz') quiz.add(c.activity);
    else if (c.kind === 'game') game.add(c.activity);
  }
  return { quiz, game };
}

/* 把今天的成績卡對到點心清單：第一張符合的卡標上第幾樣（1 起算） */
export function tagTasks(cards, snacks, who, now = Date.now()) {
  const today = dayKey(now);
  const used = new Set();
  (snacks || []).forEach((sn, i) => {
    const kind = sn.kind === 'game' ? 'game' : sn.kind === 'quiz' ? 'quiz' : sn.kind === 'check' ? 'entry' : null;
    const c = (cards || []).find((x) => !used.has(x) && !x.demo && x.who === who && dayKey(x.at) === today
      && x.kind === kind && (kind === 'entry' || x.activity === sn.id) && finished(x));
    if (c) { used.add(c); c.task = { day: today, no: i + 1 }; }
  });
  return cards;
}

/* 給後台、匯出用：一張卡壓成一列（不含姓名、影像、骨架） */
export const CARD_COLS = ['who', 'at', 'kind', 'activity', 'level', 'rate', 'end', 'ok', 'axes', 'task'];
export function cardRow(c) {
  return [c.who, new Date(c.at).toISOString(), c.kind, c.activity, c.level ?? '', c.rate ?? '', c.end, c.quality.ok ? 1 : 0,
    c.axes.map((a) => `${a.axis}:${a.v}${a.w < 1 ? '*' : ''}`).join(' '), c.task ? c.task.no : ''];
}
