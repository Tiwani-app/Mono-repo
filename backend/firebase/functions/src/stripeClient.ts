import { defineSecret } from "firebase-functions/params";
import type Stripe = require("stripe");

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// The Stripe package is required here, on first use, not at import time: every
// function shares one entry point, so a top-level import would load Stripe on
// the cold start of functions that never take a payment.
let stripeClient: Stripe | null = null;
export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    const StripeSdk: typeof Stripe = require("stripe");
    stripeClient = new StripeSdk(stripeSecretKey.value());
  }
  return stripeClient;
};
