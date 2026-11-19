/* 注意力訓練・填寫對應 題目引擎
 * 圖形、出題、A4 版面、畫到 canvas。index.html（操作頁）與 share.html（分享縮圖）共用。
 * 單位：版面一律用 mm，畫的時候乘上 px/mm。
 */
(function (global) {
  'use strict';

  /* ---------- 圖形（100×100 座標，fg＝圖形色，bg＝格子底色） ---------- */
  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.fill();
  }
  function disc(ctx, cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  function rot(pts, deg) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return pts.map(function (p) { var x = p[0] - 50, y = p[1] - 50; return [50 + x * c - y * s, 50 + x * s + y * c]; });
  }
  var ARROW = [[50, 4], [87, 43], [62, 43], [62, 96], [38, 96], [38, 43], [13, 43]];
  var STAR = (function () {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 20 : 48, a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push([50 + r * Math.cos(a), 53 + r * Math.sin(a)]);
    }
    return pts;
  })();
  var HEART = 'M50,90 C20,68 4,50 4,31 C4,15 16,5 29,5 C39,5 46,11 50,19 C54,11 61,5 71,5 C84,5 96,15 96,31 C96,50 80,68 50,90 Z';
  var CROSS = 'M36,6 H64 V36 H94 V64 H64 V94 H36 V64 H6 V36 H36 Z';

  var SHAPES = {
    circle:   { name: '圓形',     draw: function (c) { disc(c, 50, 50, 42); } },
    triUp:    { name: '三角形',   draw: function (c) { poly(c, [[50, 7], [95, 88], [5, 88]]); } },
    square:   { name: '正方形',   draw: function (c) { poly(c, [[12, 12], [88, 12], [88, 88], [12, 88]]); } },
    star:     { name: '星星',     draw: function (c) { poly(c, STAR); } },
    heart:    { name: '愛心',     draw: function (c) { c.fill(new Path2D(HEART)); } },
    cross:    { name: '十字',     draw: function (c) { c.fill(new Path2D(CROSS)); } },
    diamond:  { name: '菱形',     draw: function (c) { poly(c, [[50, 4], [94, 50], [50, 96], [6, 50]]); } },
    moon:     { name: '月亮',     draw: function (c, bg) { disc(c, 46, 52, 42); c.fillStyle = bg; disc(c, 66, 38, 36); } },
    house:    { name: '房子',     draw: function (c) { poly(c, [[50, 5], [95, 45], [82, 45], [82, 93], [18, 93], [18, 45], [5, 45]]); } },
    bolt:     { name: '閃電',     draw: function (c) { poly(c, [[62, 3], [18, 57], [46, 57], [36, 97], [84, 40], [56, 40], [68, 3]]); } },
    up:       { name: '向上箭頭', draw: function (c) { poly(c, ARROW); } },
    down:     { name: '向下箭頭', draw: function (c) { poly(c, rot(ARROW, 180)); } },
    left:     { name: '向左箭頭', draw: function (c) { poly(c, rot(ARROW, -90)); } },
    right:    { name: '向右箭頭', draw: function (c) { poly(c, rot(ARROW, 90)); } },
    triDown:  { name: '倒三角形', draw: function (c) { poly(c, [[5, 12], [95, 12], [50, 93]]); } },
    diamondO: { name: '空心菱形', draw: function (c, bg) { poly(c, [[50, 4], [94, 50], [50, 96], [6, 50]]); c.fillStyle = bg; poly(c, [[50, 23], [77, 50], [50, 77], [23, 50]]); } },
    halfL:    { name: '左半黑圓', draw: function (c, bg, fg) { disc(c, 50, 50, 44); c.fillStyle = bg; disc(c, 50, 50, 35); c.fillStyle = fg; c.beginPath(); c.arc(50, 50, 36, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fill(); } },
    halfR:    { name: '右半黑圓', draw: function (c, bg, fg) { disc(c, 50, 50, 44); c.fillStyle = bg; disc(c, 50, 50, 35); c.fillStyle = fg; c.beginPath(); c.arc(50, 50, 36, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill(); } }
  };

  // 自訂用的圖形池
  var BASIC = ['circle', 'triUp', 'square', 'star', 'heart', 'cross', 'diamond', 'moon', 'house', 'bolt'];
  var SIMILAR = ['up', 'down', 'left', 'right', 'triUp', 'triDown', 'diamond', 'diamondO', 'halfL', 'halfR'];

  /* ---------- 五個級別（1～3＝簡易版原教案，5＝進階版） ---------- */
  var LEVELS = [
    { no: 1, label: '最簡單', shapes: BASIC.slice(0, 3), cols: 3, rows: 3, perm: true, demo: true, legendBottom: false, similar: false },
    { no: 2, label: '簡單',   shapes: BASIC.slice(0, 4), cols: 4, rows: 3, perm: true, demo: true, legendBottom: false, similar: false },
    { no: 3, label: '中等',   shapes: BASIC.slice(0, 6), cols: 6, rows: 4, perm: true, demo: true, legendBottom: false, similar: false },
    { no: 4, label: '有挑戰', shapes: BASIC.slice(0, 8), cols: 8, rows: 5, perm: false, demo: true, legendBottom: false, similar: false },
    { no: 5, label: '進階',   shapes: SIMILAR.slice(), cols: 10, rows: 6, perm: false, demo: false, legendBottom: true, similar: true }
  ];

  // 自訂參數 → 設定
  function customConfig(o) {
    var n = clamp(o.n, 3, 10), cols = clamp(o.cols, 3, 10);
    var pool = o.similar ? SIMILAR : BASIC;
    return {
      no: 0, label: '自訂', shapes: pool.slice(0, n), cols: cols, rows: clamp(o.rows, 2, 7),
      perm: !!o.perm && cols === n, demo: !!o.demo, legendBottom: !!o.legendBottom, similar: !!o.similar
    };
  }
  function clamp(v, a, b) { v = Math.round(+v || a); return Math.max(a, Math.min(b, v)); }

  /* ---------- 出題 ---------- */
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  // 回傳 rows：第 0 排是示範（若 cfg.demo），其餘是作答排
  function generate(cfg, seed) {
    var r = rng(seed), S = cfg.shapes, n = S.length, total = cfg.rows + (cfg.demo ? 1 : 0);
    var tries, rows;
    if (cfg.perm) {
      // 每排各出現一次、不和對照表同順序、排與排不重複；4 種以上時上下同欄不同圖
      for (tries = 0; tries < 500; tries++) {
        rows = [];
        var guard = 0;
        while (rows.length < total && guard++ < 2000) {
          var p = shuffle(S.slice(), r), key = p.join();
          if (key === S.join() || rows.some(function (x) { return x.join() === key; })) continue;
          if (n > 3 && rows.length && p.some(function (s, i) { return s === rows[rows.length - 1][i]; })) continue;
          rows.push(p);
        }
        if (rows.length === total) return rows;
      }
      return rows;
    }
    // 自由排：左右相鄰不同、上下同欄不同、每種圖形至少在作答區出現一次
    for (tries = 0; tries < 500; tries++) {
      rows = [];
      for (var y = 0; y < total; y++) {
        var row = [];
        for (var x = 0; x < cfg.cols; x++) {
          var cand = S.filter(function (s) {
            return s !== row[x - 1] && !(y > 0 && s === rows[y - 1][x]);
          });
          row.push(cand[Math.floor(r() * cand.length)]);
        }
        rows.push(row);
      }
      var answerRows = cfg.demo ? rows.slice(1) : rows, seen = {};
      answerRows.forEach(function (row) { row.forEach(function (s) { seen[s] = 1; }); });
      if (Object.keys(seen).length === n || cfg.cols * cfg.rows < n) return rows;
    }
    return rows;
  }

  /* ---------- A4 版面 ---------- */
  var FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC",sans-serif';
  var PT = 0.3528; // 1pt = 0.3528mm

  function subtitleOf(cfg) {
    return cfg.no ? '填寫對應　第 ' + cfg.no + ' 級（' + cfg.label + '）' : '填寫對應　自訂（' + cfg.shapes.length + ' 種圖形）';
  }
  function instructionOf(cfg) {
    return (cfg.legendBottom ? '看最下面的' : '看上面的') + '|對照表|，在每個圖形下面的空格，寫上它的號碼。';
  }

  function layout(cfg) {
    var W = 210, H = 297, usable = 188;
    var cellW = Math.min(45, usable / cfg.cols);
    var legendCellW = Math.min(45, usable / cfg.shapes.length);
    var top = cfg.similar ? 58 : 51;
    var bottom = 276; // 頁尾上方
    var capH = 8, gap = 5;
    var captions = 1 + (cfg.demo ? 1 : 0);
    var mainRows = (cfg.rows + (cfg.demo ? 1 : 0)) * 2;
    var avail = bottom - top - captions * capH - gap;
    var rowh = Math.min(20.5, avail / (mainRows + 1.8));
    return {
      W: W, H: H, top: top, capH: capH, gap: gap, rowh: rowh,
      cellW: cellW, tableW: cellW * cfg.cols,
      legendCellW: legendCellW, legendW: legendCellW * cfg.shapes.length,
      sym: Math.min(rowh * 0.66, cellW * 0.58, 16),
      legendSym: Math.min(rowh * 0.66, legendCellW * 0.58, 16),
      num: Math.min(rowh * 0.62, cellW * 0.7, 12.5) // 號碼字高（mm）
    };
  }

  /* ---------- 畫一頁 ---------- */
  // opts: { answer:bool, seed:number, copyNo:number, copies:number, pxPerMm:number, footerUrl:string }
  function drawPage(canvas, cfg, rows, opts) {
    var k = opts.pxPerMm || 8, L = layout(cfg);
    canvas.width = Math.round(L.W * k); canvas.height = Math.round(L.H * k);
    var c = canvas.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    c.fillStyle = '#fff'; c.fillRect(0, 0, L.W, L.H);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';

    function font(w, mm) { c.font = w + ' ' + mm + 'px ' + FONT; }
    var cx = L.W / 2;

    // 標題
    font(700, 28 * PT); c.fillText('注意力訓練', cx, 21);
    font(400, 17 * PT); c.fillText(subtitleOf(cfg) + (opts.answer ? '　— 解答' : ''), cx, 31.5);
    if (opts.copies > 1) {
      font(400, 11 * PT); c.fillStyle = '#555'; c.textAlign = 'right';
      c.fillText('第 ' + opts.copyNo + ' 份', L.W - 11, 12); c.textAlign = 'center'; c.fillStyle = '#000';
    }

    // 說明（「對照表」粗體）
    var parts = instructionOf(cfg).split('|'), sz = 16.5 * PT, y = 44;
    var ws = parts.map(function (t, i) { font(i === 1 ? 700 : 400, sz); return c.measureText(t).width; });
    var x = cx - (ws[0] + ws[1] + ws[2]) / 2;
    c.textAlign = 'left';
    parts.forEach(function (t, i) { font(i === 1 ? 700 : 400, sz); c.fillText(t, x, y); x += ws[i]; });
    c.textAlign = 'center';
    if (cfg.similar) {
      font(700, 13.5 * PT); c.fillText('注意：有些圖形長得很像（例如方向相反的箭頭），請看清楚再寫。', cx, 52);
    }

    function caption(t, yy) { font(400, 12.5 * PT); c.fillStyle = '#444'; c.fillText(t, cx, yy + L.capH - 2.6); c.fillStyle = '#000'; }

    function cell(x0, y0, w, h, bg) {
      if (bg) { c.fillStyle = bg; c.fillRect(x0, y0, w, h); c.fillStyle = '#000'; }
    }
    function shape(name, x0, y0, w, h, size, bg) {
      var s = size / 100;
      c.save();
      c.translate(x0 + (w - size) / 2, y0 + (h - size) / 2);
      c.scale(s, s);
      c.fillStyle = '#000';
      SHAPES[name].draw(c, bg || '#fff', '#000');
      c.restore();
    }
    function number(t, x0, y0, w, h, color) {
      font(600, L.num); c.fillStyle = color || '#000';
      c.textBaseline = 'middle'; c.fillText(String(t), x0 + w / 2, y0 + h / 2 + L.num * 0.05);
      c.textBaseline = 'alphabetic'; c.fillStyle = '#000';
    }
    function grid(x0, y0, colW, nCols, heights, lw, outer) {
      var w = colW * nCols, h = heights.reduce(function (a, b) { return a + b; }, 0);
      c.strokeStyle = '#000'; c.lineWidth = lw;
      c.beginPath();
      for (var i = 1; i < nCols; i++) { c.moveTo(x0 + colW * i, y0); c.lineTo(x0 + colW * i, y0 + h); }
      var yy = y0;
      for (var j = 0; j < heights.length - 1; j++) { yy += heights[j]; c.moveTo(x0, yy); c.lineTo(x0 + w, yy); }
      c.stroke();
      c.lineWidth = outer; c.strokeRect(x0, y0, w, h);
    }

    function drawLegend(y0) {
      caption('對照表', y0);
      var ty = y0 + L.capH, x0 = cx - L.legendW / 2, h1 = L.rowh, h2 = L.rowh * 0.8;
      cfg.shapes.forEach(function (s, i) {
        shape(s, x0 + i * L.legendCellW, ty, L.legendCellW, h1, L.legendSym);
        number(i + 1, x0 + i * L.legendCellW, ty + h1, L.legendCellW, h2);
      });
      grid(x0, ty, L.legendCellW, cfg.shapes.length, [h1, h2], 0.55, 1.0);
      return ty + h1 + h2;
    }

    function drawMain(y0) {
      var yy = y0;
      if (cfg.demo) { caption('第一排（灰色）是示範，請從第二排開始寫', yy); yy += L.capH; }
      var x0 = cx - L.tableW / 2, idx = {}, heights = [];
      cfg.shapes.forEach(function (s, i) { idx[s] = i + 1; });
      rows.forEach(function (row, ri) {
        var demo = cfg.demo && ri === 0, bg = demo ? '#e9e9e9' : null;
        row.forEach(function (s, ci) {
          var xx = x0 + ci * L.cellW;
          cell(xx, yy, L.cellW, L.rowh, bg);
          shape(s, xx, yy, L.cellW, L.rowh, L.sym, bg || '#fff');
          cell(xx, yy + L.rowh, L.cellW, L.rowh, bg);
          if (demo) number(idx[s], xx, yy + L.rowh, L.cellW, L.rowh, '#7a7a7a');
          else if (opts.answer) number(idx[s], xx, yy + L.rowh, L.cellW, L.rowh, '#000');
        });
        heights.push(L.rowh, L.rowh);
        yy += L.rowh * 2;
      });
      grid(x0, y0 + (cfg.demo ? L.capH : 0), L.cellW, cfg.cols, heights, 0.55, 0.9);
      return yy;
    }

    var yNow = L.top;
    if (cfg.legendBottom) {
      yNow = drawMain(yNow);
      drawLegend(yNow + L.gap);
    } else {
      yNow = drawLegend(yNow);
      drawMain(yNow + L.gap);
    }

    // 頁尾
    font(400, 11 * PT); c.fillStyle = '#333';
    c.fillText('教案設計：施昱廷 職能治療師', cx, 287);
    font(400, 9 * PT); c.fillStyle = '#888';
    c.fillText('免費產生更多題目：' + (opts.footerUrl || 'games.otshih.com/match-sheet') + '　｜　題目編號 ' + opts.seed, cx, 292);
    c.fillStyle = '#000';
    return canvas;
  }

  // 預先載入字型（canvas 不會自己等網路字型）
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = '注意力訓練填寫對應第級最簡單有挑戰進階自訂種圖形解答份看上面最下的對照表在每個下空格寫它號碼。，注意有些長得很像例如方向相反箭頭請清楚再示範排灰色從二開始教案設計施昱廷職能治療師免費產生更多題目編號（）—｜0123456789';
    var jobs = ['400', '600', '700'].map(function (w) { return document.fonts.load(w + ' 20px "Noto Sans TC"', sample); });
    return Promise.race([
      Promise.all(jobs),
      new Promise(function (res) { setTimeout(res, 5000); })
    ]).catch(function () {});
  }

  global.MatchSheet = {
    SHAPES: SHAPES, LEVELS: LEVELS, customConfig: customConfig,
    generate: generate, drawPage: drawPage, loadFonts: loadFonts, subtitleOf: subtitleOf
  };
})(window);
