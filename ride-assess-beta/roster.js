// 騎遍台灣：可選的角色與車輛（全部程式繪製）
// 車輛只差外觀、性能相同，雙人對戰才公平。
import * as THREE from 'three';
import {T, box, cyl, sph, flat, quad, extrudeSide, limb} from './world.js';

const V3 = THREE.Vector3;

export const CHARS = {
  bike: [
    {id: 'agong', name: '阿公', note: '斗笠白汗衫', top: 0xf8f5ea, sleeve: null, pants: 0x4a4640, shoe: 0x35312c, skin: 0xd9a678, hair: 'gray', hat: 'douli', towel: true},
    {id: 'ama', name: '阿嬤', note: '花布衫', topMap: 'fabric', sleeve: 'top', pants: 0x2f3a4a, shoe: 0x6a3d2a, skin: 0xe2b48c, hair: 'bun', hat: 'scarf'},
    {id: 'boy', name: '少年', note: '卡其制服', top: 0xcdb889, sleeve: null, pants: 0xb5a177, shorts: true, shoe: 0xf2f0e8, skin: 0xe2b48c, hair: 'short', hat: 'cap', satchel: true},
    {id: 'girl', name: '少女', note: '白衣黑裙', top: 0xf8f8f2, sleeve: null, pants: 0xe2b48c, skirt: 0x23262e, shoe: 0x17181c, skin: 0xeec09a, hair: 'bob', satchel: true},
  ],
  moto: [
    {id: 'office', name: '上班族', note: '襯衫公事包', top: 0xeaf0f6, sleeve: 'top', pants: 0x2d3138, shoe: 0x23201d, skin: 0xe6b48c, hair: 'short', hat: 'helmet', helmet: 0xf7c52b, mask: 0xf1f3f0, briefcase: true},
    {id: 'delivery', name: '外送員', note: '趕下一單', top: 0xe8622c, sleeve: 'top', pants: 0x23262e, shoe: 0xf2f0e8, skin: 0xd9a678, hair: 'short', hat: 'helmet', helmet: 0xffffff, mask: 0x23262e, vest: true},
    {id: 'auntie', name: '市場阿姨', note: '花袖套', top: 0x7f6aa8, foreMap: 'fabric', sleeve: 'top', pants: 0x3a3f4a, shoe: 0x8a4a3a, skin: 0xe2b48c, hair: 'bun', hat: 'helmet', helmet: 0xd8362f, maskMap: 'fabric'},
    {id: 'student', name: '學生', note: '外套反穿', top: 0x2c6fb3, sleeve: 'top', pants: 0x2c3a55, shoe: 0xf2f0e8, skin: 0xeec09a, hair: 'short', hat: 'helmet', helmet: 0x7eb4a8, mask: 0xf1f3f0, reverse: true},
  ],
};
export const VEHICLES = {
  bike: [
    {id: 'iron', name: '黑鐵馬', note: '後座綁竹簍'},
    {id: 'basket', name: '菜籃車', note: '前面有籃子'},
    {id: 'cargo', name: '載貨鐵馬', note: '載一袋米'},
    {id: 'post', name: '郵差車', note: '綠色郵袋'},
  ],
  moto: [
    {id: 's125', name: '白牌速克達', note: '掛著手搖飲'},
    {id: 'ev', name: '電動機車', note: '安靜省油'},
    {id: 'wolf', name: '老打檔車', note: '阿伯的最愛'},
    {id: 'food', name: '外送機車', note: '呷飽未'},
  ],
};
export const defaultsFor = pack => ({char: CHARS[pack][0].id, veh: VEHICLES[pack][0].id});

