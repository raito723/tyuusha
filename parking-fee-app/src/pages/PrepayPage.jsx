import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPrepayPricing } from "../lib/prepayPricing";

const COUPON_MINIMUM_FEE = 1000;
const COUPON_DISCOUNT_RATE = 0.2;
const PAYMENT_METHODS = [
    { id: "credit", label: "クレジットカード", detail: "Visa・Mastercard など", icon: "カード" },
    { id: "paypay", label: "PayPay", detail: "PayPayアプリで支払い", icon: "Pay" },
    { id: "apple-pay", label: "Apple Pay", detail: "対応端末で利用できます", icon: "Apple" },
];

function formatTime(value) {
    if (!value) return "--:--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--";
    return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) return `${hours}時間${remainingMinutes}分`;
    if (hours > 0) return `${hours}時間`;
    return `${remainingMinutes}分`;
}

export function PrepayPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const prepay = location.state;
    const [activeSheet, setActiveSheet] = useState("");
    const [couponSelected, setCouponSelected] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("");
    const [message, setMessage] = useState("");

    const { amount, discount, total, couponEligible } = getPrepayPricing(
        prepay?.amount,
        couponSelected,
        COUPON_MINIMUM_FEE,
        COUPON_DISCOUNT_RATE,
    );
    const durationMinutes = Number.isFinite(prepay?.durationMinutes)
        ? Math.max(0, prepay.durationMinutes)
        : 0;
    const selectedMethod = PAYMENT_METHODS.find((method) => method.id === paymentMethod);

    function handleApplyCoupon() {
        if (couponEligible) setCouponSelected(true);
        setActiveSheet("");
        setMessage("");
    }

    function handleSelectPaymentMethod(methodId) {
        setPaymentMethod(methodId);
        setActiveSheet("");
        setMessage("");
    }

    function handlePaymentSubmit() {
        if (amount === null) {
            setMessage("料金を確認できません。料金計算画面からやり直してください。");
            return;
        }
        if (!paymentMethod) {
            setMessage("支払い方法を選択してください。");
            setActiveSheet("payment");
            return;
        }
        setMessage("決済機能はまだ接続されていません。料金の請求は行われていません。");
    }

    return (
        <section className="prepay-page" aria-labelledby="prepay-title">
            <div className="prepay-header">
                <button type="button" className="prepay-back" onClick={() => navigate(-1)} aria-label="前の画面に戻る">‹</button>
                <h2 id="prepay-title">事前払い</h2>
                <span />
            </div>

            <div className="prepay-content">
                <section className="prepay-price-card" aria-label="駐車料金">
                    <h3>あなたの駐車料金</h3>
                    <strong>{total === null ? "—" : `¥${total.toLocaleString()}`}</strong>
                    {couponSelected && couponEligible && (
                        <p className="prepay-applied-coupon">クーポン適用済み（−¥{discount.toLocaleString()}）</p>
                    )}
                    <p>（{formatDuration(durationMinutes)}）</p>
                </section>

                <section className="prepay-entry-section">
                    <h3>入庫時間</h3>
                    <div className="prepay-entry-card">
                        <strong>{formatDuration(durationMinutes)}</strong>
                        <span>{formatTime(prepay?.startTime)}〜{formatTime(prepay?.endTime)}</span>
                    </div>
                </section>

                <section className="prepay-option-section">
                    <h3>クーポン</h3>
                    <button type="button" className="prepay-option-button prepay-coupon-button" onClick={() => setActiveSheet("coupon")}>
                        <span>{couponSelected ? "20%オフクーポンを適用中" : "クーポンを見る"}</span>
                        <span aria-hidden="true">›</span>
                    </button>
                    <p className="prepay-option-note">
                        {couponSelected ? `−¥${discount.toLocaleString()} 適用中` : "プレミアムプランのクーポンを確認できます"}
                    </p>
                </section>

                <section className="prepay-option-section">
                    <h3>支払い方法</h3>
                    <button type="button" className="prepay-option-button" onClick={() => setActiveSheet("payment")}>
                        <span>{selectedMethod?.label || "支払い方法を選択する"}</span>
                        <span aria-hidden="true">›</span>
                    </button>
                    {selectedMethod && <p className="prepay-option-note">{selectedMethod.detail}</p>}
                </section>

                <section className="prepay-total-row" aria-live="polite">
                    <span>{couponSelected && couponEligible
                        ? `¥${amount.toLocaleString()} − クーポン`
                        : "お支払い合計"}</span>
                    <strong>{total === null ? "—" : `¥${total.toLocaleString()}`}</strong>
                </section>

                {message && <p className="prepay-message" role="status">{message}</p>}
                <p className="prepay-disclaimer">この画面は支払い内容の確認用です。決済機能は未接続のため、ボタンを押しても請求は行われません。</p>
                <button type="button" className="prepay-submit" onClick={handlePaymentSubmit}>支払い内容を確認する</button>
            </div>

            {activeSheet && (
                <div className="prepay-sheet-backdrop" onClick={() => setActiveSheet("")}>
                    <section
                        className="prepay-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="prepay-sheet-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="prepay-sheet-handle" aria-hidden="true" />
                        <h3 id="prepay-sheet-title">{activeSheet === "coupon" ? "クーポン" : "支払い方法"}</h3>
                        {activeSheet === "coupon" ? (
                            <>
                                <label className={`prepay-coupon-choice${couponEligible ? "" : " is-disabled"}`}>
                                    <input
                                        type="radio"
                                        name="prepay-coupon"
                                        checked={couponSelected && couponEligible}
                                        disabled={!couponEligible}
                                        onChange={() => setCouponSelected(true)}
                                    />
                                    <span className="prepay-coupon-discount">20%</span>
                                    <span className="prepay-coupon-description">
                                        <strong>【プレミアムプラン】20%オフクーポン</strong>
                                        <small>{couponEligible
                                            ? `¥${Math.floor(amount * COUPON_DISCOUNT_RATE).toLocaleString()}割引`
                                            : `¥${COUPON_MINIMUM_FEE.toLocaleString()}以上の支払いで使用可能`}</small>
                                    </span>
                                </label>
                                <label className="prepay-coupon-choice">
                                    <input
                                        type="radio"
                                        name="prepay-coupon"
                                        checked={!couponSelected || !couponEligible}
                                        onChange={() => setCouponSelected(false)}
                                    />
                                    <span className="prepay-coupon-description"><strong>クーポンを使用しない</strong></span>
                                </label>
                                <button type="button" className="prepay-sheet-apply" onClick={handleApplyCoupon}>
                                    {couponSelected && couponEligible ? "20%オフクーポンを適用" : "クーポンを適用"}
                                </button>
                            </>
                        ) : (
                            <div className="prepay-payment-list">
                                {PAYMENT_METHODS.map((method) => (
                                    <button
                                        type="button"
                                        className={`prepay-payment-choice${paymentMethod === method.id ? " is-selected" : ""}`}
                                        key={method.id}
                                        onClick={() => handleSelectPaymentMethod(method.id)}
                                    >
                                        <span className="prepay-payment-icon" aria-hidden="true">{method.icon}</span>
                                        <span><strong>{method.label}</strong><small>{method.detail}</small></span>
                                        <span className="prepay-payment-radio" aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <button type="button" className="prepay-sheet-cancel" onClick={() => setActiveSheet("")}>閉じる</button>
                    </section>
                </div>
            )}
        </section>
    );
}
