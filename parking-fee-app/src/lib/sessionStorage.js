const SESSION_KEY = "parking-fee-app-active-session";
const SETTINGS_KEY = "parking-fee-app-notification-settings";

export const DEFAULT_NOTIFICATION_SETTINGS = {
    rateChangeAlert: true,
    rateChangeAlertMinutes: 15,
    maxRateAlert: true,
    budgetAlert: true,
    browserNotification: false,
    soundEnabled: true,
};

// 駐車セッションの取得
export function getActiveSession() {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// 駐車セッションの保存
export function saveActiveSession(session) {
    if (!session) {
        localStorage.removeItem(SESSION_KEY);
    } else {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

// 通知設定の取得
export function getNotificationSettings() {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_NOTIFICATION_SETTINGS;
    try {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(data) };
    } catch {
        return DEFAULT_NOTIFICATION_SETTINGS;
    }
}

// 通知設定の保存
export function saveNotificationSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
