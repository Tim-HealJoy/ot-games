/* 感．動復能 入口 v2（2026-11-11 產品化）：今天（今日點心）／全部活動／我的進步（兩張雷達）＋你是誰、小測、推薦
   v1（11-10）留在 _舊版/產品化前_2026-11-11/。
   共用模組只用 ./assess/ 的副本（正本在 2026-11-06_遊戲評估層/assess/，用 sync.sh 複製）。
   「感」紀錄在 ../動作答題/（localStorage gandong_quiz_v1），「動」與小測在 assess_v1；兩邊同一個網址開才讀得到。 */
import { createStore, OPTIONS, label, REACH_TO_PAIN } from './assess/store.js?v=1';
import { heightWord } from './assess/lift.js?v=1';
import { writePlan, readPlan, planFor, hubToday, diffLabel } from './assess/hub.js?v=1';
import { mountProfile } from './assess/ui.js?v=1';
import { GAMES, gameById, urlFor, INPUT_NAME, diffNameOf } from './games.js?v=1';
import { recommend } from './recommend.js?v=1';
import { createQuiz } from './measure.js?v=1';
import { MIND_AXES, MOVE_AXES, QUIZ, GAME_ELEMENTS, AXIS_NAME, axesOf, quizById, GOALS, GAME_GOAL, goalById } from './catalog.js?v=3';
import { radarsFromCards, todaySnack, summaryLine } from './ability.js?v=3';
import { buildCards, tagTasks } from './scorecard.js?v=1';
import { store as quizStore } from '../動作答題/engine/record.js';

const QS = new URLSearchParams(location.search);
const DEMO = QS.get('demo') === '1', MUTE = QS.get('mute') === '1';
const ONLINE = !['localhost', '127.0.0.1', ''].includes(location.hostname);
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = createStore();
const pass = () => [DEMO ? 'demo=1' : '', MUTE ? 'mute=1' : ''].filter(Boolean).join('&');
const gameUrl = (id) => urlFor(id, { online: ONLINE, demo: DEMO, mute: MUTE });
const quizUrl = (id, level) => `${quizById(id).url}${level ? `&level=${level}` : ''}${pass() ? '&' + pass() : ''}`;
const HOME = location.href.split('#')[0];
const diffText = (p) => (gameById(p.game) && gameById(p.game).diffNames ? diffLabel({ ...p, diffName: p.diffName || diffNameOf(p.game, p.diff) }) : '');
const ICON = { speed: '🚄', price: '💰', veg: '🥬', memo: '📝', seq: '🍵', place: '🗺️' };

/* ---------- 美術風格：11-11 老闆選定 G 夜市霓虹（黑底黃字），寫死在 index.html 的 body data-theme 與 themes/neon.css；其他樣張留在 themes/ 與 _舊版/ ---------- */
try { localStorage.removeItem('gd_theme'); } catch (e) {}

/* ---------- 畫面切換（網址 # 決定在哪一頁，瀏覽器上一頁可用） ---------- */
const SCREENS = { today: 'scrHome', lib: 'scrLib', me: 'scrMe', who: 'scrWho', quiz: 'scrQuiz', result: 'scrResult' };
const TABBED = ['today', 'lib', 'me'];
let screen = 'today';
function go(name, { push = true } = {}) {
  if (!SCREENS[name]) name = 'today';
  screen = name;
  for (const [k, id] of Object.entries(SCREENS)) $(id).hidden = k !== name;
  document.body.dataset.screen = name;
  $('appbar').hidden = name === 'quiz';
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === name));
  if (push && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  window.scrollTo(0, 0);
  renderChip();
  if (name === 'today') renderHome();
  if (name === 'lib') renderLib();
  if (name === 'me') renderMe();
  if (name === 'who') renderWho();
  if (name === 'quiz') { if (!store.current()) { go('who'); return; } quiz.open(); }
}
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== screen) go(h, { push: false }); });

const whoText = (s) => (s ? `${s.code}（${label('sex', s.sex)}・${label('age', s.age)}）` : '訪客');
function renderChip() {
  const s = store.current();
  $('whoChip').innerHTML = s ? `<b>${esc(s.code)}</b><span>換人</span>` : '<span>建立紀錄</span>';
}
$('whoChip').onclick = () => { whoStep = 0; therOpen = !!store.current(); go('who'); };

