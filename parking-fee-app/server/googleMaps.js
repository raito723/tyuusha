const PLACES_API_ROOT = "https://places.googleapis.com/v1";
const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const PARKING_SEARCH_RADIUS_METERS = 5000;
const NEARBY_SEARCH_CIRCLE_RADIUS_METERS = 5600;
const NEARBY_SEARCH_MAX_RESULTS = 20;

function googleMapsKey() {
    const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!key) {
        const error = new Error("Google MapsサーバーAPIキーが未設定です。.env.local に GOOGLE_MAPS_SERVER_API_KEY を設定してください。");
        error.statusCode = 503;
        throw error;
    }
    return key;
}

async function requestGoogleMaps(url, body, fieldMask) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleMapsKey(),
            "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error("Google Maps API request failed:", response.status, result.error?.message || "Unknown error");
        const error = new Error(response.status === 429
            ? "Google Maps APIの利用上限に達しました。時間をおいて再度お試しください。"
            : "Google Maps APIから情報を取得できませんでした。APIの有効化とキー制限をご確認ください。");
        error.statusCode = response.status === 429 ? 429 : 502;
        throw error;
    }
    return result;
}

function distanceKm(from, to) {
    const radians = (degrees) => (degrees * Math.PI) / 180;
    const latitudeDifference = radians(to.lat - from.lat);
    const longitudeDifference = radians(to.lng - from.lng);
    const value = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDifference / 2) ** 2;
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 100) / 100;
}

function isCoordinate(value) {
    return value && Number.isFinite(value.lat) && Number.isFinite(value.lng)
        && value.lat >= -90 && value.lat <= 90
        && value.lng >= -180 && value.lng <= 180;
}

function nearbySearchCenters(center) {
    const longitudeScale = 111_320 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
    const lngOffset = 2500 / longitudeScale;
    return [
        { lat: center.lat, lng: center.lng - lngOffset },
        { lat: center.lat, lng: center.lng + lngOffset },
    ];
}

export async function searchGoogleNearbyParking(center) {
    if (!isCoordinate(center)) {
        const error = new Error("駐車場を検索する地点が正しくありません。");
        error.statusCode = 400;
        throw error;
    }

    const centers = nearbySearchCenters(center);
    const results = await Promise.all(centers.map((searchCenter) => requestGoogleMaps(
        `${PLACES_API_ROOT}/places:searchNearby`,
        {
            includedTypes: ["parking", "parking_garage", "parking_lot"],
            maxResultCount: NEARBY_SEARCH_MAX_RESULTS,
            languageCode: "ja",
            regionCode: "JP",
            locationRestriction: {
                circle: {
                    center: { latitude: searchCenter.lat, longitude: searchCenter.lng },
                    radius: NEARBY_SEARCH_CIRCLE_RADIUS_METERS,
                },
            },
        },
        "places.id,places.displayName,places.formattedAddress,places.location",
    )));

    const places = results.flatMap((result) => result.places || []);
    const uniquePlaces = new Map();
    for (const place of places) {
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (!place.id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const distance = distanceKm(center, { lat, lng });
        if (distance > PARKING_SEARCH_RADIUS_METERS / 1000) continue;
        uniquePlaces.set(place.id, {
            id: `google-${place.id}`,
            source: "google",
            placeId: place.id,
            name: place.displayName?.text || "名称不明の駐車場",
            address: place.formattedAddress || "住所情報なし",
            lat,
            lng,
            distance,
            status: "unknown",
            dayPrice: null,
            nightPrice: null,
            maximumFee: null,
            dayRateText: null,
            nightRateText: null,
            maxRateText: null,
            businessHours: null,
            capacity: null,
            paymentMethods: [],
            notes: null,
        });
    }

    return [...uniquePlaces.values()].sort((a, b) => a.distance - b.distance);
}

export async function searchGooglePlace(query, biasCenter = null) {
    const textQuery = typeof query === "string" ? query.trim().slice(0, 200) : "";
    if (!textQuery) {
        const error = new Error("地名や住所を入力してください。");
        error.statusCode = 400;
        throw error;
    }

    const requestBody = { textQuery, languageCode: "ja", regionCode: "JP", pageSize: 1 };
    if (isCoordinate(biasCenter)) {
        requestBody.locationBias = {
            circle: {
                center: { latitude: biasCenter.lat, longitude: biasCenter.lng },
                radius: 50_000,
            },
        };
    }
    const result = await requestGoogleMaps(
        `${PLACES_API_ROOT}/places:searchText`,
        requestBody,
        "places.location",
    );
    const location = result.places?.[0]?.location;
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
        const error = new Error("場所が見つかりませんでした。地名や住所を確認してください。");
        error.statusCode = 404;
        throw error;
    }
    return { lat: location.latitude, lng: location.longitude };
}

export async function computeGoogleRoute(origin, destination) {
    if (!isCoordinate(origin) || !isCoordinate(destination)) {
        const error = new Error("経路の出発地または目的地が正しくありません。");
        error.statusCode = 400;
        throw error;
    }

    const result = await requestGoogleMaps(ROUTES_API_URL, {
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "DRIVE",
        polylineQuality: "OVERVIEW",
        polylineEncoding: "ENCODED_POLYLINE",
    }, "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline");

    const route = result.routes?.[0];
    if (!route?.polyline?.encodedPolyline) {
        const error = new Error("この出発地から目的地までの経路が見つかりませんでした。");
        error.statusCode = 404;
        throw error;
    }
    return {
        duration: route.duration || null,
        distanceMeters: route.distanceMeters || null,
        encodedPolyline: route.polyline.encodedPolyline,
    };
}
