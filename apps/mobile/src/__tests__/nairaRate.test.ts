import {
  formatRateChange,
  quoteNairaAmount,
} from "../utils/nairaRate";

// These cases mirror backend/firebase/functions/test/fxRates.test.js, so the
// app's button amount and the server's charge can't drift apart.
describe("quoteNairaAmount", () => {
  it("rounds up to the next ₦50", () => {
    expect(quoteNairaAmount(100, 1355.52)).toBe(135600);
    expect(quoteNairaAmount(1, 1350)).toBe(1350);
    expect(quoteNairaAmount(1, 1350.01)).toBe(1400);
  });

  it("does not bump an exact multiple because of float dust", () => {
    expect(quoteNairaAmount(0.1, 13500)).toBe(1350);
  });
});

describe("formatRateChange", () => {
  it("marks rises and falls with an arrow", () => {
    expect(formatRateChange(0.4234)).toBe("▲ 0.42%");
    expect(formatRateChange(-1.2)).toBe("▼ 1.20%");
  });

  it("shows no arrow when the change rounds to zero", () => {
    expect(formatRateChange(0.001)).toBe("0.00%");
    expect(formatRateChange(-0.004)).toBe("0.00%");
  });
});
