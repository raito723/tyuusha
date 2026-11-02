export function getPrepayPricing(amount, couponSelected, minimumFee = 1000, discountRate = 0.2) {
    if (!Number.isFinite(amount) || amount < 0) {
        return { amount: null, discount: 0, total: null, couponEligible: false };
    }

    const couponEligible = amount >= minimumFee;
    const discount = couponSelected && couponEligible
        ? Math.min(amount, Math.floor(amount * discountRate))
        : 0;
    return {
        amount,
        discount,
        total: amount - discount,
        couponEligible,
    };
}
