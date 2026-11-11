/* 趕走山豬 2：守住阿公的田（可玩樣張 v0.2）
   規格：../樣張規格_v0.1.md、../樣張規格_v0.2.md（v0.2：山豬從草叢跑進田、時段色調、三波、只算當天的收成、評估層）
   遊戲邏輯一律用「遊戲時鐘 S.T（秒）」推進，不假設每秒 60 幀；
   window.__dbg.advance(秒) 在示範模式下可以不靠畫面更新直接推進。 */
import * as D from './draw.js';
import * as TR from './track.js';
import { createAssess } from './boar-assess.js';

const Q=new URLSearchParams(location.search);
const DEMO=Q.has('demo'), MUTE=Q.has('mute');
const $=id=>document.getElementById(id);
const cv=$('cv'), ctx=cv.getContext('2d');
const F=D.FONT;

/* ---------------- 畫布（沿用舊版：尺寸變動才重設） ---------------- */
let CW=800,CH=500,_rw=0,_rh=0,_rdpr=0,_sizeDirty=true;
function resize(){
  if(!_sizeDirty) return; _sizeDirty=false;
  const dpr=Math.min(window.devicePixelRatio||1,2), w=cv.clientWidth||innerWidth, h=cv.clientHeight||innerHeight;
  CW=w; CH=h;
  if(w===_rw&&h===_rh&&dpr===_rdpr) return;
  _rw=w;_rh=h;_rdpr=dpr; cv.width=w*dpr; cv.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',()=>{_sizeDirty=true;});
if(window.ResizeObserver) new ResizeObserver(()=>{_sizeDirty=true;}).observe(cv);

/* ---------------- 設定 ---------------- */
const DIFF={
  easy  :{name:'輕鬆',rustle:0.6,runT:1.6,rootT:2.2,dur:30,sizeFrac:0.140,dwell:2.6,ratPause:[1.0,1.4],perch:5,flock:3,maxGroups:2,fierce:false,bells:6, ratSpeed:0.12,gap:1.7},
  normal:{name:'普通',rustle:0.5,runT:1.3,rootT:1.6,dur:40,sizeFrac:0.105,dwell:2.2,ratPause:[0.6,1.0],perch:4,flock:4,maxGroups:3,fierce:true, bells:8, ratSpeed:0.16,gap:1.35},
  hard  :{name:'挑戰',rustle:0.4,runT:1.0,rootT:1.0,dur:45,sizeFrac:0.086,dwell:1.5,ratPause:[0.3,0.6],perch:3,flock:5,maxGroups:4,fierce:true, bells:10,ratSpeed:0.20,gap:1.05}
};
const PTS={boar:10,fierce:30,rat:10,sparrow:5,flock:10,early:5};
const cfg={ side:'none', diff:'normal', sound:!MUTE, gain:1.12 };
const duelDiff=['normal','normal'];
const DUEL_DUR=60;
const LS_KEY='boar2_story';
const ZH=['零','一','二','三','四','五','六','七','八','九','十'];

const DAYS=[
  {n:1, animals:['boar'], scare:false, icon:'🐗', title:'山豬來拱地瓜',
   lines:['你來得正好，昨晚山豬又把地瓜田拱得亂七八糟。','這禮拜庄裡要謝平安，阿公想帶地瓜和新米去拜土地公。','今天幫阿公顧田。山豬一冒頭，伸手把牠趕回去。'],
   practice:'boar', tip:'伸手碰一下山豬，把牠趕回去', preview:'明天預告：田埂的老鼠要來偷籃子裡的地瓜。', risk:['potato']},
  {n:2, animals:['boar','rat'], scare:false, icon:'🐭', title:'田埂的老鼠',
   lines:['山豬怕你了。換田埂的老鼠來偷籃子裡的地瓜。','牠個子小、跑得快。手放低，碰到牠就會跑。'],
   practice:'rat', tip:'手放低，碰一下田埂上的老鼠', preview:'明天預告：麻雀要來吃門口埕的稻穀，阿公紮了一個稻草人。', risk:['potato','small']},
  {n:3, animals:['boar','rat','sparrow'], scare:true, icon:'🐦', title:'麻雀與稻草人',
   lines:['稻子曬在門口埕，麻雀聞到就來了。','麻雀停在竹竿上，你手舉高揮過去。','阿公紮了一個稻草人。你趕得多，它就會醒來幫你。'],
   practice:'sparrow', tip:'手舉高，碰一下竹竿上的麻雀', preview:'第 4 天：公雞阿啼登場（製作中）', risk:['potato','small','rice']},
  {n:4, locked:true, icon:'🐓', title:'公雞阿啼'},
  {n:5, locked:true, icon:'🏮', title:'謝平安'}
];
const GP_LINES={3:'保得真好！地瓜和稻穀都在，謝平安有得拜了。',2:'不錯喔，大部分都顧住了。明天再來幫阿公。',1:'沒關係，阿公慢慢種。你有來幫忙，阿公就很歡喜。'};

/* ---------------- 音效 ---------------- */
let AE=null;
function ensureAudio(){ if(MUTE||AE) return; try{ AE=TR.makeAudio(); AE.setMuted(!cfg.sound); }catch(e){ AE=null; } }
function sfx(name,...a){ if(MUTE||!cfg.sound||!AE) return; try{ AE[name](...a); }catch(e){} }
function music(on){ if(MUTE||!AE) return; try{ on&&cfg.sound?AE.start():AE.stop(); }catch(e){} }

/* ---------------- 狀態 ---------------- */
const S={ screen:'title', mode:'story', day:1, T:0, fields:[], sub:null, countEnd:0, playStart:0, dur:40,
  pops:[], parts:[], after:[], banner:null, late:false, ended:false, nextSpawn:0, schedule:null, schedIdx:0,
  lastFlockEnd:-99, practiceAnimal:null, calib:null, calibSub:null, capReadyEnd:0, capEnd:0, capBox:null,
  ready:[0,0], readyOk:[false,false], readyStep:0, hands:[], prevHands:{}, idSeq:1, result:null };
let lastId=()=>S.idSeq++;

/* ---------------- 田的配置 ---------------- */
function makeField(i,x0,x1,o){
  const d=DIFF[o.diff];
  return { i, x0, x1, mirror:!!o.mirror, diff:o.diff, D:d, color:o.color||null,
    max:{potato:o.potato,small:o.small,rice:o.rice},
    potato:Array(o.potato).fill(true), small:o.small, rice:Array(o.rice).fill(true), rustle:Array(o.potato).fill(0),
    risk:o.risk||['potato','small','rice'], animals:[], score:0, chased:0, combo:0, maxCombo:0, rts:[], lost:{potato:0,small:0,rice:0},
    hasScare:!!o.scare, scare:{bells:0,max:d.bells,hold:0,armL:0.2,armR:0.2,animEnd:-1,block:-1,full:false,fullT:0},
    animalsAllowed:o.animals||['boar','rat','sparrow'] };
}
function bsize(f){ const m=Math.min(CW,CH)||600, phone=(CH<520||CW<820)?0.85:1;
  const duel=(S.mode==='duel'&&S.fields.length===2)?0.7:1;      // 雙人每邊只有半個畫面寬，目標等比例縮小，洞口才不會蓋掉整塊田
  return Math.max(18,m*f.D.sizeFrac*phone*duel); }
/* 版面：一律換算成底圖（1536×1024，cover）上的位置，三層對齊底圖的竹竿／門口埕、地瓜田、田埂路 */
function L(f){
  const tf=D.coverTf(CW,CH), IY=v=>tf.oy+tf.h*v, IX=u=>tf.ox+tf.w*u;
  const fw=f.x1-f.x0, U=u=>f.mirror?1-u:u, X=u=>f.x0+fw*U(u);
  const duel=S.mode==='duel'&&S.fields.length===2;
  const clampX=x=>Math.max(f.x0,Math.min(f.x1,x));
  const np=f.max.potato, nr=f.max.rice;
  const pot=[]; if(np===8){ for(let r=0;r<2;r++)for(let c=0;c<4;c++) pot.push({x:X([0.14,0.37,0.60,0.83][c]+(r?0.04:0)),y:IY(r?0.635:0.525)}); }
  else { [[0.2,0.525],[0.5,0.525],[0.8,0.525],[0.35,0.635],[0.65,0.635]].slice(0,np).forEach(p=>pot.push({x:X(p[0]),y:IY(p[1])})); }
  let pa,pb,ra,rb,scx;
  if(duel){ pa=X(0.30); pb=X(0.90); ra=X(0.36); rb=X(0.84); scx=X(0.12); }
  else { pa=clampX(IX(0.50)); pb=clampX(IX(0.93)); ra=clampX(IX(0.555)); rb=clampX(IX(0.905)); scx=clampX(IX(0.44)); }
  const rice=[]; for(let i=0;i<nr;i++) rice.push({x:nr===1?(ra+rb)/2:ra+(rb-ra)*i/(nr-1),y:IY(0.418)});
  const sp=nr>1?Math.abs(rb-ra)/(nr-1):fw*0.3;
  // 手機橫向時竹竿往下讓，麻雀才不會躲在上方資訊列底下
  return { fw, X, IY, pot, potW:Math.min(fw*0.11,tf.h*0.085), rice, riceW:Math.min(sp*0.92,tf.h*0.085), riceMat:duel,
    pole:{x0:Math.min(pa,pb),x1:Math.max(pa,pb),y:S.mode==='story'&&AS.noPush()?IY(0.36):Math.max(IY(0.215),(CH<520?50:72)+bsize(f)*1.1)},   /* 舉手會痛：竹竿降到不用舉過肩 */ mat:{x:Math.min(ra,rb)-sp*0.55,w:Math.abs(rb-ra)+sp*1.1,y:IY(0.385),h:IY(0.425)-IY(0.385)},
    sc:{x:scx,base:IY(0.425),h:tf.h*0.22},
    boarY:[IY(0.485),IY(0.60)],
    entries:(duel?[{x:X(0.28),y:IY(0.445),bush:1},{x:X(0.72),y:IY(0.445),bush:1},{x:f.mirror?f.x1+bsize(f)*2:f.x0-bsize(f)*2,y:IY(0.56),edge:f.mirror?1:-1}]
      :[{x:clampX(IX(0.30)),y:IY(0.445),bush:1},{x:clampX(IX(0.46)),y:IY(0.445),bush:1},{x:clampX(IX(0.60)),y:IY(0.445),bush:1},
        {x:f.x0-bsize(f)*2,y:IY(0.56),edge:-1},{x:f.x1+bsize(f)*2,y:IY(0.56),edge:1}]),
    depth:y=>0.5+0.5*Math.max(0,Math.min(1,(y-IY(0.43))/(IY(0.62)-IY(0.43)))),
    path:{x0:f.x0,x1:f.x1,y0:IY(0.71),y1:IY(0.79)}, holes:{'-1':f.x0+fw*0.06,'1':f.x1-fw*0.06}, holeY:IY(0.722),
    basket:{x:f.x0+fw*0.5,y:IY(0.785),w:Math.min(fw*0.14,tf.h*0.12)}, ratY:IY(0.77) };
}
/* v0.2：收成只算當天會被偷的（第 1 天只有地瓜 8、第 2 天 14、第 3 天 20）；竹籃、稻穀照樣畫，只是不計 */
const HAVE={potato:f=>f.potato.filter(Boolean).length, small:f=>Math.max(0,f.small), rice:f=>f.rice.filter(Boolean).length};
function harvest(f){ return f.risk.reduce((s,k)=>s+HAVE[k](f),0); }
function harvestMax(f){ return f.risk.reduce((s,k)=>s+f.max[k],0); }
const DAY_MAX={1:8,2:14,3:20}, WEEK_MAX=42;

/* ---------------- 出怪 ---------------- */
/* 山豬 v0.2：田邊草叢搖 → 衝出來沿曲線跑到一顆地瓜旁 → 低頭拱土 → 叼走跑回草叢。
   狀態：rustle（草叢搖，還看不到）、run、root、steal（剛叼起的前 0.5 秒還能趕）、flee、gone */
function boarPath(a,x2,y2,curve){
  const p0={x:a.x,y:a.y}, d=Math.hypot(x2-p0.x,y2-p0.y);
  const p1={x:(p0.x+x2)/2,y:(p0.y+y2)/2-d*curve};                // 控制點 x 在正中間：x 方向單調，不會倒退滑
  const pts=[p0], cum=[0];
  for(let i=1;i<=24;i++){ const u=i/24, q={x:(1-u)*(1-u)*p0.x+2*(1-u)*u*p1.x+u*u*x2,y:(1-u)*(1-u)*p0.y+2*(1-u)*u*p1.y+u*u*y2};
    cum.push(cum[i-1]+Math.hypot(q.x-pts[i-1].x,q.y-pts[i-1].y)); pts.push(q); }
  a.path={pts,cum,len:cum[24]}; a.dist=0; a.v=0;
}
function pathAt(P,d){ d=Math.max(0,Math.min(P.len,d)); let i=1; while(i<24&&P.cum[i]<d) i++;
  const k=(d-P.cum[i-1])/Math.max(1e-6,P.cum[i]-P.cum[i-1]); return {x:P.pts[i-1].x+(P.pts[i].x-P.pts[i-1].x)*k,y:P.pts[i-1].y+(P.pts[i].y-P.pts[i-1].y)*k}; }
function spawnBoar(f,o={}){
  const l=L(f), r=bsize(f), fierce=!!o.fierce;
  const taken=new Set(f.animals.filter(x=>x.type==='boar'&&x.target!=null).map(x=>x.target));
  let idx=f.potato.map((h,i)=>h&&!taken.has(i)?i:-1).filter(i=>i>=0);
  if(!idx.length) idx=f.potato.map((h,i)=>i).filter(i=>!taken.has(i));
  if(!idx.length) idx=f.potato.map((h,i)=>i);
  let target;
  if(o.practice) target=idx.reduce((b,i)=>Math.abs(l.pot[i].x-(f.x0+f.x1)/2)<Math.abs(l.pot[b].x-(f.x0+f.x1)/2)?i:b,idx[0]);
  else if(o.u!=null){ const gx=l.X(o.u); target=idx.reduce((b,i)=>Math.abs(l.pot[i].x-gx)<Math.abs(l.pot[b].x-gx)?i:b,idx[0]); }
  else { let pool=idx; const mid=(f.x0+f.x1)/2;                   // 沿用左右手偏向：選單手時 72% 去那一邊的地瓜
    if(cfg.side!=='none'&&S.mode==='story'){ const left=(Math.random()<0.72)===(cfg.side==='left'); const sub=idx.filter(i=>(l.pot[i].x<mid)===left); if(sub.length) pool=sub; }
    target=pool[(Math.random()*pool.length)|0]; }
  const P=l.pot[target];
  // 入口：離目標較近的兩個之一；但入口要在地瓜的側邊夠遠，山豬才會「頭朝前」跑到地瓜旁邊（不然會倒退滑）
  const off=r*0.95*l.depth(P.y)*1.1;
  let ents=l.entries.map((e,k)=>({e,k,d:Math.hypot(e.x-P.x,e.y-P.y)})).sort((a,b)=>a.d-b.d);
  const side=ents.filter(c=>Math.abs(c.e.x-P.x)>=off); if(side.length) ents=side;
  const pickSecond=o.v!=null?o.v>=0.5:Math.random()<0.5, ent=ents[Math.min(ents.length-1,pickSecond?1:0)].e;
  const face=Math.sign(P.x-ent.x)||1;
  const a={type:'boar',id:lastId(),kind:fierce?'fierce':'boar',r,ent,target,face,x:ent.x,y:ent.y,st:'rustle',t0:S.T,born:S.T,
    stand:{x:P.x-face*r*0.95*l.depth(P.y),y:P.y+r*0.12},bob:0,tilt:0,phase:0,hop:0,practice:!!o.practice,
    rustle:f.D.rustle,runT:f.D.runT/(fierce?1.3:1),rootT:o.practice?1e9:f.D.rootT*(fierce?0.7:1),alpha:1};
  f.animals.push(a); sfx('grunt'); logSpawn(a,'mid',a.stand.x); return a;
}
function spawnRat(f,o={}){
  const l=L(f); let hole=o.hole;
  if(hole==null){ hole=Math.random()<0.5?-1:1;
    if(cfg.side!=='none'&&S.mode==='story') hole=(Math.random()<0.72)===(cfg.side==='left')?-1:1; }
  if(o.practice) hole=-1;
  const s=bsize(f)*1.35, hx=l.holes[hole];
  const a={type:'rat',id:lastId(),hole,x:hx,y:l.holeY,s,dir:-hole,face:-hole,v:0,st:'peek',t0:S.T,born:S.T,
    segEnd:hx,carry:false,phase:0,bob:0,sniff:0,practice:!!o.practice,stops:0,alpha:1};
  f.animals.push(a); sfx('squeak'); logSpawn(a,'low',hx); return a;
}
function spawnFlock(f,o={}){
  const l=L(f), n=o.practice?1:f.D.flock, len=l.pole.x1-l.pole.x0;
  const s=Math.min(bsize(f)*1.15,len/n*0.66);
  const fromLeft=f.mirror?false:(S.mode==='duel'?true:Math.random()<0.5);
  const ex=fromLeft?f.x0-s:f.x1+s;
  const birds=[];
  for(let i=0;i<n;i++){
    const sx=l.pole.x0+len*(n===1?0.5:(0.08+0.84*i/(n-1)));
    birds.push({id:lastId(),x:ex,y:-CH*0.08,st:'wait',slot:sx,path:null,flap:Math.random()*6,face:fromLeft?1:-1,hop:0,hopT:S.T+1+Math.random()*2,delay:0.75+i*0.16,s});
  }
  const fl={type:'flock',id:lastId(),birds,st:'shadow',t0:S.T,born:S.T,practice:!!o.practice,lost:false,chased:0,fromLeft,pile:-1,bonusDone:false};
  f.animals.push(fl); sfx('chirp'); for(const b of birds){ b.type='sparrow'; logSpawn(b,'high',b.slot); } return fl;
}
function groups(f){ return f.animals.filter(a=>a.st!=='dead').length; }
/* v0.2：一天分三波，波與波之間 2 秒沒有新動物；最後一波前說「最後一波！」 */
const WAVE_GAP=2;
function waveOf(el,dur){ const w=(dur-2*WAVE_GAP)/3; if(el<w) return 1; if(el<w+WAVE_GAP) return 0; if(el<2*w+WAVE_GAP) return 2; if(el<2*w+2*WAVE_GAP) return 0; return 3; }
function storySpawn(f){
  if(S.T<S.nextSpawn) return;
  if(waveOf(S.T-S.playStart,S.dur)===0) return;
  const d=f.D; if(groups(f)>=d.maxGroups){ S.nextSpawn=S.T+0.3; return; }
  const day=DAYS[S.day-1]; const W={boar:0.45,rat:0.3,sparrow:0.25};
  let pool=day.animals.filter(t=>{
    if(t==='sparrow') return !f.animals.some(a=>a.type==='flock')&&S.T-S.lastFlockEnd>2.5&&S.T>f.scare.block;
    if(t==='rat') return f.animals.filter(a=>a.type==='rat').length<2;
    return true; });
  if(!pool.length){ S.nextSpawn=S.T+0.4; return; }
  let tot=pool.reduce((s,t)=>s+W[t],0), r=Math.random()*tot, type=pool[0];
  for(const t of pool){ r-=W[t]; if(r<=0){type=t;break;} }
  if(type==='boar') spawnBoar(f,{fierce:d.fierce&&Math.random()<0.25});
  else if(type==='rat') spawnRat(f); else spawnFlock(f);
  S.nextSpawn=S.T+d.gap*(0.8+Math.random()*0.4)*(type==='sparrow'?1.6:1);
}
function makeSchedule(dur){
  const ev=[]; let t=1.0, lastFlock=-99;
  while(t<dur-4){
    if(waveOf(t,dur)===0){ t+=0.5; continue; }
    let r=Math.random(), type=r<0.45?'boar':(r<0.75?'rat':'sparrow');
    if(type==='sparrow'&&t-lastFlock<10) type='boar';
    if(type==='sparrow') lastFlock=t;
    ev.push({t,type,u:0.12+Math.random()*0.76,v:Math.random(),hole:Math.random()<0.5?-1:1,fierce:Math.random()<0.25});
    t+=(type==='sparrow'?2.4:(type==='rat'?1.9:1.45))*(0.85+Math.random()*0.3);
  }
  return ev;
}
function duelSpawn(){
  const el=S.T-S.playStart;
  while(S.schedIdx<S.schedule.length&&S.schedule[S.schedIdx].t<=el){
    const e=S.schedule[S.schedIdx++];
    S.fields.forEach(f=>{
      const u=e.u, hole=f.mirror?-e.hole:e.hole;              // 右邊的田 L() 會自動左右翻，這裡傳同一個 u
      if(e.type==='boar') spawnBoar(f,{u,v:e.v,fierce:e.fierce&&f.D.fierce});
      else if(e.type==='rat') spawnRat(f,{hole});
      else if(S.T>f.scare.block&&!f.animals.some(a=>a.type==='flock')) spawnFlock(f);
    });
  }
}

/* ---------------- 趕走／被偷 ---------------- */
function pop(x,y,text,color='#fff',size=1,dur=0.9){ S.pops.push({x,y,text,color,size,t0:S.T,dur}); }
function dust(x,y,n=10,col='#c9a26b'){ for(let i=0;i<n;i++){ const a=Math.random()*6.28,sp=40+Math.random()*120; S.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-80,life:1,col,r:2+Math.random()*3}); } }
function chase(f,a,x,y,pts,o={}){
  f.chased++; f.combo++; if(f.combo>f.maxCombo) f.maxCombo=f.combo;
  let bonus=0; if(f.combo>=3){ bonus=Math.min(10,f.combo); }
  f.score+=pts+bonus; const rt=o.rt??(S.T-(a.born||S.T)); if(rt>=0.25) f.rts.push(rt);   // 手剛好停在出現的位置不算「出手」
  logResolve(o.bird||a,'chased',{rt,hand:o.hand,x});
  pop(x,y-20,'+'+pts,'#ffe27a',1);
  if(f.combo>=3){ const w=(f.combo<=10?ZH[f.combo]:f.combo+' ')+'連趕！'; pop((f.x0+f.x1)/2,CH*0.62,w,'#ff9a3c',1.5,1.1); sfx('combo',f.combo); }
  if(f.hasScare&&!o.noBell&&!f.scare.full){ f.scare.bells=Math.min(f.scare.max,f.scare.bells+1);
    if(f.scare.bells>=f.scare.max){ f.scare.full=true; f.scare.fullT=S.T; f.scare.hold=0;
      banner(S.mode==='duel'?'稻草人醒了！':(AS.noPush()?'稻草人醒了，馬上來幫忙！':'稻草人醒了！手舉高，停一下！'),2.6,'#ffcf33',f); sfx('ding'); } }
  if(a.practice&&S.screen==='practice') practiceDone();
}
/* ---------------- 每隻動物一筆紀錄（「這一局伸手的表現」用；只記故事模式正式守田） ---------------- */
function logSpawn(a,layer,x){
  if(S.screen!=='play'||S.mode!=='story'||a.practice) return;
  a.log={type:a.type==='boar'?a.kind:a.type,layer,side:x<CW/2?'L':'R',t:+(S.T-S.playStart).toFixed(2),outcome:null,rt:null,hand:null,cross:false};
  S.log.push(a.log);
}
function handSide(h){ if(!h) return null; const k=h.key||'';     // 鏡像畫面：畫面左半邊＝玩家的左邊
  if(k==='left'||k==='dL') return 'L'; if(k==='right'||k==='dR') return 'R'; if(k==='d1') return cfg.side==='right'?'R':'L'; return null; }
