// 騎遍台灣：一位玩家的一趟路（世界、路況、計分、畫面）。雙人時各跑一份，互不干擾。
// 機車路況邏輯搬自 prototype（已用自動騎手驗證過），這裡只包成可重複建立的形式。
import * as THREE from 'three';
import {makeSky, makeThemeSky, mulberry, CHUNK} from './world.js';
import {THEMES, themedTemplate, themedPart, trackSidePiece} from './themes.js';
import {expandSeq, buildRoad, routeStats, ringShape, ringKappa, bendKappa, trackWarp, polarWarp, bakeGroup, RING} from './road.js';
import {buildValley, itemTemplates, RW, LANE} from './valley.js';
import {makePlayerMesh} from './roster.js';
import {newPose, walkPose, knock, fallPose, poleSway, duckPose, buffaloPose, follow, toLocal} from './folk.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export const MODES = {
  easy: {v: 8.6, cue: 4.3, go: 2.3, hint: true, rain: false, brake: 10, label: '新手', skip: true},
  normal: {v: 11.1, cue: 3.6, go: 1.8, hint: false, rain: false, brake: 10, label: '一般'},
  storm: {v: 11.1, cue: 3.1, go: 1.5, hint: false, rain: true, brake: 6, label: '颱風天', slip: true},
};
export const PACKS = {
  bike: {name: '回家吃飯', era: '民國 50 年代．鐵馬', ctrl: '只要傾斜', goal: '趕在天黑前到厝'},
  moto: {name: '上班打卡', era: '現在．機車', ctrl: '傾斜＋煞車', goal: '8:30 前打卡'},
};
export const ROUTES = {
  rice: {pack: 'bike', name: '稻田回家路', stars: 1, kind: 'valley', mode: 'easy', song: 'bangchunhong', tag: '黃昏稻田，按鈴請人讓路', tip: '看到路上有人，遠遠就按鈴請他讓路；閃開竹簍和坑洞路，別騎進田埂', limit: 105, dens: 1, seq: [0, 1, 2, 'bridge', 3, 0, 1, 'shrine', 2, 3, 'rail', 0, 1, 'barn', 2, 'home'],
    zones: {0: '田間小路', 3: '石橋', 7: '土地公廟前', 10: '五分車平交道', 13: '穀倉邊', 15: '回厝的路'}, says: {3: '過了石橋，快到半路了', 7: '土地公保佑，平安回家', 10: '小火車在等人', 13: '聞到飯香了', 15: '看到炊煙，到厝了'}},
  breakfast: {pack: 'moto', name: '巷口買早餐', stars: 1, kind: 'street', mode: 'easy', theme: 'dawn', song: 'diudiudang', tag: '清晨老社區，早餐攤冒白煙', tip: '巷子多：經過巷口先放慢；路面破損要繞開，騎上去會扣血',
    rough: 2, bag: ['parkPull', 'door', 'pedestrian', 'pothole'], crossBag: ['redLight', 'redRunner'], traffic: {opp: ['m1', 'car', 'm2', 'taxi', 'm3'], oppGap: 62, same: 1, flow: 2},
    seq: [['ord3', '住家巷口'], ['alley', ''], ['ord1', '早餐街'], ['ord3', ''], ['alley', '巷口豆漿店'], ['cross', '民生路口'], ['ord1', ''], ['alley', ''], ['ord3', '饅頭店前'], ['cross', '公司前路口'], ['ord4', ''], ['finish', '公司到了']]},
  market: {pack: 'moto', name: '廟口菜市場', stars: 2, kind: 'street', mode: 'normal', v: 9.4, theme: 'noon', song: 'sikuihong', tag: '正午廟口，紅燈籠下鑽人潮', tip: '有人要過馬路就煞車，別跟貨車貼太近；彎道會把車往外甩',
    rough: 2, bag: ['pedestrian', 'parkPull', 'truckDrop', 'pedestrian', 'door'], crossBag: ['redRunner', 'redLight', 'leftTurn'], traffic: {opp: ['m1', 'pick', 'm2', 'car', 'm3', 'pick'], oppGap: 52, same: 2, flow: 3},
    seq: [['ord1', '住家巷口'], ['market', '福安市場'], ['market2', ''], ['ord3', '市場彎道', {turn: 35}], ['temple', '福安宮前'], ['market', ''], ['market2', '黃昏市場街'], ['ord1', '', {turn: -35}], ['temple', ''], ['cross', '福安路口'], ['market', ''], ['market2', ''], ['ord3', '', {turn: -30}], ['ord1', ''], ['market', ''], ['cross', '中興路口'], ['ord4', ''], ['finish', '公司到了']]},
  school: {pack: 'moto', name: '國小上學路', stars: 2, kind: 'street', mode: 'normal', v: 9.7, theme: 'shade', song: 'shangxue', tag: '綠蔭校園，路隊小朋友過馬路', tip: '小朋友會突然過馬路：校門口前先減速；彎道記得修方向',
    rough: 2, bag: ['pedestrian', 'door', 'parkPull', 'pedestrian', 'pothole'], crossBag: ['redLight', 'leftTurn', 'redRunner'], traffic: {opp: ['bus', 'm1', 'car', 'm2', 'car', 'm3'], oppGap: 48, same: 2, flow: 3},
    seq: [['ord1', '住家巷口'], ['school', '幸福國小'], ['ord4', '文具店街'], ['ord2', '林蔭彎道', {turn: -40}], ['alley', ''], ['school', ''], ['cross', '仁愛路口'], ['ord2', '林蔭大道'], ['ord3', '', {turn: 40}], ['school', '校門口'], ['ord3', ''], ['ord1', '', {turn: 30}], ['ord4', '', {turn: -30}], ['cross', '信義路口'], ['alley', ''], ['ord1', ''], ['school', ''], ['ord4', ''], ['finish', '公司到了']]},
  rush: {pack: 'moto', name: '大馬路尖峰', stars: 3, kind: 'street', mode: 'normal', v: 12.5, cue: 3.2, go: 1.6, theme: 'haze', song: 'jianfeng', tag: '高架捷運下，彎道和圓環一路考驗', tip: '速度快車又多：別貼前車；彎道提早修方向，進圓環先讓環內車',
    rough: 3, bag: ['suddenBrake', 'truckDrop', 'wrongWay', 'suddenBrake', 'parkPull', 'pothole'], crossBag: ['rightTruck', 'leftTurn', 'redLight', 'redRunner'], traffic: {opp: ['bus', 'taxi', 'car', 'm1', 'bus', 'car', 'taxi', 'm2', 'car', 'bus', 'm3', 'car'], oppGap: 30, same: 5, flow: 9},
    seq: [['ord1', '住家巷口'], ['ord2', '大馬路'], ['cross', '光復路口'], ['ord3', ''], ['ord1', '高架大彎', {turn: 50, n: 2}], ['work', '道路施工中'], ['ord2', ''], ['cross', '中正路口'], ['ord1', ''], ['round', '中山圓環', {exit: 'straight'}], ['ord2', ''], ['ord3', '', {turn: -45, n: 2}], ['cross', '復興路口'], ['ord4', ''], ['work', '前方又施工'], ['ord2', ''], ['ord1', '', {turn: -30}], ['ord3', '', {turn: 25}], ['cross', '上班路口'], ['ord1', ''], ['ord4', ''], ['finish', '公司到了']]},
  storm: {pack: 'moto', name: '颱風天照常上班', stars: 5, kind: 'street', mode: 'storm', v: 10.4, theme: 'storm', song: 'uyahue', songBpm: 92, gust: true, tag: '烏雲暴雨，強風、大彎加兩座圓環', tip: '路滑難煞又有強風：大彎和圓環都要提早減速',
    rough: 4, bag: ['pothole', 'door', 'parkPull', 'pothole', 'wrongWay', 'truckDrop'], crossBag: ['redRunner', 'leftTurn', 'redLight'], traffic: {opp: ['pick', 'm1', 'car', 'm2'], oppGap: 70, same: 1, flow: 1, garbage: false},
    seq: [['ord1', '住家巷口'], ['ord3', '風雨交加'], ['work', '路樹倒了'], ['ord2', '', {turn: 45, n: 2}], ['cross', '民族路口'], ['alley', ''], ['round', '民權圓環', {exit: 'straight'}], ['ord2', '積水路段'], ['ord4', '', {turn: -60, n: 2}], ['work', '招牌掉下來'], ['ord4', ''], ['cross', '建國路口'], ['ord1', ''], ['ord3', '', {turn: 35}], ['ord1', '', {turn: -35}], ['alley', ''], ['round', '中正圓環', {exit: 'left'}], ['ord2', ''], ['ord3', '', {turn: 60, n: 2}], ['ord1', '', {turn: 30}], ['cross', '上班路口'], ['ord3', ''], ['ord4', ''], ['finish', '公司到了']]},
};
/** 路線有多長、幾個彎、幾座圓環（給選路線頁看） */
export const routeInfo = id => { const r = ROUTES[id]; return r.kind === 'valley' ? {km: r.seq.length * CHUNK / 1000, bends: 0, rounds: 0} : routeStats(r.seq); };
export const SOON = {bike: [['甘蔗田五分車', 2], ['鹽田海邊路', 2], ['廟會夜歸', 3]], moto: [['機車瀑布上橋', 4]]};
export const LABEL = {parkPull: '紅線違停車起步', door: '並排車開門', truckDrop: '貨車掉貨', work: '施工縮減車道', pothole: '路面坑洞', wrongWay: '逆向機車', redRunner: '路口機車闖紅燈', leftTurn: '對向左轉搶快', rightTruck: '右轉大車', alley: '巷口衝出', pedestrian: '行人過馬路', suddenBrake: '前車急煞', redLight: '黃燈轉紅燈', ringYield: '圓環讓環內車', rough: '路面不平', gutter: '路邊水溝蓋', ditch: '騎進田埂', dirt: '坑洞泥巴路', rail: '橋欄杆', basket: '路上的竹簍', npcBike: '撞到別人的鐵馬', sideSwipe: '撞到旁邊的機車', walker: '撞到路上的人', duck: '撞進鴨群', buffalo: '撞到水牛', rearEnd: '追撞內側車', oncoming: '撞上對向來車', ticket: '紅單', crash: '摔車'};
export const TIPS = {walker: '看到前面有人，遠遠就按鈴，他們才來得及讓開。', duck: '鴨群會散開亂跑，提早按鈴或換一條線。', buffalo: '水牛走得慢，要更早按鈴，或自己繞開。', parkPull: '路邊車亮方向燈，先當它會出來。', door: '和路邊停車保持一個車門寬。', truckDrop: '別貼在載貨車後面，留反應距離。', work: '看到箭頭板就提早併到開放車道。', pothole: '路面顏色變了，先減速再閃。', wrongWay: '對向機車靠過來，先減速、守住自己的路線。', redRunner: '綠燈亮了，還是先看左右。', leftTurn: '對向車打左轉燈，別假設它會等您。', rightTruck: '大車打右轉燈，不要停在它右邊。', alley: '巷口被車擋住時，先放慢。', pedestrian: '靠近行人穿越道先減速，行人優先。', suddenBrake: '跟車距離要夠，前車煞車才來得及。', redLight: '黃燈不要衝，紅燈一定停。', ringYield: '進圓環前先減速，環內的車先走。', rough: '路面顏色變深、路邊有警告牌，就提早換到平整的車道。', gutter: '路邊水溝蓋又顛又滑，彎道要修回車道，別貼著路邊騎。', ditch: '眼睛看遠一點，車頭擺回路中間，田埂會一直扣血。', dirt: '顏色變深又有碎石的路面，提早往旁邊繞。', rail: '過橋靠中間騎，別貼著欄杆。', basket: '看到竹簍就提早換線，別等到眼前才閃。', npcBike: '前面的鐵馬比較慢，先看好旁邊再超過去，超車要留一個車身寬。', sideSwipe: '換線前先看旁邊和後面有沒有機車，跟旁邊的車留一點距離。', rearEnd: '內側的車可能比您慢，跟車要留距離。', oncoming: '別跨到對向車道，超車完要回到自己這邊。', ticket: '紅燈一定停，雙黃線不能跨。'};
const TPLC = new WeakMap();
function template(kit, k, theme) { if (!TPLC.has(kit)) TPLC.set(kit, {}); const c = TPLC.get(kit), key = (theme || '') + '|' + k; return c[key] ??= theme ? themedTemplate(kit, theme, k) : kit.templates[k](); }
/* 彎道路段：把直的街景彎過去，同樣的彎只做一次 */
const BENDC = new WeakMap(), RINGC = new WeakMap(), DEG = Math.PI / 180;
function bendTemplate(kit, k, theme, bend) {
  if (!BENDC.has(kit)) BENDC.set(kit, {});
  const c = BENDC.get(kit), key = `${theme}|${k}|${bend.deg}|${bend.n}|${bend.j}`;
  if (c[key]) return c[key];
  const L = bend.n * CHUNK, src = template(kit, k, theme).group.clone(true);
  kit.bendSigns(src, bend.deg, [-5, -15, -25, -35]);
  return c[key] = bakeGroup(THREE, src, trackWarp(u => bendKappa(bend.deg, L, u + bend.j * CHUNK), CHUNK), 2);
}
/* 一整座圓環：車走的路面彎好疊在上面，環道、安全島、四周街區以環心為原點 */
function ringTemplate(kit, theme, exit) {
  if (!RINGC.has(kit)) RINGC.set(kit, {});
  const c = RINGC.get(kit), key = `${theme}|${exit}`;
  if (c[key]) return c[key];
  const sh = ringShape(exit), P = kit.parts, root = new THREE.Group(), center = new THREE.Group(), warp = trackWarp(u => ringKappa(sh, u), sh.len);
  const part = fn => themedPart(kit, theme, fn);
  root.add(bakeGroup(THREE, part(() => P.roundStrip(sh)), warp, 1.5));
  const side = trackSidePiece(kit, theme);
  if (side) for (let i = 0; i < sh.n; i++) root.add(bakeGroup(THREE, side, (x, z) => warp(x, z - i * CHUNK), 2));
  center.position.z = sh.centerZ; root.add(center);
  center.add(part(() => P.island(RING.Rc, RING.inner, RING.outer)));
  const half = 26.5, len = half * 2 * DEG * RING.facade;
  [45, 135, 225, 315].forEach((q, i) => center.add(bakeGroup(THREE, part(() => P.quadrant(900 + i * 37, len)), polarWarp((q - half) * DEG), 2)));
  const exitPsi = exit === 'left' ? 180 : 90, reach = -sh.centerZ;   // reach＝環心到這段路起點的距離
  [0, 90, 180, 270].forEach((psi, i) => {
    const a = psi * DEG, ox = Math.cos(a), oz = -Math.sin(a), ry = (psi - 90) * DEG;
    const place = (g, R, rot = ry) => { g.position.set(ox * R, 0, oz * R); g.rotation.y = rot; center.add(g); };
    if (psi === 270 || psi === exitPsi) {   // 遊戲會走的路口
      place(part(() => P.legPad(reach - 28, psi === 270 ? .45 : -.45)), 28);
      place(part(() => P.leg(950 + i * 13, reach - RING.facade, false)), RING.facade);
    } else {                                 // 其他街口：有路面，盡頭一排房子擋住視線
      place(part(() => P.legPad(10, null)), 28);
      place(part(() => P.leg(950 + i * 13, 40, true)), RING.facade);
      place(part(() => P.cap(970 + i, 26)), RING.facade + 40 + 2 - 10, a);
    }
  });
  return c[key] = root;
}
const NOOP_SND = new Proxy({}, {get: () => () => {}});
/* 血條規則：滿 100，摔車扣 20，所以連摔 5 次就回起點 */
export const HP = {start: 100, crash: 20, ticket: 15, bump: 5, rough: 4, low: 20};
/* 騎上田埂、破損路面、水溝蓋：第一下扣血前留一點點寬限（手機傾斜晃一下不算），之後每隔一段時間再扣 */
const ROUGH_GRACE = .12, ROUGH_EVERY = .8;

