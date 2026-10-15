const holidayCache = new Map();

function keyOf(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nthMonday(year, month, ordinal) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    return 1 + ((8 - firstDay) % 7) + (ordinal - 1) * 7;
}

function equinoxDay(year, spring) {
    const base = spring ? 20.8431 : 23.2488;
    const day = Math.floor(base + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return Math.max(spring ? 19 : 22, Math.min(spring ? 22 : 25, day));
}

function getJapaneseHolidayKeys(year) {
    if (holidayCache.has(year)) return holidayCache.get(year);

    const dates = new Set();
    const add = (month, day) => dates.add(keyOf(year, month, day));
    const addDate = (date) => dates.add(keyOf(date.getFullYear(), date.getMonth() + 1, date.getDate()));

    add(1, 1);
    add(1, year >= 2000 ? nthMonday(year, 1, 2) : 15);
    add(2, 11);
    if (year >= 2020) add(2, 23);
    add(3, equinoxDay(year, true));
    add(4, 29);
    add(5, 3);
    if (year >= 2007) add(5, 4);
    add(5, 5);

    if (year === 2020) {
        add(7, 23);
        add(8, 10);
        add(7, 24);
    } else if (year === 2021) {
        add(7, 22);
        add(8, 8);
        add(7, 23);
    } else {
        if (year >= 2003) add(7, nthMonday(year, 7, 3));
        else if (year >= 1996) add(7, 20);
        if (year >= 2016) add(8, 11);
    }

    if (year >= 2003) add(9, nthMonday(year, 9, 3));
    else add(9, 15);
    add(9, equinoxDay(year, false));
    if (year === 2020) add(7, 24);
    else if (year === 2021) add(7, 23);
    else if (year >= 2000) add(10, nthMonday(year, 10, 2));
    else add(10, 10);
    add(11, 3);
    add(11, 23);

    if (year === 2019) {
        add(5, 1);
        add(10, 22);
    }

    // Substitute holidays move to the next day that is not already a holiday.
    if (year >= 1973) {
        const sundayHolidays = [...dates].filter((dateKey) => {
            const [y, month, day] = dateKey.split("-").map(Number);
            return new Date(y, month - 1, day).getDay() === 0;
        });
        for (const dateKey of sundayHolidays) {
            const [y, month, day] = dateKey.split("-").map(Number);
            const substitute = new Date(y, month - 1, day);
            do {
                substitute.setDate(substitute.getDate() + 1);
            } while (dates.has(keyOf(substitute.getFullYear(), substitute.getMonth() + 1, substitute.getDate())));
            addDate(substitute);
        }
    }

    // A weekday between two national holidays is also a public holiday.
    if (year >= 1985) {
        for (let month = 1; month <= 12; month += 1) {
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 2; day < daysInMonth; day += 1) {
                const date = new Date(year, month - 1, day);
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                const before = new Date(year, month - 1, day - 1);
                const after = new Date(year, month - 1, day + 1);
                if (dates.has(keyOf(before.getFullYear(), before.getMonth() + 1, before.getDate()))
                    && dates.has(keyOf(after.getFullYear(), after.getMonth() + 1, after.getDate()))) {
                    addDate(date);
                }
            }
        }
    }

    holidayCache.set(year, dates);
    return dates;
}

export function isJapanesePublicHoliday(date) {
    return getJapaneseHolidayKeys(date.getFullYear()).has(
        keyOf(date.getFullYear(), date.getMonth() + 1, date.getDate())
    );
}