function logResolve(a,outcome,info={}){
  const g=a&&a.log; if(a&&a.type==='boar') a.resolved=true; if(!g||g.outcome) return;
  g.outcome=outcome;
  if(outcome==='chased'){ g.rt=info.rt!=null?Math.round(info.rt*1000)/1000:null; g.hand=info.hand==='scare'?'scare':handSide(info.hand);
    g.cross=!!(g.hand==='L'||g.hand==='R')&&g.hand!==g.side; }
}
function lose(f,kind,x,y){
  f.lost[kind]++; f.combo=0; pop(x,y-10,kind==='rice'?'稻穀被吃了':'被偷了','#ffd0c4',0.9,1.0); sfx('lose');
}
function banner(text,dur=2,color='#fff',f){ S.banner={text,t0:S.T,dur,color,x:(f&&S.mode==='duel')?(f.x0+f.x1)/2:null}; }

/* ---------------- 動物更新 ---------------- */
const ease=u=>u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
function bez(p,u){ const k=ease(Math.min(1,Math.max(0,u))), a=(1-k)*(1-k), b=2*(1-k)*k, c=k*k;
  return {x:a*p.p0.x+b*p.p1.x+c*p.p2.x, y:a*p.p0.y+b*p.p1.y+c*p.p2.y}; }
function fly(b,x2,y2,lift,dur){ const p0={x:b.x,y:b.y}, p2={x:x2,y:y2};
  // 飛行時間依距離拉長：ease-in-out 的最快速度約是平均的 2 倍，限制在畫面長邊 0.8 倍／秒以內，才不會一幀跳太遠
  const dist=Math.hypot(p2.x-p0.x,p2.y-p0.y)+lift; dur=Math.max(dur,2*dist/(0.8*Math.max(CW,CH)));
  b.path={p0,p1:{x:(p0.x+p2.x)/2,y:Math.min(p0.y,p2.y)-lift},p2,t0:S.T,dur}; }
