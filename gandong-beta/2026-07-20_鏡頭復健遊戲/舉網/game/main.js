/* 溪邊舉網（暫名）主程式：畫面流程、輸入、音訊。規則在 logic.js，3D 在 scene.js。
   v3（2026-11-11）：辦桌三道菜（每回合撈到金線就上菜，一～三星，沒到也不算失敗）、默契連擊→金魚潮、
   遊戲中「⏹ 結束」可隨時看成績、配樂改用釣魚的三首 CC0 曲輪流（最後 10 秒加速版）。 */
import {Stage} from './scene.js';
import {createGame,DIFF,ROUNDS,DISHES} from './logic.js?v=3';
import {createAssess,ASSESS_VOICES} from './assess-hook.js?v=2';   /* v2.1 評估層：選了個案才有試網與動作報告；v2.2 接感．動復能入口 */
const $=id=>document.getElementById(id), QS=new URLSearchParams(location.search);
const SILENT=QS.get('silent')==='1', DEMO=QS.get('demo')==='1', MUTE=QS.get('mute')==='1', SHORT=QS.get('short')==='1', PERF=QS.get('perf')==='1';
const clamp01=x=>Math.max(0,Math.min(1,x));
const store={get(k,d){try{return localStorage.getItem('jw_'+k)??d}catch(e){return d}},set(k,v){try{localStorage.setItem('jw_'+k,v)}catch(e){}}};

/* ---------- 設定 ---------- */
const cfg={diff:QS.get('diff')||store.get('diff','easy'),input:store.get('input','camera'),music:store.get('music','1')==='1',style:QS.get('style')==='soft'?'soft':'toon',
  togetherS:null,thrPct:null,nets:null};
const HINT={easy:'慢慢來，沒有倒數。舉一點點就算，3 秒內一起舉魚最多。每回合撈到金線就上一道菜。',normal:'一回合 30 秒，舉到一半高，2 秒內一起舉魚最多。每回合撈到金線就上一道菜。',hard:'一回合 30 秒，舉高一點，1 秒內一起舉。沒有語音，兩個人自己約。'};
const eff=()=>{const D=DIFF[cfg.diff];return{...D,togetherMs:cfg.togetherS?cfg.togetherS*1000:D.togetherMs,thr:cfg.thrPct?cfg.thrPct/100:D.thr,nets:D.nets==null?null:(cfg.nets||D.nets)};};

/* ---------- 3D ---------- */
const stage=new Stage($('c'),{style:cfg.style});
function fit(){ const w=Math.min(innerWidth,innerHeight*16/9),h=w*9/16,S=$('stage');if(w<10)return;S.style.width=w+'px';S.style.height=h+'px';document.documentElement.style.setProperty('--u',(w/100)+'px');stage.setSize(w,h); }
addEventListener('resize',fit);fit();
stage.setRound(0,true);

