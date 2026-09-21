import { createHmac } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import Stripe = require("stripe");
import { requireActiveUser } from "./authz";
import { applyContributionEntry } from "./contributionsLedgerService";
import { toMinorUnits } from "./currency";
import { applyChargePayment } from "./financeLedgerService";
import { db } from "./firebase";
import { getStripeClient, stripeSecretKey } from "./stripeClient";
import { stringField } from "./validation";

const numberField = (data: unknown, field: string): number => {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a number.`);
  }
  return value;
};

const positiveAmountField = (data: unknown, field: string): number => {
  const amount = numberField(data, field);
  if (amount <= 0) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be greater than zero.`);
  }
  return amount;
};

const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
// Paystack signs webhooks with, and authenticates API calls with, the same
// secret key — there is no separate webhook signing secret (payment-feature.md §5.4).
const paystackSecretKey = defineSecret("PAYSTACK_SECRET_KEY");

type PaymentProvider = "stripe" | "paystack";

interface OrgPaymentConfig {
  currency: string;
  enabledProviders: PaymentProvider[];
  // NGN collected per 1 unit of `currency` (admin-set, updated weekly). 0 if unset.
  paystackExchangeRate: number;
}

const getOrgPaymentConfig = async (orgId: string): Promise<OrgPaymentConfig> => {
  const orgSnapshot = await db.collection("organisations").doc(orgId).get();
  const paymentConfig = orgSnapshot.data()?.paymentConfig ?? {};
  const currency =
    typeof paymentConfig.currency === "string" ? paymentConfig.currency : "";
  const enabledProviders = Array.isArray(paymentConfig.enabledProviders)
    ? (paymentConfig.enabledProviders as unknown[]).filter(
        (value): value is PaymentProvider => value === "stripe" || value === "paystack",
      )
    : [];
  const paystackExchangeRate =
    typeof paymentConfig.paystackExchangeRate === "number" &&
    paymentConfig.paystackExchangeRate > 0
      ? paymentConfig.paystackExchangeRate
      : 0;
  if (!currency || enabledProviders.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "This organisation has not configured online payments yet.",
    );
  }
  return { currency, enabledProviders, paystackExchangeRate };
};

const resolveChargeAmount = async (
  orgId: string,
  memberUid: string,
  targetId: string,
): Promise<number> => {
  const chargeRef = db.collection("finance").doc(targetId);
  const chargeSnapshot = await chargeRef.get();
  if (!chargeSnapshot.exists) {
    throw new HttpsError("not-found", "Charge not found.");
  }
  const charge = chargeSnapshot.data() ?? {};
  if (charge.orgId !== orgId) {
    throw new HttpsError(
      "permission-denied",
      "This record does not belong to your organisation.",
    );
  }
  if (charge.memberId !== memberUid) {
    throw new HttpsError("permission-denied", "You can only pay your own charges.");
  }
  if (charge.type === "payment") {
    throw new HttpsError("failed-precondition", "This entry is not a payable charge.");
  }
  const chargeAmount = typeof charge.amount === "number" ? charge.amount : 0;
  const amountPaid = typeof charge.amountPaid === "number" ? charge.amountPaid : 0;
  const outstanding = Math.max(0, chargeAmount - amountPaid);
  if (outstanding <= 0) {
    throw new HttpsError("failed-precondition", "This charge has no outstanding balance.");
  }
  // Per product decision (payment-feature.md §13.3): self-serve gateway
  // payments must cover the full outstanding balance in one transaction —
  // no partial gateway payments, and the client never supplies the amount.
  return outstanding;
};

const resolveContributionAmount = async (
  request: { data: unknown },
  orgId: string,
  targetId: string,
): Promise<number> => {
  const poolSnapshot = await db.collection("contribution_pools").doc(targetId).get();
  if (!poolSnapshot.exists) {
    throw new HttpsError("not-found", "Contribution pool not found.");
  }
  const pool = poolSnapshot.data() ?? {};
  if (pool.orgId !== orgId) {
    throw new HttpsError(
      "permission-denied",
      "This record does not belong to your organisation.",
    );
  }
  if (pool.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Contributions can only be recorded against an active pool.",
    );
  }
  // Unlike a charge, a contribution has no fixed amount owed — the member
  // chooses freely, same as an admin recording one on their behalf today.
  return positiveAmountField(request.data, "amount");
};