function boarMove(a,dt,speedMul){
  const T=a.runT, vmax=a.path.len/(0.75*T)*speedMul, acc=vmax/(0.25*T);
  const rem=a.path.len-a.dist, vt=Math.min(vmax,Math.sqrt(2*acc*Math.max(0,rem)));
  a.v+=Math.max(-acc*dt,Math.min(acc*dt,vt-a.v)); a.dist=Math.min(a.path.len,a.dist+Math.max(0,a.v)*dt);
  const p=pathAt(a.path,a.dist); a.x=p.x; a.y=p.y;
  a.phase+=Math.max(0,a.v)*dt/(a.r*0.32); a.bob=Math.abs(Math.sin(a.phase))*a.r*0.1*a.sc; a.tilt=Math.sin(a.phase*2)*0.05;
  return rem<1&&a.v<vmax*0.2;
}
function updBoar(f,a,dt){
  const age=S.T-a.t0, l=L(f); a.sc=l.depth(a.y);
  if(a.st==='rustle'){ if(age>=a.rustle){ a.st='run'; a.t0=S.T; a.runAt=S.T; boarPath(a,a.stand.x,a.stand.y,0.12); } return; }
  if(a.st==='run'){ if(boarMove(a,dt,1)){ a.st='root'; a.t0=S.T; a.bob=0; a.tilt=0; } return; }
  if(a.st==='root'){ f.rustle[a.target]=1; a.tilt=0.04*Math.sin(age*16); a.bob=Math.abs(Math.sin(age*9))*a.r*0.05*a.sc;
    if(Math.random()<dt*14){ const sn=a.x+a.face*a.r*1.1*a.sc; dust(sn,a.y-4,1,'#7a5530'); }
    if(age>=a.rootT){ a.st='steal'; a.t0=S.T; a.carry=f.potato[a.target]; if(a.carry) f.potato[a.target]=false; a.turn=0; } return; }
  if(a.st==='steal'||a.st==='flee'){
    const hopT=0.28;                                                // 轉身：原地小跳，跳到最高點時翻面
    if(age<hopT){ const u=age/hopT; a.hop=Math.sin(u*Math.PI)*a.r*0.32*a.sc; a.bob=0; a.tilt=0;
      if(u>=0.5&&!a.turned){ a.turned=true; a.face=Math.sign(a.ent.x-a.x)||-a.face; } }
    else { if(!a.path2){ a.path2=true; a.hop=0; if(!a.turned){ a.turned=true; a.face=Math.sign(a.ent.x-a.x)||-a.face; } boarPath(a,a.ent.x,a.ent.y,0.1); }
      if(boarMove(a,dt,a.st==='flee'?1.4:1.1)){ a.st='gone'; a.t0=S.T; } }
    if(a.st==='steal'&&a.carry&&!a.committed&&age>=0.5){ a.committed=true; lose(f,'potato',a.x,a.y-a.r); logResolve(a,'stolen'); }
    if(a.st==='steal'&&!a.carry&&!a.resolved&&age>=0.5) logResolve(a,'left');
    return; }
  if(a.st==='gone'){ a.alpha=Math.max(0,1-age/0.3); if(age>=0.3) a.st='dead'; }
}
function boarHittable(a){ return a.st==='run'||a.st==='root'||(a.st==='steal'&&S.T-a.t0<0.5); }
function updRat(f,a,dt){
  const l=L(f), d=f.D, vmax=l.fw*d.ratSpeed*(a.st==='flee'?1.9:(a.carry?0.85:1)), acc=vmax*3.2;
  const want=(a.st==='back'||a.st==='flee'||a.st==='in')?a.hole:-a.hole;   // 想去的方向：+1 右、-1 左
  a.face+=Math.max(-dt*4,Math.min(dt*4,want-a.face));            // 轉身用追的（約 0.5 秒）
  a.sniff=0;
  const age=S.T-a.t0;
  const moveTo=(tx)=>{ const rem=tx-a.x, sg=Math.sign(rem)||1, facing=Math.max(0,a.face*sg);
    const vt=sg*Math.min(vmax*facing,Math.sqrt(2*acc*Math.abs(rem)));
    a.v+=Math.max(-acc*dt,Math.min(acc*dt,vt-a.v)); a.x+=a.v*dt;
    if((sg>0&&a.x>tx)||(sg<0&&a.x<tx)){ a.x=tx; a.v=0; }
    return Math.abs(tx-a.x)<1.5&&Math.abs(a.v)<vmax*0.15; };
  const newSeg=(back)=>{ const len=l.fw*(back?0.18+Math.random()*0.14:0.08+Math.random()*0.09), dir=back?a.hole:-a.hole;
    const goal=back?l.holes[a.hole]:l.basket.x-(-a.hole)*l.basket.w*0.45;
    let e=a.x+dir*len; if((dir>0&&e>goal)||(dir<0&&e<goal)) e=goal; a.segEnd=e; };
  if(a.st==='peek'){ if(age>=0.6){ a.st='run'; a.t0=S.T; newSeg(false); } }
  else if(a.st==='run'){
    if(moveTo(a.segEnd)){
      const goal=l.basket.x-(-a.hole)*l.basket.w*0.45;
      if(Math.abs(a.x-goal)<2){ a.st='grab'; a.t0=S.T; }
      else { a.st='sniff'; a.t0=S.T; a.stops++; a.pause=d.ratPause[0]+Math.random()*(d.ratPause[1]-d.ratPause[0]);
        if(a.practice&&a.stops>=2) a.pause=1e9; } } }
  else if(a.st==='sniff'){ a.v*=Math.exp(-dt*8); a.sniff=1; if(age>=a.pause){ a.st='run'; a.t0=S.T; newSeg(false); } }
  else if(a.st==='grab'){ a.sniff=1;
    if(age>=0.45&&!a.grabbed){ a.grabbed=true; if(f.small>0){ f.small--; a.carry=true; sfx('squeak'); } }
    if(age>=0.7){ a.st='back'; a.t0=S.T; newSeg(true); } }
  else if(a.st==='back'){
    if(moveTo(a.segEnd)){ if(Math.abs(a.x-l.holes[a.hole])<2){ a.st='in'; a.t0=S.T;
        if(a.carry){ a.carry=false; lose(f,'small',a.x,a.y-a.s*0.4); logResolve(a,'stolen'); } else logResolve(a,'left'); }
      else { a.st='bsniff'; a.t0=S.T; a.pause=(d.ratPause[0]+Math.random()*(d.ratPause[1]-d.ratPause[0]))*0.6; } } }
  else if(a.st==='bsniff'){ a.v*=Math.exp(-dt*8); a.sniff=1; if(age>=a.pause){ a.st='back'; a.t0=S.T; newSeg(true); } }
  else if(a.st==='flee'){ if(moveTo(l.holes[a.hole])){ a.st='in'; a.t0=S.T; } }
  else if(a.st==='in'){ a.alpha=Math.max(0,1-age/0.3); if(age>=0.3) a.st='dead'; }
  { const hx=l.holes[a.hole], k=Math.max(0,1-Math.abs(a.x-hx)/(l.fw*0.07)); a.y=l.ratY-(l.ratY-l.holeY)*k*k*(3-2*k); }   // 出洞後斜斜走下田埂路
  if(Math.abs(a.v)>vmax*0.1){ a.phase+=Math.abs(a.v)*dt/(a.s*0.22); a.bob=Math.abs(Math.sin(a.phase))*a.s*0.06; }
  else a.bob*=Math.exp(-dt*12);
}
function birdHittable(b){ return b.st==='in'||b.st==='perch'||b.st==='down'; }
function updFlock(f,fl,dt){
  const l=L(f), age=S.T-fl.t0;
  for(const b of fl.birds){
    b.flap+=dt*(b.st==='perch'||b.st==='peck'?0:26);
    if(b.path){ const u=(S.T-b.path.t0)/b.path.dur, p=bez(b.path,u); const dx=p.x-b.x; if(Math.abs(dx)>0.3) b.face=dx>0?1:-1; b.x=p.x; b.y=p.y;
      if(u>=1){ b.path=null;
        if(b.st==='in'){ b.st='perch'; }
        else if(b.st==='down'){ b.st='peck'; b.pt=S.T;
          if(!fl.lost){ fl.lost=true; if(fl.pile>=0&&f.rice[fl.pile]){ f.rice[fl.pile]=false; lose(f,'rice',b.x,b.y-30); } } }
        else if(b.st==='flee'||b.st==='away'){ b.st='gone'; } } }
    if(b.st==='wait'&&age>=b.delay){ b.st='in'; fly(b,b.slot,l.pole.y,CH*0.05,1.25); }
    if(b.st==='perch'){ if(S.T>b.hopT){ b.hopT=S.T+1.2+Math.random()*1.8; b.hop0=S.T; }
      const hk=(S.T-(b.hop0||-9))/0.28; b.hop=hk<1?Math.sin(hk*Math.PI)*b.s*0.18:0; }
    if(b.st==='peck'){ b.hop=-Math.abs(Math.sin((S.T-b.pt)*14))*b.s*0.1; if(S.T-b.pt>1.0){ b.st='away'; b.hop=0; fly(b,b.x+(fl.fromLeft?-1:1)*l.fw*0.4,-CH*0.15,CH*0.15,1.3); } }
  }
  if(fl.st==='shadow'&&fl.birds.every(b=>b.st!=='wait')) fl.st='in';
  if(fl.st==='in'&&fl.birds.every(b=>b.st!=='in'&&b.st!=='wait')){ fl.st='perch'; fl.t0=S.T; }
  if(fl.st==='perch'&&!fl.practice){
    const left=S.T-fl.t0, dur=f.D.perch;
    fl.warn=left>dur-1.3&&fl.birds.some(b=>b.st==='perch');
    if(fl.warn&&!fl.warned){ fl.warned=true; sfx('chirp'); }
    if(left>=dur){ const perched=fl.birds.filter(b=>b.st==='perch');
      if(perched.length){ const avail=f.rice.map((h,i)=>h?i:-1).filter(i=>i>=0);
        fl.pile=avail.length?avail[(Math.random()*avail.length)|0]:((Math.random()*f.rice.length)|0);
        const p=l.rice[fl.pile]; perched.forEach((b,k)=>{ logResolve(b,'stolen'); b.st='down'; b.hop=0; fly(b,p.x+(k-(perched.length-1)/2)*b.s*0.55,p.y-l.riceW*0.25,CH*0.03,0.75); });
        sfx('flap'); }
      fl.st='down'; fl.warn=false; } }
  const hitAll=fl.birds.every(b=>b.st==='gone'||b.st==='flee'), allChased=fl.chased===fl.birds.length;
  if(hitAll&&allChased&&!fl.lost&&!fl.bonusDone&&!fl.practice){ fl.bonusDone=true; f.score+=PTS.flock;
    pop((l.pole.x0+l.pole.x1)/2,Math.max(CH*0.3,l.IY(0.40)),'整群趕走！ +'+PTS.flock,'#8ef08e',1.3,1.3); sfx('fanfare'); }
  if(fl.birds.every(b=>b.st==='gone')){ fl.st='dead'; S.lastFlockEnd=S.T; }
}
function scareBirds(f,fl,b,hx,hy,pts,noBell,hand){
  const l=L(f); b.st='flee'; b.hop=0; const sg=(b.x>=hx)?1:-1;
  fly(b,Math.max(f.x0-l.fw*0.1,Math.min(f.x1+l.fw*0.1,b.x+sg*l.fw*0.35)),-CH*0.18,CH*0.12,0.95);
  if(S.mode==='duel'){ b.path.p2.x=Math.max(f.x0,Math.min(f.x1,b.path.p2.x)); }
  if(pts){ fl.chased++; chase(f,fl,b.x,b.y,PTS.sparrow,{noBell,bird:b,hand:noBell?'scare':hand,rt:S.T-fl.born}); }
  sfx('chirp');
}

