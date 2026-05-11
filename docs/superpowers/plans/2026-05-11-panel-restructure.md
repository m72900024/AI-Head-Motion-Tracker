# Panel Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把目前混在「校正設定」與「伴奏設定」兩面板裡的控制項，依「校正 / 彈奏 / 伴奏」三大功能重新分組為三個獨立面板，並修掉「連彈模式」錯放在伴奏面板的位置問題。

**Architecture:** 新建一個 `#play-panel` 面板與 `🎹 彈奏設定` 按鈕，沿用既有 `.side-panel` CSS 與互斥 toggle 模式（已有 `toggleCalibration` / `toggleAccompPanel`，擴成三選一）。控制項以 HTML 區塊整段搬遷，**不改任何 JS 邏輯、不改 element id**，所以既有 event handler、saveConfig/loadConfig、CalibrationSystem 都不受影響。

**Tech Stack:** Vanilla HTML + 既有 Tailwind utility classes + UIController.js 既有面板 toggle 模式 + 既有 CSS `.side-panel` / `.btn-base`

**Why this matters:** 個案研究對象（馥華）為視障+重度肢障雙重，UI 分組對她聽不到看不見都沒影響，但對「協助她的人」（媽媽 / 老師 / 治療師）邏輯清楚才能在現場快速調整正確區段。

---

## File Inventory

| 檔案 | 動作 | 範圍 |
|---|---|---|
| `index.html` | 修改 | 加新按鈕 + 新面板 container + 移動 5 段 HTML 區塊 |
| `js/UIController.js` | 修改 | 加 `togglePlayPanel()` + 改既有兩個 toggle 互斥邏輯 |
| `css/style.css` | 修改 | 加 `.play-btn` 樣式 + bottom 偏移 |
| `CHANGELOG.md` | 修改 | 加 [Unreleased] 段 |

## 控制項分組（最終目標）

### 🎹 彈奏面板（新建 `#play-panel`）— 頭控主旋律相關
- 樂器 (`#instrument-select`)
- 音量 (`#vol-slider`)
- 長度 (`#dur-slider`)
- 回中重置 (`#return-center-toggle`)
- 嘴部控制（`#mouth-enable-check` + `#mouth-trigger-mode`）
- 連彈模式（`#repeat-check`，從伴奏搬來）

### ⚙️ 校正面板（`#calib-panel`，清乾淨）— 校正系統
- 設定檔 Profile 1/2/3
- Mode switch（錄製 / 編輯）
- 錄製 controls（Set center / Circle range）
- 3x3 grid + point settings
- 反應靈敏度
- 座標縮放（auto / manual / yaw / pitch）
- 視覺輔助開關（觸發圈 / 導引框 / 紅點）—— 因為這是 calibration debug aids
- 儲存 / 讀取 / CSV / 重置

### 🎵 伴奏面板（`#accomp-panel`，清乾淨）— 自動伴奏
- 和弦進行 + 段落
- 伴奏音色
- 分解和弦
- 節拍器
- 語音報讀 + 語速
- 開始伴奏 / BPM / 伴奏音量
- 旋律示範
- 華爾滋

---

### Task 1: 新增彈奏面板骨架 + 按鈕 + 三選一 toggle

**Files:**
- Modify: `index.html:99-102`（加按鈕）, `index.html:309-310`（新面板 container）
- Modify: `js/UIController.js:16-17, 69-77`（加 element ref + 三 toggle 互斥）
- Modify: `css/style.css:56-58`（加 `.play-btn` 樣式）

- [ ] **Step 1.1: 加 `.play-btn` CSS**

修改 `css/style.css`，在 `.accomp-btn` 之後加：

```css
/* 彈奏按鈕（紫色，置於伴奏按鈕上方） */
.play-btn { position: absolute; bottom: 120px; right: 20px; background: #8b5cf6; color: #fff; z-index: 40; }
.play-btn:hover { background: #a78bfa; }
```

並把既有 `.accomp-btn` `bottom: 70px` 改 → `bottom: 70px`（不變），`.toggle-btn` `bottom: 20px`（不變）。
新按鈕在最上面 `bottom: 120px`。

