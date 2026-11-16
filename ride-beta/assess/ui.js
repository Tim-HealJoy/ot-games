/* 由 100_Todo/projects/2026-11-06_遊戲評估層/assess/ui.js 複製。請改正本再跑 sync.sh，不要直接改這份。 */
/* 評估層畫面：設定頁的「誰在玩」、結算頁的動作報告。
   沿用遊戲已有的 .field .lab .seg .btn .note .card 樣式；自己的樣式都以 as- 開頭。 */
import { OPTIONS, label, describe, checkCode } from './store.js?v=1';

const CSS = `
.as-who{margin:0 0 14px}
.as-who .seg button{flex:0 1 auto;min-width:150px}
.as-who .seg button[disabled]{opacity:.45;cursor:not-allowed}
.as-who .as-cur{font-size:clamp(16px,2vw,19px);font-weight:800;color:var(--blue-d,#134F72);margin:6px 0 0}
.as-form{background:var(--cream,#F4EFE3);border-radius:16px;padding:12px 16px;margin-top:10px}
.as-form .field{margin:0 0 10px}
.as-form .seg button{flex:1 1 110px;min-height:50px;font-size:clamp(17px,2vw,21px)}
.as-form input.as-code{font:inherit;font-size:22px;font-weight:800;width:7em;min-height:50px;padding:4px 12px;border:3px solid var(--line,#D5DDE0);border-radius:12px;background:#fff;color:inherit}
.as-form .as-err{color:var(--red,#C8402E);font-weight:800;min-height:1.2em;margin:4px 0}
.as-form .as-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.as-report{background:#fff;border:3px solid #9CCBB0;border-radius:18px;padding:12px 16px;margin:4px 0 10px;text-align:left}
.as-report .as-kicker{font-size:clamp(15px,2vh,18px);font-weight:800;color:var(--muted,#62707A);margin:0}
.as-report .as-head{font-size:clamp(24px,3.8vh,34px);font-weight:900;color:#17603A;margin:2px 0 8px;line-height:1.3}
.as-report .as-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px 18px;margin:0 0 8px}
.as-report .as-rows div{display:flex;justify-content:space-between;gap:10px;border-top:2px solid #EEF2F0;padding:6px 0;font-size:clamp(17px,2.5vh,22px);font-weight:800}
.as-report .as-rows b{color:var(--blue-d,#134F72)}
.as-report .as-band{font-size:clamp(14px,1.9vh,17px);color:var(--muted,#62707A);margin:0 0 8px}
.as-report .as-next{background:#DDF0E4;border-radius:12px;padding:8px 12px;color:#17603A;font-size:clamp(17px,2.5vh,22px);font-weight:800;line-height:1.5}
.as-report .as-next small{display:block;font-size:.72em;font-weight:800;opacity:.85}
.as-ther table{margin-top:8px}
.as-ther ul{margin:8px 0;padding-left:1.2em;font-size:16px;line-height:1.6}
.as-ther .as-bars{display:flex;align-items:flex-end;gap:6px;height:70px;margin:6px 0 2px}
.as-ther .as-bars i{flex:1;background:#B9CDD6;border-radius:4px 4px 0 0;min-height:3px;position:relative}
.as-ther .as-bars i.now{background:var(--blue,#1C6E9C)}
.as-ther .as-bars-v{display:flex;gap:6px;font-size:14px;font-weight:700;color:var(--muted,#62707A)}
.as-ther .as-bars-v span{flex:1;text-align:center}
.as-ther .as-trend{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.as-ther .as-trend h4{margin:8px 0 0;font-size:16px}
@media (max-width:760px){.as-ther .as-trend{grid-template-columns:1fr}}
`;

