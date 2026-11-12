/* 感．動復能 活動目錄＋能力對照（2026-11-11 v0.1）
   依《能力雷達與 App 架構 v0.2》第四、五節：能力 ← 訓練要素 ← 活動。
   入口（site/）與動作答題（../動作答題/）都 import 這一份，雷達、今日點心、玩完的說明才會一致。
   權重 1／0.5 是〔外推〕，等有資料再調。 */

/* 兩張雷達（11-12 改 ICF）：「動頭腦」七軸、「動身體」五軸。id 沿用舊的（紀錄相容），名稱改 ICF 12 項；
   name＝民眾畫面、pro＝治療師後台（ICF 代碼＋名稱）、plain＝生活說法。正本 ../ICF活動分類規格_v0.1.md */
export const MIND_AXES = [
  { id: 'att', name: '注意力', pro: 'b140 注意力', plain: '看得清、反應快' },
  { id: 'imp', name: '控制力', pro: 'b1304 衝動控制', plain: '忍得住、不亂按' },
  { id: 'mem', name: '記憶力', pro: 'b144 記憶', plain: '記得住剛剛看過的' },
  { id: 'exe', name: '計劃力', pro: 'b1641 組織與計畫', plain: '做事一步一步來' },
  { id: 'lang', name: '語言功能', pro: 'b167 語言心智功能', plain: '叫得出名字、說得出來' },
  { id: 'vis', name: '知覺辨識', pro: 'b156 知覺功能', plain: '看形狀就認得出東西' },
  { id: 'calc', name: '計算力', pro: 'b172 計算功能', plain: '會比價、會算錢' },
];
export const MOVE_AXES = [
  { id: 'lift', name: '關節活動', pro: 'b710 關節活動功能', plain: '手舉得高' },
  { id: 'reach', name: '伸手取物', pro: 'd4452 伸手取物', plain: '手伸得遠' },
  { id: 'trunk', name: '維持坐姿', pro: 'd4153 維持坐姿', plain: '坐著轉身不搖晃' },
  { id: 'endure', name: '上肢肌耐力', pro: 'b740 肌耐力', plain: '手動久了不累' },
  { id: 'legs', name: '坐站', pro: 'd410 改變基本身體姿勢', plain: '從椅子站起來', locked: '下一階段開放' },
];
/* name＝長輩畫面用的生活說法（11-11 老闆：不要專業詞）；pro＝給治療師看的專業名稱 */
export const AXIS_NAME = Object.fromEntries([...MIND_AXES, ...MOVE_AXES].map((a) => [a.id, a.name]));
export const AXIS_PRO = Object.fromEntries([...MIND_AXES, ...MOVE_AXES].map((a) => [a.id, a.pro]));

/* 訓練要素 → 能力（主要 1、次要 0.5） */
export const ELEMENTS = {
  選擇反應: [['att', 1], ['exe', 0.5]],
  忍住不動: [['imp', 1], ['att', 0.5]],   // 11-12 控制力獨立成一軸（ICF b1304）
  視覺搜尋: [['att', 1], ['vis', 0.5]],
  分配注意: [['att', 1], ['exe', 0.5]],
  記住清單: [['mem', 1]],
  記住順序: [['mem', 1], ['exe', 0.5]],
  排序規劃: [['exe', 1], ['mem', 0.5]],
  規則轉換: [['exe', 1], ['att', 0.5]],
  分類: [['lang', 1], ['exe', 0.5]],
  命名: [['lang', 1], ['mem', 0.5]],
  懷舊敘說: [['lang', 1], ['mem', 0.5]],
  形狀辨識: [['vis', 1], ['lang', 0.5]],
  方位判斷: [['vis', 1]],
  比大小: [['calc', 1], ['exe', 0.5]],
  估價: [['calc', 1], ['exe', 0.5]],
  計數: [['calc', 1], ['att', 0.5]],
  舉高: [['lift', 1]],
  伸取: [['reach', 1]],
  伸取跨中線: [['reach', 1], ['att', 0.5]],
  軀幹傾斜: [['trunk', 1]],
  軀幹轉身: [['trunk', 1]],
  持續: [['endure', 1]],
};
/* 一組要素主要練到哪幾軸（權重 1） */
export function axesOf(elements) {
  const s = new Set();
  for (const e of elements || []) for (const [a, w] of ELEMENTS[e] || []) if (w >= 1) s.add(a);
  return [...s];
}

