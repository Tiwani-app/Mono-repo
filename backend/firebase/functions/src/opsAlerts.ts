import * as nodemailer from "nodemailer";
import { emailConfig } from "./setupEmail";

/**
 * Email the Tiwani team when a scheduled job needs a human to look at it
 * (payment-feature.md §15.5).
 *
 * Reuses the SMTP settings the member-setup email already uses rather than
 * introducing a second mail configuration. Alerts are best-effort: a failure to
 * send must never take down the job that raised the alert, so everything here
 * is swallowed and reported through the return value. The durable record of the
 * event is the `audit_logs` entry written alongside the alert.
 */
export const sendOpsAlertEmail = async (
  subject: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> => {
  const config = emailConfig();
  const recipient = config.supportEmail || config.from;

  if (!config.enabled || !config.host || !config.user || !config.password) {
    // Not an error: SMTP is optional in local/dev. The audit entry still records it.
    return { sent: false, error: "SMTP delivery is not configured." };
  }
  if (!recipient) {
    return { sent: false, error: "No ops alert recipient is configured." };
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
      subject,
      text: body,
      to: recipient,
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown mail error.",
    };
  }
};
