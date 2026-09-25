import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    getActiveSession,
    saveActiveSession,
} from "../lib/sessionStorage";
import {
    calculateParkingFee,
    findTimeReachingFee,
} from "../lib/feeCalculator";
import { notificationService } from "../lib/notificationService";

export function ParkingActivePage() {
    const [session, setSession] = useState(getActiveSession());
    const [currentTime, setCurrentTime] = useState(new Date());
    const [completedSummary, setCompletedSummary] = useState(null);

    // 1秒ごとにタイマーを更新
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!session) {
        return (
            <section className="active-parking-page">
                <h2>🅿️ 現在駐車中の情報</h2>

                {completedSummary ? (
                    <div className="result-card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                            🏁
                        </div>
                        <h3>出庫・精算が完了しました</h3>
                        <p style={{ fontWeight: "bold", fontSize: "18px" }}>
                            {completedSummary.parkingName}
                        </p>
                        <div className="notice-message" style={{ fontSize: "24px" }}>
                            精算料金：¥{completedSummary.finalFee.toLocaleString()}
                        </div>
                        <p style={{ color: "#666", marginTop: "8px" }}>
                            駐車時間：{Math.floor(completedSummary.durationMinutes / 60)}時間
                            {completedSummary.durationMinutes % 60}分
                        </p>
                        <div style={{ marginTop: "20px" }}>
                            <Link to="/calculator">
                                <button type="button">料金計算画面へ戻る</button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="rule-card" style={{ textAlign: "center", padding: "32px" }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                            🚗
                        </div>
                        <h3>現在、駐車中のセッションはありません</h3>
                        <p style={{ fontSize: "14px", color: "#666" }}>
                            「料金計算」画面で計算を行ったあと、「この駐車場に入庫する」ボタンを押すと、リアルタイム計測と通知が始まります。
                        </p>
                        <div style={{ marginTop: "16px" }}>
                            <Link to="/calculator">
                                <button type="button">料金計算画面へ行く</button>
                            </Link>
                        </div>
                    </div>
                )}
            </section>
        );
    }

    // 入庫日時と現在日時
    const start = new Date(session.startTime);
    const diffMs = Math.max(0, currentTime.getTime() - start.getTime());
    const elapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
    const elapsedMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const elapsedSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    // 現在時点の料金計算
    const currentCalc = calculateParkingFee({
        startTime: session.startTime,
        endTime: currentTime > start ? currentTime : new Date(start.getTime() + 60000),
        dayPrice: session.dayPrice,
        nightPrice: session.nightPrice,
        maximumFee: session.maximumFee,
    });

    const currentFee = currentCalc.totalFee || 0;

    // 予定時刻・到達予定時刻の計算
    const budgetReachedAt = findTimeReachingFee({
        startTime: session.startTime,
        endTime: new Date(start.getTime() + 24 * 60 * 60 * 1000),
        dayPrice: session.dayPrice,
        nightPrice: session.nightPrice,
        maximumFee: session.maximumFee,
        targetFee: Number(session.budget),
    });

    const maximumFeeReachedAt = findTimeReachingFee({
        startTime: session.startTime,
        endTime: new Date(start.getTime() + 24 * 60 * 60 * 1000),
        dayPrice: session.dayPrice,
        nightPrice: session.nightPrice,
        maximumFee: session.maximumFee,
        targetFee: Number(session.maximumFee),
    });

    // 次の切り替え時刻（20:00 または 08:00）
    const nextRateChange = new Date(currentTime);
    const hour = currentTime.getHours();
    if (hour >= 8 && hour < 20) {
        nextRateChange.setHours(20, 0, 0, 0); // 今日の20:00
    } else {
        if (hour >= 20) {
            nextRateChange.setDate(nextRateChange.getDate() + 1);
        }
        nextRateChange.setHours(8, 0, 0, 0); // 翌朝の8:00
    }
    const minutesToRateChange = Math.round(
        (nextRateChange.getTime() - currentTime.getTime()) / (1000 * 60)
    );

    // 出庫処理
    const handleEndParking = () => {
        const shouldEnd = window.confirm(
            `出庫しますか？\n確定料金：¥${currentFee.toLocaleString()}`
        );
        if (!shouldEnd) return;

        const durationMinutes = Math.max(
            1,
            Math.round((currentTime.getTime() - start.getTime()) / (1000 * 60))
        );

        setCompletedSummary({
            parkingName: session.ruleName || "駐車場",
            finalFee: currentFee,
            durationMinutes,
        });

        saveActiveSession(null);
        setSession(null);

        notificationService.notify(
            {
                title: "🏁 出庫が完了しました",
                body: `精算料金：¥${currentFee.toLocaleString()}（駐車時間: ${Math.floor(
                    durationMinutes / 60
                )}時間${durationMinutes % 60}分）`,
                type: "general",
            },
            { playSound: true }
        );
    };

    return (
        <section className="active-parking-page">
            <header className="active-parking-header">
                <div>
                    <h2>🅿️ 現在駐車中</h2>
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                        📍 {session.ruleName || "名称未設定駐車場"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleEndParking}
                    style={{ background: "#c62828" }}
                >
                    🏁 出庫する（精算）
                </button>
            </header>

            {/* 経過時間 & 現在金額メーター */}
            <div className="active-meter-card">
                <div>
                    <span className="meter-label">駐車経過時間</span>
                    <div className="meter-time">
                        {String(elapsedHours).padStart(2, "0")}:
                        {String(elapsedMinutes).padStart(2, "0")}:
                        <span>{String(elapsedSeconds).padStart(2, "0")}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                        入庫：{start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                </div>

                <div>
                    <span className="meter-label">現在確定料金</span>
                    <div className="meter-fee">
                        ¥{currentFee.toLocaleString()}
                    </div>
                    {currentCalc.maximumFeeApplied && (
                        <span className="notice-message" style={{ fontSize: "12px" }}>
                            ※ 最大料金適用中
                        </span>
                    )}
                </div>
            </div>

            {/* 次のイベントアラート */}
            <div className="timeline-alert-box">
                <span style={{ fontSize: "20px" }}>⏱️</span>
                <div>
                    <strong>
                        あと {minutesToRateChange} 分で
                        {hour >= 8 && hour < 20
                            ? "夜間料金（60分100円）"
                            : "昼料金（30分200円）"}
                        に切り替わります
                    </strong>
                    <div style={{ fontSize: "12px", color: "#555" }}>
                        切り替え時刻：
                        {nextRateChange.toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                </div>
            </div>

            {/* 予測タイムライン */}
            <section className="result-card">
                <h3>📈 料金予測・マイルストーン</h3>

                <ul className="timeline-list">
                    <li className="timeline-item past">
                        <span className="timeline-badge">✓</span>
                        <div className="timeline-content">
                            <strong>入庫</strong>（
                            {start.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            ）: 駐車開始
                        </div>
                    </li>

                    <li className="timeline-item next">
                        <span className="timeline-badge">•</span>
                        <div className="timeline-content">
                            <strong>料金帯の切り替え</strong>（
                            {nextRateChange.toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            ）:{" "}
                            {hour >= 8 && hour < 20
                                ? "夜間料金に切り替わります"
                                : "昼間料金に切り替わります"}
                        </div>
                    </li>

                    {maximumFeeReachedAt && (
                        <li className="timeline-item">
                            <span className="timeline-badge">🛡️</span>
                            <div className="timeline-content">
                                <strong>最大料金到達予定</strong>（
                                {maximumFeeReachedAt.toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                ）: 上限 ¥{session.maximumFee.toLocaleString()} に到達
                            </div>
                        </li>
                    )}

                    {budgetReachedAt && (
                        <li className="timeline-item">
                            <span className="timeline-badge">⚠️</span>
                            <div className="timeline-content">
                                <strong>予算到達予定</strong>（
                                {budgetReachedAt.toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                ）: 設定予算 ¥{session.budget.toLocaleString()} に到達
                            </div>
                        </li>
                    )}

                    {session.endTime && (
                        <li className="timeline-item">
                            <span className="timeline-badge">🏁</span>
                            <div className="timeline-content">
                                <strong>予定退場時刻</strong>（
                                {new Date(session.endTime).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                ）
                            </div>
                        </li>
                    )}
                </ul>
            </section>
        </section>
    );
}
