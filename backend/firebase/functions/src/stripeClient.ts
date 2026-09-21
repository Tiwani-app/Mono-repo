import { defineSecret } from "firebase-functions/params";
import Stripe = require("stripe");

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

let stripeClient: Stripe | null = null;
export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey.value());
  }
  return stripeClient;
};