/* ---------- 音訊 ---------- */
const VOICES=['intro1','intro2','intro3','d1','d2','d3','up1','up2','up3','star2','star3','rush','small','early','try','tryok','ready','r1','r2','r3','come1','come2','come3','comeb','tog1','tog2','tog3','sin1','sin2','gold','big','crab','turtle','slipper','rest','away','down','end','talk',...ASSESS_VOICES];
/* 配樂（v3）：沿用釣魚 11-10 老闆選的三首 CC0 曲，每打完一場換下一首；最後 10 秒換同一首加速版，從同一拍接下去 */
const MUSIC_VOL=.26,BGM_KEY='jw_bgm_i';
const AE={ac:null,voice:{},speaking:false,queue:[],tracks:[],mb:{},cur:null,want:null,
  ti:(()=>{try{return Math.max(0,parseInt(localStorage.getItem(BGM_KEY),10)||0);}catch(e){return 0;}})(),
  init(){ if(MUTE)return;if(this.ac){if(this.ac.state==='suspended')this.ac.resume();return;}
    const C=window.AudioContext||window.webkitAudioContext;this.ac=new C();const a=this.ac;
    const out=a.createGain();out.gain.value=SILENT?0:1;out.connect(a.destination);this.out=out;
    this.sfx=a.createGain();this.sfx.gain.value=.55;this.sfx.connect(out);
    this.vg=a.createGain();this.vg.gain.value=1;this.vg.connect(out);
    this.mg=a.createGain();this.mg.gain.value=1;this.mg.connect(out);
    this.mv=a.createGain();this.mv.gain.value=MUSIC_VOL;this.mv.connect(this.mg);this.loadMusic();
    const n=a.sampleRate*2;this.noise=a.createBuffer(1,n,a.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const src=a.createBufferSource();src.buffer=this.noise;src.loop=true;const lp=a.createBiquadFilter();lp.type='bandpass';lp.frequency.value=900;lp.Q.value=.5;const g=a.createGain();g.gain.value=.055;src.connect(lp);lp.connect(g);g.connect(out);src.start();
    VOICES.forEach(v=>fetch(`voice/${v}.m4a`).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&a.decodeAudioData(b)).then(x=>{if(x)this.voice[v]=x;}).catch(()=>{}));
    this.birdLoop();
  },
  birdLoop(){ if(!this.ac)return;setTimeout(()=>{ if(this.ac&&this.ac.state==='running'&&phase!=='setup'){const f=2400+Math.random()*1400;[0,.14,.28].forEach(t=>this.tone(f*(1+t*.2),.09,.025,'sine',f*.8,t));}this.birdLoop();},6000+Math.random()*9000); },
  say(id,force=false){ if(!this.ac||!this.voice[id])return false;if(this.speaking&&!force)return false;const s=this.ac.createBufferSource();s.buffer=this.voice[id];s.connect(this.vg);this.speaking=true;this.duck(true);s.onended=()=>{this.speaking=false;if(this.queue.length)this.say(this.queue.shift(),true);else this.duck(false);};s.start();return true; },
  seq(ids){ if(!this.ac)return;this.queue=ids.slice(1);this.say(ids[0],true); },
  duck(on){ if(this.mg)this.mg.gain.setTargetAtTime(on?.38:1,this.ac.currentTime,.08); },
  async loadMusic(){ try{ const meta=await(await fetch('audio/music.json',{cache:'no-cache'})).json();this.tracks=meta.tracks||[];if(!this.tracks.length)return;this.ti%=this.tracks.length;this.loadTrack(this.ti);}catch(e){console.warn('音樂沒有載入',e);} },
  /* 只解碼目前這首（平常＋加速兩段） */
  async loadTrack(i){ const tr=this.tracks[i];if(!tr||!this.ac)return;this.mb={};
    await Promise.all(['main','final'].map(async k=>{ const f=tr[k];if(!f)return;let d=null;
      for(let n=0;n<3&&!d;n++){try{const r=await fetch(`audio/${f.file}`);if(r.ok)d=await this.ac.decodeAudioData(await r.arrayBuffer());}catch(e){}}
      if(this.ti!==i)return;if(d){this.mb[k]={buf:d,start:f.start,end:f.end};if(this.want===k&&!this.cur)this.music(k);}else console.warn('音樂沒有載入：'+tr.id+'/'+k); })); },
  nextTrack(){ if(!this.tracks.length)return;this.ti=(this.ti+1)%this.tracks.length;try{localStorage.setItem(BGM_KEY,String(this.ti));}catch(e){}if(this.ac&&!this.cur)this.loadTrack(this.ti); },
  /* name：main＝平常、final＝最後 10 秒加速版、null＝停 */
  music(name){ this.want=name;if(!this.ac)return;if(!cfg.music)name=null;if(this.cur&&this.cur.name===name)return;const t=this.ac.currentTime;const m=name&&this.mb[name];let off=m?m.start:0;
    if(this.cur){const c=this.cur;if(m&&c.name==='main'&&name==='final'){const len=c.end-c.start,pos=(((t-c.t0)+(c.off-c.start))%len+len)%len;off=m.start+pos*(m.end-m.start)/len;}
      c.g.gain.setTargetAtTime(0,t,.07);c.src.stop(t+.45);this.cur=null;}
    if(!m)return;const src=this.ac.createBufferSource(),g=this.ac.createGain();src.buffer=m.buf;src.loop=true;src.loopStart=m.start;src.loopEnd=m.end;
    g.gain.setValueAtTime(0,t);g.gain.setTargetAtTime(1,t,.05);src.connect(g);g.connect(this.mv);src.start(t,off);this.cur={name,src,g,t0:t,off,start:m.start,end:m.end}; },
  stopMusic(){ const w=this.want;this.music(null);this.want=w; },
  tone(f,dur,vol,type='sine',slide=0,delay=0){ if(!this.ac)return;const t=this.ac.currentTime+delay,o=this.ac.createOscillator(),g=this.ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.sfx);o.start(t);o.stop(t+dur+.02); },
  burst(freq,dur,vol,delay=0){ if(!this.ac)return;const a=this.ac,t=a.currentTime+delay,s=a.createBufferSource(),b=a.createBiquadFilter(),g=a.createGain();s.buffer=this.noise;b.type='bandpass';b.frequency.setValueAtTime(freq,t);b.frequency.exponentialRampToValueAtTime(freq*.4,t+dur);b.Q.value=.8;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(b);b.connect(g);g.connect(this.sfx);s.start(t,Math.random());s.stop(t+dur+.02); },
  raise(){ this.burst(700,.2,.22);this.tone(340,.12,.07,'triangle',470); },
  liftBig(){ this.burst(1100,.5,.75);this.burst(500,.7,.5,.05); },
  liftSmall(){ this.burst(900,.32,.42); },
  together(){ [523,659,784,1047].forEach((f,i)=>this.tone(f,.34,.22,'triangle',0,.08+i*.07)); },
  single(){ [523,659].forEach((f,i)=>this.tone(f,.26,.17,'triangle',0,.08+i*.09)); },
  land(i){ const sc=[392,440,523,587,659,784,880,1047,1175,1319];const f=sc[Math.min(i,sc.length-1)];this.tone(f,.15,.2,'triangle',f*.7);this.burst(1400,.09,.12); },
  bigFish(){ [196,262,330,392,523].forEach((f,i)=>this.tone(f,.42,.26,'triangle',0,i*.09)); },
  boing(){ this.tone(240,.36,.3,'sine',110);this.tone(480,.16,.08,'square',200); },
  splash(){ this.burst(800,.35,.45); },
  tick(){ this.tone(880,.14,.18,'triangle'); },
  fanfare(){ [523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.55,.26,'triangle',0,i*.15)); },
  /* 上菜：鑼一聲＋鼓兩下＋上行和弦 */
  gong(){ if(!this.ac)return;[110,165,221].forEach((f,i)=>this.tone(f,1.8,.22-i*.05,'sine',f*.97));this.burst(380,.9,.35);[0,.18].forEach(d=>{this.tone(90,.22,.4,'sine',55,.5+d);this.burst(220,.14,.3,.5+d);});[659,784,1047,1319].forEach((f,i)=>this.tone(f,.5,.18,'triangle',0,.9+i*.09)); },
  sparkle(){ [1319,1568,1760,2093,2637].forEach((f,i)=>this.tone(f,.3,.09,'sine',0,i*.06)); },
};
stage.onSfx=(k,b)=>{ if(k==='lift')b?AE.liftBig():AE.liftSmall();else if(k==='splash')AE.splash();else if(k==='thud')AE.boing(); };