/* ---------------- 碰撞（手的移動線段 vs 圓：揮過去也算到） ---------------- */
function segDist(ax,ay,bx,by,px,py){ const dx=bx-ax,dy=by-ay, L2=dx*dx+dy*dy; let t=L2?((px-ax)*dx+(py-ay)*dy)/L2:0; t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+dx*t-px,ay+dy*t-py); }
function handHits(f,hands){
  const bs=bsize(f);
  for(const h of hands){
    const hit=(x,y,r)=>segDist(h.px,h.py,h.x,h.y,x,y)<r;
    for(const a of f.animals){
      if(a.type==='boar'&&boarHittable(a)){
        const cy=a.y-a.r*0.55*(a.sc||1);                                  // 判定範圍用近處的大小，遠處看起來小也一樣好碰
        if(hit(a.x,cy,a.r*1.05+bs*0.42)){
          const early=a.st==='run', wasSteal=a.st==='steal';
          if(wasSteal&&a.carry){ f.potato[a.target]=true; a.carry=false; pop(a.x,a.y-a.r*1.4,'地瓜放回去了！','#bff5a0',1,1); }
          a.st='flee'; a.t0=S.T; a.turned=false; a.path2=false; a.v=0; dust(a.x,a.y-4,12);
          a.rt=S.T-(a.runAt??a.born);
          chase(f,a,a.x,a.y-a.r*1.1,(a.kind==='fierce'?PTS.fierce:PTS.boar)+(early?PTS.early:0),{rt:a.rt,hand:h});
          if(early) pop(a.x,a.y-a.r*1.9,'早一步！','#8ef08e',1.1,1.1);
          sfx('squeak'); sfx('shoo'); } }
      else if(a.type==='rat'&&['peek','run','sniff','grab','back','bsniff'].includes(a.st)){
        if(hit(a.x,a.y-a.s*0.18,a.s*0.34+bs*0.35)){
          const wasCarry=a.carry; a.carry=false;
          if(wasCarry){ const l=L(f); S.parts.push({type:'potato',x:a.x,y:a.y-a.s*0.2,x2:l.basket.x,y2:l.basket.y-l.basket.w*0.5,t0:S.T,dur:0.65,f}); }
          if(a.st==='peek'){ a.st='in'; a.t0=S.T; } else { a.st='flee'; a.t0=S.T; }
          chase(f,a,a.x,a.y-a.s*0.5,PTS.rat,{hand:h}); sfx('squeak'); dust(a.x,a.y,6); } }
      else if(a.type==='flock'){
        for(const b of a.birds){ if(birdHittable(b)&&hit(b.x,b.y-(b.st==='perch'?b.s*0.3:0),b.s*0.36+bs*0.30)) scareBirds(f,a,b,h.x,h.y,true,false,h);
          else if(b.st==='peck'&&hit(b.x,b.y,b.s*0.4+bs*0.3)) scareBirds(f,a,b,h.x,h.y,false); } }
    }
    // 揮過地瓜葉會沙沙動
    const l=L(f), sp=Math.hypot(h.x-h.px,h.y-h.py);
    if(sp>2) l.pot.forEach((p,i)=>{ if(segDist(h.px,h.py,h.x,h.y,p.x,p.y)<l.potW*0.8) f.rustle[i]=1; });
  }
}
/* ---------------- 稻草人 ---------------- */
function updScare(f,hands,dt){
  if(!f.hasScare) return;
  const sc=f.scare, l=L(f);
  const hs=hands.slice().sort((a,b)=>a.x-b.x);
  const armOf=y=>Math.max(-1.25,Math.min(0.95,-1.25+(y/CH-0.05)/0.85*2.2));
  let tl=0.35,tr=0.35;
  if(hs.length>=2){ tl=armOf(hs[0].y); tr=armOf(hs[hs.length-1].y); }
  else if(hs.length===1){ if(hs[0].x<(f.x0+f.x1)/2) tl=armOf(hs[0].y); else tr=armOf(hs[0].y); }
  if(S.T<sc.animEnd){ tl=tr=-1.35; }
  const k=1-Math.exp(-dt/0.12); sc.armL+=(tl-sc.armL)*k; sc.armR+=(tr-sc.armR)*k;
  if(sc.full&&(S.screen==='play'||S.screen==='duelPlay')&&S.sub==='run'){
    const up=hands.some(h=>h.y<CH*0.22)||(S.mode==='story'&&AS.noPush()&&S.T-sc.fullT>1.0);   // 舉手會痛：集滿後稻草人自己幫忙
    sc.hold=up?sc.hold+dt:Math.max(0,sc.hold-dt*0.5);
    if(sc.hold>=0.8){                                         // 觸發：雙手張開、鈴鐺大響、麻雀全飛走
      sc.full=false; sc.bells=0; sc.hold=0; sc.animEnd=S.T+1.4; f.scareN=(f.scareN||0)+1; sc.block=S.T+6; sfx('bell');
      banner(S.mode==='duel'?'麻雀嚇跑了！':'稻草人把麻雀都嚇跑了！',2,'#ffe27a',f);
      for(const a of f.animals) if(a.type==='flock') for(const b of a.birds){
        if(birdHittable(b)) scareBirds(f,a,b,l.sc.x,l.sc.base-l.sc.h,true,true);
        else if(b.st==='peck') scareBirds(f,a,b,l.sc.x,0,false);
        else if(b.st==='wait') b.st='gone'; }
      for(let i=0;i<14;i++) S.parts.push({x:l.sc.x,y:l.sc.base-l.sc.h*0.6,vx:(Math.random()-0.5)*260,vy:-60-Math.random()*200,life:1,col:'#ffe27a',r:3+Math.random()*3});
    }
  }
}

/* ---------------- 示範模式的假手 ---------------- */
const demoHands=[];
function makeDemoHand(key,field,zone,skill){ return {key,field,zone,skill,x:(zone[0]+zone[1])/2*CW,y:CH*0.6,vx:0,vy:0,tgt:null,ign:new Set(),seen:new Map()}; }
function setupDemoHands(){
  demoHands.length=0;
  if(S.mode==='duel'){ demoHands.push(makeDemoHand('d0',0,[0,0.5],{react:0.30,miss:0.12,w:7.5,vmax:2.0}));
                       demoHands.push(makeDemoHand('d1',1,[0.5,1],{react:0.75,miss:0.45,w:4.5,vmax:1.1})); }
  else if(cfg.side==='none'){ demoHands.push(makeDemoHand('dL',0,[0,0.5],{react:0.4,miss:0.22,w:6,vmax:1.6}));
                              demoHands.push(makeDemoHand('dR',0,[0.5,1],{react:0.4,miss:0.22,w:6,vmax:1.6})); }
  else demoHands.push(makeDemoHand('d1',0,[0,1],{react:0.35,miss:0.2,w:6.5,vmax:1.8}));
}
function demoTargets(f){
  const out=[];
  for(const a of f.animals){
    if(a.type==='boar'&&boarHittable(a)) out.push({id:a.id,x:a.x,y:a.y-a.r*0.55*(a.sc||1),born:a.born});
    else if(a.type==='rat'&&['run','sniff','grab','back','bsniff'].includes(a.st)) out.push({id:a.id,x:a.x,y:a.y-a.s*0.18,born:a.born});
    else if(a.type==='flock') for(const b of a.birds) if(birdHittable(b)&&b.y>0) out.push({id:a.id*1000+b.id,x:b.x,y:b.y-b.s*0.3,born:a.born});
  }
  return out;
}
function stepDemo(dt){
  const out=[];
  for(const h of demoHands){
    const f=S.fields[h.field]; let gx,gy;
    if(S.screen==='duelReady'){ const k=S.readyStep===h.field; gx=(f.x0+f.x1)/2; gy=k?CH*0.18:CH*0.7; }
    else if(S.demoIdle){ gx=(h.zone[0]+h.zone[1])/2*CW; gy=CH*0.15; }
    else if(f&&(S.screen==='play'||S.screen==='duelPlay'||S.screen==='practice')&&S.sub!=='count'){
      const sc=f.scare;
      if(f.hasScare&&sc.full&&S.T-sc.fullT>0.9&&h===demoHands.find(d=>d.field===h.field)){ const l=L(f); gx=l.sc.x+(h.x<l.sc.x?-1:1)*20; gy=CH*0.1; }
      else {
        const z0=h.zone[0]*CW, z1=h.zone[1]*CW;
        const c=demoTargets(f).filter(t=>t.x>=z0-1&&t.x<=z1+1);
        for(const t of c) if(!h.seen.has(t.id)){ h.seen.set(t.id,S.T); if(Math.random()<h.skill.miss&&S.screen!=='practice') h.ign.add(t.id); }
        const ok=c.filter(t=>!h.ign.has(t.id)&&S.T-h.seen.get(t.id)>=h.skill.react);
        let best=null,bd=1e9; for(const t of ok){ const d=Math.hypot(t.x-h.x,t.y-h.y); if(d<bd){bd=d;best=t;} }
        if(best){ gx=best.x; gy=best.y; }
        else { gx=(z0+z1)/2+Math.sin(S.T*0.7+h.field)*CW*0.06; gy=CH*0.6+Math.cos(S.T*0.9)*CH*0.06; }
      }
    } else { gx=(h.zone[0]+h.zone[1])/2*CW+Math.sin(S.T*0.8)*CW*0.05; gy=CH*0.6; }
    const w=h.skill.w, ax=w*w*(gx-h.x)-2*w*h.vx, ay=w*w*(gy-h.y)-2*w*h.vy;
    h.vx+=ax*dt; h.vy+=ay*dt; const sp=Math.hypot(h.vx,h.vy), vm=h.skill.vmax*Math.max(CW,CH)*0.6;
    if(sp>vm){ h.vx*=vm/sp; h.vy*=vm/sp; }
    h.x+=h.vx*dt; h.y+=h.vy*dt;
    if(f&&S.mode==='duel'){ const lo=f.x0+8, hi=f.x1-8; if(h.x<lo){h.x=lo;h.vx=0;} if(h.x>hi){h.x=hi;h.vx=0;} }
    h.y=Math.max(-20,Math.min(CH+20,h.y));
    out.push({key:h.key,x:h.x,y:h.y,pl:h.field,raw:{x:1-h.x/CW,y:h.y/CH}});
  }
  return out;
}

