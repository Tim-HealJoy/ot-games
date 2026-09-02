/*!
 * engine.js — AI 浮水印清除器核心演算法
 *
 * 設計原則：純函式、零 DOM 依賴。所有影像參數都是 ImageData 形狀的物件
 *   { width, height, data: Uint8ClampedArray }（RGBA，長度 = width*height*4）
 * 因此瀏覽器（Canvas.getImageData）與 Node（pngjs / jpeg-js）都能直接餵進來。
 *
 * 星星（Nano Banana / Gemini）去除邏輯改寫自開源專案 gemini-watermark-remover
 * （MIT，原作 Allen Kuo / dearabhin）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UnwatermarkEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 常數 ────────────────────────────────────────────────────────────────
  var ALPHA_THRESHOLD = 0.002;   // 低於此值視為無浮水印，跳過
  var MAX_ALPHA = 0.99;          // 反向混合的 alpha 上限，避免除以 0
  var LOGO_VALUE = 255;          // 星星是白色

  // 星星擬合分數門檻。原規格用「亮度減視窗中位數後做 NCC」訂 0.35，但用合成樣本
  // 校驗後發現：底圖只要有紋理或邊緣，分數就會被稀釋到 0.23–0.31，
  // 與 45 張真實乾淨圖的最高誤報分數（0.39）反而重疊。
  // 改成先對「視窗亮度」與「alpha map」各做一次高通（減去半徑 size/6 的盒狀模糊）
  // 再取皮爾森相關，正樣本最低 0.384、135 個負樣本視窗最高 0.224，門檻取 0.32。
  var NANO_SCORE_THRESHOLD = 0.32;
  var NANO_HP_DIVISOR = 6;           // 高通半徑 = round(size / 6)
  var NANO_MIN_SLOPE = 1;            // 高通擬合振幅下限，擋掉純雜訊相關
  // 舊版固定像素幾何的縮放倍率（size = 48k、margin = 32k）；k=1 即 48/32、k=2 即 96/64
  var NANO_LEGACY_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  var NOTEBOOK_SCORE_THRESHOLD = 0.55;
  var NOTEBOOK_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2];
  var NOTEBOOK_SEARCH_W = 500;
  var NOTEBOOK_SEARCH_H = 200;
  var NOTEBOOK_CORNER_PAD = 80;     // 每個 scale 的搜尋方塊 = 模板尺寸 + 此邊距
  var NOTEBOOK_MIN_SLOPE = 20;      // 文字振幅下限（正樣本 132&249；純色底雜訊僅 0.5）
  var NOTEBOOK_ALPHA_SPLIT = 0.75;   // 以上走 inpaint，以下走反向 alpha

  // ── 基本工具 ────────────────────────────────────────────────────────────

  /** 建一張同尺寸的空白 ImageData 形狀物件。 */
  function createImage(width, height) {
    return { width: width, height: height, data: new Uint8ClampedArray(width * height * 4) };
  }

  /** 深拷貝一張影像。 */
  function cloneImage(img) {
    return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  }

  /** 取灰階亮度（Rec.601），回傳 Float32Array，長度 width*height。 */
  function luminance(img) {
    var n = img.width * img.height;
    var out = new Float32Array(n);
    var d = img.data;
    for (var i = 0; i < n; i++) {
      var j = i * 4;
      out[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
    }
    return out;
  }

  /**
   * 只取影像某個矩形視窗的亮度，避免為了角落幾百像素掃過整張圖。
   * 大圖上這一步是效能關鍵（4.2M 像素的全圖亮度在瀏覽器要 150 ms）。
   */
  function windowLuminance(img, x0, y0, w, h) {
    var out = new Float32Array(w * h), d = img.data, W = img.width;
    for (var r = 0; r < h; r++) {
      var si = ((y0 + r) * W + x0) * 4, di = r * w;
      for (var c = 0; c < w; c++) {
        out[di + c] = 0.299 * d[si] + 0.587 * d[si + 1] + 0.114 * d[si + 2];
        si += 4;
      }
    }
    return out;
  }

  /**
   * 由星星遮罩圖算 alpha map：每像素取 RGB 最大值 / 255。
   * @param {{width:number,height:number,data:Uint8ClampedArray}} img
   * @returns {Float32Array}
   */
  function alphaMapFromRGB(img) {
    var n = img.width * img.height;
    var out = new Float32Array(n);
    var d = img.data;
    for (var i = 0; i < n; i++) {
      var j = i * 4;
      var m = d[j];
      if (d[j + 1] > m) m = d[j + 1];
      if (d[j + 2] > m) m = d[j + 2];
      out[i] = m / 255;
    }
    return out;
  }

  /**
   * 由灰階模板圖算 alpha map：值 / 255（notebook_text.png 這種 L 模式模板用）。
   * 傳入的仍是 RGBA 形狀，取 R 通道即可。
   */
  function alphaMapFromGray(img) {
    var n = img.width * img.height;
    var out = new Float32Array(n);
    var d = img.data;
    for (var i = 0; i < n; i++) out[i] = d[i * 4] / 255;
    return out;
  }

  /**
   * 單通道浮點陣列縮放（可分離兩趟）。
   * 縮小用面積平均（等同 OpenCV INTER_AREA），放大用雙線性，兩者品質都夠。
   */
  function resizeGray(src, sw, sh, dw, dh) {
    if (sw === dw && sh === dh) return Float32Array.from(src);
    var tmp = resizeAxis(src, sw, sh, dw, true);   // 先橫向
    return resizeAxis(tmp, dw, sh, dh, false);     // 再縱向
  }

  function resizeAxis(src, w, h, dn, horizontal) {
    var sn = horizontal ? w : h;
    var ow = horizontal ? dn : w;
    var oh = horizontal ? h : dn;
    var out = new Float32Array(ow * oh);
    var ratio = sn / dn;
    var otherN = horizontal ? h : w;

    if (ratio >= 1) {
      // 縮小：面積平均，含邊界分數權重
      for (var d = 0; d < dn; d++) {
        var s0 = d * ratio, s1 = (d + 1) * ratio;
        var i0 = Math.floor(s0), i1 = Math.min(sn - 1, Math.ceil(s1) - 1);
        for (var o = 0; o < otherN; o++) {
          var sum = 0, wsum = 0;
          for (var i = i0; i <= i1; i++) {
            var lo = Math.max(s0, i), hi = Math.min(s1, i + 1);
            var wgt = hi - lo;
            if (wgt <= 0) continue;
            sum += wgt * (horizontal ? src[o * w + i] : src[i * w + o]);
            wsum += wgt;
          }
          var v = wsum > 0 ? sum / wsum : 0;
          if (horizontal) out[o * ow + d] = v; else out[d * ow + o] = v;
        }
      }
    } else {
      // 放大：雙線性
      for (var d2 = 0; d2 < dn; d2++) {
        var pos = (d2 + 0.5) * ratio - 0.5;
        if (pos < 0) pos = 0;
        var a = Math.floor(pos);
        var b = Math.min(sn - 1, a + 1);
        var f = pos - a;
        for (var o2 = 0; o2 < otherN; o2++) {
          var va = horizontal ? src[o2 * w + a] : src[a * w + o2];
          var vb = horizontal ? src[o2 * w + b] : src[b * w + o2];
          var v2 = va + (vb - va) * f;
          if (horizontal) out[o2 * ow + d2] = v2; else out[d2 * ow + o2] = v2;
        }
      }
    }
    return out;
  }

  // ── A. Nano Banana 星星 ─────────────────────────────────────────────────

  /**
   * 舊版幾何：大圖 96px/邊距 64，小圖 48px/邊距 32。
   * 兩者其實是同一組比例（96/64 = 48×2 / 32×2），所以下面用 48/32 乘上倍率 k 統一表示。
   */
  function legacyGeometry(width, height, size) {
    var margin = size === 96 ? 64 : 32;
    return {
      size: size, width: size, height: size,
      x: width - margin - size,
      y: height - margin - size
    };
  }

  /**
   * 以 k 倍縮放的舊版幾何：size = 48k、margin = 32k。
   * 為什麼需要：舊版浮水印是「固定像素」的，圖片一旦被縮放過
   * （PDF 逐頁 render、社群平台壓縮、使用者自己縮圖），星星尺寸就跟著變，
   * 只試 48/96 兩種會整組失準。實測加了 8 段倍率後，
   * 45 張真實乾淨圖的最高誤報分數仍是 0.224（與只試 3 種候選時相同），等於免費。
   */
  function legacyGeometryScaled(width, height, k) {
    var size = Math.round(48 * k), margin = Math.round(32 * k);
    return {
      size: size, width: size, height: size,
      x: width - margin - size,
      y: height - margin - size
    };
  }

  /** k 倍幾何的顯示名稱：1→'48'、2→'96'，其餘標成 '48×k'。 */
  function legacyVariantName(k) {
    if (k === 1) return '48';
    if (k === 2) return '96';
    return '48×' + k;
  }

  /** 新版 compact 幾何：size = min(W,H)/32（最小 8），margin = min(W,H)/16。 */
  function compactGeometry(width, height) {
    var base = Math.min(width, height);
    var size = Math.max(8, Math.round(base / 32));
    var margin = Math.round(base / 16);
    return {
      size: size, width: size, height: size,
      x: Math.max(0, width - margin - size),
      y: Math.max(0, height - margin - size)
    };
  }

  function geometryFor(variant, width, height) {
    if (variant === '48') return legacyGeometry(width, height, 48);
    if (variant === '96') return legacyGeometry(width, height, 96);
    return compactGeometry(width, height);
  }

  /** 可分離盒狀模糊（邊界以有效像素數正規化）。 */
  function boxBlur(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    var y, x, k, s, c, i;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        s = 0; c = 0;
        for (k = -r; k <= r; k++) { i = x + k; if (i < 0 || i >= w) continue; s += src[y * w + i]; c++; }
        tmp[y * w + x] = s / c;
      }
    }
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) {
        s = 0; c = 0;
        for (k = -r; k <= r; k++) { i = y + k; if (i < 0 || i >= h) continue; s += tmp[i * w + x]; c++; }
        out[y * w + x] = s / c;
      }
    }
    return out;
  }

  /** 皮爾森相關 + 回歸斜率。 */
  function pearson(a, b, n) {
    var ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    var saa = 0, sbb = 0, sab = 0;
    for (i = 0; i < n; i++) {
      var da = a[i] - ma, db = b[i] - mb;
      saa += da * da; sbb += db * db; sab += da * db;
    }
    if (saa < 1e-9 || sbb < 1e-9) return { r: 0, slope: 0 };
    return { r: sab / Math.sqrt(saa * sbb), slope: sab / saa };
  }

  /**
   * 星星擬合分數。
   * 白色星星疊上去等同 lum' = lum + alpha × (255 − lum)，
   * 直接把視窗亮度和 alpha map 做相關會被底圖的低頻內容（大片明暗、漸層）稀釋，
   * 所以兩邊都先做高通（減去半徑 size/6 的盒狀模糊）再取皮爾森相關。
   * slope 為高通後的回歸斜率，可視為浮水印在該處的可見強度。
   * plainSlope 保留原始（未高通）斜率，純供診斷顯示。
   */
  function fitStarScore(img, geo, alpha) {
    if (geo.x < 0 || geo.y < 0 || geo.x + geo.width > img.width || geo.y + geo.height > img.height) {
      return { score: -1, slope: 0, plainSlope: 0 };
    }
    var w = geo.width, h = geo.height, n = w * h;
    var win = windowLuminance(img, geo.x, geo.y, w, h);
    var plain = pearson(alpha, win, n);
    var R = Math.max(1, Math.round(geo.size / NANO_HP_DIVISOR));
    var bw = boxBlur(win, w, h, R), ba = boxBlur(alpha, w, h, R);
    var hw = new Float32Array(n), ha = new Float32Array(n);
    for (var i = 0; i < n; i++) { hw[i] = win[i] - bw[i]; ha[i] = alpha[i] - ba[i]; }
    var hp = pearson(ha, hw, n);
    return { score: hp.r, slope: hp.slope, plainSlope: plain.slope };
  }

  /**
   * 偵測星星浮水印。三套幾何全試，取分數最高者。
   * @param {object} img RGBA 影像
   * @param {{alpha48:Float32Array, alpha96:Float32Array}} maps
   * @param {object} [opts] { threshold, force: '48'|'96'|'compact' }
   */
  function detectNanoBanana(img, maps, opts) {
    opts = opts || {};
    var threshold = opts.threshold != null ? opts.threshold : NANO_SCORE_THRESHOLD;

    // 候選清單：舊版固定像素幾何（含縮放倍率）＋ 與尺寸連動的 compact
    var cands = [];
    if (opts.force) {
      cands.push({ name: opts.force, geo: geometryFor(opts.force, img.width, img.height) });
    } else {
      var ks = opts.legacyScales || NANO_LEGACY_SCALES;
      for (var s = 0; s < ks.length; s++) {
        var g = legacyGeometryScaled(img.width, img.height, ks[s]);
        if (g.size < 8) continue;
        cands.push({ name: legacyVariantName(ks[s]), geo: g });
      }
      cands.push({ name: 'compact', geo: compactGeometry(img.width, img.height) });
    }

    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var geo = cands[i].geo;
      if (geo.x < 0 || geo.y < 0) continue;
      var alpha = alphaForSize(maps, geo.size);
      var fit = fitStarScore(img, geo, alpha);
      var cand = {
        variant: cands[i].name, geometry: geo, alpha: alpha,
        score: fit.score, slope: fit.slope, plainSlope: fit.plainSlope
      };
      if (!best || cand.score > best.score) best = cand;
    }
    if (!best) return { found: false, score: -1, variant: null, geometry: null };

    var ok = opts.force
      ? true
      : (best.score >= threshold && best.slope >= NANO_MIN_SLOPE);
    return {
      found: ok,
      score: best.score,
      slope: best.slope,
      plainSlope: best.plainSlope,
      variant: best.variant,
      geometry: best.geometry,
      alpha: best.alpha
    };
  }

  /** 依尺寸取（或快取產生）星星 alpha map。48/96 用原圖，其餘由 96 縮放。 */
  function alphaForSize(maps, size) {
    if (size === 48 && maps.alpha48) return maps.alpha48;
    if (size === 96 && maps.alpha96) return maps.alpha96;
    maps._cache = maps._cache || {};
    if (maps._cache[size]) return maps._cache[size];
    var src = maps.alpha96 || maps.alpha48;
    var srcSize = maps.alpha96 ? 96 : 48;
    var scaled = resizeGray(src, srcSize, srcSize, size, size);
    maps._cache[size] = scaled;
    return scaled;
  }

  /**
   * 反向 alpha 混合去除白色星星（原地修改）。
   *   watermarked = alpha*255 + (1-alpha)*original
   *   original    = (watermarked - alpha*255) / (1-alpha)
   */
  function removeNanoBanana(img, alpha, geo) {
    var W = img.width, d = img.data;
    for (var r = 0; r < geo.height; r++) {
      var y = geo.y + r;
      if (y < 0 || y >= img.height) continue;
      for (var c = 0; c < geo.width; c++) {
        var x = geo.x + c;
        if (x < 0 || x >= W) continue;
        var a = alpha[r * geo.width + c];
        if (a < ALPHA_THRESHOLD) continue;
        if (a > MAX_ALPHA) a = MAX_ALPHA;
        var idx = (y * W + x) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var v = (d[idx + ch] - a * LOGO_VALUE) / (1 - a);
          d[idx + ch] = v < 0 ? 0 : (v > 255 ? 255 : Math.round(v));
        }
      }
    }
    return img;
  }

  // ── B. Gemini Notebook 文字 ─────────────────────────────────────────────

  /** 積分圖，用來 O(1) 取任意矩形的和／平方和。 */
  function buildIntegral(src, w, h) {
    var s = new Float64Array((w + 1) * (h + 1));
    var s2 = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y++) {
      var rs = 0, rs2 = 0;
      for (var x = 0; x < w; x++) {
        var v = src[y * w + x];
        rs += v; rs2 += v * v;
        s[(y + 1) * (w + 1) + x + 1] = s[y * (w + 1) + x + 1] + rs;
        s2[(y + 1) * (w + 1) + x + 1] = s2[y * (w + 1) + x + 1] + rs2;
      }
    }
    return { sum: s, sqSum: s2, w: w + 1 };
  }

  function rectSum(integ, x, y, w, h) {
    var W = integ.w, s = integ.sum;
    return s[(y + h) * W + x + w] - s[y * W + x + w] - s[(y + h) * W + x] + s[y * W + x];
  }
  function rectSqSum(integ, x, y, w, h) {
    var W = integ.w, s = integ.sqSum;
    return s[(y + h) * W + x + w] - s[y * W + x + w] - s[(y + h) * W + x] + s[y * W + x];
  }

  /**
   * 在 region（單通道）中做 TM_CCOEFF_NORMED 模板比對。
   * 用「先降採樣粗搜、再原尺寸精修」的兩段式，避免全解析度暴力搜尋太慢。
   */
  function matchTemplate(region, rw, rh, tpl, tw, th) {
    if (tw > rw || th > rh) return { score: -2, x: 0, y: 0 };

    // 模板統計（固定不變）
    var tn = tw * th, ts = 0;
    for (var i = 0; i < tn; i++) ts += tpl[i];
    var tm = ts / tn, tvar = 0;
    for (var i2 = 0; i2 < tn; i2++) { var dt = tpl[i2] - tm; tvar += dt * dt; }
    if (tvar < 1e-12) return { score: -2, x: 0, y: 0 };
    var tStd = Math.sqrt(tvar);

    var integ = buildIntegral(region, rw, rh);

    function scoreAt(x, y) {
      var isum = rectSum(integ, x, y, tw, th);
      var isq = rectSqSum(integ, x, y, tw, th);
      var ivar = isq - isum * isum / tn;
      if (ivar < 1e-9) return 0;
      var cross = 0;
      for (var r = 0; r < th; r++) {
        var b = (y + r) * rw + x, tb = r * tw;
        for (var c = 0; c < tw; c++) cross += region[b + c] * tpl[tb + c];
      }
      return (cross - isum * tm) / (Math.sqrt(ivar) * tStd);
    }

    var maxX = rw - tw, maxY = rh - th;
    var f = Math.min(4, Math.max(1, Math.floor(Math.min(tw, th) / 7)));

    if (f === 1) {
      var best = { score: -2, x: 0, y: 0 };
      for (var y0 = 0; y0 <= maxY; y0++) {
        for (var x0 = 0; x0 <= maxX; x0++) {
          var s0 = scoreAt(x0, y0);
          if (s0 > best.score) best = { score: s0, x: x0, y: y0 };
        }
      }
      return best;
    }

    // 粗搜：region 與模板同時降採樣 f 倍
    var crw = Math.floor(rw / f), crh = Math.floor(rh / f);
    var ctw = Math.max(2, Math.round(tw / f)), cth = Math.max(2, Math.round(th / f));
    if (ctw > crw || cth > crh) { ctw = Math.min(ctw, crw); cth = Math.min(cth, crh); }
    var cregion = resizeGray(region, rw, rh, crw, crh);
    var ctpl = resizeGray(tpl, tw, th, ctw, cth);
    var coarse = matchTemplateBrute(cregion, crw, crh, ctpl, ctw, cth, 6);

    // 精修：每個粗搜峰值周圍 ±(f+2) 全解析度重算
    var bestFine = { score: -2, x: 0, y: 0 };
    var pad = f + 2;
    for (var k = 0; k < coarse.length; k++) {
      var cx = Math.round(coarse[k].x * f), cy = Math.round(coarse[k].y * f);
      for (var yy = cy - pad; yy <= cy + pad; yy++) {
        if (yy < 0 || yy > maxY) continue;
        for (var xx = cx - pad; xx <= cx + pad; xx++) {
          if (xx < 0 || xx > maxX) continue;
          var sc = scoreAt(xx, yy);
          if (sc > bestFine.score) bestFine = { score: sc, x: xx, y: yy };
        }
      }
    }
    return bestFine;
  }

  /** 全解析度暴力搜尋，回傳前 topK 個非極大抑制後的峰值。 */
  function matchTemplateBrute(region, rw, rh, tpl, tw, th, topK) {
    var tn = tw * th, ts = 0, i;
    for (i = 0; i < tn; i++) ts += tpl[i];
    var tm = ts / tn, tvar = 0;
    for (i = 0; i < tn; i++) { var dt = tpl[i] - tm; tvar += dt * dt; }
    if (tvar < 1e-12) return [];
    var tStd = Math.sqrt(tvar);
    var integ = buildIntegral(region, rw, rh);
    var maxX = rw - tw, maxY = rh - th;
    var results = [];
    for (var y = 0; y <= maxY; y++) {
      for (var x = 0; x <= maxX; x++) {
        var isum = rectSum(integ, x, y, tw, th);
        var isq = rectSqSum(integ, x, y, tw, th);
        var ivar = isq - isum * isum / tn;
        if (ivar < 1e-9) continue;
        var cross = 0;
        for (var r = 0; r < th; r++) {
          var b = (y + r) * rw + x, tb = r * tw;
          for (var c = 0; c < tw; c++) cross += region[b + c] * tpl[tb + c];
        }
        results.push({ score: (cross - isum * tm) / (Math.sqrt(ivar) * tStd), x: x, y: y });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    // 非極大抑制：峰值之間至少距離 max(tw,th)/2
    var minDist = Math.max(2, Math.max(tw, th) / 2);
    var picked = [];
    for (i = 0; i < results.length && picked.length < topK; i++) {
      var ok = true;
      for (var j = 0; j < picked.length; j++) {
        if (Math.abs(picked[j].x - results[i].x) < minDist &&
            Math.abs(picked[j].y - results[i].y) < minDist) { ok = false; break; }
      }
      if (ok) picked.push(results[i]);
    }
    return picked;
  }

  /**
   * 偵測 Gemini Notebook 文字浮水印。
   * @param {object} img
   * @param {{alpha:Float32Array,width:number,height:number}} tpl 文字模板 alpha
   * @param {object} [opts] { threshold, scales }
   */
  function detectNotebook(img, tpl, opts) {
    opts = opts || {};
    var threshold = opts.threshold != null ? opts.threshold : NOTEBOOK_SCORE_THRESHOLD;
    var scales = opts.scales || NOTEBOOK_SCALES;

    var rx = Math.max(0, img.width - NOTEBOOK_SEARCH_W);
    var ry = Math.max(0, img.height - NOTEBOOK_SEARCH_H);
    var rw = img.width - rx, rh = img.height - ry;

    // darkness = 255 − 亮度（黑字在亮底上是正訊號）
    var region = windowLuminance(img, rx, ry, rw, rh);
    for (var i0 = 0; i0 < region.length; i0++) region[i0] = 255 - region[i0];

    // 浮水印一定貼在右下角（樣本量到的邊距是右 4／下 6 與右 14／下 23），
    // 所以每個 scale 只在「模板尺寸 + NOTEBOOK_CORNER_PAD」的角落方塊裡找，
    // 而不是整個 500×200 都掃。這同時擋掉「海報底部有一行小字」這類誤報。
    var pad = opts.cornerPad != null ? opts.cornerPad : NOTEBOOK_CORNER_PAD;
    var best = null;
    for (var i = 0; i < scales.length; i++) {
      var s = scales[i];
      var tw = Math.round(tpl.width * s), th = Math.round(tpl.height * s);
      if (tw < 4 || th < 3 || tw > rw || th > rh) continue;
      var scaled = resizeGray(tpl.alpha, tpl.width, tpl.height, tw, th);

      // 由 region 右下角裁出這個 scale 的搜尋方塊
      var sw = Math.min(rw, tw + pad), sh = Math.min(rh, th + pad);
      var ox = rw - sw, oy = rh - sh;
      var sub = region;
      if (sw !== rw || sh !== rh) {
        sub = new Float32Array(sw * sh);
        for (var yy = 0; yy < sh; yy++) {
          var srcOff = (oy + yy) * rw + ox;
          for (var xx = 0; xx < sw; xx++) sub[yy * sw + xx] = region[srcOff + xx];
        }
      }

      var m = matchTemplate(sub, sw, sh, scaled, tw, th);
      if (m.score <= -2) continue;
      if (!best || m.score > best.score) {
        best = {
          score: m.score, x: rx + ox + m.x, y: ry + oy + m.y,
          width: tw, height: th, scale: s, alpha: scaled
        };
      }
    }
    if (!best) return { found: false, score: -1, slope: 0 };

    // 振幅檢查：把命中框的 darkness 對模板 alpha 做回歸，斜率≈「文字全黑處壓暗多少」。
    // 真浮水印是近黑文字（樣本 249 與 132），而大片純色底上的 JPEG 雜訊
    // 雖然也能湊出 0.54 的相關，斜率卻只有 0.5 —— 用斜率把這類假訊號擋掉。
    var bn = best.width * best.height;
    var bwin = windowLuminance(img, best.x, best.y, best.width, best.height);
    for (var bi = 0; bi < bn; bi++) bwin[bi] = 255 - bwin[bi];
    var reg = pearson(best.alpha, bwin, bn);
    best.slope = reg.slope;
    best.found = best.score >= threshold && reg.slope >= NOTEBOOK_MIN_SLOPE;
    return best;
  }

  /**
   * 去除 Notebook 文字浮水印（原地修改）。
   * method:
   *   'hybrid' — alpha≤0.75 走反向 alpha（墨色黑 0：original = watermarked/(1-alpha)），
   *              alpha>0.75 膨脹 1px 後 inpaint
   *   'inpaint' — alpha>eps 全部膨脹 1px 後 inpaint（預設，實測 PSNR 略勝）
   */
  function removeNotebook(img, det, opts) {
    opts = opts || {};
    var method = opts.method || 'inpaint';
    var W = img.width, H = img.height, d = img.data;
    var a = det.alpha, bw = det.width, bh = det.height;
    var mask = new Uint8Array(W * H);
    var eps = opts.eps != null ? opts.eps : 0.02;
    var split = opts.split != null ? opts.split : NOTEBOOK_ALPHA_SPLIT;

    for (var r = 0; r < bh; r++) {
      var y = det.y + r;
      if (y < 0 || y >= H) continue;
      for (var c = 0; c < bw; c++) {
        var x = det.x + c;
        if (x < 0 || x >= W) continue;
        var av = a[r * bw + c];
        if (av <= eps) continue;
        if (method === 'inpaint') { mask[y * W + x] = 1; continue; }
        if (av > split) { mask[y * W + x] = 1; continue; }
        var idx = (y * W + x) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var v = d[idx + ch] / (1 - av);
          d[idx + ch] = v < 0 ? 0 : (v > 255 ? 255 : Math.round(v));
        }
      }
    }
    // 膨脹半徑：規格原訂 1px，但實測 JPEG 壓縮的振鈴與去鋸齒暈開會超出模板 alpha 支撐區，
    // 3px 時 ROI PSNR 由 46.75 升到 50.04 dB 且 JPEG 樣本目視完全無殘影（4px 以上不再改善）。
    var dil = opts.dilate != null ? opts.dilate : 3;
    var box = { x: det.x, y: det.y, width: bw, height: bh };
    mask = dilateMask(mask, W, H, dil, box);
    var pad = dil + 2;
    inpaint(img, mask, {
      iterations: opts.iterations, finalIterations: opts.finalIterations, pad: opts.pad,
      bounds: {
        x: box.x - pad, y: box.y - pad,
        width: box.width + pad * 2, height: box.height + pad * 2
      }
    });
    return img;
  }

  // ── Inpainting：多尺度正規化卷積填補 ────────────────────────────────────

  /**
   * 3x3 方形結構元素膨脹，iterations 次。
   * bounds（{x,y,width,height}）可選：已知遮罩只落在某矩形內時傳進來，
   * 就不必為了幾百個像素掃過整張圖（大圖上差好幾百毫秒）。
   */
  function dilateMask(mask, w, h, iterations, bounds) {
    var iters = iterations || 1;
    var bx0 = 0, by0 = 0, bx1 = w - 1, by1 = h - 1;
    if (bounds) {
      bx0 = Math.max(0, bounds.x - iters); by0 = Math.max(0, bounds.y - iters);
      bx1 = Math.min(w - 1, bounds.x + bounds.width - 1 + iters);
      by1 = Math.min(h - 1, bounds.y + bounds.height - 1 + iters);
    }
    var cur = mask;
    for (var it = 0; it < iters; it++) {
      var out = new Uint8Array(w * h);
      for (var y = by0; y <= by1; y++) {
        for (var x = bx0; x <= bx1; x++) {
          if (!cur[y * w + x]) continue;
          for (var dy = -1; dy <= 1; dy++) {
            var yy = y + dy; if (yy < 0 || yy >= h) continue;
            for (var dx = -1; dx <= 1; dx++) {
              var xx = x + dx; if (xx < 0 || xx >= w) continue;
              out[yy * w + xx] = 1;
            }
          }
        }
      }
      cur = out;
    }
    return cur;
  }

  var GK = [1, 4, 6, 4, 1];  // 5x5 高斯核（可分離）

  /**
   * 多尺度正規化卷積填補（原地修改 img）。
   * @param {object} img RGBA
   * @param {Uint8Array} mask 長度 w*h，1 = 待填補
   * @param {object} [opts] { iterations = 8, finalIterations = 3, pad = 12 }
   */
  function inpaint(img, mask, opts) {
    opts = opts || {};
    var iterations = opts.iterations || 8;
    var finalIterations = opts.finalIterations != null ? opts.finalIterations : 3;
    var W = img.width, H = img.height;

    // 取遮罩外接框並外擴，只在小區塊上運算。
    // opts.bounds 是呼叫端已知的遮罩範圍（例如浮水印偵測框），
    // 有它就不必掃過整張圖找 bbox。
    var sx0 = 0, sy0 = 0, sx1 = W - 1, sy1 = H - 1;
    if (opts.bounds) {
      sx0 = Math.max(0, opts.bounds.x); sy0 = Math.max(0, opts.bounds.y);
      sx1 = Math.min(W - 1, opts.bounds.x + opts.bounds.width - 1);
      sy1 = Math.min(H - 1, opts.bounds.y + opts.bounds.height - 1);
    }
    var minX = W, minY = H, maxX = -1, maxY = -1;
    for (var y = sy0; y <= sy1; y++) {
      for (var x = sx0; x <= sx1; x++) {
        if (mask[y * W + x]) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return img;
    var holeW = maxX - minX + 1, holeH = maxY - minY + 1;
    // 外擴要夠大，金字塔才有足夠的已知像素當養分
    var pad = Math.max(opts.pad || 12, Math.ceil(Math.min(holeW, holeH) * 0.75) + 4);
    var x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
    var x1 = Math.min(W - 1, maxX + pad), y1 = Math.min(H - 1, maxY + pad);
    var w = x1 - x0 + 1, h = y1 - y0 + 1;

    // 取出子區塊：val（已知色，未知填 0）與 wt（1 已知 / 0 未知）
    var val = new Float32Array(w * h * 3);
    var wt = new Float32Array(w * h);
    var d = img.data;
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        var gi = (y0 + yy) * W + (x0 + xx);
        var li = yy * w + xx;
        if (mask[gi]) { wt[li] = 0; continue; }
        wt[li] = 1;
        var si = gi * 4, di = li * 3;
        val[di] = d[si]; val[di + 1] = d[si + 1]; val[di + 2] = d[si + 2];
      }
    }

    // 建金字塔，縮到遮罩區短邊 ≤ 4px
    var levels = [{ w: w, h: h, val: val, wt: wt }];
    var lw = w, lh = h, hw = holeW, hh = holeH;
    while (Math.min(hw, hh) > 4 && lw > 8 && lh > 8 && levels.length < 12) {
      var nw = Math.max(1, lw >> 1), nh = Math.max(1, lh >> 1);
      var prev = levels[levels.length - 1];
      var nval = new Float32Array(nw * nh * 3), nwt = new Float32Array(nw * nh);
      for (var ny = 0; ny < nh; ny++) {
        for (var nx = 0; nx < nw; nx++) {
          var sw = 0, s0 = 0, s1 = 0, s2 = 0;
          for (var ky = 0; ky < 2; ky++) {
            var py = ny * 2 + ky; if (py >= prev.h) continue;
            for (var kx = 0; kx < 2; kx++) {
              var px = nx * 2 + kx; if (px >= prev.w) continue;
              var pi = py * prev.w + px, pw = prev.wt[pi];
              if (pw <= 0) continue;
              sw += pw;
              s0 += prev.val[pi * 3] * pw;
              s1 += prev.val[pi * 3 + 1] * pw;
              s2 += prev.val[pi * 3 + 2] * pw;
            }
          }
          var ni = ny * nw + nx;
          if (sw > 0) {
            nval[ni * 3] = s0 / sw; nval[ni * 3 + 1] = s1 / sw; nval[ni * 3 + 2] = s2 / sw;
            nwt[ni] = Math.min(1, sw / 4);
          }
        }
      }
      levels.push({ w: nw, h: nh, val: nval, wt: nwt });
      lw = nw; lh = nh; hw = hw / 2; hh = hh / 2;
    }

    // 最粗層：未知像素填已知像素平均
    var top = levels[levels.length - 1];
    fillWithMean(top);
    smooth(top, iterations);

    // 逐層放大 → 初始化 → 迭代
    for (var L = levels.length - 2; L >= 0; L--) {
      var cur = levels[L], coarse = levels[L + 1];
      upsampleInto(coarse, cur);
      smooth(cur, L === 0 ? iterations + finalIterations : iterations);
    }

    // 寫回原圖（只改遮罩內像素）
    var res = levels[0];
    for (var yy2 = 0; yy2 < h; yy2++) {
      for (var xx2 = 0; xx2 < w; xx2++) {
        var gi2 = (y0 + yy2) * W + (x0 + xx2);
        if (!mask[gi2]) continue;
        var li2 = yy2 * w + xx2, si2 = gi2 * 4;
        d[si2] = clamp255(res.val[li2 * 3]);
        d[si2 + 1] = clamp255(res.val[li2 * 3 + 1]);
        d[si2 + 2] = clamp255(res.val[li2 * 3 + 2]);
      }
    }
    return img;
  }

  function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : Math.round(v)); }

  function fillWithMean(level) {
    var n = level.w * level.h, s0 = 0, s1 = 0, s2 = 0, sw = 0;
    for (var i = 0; i < n; i++) {
      if (level.wt[i] <= 0) continue;
      sw += level.wt[i];
      s0 += level.val[i * 3] * level.wt[i];
      s1 += level.val[i * 3 + 1] * level.wt[i];
      s2 += level.val[i * 3 + 2] * level.wt[i];
    }
    if (sw <= 0) { s0 = s1 = s2 = 128; sw = 1; }
    for (var j = 0; j < n; j++) {
      if (level.wt[j] > 0) continue;
      level.val[j * 3] = s0 / sw; level.val[j * 3 + 1] = s1 / sw; level.val[j * 3 + 2] = s2 / sw;
    }
  }

  /** 把粗層結果雙線性放大，當作細層未知像素的初始值。 */
  function upsampleInto(coarse, fine) {
    var sx = coarse.w / fine.w, sy = coarse.h / fine.h;
    for (var y = 0; y < fine.h; y++) {
      var fy = Math.min(coarse.h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
      var y0 = Math.floor(fy), y1 = Math.min(coarse.h - 1, y0 + 1), ty = fy - y0;
      for (var x = 0; x < fine.w; x++) {
        var fi = y * fine.w + x;
        if (fine.wt[fi] > 0) continue;
        var fx = Math.min(coarse.w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
        var x0 = Math.floor(fx), x1 = Math.min(coarse.w - 1, x0 + 1), tx = fx - x0;
        for (var c = 0; c < 3; c++) {
          var v00 = coarse.val[(y0 * coarse.w + x0) * 3 + c];
          var v01 = coarse.val[(y0 * coarse.w + x1) * 3 + c];
          var v10 = coarse.val[(y1 * coarse.w + x0) * 3 + c];
          var v11 = coarse.val[(y1 * coarse.w + x1) * 3 + c];
          var a = v00 + (v01 - v00) * tx;
          var b = v10 + (v11 - v10) * tx;
          fine.val[fi * 3 + c] = a + (b - a) * ty;
        }
      }
    }
  }

  /**
   * onion-peel 加權鄰域平均：只更新未知像素，
   * 權重 = 5x5 高斯 × 置信度（已知 1.0、已填 0.35），已知像素永遠不動。
   */
  function smooth(level, iterations) {
    var w = level.w, h = level.h, n = w * h;
    var hasHole = false;
    for (var i = 0; i < n; i++) if (level.wt[i] <= 0) { hasHole = true; break; }
    if (!hasHole) return;
    var conf = new Float32Array(n);
    for (var k = 0; k < n; k++) conf[k] = level.wt[k] > 0 ? level.wt[k] : 0.35;
    var next = new Float32Array(level.val.length);

    for (var it = 0; it < iterations; it++) {
      next.set(level.val);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var pi = y * w + x;
          if (level.wt[pi] > 0) continue;
          var acc0 = 0, acc1 = 0, acc2 = 0, accw = 0;
          for (var dy = -2; dy <= 2; dy++) {
            var yy = y + dy; if (yy < 0 || yy >= h) continue;
            var gy = GK[dy + 2];
            for (var dx = -2; dx <= 2; dx++) {
              var xx = x + dx; if (xx < 0 || xx >= w) continue;
              var qi = yy * w + xx;
              var wq = gy * GK[dx + 2] * conf[qi];
              if (wq <= 0) continue;
              acc0 += level.val[qi * 3] * wq;
              acc1 += level.val[qi * 3 + 1] * wq;
              acc2 += level.val[qi * 3 + 2] * wq;
              accw += wq;
            }
          }
          if (accw <= 0) continue;
          next[pi * 3] = acc0 / accw;
          next[pi * 3 + 1] = acc1 / accw;
          next[pi * 3 + 2] = acc2 / accw;
        }
      }
      level.val.set(next);
    }
  }

  // ── C. 手動框選 ─────────────────────────────────────────────────────────

  /** 對一組矩形做 inpaint（原地修改）。rects: [{x,y,width,height}] */
  function inpaintRects(img, rects, opts) {
    if (!rects || !rects.length) return img;
    var W = img.width, H = img.height;
    var mask = new Uint8Array(W * H);
    var bx0 = W, by0 = H, bx1 = -1, by1 = -1;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var rx0 = Math.max(0, Math.round(r.x)), ry0 = Math.max(0, Math.round(r.y));
      var rx1 = Math.min(W - 1, Math.round(r.x + r.width) - 1);
      var ry1 = Math.min(H - 1, Math.round(r.y + r.height) - 1);
      for (var y = ry0; y <= ry1; y++) for (var x = rx0; x <= rx1; x++) mask[y * W + x] = 1;
      if (rx0 < bx0) bx0 = rx0; if (ry0 < by0) by0 = ry0;
      if (rx1 > bx1) bx1 = rx1; if (ry1 > by1) by1 = ry1;
    }
    if (bx1 < bx0) return img;
    opts = opts || {};
    opts.bounds = { x: bx0, y: by0, width: bx1 - bx0 + 1, height: by1 - by0 + 1 };
    return inpaint(img, mask, opts);
  }

  // ── 高階流程 ────────────────────────────────────────────────────────────

  /**
   * 自動處理一張影像（原地修改），回傳偵測報告。
   * @param {object} img RGBA
   * @param {object} res 資源 { alpha48, alpha96, notebook:{alpha,width,height} }
   * @param {object} [opts] {
   *   mode: 'auto'|'nano'|'notebook'|'none',
   *   forceNano: '48'|'96'|'compact',
   *   notebookMethod: 'inpaint'|'hybrid',
   *   nanoThreshold, notebookThreshold
   * }
   */
  function processImage(img, res, opts) {
    opts = opts || {};
    var mode = opts.mode || 'auto';
    var report = { type: 'none', applied: [], nano: null, notebook: null };
    if (mode === 'none') return report;

    if (mode === 'auto' || mode === 'notebook') {
      if (res.notebook) {
        var nb = detectNotebook(img, res.notebook, {
          threshold: opts.notebookThreshold
        });
        report.notebook = { found: nb.found, score: nb.score, scale: nb.scale, x: nb.x, y: nb.y, width: nb.width, height: nb.height };
        if (nb.found) {
          removeNotebook(img, nb, { method: opts.notebookMethod || 'inpaint' });
          report.type = 'notebook';
          report.applied.push('notebook');
        }
      }
    }

    if (mode === 'auto' || mode === 'nano') {
      var force = opts.forceNano || (mode === 'nano' ? null : null);
      var nano = detectNanoBanana(img, res, {
        threshold: opts.nanoThreshold, force: force
      });
      report.nano = { found: nano.found, score: nano.score, slope: nano.slope, variant: nano.variant, geometry: nano.geometry };
      if (nano.found) {
        removeNanoBanana(img, nano.alpha, nano.geometry);
        report.type = report.type === 'notebook' ? 'both' : 'nano';
        report.applied.push('nano');
      }
    }
    return report;
  }

  /** PSNR（給測試用）。兩張影像必須同尺寸；只比 RGB。 */
  function psnr(a, b, rect) {
    var W = a.width, x0 = 0, y0 = 0, x1 = a.width, y1 = a.height;
    if (rect) {
      x0 = Math.max(0, rect.x); y0 = Math.max(0, rect.y);
      x1 = Math.min(a.width, rect.x + rect.width); y1 = Math.min(a.height, rect.y + rect.height);
    }
    var se = 0, n = 0;
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var i = (y * W + x) * 4;
        for (var c = 0; c < 3; c++) { var d = a.data[i + c] - b.data[i + c]; se += d * d; n++; }
      }
    }
    if (n === 0) return 0;
    var mse = se / n;
    return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
  }

  return {
    // 常數
    NANO_SCORE_THRESHOLD: NANO_SCORE_THRESHOLD,
    NOTEBOOK_SCORE_THRESHOLD: NOTEBOOK_SCORE_THRESHOLD,
    NOTEBOOK_SCALES: NOTEBOOK_SCALES,
    NOTEBOOK_MIN_SLOPE: NOTEBOOK_MIN_SLOPE,
    NANO_MIN_SLOPE: NANO_MIN_SLOPE,
    // 工具
    createImage: createImage,
    cloneImage: cloneImage,
    luminance: luminance,
    windowLuminance: windowLuminance,
    alphaMapFromRGB: alphaMapFromRGB,
    alphaMapFromGray: alphaMapFromGray,
    resizeGray: resizeGray,
    dilateMask: dilateMask,
    boxBlur: boxBlur,
    pearson: pearson,
    psnr: psnr,
    // 幾何
    legacyGeometry: legacyGeometry,
    legacyGeometryScaled: legacyGeometryScaled,
    NANO_LEGACY_SCALES: NANO_LEGACY_SCALES,
    compactGeometry: compactGeometry,
    geometryFor: geometryFor,
    alphaForSize: alphaForSize,
    // 演算法
    detectNanoBanana: detectNanoBanana,
    removeNanoBanana: removeNanoBanana,
    detectNotebook: detectNotebook,
    removeNotebook: removeNotebook,
    matchTemplate: matchTemplate,
    inpaint: inpaint,
    inpaintRects: inpaintRects,
    processImage: processImage
  };
});
