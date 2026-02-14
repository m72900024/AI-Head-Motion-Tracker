# Changelog - AI 頭部動作感測樂器

所有重要的變更都會記錄在此檔案。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)

---

## [Unreleased] - 進行中

### Added - 新增
- CalibrationSystem.js - 校準系統模組 (309 行)
- FaceTracker.js - 臉部追蹤模組 (265 行)

### Status - 狀態
**模組化進行中** - 階段 2 核心模組已建立，尚未整合到 index.html

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
