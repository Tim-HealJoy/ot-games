/* 騎遍台灣：讀手機傾斜。手機當方向盤、手機自己當螢幕，都用這一份。
 *
 * 不直接拿 beta／gamma 來用，因為：
 * 1. 手機直立橫拿時，gamma 會在 ±90 度之間跳，beta 跟著翻 180 度，車會突然打死方向。
 * 2. iPhone 鎖定直向時橫拿手機，瀏覽器仍回報「直向」，照它算就讀不到轉向。
 * 所以改算「地球的上方」落在手機的哪個方向，由重力判斷手機怎麼拿，
 * 再看手機在螢幕平面上轉了幾度。平拿、斜拿、直立的靈敏度都一樣。
 *
 * 啟動的原則：不管權限結果怎樣都先開監聽，有訊號就算數。
 * 沒有陀螺儀的便宜手機沒有方向事件，改用重力感測（devicemotion）。 */
(function (root) {
  'use strict';
  var RAD = Math.PI / 180, DEAD = 2.5, FULL = 16, FLAT = .26, MIN_UP = .5;
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
  /** 手機在螢幕平面上往右轉了幾度，正值＝往右轉。幾乎平放時分母不再變小，才不會過度靈敏 */
  function rollOf(u, hold) {
    var right = hold === 90 ? -u.y : hold === 270 ? u.y : hold === 180 ? -u.x : u.x;
    var up = hold === 90 ? u.x : hold === 270 ? -u.x : hold === 180 ? -u.y : u.y;
    return Math.atan2(-right, Math.max(up, MIN_UP)) / RAD;
  }
  function steerOf(d) { return clamp((Math.abs(d) < DEAD ? 0 : d - Math.sign(d) * DEAD) / FULL, -1, 1); }
  function screenAngle() {
    var a = 0;
    try { a = (root.screen && root.screen.orientation && root.screen.orientation.angle) != null ? root.screen.orientation.angle : (root.orientation || 0); } catch (e) {}
    return ((a % 360) + 360) % 360;
  }
  function isIOS() {
    var n = root.navigator || {};
    return /iPad|iPhone|iPod/.test(n.userAgent || '') || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
  }
  function createTilt() {
    var listening = false, asking = null, lastOri = -1e9, gx = 0, gy = 0, gz = 0, gOn = false, gSign = isIOS() ? -1 : 1;
    function now() { return root.performance ? root.performance.now() : Date.now(); }
    function applyUp(u, angle) {
      var fb = angle == null ? screenAngle() : angle;
      if (t.hold == null || t.follow) t.hold = holdOf(u, fb);
      t.roll = rollOf(u, t.hold);
      if (t.zero == null || t.follow) t.zero = t.roll;
      t.value = steerOf(t.roll - t.zero);
      t.live = true;
    }
    var t = {
      value: 0, live: false, roll: null, hold: null, zero: null, follow: false, state: root.isSecureContext === false ? 'insecure' : 'idle', source: '',
      /** 方向感測器的一筆資料（測試也走這裡） */
      feed: function (beta, gamma, angle) {
        if (beta == null || gamma == null) return;
        lastOri = now(); t.source = 'orientation';
        applyUp(upVector(beta, gamma), angle);
      },
      /** 重力感測的一筆資料：只有方向感測器沒動靜時才用 */
      feedGravity: function (ax, ay, az, angle) {
        if (ax == null || ay == null || az == null || now() - lastOri < 600) return;
        var n = Math.hypot(ax, ay, az); if (n < 1) return;
        var k = gOn ? .25 : 1; gOn = true;   // 重力值會混到手的晃動，平滑一下
        gx += (gSign * ax / n - gx) * k; gy += (gSign * ay / n - gy) * k; gz += (gSign * az / n - gz) * k;
        t.source = 'gravity';
        applyUp({x: gx, y: gy, z: gz}, angle);
      },
      /** 下一筆資料當正中間 */
      rezero: function () { t.hold = null; t.zero = null; t.value = 0; },
      /** 倒數時打開：手機怎麼拿都算正中間，出發那一刻才定下來 */
      setFollow: function (on) { t.follow = !!on; if (on) t.value = 0; },
      /** 開始監聽。不需要點擊，Android 這樣就有資料；iPhone 要等 ask() 允許後才有 */
      listen: function () {
        if (listening || !root.addEventListener || root.isSecureContext === false) return;
        listening = true;
        root.addEventListener('deviceorientation', function (e) { t.feed(e.beta, e.gamma); });
        root.addEventListener('devicemotion', function (e) { var a = e.accelerationIncludingGravity; if (a) t.feedGravity(a.x, a.y, a.z); });
        root.addEventListener('orientationchange', t.rezero);
      },
      /** 要權限並開始聽。iPhone 必須在按鈕的點擊裡直接呼叫。回傳 granted／denied／insecure／unsupported */
      ask: function () {
        function done(s) { t.state = s; return s; }
        if (root.isSecureContext === false) return Promise.resolve(done('insecure'));
        if (!root.DeviceOrientationEvent && !root.DeviceMotionEvent) return Promise.resolve(done('unsupported'));
        t.listen();
        var O = root.DeviceOrientationEvent, ask = O && O.requestPermission;
        if (typeof ask !== 'function') return Promise.resolve(done('granted'));
        if (asking) return asking;   // 同一次點擊只要一次權限
        asking = ask.call(O).then(function (r) { asking = null; return done(r === 'granted' ? 'granted' : 'denied'); }).catch(function () { asking = null; return done('denied'); });
        return asking;
      }
    };
    return t;
  }
  var api = {createTilt: createTilt, upVector: upVector, holdOf: holdOf, rollOf: rollOf, steerOf: steerOf};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.createTilt = createTilt;
})(typeof window !== 'undefined' ? window : globalThis);
