/**
 * AudioEngine.js
 * 音頻合成引擎
 * 
 * 功能：
 * - Web Audio API 封裝
 * - 多種樂器音色
 * - ADSR 音量包絡
 * - 音符播放管理
 */

class AudioEngine {
    constructor(options = {}) {
        this.audioContext = null;
        this.currentOscillators = new Map(); // 追蹤正在播放的音符
        
        // 設定
        this.volume = options.volume || CONFIG.audio.defaultVolume;
        this.duration = options.duration || CONFIG.audio.defaultDuration;
        this.instrument = options.instrument || 'triangle';
        
        // 回調函數
        this.onNoteStart = options.onNoteStart || null;
        this.onNoteEnd = options.onNoteEnd || null;
    }

    /**
     * 初始化音訊上下文（需要用戶互動觸發）
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // 恢復暫停的音訊上下文
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        return this.audioContext;
    }

    /**
     * 播放音符
     * @param {number} frequency - 頻率 (Hz)
     * @param {string} pointId - 校準點 ID（用於追蹤）
     * @param {boolean} forcePlay - 強制播放（即使已在播放）
     */
    playNote(frequency, pointId = null, forcePlay = false) {
        if (!this.audioContext) {
            console.warn('AudioEngine: AudioContext not initialized');
            return null;
        }

        // 檢查是否已在播放同一個音符
        if (!forcePlay && pointId && this.currentOscillators.has(pointId)) {
            return null;
        }

        const now = this.audioContext.currentTime;
        const envelope = CONFIG.audio.instruments[this.instrument] || CONFIG.audio.instruments.triangle;

        // 建立振盪器（音源）
        const osc = this.audioContext.createOscillator();
        osc.type = this.instrument;
        osc.frequency.setValueAtTime(frequency, now);

        // 建立增益節點（音量控制）
        const gainNode = this.audioContext.createGain();
        
        // ADSR 音量包絡
        const attackTime = envelope.attack;
        const decayTime = envelope.decay;
        const sustainLevel = envelope.sustain * this.volume;
        const releaseTime = envelope.release;
        const totalDuration = this.duration;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume, now + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainLevel, now + totalDuration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

        // 連接音訊節點
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 開始與停止
        osc.start(now);
        osc.stop(now + totalDuration);

        // 追蹤正在播放的音符
        if (pointId) {
            this.currentOscillators.set(pointId, { osc, gainNode, frequency });
        }

        // 音符結束後清理
        osc.onended = () => {
            if (pointId) {
                this.currentOscillators.delete(pointId);
            }
            if (this.onNoteEnd) {
                this.onNoteEnd(pointId, frequency);
            }
        };

        // 通知音符開始
        if (this.onNoteStart) {
            this.onNoteStart(pointId, frequency);
        }

        return { osc, gainNode };
    }

    /**
     * 停止特定音符
     */
    stopNote(pointId) {
        const note = this.currentOscillators.get(pointId);
        if (note && note.osc) {
            const now = this.audioContext.currentTime;
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(note.gainNode.gain.value, now);
            note.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
            note.osc.stop(now + 0.05);
            this.currentOscillators.delete(pointId);
        }
    }

    /**
     * 停止所有音符
     */
    stopAll() {
        for (const [pointId] of this.currentOscillators) {
            this.stopNote(pointId);
        }
    }

    /**
     * 檢查音符是否正在播放
     */
    isPlaying(pointId) {
        return this.currentOscillators.has(pointId);
    }

    /**
     * 取得正在播放的音符數量
     */
    getPlayingCount() {
        return this.currentOscillators.size;
    }

    /**
     * 設定音量
     */
    setVolume(volume) {
        this.volume = UTILS.clamp(volume, 0, 1);
    }

    /**
     * 設定持續時間
     */
    setDuration(duration) {
        this.duration = Math.max(0.1, duration);
    }

    /**
     * 設定樂器音色
     */
    setInstrument(instrument) {
        const validInstruments = ['sine', 'triangle', 'square', 'sawtooth'];
        if (validInstruments.includes(instrument)) {
            this.instrument = instrument;
        }
    }

    /**
     * 取得當前狀態
     */
    getState() {
        return {
            volume: this.volume,
            duration: this.duration,
            instrument: this.instrument,
            playingCount: this.getPlayingCount(),
            isInitialized: this.audioContext !== null
        };
    }

    /**
     * 銷毀音訊上下文
     */
    destroy() {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// 匯出（支援 ES6 模組與傳統 script 標籤）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioEngine;
}
