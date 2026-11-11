/* 感．動復能：依入口小測推薦今天玩哪一款、玩多難（規則版，第一版 2026-11-10）
   - 純函式，不碰畫面與儲存。事實由量測算，句子只從下面的句庫挑，不臨場生成。
   - 規則由上往下，第一條符合的決定推薦；旗標全部列出來，給治療師看。
   - 高度單位與 assess/lift.js 相同：手部最高點高於肩膀多少 ÷ 軀幹長。 */

/* 門檻：暫定，待真人資料與老闆確認 */
export const TH = {
  lowBoth: 0.45,     // 兩手最高（取較高的那手）低於這個值：最高只到肩膀附近
  asym: 0.30,        // 兩手最高相差這麼多以上：左右差明顯
  impulsive: 2,      // 看圖「不該舉卻舉」幾題以上
  slowRt: 1.0,       // 反應時間中位數（秒）以上
  slowOmit: 2,       // 「該舉沒舉」幾題以上
};

export const RULE_ORDER = ['pain', 'lowBoth', 'asym', 'impulsive', 'slow', 'none'];

/* 句庫：講「這款適合今天的你的原因」，不講缺點、不下判斷。〔實務〕待老闆審 */
export const WHY = {
  pain: {
    fishing: '坐著慢慢玩，手舉到舒服的高度，一樣拉得到魚。',
    boar: '伸手碰一下就算，不用把手舉得很高。',
  },
  lowBoth: {
    fishing: '手不用舉很高也拉得到魚，慢慢來就好。',
    netlift: '舉一點點就算數，可以找家人一起把網子抬起來。',
  },
  asym: {
    netlift: '左手、右手都能出力，跟家人一起抬網子更有趣。',
    fishing: '左手、右手輪流拉魚，兩隻手都動一動。',
  },
  impulsive: {
    fishing: '看清楚是魚還是垃圾再拉，慢一點沒關係。',
    ride: '路上看到狀況先煞車，慢慢騎、不搶快。',
  },
  slow: {
    fishing: '簡單的關卡，魚會等你，看清楚再拉就好。',
    boar: '簡單的關卡慢慢來，看到山豬就伸手碰。',
  },
  none: {
    rhythm: '跟著老歌拍手、舉手，越動越有精神。',
    ride: '拿手機當方向盤，身體左右傾，騎車回家吃飯。',
    fishing: '坐著就能玩，魚來了手往上拉。',
  },
};

export const TWEAK = {
  noPush: '不提醒再舉高',
  gentle: '今天先從輕鬆的開始',
};

export const HOLD_WHY = {
  rhythmHigh: '這款高舉的段落比較多，等手舉得舒服一點再玩。',
  rhythmFast: '這款節奏比較快，可以先從其他款開始。',
};

/* 規則表：picks 依序；hold 是暫不推薦 */
export const RULES = {
  pain: { picks: [['fishing', 'easy', 'noPush'], ['boar', 'easy']], hold: [['rhythm', 'rhythmHigh']] },
  lowBoth: { picks: [['fishing', 'easy'], ['netlift', 'easy']], hold: [['rhythm', 'rhythmHigh']] },
  asym: { picks: [['netlift', 'normal'], ['fishing', 'normal']], hold: [] },
  /* 山豬 2 的正式關卡沒有「不能趕」的題目，練不到忍住，所以這列不放山豬（指揮官 11-10 更正） */
  impulsive: { picks: [['fishing', 'normal'], ['ride', 'normal']], hold: [] },
  slow: { picks: [['fishing', 'easy'], ['boar', 'easy']], hold: [['rhythm', 'rhythmFast']] },
  none: { picks: [['rhythm', 'normal'], ['ride', 'normal'], ['fishing', 'normal']], hold: [] },
};

const best = (lift, s) => {
  const b = lift && lift.by && lift.by[s];
  return b && b.n && b.best != null ? b.best : null;
};

/* 旗標。沒有舉手資料（沒量或紀錄壞了）不判舉手相關；沒有看圖資料不判 impulsive、slow。 */
export function flagsOf(subject, rec) {
  const lift = rec && rec.lift && rec.lift.by ? rec.lift : null;
  const gng = rec && rec.gng && rec.gng.trials && rec.gng.trials.length ? rec.gng : null;
  const L = best(lift, 'L'), R = best(lift, 'R');
  /* pain：入口答「把手舉高拿東西：做不到或會痛」（換算成 pain='yes'），或治療師建檔選「會痛」 */
  const pain = !!((subject && subject.pain === 'yes') || (rec && rec.painNow));   /* 或今天小測時按了「肩膀會痛」 */
  /* effort：入口答「有點吃力」。不改推薦哪幾款，只把難度壓在最低一級〔暫定，待老闆確認〕 */
  const effort = !!(subject && subject.reach === 'effort') && !pain;
  const lowBoth = !!lift && (L == null && R == null ? true : Math.max(L ?? -Infinity, R ?? -Infinity) < TH.lowBoth);
  const asym = !!lift && ((L == null) !== (R == null) || (L != null && R != null && Math.abs(L - R) >= TH.asym));
  const impulsive = !!gng && (gng.commissions || 0) >= TH.impulsive;
  const slow = !!gng && ((gng.rtMedian != null && gng.rtMedian >= TH.slowRt) || (gng.omissions || 0) >= TH.slowOmit);
  return { pain, effort, lowBoth, asym, impulsive, slow, noLift: !lift, noGng: !gng };
}

/* subject：store 的個案（可為 null＝訪客）；hubRecord：入口小測那一筆（可為 null）
   回傳 { flags, rule, picks:[{game,diff,why,tweak}], hold:[{game,why}] } */
export function recommend(subject, hubRecord) {
  const flags = flagsOf(subject, hubRecord);
  const rule = RULE_ORDER.find((k) => k === 'none' || flags[k]);
  const R = RULES[rule];
  const picks = R.picks.map(([game, diff, tw]) => {
    const p = { game, diff, why: WHY[rule][game], tweak: tw ? TWEAK[tw] : '' };
    if (flags.effort && diff !== 'easy') { p.diff = 'easy'; p.tweak = p.tweak || TWEAK.gentle; }
    return p;
  });
  const hold = R.hold.map(([game, w]) => ({ game, why: HOLD_WHY[w] }));
  return { flags, rule, picks, hold };
}

/* 句庫全部的句子（測試檢查禁用字用） */
export function allSentences() {
  const out = [];
  for (const r of Object.values(WHY)) out.push(...Object.values(r));
  out.push(...Object.values(TWEAK), ...Object.values(HOLD_WHY));
  return out;
}
