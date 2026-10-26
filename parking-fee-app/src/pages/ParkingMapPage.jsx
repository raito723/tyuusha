import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    DEFAULT_PARKING_SPOTS,
    PAYMENT_METHOD_LABELS,
    STATUS_INFO,
} from "../lib/parkingSpots";
import { searchLocation, searchNearbyParking } from "../lib/mapboxParkingSearch";
import { ParkingMap } from "../components/ParkingMap";

export function ParkingMapPage() {
    const navigate = useNavigate();

    // 駐車場データ & 状態
    const [spots] = useState(DEFAULT_PARKING_SPOTS);
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [mapboxSpots, setMapboxSpots] = useState(null);
    const [mapboxAttribution, setMapboxAttribution] = useState("");
    const [parkingSearchLoading, setParkingSearchLoading] = useState(false);
    const [locationSearchLoading, setLocationSearchLoading] = useState(false);
    const [parkingSearchError, setParkingSearchError] = useState("");
    const autoSearchPendingRef = useRef(true);

    // 現在地取得関連
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    // 検索・フィルター条件
    const [keyword, setKeyword] = useState("");

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
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (!userLocation) {
            setParkingSearchError("現在地を取得できません。位置情報を許可して再取得してください。");
            return;
        }
        setParkingSearchLoading(true);
        setParkingSearchError("");
        setSelectedSpot(null);

        try {
            const result = await searchNearbyParking(userLocation, token);
            setMapboxSpots(result.spots);
            setMapboxAttribution(result.attribution);
        } catch (error) {
            setMapboxSpots([]);
            setMapboxAttribution("");
            setParkingSearchError(error.message || "駐車場を検索できませんでした。");
        } finally {
            setParkingSearchLoading(false);
        }
    };

    // マップ画面を開いたとき、現在地が取得できたら周辺検索を一度だけ実行する
    useEffect(() => {
        if (!userLocation || !autoSearchPendingRef.current) return;
        autoSearchPendingRef.current = false;
        handleSearchNearbyParking();
    }, [userLocation]);

    // 初回マウント時に現在地取得を試みる
    useEffect(() => {
        handleRequestLocation();
    }, []);

    const handleSearchLocation = async () => {
        const query = keyword.trim();
        if (!query) {
            setParkingSearchError("地名や住所を入力してください。");
            return;
        }

        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        setLocationSearchLoading(true);
        setParkingSearchError("");
        setSelectedSpot(null);
        try {
            const center = await searchLocation(query, token, userLocation);
            const result = await searchNearbyParking(center, token);
            setUserLocation(center);
            setKeyword("");
            setMapboxSpots(result.spots);
            setMapboxAttribution(result.attribution);
        } catch (error) {
            setParkingSearchError(error.message || "場所を検索できませんでした。");
        } finally {
            setLocationSearchLoading(false);
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
    const sourceSpots = mapboxSpots ?? spots;
    const query = keyword.trim().toLocaleLowerCase();
    const filteredSpots = sourceSpots.filter((spot) => !query
        || spot.name.toLocaleLowerCase().includes(query)
        || spot.address.toLocaleLowerCase().includes(query));

    return (
        <section className="map-page-container">
            <div className="map-page-header">
                <button type="button" className="map-back-button" onClick={() => navigate(-1)} aria-label="戻る">‹</button>
                <h2>駐車場マップ</h2>
                <span aria-hidden="true" />
            </div>

            <div className="map-search-row">
                <input
                    type="search"
                    placeholder="地名・住所で検索"
                    value={keyword}
                    aria-label="地名・住所で検索"
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") handleSearchLocation(); }}
                />
                <button type="button" onClick={handleSearchLocation} disabled={locationSearchLoading || parkingSearchLoading}>
                    {locationSearchLoading ? "検索中" : "検索"}
                </button>
                <button type="button" className="map-current-location" onClick={handleRequestLocation} disabled={locationLoading} aria-label="現在地を取得">
                    📍
                </button>
            </div>

            {(locationError || parkingSearchError) && (
                <p className="map-inline-error" role="alert">{parkingSearchError || locationError}</p>
            )}

            <div className="map-view-pane">
                <ParkingMap spots={filteredSpots} userLocation={userLocation} selectedSpot={selectedSpot} onSelectSpot={setSelectedSpot} />
            </div>

            <section className="map-results-panel" aria-label="検索結果">
                <div className="map-results-heading">
                    <strong>{parkingSearchLoading ? "駐車場を検索中..." : `周辺の駐車場 ${filteredSpots.length}件`}</strong>
                    {mapboxSpots !== null && <span>Mapbox</span>}
                </div>
                <div className="map-results-scroll">
                    {filteredSpots.length === 0 ? <p className="map-empty-results">駐車場が見つかりませんでした。地名を入力して検索してください。</p> : filteredSpots.map((spot) => {
                        const status = STATUS_INFO[spot.status] || STATUS_INFO.unknown;
                        return (
                            <button type="button" key={spot.id} className={`map-result-card${selectedSpot?.id === spot.id ? " is-selected" : ""}`} onClick={() => setSelectedSpot(spot)}>
                                <span className={`status-badge ${status.badgeClass || "status-unknown"}`}>{status.icon} {status.label}</span>
                                <strong>{spot.name}</strong>
                                <span className="map-result-address">{spot.address}</span>
                                {spot.source === "mapbox" ? <span className="map-result-rate">料金情報なし</span> : <span className="map-result-rate">☀️ {spot.dayRateText}　🏷️ {spot.maxRateText}</span>}
                            </button>
                        );
                    })}
                </div>
                {mapboxAttribution && <p className="mapbox-attribution">{mapboxAttribution}</p>}
            </section>

            {selectedSpot && (
                <section className="map-spot-popup" role="dialog" aria-modal="true" aria-labelledby="map-spot-title">
                    <div className="map-spot-popup-map">
                        <button type="button" className="map-spot-popup-close" onClick={() => setSelectedSpot(null)} aria-label="ポップアップを閉じる">‹</button>
                        <span className="map-spot-popup-pin" aria-hidden="true" />
                    </div>
                    <div className="map-spot-popup-content">
                        <h2 id="map-spot-title">{selectedSpot.name}</h2>
                        <div className="map-spot-status-row">
                            <span className={`status-badge ${STATUS_INFO[selectedSpot.status]?.badgeClass || "status-unknown"}`}>
                                {STATUS_INFO[selectedSpot.status]?.icon || "🅿️"} {STATUS_INFO[selectedSpot.status]?.label || "空き情報なし"}
                                {selectedSpot.capacity ? `　${selectedSpot.capacity}台` : ""}
                            </span>
                            <span>{selectedSpot.distance ? `徒歩約${Math.max(1, Math.round(selectedSpot.distance * 1000 / 80))}分` : "駐車場"}</span>
                        </div>
                        {selectedSpot.distance && <p className="map-spot-distance">📍 徒歩約{Math.max(1, Math.round(selectedSpot.distance * 1000 / 80))}分（約{Math.round(selectedSpot.distance * 1000)}m）</p>}

                        <h3>料金</h3>
                        <div className="map-spot-prices">
                            {selectedSpot.source === "mapbox" ? <p>料金情報はありません</p> : <>
                                <div><strong>昼料金</strong><strong>{selectedSpot.dayRateText || "情報なし"}</strong></div>
                                <div><strong>夜料金</strong><strong>{selectedSpot.nightRateText || "情報なし"}</strong></div>
                                {selectedSpot.maxRateText && <div><strong>最大料金</strong><strong>{selectedSpot.maxRateText}</strong></div>}
                            </>}
                        </div>
                        <p className="map-spot-meta"><strong>営業時間</strong><span>{selectedSpot.businessHours || "情報なし"}</span></p>
                        <p className="map-spot-meta"><strong>住所</strong><span>{selectedSpot.address}</span></p>
                        {selectedSpot.paymentMethods?.length > 0 && <p className="map-spot-meta"><strong>支払い</strong><span>{selectedSpot.paymentMethods.map((method) => PAYMENT_METHOD_LABELS[method]?.label).filter(Boolean).join("・")}</span></p>}
                        {selectedSpot.notes && <p className="map-spot-meta"><strong>備考</strong><span>{selectedSpot.notes}</span></p>}

                        <button type="button" className="map-spot-primary-action" onClick={() => handleUseForCalculator(selectedSpot)}>料金を計算する</button>
                        <a className="map-spot-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.lat},${selectedSpot.lng}`} target="_blank" rel="noopener noreferrer">ここへ行く</a>
                    </div>
                </section>
            )}
        </section>
    );
}
