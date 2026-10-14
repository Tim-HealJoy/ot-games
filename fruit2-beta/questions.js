// 水果猜猜看（下集）題庫 v1（2026-10-14）
// stage: transform 水果變身記／season 當季水果攤；alt＝二選一干擾選項；also＝也算對的答案（老闆：合理答案都算對）
window.STAGES = [
  { id: "transform", title: "第一關　水果變身記", hint: "做成點心以前，它是什麼水果？", ask: "這是什麼水果做的？" },
  { id: "season",    title: "第二關　當季水果攤", hint: "看看是什麼時候，猜猜攤子上最多的水果", ask: "這時候吃什麼水果？" },
];
window.QUESTIONS = [
  { stage: "transform", id: "pineapple", name: "鳳梨", alt: "櫻桃",   chat: "鳳梨酥您喜歡吃純鳳梨餡的，還是加冬瓜的？" },
  { stage: "transform", id: "mango",     name: "芒果", alt: "桑椹",   chat: "芒果您喜歡直接切來吃，還是做成芒果冰？" },
  { stage: "transform", id: "longan",    name: "龍眼", alt: "酪梨",   chat: "桂圓紅棗茶，以前是誰煮給您喝的？" },
  { stage: "transform", id: "persimmon", name: "柿子", alt: "甘蔗",   chat: "柿子您喜歡吃脆脆的甜柿，還是軟軟的紅柿？" },
  { stage: "transform", id: "plum",      name: "梅子", alt: "紅毛丹", chat: "家裡以前有沒有自己醃梅子、做脆梅？" },
  { stage: "season", id: "newyear",    name: "椪柑", also: "草莓", alt: "芒果", opts: ["芒果", "椪柑", "龍眼", "水蜜桃"], chat: "過年的時候，家裡桌上一定會擺什麼水果？" },
  { stage: "season", id: "dragonboat", name: "荔枝", also: "芒果", alt: "椪柑", opts: ["柿子", "楊桃", "荔枝", "椪柑"],  chat: "端午節您喜歡吃南部粽，還是北部粽？" },
  { stage: "season", id: "summer",     name: "西瓜", also: "芒果", alt: "柿子", opts: ["西瓜", "柿子", "蓮霧", "椪柑"],  chat: "小時候大熱天，西瓜都放在哪裡冰？" },
  { stage: "season", id: "winter",     name: "草莓", also: "椪柑", alt: "西瓜", opts: ["荔枝", "西瓜", "芒果", "草莓"],  chat: "冬天您去採過草莓嗎？" },
  { stage: "season", id: "midautumn",  name: "柚子", also: "柿子", alt: "荔枝", opts: ["草莓", "柚子", "西瓜", "荔枝"],  chat: "中秋節有沒有幫小孩戴過柚子帽？" },
];
// 二選一干擾選項 → 圖檔 img/alt_xxx.jpg（當季水果攤的單品圖也放這裡）
window.ALT_IMG = { "櫻桃":"cherry", "桑椹":"mulberry", "酪梨":"avocado", "甘蔗":"sugarcane", "紅毛丹":"rambutan",
  "椪柑":"ponkan", "芒果":"mango", "龍眼":"longan", "荔枝":"lychee", "柿子":"persimmon", "西瓜":"watermelon",
  "草莓":"strawberry", "柚子":"pomelo", "楊桃":"starfruit", "蓮霧":"waxapple", "水蜜桃":"peach", "鳳梨":"pineapple" };
// 各關線索階數（每階一張圖；最後一張是清楚的圖，再按一下才出現文字答案）
window.LADDER = {
  transform: ["做好的樣子", "打開來看看", "看看它原本的一部分", "原來是它"],
  season:    ["看看是什麼時候", "攤子上有這四種", "這個時候的當季水果"],
};
