# AI 頭部動作感測樂器

> 使用 AI 頭部追蹤技術，讓無法使用雙手的使用者也能演奏音樂

[![線上試用](https://img.shields.io/badge/線上試用-立即體驗-00ffcc?style=for-the-badge)](https://m72900024.github.io/AI-Head-Motion-Tracker/)

## 📖 專案簡介

這是一個創新的**無障礙音樂輔具**，透過 AI 臉部偵測技術，將頭部動作轉換為音樂演奏。使用者只需移動頭部，就能在 3×3 的虛擬鍵盤上演奏音樂，搭配自動伴奏系統，創造完整的音樂體驗。

### 🎯 適用對象

- 肢體障礙者（無法使用雙手）
- 音樂治療/復健訓練
- 特殊教育教學
- 互動藝術創作
- 音樂教育與訓練

## ✨ 核心功能

### 🎹 頭部動作樂器
- **3×3 校準網格**：9 個頭部位置對應 9 個音高
- **快速校準模式**：圓形範圍偵測自動生成校正點
- **即時音頻合成**：使用 Web Audio API 產生高品質聲音
- **自訂音階**：每個位置可獨立設定半音階
- **多種樂器音色**：真實取樣鋼琴（Salamander Yamaha C5）、合成鋼琴（離線備援）、8-Bit 電子音、長笛
- **CSV 匯入匯出**：備份、分享、版本控制校正設定

### 🎵 自動伴奏系統
- **內建歌曲**：Amazing Grace (3/4 拍)
- **多種和弦進行**：卡農、流行、藍調、爵士
- **節拍器功能**：4/4 拍、3/4 拍
- **BPM 調整**：40-180 自由設定
- **琶音模式**：分解和弦演奏
- **段落循環**：可選擇特定樂句練習

### 🤖 AI 臉部追蹤
- **MediaPipe Face Mesh**：468 個臉部關鍵點
- **即時偵測**：低延遲響應
- **視覺化回饋**：臉部導引框 + 音高顯示
- **隱私優先**：所有運算在本地完成

## 🚀 使用方式

### 線上版本（推薦）
直接訪問：**https://m72900024.github.io/AI-Head-Motion-Tracker/**

1. **允許攝影機權限**：點擊「點擊開始」按鈕
2. **校準音高**：移動頭部到 9 個位置，分配音高
3. **開始演奏**：移動頭部即可發出聲音
4. **啟用伴奏**（選用）：點擊「開啟伴奏」按鈕

### 本地開發
```bash
# Clone 專案
git clone https://github.com/m72900024/AI-Head-Motion-Tracker.git
cd AI-Head-Motion-Tracker

# 啟動本地伺服器（需要 HTTPS 才能使用攝影機）
python3 -m http.server 8000
# 或
npx http-server -p 8000
```

訪問：`http://localhost:8000`

## 🎼 操作指南

### 校準步驟
1. 進入「校正與設定」面板
2. 選擇一個位置（例如中央）
3. 移動頭部到該位置
4. 點擊「錄製」記錄位置
5. 設定該位置的音高（Do, Re, Mi...）
6. 重複 2-5 完成 9 個位置

### 快速校準（推薦）
使用「🌀 開始圓形範圍偵測」：
1. 點擊「🌀 開始圓形範圍偵測」按鈕
2. 輕鬆地用頭部畫一個圓圈（不需到極限）
3. 點擊「完成並自動校正中心」
4. 系統自動生成 9 個校正點 ✅

### 伴奏設定
- **選擇曲目**：純節拍器 / Amazing Grace / 卡農...
- **樂器音色**：電鋼琴 / 弦樂 / 撥弦 / 柔和墊音
- **分解和弦**：勾選「琶音」
- **節拍器**：勾選「開啟節拍器」
- **速度調整**：拖曳 BPM 滑桿

### 📥 CSV 匯入匯出（備份與分享）

#### 匯出校正設定
1. 完成校正後，點擊「📤 匯出 CSV」
2. 下載檔案：`head_tracker_profile_1_2026-02-14.csv`
3. 保存備份或分享給其他使用者

#### 匯入校正設定
1. 點擊「📥 匯入 CSV」
2. 選擇之前匯出的 CSV 檔案
3. 系統自動套用所有設定（校正點、音效、靈敏度）
4. 顯示「✅ CSV 匯入成功！」

#### CSV 內容說明
匯出的 CSV 檔案包含：
- **全域參數**：中心點座標、平滑係數、觸發半徑
- **音效設定**：樂器、音量、音符長度、回中重置
- **嘴部控制**：八度切換開關、觸發模式
- **9 個校正點**：座標、半徑、半音偏移、MIDI 音高、名稱

#### 使用場景
- ✅ **備份設定**：防止誤操作遺失校正
- ✅ **分享設定**：給不同使用者（不同頭型）
- ✅ **快速切換**：不同情境（音樂課/復健課）
- ✅ **版本控制**：保存不同時期的校正版本

#### 範例 CSV 格式
```csv
Parameter,Value
Profile,1
Center_Yaw,0.0000
Center_Pitch,0.4500
Smoothing,0.15
Trigger_Radius_Global,40
Sound_Instrument,piano
Sound_Volume,0.5
Sound_Duration,1.5

ID,Yaw,Pitch,Radius,SemitoneShift,BaseMidi,Name
1,0.1234,0.5678,40,0,60,Do (1)
2,0.0000,0.5678,40,0,62,Re (2)
...
```

## 🛠️ 技術架構

### 前端技術
- **MediaPipe Face Mesh**：臉部追蹤（Google AI）
- **Web Audio API**：音頻合成（8-Bit / 長笛 / 合成鋼琴備援）
- **Tone.js + Salamander Piano**：真實取樣鋼琴（CDN：tonejs.github.io）
- **Tailwind CSS**：介面設計
- **Vanilla JavaScript**：純 JS，無框架依賴

### 模組化架構

```
index.html (954L)                整合層 + 音頻合成（playNote）
  │
  ├─ css/
  │   └─ style.css               樣式模組 (191L)
  │
  └─ js/
      ├─ config.js               全域配置 (139L)
      ├─ CalibrationSystem.js    校正系統 (749L)
      ├─ FaceTracker.js          臉部追蹤 + 連彈 (449L)
      ├─ UIController.js         UI 控制器 (423L)
      └─ AccompanimentSystem.js  伴奏系統 (1181L)
```

### 模組職責說明

| 模組 | 職責 | 行數 |
|------|------|------|
| **CalibrationSystem.js** | 校正點錄製、範圍偵測、CSV 匯入匯出、設定持久化、靈敏度縮放 | 749 |
| **FaceTracker.js** | MediaPipe 整合、座標追蹤、觸發偵測、嘴部八度切換、連彈模式 | 449 |
| **UIController.js** | 面板切換、拖拽、滾輪控制、回饋顯示 | 423 |
| **AccompanimentSystem.js** | 和弦進行、節拍器、琶音、段落循環、旋律示範、語音報讀、華爾滋 | 1181 |
| **config.js** | 音符定義、頻率表、全域常數 | 139 |
| **style.css** | UI 樣式、動畫、響應式設計 | 191 |

> 音頻合成（playNote、樂器音色）目前實作在 `index.html` 內聯腳本中。

### 檔案結構
```
AI-Head-Motion-Tracker/
├── index.html              # 主程式整合層 + 音頻合成
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── CalibrationSystem.js
│   ├── FaceTracker.js
│   ├── UIController.js
│   └── AccompanimentSystem.js
├── README.md
└── CHANGELOG.md
```

## 🎨 特色亮點

✅ **完全免費**：無需付費服務  
✅ **隱私安全**：所有運算在本地完成  
✅ **跨平台**：支援桌機、筆電、平板  
✅ **免安裝**：純網頁應用，開瀏覽器即用  
✅ **開源**：完整程式碼公開  
✅ **模組化架構**：易於維護與擴展  
✅ **設定可攜**：CSV 格式備份與分享校正設定

## 👨‍💻 開發者指南

### 模組修改指南

需要修改特定功能？直接找對應模組：

| 需求 | 修改位置 |
|------|---------|
| 修改音色/音量（playNote） | `index.html` 內聯 `<script>` 段 |
| 新增和弦進行 | `js/AccompanimentSystem.js` |
| 調整校正邏輯 | `js/CalibrationSystem.js` |
| 修改 CSV 格式 | `js/CalibrationSystem.js` (exportCSV/parseCSV) |
| 優化臉部追蹤 | `js/FaceTracker.js` |
| 修改 UI 互動 | `js/UIController.js` |
| 調整樣式 | `css/style.css` |
| 修改音符定義 | `js/config.js` |

### 模組 API 範例

**播放音符：**
```javascript
// 在 index.html 整合層
playNote(frequency, pointId, forcePlay);
// frequency: 頻率 (Hz)
// pointId: 校正點 ID (1-9)
// forcePlay: 強制播放（忽略休止符）
```

**錄製校正點：**
```javascript
// CalibrationSystem
calibrationSystem.recordPose(id, name, smoothYaw, smoothPitch);
// id: 點位編號 (1-9)
// name: 點位名稱 (例如 "Do (1)")
// smoothYaw/smoothPitch: 平滑化座標
```

**取得臉部座標：**
```javascript
// FaceTracker
const yaw = faceTracker.getSmoothYaw();    // 左右轉頭
const pitch = faceTracker.getSmoothPitch(); // 上下點頭
```

**匯出/匯入 CSV：**
```javascript
// CalibrationSystem
calibrationSystem.exportCSV();  // 匯出當前設定為 CSV
calibrationSystem.importCSV();  // 觸發檔案選擇器
calibrationSystem.parseCSV(text); // 解析 CSV 文字內容

// CSV 內容包含：
// - 全域參數（中心點、靈敏度、觸發半徑）
// - 音效設定（樂器、音量、音符長度）
// - 嘴部控制（八度切換開關、觸發模式）
// - 9 個校正點（座標、半徑、半音偏移、MIDI 音高）
```

### 測試建議

```bash
# 修改後測試流程
1. 本地測試：python3 -m http.server 8000
2. 開啟瀏覽器：http://localhost:8000
3. 檢查 Console 有無錯誤
4. 測試修改的功能
5. Commit & Push 到 GitHub
6. 等待 GitHub Pages 部署（~1-2 分鐘）
7. 測試線上版本
```  

## 📚 學術應用

本專案可作為**特殊教育音樂輔具研究**的實作案例：

- **輔助科技**（Assistive Technology）
- **無障礙人機互動**（Accessible HCI）
- **音樂治療**（Music Therapy）
- **體感音樂介面**（Embodied Music Interface）

## 🔮 未來改進

### 功能擴展
- [ ] 錄音功能（匯出 WAV/MP3）
- [ ] MIDI 輸出（連接 DAW 軟體）
- [ ] 更多樂器音色（管樂、打擊樂）
- [ ] 自訂和弦進行編輯器
- [ ] 多人協作模式
- [ ] 手勢辨識（搭配頭部動作）

### 效能優化
- [ ] Web Worker（臉部追蹤移至背景執行）
- [ ] AudioWorklet（降低音頻延遲）
- [ ] Canvas 渲染優化（減少重繪）

### 使用體驗
- [ ] 新手導覽教學
- [ ] 快速校正模式（AI 輔助）
- [ ] 預設校正模板（不同頭型）

## 📦 版本資訊

**線上網址**：https://m72900024.github.io/AI-Head-Motion-Tracker/

**狀態**：✅ **穩定運作，實測通過**

詳細變更見 [CHANGELOG.md](CHANGELOG.md)。

## 📄 授權

本專案採用 **MIT License** 開源授權。

## 👤 作者

**陳威任（Azen Chen）**  
- GitHub: [@m72900024](https://github.com/m72900024)

## 🙏 致謝

- [MediaPipe](https://google.github.io/mediapipe/) - Google AI 臉部追蹤技術
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - W3C 音頻標準

---

**⭐ 如果這個專案對你有幫助，歡迎給個 Star！**
