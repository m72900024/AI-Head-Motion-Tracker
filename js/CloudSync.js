// CloudSync — 把 calibration profile 同步到 Firestore
// 設計：localStorage 為主路徑，cloud 是「鏡像+遠端編輯入口」
// - upload(): 任何 save 後 fire-and-forget 寫 cloud（不擋 UI）
// - download(): 啟動時拉一次最新版，比 localStorage 新就套用
// - subscribe(): listener 監聽遠端變更，跳通知燈號

class CloudSync {
    constructor(config) {
        this.config = config; // 共用 config (showFeedback 等)
        this.collection = 'head_tracker_profiles';
        this.db = null;
        this.unsubscribe = null;
        this.status = 'init'; // init / syncing / synced / error / offline
        this.statusEl = null;
        this.lastUploadAt = 0;
        this.uploadDebounceTimer = null;
        this.onRemoteUpdate = null; // 外部設定的「遠端有新版」callback
        this.suppressNextSnapshot = false; // 自己 write 完後第一個 snapshot 不算「遠端改」
        this.HISTORY_CAP = 50;
        this.HISTORY_TRIM_EVERY = 10; // 每 10 次 history 寫入才 trim 一次
        this.historyWriteCounter = 0;
    }

    init() {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                this._setStatus('offline', 'Firebase SDK 未載入');
                return false;
            }
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            try {
                this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            } catch (e) {}
            this.statusEl = document.getElementById('cloud-sync-status');
            this._setStatus('synced', '已連線');
            return true;
        } catch (e) {
            console.error('[CloudSync] init failed', e);
            this._setStatus('error', e.message);
            return false;
        }
    }

    // 抓 cloud 一次
    async download(profileIndex) {
        if (!this.db) return null;
        this._setStatus('syncing', '拉取雲端設定...');
        try {
            const doc = await this.db.collection(this.collection).doc(String(profileIndex)).get();
            if (!doc.exists) {
                this._setStatus('synced', '雲端無此設定檔');
                return null;
            }
            this._setStatus('synced', '雲端已載入');
            return doc.data();
        } catch (e) {
            console.warn('[CloudSync] download failed', e);
            this._setStatus('error', '雲端讀取失敗，用本地');
            return null;
        }
    }

    // 寫回 cloud（debounced，避免 slider 拖拉每幀寫）
    upload(profileIndex, config) {
        if (!this.db) return;
        clearTimeout(this.uploadDebounceTimer);
        this.uploadDebounceTimer = setTimeout(() => {
            this._setStatus('syncing', '同步中...');
            this.suppressNextSnapshot = true;
            const payload = Object.assign({}, config, {
                updatedAt: new Date().toISOString(),
                updatedBy: this._whoami(),
            });
            this.db.collection(this.collection).doc(String(profileIndex)).set(payload)
                .then(() => {
                    this.lastUploadAt = Date.now();
                    this._setStatus('synced', '已同步雲端');
                    // 並行寫一筆 history（fire-and-forget）
                    this.uploadHistory(profileIndex, config, 'auto-save').catch(() => {});
                })
                .catch(e => {
                    console.warn('[CloudSync] upload failed', e);
                    this._setStatus('error', '雲端寫入失敗（本地已存）');
                });
        }, 800);
    }

    // 寫一筆 history 紀錄（snapshot + timestamp + by + reason）
    // 預設 fire-and-forget；可 await
    async uploadHistory(profileIndex, config, reason) {
        if (!this.db) return;
        try {
            const ref = this.db.collection(this.collection).doc(String(profileIndex)).collection('history');
            await ref.add({
                snapshot: config,
                takenAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: this._whoami(),
                reason: reason || 'auto-save'
            });
            this.historyWriteCounter++;
            // 每 HISTORY_TRIM_EVERY 次或手動 snapshot 就 trim
            if (this.historyWriteCounter >= this.HISTORY_TRIM_EVERY || reason === 'manual') {
                this.historyWriteCounter = 0;
                this._trimHistory(profileIndex).catch(() => {});
            }
        } catch (e) {
            console.warn('[CloudSync] uploadHistory failed', e);
            throw e;
        }
    }

    // 把 history 超過 HISTORY_CAP 的最舊筆數刪掉
    async _trimHistory(profileIndex) {
        if (!this.db) return;
        try {
            const ref = this.db.collection(this.collection).doc(String(profileIndex)).collection('history');
            // 拉最新 HISTORY_CAP + 10 筆，判斷有沒有超過上限
            const snap = await ref.orderBy('takenAt', 'desc').limit(this.HISTORY_CAP + 10).get();
            if (snap.size > this.HISTORY_CAP) {
                const docsToDelete = snap.docs.slice(this.HISTORY_CAP);
                const batch = this.db.batch();
                docsToDelete.forEach(d => batch.delete(d.ref));
                await batch.commit();
                console.log(`[CloudSync] trimmed ${docsToDelete.length} old history entries from profile ${profileIndex}`);
            }
        } catch (e) {
            console.warn('[CloudSync] trim failed', e);
        }
    }

    // 訂閱遠端變更
    subscribe(profileIndex, callback) {
        if (!this.db) return;
        if (this.unsubscribe) this.unsubscribe();
        this.onRemoteUpdate = callback;
        this.unsubscribe = this.db.collection(this.collection).doc(String(profileIndex))
            .onSnapshot(doc => {
                if (this.suppressNextSnapshot) {
                    this.suppressNextSnapshot = false;
                    return;
                }
                if (!doc.exists) return;
                // 跳過自己剛寫的（updateTime 在 lastUploadAt 之內 1.5 秒）
                const fresh = Date.now() - this.lastUploadAt > 1500;
                if (fresh && this.onRemoteUpdate) {
                    this.onRemoteUpdate(doc.data());
                }
            }, err => {
                console.warn('[CloudSync] snapshot error', err);
                this._setStatus('error', '訂閱中斷');
            });
    }

    _whoami() {
        try {
            const k = 'head-tracker-editor-name';
            let n = localStorage.getItem(k);
            if (!n) {
                n = 'device-' + Math.random().toString(36).slice(2, 8);
                localStorage.setItem(k, n);
            }
            return n;
        } catch (e) { return 'unknown'; }
    }

    _setStatus(status, msg) {
        this.status = status;
        if (!this.statusEl) this.statusEl = document.getElementById('cloud-sync-status');
        if (!this.statusEl) return;
        const dot = { init: '⚪', syncing: '🟡', synced: '🟢', error: '🔴', offline: '⚫' }[status] || '⚪';
        this.statusEl.textContent = `${dot} ${msg || status}`;
        this.statusEl.dataset.status = status;
    }
}
