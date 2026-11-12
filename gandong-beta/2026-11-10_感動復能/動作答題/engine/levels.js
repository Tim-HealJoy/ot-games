/* 感．動復能 動作答題：出題、計分、下次等級（2026-11-10 v0.1）
   兩份題庫出成同一種題目格式，畫面只認這個格式：
   { qid, ask, img, options:[{label,img}], correct, clues, chat, stage, d }
   計分規則（暫定〔待確認〕）：第一次就答對＝1；答錯後看線索再答對＝0.5；都沒答對＝0。
   下次等級：第一次就答對 ≥ 85% 升一級；≤ 50% 降一級；其餘不變。 */

export function rng(seed = Date.now()) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* 正解位置平均分配：n 選一、k 題，每個位置盡量一樣多，再打亂順序 */
export function balancedSlots(n, k, r) {
  const s = []; for (let i = 0; i < k; i++) s.push(i % n);
  return shuffle(s, r);
}

export function buildSpeed(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  let pool = shuffle(bank.items.filter((it) => L.pool.includes(it.d)), r);
  /* 同一局不出重複的圖（自強號出現在三題裡） */
  const picked = [];
  const used = new Set();
  for (const it of pool) {
    if (picked.length >= L.perRound) break;
    if (used.has(it.a.i) || used.has(it.b.i)) continue;
    picked.push(it); used.add(it.a.i); used.add(it.b.i);
  }
  const slots = balancedSlots(2, picked.length, r);
  let asks;
  if (L.ask === 'fast') asks = picked.map(() => 'fast');
  else if (L.ask === 'alternate') asks = picked.map((_, i) => (i % 2 ? 'slow' : 'fast'));
  else asks = shuffle(picked.map((_, i) => (i < Math.ceil(picked.length / 2) ? 'fast' : 'slow')), r);
  return picked.map((it, i) => {
    const want = asks[i] === 'fast' ? it.a : it.b, other = asks[i] === 'fast' ? it.b : it.a;
    const opts = slots[i] === 0 ? [want, other] : [other, want];
    return {
      qid: it.id, d: it.d, ask: asks[i],
      prompt: asks[i] === 'fast' ? '哪一個比較快？' : '哪一個比較慢？',
      options: opts.map((o) => ({ label: o.n, img: bank.img(o.i), clue: o.c })),
      correct: slots[i], chat: it.t, retry: 'clue',
    };
  });
}

export function buildVeg(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  let items = shuffle(bank.items, r);
  if (!L.mix) {
    /* 不混關卡：挑一個關卡，題數不夠再補下一個關卡 */
    const order = shuffle(['shadow', 'section', 'zoom'], r);
    items = order.flatMap((st) => items.filter((it) => it.stage === st));
  }
  items = items.slice(0, L.perRound);
  const slots = balancedSlots(L.n, items.length, r);
  return items.map((it, i) => {
    const wrong = shuffle(L.n === 3 ? [it.alt, it.alt2] : [it.alt], r);
    const names = wrong.slice(); names.splice(slots[i], 0, it.name);
    const start = L.start === 'clear' ? it.ladder - 1 : L.start;
    const clues = []; for (let s = start; s < it.ladder; s++) clues.push(bank.clueImg(it, s));
    return {
      qid: it.id, d: lv, stage: it.stage,
      prompt: L.start === 'clear' ? '這是什麼菜？' : bank.stage[it.stage].ask,
      clueNames: bank.stage[it.stage].ladder.slice(start),
      options: names.map((nm) => ({ label: nm, img: L.photo ? bank.optImg(nm, it) : null })),
      correct: slots[i], chat: it.t, clues, retry: 'ladder',
    };
  });
}

