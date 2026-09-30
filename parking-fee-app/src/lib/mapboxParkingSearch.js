import { calculateDistanceKm } from "./parkingSpots";

const SEARCH_RADIUS_KM = 5;
const MAX_RESULTS = 25;
const SEARCH_GRID_SIZE = 2;
const CATEGORY_LIST_URL = "https://api.mapbox.com/search/searchbox/v1/list/category";
const CATEGORY_SEARCH_URL = "https://api.mapbox.com/search/searchbox/v1/category";
const GEOCODE_SEARCH_URL = "https://api.mapbox.com/search/geocode/v6/forward";

let categoryCache = { token: "", id: "" };

export async function searchLocation(query, token, proximity = null) {
    if (!token) throw new Error("Mapboxトークンがありません。.env.local に VITE_MAPBOX_ACCESS_TOKEN を設定してください。");

    const params = new URLSearchParams({
        q: query,
        access_token: token,
        language: "ja",
        country: "JP",
        limit: "1",
    });
    if (proximity) params.set("proximity", `${proximity.lng},${proximity.lat}`);

    const response = await fetch(`${GEOCODE_SEARCH_URL}?${params}`);
    if (!response.ok) throw new Error("場所を検索できませんでした。別の地名や住所をお試しください。");

    const data = await response.json();
    const [lng, lat] = data.features?.[0]?.geometry?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("場所が見つかりませんでした。地名や住所を確認してください。");
    }
    return { lat, lng };
}

async function getParkingCategoryId(token) {
    if (categoryCache.token === token && categoryCache.id) return categoryCache.id;

    const params = new URLSearchParams({ access_token: token, language: "ja" });
    const response = await fetch(`${CATEGORY_LIST_URL}?${params}`);
    if (!response.ok) throw new Error("Mapboxの駐車場カテゴリを取得できませんでした。");

    const data = await response.json();
    const category = data.listItems?.find((item) =>
        /parking/i.test(item.canonical_id) || item.name?.includes("駐車")
    );
    if (!category) throw new Error("Mapboxの検索カテゴリに駐車場が見つかりませんでした。");

    categoryCache = { token, id: category.canonical_id };
    return category.canonical_id;
}

export async function searchNearbyParking(center, token) {
    if (!token) throw new Error("Mapboxトークンがありません。.env.local に VITE_MAPBOX_ACCESS_TOKEN を設定してください。");

    const categoryId = await getParkingCategoryId(token);
    const latDelta = SEARCH_RADIUS_KM / 111;
    const lngDelta = SEARCH_RADIUS_KM / (111 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
    const minLng = center.lng - lngDelta;
    const maxLng = center.lng + lngDelta;
    const minLat = center.lat - latDelta;
    const maxLat = center.lat + latDelta;
    const cellLng = (maxLng - minLng) / SEARCH_GRID_SIZE;
    const cellLat = (maxLat - minLat) / SEARCH_GRID_SIZE;
    const searchCells = Array.from({ length: SEARCH_GRID_SIZE ** 2 }, (_, index) => {
        const column = index % SEARCH_GRID_SIZE;
        const row = Math.floor(index / SEARCH_GRID_SIZE);
        return [
            minLng + column * cellLng,
            minLat + row * cellLat,
            minLng + (column + 1) * cellLng,
            minLat + (row + 1) * cellLat,
        ];
    });

    // Search Box returns at most 25 results per request. Split the 5 km radius
    // bounds into cells so a dense area does not consume the entire result limit.
    const responses = await Promise.all(searchCells.map(async ([west, south, east, north]) => {
        const params = new URLSearchParams({
            access_token: token,
            language: "ja",
            country: "JP",
            limit: String(MAX_RESULTS),
            proximity: `${center.lng},${center.lat}`,
            bbox: `${west},${south},${east},${north}`,
        });
        const response = await fetch(`${CATEGORY_SEARCH_URL}/${encodeURIComponent(categoryId)}?${params}`);
        if (!response.ok) throw new Error("Mapboxから駐車場情報を取得できませんでした。");
        return response.json();
    }));
    const features = responses.flatMap((data) => data.features || []);
    const attribution = responses.find((data) => data.attribution)?.attribution || "";

    const spots = features.flatMap((feature) => {
        const [lng, lat] = feature.geometry?.coordinates || [];
        const properties = feature.properties || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

        const distance = calculateDistanceKm(center.lat, center.lng, lat, lng);
        if (distance > SEARCH_RADIUS_KM) return [];

        return [{
            id: `mapbox-${properties.mapbox_id}`,
            source: "mapbox",
            name: properties.name_preferred || properties.name || "名称不明の駐車場",
            address: properties.full_address || properties.place_formatted || "住所情報なし",
            lat,
            lng,
            distance,
            status: "unknown",
            dayRateText: null,
            nightRateText: null,
            maxRateText: null,
            businessHours: null,
            capacity: null,
            paymentMethods: [],
            notes: null,
        }];
    }).filter((spot, index, allSpots) => allSpots.findIndex((item) => item.id === spot.id) === index)
        .sort((a, b) => a.distance - b.distance);

    return { spots, attribution };
}
