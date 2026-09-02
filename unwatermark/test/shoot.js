#!/usr/bin/env node
/**
 * 用 CDP 驅動 headless Chrome 拍 UI 截圖。
 *
 * 為什麼不用 `--screenshot --virtual-time-budget`：那個模式下 pdf.js 建立的
 * Web Worker 不受虛擬時間管轄，PDF 流程會永遠停在「處理中…」拍不到完成畫面。
 * 這支改用真實時間 + 輪詢 window.__shotDone，四種情境都拍得到。
 *
 * 用法：node test/shoot.js            （需先啟動 http://localhost:8795 靜態站）
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:8795';
const OUT = path.join(__dirname, 'shots');
const PORT = 9333;

const CASES = [
  { name: 'ui_images', url: BASE + '/unwatermark/test/browser_shot.html?case=images', w: 1260, h: 1560 },
  { name: 'ui_zoom', url: BASE + '/unwatermark/test/browser_shot.html?case=zoom', w: 1260, h: 1500 },
  { name: 'ui_manual', url: BASE + '/unwatermark/test/browser_shot.html?case=manual', w: 1260, h: 1560 },
  { name: 'ui_docs', url: BASE + '/unwatermark/test/browser_shot.html?case=docs', w: 1260, h: 1100 },
  { name: 'ui_mobile', url: BASE + '/unwatermark/test/mobile_shot.html', w: 430, h: 1900 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  return function send(method, params) {
    const myId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(myId, { resolve, reject });
      ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
    });
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + fs.mkdtempSync('/tmp/unwm-chrome-'),
    'about:blank'
  ], { stdio: 'ignore' });

  // 等 DevTools endpoint 起來
  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      if (targets.length) break;
    } catch (e) { /* 還沒起來 */ }
    await sleep(250);
  }
  if (!targets || !targets.length) { chrome.kill(); throw new Error('Chrome DevTools 沒起來'); }

  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  const send = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');

  for (const c of CASES) {
    await send('Emulation.setDeviceMetricsOverride',
      { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: c.url });

    let ok = false;
    for (let i = 0; i < 160; i++) {          // 最多等 80 秒
      await sleep(500);
      const r = await send('Runtime.evaluate',
        { expression: 'window.__shotDone === true || window.__done === true', returnByValue: true });
      if (r.result && r.result.value === true) { ok = true; break; }
    }
    await sleep(1200);                        // 讓最後一次 render 落地

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, c.name + '.png');
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));

    const st = await send('Runtime.evaluate',
      { expression: 'window.__shotStatus || "(mobile harness)"', returnByValue: true });
    console.log(`${ok ? '✅' : '⚠️ 逾時'} ${c.name}.png  ${c.w}×${c.h}\n   ${String(st.result.value).replace(/\n/g, '\n   ')}`);
  }

  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
