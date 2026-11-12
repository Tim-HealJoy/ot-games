/* 釣魚規則：物件、難度、計分、星星、稱號。純資料與純函式，平衡模擬與測試都用這一份。 */

/* fact＝圖鑑小知識、ask＝聊聊看問句（v1.8，依臺灣魚類資料庫等查證，出處表在 README「魚種查證 v1.8」）。
   魚種一律不用《臺灣海鮮選擇指南》列「避免」的魚。 */
const DB = '臺灣魚類資料庫（中央研究院）';
export const ITEMS = {
  tilapia: { name: '吳郭魚', pts: 10, good: true, w: 320, win: 1, voice: 'fish0', fact: '1946 年吳振輝、郭啟彰從新加坡帶回魚苗，就用兩人的姓來命名。', ask: '您知道吳郭魚的名字怎麼來的嗎？', src: '農業知識入口網' },
  scad: { name: '竹筴魚', pts: 15, good: true, w: 380, win: 1, voice: 'v_scad', fact: '台語叫「巴攏」，一年四季都捕得到，最適合油炸。', ask: '您吃過炸巴攏嗎？', src: DB },
  milkfish: { name: '虱目魚', pts: 20, good: true, w: 430, win: 1, voice: 'fish1', fact: '傳說鄭成功問「這是什麼魚？」，聽起來像「虱目魚」，名字就這樣來了。', ask: '您早餐吃過虱目魚粥嗎？', src: DB },
  mackerel: { name: '鯖魚', pts: 20, good: true, w: 430, win: 1, voice: 'v_mackerel', fact: '宜蘭南方澳是鯖魚的故鄉，台灣的鯖魚大多在這裡上岸。', ask: '您吃過鹽烤鯖魚嗎？', src: '宜蘭縣政府' },
  hairtail: { name: '白帶魚', pts: 25, good: true, w: 640, win: 1, voice: 'fish4', fact: '春夏是盛產期，也是北部海邊釣客最愛釣的魚。', ask: '您吃過煎白帶魚嗎？', src: DB },
  butterfish: { name: '肉魚', pts: 25, good: true, w: 300, win: 1, voice: 'v_butterfish', fact: '10 月到隔年 3 月最肥美，清蒸、油煎都好吃。', ask: '您常買肉魚回家煎嗎？', src: DB },
  snapper: { name: '嘉鱲魚', pts: 30, good: true, w: 370, win: 0.85, voice: 'fish2b', fact: '台語叫「加臘」，現在也能在海上箱網養殖，是高級的生魚片。', ask: '辦桌的時候吃過嘉鱲魚嗎？', src: DB },
  threadfin: { name: '午仔魚', pts: 30, good: true, w: 440, win: 0.9, voice: 'v_threadfin', fact: '胸鰭下面有 4 根鬚，澎湖人叫牠「鬚午仔」，清蒸最好吃。', ask: '您吃過清蒸午仔魚嗎？', src: DB },
  flying: { name: '飛魚', pts: 35, good: true, w: 440, win: 0.9, voice: 'fish5', fact: '春夏跟著黑潮游到東部，魚卵可以鹽漬，魚身可以曬成魚乾。', ask: '您看過飛魚飛出水面嗎？', src: DB },
  seabass: { name: '鱸魚', pts: 35, good: true, w: 470, win: 0.9, voice: 'v_seabass', fact: '鱸魚清蒸、煮湯都好，常被當成開刀後補身體的魚。', ask: '您喝過鱸魚湯補身體嗎？', src: DB },
  grouper: { name: '石斑魚', pts: 40, good: true, w: 400, win: 0.9, voice: 'fish6', fact: '市場上的石斑幾乎都是養殖的，台灣西南部是重要產地。', ask: '您吃過清蒸石斑嗎？', src: DB },
  amberjack: { name: '紅甘', pts: 45, good: true, w: 560, win: 0.75, voice: 'v_amberjack', fact: '又叫「紅頭午」，肉質鮮美，做生魚片、煎、煮湯都好吃。', ask: '您吃過紅甘生魚片嗎？', src: DB },
  tuna: { name: '鮪魚', pts: 50, good: true, w: 560, win: 0.7, voice: 'fish3b', fact: '黃鰭鮪台語叫「串仔」，做生魚片或煮熟都好吃。', ask: '您吃過鮪魚生魚片嗎？', src: DB },
  mahi: { name: '鬼頭刀', pts: 60, good: true, w: 500, win: 0.75, voice: 'fish7', fact: '又叫「飛烏虎」，高雄到東部的漁期在 3 到 8 月，5 月最多。', ask: '您吃過鬼頭刀魚排嗎？', src: DB },
  pomfret: { name: '白鯧', pts: 70, good: true, w: 340, win: 0.8, voice: 'fish8b', fact: '2 到 4 月是漁期，肉又細又嫩，老人小孩都適合吃。', ask: '過年桌上有白鯧嗎？', src: DB },
  marlin: { name: '旗魚', pts: 80, good: true, w: 680, win: 0.65, voice: 'fish9', fact: '東北季風吹起後旗魚游到東部，台東成功漁港有鏢旗魚的傳統。', ask: '您小時候吃過旗魚鬆嗎？', src: '公視新聞 2018' },
  chest: { name: '寶箱', pts: 100, good: true, w: 310, win: 1, voice: 'chest', center: true, fact: '每局都藏著一個，釣到就加 100 分。', ask: '如果真的釣到寶箱，您想要裡面裝什麼？' },
  /* 隱藏魚 */
  mullet: { name: '烏魚', pts: 90, good: true, hidden: true, w: 440, win: 1, voice: 'v_mullet', hint: '寒流來時', hintLong: '等到「寒流來了」的那一天，說不定會遇到。', fact: '冬天是烏魚季，母魚的卵做成烏魚子，貴到被叫做「烏金」。', ask: '您過年吃過烏魚子嗎？', src: DB },
  bigeye: { name: '紅目鰱', pts: 90, good: true, hidden: true, w: 360, win: 1, voice: 'v_bigeye', hint: '忍住垃圾', hintLong: '看到垃圾手不要動，忍住 2 個以上，牠就可能出現。', fact: '眼睛特別大、鱗片很硬，常常整片連皮剝掉，再煮薑絲湯。', ask: '您煮過紅目鰱湯嗎？', src: DB },
  rabbitfish: { name: '臭肚魚', pts: 90, good: true, hidden: true, w: 320, win: 1, voice: 'v_rabbitfish', hint: '玩滿 3 局', hintLong: '常來漁港的人才遇得到，累積玩滿 3 局以後就有機會。', fact: '愛吃海藻，處理不好會有藻味；背鰭的硬刺有毒，抓的時候要小心。', ask: '您被魚刺扎過手嗎？', src: DB },
  wahoo: { name: '土魠舅', pts: 100, good: true, hidden: true, w: 700, win: 1, voice: 'v_wahoo', hint: '連釣 5 條', hintLong: '連續釣到 5 條魚，中間不漏掉，牠就可能上鉤。', fact: '正式名字叫石喬，長得像土魠，所以被叫「土魠舅」，煎或煮味噌湯都好吃。', ask: '您吃過土魠魚羹嗎？', src: DB },
  giantgrouper: { name: '龍膽石斑', pts: 150, good: true, hidden: true, w: 640, win: 1, voice: 'v_giantgrouper', hint: '最後 10 秒', hintLong: '分數加倍的最後 10 秒，大魚才會靠過來。', fact: '石斑裡體型最大的一種，可以長到 2 公尺以上；市場上的是養殖的。', ask: '您看過比人還大的魚嗎？', src: DB },
  can: { name: '空鐵罐', pts: -10, good: false, w: 220, center: true },
  shoe: { name: '破鞋子', pts: -30, good: false, w: 330, center: true },
  tire: { name: '舊輪胎', pts: -50, good: false, w: 290, center: true },
};
/* 一般魚由低分到高分，寶箱最後 */
export const FISH_ORDER = ['tilapia', 'scad', 'milkfish', 'mackerel', 'hairtail', 'butterfish', 'snapper', 'threadfin', 'flying', 'seabass', 'grouper', 'amberjack', 'tuna', 'mahi', 'pomfret', 'marlin', 'chest'];
export const TRASH_ORDER = ['can', 'shoe', 'tire'];
/* ===== 隱藏魚（v1.8，2026-11-11 老闆要求）=====
   平常不出現；條件達成時每次出魚有 chance 的機會換成牠，每局每種最多一條。三種難度都會出現，動作和一般魚一樣。
   圖鑑沒釣到前只顯示「？」和 hint。when(s) 的 s：{today, combo, double, hold, rounds, spawned}。 */
