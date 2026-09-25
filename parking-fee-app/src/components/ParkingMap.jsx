import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_INFO } from "../lib/parkingSpots";

// カスタムSVGピンの生成（Leafletの画像読み込み壊れを回避し、色分けに対応）
function createPinIcon(color, label = "P") {
    const svgHtml = `
        <div style="
            position: relative;
            width: 32px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <svg viewBox="0 0 32 42" width="32" height="42" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                <path d="M16 0C7.164 0 0 7.164 0 16c0 10.667 16 26 16 26s16-15.333 16-26c0-8.836-7.164-16-16-16z" fill="${color}"/>
                <circle cx="16" cy="16" r="10" fill="#ffffff"/>
                <text x="16" y="20" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle" font-family="sans-serif">${label}</text>
            </svg>
        </div>
    `;
    return L.divIcon({
        className: "custom-leaflet-pin",
        html: svgHtml,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -38],
    });
}

// 現在地ピン用アイコン（青いパルスサークル付き）
function createCurrentLocationIcon() {
    const svgHtml = `
        <div style="position: relative; width: 24px; height: 24px;">
            <div style="
                position: absolute;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(33, 150, 243, 0.4);
                animation: pulse-ring 1.8s infinite;
            "></div>
            <div style="
                position: absolute;
                top: 4px;
                left: 4px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #1976d2;
                border: 2px solid #ffffff;
                box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>
        </div>
    `;
    return L.divIcon({
        className: "current-loc-pin",
        html: svgHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
}

export function ParkingMap({
    spots = [],
    userLocation = null,
    selectedSpot = null,
    onSelectSpot = () => {},
    center = [35.681236, 139.767125], // デフォルト東京駅
    zoom = 15,
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const userMarkerRef = useRef(null);

    // 1. 地図の初期化
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const initialCenter = userLocation
            ? [userLocation.lat, userLocation.lng]
            : center;

        const map = L.map(mapContainerRef.current, {
            center: initialCenter,
            zoom: zoom,
            zoomControl: true,
        });

        // OpenStreetMap タイルレイヤー
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        mapRef.current = map;
        markersLayerRef.current = markersLayer;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // 2. 駐車場マーカーの描画
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        spots.forEach((spot) => {
            const statusConfig = STATUS_INFO[spot.status] || STATUS_INFO.vacant;
            const icon = createPinIcon(statusConfig.color, "P");

            const marker = L.marker([spot.lat, spot.lng], { icon });

            const popupContent = `
                <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
                    <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${spot.name}</div>
                    <div style="color: ${statusConfig.color}; font-weight: bold; margin-bottom: 6px;">
                        ${statusConfig.icon} ${statusConfig.label} (全${spot.capacity}台)
                    </div>
                    <div style="color: #444; font-size: 12px; margin-bottom: 2px;">昼間: ${spot.dayRateText}</div>
                    <div style="color: #444; font-size: 12px; margin-bottom: 6px;">最大: ${spot.maxRateText}</div>
                    ${spot.distance ? `<div style="font-size: 11px; color: #666; margin-bottom: 4px;">📍 現在地から約 ${spot.distance} km</div>` : ""}
                    <button id="btn-select-${spot.id}" style="
                        width: 100%;
                        padding: 6px;
                        background: #007a4d;
                        color: #fff;
                        border: 0;
                        border-radius: 4px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 4px;
                    ">詳細を見る</button>
                </div>
            `;

            marker.bindPopup(popupContent);

            marker.on("popupopen", () => {
                const btn = document.getElementById(`btn-select-${spot.id}`);
                if (btn) {
                    btn.onclick = () => onSelectSpot(spot);
                }
            });

            marker.on("click", () => {
                onSelectSpot(spot);
            });

            marker.addTo(markersLayerRef.current);
        });
    }, [spots, onSelectSpot]);

    // 3. 現在地マーカーの描画
    useEffect(() => {
        if (!mapRef.current) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }

        if (userLocation && userLocation.lat && userLocation.lng) {
            const userIcon = createCurrentLocationIcon();
            const marker = L.marker([userLocation.lat, userLocation.lng], {
                icon: userIcon,
                zIndexOffset: 1000,
            })
                .bindPopup("<b>📍 あなたの現在地</b>")
                .addTo(mapRef.current);

            userMarkerRef.current = marker;
        }
    }, [userLocation]);

    // 4. 選択された駐車場へのフォーカス
    useEffect(() => {
        if (!mapRef.current || !selectedSpot) return;

        mapRef.current.setView([selectedSpot.lat, selectedSpot.lng], 16, {
            animate: true,
        });
    }, [selectedSpot]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div
                ref={mapContainerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #ddd",
                }}
            />
            {/* パルスアニメーション用のスタイル */}
            <style>{`
                @keyframes pulse-ring {
                    0% { transform: scale(0.6); opacity: 0.8; }
                    50% { transform: scale(1.4); opacity: 0.2; }
                    100% { transform: scale(0.6); opacity: 0.8; }
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
            `}</style>
        </div>
    );
}
