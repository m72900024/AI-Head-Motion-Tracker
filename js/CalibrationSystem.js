/**
 * CalibrationSystem.js
 * 校準系統 - 管理 3×3 頭部位置校準
 * 
 * 功能：
 * - 校準點位置記錄與管理
 * - 校準資料儲存/載入
 * - CSV 匯入/匯出
 * - 觸發區域檢測
 */

class CalibrationSystem {
    constructor(options = {}) {
        // 校準資料
        this.calibrationData = {};
        
        // 設定
        this.defaultRadius = options.defaultRadius || CONFIG.calibration.defaultRadius;
        this.centerOffset = options.centerOffset || CONFIG.tracking.centerOffset;
        
        // 選中的校準點
        this.selectedPointId = null;
        
        // 回調函數
        this.onPointSelect = options.onPointSelect || null;
        this.onDataChange = options.onDataChange || null;
        
        // 初始化預設校準資料
        this._initDefaultCalibration();
    }

    /**
     * 初始化預設校準資料
     */
    _initDefaultCalibration() {
        this.calibrationData = JSON.parse(JSON.stringify(CONFIG.defaultCalibration));
    }

    /**
     * 記錄校準點
     */
    recordPoint(pointId, yaw, pitch) {
        if (!this.calibrationData[pointId]) {
            this.calibrationData[pointId] = {
                yaw: 0,
                pitch: 0,
                semitone: 0,
                radius: this.defaultRadius,
                baseMidi: null
            };
        }
        
        this.calibrationData[pointId].yaw = yaw;
        this.calibrationData[pointId].pitch = pitch;
        
        if (this.onDataChange) {
            this.onDataChange(pointId, this.calibrationData[pointId]);
        }
        
        return this.calibrationData[pointId];
    }

    /**
     * 更新校準點的半音偏移
     */
    setPointSemitone(pointId, semitone) {
        if (this.calibrationData[pointId]) {
            this.calibrationData[pointId].semitoneShift = semitone;
            
            if (this.onDataChange) {
                this.onDataChange(pointId, this.calibrationData[pointId]);
            }
        }
    }

    /**
     * 設定校準點的基準 MIDI
     */
    setPointBaseMidi(pointId, midi) {
        if (this.calibrationData[pointId]) {
            this.calibrationData[pointId].baseMidi = (midi === -1) ? null : midi;
            
            if (this.onDataChange) {
                this.onDataChange(pointId, this.calibrationData[pointId]);
            }
        }
    }

    /**
     * 更新校準點位置（拖曳）
     */
    updatePointPosition(pointId, yaw, pitch) {
        if (this.calibrationData[pointId]) {
            this.calibrationData[pointId].yaw = yaw;
            this.calibrationData[pointId].pitch = pitch;
            
            if (this.onDataChange) {
                this.onDataChange(pointId, this.calibrationData[pointId]);
            }
        }
    }

    /**
     * 更新校準點半徑
     */
    updatePointRadius(pointId, radius) {
        if (this.calibrationData[pointId]) {
            this.calibrationData[pointId].radius = Math.max(10, Math.min(100, radius));
            
            if (this.onDataChange) {
                this.onDataChange(pointId, this.calibrationData[pointId]);
            }
        }
    }

    /**
     * 選擇校準點
     */
    selectPoint(pointId) {
        this.selectedPointId = pointId;
        
        if (this.onPointSelect) {
            this.onPointSelect(pointId, this.calibrationData[pointId]);
        }
        
        return this.calibrationData[pointId];
    }

    /**
     * 取得選中的校準點
     */
    getSelectedPoint() {
        return this.selectedPointId;
    }

    /**
     * 檢查頭部位置在哪個校準點範圍內
     */
    checkTrigger(yaw, pitch) {
        let triggered = null;
        let minDist = Infinity;

        for (const [id, data] of Object.entries(this.calibrationData)) {
            if (!data.yaw && data.yaw !== 0) continue; // 未校準
            
            const dist = UTILS.distance(yaw, pitch, data.yaw, data.pitch);
            const radius = data.radius || this.defaultRadius;
            
            if (dist < radius && dist < minDist) {
                minDist = dist;
                triggered = id;
            }
        }

        return triggered;
    }

    /**
     * 取得校準點資料
     */
    getPointData(pointId) {
        return this.calibrationData[pointId] || null;
    }

    /**
     * 取得所有校準資料
     */
    getAllData() {
        return this.calibrationData;
    }

    /**
     * 設定所有校準資料
     */
    setAllData(data) {
        this.calibrationData = data;
        
        if (this.onDataChange) {
            this.onDataChange(null, this.calibrationData);
        }
    }

    /**
     * 重置為預設值
     */
    reset() {
        this._initDefaultCalibration();
        this.selectedPointId = null;
        
        if (this.onDataChange) {
            this.onDataChange(null, this.calibrationData);
        }
    }

    /**
     * 匯出為 CSV
     */
    exportToCSV() {
        let csv = 'id,yaw,pitch,semitoneShift,radius,baseMidi\n';
        
        for (const [id, data] of Object.entries(this.calibrationData)) {
            const semitone = data.semitoneShift || 0;
            const radius = data.radius || this.defaultRadius;
            const baseMidi = data.baseMidi !== undefined ? data.baseMidi : '';
            
            csv += `${id},${data.yaw},${data.pitch},${semitone},${radius},${baseMidi}\n`;
        }
        
        return csv;
    }

    /**
     * 從 CSV 匯入
     */
    importFromCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const newData = {};
        
        // 跳過標題行
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length < 5) continue;
            
            const id = parts[0].trim();
            newData[id] = {
                yaw: parseFloat(parts[1]),
                pitch: parseFloat(parts[2]),
                semitoneShift: parseInt(parts[3]) || 0,
                radius: parseFloat(parts[4]) || this.defaultRadius,
                baseMidi: parts[5] ? parseInt(parts[5]) : null
            };
        }
        
        this.calibrationData = newData;
        
        if (this.onDataChange) {
            this.onDataChange(null, this.calibrationData);
        }
        
        return Object.keys(newData).length;
    }

    /**
     * 儲存到 localStorage
     */
    save() {
        const data = {
            calibrationData: this.calibrationData,
            centerOffset: this.centerOffset,
            defaultRadius: this.defaultRadius
        };
        
        localStorage.setItem(CONFIG.storageKeys.calibration, JSON.stringify(data));
    }

    /**
     * 從 localStorage 載入
     */
    load() {
        const saved = localStorage.getItem(CONFIG.storageKeys.calibration);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                if (data.calibrationData) {
                    this.calibrationData = data.calibrationData;
                }
                
                if (data.centerOffset) {
                    this.centerOffset = data.centerOffset;
                }
                
                if (data.defaultRadius) {
                    this.defaultRadius = data.defaultRadius;
                }
                
                if (this.onDataChange) {
                    this.onDataChange(null, this.calibrationData);
                }
                
                return true;
            } catch (e) {
                console.error('Failed to load calibration:', e);
                return false;
            }
        }
        
        return false;
    }

    /**
     * 取得當前狀態
     */
    getState() {
        return {
            calibrationData: this.calibrationData,
            selectedPointId: this.selectedPointId,
            defaultRadius: this.defaultRadius,
            centerOffset: this.centerOffset,
            pointCount: Object.keys(this.calibrationData).length
        };
    }
}

// 匯出（支援 ES6 模組與傳統 script 標籤）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalibrationSystem;
}
