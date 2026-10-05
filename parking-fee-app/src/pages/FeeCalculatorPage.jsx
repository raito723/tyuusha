import { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
    calculateParkingFee,
    findTimeReachingFee,
    getNextFeeChangeTime,
} from "../lib/feeCalculator";
import { getParkingRules, saveParkingRules } from "../lib/parkingRules";
import { saveActiveSession } from "../lib/sessionStorage";
import { notificationService } from "../lib/notificationService";

export function FeeCalculatorPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [ruleName, setRuleName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [dayStartTime, setDayStartTime] = useState("08:00");
    const [dayEndTime, setDayEndTime] = useState("20:00");
    const [dayIntervalMinutes, setDayIntervalMinutes] = useState(30);
    const [dayPrice, setDayPrice] = useState(200);
    const [nightStartTime, setNightStartTime] = useState("20:00");
    const [nightEndTime, setNightEndTime] = useState("08:00");
    const [nightIntervalMinutes, setNightIntervalMinutes] = useState(60);
    const [nightPrice, setNightPrice] = useState(100);
    const [maximumFee, setMaximumFee] = useState(1000);
    const [allDayRate, setAllDayRate] = useState(false);
    const [maximumFeeAllDay, setMaximumFeeAllDay] = useState(true);
    const [maximumFeeDay, setMaximumFeeDay] = useState("");
    const [maximumFeeNight, setMaximumFeeNight] = useState("");
    const [maximumFeeRecurring, setMaximumFeeRecurring] = useState(false);
    const [maximumFeePeriodHours, setMaximumFeePeriodHours] = useState(24);
    const [weekdayRates, setWeekdayRates] = useState({});
    const [budget, setBudget] = useState(0);
    const [result, setResult] = useState(null);
    const [savedRules, setSavedRules] = useState(getParkingRules());
    const [notificationMessage, setNotificationMessage] = useState("");
    const notificationTimerIds = useRef([]);

    // マップ画面等からプリセット情報が渡された場合の自動入力
    useEffect(() => {
        if (location.state?.startTime) setStartTime(location.state.startTime);
        if (location.state?.endTime) setEndTime(location.state.endTime);
        if (location.state?.presetRule) {
            const rule = location.state.presetRule;
            if (rule.name) setRuleName(rule.name);
            if (rule.dayStartTime) setDayStartTime(rule.dayStartTime);
            if (rule.dayEndTime) setDayEndTime(rule.dayEndTime);
            if (rule.dayIntervalMinutes) setDayIntervalMinutes(rule.dayIntervalMinutes);
            if (rule.dayPrice !== undefined) setDayPrice(rule.dayPrice);
            if (rule.nightStartTime) setNightStartTime(rule.nightStartTime);
            if (rule.nightEndTime) setNightEndTime(rule.nightEndTime);
            if (rule.nightIntervalMinutes) setNightIntervalMinutes(rule.nightIntervalMinutes);
            if (rule.nightPrice !== undefined) setNightPrice(rule.nightPrice);
            if (rule.maximumFee !== undefined) setMaximumFee(rule.maximumFee ?? "");
            setAllDayRate(Boolean(rule.allDayRate));
            setMaximumFeeAllDay(rule.maximumFeeAllDay !== false);
            setMaximumFeeDay(rule.maximumFeeDay ?? "");
            setMaximumFeeNight(rule.maximumFeeNight ?? "");
            setMaximumFeeRecurring(Boolean(rule.maximumFeeRecurring));
            setMaximumFeePeriodHours(rule.maximumFeePeriodHours || 24);
            setWeekdayRates(rule.weekdayRates || {});
        }
    }, [location.state]);

    function handleSubmit(event) {
        event.preventDefault();

        const requiredRateValues = allDayRate
            ? [dayIntervalMinutes, dayPrice]
            : [dayIntervalMinutes, dayPrice, nightIntervalMinutes, nightPrice];
        const missingRateValue = requiredRateValues.some((value) => value === "" || value === null || value === undefined);
        const invalidRateValue = requiredRateValues.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0);
        const invalidInterval = (allDayRate ? [dayIntervalMinutes] : [dayIntervalMinutes, nightIntervalMinutes])
            .some((value) => Number(value) <= 0);
        if (missingRateValue) {
            setResult({ error: "計算できません。料金と単位時間の数値を入力してください。" });
            return;
        }
        if (invalidRateValue || invalidInterval) {
            setResult({ error: "料金は0以上、単位時間は1以上の数値を入力してください。" });
            return;
        }

        const feeSettings = {
            startTime,
            endTime,
            dayStartTime,
            dayEndTime,
            dayIntervalMinutes: Number(dayIntervalMinutes) || 30,
            dayPrice: Number(dayPrice) || 0,
            nightStartTime,
            nightEndTime,
            nightIntervalMinutes: Number(nightIntervalMinutes) || 60,
            nightPrice: Number(nightPrice) || 0,
            maximumFee: maximumFee === "" ? null : Number(maximumFee),
            allDayRate,
            maximumFeeAllDay,
            maximumFeeDay: maximumFeeDay === "" ? null : Number(maximumFeeDay),
            maximumFeeNight: maximumFeeNight === "" ? null : Number(maximumFeeNight),
            maximumFeeRecurring,
            maximumFeePeriodHours: Number(maximumFeePeriodHours) || 24,
            weekdayRates,
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

        const maximumFeeTarget = [maximumFee, maximumFeeDay, maximumFeeNight]
            .map(Number).filter((value) => value > 0).sort((left, right) => left - right)[0] || 0;
        const maximumFeeReachedAt = findTimeReachingFee({
            ...feeSettings,
            targetFee: maximumFeeTarget,
        });

        setResult({
            ...calculationResult,
            budget: Number(budget),
            budgetReachedAt,
            maximumFeeReachedAt,
            nextFeeChangeAt: getNextFeeChangeTime({
                startTime,
                endTime,
                dayStartTime,
                dayEndTime,
                nightStartTime,
                nightEndTime,
                allDayRate,
                weekdayRates,
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
            dayStartTime,
            dayEndTime,
            dayIntervalMinutes: Number(dayIntervalMinutes) || 30,
            dayPrice: Number(dayPrice) || 0,
            nightStartTime,
            nightEndTime,
            nightIntervalMinutes: Number(nightIntervalMinutes) || 60,
            nightPrice: Number(nightPrice) || 0,
            maximumFee: maximumFee === "" ? null : Number(maximumFee),
            allDayRate,
            maximumFeeAllDay,
            maximumFeeDay: maximumFeeDay === "" ? null : Number(maximumFeeDay),
            maximumFeeNight: maximumFeeNight === "" ? null : Number(maximumFeeNight),
            maximumFeeRecurring,
            maximumFeePeriodHours: Number(maximumFeePeriodHours) || 24,
            weekdayRates,
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
        setDayStartTime(selectedRule.dayStartTime || "08:00");
        setDayEndTime(selectedRule.dayEndTime || "20:00");
        setDayIntervalMinutes(selectedRule.dayIntervalMinutes || 30);
        setDayPrice(selectedRule.dayPrice);
        setNightStartTime(selectedRule.nightStartTime || "20:00");
        setNightEndTime(selectedRule.nightEndTime || "08:00");
        setNightIntervalMinutes(selectedRule.nightIntervalMinutes || 60);
        setNightPrice(selectedRule.nightPrice);
        setMaximumFee(selectedRule.maximumFee ?? "");
        setAllDayRate(Boolean(selectedRule.allDayRate));
        setMaximumFeeAllDay(selectedRule.maximumFeeAllDay !== false);
        setMaximumFeeDay(selectedRule.maximumFeeDay ?? "");
        setMaximumFeeNight(selectedRule.maximumFeeNight ?? "");
        setMaximumFeeRecurring(Boolean(selectedRule.maximumFeeRecurring));
        setMaximumFeePeriodHours(selectedRule.maximumFeePeriodHours || 24);
        setWeekdayRates(selectedRule.weekdayRates || {});
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
            dayStartTime,
            dayEndTime,
            dayIntervalMinutes: Number(dayIntervalMinutes) || 30,
            dayPrice: Number(dayPrice),
            nightStartTime,
            nightEndTime,
            nightIntervalMinutes: Number(nightIntervalMinutes) || 60,
            nightPrice: Number(nightPrice),
            maximumFee: maximumFee === "" ? null : Number(maximumFee),
            allDayRate,
            maximumFeeAllDay,
            maximumFeeDay: maximumFeeDay === "" ? null : Number(maximumFeeDay),
            maximumFeeNight: maximumFeeNight === "" ? null : Number(maximumFeeNight),
            maximumFeeRecurring,
            maximumFeePeriodHours: Number(maximumFeePeriodHours) || 24,
            weekdayRates,
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
                    onClick={() => navigate("/ocr")}
                    className="btn-accent"
                    style={{ background: "#0066cc" }}
                >
                    📷 料金表写真を読み取る
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
                    <label className="ocr-toggle-row"><input type="checkbox" checked={allDayRate} onChange={(event) => setAllDayRate(event.target.checked)} />終日同じ料金</label>
                </div>

                {!allDayRate && <>
                    <div><label htmlFor="dayStartTime">昼料金の開始時刻</label><input id="dayStartTime" type="time" value={dayStartTime} onChange={(event) => setDayStartTime(event.target.value)} /></div>
                    <div><label htmlFor="dayEndTime">昼料金の終了時刻</label><input id="dayEndTime" type="time" value={dayEndTime} onChange={(event) => setDayEndTime(event.target.value)} /></div>
                </>}
                <div><label htmlFor="dayIntervalMinutes">{allDayRate ? "終日" : "昼"}料金の単位時間（分）</label><input id="dayIntervalMinutes" type="number" min="1" value={dayIntervalMinutes} onChange={(event) => setDayIntervalMinutes(event.target.value)} /></div>
                <div><label htmlFor="dayPrice">{allDayRate ? "終日" : "昼"}料金（円）</label><input id="dayPrice" type="number" min="0" value={dayPrice} onChange={(event) => setDayPrice(event.target.value)} /></div>

                {!allDayRate && <>
                    <div><label htmlFor="nightStartTime">夜料金の開始時刻</label><input id="nightStartTime" type="time" value={nightStartTime} onChange={(event) => setNightStartTime(event.target.value)} /></div>
                    <div><label htmlFor="nightEndTime">夜料金の終了時刻</label><input id="nightEndTime" type="time" value={nightEndTime} onChange={(event) => setNightEndTime(event.target.value)} /></div>
                    <div><label htmlFor="nightIntervalMinutes">夜料金の単位時間（分）</label><input id="nightIntervalMinutes" type="number" min="1" value={nightIntervalMinutes} onChange={(event) => setNightIntervalMinutes(event.target.value)} /></div>
                    <div><label htmlFor="nightPrice">夜料金（円）</label><input id="nightPrice" type="number" min="0" value={nightPrice} onChange={(event) => setNightPrice(event.target.value)} /></div>
                </>}

                <fieldset className="ocr-review-group">
                    <legend>最大料金</legend>
                    <label className="ocr-toggle-row"><input type="checkbox" checked={maximumFeeRecurring} onChange={(event) => setMaximumFeeRecurring(event.target.checked)} />最大料金を繰り返し適用</label>
                    {maximumFeeRecurring && <label>繰り返し期間（時間）<input type="number" min="1" value={maximumFeePeriodHours} onChange={(event) => setMaximumFeePeriodHours(event.target.value)} /></label>}
                    <label className="ocr-toggle-row"><input type="checkbox" checked={maximumFeeAllDay} onChange={(event) => setMaximumFeeAllDay(event.target.checked)} />最大料金は終日共通</label>
                    {maximumFeeAllDay
                        ? <label htmlFor="maximumFee">最大料金（円・空欄は上限なし）<input id="maximumFee" type="number" min="0" value={maximumFee ?? ""} onChange={(event) => setMaximumFee(event.target.value)} placeholder="上限なし" /></label>
                        : <div className="ocr-review-grid"><label>昼間の最大料金（円）<input type="number" min="0" value={maximumFeeDay} onChange={(event) => setMaximumFeeDay(event.target.value)} placeholder="上限なし" /></label><label>夜間の最大料金（円）<input type="number" min="0" value={maximumFeeNight} onChange={(event) => setMaximumFeeNight(event.target.value)} placeholder="上限なし" /></label></div>}
                </fieldset>

                <fieldset className="ocr-review-group">
                    <legend>曜日別料金（空欄は基本料金）</legend>
                    <div className="ocr-weekday-rate-list">
                        {["日", "月", "火", "水", "木", "金", "土"].map((label, weekday) => <div className="ocr-weekday-rate-row" key={label}><b>{label}曜日</b><label>昼<input type="number" min="0" value={weekdayRates[weekday]?.dayPrice ?? ""} onChange={(event) => setWeekdayRates((current) => ({ ...current, [weekday]: { ...current[weekday], dayPrice: event.target.value === "" ? null : Number(event.target.value) } }))} placeholder="基本料金" /></label>{!allDayRate && <label>夜<input type="number" min="0" value={weekdayRates[weekday]?.nightPrice ?? ""} onChange={(event) => setWeekdayRates((current) => ({ ...current, [weekday]: { ...current[weekday], nightPrice: event.target.value === "" ? null : Number(event.target.value) } }))} placeholder="基本料金" /></label>}</div>)}
                    </div>
                </fieldset>

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

                    {result.dayMinutes > 0 && (
                        <>
                            <p>昼間の駐車時間：{result.dayMinutes}分</p>
                            <p>{allDayRate ? "終日料金" : "昼料金"}：{result.dayFee.toLocaleString()}円</p>
                        </>
                    )}

                    {result.nightMinutes > 0 && (
                        <>
                            <p>夜間の駐車時間：{result.nightMinutes}分</p>
                            <p>夜料金：{result.nightFee.toLocaleString()}円</p>
                        </>
                    )}

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

        </section>
    );
}
