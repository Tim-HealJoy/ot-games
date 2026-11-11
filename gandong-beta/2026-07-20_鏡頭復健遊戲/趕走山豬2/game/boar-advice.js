/* 趕走山豬 2：「下一局可以試」建議庫（依「這一局伸手的表現」格子圖挑一句）
   事實由程式算，句子只從這裡挑，不臨場生成。每句都是〔實務〕待審，老闆審過再拿掉標記。
   建檔註記舉手會痛時，不出任何鼓勵舉高的句子。 */
import { checkBanned } from './assess/advice.js?v=1';

export const BOAR_LIB = {
  high: { text: '{邊}的麻雀停好了再舉手，舉到不會痛的高度，慢慢揮過去。', src: '〔實務〕待審', raise: true },
  low: { text: '老鼠停下來聞的時候，{手}往下放、碰牠一下就好，身體不用彎。', src: '〔實務〕待審' },
  mid: { text: '草叢一搖就先把{手}抬起來等，山豬跑出來再伸過去。', src: '〔實務〕待審' },
  cross: { text: '遠的那一邊也可以用另一隻手伸過去趕，試一兩次就好。', src: '〔實務〕待審' },
  good: { text: '每一層都顧到了。下一局可以選難一級，或換一隻手多趕幾隻。', src: '〔實務〕待審' },
  /* 會痛的人（建檔註記，或今天試手時說會痛）：不建議加難、不建議伸到另一邊 */
  goodPain: { text: '每一層都顧到了。肩膀不舒服就先休息，下次照一樣的難度再玩。', src: '〔實務〕待審' },
};
const SIDE = { L: '左邊', R: '右邊' }, HAND = { L: '左手', R: '右手' };
const fill = (t, m) => t.replace(/\{(.)\}/g, (_, k) => m[k] ?? '');

/* cells：{high:{L,R}, mid:{L,R}, low:{L,R}}，每格 {n, chased, rate, rtMed}；opt：{pain, both, crossN, chased} */
export function pickBoarAdvice(cells, { pain = false, both = true, crossN = 0, chased = 0 } = {}) {
  const cand = [];
  const rateGap = (layer) => {
    const c = cells[layer]; if (!c || !c.L.n || !c.R.n) return null;
    const lo = c.L.rate <= c.R.rate ? 'L' : 'R', hi = lo === 'L' ? 'R' : 'L';
    return { side: lo, gap: c[hi].rate - c[lo].rate, low: c[lo].rate };
  };
  /* 嚴重度：趕走率低、左右差大；反應慢差距以秒計（1 秒約當 0.5 的趕走率差） */
  const h = rateGap('high');
  if (h && !pain && (h.gap >= 0.15 || h.low < 0.6)) cand.push({ id: 'high', w: (1 - h.low) + h.gap, m: { 邊: SIDE[h.side] } });
  const lw = rateGap('low');
  if (lw && (lw.gap >= 0.15 || lw.low < 0.6)) cand.push({ id: 'low', w: (1 - lw.low) + lw.gap, m: { 手: HAND[lw.side] } });
  const md = cells.mid;
  if (md && md.L.rtMed != null && md.R.rtMed != null && Math.abs(md.L.rtMed - md.R.rtMed) >= 0.15) {
    const slow = md.L.rtMed > md.R.rtMed ? 'L' : 'R';
    cand.push({ id: 'mid', w: Math.abs(md.L.rtMed - md.R.rtMed) * 0.5 + 0.1, m: { 手: HAND[slow] } });
  }
  if (!pain && both && chased >= 6 && crossN / chased < 0.05) cand.push({ id: 'cross', w: 0.3, m: {} });
  cand.sort((a, b) => b.w - a.w);
  const pick = cand[0] || { id: pain ? 'goodPain' : 'good', m: {} };
  const lib = BOAR_LIB[pick.id];
  const text = fill(lib.text, pick.m);
  return { id: pick.id, text, src: lib.src, banned: checkBanned(text) };
}
