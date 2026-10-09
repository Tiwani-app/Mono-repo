import * as nodemailer from "nodemailer";

export interface SetupEmailResult {
  setupEmailError: string | null;
  setupEmailSent: boolean;
  setupLink: string | null;
}

interface SetupEmailInput {
  email: string;
  fullName: string;
  setupLink: string | null;
}

type FetchLike = typeof fetch;

const boolEnv = (value: string | undefined): boolean => value === "true";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const emailConfig = () => ({
  appName: process.env.TIWANI_APP_DISPLAY_NAME || "Tiwani",
  enabled: boolEnv(process.env.TIWANI_EMAIL_DELIVERY_ENABLED),
  from:
    process.env.TIWANI_EMAIL_FROM ||
    process.env.TIWANI_SMTP_USER ||
    "no-reply@tiwani.app",
  host: process.env.TIWANI_SMTP_HOST || "",
  password: process.env.TIWANI_SMTP_PASSWORD || "",
  port: Number(process.env.TIWANI_SMTP_PORT || 587),
  secure: boolEnv(process.env.TIWANI_SMTP_SECURE),
  supportEmail: process.env.TIWANI_SUPPORT_EMAIL || "",
  user: process.env.TIWANI_SMTP_USER || "",
});

const apiKeyFromSetupLink = (setupLink: string): string | null => {
  try {
    return new URL(setupLink).searchParams.get("apiKey");
  } catch {
    return null;
  }
};

const firebaseAuthSetupEmail = async (
  email: string,
  setupLink: string,
  fetchImpl: FetchLike = fetch,
): Promise<SetupEmailResult | null> => {
  const apiKey = apiKeyFromSetupLink(setupLink);
  if (!apiKey) {
    return null;
  }

  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      body: JSON.stringify({
        email,
        requestType: "PASSWORD_RESET",
      }),
      headers: {"Content-Type": "application/json"},
      method: "POST",
    },
  );

  if (!response.ok) {
    let message = "Firebase Auth setup email was not sent.";
    try {
      const payload = (await response.json()) as {
        error?: {message?: string};
      };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // Keep the generic message if Firebase returns a non-JSON response.
    }
    return {
      setupEmailError: message,
      setupEmailSent: false,
      setupLink,
    };
  }

  return {setupEmailError: null, setupEmailSent: true, setupLink};
};

export const sendPasswordSetupEmail = async ({
  email,
  fullName,
  setupLink,
}: SetupEmailInput): Promise<SetupEmailResult> => {
  if (!setupLink) {
    return {
      setupEmailError: "Password setup link could not be generated.",
      setupEmailSent: false,
      setupLink,
    };
  }

  const config = emailConfig();
  if (!config.enabled) {
    return (
      (await firebaseAuthSetupEmail(email, setupLink)) ?? {
        setupEmailError: "Backend email delivery is not enabled.",
        setupEmailSent: false,
        setupLink,
      }
    );
  }

  if (!config.host || !config.user || !config.password) {
    return (
      (await firebaseAuthSetupEmail(email, setupLink)) ?? {
        setupEmailError: "Backend email delivery is missing SMTP configuration.",
        setupEmailSent: false,
        setupLink,
      }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      auth: { pass: config.password, user: config.user },
      host: config.host,
      port: config.port,
      secure: config.secure,
    });
    const safeAppName = escapeHtml(config.appName);
    const safeFullName = escapeHtml(fullName || "there");
    const safeSetupLink = escapeHtml(setupLink);
    const safeSupportEmail = escapeHtml(config.supportEmail);
    await transporter.sendMail({
      from: config.from,
      replyTo: config.supportEmail || config.from,
      html: `
        <p>Hello ${safeFullName},</p>
        <p>Your ${safeAppName} member account has been created.</p>
        <p><a href="${safeSetupLink}">Set your password</a> to finish account setup.</p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${safeSetupLink}</p>
        ${
          config.supportEmail
            ? `<p>Need help? Contact ${safeSupportEmail}.</p>`
            : ""
        }
      `,
      subject: `Set up your ${config.appName} account`,
      text: [
        `Hello ${fullName},`,
        "",
        `Your ${config.appName} member account has been created.`,
        `Set your password here: ${setupLink}`,
        "",
        config.supportEmail ? `Need help? Contact ${config.supportEmail}.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      to: email,
    });
    return { setupEmailError: null, setupEmailSent: true, setupLink };
  } catch (error) {
    return (
      (await firebaseAuthSetupEmail(email, setupLink)) ?? {
        setupEmailError:
          error instanceof Error ? error.message : "Setup email was not sent.",
        setupEmailSent: false,
        setupLink,
      }
    );
  }
};
