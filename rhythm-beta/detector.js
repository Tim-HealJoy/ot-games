/* ══════════════════════════════════════════════════════════════
   節奏律動 — 動作偵測核心（遊戲 index.html 與 動作測試.html 共用）

   ⭐ v6（2026-08-02）動作組更換：拍手／雙手高舉過頭／雙手側平舉
      砍掉摸肩與摸頭。原因不是參數沒調好，是幾何上分不開——兩者的手腕終點
      在畫面上只差 0.3～0.5 個肩寬，而 landmark 抖動就有 ±2～5px，
      訊號差距 ÷ 雜訊比太低，參數只能在「漏偵測」與「誤觸」之間搬移。
      新三動作分屬畫面「中央／上方／兩側」三區，先天就不重疊。
      臨床面向也從「三個都是向心動作」擴成 雙側協調＋肩屈曲＋肩外展。

   設計要點：
   ① 雙路訊號：判定走「極輕平滑」低延遲訊號，繪圖走「重平滑」訊號。
      —— v1 用同一路重平滑，拍手 0.2 秒的峰值被濾掉 → 大量漏偵測。
   ② 拍手用峰谷震盪偵測（v3）：看「一次合攏的擺幅」而非絕對距離，
      且事件時間戳「回溯」到谷底那一刻 → 節奏判定不受確認延遲影響。
      高舉／平舉同樣回溯到「剛到位」那一刻。
   ③ 空間遲滯（到位觸發 / 收回夠多才重新武裝）取代純時間冷卻。
   ④ 動作互斥：高舉 > 平舉 > 拍手；高舉後短時間封鎖平舉
      —— 手從頭頂放下必經側平舉位置。
   ⑤ 肩寬 S 取中位數緩衝，避免單幀跳動害閾值飄移。
   ⑥ 高舉／平舉單側到位即觸發（偏癱長者要玩得下去），事件另帶 sides:{l,r}
      供報表算「左右對稱性」。

   ⭐ v12（2026-08-08）小幅動作也要抓得到
      老闆實測：拍手比較小、或手沒舉那麼高，就整串偵測不到。三個根因與修法：
      ① 固定門檻對「幅度小的長者」永遠過不去 → 新增每個動作的個人化縮放
         係數 scales（setScales / getScales），由暖身校正量出來、遊戲中還會
         依「近失」自動再放寬。門檻一律夾在安全地板之上（見 FLOOR_*）。
      ② dy > dx 這條判據把「彎肘斜舉」誤殺 → 放寬成 dy > 0.65·dx（見 isRaised）。
      ③ 暖身校正靠事件計次＝雞生蛋（沒跨門檻就沒事件、沒事件就量不到幅度）
         → 新增 getRecentAttempts()：不論有沒有跨過門檻，都把完成的動作波形
         （峰值／擺幅）記進環形緩衝，讓上層量得到、也能回查「他其實有做」。
   ══════════════════════════════════════════════════════════════ */

/* One-Euro（pixel space；min 越大越跟手、越小越穩） */
export function oneEuro(min = 1.2, beta = 0.03, dcut = 1.0) {
  let xP = null, dxP = 0, tP = null;
  const a = (c, dt) => { const T = 1 / (2 * Math.PI * c); return 1 / (1 + T / dt); };
  return {
    reset() { xP = null; dxP = 0; tP = null; },
    f(x, t) {
      if (xP === null) { xP = x; tP = t; return x; }
      const dt = Math.max((t - tP) / 1000, 1e-3); tP = t;
      const dx = (x - xP) / dt, ad = a(dcut, dt), dh = ad * dx + (1 - ad) * dxP; dxP = dh;
      const c = min + beta * Math.abs(dh), al = a(c, dt), xh = al * x + (1 - al) * xP;
      xP = xh; return xh;
    }
  };
}

function medianBuf(n = 21) {
  const arr = [];
  return {
    reset() { arr.length = 0; },
    push(v) { arr.push(v); if (arr.length > n) arr.shift(); const s = [...arr].sort((a, b) => a - b); return s[s.length >> 1]; }
  };
}

