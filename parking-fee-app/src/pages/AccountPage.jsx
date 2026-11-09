import { useLocation, useNavigate } from "react-router-dom";

const ACCOUNT_ITEMS = ["お名前", "生年月日", "チケット使用履歴", "チケット一覧", "お問い合わせ"];

export function AccountPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username || "ゲスト";

    return (
        <section className="account-page" aria-labelledby="account-title">
            <button className="account-close" type="button" onClick={() => navigate(-1)} aria-label="戻る">×</button>
            <h2 id="account-title">アカウント</h2>

            <div className="account-profile-card">
                <p className="account-user-name"><strong>{username}</strong><span>さん</span></p>
                <p className="account-plan-name">フリープラン</p>
                <button type="button" onClick={() => navigate("/premium")}>プレミアムプランに加入</button>
            </div>

            <nav className="account-menu" aria-label="アカウントメニュー">
                {ACCOUNT_ITEMS.map((item) => (
                    <button type="button" key={item} onClick={() => {}}>
                        <span>{item}</span><span aria-hidden="true">›</span>
                    </button>
                ))}
            </nav>
        </section>
    );
}
