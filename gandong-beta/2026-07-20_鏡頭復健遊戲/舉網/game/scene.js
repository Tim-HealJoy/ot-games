/* 舉網 3D 場景：視角 C（俯角 31°、鏡頭視野 42°、彎溪），老闆 2026-11-06 定案。全部程式繪製，沒有外部模型。 */
import * as THREE from 'three';
const V3=THREE.Vector3, Y=new V3(0,1,0), P=(x,y,z)=>new V3(x,y,z);
const lerp=THREE.MathUtils.lerp, clamp=THREE.MathUtils.clamp, ease=t=>t*t*(3-2*t);
export const SW=1920, SH=1080;
const PITCH=31, FOV=42;
const PATH=[[27,-5],[17,-9.6],[7,-11.6],[-3.2,-11.6],[-7.4,-8.2],[-5.2,-4.6],[-1.5,-2.3],[0,.2],[0,3],[0,12]];
const W_FAR=5.2, W_NEAR=7.4, HILL_Z=-20;
const NW=6.8, ND=2.8, NET_Z=-.2, BASKET=P(0,.8,2.9);
const LIGHTS=[
  {sky:0xd7ecf5,hemi:0xffffff,ground:0xb7c7a0,hI:1.7,sun:0xfff0d8,sI:2.0,water:0xffffff},
  {sky:0xc8e7f7,hemi:0xffffff,ground:0xc4d3a8,hI:1.9,sun:0xfffaf0,sI:2.25,water:0xfcffff},
  {sky:0xf9dcb4,hemi:0xfff0dc,ground:0xd8c09a,hI:1.85,sun:0xffc890,sI:2.2,water:0xfff0da},
];

let rngSeed=11; const rnd=()=>(rngSeed=(rngSeed*16807)%2147483647)/2147483647;

