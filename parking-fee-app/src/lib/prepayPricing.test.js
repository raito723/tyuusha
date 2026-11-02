import assert from "node:assert/strict";
import test from "node:test";
import { getPrepayPricing } from "./prepayPricing.js";

test("applies the 20% coupon to an eligible fee without reducing it to zero", () => {
    assert.deepEqual(getPrepayPricing(1500, true), {
        amount: 1500,
        discount: 300,
        total: 1200,
        couponEligible: true,
    });
});

test("does not apply the coupon below its minimum fee", () => {
    assert.deepEqual(getPrepayPricing(800, true), {
        amount: 800,
        discount: 0,
        total: 800,
        couponEligible: false,
    });
});

test("keeps a zero fee at zero and rejects invalid amounts", () => {
    assert.equal(getPrepayPricing(0, true).total, 0);
    assert.deepEqual(getPrepayPricing(null, true), {
        amount: null,
        discount: 0,
        total: null,
        couponEligible: false,
    });
});
