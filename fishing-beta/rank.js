/* 排行榜前端。任何網路問題都不能影響遊戲：失敗就回 null，個人紀錄照常存在這台裝置。 */
const NAMES = ['海口阿伯', '漁港阿嬤', '討海人', '老船長', '小漁夫', '釣魚達人', '港邊阿公', '碼頭阿姨'];
const K_PID = 'game_rank_pid', K_NAME = 'game_rank_name';
let memPid = null, memName = null;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 私密模式可能擋 */ } };

function makePid() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createRank(api, game) {
  const pid = () => {
    let v = lsGet(K_PID) || memPid;
    if (!v) { v = makePid(); memPid = v; lsSet(K_PID, v); }
    return v;
  };
  const name = () => {
    let v = lsGet(K_NAME) || memName;
    if (!v) { v = NAMES[Math.floor(Math.random() * NAMES.length)] + String(10 + Math.floor(Math.random() * 90)); memName = v; lsSet(K_NAME, v); }
    return v;
  };
  async function call(path, opt = {}, ms = 6000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(api + path, { ...opt, signal: ctl.signal });
      return await r.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return {
    name,
    async startRound(board) {
      const r = await post('/api/round', { game, board });
      return r && r.ok ? r.token : null;
    },
    /* 回傳 null＝連不上；{ok:false,error}＝被拒；{ok:true,all,week,...}＝成功 */
    submit({ token, score, counts, maxCombo }) {
      return post('/api/score', { token, pid: pid(), name: name(), score, counts, maxCombo });
    },
    top(board, period, limit = 8) {
      return call(`/api/top?game=${game}&board=${board}&period=${period}&limit=${limit}`, { headers: { 'x-player': pid() } });
    },
    async rename(next) {
      const r = await post('/api/name', { pid: pid(), name: next });
      if (r && r.ok) { memName = r.name; lsSet(K_NAME, r.name); }
      return r;
    },
  };
}
