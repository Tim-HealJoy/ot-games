// 蔬菜猜猜看 題庫 v1（2026-10-06 老闆 OK）
// stage: shadow 影子／section 剖面／zoom 放大鏡；alt＝二選一干擾選項（題庫外蔬菜，不洩題）
window.STAGES = [
  { id: "shadow",  title: "第一關　影子猜猜看",  hint: "看影子，猜猜是什麼菜？" },
  { id: "section", title: "第二關　剖面猜猜看",  hint: "切開來，猜猜是什麼菜？" },
  { id: "zoom",    title: "第三關　放大鏡猜猜看", hint: "靠好近，猜猜是什麼菜？" },
];
window.QUESTIONS = [
  { stage: "shadow",  id: "corn",        name: "玉米",   alt: "大白菜", chat: "玉米您喜歡用煮的，還是用烤的？" },
  { stage: "shadow",  id: "eggplant",    name: "茄子",   alt: "青椒",   chat: "茄子喜歡炒九層塔，還是蒸熟了沾醬？" },
  { stage: "shadow",  id: "carrot",      name: "紅蘿蔔", alt: "馬鈴薯", chat: "紅蘿蔔是炒蛋好吃，還是燉排骨湯好吃？" },
  { stage: "shadow",  id: "pumpkin",     name: "南瓜",   alt: "蔥",     chat: "南瓜做成金瓜炒米粉，還是煮金瓜粥？" },
  { stage: "shadow",  id: "bamboo",      name: "竹筍",   alt: "四季豆", chat: "夏天的竹筍要涼拌沾美乃滋，還是煮湯？" },
  { stage: "section", id: "onion",       name: "洋蔥",   alt: "菠菜",   chat: "切洋蔥會流眼淚，您有什麼祕訣？" },
  { stage: "section", id: "tomato",      name: "番茄",   alt: "小黃瓜", chat: "番茄沾醬油膏和薑泥，還是番茄炒蛋？" },
  { stage: "section", id: "lotus",       name: "蓮藕",   alt: "青椒",   chat: "蓮藕喜歡煮湯，還是用滷的？" },
  { stage: "section", id: "bittermelon", name: "苦瓜",   alt: "大白菜", chat: "苦瓜炒鹹蛋，還是煮排骨湯？" },
  { stage: "section", id: "okra",        name: "秋葵",   alt: "馬鈴薯", chat: "秋葵黏黏的，您喜歡還是不喜歡？" },
  { stage: "zoom",    id: "cabbage",     name: "高麗菜", alt: "大蒜",   chat: "高麗菜炒蝦米，還是包水餃？" },
  { stage: "zoom",    id: "sweetpotato", name: "地瓜",   alt: "絲瓜",   chat: "地瓜要用烤的，還是煮地瓜稀飯？" },
  { stage: "zoom",    id: "cauliflower", name: "花椰菜", alt: "薑",     chat: "您比較常吃白花椰，還是綠花椰？" },
  { stage: "zoom",    id: "mushroom",    name: "香菇",   alt: "空心菜", chat: "乾香菇和新鮮香菇，您比較常用哪一種？" },
  { stage: "zoom",    id: "taro",        name: "芋頭",   alt: "青椒",   chat: "芋頭要吃甜的芋泥，還是鹹的芋頭米粉？" },
];
// 二選一干擾選項 → 圖檔 img/alt_xxx.jpg
window.ALT_IMG = { "大白菜":"napa", "青椒":"greenpepper", "馬鈴薯":"potato", "蔥":"scallion", "四季豆":"greenbean",
  "菠菜":"spinach", "小黃瓜":"cucumber", "大蒜":"garlic", "絲瓜":"luffa", "薑":"ginger", "空心菜":"waterspinach" };
// 各關線索階數（每階一張圖；最後一張是清楚的全貌，再按一下才出現文字答案）
window.LADDER = {
  shadow:  ["只看影子", "露出一點顏色", "看清楚"],
  section: ["切開的樣子", "切半，看得到外皮", "整顆看清楚"],
  zoom:    ["靠好近", "拉遠一點", "再拉遠一點", "全部看清楚"],
};
