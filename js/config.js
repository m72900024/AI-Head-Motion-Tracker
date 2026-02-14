/**
 * config.js
 * 全域配置與常數定義
 */

const CONFIG = {
    // 音頻設定
    audio: {
        baseFrequency: 440, // A4 標準音高
        defaultVolume: 0.3,
        defaultDuration: 0.5,
        instruments: {
            sine: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.1 },
            triangle: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.15 },
            square: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.05 },
            sawtooth: { attack: 0.03, decay: 0.25, sustain: 0.65, release: 0.12 }
        }
    },

    // 校準設定
    calibration: {
        defaultRadius: 40,
        gridPositions: [
            { id: 'tl', name: '左上', x: -1, y: -1 },
            { id: 'tc', name: '上中', x: 0, y: -1 },
            { id: 'tr', name: '右上', x: 1, y: -1 },
            { id: 'ml', name: '左中', x: -1, y: 0 },
            { id: 'mc', name: '中央', x: 0, y: 0 },
            { id: 'mr', name: '右中', x: 1, y: 0 },
            { id: 'bl', name: '左下', x: -1, y: 1 },
            { id: 'bc', name: '下中', x: 0, y: 1 },
            { id: 'br', name: '右下', x: 1, y: 1 }
        ]
    },

    // 追蹤設定
    tracking: {
        smoothingFactor: 0.15,
        centerOffset: { yaw: 0, pitch: 0.45 },
        fps: 30
    },

    // 音符對照表
    notes: {
        names: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        solfege: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
        
        // 八度音程範圍
        octaveRange: {
            low: 3,    // C3
            mid: 4,    // C4 (中央 C)
            high: 5    // C5
        }
    },

    // 預設校準資料
    defaultCalibration: {
        'tl': { x: -60, y: -60, semitone: -7, radius: 40 },
        'tc': { x: 0, y: -60, semitone: -5, radius: 40 },
        'tr': { x: 60, y: -60, semitone: -3, radius: 40 },
        'ml': { x: -60, y: 0, semitone: -2, radius: 40 },
        'mc': { x: 0, y: 0, semitone: 0, radius: 40 },
        'mr': { x: 60, y: 0, semitone: 2, radius: 40 },
        'bl': { x: -60, y: 60, semitone: 3, radius: 40 },
        'bc': { x: 0, y: 60, semitone: 5, radius: 40 },
        'br': { x: 60, y: 60, semitone: 7, radius: 40 }
    },

    // UI 設定
    ui: {
        panelWidth: 340,
        canvasMaxWidth: 800,
        colorScheme: {
            primary: '#00ffcc',
            secondary: '#a855f7',
            warning: '#fbbf24',
            danger: '#ef4444'
        }
    },

    // LocalStorage 鍵名
    storageKeys: {
        calibration: 'headTracker_calibration_v3',
        settings: 'headTracker_settings_v3'
    }
};

// 工具函數
const UTILS = {
    /**
     * MIDI 音符號碼轉頻率
     */
    midiToFreq(midi) {
        return CONFIG.audio.baseFrequency * Math.pow(2, (midi - 69) / 12);
    },

    /**
     * 半音偏移轉 MIDI 音符
     */
    semitoneToMidi(semitone, baseNote = 60) {
        return baseNote + semitone;
    },

    /**
     * MIDI 轉音符名稱
     */
    midiToNoteName(midi) {
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return CONFIG.notes.names[noteIndex] + octave;
    },

    /**
     * MIDI 轉唱名
     */
    midiToSolfege(midi) {
        const noteIndex = midi % 12;
        return CONFIG.notes.solfege[noteIndex];
    },

    /**
     * 計算兩點距離
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * 限制數值範圍
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};

// 匯出（支援 ES6 模組與傳統 script 標籤）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, UTILS };
}
