/**
 * main.js
 * 主程式整合層 - 連接所有模組
 */

// 全域實例
let faceTracker = null;
let calibrationSystem = null;
let audioEngine = null;
let accompaniment = null;

// 全域狀態
let isSoundEnabled = false;
let isHighOctave = false;
let isEditMode = false;
let soundSettings = {
    volume: 0.3,
    duration: 0.5,
    instrument: 'triangle',
    returnToCenter: false
};

/**
 * 初始化所有模組
 */
async function initializeApp() {
    try {
        // 初始化校準系統
        calibrationSystem = new CalibrationSystem({
            onPointSelect: handlePointSelect,
            onDataChange: handleCalibrationChange
        });
        
        // 載入已儲存的校準資料
        calibrationSystem.load();
        
        // 初始化音頻引擎
        audioEngine = new AudioEngine({
            volume: soundSettings.volume,
            duration: soundSettings.duration,
            instrument: soundSettings.instrument
        });
        
        // 初始化音頻上下文（需要用戶互動）
        audioEngine.init();
        
        // 初始化伴奏系統（如果需要）
        if (typeof AccompanimentSystem !== 'undefined') {
            accompaniment = new AccompanimentSystem({
                audioCtx: audioEngine.audioContext,
                bpm: 100,
                volume: 0.3,
                instrument: 'soft_pad',
                onBarChange: handleBarChange,
                onMetronomeBeat: handleMetronomeBeat
            });
        }
        
        // 初始化臉部追蹤
        const videoElement = document.getElementById('input_video');
        const canvasElement = document.getElementById('output_canvas');
        
        faceTracker = new FaceTracker({
            videoElement: videoElement,
            canvasElement: canvasElement,
            smoothingFactor: 0.15,
            onResults: handleFaceResults,
            onFpsUpdate: handleFpsUpdate,
            onError: handleTrackerError
        });
        
        await faceTracker.init();
        await faceTracker.start();
        
        console.log('✅ App initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('初始化失敗：' + error.message);
    }
}

/**
 * 處理臉部追蹤結果
 */
function handleFaceResults(results) {
    const { yaw, pitch, landmarks } = results;
    
    // 更新 UI 顯示
    updateDebugDisplay(yaw, pitch);
    
    // 檢查觸發
    if (isSoundEnabled) {
        const triggeredPoint = calibrationSystem.checkTrigger(yaw, pitch);
        
        if (triggeredPoint) {
            const pointData = calibrationSystem.getPointData(triggeredPoint);
            playNoteFromPoint(triggeredPoint, pointData);
        }
    }
    
    // 繪製校準點（如果在編輯模式）
    if (isEditMode) {
        drawCalibrationPoints(yaw, pitch);
    }
}

/**
 * 從校準點播放音符
 */
function playNoteFromPoint(pointId, pointData) {
    if (!pointData || !pointData.baseMidi) return;
    
    let midi = pointData.baseMidi;
    
    // 套用半音偏移
    if (pointData.semitoneShift) {
        midi += pointData.semitoneShift;
    }
    
    // 套用八度
    if (isHighOctave) {
        midi += 12;
    }
    
    // 計算頻率
    const freq = UTILS.midiToFreq(midi);
    
    // 播放音符
    audioEngine.playNote(freq, pointId, false);
    
    // 更新資訊面板
    updateNoteInfo(midi, pointId);
}

/**
 * 處理校準點選擇
 */
function handlePointSelect(pointId, pointData) {
    console.log('Point selected:', pointId, pointData);
    // UI 更新邏輯
}

/**
 * 處理校準資料變更
 */
function handleCalibrationChange(pointId, data) {
    console.log('Calibration changed:', pointId, data);
    // 儲存到 localStorage
    calibrationSystem.save();
}

/**
 * 處理伴奏小節變更
 */
function handleBarChange(barInfo) {
    // 更新和弦顯示
    const chordDisplay = document.getElementById('chord-display');
    if (chordDisplay && barInfo.chord) {
        chordDisplay.innerText = barInfo.chord;
        chordDisplay.classList.add('active');
        setTimeout(() => chordDisplay.classList.remove('active'), 500);
    }
}

/**
 * 處理節拍器
 */
function handleMetronomeBeat(beatInfo) {
    const light = document.getElementById('metronome-light');
    if (light) {
        light.classList.add('active');
        setTimeout(() => light.classList.remove('active'), 100);
    }
}

/**
 * 處理 FPS 更新
 */
function handleFpsUpdate(fps) {
    const fpsElement = document.getElementById('val-fps');
    if (fpsElement) {
        fpsElement.innerText = fps;
    }
}

/**
 * 處理追蹤錯誤
 */
function handleTrackerError(error) {
    console.error('Tracker error:', error);
    showError('追蹤錯誤：' + error);
}

/**
 * 更新除錯顯示
 */
function updateDebugDisplay(yaw, pitch) {
    const yawElement = document.getElementById('val-yaw');
    const pitchElement = document.getElementById('val-pitch');
    
    if (yawElement) yawElement.innerText = yaw.toFixed(2);
    if (pitchElement) pitchElement.innerText = pitch.toFixed(2);
}

/**
 * 更新音符資訊
 */
function updateNoteInfo(midi, pointId) {
    const noteName = UTILS.midiToNoteName(midi);
    const solfege = UTILS.midiToSolfege(midi);
    const freq = UTILS.midiToFreq(midi);
    
    const nameElement = document.getElementById('current-note-name');
    const solfegeElement = document.getElementById('current-solfege');
    const freqElement = document.getElementById('current-freq');
    
    if (nameElement) nameElement.innerText = noteName;
    if (solfegeElement) solfegeElement.innerText = solfege;
    if (freqElement) freqElement.innerText = freq.toFixed(1) + ' Hz';
}

/**
 * 繪製校準點
 */
function drawCalibrationPoints(currentYaw, currentPitch) {
    // 這部分保留原本的繪製邏輯
    // 需要從 index.html 移植過來
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.innerHTML = `<div style="color:red;">${message}</div>`;
        loader.classList.remove('hidden');
    }
}

// 匯出全域函數（供 index.html 使用）
window.appInitialize = initializeApp;
window.appCalibration = calibrationSystem;
window.appAudio = audioEngine;
window.appTracker = faceTracker;
window.appAccompaniment = accompaniment;
