import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function PremiumJoinPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [message, setMessage] = useState("");
    const passwordsMatch = password.length > 0 && password === passwordConfirmation;

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!passwordsMatch) {
            setMessage("パスワードが一致していません。もう一度ご確認ください。");
            return;
        }
        navigate("/account", { state: { username: username.trim() } });
    };

    return (
        <section className="premium-join-page" aria-labelledby="premium-join-title">
            <button className="premium-join-back" type="button" onClick={() => navigate(-1)} aria-label="戻る">×</button>
            <div className="premium-join-heading">
                <p>プレミアムプラン</p>
                <h2 id="premium-join-title">プレミアムプランへ加入</h2>
                <span>ユーザー名とパスワードを入力してください</span>
            </div>

            <form className="premium-join-form" onSubmit={handleSubmit}>
                <label>
                    <span>ユーザー名</span>
                    <input autoComplete="username" name="username" type="text" value={username} onChange={(event) => { setUsername(event.target.value); setMessage(""); }} placeholder="ユーザー名を入力" required />
                </label>
                <label>
                    <span>パスワード</span>
                    <input autoComplete="new-password" name="password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage(""); }} placeholder="パスワードを入力" required />
                </label>
                <label>
                    <span>パスワードの確認</span>
                    <input autoComplete="new-password" name="password-confirmation" type="password" value={passwordConfirmation} onChange={(event) => { setPasswordConfirmation(event.target.value); setMessage(""); }} placeholder="もう一度入力" required aria-invalid={passwordConfirmation.length > 0 && !passwordsMatch} />
                </label>
                {passwordConfirmation.length > 0 && (
                    <p className={`premium-password-match ${passwordsMatch ? "is-matched" : "is-unmatched"}`} role="status">
                        {passwordsMatch ? "パスワードが一致しています" : "パスワードが一致していません"}
                    </p>
                )}
                <button className="premium-join-submit" type="submit">プランに加入する</button>
                {message && <p className={`premium-join-message ${passwordsMatch ? "is-success" : "is-error"}`} role="status">{message}</p>}
            </form>

            <p className="premium-join-note">※この画面は入力内容の確認用です。加入・決済処理は行いません。</p>
        </section>
    );
}