export function createRide(cfg) {
  const {kit, routeId, seed = 1, hud = null, snd: Snd = NOOP_SND, demo: DEMO = 0, player: me = {}, rival: rivalInfo = null, label = '', help = {}} = cfg;
  const route = ROUTES[routeId], valley = route.kind === 'valley', pack = route.pack;
  const MODE = MODES[route.mode], NOM = route.v ?? MODE.v, TH = route.theme ? THEMES[route.theme] : null, CUE = route.cue ?? MODE.cue, GO = route.go ?? MODE.go;
  const $h = sel => hud?.querySelector(sel) ?? document.createElement('div');
  const el = {clock: $h('.clock'), clockL: $h('.clockL'), clockV: $h('.clockV'), speedL: $h('.speedL'), speedV: $h('.speedV'), scoreL: $h('.scoreL'), scoreV: $h('.scoreV'), gauge: $h('.gaugeFill'), prog: $h('.progressFill'), meDot: $h('.dotMe'), riDot: $h('.dotRi'), combo: $h('.combo'), zone: $h('.zone'), hint: $h('.hint'), toasts: $h('.toasts'), flash: $h('.flash'), vig: $h('.vig'), tint: $h('.tint'), lead: $h('.lead'), tag: $h('.tag'), gaugeBox: $h('.gauge'), gaugeV: $h('.gaugeV'), ko: $h('.ko'), koT: $h('.koT'), koS: $h('.koS'), banner: $h('.banner'), notice: $h('.notice')};
  el.tag.textContent = label;
  el.clockL.textContent = valley ? '天黑前到厝' : '打卡 8:30 前'; el.speedL.textContent = '時速'; el.scoreL.textContent = '分數';
  if (TH?.tint) { el.tint.style.background = TH.tint[0]; el.tint.style.opacity = TH.tint[1]; }

  /* ───────── 場景 ───────── */
  const scene = new THREE.Scene();
  scene.background = TH ? makeThemeSky(route.theme, TH.sky, TH) : makeSky('toon', MODE.rain);
  const baseFog = valley ? 0xf6e8c4 : MODE.rain ? 0xb4bbbe : 0xfdeed0;
  scene.fog = TH ? new THREE.Fog(TH.fog[0], TH.fog[1], TH.fog[2]) : MODE.rain ? new THREE.Fog(baseFog, 30, 165) : valley ? new THREE.Fog(baseFog, 150, 440) : new THREE.Fog(baseFog, 130, 345);
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, .3, valley ? 950 : 430);
  const hemi = TH ? new THREE.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]) : new THREE.HemisphereLight(0xffffff, 0xc9b99c, 1.75); scene.add(hemi);
  const sun = TH ? new THREE.DirectionalLight(TH.sun[0], TH.sun[1]) : new THREE.DirectionalLight(0xfff1d6, 2.25), SUN_AT = TH?.sunAt || [34, 58, -34];
  let low = !!cfg.low; const fineScale = cfg.fineScale ?? 1;   // 手機畫質：近景小物件顯示距離、低畫質關影子
  sun.castShadow = !low; sun.shadow.mapSize.set(cfg.shadow ?? 2048, cfg.shadow ?? 2048);
  Object.assign(sun.shadow.camera, {left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 190});
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  /* 路的形狀：s、x 是路座標，畫面都透過 road 換算。路尾再多接幾格，終點才不會露空 */
  const cells = valley ? route.seq.map(() => ({})) : expandSeq(route.seq);
  const tailSeq = valley ? Array.from({length: 12}, (_, i) => i % 4) : ['ord1', 'end'];
  const road = buildRoad(cells, tailSeq.length);
  const slots = [], tailSlots = []; let far = null, farHome = null;
  const frame = (g, a) => { const p = road.at(a); g.position.set(p.x, 0, p.z); g.rotation.y = -p.th; };
  if (valley) {
    const v = buildValley(kit, scene, route.seq.concat(tailSeq));
    far = v.far; farHome = v.home;
    v.chunks.forEach((g, i) => {
      const slot = {i, a: i * CHUNK, g, fine: g.getObjectByName('fine'), type: 'valley', name: route.zones[i] || '', lamps: {R: [], Y: [], G: []}, sig: 'G', span: CHUNK}; g.visible = false;
      (i < route.seq.length ? slots : tailSlots).push(slot);
    });
  } else {
    cells.forEach((c, i) => {
      const a = i * CHUNK;
      let g, type, colliders = null;
      if (c.ring) { g = c.j === 0 ? ringTemplate(kit, route.theme, c.ring.exit).clone(true) : new THREE.Group(); type = 'round'; }
      else { const t = template(kit, c.k, route.theme); g = (c.bend ? bendTemplate(kit, c.k, route.theme, c.bend) : t.group).clone(true); type = t.type; colliders = t.colliders || null; }
      frame(g, a); g.visible = false; scene.add(g);
      const slot = {i, a, g, fine: g.getObjectByName('fine'), type, name: c.name, colliders, lamps: {R: [], Y: [], G: []}, sig: 'G', span: c.ring && c.j === 0 ? c.ring.len : CHUNK, bend: !!c.bend, ring: c.ring || null, ringJ: c.j};
      g.traverse(o => { if (o.name === 'lampR') slot.lamps.R.push(o); if (o.name === 'lampY') slot.lamps.Y.push(o); if (o.name === 'lampG') slot.lamps.G.push(o); });
      setSignal(slot, 'G');
      slots.push(slot);
    });
    tailSeq.forEach((k, j) => {
      const a = (cells.length + j) * CHUNK, g = template(kit, k, route.theme).group.clone(true);
      frame(g, a); g.visible = false; scene.add(g);
      tailSlots.push({i: cells.length + j, a, g, fine: g.getObjectByName('fine'), type: 'tail', name: '', lamps: {R: [], Y: [], G: []}, sig: 'G', span: CHUNK});
    });
  }
  const viewSlots = slots.concat(tailSlots);
  const FINISH_A = (slots.length - 1) * CHUNK + (valley ? 22 : 24);
  const END_S = (cells.length + 1) * CHUNK + 33;   // 路尾丁字路口，車流到這裡轉走
  // 打卡時間跟著路長走：路再長，正常騎都來得及
  const CLOCK_RATE = 360 / (FINISH_A / NOM * (MODE.skip ? 1.75 : 1.55));   // 新手路線寬鬆，其他路線摔幾次或停太久就會遲到
  const CURVE_PUSH = MODE.slip ? .36 : .3;   // 彎道把車往外甩的力道
  const extras = TH?.extras ? TH.extras(kit, scene) : null;
  const player = makePlayerMesh(kit, pack, me.char, me.veh); scene.add(player);
  const playerLamps = lampsOf(player);
  let rivalG = null;
  if (rivalInfo) {
    rivalG = makePlayerMesh(kit, pack, rivalInfo.char, rivalInfo.veh); scene.add(rivalG);
    const [tc, tg] = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; return [c, c.getContext('2d')]; })();
    tg.fillStyle = rivalInfo.color || '#2c6fb3'; tg.beginPath(); tg.roundRect(6, 6, 116, 52, 14); tg.fill();
    tg.lineWidth = 5; tg.strokeStyle = '#2b2622'; tg.stroke();
    tg.fillStyle = '#fff'; tg.font = '900 36px "PingFang TC",sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText(rivalInfo.tag || '對手', 64, 34);
    const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: tt, depthTest: false, fog: false})); sp.scale.set(1.1, .55, 1); sp.position.y = 2.45; sp.renderOrder = 9; rivalG.add(sp); rivalG.userData.tag = sp;
  }
  const [rc, rg] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; return [c, c.getContext('2d')]; })();
  rg.strokeStyle = '#ffd21f'; rg.lineWidth = 12; rg.beginPath(); rg.arc(64, 64, 52, 0, 7); rg.stroke();
  const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({map: rt, transparent: true, depthTest: false, fog: false}));
  ring.visible = false; ring.renderOrder = 10; scene.add(ring);
  let rain = null;
  if (MODE.rain) {
    const n = 900, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = (Math.random() - .5) * 60, y = Math.random() * 24, z = -Math.random() * 70; pos.set([x, y, z, x + .05, y - .85, z + .35], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: 0xdfe8ee, transparent: true, opacity: .55, fog: false})); rain.frustumCulled = false; scene.add(rain);
  }
  function lampsOf(o) { const r = {L: [], R: [], B: []}; o.traverse(c => { if (c.name === 'blinkL') r.L.push(c); if (c.name === 'blinkR') r.R.push(c); if (c.name === 'brake') r.B.push(c); }); return r; }
  function setSignal(slot, s) { slot.sig = s; for (const k of ['R', 'Y', 'G']) slot.lamps[k].forEach(m => { m.visible = k === s; }); }

  /* ───────── 狀態與提示 ───────── */
  const freshState = () => ({phase: 'wait', t: 0, s: 8, x: (valley ? 0 : 4.6) + (cfg.laneOffset || 0), v: 0, vx: 0, lean: 0, brake: false, gauge: HP.start, score: 0, combo: 0, maxCombo: 0, crashes: 0, bumps: 0, tickets: 0, early: 0, late: 0, ok: 0, tested: 0, fakes: 0,
    leads: [], worst: null, worstRank: 0, clock: 0, invuln: 0, crashT: 0, crashDir: 1, shake: 0, seen: new Set(), zoneIdx: -1, ycross: 0, wrongSide: 0, arriveT: 0, hintT: 0, lastBrake: -9, zoneT: 0, seed,
    walkersAll: 0, missed: 0, bellHeld: false, baskets: 0, offroad: false, offT: 0, dusk: 0, finished: false, restarts: 0, redoT: 0, gustT: 6, gustDur: 0, gustDir: 1, boltT: 7, warned: new Set(), roughs: 0, surf: null, surfEv: null, surfIn: 0, surfHit: 0, surfSlow: 1, rumbleT: 0, loss: {}});
  let S = freshState();
  let EVENTS = [], AMB = [], result = null, inputFn = cfg.input || (() => ({steer: 0, brake: false}));
  function toast(txt, cls = 'good') { if (!hud) return; const box = el.toasts; if (cls === 'see' && box.querySelector('.see')) return; const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = txt; box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), cls === 'see' ? 900 : 1450); }
  function flashWhite(op = .85) { const f = el.flash; f.style.transition = 'none'; f.style.opacity = op; requestAnimationFrame(() => { f.style.transition = 'opacity .45s'; f.style.opacity = 0; }); }
  function vignette() { const f = el.vig; f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .9s'; f.style.opacity = 0; }); }
  function mult() { const c = S.combo; return c >= 8 ? 3 : c >= 5 ? 2 : c >= 3 ? 1.5 : 1; }
  function addGauge(d, key) {
    const was = S.gauge; S.gauge = clamp(S.gauge + d, 0, 100);
    if (d >= 0) return;
    if (key) S.loss[key] = (S.loss[key] || 0) - d;
    gaugeHit(-d);
    if (was > HP.low && S.gauge <= HP.low && S.gauge > 0) hint('血條快沒了！再扣下去就要回起點', 3);
  }
  function gaugeHit(n) { // 扣血一定要看得到：血條抖一下，旁邊跳出扣了多少
    if (!hud) return;
    const b = el.gaugeBox; b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 380);
    const p = document.createElement('b'); p.className = 'hpPop'; p.textContent = `−${Math.round(n)}`; b.parentNode.appendChild(p); setTimeout(() => p.remove(), 850);
  }
  function noteWorst(label, rank) { if (rank >= S.worstRank) { S.worstRank = rank; S.worst = label; } }
  function hint(txt, sec = 3) { el.hint.textContent = txt; el.hint.classList.add('on'); S.hintT = sec; }
  function showZone(n) { el.zone.textContent = n; el.zone.classList.add('on'); S.zoneT = 3.2; }

/* ───────── 事件 ───────── */
function setBlink(o, side, on) { o.blinkSide = on ? side : null; if (!on) o.lamps[side === 'L' ? 'L' : 'R'].forEach(m => { m.visible = false; }); }
function ent(group, x, a, hw, hl, yaw = 0) { scene.add(group); return {g: group, x, a, hw, hl, yaw, lamps: lampsOf(group), blinkSide: null, live: true}; }
const COLORS = [0xf2f2ee, 0x2f3338, 0xb8bdc2, 0x9a2f2f, 0x2c5e92];
const curveAt = (p0, p1, p2, u) => { const i = 1 - u; return {x: i * i * p0.x + 2 * i * u * p1.x + u * u * p2.x, a: i * i * p0.a + 2 * i * u * p1.a + u * u * p2.a, dx: 2 * i * (p1.x - p0.x) + 2 * u * (p2.x - p1.x), da: 2 * i * (p1.a - p0.a) + 2 * u * (p2.a - p1.a)}; };
function faceFrom(e, dx, da) { e.yaw = Math.atan2(-dx, da); const sn = Math.abs(Math.sin(e.yaw)); e.hw = lerp(e.bw ?? .95, e.bl ?? 2.25, sn); e.hl = lerp(e.bl ?? 2.25, e.bw ?? .95, sn); }

