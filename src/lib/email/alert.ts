import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";

interface LtdRefundAlertInput {
  email: string | null;
  sessionId: string;
  amount: number;
  errorMessage: string;
}

function formatAmount(amountInCents: number): string {
  return `$${(amountInCents / 100).toFixed(2)}`;
}

/**
 * Alerts the owner inbox when a LTD oversold refund exhausts all Stripe
 * retries. Best-effort: missing RESEND_API_KEY or LTD_ALERT_EMAIL turns this
 * into a no-op so local dev and CI do not fail on missing secrets.
 */
export async function sendLtdRefundAlert(
  input: LtdRefundAlertInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LTD_ALERT_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.LTD_ALERT_FROM ?? "alerts@runmend.app";
  const subjectTag = input.email ?? input.sessionId;
  const subject = `URGENT: LTD refund failed for ${subjectTag}`;
  const body = [
    `A LTD oversold refund failed after all retries and requires manual action.`,
    ``,
    `Session ID: ${input.sessionId}`,
    `Amount: ${formatAmount(input.amount)}`,
    `Customer email: ${input.email ?? "(unknown)"}`,
    `Stripe error: ${input.errorMessage}`,
    ``,
    `Manual refund required in the Stripe dashboard.`,
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, text: body });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: "email/alert", step: "ltd_refund_alert" },
    });
  }
}
