import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateParkingFee } from "../lib/feeCalculator";
import { getParkingRules, saveParkingRules } from "../lib/parkingRules";

const REVIEW_FIELDS = [
    { key: "dayStartTime", label: "開始時刻", type: "time", group: "昼料金" },
    { key: "dayEndTime", label: "終了時刻", type: "time", group: "昼料金" },
    { key: "dayIntervalMinutes", label: "単位時間（分）", type: "number", group: "昼料金" },
    { key: "dayPriceYen", label: "単位料金（円）", type: "number", group: "昼料金" },
    { key: "nightStartTime", label: "開始時刻", type: "time", group: "夜料金" },
    { key: "nightEndTime", label: "終了時刻", type: "time", group: "夜料金" },
    { key: "nightIntervalMinutes", label: "単位時間（分）", type: "number", group: "夜料金" },
    { key: "nightPriceYen", label: "単位料金（円）", type: "number", group: "夜料金" },
    { key: "maximumFeeYen", label: "最大料金（円、未読取/上限なしは0）", type: "number", group: "最大料金", optional: true },
    { key: "maximumFeePeriod", label: "最大料金の適用期間", type: "text", group: "最大料金", optional: true },
];

const REQUIRED_FIELDS = REVIEW_FIELDS.filter((field) => !field.optional);
const CAMERA_GUIDE_WIDTH = 0.86;
const CAMERA_GUIDE_HEIGHT = 0.6;

