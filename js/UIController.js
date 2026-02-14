/**
 * UI Controller
 * 負責所有 UI 互動、面板切換、拖拽、滾輪控制、模式切換
 */

class UIController {
    constructor(config = {}) {
        this.config = config;
        this.isDragging = false;
        this.draggedPointId = null;
        this.isEditMode = false;
        this.selectedPointId = null;
        this.currentProfileIndex = 1;
        
        // DOM Elements
        this.calibPanel = document.getElementById('calib-panel');
        this.accompPanel = document.getElementById('accomp-panel');
        this.faceGuide = document.getElementById('face-guide');
        this.faceGuideScale = 1.0;
        this.statusText = document.getElementById('status-text');
        this.pointSettingsPanel = document.getElementById('point-settings-panel');
        this.selectedPointName = document.getElementById('selected-point-name');
        this.modeRecBtn = document.getElementById('mode-rec-btn');
        this.modeEditBtn = document.getElementById('mode-edit-btn');
        this.gridHint = document.getElementById('grid-hint');
        this.recControls = document.getElementById('rec-controls');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.octaveIndicator = document.getElementById('octave-indicator');
        this.noteInfoPanel = document.getElementById('note-info');
        this.currentNoteNameDisplay = document.getElementById('current-note-name');
        this.currentSolfegeDisplay = document.getElementById('current-solfege');
        this.currentFreqDisplay = document.getElementById('current-freq');
        
        // UI State
        this.isHighOctave = false;
        
        // Constants
        this.NOTE_STRS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
        this.SOLFEGE_MAP = {
            1: "Do", 2: "Re", 3: "Mi", 4: "Fa", 5: "Rest", 6: "So", 7: "La", 8: "Si", 9: "Do"
        };
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Canvas drag & wheel events
        const canvas = document.getElementById('output_canvas');
        canvas.addEventListener('mousedown', this.handleStart.bind(this));
        canvas.addEventListener('mousemove', this.handleMove.bind(this));
        canvas.addEventListener('mouseup', this.handleEnd.bind(this));
        canvas.addEventListener('mouseleave', this.handleEnd.bind(this));
        canvas.addEventListener('touchstart', this.handleStart.bind(this), {passive: false});
        canvas.addEventListener('touchmove', this.handleMove.bind(this), {passive: false});
        canvas.addEventListener('touchend', this.handleEnd.bind(this));
        canvas.addEventListener('wheel', this.handleWheel.bind(this), {passive: false});

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        soundBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleSound();
        });
    }

    // Panel Toggle
    toggleCalibration() {
        this.accompPanel.classList.remove('open');
        this.calibPanel.classList.toggle('open');
    }

    toggleAccompPanel() {
        this.calibPanel.classList.remove('open');
        this.accompPanel.classList.toggle('open');
    }

    // Sound Toggle
    toggleSound() {
        if (this.config.onSoundToggle) {
            this.config.onSoundToggle();
        }
    }

    // Debug & Zones Toggle
    toggleDebug() {
        const isDebugVisible = document.getElementById('show-debug').checked;
        if (this.config.onDebugToggle) {
            this.config.onDebugToggle(isDebugVisible);
        }
    }

    toggleZones() {
        const isZonesVisible = document.getElementById('show-zones').checked;
        if (this.config.onZonesToggle) {
            this.config.onZonesToggle(isZonesVisible);
        }
    }

    toggleGuide() {
        const isGuideVisible = document.getElementById('show-guide').checked;
        if (isGuideVisible) {
            this.faceGuide.classList.add('active');
        } else {
            this.faceGuide.classList.remove('active');
        }
    }

    // Edit Mode Toggle
    setEditMode(enable) {
        this.isEditMode = enable;
        if (enable) {
            this.modeEditBtn.classList.add('active');
            this.modeEditBtn.style.background = '#3b82f6';
            this.modeEditBtn.style.color = '#fff';
            this.modeRecBtn.classList.remove('active-rec');
            this.modeRecBtn.style.background = '#1f2937';
            this.modeRecBtn.style.color = '#9ca3af';
            this.recControls.classList.add('hidden');
            this.gridHint.innerText = "點擊下方按鈕「選取」並設定參數：";
        } else {
            this.modeRecBtn.classList.add('active-rec');
            this.modeRecBtn.style.background = '#ef4444';
            this.modeRecBtn.style.color = '#fff';
            this.modeEditBtn.classList.remove('active');
            this.modeEditBtn.style.background = '#1f2937';
            this.modeEditBtn.style.color = '#9ca3af';
            this.recControls.classList.remove('hidden');
            this.gridHint.innerText = "點擊下方按鈕「錄製」位置：";
            this.selectedPointId = null;
            this.pointSettingsPanel.classList.add('hidden');
            document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('selected'));
        }
        
        if (this.config.onEditModeChange) {
            this.config.onEditModeChange(enable);
        }
    }

    // Handle Grid Click (Record or Edit)
    handleGridClick(id, name) {
        if (this.isEditMode) {
            this.selectPoint(id);
        } else {
            if (this.config.onRecordPose) {
                this.config.onRecordPose(id, name);
            }
        }
    }

    // Select Point for Editing
    selectPoint(id) {
        const calibrationData = this.config.getCalibrationData ? this.config.getCalibrationData() : {};
        if (!calibrationData[id]) {
            this.showFeedback("請先錄製該點才能編輯");
            return;
        }
        
        this.selectedPointId = id;
        const data = calibrationData[id];
        
        document.querySelectorAll('.calib-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById(`btn-${id}`).classList.add('selected');
        
        this.pointSettingsPanel.classList.remove('hidden');
        this.selectedPointName.innerText = data.name;
        
        const r = data.radius || this.config.defaultTriggerRadius || 40;
        const pointRadiusSlider = document.getElementById('point-radius-slider');
        const pointRadiusVal = document.getElementById('point-radius-val');
        pointRadiusSlider.value = r;
        pointRadiusVal.innerText = r;
        
        const semi = data.semitoneShift || 0;
        this.updateSemitoneButtons(semi);
        
        const DEFAULT_BASE_MIDI = this.config.DEFAULT_BASE_MIDI || {};
        const currentBase = data.baseMidi !== undefined ? data.baseMidi : DEFAULT_BASE_MIDI[id];
        const baseNoteSelect = document.getElementById('base-note-select');
        baseNoteSelect.value = currentBase !== null ? currentBase : -1;
        
        if (this.config.onPointSelect) {
            this.config.onPointSelect(id);
        }
    }

    // Semitone Buttons Update
    updateSemitoneButtons(val) {
        document.getElementById('semitone-flat-btn').classList.remove('active');
        document.getElementById('semitone-std-btn').classList.remove('active');
        document.getElementById('semitone-sharp-btn').classList.remove('active');
        
        if (val === -1) document.getElementById('semitone-flat-btn').classList.add('active');
        else if (val === 1) document.getElementById('semitone-sharp-btn').classList.add('active');
        else document.getElementById('semitone-std-btn').classList.add('active');
    }

    // Set Point Semitone
    setPointSemitone(val) {
        if (this.config.onSetPointSemitone) {
            this.config.onSetPointSemitone(this.selectedPointId, val);
        }
        this.updateSemitoneButtons(val);
    }

    // Profile Switch
    switchProfile(index) {
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`profile-btn-${i}`);
            if (i === index) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        this.currentProfileIndex = index;
        
        if (this.config.onProfileSwitch) {
            this.config.onProfileSwitch(index);
        }
        this.showFeedback(`📂 已切換至設定檔 ${index}`);
    }

    // Drag & Drop Handlers
    getLogicalPos(evt, canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
        const visualX = clientX - rect.left;
        const visualY = clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const logicalX = (rect.width - visualX) * scaleX;
        const logicalY = visualY * scaleY;
        return { x: logicalX, y: logicalY };
    }

    handleStart(evt) {
        const canvas = document.getElementById('output_canvas');
        const isDebugVisible = document.getElementById('show-debug').checked;
        const isZonesVisible = document.getElementById('show-zones').checked;
        
        if (!isDebugVisible && !isZonesVisible) return;
        
        const pos = this.getLogicalPos(evt, canvas);
        const calibrationData = this.config.getCalibrationData ? this.config.getCalibrationData() : {};
        
        for (const [id, data] of Object.entries(calibrationData)) {
            const mapToCanvas = this.config.mapToCanvas || ((v, isYaw, w, h) => isYaw ? (v + 0.5) * w : (v + 0.5) * h);
            const cx = mapToCanvas(data.yaw, true, canvas.width, canvas.height);
            const cy = mapToCanvas(data.pitch, false, canvas.width, canvas.height);
            const r = data.radius || this.config.defaultTriggerRadius || 40;
            const dist = Math.sqrt((pos.x - cx)**2 + (pos.y - cy)**2);
            if (dist < r) {
                this.isDragging = true;
                this.draggedPointId = id;
                canvas.style.cursor = 'grabbing';
                if (this.isEditMode) this.selectPoint(id);
                break;
            }
        }
    }

    handleMove(evt) {
        const canvas = document.getElementById('output_canvas');
        const pos = this.getLogicalPos(evt, canvas);
        const calibrationData = this.config.getCalibrationData ? this.config.getCalibrationData() : {};
        
        if (this.isDragging && this.draggedPointId) {
            if (evt.preventDefault) evt.preventDefault();
            const w = canvas.width;
            const h = canvas.height;
            const newYaw = (pos.x / w - 0.5);
            const newPitch = (pos.y / h - 0.5);
            
            if (this.config.onDragPoint) {
                this.config.onDragPoint(this.draggedPointId, newYaw, newPitch);
            }
        } else {
            const isDebugVisible = document.getElementById('show-debug').checked;
            const isZonesVisible = document.getElementById('show-zones').checked;
            
            if (isDebugVisible || isZonesVisible) {
                let hovering = false;
                const mapToCanvas = this.config.mapToCanvas || ((v, isYaw, w, h) => isYaw ? (v + 0.5) * w : (v + 0.5) * h);
                
                for (const [id, data] of Object.entries(calibrationData)) {
                    const cx = mapToCanvas(data.yaw, true, canvas.width, canvas.height);
                    const cy = mapToCanvas(data.pitch, false, canvas.width, canvas.height);
                    const r = data.radius || this.config.defaultTriggerRadius || 40;
                    const dist = Math.sqrt((pos.x - cx)**2 + (pos.y - cy)**2);
                    if (dist < r) hovering = true;
                }
                canvas.style.cursor = hovering ? 'grab' : 'default';
            }
        }
    }

    handleEnd() {
        this.isDragging = false;
        this.draggedPointId = null;
        document.getElementById('output_canvas').style.cursor = 'default';
    }

    handleWheel(evt) {
        const canvas = document.getElementById('output_canvas');
        const isZonesVisible = document.getElementById('show-zones').checked;
        let handled = false;
        
        if (isZonesVisible) {
            const pos = this.getLogicalPos(evt, canvas);
            const calibrationData = this.config.getCalibrationData ? this.config.getCalibrationData() : {};
            const mapToCanvas = this.config.mapToCanvas || ((v, isYaw, w, h) => isYaw ? (v + 0.5) * w : (v + 0.5) * h);
            let hoveredId = null;
            
            for (const [id, data] of Object.entries(calibrationData)) {
                const cx = mapToCanvas(data.yaw, true, canvas.width, canvas.height);
                const cy = mapToCanvas(data.pitch, false, canvas.width, canvas.height);
                const r = data.radius || this.config.defaultTriggerRadius || 40;
                const dist = Math.sqrt((pos.x - cx)**2 + (pos.y - cy)**2);
                if (dist < r) {
                    hoveredId = id;
                    break;
                }
            }
            
            if (hoveredId) {
                evt.preventDefault();
                const delta = Math.sign(evt.deltaY) * -5;
                
                if (this.config.onWheelResize) {
                    this.config.onWheelResize(hoveredId, delta);
                }
                handled = true;
                return;
            }
        }
        
        if (!handled && this.faceGuide && this.faceGuide.classList.contains('active')) {
            evt.preventDefault();
            const delta = Math.sign(evt.deltaY) * -0.1;
            this.faceGuideScale += delta;
            this.faceGuideScale = Math.max(0.5, Math.min(3.0, this.faceGuideScale));
            this.faceGuide.style.transform = `translate(-50%, -50%) scale(${this.faceGuideScale})`;
        }
    }

    // Octave Toggle
    toggleOctave() {
        this.isHighOctave = !this.isHighOctave;
        if (this.isHighOctave) {
            this.octaveIndicator.innerText = "🎹 音高: 高八度 (+8va)";
            this.octaveIndicator.classList.add("active");
        } else {
            this.octaveIndicator.innerText = "🎹 音高: 標準";
            this.octaveIndicator.classList.remove("active");
        }
        
        if (this.config.onOctaveToggle) {
            this.config.onOctaveToggle(this.isHighOctave);
        }
    }

    // Update Info Panel
    updateInfoPanel(midi, pointId) {
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        const noteName = this.NOTE_STRS[noteIndex] + octave;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        
        this.currentNoteNameDisplay.innerText = noteName;
        this.currentFreqDisplay.innerText = `${freq.toFixed(1)} Hz`;
        if (pointId) this.currentSolfegeDisplay.innerText = this.SOLFEGE_MAP[pointId] || "";
        else this.currentSolfegeDisplay.innerText = "測試音";
        
        this.noteInfoPanel.style.borderColor = '#e879f9';
        setTimeout(() => { this.noteInfoPanel.style.borderColor = '#a855f7'; }, 100);
    }

    // Update Mode Display
    updateModeDisplay(count) {
        if (!this.modeIndicator) return;
        if (count > 0) {
            this.modeIndicator.innerText = `模式: 自定義 (${count}/9 點)`;
            this.modeIndicator.style.color = '#3b82f6';
        } else {
            this.modeIndicator.innerText = "模式: 預設通用";
            this.modeIndicator.style.color = '#fbbf24';
        }
    }

    // Show Feedback
    showFeedback(msg) {
        const oldColor = this.statusText.style.color;
        const oldText = this.statusText.innerText;
        this.statusText.innerText = msg;
        this.statusText.style.color = "#00ff00";
        setTimeout(() => {
            if (this.statusText.innerText === msg) {
                this.statusText.innerText = oldText;
                this.statusText.style.color = oldColor;
            }
        }, 2000);
    }

    // Getters
    getIsHighOctave() {
        return this.isHighOctave;
    }

    getCurrentProfileIndex() {
        return this.currentProfileIndex;
    }

    getIsEditMode() {
        return this.isEditMode;
    }

    getSelectedPointId() {
        return this.selectedPointId;
    }
}
