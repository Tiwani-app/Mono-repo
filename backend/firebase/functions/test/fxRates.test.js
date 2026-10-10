/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  appendRateHistory,
  change24hPercent,
  DEFAULT_FX_BUFFER_PERCENT,
  evaluateRateUpdate,
  fetchCrossCheckRate,
  normaliseBufferPercent,
  quoteNairaAmount,
  resolvePaystackRate,
  RATE_HISTORY_WINDOW_MS,
  isRateStale,
  percentDifference,
  resolveEffectiveRate,
  MAX_RATE_MOVE_PERCENT,
  MAX_SOURCE_DISAGREEMENT_PERCENT,
  RATE_STALE_AFTER_MS,
} = require("../lib/fxRates");

const candidate = (rate, source = "primary") => ({ rate, source });
// Minimal stand-in for a Firestore Timestamp — only toMillis() is used.
const stamp = (ms) => ({ toMillis: () => ms });

test("accepts a rate when both feeds agree and the move is small", () => {
  const decision = evaluateRateUpdate({
    primary: candidate(1500, "openexchangerates"),
    crossCheck: candidate(1505, "exchangeratesapi"),
    previousRate: 1480,
  });
  assert.equal(decision.accepted, true);
  assert.equal(decision.midRate, 1500);
  assert.equal(decision.source, "openexchangerates");
  assert.equal(decision.crossCheckRate, 1505);
});

test("accepts the first ever rate, when there is no previous one", () => {
  const decision = evaluateRateUpdate({
    primary: candidate(1500),
    crossCheck: candidate(1500, "cross"),
    previousRate: null,
  });
  assert.equal(decision.accepted, true);
  assert.equal(decision.midRate, 1500);
});

test(`rejects a rate that moves more than ${MAX_RATE_MOVE_PERCENT}% in one refresh`, () => {
  // 1000 -> 1200 is a 20% jump.
  const decision = evaluateRateUpdate({
    primary: candidate(1200),
    crossCheck: candidate(1200, "cross"),
    previousRate: 1000,
  });
  assert.equal(decision.accepted, false);
  assert.match(decision.reason, /moved 20\.00%/);
});

test("accepts a move that sits just inside the limit", () => {
  // 1000 -> 1040 is 4%, under the 5% limit.
  const decision = evaluateRateUpdate({
    primary: candidate(1040),
    crossCheck: candidate(1040, "cross"),
    previousRate: 1000,
  });
  assert.equal(decision.accepted, true);
});

test(`rejects when the two sources disagree by more than ${MAX_SOURCE_DISAGREEMENT_PERCENT}%`, () => {
  // 1500 vs 1600 is ~6.67% apart.
  const decision = evaluateRateUpdate({
    primary: candidate(1500, "openexchangerates"),
    crossCheck: candidate(1600, "exchangeratesapi"),
    previousRate: 1500,
  });
  assert.equal(decision.accepted, false);
  assert.match(decision.reason, /disagree/);
});

test("rejects a zero, negative or non-numeric primary rate", () => {
  for (const bad of [0, -5, Number.NaN, Infinity, "1500", null]) {
    const decision = evaluateRateUpdate({
      primary: bad === null ? null : candidate(bad),
      crossCheck: candidate(1500, "cross"),
      previousRate: 1500,
    });
    assert.equal(decision.accepted, false, `expected ${String(bad)} to be rejected`);
  }
});

test("refuses to price on a single source when the cross-check is unavailable", () => {
  const decision = evaluateRateUpdate({
    primary: candidate(1500),
    crossCheck: null,
    previousRate: 1500,
  });
  assert.equal(decision.accepted, false);
  assert.match(decision.reason, /Cross-check/);
});

test("rejects an unusable cross-check rate", () => {
  const decision = evaluateRateUpdate({
    primary: candidate(1500),
    crossCheck: candidate(0, "cross"),
    previousRate: 1500,
  });
  assert.equal(decision.accepted, false);
});

test("percentDifference is symmetric in magnitude and handles a zero base", () => {
  assert.equal(percentDifference(100, 110), 10);
  assert.equal(percentDifference(100, 90), 10);
  assert.equal(percentDifference(0, 100), Infinity);
});

test("isRateStale flips exactly at the staleness window", () => {
  const now = 1_000_000_000_000;
  assert.equal(isRateStale(now - RATE_STALE_AFTER_MS + 1000, now), false);
  assert.equal(isRateStale(now - RATE_STALE_AFTER_MS - 1000, now), true);
});

test("resolveEffectiveRate returns the stored rate while it is fresh", () => {
  const now = 1_000_000_000_000;
  const result = resolveEffectiveRate(
    { midRate: 1500, fetchedAt: stamp(now - 60_000) },
    now,
  );
  assert.deepEqual(result, { rate: 1500, stale: false, fromOverride: false });
});

