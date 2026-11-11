/* 感．動復能 動作答題：本機紀錄（2026-11-10 v0.1）
   key：gandong_quiz_v1。和評估層 assess_v1 分開放，之後再合併（另一個對話正在改入口與 assess）。
   欄位對齊《數據收集與後台規格》第二層：不存姓名、不存影像與骨架，只存數字。 */
const KEY = 'gandong_quiz_v1';
const MAX = 300;

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }

export const store = {
  all() { const v = load(); return Array.isArray(v.sessions) ? v.sessions : []; },
  /* 這個活動上次玩到第幾級（沒有就 null） */
  lastLevel(activity, who = '') {
    const s = this.all().filter((x) => x.activity === activity && (x.who || '') === who);
    return s.length ? s[s.length - 1].summary.nextLevel : null;
  },
  add(sess) {
    const v = load();
    const list = Array.isArray(v.sessions) ? v.sessions : [];
    list.push(sess);
    v.sessions = list.slice(-MAX);
    v.ver = 1;
    return save(v);
  },
  clear() { save({ ver: 1, sessions: [] }); },
};
