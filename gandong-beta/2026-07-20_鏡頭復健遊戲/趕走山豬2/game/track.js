/* 趕走山豬 2：鏡頭、手部偵測、濾波、音效
   沿用舊版 打地鼠_民眾版.html 的 oneEuro、palmCenter、相機與模型設定、音效引擎，
   另外補上吱吱、啾啾、鈴鐺、預兆聲（全部 WebAudio 合成）。 */

/* ---------------- One-Euro 濾波（沿用舊版） ---------------- */
export function oneEuro(min=1.0,beta=0.02,dcut=1.0){
  let xP=null,dxP=0,tP=null; const a=(c,dt)=>{const t=1/(2*Math.PI*c);return 1/(1+t/dt);};
  return { reset(){xP=null;dxP=0;tP=null;},
    f(x,t){ if(xP===null){xP=x;tP=t;return x;} const dt=Math.max((t-tP)/1000,1e-3);tP=t;
      const dx=(x-xP)/dt; const ad=a(dcut,dt); const dh=ad*dx+(1-ad)*dxP; dxP=dh;
      const c=min+beta*Math.abs(dh); const al=a(c,dt); const xh=al*x+(1-al)*xP; xP=xh; return xh; } };
}

const PALM=[0,5,9,13,17];     // 掌心中心＝手腕＋四指根平均（沿用舊版）
export function palmCenter(lm){ let x=0,y=0; for(const i of PALM){x+=lm[i].x;y+=lm[i].y;} return {x:x/PALM.length,y:y/PALM.length}; }

/* ---------------- 相機＋模型 ---------------- */
let HL=null, vision=null, video=null, camReady=false, lmHands=0, vfcOn=false, videoDirty=false, lastVT=-1;
export const cam={ get ready(){return camReady;}, get video(){return video;} };
export async function initModel(numHands){
  if(HL&&lmHands===numHands) return;
  const { HandLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
  if(HL){ try{HL.close();}catch(e){} HL=null; }
  if(!vision) vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  HL=await HandLandmarker.createFromOptions(vision,{
    baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate:"GPU"},
    runningMode:"VIDEO",numHands,minHandDetectionConfidence:0.5,minHandPresenceConfidence:0.4,minTrackingConfidence:0.35 });
  lmHands=numHands;
}
export async function initCamera(){
  if(camReady) return;
  video=document.createElement('video');video.playsInline=true;video.muted=true;
  const st=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:60,min:30},facingMode:'user'},audio:false});
  video.srcObject=st;await video.play();
  try{ const tr=st.getVideoTracks()[0], caps=tr.getCapabilities?.();
    if(caps&&caps.zoom&&caps.zoom.min!=null) await tr.applyConstraints({advanced:[{zoom:caps.zoom.min}]}); }catch(e){}
  if(video.requestVideoFrameCallback){ vfcOn=true;
    const cb=()=>{ videoDirty=true; video.requestVideoFrameCallback(cb); }; video.requestVideoFrameCallback(cb); }
  camReady=true;
}
/* 試手用的身體模型（PoseLandmarker）：只在量測關載入，量完 closePose() 關掉，平常只跑手部模型 */
let PL=null, poseLast=-1;
export async function initPose(){
  if(PL) return;
  const { PoseLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
  if(!vision) vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  PL=await PoseLandmarker.createFromOptions(vision,{
    baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},
    runningMode:"VIDEO",numPoses:1 });
}
export function detectPose(now){
  if(!PL||!camReady||!video) return null;
  if(video.currentTime===poseLast) return null; poseLast=video.currentTime;
  try{ const r=PL.detectForVideo(video,now); return r&&r.landmarks&&r.landmarks[0]||null; }catch(e){ return null; }
}
export function closePose(){ if(PL){ try{PL.close();}catch(e){} PL=null; } }

/* 有新影格才偵測；回傳 null＝這一幀沒有新資料。
   回傳 palms：[{x,y,label,lm}]（影像正規化座標、未鏡像） */