/* 可調參數（全部以「肩寬 S」為單位，跟身材與距離無關） */
export const TUNE = {
  /* 拍手（峰谷震盪偵測：看「一次合攏的擺幅」而非絕對距離，
     才抓得到快速小幅連拍——那種手幾乎沒張開的拍法） */
  clapClose:   0.62,   // 谷底至少要靠這麼近才算一次拍手
  clapSwing:   0.085,  // 一次合攏的最小擺幅（濾掉靜止抖動；小幅連拍約 0.15）
  clapEps:     0.022,  // 轉向遲滯，避免雜訊讓上升/下降狀態亂跳
  clapMinFall: 2,      // 合攏至少要跨這麼多幀＝真的動作（雜訊假谷底只佔單幀）。
                       // ⚠️ 用「幀」不用「毫秒」：每秒 7.5 下時下降只有 1 幀 33ms，
                       // 固定毫秒門檻會把真動作整串擋掉，而且換 fps 就失準。
  clapTight:   0.30,   // 貼這麼近且停住 → 不等回升就算數（拍完手沒張開的情況）
  clapHoldMs:  90,     // 上面「停住」的判定時間
  clapRefract: 95,     // ms（每秒最多約 10 下）
  /* ── 雙手高舉過頭（肩屈曲 ROM）──
     判據＝手腕相對「同側肩膀」明顯往上，且是「往上伸」而非「往外張」
     （用 |dy| > |dx| 區分，這是它跟側平舉的分界）。 */
  raiseUp:      0.85,  // 手腕要高過同側肩膀這麼多（肩寬倍數）才算舉起。
                       // 完全伸直約 1.2～1.4，設 0.85 讓 ROM 受限的長者也算得到分。
  raiseDown:    0.55,  // 掉到這個高度以下才重新武裝
  raiseConfirm: 2,     // 連續確認幀（濾單幀假觸）
  raiseRefract: 400,   // ms
  raiseSpeedMax: 6.0,  // 肩寬/秒。舉手本來就快，門檻只用來擋亂揮

  /* ── 雙手側平舉（肩外展）──
     判據＝手腕離身體中線夠遠 ＋ 高度接近肩線 ＋ 水平分量大於垂直分量。
     ⚠️ 必須「停住」才算數：從身側往頭頂舉的路徑會經過側平舉位置
     （速度約 4 肩寬/秒），不設速度門檻的話每次高舉都會先誤觸一次平舉。 */
  sideOut:      1.15,  // 手腕離中線至少這麼遠（肩寬倍數）。垂放身側約 1.0、
                       // 完全平舉約 2.1 → 1.15 可擋住垂放、又容得下 ROM 受限者。
  sideIn:       0.90,  // 收回到這個距離內才重新武裝
  sideYTol:     0.50,  // 手腕與肩線的高度差上限（垂放身側約 0.77，會被擋掉）
  sideStopMax:  1.60,  // 肩寬/秒。真平舉停住約 0，途經約 4
  sideConfirm:  2,
  sideRefract:  400,

  /* 互斥：高舉 > 平舉 > 拍手 */
  raiseBlocksSide: 350, // 高舉後這段時間不判平舉（手放下必經側平舉位置）
};

/* ── ⭐ v12 個人化門檻的「安全地板」──
   scale 與 sens 疊完之後，有效門檻不得低於這裡的值。理由是純物理的：
   ・高舉 0.35 肩寬 ≈ 手腕抬到耳垂高度。再低就跟「搔頭、扶眼鏡、伸懶腰」
     這類日常小動作重疊，坐著晃一下都會觸發，遊戲會變成亂跳分。
   ・拍手擺幅 0.04 肩寬 ≈ 6px（960 寬、肩寬約 154px 時）。MediaPipe 手腕
     landmark 的靜止抖動實測就有 ±2～5px，門檻壓到這個量級以下等於在偵測雜訊。
   換句話說：地板不是「調校的下限」，是「訊號與雜訊分不開的那條線」。 */
export const FLOOR_RAISE_UP = 0.35;
export const FLOOR_CLAP_SWING = 0.04;

/* 次門檻峰值回報用的底噪門檻（比地板更低，只求別讓靜止雜訊塞爆緩衝） */
const ATTEMPT_BUF = 8;        // 環形緩衝長度（約涵蓋最近 3～8 秒的動作）
const RAISE_ATT_MIN = 0.22;   // 峰值低於此不算一次「嘗試」
const RAISE_ATT_FALL = 0.15;  // 從峰值掉這麼多肩寬，才算這一次動作做完了
const CLAP_ATT_MIN = 0.03;    // 擺幅低於此不算一次「嘗試」

const LM = { NOSE: 0, LEAR: 7, REAR: 8, LSH: 11, RSH: 12, LWR: 15, RWR: 16 };
const visible = (lm, i) => lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.3);

