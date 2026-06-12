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

const boolEnv = (value: string | undefined): boolean => value === "true";

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
    return {
      setupEmailError: "Backend email delivery is not enabled.",
      setupEmailSent: false,
      setupLink,
    };
  }

  if (!config.host || !config.user || !config.password) {
    return {
      setupEmailError: "Backend email delivery is missing SMTP configuration.",
      setupEmailSent: false,
      setupLink,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      auth: { pass: config.password, user: config.user },
      host: config.host,
      port: config.port,
      secure: config.secure,
    });
    await transporter.sendMail({
      from: config.from,
      html: `
        <p>Hello ${fullName},</p>
        <p>Your ${config.appName} member account has been created.</p>
        <p><a href="${setupLink}">Set your password</a> to finish account setup.</p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${setupLink}</p>
        ${
          config.supportEmail
            ? `<p>Need help? Contact ${config.supportEmail}.</p>`
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
    return {
      setupEmailError:
        error instanceof Error ? error.message : "Setup email was not sent.",
      setupEmailSent: false,
      setupLink,
    };
  }
};