/* 一題答完的分數：tries＝第幾次答對（1 起算），0＝沒答對 */
export const itemScore = (tries) => (tries === 1 ? 1 : tries > 1 ? 0.5 : 0);

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* 一局摘要。log：每題 { qid, tries, picks:[{zone,hand,rtMs,reach}], stuck } */
export function summarize(log, lv, maxLv = 5) {
  const n = log.length;
  const first = log.filter((x) => x.tries === 1).length;
  const score = log.reduce((a, x) => a + itemScore(x.tries), 0);
  const firstPicks = log.map((x) => x.picks[0]).filter(Boolean);
  const rt = firstPicks.filter((p) => p.hand !== 'tap' && p.rtMs != null).map((p) => p.rtMs);
  const hands = { L: 0, R: 0, both: 0, tap: 0, tilt: 0 };
  for (const x of log) for (const p of x.picks) hands[p.hand] = (hands[p.hand] || 0) + 1;
  const reachV = log.flatMap((x) => x.picks).filter((p) => p.reach && p.reach.v != null).map((p) => p.reach.v);
  const tiltDeg = log.flatMap((x) => x.picks).filter((p) => p.reach && p.reach.deg != null).map((p) => p.reach.deg);
  const firstRate = n ? first / n : 0;
  const next = firstRate >= 0.85 ? Math.min(maxLv, lv + 1) : firstRate <= 0.5 ? Math.max(1, lv - 1) : lv;
  return {
    n, first, firstRate: Math.round(firstRate * 100) / 100, score: Math.round(score * 10) / 10,
    rtMed: rt.length ? Math.round(median(rt)) : null,
    stuck: log.reduce((a, x) => a + (x.stuck || 0), 0),
    hands, reachVMed: reachV.length ? Math.round(median(reachV) * 100) / 100 : null,
    tiltDegMed: tiltDeg.length ? Math.round(median(tiltDeg) * 10) / 10 : null,
    level: lv, nextLevel: next,
  };
}

/* 這一局記入哪些訓練要素：腦力（題庫）＋動作（作答方式與格子） */
export function motionElements(input, layout) {
  if (input === 'tilt') return ['軀幹傾斜'];
  if (input === 'tap') return [];
  return layout === 'high' ? ['舉高'] : layout === 'wide' ? ['伸取跨中線'] : ['伸取'];
}

/* ---------- 猜價格：一斤比一斤，哪一個比較貴／便宜 ---------- */
export function buildPrice(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  const pool = shuffle(bank.pairs.filter((p) => L.pool.includes(p.d)), r);
  /* 同一局每樣東西只出現一次，避免「剛剛才比過」 */
  const used = new Set(), picked = [];
  for (const p of pool) {
    if (picked.length >= L.perRound) break;
    if (used.has(p.cheap.id) || used.has(p.dear.id)) continue;
    picked.push(p); used.add(p.cheap.id); used.add(p.dear.id);
  }
  const slots = balancedSlots(2, picked.length, r);
  let asks;
  if (L.ask === 'dear') asks = picked.map(() => 'dear');
  else if (L.ask === 'alternate') asks = picked.map((_, i) => (i % 2 ? 'cheap' : 'dear'));
  else asks = shuffle(picked.map((_, i) => (i < Math.ceil(picked.length / 2) ? 'dear' : 'cheap')), r);
  return picked.map((p, i) => {
    const want = asks[i] === 'dear' ? p.dear : p.cheap, other = asks[i] === 'dear' ? p.cheap : p.dear;
    const opts = slots[i] === 0 ? [want, other] : [other, want];
    return {
      qid: p.id, d: p.d, ask: asks[i] === 'dear' ? 'fast' : 'slow',   // 'slow'＝反過來問，畫面用藍字提醒
      prompt: asks[i] === 'dear' ? '一斤比一斤，哪一個比較貴？' : '一斤比一斤，哪一個比較便宜？',
      options: opts.map((o) => ({ label: o.short, img: bank.img(o.id), clue: `一斤約 ${o.p} 元` })),
      correct: slots[i], chat: `您最近買${want.short}，一斤多少錢？`, retry: 'clue',
    };
  });
}