export function createDetector() {
  /* 繪圖用（重平滑，好看不抖） */
  const smo = {
    lw: { x: oneEuro(1.2, .03), y: oneEuro(1.2, .03) }, rw: { x: oneEuro(1.2, .03), y: oneEuro(1.2, .03) },
    ls: { x: oneEuro(1.0, .01), y: oneEuro(1.0, .01) }, rs: { x: oneEuro(1.0, .01), y: oneEuro(1.0, .01) },
    hd: { x: oneEuro(1.0, .01), y: oneEuro(1.0, .01) },
  };
  /* 判定用（極輕平滑：只去單幀雜訊，幾乎不延遲） */
  const jit = {
    lw: { x: oneEuro(5.0, .6), y: oneEuro(5.0, .6) }, rw: { x: oneEuro(5.0, .6), y: oneEuro(5.0, .6) },
    ls: { x: oneEuro(2.5, .2), y: oneEuro(2.5, .2) }, rs: { x: oneEuro(2.5, .2), y: oneEuro(2.5, .2) },
    hd: { x: oneEuro(2.5, .2), y: oneEuro(2.5, .2) },
  };
  const sBuf = medianBuf(21);
  /* ⚠️ 拍手腕距刻意「完全不濾波」。
     低通會削掉快速震盪的振幅；連 3 點中位數都不能用——每秒 7.5 下的拍手
     在 30fps 下每週期只有 4 幀，中位數會把整段震盪抹平成一條直線（實測歸零）。
     雜訊改由 clapSwing 擺幅門檻擋掉。 */

  let sens = 1.0;                       // 靈敏度：>1 更容易觸發
  /* ⭐ v12 個人化門檻縮放（0～1，越小越容易觸發）。sens 是玩家手動調的，
     scale 是暖身校正／近失自動調的——兩者相乘，職責分開才不會互相蓋掉。 */
  const scales = { clap: 1, raise: 1, side: 1 };
  /* 動作遮罩：null＝全開。不在清單內的動作整段不判、不發事件
     （遊戲 v10 起平舉已退場，關掉才不會冤枉判成「做錯動作」扣分）。 */
  let actMask = null;
  const actOn = ty => !actMask || actMask.has(ty);

  /* 有效門檻＝TUNE × scale ÷ sens，再夾安全地板 */
  const effRaiseUp = () => Math.max(FLOOR_RAISE_UP, TUNE.raiseUp * scales.raise / sens);
  /* 收回門檻跟著等比例縮放，遲滯比（0.55/0.85）維持不變——
     只降觸發門檻卻不降 re-arm 門檻的話，小幅動作會「舉得起來、放不下來」，
     第二次就再也觸發不了。 */
  const effRaiseDown = () => effRaiseUp() * (TUNE.raiseDown / TUNE.raiseUp);
  const effClapSwing = () => Math.max(FLOOR_CLAP_SWING, TUNE.clapSwing * scales.clap / sens);
  const effSideOut = () => TUNE.sideOut * scales.side / sens;
  const effSideIn = () => TUNE.sideIn * scales.side / sens;

  const st = {
    clap: { dir: 'down', ext: null, peak: 0, tExtSong: 0, tExtNow: 0, fallFrames: 0, fired: false, logged: false, last: -9e9 },
    raise: { armed: true, cnt: 0, last: -9e9, tCrossSong: 0, tCrossNow: 0 },
    side: { armed: true, cnt: 0, last: -9e9, tCrossSong: 0, tCrossNow: 0 },
  };
  /* 完成波形的環形緩衝（不論有沒有跨過門檻都記，見檔頭 v12 ③） */
  let attempts = [];
  const pushAttempt = a => { attempts.push(a); if (attempts.length > ATTEMPT_BUF) attempts.shift(); };
  /* 正在追蹤的高舉波形。rising/falling 兩態是必要的：
     只用「掉了 0.15 就結算」的話，手從頭頂放到腿上這一路會被切成好幾段，
     每段都記一筆假的嘗試。改成結算後進入 falling，等重新升起 0.15 才開始追下一次。 */
  const excRaise = { peak: -9, tPeak: 0, trough: 9, rising: true };
  /* 手腕速度（單位：肩寬/秒）——用來分辨「停下來碰」與「路過」 */
  const prevW = { lw: null, rw: null, t: null };

  function reset() {
    Object.values(smo).forEach(p => { p.x.reset(); p.y.reset(); });
    Object.values(jit).forEach(p => { p.x.reset(); p.y.reset(); });
    sBuf.reset();
    st.clap = { dir: 'down', ext: null, peak: 0, tExtSong: 0, tExtNow: 0, fallFrames: 0, fired: false, logged: false, last: -9e9 };
    st.raise = { armed: true, cnt: 0, last: -9e9, tCrossSong: 0, tCrossNow: 0 };
    st.side = { armed: true, cnt: 0, last: -9e9, tCrossSong: 0, tCrossNow: 0 };
    attempts = [];
    excRaise.peak = -9; excRaise.tPeak = 0; excRaise.trough = 9; excRaise.rising = true;
    prevW.lw = prevW.rw = prevW.t = null;
  }

  /* 回傳 {lw,rw} 速度；資料不連續（掉幀、切分頁）時回傳 Infinity＝不判定觸發 */
  function wristSpeeds(P, S, tNow) {
    const dt = prevW.t == null ? null : (tNow - prevW.t) / 1000;
    const v = { lw: Infinity, rw: Infinity };
    for (const k of ['lw', 'rw']) {
      if (P[k] && prevW[k] && dt != null && dt > 1e-3 && dt < 0.2)
        v[k] = Math.hypot(P[k].x - prevW[k].x, P[k].y - prevW[k].y) / S / dt;
      prevW[k] = P[k] ? { x: P[k].x, y: P[k].y } : null;
    }
    prevW.t = tNow;
    return v;
  }

  /* landmarks → 畫面座標（含鏡像），回傳 {draw, judge, S} 或 null */
  function project(lm, geo, tNow) {
    if (!lm || !visible(lm, LM.LSH) || !visible(lm, LM.RSH)) return null;
    const { vw, vh, CW, CH } = geo; if (!vw) return null;
    const sc = Math.max(CW / vw, CH / vh), ox = (CW - vw * sc) / 2, oy = (CH - vh * sc) / 2;
    const map = i => ({ x: CW - (lm[i].x * vw * sc + ox), y: lm[i].y * vh * sc + oy });

    const raw = {};
    raw.lw = visible(lm, LM.LWR) ? map(LM.LWR) : null;
    raw.rw = visible(lm, LM.RWR) ? map(LM.RWR) : null;
    raw.ls = map(LM.LSH); raw.rs = map(LM.RSH);
    let hx = 0, hy = 0, n = 0;
    [LM.NOSE, LM.LEAR, LM.REAR].forEach(i => { if (visible(lm, i)) { const p = map(i); hx += p.x; hy += p.y; n++; } });
    raw.hd = n ? { x: hx / n, y: hy / n } : null;

    const apply = (bank, k) => raw[k] ? { x: bank[k].x.f(raw[k].x, tNow), y: bank[k].y.f(raw[k].y, tNow) } : null;
    const draw = {}, judge = {};
    for (const k of ['lw', 'rw', 'ls', 'rs', 'hd']) { draw[k] = apply(smo, k); judge[k] = apply(jit, k); }
    const S = Math.max(40, sBuf.push(Math.hypot(judge.ls.x - judge.rs.x, judge.ls.y - judge.rs.y)));
    draw.S = judge.S = S;
    /* 拍手用的腕距：原始座標、不濾波（理由見上方註解） */
    const dnRaw = (raw.lw && raw.rw)
      ? Math.hypot(raw.lw.x - raw.rw.x, raw.lw.y - raw.rw.y) / S : null;
    return { draw, judge, S, dnRaw };
  }

  /* 主更新。回傳 {pose, drawPose, events, dbg} */
  function update(lm, geo, tNow, tSong) {
    const pr = project(lm, geo, tNow);
    if (!pr) return { pose: null, drawPose: null, events: [], dbg: null };
    const P = pr.judge, S = pr.S, dnRaw = pr.dnRaw, events = [];
    const T = TUNE, k = 1 / sens;          // 靈敏度高 → 門檻放寬、冷卻縮短
    /* ⚠️ 門檻要看方向：「距離小於」類乘 sens（圈變大），
       「幅度大於」類除以 sens（門檻變低）。寫反會變成越調越難觸發。 */
    const dbg = {
      dn: null, raiseUp: null, sideOut: null, clapPhase: st.clap.dir,
      raiseArmed: st.raise.armed, sideArmed: st.side.armed,
    };

    const V = wristSpeeds(P, S, tNow);
    const wristList = [['lw', P.lw], ['rw', P.rw]].filter(e => e[1]);
    const wrists = wristList.map(e => e[1]);
    dbg.vMax = Math.min(V.lw, V.rw);

    /* ── 手臂向量：每隻手腕相對「同側肩膀」的位移（肩寬為單位）──
       v6 的三動作全靠這組向量分開：
         高舉＝往上為主（up 大，且垂直分量 > 水平分量）
         平舉＝往外為主（離中線遠、高度貼肩線、水平分量 > 垂直分量）
         拍手＝兩腕互相靠近（走另一套峰谷邏輯，完全不受這裡影響）
       三者在畫面上分屬「上方／兩側／中央」三區，不像 v5 的摸肩摸頭會幾何重疊。 */
    const shY = Math.min(P.ls.y, P.rs.y);
    const midX = (P.ls.x + P.rs.x) / 2;
    const arm = {};
    for (const [kk, w] of wristList) {
      const s = kk === 'lw' ? P.ls : P.rs;
      arm[kk] = {
        up:   (s.y - w.y) / S,               // 高過同側肩膀多少（正值＝在上面）
        out:  Math.abs(w.x - midX) / S,      // 離身體中線多遠
        dx:   Math.abs(w.x - s.x) / S,
        dy:   Math.abs(w.y - s.y) / S,
        yGap: Math.abs(w.y - shY) / S,       // 與肩線的高度差
        v:    V[kk],
      };
    }
    const sidesOf = pred => ({ l: !!(arm.lw && pred(arm.lw)), r: !!(arm.rw && pred(arm.rw)) });

    /* ── 雙手高舉過頭（優先權最高，會封鎖平舉）──
       ⚠️ v12：「往上伸」的判據從 dy > dx 放寬成 dy > 0.65·dx。
       原本那條是為了跟側平舉分界，但平舉在 v10 已從遊戲退場，這裡只剩下
       「擋純水平張開」一個任務——而純水平張開的 up ≈ 0，本來就過不了高度門檻，
       不可能誤入。相對地，長者彎肘往斜上方推的小幅高舉常常 dy 略小於 dx，
       舊判據會把真動作整串丟掉，這才是老闆回報「舉手偵測不到」的主因之一。 */
    const isRaised = a => a.up > effRaiseUp()
      && a.dy > 0.65 * a.dx                             // 往上伸，不是往外張
      && a.v < T.raiseSpeedMax * sens;
    const maxUp = Math.max(arm.lw ? arm.lw.up : -9, arm.rw ? arm.rw.up : -9);
    dbg.raiseUp = maxUp;
    let raiseHit = false;
    if (actOn('raise')) {
      const raiseSides = sidesOf(isRaised);
      raiseHit = raiseSides.l || raiseSides.r;          // 單側也算：偏癱長者要玩得下去，
                                                       // 左右差異改由報表的「對稱性」呈現
      if (raiseHit && st.raise.armed && tNow - st.raise.last > T.raiseRefract * k) {
        if (st.raise.cnt === 0) { st.raise.tCrossSong = tSong; st.raise.tCrossNow = tNow; }
        st.raise.cnt++;
        if (st.raise.cnt >= T.raiseConfirm) {
          st.raise.armed = false; st.raise.cnt = 0; st.raise.last = tNow;
          st.side.cnt = 0;                             // 取消正在累積的平舉確認
          events.push({
            type: 'raise', t: st.raise.tCrossSong,     // 時間戳回溯到剛到位那一刻
            latency: Math.max(0, tNow - st.raise.tCrossNow), sides: raiseSides,
          });
        }
      } else if (!raiseHit) st.raise.cnt = 0;
      if (maxUp < effRaiseDown()) st.raise.armed = true;

      /* 次門檻峰值：追蹤「升起→落下」的完整波形，落下夠多就結算一次嘗試。
         不看門檻，所以幅度小到根本沒觸發的人也量得到（暖身校正靠這個）。 */
      const E = excRaise;
      if (E.rising) {
        if (maxUp > E.peak) { E.peak = maxUp; E.tPeak = tSong; }
        else if (E.peak - maxUp > RAISE_ATT_FALL) {          // 落下夠多＝這次做完了
          if (E.peak >= RAISE_ATT_MIN)
            pushAttempt({ type: 'raise', t: E.tPeak, peak: E.peak });
          E.rising = false; E.trough = maxUp;
        }
      } else {
        if (maxUp < E.trough) E.trough = maxUp;
        else if (maxUp - E.trough > RAISE_ATT_FALL) {        // 重新升起＝下一次開始
          E.rising = true; E.peak = maxUp; E.tPeak = tSong;
        }
      }
    }

    /* ── 雙手側平舉 ──
       ⚠️ 速度門檻是關鍵：從身側往頭頂舉的路徑會經過側平舉位置，
       沒有「必須停住」這條，每次高舉都會先誤觸一次平舉。 */
    const maxOut = Math.max(arm.lw ? arm.lw.out : 0, arm.rw ? arm.rw.out : 0);
    dbg.sideOut = maxOut;
    if (actOn('side')) {
      const blockedByRaise = (tNow - st.raise.last) < T.raiseBlocksSide * k || raiseHit;
      const isSide = a => a.out > effSideOut()
        && a.yGap < T.sideYTol * sens                   // 高度貼近肩線
        && a.dx > a.dy                                  // 往外張，不是往上伸
        && a.v < T.sideStopMax * sens;                  // 真的停住，不是路過
      const sideSides = sidesOf(isSide);
      const sideHit = (sideSides.l || sideSides.r) && !blockedByRaise;
      if (sideHit && st.side.armed && tNow - st.side.last > T.sideRefract * k) {
        if (st.side.cnt === 0) { st.side.tCrossSong = tSong; st.side.tCrossNow = tNow; }
        st.side.cnt++;
        if (st.side.cnt >= T.sideConfirm) {
          st.side.armed = false; st.side.cnt = 0; st.side.last = tNow;
          events.push({
            type: 'side', t: st.side.tCrossSong,
            latency: Math.max(0, tNow - st.side.tCrossNow), sides: sideSides,
          });
        }
      } else if (!sideHit) st.side.cnt = 0;
      if (maxOut < effSideIn()) st.side.armed = true;
    }

    /* ── 拍手：腕距峰谷震盪偵測 ──
       不用「絕對距離門檻＋要張開才重新武裝」（那會讓快速小幅連拍整串漏掉：
       手根本張不到 re-arm 的距離）。改成追蹤方向轉折，每偵測到一個谷底就
       用「這次合攏的擺幅」決定算不算一次拍手。 */
    if (dnRaw != null && actOn('clap')) {
      const dn = dnRaw;
      dbg.dn = dn;
      const C = st.clap;
      if (C.ext == null) { C.ext = dn; C.dir = 'down'; C.peak = dn; C.fallFrames = 1; }

      const fire = () => {
        C.last = tNow; C.fired = true;
        events.push({ type: 'clap', t: C.tExtSong, latency: Math.max(0, tNow - C.tExtNow) });
      };
      /* 次門檻擺幅：一次合攏週期結束就記一筆（不看門檻，理由同高舉）。
         C.logged 防止「谷底確認」與「貼住補觸發」兩條路徑重複記同一次。 */
      const logSwing = () => {
        const sw = C.peak - C.ext;
        /* ⚠️ 一定要加「谷底真的靠近了」這條（C.ext < clapClose）。
           少了它，舉手時雙手一起往內收也會產生一個很大的「擺幅」被記成拍手嘗試，
           上層的近失放寬就會被騙去調鬆拍手門檻。 */
        if (!C.logged && sw >= CLAP_ATT_MIN && C.ext < T.clapClose * sens) {
          C.logged = true;
          pushAttempt({ type: 'clap', t: C.tExtSong, swing: sw });
        }
      };

      /* 一次拍手必須「擺幅夠大」且「合攏持續夠久」。後者是關鍵：
         鏡頭雜訊也會製造假谷底，但那只存在單一幀，撐不過 clapMinFall。 */
      const validSwing = () => (C.peak - C.ext) > effClapSwing()
        && C.ext < T.clapClose * sens
        && C.fallFrames >= T.clapMinFall
        && tNow - C.last > T.clapRefract * k;

      if (C.dir === 'down') {
        if (dn <= C.ext) { C.ext = dn; C.tExtSong = tSong; C.tExtNow = tNow; C.fallFrames++; } // 持續逼近谷底
        else if (dn > C.ext + T.clapEps) {                                        // 開始回升＝谷底確認
          logSwing();
          if (!C.fired && validSwing()) fire();
          C.dir = 'up'; C.peak = dn; C.fired = false;
        }
        /* 拍完手貼著不張開：谷底永遠等不到回升，靠「夠近且停住」補觸發 */
        if (!C.fired && C.ext < T.clapTight * sens && tNow - C.tExtNow > T.clapHoldMs && validSwing()) { logSwing(); fire(); }
      } else {                                                                    // dir === 'up'
        if (dn >= C.peak) C.peak = dn;                                            // 追蹤張開的最高點
        else if (dn < C.peak - T.clapEps) {                                       // 開始下降＝進入下一次合攏
          C.dir = 'down'; C.ext = dn; C.tExtSong = tSong; C.tExtNow = tNow;
          C.fallFrames = 1; C.fired = false; C.logged = false;
        }
      }
      dbg.clapPhase = C.dir;
      dbg.clapSwing = C.peak - C.ext;
    }

    return { pose: P, drawPose: pr.draw, events, dbg };
  }

  return {
    update, reset,
    setSensitivity(v) { sens = Math.max(0.6, Math.min(1.6, v)); },
    getSensitivity() { return sens; },
    /* ⭐ v12 個人化門檻。傳部分欄位即可（{raise:0.6} 只調高舉）。
       值域 0～1：1＝原本的門檻，越小越容易觸發；實際還會被安全地板夾住。 */
    setScales(s = {}) {
      for (const kk of ['clap', 'raise', 'side'])
        if (typeof s[kk] === 'number' && isFinite(s[kk]))
          scales[kk] = Math.max(0.05, Math.min(1, s[kk]));
    },
    getScales() { return { ...scales }; },
    /* 目前實際生效的門檻（已含 scale、sens 與地板）——給 UI 畫判定線與上層做近失比較 */
    getEffective() {
      return {
        raiseUp: effRaiseUp(), raiseDown: effRaiseDown(),
        clapSwing: effClapSwing(), sideOut: effSideOut(), sideIn: effSideIn(),
      };
    },
    /* 動作遮罩：傳 ['clap','raise'] 就只判這兩個；傳 null 恢復全開 */
    setActions(list) { actMask = Array.isArray(list) ? new Set(list) : null; },
    getActions() { return actMask ? [...actMask] : null; },
    /* 最近完成的動作波形（含沒跨過門檻的），新的在後面 */
    getRecentAttempts() { return attempts.map(a => ({ ...a })); },
    /* 只清緩衝、不動濾波器與遲滯狀態。開打前用：倒數期間亂動留下的波形
       時間戳算的是別的時間軸，留著會干擾近失判斷。 */
    clearAttempts() { attempts = []; },
  };
}

