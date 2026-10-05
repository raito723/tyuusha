import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    DEFAULT_PARKING_SPOTS,
    PAYMENT_METHOD_LABELS,
    STATUS_INFO,
    filterAndSortSpots,
} from "../lib/parkingSpots";
import { decodeGooglePolyline } from "../lib/googleMapsLoader";
import { ParkingMap } from "../components/ParkingMap";

async function postMapsRequest(path, body) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Google Maps APIの処理に失敗しました。");
    return result;
}

function formatRouteDuration(duration) {
    const seconds = Number.parseInt(duration || "", 10);
    if (!Number.isFinite(seconds)) return "";
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return hours ? `約${hours}時間${minutes % 60}分` : `約${minutes}分`;
}

function formatRouteDistance(meters) {
    if (!Number.isFinite(meters)) return "";
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function ParkingMapPage() {
    const navigate = useNavigate();

    // 駐車場データ & 状態
    const [spots] = useState(DEFAULT_PARKING_SPOTS);
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [googleSpots, setGoogleSpots] = useState(null);
    const [searchCenter, setSearchCenter] = useState(null);
    const [parkingSearchLoading, setParkingSearchLoading] = useState(false);
    const [locationSearchLoading, setLocationSearchLoading] = useState(false);
    const [parkingSearchError, setParkingSearchError] = useState("");
    const [routePath, setRoutePath] = useState([]);
    const [routeDetails, setRouteDetails] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");

    // 現在地取得関連
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    // 検索・フィルター条件
    const [keyword, setKeyword] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
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
                setSearchCenter(null);
                setLocationLoading(false);
            },
            (error) => {
                let msg = "位置情報の取得に失敗しました。";
                if (error.code === error.PERMISSION_DENIED) {
                    msg = "位置情報の利用が許可されていません。ブラウザの設定をご確認のうえ、現在地を再取得してください。";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = "現在地を特定できませんでした。";
                } else if (error.code === error.TIMEOUT) {
                    msg = "位置情報の取得がタイムアウトしました。";
                }
                setLocationError(msg);
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000,
            }
        );
    };

    const handleSearchNearbyParking = async () => {
        const center = searchCenter || userLocation;
        if (!center) {
            setParkingSearchError("現在地を取得できません。位置情報を許可して再取得してください。");
            return;
        }
        setParkingSearchLoading(true);
        setParkingSearchError("");
        setSelectedSpot(null);
        setRoutePath([]);
        setRouteDetails(null);

        try {
            const result = await postMapsRequest("/api/maps/parking/nearby", { center });
            setGoogleSpots(result);
            setSortBy("distance");
        } catch (error) {
            setGoogleSpots([]);
            setParkingSearchError(error.message || "駐車場を検索できませんでした。");
        } finally {
            setParkingSearchLoading(false);
        }
    };

    const handleSearchLocation = async () => {
        const query = keyword.trim();
        if (!query) {
            setParkingSearchError("地名や住所を入力してください。");
            return;
        }

        setLocationSearchLoading(true);
        setParkingSearchError("");
        setSelectedSpot(null);
        setRoutePath([]);
        setRouteDetails(null);
        try {
            const place = await postMapsRequest("/api/maps/place", { query, biasCenter: userLocation });
            const center = place;
            const result = await postMapsRequest("/api/maps/parking/nearby", { center });
            setSearchCenter(center);
            setKeyword("");
            setGoogleSpots(result);
            setSortBy("distance");
        } catch (error) {
            setParkingSearchError(error.message || "場所を検索できませんでした。");
        } finally {
            setLocationSearchLoading(false);
        }
    };

    const handleSelectSpot = (spot) => {
        setSelectedSpot(spot);
        setRoutePath([]);
        setRouteDetails(null);
        setRouteError("");
    };

    const handleFindRoute = async () => {
        if (!userLocation || !selectedSpot) {
            setRouteError("現在地を取得してから経路を検索してください。");
            return;
        }
        setRouteLoading(true);
        setRouteError("");
        setRoutePath([]);
        setRouteDetails(null);
        try {
            const result = await postMapsRequest("/api/maps/route", {
                origin: userLocation,
                destination: { lat: selectedSpot.lat, lng: selectedSpot.lng },
            });
            setRouteDetails(result);
            setRoutePath(decodeGooglePolyline(result.encodedPolyline));
        } catch (error) {
            setRouteError(error.message || "経路を検索できませんでした。");
        } finally {
            setRouteLoading(false);
        }
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
    const filteredSpots = googleSpots === null
        ? filterAndSortSpots(spots, {
            keyword,
            paymentFilter,
            statusFilter,
            userLocation,
            sortBy,
        })
        : googleSpots
            .filter((spot) => {
                const query = keyword.trim().toLocaleLowerCase();
                const matchesKeyword = !query
                    || spot.name.toLocaleLowerCase().includes(query)
                    || spot.address.toLocaleLowerCase().includes(query);
                return matchesKeyword;
            })
            .sort((a, b) => sortBy === "distance" ? a.distance - b.distance : 0);

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
                <div className="nearby-parking-search-row">
                    <button
                        type="button"
                        onClick={handleSearchNearbyParking}
                    disabled={parkingSearchLoading || locationLoading || !(searchCenter || userLocation)}
                        className="nearby-parking-search-button"
                    >
                        {parkingSearchLoading ? "検索中..." : `📍 ${searchCenter ? "検索地点" : "現在地"}の周辺駐車場を検索（5km）`}
                    </button>
                    {googleSpots !== null && (
                        <button
                            type="button"
                            onClick={() => {
                                setGoogleSpots(null);
                                setSearchCenter(null);
                                setParkingSearchError("");
                                setSelectedSpot(null);
                                setRoutePath([]);
                                setRouteDetails(null);
                            }}
                            className="btn-secondary"
                        >
                            サンプル一覧に戻る
                        </button>
                    )}
                </div>
                {parkingSearchError && <div className="error-message" role="alert">{parkingSearchError}</div>}
                {googleSpots !== null && (
                    <p className="parking-search-note">
                        Google Placesの周辺検索結果を表示中です。料金・空き状況は検索結果に含まれないため、詳細は駐車場でご確認ください。
                    </p>
                )}
                <div className="search-input-row">
                    <input
                        type="text"
                        placeholder="駐車場名・住所で絞り込み / 地名で検索..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearchLocation();
                        }}
                        style={{ flex: "1 1 200px" }}
                    />
                    <button
                        type="button"
                        onClick={handleSearchLocation}
                        disabled={locationSearchLoading || parkingSearchLoading}
                        className="btn-secondary"
                    >
                        {locationSearchLoading ? "場所を検索中..." : "地名で周辺検索"}
                    </button>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ minWidth: "150px" }}
                    >
                        <option value="distance">📍 距離が近い順</option>
                        {googleSpots === null && <option value="dayPrice">💰 昼間料金が安い順</option>}
                        {googleSpots === null && <option value="maxFee">🏷️ 最大料金が安い順</option>}
                    </select>
                </div>

                {googleSpots === null && <div className="filter-chips-row">
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

                </div>}
            </div>

            {/* 結果カウント */}
            <div style={{ margin: "12px 0 8px", fontSize: "13px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                <span>該当件数: <b>{filteredSpots.length}</b> 件</span>
                {googleSpots !== null ? (
                    <span style={{ color: "#007a4d" }}>✓ Google Mapsで周辺駐車場を検索済み</span>
                ) : userLocation && (
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
                        center={searchCenter}
                        selectedSpot={selectedSpot}
                        routePath={routePath}
                        onSelectSpot={handleSelectSpot}
                    />
                </div>

                {/* リスト＆詳細エリア */}
                <div className="map-list-pane">
                    {/* 詳細表示カード（駐車場が選択されている時） */}
                    {selectedSpot && (
                        <div className="selected-spot-detail-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <div>
                                    <span className={`status-badge ${STATUS_INFO[selectedSpot.status]?.badgeClass || "status-unknown"}`}>
                                        {STATUS_INFO[selectedSpot.status]?.icon || "🅿️"} {STATUS_INFO[selectedSpot.status]?.label || "空き情報なし"}
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
                                        onClick={() => handleSelectSpot(null)}
                                        className="btn-icon"
                                        style={{ fontSize: "18px" }}
                                        title="詳細を閉じる"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {selectedSpot.source === "google" ? (
                                <div className="spot-detail-body">
                                    <p>Google Placesの検索結果には料金、営業時間、支払い方法、空き状況の情報が含まれていません。</p>
                                </div>
                            ) : <div className="spot-detail-body">
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
                            </div>}

                            <div className="route-search-panel">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleFindRoute}
                                    disabled={routeLoading || !userLocation}
                                >
                                    {routeLoading ? "経路を検索中..." : "🧭 現在地からの経路をアプリ内に表示"}
                                </button>
                                {!userLocation && <p className="route-search-note">経路を表示するには現在地を取得してください。</p>}
                                {routeError && <p className="error-message" role="alert">{routeError}</p>}
                                {routeDetails && (
                                    <p className="route-search-note" aria-live="polite">
                                        経路: {formatRouteDistance(routeDetails.distanceMeters)}・{formatRouteDuration(routeDetails.duration)}
                                    </p>
                                )}
                            </div>

                            <div className="detail-actions" style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {selectedSpot.source !== "google" && <button
                                    type="button"
                                    onClick={() => handleUseForCalculator(selectedSpot)}
                                    style={{ flex: "1 1 180px" }}
                                >
                                    💰 この駐車場で料金計算する
                                </button>}
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ""}&destination=${selectedSpot.lat},${selectedSpot.lng}&travelmode=driving`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none" }}
                                >
                                    <button type="button" className="btn-secondary" style={{ height: "100%" }}>
                                        🗺️ Google Mapsで開く
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
                                const statusConfig = STATUS_INFO[spot.status] || STATUS_INFO.vacant;

                                return (
                                    <div
                                        key={spot.id}
                                        className={`spot-list-card ${isSelected ? "selected" : ""}`}
                                        onClick={() => handleSelectSpot(spot)}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <span className={`status-badge ${statusConfig.badgeClass || "status-unknown"}`}>
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

                                        </div>

                                        {spot.source === "google" ? (
                                            <p className="parking-search-note">料金・営業時間・空き状況の情報はありません。</p>
                                        ) : <div style={{ fontSize: "13px", display: "grid", gap: "2px", margin: "6px 0" }}>
                                            <div>☀️ 昼: {spot.dayRateText}</div>
                                            <div style={{ color: "#c62828", fontWeight: "bold" }}>
                                                🏷️ 最大: {spot.maxRateText}
                                            </div>
                                        </div>}

                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                                            {spot.source !== "google" && <div style={{ display: "flex", gap: "4px" }}>
                                                {spot.paymentMethods.map((m) => (
                                                    <span key={m} style={{ fontSize: "12px" }} title={PAYMENT_METHOD_LABELS[m]?.label}>
                                                        {PAYMENT_METHOD_LABELS[m]?.icon}
                                                    </span>
                                                ))}
                                            </div>}
                                            {spot.source !== "google" && <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUseForCalculator(spot);
                                                }}
                                                className="btn-secondary"
                                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                            >
                                                計算へ送る →
                                            </button>}
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