/* ---------- 菜市場記清單：看清單 → 一樣一樣認 ---------- */
export function buildMemo(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  const SIM = bank.similar || [];
  const isSim = (a, b) => SIM.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
  const all = shuffle(bank.items, r);
  const usedAcross = new Set();
  const out = [];
  L.lists.forEach((size, li) => {
    /* 挑清單：彼此不太像，也不和前一張清單重複 */
    const list = [];
    for (const it of all) {
      if (list.length >= size) break;
      if (usedAcross.has(it.id) || list.some((x) => isSim(x.id, it.id))) continue;
      list.push(it);
    }
    list.forEach((x) => usedAcross.add(x.id));
    out.push({ type: 'study', qid: `study${li + 1}`, listNo: li + 1, lists: L.lists.length,
      prompt: '家人交代今天要買這些，記起來', items: list.map((x) => ({ label: x.short, img: bank.img(x.id) })),
      options: [{ label: '記好了' }, { label: '記好了' }], correct: -1 });
    const order = shuffle(list, r);
    const slots = balancedSlots(L.n, order.length, r);
    order.forEach((t, k) => {
      const cand = shuffle(bank.items.filter((x) => !list.includes(x) && !isSim(x.id, t.id)
        && (L.same ? x.grp === t.grp : x.grp !== t.grp)), r);
      /* 同類（或不同類）優先；干擾彼此太像時會被剔掉，所以一律接上其他候選補位 */
      const extra = shuffle(bank.items.filter((x) => x !== t && !list.includes(x) && !isSim(x.id, t.id) && !cand.includes(x)), r);
      const wrong = [...cand, ...extra].filter((x, i, a) => !a.slice(0, i).some((y) => isSim(x.id, y.id))).slice(0, L.n - 1);
      const opts = wrong.slice(); opts.splice(slots[k], 0, t);
      out.push({
        qid: `m_${t.id}`, d: lv, listNo: li + 1, prompt: '哪一樣在剛剛的清單上？',
        options: opts.map((o) => ({ label: o.short, img: bank.img(o.id) })),
        correct: slots[k], chat: `今天如果去菜市場，您最想買什麼？`, retry: 'reveal',
      });
    });
  });
  return out;
}

/* ---------- 生活排序王：一個主題拆成好幾步「第 N 步是哪一個？」 ---------- */
export function buildSeq(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  const fit = bank.topics.filter((t) => L.pool.includes(t.d) && t.steps.length >= L.k);
  const topics = shuffle(fit, r).slice(0, L.topics);
  const out = [];
  topics.forEach((t, ti) => {
    /* 從完整步驟挑 k 步，保持原本先後；一定留第一步，最後一步留給最後一題才不會太好猜 */
    const idx = shuffle(t.steps.map((_, i) => i).slice(1), r).slice(0, L.k - 1).sort((a, b) => a - b);
    const pic = (tid, i) => (bank.img ? bank.img(tid, i) : null);   // 步驟照片（2026-11-11 換掉 emoji；缺圖時畫面退回 emoji）
    const steps = [0, ...idx].map((i) => ({ label: t.steps[i][0], emoji: t.steps[i][1], img: pic(t.id, i) }));
    const asks = steps.length - 1;               // 最後一步不用選，自動補上
    const slots = balancedSlots(L.n, asks, r);
    for (let s = 0; s < asks; s++) {
      const want = steps[s], rest = steps.slice(s + 1);
      let wrong = shuffle(rest, r).slice(0, Math.min(L.n, rest.length + 1) - 1);
      /* 第 5 級：三選一時，其中一個換成「別的事情的步驟」 */
      if (L.intruder && wrong.length >= 2) {
        /* 闖入的步驟只從「生活流程」挑（d2、d3），不挑生肖、季節這種一看就不同類的；也不能和這個主題的步驟同名 */
        const own = new Set(t.steps.map((x) => x[0]));
        const others = bank.topics.filter((o) => o.id !== t.id && o.d >= 2);
        const o = others[Math.floor(r() * others.length)];
        const cand = o.steps.filter((x) => !own.has(x[0]));
        const st = cand[Math.floor(r() * cand.length)];
        wrong = [wrong[0], { label: st[0], emoji: st[1], img: pic(o.id, o.steps.indexOf(st)), intruder: o.title }];
      }
      const n = wrong.length + 1;
      const pos = Math.min(slots[s], n - 1);
      const opts = wrong.slice(); opts.splice(pos, 0, want);
      out.push({
        qid: `s_${t.id}_${s + 1}`, d: t.d, topic: t.title, topicNo: ti + 1, topics: topics.length,
        prompt: `${t.title}：${s === 0 ? (t.first || '最先做的是哪一個？') : '接下來是哪一個？'}`,
        seq: { title: t.title, done: steps.slice(0, s), total: steps.length, last: s === asks - 1 ? steps[steps.length - 1] : null },
        options: opts.map((o) => ({ label: o.label, emoji: o.emoji, img: o.img || null, intruder: o.intruder || null })),
        correct: pos, chat: t.chat, retry: 'ladder',
      });
    }
  });
  return out;
}