/* ══════════════════════════════════════════════════════════════
   AutoFramer — 數位自動取景（v1，2026-07-27）

   為什麼要：每台筆電／外接鏡頭的視角差很多，長者又常坐得離鏡頭很遠，
   人在畫面裡只佔一小塊 → landmark 的像素解析度不足，手腕特別容易抖。
   這裡在「偵測之前」先把人所在的區域裁切出來、放大成 960 寬再餵給模型，
   同一張裁切影像也拿去當顯示背景，所以顯示與判定座標天生一致
   （detector.project 收到的 geo 就是裁切後的畫布尺寸）。

   設計取捨：
   ① 錨點只取軀幹（頭 0/7/8、肩 11/12、髖 23/24），**刻意不含手腕**。
      拍手／摸頭時手會大幅移動，若把手腕算進 bbox，取景框會跟著呼吸縮放，
      畫面一直晃、判定用的 S 也跟著飄。軀幹幾乎不動 → 框才穩。
   ①-b 但手不入 bbox ≠ 手可以被裁掉：改用固定的「假髖」下界（handRoom），
      外擴前先把框底拉到「肩線 + 1.6 肩寬」。少了這道保險，坐得近、髖部不在
      畫面裡的人會被裁成頭肩特寫 → 垂放的手與胸前拍手全出框、拍手偵測不到，
      而且人還「看得到」不會觸發回全幅 → 鎖死。副作用是放大倍率固定在
      肩寬約 15～17%（＝髖部有偵測到時本來就會有的倍率），順帶讓髖部
      visibility 忽有忽無時框不會忽大忽小。要退回規格原樣就把 handRoom 設 0。
   ② 鎖定與原影像相同的長寬比：這樣裁切影像放進畫布時，cover 映射的
      sc/ox/oy 與未裁切時完全同式，顯示與 detector 的座標換算不必改。
   ③ 死區＋慢速 lerp：寧可慢半拍，也不要框一直微調（會暈）。
   ④ 找不到人超過 lostMs 就退回全幅，且退回時用較快的係數並在接近時吸附。
      理由：裁切後模型只看得到裁切區，人若走出框就再也偵測不到（會鎖死），
      所以「回全幅」是恢復偵測能力的動作，不能像跟隨那樣慢慢磨。
   純數學、不碰 DOM，可在 node 直接測。
   ══════════════════════════════════════════════════════════════ */
