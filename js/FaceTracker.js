/**
 * Face Tracker
 * 負責臉部追蹤與 MediaPipe 邏輯、FPS 更新、座標轉換
 */

class FaceTracker {
    constructor(config = {}) {
        this.config = config;
        
        // Tracking State
        this.rawYaw = 0;
        this.rawPitch = 0;
        this.smoothYaw = 0;
        this.smoothPitch = 0;
        this.wasMouthOpen = false;
        this.lastDetectedId = null;
        this.isArmed = true;
        
        // FPS Tracking
        this.lastTime = 0;
        this.frameCount = 0;
        
        // Constants
        this.MOUTH_OPEN_THRESHOLD = 0.08;
        this.NOTE_FREQS = {
            1: 261.63, 2: 293.66, 3: 329.63, 4: 349.23, 5: 0,
            6: 392.00, 7: 440.00, 8: 493.88, 9: 523.25
        };
        
        // DOM Elements
        this.videoElement = document.getElementById('input_video');
        this.canvasElement = document.getElementById('output_canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');
        this.loader = document.getElementById('loader');
        this.statusText = document.getElementById('status-text');
        this.triggerStateText = document.getElementById('trigger-state');
        this.valYaw = document.getElementById('val-yaw');
        this.valPitch = document.getElementById('val-pitch');
        this.valFps = document.getElementById('val-fps');
    }

    init() {
        this.startFPSMonitoring();
        this.initMediaPipe();
    }

    // Start FPS Monitoring
    startFPSMonitoring() {
        const updateFPS = () => {
            const now = performance.now();
            this.frameCount++;
            if (now - this.lastTime >= 1000) {
                this.valFps.innerText = this.frameCount;
                this.frameCount = 0;
                this.lastTime = now;
            }
            requestAnimationFrame(updateFPS);
        };
        updateFPS();
    }

    // Initialize MediaPipe
    initMediaPipe() {
        const faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(this.onResults.bind(this));
        
        const camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await faceMesh.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
        
        camera.start().catch(err => {
            console.error(err);
            this.loader.innerHTML = `<div style="color:red">Error: ${err.message}</div>`;
        });
    }

    // Main MediaPipe Results Handler
    onResults(results) {
        this.loader.classList.add('hidden');
        
        const width = this.videoElement.videoWidth;
        const height = this.videoElement.videoHeight;
        this.canvasElement.width = width;
        this.canvasElement.height = height;
        
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, width, height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Draw face mesh
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION, {
                color: '#C0C0C020',
                lineWidth: 1
            });
            
            // Key landmarks
            const nose = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const chin = landmarks[152];
            const topHead = landmarks[10];
            const upperLip = landmarks[13];
            const lowerLip = landmarks[14];
            
            // Calculate Yaw (left-right)
            const midEyesX = (leftEye.x + rightEye.x) / 2;
            const faceWidth = Math.abs(rightEye.x - leftEye.x);
            this.rawYaw = (nose.x - midEyesX) / faceWidth;
            
            // Calculate Pitch (up-down)
            const midEyesY = (leftEye.y + rightEye.y) / 2;
            const faceHeight = Math.abs(chin.y - topHead.y);
            this.rawPitch = (nose.y - midEyesY) / faceHeight;
            
            // Smooth the values
            const smoothingFactor = this.config.getSmoothingFactor ? this.config.getSmoothingFactor() : 0.15;
            this.smoothYaw = this.smoothYaw * (1 - smoothingFactor) + this.rawYaw * smoothingFactor;
            this.smoothPitch = this.smoothPitch * (1 - smoothingFactor) + this.rawPitch * smoothingFactor;
            
            // Normalize with center offset
            let dispYaw = this.normalizeYaw(this.smoothYaw);
            let dispPitch = this.normalizePitch(this.smoothPitch);
            
            // Apply scaling factors (靈敏度縮放)
            if (this.config.getScalingFactors) {
                const factors = this.config.getScalingFactors();
                dispYaw *= factors.yaw;
                dispPitch *= factors.pitch;
            }
            
            this.valYaw.innerText = dispYaw.toFixed(2);
            this.valPitch.innerText = dispPitch.toFixed(2);
            
            // Mouth Detection
            const mouthOpenDist = Math.abs(lowerLip.y - upperLip.y);
            const mouthRatio = mouthOpenDist / faceHeight;
            const isCurrentlyOpen = mouthRatio > this.MOUTH_OPEN_THRESHOLD;
            
