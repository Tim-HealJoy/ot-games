#!/bin/bash
# 感．動復能「感」六款動作答題封面：Codex 序列生圖（2026-11-11）。用獨立 CODEX_HOME 防污染。
set -u
ROOT="/Users/tim/Library/Mobile Documents/com~apple~CloudDocs/tim-claude-agent"
GEN="$ROOT/000_Agent/scripts/codex_image.sh"
DIR="$(cd "$(dirname "$0")" && pwd)"; RAW="$DIR/raw"; mkdir -p "$RAW"
home="${TMPDIR:-/tmp}/gandong_codex_home"; mkdir -p "$home"; ln -sf "$HOME/.codex/auth.json" "$home/auth.json"; export CODEX_HOME="$home"
FRESH="請重新生成一張全新的圖，不要沿用任何先前產生的圖片。"
STYLE="橫式遊戲封面插畫。畫風：溫暖的扁平向量插畫，柔和圓潤的造型、乾淨的深棕色細輪廓，色調以米色 #F4EFE3、陶土橘、橄欖綠、天空藍為主，明亮溫暖；主角是親切的台灣長輩（約 70 多歲），表情開心自然、身體比例正常；物件少而大、一眼看得懂；背景簡潔不雜亂。畫面中絕對不要有任何文字、字母、數字、價格標籤上的字或標誌。主角坐在椅子上，一隻手往旁邊伸出去，像是在選一張浮在空中的大圖卡。"
gen() { local id="$1" text="$2" file="$RAW/$1.png"
  [ -s "$file" ] && { echo "略過 $id"; return 0; }
  echo "$(date +%H:%M) ▶ $id"; local log; log="$(mktemp)"
  if ! caffeinate -i "$GEN" -o "$file" -a landscape "$FRESH $STYLE $text" >/dev/null 2>"$log" </dev/null; then
    grep -qi "usage limit" "$log" && { echo "⛔ 額度用完 $(grep -i 'usage limit' "$log"|head -1)"; exit 4; }
    echo "✗ $id $(tail -2 "$log"|tr '\n' ' ')"; rm -f "$log"; return 0; fi
  rm -f "$log"; local sz; sz=$(stat -f%z "$file")
  for o in "$RAW"/*.png; do [ "$o" != "$file" ] && [ "$(stat -f%z "$o")" = "$sz" ] && { echo "⚠️ $id 疑似污染，刪除"; rm -f "$file"; return 0; }; done
  echo "$(date +%H:%M) ✓ $id"; }
gen speed "場景：一位阿嬤坐在客廳椅子上，面前左右各浮著一張大圖卡，左邊是一列流線型的白色高速列車，右邊是一台腳踏車，阿嬤笑著把手伸向高速列車那張。背景有淡淡的速度線。"
gen veg "場景：一位阿公坐在椅子上，面前浮著三張大圖卡：一張是茄子的黑色剪影、一張是切開的蓮藕剖面、一張是放大的玉米特寫；阿公好奇地把手伸向蓮藕那張。旁邊有一籃新鮮蔬菜。"
gen price "場景：台灣傳統市場的菜攤前，一位阿嬤坐在小椅子上，面前左右兩張大圖卡，左邊是一條鮮魚、右邊是一顆高麗菜，阿嬤一手托著下巴思考、一手伸向鮮魚那張。菜攤後面有竹籃、秤、紅色塑膠籃。"
gen memo "場景：一位阿嬤坐在椅子上，手裡拿著一張空白的小紙條（紙上沒有任何字），旁邊放著一個竹編菜籃，面前浮著三張大圖卡：青菜、雞蛋、豆腐；阿嬤認真回想、把手伸向雞蛋那張。背景是溫暖的市場遮雨棚。"
gen seq "場景：一位阿公坐在木桌旁泡茶，桌上有一壺熱水、一個小茶壺、一個小茶杯；面前浮著三張大圖卡排成一排，用大箭頭連起來：熱水壺 → 茶葉 → 一杯熱茶；阿公把手伸向中間那張。"
gen place "場景：一位阿嬤坐在椅子上，背景是一張簡化的台灣島地圖（綠色島嶼、藍色海洋，地圖上沒有任何字），地圖上點綴著小小的美食與景點圖示：一碗牛肉麵、一盒草莓、一座燈塔、一座湖；阿嬤開心地把手伸向浮在面前的一張牛肉麵大圖卡。"
echo "$(date +%H:%M) 全部完成"