export function createAutoFramer(cfg = {}) {
  const C = {
    padSide: 1.10,       // 左右各外擴幾個肩寬
    padTop: 0.90,        // 上方（留摸頭空間）
    padBottom: 0.60,     // 下方
    handRoom: 1.60,      // 框底至少要到「肩線＋這麼多肩寬」＝留給垂放的手（見①-b）
    shoulderRatio: 0.26, // 肩寬佔 crop 寬的目標比例（＝上半身約佔畫面六成）
    minWidth: 0.35,      // crop 寬下限（佔原影像寬），防過度放大
    lostMs: 1500,        // 找不到人多久之後才退回全幅
    deadCenter: 0.06,    // 死區：中心位移小於 crop 寬的這個比例就不動
    deadWidth: 0.10,     // 死區：寬度變化比
    lerp: 0.05,          // 一般跟隨速度
    lerpBack: 0.30,      // 退回全幅速度（見設計取捨④）
    snapBack: 0.02,      // 退回全幅時，差距小於原寬的這個比例就直接吸附
    ...cfg
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fullOf = (vw, vh) => ({ x: 0, y: 0, w: vw, h: vh });

  let crop = null;       // {x,y,w,h}，單位＝原影像像素；null＝尚未初始化（視為全幅）
  let lastSeen = 0;
  let enabled = true;

  /* 由錨點算出「這一刻理想的取景框」；缺兩肩就回 null（＝視為沒看到人） */
  function targetFor(anchors, vw, vh) {
    let L = null, R = null;
    for (const a of anchors) { if (a.i === 11) L = a; else if (a.i === 12) R = a; }
    if (!L || !R) return null;

    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const a of anchors) {
      const px = a.x * vw, py = a.y * vh;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    const S = Math.max(20, Math.abs(L.x - R.x) * vw);   // 肩寬（像素），下限防除零
    /* 假髖下界：沒偵測到髖（坐得近、髖在畫面外）時，仍保證框底涵蓋垂放的手。
       有真髖且位置更低時就用真髖，所以有／沒有髖錨點算出來的框幾乎一樣。 */
    const shY = (L.y + R.y) / 2 * vh;
    y1 = Math.max(y1, shY + C.handRoom * S);
    x0 -= C.padSide * S; x1 += C.padSide * S;
    y0 -= C.padTop * S;  y1 += C.padBottom * S;

    const AR = vw / vh;
    /* 取「包得下外擴框」「肩寬只佔 26%」「不小於下限」三者中最大的寬度：
       所以放大程度永遠是最保守的那個，不會為了追 26% 而把人切掉。 */
    let w = Math.max(x1 - x0, (y1 - y0) * AR, S / C.shoulderRatio, C.minWidth * vw);
    w = Math.min(w, vw);
    const h = w / AR;                                    // 鎖定原影像比例
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    /* 貼邊時只平移、不縮小（縮小會讓人忽大忽小） */
    return { x: clamp(cx - w / 2, 0, vw - w), y: clamp(cy - h / 2, 0, vh - h), w, h };
  }

  /* anchors：全域 normalized 座標，元素為 {i, x, y}（i＝landmark 索引） */
  function update(anchors, vw, vh, tNow) {
    if (!vw || !vh) return;
    let target = null, back = false;
    const t = (anchors && anchors.length >= 2) ? targetFor(anchors, vw, vh) : null;
    if (t) { lastSeen = tNow; target = t; }
    else {
      if (tNow - lastSeen <= C.lostMs) return;           // 短暫遺失：維持現框，別亂跳
      target = fullOf(vw, vh); back = true;
    }
    if (!crop) { crop = target; return; }                // 首次直接就位，不 lerp

    const dC = Math.hypot((target.x + target.w / 2) - (crop.x + crop.w / 2),
                          (target.y + target.h / 2) - (crop.y + crop.h / 2));
    const dW = Math.abs(target.w - crop.w) / crop.w;
    if (!back && dC < C.deadCenter * crop.w && dW < C.deadWidth) return;   // 死區

    const k = back ? C.lerpBack : C.lerp;
    let x = crop.x + (target.x - crop.x) * k;
    let y = crop.y + (target.y - crop.y) * k;
    let w = crop.w + (target.w - crop.w) * k;
    let h = crop.h + (target.h - crop.h) * k;
    if (back && Math.abs(target.w - w) < C.snapBack * vw) { x = target.x; y = target.y; w = target.w; h = target.h; }
    w = clamp(w, 1, vw);
    h = w * vh / vw;                                     // 重算而不用 lerp 值：杜絕浮點漂移
    crop = { x: clamp(x, 0, vw - w), y: clamp(y, 0, vh - h), w, h };
  }

  function getCrop(vw, vh) {
    if (!enabled || !crop || !vw || !vh) return fullOf(vw || 0, vh || 0);
    const w = Math.min(crop.w, vw), h = Math.min(crop.h, vh);
    return { x: clamp(crop.x, 0, vw - w), y: clamp(crop.y, 0, vh - h), w, h };
  }

  return {
    update, getCrop,
    reset() { crop = null; lastSeen = 0; },
    setEnabled(b) { enabled = !!b; },
    isEnabled() { return enabled; },
  };
}

/* 模型載入（full 精度明顯優於 lite，手腕尤其；失敗自動退回） */
export async function loadPose(quality = 'full') {
  const { PoseLandmarker, FilesetResolver } =
    await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  const url = q => `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${q}/float16/latest/pose_landmarker_${q}.task`;
  const opt = (q, d) => ({
    baseOptions: { modelAssetPath: url(q), delegate: d },
    runningMode: "VIDEO", numPoses: 1,
    minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5
  });
  const tries = quality === 'full'
    ? [['full', 'GPU'], ['full', 'CPU'], ['lite', 'GPU'], ['lite', 'CPU']]
    : [['lite', 'GPU'], ['lite', 'CPU']];
  let lastErr = null;
  for (const [q, d] of tries) {
    try { const m = await PoseLandmarker.createFromOptions(vision, opt(q, d)); return { model: m, quality: q, delegate: d }; }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}
