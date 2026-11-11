/* 趕走山豬 2：美術載入與繪製
   每張圖都有程式畫的暫代：assets/ 的圖載入成功就自動改用圖；
   圖可能比程式晚到，所以載入失敗的圖每 8 秒重試一次。?noart=1 強制全部用暫代。 */
import { SPRITES } from './sprites.js';

const NOART=new URLSearchParams(location.search).has('noart');
const ART_NAMES=['bg_field','rat','sparrow_sit','sparrow_fly','scarecrow_body','grandpa','sweet_potato','basket','rice_pile','hand','boar_run','boar_root','fierce_run','fierce_root'];
const ART={}; const artListeners=[];
export function onArt(fn){ artListeners.push(fn); }
function loadArt(name,bust){
  const im=new Image();
  im.onload=()=>{ if(im.naturalWidth>0){ ART[name]=im; artListeners.forEach(f=>{try{f(name);}catch(e){}}); } };
  im.src='assets/'+name+'.png'+(bust?('?t='+Date.now()):'');
}
if(!NOART){
  ART_NAMES.forEach(n=>loadArt(n,false));
  setInterval(()=>{ ART_NAMES.forEach(n=>{ if(!ART[n]) loadArt(n,true); }); },8000);
}
export function art(name){ return NOART?null:(ART[name]||null); }
export function artStatus(){ const o={}; ART_NAMES.forEach(n=>o[n]=!!art(n)); return o; }

/* 舊版內嵌貼圖（山豬、兇山豬等） */
const SPR={};
for(const k of ['3d_boar','3d_fierce','3d_rooster','3d_sun','k_cloud1','k_cloud4','k_cloud6','k_tree02','k_tree05','k_tree07','k_tree10','k_tree13','k_tree20','k_grass2','k_grass4','k_grass5','k_grass6']){
  if(!SPRITES[k]) continue; const im=new Image(); im.src=SPRITES[k]; SPR[k]=im; }
export const spritesReady=Promise.all(Object.values(SPR).map(im=>im.decode?im.decode().catch(()=>{}):Promise.resolve()));
export const BOAR_SRC=SPRITES['3d_boar'];
export const ROOSTER_SRC=SPRITES['3d_rooster'];
export function sprite(k){ return SPR[k]; }
const ok=im=>im&&im.complete&&im.naturalWidth>0;
function spr(ctx,im,cx,cy,w,alpha){ if(!ok(im))return false;
  const h=w*im.naturalHeight/im.naturalWidth;
  if(alpha!=null){ctx.save();ctx.globalAlpha*=alpha;}
  ctx.drawImage(im,cx-w/2,cy-h/2,w,h);
  if(alpha!=null)ctx.restore(); return true; }
function sprBase(ctx,im,cx,by,w){ if(!ok(im))return false; const h=w*im.naturalHeight/im.naturalWidth; ctx.drawImage(im,cx-w/2,by-h,w,h); return true; }
function _rng(seed){let s=seed>>>0;return()=>(s=(s*1664525+1013904223)>>>0)/4294967296;}
export function shade(ctx,b){ ctx.shadowColor='rgba(25,15,5,.65)'; ctx.shadowBlur=Math.max(3,b); }
export function noShade(ctx){ ctx.shadowColor='transparent'; ctx.shadowBlur=0; }
export const FONT='"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';

/* ---------------- 背景 ----------------
   底圖 1536×1024 用 cover 鋪滿；垂直方向優先保住 y 0.10～0.82（老鼠路、地瓜田、竹竿）。
   缺圖時的暫代背景也畫在同一個 1536×1024 虛擬座標，所以三層位置跟有圖時一樣。 */
