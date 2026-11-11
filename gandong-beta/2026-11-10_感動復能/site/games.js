/* 感．動復能：五款遊戲的設定（2026-11-10 本機樣張）
   - local：本機網址。整個 100_Todo/projects 用一個靜態伺服器提供，所以寫絕對路徑。
     騎遍台灣是另一個伺服器（不同來源），紀錄不共用。
   - online：線上網址，之後才填；空字串＝還沒有，一律用本機。
   - demoParam／muteParam：入口在展示模式（?demo=1）或靜音（?mute=1）時，帶給這款遊戲的參數（已查過各遊戲原始碼；山豬 2 用 has('demo')／has('mute')，帶 =1 也成立；騎遍台灣沒有對應參數）。 */
export const GAMES = [
  {
    id: 'fishing', name: '漁港釣魚', train: '坐著舉手拉魚，看清楚是魚還是垃圾',
    input: 'cam', local: '/gandong-beta/2026-07-20_鏡頭復健遊戲/釣魚/game/', online: '',
    img: 'img/fishing.png', demoParam: 'demo=1', muteParam: 'mute=1', note: '',
    diffNames: { easy: '簡單', normal: '普通', hard: '困難' }, 
  },
  {
    id: 'netlift', name: '溪邊舉網', train: '兩個人一起把網子抬起來',
    input: 'cam', local: '/gandong-beta/2026-07-20_鏡頭復健遊戲/舉網/game/', online: '',
    img: 'img/netlift.jpg', demoParam: 'demo=1', muteParam: 'mute=1', note: '可以兩個人一起玩',
    diffNames: { easy: '簡單', normal: '普通', hard: '困難' }, 
  },
  {
    id: 'rhythm', name: '節奏律動', train: '跟著老歌拍手、舉手',
    input: 'cam', local: '/gandong-beta/2026-07-20_鏡頭復健遊戲/節奏律動/', online: '',
    img: 'img/rhythm.png', demoParam: 'demo=1', muteParam: 'mute=1', note: '',
    diffNames: { easy: '輕鬆', normal: '標準', hard: '挑戰' },   /* 節奏律動把推薦當成歌曲難度的上限 */
  },
  {
    id: 'ride', name: '騎遍台灣', train: '身體帶著手機左右傾，騎車回家',
    input: 'phone', local: 'http://localhost:8842/', online: 'https://games.otshih.com/ride-assess-beta/',
    img: 'img/ride.jpg', demoParam: '', muteParam: '', note: '要另外用手機當方向盤',
    /* 沒有 diffNames：難度跟著路線（ride.js 星數 1／2／3＝新手／普通／挑戰，路線模式只有 easy 新手／normal 一般），不是三級設定，推薦頁不顯示難度 */
  },
  {
    id: 'boar', name: '趕走山豬', train: '伸手趕走來偷吃的山豬，守住阿公的田',
    input: 'cam', local: '/gandong-beta/2026-07-20_鏡頭復健遊戲/趕走山豬2/game/index.html', online: '',
    img: 'img/boar.jpg', demoParam: 'demo=1', muteParam: 'mute=1', note: '',
    diffNames: { easy: '輕鬆', normal: '普通', hard: '挑戰' },
  },
];

export const GAME_IDS = GAMES.map((g) => g.id);
export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
/* 這款遊戲畫面上的難度叫法；沒有三級設定的回空字串（不顯示） */
export const diffNameOf = (id, diff) => { const g = gameById(id); return (g && g.diffNames && g.diffNames[diff]) || ''; };
export const INPUT_NAME = { cam: '用鏡頭', phone: '用手機' };

/* 這款遊戲要去的網址。
   online：是否用線上網址（有填才用）；demo、mute：入口現在的模式，一起帶過去。 */
export function urlFor(id, { online = false, demo = false, mute = false } = {}) {
  const g = gameById(id);
  if (!g) return '';
  const base = online && g.online ? g.online : g.local;
  const qs = [];
  if (demo && g.demoParam) qs.push(g.demoParam);
  if (mute && g.muteParam) qs.push(g.muteParam);
  if (!qs.length) return base;
  return base + (base.includes('?') ? '&' : '?') + qs.join('&');
}
