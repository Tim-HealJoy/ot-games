/* 騎遍台灣：每條路線自己的環境音（全部由 WebAudio 即時合成，沒有錄音檔）。
 * 清晨＝鳥叫＋煎台滋滋；菜市場＝人聲＋廟鐘木魚；國小＝孩童聲＋上下課鐘＋導護哨；
 * 尖峰＝車流低鳴＋喇叭＋機車呼嘯；颱風＝雨聲＋風聲＋雷；稻田＝蟬鳴＋風＋鳥。 */
(function (global) {
  'use strict';
  function createAmbience(ctx, destination) {
    var dest = destination || ctx.destination;
    var offline = typeof ctx.startRendering === 'function' && typeof ctx.length === 'number';
    var buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var bus = null, nodes = [], timer = null, cursor = {}, recipe = null;

    function noise() { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = .85 + Math.random() * .3; return s; }
    function layer(o) {
      var s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = o.type || 'bandpass'; f.frequency.value = o.f; f.Q.value = o.q == null ? 1 : o.q;
      g.gain.value = o.gain; s.connect(f);
      var last = f;
      if (o.hp) { var h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = o.hp; f.connect(h); last = h; }
      last.connect(g); g.connect(bus); s.start();
      nodes.push(s);
      if (o.lfo) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.lfo; lg.gain.value = o.depth == null ? o.gain * .6 : o.depth; l.connect(lg); lg.connect(g.gain); l.start(); nodes.push(l); }
    }
    function tone(t, f, dur, vol, type, slide) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, .0002), t + Math.min(.012, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(bus || dest); o.start(t); o.stop(t + dur + .03);
    }
    function burst(t, type, f0, f1, dur, vol, q) {
      var s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type; f.Q.value = q == null ? 1 : q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 40), t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, .0002), t + dur * .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus || dest); s.start(t); s.stop(t + dur + .03);
    }
    var FX = {
      bird: function (t) { var n = 2 + (Math.random() * 3 | 0), f = 2700 + Math.random() * 900; for (var k = 0; k < n; k++) tone(t + k * .13, f, .09, .024, 'sine', f + 620); },
      clink: function (t) { tone(t, 3200, .07, .02, 'triangle'); tone(t + .1, 2900, .06, .014, 'triangle'); },
      bell: function (t) { [[520, .05, 2.6], [781, .022, 1.9], [1433, .012, 1.2]].forEach(function (p) { tone(t, p[0], p[2], p[1]); }); },
      wood: function (t) { tone(t, 860, .07, .05, 'sine', 700); tone(t + .24, 860, .07, .04, 'sine', 700); },
      chime: function (t) { [659.3, 523.3, 587.3, 392, 392, 587.3, 659.3, 523.3].forEach(function (f, k) { var at = t + k * .62 + (k >= 4 ? .3 : 0); tone(at, f, 1.3, .05); tone(at, f * 2, .7, .012, 'triangle'); }); },
      whistle: function (t) { for (var k = 0; k < 2; k++) { tone(t + k * .34, 2650, .24, .018, 'square'); } },
      horn: function (t) { var f = Math.random() < .5 ? 392 : 330; tone(t, f, .32, .022, 'sawtooth'); tone(t, f * 1.25, .32, .017, 'sawtooth'); },
      whoosh: function (t) { burst(t, 'bandpass', 1300, 280, .75, .05, 1.2); tone(t, 120, .75, .018, 'sawtooth', 70); },
      thunder: function (t) { burst(t, 'highpass', 1800, 700, .22, .07, .7); burst(t + .08, 'lowpass', 260, 60, 2.8, .32, .6); },
      gust: function (t) { burst(t, 'bandpass', 420, 1500, .9, .12, .8); burst(t + .75, 'bandpass', 1500, 380, 1.1, .1, .8); }
    };
    var RECIPES = {
      rice: {vol: 1.6, layers: [{f: 5200, q: 7, gain: .03, lfo: 15, depth: .02}, {type: 'lowpass', f: 520, q: .5, gain: .035, lfo: .17, depth: .02}], shots: [['bird', 4, 8]]},
      lane: {vol: 1.5, layers: [{f: 4300, q: 5, gain: .03, lfo: 22, depth: .022}, {type: 'lowpass', f: 480, q: .5, gain: .025, lfo: .12, depth: .015}], shots: [['bird', 3, 6]]},   // 正午：蟬聲、微風、鳥
      breakfast: {vol: 2, layers: [{type: 'highpass', f: 3600, q: .4, gain: .012, lfo: .7, depth: .006}, {f: 620, q: .7, gain: .012, lfo: 1.7, depth: .006}], shots: [['bird', 1.8, 4.5], ['clink', 3, 6.5]]},
      market: {vol: 1.5, layers: [{f: 720, q: .8, gain: .05, lfo: 2.3, depth: .022}, {f: 1450, q: 1, gain: .024, lfo: 3.1, depth: .012}], shots: [['bell', 8, 13], ['wood', 5, 9]]},
      school: {vol: 1.6, layers: [{f: 1550, q: 1, gain: .024, lfo: 4.2, depth: .013}, {f: 2700, q: 1.6, gain: .008, lfo: 2.6, depth: .005}], intro: 'chime', shots: [['whistle', 7, 12], ['bird', 4, 8]]},
      rush: {vol: 1.6, layers: [{type: 'lowpass', f: 280, q: .6, gain: .11, lfo: .3, depth: .03}, {f: 950, q: .7, gain: .024, lfo: .55, depth: .012}], shots: [['horn', 2.6, 5.5], ['whoosh', 1.8, 3.8]]},
      storm: {layers: [{type: 'highpass', f: 1300, q: .4, gain: .05, lfo: .45, depth: .012}, {type: 'lowpass', f: 560, q: .4, gain: .07, lfo: .22, depth: .03}, {f: 760, q: 1.4, gain: .03, lfo: .13, depth: .024}], shots: []}
    };
    function schedule(until) {
      recipe.shots.forEach(function (s) {
        while (cursor[s[0]] < until) { var t = cursor[s[0]]; FX[s[0]](t); cursor[s[0]] = t + s[1] + Math.random() * (s[2] - s[1]); }
      });
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      nodes = [];
      if (bus) { var b = bus; bus = null; var t = ctx.currentTime; try { b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(.0001, t + .25); } catch (e) {} if (!offline) setTimeout(function () { try { b.disconnect(); } catch (e) {} }, 500); }
      recipe = null;
    }
    function play(routeId) {
      stop();
      var r = RECIPES[routeId]; if (!r) return;
      recipe = r; bus = ctx.createGain(); bus.gain.value = r.vol || 1; bus.connect(dest);
      r.layers.forEach(layer);
      var now = ctx.currentTime; cursor = {};
      r.shots.forEach(function (s) { cursor[s[0]] = now + s[1] * .5 + Math.random() * s[1]; });
      if (r.intro) FX[r.intro](now + .3);
      if (offline) schedule(ctx.length / ctx.sampleRate);
      else { schedule(now + .6); timer = setInterval(function () { schedule(ctx.currentTime + .6); }, 250); }
    }
    return {play: play, stop: stop, gust: function () { if (bus) FX.gust(ctx.currentTime); }, thunder: function () { if (bus) FX.thunder(ctx.currentTime); }, routes: Object.keys(RECIPES)};
  }
  global.createAmbience = createAmbience;
})(typeof window !== 'undefined' ? window : this);
