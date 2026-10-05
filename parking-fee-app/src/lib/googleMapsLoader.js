let mapsPromise;

export function loadGoogleMaps() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (mapsPromise) return mapsPromise;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return Promise.reject(new Error("Google Maps APIキーが未設定です。.env.local に VITE_GOOGLE_MAPS_API_KEY を設定してください。"));
    }

    mapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=ja&region=JP&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => window.google?.maps
            ? resolve(window.google.maps)
            : reject(new Error("Google Maps JavaScript APIを読み込めませんでした。APIキーと有効化設定をご確認ください。"));
        script.onerror = () => {
            mapsPromise = null;
            reject(new Error("Google Mapsを読み込めませんでした。APIキーと利用設定をご確認ください。"));
        };
        document.head.append(script);
    });

    return mapsPromise;
}

export function decodeGooglePolyline(encoded) {
    const points = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        latitude += result & 1 ? ~(result >> 1) : result >> 1;

        result = 0;
        shift = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        longitude += result & 1 ? ~(result >> 1) : result >> 1;

        points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
    }

    return points;
}
