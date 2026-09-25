// 駐車場データ管理・検索・お気に入りサービス

const FAVORITES_STORAGE_KEY = "parking-fee-app-favorites";

// サンプル駐車場データ（東京駅・丸の内・日本橋・有楽町周辺）
// ※現在地取得時は、現在地からの距離を動的に計算します。
export const DEFAULT_PARKING_SPOTS = [
    {
        id: "spot-1",
        name: "タイムズ東京駅前第1",
        address: "東京都中央区八重洲1-5",
        lat: 35.681236,
        lng: 139.767125,
        dayPrice: 300, // 30分あたり
        nightPrice: 100, // 60分あたり
        maximumFee: 1800,
        dayRateText: "08:00〜20:00 30分 300円",
        nightRateText: "20:00〜08:00 60分 100円",
        maxRateText: "当日最大 1,800円 (24:00まで)",
        capacity: 25,
        status: "vacant", // 'vacant' (空車), 'crowded' (混雑), 'full' (満車)
        paymentMethods: ["cash", "credit", "ic", "qr"], // 現金, クレカ, 交通系IC, QR(PayPay等)
        businessHours: "24時間営業",
        notes: "ハイルーフ車対応、EV充電スタンドあり",
    },
    {
        id: "spot-2",
        name: "NPC24H 丸の内パークビル駐車場",
        address: "東京都千代田区丸の内2-6",
        lat: 35.679112,
        lng: 139.763524,
        dayPrice: 400,
        nightPrice: 200,
        maximumFee: 2400,
        dayRateText: "07:00〜23:00 30分 400円",
        nightRateText: "23:00〜07:00 60分 200円",
        maxRateText: "24時間最大 2,400円",
        capacity: 80,
        status: "crowded",
        paymentMethods: ["cash", "credit", "ic"],
        businessHours: "06:00〜24:00 (夜間出庫不可)",
        notes: "地下駐車場、雨に濡れず直結",
    },
    {
        id: "spot-3",
        name: "リパーク八重洲地下街駐車場",
        address: "東京都中央区八重洲2-1",
        lat: 35.678854,
        lng: 139.768912,
        dayPrice: 350,
        nightPrice: 150,
        maximumFee: 2000,
        dayRateText: "08:00〜22:00 30分 350円",
        nightRateText: "22:00〜08:00 60分 150円",
        maxRateText: "入庫後12時間最大 2,000円",
        capacity: 45,
        status: "full",
        paymentMethods: ["cash", "credit", "qr"],
        businessHours: "24時間営業",
        notes: "地下街お買い物で1時間無料割引あり",
    },
    {
        id: "spot-4",
        name: "ナビパーク 有楽町第2",
        address: "東京都千代田区有楽町1-3",
        lat: 35.673891,
        lng: 139.761245,
        dayPrice: 200,
        nightPrice: 100,
        maximumFee: 1500,
        dayRateText: "08:00〜20:00 30分 200円",
        nightRateText: "20:00〜08:00 60分 100円",
        maxRateText: "入庫後24時間最大 1,500円",
        capacity: 12,
        status: "vacant",
        paymentMethods: ["cash", "credit"],
        businessHours: "24時間営業",
        notes: "路地奥のため料金割安・穴場",
    },
    {
        id: "spot-5",
        name: "GSパーク日本橋三丁目",
        address: "東京都中央区日本橋3-8",
        lat: 35.680124,
        lng: 139.774512,
        dayPrice: 250,
        nightPrice: 100,
        maximumFee: 1600,
        dayRateText: "08:00〜20:00 30分 250円",
        nightRateText: "20:00〜08:00 60分 100円",
        maxRateText: "当日最大 1,600円",
        capacity: 18,
        status: "vacant",
        paymentMethods: ["cash", "ic", "qr"],
        businessHours: "24時間営業",
        notes: "大通りから入りやすく平置きで止めやすい",
    },
    {
        id: "spot-6",
        name: "パラカ丸の内第3駐車場",
        address: "東京都千代田区丸の内3-1",
        lat: 35.676512,
        lng: 139.764891,
        dayPrice: 400,
        nightPrice: 150,
        maximumFee: 2200,
        dayRateText: "08:00〜22:00 30分 400円",
        nightRateText: "22:00〜08:00 60分 150円",
        maxRateText: "夜間最大 800円 (22:00〜08:00)",
        capacity: 30,
        status: "crowded",
        paymentMethods: ["cash", "credit", "ic", "qr"],
        businessHours: "24時間営業",
        notes: "東京国際フォーラム至近",
    },
];