/* ───────── 鐵馬 ───────── */
function bikeFrame(kit, b, o) {
  const M = kit.M, P = (a, y, f) => new V3(a, y, -f);
  const iron = M(o.frame, {rough: .4}), tire = M(0x18181b), rim = M(0xc2c5c9, {rough: .3, metal: .5});
  for (const f of [.56, -.56]) {
    b.add(new THREE.TorusGeometry(.34, .03, 6, 28).rotateY(Math.PI / 2), tire, T(0, .36, -f), .012);
    b.add(new THREE.TorusGeometry(.305, .009, 4, 28).rotateY(Math.PI / 2), rim, T(0, .36, -f));
    b.add(cyl(.035, .035, .09, 8).rotateZ(Math.PI / 2), rim, T(0, .36, -f));
    for (let i = 0; i < 12; i++) b.add(box(.004, .61, .004), rim, T(0, .36, -f, 0, i / 12 * Math.PI));
    // 土除
    b.add(new THREE.TorusGeometry(.375, .022, 4, 12, 2).rotateZ(.55).rotateY(Math.PI / 2), iron, T(0, .36, -f));
  }
  const axR = P(0, .36, -.56), axF = P(0, .36, .56), bb = P(0, .4, .02), seat = P(0, .9, -.2), head = P(0, .95, .4), bar = P(0, 1.08, .46);
  const tubes = o.low ? [[axR, seat], [axR, bb], [bb, seat], [P(0, .52, .05), head], [bb, P(0, .78, .38)], [axF, head], [head, bar]]
    : [[axR, seat], [axR, bb], [bb, seat], [bb, head], [seat, head], [axF, head], [head, bar]];
  for (const [a, c] of tubes) limb(b, iron, a, c, .021, .008);
  limb(b, rim, P(-.3, 1.1, .46), P(.3, 1.1, .46), .014, 0);
  for (const s of [-1, 1]) limb(b, M(0x2a2622), P(s * .25, 1.1, .46), P(s * .33, 1.1, .46), .022, .004);
  b.add(box(.13, .05, .26), M(0x4a2f22), T(0, .94, .2), .012);
  b.add(box(.06, .1, .08), M(0x2a2622), T(0, .88, .24));
  // 鏈條蓋、踏板、車鈴、車燈、反光片
  b.add(extrudeSide([[-.52, .32], [-.52, .44], [.12, .5], [.12, .3]], .03, 0), iron, T(.07, 0, 0));
  for (const s of [-1, 1]) b.add(box(.12, .03, .08), M(0x26262a), T(s * .14, .4, -.02 - s * .12));
  b.add(sph(.03, 8, 6), rim, T(.18, 1.13, -.46));
  b.add(cyl(.065, .065, .05, 12).rotateX(Math.PI / 2), rim, T(0, .96, -.5), .012);
  b.add(cyl(.05, .05, .012, 12).rotateX(Math.PI / 2), M(0xfff5c2, {unlit: true}), T(0, .96, -.53));
  b.add(box(.09, .05, .02), M(0xd8362f, {unlit: true}), T(0, .6, .98));
  return {seatY: .95, seatF: -.2, barY: 1.1, barF: .46, footY: .4, footF: .02, pedal: true};
}
function buildBike(kit, b, id) {
  const M = kit.M;
  if (id === 'basket') {
    const a = bikeFrame(kit, b, {frame: 0x6fb0a0, low: true});
    b.add(cyl(.19, .15, .22, 14), M(0xc79c58), T(0, 1.0, -.62), .016);
    for (const y of [.92, 1.0, 1.08]) b.add(cyl(.19 - (1.1 - y) * .15, .185 - (1.1 - y) * .15, .018, 14), M(0x8c6a36), T(0, y, -.62));
    b.add(sph(.075, 8, 6), M(0xe8622c), T(.05, 1.1, -.6));
    b.add(box(.12, .1, .06), M(0x69b356), T(-.05, 1.1, -.65));
    return a;
  }
  if (id === 'cargo') {
    const a = bikeFrame(kit, b, {frame: 0x2a2c30});
    b.add(box(.36, .03, .6), M(0x2a2c30), T(0, .76, .56), .012);
    const sack = new THREE.SphereGeometry(1, 12, 8); sack.scale(.2, .15, .3);
    b.add(sack, M(0xeee2c6), T(0, .92, .56), .016);
    b.add(box(.2, .012, .012), M(0xc8233a), T(0, 1.07, .56));
    b.add(box(.014, .03, .62), M(0x8a5a2b), T(.1, 1.05, .56));
    b.add(box(.014, .03, .62), M(0x8a5a2b), T(-.1, 1.05, .56));
    return a;
  }
  if (id === 'post') {
    const a = bikeFrame(kit, b, {frame: 0x2f7f55});
    b.add(box(.3, .03, .5), M(0x2f7f55), T(0, .76, .56), .012);
    for (const s of [-1, 1]) { b.add(box(.12, .36, .4), M(0x1f6a44), T(s * .2, .6, .56), .016); b.add(box(.125, .05, .405), M(0xf2c21a), T(s * .2, .64, .56)); }
    b.add(box(.3, .24, .16), M(0x1f6a44), T(0, 1.02, -.6), .014);
    b.add(box(.31, .05, .165), M(0xf2c21a), T(0, 1.02, -.6));
    return a;
  }
  // 黑鐵馬：後座綁竹簍
  const a = bikeFrame(kit, b, {frame: 0x24262a});
  b.add(box(.26, .03, .46), M(0x24262a), T(0, .76, .54), .012);
  b.add(cyl(.165, .13, .22, 14), M(0xc79c58), T(0, .88, .56), .018);
  for (const y of [.8, .88, .96]) b.add(cyl(.168 - (.98 - y) * .15, .163 - (.98 - y) * .15, .02, 14), M(0x8c6a36), T(0, y, .56));
  return a;
}

