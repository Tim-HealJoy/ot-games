/* 台灣地名名產 產品版題庫 v0.1（2026-11-11）
   上課版（2026-08-11_台灣地名名產大挑戰、線上 /taiwan-beta/）是 28 題二選一、不計分的懷舊引子。原檔不動。
   產品版：
   - 題目、配對、聊天題沿用上課版（美食 19、景點 9）；四條鐵則照舊（只秀地名、選項不含地名、不描述特徵、成對的圖要明顯不同）。
   - 第 3 級起三選一：第三個選項從「別題的答案」挑，三條保護：
     1. 不能也是這個地方的東西（家鄉縣市不同；嘉義市、嘉義縣算同一個）。
     2. 外觀類別要和另外兩個都不同（兩碗湯、兩種糕餅不放在一起）。
     3. 「全台都有」的（肉粽）不拿來當第三選項。
   - 第 3 級第三個選項挑「離很遠的地區」（比較好排除），第 4、5 級挑「同一區」（比較難）；第 5 級只有名字、沒有照片。
   - 圖片：上課版的 Codex 生成示意圖（可商用），複製到 img/place/ 並縮成 640px；原圖不動。
   - 家鄉與外觀類別是我依上課版解說文字標的〔待老闆確認〕。 */

export const QUESTIONS = [
  {id:'f-taipei',sec:'food',region:'台北市',place:'台北',c:['beef-noodle','牛肉麵'],w:['danzai-noodle','擔仔麵'],chat:'您有沒有一家吃了很多年的牛肉麵店？湯頭是紅燒的還是清燉的？'},
  {id:'f-newtaipei',sec:'food',region:'新北市',place:'新北淡水',c:['iron-egg','鐵蛋'],w:['gong-wan','貢丸'],chat:'您有去過淡水看夕陽嗎？那時候是跟誰一起去的？'},
  {id:'f-taoyuan',sec:'food',region:'桃園市',place:'桃園大溪',c:['dougan','豆干'],w:['gong-tang','貢糖'],chat:'您有沒有帶過大溪豆干回家當伴手禮？您喜歡原味的還是辣的？'},
  {id:'f-hsinchu-city',sec:'food',region:'新竹市',place:'新竹',c:['rice-noodle','米粉'],w:['ban-tiao','板條'],chat:'您比較喜歡炒米粉還是米粉湯？家裡誰最會炒米粉？'},
  {id:'f-yilan',sec:'food',region:'宜蘭縣',place:'宜蘭三星',c:['scallion-pancake','蔥油餅'],w:['o-de','蚵嗲'],chat:'您去宜蘭玩過嗎？那邊的蔥您覺得跟別的地方有不一樣嗎？'},
  {id:'f-miaoli',sec:'food',region:'苗栗縣',place:'苗栗大湖',c:['strawberry','草莓'],w:['loquat','枇杷'],chat:'您有去採過草莓嗎？是跟孩子還是孫子一起去的？'},
  {id:'f-taichung',sec:'food',region:'台中市',place:'台中',c:['sun-cake','太陽餅'],w:['ox-tongue-cookie','牛舌餅'],chat:'您吃太陽餅會不會用碗接餅屑？以前逢年過節，家裡會準備什麼餅？'},
  {id:'f-changhua',sec:'food',region:'彰化縣',place:'彰化',c:['ba-wan','肉圓'],w:['zongzi','肉粽'],chat:'您吃肉圓會不會最後加高湯？您家附近有沒有一家開很久的肉圓店？'},
  {id:'f-yunlin',sec:'food',region:'雲林縣',place:'雲林西螺',c:['soy-sauce','醬油'],w:['doubanjiang','豆瓣醬'],chat:'您家煮菜用的醬油有沒有固定的牌子？以前有沒有自己曬過醬缸？'},
  {id:'f-chiayi-city',sec:'food',region:'嘉義市',place:'嘉義',c:['turkey-rice','火雞肉飯'],w:['kong-rou-rice','爌肉飯'],chat:'您吃火雞肉飯會不會配一顆半熟蛋？您去過嘉義嗎？'},
  {id:'f-chiayi-county',sec:'food',region:'嘉義縣',place:'嘉義阿里山',c:['bamboo-rice','竹筒飯'],w:['tong-mi-gao','筒仔米糕'],chat:'您有去過阿里山嗎？坐過那台紅色的小火車嗎？'},
  {id:'f-tainan-beef',sec:'food',region:'台南市',place:'台南',c:['beef-soup','牛肉湯'],w:['mutton-soup','當歸羊肉湯'],chat:'您有沒有為了一碗湯特別早起過？台南您去過哪些地方？'},
  {id:'f-tainan-anping',sec:'food',region:'台南市',place:'台南安平',c:['shrimp-roll','蝦捲'],w:['squid-ball','花枝丸'],chat:'您去過安平嗎？那邊的蜜餞跟蝦捲您吃過哪一個？'},
  {id:'f-kaohsiung',sec:'food',region:'高雄市',place:'高雄旗山',c:['banana','香蕉'],w:['pomelo','文旦'],chat:'您記不記得香蕉外銷日本的那個年代？您家有種過水果嗎？'},
  {id:'f-pingtung-trotter',sec:'food',region:'屏東縣',place:'屏東萬巒',c:['pig-trotter','豬腳'],w:['ya-shang','鴨賞'],chat:'您吃過萬巒豬腳嗎？家裡誰滷豬腳最好吃？'},
  {id:'f-pingtung-tuna',sec:'food',region:'屏東縣',place:'屏東東港',c:['bluefin-tuna','黑鮪魚'],w:['milkfish','虱目魚'],chat:'您吃過生魚片嗎？以前的人是不是比較少吃生的東西？'},
  {id:'f-hualien',sec:'food',region:'花蓮縣',place:'花蓮',c:['mochi','麻糬'],w:['mung-bean-cake','綠豆椪'],chat:'您去花蓮是坐火車還是開車？印象中花蓮哪個地方最漂亮？'},
  {id:'f-taitung',sec:'food',region:'台東縣',place:'台東',c:['sugar-apple','釋迦'],w:['guava','芭樂'],chat:'您吃過釋迦嗎？您會等它軟了再吃，還是喜歡脆一點的？'},
  {id:'f-kinmen',sec:'food',region:'金門縣',place:'金門',c:['kaoliang','高粱酒'],w:['shaoxing','紹興酒'],chat:'家裡有沒有一瓶捨不得開的酒？以前逢年過節您們會喝什麼？'},
  {id:'s-taipei',sec:'sight',region:'台北市',place:'台北市',c:['taipei-101','101 大樓'],w:['kaohsiung-85','85 大樓'],chat:'您有上去過 101 的觀景台嗎？跨年煙火您是在現場看還是看電視？'},
  {id:'s-changhua',sec:'sight',region:'彰化縣',place:'彰化市',c:['baguashan-buddha','八卦山大佛'],w:['dajia-mazu','大甲媽祖'],chat:'您有沒有在八卦山大佛前面拍過照？那時候是跟學校去的，還是跟家人去的？'},
  {id:'s-nantou',sec:'sight',region:'南投縣',place:'南投縣',c:['sun-moon-lake','日月潭'],w:['qixingtan','七星潭'],chat:'您去過日月潭嗎？是搭船還是搭纜車？跟誰一起去的？'},
  {id:'s-yunlin',sec:'sight',region:'雲林縣',place:'雲林縣',c:['beigang-chaotian-temple','朝天宮'],w:['penghu-bridge','跨海大橋'],chat:'您有去過北港拜媽祖嗎？家裡拜什麼神明？'},
  {id:'s-chiayi-county',sec:'sight',region:'嘉義縣',place:'嘉義縣',c:['alishan-train','阿里山小火車'],w:['pingxi-lantern','平溪天燈'],chat:'您坐過阿里山小火車嗎？有沒有去看過阿里山的日出？'},
  {id:'s-pingtung',sec:'sight',region:'屏東縣',place:'屏東縣',c:['eluanbi-lighthouse','鵝鑾鼻燈塔'],w:['yehliu-queen','野柳女王頭'],chat:'您去過墾丁嗎？那時候是自己開車去還是跟團？'},
  {id:'s-hualien',sec:'sight',region:'花蓮縣',place:'花蓮縣',c:['taroko','太魯閣'],w:['xitou','溪頭'],chat:'您去過太魯閣嗎？走過那條靠著岩壁的步道嗎？'},
  {id:'s-penghu',sec:'sight',region:'澎湖縣',place:'澎湖縣',c:['twin-heart-weir','雙心石滬'],w:['sanxiantai','三仙台'],chat:'您去過澎湖嗎？您知道石滬本來是用來抓魚的嗎？'},
  {id:'s-kinmen',sec:'sight',region:'金門縣',place:'金門縣',c:['juguang-tower','莒光樓'],w:['qinbi-village','芹壁聚落'],chat:'您有去過金門嗎？家裡有人當兵抽到金門嗎？'},
];

