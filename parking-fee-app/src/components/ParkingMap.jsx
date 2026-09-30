import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { STATUS_INFO } from "../lib/parkingSpots";

function createMarkerElement(status, selected) {
    const marker = document.createElement("div");
    marker.className = `parking-map-marker${selected ? " is-selected" : ""}`;
    marker.style.setProperty("--marker-color", status.color);
    marker.setAttribute("aria-label", "駐車場の位置");
    const label = document.createElement("span");
    label.textContent = "P";
    label.style.transform = "rotate(45deg)";
    marker.append(label);
    return marker;
}

function createUserMarkerElement() {
    const element = document.createElement("div");
    element.className = "parking-map-user-marker";
    element.setAttribute("aria-label", "あなたの現在地");
    return element;
}

function updateUserLocation(map, location, markerRef, shouldCenter = true) {
    markerRef.current?.remove();
    markerRef.current = null;
    if (!location) return;

    if (shouldCenter) map.flyTo({ center: [location.lng, location.lat], zoom: 15 });
    markerRef.current = new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: "center" })
        .setLngLat([location.lng, location.lat])
        .addTo(map);
}

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

    const rateLines = spot.dayRateText && spot.maxRateText
        ? [`昼間: ${spot.dayRateText}`, `最大: ${spot.maxRateText}`]
        : ["料金・空き状況の情報はありません"];
    for (const text of rateLines) {
        const line = document.createElement("div");
        line.textContent = text;
        root.append(line);
    }

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
    selectedSpot = null,
    onSelectSpot = () => {},
    center = null,
    zoom = 15,
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const userLocationRef = useRef(userLocation);
    const mapLoadedRef = useRef(false);
    const onSelectSpotRef = useRef(onSelectSpot);
    const [mapError, setMapError] = useState("");
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    userLocationRef.current = userLocation;

    useEffect(() => {
        onSelectSpotRef.current = onSelectSpot;
    }, [onSelectSpot]);

    useEffect(() => {
        if (!accessToken) {
            setMapError("Mapboxを表示するには .env.local に VITE_MAPBOX_ACCESS_TOKEN を設定してください。");
            return undefined;
        }
        if (!userLocation && !center) return undefined;

        mapboxgl.accessToken = accessToken;
        const initialCenter = userLocation
            ? [userLocation.lng, userLocation.lat]
            : center;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: initialCenter,
            zoom,
            language: "ja",
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }));
        mapRef.current = map;

        const handleError = (event) => {
            if (event.error) setMapError("Mapboxの地図を読み込めませんでした。アクセストークンと利用設定をご確認ください。");
        };
        map.on("error", handleError);
        map.once("load", () => {
            mapLoadedRef.current = true;
            setMapError("");
            updateUserLocation(map, userLocationRef.current, userMarkerRef, false);
        });

        return () => {
            markersRef.current.forEach(({ marker, popup }) => {
                marker.remove();
                popup.remove();
            });
            markersRef.current = [];
            userMarkerRef.current?.remove();
            userMarkerRef.current = null;
            mapLoadedRef.current = false;
            map.remove();
            mapRef.current = null;
        };
    }, [accessToken, center, userLocation, zoom]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach(({ marker, popup }) => {
            marker.remove();
            popup.remove();
        });
        markersRef.current = spots.map((spot) => {
            const status = STATUS_INFO[spot.status] || STATUS_INFO.unknown;
            const popup = new mapboxgl.Popup({ offset: 20, closeButton: true })
                .setDOMContent(createPopupContent(spot, status, (item) => onSelectSpotRef.current(item)));
            const marker = new mapboxgl.Marker({
                element: createMarkerElement(status, selectedSpot?.id === spot.id),
                anchor: "bottom",
            })
                .setLngLat([spot.lng, spot.lat])
                .setPopup(popup)
                .addTo(map);
            marker.getElement().addEventListener("click", () => onSelectSpotRef.current(spot));
            markersRef.current.push({ marker, popup, spot });
            return { marker, popup, spot };
        });

    }, [spots]);

    useEffect(() => {
        if (!mapRef.current || !mapLoadedRef.current) return;
        updateUserLocation(mapRef.current, userLocation, userMarkerRef, mapLoadedRef.current);
    }, [userLocation]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !selectedSpot) return;
        map.easeTo({ center: [selectedSpot.lng, selectedSpot.lat], zoom: 16, duration: 500 });
        const selectedMarker = markersRef.current.find(({ spot }) => spot.id === selectedSpot.id);
        selectedMarker?.popup.addTo(map);
    }, [selectedSpot]);

    useEffect(() => {
        markersRef.current.forEach(({ marker, spot }) => {
            marker.getElement().classList.toggle("is-selected", selectedSpot?.id === spot.id);
        });
    }, [selectedSpot]);

    return (
        <div className="parking-map-shell">
            <div ref={mapContainerRef} className="parking-map-canvas" />
            {!userLocation && !mapError && (
                <div className="parking-map-error" role="status">現在地を取得すると地図を表示します。</div>
            )}
            {mapError && <div className="parking-map-error" role="status">{mapError}</div>}
        </div>
    );
}