let lastDet=0, detMs=0, detGap=0;
export function detect(now){
  if(!camReady||!HL) return null;
  const fresh = vfcOn ? videoDirty : (video.currentTime!==lastVT);
  if(!fresh || now-lastDet<detGap) return null;
  videoDirty=false; lastDet=now; lastVT=video.currentTime;
  const t0=performance.now(); let res;
  try{ res=HL.detectForVideo(video,now); }catch(e){ return null; }
  const ms=performance.now()-t0; detMs=detMs?detMs*0.85+ms*0.15:ms; detGap=Math.min(30,Math.max(0,detMs-8));
  const out=[]; const n=(res&&res.landmarks)?res.landmarks.length:0;
  for(let i=0;i<n;i++){ const lm=res.landmarks[i];
    const label=(res.handedness&&res.handedness[i]&&res.handedness[i][0]&&res.handedness[i][0].categoryName)||(i===0?'Right':'Left');
    const c=palmCenter(lm); out.push({x:c.x,y:c.y,label,lm}); }
  return { palms:out, SX:video.videoWidth||640, SY:video.videoHeight||480 };
}

/* ---------------- Wake Lock（沿用舊版） ---------------- */
let wakeLock=null;
export async function keepAwake(on){
  try{
    if(on){ if(!wakeLock&&'wakeLock'in navigator) wakeLock=await navigator.wakeLock.request('screen'); }
    else if(wakeLock){ const w=wakeLock; wakeLock=null; await w.release(); }
  }catch(e){}
}

/* ---------------- 音效 ---------------- */
export const MUSIC_URL='../../打地鼠/music.mp3';
export const MUSIC_CREDIT='音樂：Monkeys Spinning Monkeys — Kevin MacLeod (incompetech.com)．CC-BY 4.0';
export function makeAudio(){
  const C=window.AudioContext||window.webkitAudioContext; const ac=new C();
  const sfx=ac.createGain();sfx.gain.value=0.32;sfx.connect(ac.destination);
  let bgm=null; try{ bgm=new Audio(MUSIC_URL); bgm.loop=true; bgm.volume=0.35; }catch(e){}
  function tone(f,t,dur,vol,ty='triangle',f2){const o=ac.createOscillator();o.type=ty;o.frequency.setValueAtTime(f,t);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(sfx);o.start(t);o.stop(t+dur+0.05);}
  function noise(t,dur,vol,fq=1200){ const len=Math.floor(ac.sampleRate*dur), b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const s=ac.createBufferSource(); s.buffer=b; const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=fq; f.Q.value=0.8;
    const g=ac.createGain(); g.gain.value=vol; s.connect(f);f.connect(g);g.connect(sfx); s.start(t); }
  let muted=false;
  return {
    start(){ if(ac.state==='suspended')ac.resume(); if(bgm&&!muted){ bgm.play().catch(()=>{}); } },
    stop(){ if(bgm){try{bgm.pause();}catch(e){}} },
    setMuted(m){ muted=m; if(bgm)bgm.muted=m; sfx.gain.value=m?0:0.32; if(!m&&bgm)bgm.play().catch(()=>{}); },
    grunt(){ const t=ac.currentTime; [0,0.2].forEach(o=>tone(110,t+o,0.16,0.28,'sawtooth',80)); },          // 齁齁
    squeak(){ const t=ac.currentTime; [0,0.12].forEach(o=>tone(1500,t+o,0.08,0.18,'square',2300)); },      // 吱吱
    chirp(){ const t=ac.currentTime; [0,0.1,0.24].forEach(o=>tone(3200,t+o,0.06,0.14,'sine',4200)); },      // 啾啾
    shoo(){ const t=ac.currentTime; noise(t,0.22,0.35,900); tone(660,t,0.16,0.22,'sine',990); },           // 趕走：咻＋叮
    flap(){ const t=ac.currentTime; noise(t,0.3,0.25,2200); },
    lose(){ const t=ac.currentTime; tone(392,t,0.18,0.18,'triangle',330); tone(330,t+0.16,0.25,0.16,'triangle',262); },
    combo(n){ const t=ac.currentTime; [523,659,784,1047].slice(0,Math.min(4,n-1)).forEach((f,i)=>tone(f,t+i*0.07,0.16,0.2,'sine')); },
    bell(){ const t=ac.currentTime; [0,0.18,0.36].forEach(o=>{ [1320,1980,2640].forEach((f,i)=>tone(f,t+o,0.9,0.16/(i+1),'sine')); }); },
    ding(){ const t=ac.currentTime; tone(1568,t,0.35,0.14,'sine'); },
    beep(f=880){ tone(f,ac.currentTime,0.14,0.25,'sine'); },
    fanfare(){ const t=ac.currentTime; [523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.12,0.3,0.2,'triangle')); }
  };
}
