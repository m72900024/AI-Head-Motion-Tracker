/**
 * AccompanimentSystem.js
 * 自動伴奏系統模組
 *
 * 功能：
 * - 和弦進行播放
 * - 節拍器
 * - 分解和弦（琶音）
 * - 多種樂器音色
 * - 歌曲段落選擇
 */

class AccompanimentSystem {
    constructor(options = {}) {
        // 音訊上下文
        this.audioCtx = options.audioCtx || null;

        // 播放狀態
        this.isPlaying = false;
        this.currentBarIndex = 0;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.intervalId = null;

        // 設定
        this.bpm = options.bpm || 100;
        this.volume = options.volume || 0.3;
        this.instrument = options.instrument || 'soft_pad';
        this.isArpeggio = options.isArpeggio || false;
        this.metronomeEnabled = options.metronomeEnabled || false;
        
        // 無障礙輔助
        this.voiceEnabled = options.voiceEnabled || false;
        this.voiceRate = options.voiceRate || 1.0;  // 語速 (0.5-2.0)
        this.synth = window.speechSynthesis;

        // 當前選擇的進行
        this.currentProgressionKey = null;
        this.currentSectionIndex = 0;

        // 回調函數
        this.onBarChange = options.onBarChange || null;
        this.onMetronomeBeat = options.onMetronomeBeat || null;
        this.onStateChange = options.onStateChange || null;

        // 初始化和弦與進行
        this._initChords();
        this._initProgressions();
        this._initSongSections();
    }

    // ==================== 和弦定義 ====================

    _initChords() {
        this.CHORDS = {
            // 大三和弦
            'C':  [48, 52, 55],      // C3, E3, G3
            'D':  [50, 54, 57],      // D3, F#3, A3
            'E':  [52, 56, 59],      // E3, G#3, B3
            'F':  [53, 57, 60],      // F3, A3, C4
            'G':  [55, 59, 62],      // G3, B3, D4
            'A':  [57, 61, 64],      // A3, C#4, E4
            'B':  [59, 63, 66],      // B3, D#4, F#4

            // 小三和弦
            'Cm': [48, 51, 55],      // C3, Eb3, G3
            'Dm': [50, 53, 57],      // D3, F3, A3
            'Em': [52, 55, 59],      // E3, G3, B3
            'Fm': [53, 56, 60],      // F3, Ab3, C4
            'Gm': [55, 58, 62],      // G3, Bb3, D4
            'Am': [57, 60, 64],      // A3, C4, E4
            'Bm': [59, 62, 66],      // B3, D4, F#4

            // 七和弦
            'C7':  [48, 52, 55, 58], // C3, E3, G3, Bb3
            'D7':  [50, 54, 57, 60], // D3, F#3, A3, C4
            'E7':  [52, 56, 59, 62], // E3, G#3, B3, D4
            'F7':  [53, 57, 60, 63], // F3, A3, C4, Eb4
            'G7':  [55, 59, 62, 65], // G3, B3, D4, F4
            'A7':  [57, 61, 64, 67], // A3, C#4, E4, G4

            // 小七和弦
            'Cm7': [48, 51, 55, 58], // C3, Eb3, G3, Bb3
            'Dm7': [50, 53, 57, 60], // D3, F3, A3, C4
            'Em7': [52, 55, 59, 62], // E3, G3, B3, D4
            'Am7': [57, 60, 64, 67], // A3, C4, E4, G4

            // 大七和弦
            'Cmaj7': [48, 52, 55, 59], // C3, E3, G3, B3
            'Fmaj7': [53, 57, 60, 64], // F3, A3, C4, E4
            'Gmaj7': [55, 59, 62, 66], // G3, B3, D4, F#4

            // 其他常用和弦
            'Bb':  [50, 53, 58],     // D3, F3, Bb3 (First inversion)
            'Eb':  [51, 55, 58],     // Eb3, G3, Bb3

            // 無和弦（靜音）
            'NC': []
        };
    }

    // ==================== 和弦進行定義 ====================

