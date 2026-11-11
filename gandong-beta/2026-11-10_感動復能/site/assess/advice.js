/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/advice.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 摘要與建議（規則版）
   - 事實由程式算，建議只從下面的建議庫挑，不臨場生成。之後接語言模型也只負責改寫成白話，不可新增判斷。
   - 長輩版只講好消息與一件下次可以試的事；治療師版列數字、代償與提醒。
   - 建議庫標〔實務〕的句子是我依臨床慣例寫的，待老闆審定（2026-11-07；手機傾斜的句子 2026-11-10）。 */
import { heightWord } from './lift.js?v=1';
import { selfCompare, bandCompare } from './compare.js?v=1';

/* 不可出現在任何報告的字：避免被讀成診斷或療效宣稱 */
export const BANNED = ['診斷', '退化', '異常', '嚴重', '中風程度', '失智風險', '惡化', '病情', '療效', '治療效果', '風險'];

/* {go}{nogo}{verb}{side} 由各遊戲的說法代入 */
export const LIB = {
  pain: { text: '舉到不會痛的高度就好，停一下再放下。肩膀痛起來就先休息。', src: '〔實務〕待審' },
  sitStraight: { text: '舉手時背貼著椅背、身體坐正，慢慢舉，停一下再放下。', src: '〔實務〕待審；依據：中風上肢代償多為軀幹與肩代償（Andrade 等，2026）' },
  affected: { text: '{side}舉到{level}，停一下再放下，連做 5 下。肩膀會痛就先停。', src: '〔實務〕待審' },
  lookFirst: { text: '先看清楚是{go}還是{nogo}再動，慢一點沒關係。', src: '〔實務〕待審' },
  moveSmall: { text: '{go}來了就把手抬起來，不用很高，動一下就算。', src: '〔實務〕待審' },
  daily: { text: '每天玩一局，手舉高、停一下，再放下來。', src: '〔實務〕待審' },
  tiltBody: { text: '手機貼在胸口、手肘夾緊，用身體慢慢往一邊{verb}，停一下再回到正中間。', src: '〔實務〕待審' },
  tiltSide: { text: '{side}多{verb}一點點，停一下再慢慢回到正中間。', src: '〔實務〕待審' },
  tiltDaily: { text: '每天玩一趟，身體往左、往右各{verb} 3 下，慢慢來。', src: '〔實務〕待審' },
};

const SIDE_NAME = { L: '左手', R: '右手' };
const TDIR = { L: '往左', R: '往右' };
const TVERB = { roll: '傾', yaw: '轉' };
const f2 = (v) => (v == null ? '—' : v.toFixed(2));
const f1 = (v) => (v == null ? '—' : v.toFixed(1));
const f0 = (v) => (v == null ? '—' : String(Math.round(v)));
const fill = (t, m) => String(t).replace(/\{(\w+)\}/g, (_, k) => (m[k] ?? `{${k}}`));

export function checkBanned(text) { return BANNED.filter((w) => String(text).includes(w)); }

/* subject：個案；history：這款遊戲的紀錄（舊到新，最後一筆是這次）
   各遊戲的說法：
   - trial＝量測關的名字（釣魚「試竿」、舉網「試網」、騎遍台灣「試車」）
   - goName／nogoName／goVerb／goUnit／nogoUnit：看圖題的說法（釣魚「魚來了就拉：8 條拉了 5 條」）
   - goLabel／goValue／nogoLabel／nogoValue：整句換掉時用，{n}題數 {h}有做 {k}忍住
   - act：治療師版「該舉沒舉」的動詞（按煞車的遊戲用「按」）
   - painNote：建檔「舉手會痛」時，這款遊戲實際調了什麼（給治療師看）
   - tiltNote：手機傾斜的遊戲，量測前做了什麼示範（給治療師看）
   - lib：換掉建議庫某一句的文字，例如 { moveSmall: '小狗衝出來就按煞車，看到就按。' }
   - headGo／headNogo：反應變快、更能忍住時的好消息標題（{go}{nogo} 代入） */
