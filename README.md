# 鏡頭體感復健遊戲

職能治療師設計的鏡頭體感復健遊戲。不用買設備、不用穿戴任何東西，一台手機或電腦，打開鏡頭就能玩。

**▶ 開始玩：https://tim-healjoy.github.io/ot-games/**

由 [施昱廷 職能治療師](https://www.facebook.com/shihyuting.OT) 設計與開發。

---

## 目前上線

### 🔨 打地鼠 — [立即遊玩](https://tim-healjoy.github.io/ot-games/mole/)

地鼠從洞裡冒出來，把手伸過去打下去就得分。訓練上肢伸取、快速反應、坐姿平衡與跨中線協調。

- **患側訓練**：可指定只練患側手，把伸取動作逼出來
- **活動範圍校正**：開場先量測長輩實際可及範圍，手抬不高也能玩滿整個畫面
- **復能報表**：每局結束產生治療師版報表——平均／最快反應時間、命中率與最長連擊、反應穩定度（CV）、疲勞指數、患側使用率、跨中線次數，附本局反應時間趨勢與跨次趨勢，可列印或存 PDF
- **開場動作示範**：用插圖說明坐姿、手部與軀幹動作，以及這款遊戲在訓練什麼

### 陸續整理中

摘星星（雙側伸取）、豐收果園（動作結合認知，適合失智與 MCI 族群）、虛擬拔河（雙人對戰）。

---

## 怎麼玩

1. 用手機或電腦打開遊戲連結（建議 Chrome 或 Safari）
2. 允許使用相機
3. 選患側與難度 → 校正活動範圍 → 開始

**建議環境**：坐正、上半身入鏡、光線充足、背景單純。全程坐著玩即可。

## 隱私

影像全部在你自己的裝置上運算，**不會上傳、不會儲存、不會錄影**。遊戲畫面只顯示手部骨架與遊戲元素，不會顯示臉部。

## 技術

單一 HTML 檔，無後端。手部追蹤使用 [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) 的 HandLandmarker，座標在 pixel space 以 One-Euro 濾波器平滑。

## 回饋

這些遊戲還在持續調整，**非常歡迎你的建議**——哪裡卡卡的、長輩玩起來哪裡不順、想要什麼功能，都歡迎：

- 到 [Issues](https://github.com/Tim-HealJoy/ot-games/issues) 開一則
- 或直接到 [粉絲專頁](https://www.facebook.com/shihyuting.OT) 留言給我

## 授權

- **遊戲程式碼**：著作權由作者保留，免費提供個人、家庭與臨床照顧現場使用。歡迎自由分享連結。（正式的開源授權條款規劃中）
- **打地鼠背景音樂**：*Monkeys Spinning Monkeys* — Kevin MacLeod (incompetech.com)，授權 [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
