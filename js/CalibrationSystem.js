/**
 * Calibration System
 * 負責校正系統：錄製姿勢、範圍偵測、中心設定、CSV 匯入匯出
 */

class CalibrationSystem {
    constructor(config = {}) {
        this.config = config;
        this.calibrationData = {};
        this.centerOffset = { yaw: 0, pitch: 0.45 };
        this.defaultTriggerRadius = 40;
        this.smoothingFactor = 0.15;
        this.soundSettings = {
            returnToCenter: false,
            instrument: 'piano',
            volume: 0.5,
            duration: 1.5
        };
        this.mouthControlEnabled = true;
        this.mouthTriggerMode = 'close';
        
        // Range Detection State
        this.isRangeDetecting = false;
        this.rangeMinYaw = Infinity;
        this.rangeMaxYaw = -Infinity;
        this.rangeMinPitch = Infinity;
        this.rangeMaxPitch = -Infinity;
        this.rangeTrace = [];
        
        // Storage
        this.STORAGE_KEY_PREFIX = 'head_tracker_config_v11_profile_';
        this.currentProfileIndex = 1;
        
        // Constants
        this.DEFAULT_BASE_MIDI = {
            1: 60, 2: 62, 3: 64, 4: 65, 5: null, 6: 67, 7: 69, 8: 71, 9: 72
        };
        this.NOTE_NAMES = {
            1: "Do", 2: "Re", 3: "Mi", 4: "Fa", 5: "Center", 6: "So", 7: "La", 8: "Si", 9: "High Do"
        };
        
        // DOM Elements
        this.rangeBtn = document.getElementById('range-btn');
        this.rangeHint = document.getElementById('range-hint');
    }

    init() {
        this.bindEvents();
        // Auto load config after 1s
        setTimeout(() => this.loadConfig(), 1000);
    }