export const IW=1536, IH=1024;
export function coverTf(CW,CH){
  const s=Math.max(CW/IW,CH/IH), w=IW*s, h=IH*s, vis=Math.min(1,CH/h);
  const top=Math.max(0,Math.min(1-vis,0.46-vis/2));
  return {s,w,h,ox:(CW-w)/2,oy:-top*h};
}
let scene=null;
function buildScene(){
  const R=_rng(20261110), clouds=[];
  for(let i=0;i<4;i++)clouds.push({x:R()*IW,y:IH*(0.04+R()*0.08),w:200+R()*140,v:6+R()*8,k:['k_cloud1','k_cloud4','k_cloud6'][(R()*3)|0]});
  scene={clouds};
}
export function drawBackground(ctx,CW,CH,T){
  const bg=art('bg_field'), tf=coverTf(CW,CH);
  if(bg){ ctx.drawImage(bg,tf.ox,tf.oy,tf.w,tf.h); return; }
  if(!scene) buildScene();
  ctx.save(); ctx.translate(tf.ox,tf.oy); ctx.scale(tf.s,tf.s);
  const W=IW,H=IH;
  const sky=ctx.createLinearGradient(0,0,0,H*0.42); sky.addColorStop(0,'#5fb0ea'); sky.addColorStop(1,'#cfe9f6');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.43);
  for(const c of scene.clouds){ const x=((c.x+T*c.v)%(W+c.w*2))-c.w; spr(ctx,SPR[c.k],x,c.y,c.w,0.95); }
  const mtn=(y,amp,col,ph)=>{ ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(0,y);
    for(let i=0;i<=24;i++){ const x=W*i/24; ctx.lineTo(x,y-amp*(0.55+0.45*Math.sin(i*0.9+ph))*(0.6+0.4*Math.sin(i*0.37+ph*2))); }
    ctx.lineTo(W,H*0.42); ctx.lineTo(0,H*0.42); ctx.closePath(); ctx.fill(); };
  mtn(H*0.30,H*0.13,'#8fb7a8',1.3); mtn(H*0.36,H*0.09,'#5f9a6c',0.2);
  for(let i=0;i<4;i++){ const bx=W*(0.34+i*0.035), bh=H*(0.22+((i*7)%3)*0.03), by=H*0.40;     // 檳榔樹
    ctx.strokeStyle='#8a7d5a'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by-bh); ctx.stroke();
    ctx.strokeStyle='#4f8a3a'; ctx.lineWidth=6;
    for(let k=0;k<6;k++){ const a=-Math.PI/2+(k-2.5)*0.45; ctx.beginPath(); ctx.moveTo(bx,by-bh);
      ctx.quadraticCurveTo(bx+Math.cos(a)*40,by-bh+Math.sin(a)*30-10,bx+Math.cos(a)*60,by-bh+Math.sin(a)*20+25); ctx.stroke(); } }
  ctx.fillStyle='#6b5640'; ctx.fillRect(W*0.512,H*0.20,9,H*0.20); ctx.fillRect(W*0.50,H*0.215,W*0.026,6);   // 木電線桿
  ctx.fillStyle='#7cbf5a'; ctx.fillRect(0,H*0.395,W,H*0.04);
  drawSanheyuan(ctx,W*0.79,H*0.395,W*0.42);
  ctx.fillStyle='#c9c6bd'; ctx.fillRect(W*0.50,H*0.385,W*0.45,H*0.035);                          // 門口埕
  drawBanyanShrine(ctx,W*0.0,H*0.41,H*0.36);
  const soil=ctx.createLinearGradient(0,H*0.43,0,H*0.67); soil.addColorStop(0,'#a77a4a'); soil.addColorStop(1,'#8a5e36');
  ctx.fillStyle=soil; ctx.fillRect(0,H*0.43,W,H*0.24);
  for(let r=0;r<5;r++){ const y=H*(0.45+r*0.05); ctx.fillStyle='rgba(70,140,50,.85)';
    for(let x=(r%2)*30;x<W;x+=60){ ctx.beginPath(); ctx.ellipse(x,y,22+r*3,10+r*1.5,0,0,7); ctx.fill(); } }
  ctx.fillStyle='#7fbf55'; ctx.fillRect(0,H*0.67,W,H*0.04);
  ctx.fillStyle='#c39a68'; ctx.fillRect(0,H*0.71,W,H*0.08);                                      // 田埂泥土路
  ctx.fillStyle='rgba(120,90,55,.35)'; for(let x=20;x<W;x+=90) ctx.fillRect(x,H*(0.73+((x/90)%3)*0.02),14,5);
  ctx.fillStyle='#6fb04c'; ctx.fillRect(0,H*0.79,W,H*0.06);
  ctx.fillStyle='#86bfd0'; ctx.fillRect(0,H*0.85,W,H*0.12);                                      // 水圳
  ctx.fillStyle='rgba(255,255,255,.35)'; for(let x=(T*40)%120-120;x<W;x+=120) ctx.fillRect(x,H*0.9,50,4);
  ctx.fillStyle='#6fb04c'; ctx.fillRect(0,H*0.97,W,H*0.03);
  ctx.restore();
}
function drawSanheyuan(ctx,cx,by,w){
  const h=w*0.32;
  ctx.fillStyle='#b5523b'; ctx.fillRect(cx-w/2,by-h*0.62,w,h*0.62);                  // 紅磚牆
  ctx.fillStyle='#8f3b28'; for(let i=0;i<5;i++) ctx.fillRect(cx-w/2,by-h*0.62+i*h*0.12,w,1.2);
  ctx.fillStyle='#6b2c1d'; ctx.beginPath(); ctx.moveTo(cx-w*0.56,by-h*0.6); ctx.lineTo(cx-w*0.42,by-h); ctx.lineTo(cx+w*0.42,by-h); ctx.lineTo(cx+w*0.56,by-h*0.6); ctx.closePath(); ctx.fill();  // 屋頂
  ctx.fillStyle='#3a2a1f'; ctx.fillRect(cx-w*0.06,by-h*0.42,w*0.12,h*0.42);          // 門
  ctx.fillStyle='#e9dcc0'; ctx.fillRect(cx-w*0.3,by-h*0.42,w*0.1,h*0.16); ctx.fillRect(cx+w*0.2,by-h*0.42,w*0.1,h*0.16);
}
function drawBanyanShrine(ctx,x,by,h){
  ctx.fillStyle='#6a4a2a'; ctx.fillRect(x+h*0.18,by-h*0.55,h*0.12,h*0.55);           // 榕樹幹
  ctx.fillStyle='#4e8b3c'; for(const [dx,dy,r] of [[0.24,-0.8,0.32],[0.05,-0.7,0.24],[0.45,-0.68,0.26],[0.24,-1.0,0.24]]){
    ctx.beginPath(); ctx.arc(x+h*dx,by+h*dy,h*r,0,7); ctx.fill(); }
  const sx=x+h*0.55, sw=h*0.28, sh=h*0.24;                                         // 土地公小廟
  ctx.fillStyle='#c9442f'; ctx.fillRect(sx,by-sh,sw,sh);
  ctx.fillStyle='#7a2a1c'; ctx.beginPath(); ctx.moveTo(sx-sw*0.15,by-sh); ctx.lineTo(sx+sw/2,by-sh-sw*0.45); ctx.lineTo(sx+sw*1.15,by-sh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ffd36b'; ctx.fillRect(sx+sw*0.32,by-sh*0.7,sw*0.36,sh*0.45);
}

/* ---------------- 場景物件 ---------------- */
export function drawMat(ctx,x,y,w,h){                     // 竹蓆（曬稻穀）
  ctx.save(); ctx.fillStyle='#d8bd7a'; ctx.strokeStyle='#a98a48'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,6); ctx.fill();
  ctx.globalAlpha=0.5; for(let i=x+8;i<x+w;i+=10){ ctx.beginPath(); ctx.moveTo(i,y+2); ctx.lineTo(i,y+h-2); ctx.stroke(); }
  ctx.restore();
}
export function drawPole(ctx,x0,x1,y,s){                  // 竹竿（兩支腳架＋一支橫竹）
  const th=Math.max(5,s*0.11);
  for(const px of [x0,x1]){ ctx.strokeStyle='#8c9a46'; ctx.lineWidth=th*0.8;
    ctx.beginPath(); ctx.moveTo(px-th*1.6,y+s*1.25); ctx.lineTo(px,y); ctx.lineTo(px+th*1.6,y+s*1.25); ctx.stroke(); }
  const g=ctx.createLinearGradient(0,y-th/2,0,y+th/2); g.addColorStop(0,'#d9d478'); g.addColorStop(1,'#8f9b3e');
  ctx.fillStyle=g; ctx.fillRect(x0-th,y-th/2,x1-x0+th*2,th);
  ctx.fillStyle='#6f7a2c'; for(let x=x0;x<x1;x+=s*0.9) ctx.fillRect(x,y-th/2,2.5,th);
}
export function drawRicePile(ctx,x,y,w){
  const im=art('rice_pile'); if(im){ shade(ctx,w*0.04); sprBase(ctx,im,x,y,w); noShade(ctx); return; }
  const h=w*0.42;
  ctx.fillStyle='#e8b93c'; ctx.beginPath(); ctx.moveTo(x-w/2,y); ctx.quadraticCurveTo(x,y-h*1.9,x+w/2,y); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,240,170,.75)'; ctx.beginPath(); ctx.ellipse(x-w*0.1,y-h*0.6,w*0.13,h*0.22,-0.4,0,7); ctx.fill();
  ctx.fillStyle='#b9861d'; for(let i=0;i<9;i++){ const a=i*2.4, r=(i%3+1)*w*0.1; ctx.fillRect(x+Math.cos(a)*r,y-h*0.35+Math.sin(a)*h*0.25,2,2); }
}
export function drawEmptyPile(ctx,x,y,w){ ctx.fillStyle='rgba(185,140,40,.35)'; ctx.beginPath(); ctx.ellipse(x,y-2,w*0.42,w*0.08,0,0,7); ctx.fill(); }
export function drawPotato(ctx,x,y,w,rot=0){
  const im=art('sweet_potato');
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  if(im){ spr(ctx,im,0,0,w); ctx.restore(); return; }
  const g=ctx.createLinearGradient(0,-w*0.2,0,w*0.2); g.addColorStop(0,'#c0587a'); g.addColorStop(1,'#8a3352');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,w*0.5,w*0.22,0,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-w*0.12,-w*0.08,w*0.18,w*0.05,0,0,7); ctx.fill();
  ctx.strokeStyle='#5a2236'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(w*0.48,0); ctx.lineTo(w*0.62,-w*0.05); ctx.stroke();
  ctx.restore();
}
export function drawMound(ctx,x,y,w,has,T,rustle=0){              // 田畦上的一株地瓜
  ctx.fillStyle='#6b4524'; ctx.beginPath(); ctx.ellipse(x,y,w*0.55,w*0.2,0,0,7); ctx.fill();
  ctx.fillStyle='#87592f'; ctx.beginPath(); ctx.ellipse(x,y-w*0.04,w*0.48,w*0.15,0,0,7); ctx.fill();
  if(has){ drawPotato(ctx,x+w*0.08,y-w*0.06,w*0.62,-0.15); }
  else { ctx.fillStyle='#3b2410'; ctx.beginPath(); ctx.ellipse(x,y-w*0.04,w*0.22,w*0.07,0,0,7); ctx.fill(); }
  // 地瓜葉（心形小葉，微微擺動）
  const sway=Math.sin(T*1.6+x*0.05)*0.12+rustle*Math.sin(T*22)*0.45;
  ctx.fillStyle=has?'#4f9a3a':'#7d9a52';
  for(let i=-2;i<=2;i++){ const lx=x+i*w*0.16, ly=y-w*0.16-(2-Math.abs(i))*w*0.06;
    ctx.save(); ctx.translate(lx,ly); ctx.rotate(i*0.35+sway); ctx.beginPath(); ctx.ellipse(0,-w*0.06,w*0.09,w*0.12,0,0,7); ctx.fill(); ctx.restore(); }
}
export function drawPath(ctx,x0,x1,y0,y1,alpha){        // 田埂
  ctx.save(); ctx.globalAlpha=alpha;
  const g=ctx.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'#c7a476'); g.addColorStop(1,'#a8845a');
  ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(x0,y0,x1-x0,y1-y0,(y1-y0)*0.4); ctx.fill();
  ctx.fillStyle='rgba(90,140,60,.6)'; for(let x=x0+14;x<x1-10;x+=34){ ctx.beginPath(); ctx.ellipse(x,y0+3,8,4,0,0,7); ctx.ellipse(x+17,y1-3,8,4,0,0,7); ctx.fill(); }
  ctx.restore();
}
export function drawHole(ctx,x,y,w){
  ctx.fillStyle='#5e4026'; ctx.beginPath(); ctx.ellipse(x,y,w*0.62,w*0.26,0,0,7); ctx.fill();
  ctx.fillStyle='#1f140a'; ctx.beginPath(); ctx.ellipse(x,y,w*0.42,w*0.17,0,0,7); ctx.fill();
}
export function drawBasket(ctx,x,y,w,count,max){         // y＝籃底；籃裡的小地瓜依實際數量畫，所以籃子圖只取下半段（籃身）
  const im=art('basket'), h=w*0.55;
  const n=Math.max(0,count), rimY=y-(im?w*im.naturalHeight/im.naturalWidth*0.55:h*0.85);
  for(let i=0;i<n;i++){ const k=max<=1?0:i/(max-1)-0.5, row=i%2;
    drawPotato(ctx,x+k*w*0.62,rimY+w*0.02-row*w*0.09,w*0.36,k*0.7+(row?0.3:-0.2)); }
  if(im){ const ih=w*im.naturalHeight/im.naturalWidth, cut=0.40;
    shade(ctx,w*0.04); ctx.drawImage(im,0,im.naturalHeight*cut,im.naturalWidth,im.naturalHeight*(1-cut),x-w/2,y-ih*(1-cut),w,ih*(1-cut)); noShade(ctx); return; }
  ctx.fillStyle='#b98a4a'; ctx.beginPath(); ctx.moveTo(x-w/2,y-h*0.85); ctx.lineTo(x+w/2,y-h*0.85); ctx.lineTo(x+w*0.38,y); ctx.lineTo(x-w*0.38,y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#7c5726'; ctx.lineWidth=1.6;
  for(let i=1;i<5;i++){ const yy=y-h*0.85*i/5; ctx.beginPath(); ctx.moveTo(x-w*(0.38+0.12*i/5),yy); ctx.lineTo(x+w*(0.38+0.12*i/5),yy); ctx.stroke(); }
  for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(x+i*w*0.13,y-h*0.85); ctx.lineTo(x+i*w*0.1,y); ctx.stroke(); }
  ctx.fillStyle='#8d6331'; ctx.beginPath(); ctx.ellipse(x,y-h*0.85,w*0.52,w*0.06,0,0,7); ctx.fill();
}

