// 騎遍台灣：連線設定。
// 上線時填雲端中繼網址（例：wss://ride-relay.xxx.workers.dev），電腦和手機就不用連同一個 Wi-Fi。
// 留空＝連到提供這個網頁的伺服器（本機試玩與隧道用）。
window.RIDE_RELAY = 'wss://ride-relay.j2hsi9123.workers.dev';
// 本機（localhost）試玩時也連這裡，手機開 https 的手機頁，才讀得到傾斜。網址加 ?lan=1 可改走同一個 Wi-Fi。
window.RIDE_CLOUD = {relay: 'wss://ride-relay.j2hsi9123.workers.dev', site: 'https://games.otshih.com/ride-beta'};