/* ---------- 輸入：鏡頭（左右分區、pixel space One-Euro）、按鍵、模擬 ---------- */
function oneEuro(min=1,beta=.02,dcut=1){let xP=null,dxP=0,tP=null;const a=(c,dt)=>{const t=1/(2*Math.PI*c);return 1/(1+t/dt);};return{reset(){xP=null;dxP=0;tP=null;},f(x,t){if(xP===null){xP=x;tP=t;return x;}const dt=Math.max((t-tP)/1000,1e-3);tP=t;const dx=(x-xP)/dt,ad=a(dcut,dt),dh=ad*dx+(1-ad)*dxP;dxP=dh;const al=a(min+beta*Math.abs(dh),dt),xh=al*x+(1-al)*xP;xP=xh;return xh;}};}
const newP=()=>({euro:oneEuro(),sig:0,s01:0,valid:false,t:0,hand:null,calMin:-.85,calMax:.2,calibrated:false,minV:null,maxV:null,ok:false,key:0});
const pl={a:newP(),b:newP()};
let land=null,video=null,camReady=false,lastVT=-1,detTs=0,detMs=0,seen=0,mode='keys';
const L={LSH:11,RSH:12,LWR:15,RWR:16,LHIP:23,RHIP:24};
const vis=(lm,i)=>lm[i]&&(lm[i].visibility==null||lm[i].visibility>.3),mid=(lm,i,j)=>({x:(lm[i].x+lm[j].x)/2,y:(lm[i].y+lm[j].y)/2});
async function initModel(){ const{PoseLandmarker,FilesetResolver}=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  const mk=d=>PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",delegate:d},runningMode:"VIDEO",numPoses:2,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5});
  try{land=await mk("GPU");}catch(e){land=await mk("CPU");} }
async function initCamera(){ const st=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:960},height:{ideal:540},frameRate:{ideal:30},facingMode:'user'},audio:false});
  video=document.createElement('video');video.playsInline=true;video.muted=true;video.srcObject=st;await video.play();const pv=$('pvv');pv.srcObject=st;pv.play().catch(()=>{});
  try{const tr=st.getVideoTracks()[0],c=tr.getCapabilities?.();if(c&&c.zoom&&c.zoom.min!=null)await tr.applyConstraints({advanced:[{zoom:c.zoom.min}]});}catch(e){}camReady=true; }
function rawSignal(lm){ if(!vis(lm,L.LSH)||!vis(lm,L.RSH))return null;const sh=mid(lm,L.LSH,L.RSH);let t=.25;if(vis(lm,L.LHIP)&&vis(lm,L.RHIP)){const h=mid(lm,L.LHIP,L.RHIP);t=Math.max(.08,Math.hypot(h.x-sh.x,h.y-sh.y));}
  const lh=vis(lm,L.LWR)?(sh.y-lm[L.LWR].y)/t:null,rh=vis(lm,L.RWR)?(sh.y-lm[L.RWR].y)/t:null;if(lh==null&&rh==null)return null;return{v:Math.max(lh??-9,rh??-9),hand:(lh??-9)>=(rh??-9)?'L':'R'}; }
function trackPoses(now){ if(!land||!camReady||video.currentTime===lastVT)return;lastVT=video.currentTime;detTs=Math.max(detTs+1,now);const t0=performance.now();let res;try{res=land.detectForVideo(video,detTs);}catch(e){return;}detMs=detMs?detMs*.9+(performance.now()-t0)*.1:performance.now()-t0;
  const cand=[];for(const lm of(res&&res.landmarks)||[]){if(!vis(lm,L.LSH)||!vis(lm,L.RSH))continue;cand.push({lm,sx:1-mid(lm,L.LSH,L.RSH).x});}cand.sort((p,q)=>p.sx-q.sx);seen=cand.length;
  let A=null,B=null;if(cand.length===1){if(cand[0].sx<.5)A=cand[0];else B=cand[0];}else if(cand.length>=2){A=cand[0];B=cand[cand.length-1];}applyPose('a',A,now);applyPose('b',B,now); }
function applyPose(k,c,now){ AS.pose(k,c&&c.lm,now);const P=pl[k];if(!c){if(now-P.t>300){P.valid=false;}return;}const r=rawSignal(c.lm);if(!r){if(now-P.t>300)P.valid=false;return;}if(now-P.t>300)P.euro.reset();
  P.sig=P.euro.f(r.v*1000,now)/1000;P.hand=r.hand;P.t=now;P.valid=true;
  if(phase==='calib'){if(P.minV==null){P.minV=P.maxV=P.sig;}P.minV=Math.min(P.minV,P.sig);P.maxV=Math.max(P.maxV,P.sig);P.s01=clamp01((P.sig-P.minV)/Math.max(P.maxV-P.minV,.8));if(P.maxV-P.minV>=.45)markOk(k);}
  else P.s01=clamp01((P.sig-P.calMin)/Math.max(P.calMax-P.calMin,.3)); }
