export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        return {
            granted: false,
            message: "このブラウザは通知に対応していません。",
        };
    }

    if (Notification.permission === "granted") {
        return {
            granted: true,
            message: "通知はすでに許可されています。",
        };
    }

    if (Notification.permission === "denied") {
        return {
            granted: false,
            message: "ブラウザの設定で通知が拒否されています。",
        };
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        return {
            granted: true,
            message: "通知を許可しました。",
        };
    }

    return {
        granted: false,
        message: "通知が許可されませんでした。",
    };
}

export function scheduleNotification({ title, body, notificationTime }) {
    const delay = new Date(notificationTime).getTime() - Date.now();

    if (delay <= 0) {
        return null;
    }

    return window.setTimeout(() => {
        new Notification(title, { body });
    }, delay);
}

export function clearScheduledNotifications(timerIds) {
    timerIds.forEach((timerId) => {
        window.clearTimeout(timerId);
    });
}