import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateParkingFee } from "../lib/feeCalculator";
import { getParkingRules, saveParkingRules } from "../lib/parkingRules";

const REVIEW_FIELDS = [
    { key: "dayStartTime", label: "開始時刻", type: "time" },
    { key: "dayEndTime", label: "終了時刻", type: "time" },
    { key: "dayIntervalMinutes", label: "単位時間（分）", type: "number" },
    { key: "dayPriceYen", label: "単位料金（円）", type: "number" },
    { key: "nightStartTime", label: "開始時刻", type: "time" },
    { key: "nightEndTime", label: "終了時刻", type: "time" },
    { key: "nightIntervalMinutes", label: "単位時間（分）", type: "number" },
    { key: "nightPriceYen", label: "単位料金（円）", type: "number" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CAMERA_GUIDE_WIDTH = 0.86;
const CAMERA_GUIDE_HEIGHT = 0.6;

function isMissing(value) {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function getLiveEstimate(rule, startTime, endTime) {
    if (!rule || !startTime || !endTime) return null;

    return calculateParkingFee({
        startTime,
        endTime,
        dayStartTime: rule.dayStartTime,
        dayEndTime: rule.dayEndTime,
        dayIntervalMinutes: Number(rule.dayIntervalMinutes) || 30,
        dayPrice: Number(rule.dayPriceYen) || 0,
        nightStartTime: rule.nightStartTime,
        nightEndTime: rule.nightEndTime,
        nightIntervalMinutes: Number(rule.nightIntervalMinutes) || 60,
        nightPrice: Number(rule.nightPriceYen) || 0,
        maximumFee: rule.maximumFeeYen === "" ? null : rule.maximumFeeYen,
        maximumFeeAllDay: rule.maximumFeeAllDay,
        maximumFeeDay: rule.maximumFeeDayYen,
        maximumFeeNight: rule.maximumFeeNightYen,
        maximumFeeRecurring: rule.maximumFeeRecurring,
        maximumFeePeriodHours: Number(rule.maximumFeePeriodHours) || 24,
        allDayRate: rule.allDayRate,
        weekdayRates: rule.weekdayRates,
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
            setReviewData({
                maximumFeeRecurring: false,
                maximumFeeAllDay: true,
                allDayRate: false,
                maximumFeePeriodHours: 24,
                weekdayRates: {},
                ...result.rule,
            });
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

    function handleWeekdayRateChange(weekday, period, value) {
        setReviewData((current) => ({
            ...current,
            weekdayRates: {
                ...(current.weekdayRates || {}),
                [weekday]: {
                    ...(current.weekdayRates?.[weekday] || {}),
                    [period === "day" ? "dayPrice" : "nightPrice"]: value === "" ? null : Number(value),
                },
            },
        }));
        setCalculationResult(null);
    }

    function handleRemoveImage() {
        setSelectedFile(null);
        setPreviewUrl("");
        setReviewData(null);
        setRawText("");
        setCalculationResult(null);
        setSavedRule(null);
        setMessage("");
        setPageStep("capture");
    }

    function handleCalculateFee(event) {
        event.preventDefault();
        const numericFields = ["dayIntervalMinutes", "dayPriceYen", "nightIntervalMinutes", "nightPriceYen", "maximumFeeYen", "maximumFeeDayYen", "maximumFeeNightYen"];
        const invalidNumber = numericFields.some((key) => !isMissing(reviewData[key])
            && (!Number.isFinite(Number(reviewData[key])) || Number(reviewData[key]) < 0));
        const requiredRateFields = reviewData.allDayRate
            ? ["dayIntervalMinutes", "dayPriceYen"]
            : ["dayIntervalMinutes", "dayPriceYen", "nightIntervalMinutes", "nightPriceYen"];
        const missingRateNumber = requiredRateFields.some((key) => isMissing(reviewData[key]));
        const invalidInterval = requiredRateFields
            .filter((key) => key.endsWith("IntervalMinutes"))
            .some((key) => Number(reviewData[key]) <= 0);
        if (missingRateNumber) {
            setMessage("計算できません。料金と単位時間の数値を入力してください。");
            return;
        }
        if (invalidNumber || invalidInterval) {
            setMessage("料金は0以上、単位時間は1以上の数値を入力してください。");
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
            dayIntervalMinutes: Number(reviewData.dayIntervalMinutes) || 30,
            dayPrice: Number(reviewData.dayPriceYen) || 0,
            nightStartTime: reviewData.nightStartTime,
            nightEndTime: reviewData.nightEndTime,
            nightIntervalMinutes: Number(reviewData.nightIntervalMinutes) || 60,
            nightPrice: Number(reviewData.nightPriceYen) || 0,
            maximumFee: reviewData.maximumFeeYen === "" ? null : reviewData.maximumFeeYen,
            maximumFeeAllDay: reviewData.maximumFeeAllDay,
            maximumFeeDay: reviewData.maximumFeeDayYen,
            maximumFeeNight: reviewData.maximumFeeNightYen,
            maximumFeeRecurring: reviewData.maximumFeeRecurring,
            maximumFeePeriodHours: Number(reviewData.maximumFeePeriodHours) || 24,
            allDayRate: reviewData.allDayRate,
            weekdayRates: reviewData.weekdayRates,
        });
        if (calculation.error) {
            setMessage(calculation.error);
            return;
        }

        const rule = {
            ...reviewData,
            id: savedRule?.id || crypto.randomUUID(),
            name: "料金表から読み取ったルール",
            dayPrice: Number(reviewData.dayPriceYen) || 0,
            nightPrice: Number(reviewData.nightPriceYen) || 0,
            maximumFee: reviewData.maximumFeeYen === "" ? null : reviewData.maximumFeeYen,
            maximumFeeDay: reviewData.maximumFeeDayYen,
            maximumFeeNight: reviewData.maximumFeeNightYen,
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

    const liveStartTime = timeMode === "duration" ? durationStartTime : parkingStartTime;
    const liveEndTime = timeMode === "duration"
        ? toLocalDateTimeValue(new Date(new Date(durationStartTime).getTime() + Number(durationMinutes) * 60000))
        : parkingEndTime;
    const liveEstimate = getLiveEstimate(reviewData, liveStartTime, liveEndTime);
    const maximumFeeMissing = reviewData && (reviewData.maximumFeeAllDay
        ? isMissing(reviewData.maximumFeeYen)
        : isMissing(reviewData.maximumFeeDayYen) && isMissing(reviewData.maximumFeeNightYen));
    const rateRows = reviewData ? [
        {
            key: "day",
            label: reviewData.allDayRate ? "終日料金" : "昼料金",
            duration: reviewData.dayIntervalMinutes,
            amount: reviewData.dayPriceYen,
            period: reviewData.dayStartTime && reviewData.dayEndTime
                ? `${reviewData.dayStartTime}〜${reviewData.dayEndTime}`
                : "",
        },
        ...(!reviewData.allDayRate ? [{
            key: "night",
            label: "夜料金",
            duration: reviewData.nightIntervalMinutes,
            amount: reviewData.nightPriceYen,
            period: reviewData.nightStartTime && reviewData.nightEndTime
                ? `${reviewData.nightStartTime}〜${reviewData.nightEndTime}`
                : "",
        }] : []),
        ...(reviewData.maximumFeeAllDay
            ? [{ key: "maximum", label: reviewData.maximumFeePeriod || "最大料金", duration: "", amount: reviewData.maximumFeeYen, period: "" }]
            : [
                { key: "maximum-day", label: "昼間最大料金", duration: "", amount: reviewData.maximumFeeDayYen, period: "" },
                { key: "maximum-night", label: "夜間最大料金", duration: "", amount: reviewData.maximumFeeNightYen, period: "" },
            ]),
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
                    <span className="ocr-loading-spinner" aria-hidden="true" />
                    <p>AIが画像を読み込んでいます…</p>
                    <p>※この処理には長時間かかる場合があります。</p>
                </section>
            )}

            {pageStep === "result" && reviewData && (
                <section className="ocr-result-page">
                    <div className="ocr-step-header">
                        <button type="button" className="ocr-step-close" onClick={handleRemoveImage} aria-label="撮影画面へ戻る">×</button>
                        <h2>読み取り結果</h2>
                        <span />
                    </div>
                    {previewUrl && <img className="ocr-result-image" src={previewUrl} alt="読み取りに使用した料金表" />}
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
                            <p className="ocr-reading-warning" role="status">料金を読み取れませんでした。料金表を撮り直すか、下の入力欄から入力してください。</p>
                        )}

                        <div className="ocr-rate-editor">
                            <fieldset className="ocr-review-group">
                                <legend>基本料金</legend>
                                <label className="ocr-toggle-row">
                                    <input type="checkbox" checked={Boolean(reviewData.allDayRate)} onChange={(event) => setReviewData((current) => ({ ...current, allDayRate: event.target.checked }))} />
                                    終日同じ料金
                                </label>
                                <div className="ocr-review-grid">
                                    {(reviewData.allDayRate
                                        ? REVIEW_FIELDS.filter((field) => field.key === "dayIntervalMinutes" || field.key === "dayPriceYen")
                                        : REVIEW_FIELDS.filter((field) => field.key.startsWith("day"))
                                    ).map((field) => (
                                        <label className="ocr-review-field" key={field.key}>
                                            <span>{reviewData.allDayRate && field.key === "dayPriceYen" ? "終日料金（円）" : field.label}</span>
                                            <input type={field.type} min={field.type === "number" ? 0 : undefined} step="1" value={reviewData[field.key] ?? ""} onChange={(event) => handleFieldChange(field.key, event.target.value, field.type)} placeholder="未入力" />
                                        </label>
                                    ))}
                                    {!reviewData.allDayRate && REVIEW_FIELDS.filter((field) => field.key.startsWith("night")).map((field) => (
                                        <label className="ocr-review-field" key={field.key}>
                                            <span>{field.label}</span>
                                            <input type={field.type} min={field.type === "number" ? 0 : undefined} step="1" value={reviewData[field.key] ?? ""} onChange={(event) => handleFieldChange(field.key, event.target.value, field.type)} placeholder="未入力" />
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <fieldset className="ocr-review-group">
                                <legend>最大料金</legend>
                                <label className="ocr-toggle-row">
                                    <input type="checkbox" checked={Boolean(reviewData.maximumFeeRecurring)} onChange={(event) => setReviewData((current) => ({ ...current, maximumFeeRecurring: event.target.checked }))} />
                                    最大料金を繰り返し適用
                                </label>
                                {reviewData.maximumFeeRecurring && (
                                    <label className="ocr-review-field ocr-max-period">
                                        <span>繰り返し期間（時間）</span>
                                        <input type="number" min="1" value={reviewData.maximumFeePeriodHours ?? 24} onChange={(event) => handleFieldChange("maximumFeePeriodHours", event.target.value, "number")} />
                                    </label>
                                )}
                                <label className="ocr-toggle-row">
                                    <input type="checkbox" checked={Boolean(reviewData.maximumFeeAllDay)} onChange={(event) => setReviewData((current) => ({ ...current, maximumFeeAllDay: event.target.checked }))} />
                                    最大料金は終日共通
                                </label>
                                <div className="ocr-review-grid">
                                    {(reviewData.maximumFeeAllDay
                                        ? [{ key: "maximumFeeYen", label: "最大料金（円）" }]
                                        : [{ key: "maximumFeeDayYen", label: "昼間の最大料金（円）" }, { key: "maximumFeeNightYen", label: "夜間の最大料金（円）" }]
                                    ).map((field) => (
                                        <label className="ocr-review-field" key={field.key}>
                                            <span>{field.label}</span>
                                            <input type="number" min="0" value={reviewData[field.key] ?? ""} onChange={(event) => handleFieldChange(field.key, event.target.value, "number")} placeholder="上限なし" />
                                        </label>
                                    ))}
                                    <label className="ocr-review-field">
                                        <span>最大料金の適用条件</span>
                                        <input type="text" value={reviewData.maximumFeePeriod ?? ""} onChange={(event) => handleFieldChange("maximumFeePeriod", event.target.value, "text")} placeholder="例：入庫後24時間" />
                                    </label>
                                </div>
                            </fieldset>

                            <fieldset className="ocr-review-group">
                                <legend>曜日別料金（空欄は基本料金）</legend>
                                <div className="ocr-weekday-rate-list">
                                    {WEEKDAYS.map((weekday, index) => (
                                        <div className="ocr-weekday-rate-row" key={weekday}>
                                            <b>{weekday}曜日</b>
                                            <label>昼<input type="number" min="0" value={reviewData.weekdayRates?.[index]?.dayPrice ?? ""} onChange={(event) => handleWeekdayRateChange(index, "day", event.target.value)} placeholder="基本料金" /></label>
                                            {!reviewData.allDayRate && <label>夜<input type="number" min="0" value={reviewData.weekdayRates?.[index]?.nightPrice ?? ""} onChange={(event) => handleWeekdayRateChange(index, "night", event.target.value)} placeholder="基本料金" /></label>}
                                        </div>
                                    ))}
                                </div>
                            </fieldset>
                            {rawText && <details className="ocr-raw-text"><summary>AIが読み取った文字</summary><pre>{rawText}</pre></details>}
                        </div>
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