/* ───────── 機車 ───────── */
function buildMoto(kit, b, id, g) {
  const M = kit.M;
  const scooterAnchor = {seatY: .88, seatF: -.42, barY: 1.07, barF: .47, footY: .47, footF: .02};
  if (id === 'ev') {
    const body = M(0xf2f4f2, {rough: .25}), accent = M(0x18a7a0, {rough: .3}), rubber = M(0x18181b), metal = M(0xb9bcc0, {rough: .3, metal: .5});
    b.add(extrudeSide([[-.72, .3], [-.92, .68], [-.86, .78], [-.2, .72], [-.05, .42], [.28, .4], [.42, 1.0], [.58, 1.1], [.74, .86], [.66, .4], [.48, .24], [-.3, .24]], .34, .05), body, null, .022);
    b.add(extrudeSide([[.26, .42], [.38, .92], [.46, .92], [.34, .42]], .352, .01), accent);
    b.add(extrudeSide([[-.86, .78], [-.84, .86], [-.46, .9], [-.12, .84], [-.08, .72]], .3, .03), M(0x22242a), null, .02);
    for (const f of [.6, -.6]) { b.add(cyl(.21, .21, .1, 16).rotateZ(Math.PI / 2), rubber, T(0, .21, -f), .02); b.add(cyl(.13, .13, .112, 14).rotateZ(Math.PI / 2), accent, T(0, .21, -f)); }
    b.add(box(.34, .025, .44), rubber, T(0, .435, -.05));
    b.add(box(.38, .1, .15), body, T(0, 1.1, -.5), .016);
    b.add(box(.2, .03, .1), M(0x10141a, {rough: .1}), T(0, 1.16, -.47));
    for (const s of [-1, 1]) { b.add(cyl(.026, .026, .1, 8).rotateZ(Math.PI / 2), rubber, T(s * .33, 1.09, -.47)); b.add(cyl(.009, .009, .24, 5), metal, T(s * .24, 1.22, -.46, 0, 0, -s * .26)); b.add(box(.13, .08, .02), M(0x22242a), T(s * .285, 1.34, -.46), .008); }
    b.add(box(.3, .05, .04), M(0xdff6ff, {unlit: true}), T(0, .95, -.73));
    b.add(box(.46, .03, .03), M(0xff2a2a, {unlit: true}), T(0, .74, .9));
    b.add(quad(.2, .1, kit.plateUv()), kit.plateMat, T(0, .5, .86));
    b.add(box(.16, .02, .12), M(0x22242a), T(0, .57, .82));
    kit.addLamp(g, 'brake', 0xff2020, 0, .74, .92, .46, .05, .02);
    return scooterAnchor;
  }
  if (id === 'wolf') {
    const tank = M(0xc22f2a, {rough: .25}), iron = M(0x24262a), metal = M(0xc2c5c9, {rough: .3, metal: .5}), rubber = M(0x18181b);
    for (const f of [.66, -.6]) {
      b.add(new THREE.TorusGeometry(.29, .055, 8, 24).rotateY(Math.PI / 2), rubber, T(0, .34, -f), .012);
      b.add(new THREE.TorusGeometry(.24, .012, 4, 24).rotateY(Math.PI / 2), metal, T(0, .34, -f));
      for (let i = 0; i < 10; i++) b.add(box(.005, .48, .005), metal, T(0, .34, -f, 0, i / 10 * Math.PI));
      b.add(cyl(.05, .05, .1, 10).rotateZ(Math.PI / 2), metal, T(0, .34, -f));
      b.add(new THREE.TorusGeometry(.37, .024, 4, 12, 2).rotateZ(.55).rotateY(Math.PI / 2), tank, T(0, .34, -f));
    }
    const P = (a, y, f) => new V3(a, y, -f);
    for (const [a, c] of [[P(0, .34, -.6), P(0, .85, -.25)], [P(0, .34, -.6), P(0, .4, .1)], [P(0, .4, .1), P(0, 1.02, .46)], [P(0, .85, -.25), P(0, 1.02, .46)], [P(0, .34, .66), P(0, 1.02, .46)]]) limb(b, iron, a, c, .026, .01);
    b.add(box(.2, .3, .34), metal, T(0, .54, -.02), .016);
    for (let i = 0; i < 4; i++) b.add(box(.22, .018, .3), iron, T(0, .62 + i * .04, -.02));
    const tk = new THREE.SphereGeometry(1, 12, 8); tk.scale(.15, .13, .3);
    b.add(tk, tank, T(0, 1.0, -.15), .02);
    b.add(box(.06, .018, .34), M(0xf4f2ea), T(0, 1.1, -.15));
    b.add(box(.22, .08, .52), M(0x1d1d20), T(0, .92, .3), .018);
    b.add(box(.26, .025, .3), iron, T(0, .95, .68), .012);
    limb(b, metal, P(.14, .36, .0), P(.17, .34, -.8), .035, .008);
    b.add(cyl(.08, .08, .08, 12).rotateX(Math.PI / 2), metal, T(0, 1.14, -.58), .014);
    b.add(cyl(.066, .066, .012, 12).rotateX(Math.PI / 2), M(0xfff5c2, {unlit: true}), T(0, 1.14, -.625));
    limb(b, metal, P(-.34, 1.22, .42), P(.34, 1.22, .42), .017, 0);
    limb(b, metal, P(0, 1.02, .46), P(0, 1.22, .42), .018, 0);
    for (const s of [-1, 1]) { limb(b, rubber, P(s * .28, 1.22, .42), P(s * .36, 1.22, .42), .026, .004); limb(b, metal, P(s * .2, 1.22, .42), P(s * .3, 1.46, .4), .007, 0); b.add(cyl(.055, .055, .015, 12).rotateX(Math.PI / 2), M(0x24262a), T(s * .3, 1.48, -.4), .006); }
    b.add(box(.15, .07, .05), M(0xc22222, {unlit: true}), T(0, .96, .9));
    b.add(quad(.2, .1, kit.plateUv()), kit.plateMat, T(0, .84, .92));
    kit.addLamp(g, 'brake', 0xff2020, 0, .96, .93, .15, .07, .02);
    return {seatY: .98, seatF: -.3, barY: 1.22, barF: .42, footY: .36, footF: 0};
  }
  if (id === 'food') {
    kit.scooterBody(b, null, {body: 0x2d7a5f, trim: 0xf4ead6, box: 0xe8622c, boxText: true});
    kit.addLamp(g, 'brake', 0xff2020, 0, .7, .94, .28, .08, .03);
    return scooterAnchor;
  }
  kit.scooterBody(b, null, {body: 0xf0f2f0, trim: 0xe8622c, drink: true});
  kit.addLamp(g, 'brake', 0xff2020, 0, .7, .94, .28, .08, .03);
  return scooterAnchor;
}