            // Mouth Control Logic
            const mouthControlEnabled = this.config.getMouthControlEnabled ? this.config.getMouthControlEnabled() : false;
            const mouthTriggerMode = this.config.getMouthTriggerMode ? this.config.getMouthTriggerMode() : 'close';
            
            if (mouthControlEnabled) {
                if (mouthTriggerMode === 'open') {
                    if (isCurrentlyOpen && !this.wasMouthOpen) {
                        if (this.config.onToggleOctave) {
                            this.config.onToggleOctave();
                        }
                    }
                } else if (mouthTriggerMode === 'close') {
                    if (!isCurrentlyOpen && this.wasMouthOpen) {
                        if (this.config.onToggleOctave) {
                            this.config.onToggleOctave();
                        }
                    }
                }
            }
            this.wasMouthOpen = isCurrentlyOpen;
            
            // Draw mouth debug line
            const isDebugVisible = this.config.getIsDebugVisible ? this.config.getIsDebugVisible() : false;
            if (isDebugVisible) {
                const ulX = upperLip.x * width;
                const ulY = upperLip.y * height;
                const llX = lowerLip.x * width;
                const llY = lowerLip.y * height;
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(ulX, ulY);
                this.canvasCtx.lineTo(llX, llY);
                this.canvasCtx.lineWidth = 3;
                this.canvasCtx.strokeStyle = isCurrentlyOpen ? "#00ffcc" : "#ff0055";
                this.canvasCtx.stroke();
            }
            
            // Range Detection
            const isRangeDetecting = this.config.getIsRangeDetecting ? this.config.getIsRangeDetecting() : false;
            if (isRangeDetecting) {
                if (this.config.onRangeUpdate) {
                    this.config.onRangeUpdate(dispYaw, dispPitch);
                }
                
                // Draw range trace
                const rangeTrace = this.config.getRangeTrace ? this.config.getRangeTrace() : [];
                this.canvasCtx.fillStyle = "#00ff00";
                for (let pt of rangeTrace) {
                    const tx = this.mapToCanvas(pt.x, true, width, height);
                    const ty = this.mapToCanvas(pt.y, false, width, height);
                    this.canvasCtx.fillRect(tx, ty, 2, 2);
                }
                
                // Draw bounding box
                const rangeBounds = this.config.getRangeBounds ? this.config.getRangeBounds() : {};
                const x1 = this.mapToCanvas(rangeBounds.minYaw, true, width, height);
                const x2 = this.mapToCanvas(rangeBounds.maxYaw, true, width, height);
                const y1 = this.mapToCanvas(rangeBounds.minPitch, false, width, height);
                const y2 = this.mapToCanvas(rangeBounds.maxPitch, false, width, height);
                const bx = Math.min(x1, x2);
                const by = Math.min(y1, y2);
                const bw = Math.abs(x1 - x2);
                const bh = Math.abs(y1 - y2);
                this.canvasCtx.strokeStyle = "#00ff00";
                this.canvasCtx.lineWidth = 2;
                this.canvasCtx.strokeRect(bx, by, bw, bh);
            }
            
            // Point Detection
            let detectedId = null;
            let detectedName = "";
            const curX = this.mapToCanvas(dispYaw, true, width, height);
            const curY = this.mapToCanvas(dispPitch, false, width, height);
            
            let minDistance = Infinity;
            const calibrationData = this.config.getCalibrationData ? this.config.getCalibrationData() : {};
            
            if (Object.keys(calibrationData).length > 0) {
                for (const [id, data] of Object.entries(calibrationData)) {
                    const targetX = this.mapToCanvas(data.yaw, true, width, height);
                    const targetY = this.mapToCanvas(data.pitch, false, width, height);
                    const dist = Math.sqrt(Math.pow(curX - targetX, 2) + Math.pow(curY - targetY, 2));
                    const r = data.radius || 40;
                    if (dist < r) {
                        if (dist < minDistance) {
                            minDistance = dist;
                            detectedId = parseInt(id);
                            detectedName = data.name;
                        }
                    }
                }
            }
            
            // Draw Zones
            const isZonesVisible = this.config.getIsZonesVisible ? this.config.getIsZonesVisible() : false;
            const selectedPointId = this.config.getSelectedPointId ? this.config.getSelectedPointId() : null;
            const isEditMode = this.config.getIsEditMode ? this.config.getIsEditMode() : false;
            
