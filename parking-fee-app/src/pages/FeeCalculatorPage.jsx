import { useState } from "react";
import { calculateParkingFee } from "../lib/feeCalculator";

export function FeeCalculatorPage() {
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [dayPrice, setDayPrice] = useState(200);
    const [nightPrice, setNightPrice] = useState(100);
    const [maximumFee, setMaximumFee] = useState(1000);
    const [result, setResult] = useState(null);

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

    return (
        <section>
            <h2>料金計算</h2>
            <p>時間帯ごとの料金を入力して、予想料金を確認します。</p>

            <form onSubmit={handleSubmit}>
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

                <button type="submit">料金を計算する</button>
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