- [ ] **Step 1.2: 加按鈕到 `index.html`**

在 `index.html:100`（`.accomp-btn` 那一行）之前插入：

```html
        <button class="btn-base play-btn" onclick="togglePlayPanel()">🎹 彈奏設定</button>
```

- [ ] **Step 1.3: 加新面板 container 到 `index.html`**

在 `index.html` 既有 `#calib-panel` 結束的 `</div>` 之後、`#accomp-panel` 之前（約 line 310-312），插入空殼：

```html
        <!-- 獨立的彈奏面板（頭控主旋律設定） -->
        <div id="play-panel" class="side-panel">
            <h3 class="text-lg font-bold mb-2 border-b border-gray-700 pb-2">🎹 彈奏設定</h3>
            <!-- 內容將由 Task 2、Task 3 從其他面板搬入 -->
        </div>
```

- [ ] **Step 1.4: 加 element ref + toggle 方法到 `UIController.js`**

修改 `js/UIController.js:16-18`：

```js
        this.calibPanel = document.getElementById('calib-panel');
        this.accompPanel = document.getElementById('accomp-panel');
        this.playPanel = document.getElementById('play-panel');
```

並把 `toggleCalibration` / `toggleAccompPanel`（line 69-77）改為三選一互斥，加新方法：

```js
    // Panel Toggle (三選一互斥)
    toggleCalibration() {
        this.accompPanel.classList.remove('open');
        this.playPanel.classList.remove('open');
        this.calibPanel.classList.toggle('open');
    }

    toggleAccompPanel() {
        this.calibPanel.classList.remove('open');
        this.playPanel.classList.remove('open');
        this.accompPanel.classList.toggle('open');
    }

    togglePlayPanel() {
        this.calibPanel.classList.remove('open');
        this.accompPanel.classList.remove('open');
        this.playPanel.classList.toggle('open');
    }
```

- [ ] **Step 1.5: 加 global function wrapper 到 `index.html`**

在 `index.html:909-911`（`toggleAccompPanel` wrapper）之後加：

```js
        function togglePlayPanel() {
            uiController.togglePlayPanel();
        }
```

- [ ] **Step 1.6: 驗證**

```bash
cd ~/Desktop/github/AI-Head-Motion-Tracker
python3 -m http.server 8080
```

瀏覽器開 `http://localhost:8080/`，驗證：
- 右下角看到三顆按鈕由上到下：🎹 彈奏設定 / 🎹 伴奏設定 / ⚙️ 校正與設定（注意兩個鋼琴 emoji 並排，這是已知，Task 4 解決）
- 點「彈奏設定」開啟空面板（只有標題）
- 點任一其他按鈕關掉彈奏面板、開對應面板
- console 無 error

- [ ] **Step 1.7: Commit**

```bash
git add index.html js/UIController.js css/style.css
git commit -m "$(cat <<'EOF'
feat(ui): 新增彈奏設定面板骨架 + 三選一互斥 toggle

為 Task 2-3 的控制項搬遷做準備。面板暫為空殼，按鈕、
toggle 邏輯、互斥行為先建好。

- 新建 #play-panel 面板 container
- 加 .play-btn CSS（紫色 #8b5cf6，bottom: 120px）
- UIController 三 toggle 互斥（任一開啟前先關其他兩個）
- 全域 togglePlayPanel() wrapper
EOF
)"
```

---

### Task 2: 從校正面板搬出彈奏控制 → 彈奏面板

**Files:**
- Modify: `index.html:239-298`（剪掉 5 段）, `index.html:#play-panel`（貼入）

搬遷的 5 段（含 emoji 提示）：

| # | 內容 | 來源行（約） |
|---|---|---|
| A | 「🎵 音效設定」section title | 240 |
| B | 回中重置 checkbox | 242-246 |
| C | 樂器 / 音量 / 長度 | 248-266 |
| D | 「👄 嘴部控制」整段 | 268-284 |
| E | （視覺輔助開關 287-298 **留在校正面板**） |

