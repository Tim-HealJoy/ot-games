/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/store.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 評估層：個案與量測紀錄（第一階段只存在這台裝置，不上傳）
   - 不存姓名、不存影像；年齡只存區間。
   - 據點一台平板多人共用，所以用「個案代號」區分人，不用裝置碼。代號由帶領者自訂，請不要用真實姓名。
   - 資料壞掉或瀏覽器擋掉儲存時，遊戲照玩，只是這次不記錄。 */
export const STORE_KEY = 'assess_v1';
export const MAX_SESSIONS = 600;

export const OPTIONS = {
  sex: [['F', '女'], ['M', '男']],
  age: [['<60', '60 歲以下'], ['60-64', '60–64 歲'], ['65-69', '65–69 歲'], ['70-74', '70–74 歲'], ['75-79', '75–79 歲'], ['80-84', '80–84 歲'], ['85+', '85 歲以上']],
  cond: [['healthy', '一般長者'], ['stroke', '中風'], ['parkinson', '巴金森'], ['cognitive', '失智或輕度認知障礙'], ['ortho', '骨科術後'], ['other', '其他']],
  side: [['L', '左側'], ['R', '右側'], ['both', '兩側'], ['unknown', '不確定']],
  onset: [['<3m', '3 個月內'], ['3-12m', '3 個月到 1 年'], ['>1y', '1 年以上']],
  mobility: [['walk', '自己走'], ['aid', '用拐杖或助行器'], ['wheelchair', '坐輪椅']],
  pain: [['no', '不會'], ['yes', '會痛'], ['unsure', '不確定']],
};
export const REQUIRED = ['code', 'sex', 'age', 'cond', 'mobility', 'pain'];

export function label(field, v) {
  const o = (OPTIONS[field] || []).find((x) => x[0] === v);
  return o ? o[1] : '—';
}

/* 一行說明：A01｜女｜70–74 歲｜中風（左側） */
export function describe(s) {
  if (!s) return '訪客';
  const cond = label('cond', s.cond) + (s.cond === 'stroke' && s.side ? `（${label('side', s.side)}）` : '');
  return `${s.code}｜${label('sex', s.sex)}｜${label('age', s.age)}｜${cond}`;
}

