/* 感．動復能 上傳（2026-11-11 v0.1，團隊測試期）
   把這台裝置的成績卡送到雲端 data.otshih.com，後台 admin.otshih.com 才看得到。

   ⚠️ 團隊測試期（律師看過同意書之前）：只有開過「團隊測試」的裝置才上傳。
      開法：網址加 ?team=1 打開入口一次（之後這台都會上傳）；關掉：?team=0。
      一般長輩的裝置什麼都不送。正式版要換成「進入前必按同意」的畫面（數據收集規格 v0.3）。

   送什麼：每一局成績卡（scorecard.js）、個案的年齡區間／性別／狀況（不含姓名）。IP 由雲端自己讀。
   不送：影像、聲音、骨架座標。展示模式（demo）的卡雲端會標記、後台不算。
   只要在入口頁載入就好：各遊戲同網域，紀錄都在 localStorage，下次回到入口就補送。 */
import { buildCards } from './scorecard.js?v=1';

const API = 'https://data.otshih.com';
const KEY = 'gd_upload_v1';
const MAX_SENT = 3000;

const ls = () => { try { return localStorage; } catch (e) { return null; } };
function read(k, fb) { try { const v = JSON.parse(ls().getItem(k) || 'null'); return v && typeof v === 'object' ? v : fb; } catch (e) { return fb; } }
function write(k, v) { try { ls().setItem(k, JSON.stringify(v)); } catch (e) { /* 瀏覽器擋儲存就不送 */ } }

function state() {
  const s = read(KEY, {});
  if (!s.device) s.device = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  if (!Array.isArray(s.sent)) s.sent = [];
  return s;
}

/* ?team=1 開、?team=0 關 */
function readTeamFlag(s) {
  const q = new URLSearchParams(location.search).get('team');
  if (q === '1') { s.team = true; s.consent = { v: 'team-test', at: Date.now() }; }
  if (q === '0') { s.team = false; }
  return s;
}

function collect() {
  const a = read('assess_v1', { subjects: {}, sessions: [] });
  const q = read('gandong_quiz_v1', { sessions: [] });
  const cards = buildCards({ quizSessions: q.sessions || [], assessSessions: a.sessions || [] });
  const profiles = Object.values(a.subjects || {}).filter((p) => p && p.code)
    .map((p) => ({ code: p.code, sex: p.sex, age: p.age, cond: p.cond, side: p.side, mobility: p.mobility }));
  return { cards, profiles };
}

let busy = false;
export async function syncNow() {
  if (busy) return { skipped: 'busy' };
  const s = readTeamFlag(state());
  write(KEY, s);
  if (!s.team || !s.consent) return { skipped: 'not-team' };
  busy = true;
  try {
    const { cards, profiles } = collect();
    const sent = new Set(s.sent);
    const todo = cards.filter((c) => !sent.has(c.id)).slice(0, 200);
    if (!todo.length) return { sent: 0 };
    const codes = new Set(todo.map((c) => c.who).filter(Boolean));
    const r = await fetch(API + '/api/ingest', {
      method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ v: 1, device: s.device, team: true, consent: s.consent, profiles: profiles.filter((p) => codes.has(p.code)), cards: todo }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return { error: j.error || r.status };
    const s2 = state();
    s2.sent = [...new Set(s2.sent.concat(todo.map((c) => c.id)))].slice(-MAX_SENT);
    s2.lastSync = Date.now();
    write(KEY, s2);
    return { sent: todo.length, added: j.added };
  } catch (e) {
    return { error: 'offline' }; /* 沒網路：下次再送，遊戲照玩 */
  } finally { busy = false; }
}

/* 治療師指派（綁定過的人才有）：存在 gd_assign_v1，畫面要怎麼用由入口外殼決定 */
export async function pullAssign(code) {
  const s = state();
  if (!s.team || !code) return null;
  try {
    const r = await fetch(`${API}/api/plan?device=${encodeURIComponent(s.device)}&code=${encodeURIComponent(code)}`);
    const j = await r.json();
    const all = read('gd_assign_v1', {});
    all[code] = j.assign || null;
    write('gd_assign_v1', all);
    return j.assign || null;
  } catch (e) { return null; }
}

export function status() { const s = state(); return { team: !!s.team, device: s.device, sent: s.sent.length, lastSync: s.lastSync || null }; }

/* 入口頁載入就送一次；之後每分鐘、切到背景時再送 */
if (typeof window !== 'undefined' && !window.__gdUpload) {
  window.__gdUpload = { syncNow, pullAssign, status };
  setTimeout(syncNow, 1500);
  setInterval(syncNow, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow(); });
}
