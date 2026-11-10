/*!
 * tw_folk_bgm.js — 台灣民謠 WebAudio 合成器樂 BGM 模組
 * 《騎鐵馬，送便當》專用；單檔、零外部相依、零音檔（音符全部由程式合成）。
 *
 * 版權說明
 * --------
 * 本模組「不含任何錄音取樣」，所有聲音皆由 WebAudio 振盪器與雜訊即時合成。
 * 收錄旋律皆屬公有領域：
 *   - 鄧雨賢（1906–1944）作曲：著作財產權存續期間已屆滿。
 *   - 台灣傳統民謠：作者不可考、年代久遠。
 * 本模組刻意「只用旋律、不用歌詞、不做人聲」——歌詞作者（如李臨秋 1979 年歿）
 * 的權利期間尚未屆滿，只要不重製歌詞、不唱出來，即與詞的著作權無涉。
 * 伴奏、和聲、音色、節奏皆為本模組自行編寫。
 *
 * API
 * ---
 *   const bgm = createBGM(audioCtx, destinationNode);
 *   bgm.list()            -> [{id, title, composer, year, rights, bpm, meter, loopSeconds, voices}]
 *   bgm.play('bangchunhong')
 *   bgm.stop()
 *   bgm.setVolume(0.14)   // 0~1，預設 0.14（治療師要能講話）
 *   bgm.getVolume() / bgm.current() / bgm.isPlaying()
 *
 * ⚠️ iOS Safari：AudioContext 必須在使用者手勢後才能啟動。
 *    本模組「不會」自己呼叫 audioCtx.resume()，請由呼叫端在點擊事件內處理。
 *
 * 離線渲染（自動偵測 OfflineAudioContext）：
 *    傳入 OfflineAudioContext 時，play() 會一次把整段時間的音符排完（不用 setInterval），
 *    方便自動化測試 / 匯出。
 */
