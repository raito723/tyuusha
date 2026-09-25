import { useEffect, useRef, useState } from "react";
import { STATUS_INFO } from "../lib/parkingSpots";

let googleMapsPromise;
const DEFAULT_CENTER = [35.681236, 139.767125];

function loadGoogleMaps(apiKey) {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (googleMapsPromise) return googleMapsPromise;

    googleMapsPromise = new Promise((resolve, reject) => {
        const callbackName = `initGoogleMaps${Date.now()}`;
        window[callbackName] = () => {
            resolve(window.google.maps);
            delete window[callbackName];
        };
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&language=ja&region=JP`;
        script.async = true;
        script.onerror = () => {
            googleMapsPromise = null;
            delete window[callbackName];
            reject(new Error("Google Mapsを読み込めませんでした。APIキーと有効なAPI設定をご確認ください。"));
        };
        document.head.appendChild(script);
    });

    return googleMapsPromise;
}

function createInfoContent(spot, status, onSelectSpot) {
    const root = document.createElement("div");
    root.style.cssText = "font-family: sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px; color: #415e8a";

    const title = document.createElement("strong");
    title.textContent = spot.name;
    title.style.cssText = "display:block; margin-bottom:4px; font-size:14px";
    root.append(title);

    const statusLine = document.createElement("div");
    statusLine.textContent = `${status.icon} ${status.label}（全${spot.capacity}台）`;
    statusLine.style.cssText = `color:${status.color}; font-weight:bold; margin-bottom:6px`;
    root.append(statusLine);

    for (const text of [`昼間: ${spot.dayRateText}`, `最大: ${spot.maxRateText}`]) {
        const line = document.createElement("div");
        line.textContent = text;
        root.append(line);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "詳細を見る";
    button.style.cssText = "width:100%; margin-top:8px; padding:8px; border:0; border-radius:15px; background:#00b893; color:white; cursor:pointer";
    button.addEventListener("click", () => onSelectSpot(spot));
    root.append(button);
    return root;
}

export function ParkingMap({
    spots = [],
    userLocation = null,
    selectedSpot = null,
    onSelectSpot = () => {},
    center = DEFAULT_CENTER,
    zoom = 15,
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const infoWindowRef = useRef(null);
    const onSelectSpotRef = useRef(onSelectSpot);
    const [mapError, setMapError] = useState("");
    const [mapReady, setMapReady] = useState(false);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        onSelectSpotRef.current = onSelectSpot;
    }, [onSelectSpot]);

    useEffect(() => {
        if (!apiKey) {
            setMapError("Google Mapsを表示するには .env.local に VITE_GOOGLE_MAPS_API_KEY を設定してください。");
            return undefined;
        }

        let cancelled = false;
        loadGoogleMaps(apiKey)
            .then((maps) => {
                if (cancelled || !mapContainerRef.current) return;
                const initialCenter = userLocation
                    ? { lat: userLocation.lat, lng: userLocation.lng }
                    : { lat: center[0], lng: center[1] };
                mapRef.current = new maps.Map(mapContainerRef.current, {
                    center: initialCenter,
                    zoom,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                });
                infoWindowRef.current = new maps.InfoWindow();
                setMapReady(true);
                setMapError("");
            })
            .catch((error) => {
                if (!cancelled) setMapError(error.message);
            });

        return () => {
            cancelled = true;
            markersRef.current.forEach((marker) => marker.setMap(null));
            markersRef.current = [];
            userMarkerRef.current?.setMap(null);
            userMarkerRef.current = null;
            mapRef.current = null;
            setMapReady(false);
        };
    }, [apiKey, center, zoom]);

    useEffect(() => {
        const maps = window.google?.maps;
        if (!mapReady || !maps || !mapRef.current || !infoWindowRef.current) return;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = spots.map((spot) => {
            const status = STATUS_INFO[spot.status] || STATUS_INFO.vacant;
            const marker = new maps.Marker({
                map: mapRef.current,
                position: { lat: spot.lat, lng: spot.lng },
                title: spot.name,
                label: { text: "P", color: "#ffffff", fontWeight: "bold" },
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    fillColor: status.color,
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                    scale: 15,
                },
            });
            marker.addListener("click", () => {
                infoWindowRef.current.setContent(createInfoContent(spot, status, (item) => onSelectSpotRef.current(item)));
                infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
                onSelectSpotRef.current(spot);
            });
            return marker;
        });
    }, [mapReady, spots]);

    useEffect(() => {
        const maps = window.google?.maps;
        if (!mapReady || !maps || !mapRef.current) return;
        userMarkerRef.current?.setMap(null);
        userMarkerRef.current = null;
        if (userLocation) {
            userMarkerRef.current = new maps.Marker({
                map: mapRef.current,
                position: { lat: userLocation.lat, lng: userLocation.lng },
                title: "あなたの現在地",
                zIndex: 1000,
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    fillColor: "#415e8a",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 3,
                    scale: 9,
                },
            });
        }
    }, [mapReady, userLocation]);

    useEffect(() => {
        if (!mapRef.current || !selectedSpot) return;
        mapRef.current.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lng });
        mapRef.current.setZoom(16);
    }, [selectedSpot]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%", borderRadius: "15px", overflow: "hidden", border: "1px solid #ccf1e9" }} />
            {mapError && (
                <div role="status" style={{ position: "absolute", inset: "0 0 auto", zIndex: 1, padding: "12px", background: "#fef2d2", color: "#415e8a", borderRadius: "15px", fontSize: "13px" }}>
                    {mapError}
                </div>
            )}
        </div>
    );
}