// The WebView opens Paystack's hosted checkout at authorization_url and
// watches for a redirect to this URL to know the flow is done (the final
// truth still comes from the webhook + server-side verify, not this redirect).
const PAYSTACK_CALLBACK_URL = "https://tiwani-backend.web.app/payments/return";

const paystackInitializeTransaction = async (params: {
  amountMinorUnits: number;
  currency: string;
  email: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string; reference: string }> => {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountMinorUnits,
      currency: params.currency,
      email: params.email,
      metadata: params.metadata,
      callback_url: PAYSTACK_CALLBACK_URL,
    }),
  });
  const body = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  if (!response.ok || !body.status || !body.data?.authorization_url || !body.data.reference) {
    throw new HttpsError(
      "failed-precondition",
      `Paystack could not start this payment: ${body.message ?? response.statusText}`,
    );
  }
  return {
    authorizationUrl: body.data.authorization_url,
    reference: body.data.reference,
  };
};

export const initiatePayment = onCall(
  { secrets: [stripeSecretKey, paystackSecretKey] },
  async (request) => {
    const user = await requireActiveUser(request);
    const targetType = stringField(request.data, "targetType", { maxLength: 20 });
    const targetId = stringField(request.data, "targetId", { maxLength: 160 });
    const provider = stringField(request.data, "provider", { maxLength: 20 });

    if (targetType !== "charge" && targetType !== "contribution") {
      throw new HttpsError(
        "invalid-argument",
        "Self-serve payment supports paying a charge or contributing to a pool.",
      );
    }
    if (provider !== "stripe" && provider !== "paystack") {
      throw new HttpsError("invalid-argument", "Unsupported payment provider.");
    }

    const { currency, enabledProviders, paystackExchangeRate } =
      await getOrgPaymentConfig(user.profile.orgId);
    if (!enabledProviders.includes(provider)) {
      throw new HttpsError(
        "failed-precondition",
        "This payment method is not enabled for your organisation.",
      );
    }

    const amount =
      targetType === "charge"
        ? await resolveChargeAmount(user.profile.orgId, user.uid, targetId)
        : await resolveContributionAmount(request, user.profile.orgId, targetId);
    const amountMinorUnits = toMinorUnits(amount, currency);

    const intentRef = db.collection("payment_intents").doc();
    const baseIntent = {
      intentId: intentRef.id,
      orgId: user.profile.orgId,
      memberId: user.uid,
      provider,
      status: "pending",
      targetType,
      targetId,
      amount,
      currency,
      amountMinorUnits,
      createdAt: FieldValue.serverTimestamp(),
      confirmedAt: null,
      failureReason: null,
      appliedEntryId: null,
    };
    const metadata = {
      orgId: user.profile.orgId,
      intentId: intentRef.id,
      targetType,
      targetId,
    };

    if (provider === "stripe") {
      const stripeIntent = await getStripeClient().paymentIntents.create({
        amount: amountMinorUnits,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata,
      });
      await intentRef.set({ ...baseIntent, providerReference: stripeIntent.id });
      return {
        intentId: intentRef.id,
        provider: "stripe" as const,
        clientSecret: stripeIntent.client_secret,
      };
    }

    // Paystack collects Naira. Convert the org-currency obligation to NGN at
    // the admin-set fixed rate and collect that; the ledger still records the
    // original org-currency amount (amount/currency above) once confirmed.
    if (paystackExchangeRate <= 0) {
      throw new HttpsError(
        "failed-precondition",
        "Paystack is enabled but its exchange rate is not set. Ask an admin to configure the rate.",
      );
    }
    const gatewayAmount = amount * paystackExchangeRate;
    const gatewayAmountMinorUnits = Math.round(gatewayAmount * 100); // kobo
    const init = await paystackInitializeTransaction({
      amountMinorUnits: gatewayAmountMinorUnits,
      currency: "NGN",
      email: user.profile.email,
      metadata,
    });
    await intentRef.set({
      ...baseIntent,
      providerReference: init.reference,
      gatewayCurrency: "NGN",
      gatewayAmount,
      gatewayAmountMinorUnits,
      exchangeRate: paystackExchangeRate,
    });
    return {
      intentId: intentRef.id,
      provider: "paystack" as const,
      authorizationUrl: init.authorizationUrl,
      gatewayAmount,
      gatewayCurrency: "NGN" as const,
    };
  },
);