/** 把環內的車擺到環道上。d＝從進環點沿環道前進幾公尺（可為負），r＝半徑 */
function placeRingCar(e, R, d, r) {
  const T = road.map(0, R.t1), vx = (T.x - R.cx) / RING.Rc, vz = (T.z - R.cz) / RING.Rc, psi = -d / RING.Rc, c = Math.cos(psi), s = Math.sin(psi);
  e.wx = R.cx + (vx * c - vz * s) * r; e.wz = R.cz + (vx * s + vz * c) * r; e.wth = T.th + psi;
  e.g.position.set(e.wx, 0, e.wz); e.g.rotation.y = -e.wth;
}
function followV(e, v) {
  if (e.a < S.s && Math.abs(e.x - S.x) < e.hw + .7) v = Math.min(v, Math.max(0, (S.s - e.a - e.hl - 1.4) * 1.6));
  const red = nextRed(e.a); if (red != null) v = Math.min(v, Math.max(0, (red - e.a - e.hl - .6) * 1.3));
  return v;
}
const H = {
  parkPull: {
    cls: 'dodge',
    spawn(ev) { ev.e = ent(ev.slot.type === 'market' ? kit.makePickup(0xe9ece8, {loose: false}) : kit.makeSedan(ev.rng() < .5 ? 0xf2d23a : COLORS[ev.rng() * 5 | 0], {taxi: false}), 6.05, ev.anchor, .95, 2.25); ev.ents = [ev.e]; },
    corr: () => S.x > 3.4,
    onCue(ev) { setBlink(ev.e, 'L', true); },
    tick(ev, dt) {
      if (ev.tGo == null || ev.fake) return;
      const u = S.t - ev.tGo, e = ev.e;
      e.x = lerp(6.05, 4.85, ease(u / 1.5)); e.a += followV(e, Math.min(8.2, .6 + u * 2.3)) * dt; e.yaw = .3 * Math.sin(Math.PI * clamp(u / 1.5, 0, 1));
      if (u > 2) setBlink(e, 'L', false);
    },
    done: ev => (ev.tGo != null && !ev.fake && S.t - ev.tGo > 3.4) || S.s > ev.anchor + 6,
    dead: ev => S.s > ev.e.a + 45 || ev.e.a > S.s + 260,
  },
  door: {
    cls: 'dodge',
    spawn(ev) { ev.e = ent(kit.makeSedan(COLORS[ev.rng() * 5 | 0], {door: true}), 6.05, ev.anchor, .95, 2.25); ev.pivot = ev.e.g.getObjectByName('door'); ev.ang = 0; ev.angT = 0; ev.ents = [ev.e]; },
    corr: () => S.x > 3.7,
    onCue(ev) { ev.angT = .17; Snd.click(); },
    onGo(ev) { ev.angT = 1.2; Snd.click(); },
    tick(ev, dt) {
      if (S.s > ev.anchor + 9) ev.angT = 0;
      if (ev.fake && ev.tGo != null && S.t - ev.tGo > .6) ev.angT = 0;
      ev.ang += (ev.angT - ev.ang) * Math.min(1, dt * 7); ev.pivot.rotation.y = -ev.ang;
    },
    extra(ev) { if (ev.ang < .32) return null; const c = Math.cos(ev.ang), sn = Math.sin(ev.ang), x1 = 5.14, x0 = 5.14 - 1.12 * sn; return {x: (x0 + x1) / 2, a: ev.anchor + .35 - .56 * c, hw: (x1 - x0) / 2, hl: Math.max(.22, .56 * c)}; },
    done: ev => S.s > ev.anchor + 5,
    dead: ev => S.s > ev.anchor + 45,
  },
  truckDrop: {
    cls: 'dodge', spawnAt: 75,
    spawn(ev) {
      ev.lane = clamp(S.x, 4.25, 5.2); ev.e = ent(kit.makePickup(0xdfe6ea, {rail: 0x3d7fbf}), ev.lane, S.s + 75, .9, 2.1); ev.v = NOM * .5; ev.ents = [ev.e];
      ev.loose = ev.e.g.getObjectByName('looseCrate'); ev.boxE = ent(kit.makeBox(), ev.lane, 0, .5, .42); ev.boxE.g.visible = false; ev.boxE.live = false; ev.ents.push(ev.boxE);
    },
    tta(ev) { const gap = ev.e.a - S.s; return ev.dropped ? (ev.boxE.a - S.s) / NOM : gap > 34 ? 99 : gap > 25 ? CUE - .01 : GO - .01; },
    corr: ev => Math.abs(S.x - ev.lane) < 1.15,
    onCue() { Snd.click(); },
    onGo(ev) {
      ev.dropped = true; ev.loose.visible = false; const b = ev.boxE; b.g.visible = true; b.live = true; b.x = ev.lane + (ev.rng() - .5) * .3; b.a = ev.e.a - 1.7; b.y = 1.5; b.vy = 1.6; b.va = ev.v * .85; b.rot = 0; Snd.bump();
    },
    tick(ev, dt) {
      if (!ev.dropped) { if (ev.tCue != null && ev.loose.visible) { ev.loose.rotation.z = Math.sin(S.t * 20) * .12; ev.loose.position.y = 1.56 + Math.abs(Math.sin(S.t * 20)) * .07; } }
      else {
        const b = ev.boxE; b.vy -= 13 * dt; b.y += b.vy * dt; b.a += b.va * dt; b.rot = (b.rot || 0) + (b.y > .3 ? dt * 3 : 0);
        if (b.y < .3) { b.y = .3; if (Math.abs(b.vy) > 1.5) { b.vy *= -.35; Snd.bump(); } else b.vy = 0; b.va *= Math.pow(.02, dt); }
        b.g.rotation.x = b.rot; b.yOffset = b.y;
        ev.v = Math.min(NOM * 1.1, ev.v + 4 * dt);
      }
      ev.e.a += followV(ev.e, ev.v) * dt;
      ev.anchor = ev.dropped ? ev.boxE.a : ev.e.a;
    },
    done: ev => ev.dropped ? S.s > ev.boxE.a + 2.5 : false,
    dead: ev => ev.dropped && S.s > ev.boxE.a + 45,
  },
  wrongWay: {
    cls: 'dodge', spawnAt: 100,
    spawn(ev) { ev.e = ent(kit.makeScooter({body: 0x9aa0a6, helmet: 0xe2e2dc, shirt: 0xe6e2d4, rider: true}), 6.2, S.s + 100, .36, .85, Math.PI); ev.xT = 6.2; ev.ents = [ev.e]; },
    tta: ev => (ev.e.a - S.s) / (NOM + 6),
    corr: () => S.x > 3.5,
    onCue() { Snd.horn(); },
    onGo(ev) { ev.xT = 4.75; },
    tick(ev, dt) {
      if (S.v < NOM * .6 || S.x < 3.4) ev.xT = 6.25;
      ev.e.x += clamp(ev.xT - ev.e.x, -1.8 * dt, 1.8 * dt); ev.e.a -= 6 * dt; ev.anchor = ev.e.a;
    },
    done: ev => S.s > ev.e.a + 3,
    dead: ev => S.s > ev.e.a + 40,
  },
  redRunner: {
    cls: 'brake', spawnAt: 110,
    spawn(ev) { ev.e = ent(kit.makeScooter({body: 0x2b2d33, helmet: 0xe23b35, shirt: 0x2b2b2e, box: 0x3fa266}), 60, ev.anchor, .95, .42, Math.PI / 2); ev.e.g.visible = false; ev.e.live = false; ev.ents = [ev.e]; },
    corr: () => true,
    onCue(ev) { const tt = (ev.anchor - S.s) / Math.max(S.v, 3); ev.e.x = S.x + 12.5 * tt; ev.e.g.visible = true; ev.e.live = true; ev.vc = 12.5; if (ev.fake) ev.stopX = 9.4; Snd.beep(200, .5, 'sawtooth', .025, 120); },
    tick(ev, dt) { if (ev.tCue == null) return; if (ev.fake && ev.e.x < ev.stopX + 12) ev.vc = Math.max(0, (ev.e.x - ev.stopX) * 1.4); ev.e.x -= ev.vc * dt; if (!ev.fake && ev.tGo != null && ev.e.x < S.x - 8 && !ev.honked) { ev.honked = true; } },
    done: ev => ev.tCue != null && (!ev.fake && ev.e.x < S.x - 5 || S.s > ev.anchor + 8),
    dead: ev => ev.done2 && (ev.e.x < -70 || S.s > ev.anchor + 50) || S.s > ev.anchor + 80,
  },
  leftTurn: {
    cls: 'brake', spawnAt: 135,
    spawn(ev) {
      ev.e = ent(kit.makeSedan(ev.rng() < .5 ? 0xf2d23a : 0x2c5e92, {taxi: true}), -1.75, 0, .95, 2.25, Math.PI);
      ev.e.bw = .95; ev.e.bl = 2.25; ev.P0 = {x: -1.75, a: ev.anchor + 9}; ev.P1 = {x: -1.75, a: ev.anchor - 1}; ev.P2 = {x: 6.4, a: ev.anchor - 2.2};
      const tp = (ev.anchor - S.s) / NOM; ev.e.a = ev.P0.a + 8.5 * Math.max(0, tp - GO); ev.u = -1; ev.ents = [ev.e];
    },
    corr: () => true,
    onCue(ev) { setBlink(ev.e, 'R', true); },
    tick(ev, dt) {
      const e = ev.e;
      if (ev.u < 0) { e.a = Math.max(ev.P0.a, e.a - 8.5 * dt); if (ev.tGo != null && !ev.fake) ev.u = 0; else if (ev.fake && S.s > ev.anchor + 3) ev.u = 0; return; }
      if (ev.u < 1) {
        ev.u = Math.min(1, ev.u + dt / 1.65); const p = curveAt(ev.P0, ev.P1, ev.P2, ev.u); e.x = p.x; e.a = p.a; faceFrom(e, p.dx, p.da);
      } else { e.x += 8.5 * dt; }
    },
    done: ev => (ev.u >= 0 && !ev.fake && ev.e.x > S.x + 3) || S.s > ev.anchor + 8,
    dead: ev => ev.e.x > 62 || S.s > ev.anchor + 60,
  },
  rightTruck: {
    cls: 'brake', spawnAt: 140,
    spawn(ev) {
      const e = ev.e = ent(kit.makeTruck(), 2.2, 0, 1.25, 4); e.bw = 1.25; e.bl = 4;
      ev.P0 = {x: 2.2, a: ev.anchor - 9}; ev.P1 = {x: 2.2, a: ev.anchor + 3.5}; ev.P2 = {x: 16, a: ev.anchor + 5};
      ev.vt = NOM * .62; const tp = (ev.anchor - S.s) / NOM; e.a = ev.P0.a - ev.vt * Math.max(0, tp - GO - .25); ev.u = -1; ev.ents = [e];
    },
    corr: () => true,
    onCue(ev) { setBlink(ev.e, 'R', true); Snd.tick(); },
    tick(ev, dt) {
      const e = ev.e;
      if (ev.u < 0) { e.a = Math.min(ev.P0.a, e.a + ev.vt * dt); if (e.a >= ev.P0.a && ev.tGo != null) ev.u = 0; return; }
      if (ev.u < 1) { ev.u = Math.min(1, ev.u + dt / 3.4); const p = curveAt(ev.P0, ev.P1, ev.P2, ev.u); e.x = p.x; e.a = p.a; faceFrom(e, p.dx, p.da); } else e.x += 6 * dt;
    },
    done: ev => (ev.u >= 0 && ev.e.x > S.x + 3.5) || S.s > ev.anchor + 12,
    dead: ev => ev.e.x > 62 || S.s > ev.anchor + 60,
  },
  alley: {
    cls: 'brake', spawnAt: 110,
    spawn(ev) {
      ev.van = ent(kit.makePickup(0xcfd6da, {loose: false}), 6.05, ev.anchor - 8, .9, 2.1);
      ev.e = ent(kit.makeScooter({body: 0xd64f4f, helmet: 0x2c6fb3, shirt: 0xeeeadc, box: 0xf07a2a}), 40, ev.anchor, .95, .42, Math.PI / 2); ev.e.g.visible = false; ev.e.live = false; ev.ents = [ev.van, ev.e];
    },
    corr: () => true,
    onCue(ev) { const tt = (ev.anchor - S.s) / Math.max(S.v, 3); ev.e.x = S.x + 6.6 * tt; ev.e.g.visible = true; ev.e.live = true; ev.vc = 6.6; Snd.beep(180, .4, 'sawtooth', .025, 80); },
    tick(ev, dt) {
      if (ev.tCue == null) return; const e = ev.e;
      if (ev.fake) { ev.vc = Math.max(0, (e.x - 8.4) * 1.6); e.x -= ev.vc * dt; return; }
      if (e.x > 2.7) { e.x -= ev.vc * dt; } else { e.a += followV(e, 10) * dt; e.yaw = Math.max(0, e.yaw - dt * 3.2); e.hw = .42; e.hl = .9; }
    },
    done: ev => ev.tCue != null && ((!ev.fake && ev.e.x < 2.8) || S.s > ev.anchor + 5),
    dead: ev => S.s > ev.anchor + 50 || ev.e.a > S.s + 240,
  },
  pedestrian: {
    cls: 'brake', spawnAt: 110,
    spawn(ev) {
      const elder = ev.rng() < .5, g = new THREE.Group();
      ev.rig = kit.makeRig(elder ? {shirt: 0xc85a7a, hair: 0xc9c5bc} : {shirt: 0xf3f2ea, pants: 0x28456f, hat: 0xf6d13b, scale: .78}); g.add(ev.rig); ev.pose = newPose();
      if (elder) { ev.cart = kit.makeCart(); ev.cart.position.set(.1, 0, -.55); g.add(ev.cart); }
      ev.e = ent(g, 30, ev.anchor, .4, .42, Math.PI / 2); ev.e.g.visible = false; ev.e.live = false; ev.ents = [ev.e]; ev.spd = elder ? 1.25 : 1.6;
    },
    corr: () => true,
    onCue(ev) { const tt = (ev.anchor - S.s) / Math.max(S.v, 3); ev.e.x = Math.max(7.6, S.x + ev.spd * tt); ev.e.g.visible = true; ev.e.live = true; },
    tick(ev, dt) {
      if (ev.tCue == null) return;
      const e = ev.e;
      if (ev.crashed && !ev.knocked) {   // 被撞到：人往車子前進的方向倒下，推車往前滑一點
        ev.knocked = true; e.live = false; ev.cartV = ev.cart ? 1.3 : 0;
        const [lx, lz] = toLocal((Math.sign(e.x - S.x) || 1) * .55, -1, e.yaw); knock(ev.pose, lx, lz);
      }
      if (ev.cartV) { ev.cartV = Math.max(0, ev.cartV - dt * 1.6); ev.cart.position.z -= ev.cartV * dt; ev.cart.rotation.y += ev.cartV * dt * .5; }
      if (ev.pose.fall) { fallPose(ev.rig, ev.pose, dt); return; }
      if (ev.fake && e.x <= 7.5) { walkPose(ev.rig, ev.pose, dt, 0); return; }
      const sp = ev.knocked ? ev.spd * .7 : ev.spd;   // 爬起來後走慢一點
      e.x -= sp * dt; walkPose(ev.rig, ev.pose, dt, sp);
    },
    done: ev => ev.tCue != null && ((!ev.fake && ev.e.x < S.x - 1.1) || S.s > ev.anchor + 4),
    dead: ev => ev.e.x < -9 || S.s > ev.anchor + 45,
  },
  suddenBrake: {
    cls: 'dodge', spawnAt: 70,
    spawn(ev) { ev.e = ent(kit.makeSedan(ev.rng() < .4 ? 0xf2d23a : COLORS[ev.rng() * 5 | 0], {taxi: false}), clamp(S.x, 4.35, 5.2), S.s + 70, .95, 2.25); ev.v = NOM * .5; ev.ents = [ev.e]; },
    tta(ev) { const gap = ev.e.a - S.s; return gap > 27 ? 99 : gap > 19 ? CUE - .01 : GO - .01; },
    corr: ev => Math.abs(S.x - ev.e.x) < 1.35,
    onCue(ev) { ev.e.lamps.B.forEach(m => { m.visible = true; }); },
    onGo(ev) { ev.hard = true; },
    tick(ev, dt) {
      const e = ev.e;
      if (ev.fake) { if (ev.tGo != null && S.t - ev.tGo > .3) { e.lamps.B.forEach(m => { m.visible = false; }); ev.v = Math.min(NOM * 1.05, ev.v + 3 * dt); } else if (ev.tCue != null) ev.v = Math.max(NOM * .42, ev.v - 2.5 * dt); }
      else if (ev.hard) {
        const u = S.t - ev.tGo;
        if (u < 2.3) ev.v = Math.max(1.4, ev.v - 9 * dt); else { e.lamps.B.forEach(m => { m.visible = false; }); ev.v = Math.min(NOM * 1.15, ev.v + 3.6 * dt); }
      } else if (ev.tCue != null) ev.v = Math.max(NOM * .38, ev.v - 2.5 * dt);
      e.a += followV(e, ev.v) * dt; ev.anchor = e.a;
    },
    done: ev => (ev.tGo != null && S.t - ev.tGo > 4.6) || S.s > ev.e.a + 5,
    dead: ev => S.s > ev.e.a + 45 || ev.e.a > S.s + 260,
  },
  pothole: {
    cls: 'dodge',
    spawn(ev) { ev.cx = S.x < 3.4 ? 2.2 : 4.7; const m = kit.potholeMesh(), w = road.map(ev.cx, ev.anchor); m.position.set(w.x, .024, w.z); m.rotation.y = -w.th; m.receiveShadow = true; scene.add(m); ev.mesh = m; ev.ents = []; },
    corr: ev => Math.abs(S.x - ev.cx) < 1.5,
    tick(ev) { if (!ev.hit && S.invuln <= 0 && Math.abs(S.s - ev.anchor) < 1.25 && Math.abs(S.x - ev.cx) < 1.25) { ev.hit = true; ev.crashed = true; bump(); } },
    done: ev => S.s > ev.anchor + 2,
    dead: ev => S.s > ev.anchor + 45,
    cleanup(ev) { scene.remove(ev.mesh); },
  },
  rough: {   // 一大片破損路面：出現在你正在騎的車道，要提早換線
    cls: 'dodge',
    spawn(ev) {
      ev.cx = S.x < 3.4 ? 2 : 4.9; ev.len = 8; ev.w = 2.8; ev.ents = [];
      const m = kit.roughMesh(ev.w, ev.len, 'asphalt'), w = road.map(ev.cx, ev.anchor); m.position.set(w.x, .024, w.z); m.rotation.y = -w.th; scene.add(m); ev.mesh = m;
      const sg = kit.roughSign(), sw = road.map(7.45, ev.anchor - ev.len / 2 - 22); sg.position.set(sw.x, 0, sw.z); sg.rotation.y = -sw.th; scene.add(sg); ev.sign = sg;
    },
    corr: ev => Math.abs(S.x - ev.cx) < ev.w / 2 + .15,
    onCue(ev) { if (ev.tested) hint('前方路面不平，換到平整的車道', 2.2); },
    done: ev => S.s > ev.anchor + ev.len / 2 + 1,
    dead: ev => S.s > ev.anchor + 45,
    cleanup(ev) { scene.remove(ev.mesh); scene.remove(ev.sign); },
  },
  work: {
    cls: 'dodge',
    spawn(ev) { ev.ents = []; },
    corr: () => S.x > 2.65,
    done: ev => S.s > ev.anchor + 3,
    dead: ev => S.s > ev.anchor + 30,
  },
  ringYield: {
    cls: 'brake', spawnAt: 140,
    spawn(ev) { const e = ev.e = ent(kit.makeSedan(ev.rng() < .5 ? 0xf2d23a : COLORS[ev.rng() * 5 | 0], {}), 99, ev.anchor, .95, 2.25); e.world = true; e.live = false; e.g.visible = false; ev.ents = [e]; ev.vc = 8.5; },
    corr: () => true,
    onCue(ev) {   // 環內車算好和你同時到進環點，要讓它先走才不會撞
      const tt = (ev.anchor - S.s) / Math.max(S.v, 3); ev.d = -ev.vc * tt;
      placeRingCar(ev.e, ev.R, ev.d, RING.Rc + 4.4); ev.e.g.visible = true; ev.e.live = true; hint('環內有車！先讓它過', 2.4); Snd.horn();
    },
    tick(ev, dt) { if (ev.d == null) return; ev.d += ev.vc * dt; if (ev.d > 0) ev.vc = Math.min(NOM * 1.15, ev.vc + 3 * dt); placeRingCar(ev.e, ev.R, ev.d, RING.Rc + 4.4); },
    done: ev => (ev.d != null && ev.d > 6) || S.s > ev.anchor + 4,
    dead: ev => S.s > ev.R.end + 25,
  },
  redLight: {
    cls: 'brake', spawnAt: 120,
    spawn(ev) {
      ev.ents = []; ev.cars = [];
      for (let k = 0; k < 4; k++) {
        const near = k % 2 === 0, e = ent(kit.makeSedan([0xf2f2ee, 0x2c5e92, 0xf2d23a, 0x9a2f2f][k], {}), near ? -55 : 55, ev.slot.a + (near ? 15 : 25.5), 2.25, .95, near ? -Math.PI / 2 : Math.PI / 2);
        e.g.visible = false; e.live = false; e.dir = near ? 1 : -1; e.delay = .5 + k * .55; ev.cars.push(e); ev.ents.push(e);
      }
      ev.sig = 'G'; ev.prevS = S.s;
    },
    corr: () => true,
    tta: ev => (ev.anchor - S.s) / NOM,
    onCue(ev) { setSignal(ev.slot, 'Y'); ev.sig = 'Y'; ev.tY = S.t; Snd.beep(990, .12, 'triangle', .04); },
    tick(ev, dt) {
      if (ev.sig === 'Y' && S.t - ev.tY > 2.5) { ev.sig = 'R'; ev.tR = S.t; setSignal(ev.slot, 'R'); }
      if (ev.sig === 'R') {
        const u = S.t - ev.tR;
        ev.cars.forEach(e => { if (u > e.delay) { if (!e.started) { e.started = true; e.g.visible = true; e.live = true; } e.x += e.dir * 13.5 * dt; } });
        if (u > 6.5) { ev.sig = 'G2'; setSignal(ev.slot, 'G'); }
      }
      if (ev.prevS < ev.anchor && S.s >= ev.anchor && !ev.crossed) {
        ev.crossed = true;
        if (ev.sig === 'R') ticket('闖紅燈', ev);
        else if (ev.sig === 'Y') { ev.yellowRun = true; toast('黃燈衝過去，沒有加分', 'warn'); }
      }
      ev.prevS = S.s;
      if (ev.sig === 'R' && !ev.crossed && S.v < .8 && ev.anchor - S.s < 22 && !ev.stopped) { ev.stopped = true; }
    },
    done: ev => ev.stopped || ev.crossed || S.s > ev.anchor + 5,
    dead: ev => ev.sig === 'G2' && S.s > ev.anchor + 35 || S.s > ev.anchor + 70,
    resolve(ev) {
      if (ev.stopped) { if (ev.tR != null && ev.tReact != null && ev.tReact < ev.tR) award(ev, 'early', '紅燈停得穩'); else award(ev, 'late', '有停下來'); return true; }
      if (ev.crossed) return true;
      return true;
    },
  },
};