(function (global) {
  'use strict';

  // =====================================================================
  // 1. 簡譜格式
  // ---------------------------------------------------------------------
  // 每個 token：  音級(0=休止, 1~7) + 八度記號 + 可選 "/拍數"
  //   八度記號： ","  低八度（可重複）   "'"  高八度（可重複）
  //   拍數    ： 省略 = 1 拍； "/.5" = 半拍； "/1.5" = 附點四分
  //   例： "5,/1.5 5,/.5 6, 1"  = 低 sol(1.5拍) 低 sol(0.5) 低 la(1) do(1)
  // =====================================================================

  var MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]; // 1 2 3 4 5 6 7 相對主音的半音數

  function parseBar(barText) {
    var out = [];
    var tokens = String(barText).trim().split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (!tk) continue;
      var m = /^([0-7])([,']*)(?:\/(\d*\.?\d+))?$/.exec(tk);
      if (!m) throw new Error('簡譜 token 格式錯誤：' + tk);
      var degree = parseInt(m[1], 10);
      var octave = 0;
      for (var j = 0; j < m[2].length; j++) octave += (m[2][j] === "'" ? 1 : -1);
      var beats = m[3] ? parseFloat(m[3]) : 1;
      out.push({ degree: degree, octave: octave, beats: beats });
    }
    return out;
  }

  function degreeToMidi(tonicMidi, degree, octave) {
    if (degree === 0) return null; // 休止符
    return tonicMidi + MAJOR_STEPS[degree - 1] + octave * 12;
  }

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midiToName(m) {
    return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  }

  // 和弦：級數 -> [根音半音, 三和弦音程]
  var CHORDS = {
    I:  { root: 0, kind: 'maj' },
    ii: { root: 2, kind: 'min' },
    IV: { root: 5, kind: 'maj' },
    V:  { root: 7, kind: 'maj' },
    vi: { root: 9, kind: 'min' }
  };
  function chordTones(tonicMidi, sym) {
    var c = CHORDS[sym] || CHORDS.I;
    var iv = (c.kind === 'maj') ? [0, 4, 7] : [0, 3, 7];
    var base = tonicMidi + c.root;
    return [base + iv[0], base + iv[1], base + iv[2]];
  }

  // =====================================================================
  // 2. 曲庫
  // ---------------------------------------------------------------------
  // source 標註譜源可信度，方便日後校正：
  //   'verified'      = 已對照公開簡譜逐音轉錄
  //   'reconstructed' = 依流傳版本重建，尚未逐音核對
  // =====================================================================
  var SONGS = [
    {
      id: 'bangchunhong',
      title: '望春風',
      composer: '鄧雨賢',
      year: 1933,
      note: '台灣歌謠代表作，五聲音階宮調式，四句十六小節。',
      rights: '鄧雨賢 1933 年作曲，著作財產權已消滅、旋律進入公有領域；本曲為程式合成之純器樂編曲，不含歌詞與人聲。',
      source: 'verified',
      bpm: 96,
      beatsPerBar: 4,
      tonicMidi: 72,           // 1 = C5
      gainTrim: 0.42,
      voices: { lead: 'dizi', chord: 'pluck', perc: 'soft' },
      chords: ['I','I','V','V', 'I','V','vi','I', 'V','vi','I','I', 'I','V','vi','I'],
      bars: [
        "5,/1.5 5,/.5 6, 1",           // 獨 夜 無 伴
        "2 1/.5 2/.5 3/2",             // 守 燈 下
        "5/1.5 3/.5 3/.5 2/.5 1",      // 春 風 對 面
        "2/4",                          // 吹
        "3/1.5 5/.5 5 3/.5 5/.5",      // 十 七 八 歲
        "1/1.5 2/.5 2/2",              // 未 出 嫁
        "5,/1.5 3/.5 3 2",             // 想 著 少 年
        "1/4",                          // 家
        "2/1.5 2/.5 3 2/.5 1/.5",      // 果 然 標 緻
        "6, 5,/.5 6,/.5 1/2",          // 面 肉 白
        "6,/1.5 1/.5 2 3",             // 誰 家 人 子
        "5/4",                          // 弟
        "5/1.5 5/.5 6 5/.5 3/.5",      // 想 要 問 伊
        "3 2/.5 1/.5 6,/2",            // 驚 歹 勢
        "5,/1.5 3/.5 3 2",             // 心 內 彈 琵
        "1/4"                           // 琶
      ]
    },
    {
      id: 'uyahue',
      title: '雨夜花',
      composer: '鄧雨賢',
      year: 1934,
      note: '三拍子抒情調，速度最慢，適合當「田頭休息／完賽」段落。',
      rights: '鄧雨賢 1934 年作曲，著作財產權已消滅、旋律進入公有領域；本曲為程式合成之純器樂編曲，不含歌詞與人聲。',
      source: 'verified',
      bpm: 78,
      beatsPerBar: 3,
      tonicMidi: 72,           // 1 = C5
      gainTrim: 1.5,           // 慢板音符稀疏，整體響度補一點回來
      voices: { lead: 'pluck', chord: 'guitar', perc: 'soft' },
      chords: ['I','vi','I','V', 'I','vi','I','I'],
      bars: [
        "5,/.5 6,/.5 5, 3",                     // 雨 夜 花
        "3/.5 2/.5 1/.5 6,/.5 5,",              // 雨 夜 花
        "1/.5 2/.5 3 5/.5 1/.25 2/.25",         // 受 風 雨
        "3/.5 3/.5 2/2",                        // 吹 落 地
        "5/.5 5/.5 5/.5 3/.25 5/.25 3",         // 無 人 看 見
        "3/.5 2/.25 3/.25 2/.5 1/.5 6,",        // 每 日 怨 慼
        "5,/.5 6,/.5 5, 3",                     // 花 謝 落 塗
        "3/.5 2/.5 1/2"                         // 不 再 回
      ]
    },
    {
      id: 'diudiudang',
      title: '丟丟銅仔',
      composer: '宜蘭傳統民謠',
      year: null,
      note: '火車調，跳躍二拍子，速度最快、最有「騎車前進」的推進感。',
      rights: '宜蘭一帶流傳之傳統民謠，作者不可考、屬公有領域；本曲為程式合成之純器樂編曲，未使用任何既有錄音或他人編曲。',
      source: 'verified',
      bpm: 116,
      beatsPerBar: 2,
      tonicMidi: 60,           // 1 = C4（旋律主要落在高八度記號）
      gainTrim: 1.25,
      voices: { lead: 'pluck', chord: 'guitar', perc: 'lively' },
      chords: ['V','V','V','V', 'I','I', 'V','V','V','V', 'I','I', 'V','I'],
      bars: [
        "2' 3'",                       // 火 車
        "2'/.75 3'/.25 2'/.5 1'/.5",   // 行 到 伊 都
        "2'/.5 3'/.5 2'/.5 1'/.5",     // 阿 末 伊 都
        "2' 2'/.5 1'/.5",              // 丟
        "5 6/.5 1'/.5",                // 唉 唷 磅
        "5/2",                         // 空 內
        "6 2'",
        "6/.5 1'/.5 1'/.5 6/.5",
        "2' 2'/.5 2'/.5",
        "1'/.5 2'/.5 1'/.5 6/.5",
        "5/.5 5/.5 5/.5 5/.5",
        "6/.5 1'/.5 6/.5 5/.5",
        "2' 6",
        "5/2"
      ]
    },
    {
      id: 'sikuihong',
      title: '四季紅',
      composer: '鄧雨賢',
      year: 1938,
      note: '旋律依節奏律動專案自開放博物館老唱片採譜的版本（tunes.py）。嗩吶感主奏，配菜市場廟口。',
      rights: '鄧雨賢 1938 年作曲，著作財產權已消滅、旋律進入公有領域；本曲為程式合成之純器樂編曲，不含歌詞與人聲。',
      source: 'verified',
      bpm: 128,
      beatsPerBar: 4,
      tonicMidi: 72,           // 1 = C5
      gainTrim: 1.5,
      voices: { lead: 'reed', chord: 'pluck', perc: 'temple' },
      chords: ['I','I','I','I','V','I','I','I','I','I','I','IV','V','I','I','I'],
      bars: [
        "0/3 5,",
        "1/2 1 3/.5 2/.5",
        "1 3/2 5,",
        "3 3 3 3",
        "2/.5 1/.5 2/2 1",
        "1/.5 3/1.5 1 1",
        "3 2 5,/2",
        "3, 5, 2 1",
        "1/2 3 5",
        "5/1.5 5/1.5 5",
        "5 3/.5 2/2.5",
        "1/2 5,/2",
        "5, 2/.5 1/2.5",
        "5/2 5/2",
        "5/2 5 3",
        "5/4"
      ]
    },
    {
      id: 'shangxue',
      title: '上學去（本案原創）',
      composer: '本案原創',
      year: 2026,
      note: '五聲音階小進行曲，鐵琴音色，配國小上學路。',
      rights: '本案原創旋律，非既有歌曲。',
      source: 'original',
      bpm: 112,
      beatsPerBar: 4,
      tonicMidi: 72,
      gainTrim: 1.1,
      voices: { lead: 'bell', chord: 'guitar', perc: 'lively' },
      chords: ['I','I','vi','I','I','IV','I','I','I','V','vi','I','IV','I','V','I'],
      bars: [
        "1 1/.5 2/.5 3 5",
        "6 5/.5 3/.5 5/2",
        "5 3/.5 5/.5 6 1'",
        "6/.5 5/.5 3/.5 2/.5 3/2",
        "1 1/.5 2/.5 3 5",
        "6 1'/.5 6/.5 5/2",
        "3/.5 5/.5 6/.5 5/.5 3 2",
        "1/2 0/2",
        "5 5/.5 6/.5 5 3",
        "2 3/.5 2/.5 1/2",
        "6, 1/.5 2/.5 3 5",
        "3/.5 2/.5 1/.5 2/.5 3/2",
        "5 5/.5 6/.5 1' 6",
        "5 3/.5 5/.5 6/2",
        "5/.5 3/.5 2/.5 3/.5 5 2",
        "1/2 0/2"
      ]
    },
    {
      id: 'jianfeng',
      title: '尖峰時刻（本案原創）',
      composer: '本案原創',
      year: 2026,
      note: '小調感、八分音符低音推進，配大馬路尖峰。',
      rights: '本案原創旋律，非既有歌曲。',
      source: 'original',
      bpm: 140,
      beatsPerBar: 4,
      tonicMidi: 72,
      gainTrim: 1.2,
      voices: { lead: 'brass', chord: 'guitar', perc: 'drive' },
      chords: ['vi','vi','I','V','vi','vi','I','vi','vi','IV','I','V','vi','IV','V','vi'],
      bars: [
        "6,/.5 6,/.5 1/.5 6,/.5 2/.5 1/.5 6,",
        "6,/.5 6,/.5 1/.5 2/.5 3/.5 2/.5 1",
        "3/.5 3/.5 5/.5 3/.5 6/.5 5/.5 3",
        "2/.5 1/.5 2/.5 3/.5 2/2",
        "6,/.5 6,/.5 1/.5 6,/.5 2/.5 1/.5 6,",
        "6,/.5 6,/.5 1/.5 2/.5 3/.5 5/.5 6",
        "5/.5 3/.5 2/.5 3/.5 5/.5 3/.5 2",
        "1/.5 6,/.5 1/.5 2/.5 6,/2",
        "6/.5 6/.5 1'/.5 6/.5 5/.5 3/.5 5",
        "6/.5 6/.5 1'/.5 2'/.5 1'/.5 6/.5 5",
        "3/.5 5/.5 6/.5 5/.5 3/.5 2/.5 1",
        "2/.5 3/.5 5/.5 3/.5 2/2",
        "6/.5 6/.5 1'/.5 6/.5 5/.5 3/.5 5",
        "6/.5 5/.5 3/.5 2/.5 3/.5 5/.5 6",
        "5/.5 3/.5 2/.5 1/.5 2/.5 3/.5 2",
        "6,/1.5 6,/.5 6,/2"
      ]
    },
    {
      id: 'wuhou',
      title: '午後田埂（本案原創）',
      composer: '本案原創',
      year: 2026,
      note: '五聲音階、慢步調，蘆笛音色，配新手的土地公廟小路。',
      rights: '本案原創旋律，非既有歌曲。',
      source: 'original',
      bpm: 92,
      beatsPerBar: 4,
      tonicMidi: 72,
      gainTrim: 1.15,
      voices: { lead: 'reed', chord: 'guitar', perc: 'soft' },
      chords: ['I','vi','IV','I','I','V','I','I','vi','IV','I','V','I','IV','V','I'],
      bars: [
        "3 5/.5 6/.5 5 3",
        "2 3/.5 2/.5 1 6,",
        "1 2/.5 3/.5 5 6",
        "5/2 3/2",
        "3 5/.5 6/.5 1' 6",
        "5 3/.5 2/.5 2/2",
        "3/.5 2/.5 1/.5 2/.5 3 5",
        "1/2 0/2",
        "6 6/.5 5/.5 6 1'",
        "6/.5 5/.5 3/.5 5/.5 6/2",
        "5 3/.5 5/.5 6 5",
        "3/.5 2/.5 1/.5 2/.5 2/2",
        "3 5/.5 6/.5 5 3",
        "2 1/.5 6,/.5 1/2",
        "2/.5 3/.5 2/.5 1/.5 6, 5,",
        "1/2 0/2"
      ]
    }
  ];

  // =====================================================================
  // 3. 合成音色
  // =====================================================================
  function createBGM(ctx, destination) {
    if (!ctx) throw new Error('createBGM 需要一個 AudioContext');
    var dest = destination || ctx.destination;
    var isOffline = (typeof ctx.startRendering === 'function' && typeof ctx.length === 'number');

    // ---- 共用白噪音 buffer（氣音、撥弦雜訊、打擊）----
    var noiseBuf = (function () {
      var len = Math.floor(ctx.sampleRate * 1.2);
      var b = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })();

    // 母音量（呼叫端可調）
    var master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(dest);

    // 每次 play 建立一顆，stop 時淡出丟棄 —— 避免殘響爆音、避免狀態殘留
    var songBus = null;

    function noiseSource() {
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      s.playbackRate.value = 0.8 + Math.random() * 0.4;
      return s;
    }

    // ---- 撥弦類（月琴／古箏）：快起音＋指數衰減＋雙弦微失諧 ----
    function pluck(t, freq, dur, gain, opts) {
      if (!songBus || !freq) return;
      opts = opts || {};
      var bright = opts.bright == null ? 1 : opts.bright;
      var detune = opts.detune == null ? 9 : opts.detune;   // cents，模擬雙股弦
      var decay = Math.max(0.18, Math.min(dur * 1.45 + 0.25, 2.2));

      var amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.006);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.9;
      lp.frequency.setValueAtTime(Math.min(freq * 8 * bright, 12000), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.6, 200), t + decay * 0.8);
      lp.connect(amp);
      amp.connect(songBus);

      var o1 = ctx.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = freq;
      var g1 = ctx.createGain(); g1.gain.value = 0.5;
      o1.connect(g1); g1.connect(lp);

      var o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = freq;
      o2.detune.value = detune;
      var g2 = ctx.createGain(); g2.gain.value = 0.65;
      o2.connect(g2); g2.connect(lp);

      o1.start(t); o2.start(t);
      o1.stop(t + decay + 0.05); o2.stop(t + decay + 0.05);

      // 撥片觸弦的短雜訊
      var n = noiseSource();
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = Math.min(freq * 4, 4200); nf.Q.value = 1.2;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(gain * 0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      n.connect(nf); nf.connect(ng); ng.connect(songBus);
      n.start(t); n.stop(t + 0.06);
    }

    // ---- 木吉他／尼龍弦：比月琴柔、衰減慢一點、沒有失諧 ----
    function guitar(t, freq, dur, gain) {
      pluck(t, freq, dur, gain * 0.95, { bright: 0.6, detune: 3 });
    }

    // ---- 竹笛：正弦為主＋輕微顫音＋氣音噪音 ----
    function dizi(t, freq, dur, gain) {
      if (!songBus || !freq) return;
      var atk = 0.045, rel = 0.09;
      var len = Math.max(dur, 0.12);

      var amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + atk);
      amp.gain.setValueAtTime(gain, t + Math.max(len - rel, atk + 0.01));
      amp.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
      amp.connect(songBus);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(freq * 5.5, 9000);
      lp.Q.value = 0.7;
      lp.connect(amp);

      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * 0.988, t);          // 起音微微「滑」上去
      o.frequency.linearRampToValueAtTime(freq, t + 0.055);
      var og = ctx.createGain(); og.gain.value = 1;
      o.connect(og); og.connect(lp);

      // 第二泛音一點點，笛聲才不會太像測試音
      var o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(freq * 2 * 0.988, t);
      o2.frequency.linearRampToValueAtTime(freq * 2, t + 0.055);
      var o2g = ctx.createGain(); o2g.gain.value = 0.14;
      o2.connect(o2g); o2g.connect(lp);

      // 顫音（vibrato）：起音後才漸漸出現，比較像真人吹
      var lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.2 + Math.random() * 0.6;
      var lfoG = ctx.createGain();
      lfoG.gain.setValueAtTime(0.0001, t);
      lfoG.gain.linearRampToValueAtTime(len > 0.5 ? 16 : 7, t + Math.min(len * 0.6, 0.35)); // cents
      lfo.connect(lfoG);
      lfoG.connect(o.detune);
      lfoG.connect(o2.detune);

      // 氣音
      var n = noiseSource();
      var hp = ctx.createBiquadFilter();
      hp.type = 'bandpass'; hp.frequency.value = Math.min(freq * 2.2, 5000); hp.Q.value = 0.8;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(gain * 0.16, t + atk);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
      n.connect(hp); hp.connect(ng); ng.connect(songBus);

      var stopAt = t + len + rel + 0.05;
      o.start(t); o2.start(t); lfo.start(t); n.start(t);
      o.stop(stopAt); o2.stop(stopAt); lfo.stop(stopAt); n.stop(stopAt);
    }

    // ---- 打擊：竹板（高頻短促）＋ 悶鼓（低頻）----
    function woodblock(t, gain, tone) {
      if (!songBus) return;
      var n = noiseSource();
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = tone || 2100;
      bp.Q.value = 7;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      n.connect(bp); bp.connect(g); g.connect(songBus);
      n.start(t); n.stop(t + 0.09);
    }

    function lowdrum(t, gain) {
      if (!songBus) return;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(105, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(songBus);
      o.start(t); o.stop(t + 0.26);
    }

    // ---- 鐵琴：校園感，正弦＋高泛音，敲完就散 ----
    function bell(t, freq, dur, gain) {
      if (!songBus || !freq) return;
      var decay = Math.max(.35, Math.min(dur * 1.5, 1.4));
      [[1, 1], [3, .22], [5.4, .07]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq * p[0];
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(gain * p[1], .0002), t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + decay / p[0] + .08);
        o.connect(g); g.connect(songBus); o.start(t); o.stop(t + decay + .1);
      });
    }
    // ---- 銅管：短促有力，尖峰時刻用 ----
    function brass(t, freq, dur, gain) {
      if (!songBus || !freq) return;
      var len = Math.max(dur, .1), amp = ctx.createGain(), lp = ctx.createBiquadFilter(), o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq;
      lp.type = 'lowpass'; lp.Q.value = 1; lp.frequency.setValueAtTime(freq * 1.2, t); lp.frequency.exponentialRampToValueAtTime(Math.min(freq * 5, 6000), t + .05); lp.frequency.exponentialRampToValueAtTime(freq * 2, t + len);
      amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(gain, t + .018); amp.gain.setValueAtTime(gain * .8, t + Math.max(len - .05, .02)); amp.gain.exponentialRampToValueAtTime(.0001, t + len + .06);
      o.connect(lp); lp.connect(amp); amp.connect(songBus); o.start(t); o.stop(t + len + .1);
    }
    // ---- 簧片（嗩吶感）：鼻音重，廟口用 ----
    function reed(t, freq, dur, gain) {
      if (!songBus || !freq) return;
      var len = Math.max(dur, .1), amp = ctx.createGain(), bp = ctx.createBiquadFilter(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), o2g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq; o2.type = 'square'; o2.frequency.value = freq; o2.detune.value = 6; o2g.gain.value = .35;
      bp.type = 'bandpass'; bp.frequency.value = Math.min(freq * 2.6, 3400); bp.Q.value = 1.3;
      l.frequency.value = 5.6; lg.gain.value = len > .4 ? 16 : 5; l.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
      amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(gain, t + .03); amp.gain.setValueAtTime(gain, t + Math.max(len - .05, .04)); amp.gain.exponentialRampToValueAtTime(.0001, t + len + .08);
      o.connect(bp); o2.connect(o2g); o2g.connect(bp); bp.connect(amp); amp.connect(songBus);
      var end = t + len + .12; o.start(t); o2.start(t); l.start(t); o.stop(end); o2.stop(end); l.stop(end);
    }

    var LEADS = { dizi: dizi, pluck: pluck, guitar: guitar, bell: bell, brass: brass, reed: reed };

    // =====================================================================
    // 4. 把一首歌展開成「事件表」（以拍為單位，與 BPM 無關）
    // =====================================================================
    function buildEvents(song) {
      var events = [];
      var tonic = song.tonicMidi;
      var leadFn = LEADS[song.voices.lead] || dizi;
      var chordFn = LEADS[song.voices.chord] || guitar;
      var leadGain = { dizi: 0.5, pluck: 0.42, guitar: 0.42, bell: 0.46, brass: 0.2, reed: 0.3 }[song.voices.lead] || 0.42;

      // --- 主旋律 ---
      var beat = 0;
      for (var b = 0; b < song.bars.length; b++) {
        var notes = parseBar(song.bars[b]);
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          var midi = degreeToMidi(tonic, n.degree, n.octave);
          if (midi != null) {
            (function (midi, len) {
              events.push({
                beat: beat,
                play: function (t, spb) { leadFn(t, midiToFreq(midi), len * spb * 0.94, leadGain); }
              });
            })(midi, n.beats);
          }
          beat += n.beats;
        }
      }
      var totalBeats = beat;

      // --- 伴奏（分解和弦＋低音）＋ 打擊 ---
      var bpb = song.beatsPerBar;
      var chordBase = tonic - 12;
      var bassBase = tonic - 24;
      var perc = song.voices.perc;

      for (var bar = 0; bar < song.bars.length; bar++) {
        var sym = song.chords[bar % song.chords.length] || 'I';
        var tones = chordTones(chordBase, sym);
        var bassRoot = chordTones(bassBase, sym)[0];
        var bassFifth = chordTones(bassBase, sym)[2];
        var barStart = bar * bpb;
        if (barStart >= totalBeats) break;

        var pattern; // [beatOffset, midi, gain, kind]
        if (perc === 'drive') {
          pattern = [];
          for (var q8 = 0; q8 < 8; q8++) pattern.push([q8 * .5, q8 % 4 === 2 ? bassFifth : bassRoot, q8 % 2 ? 0.14 : 0.22, 'bass']);
          pattern.push([1.5, tones[1], 0.1, 'chord'], [3.5, tones[2], 0.1, 'chord']);
        } else if (bpb === 4) {
          pattern = [
            [0,   bassRoot,  0.26, 'bass'],
            [1,   tones[1],  0.15, 'chord'],
            [1.5, tones[2],  0.10, 'chord'],
            [2,   bassFifth, 0.22, 'bass'],
            [3,   tones[2],  0.15, 'chord'],
            [3.5, tones[1] + 12, 0.09, 'chord']
          ];
        } else if (bpb === 3) {
          pattern = [
            [0, bassRoot, 0.26, 'bass'],
            [1, tones[1], 0.15, 'chord'],
            [2, tones[2], 0.13, 'chord']
          ];
        } else { // 2/4
          pattern = [
            [0,   bassRoot, 0.26, 'bass'],
            [0.5, tones[1], 0.13, 'chord'],
            [1,   tones[2], 0.15, 'chord'],
            [1.5, tones[1] + 12, 0.09, 'chord']
          ];
        }

        for (var p = 0; p < pattern.length; p++) {
          var pb = barStart + pattern[p][0];
          if (pb >= totalBeats) continue;
          (function (midi, gain, kind) {
            events.push({
              beat: pb,
              play: function (t, spb) {
                if (kind === 'bass') pluck(t, midiToFreq(midi), spb * 1.2, gain, { bright: 0.4, detune: 4 });
                else chordFn(t, midiToFreq(midi), spb * 0.9, gain);
              }
            });
          })(pattern[p][1], pattern[p][2], pattern[p][3]);
        }

        // 打擊
        var hits;
        if (perc === 'drive') hits = [[0,'drum',0.2],[1,'block',0.1],[2,'drum',0.16],[3,'block',0.1],[.5,'hat',0.03],[1.5,'hat',0.03],[2.5,'hat',0.03],[3.5,'hat',0.03]];
        else if (perc === 'temple') hits = [[0,'drum',0.2],[1,'block',0.1],[1.5,'block',0.055],[2,'drum',0.14],[3,'block',0.1],[3.5,'block',0.055]];
        else if (bpb === 4) hits = [[0,'drum',0.16],[1,'block',0.075],[2,'drum',0.11],[3,'block',0.075]];
        else if (bpb === 3) hits = [[0,'drum',0.15],[1,'block',0.065],[2,'block',0.055]];
        else                hits = (perc === 'lively')
                                 ? [[0,'drum',0.16],[0.5,'block',0.05],[1,'block',0.085],[1.5,'block',0.05]]
                                 : [[0,'drum',0.15],[1,'block',0.07]];
        for (var h = 0; h < hits.length; h++) {
          var hb = barStart + hits[h][0];
          if (hb >= totalBeats) continue;
          (function (kind, gain) {
            events.push({
              beat: hb,
              play: function (t) {
                if (kind === 'drum') lowdrum(t, gain);
                else if (kind === 'hat') woodblock(t, gain, 7200);
                else woodblock(t, gain, 2000 + Math.random() * 400);
              }
            });
          })(hits[h][1], hits[h][2] * (perc === 'soft' ? 0.8 : 1));
        }
      }

      events.sort(function (a, b) { return a.beat - b.beat; });
      return { events: events, totalBeats: totalBeats };
    }

    // 事件表快取（同一首曲子重播不用重算）
    var cache = {};
    function getPlan(song) {
      if (!cache[song.id]) cache[song.id] = buildEvents(song);
      return cache[song.id];
    }

    // =====================================================================
    // 5. 排程器
    // =====================================================================
    var LOOKAHEAD = 0.28;   // 秒：往前排多久
    var TICK_MS = 40;
    var timer = null;
    var currentSong = null;
    var plan = null;
    var spb = 0.5;          // seconds per beat
    var loopStart = 0;
    var idx = 0;

    function tick() {
      if (!plan || !songBus) return;
      var now = ctx.currentTime;
      var guard = 0;
      while (guard++ < 4000) {
        if (idx >= plan.events.length) {
          loopStart += plan.totalBeats * spb;   // 無縫接回開頭
          idx = 0;
        }
        var e = plan.events[idx];
        var t = loopStart + e.beat * spb;
        if (t > now + LOOKAHEAD) break;
        if (t >= now - 0.05) e.play(t, spb);    // 落後太多的就跳過，不要擠在一起爆音
        idx++;
      }
    }

    function findSong(id) {
      for (var i = 0; i < SONGS.length; i++) if (SONGS[i].id === id) return SONGS[i];
      return null;
    }

    function killBus(fadeSec) {
      if (!songBus) return;
      var bus = songBus;
      songBus = null;
      var t = ctx.currentTime;
      try {
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
        bus.gain.exponentialRampToValueAtTime(0.0001, t + (fadeSec || 0.18));
      } catch (err) { /* 離線 context 可能已渲染結束 */ }
      if (!isOffline) {
        setTimeout(function () { try { bus.disconnect(); } catch (e) {} }, (fadeSec || 0.18) * 1000 + 300);
      }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      killBus(0.18);
      currentSong = null;
      plan = null;
      idx = 0;
    }

    function play(songId, opts) {
      var song = findSong(songId);
      if (!song) throw new Error('找不到曲目：' + songId);
      stop();
      opts = opts || {};

      songBus = ctx.createGain();
      songBus.gain.value = song.gainTrim || 1;   // 各曲響度微調，四首聽起來才一致
      songBus.connect(master);

      currentSong = song;
      plan = getPlan(song);
      spb = 60 / (opts.bpm || song.bpm);

      if (isOffline) {
        // 離線：一次把整段時間排完
        var total = ctx.length / ctx.sampleRate;
        loopStart = 0;
        idx = 0;
        var guard = 0;
        while (guard++ < 200000) {
          if (idx >= plan.events.length) { loopStart += plan.totalBeats * spb; idx = 0; }
          var e = plan.events[idx];
          var t = loopStart + e.beat * spb;
          if (t > total) break;
          e.play(t, spb);
          idx++;
        }
      } else {
        loopStart = ctx.currentTime + 0.12;   // 留一點排程餘裕
        idx = 0;
        tick();
        timer = setInterval(tick, TICK_MS);
      }
      return song.id;
    }

    function setVolume(v) {
      v = Math.max(0, Math.min(1, Number(v) || 0));
      var t = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(v, t + 0.06);
      } catch (e) {
        master.gain.value = v;
      }
      return v;
    }

    function list() {
      return SONGS.map(function (s) {
        var pl = getPlan(s);
        return {
          id: s.id,
          title: s.title,
          composer: s.composer,
          year: s.year,
          note: s.note,
          rights: s.rights,
          source: s.source,
          bpm: s.bpm,
          meter: s.beatsPerBar + '/4',
          bars: s.bars.length,
          loopSeconds: Math.round(pl.totalBeats * (60 / s.bpm) * 10) / 10,
          voices: s.voices
        };
      });
    }

    // 除錯／校譜用：印出某首曲子的音名
    function dumpNotes(songId, barCount) {
      var song = findSong(songId);
      if (!song) return null;
      var out = [];
      var n = barCount || song.bars.length;
      for (var b = 0; b < Math.min(n, song.bars.length); b++) {
        var notes = parseBar(song.bars[b]);
        out.push(notes.map(function (x) {
          var m = degreeToMidi(song.tonicMidi, x.degree, x.octave);
          return (m == null ? '休' : midiToName(m)) + '(' + x.beats + ')';
        }).join(' '));
      }
      return out;
    }

    return {
      play: play,
      stop: stop,
      setVolume: setVolume,
      getVolume: function () { return master.gain.value; },
      list: list,
      current: function () { return currentSong ? currentSong.id : null; },
      isPlaying: function () { return !!currentSong; },
      dumpNotes: dumpNotes,
      _master: master
    };
  }

  global.createBGM = createBGM;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createBGM: createBGM, SONGS: SONGS };
})(typeof window !== 'undefined' ? window : this);