function applyKey(k,dt){ const P=pl[k];P.valid=true;P.s01=clamp01(P.s01+(P.key-P.s01)*Math.min(1,dt*7));P.hand=k==='a'?'L':'R';if(phase==='calib'&&P.s01>.8)markOk(k); }
function bindKey(btn,k){ const on=e=>{e.preventDefault();pl[k].key=1;btn.classList.add('on');AE.init();},off=e=>{pl[k].key=0;btn.classList.remove('on');};btn.addEventListener('pointerdown',on);addEventListener('pointerup',off);addEventListener('pointercancel',off); }
bindKey($('kA'),'a');bindKey($('kB'),'b');
const KEYMAP={a:'a',A:'a',ArrowLeft:'a',l:'b',L:'b',ArrowRight:'b'};
addEventListener('keydown',e=>{const k=KEYMAP[e.key];if(k&&mode==='keys'){pl[k].key=1;$(k==='a'?'kA':'kB').classList.add('on');}});addEventListener('keyup',e=>{const k=KEYMAP[e.key];if(k&&mode==='keys'){pl[k].key=0;$(k==='a'?'kA':'kB').classList.remove('on');}});

/* ---------- 模擬玩家（?demo=1）：一起舉、單人、一起舉晚一點輪流出現 ---------- */
const demo={plan:new Map()};
function demoDrive(dt,t){ for(const k of['a','b'])pl[k].key=0;
  if(phase==='calib'){const up=phaseT>.5&&phaseT<2;pl.a.key=up?1:0;pl.b.key=phaseT>1&&phaseT<2.5?1:0;return;}
  if(phase!=='play'||!game)return;
  const sc=game.schools.find(s=>s.state==='zone');
  if(sc){const P=[['both',.7],['both',.2],['a',.4],['both',1.3],['b',.5],['both',.4]][sc.id%6],z=sc.zoneT/1000;if(P[0]!=='b'&&z>.6)pl.a.key=1;if(P[0]==='b'&&z>.6)pl.b.key=1;if(P[0]==='both'&&z>.6+P[1])pl.b.key=1;}
  else{pl.a.key=0;pl.b.key=0;}
}

/* ---------- 畫面流程 ---------- */
let quitOpen=false,rLanded=0,pendStars=[],servedAt=0,lastRound=null;
let phase='setup',phaseT=0,game=null,landed=0,goldN=0,landStep=0,roundEndWait=0,paused=false,awayT=0,downSaid=false,comeCount=0,togCount=0,sinCount=0,restLeft=0,REST=SHORT?2.5:15,capT=0,talkI=0;
const TALKS=['以前有沒有在溪邊抓過魚？','小時候抓魚，都跟誰一起去？','抓到的魚，家裡都怎麼煮？'];
const show=(id,on=true)=>$(id).classList.toggle('hide',!on);
function cap(t,ms=1700){ const c=$('caption');c.textContent=t;c.classList.add('on');capT=ms/1000; }
function setPhase(p){ phase=p;phaseT=0;
  show('setup',p==='setup');show('assess',p==='assess');show('loading',p==='loading');show('rest',p==='rest');show('end',p==='end');show('calib',p==='calib');show('skip',p==='intro');
  const playing=p==='play'||p==='roundIntro'||p==='rest';show('hudL',playing||p==='calib'&&false);show('hudR',playing);show('tools',playing||p==='calib');show('bQuit',playing);if(!playing)closeQuit();
  show('keys',mode==='keys'&&(p==='calib'||p==='play'||p==='roundIntro'));
  const pv=$('pv');const camPv=mode==='camera'&&camReady&&(p==='calib'||p==='play'||p==='roundIntro');pv.classList.toggle('big',p==='calib');show('pv',camPv&&(p==='calib'||pvOn));$('bPv').classList.toggle('hide',mode!=='camera');
  if(p==='setup'){stage.setIntro(1);}
}
let pvOn=true;
function markOk(k){ const P=pl[k];if(P.ok)return;P.ok=true;$(k==='a'?'lA':'lB').classList.add('ok');$(k==='a'?'lA':'lB').textContent=(k==='a'?'左邊':'右邊')+' ✓';AE.tick();if(!(pl.a.ok&&pl.b.ok))AE.say('tryok'); }
function finishCalib(){ for(const k of['a','b']){const P=pl[k];if(mode==='camera'&&P.ok){P.calMin=P.minV;P.calMax=Math.max(P.maxV,P.minV+.6);P.calibrated=true;}}beginRound(); }
async function startFlow(){ AE.init();store.set('diff',cfg.diff);store.set('input',cfg.input);store.set('music',cfg.music?'1':'0');mode=DEMO?'keys':cfg.input;
  if(mode==='camera'&&!camReady){ setPhase('loading');$('loadMsg').textContent='正在開鏡頭';const slow=setTimeout(()=>{$('loadSub').textContent='網路比較慢，還在載入。也可以先用按鍵試玩。';show('bLoadKeys',true);},20000);
    try{ if(!video)await initCamera();$('loadMsg').textContent='正在載入偵測模型';if(!land)await initModel();clearTimeout(slow);}
    catch(e){clearTimeout(slow);console.error(e);$('loadMsg').textContent='鏡頭沒有開成功';$('loadSub').textContent='請確認瀏覽器允許使用鏡頭，或先用按鍵試玩。';show('bLoadKeys',true);return;}
    if(phase!=='loading')return; }
  startIntro(); }