/* ---------- 共用：資料 ---------- */
function myData() {
  const s = store.current(), code = s ? s.code : '';
  const qs = quizStore.all().filter((x) => (x.who || '') === code && !x.demo);
  const as = s ? store.history(code).filter((x) => !x.demo) : [];
  return { s, code, qs, as };
}
function snackNow() {
  const { s, code, qs, as } = myData();
  if (!s) return [];
  const plan = hubToday(store, code) ? planFor(code) : null;
  return todaySnack({ code, quizSessions: qs, assessSessions: as, plan, lastLevel: (a) => quizStore.lastLevel(a, code) });
}

/* ---------- 1 今天 ---------- */
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function greet() { const h = new Date().getHours(); return h < 11 ? '早安' : h < 14 ? '午安' : h < 18 ? '午後好' : '晚安'; }
function snackCard(it, i) {
  let name, pic, kind, meta, href, icon = '';
  if (it.kind === 'check') {
    name = '1 分鐘小測'; kind = '<span class="pill move">動</span>先量一量'; meta = '左右手各舉 3 下＋看 8 張圖'; href = '#quiz'; icon = '🙋';
  } else if (it.kind === 'game') {
    const g = gameById(it.id); name = g.name; pic = g.img; kind = '<span class="pill move">動</span>身體遊戲';
    const d = diffText({ game: it.id, diff: it.diff, diffName: it.diffName }); meta = d ? `難度：${d}` : g.train; href = it.url || gameUrl(it.id);
  } else {
    const q = quizById(it.id); name = q.name; pic = q.img; kind = '<span class="pill mind">感</span>用身體答題'; meta = `第 ${it.level} 級．${q.how}`; href = quizUrl(it.id, it.level); icon = ICON[it.id];
  }
  return `<li class="snack${it.done ? ' done' : ''}"><a href="${esc(href)}">
    <span class="no">${it.done ? '✓' : i + 1}</span>
    <span class="pic" style="${pic ? `background-image:url('${esc(pic)}')` : ''}">${pic ? '' : icon}</span>
    <span class="txt"><span class="kind">${kind}</span><b>${esc(name)}</b><span class="why">${esc(it.why || '')}</span><span class="meta">${esc(meta)}</span></span>
    <span class="go">${it.done ? '再玩一次' : it.kind === 'check' ? '開始小測' : '開始'}</span></a></li>`;
}
function renderHome() {
  const s = store.current(), now = new Date();
  $('todayDate').textContent = `${now.getMonth() + 1} 月 ${now.getDate()} 日　星期${WEEK[now.getDay()]}`;
  $('hello').textContent = s ? `${s.code}，${greet()}！` : `${greet()}，歡迎來到感．動復能`;
  $('firstBox').hidden = !!s;
  $('snackBox').hidden = !s;
  $('peekBox').hidden = !s;
  if (!s) return;
  const sn = snackNow(), done = sn.filter((x) => x.done).length;
  $('snackProg').innerHTML = `<span class="bar"><i style="width:${(done / sn.length) * 100}%"></i></span><b>${done === sn.length ? '今天都完成了！' : `完成 ${done}／${sn.length}`}</b>`;
  $('snacks').innerHTML = sn.map(snackCard).join('');
  const { qs, as } = myData(), R = radarsFromCards(buildCards({ quizSessions: qs, assessSessions: as }));
  $('peekLine').textContent = summaryLine(R) || '玩過的活動，會記到「感」「動」兩張雷達上。';
  $('peekRadars').innerHTML = radarSvg(R.mind, { size: 180, mini: true }) + radarSvg(R.move, { size: 180, mini: true });
}
$('homeQuiz').onclick = () => go(store.current() ? 'quiz' : 'who');