/* ---------------- 鏡頭的手（沿用舊版 trackHands／mapScreen／easeCur） ---------------- */
const euro={left:{x:TR.oneEuro(),y:TR.oneEuro(),t:0},right:{x:TR.oneEuro(),y:TR.oneEuro(),t:0}};
const handRaw={left:{x:0.5,y:0.5,t:0,valid:false,bad:0,raw:null},right:{x:0.5,y:0.5,t:0,valid:false,bad:0,raw:null}};
const rcur={left:mkCur(),right:mkCur()};
function mkCur(){ return {x:0,y:0,vx:0,vy:0,zx:0,zy:0,zt:0,t:0,on:false}; }
const JUMP=0.32, HAND_SWAP=true;
const affSide=()=>cfg.side==='right'?'right':'left', otherSide=s=>s==='left'?'right':'left';
function trackStory(now,res){
  const FORCE=(cfg.side!=='none')?affSide():null, seen={left:false,right:false};
  for(const p of res.palms){
    let side; if(FORCE) side=FORCE; else { side=(p.label==='Left')?'left':'right'; if(HAND_SWAP)side=otherSide(side); }
    if(seen[side]){ if(FORCE)continue; side=otherSide(side); }
    const H=handRaw[side], E=euro[side];
    if(H.valid&&H.raw&&Math.hypot(p.x-H.raw.x,p.y-H.raw.y)>JUMP&&H.bad<5){ H.bad++; seen[side]=true; continue; }
    H.raw={x:p.x,y:p.y}; if(now-E.t>250){E.x.reset();E.y.reset();} E.t=now;
    H.x=E.x.f(p.x*res.SX,now)/res.SX; H.y=E.y.f(p.y*res.SY,now)/res.SY; H.t=now; H.valid=true; H.bad=0; seen[side]=true;
  }
  for(const s of ['left','right']) if(!seen[s]&&now-handRaw[s].t>200){ handRaw[s].valid=false; rcur[s].on=false; }
}
function mapScreen(nx,ny){
  let u=nx,v=ny; const c=S.calib;
  if(c){ u=(nx-c.minX)/Math.max(0.05,c.maxX-c.minX); v=(ny-c.minY)/Math.max(0.05,c.maxY-c.minY); }
  u=0.5+(u-0.5)*cfg.gain; v=0.5+(v-0.5)*cfg.gain;
  u=Math.max(-0.05,Math.min(1.05,u)); v=Math.max(-0.05,Math.min(1.05,v));
  return {x:CW*(1-u),y:CH*v};
}
const AB_A=0.85,AB_B=0.42,CUR_LEAD=0.055,LEAD_MAX=64,VMAX=2600;
function easeCur(r,tx,ty,now){
  if(!r.on){ r.x=r.zx=tx; r.y=r.zy=ty; r.vx=r.vy=0; r.t=r.zt=now; r.on=true; return {x:tx,y:ty}; }
  const dt=Math.min(0.05,Math.max(0.001,(now-r.t)/1000)); r.t=now;
  r.x+=r.vx*dt; r.y+=r.vy*dt;
  if(tx!==r.zx||ty!==r.zy){ const dz=Math.min(0.2,Math.max(0.008,(now-r.zt)/1000)); r.zt=now; r.zx=tx; r.zy=ty;
    const ex=tx-r.x,ey=ty-r.y; r.x+=AB_A*ex; r.y+=AB_A*ey; r.vx+=AB_B*ex/dz; r.vy+=AB_B*ey/dz;
    const sp=Math.hypot(r.vx,r.vy); if(sp>VMAX){r.vx=r.vx/sp*VMAX;r.vy=r.vy/sp*VMAX;} }
  else { const d=Math.exp(-dt/0.35); r.vx*=d; r.vy*=d; }
  let lx=r.vx*CUR_LEAD,ly=r.vy*CUR_LEAD; const lm=Math.hypot(lx,ly); if(lm>LEAD_MAX){lx=lx/lm*LEAD_MAX;ly=ly/lm*LEAD_MAX;}
  return {x:Math.max(-40,Math.min(CW+40,r.x+lx)),y:Math.max(-40,Math.min(CH+40,r.y+ly))};
}
let moleHold={x:0,y:0,t:0,side:null};
function storyCamHands(now){
  const out=[];
  if(cfg.side==='none'){ for(const s of ['left','right']){ const H=handRaw[s];
      if(H.valid){ const p=mapScreen(H.x,H.y), e=easeCur(rcur[s],p.x,p.y,now); out.push({key:s,x:e.x,y:e.y,pl:0,raw:H}); } else rcur[s].on=false; }
    return out; }
  const a=affSide(),o=otherSide(a),A=handRaw[a],O=handRaw[o];
  if(A.valid){ const p=mapScreen(A.x,A.y),e=easeCur(rcur[a],p.x,p.y,now); moleHold={x:e.x,y:e.y,t:now,side:a}; return [{key:a,x:e.x,y:e.y,pl:0,raw:A}]; }
  if(now-moleHold.t<220&&moleHold.side) return [{key:moleHold.side,x:moleHold.x,y:moleHold.y,pl:0}];
  if(O.valid){ const p=mapScreen(O.x,O.y),e=easeCur(rcur[o],p.x,p.y,now); moleHold={x:e.x,y:e.y,t:now,side:o}; return [{key:o,x:e.x,y:e.y,pl:0,raw:O}]; }
  return [];
}
/* 雙人：鏡像後左半邊的手歸左邊玩家、右半邊歸右邊；每一半取中間 70% 放大到整塊田 */
const duelSlots=[0,1,2,3].map(i=>({i,pl:i>>1,on:false,x:0,y:0,nx:0,ny:0,t:0,ex:TR.oneEuro(),ey:TR.oneEuro(),cur:mkCur(),rawU:0,rawV:0}));
function trackDuel(now,res){
  const used=new Set();
  for(const p of res.palms){
    const u=1-p.x, pl=u<0.5?0:1;
    const cand=duelSlots.filter(s=>s.pl===pl&&!used.has(s));
    let best=null,bd=1e9; for(const s of cand){ const d=s.on?Math.hypot(s.rawU-u,s.rawV-p.y):0.5; if(d<bd){bd=d;best=s;} }
    if(!best) continue; used.add(best);
    if(!best.on||now-best.t>250){ best.ex.reset(); best.ey.reset(); }
    best.rawU=u; best.rawV=p.y;
    best.nx=best.ex.f(u*res.SX,now)/res.SX; best.ny=best.ey.f(p.y*res.SY,now)/res.SY; best.t=now; best.on=true;
  }
  for(const s of duelSlots) if(!used.has(s)&&now-s.t>200){ s.on=false; s.cur.on=false; }
}
function duelCamHands(now){
  const out=[];
  for(const s of duelSlots){ if(!s.on) continue; const f=S.fields[s.pl]; if(!f) continue;
    const half=s.pl===0?0:0.5, uu=(s.nx-half-0.075)/0.35, vv=(s.ny-0.15)/0.70;
    const pad=8, tx=Math.max(f.x0+pad,Math.min(f.x1-pad,f.x0+uu*(f.x1-f.x0))), ty=Math.max(0,Math.min(CH,vv*CH));
    const e=easeCur(s.cur,tx,ty,now);
    out.push({key:'s'+s.i,x:Math.max(f.x0+pad,Math.min(f.x1-pad,e.x)),y:e.y,pl:s.pl,raw:{x:s.nx,y:s.ny}}); }
  return out;
}
let camHands=[];
function pollCamera(now){
  if(DEMO) return;
  if(AS.active){ const lm=TR.detectPose(now); if(lm) AS.pose(lm,S.T*1000); return; }   // 試手時改用身體模型，手部模型先停
  const res=TR.detect(now);
  if(res){ if(S.mode==='duel') trackDuel(now,res); else trackStory(now,res); }
  camHands=(S.mode==='duel')?duelCamHands(now):storyCamHands(now);
}

