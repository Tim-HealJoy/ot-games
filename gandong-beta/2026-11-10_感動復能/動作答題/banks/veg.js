/* 蔬菜猜猜看 產品版題庫 v0.1（2026-11-10）
   題目與圖片沿用上課版（~/ot-games/veg-beta/，Codex 生成），上課版原檔不動。
   產品版新增：
   - 第二個干擾選項 alt2（三選一用）。只從題庫外的 11 種菜挑，不洩題；
     依辨識題三鐵則挑外觀和正解明顯不同的。〔待老闆審：名單在架構 v0.2 對話〕
   - 五級（下面 levels）。
   ladder：線索圖張數，圖檔 {id}_{0..n-1}.jpg，最後一張＝清楚全貌。 */
const ALT_IMG = { 大白菜: 'napa', 青椒: 'greenpepper', 馬鈴薯: 'potato', 蔥: 'scallion', 四季豆: 'greenbean',
  菠菜: 'spinach', 小黃瓜: 'cucumber', 大蒜: 'garlic', 絲瓜: 'luffa', 薑: 'ginger', 空心菜: 'waterspinach' };

const STAGE = {
  shadow: { name: '影子', ask: '看影子，猜猜是什麼菜？', ladder: ['只看影子', '露出一點顏色', '看清楚'] },
  section: { name: '剖面', ask: '切開來，猜猜是什麼菜？', ladder: ['切開的樣子', '切半，看得到外皮', '整顆看清楚'] },
  zoom: { name: '放大鏡', ask: '靠好近，猜猜是什麼菜？', ladder: ['靠好近', '拉遠一點', '再拉遠一點', '全部看清楚'] },
};

const Q = [
  ['shadow', 'corn', '玉米', '大白菜', '大蒜', '玉米您喜歡用煮的，還是用烤的？'],
  ['shadow', 'eggplant', '茄子', '青椒', '菠菜', '茄子喜歡炒九層塔，還是蒸熟了沾醬？'],
  ['shadow', 'carrot', '紅蘿蔔', '馬鈴薯', '空心菜', '紅蘿蔔是炒蛋好吃，還是燉排骨湯好吃？'],
  ['shadow', 'pumpkin', '南瓜', '蔥', '大白菜', '南瓜做成金瓜炒米粉，還是煮金瓜粥？'],
  ['shadow', 'bamboo', '竹筍', '四季豆', '馬鈴薯', '夏天的竹筍要涼拌沾美乃滋，還是煮湯？'],
  ['section', 'onion', '洋蔥', '菠菜', '四季豆', '切洋蔥會流眼淚，您有什麼祕訣？'],
  ['section', 'tomato', '番茄', '小黃瓜', '空心菜', '番茄沾醬油膏和薑泥，還是番茄炒蛋？'],
  ['section', 'lotus', '蓮藕', '青椒', '薑', '蓮藕喜歡煮湯，還是用滷的？'],
  ['section', 'bittermelon', '苦瓜', '大白菜', '馬鈴薯', '苦瓜炒鹹蛋，還是煮排骨湯？'],
  ['section', 'okra', '秋葵', '馬鈴薯', '蔥', '秋葵黏黏的，您喜歡還是不喜歡？'],
  ['zoom', 'cabbage', '高麗菜', '大蒜', '小黃瓜', '高麗菜炒蝦米，還是包水餃？'],
  ['zoom', 'sweetpotato', '地瓜', '絲瓜', '青椒', '地瓜要用烤的，還是煮地瓜稀飯？'],
  ['zoom', 'cauliflower', '花椰菜', '薑', '菠菜', '您比較常吃白花椰，還是綠花椰？'],
  ['zoom', 'mushroom', '香菇', '空心菜', '四季豆', '乾香菇和新鮮香菇，您比較常用哪一種？'],
  ['zoom', 'taro', '芋頭', '青椒', '空心菜', '芋頭要吃甜的芋泥，還是鹹的芋頭米粉？'],
];

export const VEG = {
  id: 'veg',
  name: '蔬菜猜猜看',
  stage: STAGE,
  items: Q.map(([stage, id, name, alt, alt2, t], k) => ({
    id: 'v' + String(k + 1).padStart(2, '0'), stage, key: id, name, alt, alt2, t, ladder: STAGE[stage].ladder.length,
  })),
  clueImg: (it, step) => `img/veg/${it.key}_${step}.jpg`,
  optImg: (name, it) => (name === it.name ? `img/veg/${it.key}_${it.ladder - 1}.jpg` : `img/veg/alt_${ALT_IMG[name]}.jpg`),
  /* 五級：從第幾張線索開始、幾個選項、選項有沒有照片、關卡混不混 */
  levels: {
    1: { label: '第 1 級', start: 'clear', n: 2, photo: true, mix: false, perRound: 5 },
    2: { label: '第 2 級', start: 0, n: 2, photo: true, mix: false, perRound: 6 },
    3: { label: '第 3 級', start: 0, n: 3, photo: true, mix: false, perRound: 6 },
    4: { label: '第 4 級', start: 0, n: 3, photo: false, mix: false, perRound: 6 },
    5: { label: '第 5 級', start: 0, n: 3, photo: false, mix: true, perRound: 6 },
  },
  elements: (lv) => (lv >= 4 ? ['形狀辨識', '命名'] : lv >= 2 ? ['形狀辨識', '選擇反應'] : ['選擇反應', '命名']),
};