- [ ] **Step 2.1: 剪出 A-D 四段（行 240-284）**

從 `index.html` 剪出這 4 段連續區塊，貼入 `#play-panel` 標題之下。把「🎵 音效設定」標題改成「🎹 主旋律 (Melody)」更精確：

```html
        <div id="play-panel" class="side-panel">
            <h3 class="text-lg font-bold mb-2 border-b border-gray-700 pb-2">🎹 彈奏設定</h3>

            <!-- 主旋律音色 -->
            <div class="section-title">🎹 主旋律 (Melody)</div>

            <div class="flex items-center justify-between mb-2 p-2 bg-gray-800 rounded border border-gray-600">
                <label class="text-xs text-gray-300 font-bold cursor-pointer" for="return-center-toggle">回中重置 (單次觸發)</label>
                <input type="checkbox" id="return-center-toggle" class="w-4 h-4 accent-purple-500 cursor-pointer">
            </div>

            <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-1">
                    <label class="text-xs text-gray-300">樂器:</label>
                    <select id="instrument-select" class="bg-gray-800 text-xs text-white p-1 rounded border border-gray-600">
                        <option value="piano">🎹 鋼琴（真實取樣）</option>
                        <option value="synth">🎛️ 合成鋼琴（離線備援）</option>
                        <option value="8bit">👾 8-Bit 電子音</option>
                        <option value="flute">🌬️ 長笛</option>
                    </select>
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between"><label class="text-[0.6rem] text-gray-400">音量:</label><span id="vol-val" class="text-[0.6rem] text-gray-300">50%</span></div>
                    <input type="range" id="vol-slider" min="0" max="100" step="1" value="50" class="accent-purple-500">
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between"><label class="text-[0.6rem] text-gray-400">長度:</label><span id="dur-val" class="text-[0.6rem] text-gray-300">1.5s</span></div>
                    <input type="range" id="dur-slider" min="0.1" max="3.0" step="0.1" value="1.5" class="accent-purple-500">
                </div>
            </div>

            <!-- 嘴部控制（八度切換）-->
            <div>
                <div class="section-title">👄 嘴部控制 (八度切換)</div>
                <div class="flex flex-col gap-2 mb-2">
                    <div class="flex items-center justify-between">
                        <label class="text-xs text-gray-300" for="mouth-enable-check">啟用嘴部八度控制</label>
                        <input type="checkbox" id="mouth-enable-check" checked class="w-4 h-4 accent-pink-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-400">觸發動作:</label>
                        <select id="mouth-trigger-mode" class="bg-gray-800 text-xs text-white p-1 rounded border border-gray-600">
                            <option value="close" selected>🤐 閉嘴瞬間切換 (預設)</option>
                            <option value="open">😮 張嘴瞬間切換</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Task 3 將在此插入「連彈模式」 -->
        </div>
```

從 `#calib-panel` 刪掉 line 240-284 區塊（音效設定到嘴部控制結束）。**注意**：line 287-298 的「視覺輔助開關」（show-zones / show-guide / show-debug）**留在原處**——這是 calibration debug aids。

- [ ] **Step 2.2: 驗證**

重新整理瀏覽器，驗證：
- 校正面板：3x3 grid → 縮放模式 → 視覺輔助開關 → 儲存/讀取（中間不再有樂器/嘴部）
- 彈奏面板：樂器 / 音量 / 長度 / 嘴部控制 都在這裡，且**控件 id 不變**所以行為正常
- 旋律 → 改音量 → 切樂器 → 開嘴部八度 → 都正常運作

- [ ] **Step 2.3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
refactor(ui): 把樂器/音量/長度/嘴部控制從校正面板搬到彈奏面板

控件 id 不動，純粹 HTML 結構搬遷。視覺輔助開關（zones/
guide/debug）留在校正面板，因為這是 calibration debug aids。
EOF
)"
```

---

### Task 3: 從伴奏面板搬出「連彈模式」 → 彈奏面板

**Files:**
- Modify: `index.html`（剪掉伴奏面板的連彈區塊，貼入彈奏面板末尾）

- [ ] **Step 3.1: 剪「連彈模式」整段（伴奏面板內，約 414-421 行）**

從 `#accomp-panel` 剪出：

