/* 食材上菜秀 — 題庫（6 食材 × 2 道，台灣常見料理）
 * 配料順序＝低鑑別度 → 高鑑別度，最後一個是「決定性配料」。
 * hint2＝口感／氣味提示、hint3＝場合提示（帶領者降階救援用）。
 */
window.GROUPS = [
  {
    id: "cabbage", name: "大白菜", img: "cabbage",
    intro: "菜市場一年四季都有，便宜又耐煮，冬天最甜。",
    dishes: [
      {
        name: "白菜滷", img: "cabbage-stew", level: "暖身",
        ings: [
          { name: "紅蘿蔔", img: "carrot" },
          { name: "乾香菇", img: "dried-mushroom" },
          { name: "蝦米", img: "dried-shrimp" },
          { name: "蛋酥", img: "egg-crisp" },
        ],
        hint2: "軟軟爛爛、湯汁濃稠，一口白菜一口蛋酥",
        hint3: "辦桌、自助餐一定有的那一道",
        story: "早年白菜便宜又耐煮，一鍋滷起來全家吃。加蛋酥或扁魚提香，是辦桌桌上的老面孔。",
      },
      {
        name: "砂鍋獅子頭", img: "lion-head", level: "進階",
        ings: [
          { name: "粉絲", img: "glass-noodle" },
          { name: "凍豆腐", img: "frozen-tofu" },
          { name: "砂鍋", img: "clay-pot" },
          { name: "大肉丸", img: "meatball-raw" },
        ],
        hint2: "大大一顆肉丸子，燉得很軟，一夾就散",
        hint3: "過年圍爐、喜宴才會出現的大菜",
        story: "肉丸子大得像獅子的頭，所以叫獅子頭。白菜鋪在鍋底吸飽肉汁，常常比肉丸還搶手。",
      },
    ],
    talk: {
      q: "你家的白菜滷，是加蛋酥、還是加扁魚？",
      ext: [
        { name: "開陽白菜", img: "kaiyang-cabbage" },
        { name: "白菜水餃", img: "cabbage-dumpling" },
      ],
    },
  },
  {
    id: "sweet-potato", name: "地瓜", img: "sweet-potato",
    intro: "台灣的形狀就像一顆地瓜，早年家家戶戶靠它填飽肚子。",
    dishes: [
      {
        name: "地瓜稀飯", img: "sweet-potato-congee", level: "暖身",
        ings: [
          { name: "清水", img: "water" },
          { name: "白米", img: "white-rice-raw" },
          { name: "地瓜簽", img: "sweet-potato-shreds" },
        ],
        hint2: "甜甜的、稠稠的一碗，熱熱喝",
        hint3: "早餐配醬瓜、豆腐乳",
        story: "早年白米珍貴，家家把地瓜刨成簽混進飯裡，「番薯簽飯」是很多人的童年早餐。",
      },
      {
        name: "地瓜球", img: "sweet-potato-balls", level: "進階",
        ings: [
          { name: "糖", img: "sugar" },
          { name: "地瓜粉", img: "sweet-potato-starch" },
          { name: "一鍋熱油", img: "hot-oil-wok" },
        ],
        hint2: "外面酥酥的，裡面空心又 Q",
        hint3: "夜市買一袋，邊走邊吃",
        story: "地瓜泥加地瓜粉搓成小球下鍋炸，邊炸邊用杓子壓，會愈壓愈大、愈來愈圓。",
      },
    ],
    talk: {
      q: "小時候吃地瓜稀飯，配的是醬瓜、豆腐乳、還是菜脯？",
      ext: [
        { name: "烤地瓜", img: "baked-sweet-potato" },
        { name: "拔絲地瓜", img: "candied-sweet-potato" },
      ],
    },
  },
  {
    id: "egg", name: "雞蛋", img: "egg",
    intro: "家裡冰箱一定有的東西，煎、炒、滷、蒸都行。",
    dishes: [
      {
        name: "菜脯蛋", img: "radish-omelet", level: "暖身",
        ings: [
          { name: "油", img: "cooking-oil" },
          { name: "青蔥", img: "scallion" },
          { name: "菜脯", img: "preserved-radish" },
        ],
        hint2: "鹹鹹香香，邊邊煎得有點脆",
        hint3: "便當裡、客家餐廳桌上常見",
        story: "「菜脯」就是曬乾的蘿蔔乾。早年冰箱不普及，蘿蔔曬成菜脯放一整年，配蛋一煎就是一道菜。",
      },
      {
        name: "茶葉蛋", img: "tea-egg", level: "進階",
        ings: [
          { name: "醬油", img: "soy-sauce" },
          { name: "八角", img: "star-anise" },
          { name: "茶葉", img: "tea-leaves" },
        ],
        hint2: "蛋殼上有裂紋，咖啡色的",
        hint3: "便利商店一進門就聞到的味道",
        story: "蛋殼要先敲裂，滷汁才入得去，剝開蛋白像大理石花紋。日月潭的阿婆茶葉蛋，很多人去玩都會買一顆。",
      },
    ],
    talk: {
      q: "你家的菜脯，是自己曬的、還是市場買的？",
      ext: [
        { name: "滷蛋", img: "braised-egg" },
        { name: "番茄炒蛋", img: "tomato-egg" },
      ],
    },
  },
  {
    id: "pork", name: "五花肉", img: "pork-belly",
    intro: "一層肥一層瘦的三層肉，滷、炸、蒸、烤都好吃。",
    dishes: [
      {
        name: "滷肉飯", img: "braised-pork-rice", level: "暖身",
        ings: [
          { name: "冰糖", img: "rock-sugar" },
          { name: "醬油", img: "soy-sauce" },
          { name: "紅蔥頭", img: "shallot" },
          { name: "白飯", img: "cooked-rice" },
        ],
        hint2: "油亮亮的，淋在白飯上一拌",
        hint3: "小吃攤、自助餐都有，一碗二三十塊",
        story: "北部叫滷肉飯、南部叫肉燥飯。紅蔥頭先爆香是靈魂，肥肉要滷到入口即化。",
      },
      {
        name: "梅干扣肉", img: "meigan-pork", level: "進階",
        ings: [
          { name: "蒜頭", img: "garlic" },
          { name: "醬油", img: "soy-sauce" },
          { name: "梅干菜", img: "meigan-cai" },
        ],
        hint2: "一層肥一層瘦排得整整齊齊，鹹香鹹香",
        hint3: "拜拜、辦桌、客家餐廳的大菜",
        story: "梅干菜是醃過又曬乾的芥菜，會吸走五花肉的油，愈蒸愈香。早年要拜拜或辦桌才吃得到。",
      },
    ],
    talk: {
      q: "你叫它滷肉飯、還是肉燥飯？要不要配一片醃蘿蔔？",
      ext: [
        { name: "控肉飯", img: "kong-rou-rice" },
        { name: "排骨湯", img: "pork-rib-soup" },
      ],
    },
  },
  {
    id: "oyster", name: "蚵仔", img: "oyster",
    intro: "台灣西海岸養殖的牡蠣，台語叫「蚵仔」，小小一粒最鮮。",
    dishes: [
      {
        name: "蚵仔煎", img: "oyster-omelet", level: "暖身",
        ings: [
          { name: "小白菜", img: "bok-choy" },
          { name: "雞蛋", img: "egg" },
          { name: "地瓜粉漿", img: "starch-batter" },
          { name: "甜辣醬", img: "sweet-chili-sauce" },
        ],
        hint2: "QQ 滑滑的，淋紅色的醬",
        hint3: "夜市人氣第一名",
        story: "地瓜粉漿煎得半透明又 Q 彈，淋上甜辣醬。相傳從台南、鹿港一帶的海邊小吃發展成全台夜市的招牌。",
      },
      {
        name: "蚵仔麵線", img: "oyster-vermicelli", level: "進階",
        ings: [
          { name: "柴魚", img: "bonito-flakes" },
          { name: "香菜", img: "cilantro" },
          { name: "大腸", img: "pork-intestine" },
          { name: "紅麵線", img: "red-vermicelli" },
        ],
        hint2: "糊糊的一碗，加烏醋跟香菜",
        hint3: "廟口小攤、早市都有",
        story: "紅麵線煮得軟糊，加蚵仔或大腸，撒香菜、蒜泥、烏醋。一碗端在手上站著吃，是廟口的味道。",
      },
    ],
    talk: {
      q: "去夜市，你會先吃蚵仔煎、還是先吃蚵仔麵線？",
      ext: [
        { name: "蚵嗲", img: "o-de" },
        { name: "蚵仔湯", img: "oyster-soup" },
      ],
    },
  },
  {
    id: "rice", name: "糯米", img: "glutinous-rice",
    intro: "米粒白白不透明，煮起來黏黏的，節慶時才會出場。",
    dishes: [
      {
        name: "油飯", img: "youfan", level: "暖身",
        ings: [
          { name: "乾香菇", img: "dried-mushroom" },
          { name: "蝦米", img: "dried-shrimp" },
          { name: "紅蔥頭", img: "shallot" },
          { name: "麻油", img: "sesame-oil" },
        ],
        hint2: "油亮亮的，一粒一粒不會黏在一起",
        hint3: "家裡小孩滿月時會送的",
        story: "小孩滿月要送油飯報喜，收到的人回送米或紅蛋。香菇、蝦米、紅蔥頭加麻油拌糯米，一蒸整條巷子都香。",
      },
      {
        name: "肉粽", img: "zongzi", level: "進階",
        ings: [
          { name: "花生", img: "peanut" },
          { name: "鹹蛋黃", img: "salted-egg-yolk" },
          { name: "五花肉", img: "pork-belly" },
          { name: "粽葉", img: "bamboo-leaves" },
        ],
        hint2: "三角形一顆，用葉子包起來",
        hint3: "端午節一定要吃",
        story: "端午節必吃。北部粽先炒後蒸、米粒分明；南部粽用水煮、軟軟黏黏。花生、鹹蛋黃、五花肉是基本款。",
      },
    ],
    talk: {
      q: "你家包的是北部粽、還是南部粽？",
      ext: [
        { name: "米糕", img: "tong-mi-gao" },
        { name: "湯圓", img: "tangyuan" },
      ],
    },
  },
];
