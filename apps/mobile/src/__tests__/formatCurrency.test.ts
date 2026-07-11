import {
  formatCompactCurrency,
  formatCurrency,
} from "../utils/formatCurrency";

describe("formatCompactCurrency", () => {
  it("keeps full formatting below a million", () => {
    expect(formatCompactCurrency(0)).toBe(formatCurrency(0));
    expect(formatCompactCurrency(999_999)).toBe(formatCurrency(999_999));
  });

  it("abbreviates millions", () => {
    expect(formatCompactCurrency(1_000_000)).toBe("$1M");
    expect(formatCompactCurrency(2_500_000)).toBe("$2.5M");
    expect(formatCompactCurrency(12_340_000)).toBe("$12.3M");
  });

  it("handles negative amounts", () => {
    expect(formatCompactCurrency(-1_500_000)).toBe("-$1.5M");
  });
});
