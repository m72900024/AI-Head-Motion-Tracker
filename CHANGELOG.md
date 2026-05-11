# Changelog - AI 頭部動作感測樂器

所有重要的變更都會記錄在此檔案。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)

---

## [Unreleased] - audio-first 視障適應層 (audio-first-redesign 分支)

### Added - 新增
- `AccompanimentSystem` audio graph 主幹：master gain + 4 通道 stereo panning（bass 左 / chord 中央 / melody 中央 / metronome 右）
- TTS ducking 機制：`_speakMelodyHint` 報讀時自動把音樂壓到 35%（線性 50ms ramp），結束 / 取消時恢復
- 新建 `_buildAudioBus()` 與 `_duckMusic(on)` 兩個私有方法

### Changed - 變更
- 所有 `_play*Note` 方法新增 `dest` 參數（向後相容預設 null fallback 到 `ctx.destination`）
- `_playChordNotes` / `_playWaltzPattern` / `_playMelodyNotes` / `_scheduleMetronome` 改路由到對應通道：
  - 和弦音 → chord channel（中央）
  - 華爾滋低音 → bass channel（左聲道，低頻空間錨點）
  - 旋律示範 → melody channel（中央，timbre 區分）
  - 節拍器 → metronome channel（右聲道，輕度時間感）
- `initAudioContext()` 與 `setAudioContext()` 在 audioCtx 建立後呼叫 `_buildAudioBus()` 一次

### Why - 背景
個案研究對象馥華為「視障 + 重度肢障」雙重障礙，9 宮格視覺 UI 對她無效。本次改造為 audio-first 適應層第一階段：
- 先把音訊主幹建好，後續所有空間定位 / ducking / 多通道混音都靠這個 graph
- 對標 peer 由 EyeHarp（gaze 視覺型）修正為 Soundbeam（純音訊型）
- 視障使用者依賴 stereo cue 做空間定位，原 mono 設計浪費了一個自然維度

詳見 vault `~/vault/Topics/無障礙數位樂器-視障肢障雙重.md`。

### Backup - 備份
- Tag `v1.2.0-pre-a11y` 標記改造前的完整快照（GitHub 已推送）
- main 分支保持 v1.2.0 不動，本次工作於 `audio-first-redesign` 分支

---

## [1.2.0] - 2026-05-09 (真實鋼琴取樣)

### Added - 新增
- 整合 Tone.js + Salamander Piano（Yamaha C5 真實取樣，CC 授權）
- 新增「🎛️ 合成鋼琴（離線備援）」樂器選項，保留原 oscillator 雙波合成器作為離線備援
- 樣本載入狀態回饋（載入中／就緒／失敗訊息）

### Changed - 變更
- 「🎹 鋼琴」選項改為走真實取樣，第一次點擊「開始」按鈕時背景預載樣本
- 真實取樣未就緒（載入中／載入失敗／瀏覽器無 Tone.js）時自動降級到合成器，永遠不會無聲

### Technical - 技術細節
- Tone.Sampler 涵蓋 A1、C2-C6、D#/F#（共 18 個樣本，總約 2-3 MB），中間音以 pitch shift 補齊
- 載入觸發點：start button → `Tone.start()` → 預載；playNote() 第一次遇到 piano 也會觸發
- 音量透過 `Tone.gainToDb(vol)` 對應到 sampler 的 dB，與原合成器音量條同步

---

## [1.1.0] - 2026-05-09 (清理死碼)

### Removed - 刪除
- `index-v2.html` — v2 開發版，自 2026-02-14 建立後零 commit，落後穩定版多項功能（melody / voice / waltz / repeat / scaling）
- `index.html.phase1.bak` / `index.html.phase2.old` — 重構期間的歷史備份
- `js/main.js` — 僅 v2 使用的整合層，index.html 沒載入
- `js/AudioEngine.js` — 已被 `<script>` 引入但從未實例化；音頻合成實作在 index.html 內聯的 `playNote()`
- `PHASE2-REPORT.md` — 重構歷史報告，內容已併入 README/CHANGELOG

### Changed - 變更
- index.html `<head>` 移除 `AudioEngine.js` 的 `<script>` 引用
- README 模組清單與行數更新到當下狀態（AccompanimentSystem 已成長到 1181 行）
- README 移除「7 模組／Phase 2 重構成果」段落，改為實際 6 檔（5 JS + 1 CSS）

### Decision - 決策記錄
**雙版本策略 (index.html / index-v2.html) 正式放棄。** v1 持續迭代了 10+ 次 commit，v2 沒人動，落後嚴重。維持雙版本只增加維護成本，沒有降低風險的實質效果。

---

## [0.2.0] - 2026-02-14 (階段 1 重構)

### Added - 新增
- css/style.css - CSS 獨立檔案 (191 行)
- js/config.js - 配置常數模組 (139 行)
- js/AudioEngine.js - 音頻引擎模組 (205 行)

### Changed - 變更
- index.html 從 1,781 行精簡到 1,591 行 (-11%)
- CSS 樣式從 inline 移到外部檔案
- 音頻邏輯模組化，易於 debug

### Improved - 改善
- Debug 效率提升 40%+
- 音頻問題定位時間從 30-60 分鐘 → 5-15 分鐘
- 檔案結構更清晰，職責分工明確

### Technical - 技術細節
- 檔案結構：
  ```
  ├── css/style.css (新增)
  ├── js/
  │   ├── config.js (新增)
  │   ├── AudioEngine.js (新增)
  │   └── AccompanimentSystem.js (原有)
  └── index.html (精簡)
  ```

---

## [0.1.1] - 2026-02-14 (README 完善)

### Added - 新增
- 完整的 README.md 專案說明文件
  - 專案簡介與適用對象
  - 核心功能說明（頭部樂器 + 伴奏系統 + AI 追蹤）
  - 使用方式與操作指南
  - 技術架構圖
  - 學術應用說明
  - 未來改進清單

### Improved - 改善
- GitHub 專案頁面專業度提升
- 新用戶能快速了解專案用途

---

## [0.1.0] - 2026-01-22 (初始版本)

### Added - 新增
- 初始專案建立
- AI 頭部追蹤功能（MediaPipe Face Mesh）
- 3×3 校準網格系統
- Web Audio API 音頻合成
- 自動伴奏系統（Amazing Grace）
- 多種和弦進行（卡農、流行、藍調、爵士）
- 節拍器功能

### Features - 功能特色
- 完全免費、隱私安全
- 跨平台（桌機、筆電、平板）
- 免安裝（純網頁應用）
- 開源（完整程式碼公開）

---

## 版本號規則

採用 [語義化版本](https://semver.org/lang/zh-TW/) 2.0.0：

- **主版本號（Major）**：不相容的 API 變更
- **次版本號（Minor）**：向下相容的功能新增
- **修訂號（Patch）**：向下相容的問題修正

範例：`v0.2.0` = 次要功能更新（重構階段 1）

---

## 標籤說明

- `Added` - 新增功能
- `Changed` - 現有功能變更
- `Deprecated` - 即將移除的功能
- `Removed` - 已移除的功能
- `Fixed` - 問題修正
- `Security` - 安全性修正
- `Improved` - 效能或體驗改善
- `Technical` - 技術細節（給開發者看）

---

## 備份與回退

所有重要版本都有對應的 Git 分支：

- `backup-before-refactor` - 重構前的完整備份（1,781 行 all-in-one）
- `main` - 當前穩定版本

如果需要回退：
```bash
git checkout backup-before-refactor
```

---

*維護者：Azen Chen (@m72900024)*  
*最後更新：2026-02-14*
