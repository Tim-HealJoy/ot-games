/* 騎遍台灣：讓螢幕保持亮著。
 *
 * 手機當方向盤時沒有人碰螢幕，系統會以為沒人在用，過一下就暗掉、鎖定，傾斜訊號也跟著斷。
 * 電腦螢幕也一樣：手機在操作，電腦這邊沒有滑鼠鍵盤動作。
 *
 * 第一層：瀏覽器的 Wake Lock。
 * 第二層：要不到（舊手機、App 內建瀏覽器、http 網址）就放一段看不見、沒聲音的影片，影片播放時系統不會關螢幕。
 *        影片是本專案自己產生的，4 秒、全黑、無聲（H.264＋AAC，約 3 KB）。
 *        不用 loop 屬性：iPhone 遇到循環播放的影片不會讓螢幕保持亮著，所以用 timeupdate 自己跳回前面。
 *
 * iPhone 要在點擊裡才給開，所以每次點擊都補一次；被系統收回也會自己再要。
 * 狀態：off 沒在用／wait 還沒碰過螢幕／lock Wake Lock／video 影片備援／fail 兩層都失敗。 */
(function (root) {
  'use strict';
  var QUIET = 'data:video/mp4;base64,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AAlUAAAJwQAAAAFtZGF0AAAAAAAABAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwAAADYGBS1HVkrcXExDP5TvxRE80UOoAQAAAwABAwAAAwABAgAAC7gLAAADAAADAAADAzQMA5ErAYAAAABPJbggAIP//+HooD7xXw//w8EhfvvvvvvvvvqExWuoSrrrrrrrrr4//8PRfvrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrwAAAAB0h4QQHvwOGJ+bE/P5/PCkT/Mqi/51UX/qov/VRfwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHAAAAHCHiCAc6E8V8/n+bE/zILLzRX86qL/1UX/qov4AAAAAbIeMMBroTuK+fz8V/MgwvNFfzqov/VRf+qi/gANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHAAAAGyHkEAY+BSxfxPn4r+ZBpeaK/nVRf+qi/9VF/AAAABkh5RQFuM+J8/FfzIOLzRX86qL/1UX/qov4ANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHAAAAGSHmGAU4z4nz8V/Mg8vNFfzqov/VRf+qi/gAAAAcIeccBL4ErF/E+I4r+ZAgXmiv51UX/qov/VRfwADQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcA0AAHANAABwDQAAcAAAAaBgUVR1ZK3FxMQz+U78URPNFDqAMAAAMAAYAAAABPJbgQAEP//+HooABv3+H/+HgRC/fffffffffUEddQRV111111118f/+Hov311111111111111111111111111111111111111111111114AAAABwh4QQO6icV8/n+bE/zIEi80V/Oqi/9VF/6qL+AAAAAFyHiCAzubE/6qL/0CZRf+qi/9VF/6qL+AAAAFiHjDArjP9VF/6BQov/VRf+qi/9VF/AAAAAWIeQQE4z/VRf+gXKL/1UX/qov/VRfwAAAABUh5RQ+M/1UX/oGqi/9VF/6qL/1UX8AAAAWIeYYCeM/1UX/oF6i/9VF/6qL/1UX8AAAABYh5xwJ4z/VRf+gXqL/1UX/qov/VRfw';
  function createAwake(opt) {
    opt = opt || {};
    var doc = root.document, nav = root.navigator, want = false, lock = null, asking = false, vid = null, vidOn = false, blessed = false, touched = false, lockBad = false;
    var a = {state: 'off', why: !nav.wakeLock ? (root.isSecureContext === false ? '網址不是 https' : '瀏覽器沒有 Wake Lock') : '', start: start, stop: stop, get locked() { return !!lock; }, get videoOn() { return vidOn; }};
    var visible = function () { return doc.visibilityState === 'visible'; };
    function report() {
      var s = !want ? 'off' : lock ? 'lock' : vidOn ? 'video' : touched && !asking ? 'fail' : 'wait';
      if (s !== a.state) { a.state = s; if (opt.onChange) opt.onChange(s); }
    }
    function makeVideo() {
      if (vid) return vid;
      vid = doc.createElement('video');
      // 寫法跟 iPhone 上確定可行的做法一樣：source 標籤、不設大小、放在畫面外
      vid.setAttribute('title', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', ''); vid.setAttribute('aria-hidden', 'true'); vid.setAttribute('tabindex', '-1');
      var src = doc.createElement('source'); src.src = QUIET; src.type = 'video/mp4'; vid.appendChild(src);
      vid.style.cssText = 'position:absolute;left:-100%;top:-100%;pointer-events:none';
      vid.addEventListener('error', function () { a.why = '影片無法載入'; report(); });
      vid.addEventListener('timeupdate', function () { if (vid.currentTime > 2.5) vid.currentTime = .2 + Math.random(); });
      vid.addEventListener('ended', function () { if (want && needVideo()) vid.play().catch(function () {}); });
      vid.addEventListener('playing', function () { vidOn = true; report(); });
      vid.addEventListener('pause', function () { vidOn = false; report(); });
      (doc.body || doc.documentElement).appendChild(vid);
      return vid;
    }
    var needVideo = function () { return opt.video !== false && (!lock || opt.both); };
    function playVideo() {
      if (opt.video === false) return;
      var p; try { p = makeVideo().play(); } catch (e) {}
      if (p && p.catch) p.catch(function (e) { a.why = '影片：' + ((e && e.name) || '播不了'); report(); });
    }
    function pauseVideo() { if (vid && !vid.paused) vid.pause(); }
    function askLock() {
      if (asking || lock || !nav.wakeLock || !visible()) return;
      asking = true;
      nav.wakeLock.request('screen').then(function (l) {
        asking = false; lockBad = false;
        if (!want) { l.release(); return; }
        lock = l;
        l.addEventListener('release', function () { if (lock === l) lock = null; report(); if (want && visible()) ensure(); });
        if (!opt.both) pauseVideo();
        report();
      }, function (e) {
        asking = false; lockBad = true; a.why = 'Wake Lock：' + ((e && e.name) || '被拒絕');
        if (want && blessed) playVideo();
        report();
      });
    }
    /** 平常的檢查：沒有 Wake Lock 就要一次，真的要不到才放影片 */
    function ensure() {
      if (!want || !visible()) return;
      if (lock && lock.released) lock = null;
      askLock();
      if (needVideo() && blessed && (lockBad || !nav.wakeLock || opt.both)) playVideo();
      report();
    }
    /** 使用者碰了螢幕：影片一定要先在點擊裡開過一次，之後才能自己播 */
    function onGesture() {
      if (!want) return;
      touched = true;
      if (!blessed && opt.video !== false) { blessed = true; playVideo(); if (nav.wakeLock && !opt.both && lock) pauseVideo(); }
      else if (needVideo() && (lockBad || !nav.wakeLock || opt.both)) playVideo();
      askLock();
      setTimeout(report, 400);
    }
    function start() {
      if (want) { ensure(); return; }
      want = true; ensure();
    }
    function stop() {
      want = false; pauseVideo();
      if (lock) { try { lock.release(); } catch (e) {} lock = null; }
      report();
    }
    ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (ev) { doc.addEventListener(ev, onGesture, {capture: true, passive: true}); });
    doc.addEventListener('visibilitychange', ensure);
    root.addEventListener('pageshow', ensure);
    root.addEventListener('focus', ensure);
    setInterval(ensure, 5000);
    return a;
  }
  root.createAwake = createAwake;
})(window);