/* ---------------- 每一步更新 ---------------- */
function update(dt){
  S.T+=dt;
  for(let i=S.after.length-1;i>=0;i--) if(S.T>=S.after[i].t){ const a=S.after.splice(i,1)[0]; a.fn(); }
  let hands=DEMO?stepDemo(dt):camHands.map(h=>({...h}));
  if(S.poke){ hands.push({key:'poke',x:S.poke.x,y:S.poke.y,pl:S.poke.pl||0}); S.poke=null; }   // 測試用：在某一點碰一下
  for(const h of hands){ const p=S.prevHands[h.key]; h.px=p?p.x:h.x; h.py=p?p.y:h.y; }
  S.prevHands={}; for(const h of hands) S.prevHands[h.key]={x:h.x,y:h.y};
  S.hands=hands;

  if(S.screen==='trial') AS.step(S.T*1000);
  if(S.screen==='calib') updCalib(hands);
  if(S.screen==='duelReady') updReady(hands,dt);
  const active=(S.screen==='play'||S.screen==='duelPlay'||S.screen==='practice');
  if(active){
    if(S.sub==='count'&&S.T>=S.countEnd){ S.sub='run'; S.playStart=S.T; S.nextSpawn=S.T+0.4; S.schedIdx=0; banner('開始守田！',1.2,'#fff'); }
    const running=S.sub==='run'||S.screen==='practice';
    if(running&&!S.ended){
      if(S.screen==='play'&&!S.noSpawn) storySpawn(S.fields[0]);
      if(S.screen==='duelPlay') duelSpawn();
      for(const f of S.fields){
        const fh=hands.filter(h=>h.pl===f.i);
        handHits(f,fh);
        for(const a of f.animals){ if(a.type==='boar') updBoar(f,a,dt); else if(a.type==='rat') updRat(f,a,dt); else updFlock(f,a,dt); }
        f.animals=f.animals.filter(a=>a.st!=='dead');
      }
      if(S.screen!=='practice'){
        const remain=S.dur-(S.T-S.playStart);
        if(waveOf(S.T-S.playStart,S.dur)===3&&!S.late){ S.late=true; banner('最後一波！',2.2,'#ffcf6b'); sfx('ding'); }
        if(remain<=0) endPlay();
      }
    }
    for(const f of S.fields){ updScare(f,hands.filter(h=>h.pl===f.i),dt); f.rustle=f.rustle.map(v=>v*Math.exp(-dt*3)); }
  }
  for(const p of S.parts){ if(p.type==='potato'){ if(S.T-p.t0>=p.dur&&!p.done){ p.done=true; p.f.small=Math.min(p.f.max.small,p.f.small+1); pop(p.x2,p.y2-20,'追回來了！','#bff5a0',1,1); } continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=420*dt; p.life-=dt*1.6; }
  S.parts=S.parts.filter(p=>p.type==='potato'?!p.done:p.life>0);
  S.pops=S.pops.filter(p=>S.T-p.t0<p.dur);
}

/* ---------------- 繪製 ---------------- */
function draw(){
  resize();
  ctx.clearRect(0,0,CW,CH);
  if(S.screen==='calib'){ drawCalib(); return; }
  D.drawBackground(ctx,CW,CH,S.T);
  if(['story','practice','play','receipt'].includes(S.screen)&&S.mode==='story') D.drawTint(ctx,CW,CH,['dawn','noon','dusk'][S.day-1],D.coverTf(CW,CH));
  if(S.screen==='trial'){ AS.draw(ctx,CW,CH); return; }
  if(!S.fields.length) S.fields=[storyField(1)];
  if(S.mode==='duel'&&S.fields.length===2){
    const fw=CW*0.03; D.drawFence(ctx,CW/2,CH*0.1,CH,fw);
  }
  for(const f of S.fields) drawField(f);
  // 飛行中的麻雀畫在最上層
  for(const f of S.fields) for(const a of f.animals) if(a.type==='flock') drawFlock(f,a,true);
  for(const p of S.parts){
    if(p.type==='potato'){ const u=Math.min(1,(S.T-p.t0)/p.dur), x=p.x+(p.x2-p.x)*u, y=p.y+(p.y2-p.y)*u-Math.sin(u*Math.PI)*CH*0.12; D.drawPotato(ctx,x,y,30,u*6); continue; }
    ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
  ctx.globalAlpha=1;
  if(S.mode==='duel') for(const f of S.fields){ ctx.strokeStyle=f.color; ctx.lineWidth=6; ctx.strokeRect(f.x0+3,3,f.x1-f.x0-6,CH-6); }
  // 手掌游標
  const hs=Math.max(44,Math.min(CW,CH)*0.13);
  if(['play','practice','duelPlay','duelReady','title','days','story','duelSetup'].includes(S.screen)) for(const h of S.hands){
    const f=S.fields[h.pl]; D.drawHand(ctx,h.x,h.y,hs,S.mode==='duel'&&f?f.color:null,h.x<CW/2); }
  for(const p of S.pops){ const k=(S.T-p.t0)/p.dur; ctx.globalAlpha=Math.min(1,(1-k)*2);
    const fs=Math.round(Math.max(20,Math.min(CW,CH)*0.05)*p.size); ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center';
    ctx.lineWidth=Math.max(4,fs*0.16); ctx.strokeStyle='rgba(60,35,10,.85)'; ctx.lineJoin='round';
    ctx.strokeText(p.text,p.x,p.y-k*40); ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y-k*40); }
  ctx.globalAlpha=1;
  // 稻草人集滿：標出「手舉到這裡」的範圍
  for(const f of S.fields) if(f.hasScare&&f.scare.full&&S.sub==='run'&&!(S.mode==='story'&&AS.noPush())){
    const a=0.18+0.1*Math.sin(S.T*5); ctx.fillStyle=`rgba(255,215,90,${a.toFixed(3)})`; ctx.fillRect(f.x0,0,f.x1-f.x0,CH*0.22);
    ctx.setLineDash([10,8]); ctx.strokeStyle='rgba(255,215,90,.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(f.x0,CH*0.22); ctx.lineTo(f.x1,CH*0.22); ctx.stroke(); ctx.setLineDash([]);
    const fs=Math.round(Math.max(18,Math.min(CW,CH)*0.042)); ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center';
    ctx.lineWidth=5; ctx.strokeStyle='rgba(70,40,0,.85)'; const tx=(f.x0+f.x1)/2, ty=CH*0.205;
    ctx.strokeText('手舉高，停一下！',tx,ty); ctx.fillStyle='#fff3b0'; ctx.fillText('手舉高，停一下！',tx,ty); }
  if(S.banner&&S.T-S.banner.t0<S.banner.dur){ const k=(S.T-S.banner.t0)/S.banner.dur, fs=Math.round(Math.max(22,Math.min(CW,CH)*0.065));
    ctx.globalAlpha=Math.min(1,(1-k)*3,(S.T-S.banner.t0)*6); ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center';
    const w=ctx.measureText(S.banner.text).width+fs*1.4, y=CH*0.42, bx=S.banner.x??CW/2;
    ctx.fillStyle='rgba(92,58,24,.88)'; ctx.beginPath(); ctx.roundRect(bx-w/2,y-fs*1.05,w,fs*1.55,fs*0.4); ctx.fill();
    ctx.fillStyle=S.banner.color; ctx.fillText(S.banner.text,bx,y); ctx.globalAlpha=1; }
  if(S.sub==='count'&&(S.screen==='play'||S.screen==='duelPlay')){
    const n=Math.ceil(S.countEnd-S.T); ctx.fillStyle='rgba(40,25,10,.35)'; ctx.fillRect(0,0,CW,CH);
    const fs=Math.round(Math.min(CW,CH)*0.3); ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center'; ctx.fillStyle='#fff';
    ctx.fillText(n>0?n:'',CW/2,CH*0.55); ctx.font=`800 ${Math.round(fs*0.22)}px ${F}`; ctx.fillText('準備守田！',CW/2,CH*0.55+fs*0.45); }
  if(S.ended&&(S.screen==='play'||S.screen==='duelPlay')){ const fs=Math.round(Math.min(CW,CH)*0.12);
    ctx.fillStyle='rgba(40,25,10,.3)'; ctx.fillRect(0,0,CW,CH); ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center';
    ctx.lineWidth=8; ctx.strokeStyle='rgba(70,40,0,.9)'; ctx.strokeText('收工囉！',CW/2,CH*0.5); ctx.fillStyle='#ffe9a8'; ctx.fillText('收工囉！',CW/2,CH*0.5); }
  if(!DEMO&&TR.cam.ready&&S.hands.length===0&&['play','practice','duelPlay','duelReady'].includes(S.screen)){
    const fs=Math.round(Math.max(18,Math.min(CW,CH)*0.04)); ctx.font=`800 ${fs}px ${F}`; ctx.textAlign='center';
    ctx.lineWidth=5; ctx.strokeStyle='rgba(60,35,10,.8)'; ctx.strokeText('把手舉起來，讓鏡頭看到',CW/2,CH*0.72); ctx.fillStyle='#fff'; ctx.fillText('把手舉起來，讓鏡頭看到',CW/2,CH*0.72); }
}
function drawField(f){
  const l=L(f), T=S.T;
  // 高層：竹蓆、稻穀、竹竿、稻草人
  if(l.riceMat||!D.art('bg_field')) D.drawMat(ctx,l.mat.x,l.mat.y,l.mat.w,l.mat.h);
  f.rice.forEach((h,i)=>{ const p=l.rice[i]; if(h) D.drawRicePile(ctx,p.x,p.y,l.riceW); else D.drawEmptyPile(ctx,p.x,p.y,l.riceW); });
  D.drawPole(ctx,l.pole.x0,l.pole.x1,l.pole.y,Math.min(CW,CH)*0.06);
  if(f.hasScare){ const sc=f.scare, fullK=sc.full?0.6+0.4*Math.sin(T*6):0, anim=T<sc.animEnd?1:0;
    D.drawScarecrow(ctx,l.sc.x,l.sc.base,l.sc.h,{armL:sc.armL,armR:sc.armR,bells:sc.bells,max:sc.max,glow:Math.max(fullK,anim),ring:sc.full?Math.min(1,sc.hold/0.8):0}); }
  for(const a of f.animals) if(a.type==='flock') drawFlock(f,a,false);
  // 中層：地瓜田
  // 山豬入口：田後緣的芒草叢、畫面邊緣的半叢草；有山豬要出來時會晃
  const boars=f.animals.filter(a=>a.type==='boar');
  const shakeOf=e=>{ let k=0; for(const a of boars) if(a.ent===e){ if(a.st==='rustle') k=Math.max(k,1); else if(a.st==='gone'||(a.st==='run'&&S.T-a.t0<0.4)) k=Math.max(k,0.5); } return k; };
  const bw=Math.min(l.fw*0.13,CH*0.13);
  for(const e of l.entries) if(e.bush) D.drawBush(ctx,e.x,e.y+bw*0.06,bw,shakeOf(e),T);
  // 地瓜與山豬依遠近一起排序，山豬站在地瓜旁邊時前後關係才對
  const items=l.pot.map((p,i)=>({y:p.y,draw:()=>D.drawMound(ctx,p.x,p.y,l.potW,f.potato[i],T,f.rustle[i])}));
  for(const a of boars){ if(a.st==='rustle') continue;
    items.push({y:a.y,draw:()=>D.drawBoarBody(ctx,a.x,a.y,a.r,{kind:a.kind,pose:a.st==='root'?'root':'run',face:a.face,scale:a.sc||l.depth(a.y),
      bob:a.bob,tilt:a.tilt,hop:a.hop,leg:a.phase*2,carry:!!a.carry,alpha:a.alpha})}); }
  items.sort((a,b)=>a.y-b.y).forEach(it=>it.draw());
  for(const e of l.entries) if(e.edge) D.drawBush(ctx,e.edge<0?f.x0:f.x1,e.y+bw*0.1,bw*1.3,shakeOf(e),T,e.edge<0?-1:1);
  // 低層：田埂、洞、籃子、老鼠
  for(const k of ['-1','1']){ D.drawTuft(ctx,l.holes[k]+(+k)*bsize(f)*0.25,l.holeY-2,bsize(f)*0.9); D.drawHole(ctx,l.holes[k],l.holeY,bsize(f)*0.75); }   // 洞在路邊草叢腳下
  D.drawBasket(ctx,l.basket.x,l.basket.y,l.basket.w,f.small,f.max.small);
  for(const a of f.animals) if(a.type==='rat'){
    const hx=l.holes[a.hole];
    if(a.st==='peek'){ D.drawWhiskers(ctx,hx,a.y,a.s,-a.hole,(S.T-a.t0)/0.6,S.T); continue; }
    ctx.save(); ctx.globalAlpha=a.alpha;
    D.drawRat(ctx,a.x,a.y,a.s,a.face,{bob:a.bob,leg:a.phase*2,sniff:a.sniff,t:S.T,carry:a.carry}); ctx.restore();
  }
}
function drawFlock(f,fl,flying){
  const l=L(f);
  if(fl.st==='shadow'||fl.st==='in'){ // 預兆：影子掠過門口埕
    for(const b of fl.birds){ if(b.st==='wait'){ const k=Math.min(1,(S.T-fl.t0)/b.delay); const x=fl.fromLeft?f.x0+(l.pole.x0-f.x0+40)*k:f.x1-(f.x1-l.pole.x1+40)*k;
        D.drawShadow(ctx,x+(b.slot-l.pole.x0)*0.3,l.IY(0.40),b.s,k); }
      else if(b.st==='in') D.drawShadow(ctx,b.x,l.IY(0.40),b.s,0.6); } }
  for(const b of fl.birds){
    const isFly=!!b.path&&(b.st==='in'||b.st==='flee'||b.st==='down'||b.st==='away');
    if(isFly!==flying||b.st==='wait'||b.st==='gone') continue;
    const crouch=fl.warn?Math.sin(S.T*16)*0.08:0;
    D.drawSparrow(ctx,b.x,b.y-(b.hop||0),b.s,{fly:isFly,flap:b.flap,face:b.face,tilt:crouch});
  }
  if(fl.warn&&!flying){ const fs=Math.round(Math.max(16,Math.min(CW,CH)*0.034)), x=(l.pole.x0+l.pole.x1)/2, y=l.pole.y-fl.birds[0].s*0.95;
    ctx.font=`900 ${fs}px ${F}`; ctx.textAlign='center'; const t='麻雀要飛下去了！', w=ctx.measureText(t).width+fs;
    ctx.fillStyle='rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(x-w/2,y-fs*1.15,w,fs*1.5,fs*0.5); ctx.fill();
    ctx.fillStyle='#c0392b'; ctx.fillText(t,x,y); }
  if(fl.practice&&!flying&&fl.st==='perch'&&S.screen==='practice'){ const b=fl.birds[0]; if(b.st==='perch'){ const ay=b.y-b.s*1.2; if(ay-44>(CH<520?50:72)) drawArrow(b.x,ay); else drawArrow(b.x,b.y+b.s*0.5,true); } }
}
function drawArrow(x,y,up){ const k=Math.sin(S.T*5)*8; ctx.save(); if(up){ ctx.translate(x,y); ctx.scale(1,-1); ctx.translate(-x,-y); } ctx.fillStyle='#ffdd55'; ctx.strokeStyle='rgba(80,50,0,.9)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(x,y+k); ctx.lineTo(x-16,y-22+k); ctx.lineTo(x-6,y-22+k); ctx.lineTo(x-6,y-44+k); ctx.lineTo(x+6,y-44+k); ctx.lineTo(x+6,y-22+k); ctx.lineTo(x+16,y-22+k); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }

/* ---------------- 校正（跟阿公伸伸懶腰；沿用舊版畫大圈） ---------------- */
let vtf={s:1,ox:0,oy:0,dw:0,dh:0};
function calX(nx){ return vtf.ox+vtf.dw*(1-nx); } function calY(ny){ return vtf.oy+vtf.dh*ny; }
function calibHand(hands){
  if(DEMO){ const t=S.T; const x=0.5+0.32*Math.sin(t*0.9), y=0.5+0.24*Math.cos(t*1.3); return {x,y}; }
  const a=handRaw[affSide()], o=handRaw[otherSide(affSide())]; return a.valid?a:(o.valid?o:null);
}
function updCalib(){
  if(S.calibSub!=='cap') return;
  const HH=calibHand();
  if(S.T>=S.capReadyEnd&&HH){ const b=S.capBox; b.minX=Math.min(b.minX,HH.x); b.maxX=Math.max(b.maxX,HH.x); b.minY=Math.min(b.minY,HH.y); b.maxY=Math.max(b.maxY,HH.y); }
  if(S.T>=S.capEnd) finishCapture();
}
function drawCalib(){
  const vid=TR.cam.video, vw=(vid&&vid.videoWidth)||4, vh=(vid&&vid.videoHeight)||3, s=Math.min(CW/vw,CH/vh)*0.9;
  vtf={s,dw:vw*s,dh:vh*s,ox:(CW-vw*s)/2,oy:(CH-vh*s)/2};
  const g=ctx.createLinearGradient(0,0,0,CH); g.addColorStop(0,'#5b4a35'); g.addColorStop(1,'#3a2e20'); ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
  if(TR.cam.ready&&vid&&vid.videoWidth){ ctx.save(); ctx.globalAlpha=0.5; ctx.translate(CW,0); ctx.scale(-1,1); ctx.drawImage(vid,CW-vtf.ox-vtf.dw,vtf.oy,vtf.dw,vtf.dh); ctx.restore(); }
  ctx.strokeStyle='rgba(255,240,210,.25)'; ctx.lineWidth=2; ctx.strokeRect(vtf.ox,vtf.oy,vtf.dw,vtf.dh);
  const fs=Math.round(Math.max(20,Math.min(CW,CH)*0.06));
  if(S.calibSub==='cap'){
    if(S.T<S.capReadyEnd){ const n=Math.ceil(S.capReadyEnd-S.T); ctx.fillStyle='#fff'; ctx.textAlign='center';
      ctx.font=`900 ${fs*3}px ${F}`; ctx.fillText(n,CW/2,CH*0.52); ctx.font=`800 ${fs}px ${F}`; ctx.fillText('坐遠一點，準備舉手',CW/2,CH*0.52+fs*1.6); }
    else { const b=S.capBox;
      if(b.maxX>b.minX){ const x1=calX(b.maxX),x2=calX(b.minX),y1=calY(b.minY),y2=calY(b.maxY);
        ctx.strokeStyle='rgba(120,210,120,.95)'; ctx.lineWidth=5; ctx.setLineDash([12,9]); ctx.strokeRect(Math.min(x1,x2),y1,Math.abs(x2-x1),y2-y1); ctx.setLineDash([]); }
      ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font=`900 ${fs}px ${F}`; ctx.fillText('畫一個大圈！',CW/2,CH*0.12);
      const p=Math.max(0,Math.min(1,(S.T-S.capReadyEnd)/(S.capEnd-S.capReadyEnd))), bw=Math.min(560,CW*0.7), bx=(CW-bw)/2, by=CH*0.12+fs*0.5;
      ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(bx,by,bw,16); ctx.fillStyle='#8fd16f'; ctx.fillRect(bx,by,bw*p,16); }
  }
  const HH=calibHand();
  if(HH){ const x=calX(HH.x),y=calY(HH.y); D.drawHand(ctx,x,y,Math.max(40,Math.min(CW,CH)*0.1),null,x<CW/2); }
  if(DEMO){ ctx.fillStyle='rgba(255,255,255,.7)'; ctx.textAlign='left'; ctx.font=`700 14px ${F}`; ctx.fillText('示範模式（沒有用鏡頭）',16,CH-14); }
}
function startCapture(){ ensureAudio(); S.calibSub='cap'; $('calib').classList.add('hidden'); S.capBox={minX:1,maxX:0,minY:1,maxY:0}; S.capReadyEnd=S.T+3; S.capEnd=S.T+11; sfx('beep',660); }
function finishCapture(){
  let {minX,maxX,minY,maxY}=S.capBox; const okW=maxX-minX>0.05, okH=maxY-minY>0.05;
  if(!okW){minX=Math.max(0,minX-0.1);maxX=Math.min(1,maxX+0.1);} if(!okH){minY=Math.max(0,minY-0.1);maxY=Math.min(1,maxY+0.1);}
  const px=(maxX-minX)*0.06, py=(maxY-minY)*0.06; S.calib={minX:minX-px,maxX:maxX+px,minY:minY-py,maxY:maxY+py};
  S.calibSub='done'; sfx('beep',990);
  $('calibTitle').textContent='伸好了！'; $('calibText').textContent=(okW&&okH)?'阿公說：手很靈活喔。我們去田裡吧。':'範圍小一點也沒關係，阿公幫你調好了。';
  $('btnCalibStart').classList.add('hidden'); $('btnCalibGo').classList.remove('hidden'); $('btnCalibAgain').classList.remove('hidden');
  $('calib').classList.remove('hidden');
}

/* ---------------- 雙人：開始前確認誰坐哪邊 ---------------- */
function updReady(hands,dt){
  if(S.readyStep>1) return;
  const side=S.readyStep;
  const up=hands.some(h=>h.pl===side&&(h.raw?h.raw.y<0.5:h.y<CH*0.5));
  S.ready[side]=up?S.ready[side]+dt:0;
  if(S.ready[side]>=0.5) readyNext();
}
function readyNext(){
  const side=S.readyStep; if(side>1) return;
  S.readyOk[side]=true; sfx('ding');
  S.readyStep++; renderReady();
  if(S.readyStep>1) S.after.push({t:S.T+0.9,fn:()=>{ if(S.screen==='duelReady') beginCountdown('duelPlay'); }});
}
function renderReady(){
  const st=S.readyStep;
  $('readyL').className='ready-side'+(S.readyOk[0]?' ok':(st===0?' now':''));
  $('readyR').className='ready-side'+(S.readyOk[1]?' ok':(st===1?' now':''));
  $('readyL').textContent=S.readyOk[0]?'左邊準備好了':(st===0?'左邊的人，舉手！':'等一下');
  $('readyR').textContent=S.readyOk[1]?'右邊準備好了':(st===1?'右邊的人，舉手！':'等一下');
}

/* ---------------- 畫面流程 ---------------- */
const OVER=['title','setup','days','calib','story','tip','hud','receipt','duelSetup','duelReady','duelEnd','trial'];
function show(...ids){ for(const id of OVER) $(id).classList.toggle('hidden',!ids.includes(id)); }
function setScreen(s){ S.screen=s; document.body.dataset.screen=s; }
function storyField(day){ return makeField(0,0,CW,{diff:cfg.diff,potato:8,small:6,rice:6,scare:day>=3,animals:DAYS[day-1].animals,risk:DAYS[day-1].risk}); }
function resetPlayState(){ S.log=[]; S.pops=[]; S.parts=[]; S.after=[]; S.banner=null; S.late=false; S.ended=false; S.sub=null; S.schedIdx=0; S.lastFlockEnd=-99; S.prevHands={}; }
function stopPlay(){ document.body.classList.remove('playing'); TR.keepAwake(false); music(false); }

function goTitle(){ AS.cancel(); resetPlayState(); stopPlay(); S.mode='story'; S.fields=[storyField(3)]; setScreen('title'); show('title'); }
function goSetup(){ setScreen('setup'); show('setup'); AS.applyPick(); }   // 入口計畫可能剛寫進來
async function needCamera(numHands){
  if(DEMO) return true;
  const ld=$('loading'); ld.style.display='flex';
  try{ $('loadMsg').textContent='正在載入手部偵測模型…'; await TR.initModel(numHands);
    $('loadMsg').textContent='正在開啟鏡頭…'; await TR.initCamera(); ld.style.display='none'; return true; }
  catch(err){ ld.style.display='none'; const denied=/denied|NotAllowed/i.test(err.name+err.message);
    alert(denied?'沒有拿到相機權限，所以沒辦法開始。\n\n請在跳出的詢問視窗按「允許」。\n若之前按過拒絕：請點網址列左邊的圖示 → 相機 → 允許，然後重新整理。'
               :'無法啟動：'+err.message+'\n\n請改用 Chrome（Android／電腦）或 Safari（iPhone／iPad）開啟。');
    goTitle(); return false; }
}
function loadProgress(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}')||{}; }catch(e){ return {}; } }
function saveProgress(day,stars,kept){ const p=loadProgress(); const o=p[day]||{};
  p[day]={stars:Math.max(o.stars||0,stars),best:Math.max(Math.min(DAY_MAX[day],o.best||0),kept),last:new Date().toISOString()};
  try{ localStorage.setItem(LS_KEY,JSON.stringify(p)); }catch(e){} }
function goDays(){
  resetPlayState(); stopPlay(); S.mode='story'; S.fields=[storyField(3)]; setScreen('days'); show('days');
  const p=loadProgress(), box=$('dayNodes'); box.innerHTML='';
  for(const d of DAYS){
    const b=document.createElement('button'); b.className='day-node'+(d.locked?' locked':'');
    const st=p[d.n]?p[d.n].stars:0;
    b.innerHTML=`<span class="dn">第 ${d.n} 天</span><span class="di">${d.icon}</span><span class="dt">${d.title}</span>`+
      (d.locked?'<span class="ds wip">製作中</span>':`<span class="ds">${st?'★'.repeat(st)+'☆'.repeat(3-st):'還沒玩'}</span>`);
    if(!d.locked) b.onclick=()=>startDay(d.n); else b.disabled=true;
    box.appendChild(b);
  }
  let week=0; for(const n of [1,2,3]) week+=Math.min(DAY_MAX[n],p[n]?p[n].best||0:0);
  $('weekFill').style.width=(week/WEEK_MAX*100).toFixed(1)+'%'; $('weekNum').textContent=`${week} / ${WEEK_MAX}`;
  $('daysSetting').textContent=`${cfg.side==='none'?'兩隻手':(cfg.side==='left'?'左手':'右手')}．${DIFF[cfg.diff].name}`;
}
function startDay(n){
  ensureAudio(); S.day=n; S.mode='story';
  if(!S.calib) return goCalib(n);
  goStory(n);
}
function goCalib(n){
  resetPlayState(); setScreen('calib'); show('calib'); S.calibSub='intro'; S.day=n||S.day;
  document.body.classList.add('playing'); TR.keepAwake(true);
  $('calibTitle').textContent='跟阿公伸伸懶腰'; $('calibText').innerHTML='坐遠一點，讓鏡頭拍到上半身。<br>舉起手，在空中畫一個大圈，畫多大都可以。';
  $('btnCalibStart').classList.remove('hidden'); $('btnCalibGo').classList.add('hidden'); $('btnCalibAgain').classList.add('hidden');
}
let storyLine=0;
function goStory(n){
  resetPlayState(); S.day=n||S.day; S.mode='story'; S.fields=[storyField(S.day)];
  setScreen('story'); show('story'); storyLine=0; renderStory();
}
function renderStory(){ const d=DAYS[S.day-1]; $('storyDay').textContent=`第 ${d.n} 天．${d.title}`;
  $('storyText').textContent=d.lines[storyLine]; $('storyCount').textContent=`${storyLine+1} / ${d.lines.length}`; }
function storyNext(){ const d=DAYS[S.day-1]; if(storyLine<d.lines.length-1){ storyLine++; renderStory(); } else toPractice(); }
function toPractice(){ if(AS.gate(beginPractice)) return; beginPractice(); }   // 選了個案、今天還沒試手：先「試手」
function beginPractice(){
  ensureAudio(); resetPlayState(); const d=DAYS[S.day-1]; S.mode='story'; S.fields=[storyField(S.day)];
  setScreen('practice'); show('tip','hud'); updateHud(true); document.body.classList.add('playing'); TR.keepAwake(true); setupDemoHands();
  $('tipText').textContent='練習：'+d.tip+'（不計時）'; $('btnTipSkip').textContent='跳過練習';
  const f=S.fields[0];
  S.practiceAnimal=d.practice==='boar'?spawnBoar(f,{practice:true}):(d.practice==='rat'?spawnRat(f,{practice:true}):spawnFlock(f,{practice:true}));
}
function practiceDone(){ $('tipText').textContent='做得好！準備開始守田。'; $('btnTipSkip').textContent='開始';
  S.after.push({t:S.T+1.3,fn:()=>{ if(S.screen==='practice') beginCountdown('play'); }}); }
function beginCountdown(scr){
  const keepFields=(scr==='duelPlay');
  resetPlayState();
  if(scr==='play'){ S.mode='story'; S.fields=[storyField(S.day)]; S.dur=DIFF[cfg.diff].dur; }
  else { S.mode='duel'; if(!keepFields||S.fields.length!==2) S.fields=duelFields(); S.dur=DUEL_DUR; S.schedule=makeSchedule(DUEL_DUR); }
  setScreen(scr); show('hud'); setupDemoHands(); document.body.classList.add('playing'); TR.keepAwake(true);
  S.sub='count'; S.countEnd=S.T+3; music(true); sfx('beep',660); updateHud(true);
  [1,2].forEach(k=>S.after.push({t:S.T+k,fn:()=>sfx('beep',660)}));
}
function endPlay(){
  if(S.ended) return; S.ended=true;
  for(const f of S.fields) for(const a of f.animals) if(a.type==='rat'&&a.carry){ a.carry=false; f.small=Math.min(f.max.small,f.small+1); }   // 收工時老鼠嘴上的地瓜掉回籃子
  for(const p of S.parts) if(p.type==='potato'&&!p.done){ p.done=true; p.f.small=Math.min(p.f.max.small,p.f.small+1); }
  sfx('fanfare'); music(false);
  S.after.push({t:S.T+1.2,fn:()=>{ S.screen==='duelPlay'?showDuelEnd():showReceipt(); }});
}
function duelFields(){ const fw=CW*0.03;
  return [ makeField(0,0,CW/2-fw/2,{diff:duelDiff[0],potato:5,small:4,rice:3,scare:true,color:'#2f7fd8'}),
           makeField(1,CW/2+fw/2,CW,{diff:duelDiff[1],potato:5,small:4,rice:3,scare:true,color:'#f08a24',mirror:true}) ]; }
function stars(f){ const day=DAYS[S.day-1]; let max=0,kept=0;
  for(const k of day.risk){ max+=f.max[k]; kept+=k==='potato'?f.potato.filter(Boolean).length:(k==='small'?f.small:f.rice.filter(Boolean).length); }
  const pct=max?kept/max:1; return {pct,stars:pct>=0.9?3:(pct>=0.6?2:1)}; }
function receiptHTML(f,o={}){
  const pot=f.potato.filter(Boolean).length, rice=f.rice.filter(Boolean).length, small=f.small;
  const best=f.rts.length?Math.min(...f.rts).toFixed(1)+' 秒':'–';
  return `<div class="rc-rows">
    ${f.risk.includes('potato')?`<div class="rc-row"><span>🍠 田裡的地瓜</span><b>${pot} / ${f.max.potato}</b></div>`:''}
    ${f.risk.includes('small')?`<div class="rc-row"><span>🧺 籃子裡的小地瓜</span><b>${small} / ${f.max.small}</b></div>`:''}
    ${f.risk.includes('rice')?`<div class="rc-row"><span>🌾 門口埕的稻穀</span><b>${rice} / ${f.max.rice}</b></div>`:''}
    <div class="rc-row total"><span>今天保住</span><b>${harvest(f)} / ${harvestMax(f)}</b></div></div>
    <div class="rc-stats"><div><small>趕走</small><b>${f.chased} 隻</b></div><div><small>最長連趕</small><b>${f.maxCombo}</b></div><div><small>最快出手</small><b>${best}</b></div><div><small>得分</small><b>${f.score}</b></div></div>`;
}
function showReceipt(){
  stopPlay(); const f=S.fields[0], d=DAYS[S.day-1], st=stars(f); f.animals=[];
  saveProgress(S.day,st.stars,harvest(f));
  S.result={kept:harvest(f),max:harvestMax(f),risk:f.risk.slice(),pot:f.potato.filter(Boolean).length,small:f.small,rice:f.rice.filter(Boolean).length,
    chased:f.chased,maxCombo:f.maxCombo,score:f.score,stars:st.stars,pct:st.pct,lost:{...f.lost}};
  setScreen('receipt'); show('receipt');
  $('rcTitle').textContent=`第 ${d.n} 天　收成單`;
  $('rcStars').innerHTML='<span class="on">'+'★'.repeat(st.stars)+'</span>'+'☆'.repeat(3-st.stars);
  $('rcBody').innerHTML=receiptHTML(f);
  $('rcGrandpa').textContent='阿公：「'+GP_LINES[st.stars]+'」';
  $('rcPreview').textContent=d.preview;
  $('btnNextDay').textContent=S.day<3?'下一天':'回日程';
  for(const g of S.log) if(!g.outcome) g.outcome='none';             // 收工時還在場上的動物：出場了，但沒趕也沒被偷
  AS.afterResult(f,S.log,{day:S.day,diff:cfg.diff,side:cfg.side,score:f.score,maxCombo:f.maxCombo,scareN:f.scareN||0,kept:harvest(f),max:harvestMax(f)});
}
function showDuelEnd(){
  stopPlay(); const [a,b]=S.fields, ha=harvest(a), hb=harvest(b); a.animals=[]; b.animals=[];
  let w=-1; if(ha!==hb) w=ha>hb?0:1; else if(a.chased!==b.chased) w=a.chased>b.chased?0:1;
  S.result={winner:w,harvest:[ha,hb],chased:[a.chased,b.chased],score:[a.score,b.score]};
  setScreen('duelEnd'); show('duelEnd');
  $('deBanner').textContent=w<0?'平手！兩邊都守得很好':(w===0?'左邊贏了！':'右邊贏了！');
  $('deBanner').className='de-banner '+(w<0?'tie':(w===0?'blue':'orange'));
  $('deL').innerHTML=`<h3>左邊．${DIFF[a.diff].name}</h3>`+receiptHTML(a)+(w===0?'<div class="win">勝</div>':'');
  $('deR').innerHTML=`<h3>右邊．${DIFF[b.diff].name}</h3>`+receiptHTML(b)+(w===1?'<div class="win">勝</div>':'');
}
function goDuelSetup(){ resetPlayState(); stopPlay(); S.mode='duel'; S.fields=duelFields(); setScreen('duelSetup'); show('duelSetup'); renderDuelSetup(); }
function renderDuelSetup(){
  for(const side of [0,1]){ const box=$(side?'dsR':'dsL'); box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.diff===duelDiff[side])); }
}
async function startDuel(){
  ensureAudio(); if(!await needCamera(4)) return;
  resetPlayState(); S.mode='duel'; S.fields=duelFields(); setScreen('duelReady'); show('duelReady','hud'); updateHud(true);
  S.ready=[0,0]; S.readyOk=[false,false]; S.readyStep=0; renderReady(); setupDemoHands();
  document.body.classList.add('playing'); TR.keepAwake(true);
}

