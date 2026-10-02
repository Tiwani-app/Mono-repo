import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { writeSystemAuditLog } from "./audit";
import { db } from "./firebase";
import { sendOpsAlertEmail } from "./opsAlerts";

/**
 * Automatic FX rates for Paystack (payment-feature.md §15).
 *
 * Paystack collects Naira while the ledger is denominated in the org's own
 * currency, so a rate is needed to price a Naira checkout. This module keeps a
 * single shared rate per currency pair, refreshed on a schedule from outside
 * feeds, because Paystack exposes no exchange-rate API of its own.
 *
 * Payments never call the feeds — they read the stored rate — so a feed outage
 * cannot slow down or break checkout (§15.3).
 */

export const fxPrimaryApiKey = defineSecret("FX_PRIMARY_API_KEY");
export const fxCrossCheckApiKey = defineSecret("FX_CROSSCHECK_API_KEY");

export type FxPair = "USD_NGN";

/** Every pair the scheduled refresh maintains. More land here as Paystack countries are added (§15.7). */
export const FX_PAIRS: FxPair[] = ["USD_NGN"];

export interface FxRateOverride {
  rate: number;
  expiresAt: Timestamp;
  setBy: string;
}

export interface FxRateDoc {
  pair: FxPair;
  midRate: number;
  source: string;
  crossCheckRate: number | null;
  crossCheckSource: string | null;
  cbnReferenceRate: number | null;
  fetchedAt: Timestamp;
  lastAttemptAt: Timestamp;
  lastError: string | null;
  override?: FxRateOverride;
  // Accepted readings from roughly the last day, oldest first, for the 24h change.
  history?: FxRatePoint[];
}

export interface FxRatePoint {
  rate: number;
  at: number; // epoch ms
}

// Thresholds from §15.5. Starting values — tune once there is real data to look at.
export const MAX_RATE_MOVE_PERCENT = 5;
export const MAX_SOURCE_DISAGREEMENT_PERCENT = 3;
export const RATE_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface RateCandidate {
  rate: number;
  source: string;
}

export type RateDecision =
  | {
      accepted: true;
      midRate: number;
      source: string;
      crossCheckRate: number | null;
      crossCheckSource: string | null;
    }
  | { accepted: false; reason: string };

/** Percentage gap between two rates, relative to the first. */
export const percentDifference = (from: number, to: number): number =>
  from === 0 ? Infinity : Math.abs((to - from) / from) * 100;

const isUsableRate = (rate: unknown): rate is number =>
  typeof rate === "number" && Number.isFinite(rate) && rate > 0;

/**
 * Decide whether a freshly fetched rate may replace the stored one (§15.5).
 *
 * Pure on purpose: every guard is exercised by unit tests without touching
 * Firestore or the network. On rejection the caller keeps the last good rate.
 */
export const evaluateRateUpdate = ({
  primary,
  crossCheck,
  previousRate,
}: {
  primary: RateCandidate | null;
  crossCheck: RateCandidate | null;
  previousRate: number | null;
}): RateDecision => {
  if (!primary || !isUsableRate(primary.rate)) {
    return { accepted: false, reason: "Primary feed returned no usable rate." };
  }

  if (crossCheck && !isUsableRate(crossCheck.rate)) {
    return {
      accepted: false,
      reason: "Cross-check feed returned no usable rate.",
    };
  }

  if (!crossCheck) {
    return {
      accepted: false,
      reason: "Cross-check feed unavailable; refusing to price on one source.",
    };
  }

  const disagreement = percentDifference(primary.rate, crossCheck.rate);
  if (disagreement > MAX_SOURCE_DISAGREEMENT_PERCENT) {
    return {
      accepted: false,
      reason:
        `Sources disagree by ${disagreement.toFixed(2)}% ` +
        `(${primary.source} ${primary.rate} vs ${crossCheck.source} ${crossCheck.rate}), ` +
        `limit ${MAX_SOURCE_DISAGREEMENT_PERCENT}%.`,
    };
  }

  if (isUsableRate(previousRate)) {
    const move = percentDifference(previousRate, primary.rate);
    if (move > MAX_RATE_MOVE_PERCENT) {
      return {
        accepted: false,
        reason:
          `Rate moved ${move.toFixed(2)}% in one refresh ` +
          `(${previousRate} → ${primary.rate}), limit ${MAX_RATE_MOVE_PERCENT}%.`,
      };
    }
  }

  return {
    accepted: true,
    midRate: primary.rate,
    source: primary.source,
    crossCheckRate: crossCheck.rate,
    crossCheckSource: crossCheck.source,
  };
};