/* 魚的外形：頭在 +z。身體用一圈圈截面組成，鰭是薄片；顏色存在頂點（背深腹淺、身上有淡直紋） */
function fishGeometry(){
  const Z=[.64,.6,.5,.36,.18,0,-.16,-.3,-.42,-.5],W=[.004,.05,.11,.16,.182,.17,.135,.09,.05,.028],H=[.004,.07,.145,.2,.225,.205,.16,.105,.062,.04],SEG=12;
  const pos=[],col=[],idx=[];
  for(let i=0;i<Z.length;i++)for(let j=0;j<SEG;j++){const a=j/SEG*Math.PI*2,sn=Math.sin(a),cs=Math.cos(a);pos.push(W[i]*cs,H[i]*sn,Z[i]);
    const sh=sn>.35?.6:sn>-.25?1:1.5,st=(i>=3&&i<=7&&i%2===0&&sn>-.25)?.8:1,c=sh*st;col.push(c,c,c);}
  for(let i=0;i<Z.length-1;i++)for(let j=0;j<SEG;j++){const a=i*SEG+j,b=i*SEG+(j+1)%SEG,c=a+SEG,d=b+SEG;idx.push(a,c,b,b,c,d);}
  const bodyG=new THREE.BufferGeometry();bodyG.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bodyG.setIndex(idx);bodyG.computeVertexNormals();
  const n=bodyG.attributes.normal,hullP=[];for(let i=0;i<pos.length/3;i++)hullP.push(pos[i*3]+n.getX(i)*.024,pos[i*3+1]+n.getY(i)*.024,pos[i*3+2]+n.getZ(i)*.024);
  const finsP=[],finsC=[],finsI=[],hullF=[],hullFI=[];
  const fin=(pts,c,sc=1.09)=>{ const cx=pts.reduce((a,p)=>a+p[0],0)/pts.length,cy=pts.reduce((a,p)=>a+p[1],0)/pts.length,cz=pts.reduce((a,p)=>a+p[2],0)/pts.length;
    for(const flip of[0,1]){const s0=finsP.length/3;finsP.push(cx,cy,cz);finsC.push(c,c,c);for(const p of pts){finsP.push(...p);finsC.push(c,c,c);}for(let i=0;i<pts.length;i++){const a=s0+1+i,b=s0+1+(i+1)%pts.length;if(flip)finsI.push(s0,b,a);else finsI.push(s0,a,b);}}
    for(const flip of[0,1]){const s0=hullF.length/3;hullF.push(cx,cy,cz);for(const p of pts)hullF.push(cx+(p[0]-cx)*sc,cy+(p[1]-cy)*sc,cz+(p[2]-cz)*sc);for(let i=0;i<pts.length;i++){const a=s0+1+i,b=s0+1+(i+1)%pts.length;if(flip)hullFI.push(s0,b,a);else hullFI.push(s0,a,b);}} };
  fin([[0,.04,-.46],[0,.17,-.66],[0,.25,-.86],[0,.12,-.82],[0,.02,-.74],[0,-.12,-.82],[0,-.25,-.86],[0,-.17,-.66],[0,-.04,-.46]],.72);                 // 尾鰭
  fin([[0,.2,.22],[0,.3,.12],[0,.31,-.02],[0,.25,-.16],[0,.14,-.28]],.62);                                 // 背鰭
  for(const s of[-1,1])fin([[s*.15,-.03,.28],[s*.3,-.07,.22],[s*.37,-.1,.1],[s*.15,-.05,.06]],.9,1);         // 胸鰭
  const base=pos.length/3,allP=pos.concat(finsP),allC=col.concat(finsC),allI=idx.concat(finsI.map(i=>i+base));
  const full=new THREE.BufferGeometry();full.setAttribute('position',new THREE.Float32BufferAttribute(allP,3));full.setAttribute('color',new THREE.Float32BufferAttribute(allC,3));full.setIndex(allI);full.computeVertexNormals();
  const hull=new THREE.BufferGeometry();hull.setAttribute('position',new THREE.Float32BufferAttribute(hullP.concat(hullF),3));hull.setIndex(idx.concat(hullFI.map(i=>i+base)));
  const ball=(r,x,y,z,seg=8)=>{const g=new THREE.SphereGeometry(r,seg,6);g.translate(x,y,z);return g;};
  const two=(a,b)=>{const g=new THREE.BufferGeometry(),pa=a.attributes.position.array,pb=b.attributes.position.array,na=a.attributes.normal.array,nb=b.attributes.normal.array,ia=a.index.array,ib=b.index.array,off=pa.length/3;
    g.setAttribute('position',new THREE.Float32BufferAttribute([...pa,...pb],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([...na,...nb],3));g.setIndex([...ia,...[...ib].map(i=>i+off)]);return g;};
  const eye=two(ball(.046,.112,.07,.4),ball(.046,-.112,.07,.4)),pupil=two(ball(.024,.14,.075,.415,6),ball(.024,-.14,.075,.415,6));
  return{full,hull,eye,pupil};
}
/* 身體沿脊椎傳波：頭幾乎不動，越往尾巴擺越大；aSwim=(相位, 擺幅, 轉彎彎度) */
function patchSwim(mat){ mat.onBeforeCompile=sh=>{sh.vertexShader='attribute vec3 aSwim;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float swT=clamp((0.62-position.z)/1.5,0.0,1.0);
  transformed.x+=(0.012+0.34*swT*swT)*aSwim.y*sin(position.z*5.0+aSwim.x);
  transformed.x+=aSwim.z*position.z*position.z*0.55;`);};mat.customProgramCacheKey=()=>'swim'+mat.type;return mat; }

export class Stage{
  constructor(canvas,{style='toon'}={}){
    this.style=style; this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.scene=new THREE.Scene(); this.clock=0; this.onLand=null; this.onSfx=null;
    this.liftL=0; this.liftR=0; this.handL=0; this.handR=0; this.overL=0; this.overR=0; this.cheerT=0;
    this.schools=new Map(); this.flying=[]; this.rigid=[]; this.sw=[]; this.pile=0; this.slippers=0; this._lightFrom=null;
    this.INK=new THREE.MeshBasicMaterial({color:0x2a2420,side:THREE.BackSide});
    this.ramp=(()=>{const c=document.createElement('canvas');c.width=4;c.height=1;const x=c.getContext('2d');['#8f8f8f','#c8c8c8','#f2f2f2','#ffffff'].forEach((k,i)=>{x.fillStyle=k;x.fillRect(i,0,1,1)});
      const t=new THREE.CanvasTexture(c);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;return t})();
    this.buildLight(); this.cam=this.fitCamera();
    this.curve=new THREE.CatmullRomCurve3(PATH.map(([x,z])=>new V3(x,0,z)),false,'centripetal'); this.len=this.curve.getLength();
    let u0=1;for(let i=0;i<=500;i++){const u=i/500,p=this.curve.getPointAt(u);if(Math.abs(p.x)<.6&&p.z>=1.1){u0=u;break;}}
    this.uNet=u0; this.sNet=u0*this.len; this.sZone=this.sNet-1.6; this.sEnd=this.len-1;
    this.buildGround(); this.buildDecor(); this.buildNet(); this.buildPeople(); this.buildBasket(); this.buildFishPool(); this.buildExtras(); this.buildParticles();
    this.sFirst=this.findFirstVisible(); this.sStart=Math.max(0,this.sFirst-5);
    this.pose();
  }
  /* ---------- 工具 ---------- */
  M(color,o={}){ return this.style==='toon'?new THREE.MeshToonMaterial({color,gradientMap:this.ramp,...o}):new THREE.MeshLambertMaterial({color,...o}); }
  ol(mesh,o=.028){ if(this.style!=='toon')return mesh; const g=mesh.geometry.clone();g.computeBoundingBox();const s=g.boundingBox.getSize(new V3()),c=g.boundingBox.getCenter(new V3());
    g.translate(-c.x,-c.y,-c.z);g.scale(1+2*o/Math.max(s.x,.04),1+2*o/Math.max(s.y,.04),1+2*o/Math.max(s.z,.04));g.translate(c.x,c.y,c.z);mesh.add(new THREE.Mesh(g,this.INK));return mesh; }
  tex(w,h,draw,rep){ const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t; }
  limb(a,b,r,mat,o=.024){ const d=b.clone().sub(a),len=d.length(),m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,4,10),mat);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(Y,d.normalize());m.castShadow=true;return this.ol(m,o); }
  bar(a,b,mesh){ const d=b.clone().sub(a),len=d.length();mesh.position.copy(a).addScaledVector(d,.5);mesh.scale.set(1,len,1);mesh.quaternion.setFromUnitVectors(Y,d.normalize()); }
  width(u){ return W_FAR+(W_NEAR-W_FAR)*THREE.MathUtils.smoothstep(u/this.uNet,.74,1); }
  toPx(v){ const p=v.clone().project(this.cam);return{x:(p.x+1)/2*SW,y:(1-p.y)/2*SH}; }
  setSize(w,h){ this.w=w;this.h=h;this.renderer.setSize(w,h,false); }
  /* ---------- 光與相機 ---------- */
  buildLight(){ this.scene.background=new THREE.Color(LIGHTS[0].sky);
    this.hemi=new THREE.HemisphereLight(LIGHTS[0].hemi,LIGHTS[0].ground,LIGHTS[0].hI); this.sun=new THREE.DirectionalLight(LIGHTS[0].sun,LIGHTS[0].sI);
    this.sun.position.set(-9,20,9);this.sun.target.position.set(0,0,-3);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});this.scene.add(this.hemi,this.sun,this.sun.target); }
  setRound(i,instant=false){ const to=LIGHTS[clamp(i,0,2)]; this._light={to,t:instant?1:0,from:{sky:this.scene.background.clone(),hemi:this.hemi.color.clone(),ground:this.hemi.groundColor.clone(),hI:this.hemi.intensity,sun:this.sun.color.clone(),sI:this.sun.intensity,water:this.waterMat.color.clone()}}; this.stepLight(0); }
  stepLight(dt){ const L=this._light;if(!L||L.t>1.0001&&L.done)return;L.t=Math.min(1,L.t+dt/3);const k=ease(L.t),c=h=>new THREE.Color(h);
    this.scene.background.copy(L.from.sky).lerp(c(L.to.sky),k);this.hemi.color.copy(L.from.hemi).lerp(c(L.to.hemi),k);this.hemi.groundColor.copy(L.from.ground).lerp(c(L.to.ground),k);this.hemi.intensity=lerp(L.from.hI,L.to.hI,k);
    this.sun.color.copy(L.from.sun).lerp(c(L.to.sun),k);this.sun.intensity=lerp(L.from.sI,L.to.sI,k);this.waterMat.color.copy(L.from.water).lerp(c(L.to.water),k);if(L.t>=1)L.done=true; }
  fitCamera(){ const cam=new THREE.PerspectiveCamera(FOV,16/9,2,260),p=PITCH*Math.PI/180;
    const place=(D,zf)=>{cam.position.set(0,D*Math.sin(p),zf+D*Math.cos(p));cam.lookAt(0,0,zf);cam.updateMatrixWorld();cam.updateProjectionMatrix();};
    const nearY=()=>{const v=new V3(0,0,3.75).applyMatrix4(cam.matrixWorldInverse);return v.z>-.5?-9:new V3(0,0,3.75).project(cam).y;};
    const solveZ=D=>{let lo=-40,hi=12;for(let i=0;i<34;i++){const zf=(lo+hi)/2;place(D,zf);if(nearY()<-.97)lo=zf;else hi=zf;}return(lo+hi)/2;};
    let a=4,b=40;for(let i=0;i<24;i++){const D=(a+b)/2,zf=solveZ(D);place(D,zf);if(new V3(-6.5,.2,.55).project(cam).x<-.97)a=D;else b=D;}
    const zf=solveZ(b);place(b,zf);this.camEnd=cam.position.clone();this.lookEnd=P(0,0,zf);return cam; }
  /* 開場：從上游沿溪滑到定點，之後鏡頭固定不動 */
  setIntro(k){ k=ease(clamp(k,0,1));const a=P(23,4.6,-1.5),m=P(9,9,9),e=this.camEnd,q=(x,y,z)=>(1-k)*(1-k)*x+2*k*(1-k)*y+k*k*z;
    this.cam.position.set(q(a.x,m.x,e.x),q(a.y,m.y,e.y),q(a.z,m.z,e.z));const la=P(lerp(9,this.lookEnd.x,k),0,lerp(-11.5,this.lookEnd.z,k));this.cam.lookAt(la);this.cam.updateMatrixWorld(); }
  findFirstVisible(){ for(let s=0;s<this.sNet;s+=.5){const p=this.curve.getPointAt(s/this.len),q=this.toPx(P(p.x,.15,p.z));if(q.x>16&&q.x<SW-16&&q.y>16&&q.y<SH-16)return s;}return 0; }
  /* ---------- 地面、溪流 ---------- */
  ribbon(wFn,y,mat,vs=1){ const n=240,pos=[],uv=[],idx=[];let s=0,prev=null;for(let i=0;i<=n;i++){const u=i/n,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u),w=wFn(u)/2;if(prev)s+=p.distanceTo(prev);prev=p;pos.push(p.x+t.z*w,y,p.z-t.x*w,p.x-t.z*w,y,p.z+t.x*w);uv.push(0,s*vs,1,s*vs);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mat.side=THREE.DoubleSide;const m=new THREE.Mesh(g,mat);m.receiveShadow=true;this.scene.add(m);return m; }
  buildGround(){ const sc=this.scene,M=this.M.bind(this);
    const land=new THREE.Mesh(new THREE.PlaneGeometry(320,320),M(0x8fbe68));land.rotation.x=-Math.PI/2;land.position.set(0,-.03,-60);land.receiveShadow=true;sc.add(land);
    this.ribbon(u=>this.width(u)+1.5,0,M(0xd9cda6));
    const bed=this.tex(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#7cc4cf');g.addColorStop(.2,'#a8e2e6');g.addColorStop(.5,'#c2eff1');g.addColorStop(.8,'#a8e2e6');g.addColorStop(1,'#7cc4cf');x.fillStyle=g;x.fillRect(0,0,w,h);
      for(let i=0;i<46;i++){const a=(i*97)%256,b=(i*61)%256,r=3+(i*13)%9;x.fillStyle=i%3?'rgba(120,188,196,.42)':'rgba(214,246,244,.5)';x.beginPath();x.ellipse(a,b,r*1.3,r,(i*.7)%3,0,7);x.fill();}},[1,1]);
    this.waterMat=new THREE.MeshBasicMaterial({map:bed});this.ribbon(u=>this.width(u),.02,this.waterMat,1/9);
    /* 水面：半透明、會流動，蓋在魚上方，魚才像在水裡 */
    this.waterTex=this.tex(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(190,240,244,0)');g.addColorStop(.14,'rgba(190,240,244,.17)');g.addColorStop(.86,'rgba(190,240,244,.17)');g.addColorStop(1,'rgba(190,240,244,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
      x.lineCap='round';for(let i=0;i<20;i++){const a=26+((i*53)%204),b=(i*37)%256,l=22+(i*11)%40;x.strokeStyle=`rgba(255,255,255,${.34+(i%3)*.14})`;x.lineWidth=2+(i%3);x.beginPath();x.moveTo(a,b);x.quadraticCurveTo(a+((i%2)?7:-7),b+l*.5,a+((i%2)?3:-3),b+l);x.stroke();}},[1,1]);
    const surfM=new THREE.MeshBasicMaterial({map:this.waterTex,transparent:true,depthWrite:false});const surf=this.ribbon(u=>Math.max(1,this.width(u)-1),.42,surfM,1/7);surf.receiveShadow=false;surf.renderOrder=1;
    const stones=[];for(let i=0;i<80;i++){const u=rnd()*.98,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u),s=rnd()<.5?-1:1,w=this.width(u)/2+.55+rnd()*.5;stones.push([p.x+t.z*s*w,p.z-t.x*s*w,.16+rnd()*.26]);}
    const st=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),M(0xa9a495),stones.length),o=new THREE.Object3D();stones.forEach(([x,z,r],i)=>{o.position.set(x,r*.35,z);o.scale.set(r,r*.65,r*1.1);o.rotation.y=rnd()*6;o.updateMatrix();st.setMatrixAt(i,o.matrix);});st.castShadow=true;sc.add(st);
    /* 草叢 */
    const tufts=[];for(let i=0;i<220&&tufts.length<110;i++){const x=-22+rnd()*44,z=-20+rnd()*26;let near=false;for(let u=0;u<=this.uNet+.1&&!near;u+=.02){const p=this.curve.getPointAt(Math.min(u,1));if(Math.hypot(p.x-x,p.z-z)<this.width(u)/2+1)near=true;}if(!near)tufts.push([x,z,.18+rnd()*.2]);}
    const tu=new THREE.InstancedMesh(new THREE.ConeGeometry(.5,1,5),M(0x6da552),tufts.length);tufts.forEach(([x,z,r],i)=>{o.position.set(x,r*.5,z);o.scale.set(r*1.2,r*1.1,r*1.2);o.rotation.y=rnd()*6;o.updateMatrix();tu.setMatrixAt(i,o.matrix);});sc.add(tu);
    const hills=new THREE.Group(),hm=[M(0x6f9f7a),M(0x7daa86),M(0x8bb6a0)];for(let i=0;i<9;i++){const x=-34+i*8.5+rnd()*3,r=8+rnd()*7,h=7+rnd()*7,c=new THREE.Mesh(new THREE.ConeGeometry(r,h,8),hm[i%3]);c.position.set(x,h/2-.02,HILL_Z-r-rnd()*6);c.rotation.y=rnd()*3;hills.add(c);}sc.add(hills);this.hills=hills;
  }
  blocksPath(x,z,h,r){ const b=this.toPx(P(x,0,z)),t=this.toPx(P(x,h,z)),rp=Math.abs(this.toPx(P(x+r,h*.5,z)).x-this.toPx(P(x,h*.5,z)).x)+12,cam=this.camEnd,d=cam.distanceTo(P(x,0,z));
    for(let s=0;s<=this.sNet;s+=.6){const p=this.curve.getPointAt(s/this.len),px=this.toPx(p);if(px.x>b.x-rp&&px.x<b.x+rp&&px.y>t.y-10&&px.y<b.y+10&&cam.distanceTo(p)>d-1)return true;}return false; }
  nearRiver(x,z,m=2){ for(let s=0;s<=this.len;s+=.8){const u=s/this.len,p=this.curve.getPointAt(u);if(Math.hypot(p.x-x,p.z-z)<this.width(Math.min(u,this.uNet))/2+m)return true;}return false; }
  buildDecor(){ const sc=this.scene,M=this.M.bind(this),o=new THREE.Object3D();
    /* 樹 */
    const keep=[];for(let i=0;i<260&&keep.length<28;i++){const x=-26+rnd()*52,z=-32+rnd()*36;if(Math.abs(x)<7.4&&z>-3)continue;if(this.nearRiver(x,z,2.2))continue;const h=2.6+rnd()*1.6,r=1+rnd()*.4;if(this.blocksPath(x,z,h+1,r))continue;keep.push([x,z,h,r]);}
    const crown=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),M(0x4f8f55),keep.length),trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.2,1,6),M(0x7b5b3a),keep.length);
    keep.forEach(([x,z,h,r],i)=>{o.position.set(x,h*.75,z);o.scale.set(r,h,r);o.rotation.y=rnd()*6;o.updateMatrix();crown.setMatrixAt(i,o.matrix);o.position.set(x,h*.2,z);o.scale.set(1,h*.45,1);o.updateMatrix();trunk.setMatrixAt(i,o.matrix);});crown.castShadow=trunk.castShadow=true;sc.add(crown,trunk);
    /* 竹叢 */
    const bamboo=(x,z)=>{const g=new THREE.Group();const stem=M(0x7fa651),leaf=M(0x5a9a4c);for(let i=0;i<7;i++){const a=rnd()*6.28,r=rnd()*.5,h=3+rnd()*1.6,c=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,h,6),stem);c.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);c.rotation.z=(rnd()-.5)*.16;c.castShadow=true;g.add(c);const l=new THREE.Mesh(new THREE.SphereGeometry(.55+rnd()*.25,7,5),leaf);l.scale.y=.7;l.position.set(c.position.x,h*.92,c.position.z);l.castShadow=true;g.add(l);}g.position.set(x,0,z);sc.add(g);};
    for(const[x,z]of[[-9.2,1.8],[9.3,2.2],[12.6,-1.4],[-12,-3.6]])if(!this.blocksPath(x,z,4.6,1)&&!this.nearRiver(x,z,.8))bamboo(x,z);
    /* 土地公廟 */
    const shrine=new THREE.Group(),brick=new THREE.Mesh(new THREE.BoxGeometry(1,.9,.8),M(0xc2543f));brick.position.y=.45;brick.castShadow=true;shrine.add(this.ol(brick,.02));
    const roof=new THREE.Mesh(new THREE.ConeGeometry(.92,.55,4),M(0x8f2f24));roof.rotation.y=Math.PI/4;roof.position.y=1.15;roof.castShadow=true;shrine.add(this.ol(roof,.02));
    const door=new THREE.Mesh(new THREE.PlaneGeometry(.42,.56),new THREE.MeshBasicMaterial({color:0x3a1f18}));door.position.set(0,.36,.405);shrine.add(door);const inc=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.22,8),M(0xd9a441));inc.position.set(0,.11,.62);shrine.add(inc);
    shrine.position.set(4.2,0,-16.4);shrine.rotation.y=-.2;shrine.scale.setScalar(1.15);sc.add(shrine);
    /* 三合院（溪遠處） */
    const house=new THREE.Group(),wall=M(0xd8b98c),tile=M(0xb14a35);for(const[x,z,w,d]of[[0,0,3.2,1.2],[-1.6,1.1,1,1.8],[1.6,1.1,1,1.8]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,.9,d),wall);b.position.set(x,.45,z);b.castShadow=true;house.add(this.ol(b,.02));const r=new THREE.Mesh(new THREE.ConeGeometry(.75,.5,4),tile);r.rotation.y=Math.PI/4;r.scale.set(w/1.05,1,d/1.05);r.position.set(x,1.12,z);house.add(r);}
    house.position.set(-5.6,0,-18.4);house.rotation.y=.12;house.scale.setScalar(1.25);sc.add(house);
    /* 秧苗田（平的，不擋路） */
    const paddy=this.tex(128,128,(x,w,h)=>{x.fillStyle='#b7dcc9';x.fillRect(0,0,w,h);x.fillStyle='#5f9f4d';for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.beginPath();x.arc(8+i*16,8+j*16,3.4,0,7);x.fill();}},[3,2]);
    const pad=new THREE.Mesh(new THREE.PlaneGeometry(6.4,4.2),new THREE.MeshBasicMaterial({map:paddy}));pad.rotation.x=-Math.PI/2;pad.rotation.z=.15;pad.position.set(7.8,.01,-7.2);sc.add(pad);
    /* 鷺鷥 */
    this.egrets=[];const eg=(x,z,ry)=>{const g=new THREE.Group(),w=M(0xfbfaf4);const b=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),w);b.scale.set(.17,.17,.34);b.position.y=.62;g.add(this.ol(b,.015));const n=new THREE.Mesh(new THREE.CylinderGeometry(.028,.04,.42,6),w);n.position.set(0,.9,-.24);n.rotation.x=-.35;g.add(n);const h=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),w);h.position.set(0,1.1,-.33);g.add(h);const be=new THREE.Mesh(new THREE.ConeGeometry(.025,.2,5),M(0xe9b63b));be.rotation.x=-Math.PI/2;be.position.set(0,1.09,-.46);g.add(be);for(const s of[-1,1]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.5,4),M(0x3b3a33));l.position.set(s*.06,.26,0);g.add(l);}g.position.set(x,0,z);g.rotation.y=ry;g.scale.setScalar(1.25);sc.add(g);this.egrets.push(g);};
    eg(4.9,-5.6,.8);eg(-9.6,-4.6,-1.9);
  }
  /* ---------- 網、人、竹簍 ---------- */
  buildNet(){ const M=this.M.bind(this),geo=new THREE.PlaneGeometry(NW,ND,24,12);geo.rotateX(-Math.PI/2);this.netGeo=geo;
    const tex=this.tex(128,128,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(58,46,34,.9)';x.lineWidth=7;x.strokeRect(0,0,w,h);},[10,4]);
    this.net=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));this.net.position.z=NET_Z;this.net.renderOrder=2;this.scene.add(this.net);
    const barM=M(0xb8953f),rope=M(0x4a3b2b),bar=(r,m)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,8),m);c.castShadow=true;this.scene.add(c);return c;};
    this.barL=bar(.075,barM);this.barR=bar(.075,barM);this.poleL=bar(.075,barM);this.poleR=bar(.075,barM);this.ropeF=bar(.035,rope);this.ropeB=bar(.035,rope);
    this.floats=[];for(let i=0;i<7;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),M(0xe8622c));this.scene.add(f);this.floats.push(f);} }
  makePerson(kind){ const M=this.M.bind(this),g=new THREE.Group(),skin=M(0xe8bf97);
    const shirt=kind==='bo'?M(0xf4efe2):M(0xffffff,{map:this.tex(64,64,(x,w,h)=>{x.fillStyle='#c94f3d';x.fillRect(0,0,w,h);x.fillStyle='#ffe7c9';for(const[a,b]of[[12,12],[44,20],[24,44],[54,52]]){x.beginPath();x.arc(a,b,5,0,7);x.fill();}},[2,2])});
    const pants=M(kind==='bo'?0x3f5f86:0x4c4453),wood=M(0x9a6b3e),body=new THREE.Group();g.add(body);
    const stool=new THREE.Mesh(new THREE.CylinderGeometry(.34,.38,.42,14),wood);stool.position.y=.21;stool.castShadow=true;g.add(this.ol(stool));
    const hipY=.48,shY=hipY+.62;body.add(this.limb(P(0,hipY,0),P(0,shY,0),.24,shirt));
    for(const s of[-1,1]){g.add(this.limb(P(s*.13,hipY,-.02),P(s*.17,hipY,-.48),.1,pants));g.add(this.limb(P(s*.17,hipY,-.48),P(s*.17,.08,-.5),.085,pants));const foot=new THREE.Mesh(new THREE.BoxGeometry(.16,.09,.3),M(0x3a2f28));foot.position.set(s*.17,.05,-.58);g.add(this.ol(foot,.015));}
    const head=new THREE.Mesh(new THREE.SphereGeometry(.21,16,12),skin);head.position.set(0,shY+.28,0);head.castShadow=true;body.add(this.ol(head));
    if(kind==='bo'){const hat=new THREE.Mesh(new THREE.ConeGeometry(.46,.22,18),M(0xd9b56c));hat.position.set(0,shY+.47,0);hat.castShadow=true;body.add(this.ol(hat,.02));}
    else{const hair=new THREE.Mesh(new THREE.SphereGeometry(.225,16,12),M(0x5c5560));hair.position.set(0,shY+.32,.03);body.add(this.ol(hair,.016));const bun=new THREE.Mesh(new THREE.SphereGeometry(.1,12,10),M(0x5c5560));bun.position.set(0,shY+.46,.16);body.add(this.ol(bun,.012));}
    const arms=[];let hand=null;for(const s of[-1,1]){const a=new THREE.Group();a.position.set(s*.28,shY-.03,0);const sleeve=kind==='bo'?skin:shirt;a.add(this.limb(P(0,0,0),P(s*.02,-.32,-.03),.075,sleeve,.018));a.add(this.limb(P(s*.02,-.32,-.03),P(s*.03,-.62,-.12),.065,skin,.016));const h=new THREE.Mesh(new THREE.SphereGeometry(.08,10,8),skin);h.position.set(s*.03,-.66,-.13);a.add(h);body.add(a);arms.push(a);if(s===-1)hand=h;}
    g.userData={arms,hand,body};return g; }
  buildPeople(){ this.bo=this.makePerson('bo');this.bo.position.set(-5.1,0,.55);this.bo.rotation.y=-Math.PI/2+.45;this.bo.scale.setScalar(1.45);this.scene.add(this.bo);
    this.ma=this.makePerson('ma');this.ma.position.set(5.1,0,.55);this.ma.rotation.y=Math.PI/2-.45;this.ma.scale.setScalar(1.45);this.scene.add(this.ma); }
  buildBasket(){ const M=this.M.bind(this),g=new THREE.Group(),rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),M(0xa9a495));rock.scale.set(1.15,.2,.72);rock.position.set(0,.1,2.9);rock.receiveShadow=true;g.add(this.ol(rock,.02));
    const wv=this.tex(128,128,(x,w,h)=>{x.fillStyle='#c79f5d';x.fillRect(0,0,w,h);x.strokeStyle='#9c7537';x.lineWidth=5;for(let i=0;i<9;i++){x.beginPath();x.moveTo(0,i*16);x.lineTo(w,i*16);x.stroke();x.beginPath();x.moveTo(i*16,0);x.lineTo(i*16,h);x.stroke();}},[5,2]);
    const bk=new THREE.Mesh(new THREE.CylinderGeometry(.62,.44,.62,18,1,true),M(0xffffff,{map:wv,side:THREE.DoubleSide}));bk.position.set(0,.56,2.9);bk.castShadow=true;g.add(this.ol(bk,.022));this.basketMesh=bk;
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.62,.04,8,22),M(0x9c7537));rim.rotation.x=Math.PI/2;rim.position.set(0,.87,2.9);g.add(rim);
    const inside=new THREE.Mesh(new THREE.CircleGeometry(.58,18),M(0x54391f));inside.rotation.x=-Math.PI/2;inside.position.set(0,.7,2.9);g.add(inside);this.scene.add(g);this.basketGroup=g;
    /* 竹簍裡的魚會越堆越多 */
    this.PILE_MAX=90;const body=new THREE.SphereGeometry(.5,8,6);body.scale(.36,.42,1);const tail=new THREE.ConeGeometry(.24,.38,4);tail.rotateX(Math.PI/2);tail.scale(.3,1,1);tail.translate(0,0,-.58);
    this.pileBody=new THREE.InstancedMesh(body,M(0xffffff),this.PILE_MAX);this.pileTail=new THREE.InstancedMesh(tail,M(0xffffff),this.PILE_MAX);this.pileBody.count=this.pileTail.count=0;this.pileBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(this.pileBody,this.pileTail); }
  addToPile(kind){ if(this.pile>=this.PILE_MAX)return;const i=this.pile++,o=new THREE.Object3D();const f=i/this.PILE_MAX;const R=f<.45?.5*Math.sqrt(rnd()):.3+rnd()*.72,a=rnd()*6.28,y=f<.45?.76+f*.4+rnd()*.05:.42+rnd()*.5;
    o.position.set(Math.cos(a)*R,y,2.9+Math.sin(a)*R*.72);o.rotation.set((rnd()-.5)*.9,a,(rnd()-.5)*1.4);o.scale.setScalar((kind==='big'?.74:.46)+rnd()*.06);o.updateMatrix();this.pileBody.setMatrixAt(i,o.matrix);this.pileTail.setMatrixAt(i,o.matrix);
    const c=new THREE.Color(kind==='gold'?0xf2a81d:kind==='big'?0xc44a2c:kind==='crab'?0xd9543a:0x2e4a5c);this.pileBody.setColorAt(i,c);this.pileTail.setColorAt(i,c);this.pileBody.count=this.pileTail.count=this.pile;this.pileBody.instanceMatrix.needsUpdate=this.pileTail.instanceMatrix.needsUpdate=true;this.pileBody.instanceColor.needsUpdate=this.pileTail.instanceColor.needsUpdate=true;this.basketBump=1; }
  resetPile(){ this.pile=0;this.pileBody.count=this.pileTail.count=0;for(const m of(this.slipperMeshes||[]))m.visible=false;this.slippers=0; }
  /* ---------- 魚 ---------- */
  buildFishPool(){ const M=this.M.bind(this),G=fishGeometry();this.N=72;
    /* 游泳中的魚：一次畫完，身體波動在顯示卡算 */
    const attr=new THREE.InstancedBufferAttribute(new Float32Array(this.N*3),3);attr.setUsage(THREE.DynamicDrawUsage);this.swimAttr=attr;
    const mk=(geo,mat)=>{const g=geo.clone();g.setAttribute('aSwim',attr);const m=new THREE.InstancedMesh(g,patchSwim(mat),this.N);m.frustumCulled=false;m.count=0;this.scene.add(m);return m;};
    this.swBody=mk(G.full,M(0xffffff,{vertexColors:true}));this.swBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.swBody.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(this.N*3),3);this.swBody.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.swParts=[this.swBody,mk(G.eye,new THREE.MeshBasicMaterial({color:0xffffff})),mk(G.pupil,new THREE.MeshBasicMaterial({color:0x111111}))];
    if(this.style==='toon')this.swParts.push(mk(G.hull,new THREE.MeshBasicMaterial({color:0x2a2420,side:THREE.BackSide})));
    for(const m of this.swParts)if(m!==this.swBody)m.instanceMatrix=this.swBody.instanceMatrix;
    const sg=new THREE.CircleGeometry(.5,14);sg.rotateX(-Math.PI/2);this.swShadow=new THREE.InstancedMesh(sg,new THREE.MeshBasicMaterial({color:0x2f6f7c,transparent:true,opacity:.26,depthWrite:false}),this.N);this.swShadow.frustumCulled=false;this.swShadow.count=0;this.swShadow.renderOrder=0;this.scene.add(this.swShadow);
    for(let i=0;i<this.N;i++)this.sw.push({busy:false});
    /* 撈起來、飛在空中的魚：一條一條畫 */
    this.mFish=M(0x56798d,{vertexColors:true});this.mGold=M(0xf7a51e,{vertexColors:true});this.mBig=M(0xd2502e,{vertexColors:true});
    const ink=new THREE.MeshBasicMaterial({color:0x2a2420,side:THREE.BackSide}),white=new THREE.MeshBasicMaterial({color:0xffffff}),black=new THREE.MeshBasicMaterial({color:0x111111});
    for(let i=0;i<26;i++){const g=new THREE.Group(),b=new THREE.Mesh(G.full,this.mFish);g.add(b);if(this.style==='toon')g.add(new THREE.Mesh(G.hull,ink));g.add(new THREE.Mesh(G.eye,white),new THREE.Mesh(G.pupil,black));g.visible=false;this.scene.add(g);this.rigid.push({g,b,busy:false,kind:'fish'});} }
  setFishKind(f,kind){ f.kind=kind;f.b.material=kind==='gold'?this.mGold:kind==='big'?this.mBig:this.mFish; }
  allocFish(){ const f=this.rigid.find(x=>!x.busy);if(f){f.busy=true;f.g.visible=false;}return f; }
  freeFish(f){ f.busy=false;f.g.visible=false;f.g.rotation.set(0,0,0); }
  /* 驚喜：竹簍外的東西 */
  buildExtras(){ const M=this.M.bind(this);this.extras={};
    const crab=()=>{const g=new THREE.Group(),m=M(0xd9543a);const b=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),m);b.scale.set(1.2,.55,.9);g.add(this.ol(b,.02));for(const s of[-1,1]){for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.035,.03,.4,5),m);l.position.set(s*.38,-.06,-.14+i*.14);l.rotation.z=s*1.1;g.add(l);}const c=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),m);c.position.set(s*.42,.05,.3);g.add(this.ol(c,.014));const e=new THREE.Mesh(new THREE.SphereGeometry(.05,6,5),new THREE.MeshBasicMaterial({color:0x111111}));e.position.set(s*.1,.18,.24);g.add(e);}g.scale.setScalar(1.6);return g;};
    const turtle=()=>{const g=new THREE.Group(),sh=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),M(0x4f7a3f));sh.scale.set(1,.5,1.2);sh.position.y=.08;g.add(this.ol(sh,.02));const sk=M(0x9dbb6a),he=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),sk);he.position.set(0,.06,.58);g.add(this.ol(he,.014));for(const[x,z]of[[-.32,.3],[.32,.3],[-.32,-.3],[.32,-.3]]){const l=new THREE.Mesh(new THREE.SphereGeometry(.1,6,5),sk);l.scale.set(1.2,.5,.8);l.position.set(x,-.05,z);g.add(l);}g.scale.setScalar(1.5);return g;};
    const slipperGeo=()=>{const g=new THREE.Group(),sole=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.5,4,10),M(0xf4f6f8));sole.rotation.x=Math.PI/2;sole.scale.y=1;sole.scale.z=.26;g.add(this.ol(sole,.016));const st=M(0x2b6fc0);for(const s of[-1,1]){const k=new THREE.Mesh(new THREE.TorusGeometry(.17,.035,6,10,Math.PI),st);k.rotation.y=Math.PI/2*s*0;k.position.set(0,.02,.1);k.rotation.x=0;g.add(k);break;}const v=new THREE.Mesh(new THREE.BoxGeometry(.36,.05,.08),st);v.position.set(0,.14,.1);g.add(v);g.scale.setScalar(1.15);return g;};
    this.extras.crab=crab();this.extras.turtle=turtle();this.slipperMeshes=[];for(let i=0;i<6;i++){const s=slipperGeo();s.visible=false;this.scene.add(s);this.slipperMeshes.push(s);}
    this.scene.add(this.extras.crab,this.extras.turtle);this.extras.crab.visible=this.extras.turtle.visible=false; }
  /* ---------- 粒子 ---------- */
  buildParticles(){ this.DROPS=120;this.drops=[];this.dropMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.05,6,4),new THREE.MeshBasicMaterial({color:0xeafcff}),this.DROPS);this.dropMesh.frustumCulled=false;this.dropMesh.count=0;this.scene.add(this.dropMesh);this._o=new THREE.Object3D();
    this.rings=[];for(let i=0;i<14;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.42,.56,20),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));r.rotation.x=-Math.PI/2;r.visible=false;r.renderOrder=1;this.scene.add(r);this.rings.push({m:r,t:9});} }
  splash(x,y,z,n=10,pow=1){ for(let i=0;i<n;i++){if(this.drops.length>=this.DROPS)this.drops.shift();const a=rnd()*6.28,v=(.8+rnd()*1.6)*pow;this.drops.push({x,y,z,vx:Math.cos(a)*v,vy:(1.6+rnd()*2.6)*pow,vz:Math.sin(a)*v,t:0});} }
  ring(x,z,size=1){ const r=this.rings.find(q=>q.t>=1)||this.rings[0];r.t=0;r.size=size;r.m.position.set(x,.44,z);r.m.visible=true; }
  /* ---------- 魚群同步 ---------- */
  syncSchools(list){ const seen=new Set();
    for(const sc of list){ seen.add(sc.id);
      if(!this.schools.has(sc.id)){ const fish=[],spread=sc.size*.85;
        for(let i=0;i<sc.size;i++){const f=this.sw.find(x=>!x.busy);if(!f)break;const kind=i<(sc.gold||0)?'gold':'fish';
          Object.assign(f,{busy:true,on:false,free:true,kind,back:(i+rnd()*.9)/sc.size*spread,off:(rnd()-.5)*.72,size:.88+rnd()*.26,shade:.9+rnd()*.2,
            w1:.23+rnd()*.3,w2:.5+rnd()*.5,w3:.17+rnd()*.25,p1:rnd()*6.28,p2:rnd()*6.28,p3:rnd()*6.28,agile:rnd(),burst:rnd()<.5,burstT:rnd()*.8,phase:rnd()*6.28,amp:.6,bend:0,v:0,h:0,x:0,z:0,y:.16,way:null,wayT:0,jumpT:-1,startle:0,pitch:0,sx:undefined,sz:undefined});fish.push(f);}
        this.schools.set(sc.id,{sc,fish,lastS:sc.s,lv:0,jumpAt:this.clock+2+rnd()*6}); }
      else this.schools.get(sc.id).sc=sc; }
    for(const[id,v]of this.schools){ if(!seen.has(id)){for(const f of v.fish)f.busy=false;this.schools.delete(id);} } }
  clearAll(){ for(const f of this.sw)f.busy=false;this.schools.clear();for(const q of this.flying){if(q.f)this.freeFish(q.f);if(q.ex)q.ex.visible=false;}this.flying.length=0;this.overL=this.overR=0;this.drops.length=0; }
  buildRiverSamples(){ this.samples=[];for(let s=0;s<=this.len;s+=.5){const u=s/this.len,p=this.curve.getPointAt(u);this.samples.push({x:p.x,z:p.z,w:this.width(Math.min(u,this.uNet))});} }
  /* 每條魚各自追一個會飄的目標：有轉彎上限、會避開同伴、不會游上岸 */
  stepFish(dt){ if(!this.samples)this.buildRiverSamples();const T=this.clock,o=this._o2||(this._o2=new THREE.Object3D()),o2=this._o3||(this._o3=new THREE.Object3D());let n=0;const col=new THREE.Color(),GOLD=new THREE.Color(0xf7a51e),FISH=new THREE.Color(0x56798d),attr=this.swimAttr;
    for(const[,v]of this.schools){ const sc=v.sc,dS=dt>0?(sc.s-v.lastS)/dt:0;v.lastS=sc.s;v.lv+=(dS-v.lv)*Math.min(1,dt*3);const lead=Math.max(0,v.lv);
      const swimming=sc.state==='swim',zone=sc.state==='zone',flee=sc.state==='caught'||sc.state==='passed';
      if(flee&&!v.fled){v.fled=true;for(const f of v.fish)if(f.free)f.startle=sc.state==='caught'?.7:.15;}
      if(swimming&&T>v.jumpAt){const c=v.fish.filter(f=>f.free&&f.on&&f.jumpT<0);if(c.length){c[Math.floor(rnd()*c.length)].jumpT=0;}v.jumpAt=T+5+rnd()*8;}
      for(const f of v.fish){ if(!f.free)continue;
        const anchor=sc.s-f.back;if(anchor<0)continue;
        if(!f.on){const u=clamp(anchor/this.len,0,1),p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u),w=this.width(Math.min(u,this.uNet));f.on=true;f.x=p.x+t.z*f.off*w;f.z=p.z-t.x*f.off*w;f.h=Math.atan2(t.x,t.z);f.v=lead;}
        let tx,tz,des;
        if(zone){ if(!f.way||T>f.wayT||Math.hypot(f.way.x-f.x,f.way.z-f.z)<.55){f.way={x:(rnd()-.5)*NW*.84,z:NET_Z+(rnd()-.5)*ND*.82};f.wayT=T+1.4+rnd()*2.6;}tx=f.way.x;tz=f.way.z;des=1.05+f.agile*.8;const dd=Math.hypot(tx-f.x,tz-f.z);if(dd>3)des=3.4; }
        else{ const look=flee?6:1.1,u=clamp((anchor+look)/this.len,0,1),p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u),w=this.width(Math.min(u,this.uNet));
          const lat=f.off+Math.sin(T*f.w1+f.p1)*.15+Math.sin(T*f.w2+f.p2)*.06,lon=Math.sin(T*f.w3+f.p3)*.9,cl=clamp(lat,-.42,.42);
          tx=p.x+t.z*cl*w+t.x*lon;tz=p.z-t.x*cl*w+t.z*lon;const dd=Math.hypot(tx-f.x,tz-f.z);
          des=flee?Math.max(lead*1.15,3.2):clamp(lead*.92+(dd-1.1)*1.25,.5,lead+2.4); }
        if(f.startle>0){f.startle-=dt;des=Math.max(des,5.6);}
        let dx=tx-f.x,dz=tz-f.z;const dist=Math.max(.001,Math.hypot(dx,dz));dx/=dist;dz/=dist;
        let px=0,pz=0;for(const q of v.fish){if(q===f||!q.free||!q.on)continue;const ax=f.x-q.x,az=f.z-q.z,d=Math.hypot(ax,az),R=1.05+.75*(1-clamp(anchor/this.sNet,0,1));if(d<R&&d>.001){const k=(R-d)/d;px+=ax*k;pz+=az*k;}}
        const rx=f.x,rz=f.z-2.9,rd=Math.hypot(rx/1.25,rz/.82);if(rd<1.9&&rd>.001){const k=(1.9-rd)*1.5/rd;px+=rx*k;pz+=rz*k;}
        const kS=Math.min(1,dt*(f.startle>0?12:3.4));f.sx=(f.sx??dx)+(dx+px*1.35-(f.sx??dx))*kS;f.sz=(f.sz??dz)+(dz+pz*1.35-(f.sz??dz))*kS;const want=Math.atan2(f.sx,f.sz);let dh=want-f.h;while(dh>Math.PI)dh-=6.2832;while(dh<-Math.PI)dh+=6.2832;
        const maxTurn=(1.45+f.agile*.85)*(f.startle>0?2.2:1),turn=clamp(dh,-maxTurn*dt,maxTurn*dt);f.h+=turn;
        f.bend+=(clamp(dh*.55,-.75,.75)-f.bend)*Math.min(1,dt*5);
        /* 衝一下、滑一下 */
        f.burstT-=dt;if(f.burstT<=0){f.burst=!f.burst;f.burstT=f.burst?.42+rnd()*.6:.32+rnd()*.85;}
        const thrust=f.burst?1.18:.84;f.v+=(des*thrust*(1-Math.min(.45,Math.abs(dh)*.28))-f.v)*Math.min(1,dt*2.6);
        f.x+=Math.sin(f.h)*f.v*dt;f.z+=Math.cos(f.h)*f.v*dt;
        if(rd<1){const k=Math.min(1,dt*7);f.x+=(rx/rd-f.x)*k;f.z+=(2.9+rz/rd*.656-f.z)*k;}
        /* 不上岸 */
        const si=Math.round(clamp(anchor,0,this.len)/.5);let best=null,bd=1e9;for(let i=Math.max(0,si-20);i<=Math.min(this.samples.length-1,si+20);i+=2){const q=this.samples[i],d=(q.x-f.x)**2+(q.z-f.z)**2;if(d<bd){bd=d;best=q;}}
        if(best){const d=Math.sqrt(bd),lim=best.w/2-.42;if(d>lim&&d>.001){const k=Math.min(1,dt*7);f.x+=(best.x+(f.x-best.x)*lim/d-f.x)*k;f.z+=(best.z+(f.z-best.z)*lim/d-f.z)*k;}}
        /* 尾巴打水的快慢跟著速度，衝的時候擺得大 */
        const beat=(6.5+f.v*2.5)*(f.burst?1.15:.6);f.phase+=beat*dt;f.amp+=((f.burst?1:.34)*(f.startle>0?1.35:1)-f.amp)*Math.min(1,dt*5);
        /* 跳出水面 */
        let y=.16+Math.sin(T*1.3+f.p1)*.018,pitch=clamp(-f.v*.0,0,0),amp=f.amp;
        if(f.jumpT>=0){f.jumpT+=dt/.82;const q=f.jumpT;if(q===dt/.82||q<dt/.82*1.5){this.ring(f.x,f.z,.8);this.splash(f.x,.4,f.z,5,.6);}
          if(q>=1){f.jumpT=-1;this.ring(f.x,f.z,1.05);this.splash(f.x,.4,f.z,7,.75);}else{y=.16+1.45*Math.sin(Math.PI*q);pitch=-(1-2*q)*.95;amp=1.25;}}
        const sc2=f.size*(1+.35*(1-clamp(anchor/this.sNet,0,1)));
        o.position.set(f.x,y,f.z);o.rotation.set(pitch,f.h,-f.bend*.32,'YXZ');o.scale.setScalar(sc2);o.updateMatrix();this.swBody.setMatrixAt(n,o.matrix);
        attr.setXYZ(n,f.phase,amp,f.bend);col.copy(f.kind==='gold'?GOLD:FISH).multiplyScalar(f.shade);this.swBody.setColorAt(n,col);
        const sh=f.jumpT>=0?.55:1;o2.position.set(f.x+.17,.035,f.z-.15);o2.rotation.set(0,f.h,0);o2.scale.set(.52*sc2*sh,1,1.42*sc2*sh);o2.updateMatrix();this.swShadow.setMatrixAt(n,o2.matrix);
        n++; if(n>=this.N)break;
      } if(n>=this.N)break; }
    for(const m of this.swParts)m.count=n;this.swShadow.count=n;this.swBody.instanceMatrix.needsUpdate=true;this.swBody.instanceColor.needsUpdate=true;this.swShadow.instanceMatrix.needsUpdate=true;attr.needsUpdate=true;
  }
  /* 撈起來 */
  netPoint(u,v){ const yL=.44+1.9*this.liftL,yR=.44+1.9*this.liftR,avg=(this.liftL+this.liftR)/2;return P((u-.5)*NW,yL+(yR-yL)*u-(.38+.67*avg)*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.16,NET_Z+(v-.5)*ND); }
  scoop(ev){ const{kind,first,items,school}=ev,v=this.schools.get(school.id);const both=kind==='together';
    if(both)this.cheerT=2.2;
    const cx=both?0:(first==='a'?-NW*.23:NW*.23);
    const fishes=v?v.fish.filter(f=>f.free&&f.on).sort((a,b)=>Math.hypot(a.x-cx,a.z-NET_Z)-Math.hypot(b.x-cx,b.z-NET_Z)):[];let delay=.62;
    const side=first==='a'?.27:.73;
    const take=want=>{let i=fishes.findIndex(f=>f.kind===want);if(i<0)i=fishes.findIndex(f=>f.kind==='fish');return i<0?null:fishes.splice(i,1)[0];};
    for(const it of items){ let q=null;
      if(it.kind==='fish'||it.kind==='gold'||it.kind==='big'){const r=this.allocFish();if(!r)continue;let start=null;if(it.kind!=='big'){const s=take(it.kind);if(s){s.free=false;start=P(s.x,.16,s.z);}}r.g.visible=true;this.setFishKind(r,it.kind);r.g.scale.setScalar(it.kind==='big'?2.1:1);q={f:r,obj:r.g,start};}
      else if(it.kind==='crab'||it.kind==='turtle'){const e=this.extras[it.kind];e.visible=true;q={ex:e,obj:e};}
      else if(it.kind==='slipper'){const e=this.slipperMeshes[this.slippers%this.slipperMeshes.length];this.slippers++;e.visible=true;q={ex:e,obj:e,keep:true};}
      if(!q)continue;
      const u=both?.5+(rnd()-.5)*.62:side+(rnd()-.5)*.2,w=.5+(rnd()-.5)*.6;
      Object.assign(q,{mode:'net',t:0,delay,u,v:w,kind:it.kind,spin:(rnd()-.5)*9});
      if(it.kind==='turtle')q.to=P(1.9,.05,-2.6);else if(it.kind==='slipper')q.to=P(first==='b'?3.9+rnd()*.5:-3.9-rnd()*.5,.12,2.2+rnd()*.7);else q.to=P((rnd()-.5)*.36,.92,2.9+(rnd()-.5)*.26);
      this.flying.push(q);delay+=both?.09:.14;
    }
    const hold=Math.max(1.75,delay+.35);if(both||first==='a')this.overL=hold;if(both||first==='b')this.overR=hold;
    this.splash(0,.2,NET_Z,both?26:12,both?1.1:.8);this.ring(-2,NET_Z,1.6);this.ring(2,NET_Z,1.6);this.ring(0,NET_Z+.8,2);
    this.onSfx&&this.onSfx('lift',both);
  }
  stepFlying(dt){ for(let i=this.flying.length-1;i>=0;i--){const q=this.flying[i];q.t+=dt;
      if(q.mode==='net'){const p=this.netPoint(q.u,q.v);if(q.start&&q.t<.3)q.obj.position.lerpVectors(q.start,p,ease(q.t/.3));else q.obj.position.copy(p);q.obj.rotation.set(Math.sin(this.clock*14+i)*.35,this.clock*.6+i,Math.PI/2*Math.sin(this.clock*11+i)*.5);
        if(q.t>=q.delay){q.mode='fly';q.t=0;q.from=p.clone();q.dur=.72;q.h=2.6+rnd()*.7;}}
      else{const k=Math.min(1,q.t/q.dur);q.obj.position.lerpVectors(q.from,q.to,k);q.obj.position.y+=q.h*4*k*(1-k);q.obj.rotation.x+=q.spin*dt;q.obj.rotation.z+=q.spin*.6*dt;
        if(k>=1){ if(q.kind==='turtle'){this.ring(q.to.x,q.to.z,1.3);this.splash(q.to.x,.1,q.to.z,12,.9);q.obj.visible=false;this.onSfx&&this.onSfx('splash');}
          else if(q.keep){q.obj.rotation.set(0,rnd()*6,0);q.obj.position.y=.12;this.onSfx&&this.onSfx('thud');}
          else{this.addToPile(q.kind);if(q.ex)q.obj.visible=false;if(q.f)this.freeFish(q.f);this.splash(0,.9,2.9,3,.45);}
          this.onLand&&this.onLand(q.kind);this.flying.splice(i,1);}}}}
  /* ---------- 姿勢 ---------- */
  setHands(l,r){ this.handL=l;this.handR=r; }
  pose(){ const a=l=>.75+(2.8-.75)*l,tb=this.cheerT>0?Math.sin(this.clock*11)*.09:0;
    this.bo.userData.arms.forEach((m,i)=>m.rotation.x=a(this.liftL)+tb*(i?1:-1));this.ma.userData.arms.forEach((m,i)=>m.rotation.x=a(this.liftR)+tb*(i?-1:1));
    const bob=this.cheerT>0?Math.abs(Math.sin(this.clock*9))*.05:Math.sin(this.clock*1.6)*.006;this.bo.userData.body.position.y=bob;this.ma.userData.body.position.y=this.cheerT>0?Math.abs(Math.sin(this.clock*9+1))*.05:Math.sin(this.clock*1.5+1)*.006;
    const yL=.44+1.9*this.liftL,yR=.44+1.9*this.liftR,avg=(this.liftL+this.liftR)/2,pos=this.netGeo.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),u=x/NW+.5,v=z/ND+.5;pos.setY(i,yL+(yR-yL)*u-(.38+.67*avg)*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));}
    pos.needsUpdate=true;this.netGeo.computeBoundingSphere();
    const hx=NW/2,z0=NET_Z-ND/2,z1=NET_Z+ND/2;this.bar(P(-hx,yL,z0),P(-hx,yL,z1),this.barL);this.bar(P(hx,yR,z0),P(hx,yR,z1),this.barR);this.bar(P(-hx,yL,z0),P(hx,yR,z0),this.ropeB);this.bar(P(-hx,yL,z1),P(hx,yR,z1),this.ropeF);
    this.bo.updateMatrixWorld(true);this.ma.updateMatrixWorld(true);this.bar(this.bo.userData.hand.getWorldPosition(new V3()),P(-hx,yL,NET_Z),this.poleL);this.bar(this.ma.userData.hand.getWorldPosition(new V3()),P(hx,yR,NET_Z),this.poleR);
    this.floats.forEach((f,i)=>{const u=i/6,yy=yL+(yR-yL)*u+.04+(avg<.05?Math.sin(this.clock*2.2+i)*.015:0);f.position.set(-hx+NW*u,yy,z0);}); }
  /* ---------- 每幀 ---------- */
  update(dt){ this.clock+=dt;this.stepLight(dt);
    this.overL=Math.max(0,this.overL-dt);this.overR=Math.max(0,this.overR-dt);this.cheerT=Math.max(0,this.cheerT-dt);
    const k=1-Math.exp(-dt*11),tL=Math.max(this.handL,this.overL>.25?1:0),tR=Math.max(this.handR,this.overR>.25?1:0),pL=this.liftL,pR=this.liftR;
    this.liftL+=(tL-this.liftL)*k;this.liftR+=(tR-this.liftR)*k;
    if(this.liftL-pL>.012&&this.liftL<.8)this.dripNet(.04);if(this.liftR-pR>.012&&this.liftR<.8)this.dripNet(.96);
    this.pose();this.stepFish(dt);this.stepFlying(dt);
    this.waterTex.offset.y=-this.clock*.42;
    const o=this._o;this.drops=this.drops.filter(d=>d.t<1.2&&d.y>-.05);this.drops.forEach((d,i)=>{d.t+=dt;d.vy-=9*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;o.position.set(d.x,d.y,d.z);const s=1.2*(1-d.t/1.4);o.scale.setScalar(Math.max(.2,s));o.updateMatrix();this.dropMesh.setMatrixAt(i,o.matrix);});this.dropMesh.count=this.drops.length;this.dropMesh.instanceMatrix.needsUpdate=true;
    for(const r of this.rings){if(r.t<1){r.t+=dt/.8;const k2=Math.min(1,r.t);r.m.scale.setScalar((.8+k2*2.6)*(r.size||1));r.m.material.opacity=.85*(1-k2);if(r.t>=1)r.m.visible=false;}}
    if(this.basketBump>0){this.basketBump=Math.max(0,this.basketBump-dt*6);const b=1+this.basketBump*.05;this.basketMesh.scale.set(b,1,b);}
    this.egrets.forEach((e,i)=>{e.rotation.y+=Math.sin(this.clock*.5+i)*.0015;});
  }
  dripNet(u){ if(rnd()<.45){const p=this.netPoint(u,rnd());this.drops.length<this.DROPS&&this.drops.push({x:p.x,y:p.y,z:p.z,vx:(rnd()-.5)*.3,vy:-.2,vz:(rnd()-.5)*.3,t:0});} }
  render(){ if(!(this.w>0&&this.h>0))return;this.renderer.render(this.scene,this.cam); }
}
