import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMapsLoader";
import { STATUS_INFO } from "../lib/parkingSpots";

function createPopupContent(spot, status, onSelectSpot) {
    const root = document.createElement("div");
    root.className = "parking-map-popup";

    const title = document.createElement("strong");
    title.textContent = spot.name;
    root.append(title);

    const statusLine = document.createElement("div");
    statusLine.className = "parking-map-popup-status";
    statusLine.style.color = status.color;
    statusLine.textContent = spot.capacity == null
        ? `${status.icon} ${status.label}`
        : `${status.icon} ${status.label}（全${spot.capacity}台）`;
    root.append(statusLine);

    const rates = spot.dayRateText && spot.maxRateText
        ? [`昼間: ${spot.dayRateText}`, `最大: ${spot.maxRateText}`]
        : ["料金・空き状況の情報はありません"];
    for (const text of rates) {
        const rate = document.createElement("div");
        rate.textContent = text;
        root.append(rate);
    }

    const address = document.createElement("div");
    address.textContent = spot.address || "住所情報なし";
    root.append(address);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "parking-map-popup-button";
    button.textContent = "詳細を見る";
    button.addEventListener("click", () => onSelectSpot(spot));
    root.append(button);
    return root;
}

export function ParkingMap({
    spots = [],
    userLocation = null,
    center = null,
    selectedSpot = null,
    routePath = [],
    onSelectSpot = () => {},
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const infoWindowRef = useRef(null);
    const routeLineRef = useRef(null);
    const onSelectSpotRef = useRef(onSelectSpot);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState("");
    onSelectSpotRef.current = onSelectSpot;

    useEffect(() => {
        const initialCenter = center || userLocation;
        if (!initialCenter || !mapContainerRef.current) return undefined;

        let cancelled = false;
        loadGoogleMaps().then((maps) => {
            if (cancelled || !mapContainerRef.current) return;
            const map = new maps.Map(mapContainerRef.current, {
                center: initialCenter,
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                zoomControl: true,
                scaleControl: true,
                fullscreenControl: true,
                clickableIcons: false,
            });
            mapRef.current = map;
            infoWindowRef.current = new maps.InfoWindow();
            setMapReady(true);
            setMapError("");
        }).catch((error) => {
            if (!cancelled) setMapError(error.message || "Google Mapsを読み込めませんでした。");
        });

        return () => {
            cancelled = true;
            markersRef.current.forEach((marker) => marker.setMap(null));
            markersRef.current = [];
            userMarkerRef.current?.setMap(null);
            userMarkerRef.current = null;
            routeLineRef.current?.setMap(null);
            routeLineRef.current = null;
            infoWindowRef.current?.close();
            infoWindowRef.current = null;
            mapRef.current = null;
            setMapReady(false);
        };
    }, [Boolean(userLocation), Boolean(center)]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        const target = center || userLocation;
        if (target) map.panTo(target);
    }, [center, userLocation, mapReady]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !window.google?.maps) return;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = spots.map((spot) => {
            const status = STATUS_INFO[spot.status] || STATUS_INFO.unknown;
            const marker = new window.google.maps.Marker({
                map,
                position: { lat: spot.lat, lng: spot.lng },
                title: spot.name,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: selectedSpot?.id === spot.id ? 11 : 8,
                    fillColor: status.color,
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: selectedSpot?.id === spot.id ? 3 : 2,
                },
                zIndex: selectedSpot?.id === spot.id ? 10 : 1,
            });
            marker.addListener("click", () => {
                const infoWindow = infoWindowRef.current;
                if (!infoWindow) return;
                infoWindow.setContent(createPopupContent(spot, status, (selected) => onSelectSpotRef.current(selected)));
                infoWindow.open({ map, anchor: marker });
                onSelectSpotRef.current(spot);
            });
            return marker;
        });
    }, [spots, selectedSpot, mapReady]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !window.google?.maps) return;
        userMarkerRef.current?.setMap(null);
        userMarkerRef.current = userLocation
            ? new window.google.maps.Marker({
                map,
                position: userLocation,
                title: "現在地",
                zIndex: 20,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#415e8a",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 3,
                },
            })
            : null;
    }, [userLocation, mapReady]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !window.google?.maps) return;
        routeLineRef.current?.setMap(null);
        routeLineRef.current = routePath.length
            ? new window.google.maps.Polyline({
                map,
                path: routePath,
                geodesic: true,
                strokeColor: "#1565c0",
                strokeOpacity: 0.9,
                strokeWeight: 6,
                zIndex: 5,
                clickable: false,
            })
            : null;
        if (routeLineRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            routePath.forEach((point) => bounds.extend(point));
            map.fitBounds(bounds, 48);
        }
    }, [routePath, mapReady]);

    useEffect(() => {
        if (!mapReady || !infoWindowRef.current) return;
        if (!selectedSpot) {
            infoWindowRef.current.close();
            return;
        }
        const markerIndex = spots.findIndex((spot) => spot.id === selectedSpot.id);
        const marker = markersRef.current[markerIndex];
        if (!marker) return;
        const status = STATUS_INFO[selectedSpot.status] || STATUS_INFO.unknown;
        infoWindowRef.current.setContent(createPopupContent(selectedSpot, status, (spot) => onSelectSpotRef.current(spot)));
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
    }, [selectedSpot, spots, mapReady]);

    return (
        <div className="parking-map-shell">
            <div ref={mapContainerRef} className="parking-map-canvas" />
            {!userLocation && !center && !mapError && (
                <div className="parking-map-error" role="status">現在地を取得するか、地名を検索すると地図を表示します。</div>
            )}
            {mapError && <div className="parking-map-error" role="alert">{mapError}</div>}
        </div>
    );
}