test("resolveEffectiveRate reports stale once past the window, so pricing refuses", () => {
  const now = 1_000_000_000_000;
  const result = resolveEffectiveRate(
    { midRate: 1500, fetchedAt: stamp(now - RATE_STALE_AFTER_MS - 1) },
    now,
  );
  assert.deepEqual(result, { stale: true });
});

test("an unexpired override wins over the feed rate, even when the feed rate is stale", () => {
  const now = 1_000_000_000_000;
  const result = resolveEffectiveRate(
    {
      midRate: 1500,
      fetchedAt: stamp(now - RATE_STALE_AFTER_MS - 1),
      override: { rate: 1600, expiresAt: stamp(now + 60_000), setBy: "ops" },
    },
    now,
  );
  assert.deepEqual(result, { rate: 1600, stale: false, fromOverride: true });
});

test("an expired override is ignored and the stored rate applies again", () => {
  const now = 1_000_000_000_000;
  const result = resolveEffectiveRate(
    {
      midRate: 1500,
      fetchedAt: stamp(now - 60_000),
      override: { rate: 1600, expiresAt: stamp(now - 1), setBy: "ops" },
    },
    now,
  );
  assert.deepEqual(result, { rate: 1500, stale: false, fromOverride: false });
});

test("an expired override over a stale rate still reports stale", () => {
  const now = 1_000_000_000_000;
  const result = resolveEffectiveRate(
    {
      midRate: 1500,
      fetchedAt: stamp(now - RATE_STALE_AFTER_MS - 1),
      override: { rate: 1600, expiresAt: stamp(now - 1), setBy: "ops" },
    },
    now,
  );
  assert.deepEqual(result, { stale: true });
});

// --- History and 24h change ------------------------------------------------

const HOUR = 60 * 60 * 1000;

test("appendRateHistory keeps readings inside the window and drops older ones", () => {
  const now = 1_000_000_000_000;
  const history = [
    { rate: 1300, at: now - RATE_HISTORY_WINDOW_MS - HOUR },
    { rate: 1310, at: now - 2 * HOUR },
  ];
  const next = appendRateHistory(history, { rate: 1320, at: now }, now);
  assert.deepEqual(next.map((p) => p.rate), [1310, 1320]);
});

test("change24hPercent compares against the reading closest to 24h ago", () => {
  const now = 1_000_000_000_000;
  const history = [
    { rate: 1000, at: now - 25 * HOUR },
    { rate: 1300, at: now - 24 * HOUR },
    { rate: 1500, at: now - 2 * HOUR },
  ];
  assert.equal(change24hPercent(history, 1313, now).toFixed(2), "1.00");
});

test("change24hPercent reports a fall as negative", () => {
  const now = 1_000_000_000_000;
  const history = [{ rate: 1400, at: now - 24 * HOUR }];
  assert.ok(change24hPercent(history, 1386, now) < 0);
});

test("change24hPercent is null until a reading is at least 23h old", () => {
  const now = 1_000_000_000_000;
  assert.equal(change24hPercent([{ rate: 1300, at: now - 5 * HOUR }], 1310, now), null);
  assert.equal(change24hPercent(undefined, 1310, now), null);
});

// --- Pricing -----------------------------------------------------------------

test("quoteNairaAmount rounds up to the next ₦50", () => {
  assert.equal(quoteNairaAmount(100, 1355.52), 135600); // 135,552 -> 135,600
  assert.equal(quoteNairaAmount(1, 1350), 1350); // exact multiple stays put
  assert.equal(quoteNairaAmount(1, 1350.01), 1400);
});

test("quoteNairaAmount does not bump an exact multiple because of float dust", () => {
  // 0.1 * 13500 = 1350.0000000000002 in floating point.
  assert.equal(quoteNairaAmount(0.1, 13500), 1350);
});

test("normaliseBufferPercent defaults to 2% and clamps to 0-10%", () => {
  assert.equal(normaliseBufferPercent(undefined), DEFAULT_FX_BUFFER_PERCENT);
  assert.equal(normaliseBufferPercent("3"), DEFAULT_FX_BUFFER_PERCENT);
  assert.equal(normaliseBufferPercent(-1), 0);
  assert.equal(normaliseBufferPercent(25), 10);
  assert.equal(normaliseBufferPercent(0), 0);
  assert.equal(normaliseBufferPercent(3.5), 3.5);
});

const NOW = 1_000_000_000_000;
const freshDoc = {
  midRate: 1328.94,
  fetchedAt: stamp(NOW - HOUR),
  history: [{ rate: 1320, at: NOW - 24 * HOUR }],
};