/* 每樣東西的家鄉（縣市）。答案的家鄉＝題目的縣市；錯誤選項依上課版解說。'*'＝全台都有，不當第三選項 */
export const HOME = {
  'danzai-noodle': ['台南'], 'gong-wan': ['新竹'], 'gong-tang': ['金門'], 'ban-tiao': ['高雄'], 'o-de': ['彰化'],
  loquat: ['台中'], 'ox-tongue-cookie': ['宜蘭', '彰化'], zongzi: ['*'], doubanjiang: ['高雄'], 'kong-rou-rice': ['彰化'],
  'tong-mi-gao': ['台中', '台南'], 'mutton-soup': ['高雄'], 'squid-ball': ['澎湖', '基隆'], pomelo: ['台南', '花蓮'], 'ya-shang': ['宜蘭'],
  milkfish: ['台南'], 'mung-bean-cake': ['台中'], guava: ['高雄'], shaoxing: ['南投'],
  'kaohsiung-85': ['高雄'], 'dajia-mazu': ['台中'], qixingtan: ['花蓮'], 'penghu-bridge': ['澎湖'], 'pingxi-lantern': ['新北'],
  'yehliu-queen': ['新北'], xitou: ['南投'], sanxiantai: ['台東'], 'qinbi-village': ['連江'],
};
/* 外觀類別：同一類的不放在同一題（鐵則 4） */
export const GROUP = {
  'beef-noodle': '麵', 'danzai-noodle': '麵', 'rice-noodle': '麵', 'ban-tiao': '麵',
  'beef-soup': '湯', 'mutton-soup': '湯',
  'turkey-rice': '飯', 'kong-rou-rice': '飯', 'bamboo-rice': '飯', 'tong-mi-gao': '飯', zongzi: '飯',
  'ba-wan': '小吃', 'gong-wan': '小吃', 'squid-ball': '小吃', 'shrimp-roll': '小吃', 'o-de': '小吃', 'iron-egg': '小吃', dougan: '小吃',
  'pig-trotter': '肉', 'ya-shang': '肉',
  'sun-cake': '餅', 'ox-tongue-cookie': '餅', 'mung-bean-cake': '餅', 'gong-tang': '餅', mochi: '餅', 'scallion-pancake': '餅',
  strawberry: '水果', loquat: '水果', banana: '水果', pomelo: '水果', 'sugar-apple': '水果', guava: '水果',
  'soy-sauce': '瓶', doubanjiang: '瓶', kaoliang: '瓶', shaoxing: '瓶',
  'bluefin-tuna': '魚', milkfish: '魚',
  'taipei-101': '高樓', 'kaohsiung-85': '高樓', 'baguashan-buddha': '廟', 'dajia-mazu': '廟', 'beigang-chaotian-temple': '廟',
  'sun-moon-lake': '湖海', qixingtan: '湖海', 'twin-heart-weir': '湖海', 'penghu-bridge': '橋', sanxiantai: '橋',
  'alishan-train': '火車天燈', 'pingxi-lantern': '火車天燈', 'eluanbi-lighthouse': '燈塔', 'yehliu-queen': '奇岩',
  taroko: '山林', xitou: '山林', 'juguang-tower': '老房子', 'qinbi-village': '老房子',
};
const AREA_OF = {
  台北: 'n', 新北: 'n', 基隆: 'n', 桃園: 'n', 新竹: 'n', 宜蘭: 'n', 苗栗: 'c', 台中: 'c', 彰化: 'c', 南投: 'c', 雲林: 'c',
  嘉義: 's', 台南: 's', 高雄: 's', 屏東: 's', 花蓮: 'e', 台東: 'e', 澎湖: 'i', 金門: 'i', 連江: 'i',
};
export const county = (region) => region.replace(/[市縣]$/, '');
export const areaOf = (c) => AREA_OF[c] || '?';
export const placeImg = (key) => `img/place/${key}.jpg`;

export const PLACE = {
  id: 'place',
  name: '台灣地名名產',
  questions: QUESTIONS, home: HOME, group: GROUP, img: placeImg,
  /* sec：出哪些題；n：幾選一；extra：第三選項挑 far（不同區）／near（同一區）；photo：選項有沒有照片 */
  levels: {
    1: { label: '第 1 級', sec: ['food'], n: 2, photo: true, perRound: 6 },
    2: { label: '第 2 級', sec: ['food', 'sight'], n: 2, photo: true, perRound: 8 },
    3: { label: '第 3 級', sec: ['food', 'sight'], n: 3, extra: 'far', photo: true, perRound: 8 },
    4: { label: '第 4 級', sec: ['food', 'sight'], n: 3, extra: 'near', photo: true, perRound: 8 },
    5: { label: '第 5 級', sec: ['food', 'sight'], n: 3, extra: 'near', photo: false, perRound: 8 },
  },
  elements: () => ['命名', '懷舊敘說'],
};