function isMissing(value) {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function getLiveEstimate(rule, startTime, endTime) {
    if (!rule || !startTime || !endTime) return null;
    const requiredValues = [
        rule.dayStartTime,
        rule.dayEndTime,
        rule.dayIntervalMinutes,
        rule.dayPriceYen,
        rule.nightStartTime,
        rule.nightEndTime,
        rule.nightIntervalMinutes,
        rule.nightPriceYen,
    ];
    if (requiredValues.some(isMissing)) return null;

    return calculateParkingFee({
        startTime,
        endTime,
        dayStartTime: rule.dayStartTime,
        dayEndTime: rule.dayEndTime,
        dayIntervalMinutes: Number(rule.dayIntervalMinutes),
        dayPrice: Number(rule.dayPriceYen),
        nightStartTime: rule.nightStartTime,
        nightEndTime: rule.nightEndTime,
        nightIntervalMinutes: Number(rule.nightIntervalMinutes),
        nightPrice: Number(rule.nightPriceYen),
        maximumFee: Number(rule.maximumFeeYen ?? 0),
    });
}

function toLocalDateTimeValue(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

export function PhotoOcrPage() {
    const navigate = useNavigate();
    const cameraInputRef = useRef(null);
    const albumInputRef = useRef(null);
    const videoRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const cameraRequestIdRef = useRef(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraError, setCameraError] = useState("");
    const [reviewData, setReviewData] = useState(null);
    const [rawText, setRawText] = useState("");
    const [pageStep, setPageStep] = useState("capture");
    const [isEditingRates, setIsEditingRates] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [message, setMessage] = useState("");
    const [timeMode, setTimeMode] = useState("specified");
    const [parkingStartTime, setParkingStartTime] = useState(() => toLocalDateTimeValue(new Date()));
    const [parkingEndTime, setParkingEndTime] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)));
    const [durationStartTime, setDurationStartTime] = useState(() => toLocalDateTimeValue(new Date()));
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [calculationResult, setCalculationResult] = useState(null);
    const [savedRule, setSavedRule] = useState(null);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!cameraStream || !video) return undefined;
        video.srcObject = cameraStream;
        video.play().catch(() => setCameraError("カメラ映像を表示できません。端末のカメラ利用を許可してください。"));
        return () => { video.srcObject = null; };
    }, [cameraStream]);

    async function handleStartCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("このページではカメラを起動できません。HTTPSまたはlocalhostで開くか、端末標準カメラを使ってください。");
            return;
        }

        const requestId = ++cameraRequestIdRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [{ focusMode: "continuous" }],
                },
            });
            if (requestId !== cameraRequestIdRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
            cameraStreamRef.current = stream;
            setCameraStream(stream);
        } catch (error) {
            if (requestId !== cameraRequestIdRef.current) return;
            const cameraMessage = error.name === "NotAllowedError"
                ? "カメラの利用が許可されていません。ブラウザーの設定を確認するか、端末標準カメラを使ってください。"
                : "カメラを起動できませんでした。端末標準カメラを使うか、HTTPSで開いてください。";
            setCameraError(cameraMessage);
        }
    }

    useEffect(() => {
        if (pageStep !== "capture") return undefined;
        const startTimer = window.setTimeout(() => {
            void handleStartCamera();
        }, 0);
        return () => {
            window.clearTimeout(startTimer);
            cameraRequestIdRef.current += 1;
            cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
            cameraStreamRef.current = null;
        };
    }, [pageStep]);

    function handleCapturePhoto() {
        const video = videoRef.current;
        if (!video?.videoWidth || !video.videoHeight || !video.clientWidth || !video.clientHeight) {
            setCameraError("カメラ映像の準備ができていません。少し待ってから撮影してください。");
            return;
        }

        const sourceAspect = video.videoWidth / video.videoHeight;
        const frameAspect = video.clientWidth / video.clientHeight;
        let visibleWidth = video.videoWidth;
        let visibleHeight = video.videoHeight;
        let visibleX = 0;
        let visibleY = 0;

        if (sourceAspect > frameAspect) {
            visibleWidth = video.videoHeight * frameAspect;
            visibleX = (video.videoWidth - visibleWidth) / 2;
        } else {
            visibleHeight = video.videoWidth / frameAspect;
            visibleY = (video.videoHeight - visibleHeight) / 2;
        }

        const cropWidth = visibleWidth * CAMERA_GUIDE_WIDTH;
        const cropHeight = visibleHeight * CAMERA_GUIDE_HEIGHT;
        const cropX = visibleX + (visibleWidth - cropWidth) / 2;
        const cropY = visibleY + (visibleHeight - cropHeight) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(cropWidth);
        canvas.height = Math.round(cropHeight);
        canvas.getContext("2d")?.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) {
                setCameraError("写真を作成できませんでした。もう一度撮影してください。");
                return;
            }
            const file = new File([blob], `parking-fee-${Date.now()}.jpg`, { type: "image/jpeg" });
            acceptPhoto(file);
        }, "image/jpeg", 0.9);
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        acceptPhoto(file);
    }

    function acceptPhoto(file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setMessage("PNG、JPEG、WebP形式の画像を選択してください。");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setMessage("画像サイズは10MB以下にしてください。");
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setReviewData(null);
        setRawText("");
        setIsEditingRates(false);
        setCalculationResult(null);
        setSavedRule(null);
        setCameraError("");
        setMessage("");
        setPageStep("analyzing");
        void analyzeFile(file);
    }

    async function analyzeFile(file) {
        if (!file || isAnalyzing) return;
        setPageStep("analyzing");
        setIsAnalyzing(true);
        setMessage("");
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("/api/ocr/extract", { method: "POST", body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "画像を解析できませんでした。");
            setReviewData(result.rule);
            setRawText(result.rawText || "");
            setPageStep("result");
        } catch (error) {
            setMessage(error.message || "サーバーに接続できませんでした。開発サーバーを再起動してお試しください。");
            setPageStep("capture");
        } finally {
            setIsAnalyzing(false);
        }
    }

    function handleReanalyze() {
        if (selectedFile) void analyzeFile(selectedFile);
    }

    function handleFieldChange(key, value, type) {
        setReviewData((current) => ({
            ...current,
            [key]: type === "number" ? (value === "" ? null : Number(value)) : value,
        }));
        setCalculationResult(null);
    }

    function handleRemoveImage() {
        setSelectedFile(null);
        setPreviewUrl("");
        setReviewData(null);
        setRawText("");
        setIsEditingRates(false);
        setCalculationResult(null);
        setSavedRule(null);
        setMessage("");
        setPageStep("capture");
    }

    function handleCalculateFee(event) {
        event.preventDefault();
        const missing = REQUIRED_FIELDS.filter((field) => isMissing(reviewData[field.key]));
        const numericFields = ["dayIntervalMinutes", "dayPriceYen", "nightIntervalMinutes", "nightPriceYen"];
        const invalidNumber = numericFields.some((key) => !Number.isFinite(reviewData[key]) || reviewData[key] < 0);
        const invalidMaximumFee = !isMissing(reviewData.maximumFeeYen)
            && (!Number.isFinite(reviewData.maximumFeeYen) || reviewData.maximumFeeYen < 0);
        const invalidTime = ["dayStartTime", "dayEndTime", "nightStartTime", "nightEndTime"]
            .some((key) => !/^\d{2}:\d{2}$/.test(reviewData[key] || ""));
        if (missing.length || invalidNumber || invalidMaximumFee || invalidTime || reviewData.dayIntervalMinutes < 1 || reviewData.nightIntervalMinutes < 1) {
            setMessage("赤く表示された項目を確認してください。単位時間は1分以上、料金は0円以上で入力してください。");
            return;
        }
        const calculationStartTime = timeMode === "duration" ? durationStartTime : parkingStartTime;
        const calculationEndTime = timeMode === "duration"
            ? toLocalDateTimeValue(new Date(new Date(durationStartTime).getTime() + Number(durationMinutes) * 60000))
            : parkingEndTime;
        if (!calculationStartTime || !calculationEndTime || new Date(calculationEndTime) <= new Date(calculationStartTime)) {
            setMessage("退場予定時刻は入庫時刻より後に設定してください。");
            return;
        }

        const calculation = calculateParkingFee({
            startTime: calculationStartTime,
            endTime: calculationEndTime,
            dayStartTime: reviewData.dayStartTime,
            dayEndTime: reviewData.dayEndTime,
            dayIntervalMinutes: reviewData.dayIntervalMinutes,
            dayPrice: reviewData.dayPriceYen,
            nightStartTime: reviewData.nightStartTime,
            nightEndTime: reviewData.nightEndTime,
            nightIntervalMinutes: reviewData.nightIntervalMinutes,
            nightPrice: reviewData.nightPriceYen,
            maximumFee: Number(reviewData.maximumFeeYen ?? 0),
        });
        if (calculation.error) {
            setMessage(calculation.error);
            return;
        }

        const rule = {
            ...reviewData,
            id: savedRule?.id || crypto.randomUUID(),
            name: "料金表から読み取ったルール",
            dayPrice: reviewData.dayPriceYen,
            nightPrice: reviewData.nightPriceYen,
            maximumFee: Number(reviewData.maximumFeeYen ?? 0),
        };

        try {
            const existingRules = getParkingRules();
            const updatedRules = savedRule
                ? existingRules.map((existingRule) => existingRule.id === savedRule.id ? rule : existingRule)
                : [...existingRules, rule];
            saveParkingRules(updatedRules);
            setSavedRule(rule);
            setCalculationResult(calculation);
            setParkingStartTime(calculationStartTime);
            setParkingEndTime(calculationEndTime);
            setMessage("");
        } catch {
            setMessage("料金ルールを保存できませんでした。ブラウザーの保存容量を確認してください。");
        }
    }

    const missingCount = reviewData
        ? REQUIRED_FIELDS.filter((field) => isMissing(reviewData[field.key])).length
        : 0;
    const liveStartTime = timeMode === "duration" ? durationStartTime : parkingStartTime;
    const liveEndTime = timeMode === "duration"
        ? toLocalDateTimeValue(new Date(new Date(durationStartTime).getTime() + Number(durationMinutes) * 60000))
        : parkingEndTime;
    const liveEstimate = getLiveEstimate(reviewData, liveStartTime, liveEndTime);
    const maximumFeeMissing = isMissing(reviewData?.maximumFeeYen);
    const hasAnyReadFee = reviewData && [reviewData.dayPriceYen, reviewData.nightPriceYen, reviewData.maximumFeeYen]
        .some((value) => !isMissing(value));
    const rateRows = reviewData ? [
        {
            key: "day",
            label: "昼料金",
            duration: reviewData.dayIntervalMinutes,
            amount: reviewData.dayPriceYen,
            period: reviewData.dayStartTime && reviewData.dayEndTime
                ? `${reviewData.dayStartTime}〜${reviewData.dayEndTime}`
                : "",
        },
        {
            key: "night",
            label: "夜料金",
            duration: reviewData.nightIntervalMinutes,
            amount: reviewData.nightPriceYen,
            period: reviewData.nightStartTime && reviewData.nightEndTime
                ? `${reviewData.nightStartTime}〜${reviewData.nightEndTime}`
                : "",
        },
        {
            key: "maximum",
            label: reviewData.maximumFeePeriod || "最大料金",
            duration: "",
            amount: reviewData.maximumFeeYen,
            period: "",
        },
    ].filter((row) => !isMissing(row.amount)) : [];
    const estimatedParkingMinutes = Math.max(0, Math.round(
        (new Date(liveEndTime).getTime() - new Date(liveStartTime).getTime()) / 60000
    ));

    return (
        <section className="photo-ocr-page">
            {pageStep === "capture" && (
                <section className="photo-card">
                    <input ref={cameraInputRef} id="parking-fee-camera" aria-label="端末標準カメラから撮影" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileChange} disabled={isAnalyzing} />
                    <input ref={albumInputRef} id="parking-fee-album" aria-label="端末の写真から選択" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={isAnalyzing} />
                    <div className="button-group">
                        <button type="button" className="btn-secondary" onClick={() => albumInputRef.current?.click()} disabled={isAnalyzing}>写真から選ぶ</button>
                    </div>
                    {cameraError && (
                        <div className="camera-error-message" role="alert">
                            <p>{cameraError}</p>
                            <button type="button" className="btn-secondary" onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>端末標準カメラを開く</button>
                        </div>
                    )}
                    {cameraStream && (
                        <div className="live-camera-panel">
                            <div className="live-camera-frame">
                                <video ref={videoRef} className="live-camera-preview" autoPlay playsInline muted aria-label="カメラのライブ映像" />
                                <div className="live-camera-guide" aria-hidden="true" />
                            </div>
                            <button type="button" onClick={handleCapturePhoto}>撮影して読み取る</button>
                        </div>
                    )}
                    <p className="help-message">PNG、JPEG、WebP形式、10MB以下</p>
                    {message && <p className="error-message" role="alert">{message}</p>}
                </section>
            )}

            {pageStep === "analyzing" && (
                <section className="ocr-processing-page" role="status" aria-live="polite">
                    {previewUrl && <img src={previewUrl} alt="解析中の料金表" />}
                    <p>{isAnalyzing ? "料金表を読み取っています..." : "読み取り結果を整理しています..."}</p>
                </section>
            )}

            {pageStep === "result" && reviewData && (
                <section className="ocr-result-page">
                    <div className="ocr-step-header">
                        <button type="button" className="ocr-step-close" onClick={handleRemoveImage} aria-label="撮影画面へ戻る">×</button>
                        <h2>読み取り結果</h2>
                        <span />
                    </div>
                    <div className="ocr-result-content">
                        <h3>料金を読み取りました</h3>
                        {rateRows.length > 0 ? (
                            <div className="ocr-rate-list">
                                {rateRows.map((row) => (
                                    <div className="ocr-rate-row" key={row.key}>
                                        <div>
                                            <b>{row.label}</b>
                                            {row.period && <small>{row.period}</small>}
                                        </div>
                                        <span>{row.duration ? `${row.duration}分` : ""}</span>
                                        <strong>¥{Number(row.amount).toLocaleString()}</strong>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="ocr-reading-warning" role="status">料金を読み取れませんでした。料金表を撮り直すか、下の修正から入力してください。</p>
                        )}

                        <button type="button" className="ocr-edit-link" onClick={() => setIsEditingRates((editing) => !editing)}>
                            {isEditingRates ? "修正を閉じる" : "料金を読み取った内容を修正する"}
                        </button>

                        {isEditingRates && (
                            <div className="ocr-rate-editor">
                                {missingCount > 0 && <strong className="ocr-missing-count">未読取 {missingCount}項目</strong>}
                                {["昼料金", "夜料金", "最大料金"].map((group) => (
                                    <fieldset className="ocr-review-group" key={group}>
                                        <legend>{group}</legend>
                                        <div className="ocr-review-grid">
                                            {REVIEW_FIELDS.filter((field) => field.group === group).map((field) => {
                                                const missing = !field.optional && isMissing(reviewData[field.key]);
                                                return (
                                                    <label className={`ocr-review-field ${missing ? "is-missing" : ""}`} key={field.key}>
                                                        <span>{field.label}{missing && <b>未読取・入力してください</b>}</span>
                                                        <input type={field.type} min={field.type === "number" ? 0 : undefined} step="1" value={reviewData[field.key] ?? ""} onChange={(event) => handleFieldChange(field.key, event.target.value, field.type)} placeholder={field.optional ? "任意" : "未読取"} aria-invalid={missing} />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                ))}
                                {rawText && <details className="ocr-raw-text"><summary>OCRで抽出した文字列</summary><pre>{rawText}</pre></details>}
                            </div>
                        )}
                    </div>
                    {message && <p className="error-message" role="alert">{message}</p>}
                    <button type="button" className="ocr-primary-action" onClick={() => { setMessage(""); setPageStep("time"); }}>
                        この料金で計算する
                    </button>
                </section>
            )}

            {pageStep === "time" && reviewData && (
                <section className="parking-time-page">
                    <div className="ocr-step-header">
                        <button type="button" className="ocr-step-close" onClick={() => setPageStep("result")} aria-label="読み取り結果へ戻る">‹</button>
                        <h2>駐車時間の入力</h2>
                        <span />
                    </div>
                    <div className="parking-time-content">
                        <div className="parking-time-segmented" role="group" aria-label="駐車時間の指定方法">
                            <button type="button" className={timeMode === "specified" ? "selected" : ""} onClick={() => setTimeMode("specified")}>時間で指定</button>
                            <button type="button" className={timeMode === "duration" ? "selected" : ""} onClick={() => { setDurationStartTime(toLocalDateTimeValue(new Date())); setTimeMode("duration"); }}>今からの時間</button>
                        </div>

                        {timeMode === "specified" ? (
                            <div className="parking-time-inputs">
                                <label>入庫時間<input type="datetime-local" value={parkingStartTime} onChange={(event) => { setParkingStartTime(event.target.value); setCalculationResult(null); }} /></label>
                                <label>出庫予定時間<input type="datetime-local" value={parkingEndTime} onChange={(event) => { setParkingEndTime(event.target.value); setCalculationResult(null); }} /></label>
                            </div>
                        ) : (
                            <div className="parking-time-inputs">
                                <label>これから駐車する時間（分）<input type="number" min="1" value={durationMinutes} onChange={(event) => { setDurationMinutes(event.target.value); setCalculationResult(null); }} /></label>
                                <p className="help-message">開始時刻は現在時刻に設定します。</p>
                            </div>
                        )}

                        <div className="parking-duration-summary">
                            <span>駐車時間</span>
                            <strong>{Math.floor(estimatedParkingMinutes / 60)}時間{estimatedParkingMinutes % 60}分</strong>
                        </div>

                        {message && <p className="error-message" role="alert">{message}</p>}
                        {liveEstimate && !liveEstimate.error && (
                            <section className="ocr-live-estimate" aria-live="polite">
                                <h3>料金の目安</h3>
                                {liveEstimate.dayMinutes > 0 && <p>昼料金：{liveEstimate.dayFee.toLocaleString()}円</p>}
                                {liveEstimate.nightMinutes > 0 && <p>夜料金：{liveEstimate.nightFee.toLocaleString()}円</p>}
                                {maximumFeeMissing && <p className="warning-message">最大料金未読取のため、上限なしの概算です。</p>}
                                <strong>予想料金：{liveEstimate.totalFee.toLocaleString()}円</strong>
                            </section>
                        )}

                        <form onSubmit={handleCalculateFee}>
                            <button type="submit" className="ocr-primary-action">料金を計算する</button>
                        </form>

                        {calculationResult && savedRule && (
                            <section className="result-card ocr-calculation-result" aria-live="polite">
                                <h3>計算結果</h3>
                                {calculationResult.dayMinutes > 0 && <p>昼料金：{calculationResult.dayFee.toLocaleString()}円（{calculationResult.dayMinutes}分）</p>}
                                {calculationResult.nightMinutes > 0 && <p>夜料金：{calculationResult.nightFee.toLocaleString()}円（{calculationResult.nightMinutes}分）</p>}
                                {calculationResult.maximumFeeApplied && <p className="notice-message">最大料金を適用しました。</p>}
                                <p className="ocr-total-fee">予想料金：{calculationResult.totalFee.toLocaleString()}円</p>
                                <button type="button" className="btn-secondary" onClick={() => navigate("/calculator", { state: { presetRule: savedRule, startTime: parkingStartTime, endTime: parkingEndTime } })}>計算画面で詳細を見る</button>
                            </section>
                        )}
                    </div>
                </section>
            )}
        </section>
    );
}