/* ---------- 2 全部活動：依訓練目標分類（11-11） ---------- */
let filt = 'all';
const SIDE = { move: ['動', '動身體', '開鏡頭或拿手機，動手動身體'], mind: ['感', '動腦筋', '動腦回答問題，手伸到答案上作答'] };
function alsoTags(els, goal) {
  const rest = axesOf(els).filter((a) => a !== goal);
  return rest.length ? `<span class="also">也練到：${rest.map((a) => `<span class="${MIND_AXES.some((x) => x.id === a) ? 'm' : 'v'}">${esc(goalById(a) ? goalById(a).name : AXIS_NAME[a])}</span>`).join('')}</span>` : '';
}
function libItems() {
  const code = store.current() ? store.current().code : '';
  return [
    ...GAMES.map((g) => ({ kind: 'game', id: g.id, goal: GAME_GOAL[g.id], els: GAME_ELEMENTS[g.id] || [], name: g.name, line: g.train, img: g.img, href: gameUrl(g.id),
      meta: `<span class="tag ${g.input}">${esc(INPUT_NAME[g.input])}</span>${g.note ? ` ${esc(g.note)}` : ''}` })),
    ...QUIZ.map((q) => { const lv = quizStore.lastLevel(q.id, code); return { kind: 'quiz', id: q.id, goal: q.goal, els: q.elements, name: q.name, line: q.line, img: q.img, href: quizUrl(q.id, lv),
      meta: `<span class="tag">${esc(q.how)}</span>${lv ? ` 上次建議第 ${lv} 級` : ''}` }; }),
  ];
}
function libCard(it, goal) {
  const side = it.kind === 'game' ? 'move' : 'mind';
  return `<a class="card ${side}" href="${esc(it.href)}" data-id="${it.id}">
    <span class="pic" style="background-image:url('${esc(it.img)}')"><span class="pill ${side}">${SIDE[side][0]}</span></span>
    <span class="txt"><b>${esc(it.name)}</b><span class="train">${esc(it.line)}</span>
    ${alsoTags(it.els, goal)}
    <span class="meta">${it.meta}</span></span></a>`;
}
function goalSection(g, list) {
  return `<section class="goal ${g.side}" data-goal="${g.id}">
    <h3 class="goal-h"><span class="gi" aria-hidden="true">${g.icon}</span><span class="gt"><b>${esc(g.name)}</b><small>${esc(g.life)}</small></span><span class="gn">${list.length} 款</span></h3>
    <div class="cards">${list.map((it) => libCard(it, g.id)).join('')}</div></section>`;
}
function renderLib() {
  const items = libItems();
  const chip = (v, t, ic) => `<button type="button" class="chip${filt === v ? ' on' : ''}" data-v="${v}">${ic ? `<span aria-hidden="true">${ic}</span>` : ''}${esc(t)}</button>`;
  $('chips').innerHTML = chip('all', '全部') + ['move', 'mind'].map((sd) => `<span class="chip-sep">${SIDE[sd][1]}</span>` + GOALS.filter((g) => g.side === sd).map((g) => chip(g.id, g.name, g.icon)).join('')).join('');
  if (filt === 'all') {
    $('libBody').innerHTML = ['move', 'mind'].map((sd) => `<h2 class="grp side-${sd}"><span class="pill ${sd}">${SIDE[sd][0]}</span>${SIDE[sd][1]}<small>${SIDE[sd][2]}</small></h2>
      <div class="goals">${GOALS.filter((g) => g.side === sd).map((g) => [g, items.filter((it) => it.goal === g.id)]).filter(([, l]) => l.length).map(([g, l]) => goalSection(g, l)).join('')}</div>`).join('');
  } else {
    /* 只看一個目標：主要練它的排前面，其他也主要練到它的排後面 */
    const g = goalById(filt);
    const list = items.filter((it) => it.goal === filt).concat(items.filter((it) => it.goal !== filt && axesOf(it.els).includes(filt)));
    $('libBody').innerHTML = `<div class="goals one">${goalSection(g, list)}</div>` + (list.length ? '' : '<p class="none">這一項目前還沒有活動。</p>');
  }
}
$('chips').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; filt = b.dataset.v; renderLib(); };