function planEvents(seed) {
  const r = mulberry(seed), evs = [];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const crossBag = shuffle(route.crossBag || ['redRunner', 'leftTurn', 'rightTruck', 'redLight']);
  const openBag = shuffle(route.bag || ['parkPull', 'door', 'pothole', 'wrongWay', 'suddenBrake', 'truckDrop']);
  const MOVING = ['truckDrop', 'suddenBrake'];
  let oi = 0, ci = 0, skipNext = false;
  const reserved = new Set();   // 移動車輛會開進下一格，那格不再放東西
  slots.forEach((slot, idx) => {
    if (slot.ring) { if (slot.ringJ === 0) { const R = road.rings.find(q => q.a === slot.a); evs.push({type: 'ringYield', anchor: R.t1, slot, R, fake: false, state: 'idle', rng: mulberry(seed * 31 + idx), ents: []}); } return; }
    if (idx < 2 || idx >= slots.length - 1 || slot.bend) return;
    let type = null, anchor = slot.a + 20 + r() * 8;
    if (slot.type === 'cross') { type = crossBag[ci++ % crossBag.length]; anchor = slot.a + 20; if (type === 'redLight') anchor = slot.a + 9.2; }
    else if (slot.type === 'work') { type = 'work'; anchor = slot.a + 5; }
    else if (slot.type === 'school') { type = 'pedestrian'; anchor = slot.a + 20; }
    else if (slot.type === 'alley') { type = 'alley'; anchor = slot.a + 20; }
    else if (skipNext) { skipNext = false; reserved.add(slot); return; }
    else { type = openBag[oi++ % openBag.length]; if (MOVING.includes(type)) skipNext = true; }
    if (!type) return;
    if (MODE.skip && slot.type !== 'cross' && slot.type !== 'work' && idx % 3 === 2) return;
    const canFake = ['parkPull', 'door', 'redRunner', 'leftTurn', 'alley', 'pedestrian', 'suddenBrake'].includes(type);
    evs.push({type, anchor, slot, fake: canFake && r() < .2, state: 'idle', rng: mulberry(seed * 31 + idx), ents: []});
  });
  // 破損路面：每條路固定幾塊，先放在沒有其他路況的直路，不夠才換掉一般路況
  const place = sl => evs.push({type: 'rough', anchor: sl.a + 20 + r() * 8, slot: sl, fake: false, state: 'idle', rng: mulberry(seed * 37 + sl.i), ents: []});
  const plain = sl => !sl.bend && !sl.ring && !['cross', 'work', 'alley', 'school', 'finish'].includes(sl.type) && sl.i >= 2 && sl.i < slots.length - 1;
  const used = new Set(evs.map(e => e.slot)), free = shuffle(slots.filter(sl => plain(sl) && !used.has(sl) && !reserved.has(sl)));
  let need = route.rough || 0;
  while (need > 0 && free.length) { place(free.pop()); need--; }
  if (need > 0) { const swap = shuffle(evs.filter(e => plain(e.slot) && e.type !== 'rough' && !MOVING.includes(e.type))); while (need > 0 && swap.length) { const e = swap.pop(); evs.splice(evs.indexOf(e), 1); place(e.slot); need--; } }
  return evs;
}
function award(ev, kind, label) {
  S.tested++;
  const name = label || LABEL[ev.type];
  if (kind === 'early') {
    S.early++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    const p = Math.round(50 * mult()); S.score += p; addGauge(5); toast(`${name}：提早反應 +${p}`, 'good'); Snd.good();
  } else if (kind === 'late') {
    S.late++; const p = Math.round(20 * mult()); S.score += p; addGauge(2); toast(`${name}：及時避開 +${p}`, 'ok'); Snd.ok(); noteWorst(LABEL[ev.type], 1);
  } else {
    S.ok++; toast('好險！', 'warn'); noteWorst(LABEL[ev.type], 2);
  }
  if (ev.tReact != null && ev.tCue != null) S.leads.push(Math.max(0, CUE - (ev.tReact - ev.tCue)));
}
function resolveEvent(ev) {
  ev.resolved = true; ev.done2 = true;
  if (ev.crashed) return;
  const h = H[ev.type];
  if (h.resolve && h.resolve(ev)) return;
  if (ev.fake) { S.fakes++; if (ev.tReact != null) toast('虛驚一場', 'ok'); return; }
  if (!ev.tested) return;
  if (ev.tReact != null && (ev.tGo == null || ev.tReact < ev.tGo)) award(ev, 'early');
  else if (ev.tReact != null) award(ev, 'late');
  else award(ev, 'ok');
}
function tickEvent(ev, dt) {
  const h = H[ev.type];
  if (ev.state === 'dead') return;
  if (ev.state === 'idle') {
    if (ev.anchor - S.s > (h.spawnAt || 120)) return;
    h.spawn(ev); ev.state = 'wait'; S.seen.add(ev.type);
  }
  const d = ev.anchor - S.s, tta = h.tta ? h.tta(ev) : d / NOM;
  if (ev.state === 'wait' && tta <= CUE) { ev.state = 'cue'; ev.tCue = S.t; ev.tested = h.corr(ev); h.onCue?.(ev); }
  if (ev.state === 'cue' && (tta <= GO || S.t - ev.tCue > CUE - GO + .35)) { ev.state = 'go'; ev.tGo = S.t; if (!ev.fake) h.onGo?.(ev); }
  h.tick?.(ev, dt);
  if (ev.tCue != null && ev.tReact == null && !ev.resolved && ev.tested && S.phase === 'ride') {
    const braking = S.brake || (S.v < NOM * .72 && S.t - S.lastBrake < 1.5), out = h.cls === 'dodge' && !h.corr(ev);
    if (braking || out) { ev.tReact = S.t; if (!ev.fake && (ev.tGo == null)) { toast('看到了', 'see'); Snd.see(); } }
  }
  if (!ev.resolved && S.phase !== 'crash' && h.done(ev)) resolveEvent(ev);
  if (ev.resolved && h.dead(ev)) { ev.state = 'dead'; ev.ents.forEach(e => { scene.remove(e.g); e.live = false; }); h.cleanup?.(ev); }
}
/* 碰撞 */
const PLAYER_HW = .3, PLAYER_HL = .72;
function overlap(r) {
  if (r.world) {
    const w = road.map(S.x, S.s), dx = w.x - r.wx, dz = w.z - r.wz, c = Math.cos(r.wth), s = Math.sin(r.wth);
    return Math.abs(dx * c + dz * s) < PLAYER_HW + r.hw * .92 && Math.abs(dx * s - dz * c) < PLAYER_HL + r.hl * .92;
  }
  return Math.abs(S.x - r.x) < PLAYER_HW + r.hw * .92 && Math.abs(S.s - r.a) < PLAYER_HL + r.hl * .92;
}
function checkCollisions() {
  if (S.invuln > 0 || S.phase !== 'ride') return;
  for (const ev of EVENTS) {
    if (ev.state === 'idle' || ev.state === 'dead') continue;
    for (const e of ev.ents) if (e.live && overlap(e)) { crash(ev); return; }
    const ex = H[ev.type].extra?.(ev); if (ex && overlap(ex)) { crash(ev); return; }
  }
  for (const e of AMB) if (e.solid && !(e.op && road.inRing(e.a)) && !(e.ringCar && e.wx == null) && overlap(e)) { crash(null, e); return; }
  for (const slot of slots) if (slot.colliders && Math.abs(S.s - slot.a - 20) < 40) for (const c of slot.colliders) {
    const r = {x: (c.x0 + c.x1) / 2, hw: (c.x1 - c.x0) / 2, a: slot.a + (-c.z0 - c.z1) / 2, hl: (c.z0 - c.z1) / 2};
    if (overlap(r)) { const ev = EVENTS.find(v => v.slot === slot && v.type === 'work'); crash(ev, null, 2.2); return; }
  }
}
function crash(ev, amb, safeX) {
  S.phase = 'crash'; S.crashT = 2.3; S.crashes++; S.combo = 0; addGauge(-HP.crash, ev ? ev.type : amb?.key || 'crash'); clearSurface(); S.shake = 1; S.crashDir = (valley ? S.x > 0 : S.x > 3) ? 1 : -1; S.safeX = safeX ?? (valley ? clamp(S.x, -RW + .3, RW - .3) : clamp(S.x, .8, 6));
  if (ev) { ev.crashed = true; }
  noteWorst(ev ? LABEL[ev.type] : (amb?.label || '撞上前方來車'), 3 + S.crashes);
  toast(amb?.toast || `摔車了！血條 −${HP.crash}`, 'bad'); vignette(); Snd.crash(); cfg.onHit?.();
}
function bump() { S.v *= .5; S.bumps++; S.combo = 0; addGauge(-HP.bump, 'pothole'); cfg.onHit?.(.4); S.shake = .55; toast(`坑洞！血條 −${HP.bump}`, 'bad'); Snd.bump(); noteWorst('路面坑洞', 1.5); }
/* 路面好不好騎：田埂、破損路面、水溝蓋都一樣，騎上去就會慢、會抖、會一直扣血 */
const SURF = {
  ditch: {key: 'ditch', slow: .55, toast: '騎進田埂了！', back: '田埂會一直扣血，快騎回路上'},
  dirt: {key: 'dirt', slow: .7, toast: '路面坑坑洞洞！', back: ''},
  rail: {key: 'rail', slow: .8, toast: '擦到橋欄了！', back: '過橋靠中間騎，別貼著欄杆'},
  rough: {key: 'rough', slow: .7, toast: '路面不平！', back: ''},
  gutter: {key: 'gutter', slow: .8, toast: '騎上水溝蓋了！', back: '路邊水溝蓋很顛，騎回車道'},
};
function clearSurface() { S.surf = null; S.surfEv = null; S.surfIn = 0; S.surfSlow = 1; }
function surfaceAt() {
  S.surfEv = null;
  if (valley) {
    if (bridgeAt() && Math.abs(S.x) >= RW - .08) return SURF.rail;
    if (Math.abs(S.x) > RW + .05) return SURF.ditch;
    for (const it of ITEMS) if (it.kind === 'rough' && Math.abs(S.s - it.a) < it.len / 2 && Math.abs(S.x - it.x) < it.w / 2) return SURF.dirt;
    return null;
  }
  for (const ev of EVENTS) if (ev.type === 'rough' && ev.state !== 'idle' && ev.state !== 'dead' && Math.abs(S.s - ev.anchor) < ev.len / 2 && Math.abs(S.x - ev.cx) < ev.w / 2) { S.surfEv = ev; return SURF.rough; }
  if (Math.abs(S.x) > GUTTER) {   // 路邊水溝蓋：路口中間和圓環沒有
    const sl = slots[clamp(Math.floor(S.s / CHUNK), 0, slots.length - 1)], u = S.s - sl.a;
    if (!sl.ring && !(sl.type === 'cross' && u > 9.5 && u < 30.5)) return SURF.gutter;
  }
  return null;
}
function tickSurface(dt) {
  const sf = surfaceAt();
  S.surfHit = Math.max(0, S.surfHit - dt);
  if (!sf) { clearSurface(); return; }
  S.surf = sf; S.surfSlow = sf.slow; S.surfIn += dt;
  S.rumbleT -= dt; if (S.rumbleT <= 0) { S.rumbleT = .13; Snd.rumble(); }
  S.shake = Math.max(S.shake, .16);
  if (S.invuln > 0 || S.surfIn < ROUGH_GRACE || S.surfHit > 0) return;
  S.surfHit = ROUGH_EVERY; S.roughs++; S.combo = 0;
  addGauge(-HP.rough, sf.key); Snd.bump(); cfg.onHit?.(.3); noteWorst(LABEL[sf.key], 1.5);
  if (S.surfEv && !S.surfEv.crashed) { S.surfEv.crashed = true; S.bumps++; }
  if (S.surfIn < .5) toast(`${sf.toast}血條 −${HP.rough}`, 'bad');
  if (sf.back && !S.warned.has(sf.key)) { S.warned.add(sf.key); hint(sf.back, 2.6); }
}
function ticket(why, ev) { S.tickets++; S.combo = 0; S.score -= 100; addGauge(-HP.ticket, 'ticket'); cfg.onHit?.(.4); flashWhite(.95); toast(`${why}：紅單 1 張 −100`, 'bad'); Snd.flash(); noteWorst(why, 2.5); if (ev) ev.ticketed = true; }

