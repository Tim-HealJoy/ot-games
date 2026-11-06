/* 騎遍台灣：讀手機傾斜。手機當方向盤、手機自己當螢幕，都用這一份。
 *
 * 不直接拿 beta／gamma 來用，因為：
 * 1. 手機直立橫拿時，gamma 會在 ±90 度之間跳，beta 跟著翻 180 度，車會突然打死方向。
 * 2. iPhone 鎖定直向時橫拿手機，瀏覽器仍回報「直向」，照它算就讀不到轉向。
 * 所以改算「地球的上方」落在手機的哪個方向，由重力判斷手機怎麼拿，
 * 再看「螢幕右邊往下傾了幾度」。平拿、斜拿、直立都是同一個算法。 */
(function (root) {
  'use strict';
  var RAD = Math.PI / 180, DEAD = 2.5, FULL = 16, FLAT = .26;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function upVector(beta, gamma) {
    var b = beta * RAD, g = gamma * RAD;
    return {x: -Math.cos(b) * Math.sin(g), y: Math.sin(b), z: Math.cos(b) * Math.cos(g)};
  }
  /** 手機怎麼拿（和瀏覽器的 screen.orientation.angle 同一套）：0＝直拿；90＝橫拿、手機頂端朝左；270＝橫拿、頂端朝右；180＝倒拿。幾乎平放時看不出來，聽瀏覽器的。 */
  function holdOf(u, fallback) {
    if (Math.hypot(u.x, u.y) < FLAT) return fallback;
    if (Math.abs(u.x) > Math.abs(u.y)) return u.x > 0 ? 90 : 270;
    return u.y >= 0 ? 0 : 180;
  }
  /** 螢幕右邊往下傾幾度，正值＝往右轉 */
  function rollOf(u, hold) {
    var right = hold === 90 ? -u.y : hold === 270 ? u.y : hold === 180 ? -u.x : u.x;
    return Math.asin(clamp(-right, -1, 1)) / RAD;
  }
  function steerOf(d) { return clamp((Math.abs(d) < DEAD ? 0 : d - Math.sign(d) * DEAD) / FULL, -1, 1); }
  function screenAngle() {
    var a = 0;
    try { a = (root.screen && root.screen.orientation && root.screen.orientation.angle) != null ? root.screen.orientation.angle : (root.orientation || 0); } catch (e) {}
    return ((a % 360) + 360) % 360;
  }
  function createTilt() {
    var listening = false;
    var t = {
      value: 0, live: false, roll: null, hold: null, zero: null, follow: false, state: 'idle',
      /** 餵一筆感測值（測試也走這裡） */
      feed: function (beta, gamma, angle) {
        if (beta == null || gamma == null) return;
        var u = upVector(beta, gamma), fb = angle == null ? screenAngle() : angle;
        if (t.hold == null || t.follow) t.hold = holdOf(u, fb);
        t.roll = rollOf(u, t.hold);
        if (t.zero == null || t.follow) t.zero = t.roll;
        t.value = steerOf(t.roll - t.zero);
        t.live = true;
      },
      /** 下一筆感測值當正中間 */
      rezero: function () { t.hold = null; t.zero = null; t.value = 0; },
      /** 倒數時打開：手機怎麼拿都算正中間，出發那一刻才定下來 */
      setFollow: function (on) { t.follow = !!on; if (on) t.value = 0; },
      /** 要權限並開始聽。iPhone 必須在按鈕的點擊裡直接呼叫。回傳 granted／denied／insecure／unsupported */
      ask: function () {
        function listen() {
          if (listening) return;
          listening = true;
          root.addEventListener('deviceorientation', function (e) { t.feed(e.beta, e.gamma); });
          root.addEventListener('orientationchange', t.rezero);
        }
        function done(s) { t.state = s; return s; }
        if (!root.DeviceOrientationEvent) return Promise.resolve(done('unsupported'));
        if (root.isSecureContext === false) return Promise.resolve(done('insecure'));
        if (typeof root.DeviceOrientationEvent.requestPermission === 'function') {
          return root.DeviceOrientationEvent.requestPermission().then(function (r) {
            if (r === 'granted') { listen(); return done('granted'); }
            return done('denied');
          }).catch(function () { return done('denied'); });
        }
        listen();
        return Promise.resolve(done('granted'));
      }
    };
    return t;
  }
  var api = {createTilt: createTilt, upVector: upVector, holdOf: holdOf, rollOf: rollOf, steerOf: steerOf};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.createTilt = createTilt;
})(typeof window !== 'undefined' ? window : globalThis);
