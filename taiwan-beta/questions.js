/* 台灣地名名產大挑戰 — 題庫
 * 兩個部分：美食 19 題、景點 9 題
 *
 * 設計鐵則：
 *  1. 題目只秀地名，完整地名整段括在引號內（「桃園大溪」，不是「桃園」大溪），下面直接接兩張圖
 *  2. 選項名稱不得出現任何縣市名、鄉鎮名（長輩會直接看穿答案）
 *  3. 題目不得描述選項的獨有特徵（「大理石峽谷」等於直接說出太魯閣）
 *  4. 成對的兩張照片外觀必須明顯不同（兩碗湯、兩杯茶這種看不出差別的組合一律不用）
 */

const AREA = { north: '北部', central: '中部', south: '南部', east: '東部', islands: '離島' };
const SECTION = { food: '🍲 美食', sight: '🏞️ 景點' };

const QUESTIONS = [
  // ======================================================================
  //  第一部分：美食 19 題
  // ======================================================================
  {
    id: 'f-taipei', section: 'food', region: '台北市', place: '台北', area: 'north',
    correct: { key: 'beef-noodle', name: '牛肉麵', desc: '大塊燉牛腱配濃郁醬色湯頭，麵條吸滿湯汁。' },
    wrong: { key: 'danzai-noodle', name: '擔仔麵', desc: '擔仔麵是台南的代表小吃，一小碗細麵配肉燥與一隻蝦。' },
    story: '台北牛肉麵是從眷村的紅燒口味發展出來的，一鍋湯頭要熬上好幾個鐘頭。台北市每年還會辦牛肉麵節，比誰家的湯頭最有功夫。',
    chat: '你有沒有一家吃了很多年的牛肉麵店？湯頭是紅燒的還是清燉的？',
  },
  {
    id: 'f-newtaipei', section: 'food', region: '新北市', place: '新北淡水', area: 'north',
    correct: { key: 'iron-egg', name: '鐵蛋', desc: '反覆滷過又風乾，蛋變得又小又黑、越嚼越香。' },
    wrong: { key: 'gong-wan', name: '貢丸', desc: '貢丸是新竹的代表，用槌打的豬肉做成，咬下去很有彈性。' },
    story: '淡水鐵蛋的來源是一位阿婆的意外——滷蛋賣不完就一直回鍋滷，滷到又小又硬，客人反而愛吃。要做出一顆鐵蛋，得反覆滷、反覆風乾好幾天。',
    chat: '你有去過淡水看夕陽嗎？那時候是跟誰一起去的？',
  },
  {
    id: 'f-taoyuan', section: 'food', region: '桃園市', place: '桃園大溪', area: 'north',
    correct: { key: 'dougan', name: '豆干', desc: '用滷汁反覆浸煮的方形豆干，顏色深、口感扎實。' },
    wrong: { key: 'gong-tang', name: '貢糖', desc: '貢糖是金門的名產，花生與麥芽糖打成一層一層的酥糖。' },
    story: '大溪過去是大漢溪的碼頭重鎮，做豆干的人家沿著溪邊聚集。用醬油、糖與香料反覆滷煮，豆干才會顏色深、味道透到裡面去。',
    chat: '你有沒有帶過大溪豆干回家當伴手禮？你喜歡原味的還是辣的？',
  },
  {
    id: 'f-hsinchu-city', section: 'food', region: '新竹市', place: '新竹', area: 'north',
    correct: { key: 'rice-noodle', name: '米粉', desc: '細細的米條，炒起來根根分明、特別有嚼勁。' },
    wrong: { key: 'ban-tiao', name: '板條', desc: '板條是高雄美濃的代表，寬寬的白色米製條，口感軟滑。' },
    story: '新竹每年秋冬會吹起強勁的「九降風」，米粉掛在架上被風吹乾，水分收得剛好，煮起來才會Q彈不爛。這是別的地方學不來的天然條件。',
    chat: '你比較喜歡炒米粉還是米粉湯？家裡誰最會炒米粉？',
  },
  {
    id: 'f-yilan', section: 'food', region: '宜蘭縣', place: '宜蘭三星', area: 'north',
    correct: { key: 'scallion-pancake', name: '蔥油餅', desc: '煎得金黃酥脆，裡面塞滿翠綠的蔥花。' },
    wrong: { key: 'o-de', name: '蚵嗲', desc: '蚵嗲以彰化王功最有名，麵糊裹蚵仔與韭菜下鍋油炸。' },
    story: '三星鄉多雨、水質好，種出來的蔥蔥白特別長、甜度高又不辣。蔥油餅要現點現煎，麵皮薄、蔥塞到滿，咬下去會爆出蔥香與熱氣。',
    chat: '你去宜蘭玩過嗎？那邊的蔥你覺得跟別的地方有不一樣嗎？',
  },
  {
    id: 'f-miaoli', section: 'food', region: '苗栗縣', place: '苗栗大湖', area: 'central',
    correct: { key: 'strawberry', name: '草莓', desc: '冬天採收，紅通通、香氣濃，也能自己下田採。' },
    wrong: { key: 'loquat', name: '枇杷', desc: '枇杷主要產在台中太平一帶，橙黃色、表面帶絨毛。' },
    story: '大湖的山坡地日夜溫差大，草莓的糖分累積得好。從十二月一路到隔年三月，一家大小蹲在田裡自己採，是很多台灣家庭共同的回憶。',
    chat: '你有去採過草莓嗎？是跟孩子還是孫子一起去的？',
  },
  {
    id: 'f-taichung', section: 'food', region: '台中市', place: '台中', area: 'central',
    correct: { key: 'sun-cake', name: '太陽餅', desc: '扁圓的多層酥皮餅，裡面包著甜甜的麥芽糖餡。' },
    wrong: { key: 'ox-tongue-cookie', name: '牛舌餅', desc: '牛舌餅是宜蘭的名產，長長薄薄一片，脆得會掉屑。' },
    story: '台中是台灣的「糕餅之鄉」。太陽餅的酥皮要一層一層折出來，裡面的麥芽糖餡要熬到不黏牙。吃的時候餅屑會掉滿桌，所以老一輩會拿碗接著吃。',
    chat: '你吃太陽餅會不會用碗接餅屑？以前逢年過節，家裡會準備什麼餅？',
  },
  {
    id: 'f-changhua', section: 'food', region: '彰化縣', place: '彰化', area: 'central',
    correct: { key: 'ba-wan', name: '肉圓', desc: '半透明的番薯粉外皮，包豬肉與竹筍，淋紅白兩色醬。' },
    wrong: { key: 'zongzi', name: '肉粽', desc: '肉粽用竹葉包糯米，是全台各地端午節都會吃的食物。' },
    story: '彰化肉圓用低溫油泡而不是大火油炸，外皮才會Q而不硬。吃完剩下的醬汁，老饕會請店家加一碗大骨湯，變成一碗湯喝完。',
    chat: '你吃肉圓會不會最後加高湯？你家附近有沒有一家開很久的肉圓店？',
  },
  {
    id: 'f-yunlin', section: 'food', region: '雲林縣', place: '雲林西螺', area: 'central',
    correct: { key: 'soy-sauce', name: '醬油', desc: '用黑豆在陶缸裡日曝發酵，色澤濃黑、味道甘醇。' },
    wrong: { key: 'doubanjiang', name: '豆瓣醬', desc: '豆瓣醬以高雄岡山最有名，紅棕色、帶顆粒。' },
    story: '西螺的黑豆醬油用陶缸露天日曝，一缸要曝上四到六個月，靠的是濁水溪的好水與充足陽光。這種古法一年只能做兩批，快不了。',
    chat: '你家煮菜用的醬油有沒有固定的牌子？以前有沒有自己曬過醬缸？',
  },
  {
    id: 'f-chiayi-city', section: 'food', region: '嘉義市', place: '嘉義', area: 'south',
    correct: { key: 'turkey-rice', name: '火雞肉飯', desc: '白飯上鋪撕成絲的火雞肉，淋雞油醬汁、撒紅蔥頭。' },
    wrong: { key: 'kong-rou-rice', name: '爌肉飯', desc: '爌肉飯以彰化最有名，白飯上放一塊帶皮滷五花肉。' },
    story: '火雞肉飯會用火雞而不是雞，跟美軍在嘉義駐紮的年代有關——當時火雞容易取得，肉質又比較粗，撕成絲淋上雞油反而特別香。在嘉義，早餐吃一碗是很正常的事。',
    chat: '你吃火雞肉飯會不會配一顆半熟蛋？你去過嘉義嗎？',
  },
  {
    id: 'f-chiayi-county', section: 'food', region: '嘉義縣', place: '嘉義阿里山', area: 'south',
    correct: { key: 'bamboo-rice', name: '竹筒飯', desc: '糯米塞進竹筒裡烤，剖開來帶著竹子的香氣。' },
    wrong: { key: 'tong-mi-gao', name: '筒仔米糕', desc: '筒仔米糕以台中清水最有名，用小鐵筒蒸糯米後倒扣出來。' },
    story: '竹筒飯本來是原住民上山打獵的行動糧——就地砍一節竹子，塞進糯米用火烤，竹子的水分把米蒸熟，還帶一股清香。阿里山的鄒族到現在祭典與招待客人都還會做。',
    chat: '你有去過阿里山嗎？坐過那台紅色的小火車嗎？',
  },
  {
    id: 'f-tainan-beef', section: 'food', region: '台南市', place: '台南', area: 'south',
    correct: { key: 'beef-soup', name: '牛肉湯', desc: '生牛肉片淋上滾燙高湯燙熟，鮮甜嫩口。' },
    wrong: { key: 'mutton-soup', name: '當歸羊肉湯', desc: '當歸羊肉湯以高雄岡山最有名，湯頭是深色的藥膳味。' },
    story: '台南牛肉湯之所以能生切現燙，靠的是當地還有屠宰場、當天現宰的溫體牛。所以很多店清晨五點就開門，賣完就收攤。',
    chat: '你有沒有為了一碗湯特別早起過？台南你去過哪些地方？',
  },
  {
    id: 'f-tainan-anping', section: 'food', region: '台南市', place: '台南安平', area: 'south',
    correct: { key: 'shrimp-roll', name: '蝦捲', desc: '圓筒狀的炸物，裡面包整隻蝦與豬肉魚漿。' },
    wrong: { key: 'squid-ball', name: '花枝丸', desc: '花枝丸是澎湖的名產，圓球狀，裡面吃得到花枝塊。' },
    story: '安平蝦捲的特色是用豬網油把蝦、豬肉與魚漿捲起來再下鍋炸，網油遇熱化開，外皮才會又薄又酥。配一碗魚肚湯是安平最經典的吃法。',
    chat: '你去過安平嗎？那邊的蜜餞跟蝦捲你吃過哪一個？',
  },
  {
    id: 'f-kaohsiung', section: 'food', region: '高雄市', place: '高雄旗山', area: 'south',
    correct: { key: 'banana', name: '香蕉', desc: '金黃飽滿的香蕉，過去大量外銷到日本。' },
    wrong: { key: 'pomelo', name: '文旦', desc: '文旦以台南麻豆最有名，中秋節前後上市。' },
    story: '旗山在民國五、六十年代是「香蕉王國」的核心，香蕉大量賣到日本，鎮上因此蓋起氣派的洋樓與車站。很多老一輩都記得那段靠香蕉賺外匯的日子。',
    chat: '你記不記得香蕉外銷日本的那個年代？你家有種過水果嗎？',
  },
  {
    id: 'f-pingtung-trotter', section: 'food', region: '屏東縣', place: '屏東萬巒', area: 'south',
    correct: { key: 'pig-trotter', name: '豬腳', desc: '滷得油亮的豬腳切塊，皮Q肉嫩，配蒜泥醬油。' },
    wrong: { key: 'ya-shang', name: '鴨賞', desc: '鴨賞是宜蘭的名產，鴨肉壓扁後煙燻，切片配蔥絲。' },
    story: '萬巒豬腳的關鍵在那碟蒜泥醬油沾醬——豬腳先川燙去腥再滷，肉不油膩，沾醬把味道提起來。一條街上好幾家老店，各家的沾醬配方都不外傳。',
    chat: '你吃過萬巒豬腳嗎？家裡誰滷豬腳最好吃？',
  },
  {
    id: 'f-pingtung-tuna', section: 'food', region: '屏東縣', place: '屏東東港', area: 'south',
    correct: { key: 'bluefin-tuna', name: '黑鮪魚', desc: '厚切的深紅色生魚片，油花分明帶光澤。' },
    wrong: { key: 'milkfish', name: '虱目魚', desc: '虱目魚以台南最有名，煎得金黃的魚肚，油脂豐厚。' },
    story: '東港的黑鮪魚每年四到六月洄游經過台灣海峽，第一條上岸的會辦「第一鮪」拍賣，價格常常喊到幾百萬。東港三寶是黑鮪魚、櫻花蝦與油魚子。',
    chat: '你吃過生魚片嗎？以前的人是不是比較少吃生的東西？',
  },
  {
    id: 'f-hualien', section: 'food', region: '花蓮縣', place: '花蓮', area: 'east',
    correct: { key: 'mochi', name: '麻糬', desc: '軟糯的小麻糬撒上花生粉，裡面包紅豆或芝麻餡。' },
    wrong: { key: 'mung-bean-cake', name: '綠豆椪', desc: '綠豆椪是台中糕餅老店的招牌，白色酥皮包綠豆沙。' },
    story: '花蓮麻糬跟阿美族的「杜倫」有關——本來是把糯米搗成一團的傳統食物，後來加上內餡、做成小顆包裝，變成觀光客一定要帶的伴手禮。',
    chat: '你去花蓮是坐火車還是開車？印象中花蓮哪個地方最漂亮？',
  },
  {
    id: 'f-taitung', section: 'food', region: '台東縣', place: '台東', area: 'east',
    correct: { key: 'sugar-apple', name: '釋迦', desc: '表面像鱗片一樣凹凸，剖開來果肉雪白、非常甜。' },
    wrong: { key: 'guava', name: '芭樂', desc: '芭樂以高雄燕巢最有名，淺綠色、口感清脆。' },
    story: '台東的釋迦產量占全台九成以上。因為名字和外形像佛像的頭，才被叫做釋迦。要放到摸起來稍軟才好吃，太早吃會又硬又澀。',
    chat: '你吃過釋迦嗎？你會等它軟了再吃，還是喜歡脆一點的？',
  },
  {
    id: 'f-kinmen', section: 'food', region: '金門縣', place: '金門', area: 'islands',
    correct: { key: 'kaoliang', name: '高粱酒', desc: '清澈透明、香氣濃烈的烈酒，用當地旱地高粱釀成。' },
    wrong: { key: 'shaoxing', name: '紹興酒', desc: '紹興酒以南投埔里最有名，酒色琥珀、味道溫潤。' },
    story: '金門的花崗岩地下水清澈甘甜，加上當地旱地種的高粱，用傳統固態發酵法釀造，再放進花崗岩坑道裡陳放。這些條件缺一個，味道就不一樣。',
    chat: '家裡有沒有一瓶捨不得開的酒？以前逢年過節你們會喝什麼？',
  },

  // ======================================================================
  //  第二部分：景點 9 題
  // ======================================================================
  {
    id: 's-taipei', section: 'sight', region: '台北市', place: '台北市', area: 'north',
    correct: { key: 'taipei-101', name: '101 大樓', desc: '一節一節像竹子往上長的高樓，跨年煙火從這裡放。' },
    wrong: { key: 'kaohsiung-85', name: '85 大樓', desc: '85 大樓在高雄，立面中間開一個洞，形狀像「高」字。' },
    story: '台北 101 在信義區，樓高 508 公尺，曾經是世界第一高樓。外型取自竹子「節節高升」的意象，裡面還吊著一顆巨大的金色阻尼球，用來抵抗地震與強風。',
    chat: '你有上去過 101 的觀景台嗎？跨年煙火你是在現場看還是看電視？',
  },
  {
    id: 's-changhua', section: 'sight', region: '彰化縣', place: '彰化市', area: 'central',
    correct: { key: 'baguashan-buddha', name: '八卦山大佛', desc: '一尊巨大的深色坐佛，盤腿坐在方形的蓮座台基上。' },
    wrong: { key: 'dajia-mazu', name: '大甲媽祖', desc: '大甲媽祖在台中大甲鎮瀾宮，每年三月的遶境隊伍要走上九天八夜。' },
    story: '八卦山大佛民國五十年完工，佛身高 22 公尺，曾經是東南亞最大的佛像。大佛是中空的，裡面有六層樓可以走上去，牆上畫著釋迦牟尼的故事。那個年代很多人的畢業旅行、蜜月旅行都在大佛前面拍過照。',
    chat: '你有沒有在八卦山大佛前面拍過照？那時候是跟學校去的，還是跟家人去的？',
  },
  {
    id: 's-nantou', section: 'sight', region: '南投縣', place: '南投縣', area: 'central',
    correct: { key: 'sun-moon-lake', name: '日月潭', desc: '台灣最大的天然湖泊，湖面山影相映，湖中有一座小島。' },
    wrong: { key: 'qixingtan', name: '七星潭', desc: '七星潭在花蓮，名字叫潭，其實是太平洋的一段礫石海灣。' },
    story: '日月潭在南投縣魚池鄉，是台灣最大的天然湖泊。名字來自它的形狀——東邊像太陽、西邊像月亮。可以搭纜車俯瞰，也可以搭船環湖。',
    chat: '你去過日月潭嗎？是搭船還是搭纜車？跟誰一起去的？',
  },
  {
    id: 's-yunlin', section: 'sight', region: '雲林縣', place: '雲林縣', area: 'central',
    correct: { key: 'beigang-chaotian-temple', name: '朝天宮', desc: '香火鼎盛的媽祖廟，屋脊上有精細的剪黏與交趾陶。' },
    wrong: { key: 'penghu-bridge', name: '跨海大橋', desc: '跨海大橋在澎湖，是連接兩座島的長橋，橋頭有白色拱門。' },
    story: '北港朝天宮是台灣最有名的媽祖廟之一，已經有三百多年歷史。每年農曆三月的媽祖遶境，信徒把整個北港鎮擠得水洩不通，「北港迎媽祖」是台灣最盛大的廟會之一。',
    chat: '你有去過北港拜媽祖嗎？家裡拜什麼神明？',
  },
  {
    id: 's-chiayi-county', section: 'sight', region: '嘉義縣', place: '嘉義縣', area: 'south',
    correct: { key: 'alishan-train', name: '阿里山小火車', desc: '紅色的小火車穿行在高山的森林之間。' },
    wrong: { key: 'pingxi-lantern', name: '平溪天燈', desc: '平溪在新北，元宵節放天燈，天燈載著願望飛上夜空。' },
    story: '阿里山森林鐵路是日治時期為了運送檜木而蓋的，從嘉義市一路爬到海拔兩千多公尺。紅色的檜木車廂繞著山壁轉「螺旋線」上山，是全世界少見的高山鐵道。',
    chat: '你坐過阿里山小火車嗎？有沒有去看過阿里山的日出？',
  },
  {
    id: 's-pingtung', section: 'sight', region: '屏東縣', place: '屏東縣', area: 'south',
    correct: { key: 'eluanbi-lighthouse', name: '鵝鑾鼻燈塔', desc: '白色的圓柱形燈塔，站在台灣最南端的草坡上。' },
    wrong: { key: 'yehliu-queen', name: '野柳女王頭', desc: '野柳在新北萬里，是海水侵蝕出來的蕈狀奇岩。' },
    story: '鵝鑾鼻燈塔在屏東縣恆春鎮，是台灣最南端的燈塔。因為過去這一帶常有船難，清朝時建塔，塔身還蓋了槍眼與壕溝防禦，是全世界少見的「武裝燈塔」。',
    chat: '你去過墾丁嗎？那時候是自己開車去還是跟團？',
  },
  {
    id: 's-hualien', section: 'sight', region: '花蓮縣', place: '花蓮縣', area: 'east',
    correct: { key: 'taroko', name: '太魯閣', desc: '溪水切出來的高聳峽谷，兩側是灰白色的岩壁。' },
    wrong: { key: 'xitou', name: '溪頭', desc: '溪頭在南投，是一片高聳的杉木森林與竹林步道。' },
    story: '太魯閣在花蓮縣，立霧溪花了幾百萬年把大理岩層切開，切出燕子口、九曲洞這樣的峽谷。當年開路的人是把工具吊在半空中，一寸一寸鑿出來的。',
    chat: '你去過太魯閣嗎？走過那條靠著岩壁的步道嗎？',
  },
  {
    id: 's-penghu', section: 'sight', region: '澎湖縣', place: '澎湖縣', area: 'islands',
    correct: { key: 'twin-heart-weir', name: '雙心石滬', desc: '在淺海上用石頭堆出兩個心形的古老陷阱。' },
    wrong: { key: 'sanxiantai', name: '三仙台', desc: '三仙台在台東，是一座跨海的八拱人行橋通到小島。' },
    story: '雙心石滬在澎湖七美，是老一輩用玄武岩與珊瑚礁石一顆顆堆出來的捕魚陷阱，漲潮時魚游進來、退潮就困在裡面。堆一座石滬要花好幾年，現在成了愛情的象徵。',
    chat: '你去過澎湖嗎？你知道石滬本來是用來抓魚的嗎？',
  },
  {
    id: 's-kinmen', section: 'sight', region: '金門縣', place: '金門縣', area: 'islands',
    correct: { key: 'juguang-tower', name: '莒光樓', desc: '黃瓦紅柱的中式三層樓閣，站在草坪與海岸邊。' },
    wrong: { key: 'qinbi-village', name: '芹壁聚落', desc: '芹壁在連江馬祖，是一整片用石頭砌成、依山面海的老房子。' },
    story: '莒光樓是民國四十一年為了表彰金門的戰地將士而蓋的，仿古的宮殿式建築。它曾經印在郵票與課本上，是那個年代台灣人最熟悉的金門畫面。',
    chat: '你有去過金門嗎？家裡有人當兵抽到金門嗎？',
  },
];

// 圖片路徑：美食走 img/food/，景點走 img/landmark/
function imgPath(opt, q) {
  return `img/${q.section === 'sight' ? 'landmark' : 'food'}/${opt.key}.jpg`;
}
