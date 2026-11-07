/* 釣魚規則：物件、難度、計分、星星、稱號。純資料與純函式，平衡模擬與測試都用這一份。 */

export const ITEMS = {
  tilapia: { name: '吳郭魚', pts: 10, good: true, w: 320, win: 1, voice: 'fish0' },
  milkfish: { name: '虱目魚', pts: 20, good: true, w: 430, win: 1, voice: 'fish1' },
  hairtail: { name: '白帶魚', pts: 25, good: true, w: 640, win: 1, voice: 'fish4' },
  snapper: { name: '嘉鱲魚', pts: 30, good: true, w: 370, win: 0.85, voice: 'fish2b' },
  flying: { name: '飛魚', pts: 35, good: true, w: 440, win: 0.9, voice: 'fish5' },
  grouper: { name: '石斑魚', pts: 40, good: true, w: 400, win: 0.9, voice: 'fish6' },
  tuna: { name: '鮪魚', pts: 50, good: true, w: 560, win: 0.7, voice: 'fish3b' },
  mahi: { name: '鬼頭刀', pts: 60, good: true, w: 500, win: 0.75, voice: 'fish7' },
  pomfret: { name: '白鯧', pts: 70, good: true, w: 340, win: 0.8, voice: 'fish8b' },
  marlin: { name: '旗魚', pts: 80, good: true, w: 680, win: 0.65, voice: 'fish9' },
  chest: { name: '寶箱', pts: 100, good: true, w: 310, win: 1, voice: 'chest', center: true },
  can: { name: '空鐵罐', pts: -10, good: false, w: 220, center: true },
  shoe: { name: '破鞋子', pts: -30, good: false, w: 330, center: true },
  tire: { name: '舊輪胎', pts: -50, good: false, w: 290, center: true },
};
export const FISH_ORDER = ['tilapia', 'milkfish', 'hairtail', 'snapper', 'flying', 'grouper', 'tuna', 'mahi', 'pomfret', 'marlin', 'chest'];
export const TRASH_ORDER = ['can', 'shoe', 'tire'];
export const DOUBLE_SEC = 10;
/* 金線：個人最高的 85%。一點點抬手就釣得到，舉到金線這條魚的分數多五成 */
export const HIGH_LINE = 0.85;
export function heightBonus(pts, peak, doubled = false) {
  if (pts <= 0 || peak < HIGH_LINE) return 0;
  const b = Math.round((pts * 0.5) / 5) * 5;
  return doubled ? b * 2 : b;
}

/* win＝魚咬鉤後可反應秒數；trashWin＝垃圾要忍住多久；approach／gap／hook／after 決定節奏 */
/* trashArm＝垃圾出現多久後才開始判定（看得到垃圾時，體諒來不及收手）；困難版魚從深水浮上來才看得清楚，
   所以 trashArm 0 加 trashGrace：沒看清楚就拉，勾到垃圾要算，不能靠抓時機亂拉。
   emerge＝困難版從深水浮到鉤子的秒數（取代 approach）；hook＝掛在鉤上的最短與最長秒數，最長要留時間把手舉到金線。 */
export const DIFF = [
  {
    name: '簡單', rise: 0.08, win: 8, trashWin: 3, trashArm: 0.35, dur: 90,
    tag: true, voice: true, text: true, shadow: false,
    approach: 2.0, gap: [0.6, 1.1], hook: [1.1, 3.5], after: 1.0,
    mix: { tilapia: 38, milkfish: 27, snapper: 15, tuna: 5, shoe: 8, can: 7, tire: 0 },
  },
  {
    name: '普通', rise: 0.10, win: 2.5, trashWin: 1.8, trashArm: 0.25, dur: 60,
    tag: true, voice: false, text: true, shadow: false,
    approach: 1.25, gap: [0.25, 0.6], hook: [0.8, 2.0], after: 0.6,
    mix: { tilapia: 17, milkfish: 14, hairtail: 11, snapper: 9, flying: 6, grouper: 5, tuna: 3, mahi: 2, shoe: 12, can: 12, tire: 9 },
  },
  {
    name: '困難', rise: 0.11, win: 1.3, trashWin: 1.2, trashArm: 0, trashGrace: 250, dur: 60,
    tag: false, voice: false, text: false, shadow: true,
    approach: 0.85, emerge: 1.5, gap: [0.1, 0.3], hook: [0.55, 1.5], after: 0.4,
    mix: { tilapia: 9, milkfish: 9, hairtail: 8, snapper: 7, flying: 6, grouper: 5, tuna: 4, mahi: 3, pomfret: 2, marlin: 1, shoe: 16, can: 16, tire: 14 },
  },
];