interface ConfirmedGatewayPayment {
  intentRef: FirebaseFirestore.DocumentReference;
  provider: PaymentProvider;
  providerReference: string;
  paymentMethodLabel: string;
}

/**
 * Applies a gateway-confirmed charge payment to Firestore: re-validates the
 * intent is still pending (idempotent against webhook replays), re-derives
 * the current outstanding balance and clamps to it (payment-feature.md
 * §2.5 — a manual admin payment may have landed on the same charge between
 * intent creation and webhook delivery), then applies the payment through
 * the same `applyChargePayment` mechanic the admin-recorded path uses.
 * Decoupled from the Stripe SDK so it's directly testable against the
 * Firestore emulator without live Stripe calls.
 */
export const applyConfirmedGatewayChargePayment = async (
  input: ConfirmedGatewayPayment,
): Promise<{ applied: boolean; paymentId: string | null }> => {
  const { intentRef, provider, providerReference, paymentMethodLabel } = input;

  const intentSnapshot = await intentRef.get();
  const intent = intentSnapshot.data();
  if (!intent || intent.status !== "pending") {
    return { applied: false, paymentId: null }; // idempotent replay
  }
  if (intent.targetType !== "charge") {
    await intentRef.update({
      status: "failed",
      failureReason: "Unsupported target type for this phase.",
      confirmedAt: FieldValue.serverTimestamp(),
    });
    return { applied: false, paymentId: null };
  }

  const memberRef = db.collection("users").doc(intent.memberId);
  const chargeRef = db.collection("finance").doc(intent.targetId);
  const [chargeSnapshot, unpaidSnapshot] = await Promise.all([
    chargeRef.get(),
    db
      .collection("finance")
      .where("orgId", "==", intent.orgId)
      .where("memberId", "==", intent.memberId)
      .where("paidStatus", "in", ["unpaid", "partial"])
      .get(),
  ]);
  const charge = chargeSnapshot.data();
  const chargeAmount = typeof charge?.amount === "number" ? charge.amount : 0;
  const chargeAmountPaid = typeof charge?.amountPaid === "number" ? charge.amountPaid : 0;
  const outstanding = Math.max(0, chargeAmount - chargeAmountPaid);
  const amountToApply = Math.min(intent.amount, outstanding);

  if (!charge || amountToApply <= 0) {
    await intentRef.update({
      status: "failed",
      failureReason:
        "Charge was already settled before this payment was confirmed. Needs manual reconciliation/refund.",
      confirmedAt: FieldValue.serverTimestamp(),
    });
    return { applied: false, paymentId: null };
  }

  const result = await db.runTransaction(async (transaction) => {
    const freshIntentSnapshot = await transaction.get(intentRef);
    const freshIntent = freshIntentSnapshot.data();
    if (!freshIntent || freshIntent.status !== "pending") {
      return null; // another invocation already handled this
    }
    const applied = await applyChargePayment({
      transaction,
      orgId: intent.orgId,
      memberId: intent.memberId,
      memberRef,
      candidateChargeRefs: unpaidSnapshot.docs.map((doc) => doc.ref),
      chargeEntryId: intent.targetId,
      amount: amountToApply,
      note: "",
      source: {
        kind: "gateway",
        provider,
        paymentIntentId: intentRef.id,
        paymentMethod: paymentMethodLabel,
        reference: providerReference,
      },
      actorUid: intent.memberId,
      actorRole: "member",
    });
    transaction.update(intentRef, {
      status: "succeeded",
      confirmedAt: FieldValue.serverTimestamp(),
      appliedEntryId: applied.paymentId,
      ...(amountToApply < intent.amount
        ? {
            failureReason:
              `Applied ${amountToApply} of ${intent.amount} — the remainder ` +
              "may need manual reconciliation/refund.",
          }
        : {}),
    });
    return applied;
  });

  return { applied: result !== null, paymentId: result?.paymentId ?? null };
};

