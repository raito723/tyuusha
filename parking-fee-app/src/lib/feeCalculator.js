function isTimeInRange(hour, startHour, endHour) {
    if (startHour < endHour) {
        return hour >= startHour && hour < endHour;
    }

    return hour >= startHour || hour < endHour;
}

export function calculateParkingFee({
    startTime,
    endTime,
    dayPrice,
    nightPrice,
    maximumFee,
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

    let dayMinutes = 0;
    let nightMinutes = 0;

    const current = new Date(start);

    while (current < end) {
        const hour = current.getHours();

        if (isTimeInRange(hour, 8, 20)) {
            dayMinutes += 1;
        } else {
            nightMinutes += 1;
        }

        current.setMinutes(current.getMinutes() + 1);
    }

    const dayUnits = Math.ceil(dayMinutes / 30);
    const nightUnits = Math.ceil(nightMinutes / 60);

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