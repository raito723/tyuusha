function parseTimeToMinutes(value, fallback) {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
        return fallback;
    }

    const [hour, minute] = value.split(":").map(Number);
    return hour < 24 && minute < 60 ? hour * 60 + minute : fallback;
}

function isTimeInRange(time, start, end) {
    if (start < end) return time >= start && time < end;
    return time >= start || time < end;
}

function getRatePeriod(date, dayStart, dayEnd, nightStart, nightEnd) {
    const time = date.getHours() * 60 + date.getMinutes();
    if (isTimeInRange(time, dayStart, dayEnd)) return "day";
    if (isTimeInRange(time, nightStart, nightEnd)) return "night";
    return "night";
}

export function calculateParkingFee({
    startTime,
    endTime,
    dayPrice,
    nightPrice,
    maximumFee,
    dayStartTime = "08:00",
    dayEndTime = "20:00",
    dayIntervalMinutes = 30,
    nightStartTime = "20:00",
    nightEndTime = "08:00",
    nightIntervalMinutes = 60,
}) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { error: "入庫時刻と退場予定時刻を入力してください。" };
    }

    if (end <= start) {
        return {
            error: "退場予定時刻は、入庫時刻より後に設定してください。",
        };
    }

    if (dayIntervalMinutes <= 0 || nightIntervalMinutes <= 0) {
        return { error: "単位時間は1分以上を入力してください。" };
    }

    const dayStart = parseTimeToMinutes(dayStartTime, 8 * 60);
    const dayEnd = parseTimeToMinutes(dayEndTime, 20 * 60);
    const nightStart = parseTimeToMinutes(nightStartTime, dayEnd);
    const nightEnd = parseTimeToMinutes(nightEndTime, dayStart);

    let dayMinutes = 0;
    let nightMinutes = 0;

    const current = new Date(start);

    while (current < end) {
        if (getRatePeriod(current, dayStart, dayEnd, nightStart, nightEnd) === "day") {
            dayMinutes += 1;
        } else {
            nightMinutes += 1;
        }

        current.setMinutes(current.getMinutes() + 1);
    }

    const dayUnits = Math.ceil(dayMinutes / dayIntervalMinutes);
    const nightUnits = Math.ceil(nightMinutes / nightIntervalMinutes);

    const dayFee = dayUnits * dayPrice;
    const nightFee = nightUnits * nightPrice;
    const regularFee = dayFee + nightFee;

    const hasMaximumFee = maximumFee > 0;
    const totalFee = hasMaximumFee
        ? Math.min(regularFee, maximumFee)
        : regularFee;

    return {
        dayMinutes,
        nightMinutes,
        dayFee,
        nightFee,
        regularFee,
        totalFee,
        maximumFeeApplied: hasMaximumFee && regularFee >= maximumFee,
    };
}
// 料金が指定額に達する最初の時刻を探す処理
export function findTimeReachingFee(options) {
    const { startTime, endTime, targetFee } = options;
    if (!targetFee || targetFee <= 0) {
        return null;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (end <= start) {
        return null;
    }

    const current = new Date(start);

    while (current < end) {
        current.setMinutes(current.getMinutes() + 1);

        const result = calculateParkingFee({ ...options, startTime: start, endTime: current });

        if (!result.error && result.totalFee >= targetFee) {
            return current;
        }
    }

    return null;
}

export function getNextFeeChangeTime({
    startTime,
    endTime,
    dayStartTime = "08:00",
    dayEndTime = "20:00",
    nightStartTime = "20:00",
    nightEndTime = "08:00",
}) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    const dayStart = parseTimeToMinutes(dayStartTime, 8 * 60);
    const dayEnd = parseTimeToMinutes(dayEndTime, 20 * 60);
    const nightStart = parseTimeToMinutes(nightStartTime, dayEnd);
    const nightEnd = parseTimeToMinutes(nightEndTime, dayStart);
    const current = new Date(start);

    while (current < end) {
        const before = new Date(current);
        current.setMinutes(current.getMinutes() + 1);

        const wasDayTime = getRatePeriod(before, dayStart, dayEnd, nightStart, nightEnd) === "day";
        const isDayTime = getRatePeriod(current, dayStart, dayEnd, nightStart, nightEnd) === "day";

        if (wasDayTime !== isDayTime) {
            return current;
        }
    }

    return null;
}