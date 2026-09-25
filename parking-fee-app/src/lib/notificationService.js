// Web Notification API と Web Audio API（効果音チャイム）の通知サービス

class NotificationService {
    constructor() {
        this.audioCtx = null;
        this.listeners = [];
    }

    // ブラウザ通知の権限リクエスト
    async requestPermission() {
        if (!("Notification" in window)) {
            return false;
        }
        if (Notification.permission === "granted") {
            return true;
        }
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    getPermissionState() {
        if (!("Notification" in window)) {
            return "unsupported";
        }
        return Notification.permission;
    }

    // Web Audio API でチャイム音を再生 (Mi -> Sol)
    playChime() {
        try {
            const AudioCtxClass =
                window.AudioContext || window.webkitAudioContext;
            if (!AudioCtxClass) return;

            if (!this.audioCtx) {
                this.audioCtx = new AudioCtxClass();
            }

            if (this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(659.25, now); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.15); // G5

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }

    // 通知を送信
    notify({ title, body, type = "general" }, options = {}) {
        const { playSound = true, useBrowser = false } = options;

        if (playSound) {
            this.playChime();
        }

        if (
            useBrowser &&
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            try {
                new Notification(title, { body });
            } catch (e) {
                console.warn("Browser notification failed", e);
            }
        }

        const notificationData = {
            id: `notif-${Date.now()}`,
            title,
            body,
            type,
            time: new Date(),
        };

        this.listeners.forEach((listener) => listener(notificationData));
        return notificationData;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
}

export const notificationService = new NotificationService();