/* ───────── 騎士 ───────── */
function mapMat(kit, key) { return key === 'fabric' ? kit.fabricMat : kit.stripeMat; }
function rider(kit, b, a, c) {
  const M = kit.M, P = (x, y, f) => new V3(x, y, -f);
  const skin = M(c.skin), topM = c.topMap ? mapMat(kit, c.topMap) : M(c.top);
  const sleeveM = c.sleeve === 'top' ? topM : skin, foreM = c.foreMap ? mapMat(kit, c.foreMap) : sleeveM;
  const hipY = a.seatY + .08, hipF = a.seatF + .02, lean = .16;
  const shY = hipY + .46, shF = hipF + lean;
  // 上身與肩膀
  limb(b, topM, P(0, hipY, hipF), P(0, shY - .02, shF), .172, .024);
  limb(b, topM, P(-.19, shY, shF), P(.19, shY, shF), .085, .02);
  // 手臂
  for (const s of [-1, 1]) {
    const sh = P(s * .23, shY, shF), hand = P(s * .3, a.barY + .02, a.barF), el = P(s * .3, (shY + a.barY) / 2 - .04, (shF + a.barF) / 2 - .02);
    limb(b, sleeveM, sh, el, .056);
    limb(b, foreM, el, hand, .047);
    b.add(sph(.05, 8, 6), skin, T(hand.x, hand.y, hand.z), .008);
  }
  // 腿
  const legM = M(c.pants), shinM = c.shorts || c.skirt ? skin : legM;
  for (const s of [-1, 1]) {
    let kn, ft;
    if (a.pedal) { const up = s < 0; kn = [s * .13, up ? a.seatY - .06 : a.seatY - .28, a.footF + (up ? .2 : .1)]; ft = [s * .13, up ? a.footY + .14 : a.footY - .06, a.footF + (up ? .1 : .02)]; }
    else { kn = [s * .16, a.seatY - .02, hipF + .46]; ft = [s * .15, a.footY + .03, a.footF + .1]; }
    limb(b, legM, P(s * .095, hipY - .04, hipF), P(...kn), .082);
    limb(b, shinM, P(...kn), P(...ft), .058);
    b.add(box(.105, .07, .25), M(c.shoe), T(ft[0], ft[1] - .05, -ft[2] - .05), .01);
  }
  if (c.skirt) b.add(cyl(.17, .25, .32, 12), M(c.skirt), T(0, hipY - .1, -hipF), .016);
  // 頭
  const h = P(0, shY + .25, shF + .02);
  b.add(cyl(.05, .06, .13, 8), skin, T(h.x, h.y - .15, h.z));
  b.add(sph(.122, 14, 10), skin, T(h.x, h.y, h.z));
  for (const s of [-1, 1]) { b.add(sph(.014, 6, 4), M(0x1a1512), T(h.x + s * .045, h.y + .02, h.z - .115)); b.add(sph(.022, 6, 4), skin, T(h.x + s * .122, h.y, h.z)); }
  // 頭髮
  const hairCol = c.hair === 'gray' ? 0xa8a49c : 0x241f1c, hair = M(hairCol);
  if (c.hair === 'bob') { const g2 = new THREE.SphereGeometry(.142, 14, 10); b.add(g2, hair, T(h.x, h.y + .012, h.z + .022)); b.add(box(.24, .1, .03), hair, T(h.x, h.y + .07, h.z - .11)); }
  else if (c.hair === 'bun') { b.add(sph(.132, 14, 10), M(0x8d8a84), T(h.x, h.y + .025, h.z + .02)); if (c.hat !== 'helmet') b.add(sph(.065, 10, 8), M(0x8d8a84), T(h.x, h.y + .03, h.z + .15)); }
  else b.add(sph(.13, 14, 10), hair, T(h.x, h.y + .03, h.z + .022));
  // 帽子
  if (c.hat === 'douli') {
    b.add(cyl(.012, .42, .2, 20), M(0xdcbc7c), T(h.x, h.y + .135, h.z), .022);
    b.add(cyl(.42, .42, .012, 20), M(0xa98c55), T(h.x, h.y + .035, h.z));
    limb(b, M(0x6a5a3a), P(.1, shY + .22, shF + .08), P(0, shY + .15, shF + .1), .006, 0);
  } else if (c.hat === 'scarf') {
    b.add(sph(.142, 14, 10), kit.fabricMat, T(h.x, h.y + .03, h.z + .018), .012);
    const k = new THREE.SphereGeometry(1, 8, 6); k.scale(.05, .05, .09);
    b.add(k, kit.fabricMat, T(h.x, h.y - .07, h.z + .14), .008);
  } else if (c.hat === 'cap') {
    b.add(cyl(.142, .135, .1, 14), M(0x3f4a3a), T(h.x, h.y + .09, h.z + .01), .014);
    b.add(box(.22, .014, .12), M(0x23262e), T(h.x, h.y + .05, h.z - .15));
  } else if (c.hat === 'helmet') {
    const shell = M(c.helmet, {rough: .25});
    const dome = new THREE.SphereGeometry(.168, 16, 12, 0, 6.283, 0, 1.95);
    b.add(dome, shell, T(h.x, h.y + .035, h.z + .012), .022);
    b.add(box(.3, .036, .03), M(0x2b3a55), T(h.x, h.y + .02, h.z + .172));
    b.add(box(.24, .1, .02), M(0x17242c, {rough: .1, metal: .4}), T(h.x, h.y + .05, h.z - .155));
    for (const s of [-1, 1]) limb(b, M(0x1a1a1c), P(s * .12, shY + .22, shF), P(s * .03, shY + .13, shF + .08), .007, 0);
    if (c.maskMap) b.add(box(.15, .09, .045), mapMat(kit, c.maskMap), T(h.x, h.y - .055, h.z - .108));
    else if (c.mask != null) b.add(box(.15, .09, .045), M(c.mask), T(h.x, h.y - .055, h.z - .108));
  }
  // 配件
  const backY = (hipY + shY) / 2, backZ = -(hipF + shF) / 2 + .19;
  if (c.towel) b.add(new THREE.TorusGeometry(.085, .028, 6, 14).rotateX(Math.PI / 2), M(0xf4f2ea), T(h.x, shY + .08, h.z), .006);
  if (c.satchel) {
    b.add(box(.3, .24, .08), M(0x7a5a34), T(.1, backY - .1, backZ), .014);
    limb(b, M(0x5f4627), P(.18, shY + .03, shF - .1), P(-.14, hipY + .02, hipF - .12), .018, 0);
  }
  if (c.vest) { for (const y of [backY + .1, backY - .08]) b.add(box(.3, .035, .02), M(0xf3f6d0, {unlit: true}), T(0, y, backZ - .02)); }
  if (c.reverse) { // 外套前後反穿：背後看得到拉鍊，帽子掛在胸前
    b.add(box(.018, .46, .02), M(0xe2e4e6), T(0, backY, backZ - .02));
    b.add(box(.2, .05, .05), M(0x1f5a98), T(0, shY + .02, -shF + .14));
  }
  if (c.briefcase) { b.add(box(.3, .22, .08), M(0x3a2a20), T(.02, a.footY + .22, -a.footF - .22), .014); b.add(box(.1, .02, .02), M(0xc2a24a), T(.02, a.footY + .35, -a.footF - .22)); }
}

/** 組出玩家（或對手）：騎士＋車輛。回傳的 Group 內含 brake 等燈號 */
export function makePlayerMesh(kit, pack, charId, vehId) {
  const g = new THREE.Group(), b = kit.nb();
  const c = CHARS[pack].find(x => x.id === charId) || CHARS[pack][0];
  const v = VEHICLES[pack].find(x => x.id === vehId) || VEHICLES[pack][0];
  const a = pack === 'bike' ? buildBike(kit, b, v.id) : buildMoto(kit, b, v.id, g);
  rider(kit, b, a, c);
  b.into(g);
  g.scale.setScalar(pack === 'bike' ? 1.2 : 1.16);
  return g;
}