/* 「感」：用身體答題的六款。path 相對於 site/ */
const QUIZ_BASE = '../動作答題/';
export const QUIZ = [
  { id: 'speed', goal: 'att', name: '哪一個比較快？', how: '二選一', line: '高鐵和腳踏車，哪一個比較快？', elements: ['比大小', '選擇反應'] },
  { id: 'price', goal: 'calc', name: '猜價格大挑戰', how: '二選一', line: '一斤比一斤，哪一個比較貴？', elements: ['比大小', '估價'] },
  { id: 'veg', goal: 'vis', name: '蔬菜猜猜看', how: '二選一、三選一', line: '看影子、看剖面，猜是什麼菜', elements: ['形狀辨識', '命名'] },
  { id: 'memo', goal: 'mem', name: '菜市場記清單', how: '先記再認', line: '家人交代要買什麼，記起來', elements: ['記住清單', '選擇反應'] },
  { id: 'seq', goal: 'exe', name: '生活排序王', how: '一步一步選', line: '泡茶、寄信，先做哪一步？', elements: ['排序規劃'] },
  { id: 'place', goal: 'lang', name: '台灣地名名產', how: '二選一、三選一', line: '「台中」有名的是太陽餅還是牛舌餅？', elements: ['命名', '懷舊敘說'] },
].map((q) => ({ ...q, kind: 'quiz', img: `img/act_${q.id}.jpg`, url: `${QUIZ_BASE}?act=${q.id}` }));

/* 「用手碰」五款（11-12，平板用支架立在桌上、坐正舉手輕碰、大面積觸控；在 ../觸控練習/，紀錄同樣寫 gandong_quiz_v1）。
   side＝放在「動」或「感」底下；沒有封面圖，卡片用 icon。 */
const TOUCH_BASE = '../觸控練習/';
export const TOUCH = [
  { id: 'pat', side: 'move', goal: 'endure', icon: '🛏️', name: '拍拍看', how: '用手碰', line: '天氣好，幫忙把棉被拍一拍', elements: ['持續'] },
  { id: 'lr', side: 'move', goal: 'reach', icon: '🏮', name: '左右輪流', how: '用手碰', line: '元宵節，亮的燈籠碰一下就點亮', elements: ['伸取跨中線', '選擇反應'] },
  { id: 'order', side: 'mind', goal: 'mem', icon: '🧺', name: '照順序碰', how: '用手碰', line: '記住阿嬤要的菜，照順序拿', elements: ['記住順序'] },
  { id: 'say', side: 'mind', goal: 'lang', icon: '💬', name: '說說看', how: '家人陪著玩', line: '題目說出來，家人聽完碰一下', elements: ['命名'] },
  { id: 'nogo', side: 'mind', goal: 'att', icon: '🍢', name: '這個不能碰', how: '用手碰', line: '夜市好料碰一下，垃圾忍住不碰', elements: ['忍住不動', '選擇反應'] },
].map((t) => ({ ...t, kind: 'touch', img: `img/touch_${t.id}.jpg?v=2`, url: `${TOUCH_BASE}?act=${t.id}` }));   // 封面 11-12 Codex 生成（art/gen_touch_covers.sh）
export const touchById = (id) => TOUCH.find((t) => t.id === id) || null;

/* 「動」：六款動作遊戲的訓練要素（網址、圖在 games.js；拍鳥 11-12 加入） */
export const GAME_ELEMENTS = {
  fishing: ['舉高', '忍住不動', '選擇反應'],
  netlift: ['舉高', '持續'],
  rhythm: ['選擇反應', '舉高', '記住順序'],
  ride: ['軀幹傾斜', '忍住不動', '視覺搜尋'],
  boar: ['伸取跨中線', '選擇反應'],
  bird: ['軀幹轉身', '視覺搜尋'],   /* 2026-11-12 植物園拍鳥：坐著轉身找鳥 */
};
/* 11-11 全部活動依「訓練目標」分類（老闆指示）。目標＝雷達的軸，寫成生活裡的說法；
   每個活動只放在一個「主要目標」底下（goal），其他練到的列成「也練到」。 */
