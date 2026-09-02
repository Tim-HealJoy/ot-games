# AI 浮水印清除器 — 測試結果

- 日期：2026-09-02
- 環境：macOS 24.6.0／Node v24.15.0（`/Users/tim/.nvm/versions/node/v24.15.0/bin/node`）／Chrome headless（CDP 驅動）
- 受測程式：`unwatermark/engine.js`、`unwatermark/index.html`
- 結論：**規格書列的 7 項測試全部通過。**

## 怎麼重跑

```bash
# 1. 產生合成樣本與 PPTX／PDF 測試檔（會寫進 test/samples/、test/fixtures/）
python3 test/make_samples.py
python3 test/make_fixtures.py

# 2. Node 端演算法測試（測試 1～4）
/Users/tim/.nvm/versions/node/v24.15.0/bin/node test/run.js

# 3. 起靜態站，跑瀏覽器實測（測試 5～7）
python3 -m http.server 8795 --directory ~/ot-games &
/Users/tim/.nvm/versions/node/v24.15.0/bin/node test/shoot.js   # 截圖存 test/shots/
#    PPTX／PDF 產出的驗證：先用瀏覽器跑一次流程把結果存進 test/out/，再跑
python3 test/verify_outputs.py
```

`test/node_modules/`、`out/`、`fixtures/`、`samples/` 都在 `.gitignore` 內（皆為可重新產生的檔案）。

---

## 測試 1：Gemini Notebook 對照組（PNG）

樣本：`~/Downloads/高齡友善環境設計課程.png`（2752×1536，有浮水印）
對照：`~/Downloads/高齡友善環境設計課程_無浮水印.png`（同一張，乾淨）

| 項目 | 結果 |
|---|---|
| 偵測分數（TM_CCOEFF_NORMED） | **0.9999**（門檻 0.55） |
| 命中位置／尺寸／scale | (2544, 1502)／204×28／1.0 |
| 文字振幅（darkness 對 alpha 的回歸斜率） | 249.2 |
| 偵測耗時 | 33 ms |
| 未處理時的 ROI PSNR | 10.67 dB |
| **純 inpaint** ROI PSNR | **50.04 dB**（全圖 76.73 dB，ROI 最大誤差 5，耗時 25 ms） |
| 混合式 hybrid ROI PSNR | 49.76 dB（全圖 76.44 dB，ROI 最大誤差 5，耗時 18 ms） |

ROI = 偵測框外擴 8px。**目標 ≥ 45 dB：✅ 通過（50.04 dB）。**

### 兩種去除法擇優 → 預設採「純 inpaint」

- PSNR 差 0.28 dB，統計上等價；殘影峰值兩者同為 5。
- 目視 200%（`shots/notebook_*_zoom200.png`）：膨脹 3px 後兩者都看不出字形，只剩不成結構的極淡色塊。
- 決勝理由是**穩健性**：hybrid 的反向 alpha 步驟假設浮水印是純黑（墨色 0），來源若換成別的灰階、或被 JPEG 壓縮位移，就會把該處過度提亮；inpaint 不吃這個假設。
- hybrid 仍保留在 `engine.removeNotebook(img, det, {method:'hybrid'})`，隨時可切回來比較。

目視檔案：`shots/notebook_before_zoom200.png`（處理前）、`notebook_inpaint_zoom200.png`、`notebook_hybrid_zoom200.png`、`notebook_clean_zoom200.png`（乾淨對照）。

## 測試 2：Gemini Notebook JPEG

樣本：`~/Downloads/Gemini_Generated_Image_yqmsxjyqmsxjyqms.jpeg`（2730×1536）

| 項目 | 結果 |
|---|---|
| 偵測分數 | **0.8255**（規格預期 ≈ 0.8）✅ |
| scale | **1.0** ✅ |
| 命中位置／尺寸 | (2512, 1485)／204×28 |
| 文字振幅 | 131.5 |
| 命中框內亮度（處理前） | min 20.0／mean 219.9 |
| 命中框內亮度（處理後） | **min 252.0／mean 254.9** |

