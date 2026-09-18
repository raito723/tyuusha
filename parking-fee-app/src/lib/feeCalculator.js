export function calculateParkingFee({
    startTime,
    endTime,
    pricePer30Minutes,
    maximumFee,
}) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return {
            error: "入庫時刻と退場予定時刻を入力してください。",
        };
    }

    const parkingMinutes = Math.ceil((end - start) / (1000 * 60));

    if (parkingMinutes <= 0) {
        return {
            error: "退場予定時刻は、入庫時刻より後に設定してください。",
        };
    }

    const units = Math.ceil(parkingMinutes / 30);
    const regularFee = units * pricePer30Minutes;

    const hasMaximumFee = maximumFee > 0;
    const totalFee = hasMaximumFee
        ? Math.min(regularFee, maximumFee)
        : regularFee;

    return {
        parkingMinutes,
        units,
        regularFee,
        totalFee,
        maximumFeeApplied: hasMaximumFee && regularFee >= maximumFee,
    };
}