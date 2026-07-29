/*
 * open-in-browser.js — 全站共用：內建瀏覽器（Messenger／FB／IG／LINE／WeChat）偵測與導引
 *
 * 背景：粉絲從 Messenger 點連結會用 App 內建視窗開啟，遊戲常常打不開
 * （2026-07-29 粉絲回報生活排序王），需要鏡頭的遊戲更是拿不到權限。
 *
 * 用法（加在 <head> 內、不加 defer/async）：
 *   <script src="/open-in-browser.js"></script>                一般遊戲（可選擇仍在內建視窗嘗試）
 *   <script src="/open-in-browser.js" data-camera="1"></script> 鏡頭遊戲（強制導出，無法略過）
 *
 * 測試：任何頁面加上 ?iabtest=1 可在一般瀏覽器強制顯示導引畫面。
 * 注意：sequence 等 Vite 專案重 build 時，記得保留 index.html 裡的這行 script。
 */
(function () {
  'use strict';

  var ua = navigator.userAgent || '';
  var isLine = / Line\/|Liff/i.test(ua);
  var isFB = /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger/i.test(ua);
  var isIG = /Instagram/i.test(ua);
  var isWeChat = /MicroMessenger/i.test(ua);
  var forceTest = /[?&]iabtest=1/.test(location.search);
  var inApp = isLine || isFB || isIG || isWeChat || forceTest;
  if (!inApp) return;

  // 目前這個 script 標籤（head 內同步執行，document.currentScript 可用）
  var me = document.currentScript;
  var needCamera = !!(me && me.getAttribute('data-camera'));

  // 乾淨網址：去掉 fbclid / utm / 測試參數
  function cleanUrl() {
    var qs = location.search.replace(/^\?/, '').split('&').filter(function (p) {
      return p && !/^(fbclid|utm_[a-z]+|iabtest|openExternalBrowser)=/i.test(p);
    }).join('&');
    return location.protocol + '//' + location.host + location.pathname + (qs ? '?' + qs : '');
  }
  var url = cleanUrl();

  // LINE：官方支援 openExternalBrowser=1，直接自動跳外部瀏覽器
  if (isLine && !forceTest && !/openExternalBrowser=1/.test(location.search)) {
    location.replace(url + (url.indexOf('?') === -1 ? '?' : '&') + 'openExternalBrowser=1');
    return;
  }

  var isAndroid = /Android/i.test(ua);
  var appName = isLine ? 'LINE' : isIG ? 'Instagram' : isWeChat ? 'WeChat' : isFB ? 'Messenger／Facebook' : 'App';

  // 這頁若使用者已選擇「仍要在這裡試試」，本次瀏覽不再擋
  try {
    if (!needCamera && sessionStorage.getItem('iab-continue') === '1') return;
  } catch (e) {}

  function buildOverlay() {
    var wrap = document.createElement('div');
    wrap.id = 'iab-overlay';
    wrap.setAttribute('style',
      'position:fixed;inset:0;z-index:2147483647;background:rgba(16,20,24,.92);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;' +
      '-webkit-font-smoothing:antialiased;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif;');

    var camNote = needCamera
      ? '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#b45309;background:#fef3c7;border-radius:10px;padding:10px 12px;">這款遊戲需要使用鏡頭，' + appName + ' 的內建視窗無法開啟鏡頭，一定要改用瀏覽器。</p>'
      : '';

    var mainAction = isAndroid
      ? '<button id="iab-chrome" style="display:block;width:100%;border:0;border-radius:14px;background:#2563eb;color:#fff;font-size:19px;font-weight:700;padding:15px 0;margin:0 0 10px;cursor:pointer;">一鍵用 Chrome 開啟</button>'
      : '<div style="background:#f1f5f9;border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:16px;line-height:1.9;color:#0f172a;text-align:left;">' +
        '① 點畫面角落的「<b>⋯</b>」或「<b>分享</b>」按鈕<br>' +
        '② 選「<b>以外部瀏覽器開啟</b>」或「<b>在 Safari 中開啟</b>」</div>';

    var continueLink = needCamera ? '' :
      '<div style="margin-top:14px;"><a id="iab-continue" href="#" style="font-size:14px;color:#94a3b8;text-decoration:underline;">仍要在這裡試試看</a></div>';

    wrap.innerHTML =
      '<div style="background:#fff;border-radius:20px;max-width:420px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">' +
      '<div style="font-size:44px;line-height:1;margin-bottom:10px;">🌏</div>' +
      '<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">請用瀏覽器開啟遊戲</h2>' +
      '<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#475569;">你正在 ' + appName + ' 的內建視窗，遊戲在這裡可能打不開。</p>' +
      camNote + mainAction +
      '<button id="iab-copy" style="display:block;width:100%;border:2px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;font-size:17px;font-weight:600;padding:13px 0;cursor:pointer;">複製遊戲網址</button>' +
      '<p id="iab-copied" style="display:none;margin:10px 0 0;font-size:15px;color:#16a34a;font-weight:600;">已複製！貼到 Chrome 或 Safari 的網址列就能玩</p>' +
      '<p style="margin:12px 0 0;font-size:13px;color:#94a3b8;word-break:break-all;user-select:all;-webkit-user-select:all;">' + url + '</p>' +
      continueLink +
      '</div>';

    document.body.appendChild(wrap);

    var chromeBtn = document.getElementById('iab-chrome');
    if (chromeBtn) {
      chromeBtn.addEventListener('click', function () {
        var noScheme = url.replace(/^https?:\/\//, '');
        location.href = 'intent://' + noScheme +
          '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
          encodeURIComponent(url) + ';end';
      });
    }

    document.getElementById('iab-copy').addEventListener('click', function () {
      var done = function () {
        document.getElementById('iab-copied').style.display = 'block';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(); done(); });
      } else {
        fallbackCopy(); done();
      }
    });

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('style', 'position:fixed;left:-9999px;top:0;');
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }

    var cont = document.getElementById('iab-continue');
    if (cont) {
      cont.addEventListener('click', function (ev) {
        ev.preventDefault();
        try { sessionStorage.setItem('iab-continue', '1'); } catch (e) {}
        wrap.parentNode.removeChild(wrap);
      });
    }
  }

  if (document.body) buildOverlay();
  else document.addEventListener('DOMContentLoaded', buildOverlay);
})();
