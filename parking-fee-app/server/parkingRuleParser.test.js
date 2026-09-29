import assert from "node:assert/strict";
import test from "node:test";
import { structureParkingRule } from "./parkingRuleParser.js";

test("extracts labeled daytime, nighttime, parking name, and maximum fee", () => {
    const rule = structureParkingRule([
        "駐車場名：新宿駅前パーキング",
        "昼間 8:00〜20:00 30分 200円",
        "夜間 20:00〜8:00 60分 100円",
        "当日最大 1,500円",
    ].join("\n"));

    assert.equal(rule.parkingName, "新宿駅前パーキング");
    assert.equal(rule.dayStartTime, "08:00");
    assert.equal(rule.dayEndTime, "20:00");
    assert.equal(rule.dayIntervalMinutes, 30);
    assert.equal(rule.dayPriceYen, 200);
    assert.equal(rule.nightStartTime, "20:00");
    assert.equal(rule.nightEndTime, "08:00");
    assert.equal(rule.nightIntervalMinutes, 60);
    assert.equal(rule.nightPriceYen, 100);
    assert.equal(rule.maximumFeeYen, 1500);
    assert.equal(rule.maximumFeePeriod, "当日");
});

test("assigns unlabeled rates by order without copying one rate into both periods", () => {
    const rule = structureParkingRule([
        "8:00-20:00 30分 220円",
        "20:00-8:00 60分 110円",
    ].join("\n"));

    assert.equal(rule.dayPriceYen, 220);
    assert.equal(rule.nightPriceYen, 110);
});

test("reads the price when the amount appears before the time unit", () => {
    const rule = structureParkingRule([
        "昼間 8:00〜20:00 200円/30分",
        "夜間 20:00〜8:00 100円/60分",
        "最大料金 1,200円",
    ].join("\n"));

    assert.equal(rule.dayPriceYen, 200);
    assert.equal(rule.dayIntervalMinutes, 30);
    assert.equal(rule.nightPriceYen, 100);
    assert.equal(rule.nightIntervalMinutes, 60);
    assert.equal(rule.maximumFeeYen, 1200);
});

test("does not guess values it cannot read", () => {
    const rule = structureParkingRule("料金表\n駐車場名: 柴田駐車場\n終日最大 900円");

    assert.equal(rule.parkingName, "柴田駐車場");
    assert.equal(rule.dayPriceYen, null);
    assert.equal(rule.nightPriceYen, null);
    assert.equal(rule.dayStartTime, null);
    assert.equal(rule.maximumFeeYen, 900);
});

test("does not treat OCR punctuation as a parking name", () => {
    const rule = structureParkingRule("ー\nー");

    assert.equal(rule.parkingName, "");
    assert.equal(rule.dayPriceYen, null);
    assert.equal(rule.nightPriceYen, null);
    assert.equal(rule.maximumFeeYen, null);
});

test("normalizes full-width digits and Japanese time notation", () => {
    const rule = structureParkingRule([
        "昼間 ８時〜１９時 ３０分 ２５０円",
        "夜間 １９時〜７時 ６０分 １００円",
    ].join("\n"));

    assert.equal(rule.dayStartTime, "08:00");
    assert.equal(rule.dayEndTime, "19:00");
    assert.equal(rule.dayPriceYen, 250);
    assert.equal(rule.nightPriceYen, 100);
});