export const GOALS = [
  { id: 'lift', side: 'move', name: '手舉得高', life: '梳頭、晾衣服、拿櫃子上的碗', icon: '🙌' },
  { id: 'reach', side: 'move', name: '手伸得遠', life: '拿桌子另一頭的杯子、跨過身體拿東西', icon: '🤲' },
  { id: 'trunk', side: 'move', name: '坐得穩', life: '坐著轉身、彎腰穿鞋不搖晃', icon: '🪑' },
  { id: 'endure', side: 'move', name: '手動得久', life: '拍棉被、擦桌子，手不會一下就累', icon: '✋' },
  { id: 'att', side: 'mind', name: '看得清、反應快', life: '過馬路看車、在一堆東西裡找到要的', icon: '👀' },
  { id: 'mem', side: 'mind', name: '記得住', life: '記得要買什麼、藥吃了沒', icon: '📝' },
  { id: 'exe', side: 'mind', name: '做事有順序', life: '泡茶、出門前一步一步來', icon: '🧭' },
  { id: 'lang', side: 'mind', name: '叫得出、說得出', life: '叫得出東西的名字、聊起以前的事', icon: '💬' },
  { id: 'vis', side: 'mind', name: '看得懂形狀', life: '認得出東西的樣子和擺的位置', icon: '🔍' },
  { id: 'calc', side: 'mind', name: '會比、會算', life: '買菜比價錢、找零錢', icon: '💰' },
];
export const GAME_GOAL = { fishing: 'lift', netlift: 'lift', rhythm: 'lift', ride: 'trunk', boar: 'reach', bird: 'trunk' };
export const goalById = (id) => GOALS.find((g) => g.id === id) || null;
export const quizById = (id) => QUIZ.find((q) => q.id === id) || null;

/* ===== 11-12 ICF 分類（老闆拍板，正本 ../ICF活動分類規格_v0.1.md）=====
   全部活動頁改成：先選「動身體／動頭腦」，下面依 12 項分段。每款只放在一個「主要」項目底下，
   主要＝難度分級在調的那一項（17 款難度參數已從原始碼盤點）。民眾畫面不顯示 ICF 代碼。
   上面的 GOALS／GAME_GOAL／雷達軸暫時保留給「今天」與「我的進步」用，之後再統一。 */
export const ICF_ITEMS = [
  { id: 'rom',   side: 'move', name: '關節活動',   life: '手舉得高',       icf: 'b710' },
  { id: 'reach', side: 'move', name: '伸手取物',   life: '手伸得遠',       icf: 'd4452' },
  { id: 'sit',   side: 'move', name: '維持坐姿',   life: '坐著轉身不搖晃', icf: 'd4153' },
  { id: 'end',   side: 'move', name: '上肢肌耐力', life: '手動久了不累',   icf: 'b740' },
  { id: 'sts',   side: 'move', name: '坐站',       life: '從椅子站起來',   icf: 'd410', locked: '下一階段開放' },
  { id: 'att',   side: 'mind', name: '注意力',     life: '看得清、反應快', icf: 'b140' },
  { id: 'imp',   side: 'mind', name: '控制力',     life: '忍得住、不亂按', icf: 'b1304' },
  { id: 'mem',   side: 'mind', name: '記憶力',     life: '記得住',         icf: 'b144' },
  { id: 'calc',  side: 'mind', name: '計算力',     life: '會比價、會算錢', icf: 'b172' },
  { id: 'plan',  side: 'mind', name: '計劃力',     life: '做事一步一步來', icf: 'b1641' },
  { id: 'lang',  side: 'mind', name: '語言功能',   life: '叫得出名字',     icf: 'b167' },
  { id: 'perc',  side: 'mind', name: '知覺辨識',   life: '看形狀認東西',   icf: 'b156' },
];
/* 活動 id → 主要項目；also＝也會練到（民眾畫面不顯示，留給報告與治療師後台） */
export const ICF_OF = {
  fishing: { main: 'rom', also: ['imp', 'att'] },     // 11-12 金線分級 60／75／90%
  netlift: { main: 'rom', also: ['end'] },
  rhythm: { main: 'end', also: ['rom', 'att'] },
  ride: { main: 'sit', also: ['att', 'imp'] },
  boar: { main: 'att', also: ['reach'] },
  bird: { main: 'sit', also: ['att', 'perc'] },
  speed: { main: 'att', also: ['reach'] },
  price: { main: 'calc', also: ['reach'] },
  veg: { main: 'perc', also: ['lang', 'reach'] },
  memo: { main: 'mem', also: ['reach'] },
  seq: { main: 'plan', also: ['mem', 'reach'] },
  place: { main: 'lang', also: ['mem', 'reach'] },
  pat: { main: 'end', also: [] },
  lr: { main: 'reach', also: ['att'] },
  order: { main: 'mem', also: ['plan'] },
  say: { main: 'lang', also: ['mem'] },
  nogo: { main: 'imp', also: ['att'] },
};
export const icfById = (id) => ICF_ITEMS.find((x) => x.id === id) || null;
export const icfSideOf = (actId) => { const m = ICF_OF[actId]; const it = m && icfById(m.main); return it ? it.side : null; };
