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
- **即時音頻合成**：使用 Web Audio API 產生高品質聲音
- **自訂音階**：每個位置可獨立設定半音階
- **多種樂器音色**：鋼琴、弦樂、撥弦、柔和墊音

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
1. 進入「伴奏設定」面板
2. 選擇一個位置（例如中央）
3. 移動頭部到該位置
4. 點擊「錄製」記錄位置
5. 設定該位置的音高（Do, Re, Mi...）
6. 重複 2-5 完成 9 個位置

### 伴奏設定
- **選擇曲目**：純節拍器 / Amazing Grace / 卡農...
- **樂器音色**：電鋼琴 / 弦樂 / 撥弦 / 柔和墊音
- **分解和弦**：勾選「琶音」
- **節拍器**：勾選「開啟節拍器」
- **速度調整**：拖曳 BPM 滑桿

## 🛠️ 技術架構

### 前端技術
- **MediaPipe Face Mesh**：臉部追蹤（Google AI）
- **Web Audio API**：音頻合成
- **Tailwind CSS**：介面設計
- **Vanilla JavaScript**：純 JS，無框架依賴

### 系統架構
```
index.html                  主程式（UI + 臉部追蹤）
  ├── MediaPipe            AI 臉部偵測
  ├── Web Audio API        音頻合成
  └── AccompanimentSystem  伴奏引擎
       ├── 和弦定義        大三/小三/七和弦
       ├── 和弦進行        Amazing Grace / Canon...
       ├── 節拍器          4/4, 3/4 拍
       └── 音色引擎        Piano / Strings / Pluck
```

### 檔案結構
```
AI-Head-Motion-Tracker/
├── index.html                    # 主程式 (90 KB)
├── js/
│   └── AccompanimentSystem.js    # 伴奏系統模組 (16 KB)
└── README.md                     # 專案說明
```

## 🎨 特色亮點

✅ **完全免費**：無需付費服務  
✅ **隱私安全**：所有運算在本地完成  
✅ **跨平台**：支援桌機、筆電、平板  
✅ **免安裝**：純網頁應用，開瀏覽器即用  
✅ **開源**：完整程式碼公開  

## 📚 學術應用

本專案可作為**特殊教育音樂輔具研究**的實作案例：

- **輔助科技**（Assistive Technology）
- **無障礙人機互動**（Accessible HCI）
- **音樂治療**（Music Therapy）
- **體感音樂介面**（Embodied Music Interface）

## 🔮 未來改進

- [ ] 錄音功能（匯出 WAV/MP3）
- [ ] MIDI 輸出（連接 DAW 軟體）
- [ ] 更多樂器音色
- [ ] 自訂和弦進行
- [ ] 多人協作模式
- [ ] 手勢辨識（搭配頭部動作）

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