    _initProgressions() {
        this.PROGRESSIONS = {
            // 節拍器
            'metronome_4': [
                { c: 'NC', b: 4, h: 'Metronome (4/4)', m: 1 }
            ],
            'metronome_3': [
                { c: 'NC', b: 3, h: 'Metronome (3/4)', m: 1 }
            ],

            // Amazing Grace (F Major, 3/4)
            'amazing_grace': [
                // Intro
                { c: 'F', b: 3, h: '[1] (Intro)', m: 0 },
                // Phrase 1
                { c: 'F', b: 3, h: '[4] ... [6][4]', m: 1 },
                { c: 'C', b: 3, h: '[6] ... [5]', m: 2 },
                { c: 'Bb', b: 3, h: '[4] ... [2]', m: 3 },
                { c: 'F', b: 3, h: '[1]', m: 4 },
                { c: 'F', b: 3, h: '[1] ... [1]', m: 5 },
                // Phrase 2
                { c: 'F', b: 3, h: '[4] ... [6][4]', m: 6 },
                { c: 'C', b: 3, h: '[6] ... [5]', m: 7 },
                { c: 'F', b: 3, h: '[9](High 1)', m: 8 },
                { c: 'Dm', b: 3, h: '[6] ... [9]', m: 9 },
                // Phrase 3
                { c: 'F', b: 3, h: '[9] ... [6][4]', m: 10 },
                { c: 'Bb', b: 3, h: '[4] ... [2]', m: 11 },
                { c: 'F', b: 3, h: '[1] ... [2]', m: 12 },
                { c: 'C', b: 3, h: '[1] ... [1]', m: 13 },
                // Phrase 4
                { c: 'F', b: 3, h: '[4] ... [6][4]', m: 14 },
                { c: 'C', b: 3, h: '[6] ... [5]', m: 15 },
                { c: 'F', b: 3, h: '[4]', m: 16 },
                { c: 'F', b: 3, h: '(End)', m: 17 }
            ],

            // 流行音樂常用進行
            'pop_c': [
                { c: 'C', b: 4 }, { c: 'G', b: 4 }, { c: 'Am', b: 4 }, { c: 'F', b: 4 }
            ],

            // 卡農進行
            'canon': [
                { c: 'C', b: 4 }, { c: 'G', b: 4 }, { c: 'Am', b: 4 }, { c: 'Em', b: 4 },
                { c: 'F', b: 4 }, { c: 'C', b: 4 }, { c: 'F', b: 4 }, { c: 'G', b: 4 }
            ],

            // 基本 I-IV-V-I
            'basic_1451': [
                { c: 'C', b: 4 }, { c: 'F', b: 4 }, { c: 'G', b: 4 }, { c: 'C', b: 4 }
            ],

            // 藍調進行 (12-bar blues)
            'blues_12': [
                { c: 'C7', b: 4 }, { c: 'C7', b: 4 }, { c: 'C7', b: 4 }, { c: 'C7', b: 4 },
                { c: 'F7', b: 4 }, { c: 'F7', b: 4 }, { c: 'C7', b: 4 }, { c: 'C7', b: 4 },
                { c: 'G7', b: 4 }, { c: 'F7', b: 4 }, { c: 'C7', b: 4 }, { c: 'G7', b: 4 }
            ],

            // Jazz ii-V-I
            'jazz_251': [
                { c: 'Dm7', b: 4 }, { c: 'G7', b: 4 }, { c: 'Cmaj7', b: 8 }
            ]
        };
    }

    // ==================== 歌曲段落定義 ====================

    _initSongSections() {
        this.SONG_SECTIONS = {
            'amazing_grace': [
                { name: "全曲循環 (Full Song)", start: 0, end: 17 },
                { name: "引子 (Intro)", start: 0, end: 0 },
                { name: "第一句 (Phrase 1)", start: 1, end: 5 },
                { name: "第二句 (Phrase 2)", start: 6, end: 9 },
                { name: "第三句 (Phrase 3)", start: 10, end: 13 },
                { name: "第四句 (Phrase 4)", start: 14, end: 17 }
            ]
        };
    }

    // ==================== 公開 API ====================

    /**
     * 初始化音訊上下文
     */
    initAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    /**
     * 設定音訊上下文（從外部傳入）
     */
    setAudioContext(ctx) {
        this.audioCtx = ctx;
    }

    /**
     * 開始播放
     */
    start(progressionKey = null) {
        const key = progressionKey || this.currentProgressionKey;
        if (!key || key === 'none') {
            console.warn('AccompanimentSystem: No progression selected');
            return false;
        }

        this.initAudioContext();

        const prog = this.PROGRESSIONS[key];
        if (!prog) {
            console.error(`AccompanimentSystem: Progression "${key}" not found`);
            return false;
        }

        this.currentProgressionKey = key;

        // 決定循環範圍
        const sections = this.SONG_SECTIONS[key];
        if (sections && this.currentSectionIndex < sections.length) {
            const sec = sections[this.currentSectionIndex];
            this.loopStart = sec.start;
            this.loopEnd = sec.end;
        } else {
            this.loopStart = 0;
            this.loopEnd = prog.length - 1;
        }

        this.isPlaying = true;
        this.currentBarIndex = this.loopStart;

        this._notifyStateChange('playing');
        this._playNextBar(prog);

        return true;
    }