/* ---------------- 山豬（沿用舊版 drawMole 的洞口裁切畫法） ---------------- */
export function drawBoar(ctx,x,y,r,rise,kind,o={}){
  const hy=y+r*0.52, hw=r*1.55, hh=r*0.52;
  ctx.fillStyle='rgba(0,0,0,.13)'; ctx.beginPath();ctx.ellipse(x,hy+r*0.16,hw*1.06,hh*0.62,0,0,7);ctx.fill();
  const sh=o.shake?Math.sin(o.shake*60)*r*0.05:0;
  ctx.fillStyle='#5a3a1c'; ctx.strokeStyle='rgba(30,18,6,.8)'; ctx.lineWidth=Math.max(2,r*0.04);
  ctx.beginPath();ctx.ellipse(x+sh,hy,hw,hh,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#160c03'; ctx.beginPath();ctx.ellipse(x+sh,hy,hw*0.72*(o.shake!=null?0.7:1),hh*0.62,0,0,7);ctx.fill();
  if(o.shake!=null){                                       // 預兆：土在動、土塊彈起
    ctx.fillStyle='#5a3b1c'; for(let i=0;i<5;i++){ const a=i*1.3+o.shake*9, j=Math.abs(Math.sin(o.shake*14+i))*r*0.35;
      ctx.beginPath(); ctx.arc(x+Math.cos(a)*hw*0.6,hy-j,r*0.07,0,7); ctx.fill(); } }
  if(rise>0){
    ctx.save(); ctx.beginPath(); ctx.rect(x-hw*1.4,0,hw*2.8,hy); ctx.clip();
    const cy=hy-r*0.62+(1-rise)*r*1.5+(o.hop||0);
    ctx.translate(x,cy); if(o.tilt) ctx.rotate(o.tilt); if(o.flip) ctx.scale(-1,1);
    shade(ctx,r*0.08); if(kind==='fierce') spr(ctx,SPR['3d_fierce'],0,-r*0.08,r*2.5); else spr(ctx,SPR['3d_boar'],0,0,r*2.3); noShade(ctx);
    if(o.carry) drawPotato(ctx,r*0.55,r*0.25,r*0.8,0.3);
    ctx.restore();
  }
  ctx.fillStyle='#6e4a24'; ctx.beginPath();ctx.ellipse(x,hy,hw*0.74,hh*0.64,0,0,Math.PI);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.16)'; ctx.beginPath();ctx.ellipse(x,hy-hh*0.06,hw*0.95,hh*0.4,Math.PI,0,0);ctx.fill();
}