function startIntro(){ newGame();setPhase('intro');AE.music('main');AE.seq(['intro1','intro2','intro3']); }
function newGame(){ const E=eff(),over={togetherMs:E.togetherMs,thr:E.thr,thrBy:AS.thrBy(E.thr)};if(E.nets!=null)over.nets=SHORT?3:E.nets;if(SHORT&&E.roundMs){over.roundMs=14000;}
  game=createGame({diff:cfg.diff,sStart:stage.sStart,sZone:stage.sZone,sEnd:stage.sEnd,over});landed=0;goldN=0;rLanded=0;pendStars.length=0;comeCount=togCount=sinCount=0;$('nFish').textContent='0';$('nGold').textContent='';hudDish(0);stage.resetPile();stage.clearAll();ambient.list.length=0;stage.setRound(0,true);
  for(const k of['a','b']){const P=pl[k];P.ok=false;P.minV=P.maxV=null;P.s01=0;$(k==='a'?'lA':'lB').classList.remove('ok');$(k==='a'?'lA':'lB').textContent=k==='a'?'左邊':'右邊';} }
function startCalib(){ stage.setIntro(1);setPhase('calib');AE.say('try',true); }
function beginRound(){ if(game.round===0&&AS.gate(beginRound))return;ambient.leave();const r=game.round;stage.setRound(r);setPhase('roundIntro');AE.seq([['r1','r2','r3'][r],['d1','d2','d3'][r]]);AE.music('main');
  rLanded=0;pendStars.length=0;hudDish(r);cap(`第 ${r+1} 道菜：${DISHES[r]}｜撈到 ${game.goal()[0]} 條就上菜`,3600);hudR(); }
/* 左上：這一道菜的進度條（金線＝上菜，再過去是二星、三星） */
function hudDish(r){ if(!game)return;const G=game.goal(),n=Math.min(rLanded,G[2]);$('hDish').textContent=`第 ${r+1} 道・${DISHES[r]||''}`;const st0=game.starsOf(rLanded);$('hCnt').innerHTML=st0===0?`撈到 <b>${rLanded}</b>／${G[0]} 條就上菜`:st0===1?`<b>${rLanded}</b> 條・已上菜！${G[1]} 條兩顆星`:st0===2?`<b>${rLanded}</b> 條・${G[2]} 條三顆星`:`<b>${rLanded}</b> 條・三顆星滿分！`;
  $('hFill').style.width=(100*n/G[2])+'%';$('t1').style.left=(100*G[0]/G[2])+'%';$('t2').style.left=(100*G[1]/G[2])+'%';
  const st=game.starsOf(rLanded);$('hStars').textContent='★'.repeat(st)+'☆'.repeat(3-st);$('hudL').classList.toggle('served',st>=1);
  const c=game.combo||0;$('hCombo').innerHTML=game.rushNext?'<b>金魚潮游過來了！</b>':`默契 ${'●'.repeat(c)}${'○'.repeat(3-c)}${c===2?' <b>再一網一起舉→金魚潮</b>':''}`; }
/* 上菜橫幅：一星＝過關上菜；二、三星只出字幕 */
function serve(n){ const r=game.round-1;servedAt=performance.now();
  if(n===1){ capT=0;$('caption').classList.remove('on');$('sImg').src=`dish/dish${r+1}.jpg`;$('sT').textContent='過關！';$('sD').textContent=`${DISHES[r]}上桌囉`;show('serve',true);$('serve').classList.remove('pop');void $('serve').offsetWidth;$('serve').classList.add('pop');
    AE.gong();AE.queue=[];AE.say(['up1','up2','up3'][r],true);stage.cheerT=3; setTimeout(()=>show('serve',false),3400); }
  else{ cap(n===2?'兩顆星！總舖師很滿意':'三顆星！總舖師笑得合不攏嘴',2600);AE.fanfare();if(game.cfg.voice)AE.say(n===2?'star2':'star3',true); } }
