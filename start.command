#!/bin/bash
# AI Head Motion Tracker — 雙擊啟動（Mac）
# 自動啟 local server + 開瀏覽器
cd "$(dirname "$0")"

PORT=8765
echo "===================================="
echo "  AI 頭部動作感測器 — 本機啟動中"
echo "===================================="
echo ""

# 找可用 port（8765 被佔就試 8766/8767/...）
while lsof -i :$PORT >/dev/null 2>&1; do
    echo "Port $PORT 已被佔用，改試 $((PORT+1))"
    PORT=$((PORT+1))
    if [ $PORT -gt 8775 ]; then
        echo "❌ 找不到可用 port，請手動關閉佔用 8765-8775 的程式"
        read -p "按 Enter 關閉視窗"
        exit 1
    fi
done

# 找 python
if command -v python3 >/dev/null 2>&1; then
    PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON=python
else
    echo "❌ 找不到 Python，請先安裝（terminal 跑 'brew install python'）"
    read -p "按 Enter 關閉視窗"
    exit 1
fi

URL="http://localhost:$PORT/"
echo "✅ Server 啟動於 $URL"
echo "✅ 即將自動開瀏覽器"
echo ""
echo "🔴 要結束：直接關掉這個視窗 (cmd-W) 或 ctrl-C"
echo ""

# 1.5 秒後開瀏覽器
(sleep 1.5 && open "$URL") &

# 啟 server（前景跑，方便關閉）
$PYTHON -m http.server $PORT
