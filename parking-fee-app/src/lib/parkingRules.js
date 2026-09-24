const STORAGE_KEY = "parking-fee-app-rules";

export function getParkingRules() {
    const savedRules = localStorage.getItem(STORAGE_KEY);

    if (!savedRules) {
        return [];
    }

    try {
        return JSON.parse(savedRules);
    } catch {
        return [];
    }
}

export function saveParkingRules(rules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}