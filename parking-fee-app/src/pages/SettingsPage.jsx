import { useState } from "react";
import {
    getNotificationSettings,
    saveNotificationSettings,
} from "../lib/sessionStorage";
import { notificationService } from "../lib/notificationService";

export function SettingsPage() {
    const [settings, setSettings] = useState(getNotificationSettings());
    const [permission, setPermission] = useState(
        notificationService.getPermissionState()
    );

    const handleRequestPermission = async () => {
        const granted = await notificationService.requestPermission();
        setPermission(notificationService.getPermissionState());
        if (granted) {
            const updated = { ...settings, browserNotification: true };
            setSettings(updated);
            saveNotificationSettings(updated);
            alert("ブラウザ通知を許可しました！");
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        saveNotificationSettings(settings);
        alert("設定を保存しました。");
    };

    const handleTestNotification = () => {
        notificationService.notify(
            {
                title: "🔔 テスト通知",
                body: "通知システムは正常に動作しています！料金変動や予算超過をお知らせします。",
                type: "general",
            },
            {
                playSound: settings.soundEnabled,
                useBrowser: settings.browserNotification,
            }
        );
    };

    return (
        <section>
            <h2>⚙️ 通知・アプリ設定</h2>
            <p>料金の切り替えや予算超過のアラートを設定します。</p>

            <form onSubmit={handleSave} style={{ maxWidth: "480px" }}>
                {/* ブラウザ通知許可カード */}
                <div className="rule-card">
                    <h3>Webブラウザ通知</h3>
                    <p style={{ margin: "4px 0 12px", fontSize: "13px" }}>
                        別タブを開いていても通知を受け取ることができます。
                    </p>
                    <div>
                        {permission === "granted" ? (
                            <span className="notice-message">
                                ✓ ブラウザ通知は許可されています
                            </span>
                        ) : permission === "denied" ? (
                            <span className="error-message">
                                ✕ ブラウザ通知がブロックされています
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleRequestPermission}
                            >
                                ブラウザ通知を許可する
                            </button>
                        )}
                    </div>
                </div>

                {/* 料金切り替え通知 */}
                <div>
                    <label htmlFor="rateAlertMinutes">
                        料金切り替え前の通知タイミング
                    </label>
                    <select
                        id="rateAlertMinutes"
                        value={settings.rateChangeAlertMinutes}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                rateChangeAlertMinutes: Number(e.target.value),
                            })
                        }
                    >
                        <option value={10}>10分前にお知らせ</option>
                        <option value={15}>15分前にお知らせ</option>
                        <option value={30}>30分前にお知らせ</option>
                    </select>
                </div>

                {/* チャイム音効果音 */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={settings.soundEnabled}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    soundEnabled: e.target.checked,
                                })
                            }
                        />
                        <span>通知時にチャイム音（効果音）を鳴らす</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => notificationService.playChime()}
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                        試聴 🔊
                    </button>
                </div>

                {/* 最大料金・予算通知 */}
                <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={settings.maxRateAlert}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    maxRateAlert: e.target.checked,
                                })
                            }
                        />
                        <span>最大料金に達した時にお知らせする</span>
                    </label>
                </div>

                <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={settings.budgetAlert}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    budgetAlert: e.target.checked,
                                })
                            }
                        />
                        <span>予算超過時にお知らせする</span>
                    </label>
                </div>

                <div className="button-group" style={{ marginTop: "16px" }}>
                    <button type="submit">設定を保存する</button>
                    <button
                        type="button"
                        onClick={handleTestNotification}
                        className="btn-secondary"
                    >
                        🔔 テスト通知を送る
                    </button>
                </div>
            </form>
        </section>
    );
}