/**
 * Applies a gateway-confirmed contribution to Firestore. Unlike
 * `applyChargePayment`, `applyContributionEntry` (payment-feature.md Phase 0)
 * owns its own internal transaction rather than accepting an external one,
 * so idempotency is enforced with an explicit claim step first (pending ->
 * processing), then the contribution is applied, then the intent is
 * finalized to succeeded/failed — a webhook replay that arrives while a
 * claim is in flight sees a non-"pending" status and no-ops.
 */
export const applyConfirmedGatewayContributionPayment = async (
  input: ConfirmedGatewayPayment,
): Promise<{ applied: boolean; entryId: string | null }> => {
  const { intentRef, provider, providerReference, paymentMethodLabel } = input;

  const intent = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(intentRef);
    const data = snapshot.data();
    if (!data || data.status !== "pending") {
      return null; // idempotent replay
    }
    if (data.targetType !== "contribution") {
      transaction.update(intentRef, {
        status: "failed",
        failureReason: "Unsupported target type for this phase.",
        confirmedAt: FieldValue.serverTimestamp(),
      });
      return null;
    }
    transaction.update(intentRef, { status: "processing" });
    return data;
  });
  if (!intent) {
    return { applied: false, entryId: null };
  }

  try {
    const [poolSnapshot, memberSnapshot] = await Promise.all([
      db.collection("contribution_pools").doc(intent.targetId).get(),
      db.collection("users").doc(intent.memberId).get(),
    ]);
    if (!poolSnapshot.exists || poolSnapshot.data()?.status !== "active") {
      throw new Error(
        "This contribution pool closed before the payment was confirmed. Needs manual reconciliation/refund.",
      );
    }
    const member = memberSnapshot.data() ?? {};

    const applied = await applyContributionEntry({
      orgId: intent.orgId,
      memberId: intent.memberId,
      amount: intent.amount,
      note: "",
      poolSnap: poolSnapshot,
      source: {
        kind: "gateway",
        provider,
        paymentIntentId: intentRef.id,
        paymentMethod: paymentMethodLabel,
        reference: providerReference,
      },
      actor: {
        uid: intent.memberId,
        role: "member",
        fullName: typeof member.fullName === "string" ? member.fullName : "",
        email: typeof member.email === "string" ? member.email : "",
        phone: typeof member.phone === "string" ? member.phone : "",
      },
    });

    await intentRef.update({
      status: "succeeded",
      confirmedAt: FieldValue.serverTimestamp(),
      appliedEntryId: applied.entryId,
    });
    return { applied: true, entryId: applied.entryId };
  } catch (error) {
    await intentRef.update({
      status: "failed",
      failureReason:
        error instanceof Error
          ? error.message
          : "Could not apply this contribution. Needs manual reconciliation.",
      confirmedAt: FieldValue.serverTimestamp(),
    });
    return { applied: false, entryId: null };
  }
};

// Dispatch a confirmed gateway payment to the right ledger applier — shared by
// both webhooks and the checkPaymentStatus callable.
const applyConfirmedGatewayPayment = async (
  targetType: unknown,
  applyArgs: ConfirmedGatewayPayment,
): Promise<void> => {
  if (targetType === "contribution") {
    await applyConfirmedGatewayContributionPayment(applyArgs);
  } else {
    await applyConfirmedGatewayChargePayment(applyArgs);
  }
};