/* ---------- 3 我的進步：兩張雷達 ---------- */
function radarSvg(axes, { size = 320, mini = false } = {}) {
  const n = axes.length, cx = size / 2, cy = size / 2 + (mini ? 0 : 6), R = size * (mini ? 0.36 : 0.3);
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 5), cy + Math.sin(ang(i)) * R * (v / 5)];
  const ring = (v) => axes.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  let g = '';
  for (let v = 1; v <= 5; v++) g += `<polygon points="${ring(v)}" class="rg${v === 5 ? ' out' : ''}"/>`;
  axes.forEach((_, i) => { const [x, y] = pt(i, 5); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="ax"/>`; });
  const open = axes.filter((a) => a.score != null).length;
  const poly = (key, cls) => {
    if (!open || !axes.some((a) => a[key] != null)) return '';   // 解鎖一軸就畫，鎖著的軸落在中心
    const p = axes.map((a, i) => pt(i, a[key] != null ? a[key] : 0).map((x) => x.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${p}" class="${cls}"/>`;
  };
  g += poly('first', 'pf') + poly('score', 'ps');
  axes.forEach((a, i) => { if (a.score != null) { const [x, y] = pt(i, a.score); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${mini ? 3 : 5}" class="pd"/>`; } });
  if (!mini) axes.forEach((a, i) => {
    const [x, y] = pt(i, 6.3), anchor = Math.abs(x - cx) < 8 ? 'middle' : x < cx ? 'end' : 'start';
    const val = a.locked ? '下一階段' : a.score == null ? `🔒 再 ${a.need} 次` : `第 ${a.score.toFixed(1)} 級`;
    g += `<text x="${x.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="${anchor}" class="lb">${esc(a.name)}</text><text x="${x.toFixed(1)}" y="${(y + 20).toFixed(1)}" text-anchor="${anchor}" class="lv${a.score == null ? ' lk' : ''}">${esc(val)}</text>`;
  });
  const names = axes.map((a) => `${a.name}${a.score != null ? ` 第 ${a.score} 級` : a.locked ? ' 未開放' : ` 再玩 ${a.need} 次`}`).join('、');
  return `<svg viewBox="${mini ? 0 : -78} ${mini ? 0 : -20} ${size + (mini ? 0 : 156)} ${size + (mini ? 0 : 44)}" class="radar${mini ? ' mini' : ''}" role="img" aria-label="${esc(names)}">${g}</svg>`;
}
const fmtDay = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
function renderMe() {
  const { s, qs, as } = myData();
  $('meWho').textContent = s ? `${whoText(s)}．玩過的活動會自動記到兩張雷達上` : '';
  const has = qs.length + as.filter((x) => x.game !== 'hub').length + as.filter((x) => x.game === 'hub').length > 0;
  $('meEmpty').hidden = has; $('meBody').hidden = !has;
  if (!has) return;
  /* 11-11 起所有分數先轉成績卡（scorecard.js），雷達與下面的明細都讀成績卡 */
  const cards = tagTasks(buildCards({ quizSessions: qs, assessSessions: as }), snackNow(), s ? s.code : '');
  const R = radarsFromCards(cards);
  $('meLine').textContent = summaryLine(R);
  $('radarMind').innerHTML = radarSvg(R.mind);
  $('radarMove').innerHTML = radarSvg(R.move);
  const items = [
    ...qs.map((x) => ({ at: x.at, name: quizById(x.activity) ? quizById(x.activity).name : x.activity, k: 'mind', d: `第 ${x.level} 級．第一次就答對 ${x.summary.first}／${x.summary.n}` })),
    ...as.map((x) => ({ at: x.at, name: x.game === 'hub' ? '1 分鐘小測' : (gameById(x.game) ? gameById(x.game).name : x.game), k: 'move', d: x.game === 'hub' && x.lift && x.lift.by ? `右手 ${x.lift.by.R && x.lift.by.R.n ? heightWord(x.lift.by.R.best) : '—'}、左手 ${x.lift.by.L && x.lift.by.L.n ? heightWord(x.lift.by.L.best) : '—'}` : '' })),
  ].sort((a, b) => b.at - a.at).slice(0, 8);
  $('recent').innerHTML = items.map((x) => `<div class="rc"><span class="d">${fmtDay(x.at)}</span><span class="pill ${x.k}">${x.k === 'mind' ? '感' : '動'}</span><b>${esc(x.name)}</b><span class="m">${esc(x.d)}</span></div>`).join('');
  const row = (a) => `<tr><td>${esc(a.name)}</td><td>${a.score != null ? a.score : '—'}</td><td>${a.first != null ? a.first : '—'}</td><td>${a.n}</td></tr>`;
  const END = { done: '玩完', safe: '安全停止', started: '只開了頭' };
  const KIND = { quiz: '答題', game: '動作遊戲', entry: '小測' };
  const actName = (c) => c.kind === 'entry' ? '1 分鐘小測' : c.kind === 'quiz' ? (quizById(c.activity) ? quizById(c.activity).name : c.activity) : (gameById(c.activity) ? gameById(c.activity).name : c.activity);
  const axTxt = (c) => c.axes.length ? [...new Map(c.axes.filter((a) => a.w >= 1).map((a) => [a.axis, a])).values()].map((a) => `${AXIS_NAME[a.axis] || a.axis} ${a.v}`).join('、') : (c.quality.flags.includes('copiedMeasure') ? '沿用小測的量測' : c.quality.flags.includes('noRate') ? '遊戲還沒回報成功率' : '—');
  const t2 = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const crow = (c) => `<tr><td>${t2(c.at)}</td><td>${esc(KIND[c.kind])}．${esc(actName(c))}</td><td>${c.level ?? '—'}</td><td>${c.rate != null ? Math.round(c.rate * 100) + '%' : '—'}</td><td>${END[c.end]}</td><td>${esc(axTxt(c))}</td><td>${c.task ? '第 ' + c.task.no + ' 樣' : ''}</td></tr>`;
  $('proBody').innerHTML = `<table><tr><th>軸</th><th>最近</th><th>第一週</th><th>筆數</th></tr>${[...R.mind, ...R.move.filter((a) => !a.locked)].map(row).join('')}</table>
<h3 class="pro-h">成績卡（最近 10 張）</h3><div class="pro-scroll"><table class="cards-t"><tr><th>時間</th><th>活動</th><th>等級</th><th>第一次就成功</th><th>結束</th><th>計入雷達</th><th>今日點心</th></tr>${cards.slice(-10).reverse().map(crow).join('')}</table></div>`;
  window.__gd && (window.__gd.lastCards = cards);
}

/* ---------- 4 你是誰 ---------- */
const QUESTIONS = [
  { f: 'sex', q: '您是？', opts: OPTIONS.sex },
  { f: 'age', q: '您的年齡？', opts: OPTIONS.age },
  { f: 'mobility', q: '平常怎麼走？', opts: OPTIONS.mobility },
  /* 老闆 11-10 選定：不直接問肩膀痛不痛，改問生活裡的動作。答「做不到或會痛」的人，遊戲不催舉高（換算成 pain） */
  { f: 'reach', q: '把手舉高拿東西，做得到嗎？', hint: '像晾衣服、拿櫃子上的碗。', opts: OPTIONS.reach },
];
let whoStep = 0, answers = {}, therOpen = false, profile = null;
function renderWho() {
  const Q = QUESTIONS[whoStep];
  $('whoStep').textContent = `第 ${whoStep + 1} 題，共 ${QUESTIONS.length} 題`;
  $('whoQ').textContent = Q.q;
  $('whoHint').textContent = Q.hint || ''; $('whoHint').hidden = !Q.hint;
  $('whoChoices').className = `choices n${Q.opts.length}`;
  $('whoChoices').innerHTML = Q.opts.map(([v, t]) => `<button type="button" class="btn choice${answers[Q.f] === v ? ' on' : ''}" data-v="${esc(v)}">${esc(t)}</button>`).join('');
  $('whoChoices').querySelectorAll('button').forEach((b) => b.onclick = () => answer(Q.f, b.dataset.v));
  $('whoPrev').style.visibility = whoStep ? 'visible' : 'hidden';
  $('whoTher').hidden = !therOpen;
  if (therOpen && !profile) {
    profile = mountProfile($('whoTherAnchor'), store, {
      game: '遊戲', trial: '約 1 分鐘的「小測」',
      onChange: (s) => { $('whoTherGo').hidden = !s; if (s) $('whoTherGo').textContent = `用 ${s.code} 開始小測`; renderChip(); },
    });
  }
  if (profile) { profile.render(); const s = store.current(); $('whoTherGo').hidden = !s; if (s) $('whoTherGo').textContent = `用 ${s.code} 開始小測`; }
}
function answer(f, v) {
  answers[f] = v;
  if (whoStep < QUESTIONS.length - 1) { whoStep++; renderWho(); return; }
  const code = store.nextCode();
  const err = store.upsert({ code, cond: 'healthy', ...answers, pain: REACH_TO_PAIN[answers.reach] || 'unsure' });
  if (err) { $('whoStep').textContent = err; return; }
  store.setCurrent(code);
  answers = {}; whoStep = 0;
  go('quiz');
}
$('whoPrev').onclick = () => { if (whoStep) { whoStep--; renderWho(); } };
$('whoBack').onclick = () => go('today');
$('whoTherBtn').onclick = () => { therOpen = !therOpen; renderWho(); };
$('whoTherGo').onclick = () => { if (store.current()) go('quiz'); };

/* ---------- 5 小測 ---------- */
const quiz = createQuiz($('scrQuiz'), {
  demo: DEMO, mute: MUTE,
  getSubject: () => store.current(),
  onExit: () => go('today'),
  onDone: (rec) => {
    const s = store.current();
    if (!s) { go('today'); return; }
    store.setCurrent(s.code);   /* 釣魚、節奏律動靠「現在誰在玩」接上入口的計畫 */
    const r = store.addSession({ ...rec, code: s.code });
    const R = recommend(s, r);
    writePlan({
      code: s.code, at: r.at, session: r.id, home: HOME,
      picks: R.picks.map((p) => ({ game: p.game, name: gameById(p.game).name, url: gameUrl(p.game), diff: p.diff, diffName: diffNameOf(p.game, p.diff), why: p.why, tweak: p.tweak })),
      hold: R.hold.map((h) => ({ game: h.game, name: gameById(h.game).name, why: h.why })),
    });
    showResult();
  },
});

/* ---------- 6 小測結果與推薦 ---------- */
function liftWord(rec, s) {
  const b = rec && rec.lift && rec.lift.by && rec.lift.by[s];
  return b && b.n ? heightWord(b.best) : '這次先休息';
}
function pickCard(p, first) {
  const g = gameById(p.game);
  const extra = [p.tweak ? `這次調整：${p.tweak}` : '', g.note].filter(Boolean);
  return `<div class="pick${first ? ' first' : ''}">
    <span class="pic" style="background-image:url('${esc(g.img)}')"></span>
    <div class="txt">
      ${first ? '<p class="k">第一推薦（今日點心第 1 樣）</p>' : ''}
      <p class="nm">${esc(g.name)}${diffText(p) ? `<span class="diff">${esc(diffText(p))}</span>` : ''}</p>
      <p class="why">${esc(p.why)}</p>
      ${extra.map((x) => `<p class="extra">${esc(x)}</p>`).join('')}
      <a class="btn ${first ? 'primary huge' : 'big'}" href="${esc(p.url || gameUrl(p.game))}" data-play="${p.game}">${first ? '開始玩' : `玩${esc(g.name)}`}</a>
    </div></div>`;
}
function showResult() {
  const s = store.current();
  const rec = s ? hubToday(store, s.code) : null;
  if (!s || !rec) { go('today'); return; }
  const plan = planFor(s.code);
  const R = recommend(s, rec);
  const picks = plan ? plan.picks : R.picks.map((p) => ({ ...p, url: gameUrl(p.game) }));
  const hold = plan ? plan.hold : R.hold;
  const g = rec.gng;
  const tiles = [
    ['右手舉到', liftWord(rec, 'R')],
    ['左手舉到', liftWord(rec, 'L')],
    ['看到魚，多快動起來', g && g.rtMedian != null ? `約 ${g.rtMedian.toFixed(1)} 秒` : '這次沒有量'],
    ['看到垃圾，忍住幾題', g ? `${g.nogoN} 題忍住 ${g.nogoN - g.commissions} 題` : '這次沒有量'],
  ];
  $('resWho').textContent = whoText(s);
  $('resTiles').innerHTML = tiles.map(([k, v]) => `<div class="tile"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  $('resFirst').innerHTML = picks[0] ? pickCard(picks[0], true) : '';
  $('resMore').innerHTML = picks.length > 1 ? `<h3 class="sub-sec">也可以玩</h3><div class="more">${picks.slice(1).map((p) => pickCard(p, false)).join('')}</div>` : '';
  $('resHold').innerHTML = hold.length ? `<h3 class="sub-sec">先等等</h3>${hold.map((h) => `<p class="hold"><b>${esc(gameById(h.game).name)}</b>：${esc(h.why)}</p>`).join('')}` : '';
  go('result');
}

/* ---------- 開始：網址有 #lib、#me、#quiz 就直接到那一頁 ---------- */
{
  const h = location.hash.slice(1);
  if (h === 'result' && store.current() && hubToday(store, store.current().code)) showResult();
  else go(SCREENS[h] && h !== 'result' ? h : 'today');
}
/* 從遊戲按上一頁回來時，重畫今日點心的打勾 */
addEventListener('pageshow', (e) => { if (e.persisted && TABBED.includes(screen)) go(screen, { push: false }); });

/* 測試用入口 */
window.__gd = {
  get screen() { return screen; },
  get quiz() { return quiz.state; },
  stubCam: (fn) => quiz.stubCam(fn),
  go, store, quizStore, readPlan, snack: snackNow,
  cards: () => { const { s, qs, as } = myData(); return tagTasks(buildCards({ quizSessions: qs, assessSessions: as }), snackNow(), s ? s.code : ''); },
  recommend: () => { const s = store.current(); return s && recommend(s, hubToday(store, s.code)); },
};
