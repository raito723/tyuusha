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
    allDayRate = false,
    maximumFeeAllDay = true,
    maximumFeeDay,
    maximumFeeNight,
    maximumFeeRecurring = false,
    maximumFeePeriodHours = 24,
    weekdayRates = {},
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

    if ((!allDayRate && (dayIntervalMinutes <= 0 || nightIntervalMinutes <= 0))
        || (allDayRate && dayIntervalMinutes <= 0)) {
        return { error: "単位時間は1分以上を入力してください。" };
    }

    const dayStart = parseTimeToMinutes(dayStartTime, 8 * 60);
    const dayEnd = parseTimeToMinutes(dayEndTime, 20 * 60);
    const nightStart = parseTimeToMinutes(nightStartTime, dayEnd);
    const nightEnd = parseTimeToMinutes(nightEndTime, dayStart);

    const totalMinutes = Math.ceil((end.getTime() - start.getTime()) / 60000);
    const resetMinutes = maximumFeeRecurring && Number(maximumFeePeriodHours) > 0
        ? Math.round(Number(maximumFeePeriodHours) * 60)
        : totalMinutes;
    if (!Number.isFinite(resetMinutes) || resetMinutes < 1) return { error: "最大料金の繰り返し期間を確認してください。" };

    let dayMinutes = 0;
    let nightMinutes = 0;
    let totalRegularFee = 0;
    let totalCappedFee = 0;
    let totalDayFee = 0;
    let totalNightFee = 0;
    let maximumFeeApplied = false;
    let offset = 0;

    while (offset < totalMinutes) {
        const windowEnd = Math.min(totalMinutes, offset + resetMinutes);
        const buckets = new Map();
        const current = new Date(start.getTime() + offset * 60000);
        for (let minute = offset; minute < windowEnd; minute += 1) {
            const weekday = current.getDay();
            const period = allDayRate ? "day" : getRatePeriod(current, dayStart, dayEnd, nightStart, nightEnd);
            const weekdayRate = weekdayRates?.[weekday] || weekdayRates?.[String(weekday)];
            const rate = period === "day"
                ? { interval: Number(weekdayRate?.dayIntervalMinutes) || Number(dayIntervalMinutes), price: Number(weekdayRate?.dayPrice ?? dayPrice) || 0 }
                : { interval: Number(weekdayRate?.nightIntervalMinutes) || Number(nightIntervalMinutes), price: Number(weekdayRate?.nightPrice ?? nightPrice) || 0 };
            const key = `${period}-${rate.interval}-${rate.price}`;
            const bucket = buckets.get(key) || { period, interval: rate.interval, price: rate.price, minutes: 0 };
            bucket.minutes += 1;
            buckets.set(key, bucket);
            if (period === "day") dayMinutes += 1;
            else nightMinutes += 1;
            current.setMinutes(current.getMinutes() + 1);
        }

        let windowDayFee = 0;
        let windowNightFee = 0;
        for (const bucket of buckets.values()) {
            const fee = Math.ceil(bucket.minutes / bucket.interval) * bucket.price;
            if (bucket.period === "day") windowDayFee += fee;
            else windowNightFee += fee;
        }
        const windowRegularFee = windowDayFee + windowNightFee;
        const dayCap = Number(maximumFeeDay ?? 0) > 0 ? Number(maximumFeeDay) : 0;
        const nightCap = Number(maximumFeeNight ?? 0) > 0 ? Number(maximumFeeNight) : 0;
        const singleCap = Number(maximumFee ?? 0) > 0 ? Number(maximumFee) : 0;
        const windowFee = maximumFeeAllDay
            ? (singleCap > 0 ? Math.min(windowRegularFee, singleCap) : windowRegularFee)
            : (dayCap > 0 ? Math.min(windowDayFee, dayCap) : windowDayFee)
                + (nightCap > 0 ? Math.min(windowNightFee, nightCap) : windowNightFee);
        const windowMaximumReached = maximumFeeAllDay
            ? singleCap > 0 && windowRegularFee >= singleCap
            : (dayCap > 0 && windowDayFee >= dayCap) || (nightCap > 0 && windowNightFee >= nightCap);
        maximumFeeApplied ||= windowMaximumReached;
        totalRegularFee += windowRegularFee;
        totalCappedFee += windowFee;
        totalDayFee += maximumFeeAllDay && windowRegularFee > 0
            ? windowDayFee * windowFee / windowRegularFee
            : (dayCap > 0 ? Math.min(windowDayFee, dayCap) : windowDayFee);
        totalNightFee += maximumFeeAllDay && windowRegularFee > 0
            ? windowNightFee * windowFee / windowRegularFee
            : (nightCap > 0 ? Math.min(windowNightFee, nightCap) : windowNightFee);
        offset = windowEnd;
    }

    const regularFee = totalRegularFee;
    const dayFee = Math.round(totalDayFee);
    const nightFee = Math.round(totalNightFee);
    const totalFee = totalCappedFee;

    return {
        dayMinutes,
        nightMinutes,
        dayFee,
        nightFee,
        regularFee,
        totalFee,
        maximumFeeApplied,
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
    allDayRate = false,
    weekdayRates = {},
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
        const weekdayChanged = Object.keys(weekdayRates || {}).length > 0 && before.getDay() !== current.getDay();

        if (weekdayChanged || (!allDayRate && wasDayTime !== isDayTime)) {
            return current;
        }
    }

    return null;
}