    bindEvents() {
        // Radius slider
        const radiusSlider = document.getElementById('radius-slider');
        const radiusValDisplay = document.getElementById('radius-val');
        radiusSlider.addEventListener('input', (e) => {
            this.defaultTriggerRadius = parseInt(e.target.value);
            radiusValDisplay.innerText = this.defaultTriggerRadius;
            for (let id in this.calibrationData) {
                this.calibrationData[id].radius = this.defaultTriggerRadius;
            }
        });

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.smoothingFactor = parseFloat(e.target.value);
        });

        // Sound Settings
        const returnCenterToggle = document.getElementById('return-center-toggle');
        returnCenterToggle.addEventListener('change', (e) => {
            this.soundSettings.returnToCenter = e.target.checked;
        });

        const instrumentSelect = document.getElementById('instrument-select');
        instrumentSelect.addEventListener('change', (e) => {
            this.soundSettings.instrument = e.target.value;
            if (this.config.onInstrumentChange) {
                this.config.onInstrumentChange(e.target.value);
            }
        });

        const volSlider = document.getElementById('vol-slider');
        const volValDisplay = document.getElementById('vol-val');
        volSlider.addEventListener('input', (e) => {
            this.soundSettings.volume = parseInt(e.target.value) / 100;
            volValDisplay.innerText = `${e.target.value}%`;
        });
        volSlider.addEventListener('change', () => {
            if (this.config.onVolumeChange) {
                this.config.onVolumeChange(this.soundSettings.volume);
            }
        });

        const durSlider = document.getElementById('dur-slider');
        const durValDisplay = document.getElementById('dur-val');
        durSlider.addEventListener('input', (e) => {
            this.soundSettings.duration = parseFloat(e.target.value);
            durValDisplay.innerText = `${e.target.value}s`;
        });

        // Mouth Control
        const mouthEnableCheck = document.getElementById('mouth-enable-check');
        mouthEnableCheck.addEventListener('change', (e) => {
            this.mouthControlEnabled = e.target.checked;
        });

        const mouthTriggerModeSelect = document.getElementById('mouth-trigger-mode');
        mouthTriggerModeSelect.addEventListener('change', (e) => {
            this.mouthTriggerMode = e.target.value;
        });

        // Point Settings
        const pointRadiusSlider = document.getElementById('point-radius-slider');
        const pointRadiusVal = document.getElementById('point-radius-val');
        pointRadiusSlider.addEventListener('input', (e) => {
            const selectedPointId = this.config.getSelectedPointId ? this.config.getSelectedPointId() : null;
            if (selectedPointId && this.calibrationData[selectedPointId]) {
                const val = parseInt(e.target.value);
                this.calibrationData[selectedPointId].radius = val;
                pointRadiusVal.innerText = val;
            }
        });
        pointRadiusSlider.addEventListener('change', () => this.saveConfig());

        // Base Note Select
        const baseNoteSelect = document.getElementById('base-note-select');
        baseNoteSelect.addEventListener('change', (e) => {
            const selectedPointId = this.config.getSelectedPointId ? this.config.getSelectedPointId() : null;
            if (selectedPointId && this.calibrationData[selectedPointId]) {
                const midi = parseInt(e.target.value);
                this.calibrationData[selectedPointId].baseMidi = (midi === -1) ? null : midi;
                this.saveConfig();
                if (this.config.onPreviewNote) {
                    this.config.onPreviewNote(selectedPointId);
                }
            }
        });
    }

    // Set Center
    setCenter(rawYaw, rawPitch) {
        if (rawYaw !== 0 || rawPitch !== 0) {
            this.centerOffset.yaw = rawYaw;
            this.centerOffset.pitch = rawPitch;
            if (this.config.showFeedback) {
                this.config.showFeedback("✅ 已設定為中心！");
            }
            this.saveConfig();
        }
    }

    // Range Detection Toggle
    toggleRangeDetection(smoothYaw, smoothPitch) {
        this.isRangeDetecting = !this.isRangeDetecting;
        
        if (this.isRangeDetecting) {
            this.rangeBtn.innerHTML = "<span>⏹</span> 完成並自動校正中心";
            this.rangeBtn.classList.replace('bg-purple-900/50', 'bg-red-600');
            this.rangeBtn.classList.replace('border-purple-800', 'border-red-600');
            this.rangeHint.classList.remove('hidden');
            this.rangeTrace = [];
            
            const normalizeYaw = this.config.normalizeYaw || ((raw) => raw - this.centerOffset.yaw);
            const normalizePitch = this.config.normalizePitch || ((raw) => raw - this.centerOffset.pitch);
            
            const currentY = normalizeYaw(smoothYaw);
            const currentP = normalizePitch(smoothPitch);
            this.rangeMinYaw = currentY;
            this.rangeMaxYaw = currentY;
            this.rangeMinPitch = currentP;
            this.rangeMaxPitch = currentP;
        } else {
            this.rangeBtn.innerHTML = "<span>🌀</span> 開始圓形範圍偵測 (推薦)";
            this.rangeBtn.classList.replace('bg-red-600', 'bg-purple-900/50');
            this.rangeBtn.classList.replace('border-red-600', 'border-purple-800');
            this.rangeHint.classList.add('hidden');
            this.generatePointsFromRange();
            
            const showZonesCheck = document.getElementById('show-zones');
            showZonesCheck.checked = true;
            if (this.config.onZonesToggle) {
                this.config.onZonesToggle(true);
            }
        }
    }

    // Update Range During Detection
    updateRange(dispYaw, dispPitch) {
        if (dispYaw < this.rangeMinYaw) this.rangeMinYaw = dispYaw;
        if (dispYaw > this.rangeMaxYaw) this.rangeMaxYaw = dispYaw;
        if (dispPitch < this.rangeMinPitch) this.rangeMinPitch = dispPitch;
        if (dispPitch > this.rangeMaxPitch) this.rangeMaxPitch = dispPitch;
        this.rangeTrace.push({x: dispYaw, y: dispPitch});
    }

    // Generate Points from Range
    generatePointsFromRange() {
        if (this.rangeMinYaw === Infinity) return;
        
        const driftYaw = (this.rangeMinYaw + this.rangeMaxYaw) / 2;
        const driftPitch = (this.rangeMinPitch + this.rangeMaxPitch) / 2;
        this.centerOffset.yaw += driftYaw;
        this.centerOffset.pitch += driftPitch;
        
        const spanYaw = (this.rangeMaxYaw - this.rangeMinYaw) / 2;
        const spanPitch = (this.rangeMaxPitch - this.rangeMinPitch) / 2;
        
        const y_left = spanYaw;
        const y_right = -spanYaw;
        const y_mid = 0;
        const p_top = -spanPitch;
        const p_btm = spanPitch;
        const p_mid = 0;
        
        const grid = [
            {id: 1, y: y_left, p: p_top, n: 'Do (1)'},
            {id: 2, y: y_mid, p: p_top, n: 'Re (2)'},
            {id: 3, y: y_right, p: p_top, n: 'Mi (3)'},
            {id: 4, y: y_left, p: p_mid, n: 'Fa (4)'},
            {id: 5, y: y_mid, p: p_mid, n: '無 (5)'},
            {id: 6, y: y_right, p: p_mid, n: 'So (6)'},
            {id: 7, y: y_left, p: p_btm, n: 'La (7)'},
            {id: 8, y: y_mid, p: p_btm, n: 'Si (8)'},
            {id: 9, y: y_right, p: p_btm, n: 'High Do'}
        ];
        
        this.calibrationData = {};
        grid.forEach(pt => {
            this.calibrationData[pt.id] = {
                yaw: pt.y,
                pitch: pt.p,
                name: pt.n,
                radius: this.defaultTriggerRadius
            };
            const btn = document.getElementById(`btn-${pt.id}`);
            if (btn) btn.classList.add('recorded');
        });
        
        if (this.config.updateModeDisplay) {
            this.config.updateModeDisplay(Object.keys(this.calibrationData).length);
        }
        this.saveConfig();
        if (this.config.showFeedback) {
            this.config.showFeedback("✅ 已自動校正中心與範圍！");
        }
    }

    // Record Pose
    recordPose(id, name, smoothYaw, smoothPitch) {
        const normalizeYaw = this.config.normalizeYaw || ((raw) => raw - this.centerOffset.yaw);
        const normalizePitch = this.config.normalizePitch || ((raw) => raw - this.centerOffset.pitch);
        
        const existing = this.calibrationData[id] || {};
        this.calibrationData[id] = {
            yaw: normalizeYaw(smoothYaw),
            pitch: normalizePitch(smoothPitch),
            name: name,
            radius: existing.radius || this.defaultTriggerRadius,
            semitoneShift: existing.semitoneShift || 0
        };
        
        const btn = document.getElementById(`btn-${id}`);
        if (btn) {
            btn.classList.add('recorded');
            btn.style.background = '#00ffcc';
            btn.style.color = '#000';
            setTimeout(() => {
                btn.style.background = '';
                btn.style.color = '';
            }, 200);
        }
        
        if (this.config.updateModeDisplay) {
            this.config.updateModeDisplay(Object.keys(this.calibrationData).length);
        }
        this.saveConfig();
    }

    // Reset Calibration
    resetCalibration() {
        this.calibrationData = {};
        document.querySelectorAll('.calib-btn').forEach(btn => {
            btn.classList.remove('recorded');
            btn.classList.remove('active');
        });
        
        if (this.config.updateModeDisplay) {
            this.config.updateModeDisplay(0);
        }
        
        this.isRangeDetecting = false;
        const key = this.STORAGE_KEY_PREFIX + this.currentProfileIndex;
        localStorage.removeItem(key);
        
        if (this.config.showFeedback) {
            this.config.showFeedback(`已重置設定檔 ${this.currentProfileIndex}`);
        }
    }

    // Save Config
    saveConfig() {
        const config = {
            calibrationData: this.calibrationData,
            centerOffset: this.centerOffset,
            defaultTriggerRadius: this.defaultTriggerRadius,
            smoothingFactor: this.smoothingFactor,
            soundSettings: this.soundSettings,
            mouthControlEnabled: this.mouthControlEnabled,
            mouthTriggerMode: this.mouthTriggerMode
        };
        
        try {
            const key = this.STORAGE_KEY_PREFIX + this.currentProfileIndex;
            localStorage.setItem(key, JSON.stringify(config));
            if (this.config.showFeedback) {
                this.config.showFeedback(`✅ 設定檔 ${this.currentProfileIndex} 已儲存！`);
            }
        } catch (e) {
            if (this.config.showFeedback) {
                this.config.showFeedback("❌ 儲存失敗");
            }
        }
    }

    // Load Config
    loadConfig() {
        // Reset to defaults
        this.calibrationData = {};
        this.centerOffset = { yaw: 0, pitch: 0.45 };
        this.defaultTriggerRadius = 40;
        
        const radiusSlider = document.getElementById('radius-slider');
        const radiusValDisplay = document.getElementById('radius-val');
        radiusSlider.value = 40;
        radiusValDisplay.innerText = 40;
        
        const key = this.STORAGE_KEY_PREFIX + this.currentProfileIndex;
        const json = localStorage.getItem(key);
        
        if (json) {
            try {
                const config = JSON.parse(json);
                if (config.calibrationData) this.calibrationData = config.calibrationData;
                if (config.centerOffset) this.centerOffset = config.centerOffset;
                if (config.defaultTriggerRadius) {
                    this.defaultTriggerRadius = config.defaultTriggerRadius;
                    radiusSlider.value = this.defaultTriggerRadius;
                    radiusValDisplay.innerText = this.defaultTriggerRadius;
                }
                if (config.smoothingFactor) {
                    this.smoothingFactor = config.smoothingFactor;
                    document.getElementById('speed-slider').value = this.smoothingFactor;
                }
                if (config.soundSettings) {
                    this.soundSettings = config.soundSettings;
                    if (this.soundSettings.returnToCenter === undefined) this.soundSettings.returnToCenter = false;
                    document.getElementById('return-center-toggle').checked = this.soundSettings.returnToCenter;
                    document.getElementById('instrument-select').value = this.soundSettings.instrument;
                    document.getElementById('vol-slider').value = this.soundSettings.volume * 100;
                    document.getElementById('vol-val').innerText = `${Math.round(this.soundSettings.volume * 100)}%`;
                    document.getElementById('dur-slider').value = this.soundSettings.duration;
                    document.getElementById('dur-val').innerText = `${this.soundSettings.duration}s`;
                }
                if (config.mouthControlEnabled !== undefined) {
                    this.mouthControlEnabled = config.mouthControlEnabled;
                    document.getElementById('mouth-enable-check').checked = this.mouthControlEnabled;
                }
                if (config.mouthTriggerMode !== undefined) {
                    this.mouthTriggerMode = config.mouthTriggerMode;
                    document.getElementById('mouth-trigger-mode').value = this.mouthTriggerMode;
                }
                
                // Update UI
                document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('recorded'));
                for (let id in this.calibrationData) {
                    const btn = document.getElementById(`btn-${id}`);
                    if (btn) btn.classList.add('recorded');
                }
            } catch (e) {
                if (this.config.showFeedback) {
                    this.config.showFeedback("❌ 讀取失敗");
                }
            }
        } else {
            document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('recorded'));
            if (this.config.showFeedback) {
                this.config.showFeedback(`ℹ️ 設定檔 ${this.currentProfileIndex} 為空`);
            }
        }
        
        if (this.config.updateModeDisplay) {
            this.config.updateModeDisplay(Object.keys(this.calibrationData).length);
        }
        
        // Reset point settings panel
        const pointSettingsPanel = document.getElementById('point-settings-panel');
        pointSettingsPanel.classList.add('hidden');
        document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('selected'));
    }

    // Export CSV
    exportCSV() {
        const data = {
            Profile: this.currentProfileIndex,
            Center_Yaw: this.centerOffset.yaw.toFixed(4),
            Center_Pitch: this.centerOffset.pitch.toFixed(4),
            Smoothing: this.smoothingFactor,
            Trigger_Radius_Global: this.defaultTriggerRadius,
            Sound_Instrument: this.soundSettings.instrument,
            Sound_Volume: this.soundSettings.volume,
            Sound_Duration: this.soundSettings.duration,
            Sound_ReturnToCenter: this.soundSettings.returnToCenter,
            Mouth_Control_Enabled: this.mouthControlEnabled,
            Mouth_Trigger_Mode: this.mouthTriggerMode
        };
        
        let csvContent = "\uFEFFParameter,Value\n";
        for (const [key, value] of Object.entries(data)) {
            csvContent += `${key},${value}\n`;
        }
        
        csvContent += "\nID,Yaw,Pitch,Radius,SemitoneShift,BaseMidi,Name\n";
        for (let i = 1; i <= 9; i++) {
            if (this.calibrationData[i]) {
                const d = this.calibrationData[i];
                const oct = d.semitoneShift || 0;
                const base = d.baseMidi !== undefined ? d.baseMidi : (this.DEFAULT_BASE_MIDI[i] || "");
                csvContent += `${i},${d.yaw.toFixed(4)},${d.pitch.toFixed(4)},${d.radius || this.defaultTriggerRadius},${oct},${base},${d.name}\n`;
            } else {
                csvContent += `${i},,,,,,,\n`;
            }
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const date = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `head_tracker_profile_${this.currentProfileIndex}_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (this.config.showFeedback) {
            this.config.showFeedback("✅ CSV 匯出成功！");
        }
    }

    // Import CSV
    importCSV() {
        const csvInput = document.getElementById('csv-input');
        csvInput.click();
    }

    // Handle File Select
    handleFileSelect(evt) {
        const file = evt.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                this.parseCSV(text);
            } catch (error) {
                console.error(error);
                if (this.config.showFeedback) {
                    this.config.showFeedback("❌ 檔案解析失敗");
                }
            }
            evt.target.value = '';
        };
        reader.readAsText(file);
    }

    // Parse CSV
    parseCSV(text) {
        const lines = text.split(/\r\n|\n/);
        let isDataSection = false;
        
        let newCenterOffset = { ...this.centerOffset };
        let newSmoothing = this.smoothingFactor;
        let newTriggerRadius = this.defaultTriggerRadius;
        let newSoundSettings = { ...this.soundSettings };
        let newCalibrationData = {};
        let newMouthEnabled = this.mouthControlEnabled;
        let newMouthTrigger = this.mouthTriggerMode;
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            if (line.startsWith("ID,Yaw,Pitch")) {
                isDataSection = true;
                continue;
            }
            
            const parts = line.split(',');
            if (parts.length < 2) continue;
            
            if (!isDataSection) {
                const key = parts[0].trim();
                const val = parts[1].trim();
                
                switch(key) {
                    case 'Center_Yaw': newCenterOffset.yaw = parseFloat(val); break;
                    case 'Center_Pitch': newCenterOffset.pitch = parseFloat(val); break;
                    case 'Smoothing': newSmoothing = parseFloat(val); break;
                    case 'Trigger_Radius_Global': newTriggerRadius = parseInt(val); break;
                    case 'Sound_Instrument': newSoundSettings.instrument = val; break;
                    case 'Sound_Volume': newSoundSettings.volume = parseFloat(val); break;
                    case 'Sound_Duration': newSoundSettings.duration = parseFloat(val); break;
                    case 'Sound_ReturnToCenter': newSoundSettings.returnToCenter = (val === 'true'); break;
                    case 'Mouth_Control_Enabled': newMouthEnabled = (val === 'true'); break;
                    case 'Mouth_Trigger_Mode': newMouthTrigger = val; break;
                }
            } else {
                const id = parseInt(parts[0]);
                if (id >= 1 && id <= 9) {
                    const yaw = parseFloat(parts[1]);
                    const pitch = parseFloat(parts[2]);
                    if (!isNaN(yaw) && !isNaN(pitch)) {
                        const rad = parts[3] ? parseInt(parts[3]) : newTriggerRadius;
                        const semi = parts[4] ? parseInt(parts[4]) : 0;
                        const base = (parts[5] && parts[5] !== '') ? parseInt(parts[5]) : this.DEFAULT_BASE_MIDI[id];
                        const name = parts[6] || this.NOTE_NAMES[id];
                        
                        newCalibrationData[id] = {
                            yaw: yaw,
                            pitch: pitch,
                            radius: rad,
                            semitoneShift: semi,
                            baseMidi: base,
                            name: name
                        };
                    }
                }
            }
        }
        
        // Apply all changes
        this.centerOffset = newCenterOffset;
        this.smoothingFactor = newSmoothing;
        this.defaultTriggerRadius = newTriggerRadius;
        this.soundSettings = newSoundSettings;
        this.calibrationData = newCalibrationData;
        this.mouthControlEnabled = newMouthEnabled;
        this.mouthTriggerMode = newMouthTrigger;
        
        // Update UI
        document.getElementById('speed-slider').value = this.smoothingFactor;
        document.getElementById('radius-slider').value = this.defaultTriggerRadius;
        document.getElementById('radius-val').innerText = this.defaultTriggerRadius;
        document.getElementById('instrument-select').value = this.soundSettings.instrument;
        document.getElementById('vol-slider').value = this.soundSettings.volume * 100;
        document.getElementById('vol-val').innerText = `${Math.round(this.soundSettings.volume * 100)}%`;
        document.getElementById('dur-slider').value = this.soundSettings.duration;
        document.getElementById('dur-val').innerText = `${this.soundSettings.duration}s`;
        document.getElementById('return-center-toggle').checked = this.soundSettings.returnToCenter;
        document.getElementById('mouth-enable-check').checked = this.mouthControlEnabled;
        document.getElementById('mouth-trigger-mode').value = this.mouthTriggerMode;
        
        this.saveConfig();
        if (this.config.updateModeDisplay) {
            this.config.updateModeDisplay(Object.keys(this.calibrationData).length);
        }
        
        document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('recorded'));
        for (let id in this.calibrationData) {
            const btn = document.getElementById(`btn-${id}`);
            if (btn) btn.classList.add('recorded');
        }
        
        if (this.config.showFeedback) {
            this.config.showFeedback("✅ CSV 匯入成功！");
        }
    }

    // Getters
    getCalibrationData() {
        return this.calibrationData;
    }

    getCenterOffset() {
        return this.centerOffset;
    }

    getSmoothingFactor() {
        return this.smoothingFactor;
    }

    getSoundSettings() {
        return this.soundSettings;
    }

    getMouthControlEnabled() {
        return this.mouthControlEnabled;
    }

    getMouthTriggerMode() {
        return this.mouthTriggerMode;
    }

    getIsRangeDetecting() {
        return this.isRangeDetecting;
    }

    getRangeTrace() {
        return this.rangeTrace;
    }

    getRangeBounds() {
        return {
            minYaw: this.rangeMinYaw,
            maxYaw: this.rangeMaxYaw,
            minPitch: this.rangeMinPitch,
            maxPitch: this.rangeMaxPitch
        };
    }

    switchProfile(index) {
        this.currentProfileIndex = index;
        this.loadConfig();
    }
}
