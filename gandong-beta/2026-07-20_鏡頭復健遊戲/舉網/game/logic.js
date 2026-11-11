/* 舉網規則：純邏輯，不碰畫面。一起舉魚多、一個人舉魚少；老闆 2026-11-06 定案。
   v3（2026-11-11）：參考原作 30 秒＋總分評等，每回合有辦桌目標（一～三星，沒到也不算失敗）、
   連續 3 網一起舉觸發金魚潮、普通／困難一回合 30 秒、簡單補魚間隔 6→3 秒、可提前結束。
   秒數、條數、目標、驚喜機率都是暫訂，未經真人實測。 */

export const DIFF = {
  easy:   {name:'簡單', thr:.30, togetherMs:3000, nets:8,    roundMs:null,  periodMs:null, gapMs:3000, dwellMs:10000, speed:3.0, voice:true,  goal:[30,45,60]},
  normal: {name:'普通', thr:.50, togetherMs:2000, nets:null, roundMs:30000, periodMs:3500, dwellMs:3000,  speed:3.2, voice:true,  goal:[35,60,80]},
  hard:   {name:'困難', thr:.70, togetherMs:1000, nets:null, roundMs:30000, periodMs:2600, dwellMs:2200,  speed:4.0, voice:false, goal:[50,80,105]},
};
/* 辦桌三道菜：每回合一道。星數只看這一回合撈到幾條魚（金魚、大魚都算一條） */
export const DISHES = ['薑絲魚湯','五柳枝','紅燒全魚'];
export const COMBO_RUSH = 3;     // 連續一起舉幾網觸發金魚潮
export const ROUNDS = 3;
export const POINTS = {fish:1, gold:3, big:5, crab:2, turtle:0, slipper:0};
const LOW_RATIO = .55;           // 手要放到門檻的 55% 以下才算放下
const MAX_EASY_ROUND_MS = 240000;// 簡單沒有倒數，只防沒人玩時卡住

const FISHY = {fish:1,gold:1,big:1};
function newPlayer(){ return {st:'low', raiseUsed:false, peak:0, lifts:0, heights:[], hands:{L:0,R:0}, curHand:null, upAt:-1e9}; }

