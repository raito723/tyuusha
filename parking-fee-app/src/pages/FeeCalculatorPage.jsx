import { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    calculateParkingFee,
    findTimeReachingFee,
    getNextFeeChangeTime,
} from "../lib/feeCalculator";
import { getParkingRules, saveParkingRules } from "../lib/parkingRules";
import { saveActiveSession } from "../lib/sessionStorage";
import { ImageOcrModal } from "../components/ImageOcrModal";
import { notificationService } from "../lib/notificationService";

export function FeeCalculatorPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [ruleName, setRuleName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [dayPrice, setDayPrice] = useState(200);
    const [nightPrice, setNightPrice] = useState(100);
    const [maximumFee, setMaximumFee] = useState(1000);
    const [budget, setBudget] = useState(0);
    const [result, setResult] = useState(null);
    const [savedRules, setSavedRules] = useState(getParkingRules());
    const [notificationMessage, setNotificationMessage] = useState("");
    const notificationTimerIds = useRef([]);

    // マップ画面等からプリセット情報が渡された場合の自動入力
    useEffect(() => {
        if (location.state?.presetRule) {
            const rule = location.state.presetRule;
            if (rule.name) setRuleName(rule.name);
            if (rule.dayPrice !== undefined) setDayPrice(rule.dayPrice);
            if (rule.nightPrice !== undefined) setNightPrice(rule.nightPrice);
            if (rule.maximumFee !== undefined) setMaximumFee(rule.maximumFee);
        }
    }, [location.state]);
    // Phase 3: 写真読取モーダル開閉
    const [isOcrOpen, setIsOcrOpen] = useState(false);

    function handleSubmit(event) {
        event.preventDefault();

        const feeSettings = {
            startTime,
            endTime,
            dayPrice: Number(dayPrice),
            nightPrice: Number(nightPrice),
            maximumFee: Number(maximumFee),
        };

        const calculationResult = calculateParkingFee(feeSettings);

        if (calculationResult.error) {
            setResult(calculationResult);
            return;
        }

        const budgetReachedAt = findTimeReachingFee({
            ...feeSettings,
            targetFee: Number(budget),
        });

        const maximumFeeReachedAt = findTimeReachingFee({
            ...feeSettings,
            targetFee: Number(maximumFee),
        });

        setResult({
            ...calculationResult,
            budget: Number(budget),
            budgetReachedAt,
            maximumFeeReachedAt,
            nextFeeChangeAt: getNextFeeChangeTime({
                startTime,
                endTime,
            }),
        });
    }

    async function handleEnableNotifications() {
        const permissionResult = await requestNotificationPermission();

        setNotificationMessage(permissionResult.message);
    }

    function handleScheduleNotifications() {
        if (Notification.permission !== "granted") {
            setNotificationMessage("先に「通知を許可する」を押してください。");
            return;
        }

        if (!result) {
            setNotificationMessage("先に料金を計算してください。");
            return;
        }

        clearScheduledNotifications(notificationTimerIds.current);
        notificationTimerIds.current = [];

        const timerIds = [];

        if (result.nextFeeChangeAt) {
            const timerId = scheduleNotification({
                title: "料金変更のお知らせ",
                body: `料金体系が切り替わる予定です。${result.nextFeeChangeAt.toLocaleString(
                    "ja-JP"
                )}に料金を確認してください。`,
                notificationTime: result.nextFeeChangeAt,
            });

            if (timerId) {
                timerIds.push(timerId);
            }
        }

        if (result.budgetReachedAt) {
            const timerId = scheduleNotification({
                title: "予算到達のお知らせ",
                body: `設定した予算額${result.budget.toLocaleString()}円に達する予定です。`,
                notificationTime: result.budgetReachedAt,
            });

            if (timerId) {
                timerIds.push(timerId);
            }
        }

        if (result.maximumFeeReachedAt) {
            const timerId = scheduleNotification({
                title: "最大料金到達のお知らせ",
                body: "設定した最大料金に達する予定です。",
                notificationTime: result.maximumFeeReachedAt,
            });

            if (timerId) {
                timerIds.push(timerId);
            }
        }

        notificationTimerIds.current = timerIds;

        if (timerIds.length === 0) {
            setNotificationMessage("通知できる予定時刻がありません。");
            return;
        }

        setNotificationMessage(`${timerIds.length}件の通知を設定しました。`);
    }

    function handleSaveRule() {
        if (!ruleName.trim()) {
            alert("駐車場名を入力してください。");
            return;
        }

        const newRule = {
            id: crypto.randomUUID(),
            name: ruleName.trim(),
            dayPrice: Number(dayPrice),
            nightPrice: Number(nightPrice),
            maximumFee: Number(maximumFee),
        };

        const updatedRules = [...savedRules, newRule];

        saveParkingRules(updatedRules);
        setSavedRules(updatedRules);
        setRuleName("");

        alert("料金ルールを保存しました。");
    }

    function handleSelectRule(event) {
        const selectedRule = savedRules.find(
            (rule) => rule.id === event.target.value
        );

        if (!selectedRule) {
            return;
        }

        setRuleName(selectedRule.name);
        setDayPrice(selectedRule.dayPrice);
        setNightPrice(selectedRule.nightPrice);
        setMaximumFee(selectedRule.maximumFee);
    }

    function handleDeleteRule() {
        const selectedRule = savedRules.find((rule) => rule.name === ruleName);

        if (!selectedRule) {
            alert("削除する保存済み料金ルールを選択してください。");
            return;
        }

        const shouldDelete = window.confirm(
            `「${selectedRule.name}」を削除しますか？`
        );

        if (!shouldDelete) {
            return;
        }

        const updatedRules = savedRules.filter(
            (rule) => rule.id !== selectedRule.id
        );

        saveParkingRules(updatedRules);
        setSavedRules(updatedRules);
        setRuleName("");

        alert("料金ルールを削除しました。");
    }

    // Phase 3: 写真読取結果の反映
    function handleApplyOcr(data) {
        if (data.ruleName) setRuleName(data.ruleName);
        if (data.dayPrice) setDayPrice(data.dayPrice);
        if (data.nightPrice) setNightPrice(data.nightPrice);
        if (data.maximumFee !== undefined) setMaximumFee(data.maximumFee);
    }

    // Phase 4: 駐車計測開始（入庫）
    function handleStartParking() {
        const now = new Date();
        const startIso = startTime
            ? new Date(startTime).toISOString()
            : now.toISOString();

        const session = {
            id: `session-${Date.now()}`,
            ruleName: ruleName || "パーキング",
            startTime: startIso,
            endTime: endTime ? new Date(endTime).toISOString() : null,
            dayPrice: Number(dayPrice),
            nightPrice: Number(nightPrice),
            maximumFee: Number(maximumFee),
            budget: Number(budget),
        };

        saveActiveSession(session);

        notificationService.notify(
            {
                title: "🚗 駐車を開始しました",
                body: `${session.ruleName} のリアルタイム料金計測を開始しました。`,
                type: "general",
            },
            { playSound: true }
        );

        navigate("/parking");
    }

    return (
        <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                    <h2>料金計算</h2>
                    <p style={{ margin: "4px 0 16px" }}>時間帯ごとの料金を入力して、予想料金を確認します。</p>
                </div>
                {/* Phase 3 写真読取ボタン */}
                <button
                    type="button"
                    onClick={() => setIsOcrOpen(true)}
                    className="btn-accent"
                    style={{ background: "#0066cc" }}
                >
                    📷 料金表写真を読み取る (Phase 3)
                </button>
            </div>

            <section className="rule-card">
                <h3>保存済み料金ルール</h3>

                <label htmlFor="savedRule">料金ルールを選ぶ</label>
                <select id="savedRule" defaultValue="" onChange={handleSelectRule}>
                    <option value="">選択してください</option>

                    {savedRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                            {rule.name}
                        </option>
                    ))}
                </select>

                <button type="button" onClick={handleDeleteRule} className="btn-secondary">
                    選択中の料金ルールを削除する
                </button>
            </section>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="ruleName">駐車場名</label>
                    <input
                        id="ruleName"
                        type="text"
                        value={ruleName}
                        onChange={(event) => setRuleName(event.target.value)}
                        placeholder="例：新宿駅前パーキング"
                    />
                </div>

                <div>
                    <label htmlFor="startTime">入庫時刻</label>
                    <input
                        id="startTime"
                        type="datetime-local"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="endTime">退場予定時刻</label>
                    <input
                        id="endTime"
                        type="datetime-local"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="dayPrice">
                        昼料金：30分あたりの料金（8:00〜20:00）
                    </label>
                    <input
                        id="dayPrice"
                        type="number"
                        min="0"
                        value={dayPrice}
                        onChange={(event) => setDayPrice(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="nightPrice">
                        夜料金：60分あたりの料金（20:00〜翌8:00）
                    </label>
                    <input
                        id="nightPrice"
                        type="number"
                        min="0"
                        value={nightPrice}
                        onChange={(event) => setNightPrice(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="maximumFee">最大料金（円・ない場合は0）</label>
                    <input
                        id="maximumFee"
                        type="number"
                        min="0"
                        value={maximumFee}
                        onChange={(event) => setMaximumFee(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="budget">予算額（円・設定しない場合は0）</label>
                    <input
                        id="budget"
                        type="number"
                        min="0"
                        value={budget}
                        onChange={(event) => setBudget(event.target.value)}
                    />
                </div>

                <div className="button-group">
                    <button type="submit">料金を計算する</button>
                    <button type="button" onClick={handleSaveRule} className="btn-secondary">
                        この料金ルールを保存する
                    </button>
                </div>
            </form>

            {result?.error && <p className="error-message">{result.error}</p>}

            {result && !result.error && (
                <section className="result-card">
                    <h3>計算結果</h3>

                    <p>昼間の駐車時間：{result.dayMinutes}分</p>
                    <p>昼料金：{result.dayFee.toLocaleString()}円</p>

                    <p>夜間の駐車時間：{result.nightMinutes}分</p>
                    <p>夜料金：{result.nightFee.toLocaleString()}円</p>

                    <hr />

                    <p>通常料金：{result.regularFee.toLocaleString()}円</p>
                    <p style={{ fontSize: "20px", fontWeight: "bold" }}>
                        予想料金：{result.totalFee.toLocaleString()}円
                    </p>

                    {result.maximumFeeApplied && (
                        <p className="notice-message">
                            最大料金が適用されています。
                        </p>
                    )}

                    {result.budget > 0 && result.totalFee > result.budget && (
                        <p className="warning-message">
                            予算を{(result.totalFee - result.budget).toLocaleString()}円超える見込みです。
                        </p>
                    )}

                    {result.budgetReachedAt && (
                        <p>
                            予算額に達する予定時刻：
                            {result.budgetReachedAt.toLocaleString("ja-JP")}
                        </p>
                    )}

                    {result.maximumFeeReachedAt && (
                        <p>
                            最大料金に達する予定時刻：
                            {result.maximumFeeReachedAt.toLocaleString("ja-JP")}
                        </p>
                    )}

                    {/* Phase 4 駐車開始アクション */}
                    <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
                        <button
                            type="button"
                            onClick={handleStartParking}
                            style={{
                                width: "100%",
                                padding: "14px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                background: "#007a4d",
                            }}
                        >
                            🚗 今すぐこの駐車場に入庫する（リアルタイム計測・通知開始）
                        </button>
                    </div>
                    <hr />

                    <h3>通知設定</h3>

                    <div className="button-group">
                        <button type="button" onClick={handleEnableNotifications}>
                            通知を許可する
                        </button>

                        <button type="button" onClick={handleScheduleNotifications}>
                            通知を設定する
                        </button>
                    </div>

                    {notificationMessage && (
                        <p className="notice-message">{notificationMessage}</p>
                    )}
                </section>
            )}

            {/* Phase 3 写真読取モーダル */}
            <ImageOcrModal
                isOpen={isOcrOpen}
                onClose={() => setIsOcrOpen(false)}
                onApplyRule={handleApplyOcr}
            />
        </section>
    );
}