框內最暗值從 20 拉回 252（幾乎等於周圍白底），代表黑字整段被填掉。目視 200%：`shots/jpeg_before_zoom200.png` vs `shots/jpeg_after_zoom200.png`，處理後無殘影。✅

## 測試 3：Nano Banana 合成樣本（三種幾何）

用 `test/make_samples.py` 依混合模型 `watermarked = alpha×255 + (1−alpha)×original` 合成。

| 樣本 | 尺寸 | 偵測 variant | 分數 | 還原後最大誤差 | 區域 PSNR | 判定 |
|---|---|---|---|---|---|---|
| nano_96 | 1400×1200 | 96（預期 96） | 0.3840 | **1**（門檻 ≤2） | 55.54 dB | ✅ |
| nano_48 | 800×600 | 48（預期 48） | 0.5511 | **1** | 55.58 dB | ✅ |
| nano_compact | 1408×768 | compact（預期 compact） | 0.8347 | **1** | 55.12 dB | ✅ |

三種幾何都正確辨識，還原後與原圖的最大誤差都是 1（純四捨五入誤差）。✅

## 測試 4：誤判測試

### 4a. 乾淨對照圖（4 張）

| 圖 | Notebook 分數（門檻 0.55） | 星星分數（門檻 0.32） | 判定 |
|---|---|---|---|
| 高齡友善環境設計課程_無浮水印.png（2752×1536） | 0.2094（振幅 0.6） | 0.0631 | ✅ 無誤報 |
| nano_96_clean.png（1400×1200） | 0.3142（振幅 0.7） | 0.0740 | ✅ 無誤報 |
| nano_48_clean.png（800×600） | 0.3229（振幅 0.6） | 0.1347 | ✅ 無誤報 |
| nano_compact_clean.png（1408×768） | 0.3371（振幅 0.7） | 0.1022 | ✅ 無誤報 |

交叉偵測：有 Notebook 文字浮水印的那張圖，星星偵測器只給 0.0631，不會誤抓。✅

### 4b. 大規模負樣本掃描（額外加測）

掃 `~/Downloads` 內 45 張真實圖片（皆無 AI 浮水印，含照片、海報、投影片、學術圖表）：

| 偵測器 | 誤報張數 | 最高分 | 門檻 | 餘裕 |
|---|---|---|---|---|
| 星星（Nano Banana） | **0** | 0.2244 | 0.32 | 0.096 |
| Gemini Notebook 文字 | **0** | 0.4024 | 0.55 | 0.148 |

**✅ 零誤報。** 正樣本最低分：星星 0.3840、文字 0.8255，與負樣本最高分之間都有清楚間隔。

## 測試 5：PPTX（瀏覽器實測）

樣本：`test/fixtures/watermark_test.pptx`（兩張投影片，一張放星星浮水印 PNG、一張放 Notebook 文字浮水印 JPEG）
流程：瀏覽器上傳 → 自動處理 → 下載 → `test/verify_outputs.py` 驗證

```
✅ ZIP 結構完整（testzip 無損毀項目）
✅ [Content_Types].xml 存在
✅ 圖片檔名與副檔名未被更動：['ppt/media/image1.png', 'ppt/media/image2.jpg']
✅ 檔案清單與原檔完全一致（沒有多／少檔）
✅ XML／rels 全部逐位元組未更動
✅ 兩張圖片內容都被替換過
✅ python-pptx 可正常開啟，投影片數 = 2
✅ 兩張圖片仍在版面上（shape_type=PICTURE 共 2 個）
```

過程中修掉一個問題：JSZip 寫入 `ppt/media/xxx.png` 時會自己補上「`ppt/media/`」資料夾項目，原始 pptx 並沒有。雖然 PowerPoint 吃得下，還是在輸出前把非原有的資料夾項目清掉，讓檔案清單與原檔完全一致。

## 測試 6：PDF（瀏覽器實測）

樣本：`test/fixtures/watermark_test.pdf`（第 1 頁滿版的星星浮水印圖、第 2 頁純文字）