export function checkCode(code) {
  const c = String(code || '').trim();
  if (!c) return '請輸入代號';
  if (c.length > 8) return '代號最多 8 個字';
  if (/[<>"'&]/.test(c)) return '代號不能有 < > " \' & 這些符號';
  return null;
}

/* 「現在誰在玩」：單人遊戲用預設位置（不給 slot）；兩人同螢幕的遊戲每個位置各記一位，例如 slot 'a'＝左邊、'b'＝右邊。
   同一位個案不能同時坐兩個位置，由遊戲的畫面擋（ui.js 的 busy）。 */
export function createStore(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  let mem = { subjects: {}, current: null, slots: {}, sessions: [] };
  const load = () => {
    try {
      const raw = storage && storage.getItem(STORE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        return { subjects: o.subjects || {}, current: o.current || null, slots: o.slots && typeof o.slots === 'object' ? o.slots : {}, sessions: Array.isArray(o.sessions) ? o.sessions : [] };
      }
    } catch (e) { /* 壞掉就當成空的 */ }
    return mem;
  };
  const save = (o) => { mem = o; try { storage && storage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) { /* 存不了就只留在記憶體 */ } };
  const curCode = (o, slot) => (slot ? o.slots[slot] : o.current) || null;

  return {
    subjects() {
      return Object.values(load().subjects).sort((a, b) => (b.lastAt || b.created || 0) - (a.lastAt || a.created || 0));
    },
    get(code) { return load().subjects[code] || null; },
    current(slot = null) { const o = load(), c = curCode(o, slot); return (c && o.subjects[c]) || null; },
    setCurrent(code, slot = null) {
      const o = load(), v = code && o.subjects[code] ? code : null;
      if (slot) o.slots[slot] = v; else o.current = v;
      save(o); return this.current(slot);
    },
    nextCode() {
      const used = new Set(Object.keys(load().subjects));
      for (let i = 1; i < 1000; i++) { const c = 'A' + String(i).padStart(2, '0'); if (!used.has(c)) return c; }
      return 'A' + Date.now().toString(36).slice(-4);
    },
    /* 新增或修改；回傳錯誤字串或 null */
    upsert(s, oldCode = null) {
      const err = checkCode(s.code); if (err) return err;
      for (const k of REQUIRED) if (!s[k]) return '還有欄位沒選';
      const o = load(), code = String(s.code).trim();
      if (oldCode !== code && o.subjects[code]) return '這個代號已經有人用了';
      const prev = (oldCode && o.subjects[oldCode]) || o.subjects[code] || {};
      const rec = {
        code, sex: s.sex, age: s.age, cond: s.cond,
        side: s.cond === 'stroke' ? (s.side || 'unknown') : null,
        onset: s.cond === 'stroke' ? (s.onset || null) : null,
        mobility: s.mobility, pain: s.pain,
        created: prev.created || Date.now(), lastAt: prev.lastAt || null,
      };
      if (oldCode && oldCode !== code) {
        delete o.subjects[oldCode];
        o.sessions.forEach((x) => { if (x.code === oldCode) x.code = code; });
        if (o.current === oldCode) o.current = code;
        for (const k in o.slots) if (o.slots[k] === oldCode) o.slots[k] = code;
      }
      o.subjects[code] = rec; save(o); return null;
    },
    remove(code) {
      const o = load(); delete o.subjects[code];
      o.sessions = o.sessions.filter((x) => x.code !== code);
      if (o.current === code) o.current = null;
      for (const k in o.slots) if (o.slots[k] === code) o.slots[k] = null;
      save(o);
    },
    addSession(rec) {
      const o = load();
      const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...rec };
      o.sessions.push(r);
      if (o.sessions.length > MAX_SESSIONS) o.sessions.splice(0, o.sessions.length - MAX_SESSIONS);
      if (o.subjects[r.code]) o.subjects[r.code].lastAt = r.at;
      save(o); return r;
    },
    updateSession(id, patch) {
      const o = load(), r = o.sessions.find((x) => x.id === id); if (!r) return null;
      Object.assign(r, patch); save(o); return r;
    },
    /* 某人在某款遊戲的紀錄，舊到新 */
    history(code, game = null) {
      return load().sessions.filter((x) => x.code === code && (!game || x.game === game)).sort((a, b) => a.at - b.at);
    },
    exportJson(code) {
      return JSON.stringify({ version: STORE_KEY, exported: new Date().toISOString(), subject: this.get(code), sessions: this.history(code).filter((r) => !r.demo) }, null, 1);
    },
    exportCsv(code) {
      /* 欄名用通用說法，各遊戲的「魚／垃圾」都對得上；位置只有兩人遊戲才有 */
      /* 手機角度欄（騎遍台灣、找貓咪）放在舉手欄後面；看圖欄用「做」，舉手、按煞車都對得上 */
      const cols = ['日期', '遊戲', '版本', '輸入', '位置', '左手最高', '右手最高', '左手平均', '右手平均', '左手完成', '右手完成', '左手側傾次數', '右手側傾次數', '左手聳肩次數', '右手聳肩次數', '左手舉起秒數', '右手舉起秒數',
        '手機動作', '手機往左最多', '手機往右最多', '往左完成', '往右完成', '往左回正秒數', '往右回正秒數', '往左手腕代勞', '往右手腕代勞',
        '反應時間中位數', '該做有做', '該做總數', '不該做卻做', '不該做總數', '過早', '遊戲分數', '難度'];
      const f = (v, d = 2) => (v == null || Number.isNaN(v) ? '' : typeof v === 'number' ? v.toFixed(d) : String(v));
      const pad = (n) => String(n).padStart(2, '0');
      const when = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
      /* 展示模式的假資料不匯出 */
      const rows = this.history(code).filter((r) => !r.demo).map((r) => {
        const L = r.lift && r.lift.by && r.lift.by.L, R = r.lift && r.lift.by && r.lift.by.R, g = r.gng || {};
        const tL = r.tilt && r.tilt.by && r.tilt.by.L, tR = r.tilt && r.tilt.by && r.tilt.by.R;
        return [when(r.at), r.game, r.ver, r.input, r.seat === 'L' ? '左邊' : r.seat === 'R' ? '右邊' : '',
          f(L && L.best), f(R && R.best), f(L && L.mean), f(R && R.mean), L ? L.n : '', R ? R.n : '',
          L ? L.lean : '', R ? R.lean : '', L ? L.hike : '', R ? R.hike : '', f(L && L.moveTime), f(R && R.moveTime),
          r.tilt ? (r.tilt.kind === 'yaw' ? '左右轉' : '左右傾') : '', f(tL && tL.best, 1), f(tR && tR.best, 1), tL ? tL.n : '', tR ? tR.n : '',
          f(tL && tL.ret), f(tR && tR.ret), tL ? tL.wrist : '', tR ? tR.wrist : '',
          f(g.rtMedian), g.hits ?? '', g.goN ?? '', g.commissions ?? '', g.nogoN ?? '', g.early ?? '',
          r.play ? r.play.score : '', r.play ? r.play.diff : ''];
      });
      const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
      return '﻿' + [cols, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    },
  };
}
