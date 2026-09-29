import { Link } from "react-router-dom";

export function HomePage() {
    return (
        <section className="home-page">
            <div className="home-map-preview" aria-label="現在地周辺の地図">
                <span className="home-map-marker" aria-hidden="true" />
                <span className="home-map-road home-map-road-one" aria-hidden="true" />
                <span className="home-map-road home-map-road-two" aria-hidden="true" />
                <span className="home-map-location" aria-hidden="true" />
            </div>

            <div className="home-actions">
                <Link to="/map" className="home-action home-action-primary">
                    <span>現在地周辺の<br />駐車場を探す</span>
                    <span className="home-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/ocr" className="home-action home-action-outline">
                    <span>料金表を撮影して<br />料金を計算する</span>
                    <span className="home-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/settings" className="home-premium-card">
                    <span className="home-premium-title">プレミアムプラン</span>
                    <span className="home-action-arrow" aria-hidden="true">›</span>
                    <span className="home-premium-description">駐車券の割引やプレゼントなど<br />お得な特典がたくさん！</span>
                </Link>
            </div>

            <div className="nearby-parking">
                <div className="nearby-parking-heading">
                    <h2>周辺の駐車場</h2>
                    <Link to="/map" aria-label="周辺の駐車場を詳しく見る">›</Link>
                </div>
                <div className="nearby-parking-grid">
                    <div className="nearby-parking-card nearby-parking-available">
                        <span>空車</span>
                        <strong>12<small> 台</small></strong>
                    </div>
                    <div className="nearby-parking-card nearby-parking-limited">
                        <span>残りわずか</span>
                    </div>
                </div>
            </div>
        </section>
    );
}