function hudR(){ if(!game)return;const r=Math.max(game.round,1);const c=game.cfg;let s=`第 ${r}／${ROUNDS} 回合`;if(c.nets!=null)s+=`・還有 ${Math.max(0,c.nets-game.netsDone)} 網`;else if(game.active)s+=`・${Math.ceil(game.remainMs()/1000)} 秒`;$('hudR').textContent=s; }
function backToSetup(){ AS.cancel();AE.music(null);closeQuit();show('serve',false);game=null;stage.clearAll();stage.resetPile();ambient.list.length=0;stage.setRound(0,true);AE.queue=[];setPhase('setup');pl.a.s01=pl.b.s01=0;show('away',false);paused=false; }
function showEnd(){ const R=game.report();setPhase('end');show('serve',false);show('eReport',false);$('eFish').textContent=R.fishTotal;
  const served=R.perRound.filter(x=>x.stars>=1).length;$('eTitle').textContent=R.early?'今天先撈到這裡（提前結束）':'今晚辦桌';$('eServed').textContent=`上了 ${R.perRound.length} 道菜，${R.stars} 顆星`;
  $('eDishes').innerHTML=DISHES.map((d,i)=>{const x=R.perRound[i];if(!x)return`<div class="dish off"><img src="dish/dish${i+1}.jpg" alt=""><div class="dn">${d}</div><div class="ds">下次再撈</div></div>`;
    return`<div class="dish"><img src="dish/dish${i+1}.jpg" alt=""><div class="dn">${d}</div><div class="ds">${'★'.repeat(x.stars)}${'☆'.repeat(3-x.stars)}</div><div class="df">${x.fish} 條${x.stars?'':'・小份量'}</div></div>`;}).join('');
  AE.music(null);AE.nextTrack();const c=R.counts,bits=[];if(c.gold)bits.push(`金魚 ${c.gold} 條`);if(c.big)bits.push(`大魚 ${c.big} 條`);if(c.crab)bits.push(`螃蟹 ${c.crab} 隻`);if(c.turtle)bits.push(`放生烏龜 ${c.turtle} 隻`);if(c.slipper)bits.push(`藍白拖 ${c.slipper} 隻`);bits.push(`一起舉 ${R.together} 次`);bits.push(`總分 ${R.score}`);
  if(R.rushes)bits.push(`金魚潮 ${R.rushes} 次`);$('eStats').innerHTML=bits.map(b=>`<span>${b}</span>`).join('');
  talkI=0;$('eTalk').textContent=TALKS[0];stage.cheerT=5;AE.fanfare();AE.seq([R.early?'early':'end','talk']);
  const pct=x=>x==null?'—':Math.round(x*100)+'%',rows=(n,p)=>`<tr><td>${n}</td><td>${p.lifts}</td><td>${pct(p.avgHeight)}</td><td>${pct(p.maxHeight)}</td><td>左 ${p.hands.L}／右 ${p.hands.R}</td><td>${p.singleNets}</td></tr>`;
  $('eReport').innerHTML=`<table><tr><th>位置</th><th>舉手次數</th><th>平均高度</th><th>最高</th><th>用哪隻手</th><th>單獨撈到</th></tr>${rows('左邊',R.left)}${rows('右邊',R.right)}</table>
    <table><tr><th>回合</th><th>菜</th><th>撈到</th><th>星星線</th><th>星數</th><th>網數</th></tr>${R.perRound.map(x=>`<tr><td>${x.round}${x.partial?'（提前結束）':''}</td><td>${x.dish}</td><td>${x.fish} 條</td><td>${x.goal.join('／')}</td><td>${x.stars}</td><td>${x.nets}</td></tr>`).join('')}</table>
    <table><tr><th>難度</th><th>共撈幾網</th><th>一起舉</th><th>比例</th><th>兩人舉手間隔</th><th>魚游走</th><th>魚沒到就舉</th></tr><tr><td>${R.diff}</td><td>${R.nets}</td><td>${R.together}</td><td>${pct(R.togetherRatio)}</td><td>${R.avgGapMs==null?'—':(R.avgGapMs/1000).toFixed(1)+' 秒'}</td><td>${R.passed} 波</td><td>${R.emptyLifts} 次</td></tr></table>
    <div class="hint">高度是占每人校正範圍的比例。用鏡頭校正才有意義；按鍵試玩的數字沒有臨床意義。</div>`;
  AS.afterResult(R); }
/* 事件 */
function handleEvents(evs){ for(const e of evs){ switch(e.type){
  case 'raise':AE.raise();break;
  case 'fishNear':if(game.cfg.voice){comeCount++;const v=e.school.bonus?'comeb':comeCount===1?'ready':comeCount===2?'come1':comeCount%3===0?'come3':comeCount%3===1?'come2':null;if(v)AE.say(v);}break;
  case 'scoop':onScoop(e);break;
  case 'roundEnd':roundEndWait=SHORT?1.2:2.2;lastRound=e;break;
  case 'star':pendStars.push({n:e.n,at:performance.now()});break;
  case 'rushSpawn':cap('默契十足！金魚潮游過來了',2800);AE.sparkle();if(game.cfg.voice)AE.say('rush',true);hudDish(game.round-1);break;
}}}
function onScoop(e){ landStep=0;stage.scoop(e);setTimeout(()=>{if(game&&game.round)hudDish(game.round-1);},50);const both=e.kind==='together',kinds=e.items.map(i=>i.kind);const sp=['big','turtle','slipper','crab','gold'].find(k=>kinds.includes(k));
  if(both){AE.together();togCount++;}else{AE.single();sinCount++;}
  const TXT={big:'哇，大魚！',turtle:'是烏龜，放牠回去',slipper:'咦，怎麼撈到藍白拖？',crab:'螃蟹也跑進來了',gold:'有金魚！'};
  if(sp){cap(TXT[sp],2100);if(sp==='big')setTimeout(()=>AE.bigFish(),500);if(game.cfg.voice)setTimeout(()=>AE.say(sp,true),420);}
  else if(both){cap(['一起舉，魚好多！','滿滿一網！','配合得真好！'][togCount%3]);if(game.cfg.voice&&togCount%2===1)AE.say(['tog1','tog2','tog3'][(togCount>>1)%3]);}
  else{cap('有撈到喔，下一波一起舉看看',2000);if(game.cfg.voice&&sinCount%2===1)AE.say(['sin1','sin2'][(sinCount>>1)%2]);}
}
stage.onLand=k=>{ if(k==='fish'||k==='gold'||k==='big'){landed++;rLanded++;if(game&&game.round)hudDish(game.round-1);}if(k==='gold'){goldN++;$('nGold').textContent=`金魚 ${goldN}`;}if(k!=='turtle'&&k!=='slipper'){AE.land(landStep++);} };

/* 背景魚：設定、開場、校正、休息時也有魚游 */
function handoverFish(){ if(!game)return;for(const s of game.schools){if(s.state==='swim'||s.state==='zone')s.state='passed';ambient.list.push(s);}game.schools.length=0; }
const ambient={list:[],next:0,id:100000,leave(){for(const s of this.list)s.state='passed';},drain(dt){for(const s of this.list)s.s+=3.4*dt;this.list=this.list.filter(s=>s.s<stage.sEnd);},step(dt){ this.next-=dt;if(this.next<=0){this.next=7;this.list.push({id:this.id++,s:stage.sStart,state:'swim',size:7,gold:Math.random()<.4?1:0,bonus:false});}for(const s of this.list)s.s+=2.6*dt;this.list=this.list.filter(s=>s.s<stage.sEnd);}};