export function injectCss(doc = document) {
  if (doc.getElementById('as-css')) return;
  const st = doc.createElement('style'); st.id = 'as-css'; st.textContent = CSS; doc.head.appendChild(st);
}

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seg = (field, cur, small = {}) => `<div class="seg" data-f="${field}">${OPTIONS[field].map(([v, t]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}">${esc(t)}${small[v] ? `<small>${esc(small[v])}</small>` : ''}</button>`).join('')}</div>`;

/* 設定頁「誰在玩」。onChange(subject|null) 在選人或改資料後呼叫。
   兩人同螢幕的遊戲每個位置掛一個：slot 給位置代號（'a'、'b'），title 改成「左邊誰在玩」，
   busy(code) 回傳「這位已經在別的位置」的說明（例如「右邊」），那顆就不能按；第二個位置用 showNote:false 免得說明重複。
   trial：量測關的說法，例如「約 1 分鐘的「試竿」」。 */
export function mountProfile(host, store, { onChange = () => {}, game = '這款遊戲', slot = null, title = '誰在玩', trial = '約 1 分鐘的「試竿」', showNote = true, busy = () => null } = {}) {
  injectCss(host.ownerDocument);
  const box = host.ownerDocument.createElement('div');
  box.className = 'field as-who';
  if (slot) box.dataset.slot = slot;
  host.parentNode.insertBefore(box, host);
  let editing = null; // null＝不在表單；{}＝新增；subject＝修改

  function render() {
    const cur = store.current(slot), list = store.subjects();
    const chips = [`<button type="button" data-pick="" class="${cur ? '' : 'on'}">訪客<small>不記錄</small></button>`,
      ...list.slice(0, 8).map((s) => {
        const on = cur && cur.code === s.code, b = on ? null : busy(s.code);
        return `<button type="button" data-pick="${esc(s.code)}" class="${on ? 'on' : ''}"${b ? ' disabled' : ''}>${esc(s.code)}<small>${b ? `${esc(b)}在用` : `${esc(label('sex', s.sex))}・${esc(label('age', s.age))}・${esc(label('cond', s.cond))}`}</small></button>`;
      }),
      '<button type="button" data-new="1">＋ 新增個案</button>'];
    const note = !showNote ? '' : `<p class="note">${cur ? `開始前會多一段${esc(trial)}，結束後有動作報告，可以跟自己上次比。` : `選了個案，${esc(game)}開始前會多一段${esc(trial)}，結束後有動作報告。`}紀錄只存在這台裝置，不會上傳；代號請不要用真實姓名。</p>`;
    box.innerHTML = `<div class="lab">${esc(title)}</div><div class="seg">${chips.join('')}</div>
      <p class="as-cur">${cur ? `${esc(describe(cur))}　<button type="button" class="link-btn" data-edit="1">修改資料</button>` : ''}</p>
      ${note}
      ${editing ? form(editing) : ''}`;
    box.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => { editing = null; const s = store.setCurrent(b.dataset.pick || null, slot); render(); onChange(s); });
    const nb = box.querySelector('[data-new]'); if (nb) nb.onclick = () => { editing = { code: store.nextCode() }; render(); box.querySelector('.as-code').focus(); };
    const eb = box.querySelector('[data-edit]'); if (eb) eb.onclick = () => { editing = { ...store.current(slot), _old: store.current(slot).code }; render(); };
    if (editing) bindForm();
  }

  function form(s) {
    return `<div class="as-form">
      <div class="field"><div class="lab">代號</div><div class="as-row"><input class="as-code" maxlength="8" value="${esc(s.code || '')}" aria-label="個案代號" autocomplete="off"><span class="note" style="margin:0">例如 A01，請不要用真實姓名</span></div></div>
      <div class="field"><div class="lab">性別</div>${seg('sex', s.sex)}</div>
      <div class="field"><div class="lab">年齡</div>${seg('age', s.age)}</div>
      <div class="field"><div class="lab">狀況</div>${seg('cond', s.cond)}</div>
      <div class="as-stroke ${s.cond === 'stroke' ? '' : 'hidden'}">
        <div class="field"><div class="lab">患側</div>${seg('side', s.side)}</div>
        <div class="field"><div class="lab">發病多久</div>${seg('onset', s.onset)}</div>
      </div>
      <div class="field"><div class="lab">平常怎麼移動</div>${seg('mobility', s.mobility)}</div>
      <div class="field"><div class="lab">舉手時肩膀會痛嗎</div>${seg('pain', s.pain, { yes: '遊戲不催他舉高' })}</div>
      <p class="as-err" role="status"></p>
      <div class="as-row"><button type="button" class="btn primary" data-save="1">儲存並選這位</button><button type="button" class="btn" data-cancel="1">取消</button>
        ${s._old ? '<button type="button" class="link-btn" data-del="1">刪除這位與所有紀錄</button>' : ''}</div>
    </div>`;
  }

  function bindForm() {
    const fm = box.querySelector('.as-form');
    fm.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.onclick = () => {
      sg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on');
      editing[sg.dataset.f] = b.dataset.v;
      if (sg.dataset.f === 'cond') fm.querySelector('.as-stroke').classList.toggle('hidden', b.dataset.v !== 'stroke');
    }));
    const err = fm.querySelector('.as-err'), inp = fm.querySelector('.as-code');
    inp.oninput = () => { editing.code = inp.value; err.textContent = checkCode(inp.value) || ''; };
    fm.querySelector('[data-cancel]').onclick = () => { editing = null; render(); };
    fm.querySelector('[data-save]').onclick = () => {
      editing.code = inp.value.trim();
      const e = store.upsert(editing, editing._old || null);
      if (e) { err.textContent = e; return; }
      const s = store.setCurrent(editing.code, slot); editing = null; render(); onChange(s);
    };
    const del = fm.querySelector('[data-del]');
    if (del) del.onclick = () => {
      if (!box.ownerDocument.defaultView.confirm(`確定刪除「${editing._old}」和這位的所有紀錄？刪除後無法復原。`)) return;
      store.remove(editing._old); editing = null; render(); onChange(null);
    };
  }

  render();
  return { render, el: box };
}

/* 結算頁：長輩看的卡片＋治療師展開的細節。
   host：放長輩卡的容器；therHost：放治療師細節的容器（可同一個）。kicker：兩人遊戲標位置，例如「左邊 」。
   act：看圖題的動詞（「該舉沒舉」；按煞車的遊戲用「按」）。表格依這次紀錄有什麼（舉手／手機角度／看圖）決定列。 */
export function renderReport({ host, therHost, subject, summary, history, onExport, kicker = '', act = '舉' }) {
  injectCss(host.ownerDocument);
  const doc = host.ownerDocument;
  let card = host.querySelector('.as-report');
  if (!card) { card = doc.createElement('div'); card.className = 'as-report'; host.prepend(card); }   /* 用 div：有的遊戲把所有 section 設成全螢幕畫面（節奏律動） */
  const E = summary.elder;
  card.innerHTML = `<p class="as-kicker">${esc(kicker)}${esc(subject.code)} 今天的動作報告</p>
    <p class="as-head">${esc(E.headline)}</p>
    <div class="as-rows">${E.rows.map((r) => `<div><span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`).join('')}</div>
    <p class="as-band">${esc(E.band.text)}</p>
    <div class="as-next"><small>下次可以試試</small>${esc(E.next.text)}</div>`;

  let det = therHost.querySelector('details.as-ther');
  if (!det) { det = doc.createElement('details'); det.className = 'as-ther'; therHost.appendChild(det); }
  const rec = history.at(-1), prev = history.length > 1 ? history.at(-2) : null, T = summary.therapist;
  const v = (r, p) => p.split('.').reduce((o, k) => (o == null ? null : o[k]), r);
  const f = (x, d = 2) => (x == null ? '—' : typeof x === 'number' ? x.toFixed(d) : x);
  const row = (name, p, d = 2) => `<tr><th>${esc(name)}</th><td>${f(v(rec, p), d)}</td><td>${prev ? f(v(prev, p), d) : '—'}</td></tr>`;
  /* 近 6 次：依這個人自己的範圍縮放，差異才看得出來；每根下面寫數值，不靠長度猜 */
  const bars = (p) => {
    const vals = history.slice(-6).map((h) => v(h, p));
    const nums = vals.filter((x) => x != null);
    if (!nums.length) return '<p class="note">還沒有資料</p>';
    const lo = Math.min(...nums) - 0.15, hi = Math.max(...nums) + 0.02;
    return `<div class="as-bars">${vals.map((x, i) => `<i class="${i === vals.length - 1 ? 'now' : ''}" style="height:${x == null ? 3 : Math.max(6, ((x - lo) / (hi - lo)) * 70)}px"></i>`).join('')}</div>
      <div class="as-bars-v">${vals.map((x) => `<span>${f(x)}</span>`).join('')}</div>`;
  };
  const hasLift = !!(rec && rec.lift), hasTilt = !!(rec && rec.tilt), hasGng = !!(rec && rec.gng);
  const tv = hasTilt && rec.tilt.kind === 'yaw' ? '轉' : '傾';
  const liftRows = `${row('左手最高（軀幹長）', 'lift.by.L.best')}${row('右手最高（軀幹長）', 'lift.by.R.best')}
      ${row('左手平均（軀幹長）', 'lift.by.L.mean')}${row('右手平均（軀幹長）', 'lift.by.R.mean')}
      ${row('左手舉起秒數（中位數）', 'lift.by.L.moveTime', 1)}${row('右手舉起秒數（中位數）', 'lift.by.R.moveTime', 1)}
      ${row('左手側傾次數', 'lift.by.L.lean', 0)}${row('右手側傾次數', 'lift.by.R.lean', 0)}
      ${row('左手聳肩次數', 'lift.by.L.hike', 0)}${row('右手聳肩次數', 'lift.by.R.hike', 0)}`;
  const tiltRows = `${row(`手機往左${tv}最多（度）`, 'tilt.by.L.best', 0)}${row(`手機往右${tv}最多（度）`, 'tilt.by.R.best', 0)}
      ${row(`手機往左${tv}平均（度）`, 'tilt.by.L.mean', 0)}${row(`手機往右${tv}平均（度）`, 'tilt.by.R.mean', 0)}
      ${row('往左回正秒數（中位數）', 'tilt.by.L.ret', 1)}${row('往右回正秒數（中位數）', 'tilt.by.R.ret', 1)}
      ${row('往左可能手腕代勞次數', 'tilt.by.L.wrist', 0)}${row('往右可能手腕代勞次數', 'tilt.by.R.wrist', 0)}`;
  const gngRows = `${row('反應時間中位數（秒）', 'gng.rtMedian')}${row(`該${act}沒${act}`, 'gng.omissions', 0)}${row(`不該${act}卻${act}`, 'gng.commissions', 0)}`;
  const trend = hasTilt && !hasLift
    ? `<div><h4>手機往左${tv}最多，近 6 次</h4>${bars('tilt.by.L.best')}</div><div><h4>手機往右${tv}最多，近 6 次</h4>${bars('tilt.by.R.best')}</div>`
    : `<div><h4>左手最高，近 6 次</h4>${bars('lift.by.L.best')}</div><div><h4>右手最高，近 6 次</h4>${bars('lift.by.R.best')}</div>`;
  det.innerHTML = `<summary>動作評估（治療師）</summary>
    <p class="note">${esc(describe(subject))}${subject.cond === 'stroke' && subject.onset ? `｜發病 ${esc(label('onset', subject.onset))}` : ''}｜${esc(label('mobility', subject.mobility))}｜舉手會痛：${esc(label('pain', subject.pain))}｜共 ${history.length} 次紀錄</p>
    <ul>${T.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <table><tr><th>項目</th><th>這次</th><th>上次</th></tr>
      ${hasLift || !hasTilt ? liftRows : ''}${hasTilt ? tiltRows : ''}${hasGng || !hasTilt ? gngRows : ''}
    </table>
    <div class="as-trend">${trend}</div>
    <ul>${T.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="note">建議句：${esc(E.next.src)}</p>
    <div class="btn-row" style="margin-top:6px"><button class="btn" data-x="csv">下載這位的紀錄（試算表）</button><button class="btn" data-x="json">下載原始資料</button></div>`;
  det.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => onExport && onExport(b.dataset.x));
  return { card, det };
}

export function remove(host) {
  host.querySelectorAll('.as-report, details.as-ther').forEach((e) => e.remove());
}