/** A rate older than the staleness window must not price a payment (§15.5). */
export const isRateStale = (fetchedAtMs: number, nowMs: number): boolean =>
  nowMs - fetchedAtMs > RATE_STALE_AFTER_MS;

/**
 * The rate pricing should use: an unexpired staff override wins over the feed
 * rate, otherwise the stored mid rate, and a stale rate yields null so the
 * caller refuses the payment rather than charging at an old rate (§15.5).
 */
export const resolveEffectiveRate = (
  doc: Pick<FxRateDoc, "midRate" | "fetchedAt" | "override">,
  nowMs: number,
): { rate: number; stale: false; fromOverride: boolean } | { stale: true } => {
  const override = doc.override;
  if (override && override.expiresAt.toMillis() > nowMs) {
    return { rate: override.rate, stale: false, fromOverride: true };
  }
  if (isRateStale(doc.fetchedAt.toMillis(), nowMs)) {
    return { stale: true };
  }
  return { rate: doc.midRate, stale: false, fromOverride: false };
};

// ---------------------------------------------------------------------------
// History and 24-hour change
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
// A little over a day, so a reading from ~24h ago is still there to compare with.
export const RATE_HISTORY_WINDOW_MS = 26 * 60 * 60 * 1000;

/** Add an accepted reading and drop readings that fall outside the window. */
export const appendRateHistory = (
  history: FxRatePoint[] | undefined,
  point: FxRatePoint,
  nowMs: number,
): FxRatePoint[] =>
  [...(history ?? []), point].filter(
    (entry) => nowMs - entry.at <= RATE_HISTORY_WINDOW_MS,
  );

/**
 * Signed % change from the reading closest to 24 hours ago. Null until a
 * reading at least 23 hours old exists, so a young history doesn't pass off a
 * shorter window as "24h".
 */
export const change24hPercent = (
  history: FxRatePoint[] | undefined,
  currentRate: number,
  nowMs: number,
): number | null => {
  const old = (history ?? []).filter(
    (entry) => nowMs - entry.at >= DAY_MS - 60 * 60 * 1000 && isUsableRate(entry.rate),
  );
  if (old.length === 0) {
    return null;
  }
  const base = old.reduce((closest, entry) =>
    Math.abs(nowMs - entry.at - DAY_MS) < Math.abs(nowMs - closest.at - DAY_MS)
      ? entry
      : closest,
  );
  return ((currentRate - base.rate) / base.rate) * 100;
};

// ---------------------------------------------------------------------------
// Pricing a Naira payment (§15.4)
// ---------------------------------------------------------------------------

export const DEFAULT_FX_BUFFER_PERCENT = 2;
export const MAX_FX_BUFFER_PERCENT = 10;
export const NAIRA_ROUNDING_STEP = 50;

/** The org's buffer %, defaulting to 2% and clamped to 0–10%. */
export const normaliseBufferPercent = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), MAX_FX_BUFFER_PERCENT)
    : DEFAULT_FX_BUFFER_PERCENT;

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Naira to collect for an org-currency amount, rounded up to the nearest ₦50
 * so the community never receives slightly less than the dues. Rounded to kobo
 * first so floating-point dust can't push an exact multiple up a step.
 */
export const quoteNairaAmount = (orgAmount: number, appliedRate: number): number =>
  Math.ceil(roundTo2(orgAmount * appliedRate) / NAIRA_ROUNDING_STEP) *
  NAIRA_ROUNDING_STEP;

export type PaystackRateSource = "automatic" | "override" | "manual";

export interface PaystackRate {
  source: PaystackRateSource;
  midRate: number;
  bufferPercent: number;
  appliedRate: number;
  updatedAtMs: number | null;
  change24hPercent: number | null;
}

