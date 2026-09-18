import { useState } from "react";
import { calculateParkingFee } from "../lib/feeCalculator";

export function FeeCalculatorPage() {
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [pricePer30Minutes, setPricePer30Minutes] = useState(200);
    const [maximumFee, setMaximumFee] = useState(0);
    const [result, setResult] = useState(null);

    function handleSubmit(event) {
        event.preventDefault();

        const calculationResult = calculateParkingFee({
            startTime,
            endTime,
            pricePer30Minutes: Number(pricePer30Minutes),
            maximumFee: Number(maximumFee),
        });

        setResult(calculationResult);
    }

    return (
        <section>
            <h2>料金計算</h2>
            <p>駐車する予定の時間と料金を入力してください。</p>

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
                    <label htmlFor="pricePer30Minutes">30分あたりの料金（円）</label>
                    <input
                        id="pricePer30Minutes"
                        type="number"
                        min="0"
                        value={pricePer30Minutes}
                        onChange={(event) => setPricePer30Minutes(event.target.value)}
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

            {result && result.error && (
                <p className="error-message">{result.error}</p>
            )}

            {result && !result.error && (
                <section className="result-card">
                    <h3>計算結果</h3>

                    <p>
                        駐車時間：{result.parkingMinutes}分
                    </p>

                    <p>
                        料金：{result.totalFee.toLocaleString()}円
                    </p>

                    <p>
                        30分単位：{result.units}回
                    </p>

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