/* ---------- 台灣地名名產：「台北」有名的是哪一個？ ---------- */
export function buildPlace(bank, lv, r = rng()) {
  const L = bank.levels[lv];
  const cty = (reg) => reg.replace(/[市縣]$/, '');
  const AREA = { 台北: 'n', 新北: 'n', 基隆: 'n', 桃園: 'n', 新竹: 'n', 宜蘭: 'n', 苗栗: 'c', 台中: 'c', 彰化: 'c', 南投: 'c', 雲林: 'c', 嘉義: 's', 台南: 's', 高雄: 's', 屏東: 's', 花蓮: 'e', 台東: 'e', 澎湖: 'i', 金門: 'i', 連江: 'i' };
  /* 每樣東西的家鄉：答案＝題目縣市，錯誤選項查 HOME */
  const homeOf = new Map();
  for (const q of bank.questions) {
    homeOf.set(q.c[0], [...(homeOf.get(q.c[0]) || []), cty(q.region)]);
    if (!homeOf.has(q.w[0])) homeOf.set(q.w[0], bank.home[q.w[0]] || ['*']);
  }
  const pool = shuffle(bank.questions.filter((q) => L.sec.includes(q.sec)), r);
  /* 一局裡同一個縣市只出一次，免得「剛剛也是台南」 */
  const used = new Set(), picked = [];
  for (const q of pool) { if (picked.length >= L.perRound) break; const c = cty(q.region); if (used.has(c)) continue; used.add(c); picked.push(q); }
  const slots = balancedSlots(L.n, picked.length, r);
  const seen = new Set(picked.flatMap((q) => [q.c[0], q.w[0]]));
  return picked.map((q, i) => {
    const c = cty(q.region), ar = AREA[c];
    const opts = [{ key: q.c[0], label: q.c[1] }, { key: q.w[0], label: q.w[1] }];
    if (L.n === 3) {
      const g1 = bank.group[q.c[0]], g2 = bank.group[q.w[0]];
      const cand = [];
      for (const o of bank.questions) {
        if (o.sec !== q.sec || o.id === q.id) continue;
        for (const [k, name] of [o.c, o.w]) {
          const h = homeOf.get(k) || ['*'];
          if (h.includes('*') || h.includes(c) || k === q.c[0] || k === q.w[0]) continue;
          const g = bank.group[k]; if (!g || g === g1 || g === g2) continue;
          const near = h.some((x) => AREA[x] === ar);
          cand.push({ key: k, label: name, near, fresh: !seen.has(k) });
        }
      }
      const want = L.extra === 'near' ? (x) => x.near : (x) => !x.near;
      const best = shuffle(cand, r).sort((a, b) => (want(b) - want(a)) || (b.fresh - a.fresh));
      if (best[0]) { opts.push(best[0]); seen.add(best[0].key); }
    }
    const n = opts.length, pos = Math.min(slots[i], n - 1);
    const rest = shuffle(opts.slice(1), r);
    const ordered = rest.slice(); ordered.splice(pos, 0, opts[0]);
    return {
      qid: q.id, d: lv, sec: q.sec, place: q.place,
      prompt: q.sec === 'food' ? `「${q.place}」有名的是哪一個？` : `「${q.place}」的景點是哪一個？`,
      options: ordered.map((o) => ({ label: o.label, img: L.photo ? bank.img(o.key) : null, key: o.key })),
      correct: pos, chat: q.chat, retry: 'ladder',
    };
  });
}
