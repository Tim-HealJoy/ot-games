/* 猜價格大挑戰 產品版題庫 v0.1（2026-11-11）
   上課版是 20 題固定配對，計價單位不一（一斤、一瓶、一包混著比）。產品版改成：
   - 只比「一斤」的東西（24 樣），長輩不用換算單位，題目才算得上同一種能力。
   - 兩樣的常見價格區間不可重疊（便宜那樣的最高價 < 貴那樣的最低價），答案沒有爭議。
     上課版有 5 題區間重疊（香蕉／高麗菜、雞胸／雞腿、苦瓜／空心菜、白蝦／虱目魚肚等），產品版不出。
   - 難度看價差：d1 差 3 倍以上、d2 差 1.8～3 倍、d3 差不到 1.8 倍。〔門檻暫定〕
   - 價格是上課版的 2026 年一般行情〔待查〕。 */
import { ITEMS, itemImg } from './market.js';

const JIN = '一斤 (600 公克)';
/* 兩樣看起來太像、長輩容易混的，不配成一題 */
const SIMILAR = [['sweet_potato_leaves', 'water_spinach'], ['chicken_leg', 'chicken_breast']];
const similar = (a, b) => SIMILAR.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

export function pricePairs() {
  const list = ITEMS.filter((i) => i.unit === JIN);
  const out = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    let a = list[i], b = list[j];
    if (a.p > b.p) [a, b] = [b, a];          // a 便宜、b 貴
    if (!(a.hi < b.lo) || similar(a.id, b.id)) continue;
    const r = b.p / a.p;
    out.push({ id: `p_${a.id}_${b.id}`, cheap: a, dear: b, ratio: Math.round(r * 100) / 100, d: r >= 3 ? 1 : r >= 1.8 ? 2 : 3 });
  }
  return out;
}

export const PRICE = {
  id: 'price',
  name: '猜價格大挑戰',
  n: 2,
  img: itemImg,
  pairs: pricePairs(),
  levels: {
    1: { label: '第 1 級', pool: [1], ask: 'dear', perRound: 6 },
    2: { label: '第 2 級', pool: [1, 2], ask: 'dear', perRound: 8 },
    3: { label: '第 3 級', pool: [2, 3], ask: 'dear', perRound: 8 },
    4: { label: '第 4 級', pool: [1, 2], ask: 'alternate', perRound: 8 },
    5: { label: '第 5 級', pool: [2, 3], ask: 'mixed', perRound: 8 },
  },
  elements: (lv) => (lv >= 4 ? ['比大小', '估價', '規則轉換'] : ['比大小', '估價']),
};
