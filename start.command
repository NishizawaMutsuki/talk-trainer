#!/bin/bash
# Talk Trainer 起動スクリプト
# ダブルクリックでサーバー起動 → ブラウザが自動で開く

cd "$(dirname "$0")"

# 前のプロセスを掃除
lsof -ti:3000 | xargs kill -9 2>/dev/null

# ブラウザを1.5秒後に開く（バックグラウンド）
(sleep 1.5 && open http://localhost:3000) &

# サーバー起動（このウィンドウが開いている間だけ動く）
npm run dev
