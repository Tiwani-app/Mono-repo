/* eslint-env node */

const assert = require("node:assert/strict");
const test = require("node:test");
const nodemailer = require("nodemailer");

const {sendPasswordSetupEmail} = require("../lib/setupEmail");

const emailEnvKeys = [
  "TIWANI_APP_DISPLAY_NAME",
  "TIWANI_EMAIL_DELIVERY_ENABLED",
  "TIWANI_EMAIL_FROM",
  "TIWANI_SMTP_HOST",
  "TIWANI_SMTP_PASSWORD",
  "TIWANI_SMTP_PORT",
  "TIWANI_SMTP_SECURE",
  "TIWANI_SMTP_USER",
  "TIWANI_SUPPORT_EMAIL",
];

const originalEnv = emailEnvKeys.reduce((values, key) => {
  values[key] = process.env[key];
  return values;
}, {});
const originalCreateTransport = nodemailer.createTransport;

const resetEmailEnv = () => {
  for (const key of emailEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  nodemailer.createTransport = originalCreateTransport;
};

test.afterEach(resetEmailEnv);
test.after(resetEmailEnv);

test("returns setup link fallback when backend email delivery is disabled", async () => {
  process.env.TIWANI_EMAIL_DELIVERY_ENABLED = "false";

  let transportCreated = false;
  nodemailer.createTransport = () => {
    transportCreated = true;
    return {sendMail: async () => undefined};
  };

  const result = await sendPasswordSetupEmail({
    email: "ade@example.com",
    fullName: "Ade Omoloja",
    setupLink: "https://example.com/setup",
  });

  assert.deepEqual(result, {
    setupEmailError: "Backend email delivery is not enabled.",
    setupEmailSent: false,
    setupLink: "https://example.com/setup",
  });
  assert.equal(transportCreated, false);
});

test("reports a missing setup link before checking SMTP delivery", async () => {
  process.env.TIWANI_EMAIL_DELIVERY_ENABLED = "true";

  let transportCreated = false;
  nodemailer.createTransport = () => {
    transportCreated = true;
    return {sendMail: async () => undefined};
  };

  const result = await sendPasswordSetupEmail({
    email: "ade@example.com",
    fullName: "Ade Omoloja",
    setupLink: null,
  });

  assert.deepEqual(result, {
    setupEmailError: "Password setup link could not be generated.",
    setupEmailSent: false,
    setupLink: null,
  });
  assert.equal(transportCreated, false);
});

test("reports missing SMTP configuration without creating a transport", async () => {
  process.env.TIWANI_EMAIL_DELIVERY_ENABLED = "true";

  let transportCreated = false;
  nodemailer.createTransport = () => {
    transportCreated = true;
    return {sendMail: async () => undefined};
  };

  const result = await sendPasswordSetupEmail({
    email: "ade@example.com",
    fullName: "Ade Omoloja",
    setupLink: "https://example.com/setup",
  });

  assert.deepEqual(result, {
    setupEmailError: "Backend email delivery is missing SMTP configuration.",
    setupEmailSent: false,
    setupLink: "https://example.com/setup",
  });
  assert.equal(transportCreated, false);
});

test("sends the password setup email with configured SMTP settings", async () => {
  process.env.TIWANI_APP_DISPLAY_NAME = "Tiwani Circle";
  process.env.TIWANI_EMAIL_DELIVERY_ENABLED = "true";
  process.env.TIWANI_EMAIL_FROM = "Members <members@tiwani.app>";
  process.env.TIWANI_SMTP_HOST = "smtp.example.com";
  process.env.TIWANI_SMTP_PASSWORD = "secret";
  process.env.TIWANI_SMTP_PORT = "465";
  process.env.TIWANI_SMTP_SECURE = "true";
  process.env.TIWANI_SMTP_USER = "mailer@example.com";
  process.env.TIWANI_SUPPORT_EMAIL = "support@tiwani.app";

  const sendMailCalls = [];
  let transportOptions = null;
  nodemailer.createTransport = options => {
    transportOptions = options;
    return {
      sendMail: async message => {
        sendMailCalls.push(message);
      },
    };
  };

  const result = await sendPasswordSetupEmail({
    email: "ade@example.com",
    fullName: "Ade Omoloja",
    setupLink: "https://example.com/setup",
  });

  assert.deepEqual(result, {
    setupEmailError: null,
    setupEmailSent: true,
    setupLink: "https://example.com/setup",
  });
  assert.deepEqual(transportOptions, {
    auth: {pass: "secret", user: "mailer@example.com"},
    host: "smtp.example.com",
    port: 465,
    secure: true,
  });
  assert.equal(sendMailCalls.length, 1);
  assert.equal(sendMailCalls[0].from, "Members <members@tiwani.app>");
  assert.equal(sendMailCalls[0].to, "ade@example.com");
  assert.equal(sendMailCalls[0].subject, "Set up your Tiwani Circle account");
  assert.match(sendMailCalls[0].html, /Hello Ade Omoloja/);
  assert.match(sendMailCalls[0].html, /https:\/\/example\.com\/setup/);
  assert.match(sendMailCalls[0].text, /support@tiwani\.app/);
});

test("keeps the setup link available when SMTP sending fails", async () => {
  process.env.TIWANI_EMAIL_DELIVERY_ENABLED = "true";
  process.env.TIWANI_SMTP_HOST = "smtp.example.com";
  process.env.TIWANI_SMTP_PASSWORD = "secret";
  process.env.TIWANI_SMTP_USER = "mailer@example.com";

  nodemailer.createTransport = () => ({
    sendMail: async () => {
      throw new Error("SMTP is unavailable");
    },
  });

  const result = await sendPasswordSetupEmail({
    email: "ade@example.com",
    fullName: "Ade Omoloja",
    setupLink: "https://example.com/setup",
  });

  assert.deepEqual(result, {
    setupEmailError: "SMTP is unavailable",
    setupEmailSent: false,
    setupLink: "https://example.com/setup",
  });
});