```
✅ 頁數 = 2
✅ 第 1 頁（有浮水印的圖）已轉為單張圖片：圖 1 張、文字 0 字
✅ 第 2 頁仍有文字層，可選取（133 字）
✅ 第 2 頁文字與原檔逐字一致（未被轉成圖片）
✅ 第 2 頁沒有被塞進任何圖片
✅ 第 1 頁星星區平均亮度由 231.81 降到 225.73（白色浮水印已被移除）
✅ 浮水印以外區域 PSNR 99.00 dB（等同無損）
```

卡片顯示「已處理 1／2 頁」，並明確說明「被處理的 1 頁已轉為圖片（文字不可選取）；其餘 1 頁保留原始文字層」。

過程中修掉兩個問題，見文末〈實測過程修掉的問題〉。

## 測試 7：瀏覽器實測與截圖

靜態站：`python3 -m http.server 8795 --directory ~/ot-games`，頁面 `http://localhost:8795/unwatermark/`
（`~/ot-games/.claude/launch.json` 已建立 `ot-games` 設定，port 8795。）

| 截圖 | 內容 |
|---|---|
| `shots/ui_images.png` | 兩張圖上傳 → 自動偵測 →「Nano Banana 星星」「Gemini Notebook 文字」標籤、前後對照滑桿、分數說明、下載鍵 |
| `shots/ui_zoom.png` | 「放大右下角」放大鏡：左半（處理前）看得到 Gemini Notebook 字樣，右半（處理後）乾淨 |
| `shots/ui_manual.png` | 手動框選模式：紅框、標籤變「手動清除 1 區」、框內已被填補 |
| `shots/ui_docs.png` | PDF「已處理 1／2 頁」＋ PPTX「已清除 2／2 張圖」 |
| `shots/ui_mobile.png` | 390px 寬手機版：單欄、按鈕 ≥44px、文字不溢出 |

功能實測結果（同一批檔案跑完整流程）：

| 檔案 | 結果 | 輸出大小 |
|---|---|---|
| nano96_sample.png | ✅ 星星已清除（與乾淨原圖最大誤差 1、PSNR 55.54 dB） | 2,858,369 B |
| notebook_sample.jpeg | ✅ 文字已清除 | 574,215 B |
| watermark_test.pdf | ✅ 已處理 1／2 頁，第 2 頁文字層保留 | 2,019,527 B |
| watermark_test.pptx | ✅ 已清除 2／2 張圖 | 3,459,704 B |
| 全部下載（ZIP） | ✅ 壓縮檔完整、含 4 個檔 | 8.9 MB |

頁面資源全部 200，主控台無錯誤：`/open-in-browser.js`、`engine.js`、三個 alpha 遮罩、`share.png`（OG 圖，放在 `unwatermark/share.png` 以對齊 og:image 網址與站內其他頁面的慣例）。

---

## 實作與規格的差異（都是實測後刻意調整的）

