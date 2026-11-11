/* 趕走山豬 2：「接下來可以玩」〔待確認〕
   表與句子是先擬的，網址要老闆確認後才填（url 留空＝卡片顯示「即將開放」）。 */
export const GAMES = {
  net: { name: '溪邊舉網', url: '' },
  fishing: { name: '漁港釣魚', url: '' },
  rhythm: { name: '節奏律動', url: '' },
  cat: { name: '找貓咪', url: '' },
  ride: { name: '騎遍台灣', url: '' },
};
/* 由上往下，第一條符合的就用 */
export const RULES = [
  { id: 'high', when: (m) => m.highWeak || m.liftGap, games: ['net', 'fishing'], why: '多練把手舉高、停住' },
  { id: 'react', when: (m) => m.slow || m.commission, games: ['rhythm', 'fishing'], why: '多練看清楚再動' },
  { id: 'low', when: (m) => m.lowWeak, games: ['cat'], why: '多練身體左右轉' },
  { id: 'good', when: () => true, games: ['ride', 'rhythm'], why: '換一種動法' },
];
export const NOTE = '〔待確認〕';

/* m：{highWeak, liftGap, slow, commission, lowWeak}（由接頭依這次量到的結果算好） */
export function recommend(m) {
  const r = RULES.find((x) => x.when(m));
  return { rule: r.id, why: r.why, games: r.games.slice(0, 2).map((k) => ({ id: k, ...GAMES[k] })) };
}
