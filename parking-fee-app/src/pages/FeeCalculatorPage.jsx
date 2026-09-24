import { useState } from "react";
import { calculateParkingFee } from "../lib/feeCalculator";
import { getParkingRules, saveParkingRules } from "../lib/parkingRules";

export function FeeCalculatorPage() {
    const [ruleName, setRuleName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [dayPrice, setDayPrice] = useState(200);
    const [nightPrice, setNightPrice] = useState(100);
    const [maximumFee, setMaximumFee] = useState(1000);
    const [result, setResult] = useState(null);
    const [savedRules, setSavedRules] = useState(getParkingRules());

    function handleSubmit(event) {
        event.preventDefault();

        const calculationResult = calculateParkingFee({
            startTime,
            endTime,
            dayPrice: Number(dayPrice),
            nightPrice: Number(nightPrice),
            maximumFee: Number(maximumFee),
        });

        setResult(calculationResult);
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

    return (
        <section>
            <h2>料金計算</h2>
            <p>時間帯ごとの料金を入力して、予想料金を確認します。</p>

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

                <button type="button" onClick={handleDeleteRule}>
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

                <div className="button-group">
                    <button type="submit">料金を計算する</button>
                    <button type="button" onClick={handleSaveRule}>
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
                    <p>予想料金：{result.totalFee.toLocaleString()}円</p>

                    {result.maximumFeeApplied && (
                        <p className="notice-message">
                            最大料金が適用されています。
                        </p>
                    )}
                </section>
            )}
        </section>
    );
}