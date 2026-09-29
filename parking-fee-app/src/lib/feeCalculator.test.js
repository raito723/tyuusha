import assert from "node:assert/strict";
import test from "node:test";
import {
    calculateParkingFee,
    getNextFeeChangeTime,
} from "./feeCalculator.js";

test("keeps the default daytime tariff behavior", () => {
    const result = calculateParkingFee({
        startTime: "2026-09-29T08:00",
        endTime: "2026-09-29T09:00",
        dayPrice: 200,
        nightPrice: 100,
        maximumFee: 0,
    });

    assert.equal(result.totalFee, 400);
});

test("uses OCR-provided tariff intervals and rate times", () => {
    const result = calculateParkingFee({
        startTime: "2026-09-29T07:00",
        endTime: "2026-09-29T07:45",
        dayStartTime: "07:00",
        dayEndTime: "19:00",
        dayIntervalMinutes: 20,
        dayPrice: 100,
        nightStartTime: "19:00",
        nightEndTime: "07:00",
        nightIntervalMinutes: 60,
        nightPrice: 80,
        maximumFee: 0,
    });

    assert.equal(result.dayMinutes, 45);
    assert.equal(result.totalFee, 300);
});

test("calculates both sides of a custom day/night boundary", () => {
    const result = calculateParkingFee({
        startTime: "2026-09-29T18:30",
        endTime: "2026-09-29T19:30",
        dayStartTime: "07:00",
        dayEndTime: "19:00",
        dayIntervalMinutes: 30,
        dayPrice: 100,
        nightStartTime: "19:00",
        nightEndTime: "07:00",
        nightIntervalMinutes: 60,
        nightPrice: 80,
        maximumFee: 0,
    });

    assert.equal(result.dayFee, 100);
    assert.equal(result.nightFee, 80);
    assert.equal(result.totalFee, 180);
});

test("finds the next custom rate change", () => {
    const nextChange = getNextFeeChangeTime({
        startTime: "2026-09-29T18:59",
        endTime: "2026-09-29T20:00",
        dayStartTime: "07:00",
        dayEndTime: "19:00",
        nightStartTime: "19:00",
        nightEndTime: "07:00",
    });

    assert.equal(nextChange.getHours(), 19);
    assert.equal(nextChange.getMinutes(), 0);
});