const PAIN_NOTE = '建檔註記舉手會痛：遊戲中已關閉高度加分與「再舉高一點」提醒，開場練習也略過。';
export function buildSummary(subject, history, {
  goName = '魚', nogoName = '垃圾', goVerb = '拉', goUnit = '條', nogoUnit = '個', trial = '試竿', painNote = PAIN_NOTE,
  goLabel = null, goValue = null, nogoLabel = null, nogoValue = null, act = '舉', tiltNote = '', lib = {},
  headGo = '{go}來的時候，比上次更快動起來', headNogo = '比上次更能忍住{nogo}',
} = {}) {
  const rec = history.at(-1) || {};
  if (rec.hub) {
    /* 這次的量測是沿用感．動復能入口的小測，不是這款遊戲自己的量測關（2026-11-10）。
       入口看的是魚和垃圾、動作是舉手，所以量測關的名字與看圖題的說法都換成入口的，
       不用各遊戲自己的（節奏律動的音符與月亮、山豬的山豬與公雞）。 */
    trial = '小測'; goName = '魚'; nogoName = '垃圾'; goVerb = '舉'; act = '舉'; lib = {};
    goLabel = '看到魚就舉手'; goValue = '{n} 題舉了 {h} 題'; nogoLabel = '看到垃圾手不動'; nogoValue = '{n} 題忍住 {k} 題';
    headGo = '看到{go}，比上次更快動起來'; headNogo = '比上次更能忍住{nogo}';
  }
  const lift = rec.lift && rec.lift.by ? rec.lift : null;
  const tilt = rec.tilt && rec.tilt.by ? rec.tilt : null;
  const gng = rec.gng && rec.gng.goN ? rec.gng : null;
  const verb = tilt ? TVERB[tilt.kind] || '傾' : '傾';
  const cmp = {
    L: selfCompare(history, 'lift.by.L.best'), R: selfCompare(history, 'lift.by.R.best'),
    tL: selfCompare(history, 'tilt.by.L.best'), tR: selfCompare(history, 'tilt.by.R.best'),
    rt: selfCompare(history, 'gng.rtMedian'), com: selfCompare(history, 'gng.commissions'),
  };
  const first = history.length <= 1;
  const affected = subject && subject.cond === 'stroke' && (subject.side === 'L' || subject.side === 'R') ? subject.side : null;
  const sideOrder = affected ? [affected, affected === 'L' ? 'R' : 'L'] : ['L', 'R'];
  const pickLib = (id, m = {}) => ({ id, text: fill(lib[id] || LIB[id].text, { go: goName, nogo: nogoName, verb, ...m }), src: LIB[id].src });

  /* ---------- 長輩版：一句好消息 ---------- */
  let headline = null;
  if (!first) {
    if (lift) for (const s of sideOrder) if (!headline && cmp[s].change === 'better') headline = `${SIDE_NAME[s]}比上次舉得更高了`;
    if (tilt) for (const s of sideOrder) if (!headline && cmp[`t${s}`].change === 'better') headline = `${TDIR[s]}比上次${verb}得更多了`;
    if (!headline && cmp.rt.change === 'better') headline = fill(headGo, { go: goName, nogo: nogoName });
    if (!headline && cmp.com.change === 'better') headline = fill(headNogo, { go: goName, nogo: nogoName });
  }
  /* 整段都略過（沒有任何一下、也沒有看圖）：不說「完成了」 */
  const nothing = !(lift && (lift.by.L.n || lift.by.R.n)) && !(tilt && (tilt.by.L.n || tilt.by.R.n)) && !(rec.gng && rec.gng.trials && rec.gng.trials.length);
  if (nothing) headline = `今天的${trial}先略過了，下次再試試`;
  if (!headline) {
    if (first) headline = `第一次${trial}完成，這就是您的起點`;
    else if (lift && lift.by.L.n && lift.by.R.n) headline = '今天兩隻手都有動起來';
    else if (lift) { const s = lift.by.L.n ? 'L' : lift.by.R.n ? 'R' : null; headline = s ? `今天${SIDE_NAME[s]}動得很好` : `今天的${trial}完成了`; }
    else if (tilt && tilt.by.L.n && tilt.by.R.n) headline = `今天往左、往右都有${verb}到`;
    else headline = `今天的${trial}完成了`;
  }

  const rows = [];
  if (lift) for (const s of ['L', 'R']) {
    const b = lift.by[s];
    rows.push({ label: `${SIDE_NAME[s]}舉到`, value: b.n ? heightWord(b.best) : '這次先休息' });
  }
  if (tilt) for (const s of ['L', 'R']) {
    const b = tilt.by[s];
    rows.push({ label: `手機${TDIR[s]}${verb}`, value: b.n ? `${f0(b.best)} 度` : '這次先休息' });
  }
  if (gng) {
    const m = { n: gng.goN, h: gng.hits }, k = { n: gng.nogoN, k: gng.nogoN - gng.commissions };
    rows.push({ label: goLabel || `${goName}來了就${goVerb}`, value: goValue ? fill(goValue, m) : `${gng.goN} ${goUnit}${goVerb}了 ${gng.hits} ${goUnit}` });
    rows.push({ label: nogoLabel || `${nogoName}忍住`, value: nogoValue ? fill(nogoValue, k) : `${gng.nogoN} ${nogoUnit}忍住 ${gng.nogoN - gng.commissions} ${nogoUnit}` });
  }

  /* ---------- 長輩版：下次可以試（只挑一件） ---------- */
  const leanSide = lift ? ['L', 'R'].find((s) => lift.by[s].lean >= 2) : null;
  const gap = lift && affected && lift.by.L.best != null && lift.by.R.best != null
    ? lift.by[affected === 'L' ? 'R' : 'L'].best - lift.by[affected].best : null;
  const wristN = tilt ? tilt.by.L.wrist + tilt.by.R.wrist : 0;
  const tiltLow = tilt && tilt.asym != null && Math.abs(tilt.asym) >= 8 ? (tilt.asym > 0 ? 'L' : 'R') : null;
  let next;
  const painful = !!((subject && subject.pain === 'yes') || rec.painNow);   /* 建檔會痛，或今天量測時說肩膀會痛 */
  if (painful && lift) next = pickLib('pain');
  else if (leanSide) next = pickLib('sitStraight');
  else if (affected && lift && (gap == null || gap > 0.3) && lift.by[affected].n) {
    next = pickLib('affected', { side: SIDE_NAME[affected], level: heightWord(lift.by[affected].best).replace('的高度', '').replace('高過頭頂', '頭頂') });
  } else if (tilt && wristN >= 2) next = pickLib('tiltBody');
  else if (tiltLow && tilt.by[tiltLow].n) next = pickLib('tiltSide', { side: TDIR[tiltLow] });
  else if (gng && gng.commissions >= 2) next = pickLib('lookFirst');
  else if (gng && gng.omissions >= 2) next = pickLib('moveSmall');
  else next = pickLib(tilt && !lift ? 'tiltDaily' : 'daily');

  /* ---------- 治療師版 ---------- */
  const facts = [], notes = [];
  if (lift) for (const s of ['L', 'R']) {
    const b = lift.by[s], c = cmp[s];
    if (!b.n) { facts.push(`${SIDE_NAME[s]}：${b.manual ? '帶領者按了略過，這一手沒有量' : b.skipped ? '第一下 8 秒內沒有動作，這一手略過' : '沒有完成的動作'}`); continue; }
    const comp = b.compN ? `；${b.n} 下中側傾 ${b.lean} 下、聳肩 ${b.hike} 下` : '；看不到髖部，未判代償';
    facts.push(`${SIDE_NAME[s]}最高 ${f2(b.best)} 軀幹長（${c.prev == null ? '第一次' : `上次 ${f2(c.prev)}`}），舉起中位數 ${f1(b.moveTime)} 秒${comp}`);
    if (c.steady) notes.push(`${SIDE_NAME[s]}最高已連續 ${c.streak} 次上升。`);
    const prevRec = history.length > 1 ? history.at(-2) : null, pb = prevRec && prevRec.lift && prevRec.lift.by[s];
    if (c.change === 'better' && pb && b.lean > (pb.lean || 0)) notes.push(`${SIDE_NAME[s]}舉高增加，但側傾次數也增加，增加的高度可能部分來自軀幹代償。`);
  }
  if (lift && lift.asym != null) {
    const low = lift.asym > 0 ? 'L' : 'R';
    facts.push(`左右差 ${f2(Math.abs(lift.asym))} 軀幹長（${SIDE_NAME[low]}較低${affected ? `；建檔患側為${SIDE_NAME[affected].replace('手', '側')}` : ''}）`);
  }
  if (tilt) {
    const wd = tilt.tune && tilt.tune.wristDeg;
    for (const s of ['L', 'R']) {
      const b = tilt.by[s], c = cmp[`t${s}`];
      if (!b.n) { facts.push(`手機${TDIR[s]}${verb}：${b.manual ? '帶領者按了略過，這一邊沒有量' : b.skipped ? '第一下 10 秒內沒有動作，這一邊略過' : '沒有完成的動作'}`); continue; }
      const excl = b.wrist && b.wrist < b.n ? `，最多與平均已排除這 ${b.wrist} 下（含這幾下最多 ${f0(b.bestAll)} 度）` : b.wrist ? '，每下都超過，最多與平均照算，請留意' : '';
      const extra = (b.wrist ? `；${b.n} 下中 ${b.wrist} 下超過 ${wd} 度，可能有手腕代勞${excl}` : '') + (b.noReturn ? `；${b.noReturn} 下沒有回到正中間` : '');
      facts.push(`手機${TDIR[s]}${verb}最多 ${f0(b.best)} 度（${c.prev == null ? '第一次' : `上次 ${f0(c.prev)}`}），${verb}出去 ${f1(b.moveTime)} 秒、回正 ${f1(b.ret)} 秒（中位數）${extra}`);
      if (c.steady) notes.push(`手機${TDIR[s]}${verb}已連續 ${c.streak} 次增加。`);
    }
    if (tilt.asym != null) {
      const low = tilt.asym > 0 ? 'L' : 'R';
      facts.push(`左右差 ${f0(Math.abs(tilt.asym))} 度（${TDIR[low]}較少${affected ? `；建檔患側為${SIDE_NAME[affected].replace('手', '側')}` : ''}）`);
    }
  }
  if (gng) {
    facts.push(`反應時間中位數 ${f2(gng.rtMedian)} 秒（${cmp.rt.prev == null ? '第一次' : `上次 ${f2(cmp.rt.prev)}`}）；該${act}沒${act} ${gng.omissions}／${gng.goN}，不該${act}卻${act} ${gng.commissions}／${gng.nogoN}，搶先 ${gng.early}`);
    if (gng.notLow) notes.push(`有 ${gng.notLow} 題出題時${tilt && !lift ? '還按著' : '手沒有放下'}，該題反應時間僅供參考。`);
  }
  if (rec.painNow) notes.push('今天量測時說肩膀會痛：舉手量測提前停止，已做的幾下照記；今天的遊戲不催舉高。只算今天，建檔資料沒有改。');
  if (subject && subject.pain === 'yes' && painNote) notes.push(painNote);
  /* 只有記了「有沒有練習」的遊戲才提醒（舉網沒有開場練習，不記這個欄位） */
  if (rec.warm && rec.warm.drill === false) notes.push('這次沒有經過開場動作練習，與有練習的次數比較時要留意。');
  if (tilt) notes.push(`角度是手機轉了幾度，分不出是身體還是手在轉${tiltNote ? `；${tiltNote}` : ''}。`);
  if (tilt && !lift) notes.push('數值為手機感測器估計，僅供訓練參考，請搭配臨床觀察判讀。門檻為暫定值。');
  else notes.push('數值為單一鏡頭估計，僅供訓練參考，請搭配臨床觀察判讀。代償門檻為暫定值。');

  const band = bandCompare(subject, lift ? lift.by[affected || 'L'].best : tilt ? tilt.by[affected || 'L'].best : null);
  const all = [headline, ...rows.map((r) => r.label + r.value), next.text, ...facts, ...notes];
  const banned = all.flatMap(checkBanned);
  return { elder: { headline, rows, next, band }, therapist: { facts, notes }, cmp, banned };
}
