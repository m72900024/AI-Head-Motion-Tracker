// HeadTrackerRecorder — 錄製 Tone.Destination 的混音輸出（主旋律 + 伴奏）
// 點按鈕開始 → 計時 → 再點停止 → 自動下載 .webm
class HeadTrackerRecorder {
    constructor(config) {
        this.config = config; // { getProfileIndex, showFeedback }
        this.recorder = null;
        this.recording = false;
        this.startTime = 0;
        this.timerInterval = null;
        this.button = null;
    }

    init() {
        this.button = document.getElementById('record-btn');
        return !!this.button;
    }

    async toggle() {
        if (this.recording) await this.stop();
        else await this.start();
    }

    async start() {
        try {
            if (typeof Tone === 'undefined' || !Tone.Recorder) {
                this._feedback('❌ Tone.js Recorder 不可用');
                return;
            }
            // Lazy init — 第一次按才建（避免影響啟動）
            if (!this.recorder) {
                this.recorder = new Tone.Recorder();
                Tone.getDestination().connect(this.recorder);
            }
            await this.recorder.start();
            this.recording = true;
            this.startTime = Date.now();
            this._updateUI();
            this.timerInterval = setInterval(() => this._updateUI(), 500);
            this._feedback('🔴 開始錄音 — 再按一次停止並下載');
        } catch (e) {
            console.error('[Recorder] start failed', e);
            this._feedback('❌ 錄音啟動失敗：' + e.message);
        }
    }

    async stop() {
        if (!this.recording || !this.recorder) return;
        try {
            const blob = await this.recorder.stop();
            this.recording = false;
            clearInterval(this.timerInterval);
            this._updateUI();

            const profile = (this.config.getProfileIndex && this.config.getProfileIndex()) || '?';
            const now = new Date();
            const date = now.toISOString().slice(0, 10);
            const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
            const filename = `head_tracker_profile_${profile}_${date}_${time}.webm`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            const duration = Math.round((Date.now() - this.startTime) / 1000);
            const sizeKB = Math.round(blob.size / 1024);
            this._feedback(`✅ 錄音 ${duration} 秒 (${sizeKB}KB) 已下載：${filename}`);
        } catch (e) {
            console.error('[Recorder] stop failed', e);
            this._feedback('❌ 錄音儲存失敗：' + e.message);
        }
    }

    _updateUI() {
        if (!this.button) return;
        if (this.recording) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const m = Math.floor(elapsed / 60);
            const s = elapsed % 60;
            this.button.innerHTML = `🔴 錄音中 ${m}:${s.toString().padStart(2, '0')}`;
            this.button.classList.add('recording');
        } else {
            this.button.innerHTML = '🎙️ 錄音';
            this.button.classList.remove('recording');
        }
    }

    _feedback(msg) {
        if (this.config.showFeedback) this.config.showFeedback(msg);
    }
}