// 2点間の距離（km）を計算（Haversine formula）
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // 小数点第2位まで
}

// 支払い方法の表示ラベル
export const PAYMENT_METHOD_LABELS = {
    cash: { label: "現金", icon: "💴" },
    credit: { label: "クレジットカード", icon: "💳" },
    ic: { label: "交通系IC", icon: "🚆" },
    qr: { label: "QR決済 (PayPay等)", icon: "📱" },
};

// 空き状況ステータスの表示情報
export const STATUS_INFO = {
    vacant: { label: "空車", badgeClass: "status-vacant", color: "#2e7d32", icon: "🟢" },
    crowded: { label: "混雑", badgeClass: "status-crowded", color: "#ed6c02", icon: "🟡" },
    full: { label: "満車", badgeClass: "status-full", color: "#d32f2f", icon: "🔴" },
};

// お気に入り一覧（IDの配列）の取得
export function getFavoriteSpotIds() {
    try {
        const data = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// お気に入り切り替え（トグル）
export function toggleFavoriteSpot(spotId) {
    const favorites = getFavoriteSpotIds();
    let updated;
    if (favorites.includes(spotId)) {
        updated = favorites.filter((id) => id !== spotId);
    } else {
        updated = [...favorites, spotId];
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

// 駐車場一覧のフィルタリングとソート
export function filterAndSortSpots(spots, options = {}) {
    const {
        keyword = "",
        paymentFilter = "all", // "all" または特定の支払いキー
        statusFilter = "all", // "all", "vacant", "not-full"
        onlyFavorites = false,
        favoriteIds = [],
        userLocation = null,
        sortBy = "distance", // "distance", "dayPrice", "maxFee"
    } = options;

    return spots
        .map((spot) => {
            let distance = null;
            if (userLocation && userLocation.lat && userLocation.lng) {
                distance = calculateDistanceKm(
                    userLocation.lat,
                    userLocation.lng,
                    spot.lat,
                    spot.lng
                );
            }
            return {
                ...spot,
                distance,
                isFavorite: favoriteIds.includes(spot.id),
            };
        })
        .filter((spot) => {
            // キーワード検索（名称、住所）
            if (keyword.trim()) {
                const kw = keyword.trim().toLowerCase();
                const matchName = spot.name.toLowerCase().includes(kw);
                const matchAddr = spot.address.toLowerCase().includes(kw);
                if (!matchName && !matchAddr) return false;
            }

            // 支払い方法フィルター
            if (paymentFilter !== "all") {
                if (!spot.paymentMethods.includes(paymentFilter)) return false;
            }

            // 空き状況フィルター
            if (statusFilter === "vacant" && spot.status !== "vacant") {
                return false;
            }
            if (statusFilter === "not-full" && spot.status === "full") {
                return false;
            }

            // お気に入りのみ
            if (onlyFavorites && !spot.isFavorite) {
                return false;
            }

            return true;
        })
        .sort((a, b) => {
            if (sortBy === "distance") {
                if (a.distance !== null && b.distance !== null) {
                    return a.distance - b.distance;
                }
                return 0;
            }
            if (sortBy === "dayPrice") {
                return a.dayPrice - b.dayPrice;
            }
            if (sortBy === "maxFee") {
                return a.maximumFee - b.maximumFee;
            }
            return 0;
        });
}