/* ---------------- HUD ---------------- */
let hudT=-1;
function updateHud(force){
  if(!force&&performance.now()-hudT<150) return; hudT=performance.now();
  const duel=S.mode==='duel'&&S.fields.length===2;
  $('hudL').innerHTML=duel?`<small>左邊收成</small><b>${harvest(S.fields[0])}</b>`:`<small>今天收成</small><b>${S.fields[0]?harvest(S.fields[0]):0}</b>`;
  $('hudR').classList.toggle('hidden',!duel);
  if(duel) $('hudR').innerHTML=`<small>右邊收成</small><b>${harvest(S.fields[1])}</b>`;
  const showTime=(S.screen==='play'||S.screen==='duelPlay');
  $('timeWrap').style.visibility=showTime?'visible':'hidden';
  if(showTime){ const remain=S.sub==='run'?Math.max(0,S.dur-(S.T-S.playStart)):S.dur;
    $('timeFill').style.width=(remain/S.dur*100).toFixed(1)+'%'; $('timeWrap').classList.toggle('late',S.sub==='run'&&waveOf(S.T-S.playStart,S.dur)===3); }
  $('hudL').classList.toggle('blue',duel); $('hudR').classList.toggle('orange',duel);
}

/* ---------------- 主迴圈 ---------------- */
let lastNow=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=lastNow?Math.min(1,(now-lastNow)/1000):0; lastNow=now;
  resize(); pollCamera(now);
  let rem=dt; while(rem>1e-6){ const s=Math.min(1/30,rem); update(s); rem-=s; }
  draw(); if(!$('hud').classList.contains('hidden')) updateHud();
}