/* 今日漁況：每局不同，魚種比例與天色跟著變。mix 是倍率。 */
export const TODAY = [
  { id: 'calm', name: '風平浪靜', voice: 'today0', text: '今天風平浪靜，魚群穩定', tint: null, mix: {} },
  { id: 'milk', name: '虱目魚季', voice: 'today1', text: '今天虱目魚特別多', tint: { c: '#FFC9A8', a: 0.28 }, mix: { milkfish: 3 } },
  { id: 'tuna', name: '鮪魚洄游', voice: 'today2b', text: '鮪魚洄游，大魚特別多', tint: { c: '#FF9A4D', a: 0.34 }, mix: { tuna: 3.5, snapper: 1.5 } },
  { id: 'flying', name: '飛魚季', voice: 'today4', text: '今天是飛魚季，飛魚特別多', tint: { c: '#BFD8FF', a: 0.3 }, minDiff: 1, mix: { flying: 3.5 } },
  { id: 'mahi', name: '鬼頭刀成群', voice: 'today5', text: '鬼頭刀成群，把握機會', tint: { c: '#FFE07A', a: 0.26 }, minDiff: 1, mix: { mahi: 3.5, flying: 1.5 } },
  { id: 'storm', name: '颱風剛過', voice: 'today3', text: '颱風剛過，垃圾變多，大魚也靠岸', tint: { c: '#5A6B85', a: 0.42 }, mix: { shoe: 1.5, can: 1.5, tire: 1.5, tuna: 2 } },
];
/* 結算要列的物件：這個難度會出現的魚＋寶箱＋垃圾，由低分到高分 */
export function itemsFor(diff) {
  const m = DIFF[diff].mix;
  return [...FISH_ORDER.filter((k) => k === 'chest' || k in m), ...TRASH_ORDER];
}
export function mixFor(diff, todayId) {
  const t = TODAY.find((x) => x.id === todayId) || TODAY[0];
  const out = {};
  for (const [k, v] of Object.entries(DIFF[diff].mix)) out[k] = v * (t.mix[k] ?? 1);
  return out;
}

/* 連擊：連續釣到魚，分數加碼。忍住垃圾不中斷連擊；魚跑掉、勾到垃圾歸零。 */
export function comboBonus(combo) {
  return combo >= 10 ? 20 : combo >= 6 ? 10 : combo >= 3 ? 5 : 0;
}
/* 一次得分：魚＝基本分＋連擊加碼；最後 10 秒全部加倍（扣分也加倍） */
export function scoreFor(pts, combo, doubled) {
  const base = pts > 0 ? pts + comboBonus(combo) : pts;
  return doubled ? base * 2 : base;
}

/* 星星分數線：以該難度預設局長計算，局長改變時等比例換算。sim_balance.mjs 算出來的。 */
export const STARS = [
  [350, 580, 830],
  [350, 550, 770],
  [200, 520, 800],
];
export function starLines(diff, dur) {
  const k = dur / DIFF[diff].dur;
  return STARS[diff].map((v) => Math.round((v * k) / 10) * 10);
}
export function starsFor(score, diff, dur) {
  return starLines(diff, dur).filter((v) => score >= v).length;
}
/* 下一顆星還差幾分；已滿星回傳 null */
export function nextStarGap(score, diff, dur) {
  const next = starLines(diff, dur).find((v) => score < v);
  return next == null ? null : next - score;
}

export const TITLES = [
  [0, '見習漁夫'], [30, '小漁夫'], [100, '熟手漁夫'], [250, '老漁夫'], [500, '漁港達人'], [1000, '討海王'],
];
export function titleFor(total) {
  let i = 0;
  for (let k = 0; k < TITLES.length; k++) if (total >= TITLES[k][0]) i = k;
  const next = TITLES[i + 1];
  return { name: TITLES[i][1], next: next ? next[1] : null, need: next ? next[0] - total : 0 };
}