/* ---------- 主迴圈 ---------- */
let fpsA=60,last=performance.now();
function tick(dt,t){ phaseT+=dt;
  if(DEMO)demoDrive(dt,t);
  if(mode==='camera')trackPoses(t);else{applyKey('a',dt);applyKey('b',dt);}
  const tA=game?game.thrOf('a'):.3,tB=game?game.thrOf('b'):.3,dA=pl.a.valid?clamp01(pl.a.s01/tA):0,dB=pl.b.valid?clamp01(pl.b.s01/tB):0;
  const liveHands=phase==='calib'||phase==='play'||phase==='roundIntro';stage.setHands(liveHands?dA:0,liveHands?dB:0);
  if(capT>0){capT-=dt;if(capT<=0)$('caption').classList.remove('on');}
  switch(phase){
    case 'setup':ambient.step(dt);stage.syncSchools(ambient.list);if(DEMO&&phaseT>.4)startFlow();break;
    case 'intro':{const D=(DEMO||SHORT)?2:10.2;stage.setIntro(phaseT/D);ambient.step(dt);stage.syncSchools(ambient.list);if(phaseT>=D)startCalib();break;}
    case 'calib':ambient.step(dt);stage.syncSchools(ambient.list);if(pl.a.ok&&pl.b.ok&&pl.a.s01<.5&&pl.b.s01<.5){if((calibWait+=dt)>1.2)finishCalib();}else calibWait=0;break;
    case 'assess':ambient.step(dt);stage.syncSchools(ambient.list);AS.step(t,dt);break;
    case 'roundIntro':ambient.drain(dt);stage.syncSchools(ambient.list);if(quitOpen){phaseT-=dt;break;}if(phaseT>=(SHORT||DEMO?.6:3)){game.startRound();handleEvents(game.events.slice());game.events.length=0;setPhase('play');}break;
    case 'play':{
      if(quitOpen)break;
      /* 星星：魚落進竹簍、數字跟上了才上菜（最多等 2 秒） */
      if(pendStars.length&&game){const p=pendStars[0];if(rLanded>=game.goal()[p.n-1]||performance.now()-p.at>2000){pendStars.shift();rLanded=Math.max(rLanded,game.goal()[p.n-1]);hudDish(game.round-1);serve(p.n);}}
      /* 最後 10 秒（普通、困難）或簡單最後兩網：換加速版配樂 */
      if(game&&game.active){const rm=game.remainMs();if((rm!=null&&game.firstIn&&rm<=10000)||(game.cfg.nets!=null&&game.cfg.nets-game.netsDone<=2))AE.music('final');}
      if(mode==='camera'&&!pl.a.valid&&!pl.b.valid){awayT+=dt;if(awayT>3&&!paused){paused=true;show('away',true);AE.say('away');}}else{awayT=0;if(paused){paused=false;show('away',false);}}
      if(!paused){const ev=game.tick(dt*1000,{a:{valid:pl.a.valid,s01:pl.a.s01,hand:pl.a.hand},b:{valid:pl.b.valid,s01:pl.b.s01,hand:pl.b.hand}});handleEvents(ev.slice());ambient.drain(dt);stage.syncSchools(game.schools.concat(ambient.list));hudR();
        if(!downSaid&&game.cfg.voice)for(const k of['a','b'])if(game[k].st==='high'&&game[k].raiseUsed&&game.t-game[k].upAt>7000){AE.say('down');downSaid=true;}
        if(!game.active){roundEndWait-=dt;if(roundEndWait<=0&&!stage.flying.length){handoverFish();if(pendStars.length){for(const p of pendStars.splice(0))serve(p.n);}rLanded=game.roundFish;hudDish(game.round-1);
          if(game.isOver())showEnd();else{const lr=game.stats.perRound[game.stats.perRound.length-1];setPhase('rest');restLeft=REST;stage.setRound(game.round);
            $('restDish').innerHTML=`<img src="dish/dish${lr.round}.jpg" alt=""><div><b>${lr.dish}</b> ${'★'.repeat(lr.stars)}${'☆'.repeat(3-lr.stars)}<br>${lr.stars?'上桌了！':'份量小一點，總舖師說也很好吃'}　撈到 ${lr.fish} 條</div>`;
            if(lr.stars===0){AE.seq(['small','rest']);}else AE.say('rest',true);downSaid=false;}}}}
      break;}
    case 'rest':ambient.step(dt);stage.syncSchools(ambient.list);if(quitOpen)break;restLeft-=dt;$('restBar').style.width=(100*(1-restLeft/REST))+'%';if(restLeft<=0)beginRound();break;
    case 'end':if(Math.random()<dt*1.4){stage.splash(0,.9,2.9,4,.7);}ambient.step(dt);stage.syncSchools(ambient.list);break;
  }
  stage.update(dt);
  if(PERF){$('perf').textContent=`畫面 ${fpsA.toFixed(0)} fps｜偵測 ${detMs.toFixed(0)} ms｜看到 ${seen} 人`;}
}
let calibWait=0;
function frame(){ requestAnimationFrame(frame);const t=performance.now(),dt=Math.min(.05,(t-last)/1000);last=t;if(dt>0)fpsA=fpsA*.95+(1/dt)*.05;tick(dt,t);stage.render(); }

