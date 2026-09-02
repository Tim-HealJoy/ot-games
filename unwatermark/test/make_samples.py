#!/usr/bin/env python3
"""合成 Nano Banana 星星浮水印測試樣本（三種幾何各一張）。

混合模型：watermarked = alpha*255 + (1-alpha)*original
alpha map 由 bg_48 / bg_96 取每像素 RGB 最大值 / 255；
compact 幾何的 alpha map 用 96px 版做面積平均縮放（96→size）。
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
OUT = os.path.join(HERE, 'samples')
SRC = '/Users/tim/Downloads/高齡友善環境設計課程_無浮水印.png'

os.makedirs(OUT, exist_ok=True)


def alpha_map(path):
    a = np.array(Image.open(path).convert('RGB')).astype(np.float32)
    return a.max(axis=2) / 255.0


def area_resize(alpha, size):
    """面積平均縮放（與 engine.js 的 resizeGray 縮小路徑等價）。"""
    src = alpha.shape[0]
    ys = (np.arange(size) * src / size, (np.arange(size) + 1) * src / size)
    out = np.zeros((size, size), np.float32)
    for r in range(size):
        r0, r1 = ys[0][r], ys[1][r]
        for c in range(size):
            c0, c1 = ys[0][c], ys[1][c]
            tot = 0.0
            wtot = 0.0
            for i in range(int(np.floor(r0)), int(np.ceil(r1))):
                wy = min(r1, i + 1) - max(r0, i)
                if wy <= 0:
                    continue
                for j in range(int(np.floor(c0)), int(np.ceil(c1))):
                    wx = min(c1, j + 1) - max(c0, j)
                    if wx <= 0:
                        continue
                    tot += alpha[i, j] * wy * wx
                    wtot += wy * wx
            out[r, c] = tot / wtot if wtot else 0.0
    return out


a48 = alpha_map(os.path.join(ASSETS, 'bg_48.png'))
a96 = alpha_map(os.path.join(ASSETS, 'bg_96.png'))

base = Image.open(SRC).convert('RGB')

CASES = [
    # (名稱, 目標尺寸, 幾何)
    ('nano_96', (1400, 1200), 'legacy96'),
    ('nano_48', (800, 600), 'legacy48'),
    ('nano_compact', (1408, 768), 'compact'),
]

for name, (W, H), kind in CASES:
    img = base.resize((W, H), Image.LANCZOS)
    arr = np.array(img).astype(np.float32)
    if kind == 'legacy96':
        size, margin, alpha = 96, 64, a96
    elif kind == 'legacy48':
        size, margin, alpha = 48, 32, a48
    else:
        base_side = min(W, H)
        size = max(8, round(base_side / 32))
        margin = round(base_side / 16)
        alpha = area_resize(a96, size)
    x, y = W - margin - size, H - margin - size
    Image.fromarray(arr.astype(np.uint8)).save(os.path.join(OUT, name + '_clean.png'))
    sub = arr[y:y + size, x:x + size]
    a3 = alpha[:, :, None]
    arr[y:y + size, x:x + size] = a3 * 255.0 + (1.0 - a3) * sub
    Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8)).save(
        os.path.join(OUT, name + '_wm.png'))
    print('%s  %dx%d  size=%d margin=%d  pos=(%d,%d)  alpha_max=%.3f'
          % (name, W, H, size, margin, x, y, alpha.max()))

# 誤判測試用的乾淨圖（不同尺寸各一張，皆無任何浮水印）
for name, (W, H) in [('clean_1400x1200', (1400, 1200)),
                     ('clean_800x600', (800, 600)),
                     ('clean_1408x768', (1408, 768))]:
    base.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, name + '.png'))
print('乾淨對照圖已產出')