/* 背景車流 */
function buildAmbient() {
  AMB.forEach(e => scene.remove(e.g)); AMB = [];
  const r = mulberry(4242), TF = route.traffic || {};
  const make = {bus: () => kit.makeBus(0xf3f3ee, r() < .5 ? 0x1e8e8a : 0x2c6fb3), taxi: () => kit.makeSedan(0xf2d23a, {taxi: true}), car: () => kit.makeSedan(COLORS[r() * 5 | 0]), pick: () => kit.makePickup(0x8fc0d8, {loose: false}),
    m1: () => kit.makeScooter({body: 0x3f7fc4, helmet: 0xe2e2dc, shirt: 0xd65a5a}), m2: () => kit.makeScooter({body: 0xd64f4f, helmet: 0x2b2d33, shirt: 0x6aa86a}), m3: () => kit.makeScooter({body: 0xe0a33a, helmet: 0xf2f2ec, shirt: 0x34383f, box: 0x3fa266})};
  (TF.opp || ['bus', 'taxi', 'car', 'm1', 'm2', 'pick', 'car', 'm3']).forEach((k, i) => {
    const big = k === 'bus', moto = k[0] === 'm', gap = TF.oppGap || 42;
    const e = ent(make[k](), moto ? -6 + r() * 1.6 : (r() < .5 || big ? -5.25 : -1.75), S.s + 25 + i * gap + r() * 18, moto ? .36 : big ? 1.25 : .95, moto ? .85 : big ? 5.6 : 2.25, Math.PI);
    e.v = -(moto ? 9 + r() * 2 : 8.5 + r() * 2.2); e.solid = true; e.op = true; e.key = 'oncoming'; e.label = '逆向撞上對向來車'; AMB.push(e);
  });
  for (let i = 0; i < (TF.same ?? 3); i++) {
    const e = ent(i === 0 ? make.taxi() : make.car(), 1.55, S.s + 28 + i * 52, .95, 2.25); e.base = NOM * (.82 + r() * .22); e.v = e.base; e.solid = true; e.same = true; e.key = 'rearEnd'; e.label = '追撞內側車輛'; AMB.push(e);
  }
  for (let i = 0; i < (TF.flow ?? 3); i++) {
    const k = i % 3, e = ent(kit.makeScooter({body: SC[k], helmet: HM[k], shirt: SH[k], box: k === 1 ? 0x3fa266 : null}), 2.95 + r() * .45 + (i > 2 && i % 2 ? 3.1 : 0), S.s - 12 - i * (TF.flow > 3 ? 8 : 16), .36, .85);
    e.v = NOM * 1.1; e.flow = true; e.solid = true; e.key = 'sideSwipe'; e.label = '撞到旁邊的機車'; e.toast = `撞到旁邊的機車！血條 −${HP.crash}`; AMB.push(e);
  }
  if (TF.garbage !== false) { const gt = ent(kit.makeGarbageTruck(), -5.25, S.s + 190, 1.1, 3.2, Math.PI); gt.v = -7.5; gt.solid = true; gt.op = true; gt.key = 'oncoming'; gt.label = '逆向撞上垃圾車'; AMB.push(gt); }
  road.rings.forEach(R => { for (let k = 0; k < 2; k++) {
    const e = ent(k ? make.taxi() : make.car(), 99, R.a + R.shape.len / 2, .95, 2.25); e.world = true; e.solid = true; e.key = 'ringYield'; e.label = '撞上環內車'; e.ringCar = {R, d: 30 + k * 72, r: RING.Rc - 3.5}; AMB.push(e);
  } });
  AMB.forEach(e => { e.a0 = e.a; e.x0 = e.x; e.v0 = e.v; });
}
const GUTTER = 6.15, ACCEL = 3.6, SC = [0x7eb4a8, 0x2b2d33, 0xf2f2ec], HM = [0xe23b35, 0xf2f2ec, 0x3f7fc4], SH = [0xe6c84f, 0x3fa266, 0x34383f];
function nextRed(a) { let best = null; for (const ev of EVENTS) if (ev.type === 'redLight' && ev.state !== 'idle' && (ev.sig === 'R' || ev.sig === 'Y') && ev.anchor > a - 1) { if (!best || ev.anchor < best) best = ev.anchor; } return best; }
/** 同向機車會閃的東西：事件車輛與掉落物、坑洞、破損路面、施工護欄、內側汽車、其他機車、玩家 */
function flowBlockers(e) {
  const rs = [], near = r => r.a + r.hl > e.a - 3 && r.a - r.hl < e.a + 40;
  for (const ev of EVENTS) {
    if (ev.state === 'idle' || ev.state === 'dead') continue;
    for (const o of ev.ents) if (o.live) rs.push(o);
    const ex = H[ev.type].extra?.(ev); if (ex) rs.push(ex);
    if (ev.type === 'pothole') rs.push({x: ev.cx, a: ev.anchor, hw: .75, hl: .75});
    if (ev.type === 'rough') rs.push({x: ev.cx, a: ev.anchor, hw: ev.w / 2, hl: ev.len / 2});
  }
  for (const slot of slots) if (slot.colliders && Math.abs(e.a - slot.a - 20) < 50) for (const c of slot.colliders) rs.push({x: (c.x0 + c.x1) / 2, hw: (c.x1 - c.x0) / 2, a: slot.a + (-c.z0 - c.z1) / 2, hl: (c.z0 - c.z1) / 2});
  for (const o of AMB) if (o !== e && (o.same || o.flow)) rs.push(o);
  if (S.phase === 'ride' || S.phase === 'crash') rs.push({x: S.x, a: S.s, hw: PLAYER_HW + .3, hl: PLAYER_HL});
  return rs.filter(near);
}
const FLOW_XS = [3.0, 2.6, 3.4, 2.2, 3.8, 4.2, 4.6, 5.0, 5.4, 5.8, 6.2, 1.9];
function flowSteer(e, tgt, dt) {
  const look = 3 + Math.max(e.v, 3) * 1.3, rs = flowBlockers(e);
  const hits = (x, a0, a1, pad) => rs.filter(r => Math.abs(r.x - x) < r.hw + e.hw + pad && r.a + r.hl > a0 && r.a - r.hl < a1);
  const sweep = x1 => { for (let k = 1; k <= 6; k++) if (hits(e.x + (x1 - e.x) * k / 6, e.a - e.hl - .2, e.a + e.hl + 1.5, .12).length) return false; return true; };
  const free = x => !hits(x, e.a - e.hl, e.a + e.hl + look, .3).length && sweep(x);
  let to = null;
  if (free(e.x0)) to = e.x0;
  else { let bs = 1e9; for (const x of [e.x0, ...FLOW_XS]) { const sc = Math.abs(x - e.x) + Math.abs(x - e.x0) * .25; if (sc < bs && free(x)) { bs = sc; to = x; } } }
  if (to == null) {   // 兩邊都塞住：停在後面等
    to = e.x;
    for (const r of hits(e.x, e.a, e.a + look + 6, .25)) if (r.a > e.a) tgt = Math.min(tgt, Math.max(0, (r.a - r.hl - e.a - e.hl - 1.2) * 1.3));
  }
  const vx = clamp((to - e.x) * 2.4, -2.2, 2.2);
  e.x += vx * dt;
  e.yaw = follow(e.yaw || 0, Math.atan2(-vx, Math.max(2, e.v)), 7, dt);
  return tgt;
}
function tickAmbient(dt) {
  const same = AMB.filter(e => e.same).sort((p, q) => p.a - q.a);
  for (const e of AMB) {
    if (e.ringCar) { e.ringCar.d += 6.5 * dt; placeRingCar(e, e.ringCar.R, e.ringCar.d, e.ringCar.r); continue; }
    if (e.op) { e.a += e.v * dt; if (e.a < S.s - 40) { e.a = S.s + 230 + Math.random() * 90; } continue; }
    if (e.flow) {
      const red = nextRed(e.a); let tgt = NOM * 1.12;
      if (red != null && red - e.a < 30) tgt = Math.max(0, (red - e.a - 1) * 1.1);
      tgt = flowSteer(e, tgt, dt);   // 前面有障礙：換到空的位置，換不過去就減速跟在後面
      e.v += clamp(tgt - e.v, -9 * dt, 4 * dt); e.a += e.v * dt;
      if (e.a > S.s + 190) { e.a = S.s - 40 - Math.random() * 30; e.v = NOM * 1.1; e.x = e.x0; e.yaw = 0; }
      if (e.a < S.s - 90) { e.a = S.s - 36; e.v = NOM * 1.1; e.x = e.x0; e.yaw = 0; }
      continue;
    }
    if (e.same) {
      let tgt = e.base;
      const i = same.indexOf(e); const lead = same[i + 1];
      if (lead) tgt = Math.min(tgt, Math.max(0, (lead.a - e.a - 7.5) * 1.2));
      const red = nextRed(e.a); if (red != null) tgt = Math.min(tgt, Math.max(0, (red - e.a - 3.2) * 1.15));
      for (const ev of EVENTS) if ((ev.state === 'wait' || ev.state === 'cue' || ev.state === 'go') && ev.ents) for (const o of ev.ents) if (o.live && Math.abs(o.x - e.x) < o.hw + 1.05 && o.a > e.a) tgt = Math.min(tgt, Math.max(0, (o.a - e.a - o.hl - 4) * 1.1));
      if (Math.abs(S.x - e.x) < 1.25 && S.s > e.a) tgt = Math.min(tgt, Math.max(0, (S.s - e.a - 4.2) * 1.2));
      e.v += clamp(tgt - e.v, -9 * dt, 3 * dt); e.a += e.v * dt;
      if (e.a < S.s - 45) { const top = Math.max(...same.map(q => q.a)); e.a = Math.max(S.s + 170, top + 40); e.v = e.base; }
      if (e.a > S.s + 290) { const low = Math.min(...same.map(q => q.a)); e.a = Math.min(S.s - 40, low - 20); e.v = e.base; }
    }
  }
}
  /* ───────── 自動試玩（驗證與展示用） ───────── */