| 項目 | 規格書 | 實作 | 為什麼 |
|---|---|---|---|
| 星星擬合分數 | 亮度減視窗中位數後做 NCC，門檻 0.35 | 亮度與 alpha map **各做一次高通**（減去半徑 size/6 的盒狀模糊）再取皮爾森相關，門檻 **0.32** | 原做法在有紋理／邊緣的底圖上分數被稀釋到 0.23–0.31，反而低於某些乾淨圖的 0.39，兩者重疊無法分開。改高通後正樣本最低 0.384、135 個負樣本視窗最高 0.224 |
| 星星幾何候選 | 48／96／compact 三種 | 舊版幾何改成 **size = 48k、margin = 32k**，k ∈ {0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3}，再加 compact（共 9 種） | 舊版浮水印是固定像素的，圖片被縮放過（PDF 逐頁 render、平台壓縮、使用者縮圖）就整組失準。實測加了 8 段倍率後負樣本最高分仍是 0.224，等於免費。k=1 即 48/32、k=2 即 96/64，與規格完全相容 |
| Notebook 搜尋區 | 右下角固定 500×200 | **每個 scale 各自**在「模板尺寸 + 80px」的角落方塊裡找 | 浮水印一定貼在角落（樣本量到右 4／下 6 與右 14／下 23）。縮小搜尋範圍同時擋掉誤報並讓偵測從 225 ms 降到 33 ms |
| Notebook 判定 | 只看分數 ≥ 0.55 | 加上**文字振幅 ≥ 20** 的檢查 | 大片純色底上的 JPEG 雜訊可以湊出 0.539 的相關分數（差點誤報），但它的振幅只有 0.5；真浮水印是近黑文字，振幅 132～249 |
| inpaint 遮罩膨脹 | 1px | **3px** | JPEG 壓縮的振鈴與去鋸齒暈開會超出模板 alpha 的支撐區。ROI PSNR 由 46.75 升到 50.04 dB，JPEG 樣本目視也從「還有淡影」變成完全乾淨（4px 以上不再改善） |
| PDF render | scale = min(2, 4096/長邊) | 同上，但**沒偵測到時再用 scale 1 試一次** | 固定像素的星星在 2× render 下尺寸也變 2 倍。多數由圖片轉成的 PDF 是 72dpi，scale 1 剛好回到原始像素格 |
| PDF render intent | 未指定 | `intent: 'print'` | pdf.js 的 `display` 繪製迴圈靠 `requestAnimationFrame` 推進，使用者一切到別的分頁整份 PDF 就停住（實測背景分頁 20 秒畫不完一頁）。`print` 走 Promise 排程，切分頁照跑，畫面內容對純圖／文字頁完全相同 |

## 實測過程修掉的問題

1. **前後對照預覽拖垮效能**：原本把整張原尺寸圖 `toDataURL` 兩次當預覽。改成先縮到最長邊 900px 再轉 blob URL。
2. **同一張圖解碼兩次**：加入檔案時解一次、處理時又解一次。改成處理時複製已解碼的 canvas。
   以上兩項合計讓兩張大圖（1400×1200 + 2730×1536）的處理時間從 **12.2 秒降到 1.7 秒**。
3. **pdf.js 在背景分頁停住**：見上表 `intent: 'print'`。
4. **JSZip 多塞資料夾項目**：見測試 5。
5. **放大鏡範圍太大**：原本取右下角 1/3，在 2730×1536 的圖上浮水印小到看不見。改成「至少 280×200、大圖再按短邊等比放大」，剛好蓋住星星（96+64=160）與文字（204+邊距≈224）兩種落點。

## 已知限制

1. **只認得這兩種浮水印。** 其他 AI 工具的浮水印、或位置不在右下角的，要用手動框選。
2. **SynthID 這類隱形浮水印不處理**，也不打算處理。
3. **PDF 是逐頁 render 判斷的**，所以只抓得到「頁面右下角」的浮水印。如果圖片在 PDF 裡是內縮擺放（四周有留白），浮水印就不在頁面角落，偵測不到——這種要先把圖抽出來單獨清。
4. **被處理過的 PDF 頁面會失去文字層**（規格已預期，UI 也有說明）；沒偵測到的頁面則原樣保留。
5. **EXIF 不保留**。圖片重新編碼後拍攝時間、相機型號、GPS 都會消失；JPG 以品質 0.95 輸出。
6. **手動框選大面積會補成平滑漸層**。多尺度正規化卷積填補對 2–3px 的細筆畫接近隱形，但大塊區域只能補出漸層，UI 已提示「大面積建議分多次小框」。
7. **重度壓縮或多次轉存的圖偵測分數會下降**。目前的門檻餘裕（星星 0.096、文字 0.148）是用 45 張真實負樣本量出來的，樣本再多可能需要重新校準。
8. **正樣本數量少**。Notebook 只有 2 個真實樣本（分數 1.000 與 0.826），門檻 0.55 是照規格沿用；若日後遇到漏抓，優先考慮的是降門檻而不是改演算法。
9. **處理跑在主執行緒**。單張大圖約 0.4 秒（偵測 33 ms + 去除 25 ms + 編解碼），批次多檔時畫面會斷斷續續；每個檔案之間有讓出主執行緒更新 UI，但沒有搬到 Web Worker。