/* ---------------- 按鈕 ---------------- */
function seg(el,attr,fn){ el.onclick=e=>{ const b=e.target.closest('button'); if(!b||!b.dataset[attr])return;
  [...el.querySelectorAll('button')].forEach(x=>x.classList.remove('on')); b.classList.add('on'); fn(b.dataset[attr]); }; }
seg($('segHand'),'hand',v=>{ cfg.side=v==='both'?'none':v; });
seg($('segDiff'),'diff',v=>{ cfg.diff=v; $('diffHint').textContent=`每天 ${DIFF[v].dur} 秒`; AS.manualDiff(); });   // 玩家自己選的難度，入口推薦不再蓋回去
function setDiffUI(v){ cfg.diff=v; $('segDiff').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.diff===v)); $('diffHint').textContent=`每天 ${DIFF[v].dur} 秒`; }
$('diffHint').textContent=`每天 ${DIFF[cfg.diff].dur} 秒`;
$('dsL').onclick=e=>{ const b=e.target.closest('button'); if(b&&b.dataset.diff){ duelDiff[0]=b.dataset.diff; renderDuelSetup(); S.fields=duelFields(); } };
$('dsR').onclick=e=>{ const b=e.target.closest('button'); if(b&&b.dataset.diff){ duelDiff[1]=b.dataset.diff; renderDuelSetup(); S.fields=duelFields(); } };
$('btnStory').onclick=()=>{ ensureAudio(); goSetup(); };
$('btnDuel').onclick=()=>{ ensureAudio(); goDuelSetup(); };
$('btnSetupGo').onclick=async()=>{ ensureAudio(); if(await needCamera(cfg.side==='none'?2:1)) goDays(); };
$('btnDaysSetting').onclick=goSetup;
$('btnCalibStart').onclick=startCapture;
$('btnCalibAgain').onclick=()=>goCalib(S.day);
$('btnCalibGo').onclick=()=>goStory(S.day);
$('story').onclick=e=>{ if(e.target.closest('button')) return; storyNext(); };
$('btnStorySkip').onclick=e=>{ e.stopPropagation(); toPractice(); };
addEventListener('keydown',e=>{ if(S.screen==='story'&&(e.key===' '||e.key==='Enter')){ e.preventDefault(); storyNext(); } });
$('btnTipSkip').onclick=()=>{ if(S.screen==='practice') beginCountdown('play'); };
$('btnNextDay').onclick=()=>{ if(S.day<3) startDay(S.day+1); else goDays(); };
$('btnAgainDay').onclick=()=>beginCountdown('play');
$('btnDuelGo').onclick=startDuel;
$('btnReadySkip').onclick=()=>{ while(S.readyStep<=1) readyNext(); };
$('btnDuelAgain').onclick=()=>{ S.fields=duelFields(); beginCountdown('duelPlay'); };
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); goTitle(); });
$('btnSound').onclick=()=>{ cfg.sound=!cfg.sound; $('btnSound').textContent=cfg.sound?'🔊':'🔇'; ensureAudio(); if(AE) AE.setMuted(!cfg.sound); if(!cfg.sound) music(false); };
if(MUTE){ cfg.sound=false; $('btnSound').textContent='🔇'; }
$('btnRotateSkip').onclick=()=>document.body.classList.add('rot-ok');
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&document.body.classList.contains('playing')) TR.keepAwake(true); });
if(DEMO) document.body.classList.add('demo');
$('credit').textContent='♪ '+TR.MUSIC_CREDIT;
const gp=()=>{ const src=D.grandpaSrc(); document.querySelectorAll('.gp-img').forEach(im=>{ if(im.src!==src) im.src=src; }); };
gp(); D.onArt(n=>{ if(n==='grandpa') gp(); });

/* ---------------- 測試介面 ---------------- */
function animalList(){
  const out=[];
  for(const f of S.fields) for(const a of f.animals){
    if(a.type==='flock') for(const b of a.birds) out.push({type:'sparrow',id:b.id,flock:a.id,field:f.i,state:b.st,warn:!!a.warn,x:Math.round(b.x),y:Math.round(b.y)});
    else out.push({type:a.type==='boar'?a.kind:'rat',id:a.id,field:f.i,state:a.st,x:+a.x.toFixed(1),y:+a.y.toFixed(1),carry:!!a.carry,face:a.face,hop:a.hop?+a.hop.toFixed(1):0,sc:a.sc?+a.sc.toFixed(3):null,target:a.target});
  }
  return out;
}
function fieldState(f){ return {harvest:harvest(f),max:harvestMax(f),potato:f.potato.filter(Boolean).length,small:f.small,rice:f.rice.filter(Boolean).length,
  score:f.score,chased:f.chased,combo:f.combo,maxCombo:f.maxCombo,lost:{...f.lost},diff:f.diff,
  scarecrow:f.hasScare?{bells:f.scare.bells,max:f.scare.max,full:f.scare.full,hold:+f.scare.hold.toFixed(2),triggered:f.scare.animEnd>0,blockUntil:+f.scare.block.toFixed(2)}:null}; }
/* ---------------- 評估層接頭 ---------------- */
const AS=createAssess({ $, DEMO, TR, font:F, sprite:D.sprite, sfx:(n)=>sfx(n),
  getDiff:()=>cfg.diff, setDiff:setDiffUI, diffName:v=>DIFF[v].name, setHubHint:t=>{ const e=$('hubHint'); e.textContent=t; e.classList.toggle('hidden',!t); },
  aspect:()=>{ const v=TR.cam.video; return v&&v.videoWidth?v.videoWidth/v.videoHeight:4/3; },
  enterTrial:()=>{ resetPlayState(); setScreen('trial'); show('trial'); document.body.classList.add('playing'); TR.keepAwake(true); },
  exitTrial:()=>{ $('trial').classList.add('hidden'); } });
$('btnTrialSkip').onclick=()=>AS.skip();
$('btnTrialPain').onclick=()=>AS.reportPain();   // 試手時說肩膀會痛：不勉強
window.__dbg={
  state(){ const f=S.fields[0]||{};
    return { screen:S.screen, mode:S.mode, day:S.day, sub:S.sub, T:+S.T.toFixed(2), demo:DEMO, mute:MUTE,
      remain:(S.screen==='play'||S.screen==='duelPlay')&&S.sub==='run'?+Math.max(0,S.dur-(S.T-S.playStart)).toFixed(2):null,
      harvest:f.potato?harvest(f):null, score:f.score??null, fields:S.fields.map(fieldState), animals:animalList(),
      hands:S.hands.map(h=>({x:Math.round(h.x),y:Math.round(h.y),pl:h.pl})), result:S.result, art:D.artStatus(), size:[CW,CH] }; },
  advance(sec,step=1/30){ if(!DEMO) return 'advance 只在示範模式（?demo=1）可用';
    let n=Math.ceil(sec/step); while(n-->0) update(step); draw(); updateHud(true); return this.state(); },
  goto(name,o={}){
    if(o.day) S.day=o.day; if(o.diff) cfg.diff=o.diff; if(o.side) cfg.side=o.side;
    if(o.duelDiff){ duelDiff[0]=o.duelDiff[0]; duelDiff[1]=o.duelDiff[1]; }
    switch(name){
      case 'title': goTitle(); break; case 'setup': goSetup(); break; case 'days': goDays(); break;
      case 'calib': goCalib(S.day); break; case 'story': goStory(S.day); break; case 'practice': beginPractice(); break;
      case 'play': beginCountdown('play'); break;
      case 'receipt': beginCountdown('play'); S.sub='run'; S.playStart=S.T; endPlay(); S.after=[]; showReceipt(); break;
      case 'duelSetup': goDuelSetup(); break; case 'duelReady': startDuel(); break;
      case 'duelPlay': S.fields=duelFields(); beginCountdown('duelPlay'); break;
      case 'duelEnd': S.fields=duelFields(); beginCountdown('duelPlay'); S.sub='run'; S.playStart=S.T; endPlay(); S.after=[]; showDuelEnd(); break;
      default: return 'unknown screen';
    }
    draw(); return this.state(); },
  assess(){ let poleY=null; try{ poleY=Math.round(L(S.fields[0]).pole.y); }catch(e){}
    return { noPush:AS.noPush(), poleY, active:AS.active, state:AS.state, subject:AS.store.current(), sessions:AS.store.history((AS.store.current()||{}).code||'','boar'), plays:AS.loadPlays(), banned:AS.bannedCheck() }; },
  log(){ return S.log; },
  poke(x,y,pl=0){ S.poke={x,y,pl}; },
  hitPoint(id){ for(const f of S.fields) for(const a of f.animals) if(a.id===id) return {x:a.x,y:a.type==='boar'?a.y-a.r*0.55*(a.sc||1):a.y-(a.s||0)*0.18}; return null; },
  spawn(type,o={}){ const f=S.fields[o.field||0]; const a=type==='rat'?spawnRat(f,o):(type==='sparrow'?spawnFlock(f,o):spawnBoar(f,o)); return a.id; },
  demoIdle(on=true){ S.demoIdle=on; },
  setNoSpawn(on=true){ S.noSpawn=on; },
  setCalib(c){ S.calib=c||{minX:0.2,maxX:0.8,minY:0.2,maxY:0.8}; },
  layout(i=0){ const f=S.fields[i]; return f?JSON.parse(JSON.stringify(L(f),(k,v)=>typeof v==='function'?undefined:v)):null; }
};

resize(); goTitle(); requestAnimationFrame(frame);
spritesReadyNote();
function spritesReadyNote(){ D.spritesReady.then(()=>{ $('title').classList.add('ready'); }); }