let demoTarget = 4.6, demoB = false;
function demoThink() {
  demoTarget = 4.6; demoB = false;
  if (DEMO === 2) return;
  const delay = DEMO === 3 ? 2.2 : .4;
  for (const ev of EVENTS) {
    if (ev.state !== 'cue' && ev.state !== 'go' && ev.state !== 'wait') continue;
    if (ev.resolved && ev.type !== 'redLight') {
      if (H[ev.type].cls === 'dodge' && ev.ents.some(e => e.live && e.x > 3 && Math.abs(e.a - S.s) < 8)) demoTarget = Math.min(demoTarget, 2.95);
      continue;
    }
    if (ev.type === 'redLight') {
      if (ev.sig !== 'G' && ev.sig !== 'G2' && !ev.crossed && S.t - ev.tCue > delay) { const d = ev.anchor - S.s; if (d < Math.max(5, S.v * S.v / (2 * MODE.brake) + 3)) demoB = true; }
      continue;
    }
    if (ev.tCue == null || S.t - ev.tCue < delay) continue;
    if (H[ev.type].cls === 'dodge') { demoTarget = ev.type === 'work' ? 2.0 : ev.cx != null && ev.cx < 3.4 ? 4.6 : 2.95; } else if (S.t - ev.tCue < 3.4) demoB = true;
  }
  for (const slot of slots) if (slot.colliders && S.s > slot.a - 26 && S.s < slot.a + 37) demoTarget = 2.0;
  for (const e of AMB) if (e.same && Math.abs(e.x - S.x) < 1.35 && e.a > S.s && e.a - S.s < 9 + e.hl) demoB = true;
}
const demoSteer = () => clamp((demoTarget - S.x) * 1.4, -1, 1);
const demoBrake = () => demoB;

  /* ───────── 鐵馬路線：按鈴請路上的人讓路、閃竹簍、超慢車 ───────── */
  const ITEMS = [], NPCS = [], TROUPES = [];
  const BELL_EARLY = 2.4, BELL_OK = 1.1;   // 按鈴時離撞上還有幾秒：2.4 秒以上算提早
  const EDGE = {pole: 2.85, duck: 2.75, buffalo: 2.7};   // 讓路後站的位置，車道上的車剛好過得去
  /** 路上的一組人：挑扁擔的阿伯／趕鴨的小孩＋鴨群／牽牛的阿嬸＋水牛 */
  function makeTroupe(type, x, a, rng) {
    const g = new THREE.Group(), mem = [];
    const person = (o, dx, da, extra) => { const rig = kit.makeRig(o); rig.position.set(dx, 0, -da); g.add(rig); const m = {kind: 'person', obj: rig, st: newPose(), dx, da, hw: .26, hl: .26, ...extra}; mem.push(m); return m; };
    if (type === 'pole') {
      const m = person({shirt: 0xe9e4d4, pants: 0x3c4a5c, hair: 0xb8b2a6, straw: true}, 0, 0, {hw: .3, hl: .95});
      const R = m.obj.userData.rig; m.pole = kit.makePoleLoad({load: rng() < .5 ? 0x6aa84f : 0xe8c35a}); m.pole.position.set(.15 * R.k, .63 * R.k, 0); R.upper.add(m.pole);
    } else if (type === 'duck') {
      const kid = person({shirt: 0xf3f2ea, pants: 0x2f3a6b, scale: .72}, 0, 0, {hw: .22, hl: .22, stick: true});
      const R = kid.obj.userData.rig, stick = kit.makeStick(); stick.position.set(.035 * R.k, -.43 * R.k, 0); R.armR.add(stick);
      const n = 4 + (rng() * 2 | 0);
      for (let i = 0; i < n; i++) {
        const d = kit.makeDuck(rng() < .3 ? {col: 0xa57a4f} : {}), dx = (rng() - .5) * .8, da = 1.2 + i * .4 + rng() * .25;
        d.position.set(dx, 0, -da); g.add(d);
        mem.push({kind: 'duck', obj: d, st: {ph: rng() * 6}, dx, da, ox: dx, oa: da, ox0: dx, hw: .17, hl: .22, wob: rng() * 9});
      }
    } else {
      const b = kit.makeBuffalo(); g.add(b); mem.push({kind: 'buffalo', obj: b, st: {}, dx: 0, da: 0, hw: .44, hl: .95});
      person({shirt: 0x5c7fb0, pants: 0x2a2f3a, straw: true}, 0, 1.6, {lead: true});
    }
    const icon = kit.makeBellIcon(); icon.visible = false; g.add(icon);
    g.visible = false; scene.add(g);
    const t = {type, x0: x, a0: a, g, icon, members: mem, iconA: type === 'duck' ? 1.5 : type === 'buffalo' ? .9 : 0, walk: type === 'buffalo' ? .75 : type === 'duck' ? .95 : 1.05,
      sideV: type === 'buffalo' ? .75 : type === 'duck' ? 1.9 : 1.5, far: Math.max(...mem.map(m => m.da + m.hl))};
    resetTroupe(t); TROUPES.push(t); return t;
  }
  function resetTroupe(t) {
    Object.assign(t, {x: t.x0, a: t.a0, tx: t.x0, vx: 0, v: t.walk, rung: null, passed: false, hit: false, active: false, startle: 0, flapT: 0});
    t.g.visible = false; t.icon.visible = false;
    for (const m of t.members) {
      if (m.kind === 'person') { m.st.fall = null; const r = m.obj.userData.rig; r.tip.quaternion.identity(); r.tip.position.y = 0; m.obj.rotation.y = 0; }
      if (m.kind === 'duck') { m.ox = m.ox0; m.dx = m.ox0; m.da = m.oa; m.scat = 0; m.sx = 0; m.obj.rotation.y = 0; }
    }
  }
  const sideOf = t => t.x < -.4 ? -1 : t.x > .4 ? 1 : S.x > .3 ? -1 : S.x < -.3 ? 1 : (Math.round(t.a0) % 2 ? 1 : -1);
  function tickTroupe(t, dt) {
    const d = t.a - S.s;
    if (!t.active && d < 95) t.active = true;
    t.g.visible = t.active && d > -25 && d < 220;
    if (!t.active || d < -40) return;
    const busy = t.members.some(m => m.st.fall);
    t.startle = Math.max(0, t.startle - dt); t.flapT = Math.max(0, t.flapT - dt);
    t.v = follow(t.v, busy || t.startle > 0 ? 0 : t.walk, 3, dt);
    t.a += t.v * dt;
    t.vx = follow(t.vx, busy ? 0 : clamp((t.tx - t.x) * 2.2, -t.sideV, t.sideV), 4, dt);
    t.x += t.vx * dt;
    t.g.position.set(t.x, 0, -t.a);
    const sp = Math.hypot(t.v, t.vx), turn = -Math.atan2(t.vx, Math.max(.35, t.v));
    for (const m of t.members) {
      if (m.kind === 'person') {
        if (m.st.fall) { fallPose(m.obj, m.st, dt); continue; }
        m.obj.rotation.y = follow(m.obj.rotation.y, turn * .9, 6, dt);
        walkPose(m.obj, m.st, dt, sp, m.pole ? {armR: 2.2, armRz: -.15} : m.stick ? {armR: .5} : m.lead ? {armL: -.45, armLz: -.12} : {});
        if (m.pole) poleSway(m.pole, m.st, dt, t.vx / t.sideV);
      } else if (m.kind === 'duck') {
        // 鴨子各走各的：在小孩前面晃來晃去；被嚇到就散開、拍翅膀
        m.wob += dt * 1.4; m.scat = Math.max(0, (m.scat || 0) - dt * .3);
        const px = m.dx, pa = m.da;
        m.dx = follow(m.dx, m.ox + Math.sin(m.wob) * .12 + (m.sx || 0) * m.scat * 2.2, 2.5, dt);
        m.da = follow(m.da, m.oa + Math.cos(m.wob * .7) * .1 + m.scat * .9, 2.5, dt);
        const vx = (m.dx - px) / dt + t.vx, va = (m.da - pa) / dt + t.v;
        m.obj.position.set(m.dx, 0, -m.da);
        if (Math.hypot(vx, va) > .15) m.obj.rotation.y = follow(m.obj.rotation.y, -Math.atan2(vx, va), 6, dt);
        duckPose(m.obj, m.st, dt, Math.hypot(vx, va), m.scat > .25 || t.flapT > 0 ? 1 : 0);
      } else buffaloPose(m.obj, m.st, dt, sp, t.startle);
    }
    // 還沒按鈴、進到 42 公尺內：頭上冒鈴鐺
    t.icon.visible = !t.rung && !t.hit && d > 4 && d < 42 && S.phase === 'ride';
    if (t.icon.visible) t.icon.position.set(0, 2.3 + Math.sin(S.t * 5) * .08, -t.iconA);
  }
  function hitTroupe(t, off) {
    if (S.invuln > 0 || off || t.hit) return false;
    for (const m of t.members) {
      const mx = t.x + m.dx, ma = t.a + m.da;
      if (Math.abs(S.x - mx) >= PLAYER_HW + m.hw * .9 || Math.abs(S.s - ma) >= PLAYER_HL + m.hl * .9) continue;
      t.hit = true; t.tx = sideOf(t) * EDGE[t.type];   // 撞完會自己走到路邊
      if (m.kind === 'person') { const [lx, lz] = toLocal((Math.sign(mx - S.x) || 1) * .55, -1, m.obj.rotation.y); knock(m.st, lx, lz); }
      else if (m.kind === 'duck') { for (const q of t.members) if (q.kind === 'duck') { q.scat = 1; q.sx = Math.sign(q.dx + t.x - S.x) || 1; } t.flapT = 1.4; Snd?.quack?.(); }
      else { t.startle = 1.3; Snd?.moo?.(); }
      const [key, label, say] = m.kind === 'duck' ? ['duck', '撞進鴨群', '撞進鴨群了！'] : m.kind === 'buffalo' ? ['buffalo', '撞到水牛', '撞到水牛了！'] : ['walker', '撞到路上的人', '撞到人了！'];
      S.bumps++; S.combo = 0; crash(null, {key, label, toast: `${say}血條 −${HP.crash}`});
      return true;
    }
    return false;
  }
  /** 按鈴：前面 46 公尺內還沒按過的人都會讓路；離撞上越久分數越高 */
  function ringBell() {
    Snd?.bell?.();
    let any = false;
    for (const t of TROUPES) {
      const d = t.a - S.s;
      if (!t.active || t.rung || t.hit || d < 1.5 || d > 46) continue;
      any = true;
      const tta = (d - 1.5) / Math.max(2, S.v - t.v), q = tta >= BELL_EARLY ? 'early' : tta >= BELL_OK ? 'late' : 'close';
      const side = sideOf(t); t.rung = q; t.tx = side * EDGE[t.type];
      if (t.type === 'duck') { t.flapT = .9; for (const m of t.members) if (m.kind === 'duck') { m.ox = clamp(m.ox0, -.25, .25) + side * .2; m.sx = side; } }
      if (q === 'early') { S.early++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.score += 30 * mult(); toast(S.combo >= 2 ? `提早按鈴 ×${S.combo}` : '提早按鈴，讓路了！', 'good'); }
      else if (q === 'late') { S.late++; S.combo = 0; S.score += 10; toast('有按鈴，再早一點更好', 'ok'); }
      else { S.combo = 0; toast('太近了，自己閃開！', 'warn'); }
    }
    for (const n of NPCS) { const d = n.a - S.s; if (!n.rung && !n.done && d > 1.5 && d < 46) { n.rung = true; any = true; n.tx = (n.x >= 0 ? 1 : -1) * 2.55; S.score += 10; toast('前面的鐵馬讓開了', 'ok'); } }
    if (!any) {
      S.empty = (S.empty || []).filter(x => S.t - x < 6); S.empty.push(S.t);
      if (S.empty.length >= 3 && !S.warned.has('emptyBell')) { S.warned.add('emptyBell'); hint('前面沒人的時候不用按鈴，看到人再按', 2.6); }
    }
  }
  if (valley) {
    const r = mulberry(seed * 7 + 3), T = itemTemplates(kit), gap = [0, 15, 12, 10][route.dens] || 14;
    // 障礙輪流出現在三條線上，走中間不動也躲不掉
    let hz = [], tb = [], a = 28, lastRough = -60;
    const bag = (arr, list) => { if (!arr.length) { arr.push(...list); for (let i = arr.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } } return arr.pop(); };
    const hazLane = () => bag(hz, [-LANE, 0, LANE]), troupeType = () => bag(tb, ['pole', 'duck', 'buffalo']);
    const plainDirt = (s0, s1) => typeof route.seq[Math.floor(s0 / CHUNK)] === 'number' && typeof route.seq[Math.floor(s1 / CHUNK)] === 'number';
    while (a < FINISH_A - 34) {
      const roll = r(), dueRough = a - lastRough > 125;   // 每隔一段一定有坑洞路，不靠運氣
      if (roll < .18 && !dueRough) { ITEMS.push({kind: 'basket', x: hazLane(), a, g: T.basket.clone(true)}); a += gap * .75; }
      else if ((roll < .3 || dueRough) && plainDirt(a, a + 7)) { ITEMS.push({kind: 'rough', x: hazLane() * .88, a: a + 3.5, len: 7, w: 2.6, g: T.rough.clone(true)}); lastRough = a; a += 7 + gap * .75; }
      else if (roll < .42 && NPCS.length < 3) { const lane = r() < .5 ? -LANE : LANE; NPCS.push({x: lane, x0: lane, a: a + 26, a0: a + 26, g: makePlayerMesh(kit, 'bike', ['boy', 'ama', 'girl', 'agong'][NPCS.length % 4], ['cargo', 'basket', 'iron', 'post'][NPCS.length % 4])}); a += gap; }
      else if (plainDirt(a, a + 30) && a < FINISH_A - 60) { makeTroupe(troupeType(), hazLane(), a + 6, r); a += 30 + gap; }   // 人會往前走，前面留空間
      else a += 6;
    }
    ITEMS.forEach(it => { it.g.position.set(it.x, it.kind === 'rough' ? .03 : 0, -it.a); it.g.visible = false; scene.add(it.g); });
    NPCS.forEach(n => { n.g.visible = false; scene.add(n.g); });
    S.walkersAll = TROUPES.length;
  } else {
    EVENTS = planEvents(seed);
    buildAmbient();
  }

  /* 示範騎手：挑最空的那條線；DEMO 1 提早按鈴、3 很晚才按、2 不按 */
  let demoLane = 0;
  function valleyDemoSteer() {
    const danger = lx => {
      let n = 0;
      for (const it of ITEMS) { if (it.done) continue; const d = it.a - S.s; if (it.kind === 'rough' && d > -it.len / 2 - 1 && d < 18 + it.len / 2 && Math.abs(it.x - lx) < it.w / 2 + .45) n += 3; if (it.kind === 'basket' && d > -1 && d < 16 && Math.abs(it.x - lx) < 1) n += 5; }
      for (const p of NPCS) { const d = p.a - S.s; if (d > -1 && d < 16 && Math.abs(p.x - lx) < 1.1) n += 4; }
      for (const t of TROUPES) for (const m of t.members) { const d = t.a + m.da - S.s; if (d > -1.5 && d < 18 && Math.abs(t.x + m.dx - lx) < m.hw + .55) n += 5; }
      return n;
    };
    let best = demoLane, bs = 1e9;
    for (const l of [demoLane, 0, -LANE, LANE]) { const sc = danger(l) + (l === demoLane ? 0 : .5) + Math.abs(l) * .1; if (sc < bs) { bs = sc; best = l; } }
    demoLane = best;
    return clamp((best - S.x) * 1.4, -1, 1);
  }
  function demoBell() {
    const reach = DEMO === 1 ? 34 : DEMO === 3 ? 11 : -1;
    return TROUPES.some(t => t.active && !t.rung && !t.hit && t.a - S.s > 1.5 && t.a - S.s < reach) || NPCS.some(n => !n.rung && !n.done && n.a - S.s > 1.5 && n.a - S.s < reach);
  }
  /* 路上的鐵馬自己會閃：看前方幾公尺，有東西就換到空的位置，沒位置就放慢跟在後面 */
  const NPC_HW = .3, NPC_HL = .72, NPC_XS = [-2.55, -2.1, -1.65, -1.2, -.75, -.3, .3, .75, 1.2, 1.65, 2.1, 2.55, 0, -LANE, LANE];
  function npcBlockers(n) {
    const rs = [];
    for (const it of ITEMS) {
      if (it.done && it.kind !== 'rough') continue;
      if (it.kind === 'basket') rs.push({x: it.x, a: it.a, hw: .5, hl: .5});
      else if (it.kind === 'rough') rs.push({x: it.x, a: it.a, hw: it.w / 2, hl: it.len / 2});
    }
    for (const t of TROUPES) if (t.active) for (const m of t.members) rs.push({x: t.x + m.dx, a: t.a + m.da, hw: m.hw, hl: m.hl});
    for (const o of NPCS) if (o !== n) rs.push({x: o.x, a: o.a, hw: NPC_HW, hl: NPC_HL});
    if (S.phase === 'ride' || S.phase === 'crash') rs.push({x: S.x, a: S.s, hw: PLAYER_HW + .15, hl: PLAYER_HL, me: true});
    return rs;
  }
  function npcDrive(n, dt) {
    const base = S.v * .55, look = 3 + Math.max(base, 2) * 1.6, rs = npcBlockers(n);
    const hits = (x, a0, a1, pad) => rs.filter(r => Math.abs(r.x - x) < r.hw + NPC_HW + pad && r.a + r.hl > a0 && r.a - r.hl < a1);
    const free = x => !hits(x, n.a - NPC_HL, n.a + NPC_HL + look, .25).length && sweep(n.x, x);
    const sweep = (x0, x1) => { for (let k = 1; k <= 6; k++) if (hits(x0 + (x1 - x0) * k / 6, n.a - NPC_HL - .2, n.a + NPC_HL + 1.2, .12).length) return false; return true; };
    const home = n.tx ?? n.x0;
    let tgt = null;
    if (free(home)) tgt = home;
    else { let bs = 1e9; for (const x of NPC_XS) { const sc = Math.abs(x - n.x) + Math.abs(x - home) * .3; if (sc < bs && free(x)) { bs = sc; tgt = x; } } }
    let v = base;
    if (tgt == null) {   // 兩邊都過不去：在障礙物後面慢下來
      tgt = n.x;
      const ahead = hits(n.x, n.a, n.a + look + 4, .2).filter(r => r.a > n.a);
      for (const r of ahead) v = Math.min(v, Math.max(0, (r.a - r.hl - n.a - NPC_HL - .8) * 1.4));
    }
    const vx = clamp((tgt - n.x) * 2.2, -1.7, 1.7);
    n.x += vx * dt; n.a += v * dt;
    n.yaw = follow(n.yaw || 0, Math.atan2(-vx, Math.max(1.2, v)) * .8, 6, dt);
  }
  const BRIDGES = valley ? route.seq.flatMap((k, i) => k === 'bridge' ? [{a0: i * CHUNK + 13, a1: i * CHUNK + 27}] : []) : [];
  function bridgeAt() { return BRIDGES.find(b => S.s > b.a0 - .6 && S.s < b.a1 + .6); }
  function tickValley(dt) {
    const inp = inputFn(), steer = DEMO ? valleyDemoSteer() : inp.steer, bell = DEMO ? demoBell() : !!inp.brake;
    if (bell && !S.bellHeld) ringBell();   // 按下去那一下才響，按住不會一直響
    S.bellHeld = bell;
    const top = NOM * S.surfSlow;
    if (S.v < top) S.v = Math.min(top, S.v + ACCEL * dt); else S.v = Math.max(top, S.v - 6 * dt);
    // 從田埂直直衝上石橋會撞到橋頭；橋上只能走橋面
    const br = bridgeAt(), lim = br ? RW - .05 : RW + .35;
    if (br && Math.abs(S.x) > RW + .05 && S.invuln <= 0) { S.bumps++; crash(null, {key: 'rail', label: '撞到橋頭', toast: `撞到橋頭！血條 −${HP.crash}`}); return; }
    steerStep(dt, steer, -lim, lim);
    tickSurface(dt);
    const off = Math.abs(S.x) > RW + .05;
    S.dusk = clamp((S.t / route.limit - .35) / .65, 0, 1);
    for (const it of ITEMS) {
      if (it.done) continue;
      const d = it.a - S.s; it.g.visible = d > -8 && d < 200;
      if (it.kind === 'rough' && d > 0 && d < 34 && !S.warned.has('dirtAhead')) { S.warned.add('dirtAhead'); hint('前面路面坑坑洞洞，往旁邊閃', 2.4); }
      if (it.kind === 'basket' && Math.abs(d) < .9 && !off && Math.abs(it.x - S.x) < .78 && S.invuln <= 0) {
        it.done = true; it.g.visible = false; S.baskets++; S.bumps++; crash(null, {key: 'basket', label: '撞到竹簍', toast: `撞到竹簍！血條 −${HP.crash}`}); return;
      }
      if (d < -8) { it.done = true; it.g.visible = false; }
    }
    for (const n of NPCS) {
      const d = n.a - S.s;
      if (d < 200) npcDrive(n, dt);   // 會看前面：繞開竹簍、坑洞路、路上的人，繞不過就放慢
      else n.a += S.v * .55 * dt;
      n.g.visible = d > -30 && d < 220; n.g.position.set(n.x, 0, -n.a); n.g.rotation.z = Math.sin(S.t * 2) * .02; n.g.rotation.y = n.yaw || 0;
      // 整段都會撞：並排時往旁邊擠、從後面追上，都算
      if (!n.hit && S.invuln <= 0 && !off && Math.abs(n.x - S.x) < PLAYER_HW * 2 * .92 && Math.abs(n.a - S.s) < PLAYER_HL * 2 * .9) {
        n.hit = true; n.done = true; n.tx = (n.x >= S.x ? 1 : -1) * 2.55; S.bumps++;
        crash(null, {key: 'npcBike', label: '撞到旁邊的鐵馬', toast: `撞到別人的鐵馬！血條 −${HP.crash}`}); return;
      }
      if (!n.done && n.a < S.s - PLAYER_HL * 2) { n.done = true; S.score += 20; toast('追過去了！', 'ok'); Snd?.ok(); }
    }
    for (const t of TROUPES) {
      const d = t.a - S.s;
      if (t.active && !t.rung && !t.hit && d < 42 && !S.warned.has('bell')) { S.warned.add('bell'); S.seen.add('walker'); hint(help.bell || '前面有人！按鈴請他讓路', 3); }
      if (hitTroupe(t, off)) return;
      if (!t.passed && S.s > t.a + t.far + 1) { t.passed = true; if (!t.rung && !t.hit) { S.combo = 0; S.missed++; toast('沒按鈴，自己繞過去了', 'see'); } }
    }
    if (S.s >= FINISH_A) { S.phase = 'arrive'; S.arriveT = S.t; hint('到厝了！', 2); Snd?.good(); }
    else if (S.t >= route.limit) { S.lateHome = true; finish(); }
  }

  /* ───────── 主模擬 ───────── */
  function steerStep(dt, steer, x0, x1) { // 鐵馬和機車共用同一套轉向，手感才會一致
    const vxT = steer * 5.4 * clamp(S.v / NOM + .15, .15, 1.1), grip = MODE.slip ? 3.4 : 9;
    S.vx += (vxT - S.vx) * Math.min(1, dt * grip);
    const k = road.kappa(S.s), fling = k * S.v * S.v;   // 右彎（k > 0）把車往左甩，要自己修回來
    S.x = clamp(S.x + (S.vx - fling * CURVE_PUSH) * dt, x0, x1);
    S.s += S.v * dt;
    S.lean += (clamp(-S.vx * .085 - fling * .045, -.3, .3) - S.lean) * Math.min(1, dt * 9);
  }
  function knockOut() { // 血條歸零：摔車動畫 → 回起點重騎
    const n = S.restarts + 1;
    S.phase = 'down'; S.restarts = n; S.crashT = 2.3; S.shake = 1; S.combo = 0; S.crashDir = (valley ? S.x > 0 : S.x > 3) ? 1 : -1;
    el.koT.textContent = '血條歸零！'; el.koS.textContent = '回到起點，重新出發'; el.ko.classList.add('on'); el.toasts.innerHTML = '';
    vignette(); Snd.crash(); cfg.onHit?.(1); cfg.onKnock?.(n);
  }
  function restart() { // 整趟重來：分數、血條、路況、計時都回到起點
    const n = S.restarts;
    EVENTS.forEach(ev => { ev.ents.forEach(e => { scene.remove(e.g); e.live = false; }); if (ev.mesh) H[ev.type].cleanup?.(ev); });
    slots.forEach(sl => { if (sl.lamps.R.length) setSignal(sl, 'G'); });
    S = freshState(); S.restarts = n; S.walkersAll = TROUPES.length; S.phase = 'redo'; S.redoT = 3;
    if (valley) { ITEMS.forEach(it => { it.done = false; it.g.visible = false; }); NPCS.forEach(p => { p.a = p.a0; p.x = p.x0; p.tx = null; p.rung = false; p.done = false; p.hit = false; p.yaw = 0; p.g.visible = false; }); TROUPES.forEach(resetTroupe); demoLane = 0; }
    else { EVENTS = planEvents(seed); AMB.forEach(e => { e.a = e.a0; e.x = e.x0; e.v = e.v0; }); }
    camPos.set(S.x, 3, -S.s + 6); el.zone.classList.remove('on'); el.hint.classList.remove('on');
  }
  function sim(dt) {
    if (S.phase === 'wait' || S.finished) return;
    if (S.phase === 'redo') {
      S.redoT -= dt;
      el.koT.textContent = Math.max(1, Math.ceil(S.redoT)); el.koS.textContent = S.restarts > 1 ? `第 ${S.restarts + 1} 次出發` : '再來一次';
      if (S.redoT <= 0) { S.phase = 'ride'; el.ko.classList.remove('on'); begin0(); }
      return;
    }
    S.t += dt;
    if (S.phase === 'down') {
      S.shake = Math.max(0, S.shake - dt * 1.6); S.crashT -= dt; S.v = Math.max(0, S.v - 16 * dt); S.s += S.v * dt;
      if (S.crashT <= 0) restart();
      return;
    }
    S.invuln = Math.max(0, S.invuln - dt);
    S.shake = Math.max(0, S.shake - dt * 1.6);
    if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0) el.hint.classList.remove('on'); }
    if (DEMO && !valley) demoThink();
    if (valley && S.phase === 'ride') tickValley(dt);
    else if (S.phase === 'crash') {
      S.crashT -= dt; S.v = Math.max(0, S.v - 16 * dt); S.s += S.v * dt;
      if (S.crashT <= 0) { S.phase = 'ride'; S.x = S.safeX; S.invuln = 3; S.vx = 0; S.lean = 0; }
    } else if (S.phase === 'ride') {
      const inp = inputFn(), steer = DEMO ? demoSteer() : inp.steer, brk = DEMO ? demoBrake() : inp.brake; S.brake = brk; if (brk) S.lastBrake = S.t;
      const dec = MODE.brake;
      const top = NOM * S.surfSlow;
      if (brk) S.v = Math.max(0, S.v - dec * dt); else if (S.v > top) S.v = Math.max(top, S.v - 6 * dt); else S.v = Math.min(top, S.v + ACCEL * dt);
      steerStep(dt, steer, -6.4, 6.55);
      if (route.gust) tickGust(dt);
      tickSurface(dt);
      if (road.inRing(S.s)) S.wrongSide = 0;
      else if (S.x < -.25) { S.wrongSide += dt; if (S.wrongSide > .7 && !S.ycross) { S.ycross = 1; ticket('跨雙黃線逆向'); } }
      else { S.wrongSide = 0; if (S.x > .3) S.ycross = 0; }
      if (S.s >= FINISH_A) { S.phase = 'arrive'; S.arriveT = S.t; S.clockEnd = S.clock; hint('到公司了！', 2); }
    } else if (S.phase === 'arrive') {
      S.v = Math.max(0, S.v - 7 * dt); S.s += S.v * dt; S.brake = true;
      if (S.v <= .1 && S.t - S.arriveT > .7) { finish(); return; }
    }
    if (S.phase !== 'arrive') S.clock += dt * CLOCK_RATE;
    if (!valley) { EVENTS.forEach(ev => tickEvent(ev, dt)); tickAmbient(dt); checkCollisions(); }
    else TROUPES.forEach(t => tickTroupe(t, dt));   // 摔車時路上的人也要繼續動（倒下、爬起來）
    extras?.update?.(S, dt, road);
    warnAhead();
    if (S.gauge <= 0 && (S.phase === 'ride' || S.phase === 'crash')) { knockOut(); return; }
    const si = clamp(Math.floor(S.s / CHUNK), 0, slots.length - 1);
    if (si !== S.zoneIdx) {
      S.zoneIdx = si; const nm = slots[si].name; if (nm) showZone(nm);
      if (valley && route.says[si]) { hint(route.says[si], 2.6); Snd?.see(); }
      if (si === 1 && !valley && help.brake) hint(help.brake, 4);
    }
    if (S.zoneT > 0) { S.zoneT -= dt; if (S.zoneT <= 0) el.zone.classList.remove('on'); }
  }
  function warnAhead() {   // 彎道和圓環前先講一聲
    if (S.phase !== 'ride') return;
    for (const b of road.bends) if (!S.warned.has(b.a) && S.s > b.a - 40 && S.s < b.a) { S.warned.add(b.a); hint(b.deg > 0 ? '前方右彎，往右修方向' : '前方左彎，往左修方向', 2.6); }
    for (const r of road.rings) if (!S.warned.has(r.a) && S.s > r.a - 48 && S.s < r.a) { S.warned.add(r.a); hint(r.shape.exit === 'left' ? '前方圓環，繞大半圈從左邊出去，先減速' : '前方圓環，直行穿過，先減速', 3); }
  }
  function tickGust(dt) { // 颱風天：一陣陣強風把車往旁邊吹
    S.gustT -= dt;
    if (S.gustT <= 0) { S.gustT = 7 + Math.random() * 5; S.gustDur = 1.7; S.gustDir = S.x > 4.2 ? -1 : 1; hint(S.gustDir > 0 ? '強風往右吹！握穩龍頭' : '強風往左吹！握穩龍頭', 1.7); Snd.gust(); }
    if (S.gustDur > 0) { S.gustDur -= dt; S.x = clamp(S.x + S.gustDir * 1.6 * dt, -6.4, 6.55); }
    S.boltT -= dt;
    if (S.boltT <= 0) { S.boltT = 10 + Math.random() * 8; flashWhite(.32); setTimeout(() => Snd.thunder(), 450); }
  }
  function begin0() { hint(help.steer || (valley ? '左右傾斜轉向，趕在天黑前到厝' : '手機左右傾斜，或電腦按方向鍵'), 3.5); }
  function finish() {
    if (S.finished) return; S.finished = true;
    S.finishT = S.t;
    let safe, see, onTime, title, desc;
    const unhurt = S.crashes === 0 && S.tickets === 0 && S.bumps === 0 && S.roughs === 0 && S.restarts === 0;
    if (valley) {
      onTime = !S.lateHome; safe = unhurt && !S.lateHome; see = S.walkersAll ? S.early / S.walkersAll >= .7 : false;
      if (safe) S.score += 300; if (onTime) S.score += 100;
      if (safe && see && onTime) { title = '全庄最會騎'; desc = '一路按鈴請人讓路，天還沒黑就到厝，飯還是熱的。'; }
      else if (!onTime) { title = '天黑才到厝'; desc = '飯菜都涼了，明天再早點出發。'; }
      else if (see) { title = '鈴聲最響亮'; desc = '大家都被您提早叫開了，下次也閃過竹簍。'; }
      else if (safe) { title = '穩穩騎回家'; desc = '一路都沒撞到，下次看到人再早一點按鈴。'; }
      else { title = '騎鐵馬的少年仔'; desc = '再騎一趟，路就更熟了。'; }
    } else {
      const clockEnd = S.clockEnd ?? S.clock; onTime = clockEnd <= 360;
      const judged = S.early + S.late + S.ok + S.crashes + S.bumps, earlyRate = judged ? S.early / judged : 0;
      safe = unhurt; see = earlyRate >= .7;
      if (safe) S.score += 300; if (onTime) S.score += 100;
      if (safe && see && onTime) { title = '路口之神'; desc = '三枚章全拿，今天的路都被您看穿了。'; }
      else if (safe && !onTime) { title = '平安但遲到'; desc = '人平安最重要，主管多看了您一眼而已。'; }
      else if (S.tickets >= 2) { title = '紅單收藏家'; desc = '趕時間的代價，下個月才會寄到家。'; }
      else if (S.crashes >= 3) { title = '今天先搭公車吧'; desc = '多看前面的預兆，下一趟一定更穩。'; }
      else if (safe) { title = '穩穩騎士'; desc = '沒摔車也沒紅單，再早一點反應就能拿預判章。'; }
      else if (onTime) { title = '拚命三郎'; desc = '準時是準時了，下次試試平安也一起拿。'; }
      else { title = '還在練習的騎士'; desc = '每條路都有預兆，再騎一趟看得更清楚。'; }
    }
    const lead = S.leads.length ? S.leads.reduce((p, c) => p + c, 0) / S.leads.length : null;
    result = {routeId, valley, score: Math.max(0, S.score), gauge: S.gauge, safe, see, onTime, title, desc, finishT: S.t, distance: Math.min(S.s, FINISH_A), arrived: S.s >= FINISH_A - 1,
      early: S.early, late: S.late, ok: S.ok, crashes: S.crashes, tickets: S.tickets, bumps: S.bumps, walkers: S.walkersAll, missed: S.missed, baskets: S.baskets, lead, worst: S.worst, seen: [...S.seen], maxCombo: S.maxCombo, restarts: S.restarts, roughs: S.roughs, loss: S.loss, bonusSafe: safe ? 300 : 0, bonusTime: onTime ? 100 : 0};
    el.toasts.innerHTML = '';
    cfg.onFinish?.(result);
  }

  /* ───────── 畫面 ───────── */
  const camPos = new THREE.Vector3(S.x, 3, -S.s + 6); let camBend = 0;
  function placeEnt(e, blinkOn) {
    if (!e.world) {
      const w = road.map(e.x, e.a);
      e.g.position.set(w.x, e.yOffset != null ? e.yOffset : (e.g.position.y || 0), w.z);
      e.g.rotation.y = e.yaw - w.th;
    }
    if (e.lamps && e.blinkSide) e.lamps[e.blinkSide].forEach(m => { m.visible = blinkOn; });
  }
  let lastBlink = false;
  function draw(renderer, vp, dt = .016) {
    const blinkOn = (S.t % .72) < .4;
    if (blinkOn && !lastBlink && !valley && EVENTS.some(ev => ev.ents.some(e => e.blinkSide) && Math.abs(ev.anchor - S.s) < 60)) Snd?.tick();
    lastBlink = blinkOn;
    viewSlots.forEach(slot => { const on = slot.a + slot.span > S.s - 5 && slot.a < S.s + (valley ? 420 : 340); slot.g.visible = on; if (slot.fine) slot.fine.visible = on && slot.a < S.s + (valley ? 70 : 130) * (low ? .55 : fineScale); });
    for (const ev of EVENTS) { if (ev.state === 'idle' || ev.state === 'dead') continue; ev.ents.forEach(e => placeEnt(e, blinkOn)); }
    AMB.forEach(e => { placeEnt(e, blinkOn); e.g.visible = e.ringCar ? e.wx != null && S.s > e.ringCar.R.a - 220 && S.s < e.ringCar.R.end + 70 : Math.abs(e.a - S.s) < 340 && e.a < END_S && !(e.op && road.inRing(e.a)); if (e.same) e.lamps.B.forEach(m => { m.visible = e.v < e.base * .7; }); });
    const crashA = S.phase === 'crash' || S.phase === 'down' ? ease((2.3 - S.crashT) / .4) : 0;
    const pw = road.map(S.x, S.s), pwx = pw.x, pwz = pw.z, pth = pw.th;
    player.position.set(pwx, crashA ? .04 : Math.sin(S.t * 26) * .004 * (S.v / NOM) + (S.surf ? Math.abs(Math.sin(S.t * 41)) * .05 : 0), pwz);
    player.rotation.z = S.lean + (S.surf ? Math.sin(S.t * 37) * .035 : 0) + crashA * 1.35 * S.crashDir * -1;
    player.rotation.y = clamp(-S.vx * .03, -.22, .22) + crashA * .6 * S.crashDir - pth;
    player.visible = S.invuln <= 0 || (S.t * 9 | 0) % 2 === 0;
    playerLamps.B.forEach(m => { m.visible = S.brake; });
    const W = vp.w, H = vp.h, port = W < H * .98;
    camera.aspect = W / H; camera.fov = port ? 74 : 58; camera.updateProjectionMatrix();
    const off = valley ? 0 : 1.25, tOff = valley ? 0 : .95;
    // 彎道裡鏡頭看近一點、靠近車子，車才不會被擠到畫面邊邊
    const bendNow = Math.min(1, Math.max(Math.abs(road.kappa(S.s)), Math.abs(road.kappa(S.s + 12))) * 26);
    camBend += (bendNow - camBend) * Math.min(1, dt * 3);
    // 手機直拿畫面窄，鏡頭要跟緊車子，騎到路邊或對向才不會跑出畫面
    const cx = lerp(port ? S.x * .75 + .3 : S.x * .42 + off, S.x * .85, camBend), tx = lerp(port ? S.x * .7 + .3 : S.x * .34 + tOff, S.x * (port ? 1 : .55), camBend), ch = port ? 4.3 : 3.15, cb = port ? 7.4 : 6.2, look = lerp(17, port ? 4.5 : 10, camBend);   // 手機直拿畫面窄，要看得更近
    camPos.lerp(new THREE.Vector3(cx, ch, -S.s + cb), Math.min(1, dt * 6));
    camPos.z = -S.s + cb;
    let cw = road.map(camPos.x, S.s - cb); camera.position.set(cw.x, camPos.y, cw.z);
    cw = road.map(tx, S.s + look); camera.lookAt(cw.x, port ? -.4 : 1.25, cw.z);
    camera.rotateZ(S.lean * .12);
    if (S.shake > 0) { camera.position.x += (Math.random() - .5) * S.shake * .35; camera.position.y += (Math.random() - .5) * S.shake * .28; }
    sun.position.set(pwx + SUN_AT[0], SUN_AT[1], pwz + SUN_AT[2]); sun.target.position.set(pwx, 0, pwz - 22); sun.target.updateMatrixWorld();
    if (far) far.position.z = -S.s;
    if (farHome) farHome.visible = S.s < FINISH_A - 280;
    // 鐵馬路線：隨時間日頭漸斜
    if (valley) {
      const d = S.dusk; hemi.intensity = lerp(1.75, 1.05, d); sun.intensity = lerp(2.25, 1.15, d);
      sun.color.setRGB(1, lerp(.94, .68, d), lerp(.84, .42, d));
      scene.backgroundIntensity = lerp(1, .78, d);
      scene.fog.color.setRGB(lerp(.92, .95, d), lerp(.8, .62, d), lerp(.55, .38, d));
      el.tint.style.opacity = (d * .34).toFixed(3);
    }
    if (rivalG && rivalG.visible) rivalG.rotation.z = rivalG.userData.lean || 0;
    if (!valley) {
      let nearest = null, nd = 1e9; slots.forEach(sl => { if (sl.type === 'cross') { const q = sl.a + 30 - S.s; if (q > -5 && q < nd) { nd = q; nearest = sl; } } });
      if (nearest) {
        const ev = EVENTS.find(v => v.slot === nearest && v.type === 'redLight');
        let val = 20 + (nearest.i * 7 % 30) - (S.t | 0) % 15, col = '#25d366';
        if (ev && ev.sig === 'Y') { val = Math.max(1, Math.ceil(2.5 - (S.t - ev.tY))); col = '#ffc31f'; }
        if (ev && ev.sig === 'R') { val = Math.max(1, Math.ceil(6.5 - (S.t - ev.tR))); col = '#ff3026'; }
        if (kit._cdKey !== val + col) { kit.setCountdown(val, col); kit._cdKey = val + col; }
      }
      ring.visible = false;
      if (MODE.hint && S.phase === 'ride') {
        const act = EVENTS.find(ev => (ev.state === 'cue' || ev.state === 'go') && !ev.resolved && (ev.ents.length || ev.mesh));
        if (act) {
          const tg = act.ents.find(e => e.live && e.g.visible);
          const x = tg ? tg.x : act.cx ?? 4.7, a = tg ? tg.a : act.anchor, y = tg ? 1.3 : .6;
          const sc = 3.2 + Math.sin(S.t * 8) * .5, rw = tg?.world ? {x: tg.wx, z: tg.wz} : road.map(x, a); ring.position.set(rw.x, y, rw.z); ring.scale.set(sc, sc, 1); ring.visible = true;
        }
      }
    }
    if (rain) { rain.position.set(camera.position.x, camera.position.y - 8, camera.position.z); rain.position.y -= (S.t * 26) % 8; rain.rotation.y = -pth; }
    // HUD
    if (valley) {
      const left = Math.max(0, route.limit - S.t);
      el.clockV.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      el.clock.classList.toggle('late', left < 20);
      el.scoreL.textContent = `提早按鈴 ${S.early}／${S.walkersAll}`;
    } else {
      const clockMin = 24 + S.clock / 60;
      el.clockV.textContent = `8:${String(Math.floor(clockMin)).padStart(2, '0')}`;
      el.clock.classList.toggle('late', clockMin >= 29);
    }
    el.speedV.textContent = Math.round(S.v * 3.6);
    el.scoreV.textContent = Math.max(0, Math.round(S.score));
    el.gaugeV.textContent = Math.round(S.gauge);
    el.gaugeBox.classList.toggle('low', S.gauge <= HP.low);
    el.gauge.style.width = S.gauge + '%';
    el.gauge.style.background = S.gauge >= 60 ? 'var(--grn)' : S.gauge >= 35 ? '#e6a321' : 'var(--red)';
    const pr = clamp(S.s / FINISH_A * 100, 0, 100);
    el.prog.style.width = pr + '%'; el.meDot.style.left = pr + '%';
    const fl = S.combo >= 8 ? '🔥🔥🔥' : S.combo >= 5 ? '🔥🔥' : S.combo >= 3 ? '🔥' : '';
    if (S.combo >= 2) { el.combo.classList.add('on'); el.combo.textContent = valley ? `${fl} 連續提早按鈴 ${S.combo}` : `${fl} 連續提早 ${S.combo}${mult() > 1 ? ` ×${mult()}` : ''}`; } else el.combo.classList.remove('on');
    renderer.setViewport(vp.x, vp.y, W, H); renderer.setScissor(vp.x, vp.y, W, H); renderer.setScissorTest(true);
    renderer.render(scene, camera);
  }
  return {
    get S() { return S; }, get result() { return result; }, get EVENTS() { return EVENTS; }, get AMB() { return AMB; }, H: typeof H !== 'undefined' ? H : null, ITEMS, NPCS, TROUPES, scene, camera, FINISH_A, END_S, player, road, viewSlots,
    begin() { if (S.phase === 'wait') { S.phase = 'ride'; begin0(); } },
    sim, draw, finish, rideV: () => S.v, nominal: NOM,
    setInput(fn) { inputFn = fn; },
    setLow(v) { low = !!v; sun.castShadow = !low; },
    setRival(x, s, lean, vis = true) { if (!rivalG) return; const w = road.map(x, s); rivalG.position.set(w.x, 0, w.z); rivalG.rotation.y = -w.th; rivalG.userData.lean = lean; rivalG.visible = vis && s > S.s - 7 && !(Math.abs(x - S.x) < .55 && Math.abs(s - S.s) < 1.7); rivalG.userData.tag.visible = s > S.s + 1.5; },
    setRivalDot(pct, leadTxt) { el.riDot.style.left = pct + '%'; el.lead.textContent = leadTxt; },
    banner(txt) { el.banner.textContent = txt || ''; el.banner.classList.toggle('on', !!txt); },
    notice(txt) { el.notice.textContent = txt || ''; el.notice.classList.toggle('on', !!txt); },
    knockOut, /* 驗證用 */
    /** 預覽截圖用：直接把位置擺到指定公尺 */
    jump(s) { S.s = s; camPos.z = -s + 6.2; for (let i = 0; i < 8; i++) tickAmbientIfAny(.01); },
    dispose() { scene.traverse(o => { if (o.isSprite) o.material.map?.dispose(); }); },
  };
  function tickAmbientIfAny(dt) { if (!valley) tickAmbient(dt); }
}