test("resolvePaystackRate uses the automatic rate plus the buffer when fresh", () => {
  const rate = resolvePaystackRate({
    fxDoc: freshDoc,
    manualRate: 1500,
    manualRateUpdatedAtMs: null,
    bufferPercent: 2,
    nowMs: NOW,
  });
  assert.equal(rate.source, "automatic");
  assert.equal(rate.midRate, 1328.94);
  assert.equal(rate.appliedRate, 1355.52); // 1328.94 * 1.02, to 2dp
  assert.equal(rate.updatedAtMs, NOW - HOUR);
  assert.ok(rate.change24hPercent > 0);
});

test("resolvePaystackRate falls back to the manual rate, unbuffered, when automatic is stale", () => {
  const rate = resolvePaystackRate({
    fxDoc: { ...freshDoc, fetchedAt: stamp(NOW - RATE_STALE_AFTER_MS - 1) },
    manualRate: 1500,
    manualRateUpdatedAtMs: NOW - 3 * HOUR,
    bufferPercent: 2,
    nowMs: NOW,
  });
  assert.deepEqual(rate, {
    source: "manual",
    midRate: 1500,
    bufferPercent: 0,
    appliedRate: 1500,
    updatedAtMs: NOW - 3 * HOUR,
    change24hPercent: null,
  });
});

test("resolvePaystackRate falls back to manual when no automatic rate was ever accepted", () => {
  // The doc exists after a rejected first run, but has no midRate/fetchedAt.
  const rate = resolvePaystackRate({
    fxDoc: { lastError: "Cross-check feed unavailable" },
    manualRate: 1500,
    manualRateUpdatedAtMs: null,
    bufferPercent: 2,
    nowMs: NOW,
  });
  assert.equal(rate.source, "manual");
});

test("resolvePaystackRate returns null when automatic is stale and no manual rate is set", () => {
  const rate = resolvePaystackRate({
    fxDoc: { ...freshDoc, fetchedAt: stamp(NOW - RATE_STALE_AFTER_MS - 1) },
    manualRate: 0,
    manualRateUpdatedAtMs: null,
    bufferPercent: 2,
    nowMs: NOW,
  });
  assert.equal(rate, null);
});

test("an unexpired staff override beats both the feed and the manual rate", () => {
  const rate = resolvePaystackRate({
    fxDoc: {
      ...freshDoc,
      override: { rate: 1400, expiresAt: stamp(NOW + HOUR), setBy: "ops" },
    },
    manualRate: 1500,
    manualRateUpdatedAtMs: null,
    bufferPercent: 0,
    nowMs: NOW,
  });
  assert.equal(rate.source, "override");
  assert.equal(rate.appliedRate, 1400);
});

// --- Cross-check feed adapter (CurrencyBeacon) --------------------------------

const withFetch = async (respond, run) => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return respond(url);
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
};
const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });

test("fetchCrossCheckRate reads CurrencyBeacon's response.rates and sends the key and symbols", async () => {
  await withFetch(
    () => jsonResponse({ meta: { code: 200 }, response: { base: "USD", rates: { NGN: 1324.1, USD: 1 } } }),
    async (calls) => {
      const result = await fetchCrossCheckRate("USD_NGN", "test key");
      assert.deepEqual(result, { rate: 1324.1, source: "currencybeacon" });
      assert.match(calls[0], /^https:\/\/api\.currencybeacon\.com\/v1\/latest\?/);
      assert.match(calls[0], /api_key=test%20key/);
      assert.match(calls[0], /symbols=USD,NGN/);
    },
  );
});

test("fetchCrossCheckRate also accepts rates mirrored at the top level", async () => {
  await withFetch(
    () => jsonResponse({ rates: { NGN: 1330 } }),
    async () => {
      const result = await fetchCrossCheckRate("USD_NGN", "key");
      assert.equal(result.rate, 1330);
    },
  );
});

test("fetchCrossCheckRate derives the cross rate when the feed base differs", async () => {
  await withFetch(
    () => jsonResponse({ response: { base: "EUR", rates: { USD: 1.1, NGN: 1452 } } }),
    async () => {
      const result = await fetchCrossCheckRate("USD_NGN", "key");
      assert.equal(result.rate.toFixed(2), "1320.00");
    },
  );
});

test("fetchCrossCheckRate returns null rather than throwing on bad responses", async () => {
  const cases = [
    () => jsonResponse({ meta: { code: 401, error_type: "invalid_api_key" } }, false),
    () => jsonResponse({ response: { base: "USD", rates: {} } }),
    () => jsonResponse({ response: { base: "USD", rates: { NGN: 0 } } }),
    () => {
      throw new Error("network down");
    },
  ];
  for (const respond of cases) {
    await withFetch(respond, async () => {
      assert.equal(await fetchCrossCheckRate("USD_NGN", "key"), null);
    });
  }
});

test("fetchCrossCheckRate makes no request without an API key", async () => {
  await withFetch(
    () => jsonResponse({}),
    async (calls) => {
      assert.equal(await fetchCrossCheckRate("USD_NGN", ""), null);
      assert.equal(calls.length, 0);
    },
  );
});