/* ---------- 評估層（v2.1；v2.2 接感．動復能入口）：設定頁「左邊／右邊誰在玩」、開局前試網、結算頁動作報告 ---------- */
const AS=createAssess({ver:'v2.2',$,AE,demo:DEMO,setPhase,back:backToSetup,phase:()=>phase,mode:()=>mode,diff:()=>cfg.diff,
  aspect:()=>video&&video.videoWidth?video.videoWidth/video.videoHeight:16/9, stream:()=>$('pvv').srcObject||null});

/* ---------- 設定畫面 ---------- */
function syncSetup(){ document.querySelectorAll('#oDiff button').forEach(b=>b.classList.toggle('on',b.dataset.v===cfg.diff));document.querySelectorAll('#oInput button').forEach(b=>b.classList.toggle('on',b.dataset.v===cfg.input));
  const E=eff(),custom=cfg.togetherS||cfg.thrPct||cfg.nets;$('hDiff').textContent=(custom?'自訂：':'')+HINT[cfg.diff];
  $('aT').value=E.togetherMs/1000;$('aTv').textContent=(E.togetherMs/1000)+' 秒';$('aH').value=Math.round(E.thr*100);$('aHv').textContent=Math.round(E.thr*100)+'%';$('aN').value=E.nets||8;$('aNv').textContent=(E.nets||'—');$('aN').disabled=E.nets==null;
  $('aS').textContent=cfg.style==='toon'?'手繪描邊（按一下換柔和）':'柔和（按一下換描邊）';$('aM').textContent=cfg.music?'開':'關'; }
document.querySelectorAll('#oDiff button').forEach(b=>b.onclick=()=>{cfg.diff=b.dataset.v;cfg.togetherS=cfg.thrPct=cfg.nets=null;syncSetup();});
document.querySelectorAll('#oInput button').forEach(b=>b.onclick=()=>{cfg.input=b.dataset.v;syncSetup();});
$('aT').oninput=e=>{cfg.togetherS=+e.target.value;syncSetup();};$('aH').oninput=e=>{cfg.thrPct=+e.target.value;syncSetup();};$('aN').oninput=e=>{cfg.nets=+e.target.value;syncSetup();};
$('aS').onclick=()=>{const q=new URLSearchParams(location.search);q.set('style',cfg.style==='toon'?'soft':'toon');location.search=q.toString();};
$('aM').onclick=()=>{cfg.music=!cfg.music;syncSetup();};
$('bStart').onclick=startFlow;
$('bSkip').onclick=()=>{AE.queue=[];startCalib();};
$('bGoCal').onclick=finishCalib;
for(const id of['bSet','bBack2','bBack3','bBack4','bBack5'])$(id).onclick=backToSetup;
$('bLoadKeys').onclick=()=>{cfg.input='keys';mode='keys';startIntro();};
$('bRestGo').onclick=()=>beginRound();
$('bMusic').onclick=()=>{cfg.music=!cfg.music;store.set('music',cfg.music?'1':'0');AE.music(AE.want||'main');};
$('bPv').onclick=()=>{pvOn=!pvOn;show('pv',pvOn);};
/* 隨時結束（v3）：先問一次，按「看成績」就把這一回合照目前撈到的算，直接到結算頁；成績與動作報告都保留 */
function openQuit(){ if(!game||!(phase==='play'||phase==='roundIntro'||phase==='rest'))return;quitOpen=true;show('quit',true); }
function closeQuit(){ quitOpen=false;const q=$('quit');if(q)q.classList.add('hide'); }
function confirmQuit(){ closeQuit();if(!game)return;if(game.round===0){backToSetup();return;}AE.queue=[];game.finishEarly();handoverFish();showEnd(); }
$('bQuit').onclick=openQuit;$('bQuitYes').onclick=confirmQuit;$('bQuitNo').onclick=closeQuit;
addEventListener('keydown',e=>{if(e.key==='Escape'){if(quitOpen)closeQuit();else openQuit();}});
$('bAgain').onclick=()=>{AE.queue=[];startIntro();};
$('bReport').onclick=()=>{$('eReport').classList.toggle('hide');};
$('bNextTalk').onclick=()=>{talkI=(talkI+1)%TALKS.length;$('eTalk').textContent=TALKS[talkI];};
show('perf',PERF);syncSetup();setPhase('setup');frame();

/* 測試介面（面板隱藏時 rAF 不跑，可手動推進） */
window.__app={stage,pl,cfg,step(dt=1/60,n=1){for(let i=0;i<n;i++){tick(dt,performance.now());}stage.render();},
  get phase(){return phase},get game(){return game},assess:AS,openQuit,confirmQuit,get quitOpen(){return quitOpen},get music(){return{cur:AE.cur&&AE.cur.name,want:AE.want,track:AE.tracks[AE.ti]&&AE.tracks[AE.ti].id,loaded:Object.keys(AE.mb)}},get rLanded(){return rLanded},
  /* 測試用假鏡頭：fn() 回傳這一格的骨架陣列（每人 33 點），走真正的分人、濾波、校正與量測路徑 */
  stubCam(fn){ camReady=true;video={get currentTime(){return Math.floor(performance.now()/33)},videoWidth:960,videoHeight:540};land={detectForVideo:()=>({landmarks:fn()})}; },get landed(){return landed},start(o={}){Object.assign(cfg,o);syncSetup();return startFlow();},hold(k,v){pl[k].key=v;},report(){return game&&game.report();},setPhase,beginRound,finishCalib,startCalib,stats(){const r=stage.renderer.info.render;return{calls:r.calls,tris:r.triangles,fps:+fpsA.toFixed(0),pile:stage.pile};}};