```html
                <!-- 連彈模式 -->
                <div class="flex items-center gap-2 mt-2 bg-rose-700/50 p-1 rounded border border-rose-600">
                    <input type="checkbox" id="repeat-check" class="w-4 h-4 accent-rose-500 cursor-pointer">
                    <label for="repeat-check" class="text-xs text-gray-200 cursor-pointer font-bold flex-1">🔁 連彈模式 (頭停住自動重複)</label>
                </div>
                <div id="repeat-info" class="mt-1 hidden">
                    <p class="text-[0.55rem] text-gray-500">停留在同一區域會跟隨 BPM 自動重複觸發音符</p>
                </div>
```

貼到 `#play-panel` 嘴部控制之後（Task 2 預留的位置）。

- [ ] **Step 3.2: 驗證**

重新整理瀏覽器，驗證：
- 伴奏面板已無「連彈模式」
- 彈奏面板末尾出現「🔁 連彈模式」
- 勾選連彈 → 頭停在某區域 → 確認還會自動重複觸發（核心行為沒壞）

- [ ] **Step 3.3: Commit**

```bash
git add index.html
git commit -m "refactor(ui): 把連彈模式從伴奏面板搬到彈奏面板（位置錯置修正）"
```

---

### Task 4: 整理按鈕視覺差異（彈奏 vs 伴奏 emoji 撞色）

**Files:**
- Modify: `index.html`（兩個按鈕的 emoji 與顏色）

兩個面板按鈕都用 🎹（鋼琴）emoji 會混淆。把彈奏改為 🎤（麥克風＝你唱你彈的概念）或保持 🎹 但加副 emoji。

- [ ] **Step 4.1: 改按鈕 emoji**

修改 `index.html` 那兩個按鈕的文字：

```html
        <button class="btn-base play-btn" onclick="togglePlayPanel()">🎤 彈奏設定</button>
        <button class="btn-base accomp-btn" onclick="toggleAccompPanel()">🎼 伴奏設定</button>
```

理由：🎤 = 主奏者（馥華）、🎼 = 樂譜伴奏。兩者語意不同。

- [ ] **Step 4.2: 驗證**

確認三顆按鈕視覺辨識度足夠。

- [ ] **Step 4.3: Commit**

```bash
git add index.html
git commit -m "style(ui): 彈奏改 🎤、伴奏改 🎼，避免兩個 🎹 撞色"
```

---

### Task 5: 校正面板加 section title 整理（可選）

**Files:**
- Modify: `index.html`（加 section title）

校正面板剩下的內容仍跨多個子系統（Profile / 錄製 / 縮放 / 視覺輔助 / 儲存），加 section title 讓視覺結構清楚。

- [ ] **Step 5.1: 加四段 section title**

在 `#calib-panel` 內既有結構上，加：

| 位置 | 加 title |
|---|---|
| Profile 區塊上方 | `<div class="section-title">📁 設定檔切換</div>` （已有，確認） |
| Mode switch + 錄製 controls 上方 | `<div class="section-title">🎯 錄製與校正</div>` |
| 反應靈敏度 + 縮放模式上方 | `<div class="section-title">📐 進階靈敏度</div>` |
| 視覺輔助開關上方 | `<div class="section-title">🔍 視覺輔助（協助者用）</div>` |
| 儲存/讀取/CSV 上方 | `<div class="section-title">💾 設定檔管理</div>` |

- [ ] **Step 5.2: 驗證 + Commit**

```bash
git add index.html
git commit -m "style(ui): 校正面板加 5 個 section title 釐清子區段"
```

---

### Task 6: 本機完整 smoke test

- [ ] **Step 6.1: 啟動本機 server**

```bash
cd ~/Desktop/github/AI-Head-Motion-Tracker
python3 -m http.server 8080
```

- [ ] **Step 6.2: 7 點驗證 checklist**

開 `http://localhost:8080/`，跑下列：

