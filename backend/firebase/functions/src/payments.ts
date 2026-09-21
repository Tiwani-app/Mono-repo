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

type PaymentProvider = "stripe" | "paystack";

interface OrgPaymentConfig {
  currency: string;
  enabledProviders: PaymentProvider[];
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
  if (!currency || enabledProviders.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "This organisation has not configured online payments yet.",
    );
  }
  return { currency, enabledProviders };
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

export const initiatePayment = onCall(
  { secrets: [stripeSecretKey] },
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
    if (provider !== "stripe") {
      throw new HttpsError("invalid-argument", "Unsupported payment provider.");
    }

    const { currency, enabledProviders } = await getOrgPaymentConfig(user.profile.orgId);
    if (!enabledProviders.includes("stripe")) {
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
    const stripeIntent = await getStripeClient().paymentIntents.create({
      amount: amountMinorUnits,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orgId: user.profile.orgId,
        intentId: intentRef.id,
        targetType,
        targetId,
      },
    });

    await intentRef.set({
      intentId: intentRef.id,
      orgId: user.profile.orgId,
      memberId: user.uid,
      provider: "stripe",
      providerReference: stripeIntent.id,
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
    });

    return {
      intentId: intentRef.id,
      provider: "stripe" as const,
      clientSecret: stripeIntent.client_secret,
    };
  },
);

interface ConfirmedGatewayPayment {
  intentRef: FirebaseFirestore.DocumentReference;
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
  const { intentRef, providerReference, paymentMethodLabel } = input;

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
        provider: "stripe",
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
  const { intentRef, providerReference, paymentMethodLabel } = input;

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
        provider: "stripe",
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
        const applyArgs = {
          intentRef,
          providerReference: stripeIntent.id,
          paymentMethodLabel,
        };
        if (targetType === "contribution") {
          await applyConfirmedGatewayContributionPayment(applyArgs);
        } else {
          await applyConfirmedGatewayChargePayment(applyArgs);
        }
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
