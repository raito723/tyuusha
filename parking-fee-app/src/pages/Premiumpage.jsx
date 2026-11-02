import { useNavigate } from "react-router-dom";

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 12.5L10 17.5L19 7.5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const BENEFITS = [
    { title: "駐車料金の割引", note: "（最大20%OFF）" },
    { title: "駐車券のプレゼント", note: "（毎月１枚 / ◯◯駐車場限定）" },
    { title: "広告の非表示", note: "（快適にご利用いただけます）" },
];

export function PremiumPage() {
    const navigate = useNavigate();

    const handleJoin = () => {
        // TODO: 決済・加入処理につなぐ
        navigate("/premium/join");
    };

    const handleDetail = () => {
        // TODO: 詳細ページができたらパスを合わせる
        navigate("/premium/detail");
    };

    return (
        <section className="premium-page" aria-labelledby="premium-title">
            <div className="premium-decorations" aria-hidden="true">
                <span className="premium-decoration premium-decoration-triangle" />
                <span className="premium-decoration premium-decoration-circle" />
                <span className="premium-decoration premium-decoration-square" />
                <span className="premium-decoration premium-decoration-circle-small" />
                <span className="premium-decoration premium-decoration-triangle-small" />
                <span className="premium-decoration premium-decoration-square-small" />
            </div>
            <div className="premium-hero">
                <p className="premium-catch">もっとお得に＆もっと便利にするなら</p>
                <h2 id="premium-title" className="premium-title">プレミアムプラン</h2>
                <p className="premium-subtitle">始めてみませんか？</p>
            </div>

            <div className="premium-price" aria-label="月額480円（税込）、初めての方は1ヶ月無料">
                <div className="premium-price-monthly">
                    <span className="premium-price-label">月額</span>
                    <strong className="premium-price-amount">480円</strong>
                    <small className="premium-price-tax">（税込）</small>
                </div>
                <p className="premium-free-trial">初めての方は<strong>1ヶ月無料</strong></p>
            </div>

            <ul className="premium-benefits">
                {BENEFITS.map((benefit) => (
                    <li key={benefit.title} className="premium-benefit">
                        <span className="premium-benefit-check"><CheckIcon /></span>
                        <div className="premium-benefit-text">
                            <strong>{benefit.title}</strong>
                            <span>{benefit.note}</span>
                        </div>
                    </li>
                ))}
            </ul>

            <div className="premium-actions">
                <button type="button" className="premium-join-button" onClick={handleJoin}>
                    プレミアムプランに加入する
                </button>
                <button type="button" className="premium-detail-button" onClick={handleDetail}>
                    プレミアムプランの詳細を見る
                </button>
            </div>
        </section>
    );
}