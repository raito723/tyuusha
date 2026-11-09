import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const BENEFIT_SLIDES = [
    { title: "駐車料金の割引", note: "（最大20%OFF）", kind: "discount" },
    { title: "広告の非表示", note: "（快適にご利用いただけます）", kind: "ads" },
    { title: "駐車券のプレゼント", note: "（毎月１枚 / ◯◯駐車場限定）", kind: "ticket" },
];

export function PremiumDetailPage() {
    const navigate = useNavigate();
    const [activeSlide, setActiveSlide] = useState(0);
    const touchStartX = useRef(null);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveSlide((current) => (current + 1) % BENEFIT_SLIDES.length);
        }, 4000);
        return () => window.clearInterval(timer);
    }, []);

    const changeSlide = (direction) => {
        setActiveSlide((current) => (current + direction + BENEFIT_SLIDES.length) % BENEFIT_SLIDES.length);
    };

    return (
        <section className="premium-detail-page" aria-label="プレミアムプランの詳細">
            <button className="premium-detail-close" type="button" onClick={() => navigate(-1)} aria-label="戻る">×</button>

            <div className="premium-detail-trial-banner">
                <span>初回限定<br />1年プランなら</span>
                <strong>1ヶ月無料<sup>※1</sup></strong>
                <small>※1ヶ月無料は初回登録時のみ適用されます</small>
                <i className="trial-spark trial-spark-one">☆</i>
                <i className="trial-spark trial-spark-two">◇</i>
            </div>

            <div className="premium-detail-carousel" onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }} onTouchEnd={(event) => {
                if (touchStartX.current === null) return;
                const distance = event.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(distance) > 40) changeSlide(distance < 0 ? 1 : -1);
                touchStartX.current = null;
            }}>
                <div className="premium-detail-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
                    {BENEFIT_SLIDES.map((slide) => (
                        <section className="premium-detail-benefit" key={slide.kind} aria-label={slide.title}>
                            <h2>{slide.title}<br /><span>{slide.note}</span></h2>
                            <div className={`premium-detail-phone phone-${slide.kind}`} aria-label={`${slide.title}のアプリ画面イメージ`}>
                                <div className="phone-notch" />
                                <div className="phone-screen">
                                    {slide.kind === "discount" ? <>
                                        <b>駐車料金</b><div className="phone-card"><small>お支払い金額</small><strong>¥800</strong><small>（割引後）</small></div>
                                        <small>入庫時間</small><div className="phone-card phone-time">30分〜12<br />10:30〜15:30</div>
                                        <div className="phone-button">クーポンを使う</div><small>使いたい駐車券を選びます</small>
                                        <div className="phone-coupon">● 20%OFF　最大¥500割引</div><div className="phone-button phone-bottom">このクーポンを使う</div>
                                    </> : slide.kind === "ads" ? <>
                                        <b>パーキング</b><div className="phone-tabs">周辺　　料金　　地図</div><small>駐車場</small>
                                        <div className="phone-card phone-time">30分　　¥1,000<br />60分　　¥1,800</div><small>駐車料金を確認</small>
                                        <div className="phone-button">料金を計算する</div><div className="phone-card">広告なしで快適に利用</div>
                                    </> : <>
                                        <b>駐車券</b><div className="phone-card"><small>今月の駐車券</small><strong>¥0</strong><small>プレゼント中</small></div>
                                        <small>対象駐車場</small><div className="phone-card phone-time">◯◯駐車場<br />いつでもご利用可能</div>
                                        <div className="phone-button">チケットを使う</div><div className="phone-card">利用可能な駐車券</div>
                                    </>}
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            <div className="premium-detail-pagination" aria-label="特典のスライド選択">
                {BENEFIT_SLIDES.map((slide, index) => <button key={slide.kind} type="button" aria-label={`${index + 1}枚目: ${slide.title}`} aria-current={activeSlide === index ? "true" : undefined} onClick={() => setActiveSlide(index)} />)}
            </div>

            <section className="premium-plan-picker">
                <h2>プレミアムプランを選択</h2>
                <label className="premium-plan-option premium-plan-annual">
                    <input type="radio" name="premium-plan" defaultChecked />
                    <span className="plan-main"><strong>¥3,780/年</strong><small>1年プラン</small></span>
                    <span className="plan-side"><b>1ヶ月無料</b><small>¥315/月</small></span>
                </label>
                <label className="premium-plan-option premium-plan-monthly">
                    <input type="radio" name="premium-plan" />
                    <span className="plan-main"><strong>¥480/月</strong><small>1ヶ月プラン</small></span>
                    <span className="plan-side"><small>¥480/月</small></span>
                </label>
                <button type="button" className="premium-detail-join" onClick={() => navigate("/premium/join")}>プレミアムプランに加入する</button>
            </section>
        </section>
    );
}
