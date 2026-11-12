/* 感．動復能 大面積觸控引擎 v0.1（2026-11-12）
   給平板平放桌上、用手指／指節／手掌碰的長輩用。規則：
   ①一次連續接觸只算一下：第一個接觸點落下時判斷，同一次又多碰到的點只記「幾點接觸」（看是不是用手掌）
   ②要等手全部離開螢幕、而且距離上一次收下超過「防誤觸間隔」，才收下一下；太快就在碰的地方出倒數條
   ③碰到觸控區（.tz，依 data-k 編號）任何地方都算；碰到空白處不算、不扣分，只記一次
   ④回饋：碰的地方起漣漪、短震動（平板多半沒有震動，沒有就略過）
   觸控區的位置直接讀畫面上 .tz 元素的實際範圍，版面用 CSS 排，不用另外算座標。 */

export function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

export function ripple(x, y, cls = '') {
  const r = document.createElement('div'); r.className = 'ripple ' + cls;
  r.style.left = x + 'px'; r.style.top = y + 'px';
  document.body.appendChild(r);
  r.addEventListener('animationend', () => r.remove(), { once: true });
  setTimeout(() => r.remove(), 1200);
}

export function cdBar(x, y, remain, total) {
  document.querySelectorAll('.cdbar').forEach((e) => e.remove());
  const b = document.createElement('div'); b.className = 'cdbar';
  b.style.left = x + 'px'; b.style.top = y + 'px';
  b.innerHTML = `<i style="--ms:${Math.round(remain)}ms;--f:${Math.max(0, Math.min(1, remain / total))}"></i>`;
  document.body.appendChild(b); setTimeout(() => b.remove(), remain + 80);
}

/* 讀出文字（瀏覽器內建中文語音） */
export function say(text, { rate = 0.9 } = {}) {
  if (!('speechSynthesis' in window)) return;
  try {
    const t = String(text).replace(/<[^>]+>/g, '').trim(); if (!t) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-TW'; u.rate = rate;
    const vs = speechSynthesis.getVoices(), zh = vs.find((v) => v.lang.toLowerCase() === 'zh-tw') || vs.find((v) => v.lang.toLowerCase().startsWith('zh'));
    if (zh) u.voice = zh;
    speechSynthesis.speak(u);
  } catch (e) {}
}
export function hush() { try { speechSynthesis.cancel(); } catch (e) {} }

/* el：接觸控的容器；o.root：找 .tz 的範圍；o.cooldown()；o.busy()；o.onHit(k, touch, e)；o.onOutside(e)；o.onBlocked(e) */
export function createTouch(el, o) {
  const contacts = new Set();
  let last = -Infinity, cur = null, on = false;
  const stats = { hits: 0, blocked: 0, outside: 0, multi: 0 };
  const zones = () => [...(o.root || el).querySelectorAll('.tz')].filter((z) => !z.classList.contains('gone'));
  function down(e) {
    if (!on) return;
    if (e.target.closest && e.target.closest('[data-notouch]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const first = contacts.size === 0;
    contacts.add(e.pointerId);
    if (!first) { if (cur && contacts.size > cur.n) { if (cur.n === 1) stats.multi++; cur.n = contacts.size; } return; }
    const t = performance.now();
    if (o.busy && o.busy()) return;   // 正在顯示對錯：不收、不記
    const cd = o.cooldown();
    if (t - last < cd) { stats.blocked++; cdBar(e.clientX, e.clientY, cd - (t - last), cd); o.onBlocked && o.onBlocked(e); return; }
    const z = zones().find((d) => { const r = d.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    if (!z) { stats.outside++; o.onOutside && o.onOutside(e); return; }
    last = t; stats.hits++;
    cur = { n: 1, t, x: Math.round((e.clientX / innerWidth) * 100) / 100, y: Math.round((e.clientY / innerHeight) * 100) / 100, w: Math.round(e.width || 0), h: Math.round(e.height || 0), type: e.pointerType };
    ripple(e.clientX, e.clientY); vib(12);
    z.classList.add('hit'); setTimeout(() => z.classList.remove('hit'), 280);
    o.onHit(+z.dataset.k, cur, e, z);
  }
  const up = (e) => contacts.delete(e.pointerId);
  el.addEventListener('pointerdown', down, { passive: true });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) addEventListener(n, up, { passive: true });
  addEventListener('blur', () => contacts.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) contacts.clear(); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => { if (on) e.preventDefault(); });
  return {
    stats,
    start() { contacts.clear(); last = -Infinity; on = true; Object.assign(stats, { hits: 0, blocked: 0, outside: 0, multi: 0 }); },
    stop() { on = false; },
    get on() { return on; },
  };
}