    /**
     * 停止播放
     */
    stop() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
        this._notifyStateChange('stopped');
    }

    /**
     * 切換播放/停止
     */
    toggle(progressionKey = null) {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start(progressionKey);
        }
        return this.isPlaying;
    }

    /**
     * 設定 BPM
     */
    setBpm(value) {
        this.bpm = Math.max(40, Math.min(180, value));
        if (this.isPlaying) {
            this.stop();
            this.start();
        }
    }

    /**
     * 設定音量
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }

    /**
     * 設定樂器
     */
    setInstrument(instrument) {
        this.instrument = instrument;
    }

    /**
     * 設定琶音模式
     */
    setArpeggio(enabled) {
        this.isArpeggio = enabled;
    }

    /**
     * 設定節拍器
     */
    setMetronome(enabled) {
        this.metronomeEnabled = enabled;
    }

    setVoice(enabled) {
        this.voiceEnabled = enabled;
        if (!enabled && this.synth) {
            this.synth.cancel(); // 停止所有語音
        }
    }

    setVoiceRate(rate) {
        this.voiceRate = parseFloat(rate);
    }

    /**
     * 選擇和弦進行
     */
    selectProgression(key) {
        this.currentProgressionKey = key;
        this.currentSectionIndex = 0;

        if (this.isPlaying) {
            this.stop();
            this.start();
        }

        return this.SONG_SECTIONS[key] || null;
    }

    /**
     * 選擇歌曲段落
     */
    selectSection(index) {
        this.currentSectionIndex = index;

        if (this.isPlaying) {
            this.stop();
            this.start();
        }
    }

    /**
     * 取得所有和弦進行
     */
    getProgressions() {
        return Object.keys(this.PROGRESSIONS);
    }

    /**
     * 取得指定進行的段落
     */
    getSections(progressionKey) {
        return this.SONG_SECTIONS[progressionKey] || null;
    }

    /**
     * 新增自訂和弦進行
     */
    addProgression(key, bars, sections = null) {
        this.PROGRESSIONS[key] = bars;
        if (sections) {
            this.SONG_SECTIONS[key] = sections;
        }
    }

    /**
     * 新增自訂和弦
     */
    addChord(name, midiNotes) {
        this.CHORDS[name] = midiNotes;
    }

    /**
     * 取得當前狀態
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            bpm: this.bpm,
            volume: this.volume,
            instrument: this.instrument,
            isArpeggio: this.isArpeggio,
            metronomeEnabled: this.metronomeEnabled,
            currentProgressionKey: this.currentProgressionKey,
            currentSectionIndex: this.currentSectionIndex,
            currentBarIndex: this.currentBarIndex
        };
    }

    // ==================== 私有方法 ====================

    _playNextBar(prog) {
        if (!this.isPlaying) return;

        const startTime = this.audioCtx.currentTime;
        const bar = prog[this.currentBarIndex];
        const notes = this.CHORDS[bar.c];
        const durationSec = (60 / this.bpm) * bar.b;

        // 通知小節變更
        if (this.onBarChange) {
            this.onBarChange({
                barIndex: this.currentBarIndex,
                chord: bar.c,
                beats: bar.b,
                hint: bar.h,
                measureNumber: bar.m,
                duration: durationSec
            });
        }

        // 語音報讀旋律提示（無障礙輔助）
        if (this.voiceEnabled && bar.h) {
            this._speakMelodyHint(bar.c, bar.h, bar.m);
        }

        // 播放和弦
        if (notes && notes.length > 0) {
            this._playChordNotes(notes, durationSec, startTime);
        }

        // 播放節拍器
        if (this.metronomeEnabled) {
            this._scheduleMetronome(bar.b, startTime);
        }

        // 排程下一小節
        this.intervalId = setTimeout(() => {
            let nextIndex = this.currentBarIndex + 1;
            if (nextIndex > this.loopEnd) {
                nextIndex = this.loopStart;
            }
            this.currentBarIndex = nextIndex;
            this._playNextBar(prog);
        }, durationSec * 1000);
    }

    _playChordNotes(midiNotes, duration, startTime) {
        midiNotes.forEach((midi, index) => {
            let noteStart = startTime;
            let noteDur = duration;

            // 琶音模式
            if (this.isArpeggio) {
                const step = duration / midiNotes.length;
                noteStart = startTime + (index * step);
                noteDur = step * 1.2;
            }

            // 改進的鋼琴音色（使用多振盪器）
            if (this.instrument === 'piano') {
                this._playPianoNote(midi, noteStart, noteDur);
            } else {
                this._playSimpleNote(midi, noteStart, noteDur);
            }
        });
    }

    // 改進的鋼琴音色（更接近真實鋼琴）
    _playPianoNote(midi, startTime, duration) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const masterGain = this.audioCtx.createGain();
        
        // 鋼琴特性：快速起音、指數衰減、長尾音
        const attackTime = 0.001;  // 極快起音（模擬敲擊）
        const peakTime = startTime + attackTime;
        const decayTime = 0.1;     // 初始衰減
        const sustainLevel = 0.3;  // 持續音量
        const releaseStart = startTime + duration - 0.2;
        
        // 音量包絡
        masterGain.gain.setValueAtTime(0, startTime);
        masterGain.gain.linearRampToValueAtTime(this.volume * 0.4, peakTime);
        masterGain.gain.exponentialRampToValueAtTime(this.volume * sustainLevel, peakTime + decayTime);
        masterGain.gain.setValueAtTime(this.volume * sustainLevel, releaseStart);
        masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        // 主振盪器（基音）
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);
        
        // 第二振盪器（豐富音色，稍微 detune）
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, startTime);
        osc2.detune.setValueAtTime(2, startTime); // 輕微失諧模擬琴弦共鳴
        
        // 第三振盪器（泛音，增加明亮度）
        const osc3 = this.audioCtx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 2, startTime); // 第一泛音
        
        // 三個振盪器的音量比例
        const gain1 = this.audioCtx.createGain();
        const gain2 = this.audioCtx.createGain();
        const gain3 = this.audioCtx.createGain();
        
        gain1.gain.setValueAtTime(0.5, startTime);  // 基音最響
        gain2.gain.setValueAtTime(0.3, startTime);  // 中頻
        gain3.gain.setValueAtTime(0.15, startTime); // 泛音（增加明亮度）
        
        // 低通濾波器（模擬音箱共鳴）
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(4000, startTime);
        filter.Q.setValueAtTime(1, startTime);
        
        // 連接音訊節點
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        
        filter.connect(masterGain);
        masterGain.connect(this.audioCtx.destination);
        
        // 啟動與停止
        osc1.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);
        
        osc1.stop(startTime + duration + 0.5);
        osc2.stop(startTime + duration + 0.5);
        osc3.stop(startTime + duration + 0.5);
    }

    // 簡單音色（其他樂器）
    _playSimpleNote(midi, startTime, duration) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        // 樂器參數
        const params = this._getInstrumentParams(duration);

        osc.type = params.type;
        osc.frequency.setValueAtTime(freq, startTime);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(params.filterFreq, startTime);

        // 音量包絡
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.25, startTime + params.attack);

        if (this.instrument === 'pluck') {
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        } else {
            gain.gain.setValueAtTime(this.volume * 0.25, startTime + duration - params.release);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
        }

        // 連接音訊節點
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.5);
    }

    _getInstrumentParams(noteDur) {
        const params = {
            type: 'triangle',
            attack: 0.05,
            release: 0.1,
            filterFreq: 2000
        };

        switch (this.instrument) {
            case 'piano':
                // Piano 使用獨立的 _playPianoNote 方法
                // 這裡的參數不會被使用，保留是為了向後兼容
                params.type = 'sine';
                params.attack = 0.001;
                params.release = 0.2;
                params.filterFreq = 4000;
                break;
            case 'strings':
                params.type = 'sawtooth';
                params.attack = 0.3;
                params.release = 0.3;
                params.filterFreq = 800;
                break;
            case 'pluck':
                params.type = 'square';
                params.attack = 0.01;
                params.release = 0.2;
                params.filterFreq = 2500;
                break;
            case 'soft_pad':
            default:
                params.type = 'triangle';
                params.attack = 0.5;
                params.release = 0.5;
                params.filterFreq = 1000;
                break;
        }

        return params;
    }

    _scheduleMetronome(beats, startTime) {
        const beatDuration = 60 / this.bpm;

        for (let i = 0; i < beats; i++) {
            const time = startTime + i * beatDuration;

            // 節拍器聲音
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.frequency.value = (i === 0) ? 1000 : 800;
            osc.type = 'square';

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(time);
            osc.stop(time + 0.05);

            // 通知節拍
            if (this.onMetronomeBeat) {
                const delayMs = (time - this.audioCtx.currentTime) * 1000;
                if (delayMs >= 0) {
                    setTimeout(() => {
                        this.onMetronomeBeat({
                            beatIndex: i,
                            isAccent: i === 0,
                            totalBeats: beats
                        });
                    }, delayMs);
                }
            }
        }
    }

    _notifyStateChange(state) {
        if (this.onStateChange) {
            this.onStateChange({
                state: state,
                isPlaying: this.isPlaying,
                progressionKey: this.currentProgressionKey
            });
        }
    }

    /**
     * 語音報讀旋律提示（無障礙輔助）
     * @param {string} chord - 和弦名稱（例如 "F", "C", "Bb"）
     * @param {string} hint - 旋律提示（例如 "[4] ... [6][4]"）
     * @param {number} measureNumber - 小節數（可選）
     */
    _speakMelodyHint(chord, hint, measureNumber) {
        if (!this.synth || !hint) return;

        // 取消之前的語音（避免重疊）
        this.synth.cancel();

        // 解析旋律提示，轉換為中文語音
        let voiceText = '';

        // 報讀小節數（如果有）
        if (measureNumber !== undefined && measureNumber !== null) {
            voiceText += `第 ${measureNumber} 小節，`;
        }

        // 報讀和弦名稱（簡化：只在非節拍器時報讀）
        if (chord && chord !== 'NC') {
            // 將和弦名稱轉為中文發音輔助
            const chordChinese = this._chordToChinese(chord);
            voiceText += `${chordChinese} 和弦，`;
        }

        // 解析旋律提示：[4] ... [6][4] → "彈位置 4，再彈位置 6 和 4"
        const positions = hint.match(/\[(\d+)\]/g);
        if (positions && positions.length > 0) {
            const numbers = positions.map(p => p.match(/\d+/)[0]);
            
            if (numbers.length === 1) {
                voiceText += `彈位置 ${numbers[0]}`;
            } else {
                voiceText += `彈位置 ${numbers[0]}`;
                for (let i = 1; i < numbers.length; i++) {
                    if (i === numbers.length - 1) {
                        voiceText += `，再彈位置 ${numbers[i]}`;
                    } else {
                        voiceText += `，再 ${numbers[i]}`;
                    }
                }
            }
        } else if (hint.includes('Intro')) {
            voiceText += '引子';
        } else if (hint.includes('End')) {
            voiceText += '結束';
        } else if (hint.includes('Metronome')) {
            voiceText = '節拍器'; // 節拍器模式只報讀這個
        }

        // 使用 Web Speech API 朗讀
        const utterance = new SpeechSynthesisUtterance(voiceText);
        utterance.lang = 'zh-TW';  // 繁體中文
        utterance.rate = this.voiceRate;  // 語速
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        this.synth.speak(utterance);
    }

    /**
     * 將和弦名稱轉為中文發音輔助
     */
    _chordToChinese(chord) {
        // 保持英文字母，但加上發音輔助
        const chordMap = {
            'C': 'C',
            'D': 'D',
            'E': 'E',
            'F': 'F',
            'G': 'G',
            'A': 'A',
            'B': 'B',
            'Bb': 'B 降',
            'Eb': 'E 降',
            'Cm': 'C 小',
            'Dm': 'D 小',
            'Em': 'E 小',
            'Fm': 'F 小',
            'Gm': 'G 小',
            'Am': 'A 小',
            'Bm': 'B 小',
            'C7': 'C 七',
            'D7': 'D 七',
            'E7': 'E 七',
            'F7': 'F 七',
            'G7': 'G 七',
            'A7': 'A 七',
            'Cm7': 'C 小七',
            'Dm7': 'D 小七',
            'Em7': 'E 小七',
            'Am7': 'A 小七',
            'Cmaj7': 'C 大七',
            'Fmaj7': 'F 大七',
            'Gmaj7': 'G 大七'
        };
        
        return chordMap[chord] || chord;
    }
}

// 支援 ES6 模組與傳統 script 標籤
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccompanimentSystem;
}