export const HIDDEN = {
  mullet: { when: (s) => s.today === 'cold' && s.spawned >= 2, chance: 0.3 },
  bigeye: { when: (s) => s.hold >= 2, chance: 0.35 },
  wahoo: { when: (s) => s.combo >= 5, chance: 0.4 },
  giantgrouper: { when: (s) => s.double, chance: 0.5 },
  rabbitfish: { when: (s) => s.rounds >= 3 && s.spawned >= 3, chance: 0.08 },
};
export const HIDDEN_ORDER = ['mullet', 'bigeye', 'rabbitfish', 'wahoo', 'giantgrouper'];
export function pickHidden(s, got = new Set(), rnd = Math.random) {
  for (const k of HIDDEN_ORDER) {
    if (got.has(k)) continue;
    const h = HIDDEN[k];
    if (h.when(s) && rnd() < h.chance) return k;
  }
  return null;
}
/* 釣到會加分的全部（一般魚＋寶箱＋隱藏魚），圖鑑順序：一般魚（低分到高分）→ 寶箱 → 隱藏魚 */
export const GOOD_ORDER = [...FISH_ORDER, ...HIDDEN_ORDER];
export const DEX_ORDER = GOOD_ORDER;
/* 這條魚從哪個難度開始出現（圖鑑沒釣到時提示用）；寶箱與隱藏魚每個難度都有 */
export function firstDiff(k) {
  if (k === 'chest' || (ITEMS[k] && ITEMS[k].hidden)) return 0;
  const d = DIFF.findIndex((x) => k in x.mix);
  return d < 0 ? 0 : d;
}
/* 設定頁的「N 種魚」：這個難度會出現的一般魚數（不含寶箱、隱藏魚） */
export function fishCount(d) { return FISH_ORDER.filter((k) => k !== 'chest' && k in DIFF[d].mix).length; }
export const DOUBLE_SEC = 10;
/* 金線：個人最高的 85%。一點點抬手就釣得到，舉到金線這條魚的分數多五成 */
export const HIGH_LINE = 0.85;
/* 金線依難度（2026-11-12 老闆：釣魚加舉高分級，ICF 主要項目＝關節活動 b710）：
   簡單 60%／普通 75%／困難 90%（個人校正範圍）。仍是加分制，沒舉到照樣釣到。
   HIGH_LINE 0.85 只留給開場金線練習（量最高點用）。 */
