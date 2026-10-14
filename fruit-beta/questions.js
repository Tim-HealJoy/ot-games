// 水果猜猜看（上集）題庫 v1（2026-10-14）
// stage: shadow 影子／section 剖面／zoom 放大鏡；alt＝二選一干擾選項（題庫外水果，不洩題）
window.STAGES = [
  { id: "shadow",  title: "第一關　影子猜猜看",  hint: "看影子，猜猜是什麼水果？" },
  { id: "section", title: "第二關　剖面猜猜看",  hint: "切開來，猜猜是什麼水果？" },
  { id: "zoom",    title: "第三關　放大鏡猜猜看", hint: "靠好近，猜猜是什麼水果？" },
];
window.QUESTIONS = [
  { stage: "shadow",  id: "apple",        name: "蘋果",   alt: "甘蔗",   chat: "以前蘋果很貴，您是生病還是過年才吃得到？" },
  { stage: "shadow",  id: "banana",       name: "香蕉",   alt: "金桔",   chat: "香蕉您喜歡吃黃一點的，還是有黑點、熟透的？" },
  { stage: "shadow",  id: "grape",        name: "葡萄",   alt: "香瓜",   chat: "吃葡萄您會吐皮，還是連皮一起吃？" },
  { stage: "shadow",  id: "waxapple",     name: "蓮霧",   alt: "酪梨",   chat: "蓮霧您喜歡直接咬，還是切開沾鹽？" },
  { stage: "shadow",  id: "sugarapple",   name: "釋迦",   alt: "櫻桃",   chat: "釋迦要放到軟軟的才好吃，您都放在哪裡等它熟？" },
  { stage: "section", id: "kiwi",         name: "奇異果", alt: "小番茄", chat: "奇異果您喜歡綠色酸酸的，還是黃色甜甜的？" },
  { stage: "section", id: "starfruit",    name: "楊桃",   alt: "蜜棗",   chat: "楊桃切成星星片吃，還是打成楊桃汁喝？" },
  { stage: "section", id: "papaya",       name: "木瓜",   alt: "李子",   chat: "木瓜直接吃，還是打成木瓜牛奶？" },
  { stage: "section", id: "dragonfruit",  name: "火龍果", alt: "枇杷",   chat: "火龍果您比較常吃白肉的，還是紅肉的？" },
  { stage: "section", id: "passionfruit", name: "百香果", alt: "甘蔗",   chat: "百香果用湯匙挖來吃，還是泡成百香果汁？" },
  { stage: "zoom",    id: "guava",        name: "芭樂",   alt: "桑椹",   chat: "芭樂要沾梅子粉，還是直接吃？" },
  { stage: "zoom",    id: "pear",         name: "水梨",   alt: "酪梨",   chat: "咳嗽的時候，家裡有沒有煮過冰糖燉水梨？" },
  { stage: "zoom",    id: "lemon",        name: "檸檬",   alt: "李子",   chat: "檸檬您會拿來泡水喝，還是擠在菜上面？" },
  { stage: "zoom",    id: "melon",        name: "哈密瓜", alt: "小番茄", chat: "哈密瓜是自己買來吃，還是送禮的時候才買？" },
  { stage: "zoom",    id: "peach",        name: "水蜜桃", alt: "甘蔗",   chat: "水蜜桃軟軟甜甜的，您喜歡軟的還是脆的？" },
];
// 二選一干擾選項 → 圖檔 img/alt_xxx.jpg
window.ALT_IMG = { "甘蔗":"sugarcane", "金桔":"kumquat", "香瓜":"muskmelon", "酪梨":"avocado", "櫻桃":"cherry",
  "小番茄":"cherrytomato", "蜜棗":"jujube", "李子":"plum", "枇杷":"loquat", "桑椹":"mulberry" };
// 各關線索階數（每階一張圖；最後一張是清楚的全貌，再按一下才出現文字答案）
window.LADDER = {
  shadow:  ["只看影子", "露出一點顏色", "看清楚"],
  section: ["切開的樣子", "切半，看得到外皮", "整顆看清楚"],
  zoom:    ["靠好近", "拉遠一點", "再拉遠一點", "全部看清楚"],
};
