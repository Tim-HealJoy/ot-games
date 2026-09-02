// 測試用的影像讀寫小工具：把 PNG / JPEG 轉成 engine.js 吃的 {width,height,data} 形狀。
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

function readImage(file) {
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') {
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    const raw = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    return { width: raw.width, height: raw.height, data: new Uint8ClampedArray(raw.data) };
  }
  throw new Error('不支援的格式：' + ext);
}

function writePNG(file, img) {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

/** 裁切一塊區域另存（目視放大用，可指定整數倍放大）。 */
function cropScaled(img, x, y, w, h, zoom) {
  zoom = zoom || 1;
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(w, img.width - x); h = Math.min(h, img.height - y);
  const out = { width: w * zoom, height: h * zoom, data: new Uint8ClampedArray(w * zoom * h * zoom * 4) };
  for (let dy = 0; dy < h * zoom; dy++) {
    for (let dx = 0; dx < w * zoom; dx++) {
      const si = ((y + Math.floor(dy / zoom)) * img.width + (x + Math.floor(dx / zoom))) * 4;
      const di = (dy * out.width + dx) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

/** 兩張同尺寸影像的最大絕對誤差（RGB）。 */
function maxAbsDiff(a, b, rect) {
  let x0 = 0, y0 = 0, x1 = a.width, y1 = a.height;
  if (rect) {
    x0 = Math.max(0, rect.x); y0 = Math.max(0, rect.y);
    x1 = Math.min(a.width, rect.x + rect.width); y1 = Math.min(a.height, rect.y + rect.height);
  }
  let m = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * a.width + x) * 4;
      for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a.data[i + c] - b.data[i + c]));
    }
  }
  return m;
}

/** 載入引擎需要的資源（星星 alpha map ×2、Notebook 文字模板）。 */
function loadResources(assetsDir, engine) {
  const bg48 = readImage(path.join(assetsDir, 'bg_48.png'));
  const bg96 = readImage(path.join(assetsDir, 'bg_96.png'));
  const nb = readImage(path.join(assetsDir, 'notebook_text.png'));
  return {
    alpha48: engine.alphaMapFromRGB(bg48),
    alpha96: engine.alphaMapFromRGB(bg96),
    notebook: { alpha: engine.alphaMapFromGray(nb), width: nb.width, height: nb.height }
  };
}

module.exports = { readImage, writePNG, cropScaled, maxAbsDiff, loadResources };
