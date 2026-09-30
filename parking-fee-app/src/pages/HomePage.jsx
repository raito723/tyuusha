import { Link } from "react-router-dom";
import { IconlyCamera, IconlyLocation } from "../App";
export const IconlyTicketStar = ({ size = 24, color = "#415E8A" }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M21.4399 13.9939C18.7789 13.9939 18.7789 9.87952 21.4399 9.87952C21.4399 5.11236 21.4399 3.41089 12.0449 3.41089C2.6499 3.41089 2.6499 5.11236 2.6499 9.87952C5.3109 9.87952 5.3109 13.9939 2.6499 13.9939C2.6499 18.762 2.6499 20.4635 12.0449 20.4635C21.4399 20.4635 21.4399 18.762 21.4399 13.9939Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path fillRule="evenodd" clipRule="evenodd" d="M12.0449 9.17102C11.3619 9.17102 11.2969 10.2605 10.8909 10.6461C10.4839 11.0307 9.22087 10.5911 9.04487 11.2742C8.86987 11.9582 10.0069 12.1903 10.1479 12.7767C10.2879 13.3631 9.59387 14.1873 10.1869 14.5985C10.7809 15.0078 11.4199 14.0803 12.0449 14.0803C12.6699 14.0803 13.3089 15.0078 13.9029 14.5985C14.4969 14.1873 13.8019 13.3631 13.9419 12.7767C14.0829 12.1903 15.2199 11.9582 15.0449 11.2742C14.8689 10.5911 13.6059 11.0307 13.1989 10.6461C12.7929 10.2605 12.7279 9.17102 12.0449 9.17102Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
export function HomePage() {
    return (
        <section className="home-page">
            <div className="home-map-preview" aria-label="現在地周辺の地図">
                <span className="home-map-marker" aria-hidden="true" />
                <span className="home-map-road home-map-road-one" aria-hidden="true" />
                <span className="home-map-road home-map-road-two" aria-hidden="true" />
            </div>

            <div className="home-actions">
                <Link to="/map" className="home-action home-action-primary">
                    <span className="home-action-icon" aria-hidden="true"><IconlyLocation size={36} color="currentColor" /></span>
                    <span>現在地周辺の<br />駐車場を探す</span>
                    <span className="home-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/ocr" className="home-action home-action-outline">
                    <span className="home-action-icon" aria-hidden="true"><IconlyCamera size={36} color="currentColor" /></span>
                    <span>料金表を撮影して<br />料金を計算する</span>
                    <span className="home-action-arrow" aria-hidden="true">›</span>
                </Link>
                <Link to="/settings" className="home-premium-card">
                    <span className="home-premium-icon" aria-hidden="true"><IconlyTicketStar size={38} color="#415E8A" /></span>
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
