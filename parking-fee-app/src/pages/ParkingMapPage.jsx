import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    DEFAULT_PARKING_SPOTS,
    PAYMENT_METHOD_LABELS,
    STATUS_INFO,
    filterAndSortSpots,
    getFavoriteSpotIds,
    toggleFavoriteSpot,
} from "../lib/parkingSpots";
import { ParkingMap } from "../components/ParkingMap";

export function ParkingMapPage() {
    const navigate = useNavigate();

    // 駐車場データ & 状態
    const [spots] = useState(DEFAULT_PARKING_SPOTS);
    const [favoriteIds, setFavoriteIds] = useState(getFavoriteSpotIds());
    const [selectedSpot, setSelectedSpot] = useState(null);

    // 現在地取得関連
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    // 検索・フィルター条件
    const [keyword, setKeyword] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [sortBy, setSortBy] = useState("distance");

    // モバイル用表示タブ（マップ / リスト）
    const [viewMode, setViewMode] = useState("split"); // 'split', 'map', 'list'

    // 初回マウント時に現在地取得を試みる
    useEffect(() => {
        handleRequestLocation();
    }, []);

    // 現在地取得ハンドラ
    const handleRequestLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("お使いのブラウザは位置情報取得に対応していません。");
            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocationLoading(false);
            },
            (error) => {
                let msg = "位置情報の取得に失敗しました。";
                if (error.code === error.PERMISSION_DENIED) {
                    msg = "位置情報の利用が許可されていません（ブラウザの設定をご確認ください）。標準位置（東京駅周辺）で表示しています。";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = "現在地を特定できませんでした。";
                } else if (error.code === error.TIMEOUT) {
                    msg = "位置情報の取得がタイムアウトしました。";
                }
                setLocationError(msg);
                setLocationLoading(false);
                // デフォルトとして東京駅に設定
                setUserLocation({ lat: 35.681236, lng: 139.767125 });
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000,
            }
        );
    };

    // お気に入り切り替え
    const handleToggleFavorite = (spotId, e) => {
        if (e) e.stopPropagation();
        const updated = toggleFavoriteSpot(spotId);
        setFavoriteIds(updated);
    };

    // 料金計算画面への連携
    const handleUseForCalculator = (spot) => {
        navigate("/calculator", {
            state: {
                presetRule: {
                    name: spot.name,
                    dayPrice: spot.dayPrice,
                    nightPrice: spot.nightPrice,
                    maximumFee: spot.maximumFee,
                },
            },
        });
    };

    // フィルタリング・ソート済みリスト
    const filteredSpots = filterAndSortSpots(spots, {
        keyword,
        paymentFilter,
        statusFilter,
        onlyFavorites,
        favoriteIds,
        userLocation,
        sortBy,
    });

    return (
        <section className="map-page-container">
            <div className="map-page-header">
                <div>
                    <h2>🗺️ 周辺駐車場の検索・マップ</h2>
                    <p style={{ margin: "4px 0 0", color: "#666", fontSize: "14px" }}>
                        現在地や目的地の周辺にある駐車場を探し、空き状況・料金・支払い方法を確認できます。
                    </p>
                </div>

                <div className="location-action-bar">
                    <button
                        type="button"
                        onClick={handleRequestLocation}
                        disabled={locationLoading}
                        className="btn-secondary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        {locationLoading ? "📍 取得中..." : "📍 現在地を再取得"}
                    </button>
                </div>
            </div>

            {/* 位置情報メッセージ */}
            {locationError && (
                <div className="error-message" style={{ margin: "12px 0", fontSize: "13px" }}>
                    ⚠️ {locationError}
                </div>
            )}

            {/* 検索・絞り込みバー */}
            <div className="search-filter-card">
                <div className="search-input-row">
                    <input
                        type="text"
                        placeholder="🔍 駐車場名・住所で検索..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ flex: "1 1 200px" }}
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ minWidth: "150px" }}
                    >
                        <option value="distance">📍 距離が近い順</option>
                        <option value="dayPrice">💰 昼間料金が安い順</option>
                        <option value="maxFee">🏷️ 最大料金が安い順</option>
                    </select>
                </div>

                <div className="filter-chips-row">
                    {/* 支払い方法フィルター */}
                    <div className="filter-group">
                        <span className="filter-group-label">支払い:</span>
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            style={{ padding: "6px 10px", fontSize: "13px" }}
                        >
                            <option value="all">すべて</option>
                            <option value="credit">💳 クレジットカード</option>
                            <option value="ic">🚆 交通系IC</option>
                            <option value="qr">📱 QRコード決済</option>
                        </select>
                    </div>

                    {/* 空き状況フィルター */}
                    <div className="filter-group">
                        <span className="filter-group-label">空き状況:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: "6px 10px", fontSize: "13px" }}
                        >
                            <option value="all">すべて</option>
                            <option value="vacant">🟢 空車のみ</option>
                            <option value="not-full">🟢🟡 満車を除く</option>
                        </select>
                    </div>

                    {/* お気に入り切り替えボタン */}
                    <button
                        type="button"
                        onClick={() => setOnlyFavorites(!onlyFavorites)}
                        className={onlyFavorites ? "btn-accent" : "btn-secondary"}
                        style={{
                            padding: "6px 12px",
                            fontSize: "13px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                        }}
                    >
                        {onlyFavorites ? "★ お気に入りのみ表示中" : "☆ お気に入りのみ"}
                    </button>
                </div>
            </div>

            {/* 結果カウント */}
            <div style={{ margin: "12px 0 8px", fontSize: "13px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                <span>該当件数: <b>{filteredSpots.length}</b> 件</span>
                {userLocation && (
                    <span style={{ color: "#007a4d" }}>
                        ✓ 現在地周辺の駐車場を表示中
                    </span>
                )}
            </div>

            {/* メインレイアウト（マップ ＋ リスト） */}
            <div className="map-content-grid">
                {/* 地図エリア */}
                <div className="map-view-pane">
                    <ParkingMap
                        spots={filteredSpots}
                        userLocation={userLocation}
                        selectedSpot={selectedSpot}
                        onSelectSpot={(spot) => setSelectedSpot(spot)}
                    />
                </div>

                {/* リスト＆詳細エリア */}
                <div className="map-list-pane">
                    {/* 詳細表示カード（駐車場が選択されている時） */}
                    {selectedSpot && (
                        <div className="selected-spot-detail-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <div>
                                    <span className={`status-badge ${STATUS_INFO[selectedSpot.status]?.badgeClass}`}>
                                        {STATUS_INFO[selectedSpot.status]?.icon} {STATUS_INFO[selectedSpot.status]?.label}
                                    </span>
                                    <h3 style={{ margin: "6px 0 2px" }}>{selectedSpot.name}</h3>
                                    <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>
                                        📍 {selectedSpot.address}
                                        {selectedSpot.distance && ` (約 ${selectedSpot.distance} km)`}
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button
                                        type="button"
                                        onClick={(e) => handleToggleFavorite(selectedSpot.id, e)}
                                        className="btn-icon"
                                        style={{ fontSize: "20px" }}
                                        title={favoriteIds.includes(selectedSpot.id) ? "お気に入り解除" : "お気に入り追加"}
                                    >
                                        {favoriteIds.includes(selectedSpot.id) ? "★" : "☆"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSpot(null)}
                                        className="btn-icon"
                                        style={{ fontSize: "18px" }}
                                        title="詳細を閉じる"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="spot-detail-body">
                                <div className="detail-row">
                                    <span className="detail-label">料金体系:</span>
                                    <div>
                                        <div>☀️ {selectedSpot.dayRateText}</div>
                                        <div>🌙 {selectedSpot.nightRateText}</div>
                                        <div style={{ color: "#c62828", fontWeight: "bold" }}>
                                            🏷️ {selectedSpot.maxRateText}
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">営業時間:</span>
                                    <span>{selectedSpot.businessHours}（収容: {selectedSpot.capacity}台）</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">支払い:</span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {selectedSpot.paymentMethods.map((m) => (
                                            <span key={m} className="payment-tag">
                                                {PAYMENT_METHOD_LABELS[m]?.icon} {PAYMENT_METHOD_LABELS[m]?.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {selectedSpot.notes && (
                                    <div className="detail-row">
                                        <span className="detail-label">備考:</span>
                                        <span style={{ fontSize: "12px", color: "#666" }}>{selectedSpot.notes}</span>
                                    </div>
                                )}
                            </div>

                            <div className="detail-actions" style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    onClick={() => handleUseForCalculator(selectedSpot)}
                                    style={{ flex: "1 1 180px" }}
                                >
                                    💰 この駐車場で料金計算する
                                </button>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.lat},${selectedSpot.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none" }}
                                >
                                    <button type="button" className="btn-secondary" style={{ height: "100%" }}>
                                        🧭 Googleマップで経路
                                    </button>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* 駐車場一覧カード群 */}
                    <div className="spots-scroll-list">
                        {filteredSpots.length === 0 ? (
                            <div className="empty-state">
                                条件に一致する駐車場が見つかりませんでした。
                            </div>
                        ) : (
                            filteredSpots.map((spot) => {
                                const isSelected = selectedSpot?.id === spot.id;
                                const isFav = favoriteIds.includes(spot.id);
                                const statusConfig = STATUS_INFO[spot.status] || STATUS_INFO.vacant;

                                return (
                                    <div
                                        key={spot.id}
                                        className={`spot-list-card ${isSelected ? "selected" : ""}`}
                                        onClick={() => setSelectedSpot(spot)}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                    <span className={`status-badge ${statusConfig.badgeClass}`}>
                                                        {statusConfig.icon} {statusConfig.label}
                                                    </span>
                                                    {spot.distance && (
                                                        <span style={{ fontSize: "12px", color: "#666", fontWeight: "bold" }}>
                                                            📍 約 {spot.distance} km
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 style={{ margin: "6px 0 2px" }}>{spot.name}</h4>
                                                <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#666" }}>
                                                    {spot.address}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleFavorite(spot.id, e)}
                                                className="btn-icon"
                                                style={{ fontSize: "18px", color: isFav ? "#f59e0b" : "#ccc" }}
                                                title={isFav ? "お気に入り解除" : "お気に入り追加"}
                                            >
                                                {isFav ? "★" : "☆"}
                                            </button>
                                        </div>

                                        <div style={{ fontSize: "13px", display: "grid", gap: "2px", margin: "6px 0" }}>
                                            <div>☀️ 昼: {spot.dayRateText}</div>
                                            <div style={{ color: "#c62828", fontWeight: "bold" }}>
                                                🏷️ 最大: {spot.maxRateText}
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                {spot.paymentMethods.map((m) => (
                                                    <span key={m} style={{ fontSize: "12px" }} title={PAYMENT_METHOD_LABELS[m]?.label}>
                                                        {PAYMENT_METHOD_LABELS[m]?.icon}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUseForCalculator(spot);
                                                }}
                                                className="btn-secondary"
                                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                            >
                                                計算へ送る →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
