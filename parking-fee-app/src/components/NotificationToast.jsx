import { useState, useEffect } from "react";
import { notificationService } from "../lib/notificationService";

export function NotificationToast() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const unsubscribe = notificationService.subscribe((item) => {
            setNotifications((prev) => [item, ...prev.slice(0, 2)]);

            setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== item.id));
            }, 6000);
        });

        return () => unsubscribe();
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="toast-container">
            {notifications.map((n) => (
                <div key={n.id} className="toast-item">
                    <div className="toast-icon">
                        {n.type === "budget"
                            ? "⚠️"
                            : n.type === "max_rate"
                            ? "🛡️"
                            : "🔔"}
                    </div>
                    <div className="toast-body">
                        <div className="toast-title">{n.title}</div>
                        <div className="toast-desc">{n.body}</div>
                    </div>
                    <button
                        type="button"
                        className="btn-icon"
                        onClick={() =>
                            setNotifications((prev) =>
                                prev.filter((item) => item.id !== n.id)
                            )
                        }
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