export function lineFor(d) { return (DIFF[d] && DIFF[d].line) || HIGH_LINE; }
export function heightBonus(pts, peak, doubled = false) {
  if (pts <= 0 || peak < HIGH_LINE) return 0;
  const b = Math.round((pts * 0.5) / 5) * 5;
  return doubled ? b * 2 : b;
}

/* win＝魚咬鉤後可反應秒數；trashWin＝垃圾要忍住多久；approach／gap／hook／after 決定節奏 */
/* trashArm＝垃圾出現多久後才開始判定（看得到垃圾時，體諒來不及收手）；困難版魚從深水浮上來才看得清楚，
   所以 trashArm 0 加 trashGrace：沒看清楚就拉，勾到垃圾要算，不能靠抓時機亂拉。
   emerge＝從深水浮到鉤子的秒數（shadow 開時取代 approach；普通 1.9、困難 1.5）；
   trashCue:false＝垃圾不顯示名牌、咬鉤也不出「不要拉」，要自己看出是垃圾（魚照常有名牌與「舉高！」）；hook＝掛在鉤上的最短與最長秒數，最長要留時間把手舉到金線。 */
export const DIFF = [
  {
    name: '簡單', line: 0.60, rise: 0.08, win: 8, trashWin: 3, trashArm: 0.35, dur: 90,
    tag: true, voice: true, text: true, shadow: false,
    approach: 2.0, gap: [0.6, 1.1], hook: [1.1, 3.5], after: 1.0,
    mix: { tilapia: 26, scad: 12, milkfish: 20, mackerel: 12, snapper: 11, tuna: 4, shoe: 8, can: 7, tire: 0 },
  },
  {
    name: '普通', line: 0.75, rise: 0.10, win: 2.5, trashWin: 1.8, trashArm: 0.25, dur: 60,
    tag: true, voice: false, text: true, shadow: true, trashCue: false,
    approach: 1.25, emerge: 1.9, gap: [0.25, 0.6], hook: [0.8, 2.0], after: 0.6,
    mix: { tilapia: 10, scad: 7, milkfish: 9, mackerel: 7, hairtail: 7, butterfish: 5, snapper: 5, threadfin: 4, flying: 4, seabass: 3, grouper: 3, tuna: 2, mahi: 1, shoe: 12, can: 12, tire: 9 },
  },
  {
    name: '困難', line: 0.90, rise: 0.11, win: 1.3, trashWin: 1.2, trashArm: 0, trashGrace: 250, dur: 60,
    tag: false, voice: false, text: false, shadow: true,
    approach: 0.85, emerge: 1.5, gap: [0.1, 0.3], hook: [0.55, 1.5], after: 0.4,
    mix: { tilapia: 4, scad: 4, milkfish: 4, mackerel: 4, hairtail: 5, butterfish: 4, snapper: 4, threadfin: 4, flying: 4, seabass: 3, grouper: 3, amberjack: 3, tuna: 3, mahi: 2, pomfret: 2, marlin: 1, shoe: 16, can: 16, tire: 14 },
  },
];

