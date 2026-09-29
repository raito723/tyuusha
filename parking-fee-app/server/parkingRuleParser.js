function normalizeText(text) {
    return text
        .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
        .replace(/[，、]/g, ",")
        .replace(/[：]/g, ":")
        .replace(/[～〜~]/g, "〜")
        .replace(/[‐‑‒–—−]/g, "-");
}

function parseTimes(line) {
    const times = [];
    const patterns = [
        /(\d{1,2})\s*:\s*(\d{1,2})/g,
        /(\d{1,2})時(?:(\d{1,2})分)?/g,
    ];

    for (const pattern of patterns) {
        for (const match of line.matchAll(pattern)) {
            const hour = Number(match[1]);
            const minute = Number(match[2] || 0);
            if (hour > 23 || minute > 59) continue;
            const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            if (!times.includes(time)) times.push(time);
        }
    }
    return times;
}

function classifyLine(line) {
    if (/夜間|深夜|夜料金|夜/.test(line)) return "night";
    if (/昼間|日中|昼料金|昼/.test(line)) return "day";
    return null;
}

function parseRate(line) {
    if (/最大|上限/.test(line)) return null;
    const priceMatch = line.match(/(?:[¥￥]\s*)?([\d,]{1,10})\s*円/);
    if (!priceMatch) return null;

    const durationMatches = [...line.matchAll(/(\d+)\s*(分|時間|min|hour)/g)];
    const durationMatch = durationMatches.at(-1);
    if (!durationMatch) return { intervalMinutes: null, priceYen: Number(priceMatch[1].replaceAll(",", "")) };

    const duration = Number(durationMatch[1]);
    const intervalMinutes = /時間|hour/.test(durationMatch[2]) ? duration * 60 : duration;
    if (intervalMinutes <= 0 || intervalMinutes > 1440) return null;
    return { intervalMinutes, priceYen: Number(priceMatch[1].replaceAll(",", "")) };
}

function getMaximumFee(lines) {
    for (const line of lines) {
        if (!/最大|上限/.test(line)) continue;
        const match = line.match(/(?:[¥￥]\s*)?([\d,]{1,10})\s*円/);
        if (!match) continue;
        const periodMatch = line.match(/(入庫後\s*\d+\s*時間|\d+\s*時間|当日|24時間|繰返し)/);
        return {
            maximumFeeYen: Number(match[1].replaceAll(",", "")),
            maximumFeePeriod: periodMatch?.[1]?.replaceAll(" ", "") || null,
        };
    }
    return { maximumFeeYen: null, maximumFeePeriod: null };
}

function getParkingName(lines) {
    const ignoredLine = /料金|最大|営業時間|支払|精算|時間|\d+\s*(?:円|分|時間)|^\s*[PＰ]\s*$/;
    const name = lines.find((line) => {
        const meaningfulCharacters = line.replace(/[\p{P}\p{S}\s]/gu, "");
        return line.length <= 60
            && meaningfulCharacters.length >= 2
            && !ignoredLine.test(line)
            && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9]/u.test(line);
    });
    return name?.replace(/^(?:駐車場名|名称)\s*[:：]?\s*/, "") || "";
}

export function structureParkingRule(rawText) {
    const lines = normalizeText(rawText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const periods = [];
    const rates = [];

    for (const line of lines) {
        const times = parseTimes(line);
        if (times.length >= 2) {
            const label = classifyLine(line) || (times[0] > times[1] ? "night" : "day");
            periods.push({ label, startTime: times[0], endTime: times[1] });
        }

        const rate = parseRate(line);
        if (rate) rates.push({ ...rate, label: classifyLine(line) });
    }

    const findPeriod = (label) => periods.find((period) => period.label === label);
    const unclassifiedRates = rates.filter((rate) => !rate.label);
    const dayPeriod = findPeriod("day");
    const nightPeriod = findPeriod("night");
    const dayRate = rates.find((rate) => rate.label === "day") || unclassifiedRates[0];
    const nightRate = rates.find((rate) => rate.label === "night") || unclassifiedRates[1];
    const maximum = getMaximumFee(lines);

    return {
        parkingName: getParkingName(lines),
        dayStartTime: dayPeriod?.startTime ?? null,
        dayEndTime: dayPeriod?.endTime ?? null,
        dayIntervalMinutes: dayRate?.intervalMinutes ?? null,
        dayPriceYen: dayRate?.priceYen ?? null,
        nightStartTime: nightPeriod?.startTime ?? null,
        nightEndTime: nightPeriod?.endTime ?? null,
        nightIntervalMinutes: nightRate?.intervalMinutes ?? null,
        nightPriceYen: nightRate?.priceYen ?? null,
        ...maximum,
    };
}