const describeStripePaymentMethod = async (
  stripe: Stripe,
  paymentIntentId: string,
): Promise<string> => {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
    const paymentMethod = intent.payment_method;
    if (paymentMethod && typeof paymentMethod !== "string" && paymentMethod.card) {
      const { brand, last4, wallet } = paymentMethod.card;
      const brandLabel = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
      const walletLabel =
        wallet?.type === "apple_pay"
          ? "Apple Pay"
          : wallet?.type === "google_pay"
            ? "Google Pay"
            : null;
      return walletLabel
        ? `Stripe · ${walletLabel} (${brandLabel} •••• ${last4})`
        : `Stripe · ${brandLabel} •••• ${last4}`;
    }
  } catch (error) {
    console.warn("stripeWebhook: failed to describe payment method", error);
  }
  return "Stripe";
};

const findPaymentIntentRef = async (
  providerReference: string,
): Promise<FirebaseFirestore.DocumentReference | null> => {
  const query = await db
    .collection("payment_intents")
    .where("providerReference", "==", providerReference)
    .limit(1)
    .get();
  return query.empty ? null : query.docs[0].ref;
};

// Paystack's own docs recommend re-verifying a transaction server-side before
// crediting, rather than trusting the webhook payload alone (payment-feature.md §5.4).
const paystackVerifyTransaction = async (
  reference: string,
): Promise<{ success: boolean; channel: string }> => {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${paystackSecretKey.value()}` } },
  );
  const body = (await response.json()) as {
    status?: boolean;
    data?: { status?: string; channel?: string };
  };
  const data = body.data ?? {};
  return {
    success: response.ok && body.status === true && data.status === "success",
    channel: typeof data.channel === "string" ? data.channel : "",
  };
};

// Exported for unit testing — the signature check is the whole trust boundary
// for the Paystack webhook (payment-feature.md §2.3).
export const verifyPaystackSignature = (
  rawBody: Buffer,
  signature: unknown,
  secret: string,
): boolean => {
  if (typeof signature !== "string" || signature.length === 0) {
    return false;
  }
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return signature === expected;
};

const paystackChannelLabel = (channel: string): string => {
  switch (channel) {
    case "card":
      return "Paystack · Card";
    case "bank":
      return "Paystack · Bank";
    case "bank_transfer":
      return "Paystack · Bank Transfer";
    case "ussd":
      return "Paystack · USSD";
    case "mobile_money":
      return "Paystack · Mobile Money";
    case "qr":
      return "Paystack · QR";
    default:
      return "Paystack";
  }
};

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      response.status(400).send("Missing Stripe signature.");
      return;
    }

    const stripe = getStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        stripeWebhookSecret.value(),
      );
    } catch (error) {
      console.warn("stripeWebhook: signature verification failed", error);
      response.status(400).send("Invalid signature.");
      return;
    }

    if (event.type === "payment_intent.succeeded") {
      const stripeIntent = event.data.object;
      const intentRef = await findPaymentIntentRef(stripeIntent.id);
      if (intentRef) {
        const intentSnapshot = await intentRef.get();
        const targetType = intentSnapshot.data()?.targetType;
        const paymentMethodLabel = await describeStripePaymentMethod(stripe, stripeIntent.id);
        await applyConfirmedGatewayPayment(targetType, {
          intentRef,
          provider: "stripe",
          providerReference: stripeIntent.id,
          paymentMethodLabel,
        });
      } else {
        console.warn("stripeWebhook: no payment_intents doc for", stripeIntent.id);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const stripeIntent = event.data.object;
      const intentRef = await findPaymentIntentRef(stripeIntent.id);
      if (intentRef) {
        const intentSnapshot = await intentRef.get();
        if (intentSnapshot.data()?.status === "pending") {
          await intentRef.update({
            status: "failed",
            failureReason: stripeIntent.last_payment_error?.message ?? "Payment failed.",
            confirmedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Always 200 once the event is durably processed (or already a known
    // duplicate) so Stripe stops retrying — payment-feature.md §5.3.
    response.status(200).send({ received: true });
  },
);

export const paystackWebhook = onRequest(
  { secrets: [paystackSecretKey] },
  async (request, response) => {
    // Verify HMAC-SHA512 of the raw body with the secret key before touching
    // Firestore (payment-feature.md §2.3/§5.4).
    if (
      !verifyPaystackSignature(
        request.rawBody,
        request.headers["x-paystack-signature"],
        paystackSecretKey.value(),
      )
    ) {
      console.warn("paystackWebhook: signature verification failed");
      response.status(401).send("Invalid signature.");
      return;
    }

    const event = request.body as {
      event?: string;
      data?: { reference?: string };
    };
    if (event?.event === "charge.success" && typeof event.data?.reference === "string") {
      const reference = event.data.reference;
      const intentRef = await findPaymentIntentRef(reference);
      if (intentRef) {
        const verified = await paystackVerifyTransaction(reference);
        if (verified.success) {
          const targetType = (await intentRef.get()).data()?.targetType;
          await applyConfirmedGatewayPayment(targetType, {
            intentRef,
            provider: "paystack",
            providerReference: reference,
            paymentMethodLabel: paystackChannelLabel(verified.channel),
          });
        } else {
          console.warn("paystackWebhook: verify did not confirm success for", reference);
        }
      } else {
        console.warn("paystackWebhook: no payment_intents doc for", reference);
      }
    }

    // Always 200 once durably processed so Paystack stops retrying.
    response.status(200).send({ received: true });
  },
);

// Active fallback for the "Payment status" screen: the member's app can ask
// the server to verify the payment with the provider right now, rather than
// waiting on webhook latency (payment-feature.md §5.6). Idempotent — if the
// webhook already applied the payment this just returns the current status.
export const checkPaymentStatus = onCall(
  { secrets: [stripeSecretKey, paystackSecretKey] },
  async (request) => {
    const user = await requireActiveUser(request);
    const intentId = stringField(request.data, "intentId", { maxLength: 160 });
    const intentRef = db.collection("payment_intents").doc(intentId);
    const intent = (await intentRef.get()).data();
    if (!intent) {
      throw new HttpsError("not-found", "Payment not found.");
    }
    if (intent.orgId !== user.profile.orgId || intent.memberId !== user.uid) {
      throw new HttpsError("permission-denied", "This payment is not yours.");
    }

    const providerReference = intent.providerReference;
    if (
      (intent.status === "pending" || intent.status === "processing") &&
      typeof providerReference === "string"
    ) {
      if (intent.provider === "stripe") {
        const stripe = getStripeClient();
        const stripeIntent = await stripe.paymentIntents.retrieve(providerReference);
        if (stripeIntent.status === "succeeded") {
          await applyConfirmedGatewayPayment(intent.targetType, {
            intentRef,
            provider: "stripe",
            providerReference,
            paymentMethodLabel: await describeStripePaymentMethod(stripe, providerReference),
          });
        }
      } else if (intent.provider === "paystack") {
        const verified = await paystackVerifyTransaction(providerReference);
        if (verified.success) {
          await applyConfirmedGatewayPayment(intent.targetType, {
            intentRef,
            provider: "paystack",
            providerReference,
            paymentMethodLabel: paystackChannelLabel(verified.channel),
          });
        }
      }
    }

    const status = (await intentRef.get()).data()?.status ?? "pending";
    return { status };
  },
);

export const expirePendingPaymentIntents = onSchedule(
  { schedule: "every 1 hours", timeZone: "Africa/Lagos" },
  async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const staleSnapshot = await db
      .collection("payment_intents")
      .where("status", "==", "pending")
      .where("createdAt", "<=", cutoff)
      .get();
    if (staleSnapshot.empty) {
      return;
    }
    const batch = db.batch();
    staleSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "expired",
        confirmedAt: FieldValue.serverTimestamp(),
        failureReason: "Payment was not completed within 24 hours.",
      });
    });
    await batch.commit();
  },
);