/* 今日漁況：每局不同，魚種比例與天色跟著變。mix 是倍率。 */
export const TODAY = [
  { id: 'calm', name: '風平浪靜', voice: 'today0', text: '今天風平浪靜，魚群穩定', tint: null, mix: {} },
  { id: 'milk', name: '虱目魚季', voice: 'today1', text: '今天虱目魚特別多', tint: { c: '#FFC9A8', a: 0.28 }, mix: { milkfish: 3 } },
  { id: 'tuna', name: '鮪魚洄游', voice: 'today2b', text: '鮪魚洄游，大魚特別多', tint: { c: '#FF9A4D', a: 0.34 }, mix: { tuna: 3.5, snapper: 1.5 } },
  { id: 'flying', name: '飛魚季', voice: 'today4', text: '今天是飛魚季，飛魚特別多', tint: { c: '#BFD8FF', a: 0.3 }, minDiff: 1, mix: { flying: 3.5 } },
  { id: 'mahi', name: '鬼頭刀成群', voice: 'today5', text: '鬼頭刀成群，把握機會', tint: { c: '#FFE07A', a: 0.26 }, minDiff: 1, mix: { mahi: 3.5, flying: 1.5 } },
  { id: 'cold', name: '寒流來了', voice: 'today6', text: '寒流來了，海風好冷，說不定有特別的魚', tint: { c: '#CFE6FF', a: 0.32 }, mix: { mackerel: 1.5 } },
  { id: 'storm', name: '颱風剛過', voice: 'today3', text: '颱風剛過，垃圾變多，大魚也靠岸', tint: { c: '#5A6B85', a: 0.42 }, mix: { shoe: 1.5, can: 1.5, tire: 1.5, tuna: 2 } },
];
/* 結算要列的物件：這個難度會出現的魚＋寶箱＋垃圾，由低分到高分 */
/* 稀有魚：這個難度裡最少出現的幾種（由少到多累加，同權重一起算，佔一般魚出現量 15% 以內）。
   沒釣過前，結算頁顯示黑影＋「？？？」，引起好奇。簡單＝鮪魚；普通＝鬼頭刀、鮪魚、石斑魚、鱸魚；困難＝旗魚、鬼頭刀、白鯧 */
export function rareFish(diff, share = 0.15) {
  const m = DIFF[diff].mix, ks = FISH_ORDER.filter((k) => k !== 'chest' && m[k] > 0);
  const tot = ks.reduce((a, k) => a + m[k], 0), ws = [...new Set(ks.map((k) => m[k]))].sort((a, b) => a - b);
  let cum = 0, cut = 0;
  for (const w of ws) { cum += ks.filter((k) => m[k] === w).reduce((a, k) => a + m[k], 0); if (cum > tot * share) break; cut = w; }
  return ks.filter((k) => m[k] <= cut);
}
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
