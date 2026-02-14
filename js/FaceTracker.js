/**
 * FaceTracker.js
 * 臉部追蹤系統 - MediaPipe Face Mesh 封裝
 * 
 * 功能：
 * - 初始化 MediaPipe Face Mesh
 * - 攝影機管理
 * - 頭部姿態計算（Yaw/Pitch）
 * - 平滑處理
 */

class FaceTracker {
    constructor(options = {}) {
        // DOM 元素
        this.videoElement = options.videoElement;
        this.canvasElement = options.canvasElement;
        this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        
        // MediaPipe
        this.faceMesh = null;
        this.camera = null;
        
        // 追蹤狀態
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // 頭部姿態
        this.rawYaw = 0;
        this.rawPitch = 0;
        this.smoothYaw = 0;
        this.smoothPitch = 0;
        
        // 設定
        this.smoothingFactor = options.smoothingFactor || CONFIG.tracking.smoothingFactor;
        this.centerOffset = options.centerOffset || CONFIG.tracking.centerOffset;
        
        // 回調函數
        this.onResults = options.onResults || null;
        this.onFpsUpdate = options.onFpsUpdate || null;
        this.onError = options.onError || null;
    }

    /**
     * 初始化 Face Mesh
     */
    async init() {
        if (!window.FaceMesh) {
            const error = 'MediaPipe Face Mesh library not loaded';
            if (this.onError) this.onError(error);
            throw new Error(error);
        }

        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this._handleResults(results));
        
        return this;
    }

    /**
     * 啟動攝影機
     */
    async start() {
        if (!this.faceMesh) {
            await this.init();
        }

        if (!window.Camera) {
            const error = 'MediaPipe Camera utility not loaded';
            if (this.onError) this.onError(error);
            throw new Error(error);
        }

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.videoElement });
            },
            width: 1280,
            height: 720
        });

        await this.camera.start();
        this.isRunning = true;
        
        return this;
    }

    /**
     * 停止追蹤
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        
        this.isRunning = false;
    }

    /**
     * 處理 Face Mesh 結果
     */
    _handleResults(results) {
        if (!this.canvasCtx || !this.canvasElement) return;

        // 計算 FPS
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount / elapsed) * 1000);
            this.frameCount = 0;
            this.lastFrameTime = now;
            
            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.fps);
            }
        }
        
        this.frameCount++;

        // 清除畫布
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // 繪製影像
        this.canvasCtx.drawImage(
            results.image, 
            0, 0, 
            this.canvasElement.width, 
            this.canvasElement.height
        );

        // 如果有偵測到臉部
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // 計算頭部姿態
            this._calculateHeadPose(landmarks);
            
            // 通知外部
            if (this.onResults) {
                this.onResults({
                    landmarks: landmarks,
                    yaw: this.smoothYaw,
                    pitch: this.smoothPitch,
                    rawYaw: this.rawYaw,
                    rawPitch: this.rawPitch,
                    fps: this.fps
                });
            }
        }

        this.canvasCtx.restore();
    }

    /**
     * 計算頭部姿態（Yaw/Pitch）
     */
    _calculateHeadPose(landmarks) {
        // 使用關鍵點估算頭部轉動
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const chin = landmarks[152];

        // Yaw (左右轉動)
        const eyeCenter = (leftEye.x + rightEye.x) / 2;
        this.rawYaw = (nose.x - eyeCenter) * 200;

        // Pitch (上下點頭)
        this.rawPitch = (chin.y - nose.y) * 200;

        // 平滑處理
        this.smoothYaw = this.smoothYaw * (1 - this.smoothingFactor) + 
                         (this.rawYaw - this.centerOffset.yaw) * this.smoothingFactor;
        
        this.smoothPitch = this.smoothPitch * (1 - this.smoothingFactor) + 
                           (this.rawPitch - this.centerOffset.pitch) * this.smoothingFactor;
    }

    /**
     * 設定中心偏移
     */
    setCenterOffset(yaw, pitch) {
        this.centerOffset = { yaw, pitch };
    }

    /**
     * 設定當前位置為中心
     */
    setCurrentAsCenter() {
        this.centerOffset = {
            yaw: this.rawYaw,
            pitch: this.rawPitch
        };
        
        this.smoothYaw = 0;
        this.smoothPitch = 0;
    }

    /**
     * 設定平滑係數
     */
    setSmoothingFactor(factor) {
        this.smoothingFactor = UTILS.clamp(factor, 0, 1);
    }

    /**
     * 取得當前頭部姿態
     */
    getPose() {
        return {
            yaw: this.smoothYaw,
            pitch: this.smoothPitch,
            rawYaw: this.rawYaw,
            rawPitch: this.rawPitch
        };
    }

    /**
     * 取得追蹤狀態
     */
    getState() {
        return {
            isRunning: this.isRunning,
            fps: this.fps,
            yaw: this.smoothYaw,
            pitch: this.smoothPitch,
            smoothingFactor: this.smoothingFactor,
            centerOffset: this.centerOffset
        };
    }

    /**
     * 銷毀
     */
    destroy() {
        this.stop();
        
        if (this.faceMesh) {
            this.faceMesh.close();
            this.faceMesh = null;
        }
        
        this.camera = null;
    }
}

// 匯出（支援 ES6 模組與傳統 script 標籤）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceTracker;
}