1. 三顆按鈕都會開對應面板，且互斥（開新的會關舊的）
2. 校正面板：3x3 grid 校正、Profile 切換、縮放滑桿、儲存/讀取都正常
3. 彈奏面板：切樂器、調音量、調長度、回中重置、嘴部八度、連彈模式 → 任一勾選後實際彈奏行為正確
4. 伴奏面板：選曲、播放、節拍器、語音報讀、BPM、旋律示範 → 行為不變
5. 視覺輔助開關（在校正面板）：勾掉觸發圈/導引框/紅點 → 畫面對應變化
6. **舊 CSV 匯入相容性測試**：
   - 在 v1.2.0-pre-a11y 線上版（GitHub Pages，重組前）匯出一份 CSV
   - 或：用過去存好的 CSV 檔
   - 在本機重組後版本「📥 匯入 CSV」
   - 驗證：樂器/音量/長度/嘴部設定/9 個校正點全部正確還原
7. Browser console 完全乾淨（無新增 error / warning）

- [ ] **Step 6.3: 已知 audio-first 改動仍 OK**

- 開伴奏 + 華爾滋 → 低音應從**左聲道**
- 開節拍器 → click 從**右聲道**
- 開語音報讀 → 報讀時音樂應壓低

---

### Task 7: CHANGELOG + push + merge main

- [ ] **Step 7.1: 更新 CHANGELOG.md `[Unreleased]` 段**

在既有 [Unreleased] 段下加：

```markdown
### Changed - 變更（UI 重組）
- 新建「🎤 彈奏設定」面板，把主旋律相關控制（樂器/音量/長度/回中/嘴部/連彈模式）集中
- 「🔁 連彈模式」位置錯置修正：從伴奏面板搬到彈奏面板
- 校正面板清乾淨，加 section title 釐清五個子區段
- 三面板互斥 toggle（任一開啟自動關其他兩個）
- 按鈕 emoji 區分：🎤 彈奏 / 🎼 伴奏 / ⚙️ 校正
```

- [ ] **Step 7.2: Commit CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "docs: CHANGELOG 加 UI 重組段（Task 7）"
```

- [ ] **Step 7.3: Push**

```bash
git push origin audio-first-redesign
```

- [ ] **Step 7.4: Fast-forward main + push**

```bash
git checkout main
git merge --ff-only audio-first-redesign
git push origin main
git checkout audio-first-redesign
```

- [ ] **Step 7.5: 等 GitHub Pages 部署**

開 https://github.com/m72900024/AI-Head-Motion-Tracker/actions 確認 Pages 部署完成（通常 1-3 分鐘）。

線上版確認：https://m72900024.github.io/AI-Head-Motion-Tracker/

---

## 設計決策紀錄

### 為什麼不做 tab 介面？
- 三個 `.side-panel` 已是 absolute 定位互斥，按鈕切換比 tab 更明確
- 馥華（盲）不看 UI，協助者每次只關心一個區段，tab 沒有額外好處

### 為什麼視覺輔助開關留在校正面板？
- 它們是 calibration debug aids（看頭部追蹤狀態），語意屬校正
- 馥華不需要視覺輔助，協助者開校正時順手看就好

### 為什麼不改 element id？
- saveConfig/loadConfig/CSV/event handler 都用 id 抓 DOM
- 改 id 等於改契約，風險倍增；HTML 區塊整段搬遷則零行為改動

### 為什麼用 🎤 而不是 🎹 給彈奏？
- 兩個面板原本都是 🎹 會混淆
- 🎤 = 主奏者（馥華本人在「演出」），🎼 = 伴奏譜（系統提供的伴奏軌）

---

## 復原方式

任何 Task 後若需復原：

```bash
git reset --soft HEAD~1   # 撤掉最後一次 commit 保留檔案改動
# 或
git checkout v1.2.0-pre-a11y -- index.html js/UIController.js css/style.css
```

整個分支推爛了：

```bash
git checkout main
git branch -D audio-first-redesign
git checkout -b audio-first-redesign v1.2.0-pre-a11y
```
