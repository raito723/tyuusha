import { useState } from "react";
import { Link } from "react-router-dom";
import { FeeCalculatorPage } from "./FeeCalculatorPage";

const HeartIcon = ({ filled = false, size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#485D87" : "none"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
            d="M12 20.2C10.2 19 3.6 14.4 3.6 9.1C3.6 6.5 5.5 4.6 7.9 4.6C9.6 4.6 11.1 5.5 12 7C12.9 5.5 14.4 4.6 16.1 4.6C18.5 4.6 20.4 6.5 20.4 9.1C20.4 14.4 13.8 19 12 20.2Z"
            stroke="#485D87"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// TODO: 実データ(保存した駐車場)に置き換える
const INITIAL_SAVED = [
    { id: 1, name: "◯◯パーキング", status: "vacant", statusLabel: "空車 10台", price: "¥200/30分" },
    { id: 2, name: "◯◯パーキング", status: "crowded", statusLabel: "残りわずか 5台", price: "¥200/30分" },
    { id: 3, name: "◯◯パーキング", status: "full", statusLabel: "満車", price: "¥200/30分" },
];

export function SavedPage() {
    const [tab, setTab] = useState("saved");
    const [spots, setSpots] = useState(INITIAL_SAVED.map((s) => ({ ...s, saved: true })));

    const toggleSaved = (id) => {
        setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, saved: !s.saved } : s)));
    };

    return (
        <section className="saved-page">
            <div
                className={`saved-tabs${tab === "history" ? " history-selected" : ""}`}
                role="tablist"
                aria-label="保存・履歴"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "saved"}
                    className={`saved-tab${tab === "saved" ? " selected" : ""}`}
                    onClick={() => setTab("saved")}
                >
                    保存した駐車場
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "history"}
                    className={`saved-tab${tab === "history" ? " selected" : ""}`}
                    onClick={() => setTab("history")}
                >
                    最近の計算
                </button>
            </div>

            {tab === "saved" ? (
                spots.length === 0 ? (
                    <div className="empty-state saved-empty">
                        保存した駐車場はまだありません。
                        <br />
                        <Link to="/map">駐車場を探す</Link>
                    </div>
                ) : (
                    <ul className="saved-spot-list">
                        {spots.map((spot) => (
                            <li key={spot.id} className="saved-spot">
                                <span className="saved-spot-thumb" aria-hidden="true" />
                                <div className="saved-spot-body">
                                    <div className="saved-spot-top">
                                        <h3 className="saved-spot-name">{spot.name}</h3>
                                        <button
                                            type="button"
                                            className="saved-heart-button"
                                            aria-label={spot.saved ? "保存を解除する" : "保存する"}
                                            aria-pressed={spot.saved}
                                            onClick={() => toggleSaved(spot.id)}
                                        >
                                            <HeartIcon filled={spot.saved} />
                                        </button>
                                    </div>
                                    <div className="saved-spot-bottom">
                                        <span className={`saved-badge saved-badge-${spot.status}`}>{spot.statusLabel}</span>
                                        <strong className="saved-spot-price">{spot.price}</strong>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : (
                <div className="saved-history-tab">
                    <FeeCalculatorPage />
                </div>
            )}
        </section>
    );
}