/**
 * The rate a Paystack payment is priced at. The automatic rate plus the org's
 * buffer comes first (an unexpired staff override stands in for it). The
 * admin's manual rate is only a fallback for when the automatic rate is missing
 * or stale, and is used as entered, without the buffer, since the admin chose
 * that exact figure. Null means Naira payments are unavailable.
 */
export const resolvePaystackRate = ({
  fxDoc,
  manualRate,
  manualRateUpdatedAtMs,
  bufferPercent,
  nowMs,
}: {
  fxDoc: Partial<Pick<FxRateDoc, "midRate" | "fetchedAt" | "override" | "history">> | null;
  manualRate: number;
  manualRateUpdatedAtMs: number | null;
  bufferPercent: number;
  nowMs: number;
}): PaystackRate | null => {
  const withBuffer = (
    source: PaystackRateSource,
    midRate: number,
    updatedAtMs: number | null,
    change: number | null,
  ): PaystackRate => ({
    source,
    midRate,
    bufferPercent,
    appliedRate: roundTo2(midRate * (1 + bufferPercent / 100)),
    updatedAtMs,
    change24hPercent: change,
  });

  const override = fxDoc?.override;
  if (override && isUsableRate(override.rate) && override.expiresAt.toMillis() > nowMs) {
    return withBuffer("override", override.rate, null, null);
  }
  const fetchedAtMs = fxDoc?.fetchedAt?.toMillis();
  if (
    fxDoc &&
    isUsableRate(fxDoc.midRate) &&
    fetchedAtMs !== undefined &&
    !isRateStale(fetchedAtMs, nowMs)
  ) {
    return withBuffer(
      "automatic",
      fxDoc.midRate,
      fetchedAtMs,
      change24hPercent(fxDoc.history, fxDoc.midRate, nowMs),
    );
  }
  if (isUsableRate(manualRate)) {
    return {
      source: "manual",
      midRate: manualRate,
      bufferPercent: 0,
      appliedRate: manualRate,
      updatedAtMs: manualRateUpdatedAtMs,
      change24hPercent: null,
    };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Feed adapters
//
// Each returns null rather than throwing, so one feed being down becomes a
// rejected refresh (last good rate kept + alert) instead of a crashed job.
// ---------------------------------------------------------------------------

const [baseOf, quoteOf] = [
  (pair: FxPair) => pair.split("_")[0],
  (pair: FxPair) => pair.split("_")[1],
];

const fetchJson = async (url: string): Promise<unknown | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
};

const numberAt = (value: unknown, ...path: string[]): number | null => {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return isUsableRate(current) ? current : null;
};

/** Primary feed: Open Exchange Rates (`latest.json?app_id=…`). USD base. */
export const fetchPrimaryRate = async (
  pair: FxPair,
  apiKey: string,
): Promise<RateCandidate | null> => {
  if (!apiKey) {
    return null;
  }
  const quote = quoteOf(pair);
  const body = await fetchJson(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(apiKey)}&base=${baseOf(pair)}&symbols=${quote}`,
  );
  const rate = numberAt(body, "rates", quote);
  return rate === null ? null : { rate, source: "openexchangerates" };
};

/**
 * Cross-check feed: exchangeratesapi.io / Fixer-compatible (`/latest?access_key=…`).
 *
 * The free plan serves only the default EUR base — changing `base` is a paid
 * feature — so we never send `base`. Instead we fetch both legs of the pair
 * against EUR and derive the cross rate: base→quote = (EUR→quote) ÷ (EUR→base).
 * This is mathematically identical to a direct base-quote quote and works on
 * every plan tier, so the cross-check needs no plan upgrade to function.
 */
export const fetchCrossCheckRate = async (
  pair: FxPair,
  apiKey: string,
): Promise<RateCandidate | null> => {
  if (!apiKey) {
    return null;
  }
  const base = baseOf(pair);
  const quote = quoteOf(pair);
  const symbols = base === "EUR" ? quote : `${base},${quote}`;
  const body = await fetchJson(
    `https://api.exchangeratesapi.io/v1/latest?access_key=${encodeURIComponent(apiKey)}&symbols=${symbols}`,
  );
  const eurToQuote = numberAt(body, "rates", quote);
  const eurToBase = base === "EUR" ? 1 : numberAt(body, "rates", base);
  if (eurToQuote === null || eurToBase === null) {
    return null;
  }
  const rate = eurToQuote / eurToBase;
  return isUsableRate(rate) ? { rate, source: "exchangeratesapi" } : null;
};