export function createGame(opt={}){
  const cfg = {...DIFF[opt.diff||'easy'], ...(opt.over||{})};
  const rnd = opt.rng || Math.random;
  const geo = {sStart:opt.sStart??0, sZone:opt.sZone??30, sEnd:opt.sEnd??60};
  const g = {
    cfg, geo, t:0, round:0, roundT:0, active:false, netsDone:0, schools:[], nextId:1, window:null,
    a:newPlayer(), b:newPlayer(), events:[], combo:0, rushNext:false, roundFish:0, early:false,
    stats:{together:0, single:{a:0,b:0}, passed:0, emptyLifts:0, gaps:[], counts:{fish:0,gold:0,big:0,crab:0,turtle:0,slipper:0}, score:0, nets:0, perRound:[], rushes:0, bestCombo:0},
    lastSpawn:-1e9, spawned:0,
  };
  const emit = (type,data={}) => g.events.push({type,...data});
  const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));

  /* 魚從畫面外游到網子要多久；加碼要看「到網子的時候」是不是最後 10 秒 */
  const travelMs = ()=>(geo.sZone-geo.sStart)/cfg.speed*1000;
  function spawn(){
    const lateEasy = cfg.nets!=null && g.spawned>=cfg.nets-2;
    const lateTimed = cfg.roundMs!=null && g.firstIn && g.roundT+travelMs()>=cfg.roundMs-10000;
    const bonus = lateEasy||lateTimed;
    const rush = g.rushNext; g.rushNext=false;
    const s = {id:g.nextId++, s:geo.sStart, state:'swim', zoneT:0, near:false, bonus, rush, size:rush?11:bonus?12:8, gold:rush?11:bonus?2:(rnd()<.5?1:0)};
    g.schools.push(s); g.spawned++; g.lastSpawn=g.t; emit('spawn',{school:s}); if(rush) emit('rushSpawn',{school:s}); return s;
  }
  const zoneSchool = ()=>g.schools.find(s=>s.state==='zone');

  /* 這一網撈到什麼：一起舉才有機會滿網和驚喜 */
  function rollItems(kind, school){
    const items=[];
    if(kind==='together'){
      const n = school.rush?ri(9,11):school.bonus?ri(10,12):ri(6,8);
      const goldN = Math.min(n,school.gold);   // 游過來時看得到金魚，只有一起舉才撈得到；金魚潮整網都是金魚
      for(let i=0;i<n;i++) items.push({kind:i<goldN?'gold':'fish'});
      const r=rnd(), ex = school.bonus?(r<.55?'big':'crab') : (r<.14?'big':r<.27?'crab':r<.36?'turtle':r<.45?'slipper':null);
      if(ex) items.push({kind:ex});
    }else{
      const n = ri(1,2);
      for(let i=0;i<n;i++) items.push({kind:'fish'});
      const r=rnd(); if(r<.06) items.push({kind:'slipper'}); else if(r<.12) items.push({kind:'crab'});
    }
    return items;
  }
  function resolve(kind, first, gapMs){
    const school=g.window?g.window.school:zoneSchool(); g.window=null;
    if(!school||school.state!=='zone') return;
    school.state='caught';
    const items=rollItems(kind,school);
    const before=g.roundFish;
    for(const it of items){ g.stats.counts[it.kind]++; g.stats.score+=POINTS[it.kind]; g.roundFish+=FISHY[it.kind]||0; }
    g.stats.nets++; g.netsDone++;
    if(kind==='together'){ g.stats.together++; if(gapMs!=null) g.stats.gaps.push(gapMs);
      g.combo++; g.stats.bestCombo=Math.max(g.stats.bestCombo,g.combo);
      if(g.combo>=COMBO_RUSH){ g.combo=0; g.rushNext=true; g.stats.rushes++; } }
    else { g.stats.single[first]++; g.combo=0; }
    emit('scoop',{kind,first,items,school,gapMs,bonus:school.bonus,rush:!!school.rush,combo:g.combo,rushNext:g.rushNext});
    /* 跨過星星線：一星＝過關、上菜 */
    const G=g.goal();
    for(let k=0;k<3;k++) if(before<G[k]&&g.roundFish>=G[k]) emit('star',{n:k+1,round:g.round,fish:g.roundFish});
  }
  /* 一次舉手只能用一次；舉早了撐著等也算，魚進網就生效 */
  function useRaise(k){
    const P=g[k], school=zoneSchool();
    if(!school||P.raiseUsed) return false;
    P.raiseUsed=true;
    if(g.window){
      if(g.window.first!==k) resolve('together',k,g.t-g.window.t0);
      return true;
    }
    g.window={first:k,t0:g.t,school}; emit('liftFirst',{first:k,school});
    return true;
  }
  /* 每個位置的舉手門檻：thrBy 給了就用（評估層：建檔肩痛的那一側最多到簡單難度），沒給就照難度 */
  g.thrOf = k=>(cfg.thrBy&&cfg.thrBy[k]!=null)?cfg.thrBy[k]:cfg.thr;
  function stepPlayer(k,inp,dt){
    const P=g[k]; if(!inp||!inp.valid) return;
    const s=inp.s01, thr=g.thrOf(k);
    P.peak=Math.max(P.peak,s);
    if(P.st==='low'&&s>thr){
      P.st='high'; P.raiseUsed=false; P.peak=s; P.lifts++; P.upAt=g.t; P.curHand=inp.hand||null;
      if(inp.hand) P.hands[inp.hand]++;
      emit('raise',{who:k});
      if(!useRaise(k)){ if(!zoneSchool()) g.stats.emptyLifts++; }
    }else if(P.st==='high'&&s<thr*LOW_RATIO){
      P.st='low'; P.heights.push(+P.peak.toFixed(3)); P.peak=0; emit('lower',{who:k});
    }else if(P.st==='high'&&!P.raiseUsed){
      useRaise(k);
    }
  }

  /* 這一回合的星星線；簡單調「每回合幾網」時按比例換算 */
  g.goal = ()=>{ const G=cfg.goal||[25,40,55]; if(cfg.nets!=null){ const k=cfg.nets/8; return G.map(x=>Math.max(1,Math.round(x*k))); } return G.slice(); };
  g.starsOf = n=>{ const G=g.goal(); return n>=G[2]?3:n>=G[1]?2:n>=G[0]?1:0; };
  g.startRound = ()=>{
    g.round++; g.roundT=0; g.firstIn=false; g.active=true; g.netsDone=0; g.schools.length=0; g.window=null; g.spawned=0; g.lastSpawn=-1e9; g.roundFish=0; g.combo=0; g.rushNext=false;
    g.a.st=g.b.st='low'; g.a.raiseUsed=g.b.raiseUsed=false;
    g._roundStartScore=g.stats.score; g._roundStartNets=g.stats.nets;
    spawn(); emit('roundStart',{round:g.round});
  };
  function endRound(){
    g.active=false;
    g.stats.perRound.push({round:g.round, dish:DISHES[g.round-1], nets:g.stats.nets-g._roundStartNets, score:g.stats.score-g._roundStartScore, fish:g.roundFish, goal:g.goal(), stars:g.starsOf(g.roundFish), partial:g.early});
    emit('roundEnd',{round:g.round, fish:g.roundFish, stars:g.starsOf(g.roundFish), early:g.early});
  }
  /* 提前結束：這一回合照目前撈到的算，之後的回合不玩；成績與動作報告都保留 */
  g.finishEarly = ()=>{ if(g.early) return; g.early=true; g.window=null; if(g.active) endRound(); };
  g.remainMs = ()=>cfg.roundMs==null?null:Math.max(0,cfg.roundMs-g.roundT);
  g.isOver = ()=>(g.early||g.round>=ROUNDS) && !g.active;

  g.tick = (dtMs, inputs={})=>{
    g.events.length=0;
    if(!g.active) return g.events;
    g.t+=dtMs; if(cfg.roundMs==null||g.firstIn) g.roundT+=dtMs;
    stepPlayer('a',inputs.a,dtMs); stepPlayer('b',inputs.b,dtMs);

    /* 第二個人沒跟上：時間到照一個人舉結算，不催不罰 */
    if(g.window && g.t-g.window.t0>=cfg.togetherMs) resolve('single',g.window.first,null);

    const hold = cfg.nets!=null;  // 簡單：前一波還在，下一波先在遠一點等
    const dt=dtMs/1000, active=zoneSchool();
    for(const s of g.schools){
      if(s.state==='swim'){
        const ahead=g.schools.some(o=>o!==s&&o.id<s.id&&(o.state==='zone'||(o.state==='swim')));
        const limit=hold&&ahead?geo.sZone-7:geo.sZone;
        s.s=Math.min(limit,s.s+cfg.speed*dt);
        if(!s.near&&s.s>=geo.sZone-cfg.speed*1.5&&!(hold&&ahead)){ s.near=true; emit('fishNear',{school:s}); }
        if(s.s>=geo.sZone&&!(cfg.periodMs==null&&active)){ s.state='zone'; s.zoneT=0; g.firstIn=true; emit('fishIn',{school:s}); }
      }else if(s.state==='zone'){
        s.zoneT+=dtMs;
        if(s.zoneT>=cfg.dwellMs&&!(g.window&&g.window.school===s)){ s.state='passed'; g.stats.passed++; emit('fishPass',{school:s}); }
      }else{
        s.s+=cfg.speed*1.3*dt;
      }
    }
    g.schools=g.schools.filter(s=>s.s<geo.sEnd);

    /* 補魚 */
    if(cfg.nets!=null){
      const alive=g.schools.filter(s=>s.state==='swim'||s.state==='zone').length;
      if(g.netsDone+alive<cfg.nets&&alive<2&&g.t-g.lastSpawn>=(cfg.gapMs||6000)) spawn();
      if(g.netsDone>=cfg.nets) endRound();
      else if(g.roundT>=MAX_EASY_ROUND_MS) endRound();
    }else{
      const arrive=g.roundT+travelMs();if(arrive<cfg.roundMs&&g.t-g.lastSpawn>=(g.firstIn&&arrive>=cfg.roundMs-10000?cfg.periodMs*.75:cfg.periodMs)) spawn();
      if(g.roundT>=cfg.roundMs&&!g.window) endRound();
    }
    return g.events;
  };

  g.report = ()=>{
    const p=k=>{const P=g[k],h=P.heights;return{lifts:P.lifts,avgHeight:h.length?h.reduce((a,b)=>a+b,0)/h.length:null,maxHeight:h.length?Math.max(...h):null,hands:{...P.hands},singleNets:g.stats.single[k]};};
    const G=g.stats.gaps;
    return{left:p('a'),right:p('b'),together:g.stats.together,nets:g.stats.nets,togetherRatio:g.stats.nets?g.stats.together/g.stats.nets:0,avgGapMs:G.length?G.reduce((a,b)=>a+b,0)/G.length:null,passed:g.stats.passed,emptyLifts:g.stats.emptyLifts,counts:{...g.stats.counts},score:g.stats.score,fishTotal:g.stats.counts.fish+g.stats.counts.gold+g.stats.counts.big,perRound:g.stats.perRound.slice(),diff:cfg.name,early:g.early,rushes:g.stats.rushes,bestCombo:g.stats.bestCombo,stars:g.stats.perRound.reduce((a,r)=>a+r.stars,0)};
  };
  return g;
}
