// PNF 從理論到實務 — 課綱資料
// 影片欄位：{yt:"YouTube ID", title, channel, dur, lang, cc, start, note, timeline:[{t:"mm:ss", text}]}
window.PNF_COURSE = {
  meta: {
    updated: "2026-09-06",
    lead: "PNF（Proprioceptive Neuromuscular Facilitation，本體感覺神經肌肉促進術）是一套用「手、口令、阻力、動作型態」引導病人動出來的治療方法。這門課用國際公開的教學影片搭配中文摘要，從基本程序、對角線型態、手法技術，一路帶到怎麼在翻身、坐站、走路裡帶長輩做。",
    note: "適合：職能治療師、物理治療師、相關科系學生。每課約 15–30 分鐘。建議依序學，並找一位夥伴互相當個案練手感。",
    about: [
      "PNF 的教科書與國際課程（IPNFA）多以英文與德文為主，台灣治療師學 PNF 常卡在兩件事：一是語言，二是課堂示範多為年輕健康受試者，回到臨床要帶的卻是長輩。這門課把兩件事一起解決：每支影片附中文摘要與時間軸，每一課都加「帶長輩怎麼做」與安全提醒。",
      "課程架構參考 IPNFA Level 1–2 的邏輯（哲學與基本程序 → 型態 → 技術 → 功能活動），並把 irradiation（擴散）獨立成一課，再在手法與功能模組反覆帶到，因為它正是 PNF 用在偏癱與衰弱長輩最有力的工具。",
      "先講清楚立場：2025 年 Cochrane 回顧顯示，把任何一個「流派」當成整套療法，效果不如任務導向訓練。所以這門課不把 PNF 當療法，而是當成一組可以嵌進任何功能練習裡的技術——徒手阻力、擴散、時序、抓握與口令。學會它們，是為了讓翻身、坐站、走路這些練習「做得起來」。",
      "影片均為 YouTube 公開內容，本站僅嵌入播放，版權歸原作者。摘要、測驗與長輩應用為本站整理，若與原作者說法不同，以你的臨床判斷與原始教材為準。"
    ]
  },
  modules: [
  /* ===================== 模組 0 ===================== */
  { id:"m0", title:"前導：PNF 是什麼", color:"#8A6A3B",
    intro:"歷史、哲學、神經生理基礎，以及為什麼復能要用它。",
    lessons:[
    { id:"0-1", title:"PNF 的由來與哲學", en:"Philosophy of PNF", minutes:20,
      goals:["說出 PNF 的全名與三個關鍵字各代表什麼","說出 PNF 的五個哲學原則，並舉一個臨床例子","知道 IPNFA 是什麼、Level 1–4 大致在學什麼","說出「PNF 是 concept 不是 method」的意思"],
      pre:`<p>PNF 在 1940 年代由神經科醫師 Herman Kabat 與物理治療師 Margaret Knott 在美國 Kaiser 基金會發展，後由 Dorothy Voss 系統化成教科書。它原本是為小兒麻痺與多發性硬化症病人設計，後來擴展到骨科、神經與高齡族群。今天的國際標準由 IPNFA（International PNF Association）維護，教材以 Adler、Beckers 與 Buck 的《PNF in Practice》為主。</p>`,
      videos:[
        {yt:"tq1abjfwvY0", title:"An Introduction to PNF Technique (Part 1)", channel:"Physio trendz", dur:"7 分", lang:"英文", cc:"自動字幕", note:"先看這支 7 分鐘的整體印象，再看下面 IPNFA 官方的完整演講。示範者為年輕健康人，長輩應用請對照摘要。"},
        {yt:"qCpm2UJrX_Q", title:"Lecture 1 – The PNF Concept (Fred Smedes)", channel:"IPNF Association 官方頻道", dur:"99 分", lang:"英文", cc:"自動字幕", note:"IPNFA 進階講師 Fred Smedes 的第一講：哲學、原則、技術三支柱與動作學習。不必整支看完，依時間軸挑段落。"}
      ],
      summary:{
        keypoints:[
          "<b>Proprioceptive</b>：用本體感覺（肌梭、關節、肌腱的訊號）當輸入；<b>Neuromuscular</b>：目標是神經與肌肉的協調；<b>Facilitation</b>：不是替病人做，而是「讓動作更容易發生」。",
          "五個哲學原則（Smedes, 2022）：①<b>正向取向</b>——從病人做得到的地方開始，用強處帶弱處；②<b>功能取向</b>——治療目標是活動與參與（ICF），不是單一肌肉；③<b>動員儲備能力</b>——用密集、重複、有目標的練習引出病人的潛能；④<b>治療全人</b>——身體、心理與環境一起看；⑤<b>運用動作控制與動作學習原則</b>——注意力放在任務與目標，不放在肌肉。",
          "<b>PNF 是 concept 不是 method</b>：method 是固定流程，concept 是一組原則，允許你依病人狀況組合。所以「PNF ＝ 對角線＋牽拉」是誤解——型態只是 12 項基本程序中的一項。",
          "PNF 的三層工具：<b>基本程序</b>（12 項，分外感覺／本體感覺／程序性三類，模組 1）→ <b>動作型態</b>（對角螺旋，模組 2）→ <b>手法技術</b>（節律啟動、反轉等，模組 3），最後落到<b>功能活動</b>（模組 4）。",
          "IPNFA 課程：PNF 1＋2（共 75 小時，兩年內完成）教基本程序、型態、技術、墊上與步態，並已納入 ICF 與動作學習；PNF 3（37 小時）以 ICF 做臨床推理；PNF 4A／4B 為診斷別專科應用；再往上是 PNF 5 與講師訓練。"
        ],
        elder:[
          "「正向取向」在長輩身上最重要：先找到還做得到的動作（例如健側手臂、軀幹），從那裡開始建立信心。",
          "功能導向＝把「翻身、坐起、站起、走到廁所」當目標，型態與技術只是達成目標的手段。"
        ]
      },
      quiz:[
        {q:"PNF 的「Facilitation」最貼近下列哪個意思？",options:["治療師替病人完成動作","讓動作更容易發生","用最大阻力訓練肌力","被動牽拉關節"],a:1,why:"Facilitation 是「促進」：利用感覺輸入讓病人自己動得更好，而不是替他做或只做被動活動。"},
        {q:"「用健側帶患側」最符合 PNF 哪一個哲學原則？",options:["功能導向","整體觀","正向取向","動員潛能"],a:2,why:"正向取向強調從病人做得到的地方開始，用強處引出弱處，也是 irradiation 的思維基礎。"},
        {q:"下列哪一項不屬於 PNF 的基本程序（basic procedures）？",options:["徒手接觸","口令","節律啟動","最適阻力"],a:2,why:"節律啟動是「技術」（technique），不是基本程序。基本程序是每次操作都在用的底層工具。"},
        {q:"「PNF 是 concept 不是 method」最貼近下列哪個意思？",options:["PNF 沒有固定做法，隨便做都算","PNF 是一組原則，可依病人狀況組合，型態只是其中一項","PNF 只能由講師執行","PNF 不需要證據"],a:1,why:"Concept 允許在原則框架內個別化；把 PNF 化約成對角線與牽拉是常見誤解。"}
      ],
      practice:`<p>找一位夥伴，請他坐著把右手往左上方舉（像戴安全帶）。第一次你完全不碰他；第二次你用手輕貼在他手背與前臂，給一點點阻力，並在動作開始時說「推」。問他兩次的差別——這就是 facilitation 的第一次體驗。</p>`,
      refs:["Adler, S. S., Beckers, D., & Buck, M. (2014). <i>PNF in practice: An illustrated guide</i> (4th ed.). Springer.","Smedes, F. (2022). The essential elements of the PNF-concept, an educational narrative. <i>Journal of Physical Medicine and Rehabilitation, 4</i>(2), 37–48. https://doi.org/10.33696/rehabilitation.4.030","International PNF Association. (2026). <i>Course descriptions</i>. https://www.ipnfa.org/courses/"]
    },
    { id:"0-2", title:"神經生理基礎：為什麼 PNF 有效", en:"Neurophysiological basis", minutes:20,
      goals:["用自己的話解釋 irradiation、successive induction、reciprocal inhibition","說出牽拉反射在 PNF 裡怎麼被利用","知道動作學習三要素如何對應 PNF 的操作"],
      videos:[],
      videoNote:"YouTube 上沒有專門講 Sherrington 三大法則且開放嵌入的教學影片。這一課用下方文字與圖解學，實作作業會讓你用手「摸到」irradiation；想聽講者說明可回 0-1 的 Fred Smedes 演講中段（動作學習與動作控制）。",
      summary:{
        keypoints:[
          "PNF 的理論來自 Sherrington 的脊髓生理：<b>Irradiation（擴散）</b>——刺激夠強時，興奮會擴散到鄰近或對側的運動神經元池，所以對強肌群加阻力，可以帶動弱肌群收縮。",
          "<b>Successive induction（連續誘導）</b>——主動肌收縮之後，拮抗肌的興奮性會暫時提高，所以「先做拮抗肌、再做主動肌」的反轉技術會更有力。",
          "<b>Reciprocal inhibition（交互抑制）</b>——主動肌收縮時，拮抗肌被抑制，用來降低張力與增加活動度。",
          "<b>牽拉反射</b>——快速牽拉肌肉會引發肌梭反射性收縮，PNF 在動作起始用「stretch stimulus」啟動弱肌，並要求病人立刻主動跟上（否則只是反射，不是學習）。",
          "<b>動作學習</b>——大量重複、有意義的任務、適時回饋。PNF 的口令、視覺、阻力，就是即時回饋的來源。"
        ],
        elder:[
          "長輩的反射閾值較高、反應較慢，牽拉刺激要放慢節奏、給足時間，避免用「快」去逼出反射。",
          "偏癱長輩健側常保留良好，irradiation 就是把健側的興奮「借」過去用。"
        ]
      },
      quiz:[
        {q:"對健側下肢施加阻力後，患側下肢出現肌肉收縮，這是哪個原理？",options:["交互抑制","擴散（irradiation）","連續誘導","牽拉反射"],a:1,why:"興奮由強側運動神經元池擴散到對側，是 PNF 間接治療的核心。"},
        {q:"「先讓拮抗肌用力收縮，再做主動肌，主動肌會更有力」是利用什麼？",options:["Successive induction","Reciprocal inhibition","Autogenic inhibition","Irradiation"],a:0,why:"連續誘導：主動肌收縮後拮抗肌興奮性提高，是反轉技術（reversal）的生理基礎。"},
        {q:"用牽拉刺激啟動動作時，最重要的配套是什麼？",options:["牽拉後立刻放手","牽拉後要求病人立刻主動出力","牽拉維持 30 秒","牽拉時避免任何口令"],a:1,why:"牽拉只是啟動，病人必須主動跟上並在阻力下完成動作，才能轉為隨意動作與學習。"}
      ],
      practice:`<p>請夥伴平躺，兩腳伸直。你一手抵住他的健側腳底給阻力，請他「往下踩」，同時把另一手輕放在對側大腿前側，感覺對側是否也有股四頭肌收縮。這就是你第一次「摸到」irradiation。</p>`
    },
    { id:"0-3", title:"PNF 在高齡與神經個案的位置", en:"PNF for older adults & neuro", minutes:15,
      goals:["說出 PNF 在中風、高齡平衡與衰弱的證據到哪裡","知道 PNF 與其他神經復健取向（任務導向訓練等）怎麼搭配","建立「PNF 是工具，不是流派」的心態"],
      videos:[
        {yt:"YxyFZS-v5pE", title:"PNF and Spasticity (IPNFA Online Congress 2022)", channel:"Benedikt Bömer（IPNFA 會長）", dur:"38 分", lang:"英文", cc:"自動字幕", note:"IPNFA 線上研討會演講：痙攣個案的 PNF 處理原則。治療師對治療師的專業演講，依時間軸挑段落看。"},
        {yt:"qoRiOsyBe94", title:"Neurologic Rehab & PNF", channel:"PhysioU", dur:"64 分", lang:"英文", cc:"自動字幕", note:"補充：神經復健與 PNF 的整合應用，舉例偏向年輕神經損傷個案，高齡對照請看摘要。"}
      ],
      summary:{
        keypoints:[
          "<b>中風</b>：Nguyen 等（2022，12 篇 RCT／327 人）顯示 PNF 加在常規治療上，BBS、TUG 與步速皆顯著改善；軀幹訓練（含 PNF）對軀幹控制效果量 1.08（Van Criekinge et al., 2019）。但 2025 年 Cochrane（267 篇／21,838 人）指出：若把「神經生理學取向」當整套療法與其他取向比，IADL 上<b>可能較差</b>（SMD −0.34），而功能性任務訓練較優（SMD 0.58）。",
          "<b>兩件事不衝突</b>：正向證據來自「PNF＋常規」的加法設計，負向來自「以流派取代任務訓練」的替代設計。結論＝PNF 是<b>嵌入任務訓練的技術庫</b>，不是獨立療法。",
          "<b>高齡</b>：目前最乾淨的證據是 da Silva 等（2025）——平均 80.4 歲、8 次／4 週，SPPB ＋1.9、步速 ＋0.20 m/s、五次坐站 −7.8 秒，對照組（同動作無徒手阻力）反而退步；關鍵變因是<b>徒手阻力</b>。但 PNF 與有氧或皮拉提斯比較多為<b>無差異</b>（Kajbafvala et al., 2025; Mesquita et al., 2015）。",
          "<b>誠實的選用理由</b>：不是「PNF 比別的有效」，而是「不需要器材、可在床邊椅邊做、阻力與範圍可依當日狀況即時調整、治療師的手就是回饋」——這在台灣居家與據點的條件下最站得住腳。",
          "現代 PNF 以 <b>ICF</b> 做臨床推理、以<b>動作學習</b>設計練習：先設功能目標，再挑技術，最後回到任務練習。"
        ],
        elder:[
          "衰弱長輩的治療窗很短（容易累），PNF 適合放在啟動與促進階段，之後接大量重複的功能練習。",
          "設定目標時用長輩聽得懂的話：「能自己從床上坐起來」比「增加軀幹屈曲力量」更能引起動機。",
          "對家屬不要說「PNF 能預防跌倒」——目前沒有以跌倒為主要終點的證據。"
        ],
        safety:["心血管疾病長輩避免長時間等長收縮加憋氣（Valsalva），口令用「慢慢推」而不是「用力撐住」。"]
      },
      quiz:[
        {q:"2025 年 Cochrane 回顧對「神經生理學取向（含 PNF）」的結論是？",options:["全面優於其他取向","當整套療法時 IADL 可能較差，功能性任務訓練較優","完全無效","只對上肢有效"],a:1,why:"以流派取代任務訓練的設計結果不利；PNF 應嵌入任務訓練。"},
        {q:"da Silva 等（2025）高齡 RCT 中，PNF 組與對照組唯一的差別是？",options:["動作型態不同","有無徒手阻力","訓練時間長短","有無音樂"],a:1,why:"對照組做同樣的坐站與行走但無徒手阻力，因此差異可歸因於阻力這個 PNF 成分。"},
        {q:"PNF 在衰弱長輩的療程中最適合放在哪個階段？",options:["整堂課只做 PNF","啟動與促進階段，之後接功能練習","治療結束前的放鬆","只在病人躺著時用"],a:1,why:"長輩耐力有限，PNF 的促進效果最適合用來啟動，再轉入任務練習。"}
      ],
      refs:["Todhunter-Brown, A., et al. (2025). Physical rehabilitation approaches for the recovery of function and mobility following stroke. <i>Cochrane Database of Systematic Reviews, 2025</i>(2), CD001920. https://doi.org/10.1002/14651858.CD001920.pub4","Nguyen, P. T., Chou, L. W., & Hsieh, Y. L. (2022). PNF-based physical therapy on the improvement of balance and gait in patients with chronic stroke: A systematic review and meta-analysis. <i>Life, 12</i>(6), 882. https://doi.org/10.3390/life12060882","da Silva, L. G., et al. (2025). Physical functioning improvements in older adults following a PNF-based resisted exercise program: A randomized clinical trial. <i>Journal of Aging and Physical Activity</i>. https://doi.org/10.1123/japa.2024-0403","Kajbafvala, M., et al. (2025). The effect of PNF techniques compared to general aerobic exercise on balance, fear of falling, and quality of life in older adults living in nursing homes. <i>BMC Geriatrics, 25</i>, 200. https://doi.org/10.1186/s12877-025-05822-y","完整清單見 5-1。"]
    }
  ]},

  /* ===================== 模組 1 ===================== */
  { id:"m1", title:"基本程序：PNF 的十二項工具", color:"#3F6293",
    intro:"外感覺三項（觸覺抓握、口令、視覺）、本體感覺六項（阻力、擠壓、牽引、拉長、擴散與強化、型態）、程序性三項（時序、強調時序、身體力學）——每次操作都在用的底層技巧。",
    lessons:[
    { id:"1-1", title:"徒手接觸與身體力學", en:"Manual contact & body mechanics", minutes:25,
      goals:["示範 lumbrical grip 並說出為什麼不用整個手掌抓","站在動作的對角線上，用身體重心而不是手臂給阻力","說出治療師姿勢與病人安全的關係"],
      videos:[
        {yt:"SPYUdNPvrHo", title:"PNF Principles and Procedures (Part 3)", channel:"Physio trendz", dur:"8 分", lang:"英文", cc:"自動字幕", note:"基本程序總覽（1-1 到 1-5 共用這支）：徒手接觸、口令、阻力、牽引擠壓、牽拉、時序都有帶到，用時間軸跳到本課段落。"},
        {yt:"WehC4Af8vXU", title:"PNF Therapy – Everything You Need to Know", channel:"Physio's Healing Touch", dur:"18 分", lang:"英文", cc:"自動字幕", note:"補充：從基本程序到上下肢型態的完整總覽，適合第一次接觸的人。"}
      ],
      summary:{
        keypoints:[
          "<b>徒手接觸（manual contact）</b>：手放在哪裡，病人就往哪裡出力。手要放在<b>動作方向的那一面</b>（例如要病人屈曲，手放在屈側），給的是「方向的資訊」，不是壓迫。",
          "<b>Lumbrical grip（蚓狀肌抓法）</b>：用掌指關節屈曲、指間關節伸直的手型貼合肢體，力量來自手掌而非手指，病人不會痛，治療師也能控制旋轉。",
          "<b>身體力學</b>：治療師站在型態的對角線上，雙腳前後站，阻力來自身體重心移動；手臂與軀幹保持一線，才能給出穩定而且可以持續調整的阻力。",
          "治療師的<b>位置決定阻力方向</b>——站錯位置，就會不自覺地把病人的動作帶偏。"
        ],
        steps:["先決定要促進的型態與方向","站到動作的對角線上，前腳指向動作終點","用 lumbrical grip 貼在動作面，另一手放在近端或遠端做輔助接觸","給阻力時身體重心跟著移動，手臂不單獨用力"],
        mistakes:["用手指抓捏病人皮膚（痛、抑制動作）","雙手都放在遠端，近端沒有控制，動作變成甩","治療師站在病人正前方，阻力變成直線而非對角"],
        elder:["長輩皮膚薄、易瘀青，lumbrical grip 更重要；必要時隔著薄衣物操作。","骨質疏鬆者避免在長骨中段施加旋轉阻力，接觸點放關節附近。"],
        safety:["接觸前先告知並示範，避免驚嚇造成張力升高。"]
      },
      quiz:[
        {q:"要促進手腕伸直時，治療師的手應放在哪裡？",options:["手掌面","手背面","前臂內側","隨便都可以"],a:1,why:"手放在動作方向的那一面（伸側），給病人「往這裡動」的資訊。"},
        {q:"Lumbrical grip 的手型是？",options:["手指完全伸直平貼","掌指關節屈曲、指間關節伸直","握拳","只用指尖"],a:1,why:"掌指屈、指間伸，力量從手掌傳出，能控制旋轉且不捏痛病人。"},
        {q:"治療師給阻力的力量主要應來自？",options:["手指","手臂肌力","身體重心的移動","病人的配合"],a:2,why:"重心移動給出穩定、可持續調整的阻力，也保護治療師的肩與腕。"}
      ],
      practice:`<p>請夥伴坐著、手臂放在桌上。用 lumbrical grip 貼住他手背，請他做腕伸直，你的身體微微後移給阻力。再故意改用手指抓握試一次，問他兩次的感覺差別。最後請他看你的腳站位——你是否站在動作的對角線上？</p>`
    },
    { id:"1-2", title:"口令與視覺回饋", en:"Verbal & visual stimulation", minutes:15,
      goals:["說出三段式口令的結構並示範","調整口令的音量與語氣以促進或放鬆","把視覺引導加進動作型態"],
      videos:[
        {yt:"SPYUdNPvrHo", title:"PNF Principles and Procedures (Part 3)", channel:"Physio trendz", dur:"8 分", lang:"英文", cc:"自動字幕", note:"同 1-1 的總覽影片，跳到口令（verbal command）與視覺（visual stimulation）段落。影片口令是英文（pull／push／hold），中文口令對照見摘要。"}
      ],
      summary:{
        keypoints:[
          "口令三段：①<b>準備</b>（告訴病人要做什麼，例如「等一下把手往上、往外拉到耳朵旁」）②<b>動作</b>（動作開始瞬間、簡短、清楚：「拉！」）③<b>修正</b>（過程中即時調整：「手指張開」「再往外一點」）。",
          "<b>音量與語氣</b>：要促進用力時聲音強而短；要放鬆或處理疼痛時聲音輕而慢。",
          "口令要與<b>牽拉刺激同步</b>：牽拉的瞬間就是說「拉」的瞬間。",
          "<b>視覺</b>：請病人看著動作的手或腳，可以增加動作的力量與方向控制（頭與眼睛會帶動軀幹旋轉）。"
        ],
        mistakes:["口令太長（「現在請你把手臂往上抬起來然後外展……」）——病人動作已經開始了口令還沒說完","口令與動作時機不同步","整場只講「用力」——沒有方向資訊"],
        elder:["聽力退化者：先確認他聽得到，口令用低頻、慢速、面對面說。","認知退化者：口令用他熟悉的生活動作（「像在拉窗簾」「像在踩腳踏車」）。","失語症長輩：以視覺與觸覺為主，口令減少為單字。"]
      },
      quiz:[
        {q:"「拉！」這個口令屬於三段式口令的哪一段？",options:["準備","動作","修正","結束"],a:1,why:"動作口令要在動作開始瞬間發出，短而有力。"},
        {q:"處理疼痛個案時，口令應該？",options:["更大聲","輕而慢","完全不說話","只用手勢"],a:1,why:"輕而慢的口令促進放鬆、降低張力。"},
        {q:"請病人「看著自己的手」的目的是？",options:["讓病人分心不注意疼痛","增加動作力量與方向控制","避免病人閉眼睡著","只是禮貌"],a:1,why:"視覺輸入會帶動頭與軀幹配合動作，提升力量與精準度。"}
      ],
      practice:`<p>請夥伴做上肢對角線動作，你先用一段冗長的口令，再改用三段式短口令。錄一段語音回放，自己聽時機是否對得上動作開始。</p>`
    },
    { id:"1-3", title:"最適阻力", en:"Optimal resistance", minutes:20,
      goals:["說出「最適阻力」的定義與判斷方式","分辨等張與等長情境下阻力該怎麼給","依病人目標（啟動／肌力／穩定／放鬆）調整阻力"],
      videos:[
        {yt:"SPYUdNPvrHo", title:"PNF Principles and Procedures (Part 3)", channel:"Physio trendz", dur:"8 分", lang:"英文", cc:"自動字幕", note:"同 1-1 的總覽影片，跳到阻力（resistance）段落。影片示範對象是健康成人，長輩的阻力調整原則見摘要。"}
      ],
      summary:{
        keypoints:[
          "<b>最適阻力</b>不是最大阻力，而是「讓病人能<b>平順、有控制地</b>完成整個動作範圍」的阻力——目標是促進，不是把病人壓住。",
          "阻力的量依目標調整：要<b>啟動</b>弱肌用輕阻力甚至只給方向；要<b>肌力</b>給接近最大但仍能完成動作；要<b>穩定</b>用等長、阻力慢慢加慢慢減；要<b>放鬆</b>用中等阻力後放掉。",
          "阻力的<b>方向</b>永遠與動作方向相反、沿著型態的對角螺旋，並隨動作進行持續調整（旋轉成分尤其重要）。",
          "阻力要<b>漸進加、漸進減</b>，避免突然放手（病人會失去控制或代償）。"
        ],
        mistakes:["把病人壓到動不了，然後說他「無力」","阻力方向只有直線，沒有旋轉","動作末端突然放手"],
        elder:["長輩的最適阻力往往很小，先從「只給方向」開始，看到平順動作再慢慢加。","骨質疏鬆、關節置換、肌腱修補術後：阻力量與方向要先確認醫囑限制。"],
        safety:["高血壓者避免大阻力等長收縮超過 5–6 秒；隨時提醒吐氣。"]
      },
      quiz:[
        {q:"「最適阻力」的判斷標準是？",options:["病人剛好動不了","病人能平順、有控制地完成整個範圍","治療師手感覺很累","用最大力"],a:1,why:"目的是促進協調與控制，不是把病人壓住。"},
        {q:"要促進一個幾乎無力的動作時，阻力應該？",options:["最大","中等","很輕或只給方向","不接觸"],a:2,why:"弱肌用輕阻力甚至只有方向資訊，配合 irradiation 與牽拉刺激。"},
        {q:"等長收縮情境下阻力應如何給？",options:["突然加到最大","慢慢加、慢慢減","先減再加","一直不變"],a:1,why:"漸進加減讓病人能維持穩定收縮，避免代償與失控。"}
      ],
      practice:`<p>請夥伴做下肢 D1 屈曲。第一次給到他快動不了；第二次減到他能平順完成；第三次只給方向。請他用 0–10 分描述哪一次「最像自己在動」。</p>`
    },
    { id:"1-4", title:"擴散與強化：用強帶弱的核心工具", en:"Irradiation & reinforcement / indirect treatment", minutes:30,
      goals:["說出 irradiation 的生理原理與臨床定義","示範三種常見的 irradiation 途徑（同側近遠端、對側、軀幹到肢體）","設計一個間接治療：用健側抗阻誘發患側特定肌群"],
      pre:`<p>這是整門課最重要的一課。偏癱長輩患側常常「叫不動」，直接練患側只會挫折；PNF 的做法是對<b>強的部位</b>給阻力，讓興奮擴散到弱的部位——這就是 irradiation（擴散），也叫 indirect treatment（間接治療）。</p>`,
      videos:[
        {yt:"t7-tFuDVKHc", title:"One Leg Standing with Irradiation", channel:"IPNF Association 官方頻道", dur:"19 秒", lang:"無旁白", cc:"無字幕", note:"先看這 19 秒：單腳站時對上肢或軀幹給阻力，站立腳的穩定肌被帶動。長輩操作前要先評估平衡與跌倒風險，並有扶手。"},
        {yt:"FZLXEEiJjbs", title:"Irradiation – The Tool for a Targeted Indirect Treatment (Marcel Grzebellus, IPNFA Online Congress)", channel:"PNF チャンネル（轉載 IPNFA 研討會）", dur:"47 分", lang:"英文", cc:"自動字幕", note:"本課主片。IPNFA 講師講擴散的方向規則、擺位與阻力量，以及用健側誘發患側的臨床範例。依時間軸挑段落。"},
        {yt:"-Gg89mWMh8w", title:"PNF Grundprinzip: Irradiation", channel:"PNF Fachgesellschaft（德國 PNF 學會）", dur:"48 分", lang:"英文（歐陸口音）", cc:"自動字幕", note:"補充：另一位講者對同一概念的詮釋，想加深理解再看。"}
      ],
      summary:{
        keypoints:[
          "<b>定義</b>：對一個肌群施加阻力時，反應會擴散到其他肌群或對側肢體，擴散的<b>方向與強度</b>取決於阻力的大小與方向、病人的姿勢，以及被促進部位的狀態。",
          "<b>三條常見途徑</b>：①<b>同側近端→遠端</b>／遠端→近端（例如對手部給阻力，帶動肩胛）；②<b>對側</b>（健側肢體抗阻，誘發患側同名或協同肌群）；③<b>軀幹→肢體</b>（頸或軀幹型態抗阻，帶動四肢，例如 chopping/lifting 帶動髖）。",
          "<b>可預期的擴散模式</b>（依 Adler 等）：健側髖屈曲抗阻 → 對側髖伸；健側上肢 D2 伸展抗阻 → 對側軀幹與肩胛穩定；頸屈曲抗阻 → 雙側腹肌與髖屈肌。",
          "<b>強化（reinforcement）</b>：用一個強的型態「協助」一個弱的型態同時進行，例如雙側對稱型態，讓弱側被強側帶著走。",
          "<b>操作要點</b>：先擺好病人姿勢（弱側要被放在容易被誘發的位置）、對強側給<b>足夠</b>阻力（比平常大）、口令要求「兩邊一起」、治療師另一手或眼睛盯著弱側，看到反應就即刻回饋。",
          "irradiation 也可用來<b>放鬆</b>：對拮抗肌群的對側給阻力，藉交互抑制降低張力。",
          "<b>證據告訴我們的三條規則</b>：①擴散<b>有方向性</b>——阻力放在對側下肢能顯著誘發脛前肌，放在上肢則無效（Reznik et al., 2015），所以「隨便哪一肢用力都行」是錯的；②<b>型態要選對</b>——往右的 lifting 對臀大肌誘發最強，下肢型態對股四頭肌與比目魚肌誘發優於上肢型態（Marchese et al., 2021），這就是坐站訓練該用的組合；③健康人 EMG 證據穩固（對側上斜方肌可達 27% MVIC；Abreu et al., 2015），但<b>中風族群證據很弱</b>（僅 n = 22，多數比較不顯著；de Oliveira et al., 2019），所以對長輩的效果個別差異會很大，要靠觸診確認，不能假設一定會發生。",
          "<b>Cross-education</b>（練健側、患側肌力也增加）在中風有低確定性證據（肌力 SMD 0.58；Smyth et al., 2023），但效果集中在肌力、功能效果小——可以說「健側訓練能幫患側維持肌力」，不能說「練健側就能取代練患側」。"
        ],
        steps:["決定要誘發的肌群（例如患側髖伸肌）","選擇擴散途徑與強側型態（例如健側髖屈曲抗阻、或雙側 lifting）","把患側擺在該肌群容易被誘發的姿勢（伸髖：屈膝仰臥、腳踩床）","對強側施加大於平常的最適阻力，同時口令「兩邊一起推」","觀察／觸診患側，一出現收縮立刻口頭回饋並加入輕阻力","重複 5–10 次，之後嘗試讓患側單獨做同一動作（轉為直接訓練）"],
        mistakes:["阻力太輕，擴散不出去","患側擺位錯，被誘發的變成不想要的協同模式（例如整個下肢屈曲共同動作）","只顧強側，沒有人看患側有沒有反應","誘發後沒有立刻轉為患側主動練習，效果停在反射層"],
        elder:["偏癱長輩：先在坐姿或仰臥用健側上肢 D2 或雙側 chopping 誘發患側軀幹，再進到肢體。","衰弱長輩：用「兩邊一起」的雙側對稱型態，弱側被帶著動，成功經驗會提升動機。","認知退化者無法理解「用力這邊、感覺那邊」，改用整體性的功能任務（雙手一起推桌子站起來）達到同樣擴散。"],
        safety:["對健側給大阻力時，注意患側肩關節有沒有被拉扯（半脫位者要先固定）。","高血壓者 irradiation 常伴隨憋氣，每次都提醒吐氣。"],
        irradiation:["這一課本身就是 irradiation；接下來模組 3 每個技術、模組 4 每個功能活動都會再回到這裡。"]
      },
      quiz:[
        {q:"Irradiation 的臨床定義是？",options:["病人自己用力更大","對某肌群的阻力使反應擴散到其他肌群或對側","治療師用兩隻手","牽拉肌肉"],a:1,why:"擴散是興奮從強處往弱處傳，是間接治療的核心。"},
        {q:"要誘發患側髖伸肌，較合理的間接治療是？",options:["直接對患側髖伸給大阻力","健側髖屈曲抗阻、患側屈膝腳踩床","患側被動活動","只做口令"],a:1,why:"對側髖屈抗阻可預期誘發同側髖伸；患側擺在屈膝踩床讓伸髖肌易被誘發。"},
        {q:"誘發成功後，下一步最重要的是？",options:["結束治療","立刻讓患側嘗試主動做同一動作","加更大阻力在健側","休息 5 分鐘"],a:1,why:"要把反射性的擴散轉成隨意動作與學習，否則效果停留在反射層。"},
        {q:"擴散的方向與強度不受下列何者影響？",options:["阻力大小","病人姿勢","治療師的年齡","被促進部位的狀態"],a:2,why:"擴散取決於阻力、姿勢與弱側狀態，與治療師年齡無關。"}
      ],
      practice:`<p>兩人一組。夥伴仰臥、雙膝屈曲踩床，模擬右側為「患側」。你對他左腿做髖屈曲抗阻（膝往胸推，你在膝上給阻力），口令「兩邊一起用力」，另一手放在他右側臀肌感覺收縮。換三種不同阻力大小，記錄哪一種擴散最明顯。再換成雙側 lifting（雙手交握往右上舉、你在手上給阻力），感覺右側軀幹與髖的反應。</p>`,
      refs:["Reznik, J. E., Biros, E., & Bartur, G. (2015). An electromyographic investigation of the pattern of overflow facilitated by manual resistive PNF in young healthy individuals. <i>Physiotherapy Theory and Practice, 31</i>(8), 582–586. https://doi.org/10.3109/09593985.2015.1061627","Marchese, R. R., et al. (2021). PNF induces muscle irradiation to the lower limbs: A cross-sectional study with healthy individuals. <i>Journal of Bodywork and Movement Therapies, 27</i>, 440–446. https://doi.org/10.1016/j.jbmt.2020.12.026","Abreu, R., et al. (2015). Force irradiation effects during upper limb diagonal exercises on contralateral muscle activation. <i>Journal of Electromyography and Kinesiology, 25</i>(2), 292–297. https://doi.org/10.1016/j.jelekin.2014.12.004","de Oliveira, K. C. R., et al. (2019). Overflow using PNF in post-stroke hemiplegics: A preliminary study. <i>Journal of Bodywork and Movement Therapies, 23</i>(2), 399–404. https://doi.org/10.1016/j.jbmt.2018.02.011","Smyth, C., et al. (2023). To assess the effects of cross-education on strength and motor function in post stroke rehabilitation: A systematic literature review and meta-analysis. <i>Physiotherapy, 119</i>, 80–88. https://doi.org/10.1016/j.physio.2023.02.001"]
    },
    { id:"1-5", title:"牽引、擠壓與牽拉刺激", en:"Traction, approximation & stretch", minutes:20,
      goals:["分辨牽引與擠壓的適用時機","示範型態起始的牽拉刺激（stretch stimulus）","說出牽拉刺激與牽拉反射的差別"],
      videos:[
        {yt:"SPYUdNPvrHo", title:"PNF Principles and Procedures (Part 3)", channel:"Physio trendz", dur:"8 分", lang:"英文", cc:"自動字幕", note:"同 1-1 的總覽影片，跳到 traction／approximation 與 stretch 段落。這類手感型技巧影片停留很短，主要靠實作作業練；長輩的力道要大幅下修，見安全提醒。"}
      ],
      summary:{
        keypoints:[
          "<b>牽引（traction）</b>：沿長軸拉開關節面，促進<b>動作</b>（尤其屈曲、拉的動作）與減痛；用在型態的起始與整個動態過程。",
          "<b>擠壓（approximation）</b>：沿長軸把關節面壓合，促進<b>穩定</b>與承重（伸肌、抗重力肌）；分「快速擠壓」啟動與「持續擠壓」維持。",
          "<b>牽拉刺激（stretch stimulus）</b>：把肢體帶到型態的<b>完全拉長位置</b>（所有肌群包括旋轉都被拉到），肌肉張力升高，動作更容易啟動。",
          "<b>牽拉反射（stretch reflex）</b>：在完全拉長位置再給一個<b>快速、小幅度</b>的額外牽拉，同時口令與阻力跟上；只在病人能立即主動跟上時使用。",
          "牽拉要牽整個型態（三個平面同時），不是只牽一條肌肉。"
        ],
        mistakes:["擠壓時角度不對（不是沿長軸），變成推歪關節","牽拉反射後沒有阻力與口令跟上","對疼痛或不穩定關節做牽拉反射"],
        elder:["擠壓對長輩非常實用：坐姿透過肩、站姿透過骨盆或膝給擠壓，可以立即提升軀幹與下肢穩定。","關節置換、骨質疏鬆、急性關節炎：牽拉反射禁用；牽引與擠壓要輕。"],
        safety:["頸椎與有脊椎手術史者，頸部牽引／擠壓需醫囑。"]
      },
      quiz:[
        {q:"要促進站姿下肢承重與穩定，應使用？",options:["牽引","擠壓","牽拉反射","震動"],a:1,why:"擠壓促進穩定與抗重力肌收縮，是承重訓練的基本工具。"},
        {q:"牽拉刺激（stretch stimulus）是指？",options:["快速拍打肌肉","把肢體帶到型態的完全拉長位置","30 秒靜態牽拉","用力擠壓關節"],a:1,why:"完全拉長位置（含旋轉）讓肌梭張力升高，動作更容易啟動。"},
        {q:"下列何者不宜施行牽拉反射？",options:["肌力 3 級的健康年輕人","急性關節炎","想加強啟動的偏癱患側","運動員"],a:1,why:"疼痛、不穩定或急性發炎關節禁用快速牽拉。"}
      ],
      practice:`<p>夥伴坐在椅子上。你雙手放在他兩側肩峰，沿脊柱長軸給輕柔向下的擠壓，維持 3 秒，觀察他的坐姿是否自動挺直。再換成在仰臥把他的上肢帶到 D1 屈曲的完全拉長位置，感受各肌群都「繃住」的張力。</p>`
    },
    { id:"1-6", title:"時序：正常時序與強調時序", en:"Timing & timing for emphasis", minutes:15,
      goals:["說出正常時序是「遠端先動，近端跟上，整體同步完成」","用 timing for emphasis 在一個型態裡強化特定弱的部分","知道時序與 irradiation 的關係"],
      videos:[
        {yt:"xmEUrnRBQFA", title:"PNF Technique: Timing for Emphasis", channel:"PHCN Online", dur:"2 分", lang:"英文", cc:"自動字幕", note:"短示範：在型態中鎖住強的部分、強調弱的部分。"},
        {yt:"PY59-exrz5I", title:"PNF UE D1 Timing for Emphasis", channel:"AngelaCParks", dur:"1 分", lang:"英文", cc:"自動字幕", note:"上肢 D1 型態的 timing for emphasis 純動作示範（2010 年舊片，畫質普通）。正常時序（遠端先動）兩支都沒單獨示範，見摘要。"}
      ],
      summary:{
        keypoints:[
          "<b>正常時序（normal timing）</b>：功能動作是遠端（手／腳）先啟動，近端隨後，全部在同一時間完成——旋轉貫穿全程。",
          "<b>強調時序（timing for emphasis）</b>：故意「鎖住」型態中強的部分（等長維持），把力量與注意力導向弱的部分——這是把 irradiation 精準用在一個型態內的方法。",
          "作法：讓強的部分先收縮到最佳位置並抗阻維持，再對弱的部分做反覆牽拉或阻力，弱的部分完成後再整體完成型態。",
          "常見應用：上肢 D2 屈曲時鎖住肩，強調手腕伸直；下肢 D1 屈曲時鎖住髖，強調踝背屈。"
        ],
        mistakes:["把整個型態做得很用力，弱的部分還是被強的帶過去","鎖住的部位位置不對（沒在最強的收縮點）"],
        elder:["長輩常見「踝背屈弱」——用下肢型態鎖住髖膝、強調踝，是跨門檻與步態訓練的前置練習。"],
        irradiation:["Timing for emphasis 就是「型態內的 irradiation」：把強處的興奮導向弱處。"]
      },
      quiz:[
        {q:"正常時序中，動作由哪裡先啟動？",options:["近端","遠端","軀幹","同時"],a:1,why:"功能動作是遠端先動、近端跟上、整體同步完成。"},
        {q:"Timing for emphasis 的作法是？",options:["把弱的部分鎖住，練強的部分","把強的部分鎖住，強調弱的部分","全部一起用力","只做遠端"],a:1,why:"鎖住強處讓興奮導向弱處，是型態內的 irradiation。"}
      ],
      practice:`<p>夥伴仰臥做下肢 D1 屈曲（腳背屈內翻、髖屈內收外旋）。請他把髖膝屈到一半並抗你的阻力「撐住」，這時你只對腳做三次快速牽拉與「勾腳！」口令，最後再讓整隻腳完成型態。感受踝背屈是否比一開始更有力。</p>`
    }
  ]},

  /* ===================== 模組 2 ===================== */
  { id:"m2", title:"動作型態：對角螺旋", color:"#5E7A32",
    intro:"上肢、下肢、肩胛、骨盆、頸與軀幹的對角線型態——PNF 的「語言」。",
    lessons:[
    { id:"2-1", title:"上肢 D1／D2 屈曲與伸展", en:"Upper extremity patterns", minutes:30,
      goals:["用生活動作記住四個上肢型態（D1 屈＝戴安全帶、D1 伸＝解安全帶、D2 屈＝拔劍、D2 伸＝收劍）","說出每個型態的遠端手部動作與旋轉方向","在仰臥與坐姿正確擺出起始的完全拉長位置"],
      videos:[
        {yt:"lDwG4zFBWr4", title:"PNF for the Upper Extremity", channel:"Physical Therapy Education Solutions", dur:"9 分", lang:"英文", cc:"人工英文字幕", note:"字幕品質最好的一批教學片。示範者做全範圍、正常速度；長輩請放慢、以無痛範圍為主。"}
      ],
      summary:{
        keypoints:[
          "所有型態都是<b>三個平面</b>同時進行：屈／伸、內收／外展、內旋／外旋，並以<b>旋轉</b>為關鍵。",
          "<b>D1 屈曲</b>（flexion–adduction–external rotation）：手從對側大腿外側 → 拉到同側耳朵旁，手腕橈屈、手指屈曲；像「戴安全帶」。",
          "<b>D1 伸展</b>（extension–abduction–internal rotation）：反向；像「解安全帶／推開車門」。",
          "<b>D2 屈曲</b>（flexion–abduction–external rotation）：手從對側髖前 → 舉向同側斜上方，手腕橈伸、手指伸展；像「拔劍」。",
          "<b>D2 伸展</b>（extension–adduction–internal rotation）：反向；像「收劍／繫安全帶對側」。",
          "手部先動（遠端先），旋轉貫穿全程，肩胛也同步（D1 屈：肩胛前上提；D2 屈：肩胛後上提）。",
          "型態可搭配肘的變化：肘屈、肘伸或肘不動，依功能目標選擇。"
        ],
        steps:["請病人手指先動（張開或握起），帶動手腕","治療師一手 lumbrical grip 在手背／手掌（遠端），另一手在上臂或肩胛（近端）","從完全拉長位置給牽拉刺激＋口令","阻力沿對角螺旋，旋轉成分持續給","終點時肩胛與手同時到位"],
        mistakes:["只有肩在動，手腕手指沒參與（遠端沒先動）","旋轉不見了，變成直線抬手","治療師手放錯面，病人搞不清楚方向"],
        elder:["肩關節活動度受限者，D2 屈曲不必做到全範圍，以無痛範圍為主。","偏癱肩半脫位：先做肩胛型態（2-3）與軀幹，再進到肢體型態，且近端要有支撐。","坐姿做上肢型態比仰臥更接近生活（穿衣、拿高處物品）。"],
        safety:["肩夾擠或旋轉肌袖問題：D2 屈曲上舉時注意外旋要足，避免夾擠痛。"]
      },
      quiz:[
        {q:"「戴安全帶」的動作對應哪個型態？",options:["D1 屈曲","D1 伸展","D2 屈曲","D2 伸展"],a:0,why:"D1 屈曲＝屈曲–內收–外旋，手從對側大腿拉到同側耳旁。"},
        {q:"上肢 D2 屈曲的手部動作是？",options:["握拳、腕尺屈","手指伸展、腕橈伸","手指屈曲、腕橈屈","手不動"],a:1,why:"D2 屈曲遠端是手指伸、腕橈伸（拔劍）。"},
        {q:"型態中最關鍵、最常被忽略的成分是？",options:["屈伸","外展內收","旋轉","肘的角度"],a:2,why:"旋轉貫穿整個對角螺旋，沒有旋轉就不是 PNF 型態。"}
      ],
      practice:`<p>四個型態各做 10 次，先自己徒手做並唸出生活口訣，再幫夥伴做。用手機側拍一次，檢查：手指有沒有先動？肘與肩的旋轉有沒有跟上？</p>`
    },
    { id:"2-2", title:"下肢 D1／D2 屈曲與伸展", en:"Lower extremity patterns", minutes:30,
      goals:["說出下肢四個型態的髖、膝、踝成分","區分 D1 屈曲（背屈內翻）與 D2 屈曲（背屈外翻）","理解下肢型態與步態各期的對應"],
      videos:[
        {yt:"RvhJR9NJhks", title:"PNF for the Lower Extremity", channel:"Physical Therapy Education Solutions", dur:"8 分", lang:"英文", cc:"人工英文字幕", note:"與 2-1 同系列。示範在治療床仰臥；長輩若有姿位性低血壓或關節限制，調整床面角度與幅度。"}
      ],
      summary:{
        keypoints:[
          "<b>D1 屈曲</b>（flexion–adduction–external rotation）：踝背屈內翻、髖屈內收外旋；像「用腳把對側的球撥過來」。步態的擺盪期。",
          "<b>D1 伸展</b>（extension–abduction–internal rotation）：踝蹠屈外翻、髖伸外展內旋；步態的站立末期推進。",
          "<b>D2 屈曲</b>（flexion–abduction–internal rotation）：踝背屈外翻、髖屈外展內旋；像「跨上機車」。",
          "<b>D2 伸展</b>（extension–adduction–external rotation）：踝蹠屈內翻、髖伸內收外旋。",
          "膝可屈、可伸、可不動；「髖屈膝屈」對應擺盪，「髖伸膝伸」對應站立承重。",
          "遠端接觸在足背／足底，近端接觸在大腿；踝要<b>先動</b>。"
        ],
        mistakes:["腳踝不動，只用髖甩腿","治療師站太遠，腿一伸就給不到阻力","忘記旋轉，型態變成直線抬腿"],
        elder:["長輩最常見的弱點是<b>踝背屈</b>與<b>髖伸</b>——D1 屈曲（強調踝）與 D1 伸展（強調髖伸）是跨門檻、上樓梯、從椅子站起的基礎。","髖關節置換者：依術式限制內收與旋轉角度，避免 D1 屈曲的內收外旋超過限制。"],
        safety:["膝關節置換或不穩者，避免在膝伸直末端加旋轉阻力。"]
      },
      quiz:[
        {q:"下肢 D1 屈曲的踝動作是？",options:["蹠屈外翻","背屈內翻","背屈外翻","蹠屈內翻"],a:1,why:"D1 屈：背屈內翻＋髖屈內收外旋。"},
        {q:"步態站立末期推進最接近哪個型態？",options:["D1 屈曲","D1 伸展","D2 屈曲","D2 伸展"],a:1,why:"D1 伸展＝髖伸外展內旋＋蹠屈外翻，是推進的組合。"},
        {q:"髖關節置換（後側入路）長輩做 D1 屈曲要特別注意？",options:["膝角度","內收與旋轉不超過限制","踝背屈太多","呼吸"],a:1,why:"後側入路禁忌為髖屈超過 90°、內收過中線、內旋，D1 屈曲的內收外旋需在限制內。"}
      ],
      practice:`<p>夥伴仰臥。做 D1 屈曲時，你一手在足背給「勾腳、往內翻」的阻力，另一手在大腿前內側。做 10 次後換 D1 伸展（足底給阻力）。最後請夥伴站起來走幾步，問他擺盪腳有沒有比較「輕」。</p>`
    },
    { id:"2-3", title:"肩胛與骨盆型態", en:"Scapular & pelvic patterns", minutes:25,
      goals:["說出肩胛與骨盆各四個方向（前上提、後下壓、後上提、前下壓）","在側臥擺位並給正確方向的阻力","理解肩胛／骨盆型態與翻身、步態的關係"],
      videos:[
        {yt:"GDqbuj_q6wE", title:"PNF for the Scapula", channel:"Physical Therapy Education Solutions", dur:"6 分", lang:"英文", cc:"人工英文字幕", note:"肩胛四個方向的側臥示範。"},
        {yt:"Rm8fsOYQ_1c", title:"PNF for the Pelvis", channel:"Physical Therapy Education Solutions", dur:"7 分", lang:"英文", cc:"人工英文字幕", note:"骨盆四個方向的側臥示範。臥床長輩常有肩攣縮、骨盆代償與壓瘡風險部位，施力點要避開，見安全提醒。"}
      ],
      summary:{
        keypoints:[
          "肩胛與骨盆各有兩條對角線：<b>前上提 ↔ 後下壓</b>、<b>後上提 ↔ 前下壓</b>。",
          "<b>肩胛前上提</b>（anterior elevation）：肩胛往鼻子方向；配合上肢 D1 屈曲與翻身向前。<b>後下壓</b>（posterior depression）：往對側坐骨方向，是撐起、推的動作。",
          "<b>肩胛後上提</b>：往後上方（聳肩往後），配合 D2 屈曲；<b>前下壓</b>：往對側髖前方，是伸手向下向前拿東西。",
          "<b>骨盆前上提</b>（anterior elevation）：髂前上棘往肚臍方向，對應擺盪期；<b>後下壓</b>：對應站立期承重與推進。<b>骨盆後上提</b>／<b>前下壓</b>：對應側向移動與旋轉。",
          "側臥是教學的標準擺位；治療師的手放在肩峰或髂嵴，阻力沿對角線。",
          "型態可以獨立做（穩定、啟動），也可與肢體型態合併。"
        ],
        mistakes:["把肩胛型態做成聳肩或整個軀幹旋轉","骨盆型態時膝沒屈、下肢跟著甩","阻力方向變成直線，沒有對角"],
        elder:["偏癱肩痛的長輩：從肩胛型態開始，比直接做上肢型態安全，也能誘發患側軀幹。","骨盆前上提是步態擺盪的關鍵——長輩「抬不起腳」常常是骨盆沒動，先練骨盆再練腿。"],
        irradiation:["對健側肩胛做後下壓抗阻，可誘發患側軀幹伸肌；對健側骨盆前上提抗阻，可誘發患側髖伸。"]
      },
      quiz:[
        {q:"肩胛前上提的方向是？",options:["往對側坐骨","往鼻子","往後上","往對側髖前"],a:1,why:"前上提往鼻子方向，配合 D1 屈曲與翻身。"},
        {q:"步態擺盪期骨盆主要做哪個型態？",options:["前上提","後下壓","後上提","前下壓"],a:0,why:"擺盪腳骨盆前上提，抬腳跨步。"},
        {q:"偏癱肩痛長輩應先做？",options:["上肢 D2 屈曲全範圍","肩胛型態","被動牽拉","肩關節擠壓大阻力"],a:1,why:"肩胛型態安全且能誘發患側軀幹，是進入上肢型態的前置。"}
      ],
      practice:`<p>夥伴側臥、髖膝微屈。你雙手疊在他上方肩峰，先做「往鼻子」的前上提抗阻，再做「往對側坐骨」的後下壓抗阻。換到骨盆（手在髂嵴）做前上提與後下壓。最後合併：肩胛前上提＋骨盆後下壓＝翻身向前的軀幹旋轉。</p>`
    },
    { id:"2-4", title:"頸與軀幹型態：chopping 與 lifting", en:"Neck & trunk patterns", minutes:20,
      goals:["示範 chopping（劈）與 lifting（舉）的雙側上肢與軀幹組合","說出頸屈伸旋轉型態如何帶動軀幹","把軀幹型態用在坐姿平衡與坐起"],
      videos:[
        {yt:"oJl5jaQn0p0", title:"Trunk PNF Pattern – Upper and Lower Trunk", channel:"Physio's Healing Touch", dur:"2 分", lang:"無旁白", cc:"自動字幕", note:"純動作示範，先看畫面抓 chopping／lifting 的樣子。"},
        {yt:"pw3g5D6-koM", title:"Chop and Lift Patterns – A Crash Course", channel:"PT Final Exam", dur:"8 分", lang:"英文", cc:"自動字幕", note:"用口述與圖解拆解 chop／lift 的邏輯與臨床應用（美國執照考複習片，語速快）。頸部旋轉型態對頸椎退化長輩要先篩檢。"}
      ],
      summary:{
        keypoints:[
          "<b>Chopping（劈）</b>：一手做 D1 伸展、另一手握住其手腕跟隨，頸與軀幹同時屈曲旋轉——像「劈柴」；促進軀幹屈曲與向下向側方的重心轉移，也用於從躺到坐。",
          "<b>Lifting（舉）</b>：一手做 D2 屈曲、另一手跟隨，頸與軀幹伸展旋轉——像「舉起東西放到高處」；促進軀幹伸展、坐姿挺直與向上向側方的重心轉移。",
          "<b>頸部型態</b>：頸的屈曲／伸展加旋轉，眼睛帶頭、頭帶軀幹；頸的抗阻可誘發整個軀幹與四肢（irradiation 的重要來源）。",
          "<b>軀幹型態</b>可在仰臥、坐、跪、站各姿勢做，是所有功能活動的核心。"
        ],
        mistakes:["只有手在動，頭與眼沒跟","chopping 變成單純的手臂下拉，沒有軀幹旋轉","lifting 時病人代償聳肩"],
        elder:["坐姿 chopping／lifting 是長輩<b>坐姿平衡</b>與<b>重心轉移</b>訓練的首選，安全且直接對接「伸手拿東西」。","偏癱長輩雙手交握做 lifting，健側帶患側，同時促進患側軀幹伸肌。"],
        irradiation:["Lifting 往患側做，可誘發患側軀幹伸肌與髖；chopping 往健側做，可誘發患側腹斜肌。"]
      },
      quiz:[
        {q:"Chopping 主要促進？",options:["軀幹伸展","軀幹屈曲與旋轉","單側肩外展","頸伸展"],a:1,why:"劈的動作帶動頸與軀幹屈曲旋轉，用於躺到坐與向下的重心轉移。"},
        {q:"Lifting 時領先手做的是哪個型態？",options:["D1 屈曲","D1 伸展","D2 屈曲","D2 伸展"],a:2,why:"Lifting 領先手做 D2 屈曲，另一手跟隨。"},
        {q:"偏癱長輩雙手交握做 lifting 往患側，可誘發？",options:["健側二頭肌","患側軀幹伸肌與髖","患側手指","健側踝"],a:1,why:"軀幹型態的 irradiation：往患側 lifting 帶動患側軀幹伸與髖。"}
      ],
      practice:`<p>夥伴坐在床邊、雙腳踩地。請他雙手交握，你一手握在他的手上、另一手在對側肩。先做 lifting（往右上舉）5 次，再做 chopping（往左下劈）5 次。觀察他的頭與眼是否跟著手走，坐姿有沒有隨 lifting 變挺。</p>`
    }
  ]},

  /* ===================== 模組 3 ===================== */
  { id:"m3", title:"手法技術：什麼時候用哪一招", color:"#C4622F",
    intro:"節律啟動、等張組合、反轉、節律穩定、重複牽拉、收縮放鬆——依病人問題選技術。",
    lessons:[
    { id:"3-1", title:"節律啟動", en:"Rhythmic initiation", minutes:20,
      goals:["說出節律啟動的四階段（被動→輔助→主動→抗阻）","判斷哪些病人適合（啟動困難、僵硬、認知或緊張）","在型態中示範並調整節奏"],
      videos:[
        {yt:"LOQJ90JpyFg", title:"リズミックイニシエーション（節律啟動）", channel:"PNF チャンネル（日本 IPNFA 認證講師群）", dur:"5 分", lang:"日語", cc:"自動英文字幕", note:"模組 3 主要用這個日本頻道的成套手法影片（一手法一支、依 IPNFA 清單編號）。字幕可在播放器設定選「自動翻譯 → 中文（繁體）」，重點看手位與節奏。"},
        {yt:"fsTP8HhXiiU", title:"PNF Technique: Rhythmic Initiation", channel:"PHCN Online", dur:"5 分", lang:"英文", cc:"自動字幕", note:"英語備選。"}
      ],
      summary:{
        keypoints:["目的：<b>教會病人動作的節奏與方向</b>，用於動作啟動困難（帕金森）、張力高、協調差、緊張或不懂指令的病人。","四階段：①治療師<b>被動</b>帶著做型態、口令「放鬆，讓我來」→②<b>輔助主動</b>「跟著我」→③<b>主動</b>「你自己來」→④<b>抗阻</b>「現在推」。","節奏固定、範圍固定，只有主動程度逐步增加；回程通常被動。"],
        mistakes:["太快進到抗阻","節奏忽快忽慢，病人抓不到"],
        elder:["帕金森與失智長輩的首選技術；配合數拍子或熟悉的節奏（「一、二、一、二」）效果更好。","焦慮或怕痛的長輩，用節律啟動建立信任再進其他技術。"],
        irradiation:["進入抗阻階段時可加入對側或軀幹抗阻，把擴散帶進來。"]
      },
      quiz:[{q:"節律啟動的第一階段是？",options:["抗阻","主動","被動","等長"],a:2,why:"先由治療師被動帶著做，讓病人感覺節奏與方向。"},{q:"最適合節律啟動的病人是？",options:["需要肌力訓練的運動員","動作啟動困難的帕金森病人","急性韌帶損傷","肌力 5 級者"],a:1,why:"節律啟動針對啟動困難、張力高與協調差。"}],
      practice:`<p>夥伴假裝「很僵硬、不知道要怎麼動」。你用上肢 D1 屈曲做節律啟動，從被動到抗阻各 5 次，全程數拍子。</p>`
    },
    { id:"3-2", title:"等張組合", en:"Combination of isotonics", minutes:20,
      goals:["說出向心→等長→離心三階段的操作與口令","知道等張組合對「控制」與「離心」的訓練價值","應用到坐站的下降階段"],
      videos:[
        {yt:"fmHxYw6NR9E", title:"コンビネーション・オブ・アイソトニックス（等張組合）", channel:"PNF チャンネル", dur:"4 分", lang:"日語", cc:"自動英文字幕", note:"看三階段的手不換位、口令轉換與離心段的速度控制。"},
        {yt:"aWZuufnN4u0", title:"Combination of Isotonics – sitting / standing functional", channel:"IPNF Association 官方頻道", dur:"47 秒", lang:"英文", cc:"自動字幕", note:"官方 47 秒功能情境版：坐姿與站姿的等張組合，直接對接坐站。"},
        {yt:"Pz2irld5W38", title:"PNF Combination of Isotonics (PT530)", channel:"Susan Ostertag（大學物治課程）", dur:"2 分", lang:"英文", cc:"自動字幕", note:"英語備選。"}
      ],
      summary:{
        keypoints:["同一肌群在<b>不改變接觸手</b>的情況下，連續做：向心收縮（動出去）→ 穩定（等長維持）→ 離心收縮（慢慢被拉回）。","目的：訓練<b>動作控制</b>、離心肌力與功能性活動範圍，特別是「坐下」「蹲」「放東西」這類需要控制的動作。","口令：「推」→「撐住」→「慢慢讓我拉回，不要放掉」。"],
        elder:["長輩「坐下去會跌坐」就是離心控制不足，等張組合在股四頭肌與臀肌是直接對應的訓練。","可從小範圍做，再逐步擴大。"],
        irradiation:["離心階段對強側加阻力，弱側的離心控制會被帶著提升。"]
      },
      quiz:[{q:"等張組合的三個階段順序是？",options:["離心→等長→向心","向心→等長→離心","等長→向心→離心","向心→離心→等長"],a:1,why:"先動出去、撐住、再慢慢被拉回。"},{q:"「坐下去會跌坐」最需要訓練的是？",options:["向心肌力","離心控制","柔軟度","反應速度"],a:1,why:"坐下是下肢伸肌的離心收縮。"}],
      practice:`<p>夥伴坐姿做膝伸直：你給阻力讓他伸到 3/4、撐住 3 秒、再慢慢被你壓回，全程他要「頂著」。做 8 次，換邊。</p>`
    },
    { id:"3-3", title:"動態反轉與穩定反轉", en:"Dynamic & stabilizing reversals", minutes:25,
      goals:["示範主動肌與拮抗肌之間不停頓的動態反轉","示範以等長為主的穩定反轉並說出其換手技巧","說出反轉技術的生理基礎（連續誘導）"],
      videos:[
        {yt:"ki9YmWQvaLQ", title:"ダイナミックリバーサル（動態反轉）", channel:"PNF チャンネル", dur:"4 分", lang:"日語", cc:"自動英文字幕", note:"看換方向時遠端手先換的細節。"},
        {yt:"zJUvATPgz-g", title:"スタビライジング・リバーサル（穩定反轉）", channel:"PNF チャンネル", dur:"5 分", lang:"日語", cc:"自動英文字幕", note:"看阻力漸進加減與病人幾乎不動的差別。"},
        {yt:"bPcjsAPZ8wY", title:"PNF Stabilizing Reversals", channel:"Dominican College", dur:"1 分", lang:"英文", cc:"自動字幕", note:"英語備選（穩定反轉）。"},
        {yt:"qE7_jkJ7u6Q", title:"PNF Technique: Slow Reversal", channel:"PHCN Online", dur:"2 分", lang:"英文", cc:"自動字幕", note:"英語備選：slow reversal 是動態反轉的舊名，看到這個詞就是同一件事。"}
      ],
      summary:{
        keypoints:["<b>動態反轉</b>（dynamic reversal，舊稱 slow reversal）：在型態的兩個方向交替抗阻，不停頓；換方向時<b>遠端手先換</b>，近端隨後，口令「拉！…現在推！」。目的：增加活動度、肌力、協調與耐力，減少疲勞。","<b>穩定反轉</b>（stabilizing reversal）：交替對相反方向給阻力，病人只做<b>極小範圍或等長</b>維持，阻力漸進加減。目的：穩定與平衡。","生理基礎：連續誘導——拮抗肌收縮後主動肌更有力。","可強調某一方向（一邊阻力大、一邊小）。"],
        elder:["坐姿或站姿的穩定反轉是<b>平衡訓練</b>的基本功：手在肩或骨盆，前後左右交替給阻力，長輩不移動只撐住。","動態反轉用在肩或髖的活動度受限，比被動牽拉更能維持效果。"],
        irradiation:["穩定反轉在軀幹做時，四肢的穩定肌會被一起誘發，適合偏癱坐姿平衡。"]
      },
      quiz:[{q:"動態反轉換方向時，哪隻手先換？",options:["近端","遠端","同時","看情況"],a:1,why:"遠端先換保持動作連續與遠端先動的原則。"},{q:"穩定反轉的病人動作範圍是？",options:["全範圍","極小或等長","只做回程","被動"],a:1,why:"穩定反轉以維持穩定為目的。"}],
      practice:`<p>夥伴坐在床邊。你雙手在他兩側肩，前後左右輪流給阻力，口令「別讓我推動你」。每個方向 3 秒，阻力慢慢加慢慢減。再換成上肢 D1 屈伸的動態反轉 10 次。</p>`
    },
    { id:"3-4", title:"節律穩定", en:"Rhythmic stabilization", minutes:15,
      goals:["說出節律穩定與穩定反轉的差別（等長共同收縮 vs 交替）","示範在肩或軀幹的節律穩定","應用於疼痛與關節不穩"],
      videos:[
        {yt:"zMD1HEH-1QI", title:"リズミック・スタビリゼーション（節律穩定）", channel:"PNF チャンネル", dur:"4 分", lang:"日語", cc:"自動英文字幕", note:"看雙手同時給相反方向阻力、病人完全不動。"},
        {yt:"Ac-YVf2IUFU", title:"Sitting Stability: Rhythmic Stabilization", channel:"Maha Tayseer（大學物治課程）", dur:"47 秒", lang:"英文", cc:"自動字幕", note:"坐姿版，直接對接長輩坐姿平衡。"}
      ],
      summary:{
        keypoints:["節律穩定：對<b>主動肌與拮抗肌同時</b>給阻力（共同收縮），病人不動，阻力方向緩慢輪換但<b>沒有動作意圖的改變</b>，口令「撐住，不要動」。","目的：增加關節穩定、減痛、增加活動度（透過放鬆後再動）、平衡。","與穩定反轉不同：穩定反轉是「交替方向」，節律穩定是「同時共同收縮」。"],
        elder:["急性疼痛或術後：節律穩定在無痛範圍是安全的啟動方式。","坐站前的骨盆節律穩定可先「叫醒」核心。"]
      },
      quiz:[{q:"節律穩定的特徵是？",options:["主動肌拮抗肌交替收縮","主動肌拮抗肌同時共同收縮","大範圍動作","被動活動"],a:1,why:"共同收縮、不動，是與穩定反轉的關鍵差別。"}],
      practice:`<p>夥伴仰臥、髖膝屈曲踩床。你雙手放在他兩側膝，同時往內與往外給阻力，口令「撐住」，阻力方向緩慢輪換。10 秒 × 3 回。</p>`
    },
    { id:"3-5", title:"重複牽拉", en:"Repeated stretch (repeated contractions)", minutes:20,
      goals:["區分「起始範圍重複牽拉」與「範圍中重複牽拉」","在弱的型態上示範並掌握牽拉＋口令＋阻力的同步","知道禁忌症"],
      videos:[
        {yt:"S6r5sH2PRCA", title:"イニシャルストレッチ（起始範圍牽拉）", channel:"PNF チャンネル", dur:"4 分", lang:"日語", cc:"自動英文字幕", note:"看完全拉長位置與牽拉—口令—阻力的同步。"},
        {yt:"FmIjheOE5fA", title:"リ・ストレッチ（範圍中重複牽拉）", channel:"PNF チャンネル", dur:"3 分", lang:"日語", cc:"自動英文字幕", note:"看在弱點先等長撐住再給小牽拉的時機。"},
        {yt:"pEJ0rEVL2fw", title:"PNF Technique: Repeated Contractions", channel:"PHCN Online", dur:"2 分", lang:"英文", cc:"自動字幕", note:"英語備選：repeated contractions 是舊名。"}
      ],
      summary:{
        keypoints:["<b>起始範圍重複牽拉</b>：在型態的完全拉長位置反覆給牽拉反射＋口令＋阻力，用於<b>啟動</b>無力或疲勞的動作。","<b>範圍中重複牽拉</b>：動作進行中，在弱的點讓病人等長撐住，再給一個快速小牽拉重新啟動，用於<b>增強</b>與抗疲勞。","三者同步：牽拉—口令—阻力，差 0.5 秒效果就差很多。","禁忌：關節不穩、骨折、疼痛、痙攣明顯（可能誘發張力）。"],
        elder:["長輩多用<b>範圍中重複牽拉</b>且幅度要小；起始範圍的快速牽拉在骨質疏鬆與痙攣者避免。"],
        irradiation:["重複牽拉配合 timing for emphasis，就是把 irradiation 精準灌到弱的那一段。"]
      },
      quiz:[{q:"要啟動一個幾乎無法開始的動作，用？",options:["範圍中重複牽拉","起始範圍重複牽拉","收縮放鬆","節律穩定"],a:1,why:"起始範圍的牽拉反射用於啟動。"},{q:"重複牽拉的禁忌症不包括？",options:["骨折","關節不穩","肌力 3 級的健康人","明顯痙攣"],a:2,why:"肌力弱但關節穩定、無疼痛者正是適應症。"}],
      practice:`<p>夥伴做下肢 D1 屈曲，在髖屈到 45° 時請他撐住，你對足背給快速小牽拉並喊「勾！」，他跟上後再完成型態。5 次一組。</p>`
    },
    { id:"3-6", title:"收縮放鬆與維持放鬆", en:"Contract-relax & hold-relax", minutes:20,
      goals:["說出兩者差別（等張含旋轉 vs 純等長）與各自適用情境","示範腿後肌與肩的操作","知道 PNF 牽拉相對靜態牽拉的證據"],
      videos:[
        {yt:"yN72tCkDamI", title:"コントラクト・リラックス（收縮放鬆）", channel:"PNF チャンネル", dur:"8 分", lang:"日語", cc:"自動英文字幕", note:"看允許旋轉的等張收縮與放鬆後帶到新範圍。"},
        {yt:"uX2kcPFbMpU", title:"ホールド・リラックス（維持放鬆）", channel:"PNF チャンネル", dur:"5 分", lang:"日語", cc:"自動英文字幕", note:"看純等長、不允許動作的差別。"},
        {yt:"QBU1fW77Dqk", title:"UE Hold Relax & Contract Relax Example (PT530)", channel:"Susan Ostertag（大學物治課程）", dur:"2 分", lang:"英文", cc:"自動字幕", note:"英語備選：同一支影片對照兩手法（上肢）。"},
        {yt:"idSe7-fns4M", title:"HR direct + Timing for Emphasis", channel:"IPNF Association 官方頻道", dur:"2 分", lang:"英文", cc:"自動字幕", note:"官方補充：維持放鬆接強調時序，把新範圍立刻用起來。"}
      ],
      summary:{
        keypoints:["<b>收縮放鬆（contract-relax）</b>：把肢體帶到受限點，請病人用<b>緊的肌群</b>做等張收縮（允許旋轉，其餘等長）5–8 秒，放鬆後被動或主動帶到新的範圍。用於活動度受限、<b>無痛</b>者。","<b>維持放鬆（hold-relax）</b>：同樣在受限點，但做<b>純等長</b>收縮（不允許動作），放鬆後增加範圍；用於<b>疼痛</b>或不穩定者。可對緊的肌群或其拮抗肌做。","證據：PNF 牽拉對 ROM 的立即效果與靜態牽拉相當或略優，機制以<b>牽拉耐受度提升</b>為主，非單純自生抑制。","做完要接主動動作，把新範圍「用起來」。"],
        elder:["長輩肌腱彈性差，收縮時間縮短到 3–5 秒，力量用 20–50% 即可。","肩關節活動度受限（五十肩後期、偏癱肩）用 hold-relax 較安全。"]
      },
      quiz:[{q:"疼痛病人要增加活動度應優先用？",options:["收縮放鬆","維持放鬆","重複牽拉","動態反轉"],a:1,why:"維持放鬆為純等長，不增加疼痛。"},{q:"PNF 牽拉增加 ROM 的主要機制被認為是？",options:["肌肉變長","牽拉耐受度提升","肌梭被破壞","關節囊鬆弛"],a:1,why:"近年研究支持牽拉耐受度改變為主要機制。"}],
      practice:`<p>夥伴仰臥抬腿到腿後肌緊。請他往下踩你的手（等長）5 秒，放鬆，再往上帶到新範圍，重複 3 次。做完請他自己主動抬腿，記錄範圍變化。</p>`,
      refs:["Cayco, C. S., Labro, A. V., & Gorgon, E. J. R. (2019). Hold-relax and contract-relax stretching for hamstrings flexibility: A systematic review with meta-analysis. <i>Physical Therapy in Sport, 35</i>, 42–55. https://doi.org/10.1016/j.ptsp.2018.11.001","Konrad, A., et al. (2024). Chronic effects of stretching on range of motion with consideration of potential moderating variables. <i>Journal of Sport and Health Science, 13</i>(2), 186–194. https://doi.org/10.1016/j.jshs.2023.06.002","Freitas, S. R., et al. (2018). Can chronic stretching change the muscle-tendon mechanical properties? A review. <i>Scandinavian Journal of Medicine & Science in Sports, 28</i>(3), 794–806. https://doi.org/10.1111/sms.12957"]
    },
    { id:"3-7", title:"複製", en:"Replication", minutes:15,
      goals:["說出複製技術的用途（教會動作的終點感覺）","示範在功能動作終點的等長→放鬆→回到終點循環"],
      videos:[
        {yt:"OOAJZ8LRVU0", title:"レプリケーション（複製）", channel:"PNF チャンネル", dur:"5 分", lang:"日語", cc:"自動英文字幕", note:"看從終點位置開始、逐次帶回更多的循環。"},
        {yt:"hYEVBR4MrKU", title:"PNF Replication", channel:"Dominican College", dur:"2 分", lang:"英文", cc:"自動字幕", note:"英語備選。"},
        {yt:"N4_GZEqB_GQ", title:"Replication with Pelvic Anterior Elevation", channel:"Alissa Gutierrez", dur:"1 分", lang:"英文", cc:"自動字幕", note:"補充：骨盆前上提的複製，對接步態擺盪。"}
      ],
      summary:{
        keypoints:["把病人放在動作的<b>終點位置</b>，抗阻等長維持，讓他感覺「到位」是什麼感覺；治療師被動帶回一點，請病人主動回到終點；逐漸增加回去的距離。","用途：教會病人一個功能動作的終點與感覺，適合動作學習困難、本體感覺差者。"],
        elder:["穿衣、伸手拿架上物品、站起後的挺直，都可以用複製先建立「終點感」。"]
      },
      quiz:[{q:"複製技術從哪裡開始？",options:["起始位置","動作中點","終點位置","隨機"],a:2,why:"先讓病人在終點抗阻維持，建立終點感覺。"}],
      practice:`<p>夥伴坐姿伸手到「拿架上杯子」的終點，你給輕阻力請他撐住 3 秒，帶回 10 公分，請他回到終點。逐次帶回更多。</p>`
    },
    { id:"3-8", title:"技術裡的 irradiation：整合示範", en:"Irradiation across techniques", minutes:25,
      goals:["在每個技術裡指出可以加 irradiation 的時機","設計一個偏癱個案的技術組合（啟動→強化→功能）","說出評估擴散是否成功的三個觀察指標"],
      videos:[
        {yt:"FZLXEEiJjbs", title:"Irradiation – The Tool for a Targeted Indirect Treatment (Marcel Grzebellus)", channel:"IPNFA Online Congress（PNF チャンネル轉載）", dur:"47 分", lang:"英文", cc:"自動字幕", start:0, note:"與 1-4 同一支講座。這一課請看後半的臨床範例段落：怎麼把擴散用進各手法與功能活動（時間軸見 1-4）。"},
        {yt:"t7-tFuDVKHc", title:"One Leg Standing with Irradiation", channel:"IPNF Association 官方頻道", dur:"19 秒", lang:"無旁白", cc:"無字幕", note:"實作短片：站姿功能情境下的擴散。長輩降階版＝扶持站立或雙腳站加擾動。"}
      ],
      summary:{
        keypoints:["irradiation 不是一個獨立技術，而是<b>貫穿所有技術的思維</b>：任何技術的抗阻階段，都可以把阻力放在強側或軀幹，讓弱側被帶動。","<b>組合範例（偏癱下肢）</b>：①節律啟動健側 D1 屈曲建立節奏 → ②穩定反轉在骨盆叫醒軀幹 → ③健側 D1 屈曲抗阻＋患側踩床，誘發患側髖伸 → ④患側等張組合（小範圍）→ ⑤坐站功能。","<b>觀察擴散是否成功</b>：①觸診弱側肌群有無收縮；②弱側肢體是否出現小幅動作或張力變化；③接著讓弱側單獨做，表現是否比誘發前好。","擴散若出現<b>不想要的協同模式</b>（例如患側整體屈曲），調整擺位或降低阻力。"],
        elder:["長輩耐力有限，整套組合控制在 15–20 分鐘，每一步 5–8 次。","家屬可以學「兩邊一起用力」的雙側對稱練習，作為居家版 irradiation。"]
      },
      quiz:[{q:"下列何者是「擴散成功」的觀察指標？",options:["健側很累","弱側觸診到收縮且之後單獨做變好","治療師手痠","病人說話變多"],a:1,why:"弱側有反應且轉移到主動表現才是成功。"},{q:"擴散時患側出現整體屈曲共同動作，應？",options:["加大阻力","調整擺位或降低阻力","停止治療","忽略"],a:1,why:"不想要的協同模式表示擺位或阻力量不對。"}],
      practice:`<p>用上面的五步組合幫夥伴（模擬右側偏癱）做一輪，每一步寫下你觀察到右側的反應。</p>`
    }
  ]},

  /* ===================== 模組 4 ===================== */
  { id:"m4", title:"功能應用：帶長輩做", color:"#7A4E8A",
    intro:"翻身、坐起、坐站、步態——把型態與技術放進真實生活動作。",
    lessons:[
    { id:"4-1", title:"墊上活動：翻身與橋式", en:"Mat activities: rolling & bridging", minutes:25,
      goals:["用肩胛／骨盆型態與 chopping/lifting 促進翻身","用骨盆後下壓與擠壓促進橋式","把墊上活動轉成床上的長輩照護動作"],
      videos:[
        {yt:"dzuT_GXCB-c", title:"Rolling: Rhythmic Initiation, Combination of Isotonics & Dynamic Reversals", channel:"Maha Tayseer（大學物治課程）", dur:"4 分", lang:"無旁白", cc:"無字幕", note:"模組 3 到模組 4 的轉場：同一個翻身動作，用三種手法各做一次。此片無字幕，對照摘要看手位。"},
        {yt:"levaD93G8bE", title:"PNF in Bridging Position", channel:"Maha Tayseer", dur:"3 分", lang:"英文", cc:"自動字幕", note:"橋式下的阻力位置與進階順序。長輩常因踝背屈受限腳跟踩不穩，先處理擺位。"},
        {yt:"MM4YVJuAh1c", title:"Prone-on-Elbows Stability: Stabilizing Reversals & Rhythmic Stabilization", channel:"Maha Tayseer", dur:"3 分", lang:"英文", cc:"自動字幕", note:"俯臥撐肘是與長輩落差最大的姿勢（需肩伸與頸後伸），高齡復能使用率低，可改坐姿前撐或站姿扶檯面。"}
      ],
      summary:{
        keypoints:["<b>翻身</b>：從仰臥往側邊翻＝上方的肩胛前上提＋骨盆前上提（或 chopping／lifting 帶軀幹旋轉）；治療師手在肩峰與髂嵴給阻力或輔助。","<b>橋式</b>：雙膝屈曲踩床，骨盆後下壓＋膝的擠壓（往腳的方向壓）促進臀肌與伸髖；可加穩定反轉練骨盆穩定。","墊上活動的順序：翻身 → 側臥撐肘 → 坐起，每一步都可用 PNF 技術促進。"],
        elder:["<b>床上翻身</b>是照顧者最需要的技能：教家屬用「請長輩看向要翻的方向、健側手抓對側床緣、健腳跨過患腳」的口令，就是 PNF 視覺＋型態的居家版。","橋式是換尿布、拉褲子的基礎，長輩做不到全橋就從「臀部離床一公分」開始。"],
        irradiation:["翻身往患側：對健側 chopping 抗阻可誘發患側軀幹；橋式對健側膝擠壓可誘發患側臀肌。"]
      },
      quiz:[{q:"翻身時上方肩胛與骨盆做的型態是？",options:["後下壓＋後下壓","前上提＋前上提","前上提＋後下壓","後上提＋前下壓"],a:1,why:"上方的肩胛與骨盆同時前上提，帶動軀幹向前旋轉。"}],
      practice:`<p>夥伴仰臥。先用口令與視覺引導翻身；再加肩胛前上提的阻力；最後用 chopping 帶。比較三次翻身的流暢度。</p>`
    },
    { id:"4-2", title:"坐姿平衡與坐站", en:"Sitting balance & sit-to-stand", minutes:30,
      goals:["用穩定反轉與節律穩定訓練坐姿平衡","把坐站拆成前傾、離座、伸直三階段並各配一個 PNF 技術","說出長輩坐站訓練的安全與劑量"],
      videos:[
        {yt:"gPFrRzzqSAY", title:"PNF in Sitting Position", channel:"Maha Tayseer（大學物治課程）", dur:"3 分", lang:"英文", cc:"字幕不完整", note:"坐姿 PNF 的整體架構（此片字幕幾乎無法辨識，看畫面抓手位即可）。長輩常見薦椎坐姿與軀幹側傾，先做坐姿對位再開始。"},
        {yt:"sIUZn8Qd27w", title:"Sitting Stability: Stabilizing Reversals", channel:"Maha Tayseer", dur:"2 分", lang:"英文", cc:"自動字幕", note:"坐姿穩定反轉示範。"},
        {yt:"Rm8fsOYQ_1c", title:"PNF for the Pelvis", channel:"Physical Therapy Education Solutions", dur:"7 分", lang:"英文", cc:"人工英文字幕", note:"與 2-3 同一支：骨盆四個型態的手位與阻力方向。坐站前的骨盆抗阻就是用這個手位轉到坐姿。"},
        {yt:"m0NOoD2AUkc", title:"Facilitating Sit to Stand", channel:"sotahouston", dur:"3 分", lang:"英文", cc:"自動字幕", note:"⚠️這支是 NDT／動作促進取向，不是 PNF 手法；只看治療師站位、手位與重心引導。「骨盆前上提抗阻→坐站」的 PNF 版示範目前沒有公開影片，之後由本站補錄。"}
      ],
      summary:{
        keypoints:["<b>坐姿平衡</b>：肩或骨盆的穩定反轉（前後左右）→ 加入 lifting/chopping 的動態重心轉移。","<b>坐站三階段</b>：①前傾＝軀幹屈曲＋骨盆前傾，用 chopping 方向或口令「鼻子過腳趾」；②離座＝雙膝擠壓＋骨盆後下壓；③伸直＝髖膝伸展抗阻（等張組合的向心段）。","<b>坐下</b>＝等張組合的離心段，「慢慢坐，不要跌坐」。","坐站是高齡功能與跌倒風險的核心指標，也是本站其他課程（坐站遞減梯度）的接點。"],
        elder:["椅高先調到膝以上 5 公分，成功後再降；扶手先用再拿掉。","衰弱長輩每組 5 次、做 2–3 組，中間休息，觀察心跳與喘。","偏癱長輩：患腳略後放、健手放在患側膝上壓（自我擠壓），可減少健側代償。"],
        safety:["起立性低血壓者站起後停 10 秒再走。"]
      },
      quiz:[{q:"坐站的「離座」階段最適合哪個基本程序？",options:["牽引","擠壓","牽拉反射","視覺"],a:1,why:"膝與骨盆的擠壓促進伸肌與承重。"},{q:"「坐下」對應的技術是？",options:["節律啟動","等張組合離心段","收縮放鬆","複製"],a:1,why:"坐下是伸肌的離心控制。"}],
      practice:`<p>夥伴坐椅子。先做肩的穩定反轉 30 秒；再做三階段坐站各 5 次，你在膝上給擠壓、在骨盆給後下壓的阻力；最後 5 次「慢慢坐下」。</p>`,
      refs:["Marchese, R. R., et al. (2021). PNF induces muscle irradiation to the lower limbs. <i>Journal of Bodywork and Movement Therapies, 27</i>, 440–446.（往右 lifting 對臀大肌誘發最強、下肢型態對股四頭肌與比目魚肌最佳——坐站前的暖身可直接套用）","da Silva, L. G., et al. (2025). Physical functioning improvements in older adults following a PNF-based resisted exercise program. <i>Journal of Aging and Physical Activity</i>. https://doi.org/10.1123/japa.2024-0403（阻力式坐站與行走，五次坐站 −7.8 秒）","Lamp, J. D. S., et al. (2023). Acute effects of different PNF stabilization techniques on the balance of elderly women. <i>Journal of Bodywork and Movement Therapies, 35</i>, 342–347.（單次 15 分鐘穩定技術即改善 TUG 與 FRT）"]
    },
    { id:"4-3", title:"步態訓練", en:"Gait training", minutes:30,
      goals:["說出步態各期對應的下肢與骨盆型態","在站姿與行走中對骨盆給阻力（前上提促擺盪、後下壓促站立）","用擠壓促進站立期承重"],
      videos:[
        {yt:"O1pIxlH2F3k", title:"Locomotor Skills: Resisted Progression in Forward / Backward Walking", channel:"Maha Tayseer（大學物治課程）", dur:"5 分", lang:"英文", cc:"自動字幕", note:"PNF 步態核心技術（resisted progression）：站立腿骨盆向下擠壓（00:47）、擺盪腿骨盆前側抗阻（02:05）、邁步前快速牽拉（04:15），前進與後退都有。長輩要先能安全獨立行走、在平行桿或有前方支撐下做。"},
        {yt:"l_mL9t0zvQQ", title:"Resisted Progression in Side Stepping", channel:"Maha Tayseer", dur:"3 分", lang:"英文", cc:"自動字幕", note:"側向跨步的阻力。長輩常以軀幹側傾代償，要辨識。"},
        {yt:"EPHmvuq5yhw", title:"Resisted Progression on Stairs", channel:"Maha Tayseer", dur:"2 分", lang:"英文", cc:"自動字幕", note:"上下階梯的阻力性前進，對高齡階梯訓練實用。"},
        {yt:"MulqZV8YrZM", title:"Basic bridge exercise – approximation toward the ankle", channel:"PNF easy（韓國 PNF 專科物理治療師）", dur:"26 秒", lang:"韓語", cc:"自動英文字幕", note:"補充：26 秒示範擠壓（approximation）朝踝關節方向的施力，對照上方第一支影片 00:47 的站立腿骨盆擠壓一起看。"}
      ],
      summary:{
        keypoints:["<b>站立期</b>：骨盆後下壓＋下肢 D1 伸展；治療師在骨盆給向下向後的擠壓與阻力，促進承重與推進。","<b>擺盪期</b>：骨盆前上提＋下肢 D1 屈曲（強調踝背屈）；治療師在髂前上棘給向後向下的阻力，病人要「把骨盆往前帶」。","治療師站在病人<b>後方</b>，雙手在骨盆，用身體重心給阻力；可先在原地重心轉移練，再走。","步態訓練的 PNF 進階：站姿穩定反轉 → 原地重心轉移抗阻 → 行走中骨盆抗阻 → 側走、後退、上下階。"],
        elder:["長輩步態問題多在<b>骨盆沒動</b>與<b>踝背屈弱</b>，先用 1-6 的 timing for emphasis 與 2-3 的骨盆型態，再進到行走。","助行器使用者：治療師在後方給骨盆阻力仍可行；先確認助行器高度與煞車。","從「原地重心轉移抗阻」開始最安全，很多長輩光這一步就有明顯進步。"],
        safety:["骨盆抗阻時病人一定要有前方支撐（平行桿、助行器或牆）。"],
        irradiation:["對健側骨盆前上提抗阻，可誘發患側髖伸與站立穩定。"]
      },
      quiz:[{q:"擺盪期骨盆型態與治療師阻力方向是？",options:["後下壓、向前","前上提、向後向下","後上提、向上","前下壓、向後"],a:1,why:"擺盪腳骨盆前上提，治療師在髂前上棘給向後向下阻力。"},{q:"步態 PNF 訓練的第一步應為？",options:["直接走 50 公尺","站姿穩定反轉與原地重心轉移抗阻","跑步","上樓梯"],a:1,why:"先建立站姿穩定與重心轉移，再進到行走。"}],
      practice:`<p>夥伴站在桌邊扶著。你在他後方雙手在髂嵴，先做站姿穩定反轉 30 秒，再做原地重心轉移抗阻（左右各 10 次），最後走 5 公尺並在擺盪側骨盆給阻力。</p>`
    },
    { id:"4-4", title:"中風／偏癱個案：整合示範", en:"PNF for hemiplegia: integrated case", minutes:30,
      goals:["依 ICF 為一位偏癱長輩設定功能目標並挑選型態與技術","示範一次 20 分鐘的 PNF 療程流程（啟動→誘發→功能）","說出何時該停下來調整"],
      videos:[
        {yt:"5LeMsMMACXY", title:"中風個案早期踝關節再教育對站姿的影響（PNF 技法）", channel:"PNF easy（韓國 PNF 專科物理治療師）", dur:"12 分", lang:"韓語", cc:"自動英文字幕", note:"⚠️這支是治療師坐姿講解（引用肌動學與坐站文獻），不是實際操作畫面。價值在臨床推理：為什麼中風早期要處理踝關節、常見的「踹腳」代償從哪來、患側腳跟退後 10 公分的依據。請對照時間軸看。"},
        {yt:"R057s9Z8Fb4", title:"Upper Extremity for ADL use – 2 Tx from PNF", channel:"IPNF Association 官方頻道", dur:"3 分", lang:"英文", cc:"自動字幕", note:"官方示範：把兩個手法接進上肢 ADL 任務，是「手法→功能」的轉譯範例。"},
        {yt:"Gnv_rnBMPxc", title:"Pelvic PNF for Hemiplegia and Other Neurological Cases", channel:"Nervology", dur:"9 分", lang:"無字幕", cc:"無字幕", note:"補充：骨盆型態在偏癱的操作，與 4-2 銜接。無字幕、非協會來源，看畫面即可。"}
      ],
      summary:{
        keypoints:["<b>流程範例</b>（目標：自己從床邊站起走到廁所）：①仰臥肩胛／骨盆型態＋節律穩定 3 分鐘（叫醒軀幹）→ ②健側 lifting 往患側抗阻、健側 D1 屈曲抗阻＋患側踩床（irradiation 誘發患側軀幹與髖伸）5 分鐘 → ③坐姿穩定反轉＋chopping/lifting 3 分鐘 → ④坐站三階段＋等張組合 5 分鐘 → ⑤站姿重心轉移抗阻＋行走 4 分鐘。","<b>臨床推理</b>：每一步先問「病人現在做得到什麼」（正向取向），再問「哪個技術能把它推一步」。","<b>何時調整</b>：出現痙攣增加、疼痛、憋氣、不想要的協同模式、明顯疲勞——降阻力、換擺位或換技術。","<b>與其他取向並用</b>：PNF 負責啟動與誘發，接著用任務導向的大量重複鞏固。"],
        elder:["家屬版：雙手交握 lifting、雙腳一起踩、兩邊一起站——三個「兩邊一起」就是居家 irradiation。","記錄：每次寫下擴散成功的擺位與阻力量，下次直接從那裡開始。"]
      },
      quiz:[{q:"整合療程中 irradiation 誘發患側最適合放在？",options:["最後放鬆","啟動之後、功能活動之前","不需要","只在家做"],a:1,why:"先叫醒軀幹，再誘發患側，最後把誘發出的能力用進功能。"},{q:"治療中出現患側痙攣增加，應？",options:["加大阻力繼續","降阻力、換擺位或換技術","立刻結束今天治療","忽略"],a:1,why:"痙攣增加是調整訊號，通常是阻力太大或擺位不當。"}],
      practice:`<p>寫下一位你熟悉的偏癱長輩，用上面五步設計一次 20 分鐘療程，每步標注型態、技術、阻力位置與預期的患側反應。下次治療試做並記錄。</p>`
    }
  ]},

  /* ===================== 模組 5 ===================== */
  { id:"m5", title:"證據與趨勢", color:"#22201C",
    intro:"近十年的研究說了什麼、國際 PNF 課程體系怎麼走、還有哪些缺口。",
    lessons:[
    { id:"5-1", title:"PNF 近十年證據回顧", en:"Evidence 2015–2026", minutes:30,
      goals:["說出 PNF 在中風、高齡、牽拉、擴散四個領域的證據強度與限制","分辨「加法設計」與「替代設計」的研究，正確解讀矛盾的結論","能在教學或提案中正確引用 3 篇關鍵文獻，並誠實揭露限制"],
      pre:`<p>這一課的主體是文字：一份讀後即可用在教學與提案的證據地圖。每個領域先給結論，再給代表證據與該注意的限制。YouTube 上沒有針對 PNF 高齡與中風證據的回顧講座，下方唯一一支影片談的是「PNF 如何從技藝走向實證」的方法論，不是療效數據。</p>`,
      videos:[
        {yt:"1uIN6wZ1frA", title:"PNF Concept IPNFA: From ART to Evidence Based Practice (Sakis Adamidis, PhD, IPNFA Adv. Instructor)", channel:"Physio Master Training", dur:"21 分", lang:"英文", cc:"自動字幕", note:"補充：談 PNF 面對實證要求的轉型，不含高齡療效數據。證據本身請讀下方摘要。"}
      ],
      summary:{
        keypoints:[
          "<b>中風——正反並陳</b>。正向：Nguyen 等（2022）12 篇 RCT／327 人，PNF 加在常規治療上改善 BBS、FRT、TUG 與步速；Van Criekinge 等（2019）軀幹訓練（含 PNF）對軀幹控制 SMD 1.08、站立平衡 0.84。反向：Todhunter-Brown 等（2025，Cochrane，267 篇／21,838 人）指出神經生理學取向作為整套療法在 IADL 上可能劣於其他取向（SMD −0.34），功能性任務訓練較優（SMD 0.58）；Scrivener 等（2020）單篇比較中 Bobath 站立平衡優於 PNF。<b>解讀</b>：正向來自加法設計、反向來自替代設計，所以 PNF 應嵌入任務訓練而非取代它。另注意 Gunning 與 Uszynski（2019）的步態回顧曾遭美國神經物理治療學會投書質疑（Karpatkin et al., 2022），引用時要一併揭露。",
          "<b>高齡——小樣本、短療程、功能指標</b>。最乾淨：da Silva 等（2025）n = 25、平均 80.4 歲，PNF 阻力組 SPPB ＋1.9、步速 ＋0.20 m/s、五次坐站 −7.8 秒，對照組反而退步；GEE 分析、唯一變因是徒手阻力。Matla 與 Czupryna（2025）住院長者 10 天內 ADL／IADL／TUG／SPPB 優於一般復健，對 PAC 有參考價值。Xiong 等（2024）n = 160、6 個月，平衡與骨密度改善，跌倒較少但為次要觀察。<b>反證</b>：與有氧（Kajbafvala et al., 2025）、皮拉提斯（Mesquita et al., 2015）比較均無差異。<b>結論</b>：「有做 ＞ 沒做」大於「PNF ＞ 別的」；不可宣稱 PNF 預防跌倒；衰弱與肌少症幾乎沒有直接研究（口腔衰弱例外：Park et al., 2025）。",
          "<b>牽拉——有效但不優於靜態，機制已改寫</b>。Cayco 等（2019）HR／CR 對腿後肌 SMD 1.02（I² ≈ 0%），但與靜態牽拉比較結果矛盾；Konrad 等（2024）77 篇統合：PNF 與靜態皆優於彈震式，量、強度、頻率都不是顯著調節變項；Wanderley 等（2019）46 篇多為低至極低品質。<b>機制</b>：Freitas 等（2018）顯示 8 週內肌腱勁度與結構變化極小，效果主要來自<b>牽拉耐受度</b>提升，不是 Golgi 腱器自體抑制——教材若只講「腱器讓肌肉放鬆」就停在 1980 年代。<b>長輩取捨</b>：CR／HR 需要用力等長收縮，心血管與認知受限者用靜態牽拉更合理，因為效果本來就相近。",
          "<b>擴散——健康人穩固、病人薄弱</b>。EMG：Abreu 等（2015）對側上斜方肌達 27% MVIC；Marchese 等（2021）往右 lifting 對臀大肌誘發最強；Reznik 等（2015）阻力在對側下肢才能誘發脛前肌，上肢無效。中風：de Oliveira 等（2019）n = 22，多數比較不顯著。Cross-education：Smyth 等（2023）健側訓練→患側肌力 SMD 0.58、功能 0.40（GRADE 低）；Calvert 與 Carson（2022）直言老化對其機制的影響「幾乎完全未知」。",
          "<b>研究缺口五項</b>：①介入忠實度沒有標準——已發表 RCT 存在對技術與原則的誤用（Smedes et al., 2019），讀研究要先看方法段有沒有寫出用了哪些基本程序、誰執行、受過哪一級訓練；②高齡樣本小、跌倒非主要終點、衰弱幾近空白；③擴散在病理族群證據落差；④機制宣稱超前——PNF 對關節位置覺的證據無法下結論（Takasaki et al., 2020），交互收縮序列並未比單純收縮更能提升力矩發展速率（Green et al., 2021）；⑤高齡與中風族群的最適劑量與 6 個月以上追蹤完全未知。",
          "<b>臨床限制五點</b>：高度依賴施作者手感、人力密集、CR／HR 對心血管與骨鬆風險族群需調整、需口語理解與配合（中重度失智受限）、證據天花板明確——不應宣稱優於任務導向訓練。"
        ],
        elder:["對家屬與長輩的一句話版本：「這是用治療師的手幫你把動作做起來的方法，沒有器材、可以在床邊做，做完要接著練真正的動作。」"]
      },
      quiz:[
        {q:"為什麼 Nguyen 等（2022）與 Cochrane 2025 的結論可以同時成立？",options:["其中一篇是錯的","一個是加法設計（PNF＋常規）、一個是替代設計（以流派取代任務訓練）","樣本都太小","年代不同"],a:1,why:"研究設計不同回答的問題不同：加在任務訓練上有效，取代任務訓練則不利。"},
        {q:"PNF 牽拉增加 ROM 的主要機制，近年證據支持？",options:["Golgi 腱器自體抑制","肌腱變長","牽拉耐受度提升","關節囊鬆弛"],a:2,why:"Freitas 等（2018）顯示組織力學性質變化極小，適應主要在感覺層次。"},
        {q:"下列哪一句話可以對家屬說？",options:["PNF 能預防跌倒","練健側就不用練患側","健側用力時患側也會被帶動，短期內可能維持肌力","PNF 比所有運動都有效"],a:2,why:"跌倒預防與取代患側訓練都沒有證據；cross-education 只支持肌力層次的說法。"},
        {q:"讀一篇 PNF 的 RCT 時，最先該檢查什麼？",options:["樣本數是否超過 100","方法段是否寫出用了哪些基本程序、誰執行、受過哪一級訓練","是否有 p < 0.05","期刊影響係數"],a:1,why:"介入忠實度是 PNF 研究異質性的根源，寫不出來的研究效果量只能參考。"}
      ],
      practice:`<p>挑一個你最常對家屬或同事說的 PNF 宣稱（例如「練健側可以帶動患側」），用這一課的證據把它改寫成一句<b>不過度承諾</b>的版本，並附上一篇文獻。寫進你的教學講義或衛教單。</p>`,
      refs:[
        "Todhunter-Brown, A., et al. (2025). Physical rehabilitation approaches for the recovery of function and mobility following stroke. <i>Cochrane Database of Systematic Reviews, 2025</i>(2), CD001920. https://doi.org/10.1002/14651858.CD001920.pub4",
        "Nguyen, P. T., Chou, L. W., & Hsieh, Y. L. (2022). PNF-based physical therapy on the improvement of balance and gait in patients with chronic stroke. <i>Life, 12</i>(6), 882. https://doi.org/10.3390/life12060882",
        "Van Criekinge, T., et al. (2019). The effectiveness of trunk training on trunk control, sitting and standing balance and mobility post-stroke. <i>Clinical Rehabilitation, 33</i>(6), 992–1002. https://doi.org/10.1177/0269215519830159",
        "Scrivener, K., et al. (2020). Bobath therapy is inferior to task-specific training and not superior to other interventions in improving lower limb activities after stroke. <i>Journal of Physiotherapy, 66</i>(4), 225–235. https://doi.org/10.1016/j.jphys.2020.09.008",
        "Gunning, E., & Uszynski, M. K. (2019). Effectiveness of the PNF method on gait parameters in patients with stroke: A systematic review. <i>Archives of Physical Medicine and Rehabilitation, 100</i>(5), 980–986. https://doi.org/10.1016/j.apmr.2018.11.020",
        "Karpatkin, H., et al. (2022). Letter to the editor. <i>Archives of Physical Medicine and Rehabilitation, 103</i>(11), 2266–2267. https://doi.org/10.1016/j.apmr.2022.05.022",
        "da Silva, L. G., et al. (2025). Physical functioning improvements in older adults following a PNF-based resisted exercise program: A randomized clinical trial. <i>Journal of Aging and Physical Activity</i>. https://doi.org/10.1123/japa.2024-0403",
        "Matla, M., & Czupryna, A. (2025). Application of PNF concept in hospitalized elderly patients in the context of independence improvement. <i>Folia Medica Cracoviensia, 65</i>(3), 85–100. https://doi.org/10.24425/fmc.2025.156686",
        "Xiong, X., et al. (2024). Effects of PNF technique on balance function and muscle health in older adults with high fall risk. <i>Journal of Gerontological Nursing, 50</i>(8), 37–44. https://doi.org/10.3928/00989134-20240702-03",
        "Kajbafvala, M., et al. (2025). The effect of PNF techniques compared to general aerobic exercise on balance, fear of falling, and quality of life in older adults living in nursing homes. <i>BMC Geriatrics, 25</i>, 200. https://doi.org/10.1186/s12877-025-05822-y",
        "Mesquita, L. S. A., et al. (2015). Effects of two exercise protocols on postural balance of elderly women: A randomized controlled trial. <i>BMC Geriatrics, 15</i>, 61. https://doi.org/10.1186/s12877-015-0059-3",
        "Lamp, J. D. S., et al. (2023). Acute effects of different PNF stabilization techniques on the balance of elderly women. <i>Journal of Bodywork and Movement Therapies, 35</i>, 342–347. https://doi.org/10.1016/j.jbmt.2023.04.054",
        "Park, J. S., Kim, H., & Han, N. (2025). Effects of multidirectional head lift exercise based on PNF techniques on oropharyngeal swallowing muscles in community-dwelling older adults with oral frailty. <i>Journal of Oral Rehabilitation, 52</i>(12), 2282–2290. https://doi.org/10.1111/joor.70031",
        "Cayco, C. S., Labro, A. V., & Gorgon, E. J. R. (2019). Hold-relax and contract-relax stretching for hamstrings flexibility. <i>Physical Therapy in Sport, 35</i>, 42–55. https://doi.org/10.1016/j.ptsp.2018.11.001",
        "Konrad, A., et al. (2024). Chronic effects of stretching on range of motion with consideration of potential moderating variables. <i>Journal of Sport and Health Science, 13</i>(2), 186–194. https://doi.org/10.1016/j.jshs.2023.06.002",
        "Wanderley, D., et al. (2019). Efficacy of PNF compared to other stretching modalities in range of motion gain in young healthy adults: A systematic review. <i>Physiotherapy Theory and Practice, 35</i>(2), 109–129. https://doi.org/10.1080/09593985.2018.1440677",
        "Freitas, S. R., et al. (2018). Can chronic stretching change the muscle-tendon mechanical properties? A review. <i>Scandinavian Journal of Medicine & Science in Sports, 28</i>(3), 794–806. https://doi.org/10.1111/sms.12957",
        "Medeiros, D. M., & Martini, T. F. (2018). Chronic effect of different types of stretching on ankle dorsiflexion range of motion. <i>The Foot, 34</i>, 28–35. https://doi.org/10.1016/j.foot.2017.09.006",
        "Abreu, R., et al. (2015). Force irradiation effects during upper limb diagonal exercises on contralateral muscle activation. <i>Journal of Electromyography and Kinesiology, 25</i>(2), 292–297. https://doi.org/10.1016/j.jelekin.2014.12.004",
        "Marchese, R. R., et al. (2021). PNF induces muscle irradiation to the lower limbs: A cross-sectional study with healthy individuals. <i>Journal of Bodywork and Movement Therapies, 27</i>, 440–446. https://doi.org/10.1016/j.jbmt.2020.12.026",
        "Reznik, J. E., Biros, E., & Bartur, G. (2015). An electromyographic investigation of the pattern of overflow facilitated by manual resistive PNF in young healthy individuals. <i>Physiotherapy Theory and Practice, 31</i>(8), 582–586. https://doi.org/10.3109/09593985.2015.1061627",
        "de Oliveira, K. C. R., et al. (2019). Overflow using PNF in post-stroke hemiplegics: A preliminary study. <i>Journal of Bodywork and Movement Therapies, 23</i>(2), 399–404. https://doi.org/10.1016/j.jbmt.2018.02.011",
        "Smyth, C., et al. (2023). To assess the effects of cross-education on strength and motor function in post stroke rehabilitation. <i>Physiotherapy, 119</i>, 80–88. https://doi.org/10.1016/j.physio.2023.02.001",
        "Calvert, G. H. M., & Carson, R. G. (2022). Neural mechanisms mediating cross education: With additional considerations for the ageing brain. <i>Neuroscience & Biobehavioral Reviews, 132</i>, 260–288. https://doi.org/10.1016/j.neubiorev.2021.11.025",
        "Smedes, F., Shin, S., & Giacometti da Silva, L. (2019). Incorrect use of PNF-techniques and principles. <i>Brazilian Journal of Physical Therapy, 23</i>(3), 273–274. https://doi.org/10.1016/j.bjpt.2019.02.001",
        "Takasaki, H., Okubo, Y., & Okuyama, S. (2020). The effect of PNF on joint position sense: A systematic review. <i>Journal of Sport Rehabilitation, 29</i>(4), 488–497. https://doi.org/10.1123/jsr.2018-0498",
        "Green, L. A., McGuire, J., & Gabriel, D. A. (2021). Effects of the PNF contraction sequence on motor skill learning-related increases in the maximal rate of wrist flexion torque development. <i>Frontiers in Human Neuroscience, 15</i>, 764660. https://doi.org/10.3389/fnhum.2021.764660"
      ]
    },
    { id:"5-2", title:"IPNFA 課程體系與國際趨勢", en:"IPNFA curriculum & trends", minutes:15,
      goals:["說出 IPNFA 課程序列（PNF 1＋2 → 3 → 4A／4B → 5 → 講師）與時數","說出近年三個概念更新：concept 非 method、12 項基本程序、ICF 與動作學習為骨幹","規劃自己的 PNF 進修路徑，並知道線上自學的界線"],
      videos:[
        {yt:"qCpm2UJrX_Q", title:"Lecture 1 – The PNF Concept (Fred Smedes)", channel:"IPNF Association 官方頻道", dur:"99 分", lang:"英文", cc:"自動字幕", note:"與 0-1 同一支。這一課只看 ICF 與動作學習兩段（時間軸見 0-1）。"},
        {yt:"dV2TexlC7WQ", title:"The PNF Concept in the Perspective of Orthopedic Manual Therapy (Fred Smedes)", channel:"Ortho TV", dur:"34 分", lang:"英文", cc:"自動字幕", note:"補充：PNF 作為「開放概念」與骨科徒手治療的整合，展現國際趨勢。以骨科族群為例。"}
      ],
      summary:{
        keypoints:[
          "<b>課程序列</b>（IPNFA, 2026）：PNF 1＋2 共 75 小時（兩段各 5 天，兩年內完成），內容含基本程序、型態、技術、墊上與步態，並已納入 ICF、動作學習與動作控制；PNF 3（37 小時，含 3 小時示範與 4 小時受督導治療）以 ICF 做臨床推理、以任務導向教學法授課；PNF 4A（37 小時）為特定診斷族群專科應用；之後 PNF 5 與 Instructor Training。",
          "<b>更新一：PNF 是 concept 不是 method</b>（Smedes, 2022）。Method 僵固、concept 允許在原則內個別化——這是為什麼同一個技術在不同病人身上長得不一樣。",
          "<b>更新二：12 項基本程序、三大類</b>：外感覺（觸覺／蚓狀肌抓握、聽覺口令、視覺）、本體感覺（最適阻力、擠壓、牽引、拉長、擴散與強化、型態）、程序性（時序、強調時序、身體力學、加成）。<b>型態只是其中一項</b>，直接反制「PNF ＝ 對角線＋牽拉」。",
          "<b>更新三：ICF 與動作學習是骨幹，不是附加章節</b>。注意力焦點從內在（肌肉）轉向外在（目標、任務）；強調有挑戰、有意義的任務練習。Smedes 與 Giacometti da Silva（2019）甚至以 PNF 概念下的動作學習作為限制誘發療法的替代路徑。",
          "<b>與科技整合</b>：PNF 型態驅動的機器人輔助治療優於徒手同型態（Demirhan et al., 2026）；機器人步態訓練加 PNF 擴散優於單純機器人（Yoon et al., 2025）；軀幹 PNF 疊加 tDCS（Tedla et al., 2022）。方向是「徒手誘發補足機器重複量」。",
          "<b>反向趨勢</b>：國際神經復健正在把「以流派命名的整套療法」往下調（Todhunter-Brown et al., 2025）。PNF 要維持正當性，靠的是<b>成分的可操作化</b>——阻力、擴散、時序、抓握、口令這些能被量化、劑量化、嵌進任何任務導向方案的東西。",
          "<b>線上自學的界線</b>：這門課對齊 PNF 1–2 的知識層，但手感、阻力量與擴散的判斷只能在實體課與臨床中累積。建議路徑：本課 → 找夥伴練滿模組 1–4 的實作 → 報名 IPNFA 認證講師的 PNF 1＋2。"
        ],
        elder:["台灣長照與居家場域的資源條件（無器材、一對一、時間短）正好是 PNF 成分最能發揮的地方——這是你在提案或教學裡最站得住腳的定位。"]
      },
      quiz:[
        {q:"IPNFA 的 PNF 1＋2 課程時數與完成期限是？",options:["30 小時、半年","75 小時、兩年內","120 小時、三年","無限制"],a:1,why:"PNF 1＋2 共 75 小時，兩段各 5 天，兩年內完成。"},
        {q:"依 Smedes（2022），PNF 型態（pattern）在基本程序中的地位是？",options:["最核心、其他都是輔助","12 項基本程序中的一項","不算基本程序","只用於運動員"],a:1,why:"型態只是 12 項之一，PNF 不等於對角線螺旋。"},
        {q:"PNF 在 2020 年代維持正當性的關鍵是？",options:["主張流派優越","把成分可操作化並嵌入任務導向方案","只用在健康人","放棄徒手改用機器"],a:1,why:"國際主流正在往下調整套流派療法，可量化、可劑量化的成分才能存活。"}
      ],
      practice:`<p>寫下你的 PNF 進修計畫：①這門課哪三課要再回頭練？②找誰當練習夥伴、每週幾次？③查一下台灣近一年有沒有 IPNFA 認證講師開的 PNF 1＋2 課程，記下時間與費用。</p>`,
      refs:[
        "International PNF Association. (2026). <i>PNF 1 & PNF 2 / PNF 3 / PNF 4A course descriptions</i>. https://www.ipnfa.org/courses/",
        "Smedes, F. (2022). The essential elements of the PNF-concept, an educational narrative. <i>Journal of Physical Medicine and Rehabilitation, 4</i>(2), 37–48. https://doi.org/10.33696/rehabilitation.4.030",
        "Smedes, F., Heidmann, M., Schäfer, C., Fischer, N., & Stępień, A. (2016). The PNF-concept; the state of the evidence, a narrative review. <i>Physical Therapy Reviews, 21</i>(1), 17–31. https://doi.org/10.1080/10833196.2016.1216764",
        "Smedes, F., & Giacometti da Silva, L. (2019). Motor learning with the PNF-concept, an alternative to constrained induced movement therapy in a patient after a stroke: A case report. <i>Journal of Bodywork and Movement Therapies, 23</i>(3), 622–627. https://doi.org/10.1016/j.jbmt.2018.05.003",
        "Demirhan, İ., et al. (2026). The efficacy of PNF-based robot-assisted therapy in individuals with stroke: A randomized controlled trial. <i>Archives of Physical Medicine and Rehabilitation, 107</i>(9), 2468–2480. https://doi.org/10.1016/j.apmr.2026.04.027",
        "Yoon, B., Park, S., Oh, S., & You, J. S. H. (2025). Augmented effect of combined robotic assisted gait training and PNF-irradiation technique on muscle activation and ankle kinematics in hemiparetic gait. <i>NeuroRehabilitation, 56</i>(2), 196–206. https://doi.org/10.1177/10538135241296733",
        "Tedla, J. S., et al. (2022). Transcranial direct current stimulation combined with trunk-targeted PNF in subacute stroke: A randomized controlled trial. <i>PeerJ, 10</i>, e13329. https://doi.org/10.7717/peerj.13329",
        "Todhunter-Brown, A., et al. (2025). Physical rehabilitation approaches for the recovery of function and mobility following stroke. <i>Cochrane Database of Systematic Reviews, 2025</i>(2), CD001920. https://doi.org/10.1002/14651858.CD001920.pub4"
      ]
    }
  ]}
  ]
};
