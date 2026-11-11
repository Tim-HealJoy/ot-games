/* 菜市場記清單 產品版 v0.1（2026-11-11 新做，補「記憶」軸）
   玩法：家人交代今天要買哪幾樣 → 看清單，記好了就伸手 → 清單蓋起來 → 一樣一樣問「哪一樣在清單上？」
   看清單不限時間（不倒數），看多久只記錄給治療師看。
   圖片沿用猜價格大挑戰的 37 樣市場商品（Codex 生成、同一種畫風）。
   干擾選項規則：
   - 不能是清單上的東西。
   - 不能和正解長得太像（SIMILAR），依辨識題三鐵則。
   - 第 1～3 級干擾選不同類（例如清單是菜，干擾是肉），第 4、5 級同類（菜對菜），比較難。〔待確認〕 */
import { ITEMS, itemImg } from './market.js';

export const SIMILAR = [
  ['sweet_potato_leaves', 'water_spinach'], ['chicken_leg', 'chicken_breast'], ['pork_belly', 'ground_pork'],
  ['enoki', 'king_oyster'], ['milk', 'pudding'], ['apples', 'tomatoes'], ['cherry', 'grapes'],
];

export const MEMO = {
  id: 'memo',
  name: '菜市場記清單',
  img: itemImg,
  items: ITEMS,
  similar: SIMILAR,
  /* lists：這一局有幾張清單、每張幾樣；n：幾選一；same：干擾是否同類 */
  levels: {
    1: { label: '第 1 級', lists: [2, 2, 2], n: 2, same: false },
    2: { label: '第 2 級', lists: [3, 3], n: 2, same: false },
    3: { label: '第 3 級', lists: [3, 3], n: 3, same: false },
    4: { label: '第 4 級', lists: [4, 4], n: 3, same: true },
    5: { label: '第 5 級', lists: [5, 4], n: 3, same: true },
  },
  elements: (lv) => (lv >= 4 ? ['記住清單', '分類', '選擇反應'] : ['記住清單', '選擇反應']),
};