// The CBN official rate is a display-only reference (§15.1) and is never used
// for pricing. CBN publishes no dependable public API, so it stays null until
// a reliable source exists — deliberately not scraped.
const fetchCbnReferenceRate = async (): Promise<number | null> => null;

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

export const fxRateRef = (pair: FxPair) => db.collection("fx_rates").doc(pair);

const raiseAlert = async (pair: FxPair, reason: string): Promise<void> => {
  await writeSystemAuditLog("fx_rate.refresh_rejected", fxRateRef(pair).path, {
    pair,
    reason,
  });
  await sendOpsAlertEmail(
    `Tiwani: ${pair} exchange-rate refresh rejected`,
    `The automatic ${pair} rate was not updated.\n\nReason: ${reason}\n\n` +
      "The last accepted rate is still in use. If it passes 24 hours old, " +
      "Paystack (Naira) payments stop until a fresh rate is accepted.",
  );
};

/**
 * Refresh one pair: fetch both feeds, apply the §15.5 guards, and write only if
 * they pass. A rejected refresh keeps the last good rate and raises an alert.
 */
export const refreshFxRate = async (pair: FxPair): Promise<RateDecision> => {
  const ref = fxRateRef(pair);
  const existing = (await ref.get()).data() as FxRateDoc | undefined;
  const previousRate = existing?.midRate ?? null;

  const [primary, crossCheck, cbnReferenceRate] = await Promise.all([
    fetchPrimaryRate(pair, fxPrimaryApiKey.value()),
    fetchCrossCheckRate(pair, fxCrossCheckApiKey.value()),
    fetchCbnReferenceRate(),
  ]);

  const decision = evaluateRateUpdate({ primary, crossCheck, previousRate });
  const lastAttemptAt = FieldValue.serverTimestamp();

  if (!decision.accepted) {
    // Keep the last good rate; record why this attempt was refused.
    await ref.set(
      { pair, lastAttemptAt, lastError: decision.reason },
      { merge: true },
    );
    await raiseAlert(pair, decision.reason);
    return decision;
  }

  const nowMs = Date.now();
  await ref.set(
    {
      pair,
      history: appendRateHistory(
        existing?.history,
        { rate: decision.midRate, at: nowMs },
        nowMs,
      ),
      midRate: decision.midRate,
      source: decision.source,
      crossCheckRate: decision.crossCheckRate,
      crossCheckSource: decision.crossCheckSource,
      cbnReferenceRate,
      fetchedAt: FieldValue.serverTimestamp(),
      lastAttemptAt,
      lastError: null,
    },
    { merge: true },
  );

  return decision;
};

/**
 * Warn once a rate crosses the staleness window, since Paystack payments stop
 * at that point (§15.5) and that is worth knowing before members notice.
 */
const alertIfStale = async (pair: FxPair): Promise<void> => {
  const snapshot = await fxRateRef(pair).get();
  const data = snapshot.data() as FxRateDoc | undefined;
  const fetchedAt = data?.fetchedAt;
  if (!fetchedAt) {
    return;
  }
  if (!isRateStale(fetchedAt.toMillis(), Date.now())) {
    return;
  }
  await writeSystemAuditLog("fx_rate.stale", fxRateRef(pair).path, {
    pair,
    fetchedAt: fetchedAt.toDate().toISOString(),
  });
  await sendOpsAlertEmail(
    `Tiwani: ${pair} exchange rate is stale`,
    `The ${pair} rate was last accepted at ${fetchedAt.toDate().toISOString()}, ` +
      `more than ${RATE_STALE_AFTER_MS / (60 * 60 * 1000)} hours ago.\n\n` +
      "Paystack (Naira) payments are refused while the rate is stale. " +
      "Card payments through Stripe are unaffected.",
  );
};

export const refreshFxRates = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Africa/Lagos",
    secrets: [fxPrimaryApiKey, fxCrossCheckApiKey],
  },
  async () => {
    for (const pair of FX_PAIRS) {
      // Sequential: a handful of pairs, and it keeps feed usage predictable
      // against per-minute rate limits.
      await refreshFxRate(pair);
      await alertIfStale(pair);
    }
  },
);