            if (isZonesVisible && !isRangeDetecting && Object.keys(calibrationData).length > 0) {
                for (const [id, data] of Object.entries(calibrationData)) {
                    const cx = this.mapToCanvas(data.yaw, true, width, height);
                    const cy = this.mapToCanvas(data.pitch, false, width, height);
                    const pid = parseInt(id);
                    const isActive = (pid === detectedId);
                    const r = data.radius || 40;
                    const shift = data.semitoneShift || 0;
                    
                    this.canvasCtx.beginPath();
                    this.canvasCtx.arc(cx, cy, r, 0, 2 * Math.PI);
                    
                    if (pid === 5) {
                        this.canvasCtx.fillStyle = isActive ? "rgba(0, 255, 204, 0.4)" : "rgba(0, 255, 204, 0.15)";
                        this.canvasCtx.strokeStyle = "#00ffcc";
                    } else {
                        if (shift === 1) this.canvasCtx.strokeStyle = "#fbbf24";
                        else if (shift === -1) this.canvasCtx.strokeStyle = "#3b82f6";
                        else this.canvasCtx.strokeStyle = "#d946ef";
                        
                        this.canvasCtx.fillStyle = isActive ? "rgba(217, 70, 239, 0.4)" : "rgba(217, 70, 239, 0.1)";
                    }
                    
                    this.canvasCtx.fill();
                    this.canvasCtx.lineWidth = (id == selectedPointId && isEditMode) ? 4 : 2;
                    this.canvasCtx.stroke();
                    
                    // Draw label
                    this.canvasCtx.fillStyle = "#fff";
                    this.canvasCtx.font = "bold 12px Arial";
                    this.canvasCtx.textAlign = "center";
                    this.canvasCtx.textBaseline = "middle";
                    
                    let label = pid.toString();
                    if (shift > 0) label += "♯";
                    if (shift < 0) label += "♭";
                    
                    this.canvasCtx.save();
                    this.canvasCtx.translate(cx, cy);
                    this.canvasCtx.scale(-1, 1);
                    this.canvasCtx.fillText(label, 0, 0);
                    this.canvasCtx.restore();
                }
            }
            
            // Draw current position
            if (isDebugVisible) {
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(curX, curY, 8, 0, 2 * Math.PI);
                this.canvasCtx.fillStyle = "#ff0055";
                this.canvasCtx.fill();
            }
            
            // Trigger Logic
            if (detectedId !== null) {
                if (detectedId === 5) {
                    this.isArmed = true;
                    this.triggerStateText.innerText = "就緒 (已回中)";
                    this.triggerStateText.style.color = "#00ffcc";
                    this.lastDetectedId = 5;
                } else if (detectedId !== this.lastDetectedId) {
                    const soundSettings = this.config.getSoundSettings ? this.config.getSoundSettings() : {};
                    
                    if (this.isArmed || !soundSettings.returnToCenter) {
                        if (this.config.onPlayNote) {
                            this.config.onPlayNote(this.NOTE_FREQS[detectedId], detectedId);
                        }
                        
                        if (soundSettings.returnToCenter) {
                            this.isArmed = false;
                            this.triggerStateText.innerText = "已觸發 (請回中間)";
                            this.triggerStateText.style.color = "#fbbf24";
                        }
                    }
                    this.lastDetectedId = detectedId;
                }
            }
            
            // Update Status Text
            this.statusText.innerText = detectedId ? `${detectedId}. ${detectedName}` : "移動中...";
            if (detectedId === 5) this.statusText.style.color = "#00ffcc";
            else if (detectedId) this.statusText.style.color = "#d946ef";
            else this.statusText.style.color = "#888";
            
        } else {
            this.statusText.innerText = "未偵測到臉部";
            this.statusText.style.color = "#888";
        }
        
        this.canvasCtx.restore();
    }

    // Coordinate Mapping
    mapToCanvas(val, isYaw, width, height) {
        const scale = 1.0;
        return isYaw ? (val * scale + 0.5) * width : (val * scale + 0.5) * height;
    }

    // Normalize Yaw/Pitch
    normalizeYaw(raw) {
        const centerOffset = this.config.getCenterOffset ? this.config.getCenterOffset() : { yaw: 0, pitch: 0.45 };
        return raw - centerOffset.yaw;
    }

    normalizePitch(raw) {
        const centerOffset = this.config.getCenterOffset ? this.config.getCenterOffset() : { yaw: 0, pitch: 0.45 };
        return raw - centerOffset.pitch;
    }

    // Getters
    getSmoothYaw() {
        return this.smoothYaw;
    }

    getSmoothPitch() {
        return this.smoothPitch;
    }

    getRawYaw() {
        return this.rawYaw;
    }

    getRawPitch() {
        return this.rawPitch;
    }
}