/* ---------------- 老鼠 ---------------- */
// face：+1 朝右、-1 朝左（中間值＝轉身中）；bob＝跑步起伏；sniff＝停下來聞
export function drawRat(ctx,x,y,s,face,o={}){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0,s*0.02,s*0.48,s*0.09,0,0,7); ctx.fill();
  const fx=Math.sign(face||1)*Math.max(0.3,Math.abs(face));
  ctx.translate(0,-(o.bob||0)); ctx.scale(fx,1);
  const im=art('rat');
  if(im){ const h=s*im.naturalHeight/im.naturalWidth; shade(ctx,s*0.05); ctx.drawImage(im,-s/2,-h*0.97,s,h); noShade(ctx); }
  else {
    const leg=o.leg||0;
    ctx.strokeStyle='#e9a3a8'; ctx.lineWidth=Math.max(1.5,s*0.035); ctx.beginPath(); ctx.moveTo(-s*0.36,-s*0.12);
    ctx.quadraticCurveTo(-s*0.62,-s*0.05+Math.sin(leg*2)*s*0.05,-s*0.7,-s*0.22); ctx.stroke();                       // 尾巴
    ctx.strokeStyle='#5e5148'; ctx.lineWidth=Math.max(2,s*0.04);
    for(const [lx,ph] of [[-0.2,0],[0.18,Math.PI]]){ ctx.beginPath(); ctx.moveTo(s*lx,-s*0.08); ctx.lineTo(s*lx+Math.sin(leg+ph)*s*0.07,0); ctx.stroke(); }
    ctx.fillStyle='#8b7b6c'; ctx.beginPath(); ctx.ellipse(-s*0.04,-s*0.17,s*0.36,s*0.16,0,0,7); ctx.fill();               // 身體
    ctx.fillStyle='#c9b9a8'; ctx.beginPath(); ctx.ellipse(-s*0.02,-s*0.09,s*0.24,s*0.07,0,0,7); ctx.fill();
    const nod=(o.sniff||0)*s*0.03;
    ctx.fillStyle='#8b7b6c'; ctx.beginPath(); ctx.ellipse(s*0.3,-s*0.2+nod,s*0.17,s*0.12,-0.2,0,7); ctx.fill();               // 頭
    ctx.beginPath(); ctx.moveTo(s*0.4,-s*0.24+nod); ctx.lineTo(s*0.52,-s*0.17+nod); ctx.lineTo(s*0.4,-s*0.13+nod); ctx.fill();
    ctx.fillStyle='#e9a3a8'; ctx.beginPath(); ctx.arc(s*0.52,-s*0.17+nod,s*0.03,0,7); ctx.fill();                         // 鼻
    ctx.fillStyle='#8b7b6c'; ctx.beginPath(); ctx.arc(s*0.24,-s*0.33+nod,s*0.08,0,7); ctx.fill();                       // 耳
    ctx.fillStyle='#e9a3a8'; ctx.beginPath(); ctx.arc(s*0.24,-s*0.33+nod,s*0.045,0,7); ctx.fill();
    ctx.fillStyle='#1d1612'; ctx.beginPath(); ctx.arc(s*0.36,-s*0.23+nod,s*0.025,0,7); ctx.fill();                       // 眼
  }
  if(o.sniff){ ctx.strokeStyle='rgba(40,30,20,.6)'; ctx.lineWidth=1; const w=Math.sin((o.t||0)*30)*s*0.02;    // 鬍鬚抖動
    for(const dy of [-0.03,0,0.03]){ ctx.beginPath(); ctx.moveTo(s*0.5,-s*0.17); ctx.lineTo(s*0.66,-s*0.17+s*dy*2+w); ctx.stroke(); } }
  if(o.carry) drawPotato(ctx,s*0.55,-s*0.12,s*0.42,0.2);
  ctx.restore();
}
export function drawWhiskers(ctx,x,y,s,dir,k,T){          // 老鼠預兆：洞口探出鼻子與鬍鬚
  ctx.save(); ctx.translate(x,y-s*0.06); ctx.scale(dir,1);
  const out=s*0.12*Math.min(1,k*1.6)+Math.sin(T*18)*s*0.015;
  ctx.fillStyle='#8b7b6c'; ctx.beginPath(); ctx.ellipse(out-s*0.02,0,s*0.1,s*0.07,0,0,7); ctx.fill();
  ctx.fillStyle='#e9a3a8'; ctx.beginPath(); ctx.arc(out+s*0.08,0,s*0.025,0,7); ctx.fill();
  ctx.strokeStyle='rgba(30,20,10,.75)'; ctx.lineWidth=1.2;
  for(const dy of [-0.05,0,0.05]){ ctx.beginPath(); ctx.moveTo(out+s*0.06,0); ctx.lineTo(out+s*0.24,s*dy+Math.sin(T*25+dy*40)*s*0.02); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- 麻雀 ---------------- */
export function drawSparrow(ctx,x,y,s,o={}){
  ctx.save(); ctx.translate(x,y); ctx.scale(o.face||1,1); if(o.tilt) ctx.rotate(o.tilt);
  const flying=!!o.fly, im=art(flying?'sparrow_fly':'sparrow_sit');
  if(im){ const sq=flying?1+0.12*Math.sin(o.flap||0):1;
    const h=s*im.naturalHeight/im.naturalWidth; ctx.save(); ctx.scale(1,sq); shade(ctx,s*0.06); ctx.drawImage(im,-s/2,flying?-h/2:-h,s,h); ctx.restore(); ctx.restore(); return; }
  const by=flying?0:-s*0.32;                                 // 停著時，原點在腳
  ctx.fillStyle='#8a6a48'; ctx.beginPath(); ctx.moveTo(-s*0.3,by); ctx.lineTo(-s*0.55,by-s*0.08+(flying?0:s*0.1)); ctx.lineTo(-s*0.5,by+s*0.06); ctx.closePath(); ctx.fill();   // 尾
  ctx.fillStyle='#9b7650'; ctx.beginPath(); ctx.ellipse(-s*0.02,by,s*0.32,s*0.22,0,0,7); ctx.fill();         // 身
  ctx.fillStyle='#efe3cf'; ctx.beginPath(); ctx.ellipse(s*0.04,by+s*0.08,s*0.22,s*0.12,0,0,7); ctx.fill();  // 肚
  ctx.fillStyle='#7a4e2c'; ctx.beginPath(); ctx.arc(s*0.24,by-s*0.14,s*0.15,0,7); ctx.fill();                 // 栗色頭頂
  ctx.fillStyle='#f4ede0'; ctx.beginPath(); ctx.ellipse(s*0.27,by-s*0.08,s*0.11,s*0.08,0,0,7); ctx.fill();   // 白臉頰
  ctx.fillStyle='#2b211a'; ctx.beginPath(); ctx.arc(s*0.28,by-s*0.07,s*0.03,0,7); ctx.fill();                 // 頰黑斑
  ctx.beginPath(); ctx.arc(s*0.3,by-s*0.16,s*0.025,0,7); ctx.fill();                                          // 眼
  ctx.fillStyle='#2b211a'; ctx.beginPath(); ctx.ellipse(s*0.33,by+s*0.0,s*0.05,s*0.05,0,0,7); ctx.fill();    // 黑喉
  ctx.fillStyle='#3a2c20'; ctx.beginPath(); ctx.moveTo(s*0.37,by-s*0.14); ctx.lineTo(s*0.47,by-s*0.11); ctx.lineTo(s*0.37,by-s*0.08); ctx.fill();   // 喙
  if(flying){ const f=Math.sin(o.flap||0);
    ctx.fillStyle='#6e5034'; ctx.beginPath(); ctx.moveTo(-s*0.1,by-s*0.05); ctx.quadraticCurveTo(-s*0.05,by-s*0.5*f-s*0.05,s*0.15,by-s*0.6*f); ctx.lineTo(s*0.12,by-s*0.02); ctx.closePath(); ctx.fill(); }
  else { ctx.fillStyle='#6e5034'; ctx.beginPath(); ctx.ellipse(-s*0.08,by-s*0.02,s*0.2,s*0.1,-0.2,0,7); ctx.fill();
    ctx.strokeStyle='#5a4535'; ctx.lineWidth=Math.max(1.2,s*0.03); ctx.beginPath(); ctx.moveTo(-s*0.02,by+s*0.2); ctx.lineTo(-s*0.04,0); ctx.moveTo(s*0.08,by+s*0.2); ctx.lineTo(s*0.08,0); ctx.stroke(); }
  ctx.restore();
}
export function drawShadow(ctx,x,y,s,a){ ctx.fillStyle=`rgba(0,0,0,${(0.22*a).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x,y,s*0.4,s*0.1,0,0,7); ctx.fill(); }

/* ---------------- 稻草人 ---------------- */
// armL/armR：手臂角度（弧度，0＝水平、負＝往上）；bells/max；glow 0～1；ring 0～1（舉高停留的進度）
export function drawScarecrow(ctx,x,baseY,h,o){
  const body=art('scarecrow_body');
  const shY=baseY-h*(body?0.6:0.64), shW=h*(body?0.14:0.17);
  ctx.save();
  if(o.glow>0){ const g=ctx.createRadialGradient(x,baseY-h*0.55,h*0.1,x,baseY-h*0.55,h*0.75);
    g.addColorStop(0,`rgba(255,226,120,${(0.6*o.glow).toFixed(3)})`); g.addColorStop(1,'rgba(255,226,120,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,baseY-h*0.55,h*0.75,0,7); ctx.fill(); }
  // 手臂（兩束稻草，從肩膀伸出；程式畫，才能跟著玩家的手）
  const arm=(side,ang)=>{ const sx=x+side*shW, L=h*0.36;
    ctx.save(); ctx.translate(sx,shY); ctx.scale(side,1); ctx.rotate(ang);
    ctx.fillStyle='#d9b65a'; ctx.beginPath(); ctx.roundRect(0,-h*0.035,L,h*0.07,h*0.03); ctx.fill();
    ctx.strokeStyle='#b08c35'; ctx.lineWidth=1; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(2,-h*0.035+i*h*0.0175); ctx.lineTo(L-2,-h*0.035+i*h*0.0175); ctx.stroke(); }
    ctx.fillStyle='#e8c76a'; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(L-2,0); ctx.lineTo(L+h*0.09,i*h*0.03); ctx.lineTo(L-2,i*h*0.01); ctx.fill(); }   // 手＝稻草鬚
    ctx.restore(); };
  if(body){ arm(-1,o.armL); arm(1,o.armR); shade(ctx,h*0.02); sprBase(ctx,body,x,baseY,h*body.naturalWidth/body.naturalHeight); noShade(ctx); }
  else {
    ctx.strokeStyle='#7a5530'; ctx.lineWidth=Math.max(3,h*0.04); ctx.beginPath(); ctx.moveTo(x,baseY); ctx.lineTo(x,shY); ctx.stroke();   // 竹柱
    arm(-1,o.armL); arm(1,o.armR);
    ctx.fillStyle='#c8423a'; ctx.beginPath(); ctx.moveTo(x-shW*1.15,shY-h*0.02); ctx.lineTo(x+shW*1.15,shY-h*0.02); ctx.lineTo(x+shW*0.95,baseY-h*0.3); ctx.lineTo(x-shW*0.95,baseY-h*0.3); ctx.closePath(); ctx.fill();   // 花布衫
    ctx.fillStyle='#ffe9c9'; for(let i=0;i<9;i++){ const px=x+((i%3)-1)*shW*0.6, py=shY+h*0.04+Math.floor(i/3)*h*0.09;
      ctx.beginPath(); for(let k=0;k<5;k++){ const a=k*1.2566; ctx.moveTo(px,py); ctx.arc(px+Math.cos(a)*h*0.012,py+Math.sin(a)*h*0.012,h*0.011,0,7); } ctx.fill(); }
    ctx.fillStyle='#e0bf62'; ctx.beginPath(); ctx.moveTo(x-shW*0.9,baseY-h*0.3); ctx.lineTo(x+shW*0.9,baseY-h*0.3); ctx.lineTo(x+shW*0.6,baseY-h*0.2); ctx.lineTo(x-shW*0.6,baseY-h*0.2); ctx.fill();   // 稻草裙
    ctx.fillStyle='#e6d2a6'; ctx.beginPath(); ctx.arc(x,shY-h*0.1,h*0.1,0,7); ctx.fill();                        // 布袋臉
    ctx.fillStyle='#3a2a1f'; ctx.beginPath(); ctx.arc(x-h*0.035,shY-h*0.11,h*0.012,0,7); ctx.arc(x+h*0.035,shY-h*0.11,h*0.012,0,7); ctx.fill();
    ctx.strokeStyle='#3a2a1f'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,shY-h*0.08,h*0.035,0.2,Math.PI-0.2); ctx.stroke();
    ctx.fillStyle='#d8c27f'; ctx.beginPath(); ctx.moveTo(x-h*0.2,shY-h*0.16); ctx.lineTo(x,shY-h*0.3); ctx.lineTo(x+h*0.2,shY-h*0.16); ctx.closePath(); ctx.fill();   // 斗笠
    ctx.strokeStyle='#a88c45'; ctx.lineWidth=1; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x,shY-h*0.3); ctx.lineTo(x-h*0.2+i*h*0.1,shY-h*0.16); ctx.stroke(); }
  }
  // 鈴鐺（集氣）
  const n=o.max||6, bw=Math.min(h*0.05,h*0.5/n), y0=baseY-h*0.12;
  for(let i=0;i<n;i++){ const bx=x+(i-(n-1)/2)*bw*2.1, lit=i<o.bells;
    ctx.fillStyle=lit?'#ffcf33':'rgba(120,110,95,.55)'; ctx.strokeStyle=lit?'#a8740a':'rgba(60,50,40,.5)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(bx,y0,bw,Math.PI,0); ctx.lineTo(bx+bw*1.1,y0+bw*0.6); ctx.lineTo(bx-bw*1.1,y0+bw*0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    if(lit&&o.glow>0){ ctx.fillStyle='rgba(255,240,150,.5)'; ctx.beginPath(); ctx.arc(bx,y0,bw*1.8,0,7); ctx.fill(); } }
  if(o.ring>0){ ctx.strokeStyle='#ffd54a'; ctx.lineWidth=Math.max(5,h*0.035); ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(x,baseY-h*0.55,h*0.52,-Math.PI/2,-Math.PI/2+Math.PI*2*o.ring); ctx.stroke(); ctx.lineCap='butt'; }
  ctx.restore();
}

/* ---------------- 手掌游標 ---------------- */
export function drawHand(ctx,x,y,s,color,mirror){
  ctx.save();
  if(color){ ctx.fillStyle=color+'55'; ctx.strokeStyle=color; ctx.lineWidth=Math.max(3,s*0.07);
    ctx.beginPath(); ctx.arc(x,y,s*0.55,0,7); ctx.fill(); ctx.stroke(); }
  const im=art('hand');
  ctx.translate(x,y); if(mirror) ctx.scale(-1,1);
  if(im){ const h=s*im.naturalHeight/im.naturalWidth; ctx.drawImage(im,-s/2,-h/2,s,h); }
  else { ctx.fillStyle='#f6c9a0'; ctx.strokeStyle='#b07a4f'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(-s*0.22,-s*0.05,s*0.44,s*0.38,s*0.12); ctx.fill(); ctx.stroke();
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.roundRect(-s*0.22+i*s*0.115,-s*0.36+Math.abs(i-1.5)*s*0.04,s*0.1,s*0.34,s*0.05); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.roundRect(s*0.18,-s*0.02,s*0.22,s*0.1,s*0.05); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- 雙人：中間的竹籬笆 ---------------- */
export function drawFence(ctx,x,y0,y1,w){
  ctx.save(); ctx.fillStyle='rgba(60,40,20,.18)'; ctx.fillRect(x-w*0.6,y0,w*1.2,y1-y0);
  for(let i=0;i<3;i++){ const yy=y0+(y1-y0)*(0.2+i*0.3); ctx.fillStyle='#9a8a3e'; ctx.fillRect(x-w*0.7,yy,w*1.4,w*0.18); }
  for(let k=-1;k<=1;k++){ const bx=x+k*w*0.3; const g=ctx.createLinearGradient(bx-w*0.13,0,bx+w*0.13,0);
    g.addColorStop(0,'#a9b04e'); g.addColorStop(0.5,'#e2dc8a'); g.addColorStop(1,'#8b9a3d');
    ctx.fillStyle=g; ctx.fillRect(bx-w*0.13,y0,w*0.26,y1-y0);
    ctx.fillStyle='#6f7a2c'; for(let y=y0+w;y<y1;y+=w*1.4) ctx.fillRect(bx-w*0.13,y,w*0.26,2.5); }
  ctx.restore();
}

/* ---------------- 阿公（劇情用；缺圖時用程式畫一張） ---------------- */
let gpURL=null;
export function grandpaSrc(){
  const im=art('grandpa'); if(im) return im.src;
  if(gpURL) return gpURL;
  const c=document.createElement('canvas'); c.width=400; c.height=480; const g=c.getContext('2d');
  g.fillStyle='#5a7d9a'; g.beginPath(); g.moveTo(40,480); g.quadraticCurveTo(60,300,200,290); g.quadraticCurveTo(340,300,360,480); g.fill();   // 衣服
  g.fillStyle='#e7e1d3'; g.beginPath(); g.moveTo(170,295); g.lineTo(200,350); g.lineTo(230,295); g.fill();
  g.fillStyle='#e9b98e'; g.fillRect(175,250,50,50);
  g.beginPath(); g.ellipse(200,190,92,105,0,0,7); g.fill();                                         // 臉
  g.beginPath(); g.arc(108,200,18,0,7); g.arc(292,200,18,0,7); g.fill();                             // 耳
  g.fillStyle='#d8c27f'; g.beginPath(); g.moveTo(60,120); g.lineTo(200,30); g.lineTo(340,120); g.closePath(); g.fill();   // 斗笠
  g.strokeStyle='#a88c45'; g.lineWidth=3; for(let i=1;i<6;i++){ g.beginPath(); g.moveTo(200,30); g.lineTo(60+i*280/6,120); g.stroke(); }
  g.fillStyle='#f2f2f2'; g.beginPath(); g.ellipse(200,248,52,18,0,0,Math.PI); g.fill();            // 白鬍子
  g.fillStyle='#ffffff'; g.fillRect(140,150,36,8); g.fillRect(224,150,36,8);                        // 白眉
  g.fillStyle='#3a2a1f'; g.beginPath(); g.arc(160,182,8,0,7); g.arc(240,182,8,0,7); g.fill();
  g.strokeStyle='#8a5a3a'; g.lineWidth=4; g.beginPath(); g.arc(200,222,26,0.25,Math.PI-0.25); g.stroke();   // 笑
  g.strokeStyle='rgba(150,95,60,.5)'; g.lineWidth=3; g.beginPath(); g.moveTo(150,135); g.lineTo(250,135); g.stroke();
  gpURL=c.toDataURL(); return gpURL;
}

/* ---------------- v0.2：全身山豬（從草叢跑進田裡） ----------------
   (x,y)＝腳踩的位置；r＝基準大小；o.face：+1 朝右、-1 朝左；o.scale：遠小近大（0.5～1）；
   o.pose：'run' 或 'root'（低頭拱土）；o.bob／o.tilt：跑步起伏與前後傾；o.leg：腿的相位；o.hop：小跳高度 */
export function drawBoarBody(ctx,x,y,r,o={}){
  const k=o.kind==='fierce', sc=(o.scale||1)*(k?1.12:1), W=r*2.7*sc, face=o.face||1;
  const im=art((k?'fierce':'boar')+'_'+(o.pose==='root'?'root':'run'))||(k?null:null);
  ctx.save(); if(o.alpha!=null) ctx.globalAlpha*=o.alpha;
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x,y,W*0.42,W*0.07,0,0,7); ctx.fill();   // 影子留在地上
  ctx.translate(x,y-(o.bob||0)-(o.hop||0)); ctx.scale(face,1); ctx.rotate(o.tilt||0);
  if(im){ const h=W*im.naturalHeight/im.naturalWidth;
    shade(ctx,r*0.08*sc);
    if(k&&!art('fierce_run')){ ctx.filter='brightness(0.62) saturate(1.2)'; }
    ctx.drawImage(im,-W/2,-h,W,h); ctx.filter='none'; noShade(ctx);
    if(o.carry) drawPotato(ctx,W*0.46,-h*(o.pose==='root'?0.15:0.32),W*0.3,0.4);
    ctx.restore(); return; }
  // 暫代：程式畫身體與腿，頭用舊版山豬頭貼圖
  const bw=W*0.42, bh=W*0.22, leg=o.leg||0, col=k?'#4a2f1c':'#7a5235', dark=k?'#2f1d10':'#5a3a22';
  ctx.strokeStyle=dark; ctx.lineWidth=Math.max(3,W*0.05); ctx.lineCap='round';
  for(const [lx,ph] of [[-0.28,0],[-0.12,Math.PI],[0.16,Math.PI*0.5],[0.3,Math.PI*1.5]]){
    const sw=o.pose==='root'?0:Math.sin(leg+ph)*W*0.06;
    ctx.beginPath(); ctx.moveTo(W*lx,-W*0.16); ctx.lineTo(W*lx+sw,-W*0.01); ctx.stroke(); }
  shade(ctx,r*0.08*sc);
  ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(-W*0.04,-W*0.27,bw,bh,0,0,7); ctx.fill(); noShade(ctx);
  ctx.fillStyle=dark; for(let i=0;i<7;i++){ ctx.beginPath(); ctx.moveTo(-W*0.32+i*W*0.08,-W*0.46); ctx.lineTo(-W*0.28+i*W*0.08,-W*0.52); ctx.lineTo(-W*0.24+i*W*0.08,-W*0.46); ctx.fill(); }   // 背上鬃毛
  ctx.strokeStyle=dark; ctx.lineWidth=Math.max(2,W*0.025); ctx.beginPath(); ctx.moveTo(-W*0.45,-W*0.32); ctx.quadraticCurveTo(-W*0.55,-W*0.4,-W*0.52,-W*0.28); ctx.stroke();   // 尾巴
  const hx=W*0.36, hy=o.pose==='root'?-W*0.12:-W*0.3;
  ctx.save(); ctx.translate(hx,hy); if(o.pose==='root') ctx.rotate(0.35); spr(ctx,SPR[k?'3d_fierce':'3d_boar'],0,0,W*0.48); ctx.restore();
  if(o.carry) drawPotato(ctx,W*0.5,hy+W*0.12,W*0.3,0.4);
  ctx.restore();
}
/* 田邊的芒草叢（山豬的入口）；shake 0～1 時晃動；half＝畫面邊緣只露半叢 */
export function drawBush(ctx,x,y,w,shake=0,T=0,half=0){
  ctx.save(); ctx.translate(x,y);
  const sw=shake?Math.sin(T*38)*0.18*shake:Math.sin(T*1.3+x)*0.03;
  const blades=13;
  for(let i=0;i<blades;i++){ const u=i/(blades-1)-0.5, bx=u*w*0.9, h=w*(0.55+0.35*Math.cos(u*2.4));
    if(half&&Math.sign(u)===half) continue;
    ctx.strokeStyle=i%3?'#5f8f3a':'#7aa84a'; ctx.lineWidth=Math.max(2,w*0.05); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(bx,0); ctx.quadraticCurveTo(bx+u*w*0.3+sw*w,-h*0.6,bx+u*w*0.55+sw*w*1.6,-h); ctx.stroke(); }
  ctx.fillStyle='#4f7f30'; ctx.beginPath(); ctx.ellipse(half?-half*w*0.2:0,-w*0.06,w*(half?0.32:0.48),w*0.14,0,0,7); ctx.fill();
  ctx.fillStyle='rgba(235,225,190,.85)';                                     // 芒花
  for(let i=0;i<4;i++){ const u=(i/3-0.5)*0.8; if(half&&Math.sign(u)===half) continue; const tx=u*w*0.9+u*w*0.55+sw*w*1.6, ty=-w*(0.85+0.1*Math.cos(i));
    ctx.beginPath(); ctx.ellipse(tx,ty,w*0.05,w*0.12,u,0,7); ctx.fill(); }
  ctx.restore();
}
export function drawTuft(ctx,x,y,w){ drawBush(ctx,x,y,w,0,0,0); }
/* 時段色調：清晨偏涼薄霧、正午原色、傍晚暖橘；只疊在場景上，動物與介面不變色 */
export function drawTint(ctx,CW,CH,mode,tf){
  if(!mode||mode==='noon') return;
  if(!(CW>0&&CH>0)||!tf||!isFinite(tf.oy)||!isFinite(tf.h)) return;   // 視窗還沒有尺寸（剛載入、被收起來）時先不畫，免得整個畫面停住
  ctx.save();
  if(mode==='dawn'){
    ctx.fillStyle='rgba(150,185,225,.20)'; ctx.fillRect(0,0,CW,CH);
    const y=tf.oy+tf.h*0.42, g=ctx.createLinearGradient(0,y-CH*0.18,0,y+CH*0.12);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.55,'rgba(240,246,250,.45)'); g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,y-CH*0.18,CW,CH*0.3);
  } else if(mode==='dusk'){
    const g=ctx.createLinearGradient(0,0,0,CH); g.addColorStop(0,'rgba(255,110,40,.42)'); g.addColorStop(0.5,'rgba(255,140,50,.24)'); g.addColorStop(1,'rgba(90,40,30,.28)');
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
  }
  ctx.restore();
}
